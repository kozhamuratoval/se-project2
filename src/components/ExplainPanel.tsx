import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, FlaskConical } from 'lucide-react';
import type { CheckResult } from '@/lib/availability';
import { LIMITS } from '@/lib/explain/contract';
import { createMockAdapter, type MockMode } from '@/lib/explain/mockAdapter';
import {
  buildExplainInput,
  explainAvailability,
  type ExplainOutcome,
} from '@/lib/explain/explainService';

export interface CheckSnapshot {
  id: number;
  roomLabel: string;
  start: number;
  end: number;
  result: CheckResult;
}

const MODES: { value: MockMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'timeout', label: 'Simulate timeout' },
  { value: 'error', label: 'Simulate API error' },
  { value: 'no-key', label: 'Simulate missing API key' },
  { value: 'bad-output', label: 'Simulate wrong model output' },
];

/**
 * Optional "Explain availability" panel. Read-only: it receives a snapshot of
 * the deterministic result and can never change it.
 */
export function ExplainPanel({ snapshot }: { snapshot: CheckSnapshot }) {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<MockMode>('normal');
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<ExplainOutcome | null>(null);
  const latestRequest = useRef(0);

  // A new check invalidates any explanation still in flight or on screen.
  useEffect(() => {
    latestRequest.current += 1;
    setOutcome(null);
    setLoading(false);
  }, [snapshot.id]);

  async function handleExplain() {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setOutcome(null);
    const input = buildExplainInput(
      snapshot.roomLabel,
      snapshot.start,
      snapshot.end,
      snapshot.result,
      question
    );
    const res = await explainAvailability(input, createMockAdapter(mode));
    if (requestId !== latestRequest.current) return; // stale response, ignore
    setOutcome(res);
    setLoading(false);
  }

  const tooLong = question.trim().length > LIMITS.questionMax;

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          Explain availability
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">
            Optional · AI
          </span>
        </h3>
      </div>

      <label className="block">
        <span className="text-sm text-slate-600">Your question (optional)</span>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Why can't I book this slot?"
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 ${
            tooLong
              ? 'border-rose-400 focus:ring-rose-200'
              : 'border-slate-300 focus:border-violet-500 focus:ring-violet-200'
          }`}
        />
        <span className={`text-xs mt-1 block ${tooLong ? 'text-rose-600' : 'text-slate-400'}`}>
          {question.trim().length}/{LIMITS.questionMax} characters
        </span>
      </label>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer inline-flex items-center gap-1 select-none">
          <FlaskConical className="w-3.5 h-3.5" /> Test mode (mock adapter)
        </summary>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as MockMode)}
          className="mt-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          aria-label="Mock adapter mode"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </details>

      <button
        onClick={handleExplain}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl py-2.5 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Generating explanation…' : 'Explain availability'}
      </button>

      {outcome?.status === 'ok' && (
        <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
            AI-generated explanation (mock) — not a booking confirmation
          </p>
          <p className="text-sm text-slate-700 mt-1.5 italic">{outcome.explanation}</p>
        </div>
      )}

      {outcome?.status === 'fallback' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800">{outcome.explanation}</p>
            <p className="text-xs text-amber-600 mt-1">Reason: {outcome.cause}</p>
          </div>
        </div>
      )}

      {outcome?.status === 'rejected' && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          Request rejected: {outcome.message}
        </div>
      )}
    </div>
  );
}
