import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          await prisma.$connect()
        } catch {
          throw new Error('Database connection failed. Please try again.')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) return null

        if (user.status === 'SUSPENDED') {
          throw new Error('Your account has been suspended. Please contact the clinic.')
        }
        if (user.status === 'BANNED') {
          throw new Error('Your account has been banned. Please contact the clinic.')
        }
        if (user.status === 'DELETED') {
          throw new Error('This account no longer exists.')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isPasswordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name
        token.imageFetched = false
        token.cachedImage = undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.role = token.role as string
        u.id = token.id as string

        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { image: true, status: true },
        })

        if (!dbUser || dbUser.status === 'DELETED') {
          return null as any
        }

        if (dbUser.status !== 'ACTIVE') {
          return null as any
        }

        u.image = dbUser.image ?? null
        token.cachedImage = u.image
        token.imageFetched = true
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})