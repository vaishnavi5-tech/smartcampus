import { PrismaClient } from '@prisma/client';
import {
  buildApprovalLetterContext,
  createApprovalLetterPdf,
  isValidTimeSlot,
  timeSlotsOverlap
} from '../services/bookingService.js';

const prisma = new PrismaClient();
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'APPROVED'];

async function findConflictingBooking(database, { auditoriumId, date, timeSlot, excludedId }) {
  const bookings = await database.booking.findMany({
    where: {
      auditoriumId,
      date,
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...(excludedId ? { id: { not: excludedId } } : {})
    },
    select: { id: true, timeSlot: true }
  });
  return bookings.find(booking => timeSlotsOverlap(booking.timeSlot, timeSlot)) || null;
}

// Get all auditoriums with upcoming bookings
export const getAuditoriums = async (req, res) => {
  try {
    const auditoriums = await prisma.auditorium.findMany({
      include: {
        bookings: {
          where: { date: { gte: new Date() } },
          select: { id: true, date: true, timeSlot: true, status: true, user: { select: { name: true } } }
        }
      }
    });
    res.status(200).json(auditoriums);
  } catch (error) {
    console.error('Fetch auditoriums error:', error);
    res.status(500).json({ error: 'Server error fetching auditoriums' });
  }
};

// Get bookings for the Head approval queue or Super Admin oversight.
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      select: {
        id: true,
        date: true,
        timeSlot: true,
        status: true,
        reason: true,
        userId: true,
        clubId: true,
        approvedAt: true,
        approvalPdf: true,
        createdAt: true,
        auditorium: { select: { name: true } },
        user: { select: { name: true, email: true } },
        club: {
          select: {
            id: true,
            name: true,
            clubAdmin: { select: { name: true } },
            facultyCoordinator: { select: { name: true } },
            facultyAssignments: { select: { faculty: { select: { name: true } } } }
          }
        },
        approvedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(bookings.map(({ approvalPdf, ...booking }) => ({
      ...booking,
      hasApprovalPdf: Boolean(approvalPdf)
    })));
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ error: 'Server error fetching bookings' });
  }
};

