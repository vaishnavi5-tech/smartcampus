import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get all clubs
export const getClubs = async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      include: { 
        facultyCoordinator: { select: { id: true, name: true } },
        facultyAssignments: {
          include: { faculty: { select: { id: true, name: true } } }
        },
        clubAdmin: { select: { id: true, name: true } },
        _count: { select: { members: true } } 
      }
    });
    res.status(200).json(clubs);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching clubs' });
  }
};

export const getClubsAvailableForAdmin = async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      where: { clubAdminId: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(clubs);
  } catch (error) {
    console.error('Fetch clubs available for admin error:', error);
    res.status(500).json({ error: 'Server error fetching available clubs' });
  }
};

export const getManagedClub = async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { clubAdminId: req.user.id },
      select: { id: true, name: true }
    });
    if (!club) {
      return res.status(404).json({ error: 'No club is assigned to this club admin.' });
    }
    res.json(club);
  } catch (error) {
    console.error('Fetch managed club error:', error);
    res.status(500).json({ error: 'Server error fetching assigned club' });
  }
};

export const getCoordinatedClubs = async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      where: {
        OR: [
          { facultyCoordinatorId: req.user.id },
          { facultyAssignments: { some: { facultyId: req.user.id } } }
        ]
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    res.json(clubs);
  } catch (error) {
    console.error('Fetch coordinated clubs error:', error);
    res.status(500).json({ error: 'Server error fetching coordinated clubs' });
  }
};

// Get single club
export const getClubById = async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      include: { 
        facultyCoordinator: { select: { name: true, email: true } },
        facultyAssignments: {
          include: { faculty: { select: { id: true, name: true, email: true, department: true } } }
        },
        clubAdmin: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, role: true, avatar: true } } } },
        events: true,
        openings: true
      }
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    res.status(200).json(club);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching club' });
  }
};

// Create a new club (Super Admin / Faculty)
export const createClub = async (req, res) => {
  try {
    const { name, description, logo, banner, facultyCoordinatorId } = req.body;
    if (typeof name !== 'string' || !name.trim() || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Club name and description are required.' });
    }
    const newClub = await prisma.club.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        logo,
        banner,
        facultyCoordinatorId: req.user.role === 'FACULTY' ? req.user.id : facultyCoordinatorId,
        ...(req.user.role === 'FACULTY'
          ? { facultyAssignments: { create: { facultyId: req.user.id } } }
          : {})
      }
    });
    res.status(201).json(newClub);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A club with this name already exists.' });
    }
    console.error('Create club error:', error);
    res.status(500).json({ error: 'Server error creating club' });
  }
};

export const assignClubFaculty = async (req, res) => {
  try {
    const { facultyId } = req.body;
    if (typeof facultyId !== 'string' || !facultyId.trim()) {
      return res.status(400).json({ error: 'Select a faculty member to assign.' });
    }

    const [club, faculty] = await Promise.all([
      prisma.club.findUnique({ where: { id: req.params.id }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: facultyId }, select: { id: true, role: true } })
    ]);
    if (!club) return res.status(404).json({ error: 'Club not found.' });
    if (!faculty || faculty.role !== 'FACULTY') {
      return res.status(400).json({ error: 'Only an existing Club Faculty account can be assigned.' });
    }

    const updatedClub = await prisma.$transaction(async transaction => {
      await transaction.facultyClubAssignment.upsert({
        where: { facultyId_clubId: { facultyId: faculty.id, clubId: club.id } },
        create: { facultyId: faculty.id, clubId: club.id },
        update: {}
      });
      return transaction.club.update({
        where: { id: club.id },
        data: { facultyCoordinatorId: faculty.id },
        include: {
          facultyCoordinator: { select: { id: true, name: true, email: true } },
          facultyAssignments: {
            include: { faculty: { select: { id: true, name: true, email: true } } }
          }
        }
      });
    });
    res.status(200).json(updatedClub);
  } catch (error) {
    console.error('Assign club faculty error:', error);
    res.status(500).json({ error: 'Server error assigning club faculty.' });
  }
};

export const removeClubFaculty = async (req, res) => {
  try {
    const { id: clubId, facultyId } = req.params;
    const result = await prisma.$transaction(async transaction => {
      const club = await transaction.club.findUnique({
        where: { id: clubId },
        select: { id: true, facultyCoordinatorId: true }
      });
      if (!club) {
        const error = new Error('Club not found.');
        error.code = 'CLUB_NOT_FOUND';
        throw error;
      }

      await transaction.facultyClubAssignment.deleteMany({ where: { clubId, facultyId } });
      const nextFaculty = await transaction.facultyClubAssignment.findFirst({
        where: { clubId },
        orderBy: { createdAt: 'asc' },
        select: { facultyId: true }
      });
      const nextCoordinatorId = club.facultyCoordinatorId === facultyId
        ? nextFaculty?.facultyId || null
        : club.facultyCoordinatorId;
      return transaction.club.update({
        where: { id: clubId },
        data: { facultyCoordinatorId: nextCoordinatorId },
        include: {
          facultyCoordinator: { select: { id: true, name: true, email: true } },
          facultyAssignments: {
            include: { faculty: { select: { id: true, name: true, email: true } } }
          }
        }
      });
    });
    res.status(200).json(result);
  } catch (error) {
    if (error.code === 'CLUB_NOT_FOUND') return res.status(404).json({ error: error.message });
    console.error('Remove club faculty error:', error);
    res.status(500).json({ error: 'Server error removing club faculty.' });
  }
};

// Update club
export const updateClub = async (req, res) => {
  try {
    const { name, description, logo, banner } = req.body;
    const updatedClub = await prisma.club.update({
      where: { id: req.params.id },
      data: { name, description, logo, banner }
    });
    res.status(200).json(updatedClub);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating club' });
  }
};

// Join a club (creates pending request)
export const joinClub = async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      select: { clubAdminId: true }
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    const existing = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: req.user.id, clubId: req.params.id } }
    });
    if (existing) return res.status(400).json({ error: 'Already requested or joined' });

    const member = await prisma.clubMember.create({
      data: {
        userId: req.user.id,
        clubId: req.params.id,
        status: club.clubAdminId === req.user.id ? 'APPROVED' : 'PENDING',
        role: club.clubAdminId === req.user.id ? 'CLUB_ADMIN' : 'MEMBER'
      }
    });
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: 'Server error joining club' });
  }
};

// Get pending club requests (Admin/Faculty)
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await prisma.clubMember.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { name: true, email: true } },
        club: { select: { name: true } }
      }
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching requests' });
  }
};

// Approve club request
export const approveRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const updated = await prisma.clubMember.update({
      where: { id: req.params.requestId },
      data: { status }
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error approving request' });
  }
};
