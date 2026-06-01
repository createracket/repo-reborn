import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * The "CREATE RACKET" wordmark. Display font (Bungee) with a lime → coral
 * gradient on the second word so it reads like a sticker / patch.
 */
export function Wordmark({ className, size = "md" }: WordmarkProps) {
  const sizeClass = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl md:text-5xl",
    xl: "text-6xl md:text-7xl lg:text-8xl",
  }[size];

  return (
    <span className={cn("font-display leading-none inline-flex flex-col", sizeClass, className)}>
      <span className="text-foreground">CREATE</span>
      <span className="text-gradient-racket -mt-1">RACKET</span>
    </span>
  );
}

/** Compact inline version for the header. */
export function WordmarkInline({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-xl tracking-tight", className)}>
      <span className="text-foreground">CREATE</span>
      <span className="text-gradient-racket ml-1">RACKET</span>
    </span>
  );
}
