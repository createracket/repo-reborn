import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyTabPath } from "@/components/admin/admin-tabs";

/** `/admin` (and old `?tab=` links) land on the matching tab route. */
export const Route = createFileRoute("/_authenticated/admin/")({
  validateSearch: (search: Record<string, unknown>): { tab?: string; edit?: string } => ({
    ...(typeof search.tab === "string" ? { tab: search.tab } : {}),
    ...(typeof search.edit === "string" ? { edit: search.edit } : {}),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: legacyTabPath(search.tab),
      search: search.edit ? { edit: search.edit } : undefined,
    } as never);
  },
});
