import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/positional-encoding")({
  head: () => ({
    meta: [
      { title: "Positional Encoding — Latent" },
      {
        name: "description",
        content:
          "Visualize the sinusoidal patterns that give a permutation-invariant transformer a sense of order.",
      },
      { property: "og:title", content: "Positional Encoding — Latent" },
      {
        property: "og:description",
        content: "Interactive sinusoidal positional encoding heatmap.",
      },
    ],
  }),
  component: Page,
});

function encoding(pos: number, dim: number, dModel: number): number {
  const i = Math.floor(dim / 2);
  const denom = Math.pow(10000, (2 * i) / dModel);
  return dim % 2 === 0 ? Math.sin(pos / denom) : Math.cos(pos / denom);
}

function Page() {
  const [seqLen, setSeqLen] = useState(32);
  const [dModel, setDModel] = useState(48);
  const [highlightDim, setHighlightDim] = useState<number | null>(null);

  const matrix = useMemo(() => {
    const m: number[][] = [];
    for (let p = 0; p < seqLen; p++) {
      const row: number[] = [];
      for (let d = 0; d < dModel; d++) row.push(encoding(p, d, dModel));
      m.push(row);
    }
    return m;
  }, [seqLen, dModel]);

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 04 · Positional Encoding"
        title="Order, encoded as waves."
        description="Attention by itself treats a sequence as a bag of tokens. To restore order, we add a unique pattern of sines and cosines to each position — a signature the model can decode."
        prev={{ to: "/learn/embeddings", label: "Embeddings" }}
        next={{ to: "/learn/neural-network", label: "Neural Networks" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,320px]">
          <div className="glass-strong rounded-3xl p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Encoding matrix · {seqLen} positions × {dModel} dimensions
            </div>
            <div
              className="grid gap-[1px]"
              style={{
                gridTemplateColumns: `repeat(${dModel}, minmax(0, 1fr))`,
              }}
            >
              {matrix.flatMap((row, p) =>
                row.map((v, d) => {
                  const intensity = (v + 1) / 2; // 0..1
                  return (
                    <motion.div
                      key={`${p}-${d}`}
                      onMouseEnter={() => setHighlightDim(d)}
                      onMouseLeave={() => setHighlightDim(null)}
                      className="aspect-square"
                      style={{
                        background:
                          v >= 0
                            ? `oklch(${0.4 + intensity * 0.45} ${0.1 + intensity * 0.2} 285)`
                            : `oklch(${0.4 + (1 - intensity) * 0.45} ${0.1 + (1 - intensity) * 0.2} 330)`,
                        opacity: highlightDim === null ? 1 : highlightDim === d ? 1 : 0.25,
                        transition: "opacity .25s",
                      }}
                    />
                  );
                }),
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>position 0 →</span>
              <span>dim 0 → {dModel - 1}</span>
            </div>
          </div>

          <div className="space-y-4">
            <Slider label="Sequence length" value={seqLen} min={8} max={64} onChange={setSeqLen} />
            <Slider
              label="Model dimension"
              value={dModel}
              min={16}
              max={96}
              step={4}
              onChange={setDModel}
            />
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                The formula
              </div>
              <div className="mt-3 space-y-1 font-mono text-[13px] text-foreground/80">
                <div>PE(p, 2i) = sin(p / 10000^(2i/d))</div>
                <div>PE(p, 2i+1) = cos(p / 10000^(2i/d))</div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Low-frequency waves capture coarse position, high-frequency waves capture fine
                position. Their combination gives every position a unique fingerprint — and the
                relative distance between any two positions stays expressible as a linear rotation.
              </p>
            </div>
          </div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="text-sm font-mono text-gradient">{value}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="mt-3 w-full accent-[color:var(--glow-violet)]"
      />
    </div>
  );
}
