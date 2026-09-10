import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const AdminLegacyTabs = lazy(() =>
  import("@/components/admin/AdminLegacyTabs").then((m) => ({ default: m.AdminLegacyTabs })),
);

export const Route = createFileRoute("/_authenticated/admin/spotlights")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } =>
    typeof search.edit === "string" ? { edit: search.edit } : {},
  component: Page,
});

function Page() {
  const { edit } = Route.useSearch();
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <AdminLegacyTabs tab="spotlights" editSlug={edit} />
    </Suspense>
  );
}
