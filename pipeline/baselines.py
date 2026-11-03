#!/usr/bin/env python3
"""
FireLens Baseline Models (Task A4)
Evaluates physical satellite brightness temperature threshold rules:
- AF Detection: Threshold rule on VIIRS I4 brightness temperature (I4 >= 328K)
- BA Mapping: Cumulative temporal maximum I4 (max_{s<=t} I4 >= 328K)
Generates metrics and daily predictions for test fires.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Any

import numpy as np

# Ensure root directory is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.preprocess import FirePreprocessor
from pipeline.metrics import compute_segmentation_metrics, compute_burned_area_km2


class ThresholdBaseline:
    def __init__(self, af_threshold_k: float = 328.0, ba_threshold_k: float = 328.0):
        self.af_threshold_k = af_threshold_k
        self.ba_threshold_k = ba_threshold_k

    def predict_day(
        self,
        day_raw_x: np.ndarray,
        cum_max_i4: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Predicts binary AF and BA masks for a single day.
        Returns:
            af_pred: (H, W) uint8 {0, 1}
            ba_pred: (H, W) uint8 {0, 1}
            new_cum_max_i4: (H, W) float32
        """
        # VIIRS Day I4 is channel 3
        day_i4 = day_raw_x[..., 3]
        new_cum_max = np.maximum(cum_max_i4, day_i4)

        # Active Fire Rule
        af_pred = (day_i4 >= self.af_threshold_k).astype(np.uint8)

        # Cumulative Burned Area Rule
        ba_pred = (new_cum_max >= self.ba_threshold_k).astype(np.uint8)

        return af_pred, ba_pred, new_cum_max

    def evaluate_fire(self, raw_fire_dir: Path) -> Dict[str, Any]:
        prep = FirePreprocessor(raw_fire_dir)
        seq = prep.load_full_sequence()
        h, w = prep.height, prep.width

        cum_max_i4 = np.zeros((h, w), dtype=np.float32)
        daily_metrics = {}
        daily_preds = {}

        total_af_tp = total_af_fp = total_af_fn = 0
        total_ba_tp = total_ba_fp = total_ba_fn = 0

        prev_burned_km2 = 0.0

        for day in seq:
            date = day["date"]
            af_pred, ba_pred, cum_max_i4 = self.predict_day(day["x_raw"], cum_max_i4)

            # Ground truths
            af_gt = day["af_gt"]
            ba_gt = day["ba_gt_accum"]

            # Compute segmentation metrics
            m_af = compute_segmentation_metrics(af_pred, af_gt)
            m_ba = compute_segmentation_metrics(ba_pred, ba_gt)

            # Accumulate totals
            total_af_tp += m_af["tp"]
            total_af_fp += m_af["fp"]
            total_af_fn += m_af["fn"]

            total_ba_tp += m_ba["tp"]
            total_ba_fp += m_ba["fp"]
            total_ba_fn += m_ba["fn"]

            burned_km2 = compute_burned_area_km2(ba_pred)
            new_km2 = round(max(0.0, burned_km2 - prev_burned_km2), 2)
            prev_burned_km2 = burned_km2

            daily_metrics[date] = {
                "f1_af": m_af["f1"],
                "iou_af": m_af["iou"],
                "f1_ba": m_ba["f1"],
                "iou_ba": m_ba["iou"],
                "burned_km2": burned_km2,
                "new_km2": new_km2,
            }

            daily_preds[date] = {
                "af_pred": af_pred,
                "ba_pred": ba_pred,
            }

        # Aggregate fire-level metrics
        overall_af_f1 = (
            (2.0 * total_af_tp) / (2.0 * total_af_tp + total_af_fp + total_af_fn)
            if (2.0 * total_af_tp + total_af_fp + total_af_fn) > 0
            else 0.0
        )
        overall_af_iou = (
            total_af_tp / (total_af_tp + total_af_fp + total_af_fn)
            if (total_af_tp + total_af_fp + total_af_fn) > 0
            else 0.0
        )

        overall_ba_f1 = (
            (2.0 * total_ba_tp) / (2.0 * total_ba_tp + total_ba_fp + total_ba_fn)
            if (2.0 * total_ba_tp + total_ba_fp + total_ba_fn) > 0
            else 0.0
        )
        overall_ba_iou = (
            total_ba_tp / (total_ba_tp + total_ba_fp + total_ba_fn)
            if (total_ba_tp + total_ba_fp + total_ba_fn) > 0
            else 0.0
        )

        return {
            "fire_id": prep.fire_id,
            "bounds": prep.bounds,
            "shape_wh": prep.shape_wh,
            "days": prep.dates,
            "daily_metrics": daily_metrics,
            "daily_preds": daily_preds,
            "summary": {
                "af": {"f1": round(overall_af_f1, 4), "iou": round(overall_af_iou, 4)},
                "ba": {"f1": round(overall_ba_f1, 4), "iou": round(overall_ba_iou, 4)},
            },
        }


