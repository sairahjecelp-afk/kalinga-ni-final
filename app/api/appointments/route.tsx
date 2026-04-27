import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentConfirmationEmail } from '@/lib/notifications'

// Helper: convert a UTC Date to Philippine Time (UTC+8) minutes since midnight.
// Used to compare UTC-stored datetimes against PHT "HH:mm" schedule strings.
function toPhilippineMinutes(date: Date): number {
  const pht = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return pht.getUTCHours() * 60 + pht.getUTCMinutes()
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { staffId, appointmentDate, duration, reason } = body

    if (!staffId || !appointmentDate || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (session.user.role !== 'PATIENT') {
      return NextResponse.json(
        { error: 'Only patients can book appointments' },
        { status: 403 }
      )
    }

    const patient = await prisma.patient.findUnique({
      where: { userId: session.user.id as string },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      )
    }

    const newStart = new Date(appointmentDate)
    const newEnd = new Date(newStart.getTime() + (duration || 30) * 60 * 1000)

    // Use UTC methods to build the day boundary so it matches how
    // dates are stored in the database (UTC midnight)
    const y = newStart.getUTCFullYear()
    const m = newStart.getUTCMonth()
    const d = newStart.getUTCDate()
    const slotDate = new Date(Date.UTC(y, m, d, 0, 0, 0, 0))
    const nextDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0))

    // Verify the requested slot falls within a valid, available schedule window
    const scheduleSlots = await prisma.staffSchedule.findMany({
      where: {
        staffId,
        isAvailable: true,
        date: { gte: slotDate, lt: nextDay },
      },
    })

    // Schedule startTime/endTime strings are stored in PHT ("HH:mm").
    // Convert the UTC appointment datetime to PHT minutes before comparing.
    const slotStartMins = toPhilippineMinutes(newStart)
    const slotEndMins = toPhilippineMinutes(newEnd)

    const withinSchedule = scheduleSlots.some((s) => {
      const [sH, sM] = s.startTime.split(':').map(Number)
      const [eH, eM] = s.endTime.split(':').map(Number)
      return (
        slotStartMins >= sH * 60 + sM &&
        slotEndMins <= eH * 60 + eM
      )
    })

    if (!withinSchedule) {
      return NextResponse.json(
        { error: "The selected time is outside of the doctor's available schedule." },
        { status: 409 }
      )
    }

    // Overlap check against existing appointments
    const overlappingAppointments = await prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        OR: [{ staffId }, { patientId: patient.id }],
        AND: [{ appointmentDate: { lt: newEnd } }],
      },
      select: {
        id: true,
        staffId: true,
        patientId: true,
        appointmentDate: true,
        duration: true,
      },
    })

    const conflicts = overlappingAppointments.filter((apt) => {
      const existingEnd = new Date(
        apt.appointmentDate.getTime() + apt.duration * 60 * 1000
      )
      return existingEnd > newStart
    })

    const staffConflict = conflicts.find((apt) => apt.staffId === staffId)
    const patientConflict = conflicts.find((apt) => apt.patientId === patient.id)

    if (staffConflict) {
      return NextResponse.json(
        { error: 'This time slot has just been taken. Please choose another.' },
        { status: 409 }
      )
    }

    if (patientConflict) {
      return NextResponse.json(
        { error: 'You already have an appointment scheduled during this time.' },
        { status: 409 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        staffId,
        appointmentDate: newStart,
        duration: duration || 30,
        reason,
      },
      include: {
        patient: { include: { user: true } },
        staff: { include: { user: true } },
      },
    })

    const patientUser = appointment.patient.user
    const staffUser = appointment.staff.user
    const staffName = `${staffUser.firstName} ${staffUser.lastName}`
    const patientName = `${patientUser.firstName} ${patientUser.lastName}`

    // 1. In-app notification bell entry for the patient
    try {
      await prisma.notificationLog.create({
        data: {
          userId: patientUser.id,
          channel: 'APP',
          subject: 'Appointment Confirmed',
          body: `Your appointment with ${staffName} on ${appointment.appointmentDate.toLocaleDateString(
            'en-PH',
            { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }
          )} at ${appointment.appointmentDate.toLocaleTimeString('en-PH', {
            timeZone: 'Asia/Manila',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })} has been confirmed.`,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } catch (notifErr) {
      // Non-blocking — log but don't fail the booking
      console.error('Failed to create in-app notification:', notifErr)
    }

    // 2. Confirmation email to the patient
    try {
      await sendAppointmentConfirmationEmail({
        toEmail: patientUser.email,
        patientName,
        staffName,
        appointmentDate: appointment.appointmentDate,
        duration: appointment.duration,
        reason: appointment.reason,
      })

      await prisma.notificationLog.create({
        data: {
          userId: patientUser.id,
          channel: 'EMAIL',
          subject: 'Appointment Confirmed',
          body: `Appointment on ${appointment.appointmentDate.toISOString()} with ${staffName} confirmed.`,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr)
      await prisma.notificationLog.create({
        data: {
          userId: patientUser.id,
          channel: 'EMAIL',
          subject: 'Appointment Confirmed',
          body: `Appointment on ${appointment.appointmentDate.toISOString()} with ${staffName} confirmed.`,
          status: 'FAILED',
        },
      })
    }

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

// GET /api/appointments
// Returns all staff with their upcoming available schedule dates
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use UTC midnight so the filter boundary doesn't shift back a day
    const now = new Date()
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    )

    const staff = await prisma.staff.findMany({
      include: {
        user: true,
        schedules: {
          where: {
            isAvailable: true,
            date: { gte: todayUTC },
          },
          orderBy: { date: 'asc' },
        },
      },
    })

    // Only return staff that have at least one upcoming available slot
    const staffWithSchedule = staff.filter((s) => s.schedules.length > 0)

    return NextResponse.json(staffWithSchedule)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}