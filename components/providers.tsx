'use client'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        scriptProps={{
          'data-cfasync': 'false',
          suppressHydrationWarning: true,
        } as React.ScriptHTMLAttributes<HTMLScriptElement>}
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}