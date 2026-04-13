# CLAUDE.md

Guidance for Claude Code and other AI coding agents (Gemini, Cursor, Codex, etc.) working with this repository.

## Project Overview

Earth Agent is a Chrome extension (Manifest V3) + MCP server for Google Earth Engine. It enables AI-powered GEE automation through chat - write code, run analysis, debug errors, explain maps. Works as a Chrome extension or via MCP with Claude Code/Cursor.

## Quick Commands

```bash
npm run build          # Build extension to dist/
npm run format         # Format the code with Prettier
npm run dev            # Watch mode for development
npm run type-check     # TypeScript check
npm test               # Run Jest tests
```

## Version Management

```bash
npm version patch      # Bump version (auto-syncs all files)
git push --follow-tags # Triggers GitHub Actions release
cd mcp-server && npm publish  # Publish MCP to npm
```

Version synced across: `package.json`, `src/manifest.json`, `mcp-server/package.json`

## Project Structure

```
src/
├── background/        # Service worker, AI chat handler, MCP client
├── content/           # Earth Engine DOM manipulation
├── sidepanel/         # React UI
├── components/        # React components (Chat, Settings, Onboarding)
├── lib/tools/         # AI tools and services
├── lib/prompts/       # System prompts (Ask/Do modes)
└── manifest.json

mcp-server/            # MCP server (npm: earth-agent-mcp)
benchmark/             # UnivEARTH benchmark framework (Type 1 internal + Type 2 MCP)
scripts/               # version-sync.js, prepare-manifest-for-store.js
docs/                  # User docs, release notes
reference/             # Developer docs, deployment guides
```

## MCP Server Architecture

```
AI Editor (Claude Code/Cursor/Zed)
    ↓ stdio (MCP Protocol)
MCP Server (earth-agent-mcp)
    ↓ WebSocket (port 3847)
Chrome Extension (Background Script)
    ↓ Chrome APIs
Google Earth Engine Code Editor
```

## Key Files

| File                             | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `src/background/chat-handler.ts` | AI provider integration, tool execution     |
| `src/lib/tools/ai-tools.ts`      | All AI SDK tool definitions                 |
| `src/lib/tools/services/`        | Shared service layer (editor, GEE, browser) |
| `src/lib/prompts/gee-prompts.ts` | System prompts for Ask/Do modes             |

## Architecture

- **Background Script**: Service worker handling AI APIs, message routing
- **Content Script**: Injected into `code.earthengine.google.com/*` for DOM manipulation
- **Side Panel**: React chat UI
- **MCP Server**: WebSocket bridge for external AI editors

## AI Providers

Built-in: OpenAI, Anthropic, Google Gemini, ZAI (GLM)
Custom: Any OpenAI-compatible API (DeepSeek, Together AI, Ollama, etc.)

## Code Style

- Use `@/*` path aliases (maps to `src/*`)
- Functional programming preferred
- Use shadcn/ui components in `src/components/ui/`

## File Organization

| Type              | Location                    |
| ----------------- | --------------------------- |
| User docs         | `docs/`                     |
| Debug scripts     | `scripts/debug/`            |
| Deployment guides | `reference/deploy/`         |
| Architecture docs | `reference/implementation/` |

DO NOT write temperal files like testing files or summary files in root folder, put it in scripts and reference folder instead

## Important Notes

- **No `<all_urls>` permission** - Use specific host permissions for Chrome Web Store
- **Screenshots** only work on tabs matching host_permissions
- Localhost permissions removed for store builds (`scripts/prepare-manifest-for-store.js`)

## Benchmark

`benchmark/` contains a reproducibility framework for evaluating Earth Agent on
the UnivEARTH dataset (140 yes/no Earth observation questions, 13 tags). It
supports two evaluation modes that share the same dataset, prompt templates,
answer extractor, and scoring logic:

- **Type 1 — Internal Agent** (Chrome extension's `AgentTestPanel`):
  `benchmark/type1_internal/generate_test_json.py` produces an upload JSON,
  the user runs it through `AgentTestPanel`, then `parse_results.py` scores
  the saved CSV.
- **Type 2 — External Agent (MCP)**:
  `benchmark/type2_external/run_mcp_benchmark.py` orchestrates an external
  coding agent (e.g. Claude Code) connected to the Earth Agent MCP server,
  one subprocess per question.
- **Evaluation**: `benchmark/evaluate/` — `extract_answer.py` (Yes/No regex),
  `score.py` (accuracy, failure rate, selective accuracy, per-tag, per-model),
  `visualize.py` (Vega-Altair PNG charts).
- **Config**: `benchmark/config/benchmark_config.toml` plus three prompt
  templates (`zero_shot`, `few_shot`, `reflexion`).
- **Run with**: `conda run -n g python benchmark/...` (Python conda env `g`).
- **Full instructions**: `benchmark/README.md`.

## Detailed Documentation

- Developer Guide: `reference/implementation/developer-guide.md` (messaging, tools, debugging)
- Architecture: `reference/implementation/architecture.md`
- Deployment: `reference/deploy/`
- API Models: `reference/api-models/`
- History: `CHANGELOG.md` (version history and release notes)

---

**Symlinks:** `AGENT.md`, `GEMINI.md` point to this file.

- remeber to use chrome devtools mcp when you need interact with gee, and when you need run code in gee console
- you don't do any git commit and any other git commands that change could change the git history
