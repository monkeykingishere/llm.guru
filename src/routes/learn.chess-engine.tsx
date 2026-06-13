import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ChessEngineLab } from "@/components/modules/ChessEngineLab";

export const Route = createFileRoute("/learn/chess-engine")({
  head: () => ({
    meta: [
      { title: "Chess Engine Thinking Lab — Latent" },
      {
        name: "description",
        content:
          "An interactive visualization showing how a chess engine searches candidate moves. Watch Minimax decision making, explore Alpha-Beta pruning, and inspect evaluation telemetry.",
      },
      { property: "og:title", content: "Chess Engine Thinking Lab — Latent" },
      {
        property: "og:description",
        content: "See how engines evaluate millions of possibilities before choosing a move.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 16 · Chess Engine"
        title="Chess Engine Thinking Lab"
        description="See how engines evaluate millions of possibilities before choosing a move. Explore Minimax search trees, toggle Alpha-Beta pruning, and inspect positional evaluation functions in real time."
        prev={{ to: "/learn/safety", label: "Safety & Ethics" }}
      >
        <ChessEngineLab />
      </ModuleLayout>
    </PageShell>
  );
}
