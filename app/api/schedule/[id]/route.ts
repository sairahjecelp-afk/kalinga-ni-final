import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sendSlotCancelledEmail } from '@/lib/notifications'

// PATCH /api/schedule/[id] — only toggle isAvailable, no edits to times
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const slot = await prisma.staffSchedule.findUnique({
      where: { id },
      include: { staff: true },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 })
    }

    if (
      session.user.role !== 'ADMIN' &&
      slot.staff.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    // Only isAvailable can be toggled — time/duration edits are not allowed
    const { isAvailable } = body

    const updated = await prisma.staffSchedule.update({
      where: { id },
      data: {
        ...(isAvailable !== undefined && { isAvailable }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating schedule slot:', error)
    return NextResponse.json({ error: 'Failed to update schedule slot' }, { status: 500 })
  }
}

// DELETE /api/schedule/[id]
// Auto-cancels all SCHEDULED appointments in this slot and notifies patients
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const slot = await prisma.staffSchedule.findUnique({
      where: { id },
      include: {
        staff: {
          include: { user: true },
        },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 })
    }

    if (
      session.user.role !== 'ADMIN' &&
      slot.staff.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // slot.startTime / slot.endTime are "HH:mm" strings in PHILIPPINE TIME (PHT = UTC+8),
    // because that's what the staff typed in their browser and we stored verbatim.
    //
    // slot.date is UTC midnight of the PHT calendar date (e.g. 2026-04-14T00:00:00Z
    // represents April 14 PHT).
    //
    // Appointments are stored by the booking flow in UTC.
    // A patient booking "09:00 PHT" lands in the DB as "01:00 UTC" (PHT − 8h).
    //
    // So to find matching appointments we must convert the HH:mm PHT times to UTC
    // by subtracting the PHT offset (8 hours = 480 minutes).

    const PHT_OFFSET_MS = 8 * 60 * 60 * 1000 // 8 hours in ms

    const [startHour, startMin] = slot.startTime.split(':').map(Number)
    const [endHour, endMin]     = slot.endTime.split(':').map(Number)

    // Build the PHT wall-clock instant on the slot's date, then convert to UTC
    const slotDateMs = slot.date.getTime() // already UTC midnight of the PHT date

    const slotStart = new Date(slotDateMs + (startHour * 60 + startMin) * 60_000 - PHT_OFFSET_MS)
    const slotEnd   = new Date(slotDateMs + (endHour   * 60 + endMin)   * 60_000 - PHT_OFFSET_MS)

    // Find all SCHEDULED appointments that fall within this slot window (UTC)
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        staffId: slot.staffId,
        status: 'SCHEDULED',
        appointmentDate: {
          gte: slotStart,
          lt:  slotEnd,
        },
      },
      include: {
        patient: {
          include: { user: true },
        },
      },
    })

    const staffName = `${slot.staff.user.firstName} ${slot.staff.user.lastName}`
    const cancellationReason = 'Staff removed their availability for this time slot'

    // Cancel each appointment, create a notification, and send an email
    await Promise.all(
      bookedAppointments.map(async (appointment) => {
        const patientUser = appointment.patient.user

        // 1. Mark appointment as CANCELLED with a reason in notes
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'CANCELLED',
            notes: appointment.notes
              ? `${appointment.notes}\n\nCancelled: ${cancellationReason}`
              : `Cancelled: ${cancellationReason}`,
          },
        })

        // 2. Create an in-app notification bell entry for the patient
        await prisma.notificationLog.create({
          data: {
            userId:  patientUser.id,
            channel: 'APP',
            subject: 'Appointment Cancelled',
            body: `Your appointment with ${staffName} on ${appointment.appointmentDate.toLocaleDateString(
              'en-PH',
              { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }
            )} at ${appointment.appointmentDate.toLocaleTimeString('en-PH', {
              timeZone: 'Asia/Manila',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })} has been cancelled. Reason: ${cancellationReason}`,
            status: 'SENT',
            sentAt: new Date(),
          },
        })

        // 3. Send cancellation email (non-blocking — log failure but don't abort)
        try {
          await sendSlotCancelledEmail({
            toEmail:         patientUser.email,
            patientName:     `${patientUser.firstName} ${patientUser.lastName}`,
            staffName,
            appointmentDate: appointment.appointmentDate,
            reason:          appointment.reason,
          })

          await prisma.notificationLog.create({
            data: {
              userId:  patientUser.id,
              channel: 'EMAIL',
              subject: 'Your appointment has been cancelled',
              body:    `Appointment on ${appointment.appointmentDate.toISOString()} with ${staffName} cancelled.`,
              status:  'SENT',
              sentAt:  new Date(),
            },
          })
        } catch (emailErr) {
          console.error(
            `Failed to send cancellation email to ${patientUser.email}:`,
            emailErr
          )
          await prisma.notificationLog.create({
            data: {
              userId:  patientUser.id,
              channel: 'EMAIL',
              subject: 'Your appointment has been cancelled',
              body:    `Appointment on ${appointment.appointmentDate.toISOString()} with ${staffName} cancelled.`,
              status:  'FAILED',
            },
          })
        }
      })
    )

    // Delete the schedule slot after all cancellations are processed
    await prisma.staffSchedule.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      cancelledCount: bookedAppointments.length,
    })
  } catch (error) {
    console.error('Error deleting schedule slot:', error)
    return NextResponse.json({ error: 'Failed to delete schedule slot' }, { status: 500 })
  }
}