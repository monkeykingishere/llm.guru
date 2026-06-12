import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { GitBranch, Database, ScrollText } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/context-window")({
  head: () => ({
    meta: [
      { title: "Context Window — Latent" },
      {
        name: "description",
        content:
          "Why models forget, what the KV-cache really costs, and how techniques like RAG and sliding windows extend memory.",
      },
      { property: "og:title", content: "Context Window" },
      { property: "og:description", content: "Visualize the memory limits of a language model." },
    ],
  }),
  component: Page,
});

const PRESETS = [
  { name: "GPT-2", ctx: 1024 },
  { name: "GPT-3.5", ctx: 4096 },
  { name: "GPT-4", ctx: 8192 },
  { name: "Claude 2", ctx: 100_000 },
  { name: "Gemini 1.5", ctx: 1_000_000 },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

function Page() {
  const [ctx, setCtx] = useState(8192);
  const [used, setUsed] = useState(2400);
  const [layers, setLayers] = useState(32);
  const [dim, setDim] = useState(4096);

  // KV cache bytes: 2 (K+V) * layers * ctx * dim * 2 bytes (fp16)
  const kvBytes = useMemo(() => 2 * layers * ctx * dim * 2, [ctx, layers, dim]);
  const kvGb = kvBytes / 1024 ** 3;

  const pct = Math.min(100, (used / ctx) * 100);
  const overflow = used > ctx;

  return (
    <PageShell>
      <ModuleLayout
      eyebrow="Module 09"
      title="The shape of a model's memory"
      description="A model only sees what fits in its context window. Stretch it too far and the cost — in compute and in coherence — explodes."
      prev={{ to: "/learn/attention", label: "Attention" }}
      next={{ to: "/learn/prediction", label: "Prediction Process" }}
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        {/* Visualization */}
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5 text-aurora" /> Context budget
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {fmt(used)} / {fmt(ctx)} tokens
            </div>
          </div>

          <div className="mt-6 h-3 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
              className={`h-full ${overflow ? "bg-rose-500" : "bg-aurora"}`}
            />
          </div>

          {/* Token grid */}
          <div
            className="mt-6 grid grid-cols-32 gap-[3px]"
            style={{ gridTemplateColumns: "repeat(32, minmax(0,1fr))" }}
          >
            {Array.from({ length: 32 * 6 }).map((_, i) => {
              const frac = i / (32 * 6);
              const filled = frac < used / ctx;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-[2px] ${
                    filled ? "bg-aurora/70" : "bg-white/[0.04]"
                  }`}
                />
              );
            })}
          </div>

          {overflow && (
            <p className="mt-4 text-sm text-rose-300">
              ⚠ The prompt no longer fits. The model will truncate — and the dropped tokens vanish
              from memory entirely.
            </p>
          )}

          {/* Preset chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setCtx(p.ctx);
                  setUsed(Math.min(used, p.ctx));
                }}
                className={`rounded-full px-3 py-1.5 text-xs ring-1 transition-all ${
                  ctx === p.ctx
                    ? "bg-aurora/30 ring-white/30"
                    : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.08]"
                }`}
              >
                {p.name} · {fmt(p.ctx)}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Used tokens: <span className="text-foreground">{fmt(used)}</span>
              <input
                type="range"
                min={0}
                max={ctx}
                step={Math.max(1, Math.floor(ctx / 200))}
                value={used}
                onChange={(e) => setUsed(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
          </div>
        </div>

        {/* KV cache cost */}
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Database className="h-3.5 w-3.5 text-aurora" /> The hidden price
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight">KV-cache memory</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Attention needs to remember the keys and values of every past token. Memory scales with{" "}
            <span className="font-mono">layers × dim × ctx</span>.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-xs text-muted-foreground">
              Layers: <span className="text-foreground">{layers}</span>
              <input
                type="range"
                min={8}
                max={96}
                value={layers}
                onChange={(e) => setLayers(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Hidden dim: <span className="text-foreground">{dim}</span>
              <input
                type="range"
                min={1024}
                max={12288}
                step={256}
                value={dim}
                onChange={(e) => setDim(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Memory at {fmt(ctx)} tokens (fp16)
            </div>
            <div className="mt-2 text-4xl font-semibold tracking-tight text-gradient">
              {kvGb < 1 ? `${(kvGb * 1024).toFixed(0)} MB` : `${kvGb.toFixed(1)} GB`}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              This is per request. At a million tokens, an 80GB H100 is the floor, not the ceiling.
            </p>
          </div>
        </div>
      </div>

      {/* Strategies */}
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: GitBranch,
            title: "Sliding window",
            body: "Keep only the last N tokens; old ones fall off the edge. Cheap, lossy.",
          },
          {
            icon: Database,
            title: "Retrieval (RAG)",
            body: "Fetch relevant chunks from a vector store and inject them. Effectively unbounded memory.",
          },
          {
            icon: ScrollText,
            title: "Summarization",
            body: "Compress old turns into a running summary. Trades fidelity for survival.",
          },
        ].map((s) => (
          <div key={s.title} className="glass rounded-2xl p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <h4 className="mt-4 font-semibold">{s.title}</h4>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
      </ModuleLayout>
    </PageShell>
  );
}
