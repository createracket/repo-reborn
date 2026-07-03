import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  BRIEF_CURRENCIES,
  type BriefCurrency,
  convertCurrency,
  formatBriefBudget,
} from "@/lib/brief-currency";

export function BudgetDisplay({
  amount,
  currency,
  className = "",
}: {
  amount: number | null | undefined;
  currency: string | null | undefined;
  className?: string;
}) {
  const original = (BRIEF_CURRENCIES as string[]).includes(currency ?? "")
    ? (currency as BriefCurrency)
    : "GBP";
  const [display, setDisplay] = useState<BriefCurrency>(original);

  if (amount == null) return <span className={className}>—</span>;

  const value = convertCurrency(amount, original, display);
  const isConverted = display !== original;

  function cycle() {
    const i = BRIEF_CURRENCIES.indexOf(display);
    setDisplay(BRIEF_CURRENCIES[(i + 1) % BRIEF_CURRENCIES.length]);
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>
        {formatBriefBudget(value, display)}
        {isConverted ? (
          <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            ≈ from {original}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={cycle}
        title="Approximate conversion"
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
      >
        <ArrowLeftRight className="h-2.5 w-2.5" /> Convert
      </button>
    </span>
  );
}
