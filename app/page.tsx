import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Users, Clock, Shield, CheckCircle } from 'lucide-react'
import { auth } from '@/lib/auth'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Kalinga-ni Logo"
              width={40}
              height={40}
              className="rounded-md object-contain"
            />
            <span className="text-xl font-bold text-[#2d7a2d]">Kalinga-ni</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-gray-600 hover:text-[#2d7a2d] transition font-medium text-sm">
              Services
            </a>
            <a href="#about" className="text-gray-600 hover:text-[#2d7a2d] transition font-medium text-sm">
              About
            </a>
            <a href="#contact" className="text-gray-600 hover:text-[#2d7a2d] transition font-medium text-sm">
              Contact
            </a>
          </div>
          {/*<NavbarButtons */}
        </div>
      </nav>

      {/* Hero — split layout */}
      <section className="relative min-h-[92vh] flex">
        {/* Left panel */}
        <div className="relative z-10 w-full md:w-1/2 flex flex-col items-center justify-center px-8 md:px-16 py-20 bg-white">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='30,5 55,50 5,50' fill='%232d7a2d'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
          <div className="relative w-full max-w-md">
            {/* Logo */}
            <div className="flex flex-col items-center mb-10">
              <Image
                src="/logo.jpg"
                alt="Kalinga-ni Logo"
                width={120}
                height={120}
                className="rounded-xl object-contain mb-4 drop-shadow-md"
              />
              <h1 className="text-2xl font-bold text-[#2d7a2d] tracking-wide uppercase text-center">
                Kalinga-ni
              </h1>
              <p className="text-sm text-gray-500 text-center mt-1 font-medium tracking-widest uppercase">
                OPD Online Appointment System
              </p>
            </div>

            {/* Welcome text */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">
                Welcome to Kalinga-ni
              </h2>
              <p className="text-gray-500 leading-relaxed">
                The Marinduque Provincial Hospital Outpatient Department&apos;s online appointment system — making healthcare more accessible for everyone.
              </p>
            </div>

            {/* CTA Buttons */}
            <HeroButtons />

            {/* Quick info */}
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-[#2d7a2d]" />
                Free to use
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-[#2d7a2d]" />
                Secure &amp; private
              </span>
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
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Our Services</h2>
            <div className="h-1 w-16 bg-[#2d7a2d] mx-auto rounded-full mb-4" />
            <p className="text-gray-500 max-w-xl mx-auto">
              Convenient healthcare management designed for outpatients of the Marinduque Provincial Hospital
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-md hover:shadow-lg transition rounded-xl overflow-hidden">
              <div className="h-2 bg-[#2d7a2d]" />
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center mb-2">
                  <Calendar className="h-6 w-6 text-[#2d7a2d]" />
                </div>
                <CardTitle className="text-gray-800">Online Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Book your OPD appointments online anytime, without needing to visit the hospital in person.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition rounded-xl overflow-hidden">
              <div className="h-2 bg-[#1a5fa8]" />
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-[#1a5fa8]/10 flex items-center justify-center mb-2">
                  <FileText className="h-6 w-6 text-[#1a5fa8]" />
                </div>
                <CardTitle className="text-gray-800">Digital Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Access your appointment history and medical records securely from anywhere, anytime.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition rounded-xl overflow-hidden">
              <div className="h-2 bg-[#2d7a2d]" />
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-[#2d7a2d]" />
                </div>
                <CardTitle className="text-gray-800">Expert Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Get attended to by the qualified medical professionals of the Marinduque Provincial Hospital OPD.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Kalinga-ni */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Why Use Kalinga-ni?</h2>
            <div className="h-1 w-16 bg-[#1a5fa8] mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              {
                icon: <Clock className="h-6 w-6 text-[#2d7a2d]" />,
                bg: 'bg-[#2d7a2d]/10',
                title: 'Save Time',
                desc: 'No more waiting in long lines. Book your appointment in advance and arrive at your scheduled time.',
              },
              {
                icon: <Shield className="h-6 w-6 text-[#1a5fa8]" />,
                bg: 'bg-[#1a5fa8]/10',
                title: 'Secure & Private',
                desc: 'Your personal health information is kept safe and confidential at all times.',
              },
              {
                icon: <Calendar className="h-6 w-6 text-[#2d7a2d]" />,
                bg: 'bg-[#2d7a2d]/10',
                title: 'Easy Rescheduling',
                desc: 'Plans change — easily cancel or reschedule your appointments right from your account.',
              },
              {
                icon: <FileText className="h-6 w-6 text-[#1a5fa8]" />,
                bg: 'bg-[#1a5fa8]/10',
                title: 'Appointment History',
                desc: 'Keep track of all your past and upcoming appointments in one organized place.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 items-start">
                <div className={`flex-shrink-0 h-12 w-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/bg.jpg"
                alt="Marinduque Provincial Hospital"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-blue-900/40" />
              <div className="absolute bottom-6 left-6 text-white">
                <p className="font-bold text-lg">Marinduque Provincial Hospital</p>
                <p className="text-white/80 text-sm">Outpatient Department</p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">About Kalinga-ni</h2>
              <div className="h-1 w-12 bg-[#2d7a2d] rounded-full mb-6" />
              <p className="text-gray-500 mb-4 leading-relaxed">
                <strong className="text-gray-700">Kalinga-ni</strong> is the official online appointment system of the Marinduque Provincial Hospital&apos;s Outpatient Department (OPD). The name &ldquo;Kalinga&rdquo; means <em>care</em> in Filipino — a reflection of the system&apos;s purpose.
              </p>
              <p className="text-gray-500 mb-6 leading-relaxed">
                The system was built to reduce long queues, minimize wait times, and make it easier for patients across Marinduque to access outpatient services without unnecessary hassle.
              </p>
              <Link href="/register">
                <Button className="bg-[#2d7a2d] hover:bg-[#245f24] text-white px-8">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 bg-[#2d7a2d] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Book Your Appointment?</h2>
          <p className="text-white/80 mb-8">
            Create your account today and experience a more convenient way to access OPD services at Marinduque Provincial Hospital.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-[#2d7a2d] hover:bg-gray-100 font-semibold px-10">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.jpg"
                  alt="Kalinga-ni Logo"
                  width={36}
                  height={36}
                  className="rounded-md object-contain"
                />
                <span className="font-bold text-lg text-white">Kalinga-ni</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                OPD Online Appointment System of the Marinduque Provincial Hospital.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#services" className="hover:text-[#6dbd6d] transition">Services</a></li>
                <li><a href="#about" className="hover:text-[#6dbd6d] transition">About</a></li>
                <li><Link href="/login" className="hover:text-[#6dbd6d] transition">Login</Link></li>
                <li><Link href="/register" className="hover:text-[#6dbd6d] transition">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <p className="text-gray-400 text-sm">Marinduque Provincial Hospital</p>
              <p className="text-gray-400 text-sm">Boac, Marinduque, Philippines</p>
              <p className="text-gray-400 text-sm mt-2">contact@kalinga-ni.com</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Kalinga-ni. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

async function NavbarButtons() {
  const session = auth()

  if (session?.user) {
    return (
      <Link href="/dashboard">
        <Button className="bg-[#2d7a2d] hover:bg-[#245f24] text-white">
          Go to Dashboard
        </Button>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login">
        <Button variant="outline" className="border-[#2d7a2d] text-[#2d7a2d] hover:bg-[#2d7a2d] hover:text-white transition">
          Login
        </Button>
      </Link>
      <Link href="/register">
        <Button className="bg-[#2d7a2d] hover:bg-[#245f24] text-white">
          Register
        </Button>
      </Link>
    </div>
  )
}

async function HeroButtons() {
  const session = auth()

  if (session?.user) {
    return (
      <Link href="/dashboard" className="w-full">
        <Button className="w-full bg-[#2d7a2d] hover:bg-[#245f24] text-white h-12 text-base font-semibold rounded-lg shadow">
          Go to Dashboard
        </Button>
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/login" className="w-full">
        <Button className="w-full bg-[#2d7a2d] hover:bg-[#245f24] text-white h-12 text-base font-semibold rounded-lg shadow">
          Sign In
        </Button>
      </Link>
      <Link href="/register" className="w-full">
        <Button variant="outline" className="w-full border-2 border-[#2d7a2d] text-[#2d7a2d] hover:bg-[#2d7a2d] hover:text-white h-12 text-base font-semibold rounded-lg transition">
          Create an Account
        </Button>
      </Link>
    </div>
  )
}