import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/schedule/slots?staffId=xxx&date=yyyy-mm-dd
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const dateStr = searchParams.get('date')

    if (!staffId || !dateStr) {
      return NextResponse.json(
        { error: 'staffId and date are required' },
        { status: 400 }
      )
    }

    // Parse date string using UTC to avoid timezone shift
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0))

    // Get all schedule slots for this staff on this date
    const scheduleSlots = await prisma.staffSchedule.findMany({
      where: {
        staffId,
        isAvailable: true,
        date: { gte: date, lt: nextDay },
      },
      orderBy: { startTime: 'asc' },
    })

    if (scheduleSlots.length === 0) {
      return NextResponse.json([])
    }

    // Get all already-booked appointments for this staff on this date
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        status: 'SCHEDULED',
        appointmentDate: { gte: date, lt: nextDay },
      },
      select: { appointmentDate: true, duration: true },
    })

    const allSlots: {
      time: string
      datetime: string
      available: boolean
      scheduleId: string
    }[] = []

    for (const schedule of scheduleSlots) {
      const [startH, startM] = schedule.startTime.split(':').map(Number)
      const [endH, endM] = schedule.endTime.split(':').map(Number)
      const windowStartMins = startH * 60 + startM
      const windowEndMins = endH * 60 + endM
      const slotDuration = schedule.slotDuration

      let cursor = windowStartMins

      while (cursor + slotDuration <= windowEndMins) {
        const slotStartH = Math.floor(cursor / 60)
        const slotStartM = cursor % 60
        const slotEndMins = cursor + slotDuration

        // FIX: Build the datetime by treating startTime as PHT (UTC+8).
        // Appending +08:00 ensures the ISO string is correctly converted to UTC
        // when stored — so "09:00 PHT" becomes "01:00 UTC", not "09:00 UTC".
        const timeStr = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}:00`
        const slotDatetime = new Date(`${dateStr}T${timeStr}+08:00`)

        // Check if this slot is already booked.
        // Since appointmentDate is stored in UTC, and our schedule strings are PHT,
        // we convert booked appointment times to PHT minutes for comparison.
        const isBooked = bookedAppointments.some((apt) => {
          const aptStart = new Date(apt.appointmentDate)
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60 * 1000)

          // Shift to PHT (UTC+8) before extracting hours/minutes
          const aptStartPHT = new Date(aptStart.getTime() + 8 * 60 * 60 * 1000)
          const aptEndPHT = new Date(aptEnd.getTime() + 8 * 60 * 60 * 1000)

          const aptStartMins = aptStartPHT.getUTCHours() * 60 + aptStartPHT.getUTCMinutes()
          const aptEndMins = aptEndPHT.getUTCHours() * 60 + aptEndPHT.getUTCMinutes()

          return cursor < aptEndMins && slotEndMins > aptStartMins
        })

        // Skip slots in the past (slotDatetime is now a true UTC instant)
        const now = new Date()
        const isPast = slotDatetime <= now

        const timeLabel = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`

        allSlots.push({
          time: timeLabel,
          datetime: slotDatetime.toISOString(),
          available: !isBooked && !isPast,
          scheduleId: schedule.id,
        })

        cursor += slotDuration
      }
    }

    return NextResponse.json(allSlots)
  } catch (error) {
    console.error('Error fetching slots:', error)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  }
}