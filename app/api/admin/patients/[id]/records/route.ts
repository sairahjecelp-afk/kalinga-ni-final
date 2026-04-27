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

    // Staff can only access records for patients they have had appointments with
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
          { error: 'You do not have access to this patient\'s records' },
          { status: 403 }
        )
      }
    }

    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      include: {
        appointment: {
          include: { staff: { include: { user: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching patient records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}