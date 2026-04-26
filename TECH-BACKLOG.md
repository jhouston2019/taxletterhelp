# Technical backlog

## `netlify/functions/analyze-letter.js`

- Add explicit `max_tokens` (appropriate cap for full analysis, higher than preview).
- Truncate / cap input text length before the OpenAI call (align with any server-side limits).
- Rationale: Preview path (`analyze-letter-preview`) is deterministic and unauthenticated; full analysis is behind the paywall (lower abuse risk) but should still have defensive caps on token usage and prompt size when you next work in that file.
