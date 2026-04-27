import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { put, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/user/avatar
// Accepts a multipart/form-data with a single "file" field.
// Uploads it to Vercel Blob, saves the URL to the user record,
// and deletes the old blob if one existed.
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id as string

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Profile picture is too large. Please use an image under 2MB.' },
        { status: 400 }
      )
    }

    // Fetch the current user to get their old avatar URL (if any)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    })

    // Upload new image to Vercel Blob
    const ext = file.name.split('.').pop() ?? 'jpg'
    const blob = await put(`avatars/${userId}.${ext}`, file, {
      access: 'public',
      // Overwrite the old file for the same user so we don't accumulate blobs
      addRandomSuffix: false,
    })

    // Delete old blob if it was a different URL (e.g. different extension)
    if (
      currentUser?.image &&
      currentUser.image.startsWith('https://') &&
      currentUser.image !== blob.url
    ) {
      try {
        await del(currentUser.image)
      } catch {
        // Non-fatal — old blob cleanup failure shouldn't break the upload
        console.warn('Failed to delete old avatar blob:', currentUser.image)
      }
    }

    // Save the new blob URL to the database
    await prisma.user.update({
      where: { id: userId },
      data: { image: blob.url },
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
  }
}

// DELETE /api/user/avatar
// Removes the user's profile picture from Vercel Blob and clears the DB field.
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id as string

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    })

    if (currentUser?.image?.startsWith('https://')) {
      try {
        await del(currentUser.image)
      } catch {
        console.warn('Failed to delete avatar blob:', currentUser.image)
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting avatar:', error)
    return NextResponse.json({ error: 'Failed to delete avatar' }, { status: 500 })
  }
}