import { cn } from "@/lib/utils";
import logoFullColour from "@/assets/logo/CR-Logo-Full-Colour.svg";
import logoFullDark from "@/assets/logo/CR-Logo-Full-Dark.svg";
import logoHalfColour from "@/assets/logo/CR-Logo-Half-Colour.svg";
import logoHalfWhite from "@/assets/logo/CR-Logo-Half-White.svg";
import logoIcon from "@/assets/logo/cr-icon-colour.svg";

type Variant = "colour" | "dark" | "half-colour" | "white" | "icon";

interface LogoProps {
  className?: string;
  variant?: Variant;
  alt?: string;
}

const SRC: Record<Variant, string> = {
  colour: logoFullColour,
  dark: logoFullDark,
  "half-colour": logoHalfColour,
  white: logoHalfWhite,
  icon: logoIcon,
};

/** Full Create Racket logo (SVG from the brand kit). */
export function Wordmark({ className, variant = "colour", alt = "Create Racket" }: LogoProps) {
  return <img src={SRC[variant]} alt={alt} className={cn("h-8 w-auto select-none", className)} />;
}

/** Compact inline logo for headers. */
export function WordmarkInline({ className }: { className?: string }) {
  return <Wordmark variant="colour" className={cn("h-7 w-auto", className)} />;
}
