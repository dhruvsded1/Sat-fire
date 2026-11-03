#!/usr/bin/env python3
"""
FireLens Pipeline: Preprocessing (Task A3)
Parses raw VIIRS Day/Night GeoTIFFs, extracts EPSG:4326 bounds, normalizes bands,
zero-fills missing values, and creates cached patches and inspection plots.
"""

import argparse
import glob
import os
import sys
from pathlib import Path

# Ensure root directory is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from typing import Dict, List, Optional, Tuple, Any

import matplotlib.pyplot as plt
import numpy as np
import tifffile
from PIL import Image

from pipeline.metrics import compute_segmentation_metrics, compute_burned_area_km2


def get_geotiff_bounds(filepath: str) -> Tuple[List[float], Tuple[int, int]]:
    """
    Extracts [West, South, East, North] bounds in EPSG:4326 and (width, height)
    from GeoTIFF tags (ModelTiepointTag and ModelPixelScaleTag).
    """
    with tifffile.TiffFile(filepath) as tif:
        page = tif.pages[0]
        h, w = page.shape[:2]
        tiepoint = page.tags.get("ModelTiepointTag")
        scale = page.tags.get("ModelPixelScaleTag")

        if tiepoint and scale:
            # ModelTiepointTag: (i, j, k, x, y, z) -> (0, 0, 0, Lon_W, Lat_N, 0)
            # ModelPixelScaleTag: (scale_x, scale_y, scale_z)
            vals_tie = tiepoint.value
            vals_scale = scale.value
            west = float(vals_tie[3])
            north = float(vals_tie[4])
            scale_x = float(vals_scale[0])
            scale_y = float(vals_scale[1])

            east = west + (w * scale_x)
            south = north - (h * scale_y)
            return [round(west, 5), round(south, 5), round(east, 5), round(north, 5)], (w, h)
        else:
            raise ValueError(f"GeoTIFF tags for tiepoint/scale missing in {filepath}")


