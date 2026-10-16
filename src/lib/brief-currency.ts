export type BriefCurrency = "USD" | "AUD" | "GBP" | "NZD";
export const BRIEF_CURRENCIES: BriefCurrency[] = ["AUD", "USD", "GBP", "NZD"];

/** Rates and budgets are quoted in Australian dollars unless a brief says otherwise. */
export const DEFAULT_BRIEF_CURRENCY: BriefCurrency = "AUD";

export const CURRENCY_SYMBOL: Record<BriefCurrency, string> = {
  AUD: "$",
  USD: "US$",
  GBP: "£",
  NZD: "NZ$",
};

// Approximate FX rates against AUD (updated 2026). Purely indicative — used
// only for the "approx conversion" toggle on brief cards.
const RATES_VS_AUD: Record<BriefCurrency, number> = {
  AUD: 1,
  USD: 0.66,
  GBP: 0.52,
  NZD: 1.09,
};

export function convertCurrency(amount: number, from: BriefCurrency, to: BriefCurrency): number {
  if (from === to) return amount;
  const aud = amount / RATES_VS_AUD[from];
  return aud * RATES_VS_AUD[to];
}

export function formatBriefBudget(
  amount: number | null | undefined,
  currency: BriefCurrency | string | null | undefined,
): string {
  if (amount == null) return "—";
  const cur = (BRIEF_CURRENCIES as string[]).includes(currency ?? "")
    ? (currency as BriefCurrency)
    : DEFAULT_BRIEF_CURRENCY;
  const rounded = Math.round(amount);
  return `${CURRENCY_SYMBOL[cur]}${rounded.toLocaleString()}`;
}

export const TRANSPARENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "early_planning", label: "Early planning phase" },
  { value: "budget_pending", label: "Budget pending" },
  { value: "locked_in", label: "Everything's locked in" },
  { value: "live", label: "Live and kicking" },
];

export function transparencyLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return TRANSPARENCY_OPTIONS.find((o) => o.value === value)?.label ?? null;
}
