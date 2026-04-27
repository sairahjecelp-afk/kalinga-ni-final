import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, newPassword } = body

    // Prevent admin from acting on themselves
    if (id === (session.user as any).id) {
      return NextResponse.json(
        { error: 'You cannot perform this action on your own account' },
        { status: 400 }
      )
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent acting on other admins
    if (target.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot perform this action on an admin account' },
        { status: 400 }
      )
    }

    if (action === 'SUSPEND') {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: 'SUSPENDED' },
      })
      return NextResponse.json({ message: 'User suspended', user: updated })
    }

    if (action === 'BAN') {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: 'BANNED' },
      })
      return NextResponse.json({ message: 'User banned', user: updated })
    }

    if (action === 'ACTIVATE') {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE' },
      })
      return NextResponse.json({ message: 'User reactivated', user: updated })
    }

    if (action === 'DELETE') {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: 'DELETED' },
      })
      return NextResponse.json({ message: 'User deleted', user: updated })
    }

    if (action === 'RESET_PASSWORD') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }
      const hashed = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id },
        data: { password: hashed },
      })
      return NextResponse.json({ message: 'Password reset successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin user action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}