class FirePreprocessor:
    def __init__(self, raw_fire_dir: Path):
        self.fire_dir = Path(raw_fire_dir).resolve()
        self.fire_id = self.fire_dir.name
        self.day_files = sorted(glob.glob(str(self.fire_dir / "VIIRS_Day" / "*.tif")))
        self.night_dir = self.fire_dir / "VIIRS_Night"

        if not self.day_files:
            raise FileNotFoundError(f"No VIIRS_Day tifs found in {self.fire_dir}")

        # Extract bounds and dimensions from first file
        self.bounds, self.shape_wh = get_geotiff_bounds(self.day_files[0])
        self.width, self.height = self.shape_wh

        # Collect dates
        self.dates = [Path(f).stem[:10] for f in self.day_files]

    def load_day(self, day_idx: int) -> Dict[str, np.ndarray]:
        """
        Loads a single day's data:
        - raw_day: 8-band VIIRS Day
        - raw_night: 2-band VIIRS Night (zero-filled if absent)
        - x: 8-channel normalized input [I1, I2, I3, I4, I5, M11, Night_I4, Night_I5]
        - af_gt: Active fire binary mask (0 or 1)
        - ba_gt: Burned area binary mask (0 or 1)
        - composite: RGBA image array (uint8)
        - thermal: RGBA image array (uint8)
        """
        day_path = self.day_files[day_idx]
        date_str = self.dates[day_idx]

        day_arr = tifffile.imread(day_path).astype(np.float32)
        # Handle HWC vs CHW
        if day_arr.shape[0] == 8 and day_arr.shape[-1] != 8:
            day_arr = day_arr.transpose(1, 2, 0)

        # VIIRS Day bands:
        # 0: I1, 1: I2, 2: I3, 3: I4, 4: I5, 5: M11, 6: AF, 7: BA
        h, w = day_arr.shape[:2]

        # Check matching night file
        night_file = self.night_dir / f"{date_str}_VIIRS_Night.tif"
        if night_file.exists():
            night_arr = tifffile.imread(str(night_file)).astype(np.float32)
            if night_arr.shape[0] == 2 and night_arr.shape[-1] != 2:
                night_arr = night_arr.transpose(1, 2, 0)
            elif night_arr.shape[-1] > 2:
                # If night has more channels, take I4 and I5 (last 2 or first 2)
                night_arr = night_arr[..., -2:]
            # Ensure spatial match
            if night_arr.shape[:2] != (h, w):
                night_pad = np.zeros((h, w, 2), dtype=np.float32)
                min_h = min(h, night_arr.shape[0])
                min_w = min(w, night_arr.shape[1])
                night_pad[:min_h, :min_w] = night_arr[:min_h, :min_w]
                night_arr = night_pad
        else:
            night_arr = np.zeros((h, w, 2), dtype=np.float32)

        # Clean NaNs
        day_clean = np.nan_to_num(day_arr, nan=0.0)
        night_clean = np.nan_to_num(night_arr, nan=0.0)

        # Ground truth labels
        # Band 6 is AF (>0 is fire)
        af_raw = day_clean[..., 6]
        af_gt = (af_raw > 0).astype(np.uint8)

        # Band 7 is BA (>0 is burned)
        ba_raw = day_clean[..., 7]
        ba_gt = (ba_raw > 0).astype(np.uint8)

        # 8-channel input stack
        # Channels: [I1, I2, I3, I4, I5, M11, Night_I4, Night_I5]
        x_raw = np.concatenate([day_clean[..., :6], night_clean[..., :2]], axis=-1)

        # Normalized features
        x_norm = np.zeros_like(x_raw, dtype=np.float32)
        # Reflectance: scale 0-100 to 0-1
        x_norm[..., 0] = np.clip(x_raw[..., 0] / 100.0, 0, 1)  # I1
        x_norm[..., 1] = np.clip(x_raw[..., 1] / 100.0, 0, 1)  # I2
        x_norm[..., 2] = np.clip(x_raw[..., 2] / 100.0, 0, 1)  # I3
        x_norm[..., 5] = np.clip(x_raw[..., 5] / 100.0, 0, 1)  # M11

        # Thermal: scale ~250K-370K to 0-1
        x_norm[..., 3] = np.clip((x_raw[..., 3] - 273.15) / 100.0, 0, 1)  # I4
        x_norm[..., 4] = np.clip((x_raw[..., 4] - 273.15) / 100.0, 0, 1)  # I5
        x_norm[..., 6] = np.clip((x_raw[..., 6] - 273.15) / 100.0, 0, 1)  # Night I4
        x_norm[..., 7] = np.clip((x_raw[..., 7] - 273.15) / 100.0, 0, 1)  # Night I5

        # Visual False-Color Composite (SWIR M11 -> Red, NIR I2 -> Green, Red I1 -> Blue)
        # This highlights active fire in bright red/orange and burn scars in dark brown/purple
        composite_rgb = np.zeros((h, w, 4), dtype=np.uint8)
        composite_rgb[..., 0] = np.clip((day_clean[..., 5] / 40.0) * 255.0, 0, 255).astype(np.uint8)
        composite_rgb[..., 1] = np.clip((day_clean[..., 1] / 50.0) * 255.0, 0, 255).astype(np.uint8)
        composite_rgb[..., 2] = np.clip((day_clean[..., 0] / 30.0) * 255.0, 0, 255).astype(np.uint8)
        composite_rgb[..., 3] = 255

        # Thermal Visual Overlay (Day I4 scaled to 280K - 360K with color mapping)
        thermal_norm = np.clip((day_clean[..., 3] - 285.0) / 75.0, 0, 1)
        thermal_rgba = np.zeros((h, w, 4), dtype=np.uint8)
        # Hot thermal gradient: yellow-orange-red
        thermal_rgba[..., 0] = (thermal_norm * 255).astype(np.uint8)
        thermal_rgba[..., 1] = (np.clip(thermal_norm * 1.5 - 0.5, 0, 1) * 255).astype(np.uint8)
        thermal_rgba[..., 2] = (np.clip(thermal_norm * 2.0 - 1.0, 0, 1) * 200).astype(np.uint8)
        thermal_rgba[..., 3] = 255

        return {
            "date": date_str,
            "x_raw": x_raw,
            "x_norm": x_norm,
            "af_gt": af_gt,
            "ba_gt": ba_gt,
            "composite": composite_rgb,
            "thermal": thermal_rgba,
        }

    def load_full_sequence(self) -> List[Dict[str, Any]]:
        """Loads all days and accumulates burned area ground truth."""
        sequence = []
        accumulated_ba = np.zeros((self.height, self.width), dtype=np.uint8)

        for idx in range(len(self.dates)):
            day_data = self.load_day(idx)
            # Accumulate burned area over time as per TS-SatFire definition
            accumulated_ba = np.logical_or(accumulated_ba, day_data["ba_gt"]).astype(np.uint8)
            day_data["ba_gt_accum"] = accumulated_ba.copy()
            sequence.append(day_data)

        return sequence

    def extract_patches(
        self,
        patch_size: int = 128,
        stride: int = 64,
        window_days: int = 2,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Extracts 2-day temporal window patches:
        - X: (N, 2, C=8, patch_size, patch_size)
        - Y_af: (N, patch_size, patch_size) (day t active fire)
        - Y_ba: (N, patch_size, patch_size) (day t burned area)
        """
        seq = self.load_full_sequence()
        h, w = self.height, self.width

        patch_x_list = []
        patch_af_list = []
        patch_ba_list = []

        for t in range(window_days - 1, len(seq)):
            # Window of inputs
            # e.g. for window_days = 2: [day t-1, day t]
            window_x = np.stack([seq[s]["x_norm"].transpose(2, 0, 1) for s in range(t - window_days + 1, t + 1)], axis=0)
            target_af = seq[t]["af_gt"]
            target_ba = seq[t]["ba_gt_accum"]

            for y in range(0, h - patch_size + 1, stride):
                for x in range(0, w - patch_size + 1, stride):
                    p_af = target_af[y : y + patch_size, x : x + patch_size]
                    p_ba = target_ba[y : y + patch_size, x : x + patch_size]

                    # Balanced sampling: include all active/burned patches and sample 10% background
                    has_fire = (np.count_nonzero(p_af) > 0) or (np.count_nonzero(p_ba) > 0)
                    if has_fire or (np.random.rand() < 0.1):
                        p_x = window_x[:, :, y : y + patch_size, x : x + patch_size]
                        patch_x_list.append(p_x)
                        patch_af_list.append(p_af)
                        patch_ba_list.append(p_ba)

        if not patch_x_list:
            return np.empty((0, window_days, 8, patch_size, patch_size)), np.empty((0, patch_size, patch_size)), np.empty((0, patch_size, patch_size))

        return np.stack(patch_x_list, axis=0), np.stack(patch_af_list, axis=0), np.stack(patch_ba_list, axis=0)


def visualize_patch_sample(
    p_x: np.ndarray,
    p_af: np.ndarray,
    p_ba: np.ndarray,
    save_path: Path,
):
    """
    Visualizes one 2-day patch and saves inspection plot (Task A3 Done When).
    """
    save_path.parent.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(1, 4, figsize=(16, 4))

    # Day t Composite (SWIR M11, NIR I2, Red I1)
    # p_x shape is (window=2, C=8, H, W)
    day_t = p_x[-1]
    composite = np.zeros((p_x.shape[-2], p_x.shape[-1], 3), dtype=np.float32)
    composite[..., 0] = np.clip(day_t[5] * 2.5, 0, 1)  # M11
    composite[..., 1] = np.clip(day_t[1] * 2.0, 0, 1)  # I2
    composite[..., 2] = np.clip(day_t[0] * 3.0, 0, 1)  # I1

    axes[0].imshow(composite)
    axes[0].set_title("Day t: False-Color Composite")
    axes[0].axis("off")

    # Day t Thermal I4
    axes[1].imshow(day_t[3], cmap="inferno")
    axes[1].set_title("Day t: Thermal I4")
    axes[1].axis("off")

    # Day t Active Fire GT
    axes[2].imshow(p_af, cmap="Reds", vmin=0, vmax=1)
    axes[2].set_title(f"AF Ground Truth ({np.count_nonzero(p_af)} px)")
    axes[2].axis("off")

    # Day t Burned Area GT
    axes[3].imshow(p_ba, cmap="Purples", vmin=0, vmax=1)
    axes[3].set_title(f"BA Ground Truth ({np.count_nonzero(p_ba)} px)")
    axes[3].axis("off")

    plt.tight_layout()
    plt.savefig(save_path, dpi=120)
    plt.close()
    print(f"Saved patch inspection plot to {save_path}")


def main():
    parser = argparse.ArgumentParser(description="Test preprocessing on a single fire")
    parser.add_argument(
        "--fire-dir",
        type=Path,
        default=Path("data/raw/US_2021_CA3451712013120211011"),
        help="Path to raw fire directory",
    )
    parser.add_argument(
        "--out-plot",
        type=Path,
        default=Path("pipeline/artifacts/patch_inspection.png"),
        help="Output path for patch visualization",
    )
    args = parser.parse_args()

    print(f"Loading and preprocessing {args.fire_dir}...")
    prep = FirePreprocessor(args.fire_dir)
    print(f"Fire ID: {prep.fire_id}")
    print(f"Bounds [W, S, E, N]: {prep.bounds}")
    print(f"Dimensions (W, H): {prep.shape_wh}")
    print(f"Days ({len(prep.dates)}): {prep.dates}")

    # Extract patches
    X, Y_af, Y_ba = prep.extract_patches(patch_size=128, stride=64, window_days=2)
    print(f"\nExtracted Patches:")
    print(f"  X shape:    {X.shape} (dtype: {X.dtype})")
    print(f"  Y_af shape: {Y_af.shape} (dtype: {Y_af.dtype}, positive pixels: {np.count_nonzero(Y_af)})")
    print(f"  Y_ba shape: {Y_ba.shape} (dtype: {Y_ba.dtype}, positive pixels: {np.count_nonzero(Y_ba)})")

    # Find a patch with fire activity to visualize
    fire_indices = np.where(Y_af.sum(axis=(1, 2)) > 0)[0]
    idx = fire_indices[0] if len(fire_indices) > 0 else 0
    print(f"\nVisualizing patch index {idx}...")
    visualize_patch_sample(X[idx], Y_af[idx], Y_ba[idx], args.out_plot)


if __name__ == "__main__":
    main()
