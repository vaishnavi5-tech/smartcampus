import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const { SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;
  if (![SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD].every(value => value?.trim())) {
    throw new Error('Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD before bootstrapping.');
  }
  if (SUPER_ADMIN_PASSWORD.length < 12) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
  if (existingAdmin) {
    throw new Error('A Super Admin already exists. This bootstrap command only creates the first one.');
  }

  const password = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const admin = await prisma.user.create({
    data: {
      name: SUPER_ADMIN_NAME.trim(),
      email: SUPER_ADMIN_EMAIL.trim(),
      password,
      role: 'SUPER_ADMIN'
    },
    select: { name: true, email: true }
  });
  console.log(`Created initial Super Admin account for ${admin.name} (${admin.email}).`);
}

main()
  .catch(error => {
    console.error('Super Admin bootstrap failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
