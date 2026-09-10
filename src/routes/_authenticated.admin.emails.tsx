import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";

const Panel = lazy(() => import("@/components/admin/EmailsAdmin").then((m) => ({ default: m.EmailsAdmin })));

export const Route = createFileRoute("/_authenticated/admin/emails")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <Panel />
    </Suspense>
  );
}
