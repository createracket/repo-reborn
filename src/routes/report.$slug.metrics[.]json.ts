import { createFileRoute } from "@tanstack/react-router";
import { reportFeed } from "@/lib/data-feeds.server";

export const Route = createFileRoute("/report/$slug/metrics.json")({
  server: { handlers: { GET: ({ params }) => reportFeed(params.slug, "json", false, null) } },
});
