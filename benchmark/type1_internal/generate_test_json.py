"""Generate AgentTestPanel-compatible JSON for the UnivEARTH benchmark.

The Chrome extension's `AgentTestPanel` (src/components/ui/AgentTestPanel.tsx)
accepts a JSON file shaped as `[{"text": str, "description": str}]`. The
benchmark embeds metadata into the description field for traceability:
    "Q{post_id} | tag={tag} | gt={answer}"

A companion `ground_truth.json` is also written, mapping the rendered prompt
text back to its expected answer and metadata. `parse_results.py` uses this
file to score the AgentTestPanel CSV output.

Usage:
    conda run -n g python benchmark/type1_internal/generate_test_json.py \
        --session 2026-04-12_zero_shot \
        --template zero_shot
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Allow `import benchmark.*` when run as a script.
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

import polars as pl  # noqa: E402

from benchmark.data.prepare_prompts import load_config, load_prompts  # noqa: E402

BENCHMARK_ROOT = REPO_ROOT / "benchmark"

# Populated by main() in --retry-failed-from mode: maps post_id → original prompt id
# so re-runs preserve the same Helicone-Session-Name as the first run.
_RETRY_ID_MAP: dict[str, str] = {}


def make_session_dir(session_name: str, results_root: Path) -> Path:
    session_dir = results_root / f"type1_{session_name}"
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def build_prompt_payload(df) -> list[dict]:
    payload: list[dict] = []
    for idx, row in enumerate(df.iter_rows(named=True), start=1):
        description = (
            f"Q{row['post_id']} | tag={row['tag']} | gt={row['answer']}"
        )
        post_id = str(row["post_id"])
        prompt_id = _RETRY_ID_MAP.get(post_id) or f"q{idx:03d}-{post_id}"
        payload.append({"id": prompt_id, "text": row["rendered_prompt"], "description": description})
    return payload


def _git(args: list[str]) -> str | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(REPO_ROOT), *args],
            capture_output=True, text=True, check=True, timeout=5,
        )
        return out.stdout.strip()
    except Exception:
        return None


def build_run_metadata(args, df, custom_instructions_path: Path | None) -> dict:
    """Captures everything needed to reproduce this run later."""
    git_sha = _git(["rev-parse", "HEAD"])
    git_branch = _git(["rev-parse", "--abbrev-ref", "HEAD"])
    git_dirty = _git(["status", "--porcelain"])

    ci_content = None
    ci_sha256 = None
    if custom_instructions_path and custom_instructions_path.exists():
        ci_content = custom_instructions_path.read_text()
        ci_sha256 = hashlib.sha256(ci_content.encode()).hexdigest()

    return {
        "schema_version": 1,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "session": args.session,
        "sampling": {
            "template": df["template_name"][0],
            "per_tag": args.per_tag,
            "limit": args.limit,
            "seed": args.seed,
            "n_questions": df.height,
            "question_ids": sorted([str(x) for x in df["post_id"].to_list()]),
        },
        "repo": {
            "git_sha": git_sha,
            "git_branch": git_branch,
            "has_uncommitted_changes": bool(git_dirty) if git_dirty is not None else None,
        },
        "custom_instructions": {
            "source_path": str(custom_instructions_path) if custom_instructions_path else None,
            "sha256": ci_sha256,
            "char_count": len(ci_content) if ci_content else None,
        },
        "agent_config_expected": {
            "step_count_limit": 100,
            "anthropic_cache_ttl": "1h",
            "anthropic_cache_targets": ["system", "tools"],
            "tool_repair": True,
            "screenshot_format": "jpeg quality 60",
        },
    }


def build_ground_truth(df) -> dict:
    return {
        "schema_version": 1,
        "template": df["template_name"][0],
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "items": [
            {
                "post_id": row["post_id"],
                "question": row["question"],
                "tag": row["tag"],
                "ground_truth": row["answer"],
                "url": row["url"],
                "rendered_prompt": row["rendered_prompt"],
            }
            for row in df.iter_rows(named=True)
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--session",
        default=datetime.now().strftime("%Y-%m-%d_%H%M%S"),
        help="Session name (used as subfolder under results/)",
    )
    parser.add_argument("--template", default=None, help="Override prompt template")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only include the first N questions (useful for smoke tests)",
    )
    parser.add_argument(
        "--per-tag",
        type=int,
        default=None,
        help="Stratified sample: take N questions from each tag (capped at available count)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for stratified sampling (default 42 for reproducibility)",
    )
    parser.add_argument(
        "--exclude-session",
        type=str,
        default=None,
        help="Exclude post_ids already tested in a previous session (reads its run_metadata.json). "
             "Enables incremental expansion without re-running questions.",
    )
    parser.add_argument(
        "--retry-failed-from",
        type=str,
        default=None,
        help="Re-run only questions that failed in a previous session "
             "(reads its scored_results.parquet, filters is_failure=True). "
             "Preserves original prompt IDs so Helicone session names align with the first run.",
    )
    parser.add_argument(
        "--custom-instructions",
        type=Path,
        default=BENCHMARK_ROOT / "custom_instructions" / "methodology_guardrails.md",
        help="Path to the Custom Instructions markdown used during the run (for reproducibility snapshot)",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=BENCHMARK_ROOT / "config" / "benchmark_config.toml",
    )
    args = parser.parse_args(argv)

    config = load_config(args.config)
    df = load_prompts(template=args.template, config=config)

    if args.per_tag is not None:
        df = (
            df.with_columns(
                pl.int_range(0, pl.len()).shuffle(seed=args.seed).over("tag").alias("_order")
            )
            .filter(pl.col("_order") < args.per_tag)
            .drop("_order")
            .sort("tag", "post_id")
        )
        print(
            f"Stratified sample: up to {args.per_tag} per tag × "
            f"{df['tag'].n_unique()} tags = {df.height} questions"
        )

    if args.retry_failed_from is not None:
        prev_dir = (
            BENCHMARK_ROOT / config["paths"]["results_dir"]
            / f"type1_{args.retry_failed_from}"
        )
        scored_path = prev_dir / "scored_results.parquet"
        prompts_prev_path = prev_dir / "prompts.json"
        if not scored_path.exists() or not prompts_prev_path.exists():
            sys.exit(f"Cannot --retry-failed-from: {scored_path} or {prompts_prev_path} missing")
        scored = pl.read_parquet(scored_path)
        failed_ids = set(
            scored.filter(pl.col("is_failure")).get_column("post_id").cast(pl.Utf8).to_list()
        )
        if not failed_ids:
            sys.exit(f"No failed questions in {args.retry_failed_from} — nothing to retry.")

        df = df.filter(pl.col("post_id").cast(pl.Utf8).is_in(list(failed_ids))).sort(
            "tag", "post_id"
        )

        # Preserve original prompt IDs so Helicone session names match the first run.
        prev_prompts = json.loads(prompts_prev_path.read_text())
        id_map = {
            p["id"].split("-", 1)[1]: p["id"]  # e.g. "89413" → "q005-89413"
            for p in prev_prompts
            if "-" in p["id"]
        }
        # Stash the mapping for build_prompt_payload to use later.
        global _RETRY_ID_MAP
        _RETRY_ID_MAP = id_map
        print(
            f"Retry mode: re-running {df.height} failed questions from {args.retry_failed_from}"
        )
        print(f"  Failed post_ids: {sorted(failed_ids)}")

    if args.exclude_session is not None:
        prev_meta_path = (
            BENCHMARK_ROOT / config["paths"]["results_dir"]
            / f"type1_{args.exclude_session}" / "run_metadata.json"
        )
        if not prev_meta_path.exists():
            sys.exit(f"Cannot --exclude-session: {prev_meta_path} not found")
        prev_meta = json.loads(prev_meta_path.read_text())
        prev_ids = set(prev_meta.get("sampling", {}).get("question_ids", []))
        before = df.height
        df = df.filter(~pl.col("post_id").cast(pl.Utf8).is_in(list(prev_ids)))
        print(
            f"Excluded {before - df.height} questions already tested in {args.exclude_session} "
            f"→ {df.height} remaining"
        )

    if args.limit is not None:
        df = df.head(args.limit)

    results_root = BENCHMARK_ROOT / config["paths"]["results_dir"]
    session_dir = make_session_dir(args.session, results_root)

    prompts_path = session_dir / "prompts.json"
    gt_path = session_dir / "ground_truth.json"
    config_snapshot = session_dir / "benchmark_config.snapshot.toml"

    payload = build_prompt_payload(df)
    prompts_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    gt_path.write_text(json.dumps(build_ground_truth(df), indent=2, ensure_ascii=False))
    shutil.copy2(args.config, config_snapshot)

    # Reproducibility snapshot: git SHA, sampling params, custom instructions hash, agent config
    ci_path = args.custom_instructions if args.custom_instructions.exists() else None
    metadata = build_run_metadata(args, df, ci_path)
    (session_dir / "run_metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False)
    )
    if ci_path:
        shutil.copy2(ci_path, session_dir / "custom_instructions.md")

    print(f"Wrote {len(payload)} prompts → {prompts_path}")
    print(f"Wrote ground truth → {gt_path}")
    print(f"Snapshotted config → {config_snapshot}")
    print("\nNext steps:")
    print("  1. Open Earth Agent extension in Chrome (GEE Code Editor open)")
    print("  2. Open AgentTestPanel from the side panel")
    print(f"  3. Set output folder to: {session_dir}")
    print(f"  4. Upload prompts.json from: {prompts_path}")
    print("  5. Set mode='do', timeout≈180s, interval≈10s, select model(s)")
    print("  6. Run. AgentTestPanel will save results.csv into the session folder.")
    print(f"  7. Then: conda run -n g python benchmark/type1_internal/parse_results.py "
          f"--session {args.session}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
