import { Link } from "@tanstack/react-router";
import { WordmarkInline } from "@/components/brand/Wordmark";
import { Instagram, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-sidebar mt-24">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <WordmarkInline />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            The community + dashboard for musicians, brands, creators and fans
            building louder, stranger, more meaningful collaborations.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm tracking-wider text-foreground">EXPLORE</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/vibe-check" className="hover:text-foreground">Vibe Check</Link></li>
            <li><Link to="/fan-signup" className="hover:text-foreground">Join the mailing list</Link></li>
            <li><Link to="/login" className="hover:text-foreground">Log in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm tracking-wider text-foreground">FOLLOW</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="https://instagram.com/createracket"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <Instagram className="size-4" />
                <span>@createracket</span>
              </a>
            </li>
            <li>
              <a href="mailto:community@createracket.com" className="inline-flex items-center gap-2 hover:text-foreground">
                <Mail className="size-4" />
                <span>community@createracket.com</span>
              </a>
            </li>
          </ul>

        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Create Racket. Made loud.
      </div>
    </footer>
  );
}
