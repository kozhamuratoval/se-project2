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

export interface CheckResult {
  available: boolean;
  reason: string;
  conflicts: Booking[];
}

const DAY_MINUTES = 1440;

export function validateInterval(
  start: number,
  end: number,
  currentTime: number
): string | null {
  if (isNaN(start) || isNaN(end) || isNaN(currentTime)) {
    return 'Please enter valid numeric times.';
  }
  if (start < 0 || end > DAY_MINUTES) {
    return 'Times must be within 0–1440 minutes (the full day).';
  }
  if (start >= end) {
    return 'Start time must be earlier than end time.';
  }
  if (start <= currentTime) {
    return `Start time (${start}) must be after the current time (${currentTime}).`;
  }
  if (end - start > 120) {
    return `Booking length is ${end - start} minutes — the maximum is 120 minutes.`;
  }
  return null;
}

export function checkAvailability(
  room: Room,
  start: number,
  end: number,
  currentTime: number
): CheckResult {
  const validationError = validateInterval(start, end, currentTime);
  if (validationError) {
    return { available: false, reason: validationError, conflicts: [] };
  }

  if (room.blocked) {
    return {
      available: false,
      reason: room.blockReason ?? 'This room is currently blocked.',
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
      conflicts,
    };
  }

  return {
    available: true,
    reason: `Room is available from ${formatTime(start)} to ${formatTime(end)}.`,
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
