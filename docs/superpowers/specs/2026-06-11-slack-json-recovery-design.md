# Slack JSON Recovery Design

## Goal
Prevent Slack from showing raw or malformed JSON when Azure Foundry returns truncated or invalid structured output.

## Problem
The current flow assumes the LLM always returns valid JSON. When the response is truncated or malformed, `parseCoachOutput()` falls back to the raw model output and Slack renders that raw payload inside the `Prompt mejorado` block. The result looks broken to the user even though the root issue is recovery logic, not Slack formatting.

## User-Approved Direction
Use a robust recovery strategy:
1. Increase `max_output_tokens` to reduce truncation frequency.
2. Try normal JSON parsing first.
3. If parsing fails, attempt defensive recovery of known fields.
4. If recovery quality is too low, show a clean fallback message instead of raw JSON.

## Scope
In scope:
- `src/llm/azureOpenAIClient.js`
- `src/prompt/promptCoach.js`
- tests covering malformed/truncated output behavior

Out of scope:
- changing Slack block layout
- retries or multi-request recovery
- changing the system prompt contract
- changing PM2, deployment, or infra

## Design

### 1. Increase generation budget
Raise `max_output_tokens` from 2000 to a safer value for long prompts. The purpose is risk reduction, not unlimited output. The exact number should stay conservative and test-backed.

### 2. Keep strict happy path
If `JSON.parse(rawText)` succeeds, preserve the current normalization flow.

### 3. Add defensive recovery path
When parsing fails, recover only known fields:
- `improvedPrompt`
- `questions`
- `checklist`
- `strategy`
- optionally `detectedIssues` and `recommendedActions` if clearly extractable

Recovery rules:
- prefer exact key extraction over reconstructing the full JSON object
- never expose raw JSON blobs as the visible prompt
- sanitize escaped newlines, dangling quotes, partial closing braces, and leaked field labels like `text` when they are obvious truncation artifacts
- apply existing forbidden-claims sanitization after recovery

### 4. Recovery quality gate
Recovered content is acceptable only if:
- `improvedPrompt` is non-empty after cleanup
- the recovered prompt does not still look like a raw JSON document
- the result is readable enough to paste into another AI tool

If those conditions fail, return a clean fallback response such as a short prompt-regeneration message instead of leaking malformed payload text.

### 5. Slack rendering contract
`responseBlocks.js` should continue to render the same block structure. The fix belongs before rendering: Slack should receive already-sanitized content.

## Error Handling
- Valid JSON: normal flow
- Invalid but recoverable JSON: recovered structured response
- Invalid and not recoverable: clean fallback text, not raw payload

## Testing
Add tests for:
1. valid JSON still works unchanged
2. truncated JSON with recoverable `improvedPrompt`
3. malformed JSON with recoverable arrays/strategy
4. malformed JSON that must fall back cleanly
5. recovered prompt does not include raw leading `{`, leaked field labels, or broken wrapper text from the malformed payload

## Tradeoffs
- Higher token limit improves success rate but increases request cost.
- Defensive recovery improves UX but adds parsing logic that must stay narrow and explicit.
- Clean fallback is safer than over-reconstructing content that may be ambiguous.

## Recommendation
Implement the robust recovery path with narrow extraction heuristics and a strict quality gate. This gives the MVP a much better Slack experience without adding retry orchestration or broader architectural changes.
