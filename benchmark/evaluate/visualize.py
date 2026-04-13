"""Generate Vega-Altair charts from a scored_results.parquet.

Outputs four PNG charts into <session_dir>/charts/:
    1. accuracy_bar.png      — accuracy / failure / selective_accuracy per model
    2. tag_heatmap.png       — per-tag accuracy × per-model
    3. paper_comparison.png  — our results vs UnivEARTH paper Table 1 baselines
    4. duration_box.png      — duration distribution per model

Usage:
    conda run -n g python benchmark/evaluate/visualize.py \
        path/to/scored_results.parquet
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import altair as alt
import polars as pl

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from benchmark.evaluate.score import compute_metrics  # noqa: E402

# UnivEARTH paper Table 1 — best zero-shot accuracy & failure rate per model.
# Source: arxiv.org/abs/... (the paper supplied in user message).
PAPER_BASELINES = [
    {"model": "Claude-3.7-Sonnet (paper)", "accuracy": 0.324, "failure_rate": 0.613},
    {"model": "DeepSeek-V3 (paper)", "accuracy": 0.284, "failure_rate": 0.643},
    {"model": "Claude-3.5-Sonnet (paper)", "accuracy": 0.270, "failure_rate": 0.675},
    {"model": "o3-mini (paper)", "accuracy": 0.257, "failure_rate": 0.700},
    {"model": "DeepSeek-R1 (paper)", "accuracy": 0.196, "failure_rate": 0.754},
    {"model": "Qwen2.5-72B (paper)", "accuracy": 0.187, "failure_rate": 0.739},
    {"model": "Claude-3.5-Haiku (paper)", "accuracy": 0.149, "failure_rate": 0.806},
    {"model": "Qwen2.5-Coder-32B (paper)", "accuracy": 0.106, "failure_rate": 0.834},
    {"model": "4o-mini (paper)", "accuracy": 0.083, "failure_rate": 0.891},
    {"model": "Llama-3.3-70B (paper)", "accuracy": 0.028, "failure_rate": 0.967},
]


AXIS_FONT_SIZE = 12
LABEL_FONT_SIZE = 11

CHART_CONFIG = {
    "axis": {
        "titleFontSize": AXIS_FONT_SIZE,
        "labelFontSize": LABEL_FONT_SIZE,
        "grid": False,
    },
    "header": {
        "titleFontSize": AXIS_FONT_SIZE,
        "labelFontSize": LABEL_FONT_SIZE,
    },
    "legend": {
        "titleFontSize": AXIS_FONT_SIZE,
        "labelFontSize": LABEL_FONT_SIZE,
    },
    "view": {
        "strokeWidth": 0,
    },
}


def _save(chart: alt.Chart, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    chart.configure(**CHART_CONFIG).save(str(path), ppi=300)
    print(f"  wrote {path.name}")


def plot_accuracy_bar(metrics: dict, out_path: Path) -> None:
    rows = []
    for model, mm in metrics["by_model"].items():
        rows.extend([
            {"model": model, "metric": "Accuracy", "value": mm["accuracy"]},
            {"model": model, "metric": "Failure Rate", "value": mm["failure_rate"]},
            {"model": model, "metric": "Selective Accuracy", "value": mm["selective_accuracy"]},
        ])
    df = pl.DataFrame(rows).to_pandas()
    chart = (
        alt.Chart(df)
        .mark_bar()
        .encode(
            x=alt.X("metric:N", title=None, axis=alt.Axis(labelAngle=-30)),
            y=alt.Y("value:Q", title="Value", scale=alt.Scale(domain=[0, 1])),
            color=alt.Color("metric:N", legend=None),
            column=alt.Column("model:N", title=None),
        )
        .properties(width=100, height=200)
    )
    _save(chart, out_path)


def plot_tag_heatmap(df: pl.DataFrame, out_path: Path) -> None:
    # accuracy per (model, tag)
    grouped = (
        df.group_by(["model", "tag"]).agg(
            accuracy=pl.when(~pl.col("is_failure"))
            .then((pl.col("ground_truth") == pl.col("predicted")).cast(pl.Float64))
            .otherwise(0.0)
            .mean(),
            n=pl.len(),
        )
    ).to_pandas()

    chart = (
        alt.Chart(grouped)
        .mark_rect()
        .encode(
            x=alt.X("model:N", title="Model"),
            y=alt.Y("tag:N", title="Tag"),
            color=alt.Color(
                "accuracy:Q",
                scale=alt.Scale(scheme="greens", domain=[0, 1]),
                title="Accuracy",
            ),
            tooltip=["model", "tag", "accuracy", "n"],
        )
        .properties(width=335, height=300)
    )
    text = (
        alt.Chart(grouped)
        .mark_text(baseline="middle")
        .encode(
            x="model:N",
            y="tag:N",
            text=alt.Text("accuracy:Q", format=".2f"),
            color=alt.condition(
                "datum.accuracy > 0.5", alt.value("white"), alt.value("black")
            ),
        )
    )
    _save((chart + text), out_path)


def plot_paper_comparison(metrics: dict, out_path: Path) -> None:
    rows = []
    for model, mm in metrics["by_model"].items():
        rows.append({"model": f"{model} (ours)", "metric": "Accuracy", "value": mm["accuracy"]})
        rows.append({"model": f"{model} (ours)", "metric": "Failure Rate", "value": mm["failure_rate"]})
    for b in PAPER_BASELINES:
        rows.append({"model": b["model"], "metric": "Accuracy", "value": b["accuracy"]})
        rows.append({"model": b["model"], "metric": "Failure Rate", "value": b["failure_rate"]})

    df = pl.DataFrame(rows).to_pandas()
    chart = (
        alt.Chart(df)
        .mark_bar()
        .encode(
            y=alt.Y("model:N", sort="-x", title=None),
            x=alt.X("value:Q", title="Value", scale=alt.Scale(domain=[0, 1])),
            color="metric:N",
            row=alt.Row("metric:N", title=None),
        )
        .properties(width=335, height=alt.Step(15))
    )
    _save(chart, out_path)


def plot_duration_box(df: pl.DataFrame, out_path: Path) -> None:
    pdf = df.select(["model", "duration_ms"]).to_pandas()
    pdf["duration_s"] = pdf["duration_ms"] / 1000
    chart = (
        alt.Chart(pdf)
        .mark_boxplot()
        .encode(
            x=alt.X("model:N", title="Model"),
            y=alt.Y("duration_s:Q", title="Duration (s)"),
            color=alt.Color("model:N", legend=None),
        )
        .properties(width=335, height=220)
    )
    _save(chart, out_path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scored", type=Path, help="Path to scored_results.parquet")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Charts output dir (defaults to <scored>/../charts)",
    )
    args = parser.parse_args(argv)

    df = pl.read_parquet(args.scored)
    metrics = compute_metrics(df)

    out_dir = args.out_dir or args.scored.parent / "charts"
    print(f"Writing charts to {out_dir}")
    plot_accuracy_bar(metrics, out_dir / "accuracy_bar.png")
    plot_tag_heatmap(df, out_dir / "tag_heatmap.png")
    plot_paper_comparison(metrics, out_dir / "paper_comparison.png")
    plot_duration_box(df, out_dir / "duration_box.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
