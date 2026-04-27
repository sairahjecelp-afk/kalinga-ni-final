import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/announcements?audience=ALL
// Returns visible announcements, pinned first, filtered by audience
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = (session.user as any).role as string

    // Patients only see ALL and PATIENT announcements
    // Staff see ALL and STAFF announcements
    // Admin sees everything
    const audienceFilter =
      role === 'ADMIN'
        ? undefined
        : role === 'PATIENT'
        ? { in: ['ALL', 'PATIENT'] }
        : { in: ['ALL', 'STAFF'] }

    const announcements = await prisma.announcement.findMany({
      where: {
        isVisible: true,
        ...(audienceFilter && { audience: audienceFilter }),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            image: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// POST /api/announcements
// Staff or Admin can create announcements
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (role !== 'STAFF' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only staff and admins can post announcements' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, audience, isPinned } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const validAudiences = ['ALL', 'PATIENT', 'STAFF']
    if (audience && !validAudiences.includes(audience)) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 400 })
    }

    // Only admins can pin announcements
    const canPin = role === 'ADMIN' && isPinned === true

    const announcement = await prisma.announcement.create({
      data: {
        authorId: (session.user as any).id,
        title: title.trim(),
        content: content.trim(),
        audience: audience || 'ALL',
        isPinned: canPin,
        isVisible: true,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}