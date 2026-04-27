import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (!session?.user || !['ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (role === 'ADMIN') {
      const patients = await prisma.patient.findMany({
        include: {
          user: true,
          _count: { select: { appointments: true, medicalRecords: true } },
        },
        orderBy: { user: { firstName: 'asc' } },
      })
      return NextResponse.json(patients)
    }

    // STAFF — only their own patients
    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id as string },
    })
    if (!staff) return NextResponse.json([])

    const staffApts = await prisma.appointment.findMany({
      where: { staffId: staff.id },
      include: {
        patient: {
          include: {
            user: true,
            _count: { select: { appointments: true, medicalRecords: true } },
          },
        },
      },
    })

    const seen = new Set()
    const patients = staffApts
      .map(a => a.patient)
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
      .sort((a, b) => a.user.firstName.localeCompare(b.user.firstName))

    return NextResponse.json(patients)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}