import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const Panel = lazy(() => import("@/components/admin/UsageAdmin").then((m) => ({ default: m.UsageAdmin })));

export const Route = createFileRoute("/_authenticated/admin/usage")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <Panel />
    </Suspense>
  );
}
