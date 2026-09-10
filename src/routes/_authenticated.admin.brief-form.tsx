import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const Panel = lazy(() => import("@/components/admin/BriefFormAdmin").then((m) => ({ default: m.BriefFormAdmin })));

export const Route = createFileRoute("/_authenticated/admin/brief-form")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <Panel />
    </Suspense>
  );
}
