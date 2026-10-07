import { createFileRoute } from "@tanstack/react-router";
import { rosterFeed } from "@/lib/data-feeds.server";

export const Route = createFileRoute("/roster/$slug/creators.json")({
  server: { handlers: { GET: ({ params }) => rosterFeed(params.slug, "json") } },
});
