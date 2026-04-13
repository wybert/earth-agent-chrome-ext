"""Parse AgentTestPanel results.csv into a scored parquet for evaluation.

The AgentTestPanel CSV columns (from src/components/ui/AgentTestPanel.tsx):
    Index, Timestamp, Prompt, Response, Provider, Model,
    Duration (ms), Success, Error, Screenshot

This script:
    1. Reads the CSV.
    2. Joins each row to the ground truth by matching on Prompt text.
    3. Extracts Yes/No from Response via benchmark.evaluate.extract_answer.
    4. Writes scored_results.parquet alongside the CSV.
    5. Prints overall metrics.

Usage:
    conda run -n g python benchmark/type1_internal/parse_results.py \
        --session 2026-04-12_zero_shot
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import polars as pl

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from benchmark.evaluate.extract_answer import extract_answer  # noqa: E402
from benchmark.evaluate.score import compute_metrics  # noqa: E402

BENCHMARK_ROOT = REPO_ROOT / "benchmark"


def load_ground_truth(path: Path) -> dict[str, dict]:
    """Map rendered_prompt → ground truth metadata."""
    data = json.loads(path.read_text())
    return {item["rendered_prompt"]: item for item in data["items"]}


def parse_results(csv_path: Path, gt_map: dict[str, dict]) -> pl.DataFrame:
    df = pl.read_csv(csv_path, infer_schema_length=10000)
    # Normalize column names
    df = df.rename({
        "Index": "index",
        "Timestamp": "timestamp",
        "Prompt": "prompt",
        "Response": "response",
        "Provider": "provider",
        "Model": "model",
        "Duration (ms)": "duration_ms",
        "Success": "success",
        "Error": "error",
        "Screenshot": "screenshot",
    })

    enriched_rows: list[dict] = []
    for row in df.iter_rows(named=True):
        gt_entry = gt_map.get(row["prompt"])
        if gt_entry is None:
            # Prompt didn't match. Could happen if AgentTestPanel mutates whitespace
            # or the user uploaded the wrong file. Mark as failure with no GT.
            ground_truth = None
            tag = "_unmatched"
            post_id = ""
            question = ""
        else:
            ground_truth = gt_entry["ground_truth"]
            tag = gt_entry["tag"]
            post_id = gt_entry["post_id"]
            question = gt_entry["question"]

        response_text = row["response"] or ""
        agent_succeeded = str(row["success"]).strip().lower() == "true"
        predicted = extract_answer(response_text) if agent_succeeded else None
        # Failure when: agent itself errored, OR no answer extractable, OR GT missing
        failure = (
            (not agent_succeeded)
            or (predicted is None)
            or (ground_truth is None)
        )

        enriched_rows.append({
            "post_id": post_id,
            "question": question,
            "tag": tag,
            "ground_truth": ground_truth or "",
            "predicted": predicted or "",
            "is_failure": failure,
            "is_correct": (predicted is not None and predicted == ground_truth),
            "model": row["model"],
            "provider": row["provider"],
            "duration_ms": int(row["duration_ms"]) if row["duration_ms"] else 0,
            "agent_error": row["error"] or "",
            "raw_response": response_text,
        })

    return pl.DataFrame(enriched_rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", required=True, help="Session name (folder under results/)")
    parser.add_argument(
        "--csv",
        type=Path,
        default=None,
        help="Override CSV path (defaults to results/type1_<session>/results.csv)",
    )
    args = parser.parse_args(argv)

    session_dir = BENCHMARK_ROOT / "results" / f"type1_{args.session}"
    csv_path = args.csv or (session_dir / "results.csv")
    gt_path = session_dir / "ground_truth.json"

    if not csv_path.exists():
        print(f"ERROR: results.csv not found at {csv_path}", file=sys.stderr)
        return 1
    if not gt_path.exists():
        print(f"ERROR: ground_truth.json not found at {gt_path}", file=sys.stderr)
        return 1

    gt_map = load_ground_truth(gt_path)
    scored = parse_results(csv_path, gt_map)

    out_parquet = session_dir / "scored_results.parquet"
    scored.write_parquet(out_parquet)
    print(f"Wrote {scored.height} rows → {out_parquet}")

    metrics = compute_metrics(scored)
    metrics_path = session_dir / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2))
    print(f"Wrote metrics → {metrics_path}")

    print(f"\nOverall: n={metrics['n']}  acc={metrics['accuracy']:.3f}  "
          f"fail={metrics['failure_rate']:.3f}  sel_acc={metrics['selective_accuracy']:.3f}")
    print("\nBy model:")
    for m, mm in metrics["by_model"].items():
        print(f"  {m}: acc={mm['accuracy']:.3f}  fail={mm['failure_rate']:.3f}  "
              f"sel_acc={mm['selective_accuracy']:.3f}  n={mm['n']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
