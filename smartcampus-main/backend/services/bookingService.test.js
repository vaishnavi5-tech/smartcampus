import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApprovalLetterContext,
  createApprovalLetterPdf,
  isValidTimeSlot,
  timeSlotsOverlap
} from './bookingService.js';

test('auditorium time slot checks detect overlapping and adjacent reservations', () => {
  assert.equal(isValidTimeSlot('09:00 AM - 12:00 PM'), true);
  assert.equal(isValidTimeSlot('all day'), false);
  assert.equal(timeSlotsOverlap('09:00 AM - 12:00 PM', '11:30 AM - 01:00 PM'), true);
  assert.equal(timeSlotsOverlap('09:00 AM - 12:00 PM', '12:00 PM - 01:00 PM'), false);
  assert.equal(timeSlotsOverlap('05:00 PM - 08:00 PM', '05:00 PM - 08:00 PM'), true);
});

test('approval letter contains dynamic club, admin, faculty, schedule, and Head details', async () => {
  const context = buildApprovalLetterContext({
    reason: 'Annual Innovation Showcase',
    date: new Date('2026-11-13T00:00:00.000Z'),
    timeSlot: '05:00 PM - 08:00 PM',
    user: { name: 'Student Requester', department: 'Engineering' },
    auditorium: { name: 'Sir M.V. Hall' },
    club: {
      name: 'ONYX E-Cell',
      clubAdmin: { name: 'Club Admin Example' },
      facultyCoordinator: { name: 'Faculty Coordinator Example' },
      facultyAssignments: [{ faculty: { name: 'Additional Faculty Example' } }]
    },
    approvedBy: { name: 'Department Head Example', department: 'Engineering' }
  }, new Date('2026-11-10T10:00:00.000Z'));

  assert.equal(context.clubName, 'ONYX E-Cell');
  assert.equal(context.clubAdminName, 'Club Admin Example');
  assert.deepEqual(context.facultyNames, ['Additional Faculty Example', 'Faculty Coordinator Example']);
  assert.equal(context.eventDate, '13 November 2026');
  assert.equal(context.headName, 'Department Head Example');

  const pdf = await createApprovalLetterPdf(context);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 1000);
});
