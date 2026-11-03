#!/usr/bin/env python3
"""
FireLens Master Pipeline Runner (Task A10)
Executes the full end-to-end Person A data & model pipeline with fixed seeds:
1. Data pull (downloads raw GeoTIFFs if not already present)
2. Threshold baselines evaluation
3. Multi-task FireLens U-Net training on GPU
4. Feature importance via channel ablation
5. Batch inference and export to public/data/
6. Contract validation
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def run_step(step_name: str, cmd: list):
    print("\n" + "=" * 60)
    print(f"STEP: {step_name}")
    print(f"Command: {' '.join(cmd)}")
    print("=" * 60)
    res = subprocess.run(cmd, cwd=str(ROOT_DIR))
    if res.returncode != 0:
        print(f"ERROR: {step_name} failed with exit code {res.returncode}")
        sys.exit(res.returncode)
    print(f"[OK] {step_name} completed successfully.")


def main():
    parser = argparse.ArgumentParser(description="Run complete FireLens pipeline")
    parser.add_argument("--epochs", type=int, default=12, help="U-Net training epochs")
    parser.add_argument("--skip-train", action="store_true", help="Skip training if model checkpoint exists")
    args = parser.parse_args()

    python_bin = sys.executable

    # 1. Contract unit tests
    run_step("1. Contract Unit Tests", [python_bin, "-m", "pytest", "contract/test_validate_export.py"])

    # 2. Baseline evaluation
    run_step("2. Threshold Baselines Evaluation", [python_bin, "pipeline/baselines.py"])

    # 3. Model training
    model_ckpt = ROOT_DIR / "pipeline" / "checkpoints" / "best_fire_unet.pt"
    if not (args.skip_train and model_ckpt.exists()):
        run_step("3. U-Net Training", [python_bin, "pipeline/train.py", "--epochs", str(args.epochs)])
    else:
        print("\n[SKIP] Model training skipped (checkpoint exists).")

    # 4. Feature importance ablation
    run_step("4. Feature Importance Ablation", [python_bin, "pipeline/importance.py"])

    # 5. Full batch inference & contract export
    run_step("5. Full Batch Inference & Export", [python_bin, "pipeline/export.py"])

    # 6. Contract validation
    run_step("6. Contract Validation", [python_bin, "contract/validate_export.py", "--data-dir", "public/data"])

    print("\n" + "*" * 60)
    print("ALL PERSON A PIPELINE STEPS COMPLETED AND VALIDATED!")
    print("*" * 60)


if __name__ == "__main__":
    main()
