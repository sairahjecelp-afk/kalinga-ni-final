import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, notes } = body

    const { id: appointmentId } = await params

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Get the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        staff: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // ✅ FIX: appointment.staffId is Staff.id, not User.id
    // Compare against appointment.staff.userId instead
    const isAuthorized =
      session.user.role === 'ADMIN' ||
      session.user.id === appointment.patient.userId ||
      (session.user.role === 'STAFF' && session.user.id === appointment.staff.userId)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not authorized to update this appointment' },
        { status: 403 }
      )
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        ...(notes && { notes }),
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        staff: {
          include: {
            user: true,
          },
        },
      },
    })

    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}
