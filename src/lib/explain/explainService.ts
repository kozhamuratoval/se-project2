import {
  FALLBACK_TEXT,
  LIMITS,
  validateExplainInput,
  validateExplainOutput,
  type ExplainInput,
} from './contract';
import type { ExplainAdapter } from './mockAdapter';
import { formatTime, type CheckResult } from '@/lib/availability';

export type ExplainOutcome =
  | { status: 'ok'; explanation: string }
  | { status: 'rejected'; message: string }
  | { status: 'fallback'; explanation: string; cause: string };

/** Convert minutes to the contract's time format; anything unusable → "invalid". */
export function toContractTime(minutes: number): string {
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= 1440
    ? formatTime(minutes)
    : 'invalid';
}

/** Build the minimal context from the checker's result. Booking labels are NOT sent. */
export function buildExplainInput(
  roomLabel: string,
  start: number,
  end: number,
  result: CheckResult,
  question?: string
): ExplainInput {
  return {
    roomLabel,
    start: toContractTime(start),
    end: toContractTime(end),
    isAvailable: result.available,
    reasonCode: result.reasonCode,
    question,
  };
}

/**
 * Validate → call adapter with timeout → validate output → fallback on any failure.
 * Never throws and never touches booking data.
 */
export async function explainAvailability(
  rawInput: unknown,
  adapter: ExplainAdapter,
  timeoutMs: number = LIMITS.timeoutMs
): Promise<ExplainOutcome> {
  const checked = validateExplainInput(rawInput);
  if (!checked.ok) return { status: 'rejected', message: checked.error };
  const input = checked.value;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timed out after ${timeoutMs} ms.`));
    }, timeoutMs);
  });

  try {
    const raw = await Promise.race([adapter.explain(input, controller.signal), timeout]);
    const out = validateExplainOutput(raw, input);
    if (!out.ok) return { status: 'fallback', explanation: FALLBACK_TEXT, cause: out.error };
    return { status: 'ok', explanation: out.value.explanation };
  } catch (err) {
    const cause = err instanceof Error ? err.message : 'Unknown error.';
    return { status: 'fallback', explanation: FALLBACK_TEXT, cause };
  } finally {
    clearTimeout(timer);
  }
}
