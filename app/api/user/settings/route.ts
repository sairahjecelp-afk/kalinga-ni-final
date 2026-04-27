import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/user/settings
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id as string

    // Upsert — create default settings if none exist
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        theme: 'system',
        language: 'en',
        emailNotifications: true,
        phoneNotifications: false,
        appNotifications: true,
      },
      update: {},
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PATCH /api/user/settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json()
    const { theme, language, emailNotifications, phoneNotifications, appNotifications } = body

    const validThemes = ['light', 'dark', 'system']
    const validLanguages = ['en', 'tl', 'es', 'ceb']

    if (theme && !validThemes.includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
    }

    if (language && !validLanguages.includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        theme: theme || 'system',
        language: language || 'en',
        emailNotifications: emailNotifications ?? true,
        phoneNotifications: phoneNotifications ?? false,
        appNotifications: appNotifications ?? true,
      },
      update: {
        ...(theme && { theme }),
        ...(language && { language }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(phoneNotifications !== undefined && { phoneNotifications }),
        ...(appNotifications !== undefined && { appNotifications }),
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}