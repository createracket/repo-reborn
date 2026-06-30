import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/fan-signup")({
  beforeLoad: () => {
    throw redirect({ to: "/signup" });
  },
});
