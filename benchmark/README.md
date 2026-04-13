# Earth Agent × UnivEARTH Benchmark

A reproducibility framework for evaluating **Earth Agent** on the
[UnivEARTH](https://huggingface.co/datasets/AaronKao/UnivEARTH) dataset
(140 yes/no Earth observation questions, 13 tags, 17 satellite sensors).

The benchmark supports **two evaluation modes**:

| Type | What it tests | Driver |
|------|---------------|--------|
| **Type 1: Internal Agent** | Earth Agent's own chat agent (Chrome extension) under different LLMs | `AgentTestPanel` UI in the side panel |
| **Type 2: External Agent (MCP)** | Any coding agent (Claude Code, OpenCode, …) connected to the Earth Agent MCP server | `run_mcp_benchmark.py` Python orchestrator |

Both types share the same dataset, prompt templates, answer extractor, scoring
logic, and visualizations. Results are directly comparable.

---

## 1. Setup

### Prerequisites

- Conda environment `g` with: `polars`, `huggingface_hub`, `altair`,
  `vl-convert-python`, `websockets` (already installed during initial setup).
- Earth Agent Chrome extension built and loaded (`npm run build` from repo root).
- Google Earth Engine access (you must be signed in to the GEE Code Editor).
- For Type 2: an external coding agent installed (e.g. `claude` CLI) and
  configured with the Earth Agent MCP server.

### One-time data download

```bash
conda run -n g python benchmark/data/download_dataset.py
```

This caches `data/univearth.parquet` (140 rows). The file is git-ignored.

### Configuration

Edit `benchmark/config/benchmark_config.toml` to change:

- `[prompt].template` — `zero_shot` | `few_shot` | `reflexion`
- `[run].post_id_subset` — empty for full 140; or list of post IDs for subset
- `[type1]` — recommended timeout / interval / mode for AgentTestPanel runs
- `[type2]` — external agent command, timeout, env vars

Each benchmark run snapshots the config into the session folder for
reproducibility.

---

## 2. Type 1 — Internal Agent (AgentTestPanel)

The Chrome extension already ships an `AgentTestPanel` component that runs a
list of prompts through the side-panel agent and saves a CSV. This benchmark
generates the prompts file and parses the CSV.

### Step-by-step

1. **Generate the prompt JSON**

   ```bash
   conda run -n g python benchmark/type1_internal/generate_test_json.py \
       --session 2026-04-12_zero_shot \
       --template zero_shot
   ```

   Outputs to `benchmark/results/type1_2026-04-12_zero_shot/`:
   - `prompts.json` — AgentTestPanel-compatible upload file
   - `ground_truth.json` — prompt → expected answer + metadata
   - `benchmark_config.snapshot.toml` — frozen config

2. **Run via the extension UI**

   - Open Chrome with the Earth Agent extension and a fresh GEE Code Editor tab.
   - Open the side panel → **Agent Test Panel** (the testing UI).
   - **Output folder**: select `benchmark/results/type1_2026-04-12_zero_shot/`.
   - **Mode**: `do` (the agent must execute code).
   - **Models**: choose one or more.
   - **Timeout**: ≥ 180s per question.
   - **Interval**: ≥ 10s between runs.
   - **Upload**: the `prompts.json` from step 1.
   - Click **Run**. The panel writes `results.csv` and per-question screenshots.

3. **Parse and score**

   ```bash
   conda run -n g python benchmark/type1_internal/parse_results.py \
       --session 2026-04-12_zero_shot
   ```

   Produces `scored_results.parquet` and `metrics.json` in the session folder
   and prints overall + per-model metrics to the terminal.

4. **Visualize**

   ```bash
   conda run -n g python benchmark/evaluate/visualize.py \
       benchmark/results/type1_2026-04-12_zero_shot/scored_results.parquet
   ```

   Writes 4 PNG charts into `<session>/charts/`.

---

## 3. Type 2 — External Agent (MCP)

Tests an external coding agent that uses the Earth Agent MCP server as its
GEE tool surface.

### Prerequisites

1. Build and start the MCP server:

   ```bash
   cd mcp-server && npm run build && node dist/index.js
   ```

   (Or however you normally launch it.)

2. Make sure the Chrome extension is connected to the MCP server (the
   extension's MCP indicator should be green).

3. Configure your external agent (e.g. Claude Code) to use the Earth Agent
   MCP server. For Claude Code, that means adding it to `~/.claude/mcp.json`
   or via `claude mcp add`.

4. Verify by running a single command interactively:

   ```bash
   echo "List available Earth Engine tools" | claude --print
   ```

### Running

Edit `benchmark_config.toml` `[type2].agent_command` to your agent's
non-interactive invocation. Default:

```toml
agent_command = ["claude", "--print", "--allowedTools", "mcp__earth-agent-mcp__*"]
```

Then:

```bash
# Smoke test on 3 questions
conda run -n g python benchmark/type2_external/run_mcp_benchmark.py \
    --session 2026-04-12_claude_code_smoke \
    --model claude-sonnet-4-20250514 \
    --limit 3

# Full 140-question run
conda run -n g python benchmark/type2_external/run_mcp_benchmark.py \
    --session 2026-04-12_claude_code_full \
    --model claude-sonnet-4-20250514
```

The runner:

1. Loads prompts via the same `prepare_prompts` pipeline as Type 1.
2. Prepends a "call `clear_gee` first" instruction so the agent resets the GEE
   environment between questions.
3. Spawns the agent subprocess for each question with the prompt on stdin.
4. Captures stdout, extracts the Yes/No answer, scores against ground truth.
5. Writes `scored_results.parquet`, `metrics.json`, and the config snapshot.

Then visualize:

```bash
conda run -n g python benchmark/evaluate/visualize.py \
    benchmark/results/type2_2026-04-12_claude_code_full/scored_results.parquet
```

---

## 4. Evaluation Methodology

### Answer extraction (`benchmark/evaluate/extract_answer.py`)

Prompt templates instruct the agent to end with `ANSWER: Yes` or `ANSWER: No`.
The extractor falls back through three patterns:

1. `ANSWER:\s*(Yes|No)` — explicit prompted format (most reliable)
2. Trailing standalone `Yes`/`No` line
3. "the answer is …" / "conclusion: …" natural language patterns

If all fail, the trial is counted as a failure.

### Metrics (`benchmark/evaluate/score.py`)

Aligned with UnivEARTH paper Table 1:

| Metric | Definition |
|--------|------------|
| **Accuracy** | `correct / total` |
| **Failure Rate** | `failures / total` (no extractable answer **or** agent errored) |
| **Selective Accuracy** | `correct / (total − failures)` |
| **By Tag** | Accuracy per tag (13 categories) |
| **By Model** | Full metric set per model |

### Reproducibility

- Questions are processed in deterministic `post_id` order.
- Few-shot examples are fixed in `prompt_few_shot.toml` (no random sampling).
- Each session folder snapshots the config that produced it
  (`benchmark_config.snapshot.toml`).
- Raw agent responses are preserved in `scored_results.parquet`
  (`raw_response` column) so the answer extractor can be re-run with an
  improved version without re-querying the LLM.

---

## 5. Directory Layout

```
benchmark/
├── README.md                    # this file
├── config/
│   ├── benchmark_config.toml    # master config
│   ├── prompt_zero_shot.toml
│   ├── prompt_few_shot.toml
│   └── prompt_reflexion.toml
├── data/
│   ├── download_dataset.py
│   ├── prepare_prompts.py
│   └── univearth.parquet        # cached, gitignored
├── type1_internal/
│   ├── generate_test_json.py    # → prompts.json + ground_truth.json
│   └── parse_results.py         # results.csv → scored_results.parquet
├── type2_external/
│   └── run_mcp_benchmark.py     # spawns external agent for each question
├── evaluate/
│   ├── extract_answer.py        # Yes/No regex + fallbacks
│   ├── score.py                 # accuracy, failure rate, selective accuracy
│   └── visualize.py             # 4 Vega-Altair PNG charts
└── results/                     # per-session output (gitignored)
    ├── type1_<session>/
    │   ├── prompts.json
    │   ├── ground_truth.json
    │   ├── benchmark_config.snapshot.toml
    │   ├── results.csv             # written by AgentTestPanel
    │   ├── scored_results.parquet  # written by parse_results.py
    │   ├── metrics.json
    │   └── charts/
    └── type2_<session>/
        ├── benchmark_config.snapshot.toml
        ├── scored_results.parquet
        ├── metrics.json
        └── charts/
```

---

## 6. Results Log

Record completed runs in this section as you produce them.

| Date | Type | Session | Model | Template | Accuracy | Failure | Selective Acc |
|------|------|---------|-------|----------|----------|---------|---------------|
| _TBD_ | Type 1 | _e.g._ `2026-04-12_zero_shot` | `claude-sonnet-4-6` | zero_shot | _–_ | _–_ | _–_ |

### Paper baselines (UnivEARTH Table 1, zero-shot)

| Model | Accuracy | Failure Rate | Selective Acc |
|-------|----------|--------------|---------------|
| Claude-3.7-Sonnet | 32.4% | 61.3% | 81.6% |
| DeepSeek-V3 | 28.4% | 64.3% | 73.7% |
| Claude-3.5-Sonnet | 27.0% | 67.5% | 80.8% |
| o3-mini | 25.7% | 70.0% | 81.0% |

These are encoded in `evaluate/visualize.py` and overlaid in the
`paper_comparison.png` chart.

---

## 7. References

- Kao, C.-H., Zhao, W., Revankar, S., et al. *Towards LLM Agents for Earth
  Observation*. ICML, 2025. UnivEARTH benchmark.
- Dataset: <https://huggingface.co/datasets/AaronKao/UnivEARTH>
