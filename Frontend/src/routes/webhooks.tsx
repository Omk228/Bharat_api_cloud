import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/webhooks")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/webhooks" });
  },
  component: () => null,
});
