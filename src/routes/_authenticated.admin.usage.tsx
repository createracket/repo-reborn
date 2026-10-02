import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";
import { SavedTrendsAdmin } from "@/components/admin/SavedTrendsAdmin";

const Panel = lazy(() => import("@/components/admin/UsageAdmin").then((m) => ({ default: m.UsageAdmin })));

export const Route = createFileRoute("/_authenticated/admin/usage")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <div className="space-y-6">
        <SavedTrendsAdmin />
        <Panel />
      </div>
    </Suspense>
  );
}
