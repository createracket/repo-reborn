import { createFileRoute } from "@tanstack/react-router";
import { reportFeed } from "@/lib/data-feeds.server";

export const Route = createFileRoute("/report/$slug/detailed.json")({
  server: {
    handlers: {
      GET: ({ params, request }) => reportFeed(params.slug, "json", true, new URL(request.url).searchParams.get("key")),
    },
  },
});
