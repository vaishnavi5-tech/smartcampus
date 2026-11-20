import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();
const EVENT_TIME_SLOTS = [
  '09:00 AM - 12:00 PM',
  '01:00 PM - 04:00 PM',
  '05:00 PM - 08:00 PM'
];

const getDayRange = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

export const getVenueAvailability = async (req, res) => {
  const { date, timeSlot } = req.query;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !EVENT_TIME_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ error: 'A valid date and event time slot are required.' });
  }

  try {
    const { start, end } = getDayRange(date);
    const [auditoriums, bookings, events] = await Promise.all([
      prisma.auditorium.findMany({ orderBy: { name: 'asc' } }),
      prisma.booking.findMany({
        where: {
          date: { gte: start, lt: end },
          timeSlot,
          status: { in: ['PENDING', 'APPROVED'] }
        },
        select: { auditoriumId: true }
      }),
      prisma.event.findMany({
        where: {
          date: { gte: start, lt: end },
          OR: [{ timeSlot }, { timeSlot: null }]
        },
        select: { venue: true }
      })
    ]);

    const bookedAuditoriumIds = new Set(bookings.map((booking) => booking.auditoriumId));
    const eventVenues = new Set(events.map((event) => event.venue));
    res.json(auditoriums.map((auditorium) => ({
      id: auditorium.id,
      name: auditorium.name,
      capacity: auditorium.capacity,
      available: !bookedAuditoriumIds.has(auditorium.id) && !eventVenues.has(auditorium.name)
    })));
  } catch (error) {
    console.error('Check event venue availability error:', error);
    res.status(500).json({ error: 'Server error checking venue availability' });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        club: {
          select: {
            id: true,
            name: true,
            description: true,
            logo: true,
            banner: true,
            socialLinks: true,
            facultyCoordinatorId: true,
            createdAt: true,
            updatedAt: true
          }
        },
        _count: { select: { registrations: true } }
      },
      orderBy: { date: 'asc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching events' });
  }
};

// Get single event
export const getEventById = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            description: true,
            logo: true,
            banner: true,
            socialLinks: true,
            facultyCoordinatorId: true,
            createdAt: true,
            updatedAt: true
          }
        },
        _count: { select: { registrations: true } }
      }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching event' });
  }
};

// Create event
export const createEvent = async (req, res) => {
  try {
    const { title, description, date, timeSlot, venueId, capacity, clubId } = req.body;
    if (![title, description, date, timeSlot, venueId].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Title, description, date, time slot, and venue are required.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !EVENT_TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ error: 'Please provide a valid event date and time slot.' });
    }
    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      return res.status(400).json({ error: 'Event capacity must be a positive whole number.' });
    }

    const { start, end } = getDayRange(date);
    const eventClubId = req.user.role === 'CLUB_ADMIN'
      ? (await prisma.club.findUnique({ where: { clubAdminId: req.user.id }, select: { id: true } }))?.id
      : clubId;
    if (!eventClubId) {
      return res.status(403).json({ error: 'No club is assigned to this admin, or no event club was selected.' });
    }
    const venue = await prisma.auditorium.findUnique({ where: { id: venueId } });
    if (!venue) {
      return res.status(404).json({ error: 'Selected venue was not found.' });
    }
    if (parsedCapacity > venue.capacity) {
      return res.status(400).json({ error: `Event capacity cannot exceed the selected venue’s capacity of ${venue.capacity}.` });
    }

    const event = await prisma.$transaction(async (transaction) => {
      const [conflictingBooking, conflictingEvent] = await Promise.all([
        transaction.booking.findFirst({
          where: {
            auditoriumId: venue.id,
            date: { gte: start, lt: end },
            timeSlot,
            status: { in: ['PENDING', 'APPROVED'] }
          },
          select: { id: true }
        }),
        transaction.event.findFirst({
          where: {
            venue: venue.name,
            date: { gte: start, lt: end },
            OR: [{ timeSlot }, { timeSlot: null }]
          },
          select: { id: true }
        })
      ]);
      if (conflictingBooking || conflictingEvent) {
        const error = new Error('This venue is not available for the selected date and time.');
        error.code = 'VENUE_UNAVAILABLE';
        throw error;
      }

      return transaction.event.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          date: start,
          timeSlot,
          venue: venue.name,
          capacity: parsedCapacity,
          clubId: eventClubId
        }
      });
    });
    res.status(201).json(event);
  } catch (error) {
    if (error.code === 'VENUE_UNAVAILABLE') {
      return res.status(409).json({ error: error.message });
    }
    if (error.code === 'P2003' || error.code === 'P2025') {
      return res.status(400).json({ error: 'Selected club was not found.' });
    }
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Server error creating event' });
  }
};

// Get Open Positions (mocked if not used, but exported for routes)
export const getOpenPositions = async (req, res) => {
  res.json([]);
};

