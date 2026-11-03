# FireLens – Interactive Wildfire Detection & Next-Day Prediction Explorer

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-4.7-blue?logo=maplibre&logoColor=white)](https://maplibre.org/)
[![TS-SatFire](https://img.shields.io/badge/Dataset-TS--SatFire-orange)](https://github.com/dhruvsded1/Sat-fire)

> **FireLens** is an interactive geospatial wildfire monitoring and prediction platform built around the research concepts and data of the **TS-SatFire** benchmark (*Zhao, Gerard & Ban, Scientific Data 2025*). It provides an end-to-end intelligence suite for disaster response teams and machine learning researchers to explore active fire fronts, cumulative burned scars, and 24-hour forward spread probability maps across satellite overpasses.

---

## 🌟 Key Capabilities

1. **Geospatial Intelligence Map (MapLibre GL)**:
   - High-contrast, dark-mode geospatial engine with smooth panning, zooming, and tilting.
   - Georeferenced raster overlays displaying VIIRS multi-spectral composites, thermal radiance heatmaps, active fire masks, and next-day spread probability fields.
2. **Interactive Pixel Radiometric Inspector**:
   - Click or hover anywhere across the firefront to sample real-time pixel telemetry.
   - Computes estimated brightness temperature in Kelvin (VIIRS I4 3.74 µm), classification state (Flaming Firefront, Smoldering Scar, Unburned Biomass), and next-day spread risk probability.
3. **Swipe Comparison Mode**:
   - Draggable curtain divider allowing side-by-side comparison between raw satellite imagery (SWIR/NIR/Red false-color or thermal infrared) and model detection/prediction masks.
4. **Spatial Error & Confusion Matrix Visualization**:
   - Real-time color-coded classification:
     - 🟢 **Correct Detection (True Positive)**: `#22C55E`
     - 🟠 **False Alarm (False Positive)**: `#F59E0B`
     - 🔵 **Missed Detection (False Negative)**: `#3B82F6`
5. **Interactive Timeline & Playback**:
   - Scrub across 8 to 20 days of wildfire progression per event.
   - Automatic playback animation with variable speeds (1x, 2x, 4x) and timeline milestone markers.
6. **Next-Day Fire Spread Prediction**:
   - Evaluates next-day newly burned areas with an interactive probability threshold slider (10% to 90%).
   - Optional comparison toggle overlaying the actual next-day growth perimeter.
7. **Model Benchmarks & Evaluation**:
   - Comprehensive comparison between the Radiometric Threshold Baseline (`I4 >= 328K`), the lightweight `FireLens U-Net`, and the published `TS-SatFire SwinUNETR-3D` benchmark.
8. **Permutation Channel Feature Importance**:
   - Quantifies predictive degradation ($\Delta\text{F1}$ drop) across VIIRS thermal/optical bands, meteorological forcings (wind vectors, humidity), and topographic slope.

---

## 🛰️ Sensor Characteristics & Radiative Transfer

| Sensor Channel | Spectral Band | Wavelength | Physical Role in Wildfire Intelligence |
| :--- | :--- | :--- | :--- |
| **VIIRS Band I4** | Mid-Wave IR (MWIR) | **3.74 µm** | **Primary Firefront Channel**: Sensitive to Planck radiation emitted at flaming temperatures (600–1200 K). Even sub-pixel fires trigger strong brightness temperature spikes. |
| **VIIRS Band I5** | Long-Wave IR (LWIR) | **11.45 µm** | **Background Reference**: Senses ambient surface temperatures (~300 K) and cooler smoldering embers. Used for differential contextual filtering. |
| **VIIRS Band M11**| Short-Wave IR (SWIR)| **2.25 µm** | **Smoke Penetration**: Wavelength exceeds smoke aerosol particle sizes, penetrating dense haze to image flaming perimeters and burn scars. |
| **VIIRS Band I2** | Near-Infrared (NIR) | **0.86 µm** | **Vegetation Vigor**: Sharp contrast between live canopy chlorophyll reflectance and charred vegetative burn scars. |
| **VIIRS Band I1** | Red Visible | **0.64 µm** | **Visual Albedo**: Standard visible red reflectance for composite generation. |
| **Weather / Wind**| Meteorological | 10m U/V | **Advection Forcing**: Governs head-fire velocity, flame tilt, and downwind spotting dispersion. |
| **DEM / Slope** | Topographic | 30m Grid | **Convective Acceleration**: Pre-heating of uphill fuels accelerates fire propagation up steep canyon slopes. |

---

## 🏗️ Architecture & Project Structure

The project strictly follows the two-person decoupled architecture defined in `SPEC.md`:

```
Sat-fire/
├── contract/
│   ├── schema.json               # Frozen JSON Schema contract
│   ├── validate_export.py        # Strict export verification script
│   └── test_validate_export.py   # Automated schema test suite
│
├── pipeline/
│   ├── data_pull.py              # TS-SatFire dataset downloader & ROI extractor
│   ├── preprocess.py             # Radiometric normalization & composite generator
│   ├── baselines.py              # Thermal threshold baseline detector & tracker
│   ├── models.py                 # PyTorch U-Net architecture definition
│   ├── train.py                  # Model training pipeline
│   ├── importance.py             # Channel permutation feature importance
│   ├── export.py                 # Static JSON & PNG export engine
│   └── requirements.txt          # Python dependencies
│
├── public/
│   └── data/
│       ├── manifest.json         # Master manifest of 11 wildfire events
│       ├── models.json           # Model benchmark leaderboard
│       ├── importance.json       # Channel importance ΔF1 drop metrics
│       └── fires/
│           └── {fire_id}/
│               ├── meta.json     # Georeferenced bounds, pixel size, days
│               ├── metrics.json  # Daily F1, IoU, burned_km2, new_km2
│               └── days/
│                   └── {YYYY-MM-DD}/
│                       ├── composite.png  # False-color SWIR/NIR/Red
│                       ├── thermal.png    # Thermal infrared radiance
│                       ├── af_gt.png      # Active fire ground truth mask
│                       ├── af_pred.png    # Active fire predicted mask
│                       ├── ba_gt.png      # Burned area ground truth mask
│                       ├── ba_pred.png    # Burned area predicted mask
│                       └── pred_next.png  # Next-day spread probability map
│
├── web/
│   ├── src/
│   │   ├── components/           # MapViewer, LayerControls, TimelinePlayer, etc.
│   │   ├── services/             # Type-safe contract loaders & pixel sampler
│   │   ├── types/                # Strict TypeScript contract definitions
│   │   ├── App.tsx               # Main application coordinator
│   │   └── main.tsx              # React entrypoint
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── SPEC.md                       # Full specification & interface contract
└── README.md                     # Documentation & quickstart guide
```

---

## 🚀 Quickstart

### 1. Prerequisites
- **Node.js**: v18 or higher (v24 recommended)
- **Python**: 3.10+ (for pipeline inspection or re-generation)

### 2. Running the Web Application
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
cd web
npm run build
npm run preview
```
The output will be bundled cleanly into `web/dist/`, ready for static deployment on **Vercel**, **Netlify**, or **GitHub Pages**.

### 4. Running the Pipeline & Contract Validation
To verify the exported dataset against `contract/schema.json`:
```bash
python contract/validate_export.py
```

---

## 📊 Benchmark Leaderboard

| Model | Active Fire F1 | Active Fire IoU | Cumulative Burned F1 | Next-Day F1 | Next-Day IoU | Inference Speed | Parameters |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Threshold Baseline** (`I4 >= 328K`) | 55.2% | 38.1% | 56.0% | 18.5% | 10.2% | **2.4 ms** | 0 (Rule) |
| **FireLens U-Net (Ours)** | **76.8%** | **63.5%** | **81.2%** | **31.5%** | **20.8%** | **18.5 ms** | **1.8 M** |
| **TS-SatFire Paper** (*SwinUNETR-3D*) | 81.0% | 68.0% | 85.5% | 37.0% | 23.0% | 68.0 ms | 24.5 M |

---

## ⚖️ License & Attribution
- TS-SatFire dataset citation: Zhao, Gerard & Ban, *"TS-SatFire: A Time-Series Satellite Wildfire Benchmark Dataset"*, *Scientific Data* (2025).
- Developed for the FireLens Wildfire Intelligence Project.
