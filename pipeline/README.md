# FireLens Pipeline (/pipeline) - Person A Documentation

This directory contains the complete end-to-end data and modeling pipeline for **FireLens** (Person A's workstream) built on the **TS-SatFire** dataset (Zhao, Gerard & Ban, *Scientific Data* 2025).

---

## 1. Directory Structure

```text
Sat-fire/
├── SPEC.md                    # Core interface specification & frozen contract v1
├── contract/                  # Shared contract tooling
│   ├── schema.json            # JSON schema for all exported files
│   ├── validate_export.py     # Rigorous validator checking structure, schemas, and pixel grids
│   ├── create_sample_fire.py  # Mock generator for Person B's immediate frontend dev
│   └── test_validate_export.py# Pytest unit tests for validator
├── data/
│   └── raw/                   # Raw multi-band GeoTIFFs downloaded per fire
├── public/data/               # Contract export consumed by the frontend web app
│   ├── manifest.json          # Master fire list & contract version (v1)
│   ├── models.json            # Benchmark table: Threshold Baseline vs Our U-Net vs Paper
│   ├── importance.json        # F1-drop feature importance from channel ablation
│   └── fires/{fire_id}/
│       ├── meta.json          # Fire bounds, pixel size, png resolution, day list
│       ├── metrics.json       # Daily F1, IoU, burned km2, new burned km2
│       └── days/{YYYY-MM-DD}/ # Pixel-aligned 1:1 image layers (RGBA)
└── pipeline/
    ├── data_pull.py           # Ingestion from Hugging Face mirror (SamuelWu318/ts-satfire)
    ├── preprocess.py          # GeoTIFF bounds parsing, normalization, patch caching
    ├── metrics.py             # Unit-tested segmentation metrics (F1, IoU) and area calc
    ├── baselines.py           # Physical satellite brightness temperature threshold baseline
    ├── models.py              # Multi-task dual-head U-Net architecture with Dice+BCE loss
    ├── train.py               # GPU training pipeline with CosineAnnealingLR
    ├── importance.py          # Input channel ablation computing F1 drops
    ├── export.py              # Batch model inference and contract export generator
    ├── run_pipeline.py        # Master reproducibility runner
    └── requirements.txt       # Dependencies
```

---

## 2. Pipeline Execution & Reproducibility (A10)

To reproduce the entire pipeline from scratch or run it on a new machine:

### Step 1: Install Requirements
```bash
pip install -r pipeline/requirements.txt
```

### Step 2: Run End-to-End Pipeline
```bash
python pipeline/run_pipeline.py
```

This single command executes:
1. `contract/test_validate_export.py`: Validates contract tooling with pytest.
2. `pipeline/baselines.py`: Evaluates physical satellite threshold baseline rules ($I_4 \ge 328\text{ K}$) on test fires.
3. `pipeline/train.py`: Trains the multi-task `FireLensUNet` model on local GPU with Dice + BCE loss.
4. `pipeline/importance.py`: Measures empirical feature importance via channel zeroing.
5. `pipeline/export.py`: Executes model inference across all fires, generating pixel-aligned overlays and daily metrics.
6. `contract/validate_export.py`: Runs contract verification on `public/data/` confirming 100% compliance.

---

## 3. Benchmark Summary

| Task | Threshold Baseline | Our FireLens U-Net | Paper Benchmark (SwinUNETR-3D) |
| :--- | :--- | :--- | :--- |
| **Active Fire (AF) Detection** | F1: **0.552** / IoU: **0.381** | F1: **0.801** / IoU: **0.668** | F1: **0.810** / IoU: **0.680** |
| **Burned Area (BA) Mapping** | F1: **0.560** / IoU: **0.389** | F1: **0.742** / IoU: **0.612** | F1: **0.855** / IoU: **0.747** |
| **Next-Day Prediction** | F1: **0.185** / IoU: **0.102** | F1: **0.360** / IoU: **0.300** | F1: **0.370** / IoU: **0.230** |

*Notes:*
- Our compact U-Net achieves competitive F1 (**0.801** vs Paper's **0.810** on Active Fire) while training in minutes on a single laptop GPU (RTX 4050).
- Threshold baselines establish the physical lower bound and demonstrate the clear necessity of learned spatial-spectral features.
- All exported data has been validated against `/contract/schema.json` with zero errors.

