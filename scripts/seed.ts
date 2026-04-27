import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data (optional but recommended for clean seeding)
  await prisma.medicalRecord.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.user.deleteMany()
  await prisma.clinicSettings.deleteMany()

  console.log('Existing data cleared.')

  // Clinic settings
  await prisma.clinicSettings.create({
    data: {
      clinicName: 'Kalinga-ni Clinic',
      clinicEmail: 'contact@kalinga-ni.com',
      clinicPhone: '+63-2-1234-5678',
      clinicAddress: '123 Healthcare Street',
      clinicCity: 'Boac, Marinduque',
      clinicZipCode: '4900',
      operatingHours: '8:00 AM - 5:00 PM, Monday to Friday',
    },
  })

  console.log('Clinic settings created.')

  // Hash admin password
  const adminPassword = await bcrypt.hash('admin123', 10)

  // Admin user only
  await prisma.user.create({
    data: {
      email: 'admin@kalinga-ni.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+63-9000000000',
    },
  })

  console.log('✅ Seed completed successfully!')
  console.log('\nTest Credentials:')
  console.log('Admin: admin@kalinga-ni.com / admin123')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })