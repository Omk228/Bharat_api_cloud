import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/test-api")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/test-api" });
  },
  component: () => null,
});
