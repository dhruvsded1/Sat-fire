#!/usr/bin/env python3
"""
Generates a minimal valid FireLens sample fire conforming to contract v1.
Can be used by tests or by Person B to test the web frontend immediately.
"""

import json
from pathlib import Path
import numpy as np
from PIL import Image

# Contract Colors
# AF: Red-Orange (255, 69, 0)
# BA: Dark Purple (88, 28, 135)
# Prediction: Cyan (0, 229, 255)
AF_COLOR = (255, 69, 0)
BA_COLOR = (88, 28, 135)


def generate_sample_dataset(output_dir: Path, width: int = 128, height: int = 128):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    fire_id = "sample_fire_01"
    fire_dir = output_dir / "fires" / fire_id
    days = ["2021-08-15", "2021-08-16"]

    # 1. manifest.json
    manifest_data = {
      "contract_version": 1,
      "fires": [
        {
          "id": fire_id,
          "name": "Sample Rim Fire",
          "state": "CA",
          "start": "2021-08-15",
          "end": "2021-08-16",
          "bounds": [-120.25, 37.80, -119.80, 38.15],
          "area_km2": 85.4
        }
      ]
    }
    with open(output_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    # 2. models.json
    models_data = {
      "contract_version": 1,
      "tasks": ["af", "ba", "prediction"],
      "models": {
        "baseline": {
          "name": "Threshold Baseline",
          "af": { "f1": 0.65, "iou": 0.52 },
          "ba": { "f1": 0.70, "iou": 0.58 },
          "prediction": { "f1": 0.20, "iou": 0.14 }
        },
        "ours": {
          "name": "FireLens U-Net",
          "af": { "f1": 0.78, "iou": 0.66 },
          "ba": { "f1": 0.82, "iou": 0.71 },
          "prediction": { "f1": 0.32, "iou": 0.22 }
        },
        "paper": {
          "name": "TS-SatFire Paper (SwinUNETR-3D)",
          "af": { "f1": 0.810, "iou": 0.680 },
          "ba": { "f1": 0.855, "iou": 0.747 },
          "prediction": { "f1": 0.370, "iou": 0.230 }
        }
      }
    }
    with open(output_dir / "models.json", "w", encoding="utf-8") as f:
        json.dump(models_data, f, indent=2)

    # 3. importance.json
    importance_data = [
      { "channel": "VIIRS_I4 (Thermal)", "f1_drop": 0.185 },
      { "channel": "VIIRS_I5 (Thermal)", "f1_drop": 0.112 },
      { "channel": "VIIRS_I1 (Red)", "f1_drop": 0.045 },
      { "channel": "VIIRS_I2 (NIR)", "f1_drop": 0.038 },
      { "channel": "VIIRS_I3 (SWIR)", "f1_drop": 0.032 },
      { "channel": "VIIRS_M11", "f1_drop": 0.051 },
      { "channel": "Weather (Wind)", "f1_drop": 0.028 },
      { "channel": "Weather (Humidity)", "f1_drop": 0.022 },
      { "channel": "DEM (Terrain Slope)", "f1_drop": 0.019 }
    ]
    with open(output_dir / "importance.json", "w", encoding="utf-8") as f:
        json.dump(importance_data, f, indent=2)

    # 4. fires/{fire_id}/meta.json
    fire_dir.mkdir(parents=True, exist_ok=True)
    meta_data = {
      "id": fire_id,
      "name": "Sample Rim Fire",
      "state": "CA",
      "bounds": [-120.25, 37.80, -119.80, 38.15],
      "pixel_size_m": 375,
      "png_size": [width, height],
      "days": days
    }
    with open(fire_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta_data, f, indent=2)

    # 5. fires/{fire_id}/metrics.json
    metrics_data = {
      "2021-08-15": {
        "f1_af": 0.81,
        "iou_af": 0.69,
        "f1_ba": 0.84,
        "iou_ba": 0.73,
        "burned_km2": 32.4,
        "new_km2": 32.4
      },
      "2021-08-16": {
        "f1_af": 0.83,
        "iou_af": 0.71,
        "f1_ba": 0.87,
        "iou_ba": 0.77,
        "burned_km2": 85.4,
        "new_km2": 53.0
      }
    }
    with open(fire_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)

    # 6. Days images
    # Create coordinate grid for drawing realistic blobs
    y, x = np.ogrid[:height, :width]
    center_y, center_x = height // 2, width // 2

    for day_idx, day in enumerate(days):
        day_dir = fire_dir / "days" / day
        day_dir.mkdir(parents=True, exist_ok=True)

        radius_ba = (day_idx + 1) * 20
        radius_af = 12

        dist_from_center = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)

        ba_mask = (dist_from_center <= radius_ba).astype(np.uint8)
        af_mask = ((dist_from_center <= (radius_ba + 5)) & (dist_from_center >= (radius_ba - 8))).astype(np.uint8)

        # composite.png: Land surface visual composite (RGBA)
        composite = np.zeros((height, width, 4), dtype=np.uint8)
        composite[..., 0] = 70   # R
        composite[..., 1] = 130  # G
        composite[..., 2] = 60   # B
        composite[..., 3] = 255  # Solid Alpha
        Image.fromarray(composite, mode="RGBA").save(day_dir / "composite.png")

        # thermal.png: False color thermal brightness (RGBA)
        thermal = np.zeros((height, width, 4), dtype=np.uint8)
        t_intensity = np.clip(255 - dist_from_center * 4, 20, 255).astype(np.uint8)
        thermal[..., 0] = t_intensity
        thermal[..., 1] = (t_intensity * 0.4).astype(np.uint8)
        thermal[..., 2] = 20
        thermal[..., 3] = 255
        Image.fromarray(thermal, mode="RGBA").save(day_dir / "thermal.png")

        # af_gt.png & af_pred.png: RGBA mask, transparent where 0
        def make_rgba_mask(mask: np.ndarray, rgb_color: tuple, noise: float = 0.0) -> np.ndarray:
            arr = np.zeros((height, width, 4), dtype=np.uint8)
            active = mask.copy()
            if noise > 0:
                rand = np.random.rand(height, width)
                active = (active | (rand < noise)).astype(np.uint8)
            arr[active == 1, 0] = rgb_color[0]
            arr[active == 1, 1] = rgb_color[1]
            arr[active == 1, 2] = rgb_color[2]
            arr[active == 1, 3] = 255
            return arr

        af_gt_arr = make_rgba_mask(af_mask, AF_COLOR)
        Image.fromarray(af_gt_arr, mode="RGBA").save(day_dir / "af_gt.png")

        af_pred_arr = make_rgba_mask(af_mask, AF_COLOR, noise=0.01)
        Image.fromarray(af_pred_arr, mode="RGBA").save(day_dir / "af_pred.png")

        # ba_gt.png & ba_pred.png: RGBA mask, transparent where 0
        ba_gt_arr = make_rgba_mask(ba_mask, BA_COLOR)
        Image.fromarray(ba_gt_arr, mode="RGBA").save(day_dir / "ba_gt.png")

        ba_pred_arr = make_rgba_mask(ba_mask, BA_COLOR, noise=0.01)
        Image.fromarray(ba_pred_arr, mode="RGBA").save(day_dir / "ba_pred.png")

        # pred_next.png: 8-bit probability map, 0-255
        pred_prob = np.clip((255 - np.abs(dist_from_center - (radius_ba + 12)) * 10), 0, 255).astype(np.uint8)
        Image.fromarray(pred_prob, mode="L").save(day_dir / "pred_next.png")

    print(f"Sample fire generated successfully at: {output_dir}")


if __name__ == "__main__":
    import sys
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("contract/sample_fire")
    generate_sample_dataset(out)
