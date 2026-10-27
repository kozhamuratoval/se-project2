import { describe, it, expect } from 'vitest';
import { checkAvailability, type Room } from '@/lib/availability';

const NOW = 540;

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'TEST',
    name: 'Test Room',
    building: 'Test Building',
    capacity: 30,
    blocked: false,
    bookings: [{ start: 600, end: 660, label: 'Existing' }],
    ...overrides,
  };
}

describe('checkAvailability — AC1–AC6 case table', () => {
  it('T01 AC4: touching after is available', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 660, 720, NOW);
    expect(res.available).toBe(true);
  });

  it('T02 AC1: start equals current time is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 540, 570, NOW);
    expect(res.available).toBe(false);
  });

  it('T03 AC1: start equals end is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 720, 720, NOW);
    expect(res.available).toBe(false);
  });

  it('T04 AC1: start after end is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 750, 720, NOW);
    expect(res.available).toBe(false);
  });

  it('T05 AC1: end exceeds 1440 is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 1380, 1441, NOW);
    expect(res.available).toBe(false);
  });

  it('T06 AC2: exactly 120 minutes is allowed', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 720, 840, NOW);
    expect(res.available).toBe(true);
  });

  it('T07 AC2: 121 minutes is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 720, 841, NOW);
    expect(res.available).toBe(false);
  });

  it('T08 AC4: touching before is available', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 570, 600, NOW);
    expect(res.available).toBe(true);
  });

  it('T09 AC4: partial overlap after existing is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 630, 690, NOW);
    expect(res.available).toBe(false);
  });

  it('T10 AC4: partial overlap before existing is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 570, 690, NOW);
    expect(res.available).toBe(false);
  });

  it('T11 AC4: fully inside existing is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 615, 645, NOW);
    expect(res.available).toBe(false);
  });

  it('T12 AC4: exactly matches existing booking is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 600, 660, NOW);
    expect(res.available).toBe(false);
  });

  it('T13 AC3: blocked room is rejected', () => {
    const room = makeRoom({ blocked: true, blockReason: 'Maintenance' });
    const res = checkAvailability(room, 660, 720, NOW);
    expect(res.available).toBe(false);
  });

  it('T14 AC4: no bookings means available', () => {
    const room = makeRoom({ bookings: [] });
    const res = checkAvailability(room, 630, 690, NOW);
    expect(res.available).toBe(true);
  });

  it('T15 AC5: bookings array is unchanged after the call', () => {
    const room = makeRoom();
    const snapshot = room.bookings.map((b) => ({ ...b }));
    checkAvailability(room, 660, 720, NOW);
    expect(room.bookings).toEqual(snapshot);
  });

  it('T16 AC1+AC2: 1320–1440 (120 min, max end) is available', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 1320, 1440, NOW);
    expect(res.available).toBe(true);
  });

  it('T17 AC1: start before current time is rejected', () => {
    const room = makeRoom();
    const res = checkAvailability(room, 500, 530, NOW);
    expect(res.available).toBe(false);
  });
  
  it('T18 AC5: unsorted bookings keep their original order after the call', () => {
    const room = makeRoom({
      bookings: [
        { start: 720, end: 780, label: 'Later' },
        { start: 600, end: 660, label: 'Earlier' },
      ],
    });
    const snapshot = room.bookings.map((b) => ({ ...b }));
    checkAvailability(room, 660, 720, NOW);
    expect(room.bookings).toEqual(snapshot);
  });
});
