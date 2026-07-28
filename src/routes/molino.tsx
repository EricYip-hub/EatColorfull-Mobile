import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/molino")({
  head: () => {
    const title = "Molino — Neapolitan Pizza Pop-Up | Chef Moshe Fhima";
    const desc =
      "A one-day Neapolitan pizza pop-up by Chef Moshe Fhima. Wednesday, June 3, 2026 — 12:30 to 4:30 PM. Pre-order Margherita and La Bianca pizzas with optional add-ons.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: "https://www.eatcolorfull.com/molino" },
      ],
      links: [
        { rel: "canonical", href: "https://www.eatcolorfull.com/molino-pizza-pop-up" },
      ],
    };
  },
  beforeLoad: () => {
    throw redirect({ to: "/molino-pizza-pop-up" });
  },
});
