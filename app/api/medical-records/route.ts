import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only staff can create medical records
    if (session.user.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Only medical staff can create medical records' },
        { status: 403 }
      )
    }

    // Look up Staff.id from User.id
    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id as string },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    const body = await request.json()
    const { appointmentId, patientId, diagnosis, treatment, medications, notes } = body

    if (!appointmentId || !patientId || !diagnosis || !treatment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the appointment belongs to this staff member and is completed
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // ✅ Compare Staff.id (not User.id)
    if (appointment.staffId !== staff.id) {
      return NextResponse.json(
        { error: 'You are not authorized to add records for this appointment' },
        { status: 403 }
      )
    }

    if (appointment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Medical records can only be added to completed appointments' },
        { status: 400 }
      )
    }

    // Check if a record already exists for this appointment
    const existing = await prisma.medicalRecord.findUnique({
      where: { appointmentId },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A medical record already exists for this appointment' },
        { status: 409 }
      )
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId,
        appointmentId,
        diagnosis,
        treatment,
        medications: medications || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error creating medical record:', error)
    return NextResponse.json(
      { error: 'Failed to create medical record' },
      { status: 500 }
    )
  }
}