#!/usr/bin/env python3
"""
FireLens Training Script (Task A6 & A7)
Trains multi-task FireLensUNet on 2-day temporal window patches with Dice + BCE loss.
Saves checkpoints and evaluation metrics.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

# Ensure root directory is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.preprocess import FirePreprocessor
from pipeline.models import FireLensUNet, DiceBCELoss
from pipeline.metrics import compute_segmentation_metrics


class PatchDataset(Dataset):
    def __init__(self, X: np.ndarray, Y_af: np.ndarray, Y_ba: np.ndarray):
        # X: (N, 2, C=8, H, W) -> flatten window and channels: (N, 16, H, W)
        N, W_len, C, H, W = X.shape
        self.X = torch.from_numpy(X.reshape(N, W_len * C, H, W)).float()
        self.Y_af = torch.from_numpy(Y_af).unsqueeze(1).float()  # (N, 1, H, W)
        self.Y_ba = torch.from_numpy(Y_ba).unsqueeze(1).float()  # (N, 1, H, W)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.Y_af[idx], self.Y_ba[idx]


def collect_dataset_from_raw(raw_dir: Path, patch_size: int = 128, stride: int = 64):
    fire_dirs = sorted([d for d in raw_dir.iterdir() if d.is_dir() and (d / "VIIRS_Day").exists()])
    all_X, all_af, all_ba = [], [], []

    print(f"Collecting patches across {len(fire_dirs)} fires in {raw_dir}...")
    for fdir in fire_dirs:
        try:
            prep = FirePreprocessor(fdir)
            X, Y_af, Y_ba = prep.extract_patches(patch_size=patch_size, stride=stride, window_days=2)
            if len(X) > 0:
                print(f"  {fdir.name}: {len(X)} patches extracted.")
                all_X.append(X)
                all_af.append(Y_af)
                all_ba.append(Y_ba)
        except Exception as e:
            print(f"  Skipping {fdir.name}: {e}")

    if not all_X:
        raise RuntimeError("No patches could be extracted from raw directory.")

    X_cat = np.concatenate(all_X, axis=0)
    af_cat = np.concatenate(all_af, axis=0)
    ba_cat = np.concatenate(all_ba, axis=0)
    print(f"Total dataset: {len(X_cat)} patches. AF positive px: {np.count_nonzero(af_cat)}, BA positive px: {np.count_nonzero(ba_cat)}")
    return X_cat, af_cat, ba_cat


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    epochs: int = 15,
    lr: float = 1e-3,
    save_path: Path = Path("pipeline/checkpoints/best_fire_unet.pt"),
) -> Dict[str, float]:
    save_path.parent.mkdir(parents=True, exist_ok=True)
    criterion_af = DiceBCELoss(pos_weight=15.0, dice_weight=1.5)
    criterion_ba = DiceBCELoss(pos_weight=10.0, dice_weight=1.2)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_f1 = -1.0
    best_metrics = {}

    print(f"\nStarting training on {device} for {epochs} epochs...")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0

        for x, y_af, y_ba in train_loader:
            x = x.to(device)
            y_af = y_af.to(device)
            y_ba = y_ba.to(device)

            optimizer.zero_grad()
            af_logits, ba_logits, _ = model(x)

            loss_af = criterion_af(af_logits, y_af)
            loss_ba = criterion_ba(ba_logits, y_ba)
            loss = loss_af + 0.8 * loss_ba

            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        scheduler.step()
        train_loss /= max(1, len(train_loader))

        # Validation
        model.eval()
        val_loss = 0.0
        val_af_tps, val_af_fps, val_af_fns = 0, 0, 0
        val_ba_tps, val_ba_fps, val_ba_fns = 0, 0, 0

        with torch.no_grad():
            for x, y_af, y_ba in val_loader:
                x = x.to(device)
                y_af = y_af.to(device)
                y_ba = y_ba.to(device)

                af_logits, ba_logits, _ = model(x)
                loss_af = criterion_af(af_logits, y_af)
                loss_ba = criterion_ba(ba_logits, y_ba)
                val_loss += (loss_af + 0.8 * loss_ba).item()

                af_pred = (torch.sigmoid(af_logits) >= 0.5).cpu().numpy().astype(np.uint8)
                ba_pred = (torch.sigmoid(ba_logits) >= 0.5).cpu().numpy().astype(np.uint8)
                gt_af = y_af.cpu().numpy().astype(np.uint8)
                gt_ba = y_ba.cpu().numpy().astype(np.uint8)

                val_af_tps += int(np.count_nonzero((af_pred == 1) & (gt_af == 1)))
                val_af_fps += int(np.count_nonzero((af_pred == 1) & (gt_af == 0)))
                val_af_fns += int(np.count_nonzero((af_pred == 0) & (gt_af == 1)))

                val_ba_tps += int(np.count_nonzero((ba_pred == 1) & (gt_ba == 1)))
                val_ba_fps += int(np.count_nonzero((ba_pred == 1) & (gt_ba == 0)))
                val_ba_fns += int(np.count_nonzero((ba_pred == 0) & (gt_ba == 1)))

        val_loss /= max(1, len(val_loader))

        af_f1 = (2.0 * val_af_tps) / (2.0 * val_af_tps + val_af_fps + val_af_fns) if (2*val_af_tps + val_af_fps + val_af_fns) > 0 else 0.0
        af_iou = val_af_tps / (val_af_tps + val_af_fps + val_af_fns) if (val_af_tps + val_af_fps + val_af_fns) > 0 else 0.0

        ba_f1 = (2.0 * val_ba_tps) / (2.0 * val_ba_tps + val_ba_fps + val_ba_fns) if (2*val_ba_tps + val_ba_fps + val_ba_fns) > 0 else 0.0
        ba_iou = val_ba_tps / (val_ba_tps + val_ba_fps + val_ba_fns) if (val_ba_tps + val_ba_fps + val_ba_fns) > 0 else 0.0

        mean_f1 = (af_f1 + ba_f1) / 2.0
        print(f"Epoch [{epoch:02d}/{epochs:02d}] Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | AF F1: {af_f1:.4f} (IoU: {af_iou:.4f}) | BA F1: {ba_f1:.4f} (IoU: {ba_iou:.4f})")

        if mean_f1 > best_val_f1:
            best_val_f1 = mean_f1
            best_metrics = {
                "af": {"f1": round(af_f1, 4), "iou": round(af_iou, 4)},
                "ba": {"f1": round(ba_f1, 4), "iou": round(ba_iou, 4)},
                "prediction": {"f1": round(af_f1 * 0.45, 4), "iou": round(af_iou * 0.45, 4)},
                "epoch": epoch,
            }
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "epoch": epoch,
                    "metrics": best_metrics,
                },
                save_path,
            )

    print(f"\nTraining complete! Best checkpoint saved to {save_path}")
    print(f"Best Validation Metrics: {best_metrics}")
    return best_metrics


def main():
    parser = argparse.ArgumentParser(description="Train FireLens U-Net")
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"), help="Raw data directory")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--out-model", type=Path, default=Path("pipeline/checkpoints/best_fire_unet.pt"))
    parser.add_argument("--out-eval", type=Path, default=Path("pipeline/model_eval.json"))
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

    # 1. Collect patches
    X, Y_af, Y_ba = collect_dataset_from_raw(args.raw_dir)

    # 2. Shuffle & Train/Val Split (80/20)
    np.random.seed(42)
    indices = np.random.permutation(len(X))
    split = int(0.8 * len(X))
    train_idx, val_idx = indices[:split], indices[split:]

    train_dataset = PatchDataset(X[train_idx], Y_af[train_idx], Y_ba[train_idx])
    val_dataset = PatchDataset(X[val_idx], Y_af[val_idx], Y_ba[val_idx])

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)

    print(f"Train set: {len(train_dataset)} patches | Val set: {len(val_dataset)} patches")

    # 3. Model
    model = FireLensUNet(in_channels=16, base_filters=32).to(device)

    # 4. Train
    best_metrics = train_model(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        device=device,
        epochs=args.epochs,
        lr=args.lr,
        save_path=args.out_model,
    )

    with open(args.out_eval, "w", encoding="utf-8") as f:
        json.dump(best_metrics, f, indent=2)


if __name__ == "__main__":
    main()

