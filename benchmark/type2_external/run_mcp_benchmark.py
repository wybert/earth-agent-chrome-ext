"""Run UnivEARTH benchmark by spawning an external coding agent (MCP client).

The external agent (e.g. Claude Code, OpenCode) is expected to already be
configured with the Earth Agent MCP server. This script:

    1. Loads UnivEARTH prompts via prepare_prompts.load_prompts.
    2. For each question:
        a. Prepends a "clear_gee first" instruction so the GEE environment
           is reset by the agent itself between runs.
        b. Spawns the agent subprocess with the prompt.
        c. Captures stdout (= agent response) and timing.
    3. Writes raw responses + scored results + metrics into the session dir.

Configuration comes from benchmark/config/benchmark_config.toml [type2].

Usage:
    conda run -n g python benchmark/type2_external/run_mcp_benchmark.py \
        --session 2026-04-12_claude_code \
        --model claude-sonnet-4-20250514 \
        --limit 10
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import polars as pl

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from benchmark.data.prepare_prompts import load_config, load_prompts  # noqa: E402
from benchmark.evaluate.extract_answer import extract_answer  # noqa: E402
from benchmark.evaluate.score import compute_metrics  # noqa: E402

BENCHMARK_ROOT = REPO_ROOT / "benchmark"

RESET_PREAMBLE = (
    "First, call the `clear_gee` MCP tool to reset the Google Earth Engine "
    "map, console, and inspector. Then proceed with the task below.\n\n"
)


def make_session_dir(name: str, results_root: Path) -> Path:
    session_dir = results_root / f"type2_{name}"
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def run_agent_once(
    prompt: str,
    agent_command: list[str],
    timeout_seconds: int,
    extra_env: dict[str, str] | None,
) -> dict:
    """Spawn the agent with the prompt on stdin, return response + timing."""
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)

    start = time.monotonic()
    error = ""
    response_text = ""
    success = False
    try:
        result = subprocess.run(
            agent_command,
            input=prompt,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            env=env,
        )
        response_text = result.stdout or ""
        if result.returncode != 0:
            error = (result.stderr or "").strip()[:500] or f"exit code {result.returncode}"
        else:
            success = True
    except subprocess.TimeoutExpired:
        error = f"agent timeout after {timeout_seconds}s"
    except FileNotFoundError as e:
        error = f"agent command not found: {e}"
    except Exception as e:  # noqa: BLE001 - capture for the result row
        error = f"{type(e).__name__}: {e}"

    duration_ms = int((time.monotonic() - start) * 1000)
    return {
        "response": response_text,
        "duration_ms": duration_ms,
        "agent_success": success,
        "error": error,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--session",
        default=datetime.now().strftime("%Y-%m-%d_%H%M%S"),
        help="Session name (subfolder under results/)",
    )
    parser.add_argument("--template", default=None, help="Override prompt template")
    parser.add_argument(
        "--model",
        default=None,
        help="Model identifier (recorded in results; passed via env if configured)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Run only the first N questions (useful for smoke tests)",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=BENCHMARK_ROOT / "config" / "benchmark_config.toml",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would run without spawning the agent",
    )
    args = parser.parse_args(argv)

    config = load_config(args.config)
    type2 = config["type2"]
    agent_command: list[str] = list(type2["agent_command"])
    timeout_s: int = int(type2["timeout_seconds"])
    reset_between: bool = bool(type2.get("reset_between_runs", True))
    extra_env: dict[str, str] = dict(type2.get("env", {}) or {})
    if args.model:
        # Inject model env var if a known key matches
        for key in ("ANTHROPIC_MODEL", "OPENAI_MODEL", "MODEL"):
            extra_env.setdefault(key, args.model)

    df = load_prompts(template=args.template, config=config)
    if args.limit is not None:
        df = df.head(args.limit)

    results_root = BENCHMARK_ROOT / config["paths"]["results_dir"]
    session_dir = make_session_dir(args.session, results_root)
    shutil.copy2(args.config, session_dir / "benchmark_config.snapshot.toml")

    print(f"Running {df.height} questions through agent: {' '.join(agent_command)}")
    print(f"Session dir: {session_dir}")

    rows: list[dict] = []
    for i, row in enumerate(df.iter_rows(named=True), start=1):
        prompt = row["rendered_prompt"]
        if reset_between:
            prompt = RESET_PREAMBLE + prompt

        print(f"[{i}/{df.height}] Q{row['post_id']} tag={row['tag']} gt={row['answer']}")
        if args.dry_run:
            run_result = {
                "response": "[dry-run]",
                "duration_ms": 0,
                "agent_success": True,
                "error": "",
            }
        else:
            run_result = run_agent_once(prompt, agent_command, timeout_s, extra_env)

        predicted = extract_answer(run_result["response"]) if run_result["agent_success"] else None
        is_failure = (not run_result["agent_success"]) or (predicted is None)
        is_correct = predicted is not None and predicted == row["answer"]

        print(f"   → {run_result['duration_ms']}ms  predicted={predicted}  "
              f"failure={is_failure}  correct={is_correct}")

        rows.append({
            "post_id": row["post_id"],
            "question": row["question"],
            "tag": row["tag"],
            "ground_truth": row["answer"],
            "predicted": predicted or "",
            "is_failure": is_failure,
            "is_correct": is_correct,
            "model": args.model or "external",
            "provider": "mcp",
            "duration_ms": run_result["duration_ms"],
            "agent_error": run_result["error"],
            "raw_response": run_result["response"],
        })

    scored = pl.DataFrame(rows)
    scored.write_parquet(session_dir / "scored_results.parquet")

    metrics = compute_metrics(scored)
    (session_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))

    print(f"\nWrote scored_results.parquet and metrics.json to {session_dir}")
    print(f"Overall: n={metrics['n']}  acc={metrics['accuracy']:.3f}  "
          f"fail={metrics['failure_rate']:.3f}  sel_acc={metrics['selective_accuracy']:.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
