'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email or password')
      } else {
        toast.success('Login successful!')
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — form */}
      <div className="relative w-full md:w-1/2 flex flex-col items-center justify-center px-8 md:px-16 py-12 bg-white">
        {/* Triangle pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='30,5 55,50 5,50' fill='%232d7a2d'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/logo.jpg"
              alt="Kalinga-ni Logo"
              width={100}
              height={100}
              className="rounded-xl object-contain mb-3 drop-shadow-md"
            />
            <h1 className="text-xl font-bold text-[#2d7a2d] tracking-wide uppercase text-center">
              Kalinga-ni
            </h1>
            <p className="text-xs text-gray-400 text-center mt-1 font-medium tracking-widest uppercase">
              OPD Online Appointment System
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">Welcome Back</h2>
            <p className="text-gray-400 text-sm text-center mb-6">Are you an existing user? Sign in below.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="h-11 border-gray-200 focus:border-[#2d7a2d] focus:ring-[#2d7a2d]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="h-11 border-gray-200 focus:border-[#2d7a2d] focus:ring-[#2d7a2d] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#2d7a2d] hover:bg-[#245f24] text-white font-semibold rounded-lg shadow"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#2d7a2d] font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-[#2d7a2d] transition">
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>

      {/* Right panel — hospital photo */}
      <div className="hidden md:block md:w-1/2 relative">
        <Image
          src="/bg.jpg"
          alt="Marinduque Provincial Hospital"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-blue-900/50" />
        <div className="absolute inset-0 flex flex-col justify-center px-12 text-white">
          <h2 className="text-4xl font-bold leading-tight mb-4 drop-shadow-lg">
            Kalinga-ni:<br />
            <span className="text-3xl font-semibold">
              Marinduque Provincial Hospital<br />
              Outpatient Department<br />
              Online Appointment System
            </span>
          </h2>
          <p className="text-white/80 text-lg font-medium drop-shadow">
            Outpatients&apos; Account
          </p>
        </div>
      </div>
    </div>
  )
}