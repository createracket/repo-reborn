import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Create Racket" },
      {
        name: "description",
        content:
          "The terms and conditions for using Create Racket — the platform connecting artists, brands, creatives, fans and crew.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const updated = "2 June 2026";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl">TERMS OF SERVICE</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

        <div className="prose prose-neutral mt-8 max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="font-headline text-xl">1. Who we are</h2>
            <p>
              Create Racket ("we", "us", "our") operates this website and the related
              services that connect artists, brands, creatives, fans and crew. By using
              the site, creating an account, joining the mailing list, taking the Vibe
              Check or entering an early access code, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">2. Eligibility & accounts</h2>
            <p>
              You must be at least 16 years old to create an account or subscribe. You
              are responsible for keeping your login credentials secure and for all
              activity on your account. We may suspend or remove accounts that breach
              these Terms, post unlawful or offensive content, or misuse the platform.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">3. Soft launch & early access</h2>
            <p>
              The platform is currently in a soft-launch phase. Access codes are
              issued at our discretion and may be revoked. Features may change, break
              or be removed during this period without notice.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">4. Your content</h2>
            <p>
              You retain ownership of the content you submit (profile details, Vibe
              Check answers, messages). You grant us a non-exclusive, worldwide,
              royalty-free licence to host, display and use that content to operate
              and improve the platform, and to match you with relevant partners. You
              must not submit content that is unlawful, infringing, hateful or
              deceptive.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">5. Mailing list & communications</h2>
            <p>
              By subscribing you agree to receive emails from Create Racket about the
              platform, opportunities, launches and community updates. You can
              unsubscribe at any time via the link in any email or by contacting{" "}
              <a className="text-primary hover:underline" href="mailto:community@createracket.com">
                community@createracket.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">6. No guarantee of matches or bookings</h2>
            <p>
              Create Racket facilitates introductions between members. We do not
              guarantee any partnership, booking, payment or outcome, and we are not
              a party to any agreement reached between members.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">7. Intellectual property</h2>
            <p>
              The Create Racket name, logo, site design and all underlying software
              are owned by us or our licensors. You may not copy, scrape, reverse
              engineer or commercially redistribute any part of the platform without
              our written permission.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">8. Disclaimers & liability</h2>
            <p>
              The platform is provided "as is". To the maximum extent permitted by
              law, we exclude all warranties and are not liable for any indirect,
              incidental or consequential loss arising from your use of the platform.
              Nothing in these Terms limits any rights you have under the Australian
              Consumer Law that cannot lawfully be excluded.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">9. Changes</h2>
            <p>
              We may update these Terms from time to time. Material changes will be
              communicated via the site or by email. Continued use after changes take
              effect means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">10. Contact</h2>
            <p>
              Questions? Email{" "}
              <a className="text-primary hover:underline" href="mailto:community@createracket.com">
                community@createracket.com
              </a>
              . See also our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
