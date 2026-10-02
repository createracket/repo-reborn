import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";
import { TalentIntakePanel } from "@/components/admin/TalentIntakePanel";

const AdminLegacyTabs = lazy(() =>
  import("@/components/admin/AdminLegacyTabs").then((m) => ({ default: m.AdminLegacyTabs })),
);

export const Route = createFileRoute("/_authenticated/admin/spotlights/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <TalentIntakePanel />
      <AdminLegacyTabs tab="spotlights" />
    </Suspense>
  );
}
