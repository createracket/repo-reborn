import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import racketLogo from "@/assets/logo/CR-Logo-Full-White.svg";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SiteFooter() {
  const [signedIn, setSignedIn] = useState(false);
  const contactEmail = "community@createracket.com";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <footer className="mt-20 border-t border-border bg-pink-accent text-[#2b2b2b]">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Link to="/" className="inline-block">
              <img src={racketLogo} alt="Racket" className="h-11 w-auto" />
            </Link>
            <p className="mt-4 max-w-md text-base text-[#2b2b2b]/80">
              Create Racket acknowledges the Traditional Owners of Country throughout Australia. We
              pay our respects to Elders past and present.
            </p>
          </div>

          <div className="lg:col-span-3">
            <h3 className="mb-3 font-headline text-sm">Explore</h3>
            <ul className="space-y-2 text-sm">
              {!signedIn && (
                <li>
                  <Link to="/fan-signup" className="hover:text-purple">
                    Join the mailing list
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="mb-3 font-headline text-sm">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 hover:text-purple"
                >
                  <Mail className="size-4" />
                  <span>{contactEmail}</span>
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/createracket"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-purple"
                >
                  <Instagram className="size-4" />Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/create-racket"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-purple"
                >
                  <Linkedin className="size-4" /> LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#2b2b2b]/20 pt-6 text-xs text-[#2b2b2b]/70 sm:flex-row">
          <span>© {new Date().getFullYear()} Create Racket. Cool collabs</span>
          <nav className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-purple">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-purple">
              Privacy
            </Link>
            <span className="hidden sm:inline">Where creative partners connect.</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
