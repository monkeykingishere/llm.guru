import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/attention")({
  head: () => ({
    meta: [
      { title: "Attention — Latent" },
      {
        name: "description",
        content:
          "Interactive attention matrix. See which tokens influence which — the mechanism behind every modern LLM.",
      },
      { property: "og:title", content: "Attention — Latent" },
      {
        property: "og:description",
        content: "Visualize self-attention between tokens.",
      },
    ],
  }),
  component: Page,
});

const SENTENCES = [
  "The cat sat on the mat".split(" "),
  "Attention is all you need".split(" "),
  "Models learn to focus on context".split(" "),
];

// Hand-crafted plausible attention patterns to feel intuitive
function buildAttention(tokens: string[], head: number): number[][] {
  const n = tokens.length;
  const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      // Each head emphasizes a different pattern
      let w = 0;
      if (head === 0) {
        // Self + previous
        w = j === i ? 0.6 : j === i - 1 ? 0.3 : 0.1 / Math.max(i, 1);
      } else if (head === 1) {
        // Long-range: similar starting letter
        const same = tokens[i][0]?.toLowerCase() === tokens[j][0]?.toLowerCase();
        w = same ? 0.5 : 0.15;
      } else if (head === 2) {
        // Syntactic: nouns attend to determiners (rough heuristic)
        const determiners = new Set(["the", "a", "an"]);
        if (determiners.has(tokens[j].toLowerCase())) w = 0.6;
        else if (j === i) w = 0.3;
        else w = 0.1;
      } else {
        // Distance decay
        w = 1 / (1 + (i - j));
      }
      m[i][j] = w;
    }
    // softmax over row
    const exps = m[i].map((v) => Math.exp(v * 3));
    const sum = exps.reduce((a, b) => a + b, 0);
    m[i] = exps.map((v) => v / sum);
  }
  return m;
}

function Page() {
  const [sentIdx, setSentIdx] = useState(0);
  const [head, setHead] = useState(0);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const tokens = SENTENCES[sentIdx];
  const attention = useMemo(() => buildAttention(tokens, head), [tokens, head]);

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 08 · Attention"
        title="Every token, in conversation."
        description="Self-attention lets each token decide how much to listen to every other token. It's a soft, learned routing system — and it's the reason transformers can hold long-range context."
        prev={{ to: "/learn/embeddings", label: "Embeddings" }}
        next={{ to: "/learn/transformer", label: "Transformer" }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mr-2">
            Sentence
          </div>
          {SENTENCES.map((s, i) => (
            <button
              key={i}
              onClick={() => setSentIdx(i)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                sentIdx === i
                  ? "bg-aurora text-white"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.join(" ")}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr,320px]">
          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Attention matrix
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHead(h)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      head === h
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Head {h + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div
                className="inline-grid gap-1"
                style={{
                  gridTemplateColumns: `auto repeat(${tokens.length}, minmax(48px, 1fr))`,
                }}
              >
                <div />
                {tokens.map((t, i) => (
                  <div
                    key={i}
                    className="text-[11px] font-mono text-muted-foreground text-center pb-1"
                  >
                    {t}
                  </div>
                ))}
                {attention.map((row, i) => (
                  <Row key={i}>
                    <div
                      className={`pr-3 text-right text-[11px] font-mono whitespace-nowrap ${
                        hoverRow === i ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {tokens[i]}
                    </div>
                    {row.map((v, j) => (
                      <motion.div
                        key={j}
                        layoutId={`${head}-${sentIdx}-${i}-${j}`}
                        onMouseEnter={() => setHoverRow(i)}
                        onMouseLeave={() => setHoverRow(null)}
                        animate={{ opacity: 1 }}
                        className="aspect-square rounded-md relative overflow-hidden cursor-pointer"
                        style={{
                          background: `oklch(${0.2 + v * 0.55} ${0.05 + v * 0.2} ${
                            285 - v * 50
                          })`,
                          boxShadow:
                            v > 0.3
                              ? `0 0 ${v * 24}px oklch(0.66 0.21 285 / ${v})`
                              : undefined,
                          transition: "background .3s, box-shadow .3s",
                        }}
                      >
                        <span className="absolute inset-0 grid place-items-center text-[10px] font-mono text-white/80 tabular-nums">
                          {v < 0.05 ? "" : v.toFixed(2)}
                        </span>
                      </motion.div>
                    ))}
                  </Row>
                ))}
              </div>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              Each row is a token <em>asking</em>: "who should I pay attention
              to?" Rows sum to 1 — the brighter the cell, the stronger the
              connection.
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Q · K · V
              </div>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                Each token projects itself into three vectors: a{" "}
                <span className="text-gradient font-medium">Query</span> (what
                am I looking for?), a{" "}
                <span className="text-gradient font-medium">Key</span> (what do
                I represent?), and a{" "}
                <span className="text-gradient font-medium">Value</span> (what
                do I contribute?). Attention is the dot product of Queries and
                Keys, softmaxed, then used to weight the Values.
              </p>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Multi-head
              </div>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                Real models run this in parallel across dozens of heads. Each
                head learns a different specialty: nearby syntax, long-range
                co-reference, semantic roles, and more. Click between heads
                above to see different patterns emerge.
              </p>
            </div>
          </div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
