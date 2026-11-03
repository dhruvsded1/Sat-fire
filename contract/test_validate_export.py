"""
Unit tests for FireLens contract validator.
"""

import json
import shutil
import tempfile
from pathlib import Path
import pytest
from PIL import Image

from contract.validate_export import ExportValidator
from contract.create_sample_fire import generate_sample_dataset


@pytest.fixture
def sample_dataset(tmp_path):
    data_dir = tmp_path / "public" / "data"
    generate_sample_dataset(data_dir, width=64, height=64)
    return data_dir


def test_validator_passes_on_valid_sample(sample_dataset):
    schema_path = Path(__file__).parent / "schema.json"
    validator = ExportValidator(sample_dataset, schema_path)
    success = validator.run()
    assert success is True
    assert len(validator.errors) == 0


def test_validator_detects_missing_manifest(sample_dataset):
    (sample_dataset / "manifest.json").unlink()
    schema_path = Path(__file__).parent / "schema.json"
    validator = ExportValidator(sample_dataset, schema_path)
    success = validator.run()
    assert success is False
    assert any("Missing required file" in e and "manifest.json" in e for e in validator.errors)


def test_validator_detects_image_dimension_mismatch(sample_dataset):
    # Alter thermal.png dimension on day 1
    thermal_png = sample_dataset / "fires" / "sample_fire_01" / "days" / "2021-08-15" / "thermal.png"
    bad_img = Image.new("RGBA", (32, 32), (255, 0, 0, 255))
    bad_img.save(thermal_png)

    schema_path = Path(__file__).parent / "schema.json"
    validator = ExportValidator(sample_dataset, schema_path)
    success = validator.run()
    assert success is False
    assert any("dimension mismatch" in e for e in validator.errors)


def test_validator_detects_missing_day_png(sample_dataset):
    # Delete af_gt.png on day 2
    af_gt = sample_dataset / "fires" / "sample_fire_01" / "days" / "2021-08-16" / "af_gt.png"
    af_gt.unlink()

    schema_path = Path(__file__).parent / "schema.json"
    validator = ExportValidator(sample_dataset, schema_path)
    success = validator.run()
    assert success is False
    assert any("Missing required image af_gt.png" in e for e in validator.errors)
