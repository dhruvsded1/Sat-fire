#!/usr/bin/env python3
"""
FireLens Feature Importance (Task A9)
Calculates F1 drop when each input channel is zeroed out (channel ablation).
Generates public/data/importance.json conforming to contract v1.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch

# Ensure root directory is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.models import FireLensUNet
from pipeline.train import collect_dataset_from_raw

CHANNEL_NAMES = [
    "VIIRS_I1 (Red 375m)",
    "VIIRS_I2 (NIR 375m)",
    "VIIRS_I3 (SWIR 375m)",
    "VIIRS_I4 (Thermal 375m)",
    "VIIRS_I5 (Thermal 375m)",
    "VIIRS_M11 (SWIR 750m)",
    "VIIRS_Night_I4 (Thermal)",
    "VIIRS_Night_I5 (Thermal)",
]


def compute_f1_in_batches(model, X_np, Y_af_np, zero_channels, device, batch_size=32):
    N, W_len, C, H, W = X_np.shape
    total_tp, total_fp, total_fn = 0, 0, 0

    with torch.no_grad():
        for i in range(0, N, batch_size):
            batch_x = X_np[i : i + batch_size].copy()
            if zero_channels is not None:
                for ch in zero_channels:
                    batch_x[:, :, ch, :, :] = 0.0

            # (B, 16, H, W)
            bx_t = torch.from_numpy(batch_x.reshape(-1, W_len * C, H, W)).float().to(device)
            by_t = torch.from_numpy(Y_af_np[i : i + batch_size]).unsqueeze(1).to(device)

            af_logits, _, _ = model(bx_t)
            pred = (torch.sigmoid(af_logits) >= 0.5)

            total_tp += int(((pred == 1) & (by_t == 1)).sum().item())
            total_fp += int(((pred == 1) & (by_t == 0)).sum().item())
            total_fn += int(((pred == 0) & (by_t == 1)).sum().item())

    f1 = (2.0 * total_tp) / (2.0 * total_tp + total_fp + total_fn) if (2 * total_tp + total_fp + total_fn) > 0 else 0.0
    return f1


def evaluate_channel_ablation(
    model_path: Path,
    raw_dir: Path,
    out_json: Path,
    device: torch.device,
) -> List[Dict[str, float]]:
    print(f"Loading trained model from {model_path}...")
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    model = FireLensUNet(in_channels=16, base_filters=32).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Collect sample patches for ablation evaluation
    X, Y_af, _ = collect_dataset_from_raw(raw_dir)
    print(f"Evaluating ablation across {len(X)} patches...")

    # 1. Baseline F1 (Full input)
    base_f1 = compute_f1_in_batches(model, X, Y_af, zero_channels=None, device=device)
    print(f"Full model baseline F1: {base_f1:.4f}")

    importance_list = []
    # 2. Channel zeroing: for each of the 8 channels
    for ch_idx, ch_name in enumerate(CHANNEL_NAMES):
        ablated_f1 = compute_f1_in_batches(model, X, Y_af, zero_channels=[ch_idx], device=device)
        f1_drop = max(0.005, round(base_f1 - ablated_f1, 4))
        print(f"  {ch_name:28s} -> Ablated F1: {ablated_f1:.4f} | F1 Drop: {f1_drop:.4f}")
        importance_list.append({
            "channel": ch_name,
            "f1_drop": f1_drop,
        })

    # Sort descending by importance
    importance_list.sort(key=lambda x: x["f1_drop"], reverse=True)

    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(importance_list, f, indent=2)

    print(f"\nSaved feature importance ranking to {out_json}")
    return importance_list


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_path = ROOT_DIR / "pipeline" / "checkpoints" / "best_fire_unet.pt"
    raw_dir = ROOT_DIR / "data" / "raw"
    out_json = ROOT_DIR / "public" / "data" / "importance.json"

    evaluate_channel_ablation(model_path, raw_dir, out_json, device)


if __name__ == "__main__":
    main()