// Create a new booking request
export const createBooking = async (req, res) => {
  try {
    const { date, timeSlot, reason } = req.body;
    if (!['CLUB_ADMIN', 'FACULTY'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only club admins and club faculty can request auditorium bookings.' });
    }
    if (typeof date !== 'string' || Number.isNaN(new Date(date).getTime()) ||
        typeof timeSlot !== 'string' || !isValidTimeSlot(timeSlot) ||
        typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1200 ||
        typeof req.body.auditoriumId !== 'string' || !req.body.auditoriumId.trim()) {
      return res.status(400).json({ error: 'A valid date, time slot, and event description (up to 1200 characters) are required.' });
    }

    let clubId = req.body.clubId;
    if (req.user.role === 'CLUB_ADMIN') {
      const managedClub = await prisma.club.findUnique({
        where: { clubAdminId: req.user.id },
        select: { id: true }
      });
      if (!managedClub) {
        return res.status(403).json({ error: 'Your club admin account is not assigned to a club.' });
      }
      clubId = managedClub.id;
    } else if (typeof clubId !== 'string' || !clubId.trim()) {
      return res.status(400).json({ error: 'Club faculty must select the club for this booking.' });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
    if (!club) return res.status(404).json({ error: 'Selected club was not found.' });

    const bookingDate = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
    const booking = await prisma.$transaction(async transaction => {
      const conflict = await findConflictingBooking(transaction, {
        auditoriumId: req.body.auditoriumId,
        date: bookingDate,
        timeSlot,
        excludedId: null
      });
      if (conflict) {
        const error = new Error('This auditorium has an active booking that overlaps the selected date and time.');
        error.code = 'BOOKING_CONFLICT';
        throw error;
      }
      return transaction.booking.create({
        data: {
          date: bookingDate,
          timeSlot: timeSlot.trim(),
          reason: reason.trim(),
          auditoriumId: req.body.auditoriumId,
          clubId,
          userId: req.user.id,
          status: 'PENDING'
        },
        select: { id: true, date: true, timeSlot: true, status: true, reason: true, clubId: true }
      });
    });

    res.status(201).json(booking);
  } catch (error) {
    if (error.code === 'BOOKING_CONFLICT') {
      return res.status(409).json({ error: error.message });
    }
    if (error.code === 'P2003' || error.code === 'P2025') {
      return res.status(400).json({ error: 'The selected auditorium, club, or account is not valid.' });
    }
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Server error creating booking' });
  }
};

// Only the designated Head may approve or reject auditorium requests.
export const updateBookingStatus = async (req, res) => {
  try {
    if (req.user.role !== 'HEAD') {
      return res.status(403).json({ error: 'Only the designated Head can approve or reject auditorium bookings.' });
    }
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Booking status must be APPROVED or REJECTED.' });
    }

    const updated = await prisma.$transaction(async transaction => {
      const booking = await transaction.booking.findUnique({
        where: { id: req.params.id },
        include: {
          user: { select: { name: true, email: true, department: true } },
          auditorium: { select: { name: true } },
          club: {
            include: {
              clubAdmin: { select: { name: true } },
              facultyCoordinator: { select: { name: true } },
              facultyAssignments: { include: { faculty: { select: { name: true } } } }
            }
          }
        }
      });
      if (!booking) {
        const error = new Error('Booking not found.');
        error.code = 'BOOKING_NOT_FOUND';
        throw error;
      }
      if (booking.status !== 'PENDING') {
        const error = new Error('Only pending booking requests can be reviewed.');
        error.code = 'BOOKING_ALREADY_REVIEWED';
        throw error;
      }

      let approvalPdf;
      let approvedAt = null;
      let approvedById = null;
      let clubId = booking.clubId;
      if (status === 'APPROVED') {
        const conflict = await findConflictingBooking(transaction, {
          auditoriumId: booking.auditoriumId,
          date: booking.date,
          timeSlot: booking.timeSlot,
          excludedId: booking.id
        });
        if (conflict) {
          const error = new Error('Cannot approve this booking because another pending or approved request overlaps its time.');
          error.code = 'BOOKING_CONFLICT';
          throw error;
        }
        let bookingClub = booking.club;
        if (!bookingClub && booking.userId) {
          bookingClub = await transaction.club.findUnique({
            where: { clubAdminId: booking.userId },
            include: {
              clubAdmin: { select: { name: true } },
              facultyCoordinator: { select: { name: true } },
              facultyAssignments: { include: { faculty: { select: { name: true } } } }
            }
          });
          clubId = bookingClub?.id || null;
        }
        if (!bookingClub) {
          const error = new Error('This request has no associated club and cannot produce an approval letter.');
          error.code = 'BOOKING_CLUB_REQUIRED';
          throw error;
        }
        const head = await transaction.user.findUnique({
          where: { id: req.user.id },
          select: { id: true, name: true, department: true }
        });
        if (!head) {
          const error = new Error('Approving Head account was not found.');
          error.code = 'HEAD_NOT_FOUND';
          throw error;
        }
        approvedAt = new Date();
        approvedById = head.id;
        approvalPdf = await createApprovalLetterPdf(buildApprovalLetterContext({
          ...booking,
          club: bookingClub,
          approvedBy: head
        }, approvedAt));
      }

      return transaction.booking.update({
        where: { id: booking.id },
        data: {
          status,
          clubId,
          approvedAt,
          approvedById,
          approvalPdf
        },
        select: {
          id: true,
          date: true,
          timeSlot: true,
          status: true,
          approvedAt: true,
          approvedBy: { select: { name: true } }
        }
      });
    });
    res.status(200).json({ ...updated, hasApprovalPdf: status === 'APPROVED' });
  } catch (error) {
    if (error.code === 'BOOKING_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'BOOKING_CONFLICT' || error.code === 'BOOKING_ALREADY_REVIEWED' ||
        error.code === 'BOOKING_CLUB_REQUIRED' || error.code === 'HEAD_NOT_FOUND') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Server error updating booking status' });
  }
};

export const downloadApprovalLetter = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        approvalPdf: true,
        userId: true,
        club: {
          select: {
            clubAdminId: true,
            facultyCoordinatorId: true,
            facultyAssignments: { select: { facultyId: true } }
          }
        }
      }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const hasAccess = ['HEAD', 'SUPER_ADMIN'].includes(req.user.role) ||
      booking.userId === req.user.id ||
      booking.club?.clubAdminId === req.user.id ||
      booking.club?.facultyCoordinatorId === req.user.id ||
      booking.club?.facultyAssignments.some(assignment => assignment.facultyId === req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'You are not authorized to download this approval letter.' });
    if (!booking.approvalPdf) return res.status(404).json({ error: 'No approval letter is available for this booking yet.' });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="auditorium-approval-${booking.id}.pdf"`,
      'Cache-Control': 'private, no-store'
    });
    res.status(200).send(Buffer.from(booking.approvalPdf));
  } catch (error) {
    console.error('Download booking approval letter error:', error);
    res.status(500).json({ error: 'Server error downloading approval letter' });
  }
};
