import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding auditoriums...');
  
  const auditoriums = [
    {
      name: 'North Auditorium',
      capacity: 100,
      amenities: 'Projector, Sound System, WiFi, Podium',
      images: '/north-auditorium.jpeg'
    },
    {
      name: 'Azeez Sait Auditorium',
      capacity: 70,
      amenities: 'Projector, Sound System, WiFi, Podium, AC',
      images: '/azeez-sait-auditorium.jpeg'
    },
    {
      name: 'Sir M.V. Auditorium',
      capacity: 70,
      amenities: 'Projector, Sound System, WiFi, Podium, AC',
      images: '/sir-mv-auditorium.jpeg'
    }
  ];

  await prisma.$transaction(async (transaction) => {
    for (const auditorium of auditoriums) {
      await transaction.auditorium.upsert({
        where: { name: auditorium.name },
        update: auditorium,
        create: auditorium
      });
    }

    await transaction.auditorium.deleteMany({
      where: { name: { notIn: auditoriums.map(({ name }) => name) } }
    });
  });
  
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
