import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Create Racket" },
      {
        name: "description",
        content:
          "How Create Racket collects, uses and protects your personal information.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const updated = "2 June 2026";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl">PRIVACY POLICY</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

        <div className="prose prose-neutral mt-8 max-w-none space-y-6 text-foreground/90">
          <section>
            <p>
              This policy explains what personal information Create Racket collects,
              how we use it, and the choices you have. It applies to our website,
              mailing list, the Vibe Check and any accounts you create with us.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">1. What we collect</h2>
            <ul className="list-disc pl-6">
              <li>
                <strong>Account info:</strong> name, email, password (hashed),
                profile type (artist, brand, creative, fan, crew), and any profile
                details you add.
              </li>
              <li>
                <strong>Mailing list info:</strong> name (optional), email and
                signup source.
              </li>
              <li>
                <strong>Vibe Check answers</strong> and the resulting archetype.
              </li>
              <li>
                <strong>Technical data:</strong> basic device, browser and usage
                data needed to run the site securely.
              </li>
              <li>
                <strong>Communications</strong> you send us (e.g. via email or the
                contact form).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline text-xl">2. How we use it</h2>
            <ul className="list-disc pl-6">
              <li>To create and run your account and match you with partners.</li>
              <li>To send platform, opportunity and community emails you've opted into.</li>
              <li>To keep the platform secure and to prevent abuse.</li>
              <li>To improve the product based on aggregated usage.</li>
            </ul>
            <p>
              We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">3. Who we share it with</h2>
            <p>
              We share data only with trusted service providers needed to run the
              platform — including our hosting, database, authentication and email
              providers — under contracts that require them to protect your data. We
              may also disclose information where required by law.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">4. Where it's stored</h2>
            <p>
              Data is stored with our cloud infrastructure providers and may be
              processed in countries outside Australia. We take reasonable steps to
              ensure your information is handled in line with this policy wherever
              it is processed.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">5. Your choices</h2>
            <ul className="list-disc pl-6">
              <li>Unsubscribe from emails using the link in any message.</li>
              <li>Update or delete your profile from your account settings.</li>
              <li>
                Request a copy or deletion of your data by emailing{" "}
                <a className="text-primary hover:underline" href="mailto:community@createracket.com">
                  community@createracket.com
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline text-xl">6. Cookies</h2>
            <p>
              We use essential cookies and local storage to keep you signed in and
              to remember your Vibe Check progress. We do not use third-party
              advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">7. Children</h2>
            <p>
              Create Racket is not intended for anyone under 16. If you believe a
              child has provided us with personal information, contact us and we
              will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">8. Changes</h2>
            <p>
              We may update this policy from time to time. Material changes will be
              communicated via the site or by email.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl">9. Contact</h2>
            <p>
              Questions about your data? Email{" "}
              <a className="text-primary hover:underline" href="mailto:community@createracket.com">
                community@createracket.com
              </a>
              . See also our{" "}
              <Link to="/terms" className="text-primary hover:underline">
                Terms of Service
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
