import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const AdminLegacyTabs = lazy(() =>
  import("@/components/admin/AdminLegacyTabs").then((m) => ({ default: m.AdminLegacyTabs })),
);

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <AdminLegacyTabs tab="users" />
    </Suspense>
  );
}
