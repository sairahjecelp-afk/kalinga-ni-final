import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentCancelledEmail } from '@/lib/notifications'

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

    // If the status was changed to CANCELLED, send notifications
    if (status === 'CANCELLED' && appointment.status !== 'CANCELLED') {
      const patientUser = updatedAppointment.patient.user;
      const staffUser = updatedAppointment.staff.user;
      const staffName = `Dr. ${staffUser.firstName} ${staffUser.lastName}`;
      const patientName = `${patientUser.firstName} ${patientUser.lastName}`;

      // In-app notification
      try {
        await prisma.notificationLog.create({
          data: {
            userId: patientUser.id,
            channel: 'APP',
            subject: 'Appointment Cancelled',
            body: `Your appointment with ${staffName} on ${updatedAppointment.appointmentDate.toLocaleDateString(
              'en-PH',
              { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }
            )} at ${updatedAppointment.appointmentDate.toLocaleTimeString('en-PH', {
              timeZone: 'Asia/Manila',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })} has been cancelled.`,
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      } catch (notifErr) {
        console.error('Failed to create in-app cancellation notification:', notifErr)
      }

      // Email notification
      try {
        await sendAppointmentCancelledEmail({
          toEmail: patientUser.email,
          patientName,
          staffName,
          appointmentDate: updatedAppointment.appointmentDate,
          reason: updatedAppointment.reason,
        })

        await prisma.notificationLog.create({
          data: {
            userId: patientUser.id,
            channel: 'EMAIL',
            subject: 'Appointment Cancelled',
            body: `Appointment on ${updatedAppointment.appointmentDate.toISOString()} with ${staffName} cancelled.`,
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      } catch (emailErr) {
        console.error('Failed to send cancellation email:', emailErr)
        await prisma.notificationLog.create({
          data: {
            userId: patientUser.id,
            channel: 'EMAIL',
            subject: 'Appointment Cancelled',
            body: `Appointment on ${updatedAppointment.appointmentDate.toISOString()} with ${staffName} cancelled.`,
            status: 'FAILED',
          },
        })
      }
    }

    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}
