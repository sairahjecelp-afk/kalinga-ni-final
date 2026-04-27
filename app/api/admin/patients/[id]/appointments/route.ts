import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (!session?.user || !['ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Staff can only access appointments for patients they have seen
    if (role === 'STAFF') {
      const staff = await prisma.staff.findUnique({
        where: { userId: session.user.id as string },
      })
      if (!staff) {
        return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
      }

      const hasAppointment = await prisma.appointment.findFirst({
        where: { staffId: staff.id, patientId },
      })
      if (!hasAppointment) {
        return NextResponse.json(
          { error: 'You do not have access to this patient\'s appointments' },
          { status: 403 }
        )
      }

      // Staff see all appointments for this patient, not just their own —
      // this gives full context on the patient's history
      const appointments = await prisma.appointment.findMany({
        where: { patientId },
        include: {
          staff: { include: { user: true } },
          medicalRecord: true,
        },
        orderBy: { appointmentDate: 'desc' },
      })

      return NextResponse.json(appointments)
    }

    // Admin sees everything
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: {
        staff: { include: { user: true } },
        medicalRecord: true,
      },
      orderBy: { appointmentDate: 'desc' },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Error fetching patient appointments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}