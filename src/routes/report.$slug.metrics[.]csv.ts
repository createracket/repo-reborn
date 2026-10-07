import { createFileRoute } from "@tanstack/react-router";
import { reportFeed } from "@/lib/data-feeds.server";

export const Route = createFileRoute("/report/$slug/metrics.csv")({
  server: { handlers: { GET: ({ params }) => reportFeed(params.slug, "csv", false, null) } },
});
