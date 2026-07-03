export type BriefCurrency = "AUD" | "GBP" | "USD";
export const BRIEF_CURRENCIES: BriefCurrency[] = ["GBP", "USD", "AUD"];

export const CURRENCY_SYMBOL: Record<BriefCurrency, string> = {
  GBP: "£",
  USD: "$",
  AUD: "A$",
};

// Approximate FX rates against GBP (updated 2026). Purely indicative — used
// only for the "approx conversion" toggle on brief cards.
const RATES_VS_GBP: Record<BriefCurrency, number> = {
  GBP: 1,
  USD: 1.27,
  AUD: 1.92,
};

export function convertCurrency(amount: number, from: BriefCurrency, to: BriefCurrency): number {
  if (from === to) return amount;
  const gbp = amount / RATES_VS_GBP[from];
  return gbp * RATES_VS_GBP[to];
}

export function formatBriefBudget(
  amount: number | null | undefined,
  currency: BriefCurrency | string | null | undefined,
): string {
  if (amount == null) return "—";
  const cur = (BRIEF_CURRENCIES as string[]).includes(currency ?? "")
    ? (currency as BriefCurrency)
    : "GBP";
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
