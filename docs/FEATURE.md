# Feature: Explain availability (Practice #11)

## User story
As a student, I want a short explanation of room availability so I understand the decision.

## Flow and trust boundary

```
Student input (room, start, end, now)
        │
        ▼
Validation + checkAvailability()   ← deterministic rule engine, SOURCE OF TRUTH
        │  CheckResult { available, reason, reasonCode }
        ├──────────────► UI: "Confirmed status · booking rules"   (never changed later)
        │
        ▼  (only if the student clicks "Explain availability")
buildExplainInput()  → minimal context {room, start, end, isAvailable, reasonCode, question?}
        │
        ▼
validateExplainInput()  ── invalid ──► "Request rejected" message
        │
        ▼
LLM adapter (mock in this build; a real one must run server-side)   + 3 s timeout
        │
        ▼
validateExplainOutput()  ── invalid / error / timeout ──► FALLBACK_TEXT
        │
        ▼
UI: "AI-generated explanation (mock) — not a booking confirmation"
```

## Contract
| | |
|---|---|
| Input | `roomLabel` (1–60 chars), `start`/`end` (`HH:MM` or `invalid`), `isAvailable` (bool), `reasonCode` (`AVAILABLE`, `OVERLAP`, `BLOCKED`, `INVALID_TIME`, `PAST_TIME`, `TOO_LONG`), optional `question` (≤ 200 chars) |
| Instruction | Explain in at most two sentences; use only supplied facts; never override the status |
| Output | `{ explanation: string }`, ≤ 300 chars, ≤ 2 sentences, no markup, mentions only supplied times, must not contradict `isAvailable` |
| Failure | timeout (3 s), API error, missing key, invalid output → fixed fallback text; status card unchanged |

## Acceptance criteria
- **AC1** Existing availability and overlap rules unchanged.
- **AC2** Explanation agrees with the deterministic result; no invented booking details.
- **AC3** Empty, malformed or overly long input is rejected.
- **AC4** Timeout, error or unavailable key → safe fallback.
- **AC5** Generated explanation is visually distinct from the confirmed status.
