import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/schedule/requests
// STAFF  → their own requests
// ADMIN  → all requests (optionally filtered by ?status=PENDING)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // e.g. "PENDING"

    const where: any = {}

    if (session.user.role === 'STAFF') {
      const staff = await prisma.staff.findUnique({
        where: { userId: session.user.id as string },
      })
      if (!staff) {
        return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
      }
      where.staffId = staff.id
    } else if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (statusFilter) {
      where.status = statusFilter
    }

    const requests = await prisma.scheduleRequest.findMany({
      where,
      include: {
        staff: {
          include: { user: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching schedule requests:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule requests' }, { status: 500 })
  }
}

// POST /api/schedule/requests
// Staff submits a new availability request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Only staff can submit schedule requests' }, { status: 403 })
    }

    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id as string },
      include: { user: true },
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
      return NextResponse.json({ error: 'Times must be in HH:mm format' }, { status: 400 })
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

    // Parse the date string using UTC to prevent timezone shift
    const [year, month, day] = (date as string).split('-').map(Number)
    const slotDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))

    // Check for overlapping PENDING or APPROVED requests on the same date
    const existingRequests = await prisma.scheduleRequest.findMany({
      where: {
        staffId: staff.id,
        status: { in: ['PENDING', 'APPROVED'] },
        date: { gte: slotDate, lt: nextDay },
      },
    })

    const newStartMins = startH * 60 + startM
    const newEndMins = endH * 60 + endM

    const hasOverlap = existingRequests.some((req) => {
      const [sH, sM] = req.startTime.split(':').map(Number)
      const [eH, eM] = req.endTime.split(':').map(Number)
      const existStartMins = sH * 60 + sM
      const existEndMins = eH * 60 + eM
      return newStartMins < existEndMins && newEndMins > existStartMins
    })

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'This time overlaps with an existing pending or approved request on the same date' },
        { status: 409 }
      )
    }

    // Create the schedule request
    const scheduleRequest = await prisma.scheduleRequest.create({
      data: {
        staffId: staff.id,
        date: slotDate,
        startTime,
        endTime,
        slotDuration: slotDuration || 30,
        status: 'PENDING',
      },
    })

    // Notify all admins in-app
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
    })

    const staffName = `${staff.user.firstName} ${staff.user.lastName}`
    const dateLabel = slotDate.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const formatTime12 = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
    }

    await Promise.all(
      admins.map((admin) =>
        prisma.notificationLog.create({
          data: {
            userId: admin.id,
            channel: 'APP',
            subject: 'New Schedule Request',
            body: `${staffName} has submitted an availability request for ${dateLabel} from ${formatTime12(startTime)} to ${formatTime12(endTime)}.`,
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      )
    )

    return NextResponse.json(scheduleRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule request:', error)
    return NextResponse.json({ error: 'Failed to create schedule request' }, { status: 500 })
  }
}