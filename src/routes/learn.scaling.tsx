import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Gauge, TrendingUp, Cpu } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/scaling")({
  head: () => ({
    meta: [
      { title: "Parameters & Scaling — Latent" },
      { name: "description", content: "Scaling laws made tangible. Move the parameter slider and watch loss, FLOPs, and capabilities respond." },
      { property: "og:title", content: "Parameters & Scaling" },
      { property: "og:description", content: "What changes when you go from 1B to 1T." },
    ],
  }),
  component: Page,
});

const LANDMARKS = [
  { p: 0.117, name: "GPT-2 small" },
  { p: 1.5, name: "GPT-2 XL" },
  { p: 7, name: "Llama-7B" },
  { p: 70, name: "Llama-70B" },
  { p: 175, name: "GPT-3" },
  { p: 1000, name: "Frontier ~1T" },
];

function Page() {
  const [params, setParams] = useState(7); // billions
  const [tokens, setTokens] = useState(2000); // billions

  // Chinchilla-ish: optimal tokens ≈ 20 × params (B)
  const optimalTokens = params * 20;
  const lossProxy = useMemo(() => {
    // toy power-law: L = 1.69 + 0.5 / N^0.34 + 0.4 / D^0.28
    const N = params * 1e9;
    const D = tokens * 1e9;
    return 1.69 + 0.5 / Math.pow(N, 0.095) + 0.4 / Math.pow(D, 0.085);
  }, [params, tokens]);
  const flops = 6 * params * 1e9 * tokens * 1e9; // 6ND
  const compute = flops / 1e21; // ZFLOPs

  const curve = useMemo(() => {
    const pts = [];
    for (let i = -1; i <= 3.5; i += 0.1) {
      const n = Math.pow(10, i); // B params
      const N = n * 1e9;
      const D = n * 20 * 1e9;
      const l = 1.69 + 0.5 / Math.pow(N, 0.095) + 0.4 / Math.pow(D, 0.085);
      pts.push({ n, l });
    }
    return pts;
  }, []);

  const xMin = -1, xMax = 3.5;
  const yMin = 1.7, yMax = 3.0;
  const W = 600, H = 260;
  const px = (x: number) => ((x - xMin) / (xMax - xMin)) * (W - 60) + 50;
  const py = (y: number) => H - 30 - ((y - yMin) / (yMax - yMin)) * (H - 60);

  const path = curve.map((p, i) => `${i ? "L" : "M"} ${px(Math.log10(p.n))} ${py(p.l)}`).join(" ");

  return (
    <ModuleLayout
      eyebrow="Module 13"
      title="The scaling laws of intelligence"
      description="As you grow parameters and data together, loss falls on a power-law curve — and new abilities appear at predictable thresholds."
      prev={{ to: "/learn/fine-tuning", label: "Fine-Tuning" }}
      next={{ to: "/learn/limitations", label: "Limitations" }}
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        {/* Curve */}
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-aurora" /> Loss vs. parameters (log-log)
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full h-auto">
            <defs>
              <linearGradient id="curveG" x1="0" x2="1">
                <stop offset="0" stopColor="oklch(0.66 0.21 285)" />
                <stop offset="1" stopColor="oklch(0.72 0.24 330)" />
              </linearGradient>
            </defs>
            {/* axes */}
            <line x1={50} y1={H - 30} x2={W - 10} y2={H - 30} stroke="oklch(1 0 0 / 0.15)" />
            <line x1={50} y1={20} x2={50} y2={H - 30} stroke="oklch(1 0 0 / 0.15)" />
            {/* gridlines */}
            {[-1, 0, 1, 2, 3].map((x) => (
              <g key={x}>
                <line x1={px(x)} y1={20} x2={px(x)} y2={H - 30} stroke="oklch(1 0 0 / 0.06)" />
                <text x={px(x)} y={H - 12} fontSize="10" fill="oklch(0.7 0 0)" textAnchor="middle">
                  10^{x} B
                </text>
              </g>
            ))}
            {/* curve */}
            <path d={path} stroke="url(#curveG)" strokeWidth={2.5} fill="none" />
            {/* landmarks */}
            {LANDMARKS.map((m) => {
              const N = m.p * 1e9;
              const D = m.p * 20 * 1e9;
              const l = 1.69 + 0.5 / Math.pow(N, 0.095) + 0.4 / Math.pow(D, 0.085);
              return (
                <g key={m.name}>
                  <circle cx={px(Math.log10(m.p))} cy={py(l)} r={3} fill="oklch(0.72 0.24 330)" />
                  <text x={px(Math.log10(m.p)) + 6} y={py(l) - 4} fontSize="9" fill="oklch(0.85 0 0)">
                    {m.name}
                  </text>
                </g>
              );
            })}
            {/* current */}
            <circle cx={px(Math.log10(params))} cy={py(lossProxy)} r={6} fill="oklch(0.78 0.15 210)" stroke="white" strokeWidth={1.5} />
          </svg>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-muted-foreground">
              Parameters: <span className="text-foreground">{params < 1 ? `${(params * 1000).toFixed(0)}M` : `${params}B`}</span>
              <input
                type="range"
                min={0.1}
                max={1500}
                step={0.1}
                value={params}
                onChange={(e) => setParams(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Training tokens: <span className="text-foreground">{tokens}B</span>{" "}
              <span className="text-[10px]">(optimal: {optimalTokens.toFixed(0)}B)</span>
              <input
                type="range"
                min={10}
                max={20000}
                step={10}
                value={tokens}
                onChange={(e) => setTokens(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 content-start">
          {[
            { label: "Validation loss (proxy)", value: lossProxy.toFixed(3) },
            { label: "Compute (FLOPs ≈ 6ND)", value: `${compute.toFixed(1)} ZFLOPs` },
            { label: "Memory at fp16", value: `${(params * 2).toFixed(1)} GB` },
            { label: "Inference cost / 1M tok", value: `$${(params * 0.15).toFixed(2)}` },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="glass rounded-2xl p-5 flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="text-xl font-semibold tracking-tight text-gradient tabular-nums">{s.value}</span>
            </motion.div>
          ))}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" /> Chinchilla rule
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              For a fixed compute budget, train on roughly <span className="font-mono">20 tokens per parameter</span>. Most pre-2022 models were over-parameterized and under-fed.
            </p>
          </div>
        </div>
      </div>

      {/* Emergent abilities */}
      <div className="mt-12">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" /> Emergent abilities
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">Capabilities don't fade in — they unlock.</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { p: "~1B", c: "Fluent grammar" },
            { p: "~10B", c: "Basic instruction following" },
            { p: "~50B", c: "Few-shot reasoning" },
            { p: "~100B+", c: "Tool use, chain-of-thought" },
          ].map((e, i) => (
            <motion.div
              key={e.p}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="font-mono text-xs text-muted-foreground">{e.p}</div>
              <div className="mt-2 font-medium">{e.c}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
