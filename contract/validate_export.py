#!/usr/bin/env python3
"""
FireLens Export Validator
Validates public/data against /contract/schema.json and checks image dimensions,
file existence, and geospatial conventions.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

try:
    from jsonschema import validate, ValidationError, Draft7Validator
except ImportError:
    print("Warning: jsonschema not installed. Running in degraded validation mode.")
    Draft7Validator = None

try:
    from PIL import Image
except ImportError:
    print("Error: PIL (Pillow) is required to run validate_export.py")
    sys.exit(1)


REQUIRED_PER_DAY_PNGS = [
    "composite.png",
    "thermal.png",
    "af_gt.png",
    "af_pred.png",
    "ba_gt.png",
    "ba_pred.png",
    "pred_next.png",
]

RGBA_MASK_PNGS = ["af_gt.png", "af_pred.png", "ba_gt.png", "ba_pred.png"]


class ExportValidator:
    def __init__(self, data_dir: Path, schema_path: Path):
        self.data_dir = Path(data_dir).resolve()
        self.schema_path = Path(schema_path).resolve()
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.passed_checks: List[str] = []
        self.schema = self._load_schema()

    def _load_schema(self) -> dict:
        if not self.schema_path.exists():
            self.errors.append(f"Schema file not found: {self.schema_path}")
            return {}
        try:
            with open(self.schema_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            self.errors.append(f"Failed to parse schema {self.schema_path}: {e}")
            return {}

    def _validate_json_schema(self, data: dict, definition_name: str, file_desc: str):
        if not Draft7Validator or not self.schema:
            return
        subschema = self.schema.get("definitions", {}).get(definition_name)
        if not subschema:
            self.warnings.append(f"No definition found for '{definition_name}' in schema.")
            return

        # Check against schema with full definitions available
        full_schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "definitions": self.schema.get("definitions", {}),
            **subschema,
        }
        val = Draft7Validator(full_schema)
        errors = list(val.iter_errors(data))
        for err in errors:
            self.errors.append(f"Schema violation in {file_desc}: {err.message} (path: {list(err.path)})")

    def validate_manifest(self) -> List[dict]:
        manifest_path = self.data_dir / "manifest.json"
        if not manifest_path.exists():
            self.errors.append(f"Missing required file: {manifest_path}")
            return []

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
        except Exception as e:
            self.errors.append(f"Error reading {manifest_path}: {e}")
            return []

        # Handle object or list representation
        if isinstance(manifest_data, list):
            self.warnings.append(
                "manifest.json is a list. Recommended structure is: {'contract_version': 1, 'fires': [...]}"
            )
            fires = manifest_data
        elif isinstance(manifest_data, dict):
            self._validate_json_schema(manifest_data, "manifest", "manifest.json")
            if manifest_data.get("contract_version") != 1:
                self.errors.append(
                    f"manifest.json contract_version must be 1, found {manifest_data.get('contract_version')}"
                )
            fires = manifest_data.get("fires", [])
        else:
            self.errors.append("manifest.json must be a JSON object or array.")
            return []

        if not fires:
            self.errors.append("manifest.json contains no fires.")
        else:
            self.passed_checks.append(f"manifest.json validated with {len(fires)} fire(s).")

        return fires

    def validate_models(self):
        models_path = self.data_dir / "models.json"
        if not models_path.exists():
            self.errors.append(f"Missing required file: {models_path}")
            return
        try:
            with open(models_path, "r", encoding="utf-8") as f:
                models_data = json.load(f)
            self._validate_json_schema(models_data, "models", "models.json")
            self.passed_checks.append("models.json validated successfully.")
        except Exception as e:
            self.errors.append(f"Error reading {models_path}: {e}")

    def validate_importance(self):
        imp_path = self.data_dir / "importance.json"
        if not imp_path.exists():
            self.errors.append(f"Missing required file: {imp_path}")
            return
        try:
            with open(imp_path, "r", encoding="utf-8") as f:
                imp_data = json.load(f)
            self._validate_json_schema(imp_data, "importance", "importance.json")
            self.passed_checks.append("importance.json validated successfully.")
        except Exception as e:
            self.errors.append(f"Error reading {imp_path}: {e}")

    def validate_fire(self, fire_info: dict):
        fire_id = str(fire_info.get("id", ""))
        if not fire_id:
            self.errors.append("Fire manifest item missing 'id'.")
            return

        fire_dir = self.data_dir / "fires" / fire_id
        if not fire_dir.exists() or not fire_dir.is_dir():
            self.errors.append(f"Fire directory missing: {fire_dir}")
            return

        # Check meta.json
        meta_path = fire_dir / "meta.json"
        if not meta_path.exists():
            self.errors.append(f"Missing meta.json in {fire_dir}")
            return
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            self._validate_json_schema(meta, "meta", f"fires/{fire_id}/meta.json")
        except Exception as e:
            self.errors.append(f"Error reading {meta_path}: {e}")
            return

        expected_size = tuple(meta.get("png_size", []))
        if len(expected_size) != 2:
            self.errors.append(f"Fire {fire_id} meta.json png_size invalid: {expected_size}")
            return
        expected_w, expected_h = expected_size

        days = meta.get("days", [])
        if not days:
            self.errors.append(f"Fire {fire_id} meta.json has empty days array.")
            return

        # Check metrics.json
        metrics_path = fire_dir / "metrics.json"
        if not metrics_path.exists():
            self.errors.append(f"Missing metrics.json in {fire_dir}")
        else:
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    metrics = json.load(f)
                self._validate_json_schema(metrics, "metrics", f"fires/{fire_id}/metrics.json")
                for d in days:
                    if d not in metrics:
                        self.warnings.append(f"Fire {fire_id}: metrics.json missing day {d}")
            except Exception as e:
                self.errors.append(f"Error reading {metrics_path}: {e}")

        # Check days directory and images
        days_dir = fire_dir / "days"
        if not days_dir.exists():
            self.errors.append(f"Missing days/ directory in {fire_dir}")
            return

        for day in days:
            day_dir = days_dir / day
            if not day_dir.exists() or not day_dir.is_dir():
                self.errors.append(f"Missing day folder: {day_dir}")
                continue

            for png_name in REQUIRED_PER_DAY_PNGS:
                png_path = day_dir / png_name
                if not png_path.exists():
                    self.errors.append(f"Fire {fire_id} Day {day}: Missing required image {png_name}")
                    continue

                try:
                    with Image.open(png_path) as img:
                        w, h = img.size
                        if (w, h) != (expected_w, expected_h):
                            self.errors.append(
                                f"Fire {fire_id} Day {day} {png_name} dimension mismatch: "
                                f"got ({w}, {h}), expected ({expected_w}, {expected_h})"
                            )

                        if png_name in RGBA_MASK_PNGS:
                            if img.mode != "RGBA":
                                self.warnings.append(
                                    f"Fire {fire_id} Day {day} {png_name} mode is {img.mode}, expected RGBA"
                                )
                        elif png_name == "pred_next.png":
                            if img.mode not in ("L", "RGBA", "RGB"):
                                self.warnings.append(
                                    f"Fire {fire_id} Day {day} {png_name} mode is {img.mode}, expected L or RGBA"
                                )
                except Exception as e:
                    self.errors.append(f"Fire {fire_id} Day {day}: Cannot open image {png_name}: {e}")

        self.passed_checks.append(f"Fire {fire_id} ({len(days)} days) structure and image grids validated.")

    def run(self) -> bool:
        print(f"=== FireLens Export Validator ===")
        print(f"Checking data directory: {self.data_dir}")
        print(f"Using contract schema:  {self.schema_path}")
        print("-" * 50)

        if not self.data_dir.exists():
            self.errors.append(f"Target data directory does not exist: {self.data_dir}")
            self.print_summary()
            return False

        fires = self.validate_manifest()
        self.validate_models()
        self.validate_importance()

        for fire_info in fires:
            self.validate_fire(fire_info)

        return self.print_summary()

    def print_summary(self) -> bool:
        print("-" * 50)
        for check in self.passed_checks:
            print(f"[PASS] {check}")

        for warn in self.warnings:
            print(f"[WARN] {warn}")

        for err in self.errors:
            print(f"[FAIL] {err}")

        print("-" * 50)
        if not self.errors:
            print(f"SUCCESS: Export passes contract specification! ({len(self.passed_checks)} checks passed, {len(self.warnings)} warnings)")
            return True
        else:
            print(f"FAILED: Export failed contract validation with {len(self.errors)} error(s).")
            return False


def main():
    parser = argparse.ArgumentParser(description="Validate FireLens export against contract.")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("public/data"),
        help="Path to public/data directory to validate (default: public/data)",
    )
    parser.add_argument(
        "--schema",
        type=Path,
        default=Path(__file__).parent / "schema.json",
        help="Path to contract schema.json",
    )
    args = parser.parse_args()

    validator = ExportValidator(args.data_dir, args.schema)
    success = validator.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
