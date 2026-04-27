import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_SETTINGS = {
  clinicName: 'Kalinga-ni Clinic',
  clinicEmail: 'contact@kalinga-ni.com',
  clinicPhone: '+63-2-1234-5678',
  clinicAddress: '123 Healthcare Street',
  clinicCity: 'Quezon City',
  clinicZipCode: '1100',
  operatingHours: '9:00 AM - 6:00 PM, Monday to Friday',
  emailAppointmentConfirmation: 'Hi {patientName}, your appointment with {doctor} is confirmed on {date} at {time}.',
  emailAppointmentReminder: 'Hi {patientName}, this is a reminder for your appointment with {doctor} tomorrow at {time}.',
  emailCancellationNotice: 'Hi {patientName}, your appointment with {doctor} on {date} at {time} has been cancelled.',
  smsAppointmentConfirmation: 'Kalinga-ni: Appt confirmed with {doctor} on {date} at {time}.',
  smsAppointmentReminder: 'Kalinga-ni: Reminder - appt with {doctor} tomorrow at {time}.',
  smsCancellationNotice: 'Kalinga-ni: Your appt on {date} at {time} was cancelled.',
}

const DEFAULT_APPT_SETTINGS = {
  cancellationWindowHours: 48,
  maxAppointmentsPerDay: 0,
  defaultSlotDuration: 30,
  bookingsEnabled: true,
}

export async function GET() {
  try {
    // Upsert clinic settings
    let clinicSettings = await prisma.clinicSettings.findFirst()
    if (!clinicSettings) {
      clinicSettings = await prisma.clinicSettings.create({ data: DEFAULT_SETTINGS })
    }

    // Upsert appointment settings
    let apptSettings = await prisma.appointmentSettings.findFirst()
    if (!apptSettings) {
      apptSettings = await prisma.appointmentSettings.create({ data: DEFAULT_APPT_SETTINGS })
    }

    return NextResponse.json({ clinic: clinicSettings, appointments: apptSettings })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ message: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { section, data } = body

    if (!section || !data) {
      return NextResponse.json({ message: 'section and data are required' }, { status: 400 })
    }

    // ── Clinic Info ──────────────────────────────────────────────────────────
    if (section === 'clinic') {
      const existing = await prisma.clinicSettings.findFirst()
      if (!existing) {
        return NextResponse.json({ message: 'Clinic settings not found' }, { status: 404 })
      }
      const updated = await prisma.clinicSettings.update({
        where: { id: existing.id },
        data: {
          ...(data.clinicName && { clinicName: data.clinicName }),
          ...(data.clinicEmail && { clinicEmail: data.clinicEmail }),
          ...(data.clinicPhone && { clinicPhone: data.clinicPhone }),
          ...(data.clinicAddress && { clinicAddress: data.clinicAddress }),
          ...(data.clinicCity && { clinicCity: data.clinicCity }),
          ...(data.clinicZipCode && { clinicZipCode: data.clinicZipCode }),
          ...(data.operatingHours && { operatingHours: data.operatingHours }),
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // ── Appointment Rules ────────────────────────────────────────────────────
    if (section === 'appointments') {
      const existing = await prisma.appointmentSettings.findFirst()
      if (!existing) {
        const created = await prisma.appointmentSettings.create({ data: DEFAULT_APPT_SETTINGS })
        return NextResponse.json({ success: true, data: created })
      }
      const updated = await prisma.appointmentSettings.update({
        where: { id: existing.id },
        data: {
          ...(data.cancellationWindowHours !== undefined && {
            cancellationWindowHours: parseInt(data.cancellationWindowHours),
          }),
          ...(data.maxAppointmentsPerDay !== undefined && {
            maxAppointmentsPerDay: parseInt(data.maxAppointmentsPerDay),
          }),
          ...(data.defaultSlotDuration !== undefined && {
            defaultSlotDuration: parseInt(data.defaultSlotDuration),
          }),
          ...(data.bookingsEnabled !== undefined && {
            bookingsEnabled: Boolean(data.bookingsEnabled),
          }),
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // ── Notification Templates ───────────────────────────────────────────────
    if (section === 'notifications') {
      const existing = await prisma.clinicSettings.findFirst()
      if (!existing) {
        return NextResponse.json({ message: 'Clinic settings not found' }, { status: 404 })
      }
      const updated = await prisma.clinicSettings.update({
        where: { id: existing.id },
        data: {
          ...(data.emailAppointmentConfirmation !== undefined && {
            emailAppointmentConfirmation: data.emailAppointmentConfirmation,
          }),
          ...(data.emailAppointmentReminder !== undefined && {
            emailAppointmentReminder: data.emailAppointmentReminder,
          }),
          ...(data.emailCancellationNotice !== undefined && {
            emailCancellationNotice: data.emailCancellationNotice,
          }),
          ...(data.smsAppointmentConfirmation !== undefined && {
            smsAppointmentConfirmation: data.smsAppointmentConfirmation,
          }),
          ...(data.smsAppointmentReminder !== undefined && {
            smsAppointmentReminder: data.smsAppointmentReminder,
          }),
          ...(data.smsCancellationNotice !== undefined && {
            smsCancellationNotice: data.smsCancellationNotice,
          }),
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ message: 'Invalid section' }, { status: 400 })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ message: 'Failed to update settings' }, { status: 500 })
  }
}