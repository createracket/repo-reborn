import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const Panel = lazy(() => import("@/components/admin/FaqsAdmin").then((m) => ({ default: m.FaqsAdmin })));

export const Route = createFileRoute("/_authenticated/admin/faqs")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <Panel />
    </Suspense>
  );
}
