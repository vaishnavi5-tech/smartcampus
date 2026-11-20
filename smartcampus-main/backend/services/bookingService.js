import PDFDocument from 'pdfkit';

function timeInMinutes(value) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2] || 0);
}

function parseTimeSlot(slot) {
  const parts = String(slot || '').split(/\s+-\s+/);
  if (parts.length !== 2) return null;
  const start = timeInMinutes(parts[0]);
  const end = timeInMinutes(parts[1]);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

export function isValidTimeSlot(slot) {
  return Boolean(parseTimeSlot(slot));
}

export function timeSlotsOverlap(firstSlot, secondSlot) {
  const first = parseTimeSlot(firstSlot);
  const second = parseTimeSlot(secondSlot);
  if (!first || !second) {
    return String(firstSlot || '').trim().toLowerCase() === String(secondSlot || '').trim().toLowerCase();
  }
  return first.start < second.end && second.start < first.end;
}

function formatCampusDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(new Date(value));
}

export function buildApprovalLetterContext(booking, approvedAt = new Date()) {
  const facultyNames = [
    ...(booking.club?.facultyAssignments || []).map(assignment => assignment.faculty?.name),
    booking.club?.facultyCoordinator?.name
  ].filter((name, index, names) => name && names.indexOf(name) === index);

  return {
    clubName: booking.club?.name || 'Club not specified',
    clubAdminName: booking.club?.clubAdmin?.name || 'Club admin not assigned',
    facultyNames,
    requesterName: booking.user?.name || 'Booking requester',
    requesterDepartment: booking.user?.department || '',
    eventDescription: booking.reason,
    auditoriumName: booking.auditorium?.name || 'Auditorium',
    eventDate: formatCampusDate(booking.date),
    timeSlot: booking.timeSlot,
    letterDate: formatCampusDate(approvedAt),
    approvedAt: new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    }).format(approvedAt),
    headName: booking.approvedBy?.name || 'Head',
    headDepartment: booking.approvedBy?.department || ''
  };
}

export function createApprovalLetterPdf(context) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
    const chunks = [];
    const drawPageBorder = () => {
      document.lineWidth(1).strokeColor('#1e293b').rect(56, 42, 483, 758).stroke();
    };
    document.on('data', chunk => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.on('pageAdded', drawPageBorder);

    const left = 56;
    const width = 483;
    drawPageBorder();
    document.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a')
      .text(context.clubName, left + 24, 66, { width: width - 48, align: 'center' });
    document.font('Helvetica').fontSize(10).fillColor('#334155')
      .text('THE NATIONAL INSTITUTE OF ENGINEERING', left + 24, 93, { width: width - 48, align: 'center' });
    document.moveTo(left + 24, 118).lineTo(left + width - 24, 118).strokeColor('#94a3b8').stroke();

    document.font('Helvetica').fontSize(10).fillColor('#0f172a')
      .text(`Date: ${context.letterDate}`, left + width - 190, 132, { width: 166, align: 'right' });
    document.font('Helvetica-Bold').text('To,', left + 24, 160);
    document.font('Helvetica').text('The Principal', left + 24, 176);
    document.text('The National Institute of Engineering', left + 24, 190);
    document.font('Helvetica-Bold').text('Through,', left + 24, 220);
    document.font('Helvetica').text(
      context.headDepartment ? `Head of ${context.headDepartment}` : 'Head of Department',
      left + 24,
      236
    );
    if (context.requesterDepartment) {
      document.text(context.requesterDepartment, left + 24, 250);
    }

    const senderY = context.requesterDepartment ? 278 : 264;
    document.font('Helvetica-Bold').text('From,', left + 24, senderY);
    document.font('Helvetica').text(`${context.clubAdminName}, Club Admin`, left + 24, senderY + 16);
    document.text(
      `Club Faculty: ${context.facultyNames.length ? context.facultyNames.join(', ') : 'Not assigned'}`,
      left + 24,
      senderY + 31,
      { width: width - 48 }
    );

    const subjectY = senderY + 68;
    document.font('Helvetica-Bold').fontSize(11).text(
      `Subject: Permission to conduct ${context.eventDescription} on ${context.eventDate} at ${context.auditoriumName}`,
      left + 24,
      subjectY,
      { width: width - 48 }
    );
    const bodyY = document.y + 22;
    document.font('Helvetica').fontSize(10).fillColor('#0f172a')
      .text('Respected Madam/Sir,', left + 24, bodyY);
    document.moveDown(0.8);
    document.text(
      `We request permission for ${context.clubName} to conduct the event described below. ` +
      'The venue and schedule are subject to the approved auditorium booking.',
      left + 24,
      document.y,
      { width: width - 48, lineGap: 4 }
    );
    document.moveDown(1);
    document.font('Helvetica-Bold').text('Event details', left + 24, document.y);
    document.font('Helvetica').text(`Club: ${context.clubName}`, left + 24, document.y + 6);
    document.text(`Requested by: ${context.requesterName}`, left + 24, document.y + 4);
    document.text(`Event / purpose: ${context.eventDescription}`, left + 24, document.y + 4, { width: width - 48 });
    document.text(`Venue: ${context.auditoriumName}`, left + 24, document.y + 4);
    document.text(`Date: ${context.eventDate}`, left + 24, document.y + 4);
    document.text(`Time: ${context.timeSlot}`, left + 24, document.y + 4);

    document.moveDown(2);
    document.text(
      'We kindly request your approval to conduct this event. Thank you for your time and consideration.',
      left + 24,
      document.y,
      { width: width - 48, lineGap: 4 }
    );
    document.moveDown(2);
    document.text('Yours sincerely,', left + 24, document.y);
    document.moveDown(1);
    document.font('Helvetica-Bold').text(context.clubAdminName, left + 24, document.y);
    document.font('Helvetica').text('Club Admin', left + 24, document.y);
    document.moveDown(0.5);
    document.font('Helvetica-Bold').text(
      context.facultyNames.length ? context.facultyNames.join(', ') : 'Club Faculty not assigned',
      left + 24,
      document.y,
      { width: width - 48 }
    );
    document.font('Helvetica').text('Club Faculty', left + 24, document.y);

    let approvalY = document.y + 30;
    if (approvalY + 80 > 780) {
      document.addPage();
      approvalY = 76;
    }
    document.roundedRect(left + 24, approvalY, width - 48, 80, 8)
      .fillAndStroke('#f1f5f9', '#64748b');
    document.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11)
      .text(`APPROVED BY ${context.headName}`, left + 40, approvalY + 16, { width: width - 80 });
    document.font('Helvetica').fontSize(9)
      .text(`Head${context.headDepartment ? `, ${context.headDepartment}` : ''}`, left + 40, approvalY + 35)
      .text(`Approval recorded: ${context.approvedAt}`, left + 40, approvalY + 51);

    document.end();
  });
}
