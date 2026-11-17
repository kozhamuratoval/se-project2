export interface Booking {
  start: number;
  end: number;
  label: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  blocked: boolean;
  blockReason?: string;
  bookings: Booking[];
}

/**
 * Machine-readable reason for a decision. Added for the "Explain availability"
 * feature (Practice #11). It only labels the existing decision — it never
 * changes it.
 */
export type ReasonCode =
  | 'AVAILABLE'
  | 'OVERLAP'
  | 'BLOCKED'
  | 'INVALID_TIME'
  | 'PAST_TIME'
  | 'TOO_LONG';

export interface CheckResult {
  available: boolean;
  reason: string;
  reasonCode: ReasonCode;
  conflicts: Booking[];
}

const DAY_MINUTES = 1440;

export interface IntervalError {
  code: Exclude<ReasonCode, 'AVAILABLE' | 'OVERLAP' | 'BLOCKED'>;
  message: string;
}

/** Same rules and order as before; additionally returns a reason code. */
export function classifyInterval(
  start: number,
  end: number,
  currentTime: number
): IntervalError | null {
  if (isNaN(start) || isNaN(end) || isNaN(currentTime)) {
    return { code: 'INVALID_TIME', message: 'Please enter valid numeric times.' };
  }
  if (start < 0 || end > DAY_MINUTES) {
    return {
      code: 'INVALID_TIME',
      message: 'Times must be within 0–1440 minutes (the full day).',
    };
  }
  if (start >= end) {
    return { code: 'INVALID_TIME', message: 'Start time must be earlier than end time.' };
  }
  if (start <= currentTime) {
    return {
      code: 'PAST_TIME',
      message: `Start time (${start}) must be after the current time (${currentTime}).`,
    };
  }
  if (end - start > 120) {
    return {
      code: 'TOO_LONG',
      message: `Booking length is ${end - start} minutes — the maximum is 120 minutes.`,
    };
  }
  return null;
}

export function validateInterval(
  start: number,
  end: number,
  currentTime: number
): string | null {
  return classifyInterval(start, end, currentTime)?.message ?? null;
}

export function checkAvailability(
  room: Room,
  start: number,
  end: number,
  currentTime: number
): CheckResult {
  const validationError = classifyInterval(start, end, currentTime);
  if (validationError) {
    return {
      available: false,
      reason: validationError.message,
      reasonCode: validationError.code,
      conflicts: [],
    };
  }

  if (room.blocked) {
    return {
      available: false,
      reason: room.blockReason ?? 'This room is currently blocked.',
      reasonCode: 'BLOCKED',
      conflicts: [],
    };
  }

  const conflicts = room.bookings.filter((b) => {
    const overlaps = start < b.end && b.start < end;
    return overlaps;
  });

  if (conflicts.length > 0) {
    const descriptions = conflicts
      .map((c) => `${c.label}: ${formatTime(c.start)}–${formatTime(c.end)}`)
      .join(', ');
    return {
      available: false,
      reason: `Overlaps with existing booking (${descriptions}). Touching endpoints are allowed.`,
      reasonCode: 'OVERLAP',
      conflicts,
    };
  }

  return {
    available: true,
    reason: `Room is available from ${formatTime(start)} to ${formatTime(end)}.`,
    reasonCode: 'AVAILABLE',
    conflicts: [],
  };
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTimeInput(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
