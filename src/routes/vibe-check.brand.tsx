import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vibe-check/brand")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
