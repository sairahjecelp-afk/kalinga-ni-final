import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// DELETE /api/user/delete
// Requires password confirmation before deleting
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const role = (session.user as any).role as string
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete your account' },
        { status: 400 }
      )
    }

    // Admins cannot self-delete via this endpoint (safety measure)
    if (role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be self-deleted. Please contact a system administrator.' },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect password. Account deletion cancelled.' },
        { status: 400 }
      )
    }

    // Soft delete — mark as DELETED rather than hard delete
    // This preserves medical records and appointment history
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}