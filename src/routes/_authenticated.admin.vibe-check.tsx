import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const Panel = lazy(() => import("@/components/admin/VibeCheckAdmin").then((m) => ({ default: m.VibeCheckAdmin })));

export const Route = createFileRoute("/_authenticated/admin/vibe-check")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <Panel />
    </Suspense>
  );
}
