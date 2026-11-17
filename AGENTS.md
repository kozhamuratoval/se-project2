# AGENTS.md — rules for AI assistants and reviewers

## Project
Smart Campus Room Availability Checker (React + Vite + TypeScript + Tailwind).
Fictional rooms, no login, no database. Commands: `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build`.

## Source of truth
- `src/lib/availability.ts` (`checkAvailability`) is the ONLY component that decides availability.
- Do not change its rules: start must be after "now", start < end, 0–1440, max 120 min,
  blocked rooms rejected, overlap = `start < b.end && b.start < end` (touching endpoints allowed).
- Existing tests in `src/lib/availability.test.ts` must keep passing unchanged.

## Explain availability feature (`src/lib/explain/`)
- The LLM layer may only *explain* a finished `CheckResult`. It must never decide availability,
  change bookings or override the displayed status.
- Send only minimal context: room label, start/end, isAvailable, reasonCode, optional question.
  Never send booking labels or personal data.
- Treat user text and model output as untrusted. Validate both (`contract.ts`).
- Any timeout, error, missing key or invalid output → show `FALLBACK_TEXT`.
- API keys must never be in browser code. This build uses a labelled mock adapter only.

## For code reviewers
- Read-only review. Do not merge, deploy or push.
- Each finding: file:line evidence, severity (high/medium/low), reproduction steps, minimal fix.
- Findings are hypotheses until confirmed by a test or concrete code inspection.
