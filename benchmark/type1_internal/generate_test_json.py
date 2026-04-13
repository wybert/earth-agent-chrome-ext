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
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

# Allow `import benchmark.*` when run as a script.
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from benchmark.data.prepare_prompts import load_config, load_prompts  # noqa: E402

BENCHMARK_ROOT = REPO_ROOT / "benchmark"


def make_session_dir(session_name: str, results_root: Path) -> Path:
    session_dir = results_root / f"type1_{session_name}"
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def build_prompt_payload(df) -> list[dict]:
    payload: list[dict] = []
    for row in df.iter_rows(named=True):
        description = (
            f"Q{row['post_id']} | tag={row['tag']} | gt={row['answer']}"
        )
        payload.append({"text": row["rendered_prompt"], "description": description})
    return payload


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
        "--config",
        type=Path,
        default=BENCHMARK_ROOT / "config" / "benchmark_config.toml",
    )
    args = parser.parse_args(argv)

    config = load_config(args.config)
    df = load_prompts(template=args.template, config=config)
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
