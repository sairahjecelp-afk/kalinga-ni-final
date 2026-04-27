import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/schedule/me
// Returns the current user's staff record ID — used by the schedule page
// to know which staffId to query without exposing it in the session
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'STAFF' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not a staff member' }, { status: 403 })
    }

    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id as string },
      select: { id: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    return NextResponse.json({ staffId: staff.id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch staff info' }, { status: 500 })
  }
}