import { useMemo, useState, useEffect } from 'react';
import {
  Clock,
  DoorOpen,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Ban,
  Users,
  Building2,
  Info,
} from 'lucide-react';
import { sampleRooms } from '@/data/rooms';
import { ExplainPanel, type CheckSnapshot } from '@/components/ExplainPanel';
import {
  checkAvailability,
  formatTime,
  parseTimeInput,
  type CheckResult,
} from '@/lib/availability';

const STORAGE_KEY = 'room-availability-form';

function loadFormState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<FormState>;
  } catch {
    // ignore
  }
  return null;
}

interface FormState {
  selectedRoomId: string;
  currentTimeInput: string;
  startTimeInput: string;
  endTimeInput: string;
}

function usePersistedState<K extends keyof FormState>(
  key: K,
  fallback: FormState[K]
): [FormState[K], (v: FormState[K]) => void] {
  const saved = loadFormState();
  const [value, setValue] = useState<FormState[K]>(
    saved && saved[key] != null ? saved[key]! : fallback
  );

  useEffect(() => {
    const current = loadFormState() ?? {};
    current[key] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}

function App() {
  const [rooms] = useState(sampleRooms);
  const [selectedRoomId, setSelectedRoomId] = usePersistedState('selectedRoomId', sampleRooms[0].id);
  const [currentTimeInput, setCurrentTimeInput] = usePersistedState('currentTimeInput', '09:00');
  const [startTimeInput, setStartTimeInput] = usePersistedState('startTimeInput', '10:00');
  const [endTimeInput, setEndTimeInput] = usePersistedState('endTimeInput', '11:00');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [snapshot, setSnapshot] = useState<CheckSnapshot | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId)!,
    [rooms, selectedRoomId]
  );

  const currentTime = parseTimeInput(currentTimeInput) ?? -1;
  const startTime = parseTimeInput(startTimeInput) ?? -1;
  const endTime = parseTimeInput(endTimeInput) ?? -1;

  function handleCheck() {
    const res = checkAvailability(
      selectedRoom,
      startTime,
      endTime,
      currentTime
    );
    setResult(res);
    // Freeze the exact inputs of this decision for the explanation feature.
    setSnapshot((prev) => ({
      id: (prev?.id ?? 0) + 1,
      roomLabel: selectedRoom.name,
      start: startTime,
      end: endTime,
      result: res,
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-700 to-cyan-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-xl p-2.5 ring-1 ring-white/25">
              <CalendarClock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Smart Campus Room Availability
              </h1>
              <p className="text-sky-100 text-sm mt-0.5">
                Check whether a room is free for your chosen time before booking.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid gap-8 lg:grid-cols-3">
        {/* Left: form */}
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-sky-600" />
              Select a Room
            </h2>

            <div className="grid gap-2">
              {rooms.map((room) => {
                const selected = room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setResult(null);
                      setSnapshot(null);
                    }}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      selected
                        ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{room.name}</span>
                      {room.blocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          <Ban className="w-3 h-3" /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Open
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {room.building}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {room.capacity} seats
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              Time Interval
            </h2>

            <TimeField
              label="Current time (for testing)"
              value={currentTimeInput}
              onChange={setCurrentTimeInput}
              hint="The simulated 'now' — start must be after this."
            />
            <TimeField
              label="Start time"
              value={startTimeInput}
              onChange={setStartTimeInput}
              hint="Inclusive booking start."
            />
            <TimeField
              label="End time"
              value={endTimeInput}
              onChange={setEndTimeInput}
              hint="Exclusive booking end. Use 24:00 for midnight (1440)."
              allowMidnight
            />

            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
              <span>
                Times use a 24-hour clock and are stored as minutes from midnight
                (0–1440). Bookings may be up to 120 minutes.
              </span>
            </div>

            <button
              onClick={handleCheck}
              className="w-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold rounded-xl py-3 transition-colors shadow-sm"
            >
              Check Availability
            </button>
          </div>
        </section>

        {/* Right: details + result */}
        <section className="lg:col-span-2 space-y-6">
          {/* Room detail */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold">{selectedRoom.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedRoom.building} · {selectedRoom.capacity} seats ·{' '}
                  {selectedRoom.id}
                </p>
              </div>
              {selectedRoom.blocked ? (
                <div className="flex items-start gap-2 bg-rose-50 text-rose-700 rounded-xl px-4 py-3 text-sm max-w-sm">
                  <Ban className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>Blocked.</strong>{' '}
                    {selectedRoom.blockReason ?? 'This room is unavailable.'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Room is open for booking.
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Today's bookings
              </h3>
              <Timeline
                bookings={selectedRoom.bookings}
                blocked={selectedRoom.blocked}
                start={startTime}
                end={endTime}
                result={result}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedRoom.bookings.length === 0 && (
                <span className="text-sm text-slate-400">No bookings yet.</span>
              )}
              {selectedRoom.bookings.map((b, i) => (
                <span
                  key={i}
                  className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1"
                >
                  {b.label}: {formatTime(b.start)}–{formatTime(b.end)}
                </span>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`rounded-2xl shadow-sm ring-1 p-6 transition-all ${
                result.available
                  ? 'bg-emerald-50 ring-emerald-200'
                  : 'bg-rose-50 ring-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.available ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
                )}
                <div>
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      result.available ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    Confirmed status · booking rules
                  </p>
                  <h3
                    className={`text-lg font-bold ${
                      result.available ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {result.available ? 'Available' : 'Unavailable'}
                  </h3>
                  <p
                    className={`text-sm mt-1 ${
                      result.available ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {result.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && snapshot && <ExplainPanel snapshot={snapshot} />}

          {!result && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 text-center text-slate-400 text-sm">
              Pick a room, set a time interval, and press{' '}
              <span className="font-semibold text-slate-500">Check Availability</span>{' '}
              to see the result.
            </div>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-slate-400 py-6">
        Fictional sample data · No bookings are created or modified.
      </footer>
    </div>
  );
}

interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  allowMidnight?: boolean;
}

function TimeField({ label, value, onChange, hint, allowMidnight }: TimeFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={allowMidnight ? 'text' : 'time'}
        value={value}
        placeholder={allowMidnight ? 'HH:MM' : undefined}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-colors"
      />
      {hint && <span className="text-xs text-slate-400 mt-1 block">{hint}</span>}
    </label>
  );
}

interface TimelineProps {
  bookings: { start: number; end: number; label: string }[];
  blocked: boolean;
  start: number;
  end: number;
  result: CheckResult | null;
}

function Timeline({ bookings, blocked, start, end, result }: TimelineProps) {
  const DAY = 1440;
  const pct = (v: number) => `${(v / DAY) * 100}%`;

  return (
    <div className="relative">
      <div
        className={`h-10 rounded-lg overflow-hidden ${
          blocked ? 'bg-rose-100' : 'bg-slate-100'
        } relative ring-1 ring-slate-200`}
      >
        {/* hour gridlines */}
        {[0, 6, 12, 18, 24].map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-slate-200"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}

        {/* existing bookings */}
        {bookings.map((b, i) => {
          const widthPct = (b.end - b.start) / 1440 * 100;
          const showLabel = widthPct >= 8;
          return (
            <div
              key={i}
              className="absolute top-0.5 bottom-0.5 bg-slate-400 rounded text-[10px] text-white flex items-center justify-center px-1 overflow-hidden whitespace-nowrap"
              style={{ left: pct(b.start), width: pct(b.end - b.start) }}
              title={`${b.label}: ${formatTime(b.start)}–${formatTime(b.end)}`}
            >
              {showLabel ? b.label : ''}
            </div>
          );
        })}

        {/* candidate interval */}
        {start >= 0 && end > start && (
          <div
            className={`absolute top-0 bottom-0 border-2 rounded ${
              result
                ? result.available
                  ? 'border-emerald-500 bg-emerald-300/40'
                  : 'border-rose-500 bg-rose-300/40'
                : 'border-sky-500 bg-sky-300/30'
            }`}
            style={{ left: pct(start), width: pct(end - start) }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

export default App;
