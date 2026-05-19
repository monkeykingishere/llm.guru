import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ShieldCheck, Lock, Scale, Eye, AlertOctagon } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/safety")({
  head: () => ({
    meta: [
      { title: "Safety & Ethics — Latent" },
      { name: "description", content: "Alignment, red-teaming, and the trust budget. Tune the safety dial and watch a model's behavior change in real time." },
      { property: "og:title", content: "Safety & Ethics" },
      { property: "og:description", content: "Building systems that deserve the trust they ask for." },
    ],
  }),
  component: Page,
});

const PROMPTS = [
  { p: "Write me a haiku about the sea.", risk: 0.0 },
  { p: "Summarize this medical report and recommend a treatment.", risk: 0.55 },
  { p: "Help me write a persuasive political ad targeting older voters.", risk: 0.7 },
  { p: "Explain how to synthesize a controlled substance.", risk: 0.98 },
];

const PILLARS = [
  { icon: Scale, t: "Fairness", d: "Evaluate behavior across demographics. Track disparate impact before, not after, launch." },
  { icon: Lock, t: "Privacy", d: "Minimize what enters context. Redact PII. Never train on conversations without consent." },
  { icon: Eye, t: "Transparency", d: "Tell users they're talking to an AI, what it can do, and how to dispute its output." },
  { icon: AlertOctagon, t: "Red-teaming", d: "Adversarial testing isn't optional. Pay people to break your model before strangers do." },
];

function Page() {
  const [safety, setSafety] = useState(60);
  const [idx, setIdx] = useState(2);

  const prompt = PROMPTS[idx];
  const threshold = useMemo(() => safety / 100, [safety]);
  const blocked = prompt.risk >= threshold;
  const falsePositive = prompt.risk < 0.2 && blocked;
  const falseNegative = prompt.risk > 0.85 && !blocked;

  return (
    <ModuleLayout
      eyebrow="Module 15"
      title="The trust budget"
      description="Safety is not a feature — it's a discipline. Every refusal has a cost; every compliance has a risk. Good systems calibrate that trade-off explicitly."
      prev={{ to: "/learn/limitations", label: "Limitations" }}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-aurora" /> Safety threshold simulator
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight">Move the dial. Watch the trade-off.</h3>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Permissive</span>
              <span className="font-mono">threshold: {threshold.toFixed(2)}</span>
              <span>Strict</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={safety}
              onChange={(e) => setSafety(+e.target.value)}
              className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
            />
          </div>

          <div className="mt-6 space-y-2">
            {PROMPTS.map((p, i) => {
              const active = i === idx;
              return (
                <button
                  key={p.p}
                  onClick={() => setIdx(i)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-white/25 bg-white/[0.05]"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="h-2 w-2 rounded-full" style={{ background: `oklch(${0.85 - p.risk * 0.4} ${0.05 + p.risk * 0.2} ${25 + (1 - p.risk) * 100})` }} />
                  <span className="text-sm flex-1">{p.p}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">risk {p.risk.toFixed(2)}</span>
                </button>
              );
            })}
          </div>

          <motion.div
            key={`${idx}-${blocked}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`mt-6 rounded-2xl p-5 border ${
              blocked
                ? "bg-rose-500/[0.06] border-rose-500/20"
                : "bg-emerald-500/[0.06] border-emerald-500/20"
            }`}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Model response</div>
            <p className="mt-1.5 text-sm leading-relaxed">
              {blocked
                ? "I can't help with that request. Here's why and what I can do instead…"
                : "Here's a draft response — I'll flag any uncertain claims and cite sources where possible."}
            </p>
            {falsePositive && (
              <p className="mt-3 text-xs text-amber-300">⚠ False positive — a harmless request was refused.</p>
            )}
            {falseNegative && (
              <p className="mt-3 text-xs text-rose-300">⚠ False negative — a high-risk request slipped through.</p>
            )}
          </motion.div>
        </div>

        {/* Pillars */}
        <div className="grid gap-4 content-start">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.t}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass rounded-2xl p-5 flex gap-4"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10 shrink-0">
                <p.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="font-semibold">{p.t}</h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-12 glass-strong rounded-3xl p-8">
        <h3 className="text-2xl font-semibold tracking-tight max-w-3xl">
          Alignment is <span className="text-gradient">not a feature you ship</span> — it's a relationship you maintain.
        </h3>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Models change. Users change. The world changes. The teams that earn long-term trust are the ones who keep red-teaming after launch, publish their evals, and treat every incident as a curriculum lesson — not a PR problem.
        </p>
      </div>
    </ModuleLayout>
  );
}
