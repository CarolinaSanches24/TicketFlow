import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const analystPassword = await bcrypt.hash('analyst123', 10);

  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {},
    create: {
      email: 'admin@system.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@system.com' },
    update: {},
    create: {
      email: 'analyst@system.com',
      password: analystPassword,
      name: 'Analyst User',
      role: 'ANALYST',
    },
  });

  console.log('Users created:', { admin: admin.email, analyst: analyst.email });

  // 2. Create Sample Ticket
  await prisma.ticket.create({
    data: {
      title: 'Fix login bug',
      description: 'Users cannot login with special characters',
      status: 'OPEN',
      analystId: analyst.id,
    }
  });

  // 3. Create Sample Improvement
  await prisma.improvement.create({
    data: {
      title: 'Performance optimization',
      description: 'Optimize dashboard loading time',
      status: 'OPEN',
      analystId: analyst.id,
    }
  });

  console.log('Sample data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
