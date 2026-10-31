import { createFileRoute } from "@tanstack/react-router";
import Game from "@/components/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Stop the Fire! — 3D fire-safety minigame" },
      {
        name: "description",
        content: "Run, jump and grab the right extinguisher before the fire spreads. A fast 3D fire-safety game for high-school students.",
      },
      { property: "og:title", content: "Stop the Fire! — 3D fire-safety minigame" },
      { property: "og:description", content: "Pick the right tool for each fire — or get out before the exit is blocked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
