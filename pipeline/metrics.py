#!/usr/bin/env python3
"""
FireLens Evaluation Metrics (Task A4)
Computes binary segmentation metrics (F1, IoU, Precision, Recall) and burned area (km2).
Includes unit tests on toy masks.
"""

from typing import Dict, Tuple
import numpy as np


PIXEL_AREA_KM2_375M = (375.0 * 375.0) / 1e6  # ~0.140625 km^2


def compute_segmentation_metrics(
    pred: np.ndarray,
    gt: np.ndarray,
    threshold: float = 0.5,
) -> Dict[str, float]:
    """
    Computes TP, FP, FN, TN, F1, IoU, Precision, Recall between binary masks.
    """
    pred_bin = (pred >= threshold).astype(bool)
    gt_bin = (gt >= 0.5).astype(bool)

    tp = int(np.count_nonzero(pred_bin & gt_bin))
    fp = int(np.count_nonzero(pred_bin & ~gt_bin))
    fn = int(np.count_nonzero(~pred_bin & gt_bin))
    tn = int(np.count_nonzero(~pred_bin & ~gt_bin))

    total_positives = tp + fp + fn
    if total_positives == 0:
        # Both ground truth and prediction are completely empty -> perfect match
        f1 = 1.0
        iou = 1.0
        precision = 1.0
        recall = 1.0
    else:
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2.0 * tp) / (2.0 * tp + fp + fn) if (2.0 * tp + fp + fn) > 0 else 0.0
        iou = tp / (tp + fp + fn) if (tp + fp + fn) > 0 else 0.0

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "f1": round(f1, 4),
        "iou": round(iou, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
    }


def compute_burned_area_km2(mask: np.ndarray, pixel_size_m: float = 375.0) -> float:
    """Computes area in km^2 from a binary mask."""
    pixel_area_km2 = (pixel_size_m * pixel_size_m) / 1e6
    num_pixels = int(np.count_nonzero(mask >= 0.5))
    return round(num_pixels * pixel_area_km2, 2)


def test_metrics_on_toy_mask():
    """Unit test for segmentation metrics on controlled toy masks."""
    # Case 1: Identical 4x4 masks
    gt1 = np.array([
        [0, 0, 1, 1],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ])
    pred1 = gt1.copy()
    m1 = compute_segmentation_metrics(pred1, gt1)
    assert m1["f1"] == 1.0
    assert m1["iou"] == 1.0
    assert m1["tp"] == 4
    assert m1["fp"] == 0
    assert m1["fn"] == 0

    # Case 2: Partial overlap
    # gt has 4 positive pixels, pred has 4 positive pixels, overlap of 2 pixels
    pred2 = np.array([
        [0, 0, 1, 1],  # 2 TP
        [0, 0, 0, 1],  # 1 FP
        [0, 0, 0, 1],  # 1 FP
        [0, 0, 0, 0],
    ])
    m2 = compute_segmentation_metrics(pred2, gt1)
    # TP = 2, FP = 2, FN = 2
    # IoU = 2 / (2 + 2 + 2) = 2/6 = 0.3333
    # F1 = 4 / (4 + 2 + 2) = 4/8 = 0.5000
    assert m2["tp"] == 2
    assert m2["fp"] == 2
    assert m2["fn"] == 2
    assert abs(m2["iou"] - 0.3333) < 1e-3
    assert abs(m2["f1"] - 0.5000) < 1e-3

    # Case 3: Empty masks
    gt_empty = np.zeros((4, 4))
    pred_empty = np.zeros((4, 4))
    m3 = compute_segmentation_metrics(pred_empty, gt_empty)
    assert m3["f1"] == 1.0
    assert m3["iou"] == 1.0

    # Case 4: Burned area calculation
    # 100 pixels at 375m resolution = 100 * 0.140625 = 14.06 km^2
    mask_100 = np.zeros((20, 20))
    mask_100[:10, :10] = 1
    area = compute_burned_area_km2(mask_100, pixel_size_m=375.0)
    assert abs(area - 14.06) <= 0.05

    print("All metric unit tests on toy masks passed successfully!")


if __name__ == "__main__":
    test_metrics_on_toy_mask()

