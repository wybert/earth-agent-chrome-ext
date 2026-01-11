# Analysis: Integrating Vercel AI SDK Elements

**Date:** January 10, 2026
**Topic:** Feasibility of adopting [AI SDK Elements](https://ai-sdk.dev/elements/components/tool) in the Earth Agent Chrome Extension.

## Overview

The Vercel AI SDK Elements provide standardized React components (like `<Tool />`) to handle the UI states of AI tool calls (pending, success, result, error).

## Current Project Context

The project currently uses a split architecture:

- **Background Script**: Handles the core AI logic (`streamText`), tool execution, and provider configuration.
- **Side Panel (UI)**: Manages message state manually using `useState` and communicates with the background script via `port.postMessage`.
- **Custom Tool UI**: Tool results (like screenshots and diffs) are manually parsed from events and rendered via custom logic in `ChatMessage.tsx`.

## Pros of Adoption

1. **Delete Boilerplate**: Adopting the standard SDK flow would allow us to delete the complex manual state management in `Chat.tsx` (the `toolEvents` tracking, deduplication logic, and `setMessages` splicing).
2. **Standardized UI**: Transition states (loading spinners for tools, error banners) would be handled by the SDK components rather than custom CSS/logic.
3. **Multi-turn Robustness**: The SDK handles complex tool sequences (multiple tools in one turn) natively.

## Implementation Blockers

1. **Communication Layer**: AI SDK UI hooks (like `useChat`) are designed to communicate with a standard HTTP API endpoint. In our extension, the "API" is the Background Script.
   - _Requirement_: We would need to implement a custom `fetch` adapter for the SDK that translates HTTP requests into `chrome.runtime.sendMessage` calls.
2. **Message Format**: We currently use a custom `Message` interface. Moving to the SDK would require full alignment with the `ai` package's `Message` and `ToolInvocation` types.

## Final Verdict

**Does it make sense?**
Yes, for the long-term health of the codebase. It would simplify the frontend significantly and make the project easier to maintain.

**Recommendation:**
**Postpone.** Do not attempt this refactor during the current polish phase. Adopting AI SDK Elements requires a foundational refactor of the Extension's messaging architecture (the "Side Panel to Background" bridge).

**Target Milestone:** v2.0.0
