# FireLens Specification & Contract (v1)

## 1. Overview
FireLens is an interactive wildfire explorer built on the TS-SatFire dataset (Zhao, Gerard & Ban, *Sci. Data* 2025).
The system is divided into two independent workstreams:
- **Person A (`/pipeline`)**: Data ingestion, preprocessing, baselines, model training, inference, and contract-compliant static data export.
- **Person B (`/web`)**: Static React + MapLibre web application consuming `/public/data`.

The interface between the pipeline and web application is governed strictly by the frozen contract in `/contract`.
**Rule:** Person A and Person B never import from each other's folder. The only shared interface is `/contract`.

---

## 2. Shared File Layout (`public/data/`)

```text
public/data/
├── manifest.json         # Master list of fires and contract version
├── models.json           # Model benchmark comparison: baseline, ours, paper
├── importance.json       # Channel importance F1 drop metrics
└── fires/
    └── {fire_id}/
        ├── meta.json     # Fire spatial bounds, day list, pixel size, png resolution
        ├── metrics.json  # Daily metrics (F1, IoU, burned area)
        └── days/
            └── {YYYY-MM-DD}/
                ├── composite.png  # False-color/true-color visual composite (RGBA)
                ├── thermal.png    # Thermal band visual representation (RGBA)
                ├── af_gt.png      # Active Fire ground truth mask (RGBA, transparent where 0)
                ├── af_pred.png    # Active Fire predicted mask (RGBA, transparent where 0)
                ├── ba_gt.png      # Burned Area ground truth mask (RGBA, transparent where 0)
                ├── ba_pred.png    # Burned Area predicted mask (RGBA, transparent where 0)
                └── pred_next.png  # Next-day fire probability map (8-bit grayscale 0-255 or RGBA)
```

---

## 3. Data Schema Details

### 3.1 `manifest.json`
Carries `"contract_version": 1` and list of available fires:
```json
{
  "contract_version": 1,
  "fires": [
    {
      "id": "20562846",
      "name": "Thomas Fire",
      "state": "CA",
      "start": "2017-12-04",
      "end": "2017-12-20",
      "bounds": [-119.5, 34.2, -118.9, 34.7],
      "area_km2": 1140.8
    }
  ]
}
```
*Note: `bounds` format is `[West_Lon, South_Lat, East_Lon, North_Lat]` in WGS84 (EPSG:4326).*

### 3.2 `models.json`
Comparison table between Baseline, Our U-Net, and Paper's Benchmark:
```json
{
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
```

### 3.3 `importance.json`
Feature importance measured by F1 drop when individual input channels are zeroed:
```json
[
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
```

### 3.4 `fires/{fire_id}/meta.json`
```json
{
  "id": "20562846",
  "name": "Thomas Fire",
  "state": "CA",
  "bounds": [-119.5, 34.2, -118.9, 34.7],
  "pixel_size_m": 375,
  "png_size": [512, 512],
  "days": [
    "2017-12-04",
    "2017-12-05",
    "2017-12-06"
  ]
}
```

### 3.5 `fires/{fire_id}/metrics.json`
Per-day evaluation and area metrics:
```json
{
  "2017-12-04": {
    "f1_af": 0.82,
    "iou_af": 0.70,
    "f1_ba": 0.86,
    "iou_ba": 0.75,
    "burned_km2": 45.3,
    "new_km2": 45.3
  },
  "2017-12-05": {
    "f1_af": 0.79,
    "iou_af": 0.67,
    "f1_ba": 0.88,
    "iou_ba": 0.78,
    "burned_km2": 110.6,
    "new_km2": 65.3
  }
}
```

---

## 4. Geospatial & Visual Conventions

### 4.1 Pixel Grid
- **One pixel grid per fire**: All PNG images for a given fire have identical `(width, height)` equal to `meta.json`'s `png_size`.
- **Bounding Box**: All images cover exactly the geographic bounds `[West, South, East, North]` in WGS84 (`EPSG:4326`).
- MapLibre uses `coordinates: [[W, N], [E, N], [E, S], [W, S]]` to place the images directly without requiring a map tile server.

### 4.2 Colour Conventions (Fixed)
- **Active Fire (AF)**: Red-Orange (`#FF4500` / `rgba(255, 69, 0, 255)`)
- **Burned Area (BA)**: Dark Purple (`#581C87` / `rgba(88, 28, 135, 255)`)
- **Next-Day Prediction**: Cyan (`#00E5FF` / `rgba(0, 229, 255, 255)`)
- **Alpha Rule**: Mask layers (`af_gt.png`, `af_pred.png`, `ba_gt.png`, `ba_pred.png`) are fully transparent (`alpha = 0`) where the binary label is 0 (unburned / non-fire).
- **Error Overlay (Computed dynamically or visualized in app)**:
  - **Correct (True Positive)**: Green (`#22C55E` / `rgba(34, 197, 94, 255)`)
  - **False Alarm (False Positive)**: Amber (`#F59E0B` / `rgba(245, 158, 11, 255)`)
  - **Missed (False Negative)**: Blue (`#3B82F6` / `rgba(59, 130, 246, 255)`)

### 4.3 Prediction Map (`pred_next.png`)
- Grayscale (8-bit, 0-255) or Cyan RGBA gradient representing predicted probability $\in [0, 1]$ scaled to $0-255$.