def main():
    parser = argparse.ArgumentParser(description="Run baseline evaluation on fires")
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path("data/raw"),
        help="Directory with raw fire subdirectories",
    )
    parser.add_argument(
        "--out-json",
        type=Path,
        default=Path("pipeline/baseline_results.json"),
        help="Output JSON for baseline benchmark metrics",
    )
    args = parser.parse_args()

    baseline = ThresholdBaseline(af_threshold_k=328.0, ba_threshold_k=328.0)
    fire_dirs = sorted([d for d in args.raw_dir.iterdir() if d.is_dir()])

    print(f"Running baseline on {len(fire_dirs)} fires in {args.raw_dir}...")
    results = {}
    tot_af_f1, tot_af_iou = [], []
    tot_ba_f1, tot_ba_iou = [], []

    for fdir in fire_dirs:
        try:
            res = baseline.evaluate_fire(fdir)
            fid = res["fire_id"]
            results[fid] = {
                "summary": res["summary"],
                "daily_metrics": res["daily_metrics"],
            }
            af_f1 = res["summary"]["af"]["f1"]
            af_iou = res["summary"]["af"]["iou"]
            ba_f1 = res["summary"]["ba"]["f1"]
            ba_iou = res["summary"]["ba"]["iou"]

            tot_af_f1.append(af_f1)
            tot_af_iou.append(af_iou)
            tot_ba_f1.append(ba_f1)
            tot_ba_iou.append(ba_iou)

            print(f"Fire {fid}: AF F1={af_f1:.4f} IoU={af_iou:.4f} | BA F1={ba_f1:.4f} IoU={ba_iou:.4f}")
        except Exception as e:
            print(f"Error evaluating fire {fdir.name}: {e}")

    summary = {
        "af": {
            "mean_f1": round(float(np.mean(tot_af_f1)), 4) if tot_af_f1 else 0.0,
            "mean_iou": round(float(np.mean(tot_af_iou)), 4) if tot_af_iou else 0.0,
        },
        "ba": {
            "mean_f1": round(float(np.mean(tot_ba_f1)), 4) if tot_ba_f1 else 0.0,
            "mean_iou": round(float(np.mean(tot_ba_iou)), 4) if tot_ba_iou else 0.0,
        },
        "fires": results,
    }

    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 50)
    print("BASELINE BENCHMARK SUMMARY (Test Fires)")
    print(f"Active Fire Detection (AF): Mean F1 = {summary['af']['mean_f1']}, Mean IoU = {summary['af']['mean_iou']}")
    print(f"Burned Area Mapping (BA):   Mean F1 = {summary['ba']['mean_f1']}, Mean IoU = {summary['ba']['mean_iou']}")
    print(f"Saved results to {args.out_json}")
    print("=" * 50)


if __name__ == "__main__":
    main()
