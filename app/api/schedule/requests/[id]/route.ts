import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import {
  sendScheduleRequestApprovedEmail,
  sendScheduleRequestRejectedEmail,
} from '@/lib/notifications'

// PATCH /api/schedule/requests/[id]
// Body: { action: 'APPROVE' | 'REJECT' | 'CANCEL' }
//
// APPROVE (admin only) → creates StaffSchedule from the request, marks request APPROVED
// REJECT  (admin only) → marks request REJECTED, notifies staff in-app + email
// CANCEL  (staff only, PENDING requests only) → deletes the request
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
    const body = await request.json()
    const { action } = body

    if (!['APPROVE', 'REJECT', 'CANCEL'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be APPROVE, REJECT, or CANCEL' },
        { status: 400 }
      )
    }

    const scheduleRequest = await prisma.scheduleRequest.findUnique({
      where: { id },
      include: {
        staff: {
          include: { user: true },
        },
      },
    })

    if (!scheduleRequest) {
      return NextResponse.json({ error: 'Schedule request not found' }, { status: 404 })
    }

    if (scheduleRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot ${action.toLowerCase()} a request that is already ${scheduleRequest.status}` },
        { status: 409 }
      )
    }

    const staffName = `${scheduleRequest.staff.user.firstName} ${scheduleRequest.staff.user.lastName}`
    const staffEmail = scheduleRequest.staff.user.email

    const formatTime12 = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
    }

    const dateLabel = scheduleRequest.date.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    // ── CANCEL (staff cancels their own PENDING request) ──────────────────────
    if (action === 'CANCEL') {
      if (session.user.role !== 'STAFF') {
        return NextResponse.json({ error: 'Only staff can cancel their own requests' }, { status: 403 })
      }

      // Verify the request belongs to this staff member
      const staff = await prisma.staff.findUnique({
        where: { userId: session.user.id as string },
      })
      if (!staff || staff.id !== scheduleRequest.staffId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      await prisma.scheduleRequest.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ── APPROVE / REJECT (admin only) ─────────────────────────────────────────
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can approve or reject requests' }, { status: 403 })
    }

    if (action === 'APPROVE') {
      const { date, startTime, endTime, slotDuration, staffId } = scheduleRequest

      // Parse the date (UTC midnight of PHT calendar date)
      const [year, month, day] = [
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      ]
      const slotDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
      const nextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0))

      // Guard: check for overlap with existing StaffSchedule slots
      const existingSlots = await prisma.staffSchedule.findMany({
        where: {
          staffId,
          date: { gte: slotDate, lt: nextDay },
        },
      })

      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      const newStartMins = startH * 60 + startM
      const newEndMins = endH * 60 + endM

      const hasOverlap = existingSlots.some((slot) => {
        const [sH, sM] = slot.startTime.split(':').map(Number)
        const [eH, eM] = slot.endTime.split(':').map(Number)
        return newStartMins < eH * 60 + eM && newEndMins > sH * 60 + sM
      })

      if (hasOverlap) {
        return NextResponse.json(
          { error: 'This request overlaps with an existing approved schedule slot for this staff member' },
          { status: 409 }
        )
      }

      // Create the actual StaffSchedule
      await prisma.staffSchedule.create({
        data: {
          staffId,
          date: slotDate,
          startTime,
          endTime,
          slotDuration,
          isAvailable: true,
        },
      })

      // Mark request as APPROVED
      await prisma.scheduleRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      })

      // Notify staff in-app
      await prisma.notificationLog.create({
        data: {
          userId: scheduleRequest.staff.userId,
          channel: 'APP',
          subject: 'Schedule Request Approved',
          body: `Your availability request for ${dateLabel} from ${formatTime12(startTime)} to ${formatTime12(endTime)} has been approved. Patients can now book appointments during this time.`,
          status: 'SENT',
          sentAt: new Date(),
        },
      })

      // Notify staff via email (non-blocking)
      try {
        await sendScheduleRequestApprovedEmail({
          toEmail: staffEmail,
          staffName,
          date: scheduleRequest.date,
          startTime,
          endTime,
        })

        await prisma.notificationLog.create({
          data: {
            userId: scheduleRequest.staff.userId,
            channel: 'EMAIL',
            subject: 'Schedule Request Approved',
            body: `Availability request for ${dateLabel} from ${formatTime12(startTime)} to ${formatTime12(endTime)} approved.`,
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      } catch (emailErr) {
        console.error('Failed to send approval email:', emailErr)
        await prisma.notificationLog.create({
          data: {
            userId: scheduleRequest.staff.userId,
            channel: 'EMAIL',
            subject: 'Schedule Request Approved',
            body: `Availability request for ${dateLabel} from ${formatTime12(startTime)} to ${formatTime12(endTime)} approved.`,
            status: 'FAILED',
          },
        })
      }

      return NextResponse.json({ success: true, action: 'APPROVED' })
    }

    // action === 'REJECT'
    await prisma.scheduleRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    // Notify staff in-app
    await prisma.notificationLog.create({
      data: {
        userId: scheduleRequest.staff.userId,
        channel: 'APP',
        subject: 'Schedule Request Rejected',
        body: `Your availability request for ${dateLabel} from ${formatTime12(scheduleRequest.startTime)} to ${formatTime12(scheduleRequest.endTime)} was not approved. Please contact the admin for more information.`,
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    // Notify staff via email (non-blocking)
    try {
      await sendScheduleRequestRejectedEmail({
        toEmail: staffEmail,
        staffName,
        date: scheduleRequest.date,
        startTime: scheduleRequest.startTime,
        endTime: scheduleRequest.endTime,
      })

      await prisma.notificationLog.create({
        data: {
          userId: scheduleRequest.staff.userId,
          channel: 'EMAIL',
          subject: 'Schedule Request Rejected',
          body: `Availability request for ${dateLabel} from ${formatTime12(scheduleRequest.startTime)} to ${formatTime12(scheduleRequest.endTime)} rejected.`,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr)
      await prisma.notificationLog.create({
        data: {
          userId: scheduleRequest.staff.userId,
          channel: 'EMAIL',
          subject: 'Schedule Request Rejected',
          body: `Availability request for ${dateLabel} from ${formatTime12(scheduleRequest.startTime)} to ${formatTime12(scheduleRequest.endTime)} rejected.`,
          status: 'FAILED',
        },
      })
    }

    return NextResponse.json({ success: true, action: 'REJECTED' })
  } catch (error) {
    console.error('Error processing schedule request:', error)
    return NextResponse.json({ error: 'Failed to process schedule request' }, { status: 500 })
  }
}