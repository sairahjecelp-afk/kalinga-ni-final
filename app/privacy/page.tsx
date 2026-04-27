import Link from 'next/link'
import { Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Kalinga-ni</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2">Last updated: January 1, 2025</p>
            <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-foreground/70 text-lg">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
          </div>

          <div className="space-y-10 text-foreground/70 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
              <p className="mb-3">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque vehicula, nisl eget ultricies tincidunt, nunc nisl aliquam nisl, nec aliquam nisl nisl sit amet nisl. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <p className="mb-3">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
                <li>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</li>
                <li>Ut enim ad minim veniam, quis nostrud exercitation ullamco</li>
                <li>Duis aute irure dolor in reprehenderit in voluptate velit</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
              <p className="mb-3">
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <p className="mb-3">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Medical Information</h2>
              <p className="mb-3">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
              <p className="mb-3">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing and Disclosure</h2>
              <p className="mb-3">
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
              </p>
              <p className="mb-3">
                Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Temporibus autem quibusdam et aut officiis debitis</li>
                <li>Nam libero tempore cum soluta nobis est eligendi</li>
                <li>Quis autem vel eum iure reprehenderit qui in ea voluptate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Security</h2>
              <p className="mb-3">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="mb-3">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
              <p className="mb-3">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim ipsam voluptatem.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to access your personal data</li>
                <li>Right to correct inaccurate information</li>
                <li>Right to request deletion of your data</li>
                <li>Right to data portability</li>
                <li>Right to withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies and Tracking</h2>
              <p className="mb-3">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est qui dolorem ipsum quia dolor sit amet consectetur.
              </p>
              <p>
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi occaecati cupiditate non provident similique.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact Us</h2>
              <p className="mb-3">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium text-foreground">Kalinga-ni Clinic</p>
                <p>123 Healthcare Street, Quezon City, 1100, Philippines</p>
                <p>Email: privacy@kalinga-ni.com</p>
                <p>Phone: +63-2-1234-5678</p>
              </div>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
            <Link href="/terms" className="text-primary hover:underline text-sm">
              Terms &amp; Conditions →
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-foreground/5 border-t border-border py-12 px-4 mt-12">
        <div className="max-w-7xl mx-auto text-center text-foreground/70 text-sm">
          <p>&copy; 2025 Kalinga-ni Clinic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}