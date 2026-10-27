import type { Room } from '@/lib/availability';

export const sampleRooms: Room[] = [
  {
    id: 'A101',
    name: 'Lecture Hall A',
    building: 'Engineering Block',
    capacity: 120,
    blocked: false,
    bookings: [
      { start: 540, end: 600, label: 'CS 101 Lecture' },
      { start: 720, end: 780, label: 'Faculty Meeting' },
    ],
  },
  {
    id: 'A102',
    name: 'Seminar Room 2',
    building: 'Engineering Block',
    capacity: 30,
    blocked: true,
    blockReason: 'Under maintenance until further notice.',
    bookings: [
      { start: 600, end: 660, label: 'Study Group' },
    ],
  },
  {
    id: 'B201',
    name: 'Lab B-2',
    building: 'Science Wing',
    capacity: 40,
    blocked: false,
    bookings: [
      { start: 600, end: 660, label: 'Chemistry Lab' },
    ],
  },
  {
    id: 'B202',
    name: 'Project Room',
    building: 'Science Wing',
    capacity: 8,
    blocked: false,
    bookings: [],
  },
  {
    id: 'C301',
    name: 'Auditorium',
    building: 'Central Hall',
    capacity: 300,
    blocked: true,
    blockReason: 'Reserved for annual conference setup.',
    bookings: [
      { start: 600, end: 720, label: 'Keynote Rehearsal' },
    ],
  },
];
