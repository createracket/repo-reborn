import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const AdminLegacyTabs = lazy(() =>
  import("@/components/admin/AdminLegacyTabs").then((m) => ({ default: m.AdminLegacyTabs })),
);

export const Route = createFileRoute("/_authenticated/admin/spotlights")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } =>
    typeof search.edit === "string" ? { edit: search.edit } : {},
  beforeLoad: ({ search }) => {
    // Old deep links (?edit=<slug>) now open the dedicated editor page.
    if (search.edit) {
      throw redirect({ to: "/admin/spotlights/edit/$key", params: { key: search.edit }, replace: true });
    }
  },
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <AdminLegacyTabs tab="spotlights" />
    </Suspense>
  );
}
