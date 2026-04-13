"""Download the UnivEARTH dataset from HuggingFace and cache locally as parquet.

Usage (from repo root):
    conda run -n g python benchmark/data/download_dataset.py

The script is idempotent: if the parquet file already exists with the expected
row count, it is not re-downloaded unless --force is given.
"""

from __future__ import annotations

import argparse
import sys
import tomllib
from pathlib import Path

import polars as pl
from huggingface_hub import hf_hub_download


REQUIRED_COLUMNS = (
    "question",
    "answer",
    "url",
    "post_id",
    "tag",
    "supporting_sentences",
)


def load_config(config_path: Path) -> dict:
    with config_path.open("rb") as f:
        return tomllib.load(f)


def download_parquet(repo_id: str, cache_dir: Path) -> Path:
    """Download the auto-converted parquet shard from HuggingFace.

    HF stores datasets as `default/train/0000.parquet` in the parquet branch.
    """
    cache_dir.mkdir(parents=True, exist_ok=True)
    local_path = hf_hub_download(
        repo_id=repo_id,
        filename="default/train/0000.parquet",
        repo_type="dataset",
        revision="refs/convert/parquet",
        cache_dir=str(cache_dir / "_hf_cache"),
    )
    return Path(local_path)


def validate(df: pl.DataFrame, expected_rows: int) -> None:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")
    if df.height != expected_rows:
        raise ValueError(
            f"Expected {expected_rows} rows, got {df.height}. "
            "Update benchmark_config.toml [dataset].expected_rows if the upstream changed."
        )
    answers = set(df["answer"].unique().to_list())
    if not answers.issubset({"Yes", "No"}):
        raise ValueError(f"Unexpected answer values: {answers}")


def main(argv: list[str] | None = None) -> int:
    repo_root = Path(__file__).resolve().parents[2]
    benchmark_root = repo_root / "benchmark"

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        type=Path,
        default=benchmark_root / "config" / "benchmark_config.toml",
        help="Path to benchmark_config.toml",
    )
    parser.add_argument("--force", action="store_true", help="Re-download even if cached")
    args = parser.parse_args(argv)

    config = load_config(args.config)
    repo_id = config["dataset"]["repo_id"]
    parquet_rel = config["dataset"]["parquet_path"]
    expected_rows = config["dataset"]["expected_rows"]
    target = benchmark_root / parquet_rel

    if target.exists() and not args.force:
        existing = pl.read_parquet(target)
        try:
            validate(existing, expected_rows)
        except ValueError as e:
            print(f"Existing parquet failed validation ({e}); re-downloading.")
        else:
            print(f"Already cached at {target} ({existing.height} rows). Use --force to re-download.")
            return 0

    print(f"Downloading {repo_id} from HuggingFace...")
    src = download_parquet(repo_id, target.parent)
    df = pl.read_parquet(src)
    validate(df, expected_rows)

    target.parent.mkdir(parents=True, exist_ok=True)
    df.write_parquet(target)
    print(f"Saved {df.height} rows to {target}")
    print(f"Tags: {sorted(set(df['tag'].unique().to_list()))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
