import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/schedule?staffId=xxx&from=yyyy-mm-dd&to=yyyy-mm-dd
// staffId is optional for ADMIN (returns all staff slots when omitted)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // staffId is required for non-admins; admins can omit it to fetch all staff slots
    if (!staffId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const where: any = staffId ? { staffId } : {}

    if (from || to) {
      where.date = {}
      // FIX: Parse date strings using UTC to avoid timezone shift
      if (from) {
        const [y, m, d] = from.split('-').map(Number)
        where.date.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
      }
      if (to) {
        const [y, m, d] = to.split('-').map(Number)
        where.date.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
      }
    }

    const schedules = await prisma.staffSchedule.findMany({
      where,
      include: {
        staff: {
          include: { user: true },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    const schedulesWithBookings = await Promise.all(
      schedules.map(async (slot) => {
        const [startHour, startMin] = slot.startTime.split(':').map(Number)
        const [endHour, endMin] = slot.endTime.split(':').map(Number)

        // FIX: Use setUTCHours so times are applied in UTC, not local time
        const slotStart = new Date(slot.date)
        slotStart.setUTCHours(startHour, startMin, 0, 0)

        const slotEnd = new Date(slot.date)
        slotEnd.setUTCHours(endHour, endMin, 0, 0)

        const bookedCount = await prisma.appointment.count({
          where: {
            staffId: slot.staffId,
            status: 'SCHEDULED',
            appointmentDate: {
              gte: slotStart,
              lt: slotEnd,
            },
          },
        })

        const totalSlots = Math.floor(
          ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / slot.slotDuration
        )

        return {
          ...slot,
          bookedCount,
          totalSlots,
          availableSlots: Math.max(0, totalSlots - bookedCount),
        }
      })
    )

    return NextResponse.json(schedulesWithBookings)
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

// POST /api/schedule
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'STAFF' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only staff can create schedules' }, { status: 403 })
    }

    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id as string },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    const body = await request.json()
    const { date, startTime, endTime, slotDuration } = body

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'date, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    // Validate time format HH:mm
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Times must be in HH:mm format' },
        { status: 400 }
      )
    }

    // Validate start < end
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    if (startH * 60 + startM >= endH * 60 + endM) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      )
    }

    // FIX: Parse the date string using UTC to prevent timezone shift
    const [year, month, day] = (date as string).split('-').map(Number)
    const slotDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))

    // Check for overlapping slots on the same date for this staff
    const existingSlots = await prisma.staffSchedule.findMany({
      where: {
        staffId: staff.id,
        date: { gte: slotDate, lt: nextDay },
      },
    })

    const newStartMins = startH * 60 + startM
    const newEndMins = endH * 60 + endM

    const hasOverlap = existingSlots.some((slot) => {
      const [sH, sM] = slot.startTime.split(':').map(Number)
      const [eH, eM] = slot.endTime.split(':').map(Number)
      const existStartMins = sH * 60 + sM
      const existEndMins = eH * 60 + eM
      return newStartMins < existEndMins && newEndMins > existStartMins
    })

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'This time slot overlaps with an existing schedule on the same date' },
        { status: 409 }
      )
    }

    const schedule = await prisma.staffSchedule.create({
      data: {
        staffId: staff.id,
        date: slotDate,
        startTime,
        endTime,
        slotDuration: slotDuration || 30,
        isAvailable: true,
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}