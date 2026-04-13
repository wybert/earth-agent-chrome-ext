"""Compute UnivEARTH benchmark metrics aligned with the original paper.

Input:
    A polars DataFrame with at least the columns:
        question, ground_truth, predicted, is_failure, model, provider, tag

Output (compute_metrics):
    {
        "n": int,
        "accuracy": float,           # correct / total
        "failure_rate": float,       # failures / total
        "selective_accuracy": float, # correct / (total - failures)
        "by_tag": {tag: accuracy},
        "by_model": {model: {accuracy, failure_rate, selective_accuracy, n}},
    }

Usage:
    conda run -n g python benchmark/evaluate/score.py path/to/scored_results.parquet
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import polars as pl

REQUIRED_COLS = ("ground_truth", "predicted", "is_failure", "tag", "model")


def _safe_div(num: float, den: float) -> float:
    return float(num / den) if den else 0.0


def _row_metrics(df: pl.DataFrame) -> dict:
    """Aggregate metrics over a (possibly filtered) DataFrame."""
    n = df.height
    if n == 0:
        return {"n": 0, "accuracy": 0.0, "failure_rate": 0.0, "selective_accuracy": 0.0}

    failures = int(df["is_failure"].sum())
    correct = int(
        df.filter(~pl.col("is_failure"))
        .with_columns((pl.col("ground_truth") == pl.col("predicted")).alias("_ok"))["_ok"]
        .sum()
    )
    non_failures = n - failures
    return {
        "n": n,
        "accuracy": _safe_div(correct, n),
        "failure_rate": _safe_div(failures, n),
        "selective_accuracy": _safe_div(correct, non_failures),
    }


def compute_metrics(df: pl.DataFrame) -> dict:
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    overall = _row_metrics(df)

    by_tag: dict[str, float] = {}
    for tag in sorted(df["tag"].unique().to_list()):
        sub = df.filter(pl.col("tag") == tag)
        by_tag[tag] = _row_metrics(sub)["accuracy"]

    by_model: dict[str, dict] = {}
    for model in sorted(df["model"].unique().to_list()):
        sub = df.filter(pl.col("model") == model)
        by_model[model] = _row_metrics(sub)

    return {**overall, "by_tag": by_tag, "by_model": by_model}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scored", type=Path, help="Path to scored_results.parquet")
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Optional metrics.json output path (defaults to <scored>.metrics.json)",
    )
    args = parser.parse_args(argv)

    df = pl.read_parquet(args.scored)
    metrics = compute_metrics(df)

    out_path = args.out or args.scored.with_suffix(".metrics.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(metrics, indent=2))
    print(f"Wrote {out_path}")

    print(f"\nOverall: n={metrics['n']}  acc={metrics['accuracy']:.3f}  "
          f"fail={metrics['failure_rate']:.3f}  sel_acc={metrics['selective_accuracy']:.3f}")
    print("\nBy model:")
    for m, mm in metrics["by_model"].items():
        print(f"  {m}: acc={mm['accuracy']:.3f}  fail={mm['failure_rate']:.3f}  "
              f"sel_acc={mm['selective_accuracy']:.3f}  n={mm['n']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
