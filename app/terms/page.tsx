import Link from 'next/link'
import { Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
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
            <h1 className="text-4xl font-bold text-foreground mb-4">Terms &amp; Conditions</h1>
            <p className="text-foreground/70 text-lg">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. By using Kalinga-ni, you agree to the following terms.
            </p>
          </div>

          <div className="space-y-10 text-foreground/70 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p className="mb-3">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque vehicula nisl eget ultricies tincidunt. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Use of the Platform</h2>
              <p className="mb-3">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
              <p className="mb-3">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 18 years old to create an account</li>
                <li>You are responsible for maintaining the confidentiality of your credentials</li>
                <li>Lorem ipsum dolor sit amet consectetur adipiscing elit</li>
                <li>Sed do eiusmod tempor incididunt ut labore et dolore</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Appointment Booking</h2>
              <p className="mb-3">
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
              </p>
              <p className="mb-3">
                Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Appointments must be cancelled within the allowed cancellation window</li>
                <li>Repeated no-shows may result in account suspension</li>
                <li>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Medical Disclaimer</h2>
              <p className="mb-3">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="mb-3">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <div className="bg-muted border border-border rounded-lg p-4 text-sm">
                <p className="font-medium text-foreground mb-1">Important Notice</p>
                <p>
                  Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. This platform is not a substitute for professional medical advice.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. User Accounts</h2>
              <p className="mb-3">
                Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.
              </p>
              <p>
                Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
              <p className="mb-3">
                Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. Lorem ipsum dolor sit amet consectetur.
              </p>
              <p>
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
              <p className="mb-3">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim.
              </p>
              <p>
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt neque porro quisquam est qui dolorem ipsum.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Termination</h2>
              <p className="mb-3">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. We reserve the right to suspend or terminate accounts that violate these terms. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to Terms</h2>
              <p className="mb-3">
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti. We may update these terms at any time and will notify users of significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact</h2>
              <p className="mb-3">
                For questions about these Terms &amp; Conditions, please contact us:
              </p>
              <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium text-foreground">Kalinga-ni Clinic</p>
                <p>123 Healthcare Street, Quezon City, 1100, Philippines</p>
                <p>Email: legal@kalinga-ni.com</p>
                <p>Phone: +63-2-1234-5678</p>
              </div>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
            <Link href="/privacy" className="text-primary hover:underline text-sm">
              ← Privacy Policy
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              Back to Home →
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