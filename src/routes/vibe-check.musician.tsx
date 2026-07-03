import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vibe-check/musician")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});

