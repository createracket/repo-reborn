import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vibe-check/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
