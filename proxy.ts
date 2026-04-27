import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user

  const isAuthPage =
    nextUrl.pathname === '/login' || nextUrl.pathname === '/register'

  // Redirect logged-in users away from login/register to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Redirect unauthenticated users away from protected routes to login
  if (!isLoggedIn && nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/login', '/register', '/dashboard/:path*'],
}