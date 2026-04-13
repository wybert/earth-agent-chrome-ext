"""Extract a Yes/No answer from a free-text agent response.

The benchmark prompt explicitly asks the agent to end with `ANSWER: Yes` or
`ANSWER: No`. This module is the canonical answer extractor used by both
Type 1 (parse_results.py) and Type 2 (run_mcp_benchmark.py).

Returns one of:
    "Yes"
    "No"
    None  (extraction failed → counts as a failure in scoring)
"""

from __future__ import annotations

import re
from typing import Literal

Answer = Literal["Yes", "No"]

# Highest-confidence pattern: explicit "ANSWER:" prefix.
_ANSWER_LINE = re.compile(r"^\s*ANSWER\s*[:=]\s*(yes|no)\b", re.IGNORECASE | re.MULTILINE)
# Fallback: trailing standalone "Yes" or "No" line.
_TRAILING_TOKEN = re.compile(r"(?:^|\n)\s*(yes|no)\s*\.?\s*$", re.IGNORECASE)
# Last-resort pattern: "the answer is yes/no".
_NL_PATTERN = re.compile(
    r"(?:the\s+answer\s+is|answer\s+is|conclusion[: ]+|so[, ]+)\s*(yes|no)",
    re.IGNORECASE,
)


def _normalize(token: str) -> Answer:
    return "Yes" if token.lower() == "yes" else "No"


def extract_answer(response: str) -> Answer | None:
    """Extract a yes/no answer from agent response text.

    Priority order:
        1. Explicit `ANSWER: Yes/No` line (most reliable, prompted format).
        2. Final standalone Yes/No line.
        3. "the answer is X" / "answer is X" / "conclusion: X" patterns.
        4. None if no signal is found.
    """
    if not response or not isinstance(response, str):
        return None

    # 1. Explicit ANSWER: line. Take the LAST one if multiple (agent may have
    #    written intermediate answers in worked examples / reflection).
    matches = list(_ANSWER_LINE.finditer(response))
    if matches:
        return _normalize(matches[-1].group(1))

    # 2. Trailing standalone token.
    trailing = _TRAILING_TOKEN.search(response.rstrip())
    if trailing:
        return _normalize(trailing.group(1))

    # 3. Natural-language patterns.
    nl_matches = list(_NL_PATTERN.finditer(response))
    if nl_matches:
        return _normalize(nl_matches[-1].group(1))

    return None


def is_failure(response: str | None, error: str | None = None) -> bool:
    """A trial is a failure when the agent errored OR no answer can be extracted."""
    if error:
        return True
    if response is None:
        return True
    return extract_answer(response) is None
