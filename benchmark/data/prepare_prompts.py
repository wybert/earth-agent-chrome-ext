"""Render UnivEARTH questions into prompts using a chosen template.

This is a shared building block used by both Type 1 and Type 2 entry points.
It is intentionally a thin functional layer: load parquet → apply template →
return polars DataFrame with an extra `rendered_prompt` column.

Usage as a library:
    from benchmark.data.prepare_prompts import load_prompts
    df = load_prompts(template="zero_shot")

Usage as a script (writes a parquet preview):
    conda run -n g python benchmark/data/prepare_prompts.py --template zero_shot
"""

from __future__ import annotations

import argparse
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path

import polars as pl


BENCHMARK_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = BENCHMARK_ROOT / "config" / "benchmark_config.toml"


@dataclass(frozen=True)
class PromptTemplate:
    name: str
    system: str
    user: str  # Must contain `{question}` placeholder

    def render(self, question: str) -> str:
        return self.user.format(question=question)


def load_config(path: Path = CONFIG_PATH) -> dict:
    with path.open("rb") as f:
        return tomllib.load(f)


def load_template(name: str, template_dir: Path) -> PromptTemplate:
    path = template_dir / f"prompt_{name}.toml"
    with path.open("rb") as f:
        data = tomllib.load(f)
    tpl = data["template"]
    user = tpl["user"]
    if "{question}" not in user:
        raise ValueError(f"Template {name} is missing the {{question}} placeholder")
    return PromptTemplate(
        name=tpl["name"],
        system=tpl.get("system", ""),
        user=user,
    )


def load_dataset(parquet_path: Path) -> pl.DataFrame:
    df = pl.read_parquet(parquet_path)
    return df.sort("post_id")


def filter_subset(df: pl.DataFrame, post_ids: list[str]) -> pl.DataFrame:
    if not post_ids:
        return df
    return df.filter(pl.col("post_id").is_in(post_ids))


def load_prompts(
    template: str | None = None,
    config: dict | None = None,
) -> pl.DataFrame:
    """Load the dataset and apply a prompt template.

    Returns a DataFrame with the original UnivEARTH columns plus:
        - rendered_prompt: the user-facing text for the agent
        - template_name: the template that was applied
    """
    cfg = config or load_config()
    template_name = template or cfg["prompt"]["template"]
    template_dir = BENCHMARK_ROOT / cfg["prompt"]["template_dir"]
    parquet_path = BENCHMARK_ROOT / cfg["dataset"]["parquet_path"]
    subset = cfg["run"]["post_id_subset"]

    tpl = load_template(template_name, template_dir)
    df = load_dataset(parquet_path)
    df = filter_subset(df, subset)

    rendered = [tpl.render(q) for q in df["question"].to_list()]
    df = df.with_columns(
        pl.Series("rendered_prompt", rendered),
        pl.lit(template_name).alias("template_name"),
    )
    return df


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template", default=None, help="Override template name")
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Optional parquet output path for inspection",
    )
    args = parser.parse_args(argv)

    df = load_prompts(template=args.template)
    print(f"Loaded {df.height} prompts using template '{df['template_name'][0]}'")
    print(f"Columns: {df.columns}")
    print("\nFirst rendered prompt preview:")
    print("-" * 60)
    print(df["rendered_prompt"][0][:500] + "...")
    print("-" * 60)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        df.write_parquet(args.out)
        print(f"\nWrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
