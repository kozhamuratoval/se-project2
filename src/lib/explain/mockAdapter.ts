/**
 * MOCK LLM adapter — clearly labelled, no network, no API key.
 * Builds the explanation only from the structured result, exactly like the
 * real model is instructed to. Failure modes can be simulated for testing.
 */
import type { ExplainInput, ExplainOutput } from './contract';

export type MockMode = 'normal' | 'timeout' | 'error' | 'no-key' | 'bad-output';

export interface ExplainAdapter {
  readonly name: string;
  explain(input: ExplainInput, signal: AbortSignal): Promise<unknown>;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

export function mockExplanation(input: ExplainInput): ExplainOutput {
  const room = input.roomLabel;
  const { start, end } = input;
  const span = start !== 'invalid' && end !== 'invalid' ? ` from ${start} to ${end}` : '';

  switch (input.reasonCode) {
    case 'AVAILABLE':
      return {
        explanation: `${room} is free${span}, so the booking rules allow this request. This note only explains the result and does not reserve the room.`,
      };
    case 'OVERLAP':
      return {
        explanation: `${room} cannot be used${span} because that time overlaps an existing booking. Try a slot that starts after the other booking ends.`,
      };
    case 'BLOCKED':
      return {
        explanation: `${room} is blocked by the campus, so it cannot be booked at any time right now. Please choose another room.`,
      };
    case 'INVALID_TIME':
      return {
        explanation: `The times you entered are not a valid interval, because the start must be before the end and both must be within the day. Please correct the times and check again.`,
      };
    case 'PAST_TIME':
      return {
        explanation: `The requested start${start !== 'invalid' ? ` ${start}` : ''} is not after the current time, so it cannot be booked. Please choose a later start time.`,
      };
    case 'TOO_LONG':
      return {
        explanation: `The requested interval is longer than the 120-minute maximum, so it cannot be booked. Please shorten it and check again.`,
      };
  }
}

export function createMockAdapter(mode: MockMode = 'normal', latencyMs = 400): ExplainAdapter {
  return {
    name: 'mock',
    async explain(input, signal) {
      if (mode === 'no-key') throw new Error('LLM API key is not configured.');
      if (mode === 'timeout') {
        await wait(60_000, signal); // never answers in time
        return mockExplanation(input);
      }
      await wait(latencyMs, signal);
      if (mode === 'error') throw new Error('Simulated API error (HTTP 503).');
      if (mode === 'bad-output') {
        // A misbehaving model: contradicts the status and invents a booking.
        return {
          explanation: `Good news, ${input.roomLabel} is available! You can book it because Prof Smith's booking was moved.`,
        };
      }
      return mockExplanation(input);
    },
  };
}
