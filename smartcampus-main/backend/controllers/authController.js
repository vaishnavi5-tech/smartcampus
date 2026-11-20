import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Register a new user
export const register = async (req, res) => {
  try {
    const { name, email, password, clubId } = req.body;
    const role = req.body.role || 'STUDENT';
    if (!['STUDENT', 'CLUB_ADMIN', 'FACULTY'].includes(role)) {
      return res.status(400).json({ error: 'Please choose a valid account type.' });
    }
    if (![name, email, password].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (role === 'CLUB_ADMIN' && (typeof clubId !== 'string' || !clubId.trim())) {
      return res.status(400).json({ error: 'Please select a club for this club admin account.' });
    }
    if (role === 'FACULTY' && clubId && (typeof clubId !== 'string' || !clubId.trim())) {
      return res.status(400).json({ error: 'Choose a valid club or leave the faculty club selection empty.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.$transaction(async (transaction) => {
      if (role === 'CLUB_ADMIN') {
        const club = await transaction.club.findUnique({
          where: { id: clubId },
          select: { id: true, clubAdminId: true }
        });
        if (!club) {
          const error = new Error('Selected club was not found.');
          error.code = 'CLUB_NOT_FOUND';
          throw error;
        }
        if (club.clubAdminId) {
          const error = new Error('This club already has a club admin. Please choose another club.');
          error.code = 'CLUB_ADMIN_ASSIGNED';
          throw error;
        }

        const user = await transaction.user.create({
          data: { name: name.trim(), email: email.trim(), password: hashedPassword, role }
        });
        const assignment = await transaction.club.updateMany({
          where: { id: club.id, clubAdminId: null },
          data: { clubAdminId: user.id }
        });
        if (assignment.count !== 1) {
          const error = new Error('This club already has a club admin. Please choose another club.');
          error.code = 'CLUB_ADMIN_ASSIGNED';
          throw error;
        }
        await transaction.clubMember.upsert({
          where: { userId_clubId: { userId: user.id, clubId: club.id } },
          create: { userId: user.id, clubId: club.id, role: 'CLUB_ADMIN', status: 'APPROVED' },
          update: { role: 'CLUB_ADMIN', status: 'APPROVED' }
        });
        return user;
      }

      const user = await transaction.user.create({
        data: { name: name.trim(), email: email.trim(), password: hashedPassword, role }
      });
      if (role === 'FACULTY' && clubId) {
        const club = await transaction.club.findUnique({ where: { id: clubId }, select: { id: true } });
        if (!club) {
          const error = new Error('Selected club was not found.');
          error.code = 'CLUB_NOT_FOUND';
          throw error;
        }
        await transaction.facultyClubAssignment.create({
          data: { facultyId: user.id, clubId: club.id }
        });
        await transaction.club.update({
          where: { id: club.id },
          data: { facultyCoordinatorId: user.id }
        });
      }
      return user;
    });

    const secret = process.env.JWT_SECRET || 'smartcampus_nie_secret_key_2026';
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });

  } catch (error) {
    if (error.code === 'CLUB_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === 'CLUB_ADMIN_ASSIGNED' || error.code === 'P2002') {
      return res.status(409).json({
        error: error.code === 'CLUB_ADMIN_ASSIGNED'
          ? error.message
          : 'A user already exists with this email.'
      });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const createClubAdmin = async (req, res) => {
  try {
    const { name, email, password, clubId } = req.body;
    if (![name, email, password, clubId].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Name, email, password, and club are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existingUser) {
      return res.status(409).json({ error: 'A user already exists with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await prisma.$transaction(async (transaction) => {
      const club = await transaction.club.findUnique({
        where: { id: clubId },
        select: { id: true, clubAdminId: true }
      });
      if (!club) {
        const error = new Error('Club not found.');
        error.code = 'CLUB_NOT_FOUND';
        throw error;
      }
      if (club.clubAdminId) {
        const error = new Error('This club already has a club admin.');
        error.code = 'CLUB_ADMIN_ASSIGNED';
        throw error;
      }

      const user = await transaction.user.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          password: hashedPassword,
          role: 'CLUB_ADMIN'
        }
      });
      const assignment = await transaction.club.updateMany({
        where: { id: club.id, clubAdminId: null },
        data: { clubAdminId: user.id }
      });
      if (assignment.count !== 1) {
        const error = new Error('This club already has a club admin.');
        error.code = 'CLUB_ADMIN_ASSIGNED';
        throw error;
      }
      await transaction.clubMember.upsert({
        where: { userId_clubId: { userId: user.id, clubId: club.id } },
        create: { userId: user.id, clubId: club.id, role: 'CLUB_ADMIN', status: 'APPROVED' },
        update: { role: 'CLUB_ADMIN', status: 'APPROVED' }
      });
      return user;
    });

    res.status(201).json({
      message: 'Club admin created successfully.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    if (error.code === 'CLUB_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === 'CLUB_ADMIN_ASSIGNED' || error.code === 'P2002') {
      return res.status(409).json({ error: error.message || 'This club or email is already assigned.' });
    }
    console.error('Create club admin error:', error);
    res.status(500).json({ error: 'Server error creating club admin' });
  }
};

export const createHead = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    if (![name, email, password].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const head = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        role: 'HEAD',
        department: typeof department === 'string' && department.trim() ? department.trim() : null
      },
      select: { id: true, name: true, email: true, role: true, department: true }
    });
    res.status(201).json({ message: 'Head account created successfully.', user: head });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user already exists with this email.' });
    }
    console.error('Create Head error:', error);
    res.status(500).json({ error: 'Server error creating Head account.' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const secret = process.env.JWT_SECRET || 'smartcampus_nie_secret_key_2026';
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Get all users (Super Admin / Management)
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        year: true,
        points: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
};
