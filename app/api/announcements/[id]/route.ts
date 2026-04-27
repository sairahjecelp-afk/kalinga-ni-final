import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/announcements/[id]
// Author or admin can edit; only admin can pin/unpin or hide
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
    const role = (session.user as any).role as string
    const userId = (session.user as any).id as string

    const announcement = await prisma.announcement.findUnique({ where: { id } })
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    const isAuthor = announcement.authorId === userId
    const isAdmin = role === 'ADMIN'

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, audience, isPinned, isVisible } = body

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(content && { content: content.trim() }),
        ...(audience && { audience }),
        // Only admins can change pin and visibility
        ...(isAdmin && isPinned !== undefined && { isPinned }),
        ...(isAdmin && isVisible !== undefined && { isVisible }),
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
}

// DELETE /api/announcements/[id]
// Author or admin can delete
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
    const role = (session.user as any).role as string
    const userId = (session.user as any).id as string

    const announcement = await prisma.announcement.findUnique({ where: { id } })
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    const isAuthor = announcement.authorId === userId
    const isAdmin = role === 'ADMIN'

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.announcement.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}