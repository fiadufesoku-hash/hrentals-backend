import prisma from '../utils/prismaClient.js';
import bcrypt from 'bcryptjs';  

async function seed() {
  let company;

  const existingCompany = await prisma.company.findFirst({ where: { isOwnCompany: true } });
  if (!existingCompany) {
    company = await prisma.company.create({
      data: {
        name: "Ho Rentals",
        contact: "info@horentals.com",
        isOwnCompany: true,
        // i will later add logo url and momo account
      }
    });
    console.log('Default company created:', company);
  } else {
    company = existingCompany;
    console.log('Default company already exists:', company);
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash('adminpass123', 10);  
    const admin = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@horentals.com",
        password: hashed,
        role: "admin",
        phone: "024admin123",
        companyId: company.id  
      }
    });
    console.log('Admin user created:', admin);
  } else {
    console.log('Admin user already exists:', existingAdmin);
  }
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });