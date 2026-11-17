/**
 * Feature contract for "Explain availability" (Practice #11).
 *
 * The deterministic checker (src/lib/availability.ts) is the ONLY source of
 * truth. The explanation layer receives its result and may only describe it.
 * Everything coming from the user or from a model is treated as untrusted data.
 */
import type { ReasonCode } from '@/lib/availability';

export const REASON_CODES: readonly ReasonCode[] = [
  'AVAILABLE',
  'OVERLAP',
  'BLOCKED',
  'INVALID_TIME',
  'PAST_TIME',
  'TOO_LONG',
] as const;

/** Minimal context sent to the explainer. No booking labels, no personal data. */
export interface ExplainInput {
  roomLabel: string;
  /** "HH:MM" (00:00–24:00) or "invalid" when the user typed an unusable time. */
  start: string;
  end: string;
  isAvailable: boolean;
  reasonCode: ReasonCode;
  /** Optional free-text question from the student. Untrusted. */
  question?: string;
}

/** Shape every adapter (mock or real LLM) must return. */
export interface ExplainOutput {
  explanation: string;
}

export const LIMITS = {
  roomLabelMax: 60,
  questionMax: 200,
  explanationMax: 300,
  maxSentences: 2,
  timeoutMs: 3000,
} as const;

export const FALLBACK_TEXT =
  'An explanation is not available right now. The status above comes from the booking rules and is still correct.';

const TIME_RE = /^(?:([01]\d|2[0-3]):[0-5]\d|24:00|invalid)$/;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** AC3: reject empty, malformed or overly long input before any adapter call. */
export function validateExplainInput(raw: unknown): ValidationResult<ExplainInput> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Input is missing.' };
  const r = raw as Record<string, unknown>;

  if (typeof r.roomLabel !== 'string' || r.roomLabel.trim() === '') {
    return { ok: false, error: 'Room is missing.' };
  }
  if (r.roomLabel.length > LIMITS.roomLabelMax) {
    return { ok: false, error: `Room label is longer than ${LIMITS.roomLabelMax} characters.` };
  }
  if (typeof r.start !== 'string' || !TIME_RE.test(r.start)) {
    return { ok: false, error: 'Start time is malformed.' };
  }
  if (typeof r.end !== 'string' || !TIME_RE.test(r.end)) {
    return { ok: false, error: 'End time is malformed.' };
  }
  if (typeof r.isAvailable !== 'boolean') {
    return { ok: false, error: 'Availability flag is missing.' };
  }
  if (typeof r.reasonCode !== 'string' || !REASON_CODES.includes(r.reasonCode as ReasonCode)) {
    return { ok: false, error: 'Reason code is unknown.' };
  }
  // The flag and the code must agree, otherwise the context itself is corrupt.
  if (r.isAvailable !== (r.reasonCode === 'AVAILABLE')) {
    return { ok: false, error: 'Availability flag and reason code disagree.' };
  }

  let question: string | undefined;
  if (r.question !== undefined && r.question !== null) {
    if (typeof r.question !== 'string') return { ok: false, error: 'Question must be text.' };
    const q = r.question.trim();
    if (q.length > LIMITS.questionMax) {
      return { ok: false, error: `Question is longer than ${LIMITS.questionMax} characters.` };
    }
    question = q === '' ? undefined : q;
  }

  return {
    ok: true,
    value: {
      roomLabel: r.roomLabel.trim(),
      start: r.start,
      end: r.end,
      isAvailable: r.isAvailable,
      reasonCode: r.reasonCode as ReasonCode,
      question,
    },
  };
}

function countSentences(text: string): number {
  const parts = text
    .split(/[.!?]+(?:\s|$)/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length;
}

// Fix F2/F3 (review): broader phrase lists + negations removed before matching.
const CLAIMS_AVAILABLE =
  /\b(?:is|are)(?: (?:now|still|currently))? (?:free|available|open|vacant)\b|\bcan (?:be )?(?:book(?:ed)?|use[d]?|reserve[d]?)\b|\byou can\b|\bgo ahead\b|\b(?:booking|reservation) (?:is )?confirmed\b/i;
const CLAIMS_UNAVAILABLE =
  /\b(?:not available|unavailable|blocked|overlap\w*|conflict\w*|taken|occupied|already booked|cannot|can't|not (?:free|possible|allowed))\b/i;
/** Phrases like "no overlap" or "does not conflict" support availability, not contradict it. */
const NEGATED_PROBLEM = /\b(?:no|without|not|doesn't|does not|don't|do not)\s+(?:any\s+)?(?:overlap\w*|conflict\w*)\b/gi;

// Fix F1 (review): no invented people or extra numbers.
const PERSON_OR_OWNER = /\b(?:dr|prof|professor|mr|mrs|ms|miss|mx|sir|madam)\b\.?|\b(?:booked|reserved|held|requested) by\b/i;
const POSSESSIVE_NAME = /\b[A-Z][a-z]+'s\b/;
/** Numbers the explainer may mention besides supplied times and the room label (120-minute rule). */
const ALLOWED_NUMBERS = new Set(['120']);

/**
 * Validate model output: format, length and agreement with the deterministic
 * result (AC2). Any failure → caller shows the fallback.
 */
export function validateExplainOutput(
  raw: unknown,
  input: ExplainInput
): ValidationResult<ExplainOutput> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Output is not an object.' };
  const text = (raw as Record<string, unknown>).explanation;
  if (typeof text !== 'string') return { ok: false, error: 'Output has no explanation text.' };

  const explanation = text.trim().replace(/\s+/g, ' ');
  if (explanation === '') return { ok: false, error: 'Explanation is empty.' };
  if (explanation.length > LIMITS.explanationMax) {
    return { ok: false, error: 'Explanation is too long.' };
  }
  if (/[<>]/.test(explanation)) return { ok: false, error: 'Explanation contains markup.' };
  if (countSentences(explanation) > LIMITS.maxSentences) {
    return { ok: false, error: 'Explanation has more than two sentences.' };
  }

  // No invented times: every clock time mentioned must be one we supplied.
  const allowedTimes = new Set([input.start, input.end]);
  const mentioned = explanation.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  if (mentioned.some((t) => !allowedTimes.has(t.padStart(5, '0')))) {
    return { ok: false, error: 'Explanation mentions a time that was not supplied.' };
  }

  // No invented people/owners, and no numbers we did not supply (e.g. "3 pm", "room 204").
  if (PERSON_OR_OWNER.test(explanation) || POSSESSIVE_NAME.test(explanation)) {
    return { ok: false, error: 'Explanation mentions a person or booking owner.' };
  }
  let rest = explanation.split(input.roomLabel).join(' ');
  for (const t of allowedTimes) rest = rest.split(t).join(' ');
  const extraNumbers = (rest.match(/\d+/g) ?? []).filter((n) => !ALLOWED_NUMBERS.has(n));
  if (extraNumbers.length > 0) {
    return { ok: false, error: 'Explanation mentions a number that was not supplied.' };
  }

  // Must not contradict the deterministic status.
  const withoutNegations = explanation.replace(NEGATED_PROBLEM, ' ');
  if (input.isAvailable && CLAIMS_UNAVAILABLE.test(withoutNegations)) {
    return { ok: false, error: 'Explanation contradicts the status (says unavailable).' };
  }
  if (!input.isAvailable && CLAIMS_AVAILABLE.test(explanation)) {
    return { ok: false, error: 'Explanation contradicts the status (says available).' };
  }

  return { ok: true, value: { explanation } };
}