// Register for event
export const registerForEvent = async (req, res) => {
  try {
    const body = req.body || {};
    const studentName = typeof body.name === 'string' ? body.name.trim() : '';
    const usn = typeof body.usn === 'string' ? body.usn.trim() : '';
    const motivation = typeof body.motivation === 'string' ? body.motivation.trim() : '';

    if (!studentName || !usn || !motivation) {
      return res.status(400).json({ error: 'Name, USN, and motivation are required.' });
    }

    if (studentName.length > 120 || usn.length > 30 || motivation.length > 2000) {
      return res.status(400).json({ error: 'Registration details exceed the allowed length.' });
    }

    let reg = await prisma.eventRegistration.findFirst({
      where: { userId: req.user.id, eventId: req.params.id }
    });
    
    if (reg) {
      const qrData = reg.qrData || `TICKET-EV-${req.params.id}-USR-${req.user.id}`;
      reg = await prisma.eventRegistration.update({
        where: { id: reg.id },
        data: { studentName, usn, motivation, qrData }
      });
      return res.status(200).json(reg);
    }

    const qrData = `TICKET-EV-${req.params.id}-USR-${req.user.id}`;
    reg = await prisma.eventRegistration.create({
      data: { userId: req.user.id, eventId: req.params.id, studentName, usn, motivation, qrData }
    });

    // Award 50 points to the user for registering
    await prisma.user.update({
      where: { id: req.user.id },
      data: { points: { increment: 50 } }
    });

    res.status(201).json(reg);
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: 'Server error registering for event' });
  }
};

export const getEventRegistrations = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        club: { select: { clubAdminId: true } },
        registrations: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { name: true, email: true, department: true, year: true }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({
      registrations: event.registrations,
      canDownload: event.club.clubAdminId === req.user.id
    });
  } catch (error) {
    console.error('Fetch event registrations error:', error);
    res.status(500).json({ error: 'Server error fetching event registrations' });
  }
};

export const exportEventRegistrations = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        club: { select: { name: true, clubAdminId: true } },
        registrations: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { name: true, email: true, department: true, year: true }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.club.clubAdminId !== req.user.id) {
      return res.status(403).json({ error: 'Only this club’s assigned admin can download registrations.' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');
    worksheet.mergeCells('A1:I1');
    worksheet.getCell('A1').value = event.title;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A2').value = 'Club';
    worksheet.getCell('B2').value = event.club.name;
    worksheet.getCell('A3').value = 'Event date';
    worksheet.getCell('B3').value = event.date;
    worksheet.getCell('B3').numFmt = 'yyyy-mm-dd hh:mm';
    worksheet.addRow([]);
    worksheet.addRow([
      'Student name',
      'Email',
      'USN',
      'Department',
      'Year',
      'Motivation',
      'Registration status',
      'Attended',
      'Registered at'
    ]);

    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }
    };

    for (const registration of event.registrations) {
      worksheet.addRow([
        registration.studentName || registration.user.name,
        registration.user.email,
        registration.usn || '',
        registration.user.department || '',
        registration.user.year ?? '',
        registration.motivation || '',
        registration.status,
        registration.attended ? 'Yes' : 'No',
        registration.createdAt
      ]);
    }

    worksheet.columns = [
      { width: 24 },
      { width: 32 },
      { width: 18 },
      { width: 20 },
      { width: 10 },
      { width: 50 },
      { width: 22 },
      { width: 12 },
      { width: 22 }
    ];
    worksheet.getColumn(9).numFmt = 'yyyy-mm-dd hh:mm';
    worksheet.views = [{ state: 'frozen', ySplit: 5 }];
    worksheet.autoFilter = { from: 'A5', to: 'I5' };

    const file = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="event-${event.id}-registrations.xlsx"`);
    res.send(Buffer.from(file));
  } catch (error) {
    console.error('Export event registrations error:', error);
    res.status(500).json({ error: 'Server error exporting event registrations' });
  }
};

// Get user ticket
export const getTicket = async (req, res) => {
  try {
    const reg = await prisma.eventRegistration.findFirst({
      where: { userId: req.user.id, eventId: req.params.id }
    });
    
    if (reg && reg.qrData) {
      return res.status(200).json({ qrData: reg.qrData });
    }
    return res.status(404).json({ error: 'Ticket not found' });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching ticket' });
  }
};

// AI feature: Generate promotional announcement
export const generateAnnouncement = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: { club: true } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const announcement = `🚀 *Get ready for ${event.title}!* 🚀\n\n${event.club.name} is thrilled to announce our upcoming event on ${new Date(event.date).toLocaleDateString()}.\n\n🎯 What to expect:\n${event.description}\n\n📍 Venue: ${event.venue}\n🔥 Only ${event.capacity} seats available!\n\nDon't miss out on this amazing opportunity to learn and connect. Register now on SmartCampus! \n\n#${event.club.name.replace(/\s+/g, '')} #${event.title.replace(/\s+/g, '')} #SmartCampus #TechLife`;
    
    res.json({ announcement });
  } catch (error) {
    res.status(500).json({ error: 'Server error generating announcement' });
  }
};
