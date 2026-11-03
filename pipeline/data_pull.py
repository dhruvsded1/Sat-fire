#!/usr/bin/env python3
"""
FireLens Pipeline: Data Pull (Task A2)
Downloads 12-15 representative TS-SatFire fires from the Hugging Face mirror
(SamuelWu318/ts-satfire), creates folders per fire, and writes pipeline/selected_fires.csv.
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional

import pandas as pd
from huggingface_hub import HfApi, hf_hub_download

# Curated list of 12 fires (6 test fires from 2021 + 6 train/val fires from 2017-2020)
# Mix of sizes, durations, and geographical regions (CA, AZ, NM, FL, ID, KS)
SELECTED_FIRES = [
    # --- 2021 Test Fires ---
    {
        "id": "US_2021_CA3451712013120211011",
        "name": "Alisal Fire",
        "state": "CA",
        "split": "test",
        "start": "2021-10-05",
        "end": "2021-10-17",
        "lat": 34.493,
        "lon": -120.111,
        "area": 17677,
        "priority": 1,
    },
    {
        "id": "US_2021_CA4086312235520210630",
        "name": "Salt Fire",
        "state": "CA",
        "split": "test",
        "start": "2021-06-29",
        "end": "2021-07-09",
        "lat": 40.908,
        "lon": -122.364,
        "area": 12593,
        "priority": 1,
    },
    {
        "id": "US_2021_NM3340210587120210426",
        "name": "Three Rivers Fire",
        "state": "NM",
        "split": "test",
        "start": "2021-04-23",
        "end": "2021-05-03",
        "lat": 33.421,
        "lon": -105.832,
        "area": 6361,
        "priority": 2,
    },
    {
        "id": "US_2021_FL2521008104520210308",
        "name": "Sandy Fire",
        "state": "FL",
        "split": "test",
        "start": "2021-02-28",
        "end": "2021-03-14",
        "lat": 25.222,
        "lon": -81.054,
        "area": 8143,
        "priority": 2,
    },
    {
        "id": "US_2021_CA3627811855020210815",
        "name": "Walkers Fire",
        "state": "CA",
        "split": "test",
        "start": "2021-08-14",
        "end": "2021-09-02",
        "lat": 36.307,
        "lon": -118.546,
        "area": 9011,
        "priority": 2,
    },
    {
        "id": "US_2021_AZ3345510938920210616",
        "name": "Bear Fire",
        "state": "AZ",
        "split": "test",
        "start": "2021-06-16",
        "end": "2021-07-06",
        "lat": 33.480,
        "lon": -109.377,
        "area": 24459,
        "priority": 2,
    },

    # --- 2017-2020 Train / Val Fires ---
    {
        "id": "20562846",
        "name": "Sawmill Fire",
        "state": "AZ",
        "split": "val",
        "start": "2017-04-23",
        "end": "2017-05-01",
        "lat": 31.807,
        "lon": -110.674,
        "area": 15798,
        "priority": 1,
    },
    {
        "id": "20700973",
        "name": "Goodwin Fire",
        "state": "AZ",
        "split": "val",
        "start": "2017-06-22",
        "end": "2017-07-01",
        "lat": 34.387,
        "lon": -112.319,
        "area": 11677,
        "priority": 2,
    },
    {
        "id": "24462788",
        "name": "Badger Fire",
        "state": "ID",
        "split": "val",
        "start": "2020-09-12",
        "end": "2020-09-28",
        "lat": 42.226,
        "lon": -114.199,
        "area": 34281,
        "priority": 2,
    },
    {
        "id": "22712904",
        "name": "Flint Hills Fire",
        "state": "KS",
        "split": "val",
        "start": "2019-03-26",
        "end": "2019-04-11",
        "lat": 38.506,
        "lon": -96.465,
        "area": 17516,
        "priority": 2,
    },
    {
        "id": "24103571",
        "name": "Bush Fire",
        "state": "AZ",
        "split": "val",
        "start": "2020-06-12",
        "end": "2020-06-30",
        "lat": 33.759,
        "lon": -111.369,
        "area": 81334,
        "priority": 2,
    },
    {
        "id": "20701026",
        "name": "Frye Fire",
        "state": "AZ",
        "split": "val",
        "start": "2017-06-08",
        "end": "2017-07-02",
        "lat": 32.721,
        "lon": -109.865,
        "area": 17495,
        "priority": 2,
    },
]


def save_selected_fires_csv(dest_path: Path):
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(SELECTED_FIRES)
    df.to_csv(dest_path, index=False)
    print(f"Saved selected fires ROI table to {dest_path} ({len(df)} fires)")


def download_fire_data(
    repo_id: str,
    fire_id: str,
    target_raw_dir: Path,
    include_auxiliary: bool = True,
    verbose: bool = True,
) -> int:
    api = HfApi()
    repo_files = api.list_repo_files(repo_id=repo_id, repo_type="dataset")
    prefix = f"ts-satfire/{fire_id}/"
    fire_files = [f for f in repo_files if f.startswith(prefix)]

    if not fire_files:
        print(f"Warning: No files found for fire {fire_id} on HF repo.")
        return 0

    downloaded = 0
    for repo_file in fire_files:
        sub_path = repo_file[len(prefix):]
        # Skip auxiliary FirePred / ESRI_LULC if requested
        if not include_auxiliary and ("FirePred" in sub_path or "ESRI_LULC" in sub_path):
            continue

        local_file = target_raw_dir / fire_id / sub_path
        if local_file.exists() and local_file.stat().st_size > 0:
            if verbose:
                print(f"  [cached] {sub_path}")
            downloaded += 1
            continue

        local_file.parent.mkdir(parents=True, exist_ok=True)
        if verbose:
            print(f"  Downloading {sub_path}...")
        hf_hub_download(
            repo_id=repo_id,
            filename=repo_file,
            repo_type="dataset",
            local_dir=str(target_raw_dir.parent / "hf_download_tmp"),
        )
        # Move from tmp download to structured local folder
        downloaded_path = target_raw_dir.parent / "hf_download_tmp" / repo_file
        if downloaded_path.exists():
            downloaded_path.replace(local_file)
            downloaded += 1

    print(f"Fire {fire_id}: {downloaded} files ready at {target_raw_dir / fire_id}")
    return downloaded


def main():
    parser = argparse.ArgumentParser(description="Download TS-SatFire subset for FireLens")
    parser.add_argument(
        "--repo-id",
        type=str,
        default="SamuelWu318/ts-satfire",
        help="Hugging Face repo id",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path("data/raw"),
        help="Local directory for raw GeoTIFF files",
    )
    parser.add_argument(
        "--csv-path",
        type=Path,
        default=Path("pipeline/selected_fires.csv"),
        help="Output CSV path for selected fires ROI table",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of fires to download (e.g. 3 for quick prototyping)",
    )
    parser.add_argument(
        "--priority-only",
        action="store_true",
        help="Only download Priority 1 fires (top 3 prototyping fires)",
    )
    parser.add_argument(
        "--no-aux",
        action="store_true",
        help="Skip FirePred and ESRI_LULC auxiliary layers (faster download for AF/BA)",
    )
    args = parser.parse_args()

    # 1. Save ROI CSV
    save_selected_fires_csv(args.csv_path)

    # 2. Filter fires to download
    fires = SELECTED_FIRES
    if args.priority_only:
        fires = [f for f in fires if f["priority"] == 1]
    if args.limit:
        fires = fires[:args.limit]

    print(f"Starting data pull for {len(fires)} fires...")
    total_files = 0
    for fire in fires:
        fid = fire["id"]
        fname = fire["name"]
        print(f"\nProcessing {fid} ({fname}, {fire['state']})...")
        count = download_fire_data(
            repo_id=args.repo_id,
            fire_id=fid,
            target_raw_dir=args.raw_dir,
            include_auxiliary=not args.no_aux,
            verbose=False,
        )
        total_files += count

    print(f"\nData pull complete! Total files: {total_files}")


if __name__ == "__main__":
    main()
