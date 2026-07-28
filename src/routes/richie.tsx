import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/richie")({
  beforeLoad: () => {
    throw redirect({ to: "/chefs/richie-million-jr" });
  },
});
