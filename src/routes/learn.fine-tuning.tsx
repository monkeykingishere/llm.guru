import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Sparkles, Wand2, Layers, GraduationCap } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/fine-tuning")({
  head: () => ({
    meta: [
      { title: "Fine-Tuning — Latent" },
      {
        name: "description",
        content:
          "From a generalist base model to a specialist — SFT, LoRA, and DPO explained with an interactive cost calculator.",
      },
      { property: "og:title", content: "Fine-Tuning" },
      {
        property: "og:description",
        content: "Bend a base model to a specific shape without breaking it.",
      },
    ],
  }),
  component: Page,
});

const METHODS = [
  {
    id: "sft",
    name: "Supervised Fine-Tuning",
    badge: "SFT",
    color: "from-violet-500 to-fuchsia-500",
    body: "Teach the model by example. You provide input/output pairs and update every weight. Powerful but expensive.",
    params: 1.0,
    quality: 0.95,
  },
  {
    id: "lora",
    name: "LoRA (Low-Rank Adapters)",
    badge: "LoRA",
    color: "from-cyan-400 to-violet-500",
    body: "Freeze the base; learn a tiny pair of low-rank matrices per layer. 100×–1000× fewer trainable params.",
    params: 0.003,
    quality: 0.9,
  },
  {
    id: "qlora",
    name: "QLoRA",
    badge: "QLoRA",
    color: "from-emerald-400 to-cyan-500",
    body: "LoRA on top of a 4-bit quantized base. Lets you fine-tune a 70B model on a single consumer GPU.",
    params: 0.003,
    quality: 0.88,
  },
  {
    id: "dpo",
    name: "Direct Preference Optimization",
    badge: "DPO",
    color: "from-amber-400 to-rose-500",
    body: "Show pairs of preferred vs. rejected answers. Optimizes the model directly without a reward model.",
    params: 1.0,
    quality: 0.93,
  },
] as const;

function Page() {
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("lora");
  const [base, setBase] = useState(7); // billions
  const [examples, setExamples] = useState(2000);
  const [epochs, setEpochs] = useState(3);

  const m = useMemo(() => METHODS.find((x) => x.id === method)!, [method]);

  // Toy cost model
  const trainableB = base * m.params;
  const gpuHours = Math.max(
    0.5,
    (examples / 1000) * epochs * Math.sqrt(base) * (m.params === 1 ? 4 : 0.4),
  );
  const cost = gpuHours * 2.5; // $/h H100

  return (
    <ModuleLayout
      eyebrow="Module 12"
      title="Fine-Tuning, without breaking the base"
      description="Pre-training builds a generalist. Fine-tuning makes it yours — your tone, your tasks, your taxonomy. Pick the right method and the cost can fall by three orders of magnitude."
      prev={{ to: "/learn/training-process", label: "Training Process" }}
      next={{ to: "/learn/scaling", label: "Parameters & Scaling" }}
    >
      {/* Methods */}
      <div className="grid gap-4 md:grid-cols-2">
        {METHODS.map((opt, i) => (
          <motion.button
            key={opt.id}
            onClick={() => setMethod(opt.id)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all glass hover:-translate-y-0.5 ${
              method === opt.id ? "ring-2 ring-white/30 bg-white/[0.05]" : ""
            }`}
          >
            <div
              className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${opt.color} opacity-25 blur-2xl`}
            />
            <div className="relative flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {opt.badge}
              </span>
              <Wand2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="relative mt-3 text-lg font-semibold">{opt.name}</h3>
            <p className="relative mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {opt.body}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Calculator */}
      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr,1.1fr]">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-aurora" /> Cost calculator
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight">
            Try the math on <span className="text-gradient">{m.name}</span>
          </h3>

          <div className="mt-6 space-y-5">
            <label className="block text-xs text-muted-foreground">
              Base model size: <span className="text-foreground">{base}B parameters</span>
              <input
                type="range"
                min={1}
                max={70}
                value={base}
                onChange={(e) => setBase(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Training examples:{" "}
              <span className="text-foreground">{examples.toLocaleString()}</span>
              <input
                type="range"
                min={200}
                max={50000}
                step={100}
                value={examples}
                onChange={(e) => setExamples(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Epochs: <span className="text-foreground">{epochs}</span>
              <input
                type="range"
                min={1}
                max={10}
                value={epochs}
                onChange={(e) => setEpochs(+e.target.value)}
                className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              label: "Trainable parameters",
              value: `${trainableB < 0.1 ? (trainableB * 1000).toFixed(1) + "M" : trainableB.toFixed(1) + "B"}`,
            },
            { label: "Estimated GPU-hours (H100)", value: gpuHours.toFixed(1) + "h" },
            { label: "Approx. compute cost", value: "$" + cost.toFixed(0) },
            { label: "Expected quality retention", value: `${Math.round(m.quality * 100)}%` },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="glass rounded-2xl p-5 flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="text-2xl font-semibold tracking-tight text-gradient">{s.value}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Workflow */}
      <div className="mt-16">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" /> The fine-tuning flow
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          From base to bespoke in five steps.
        </h3>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {[
            {
              n: "01",
              t: "Curate",
              d: "Gather hundreds to thousands of clean prompt/response pairs.",
            },
            {
              n: "02",
              t: "Format",
              d: "Convert to a consistent template the model already understands.",
            },
            {
              n: "03",
              t: "Train",
              d: "Run SFT or LoRA with a small learning rate and few epochs.",
            },
            {
              n: "04",
              t: "Evaluate",
              d: "Holdout set + human spot-check. Watch for capability loss.",
            },
            { n: "05", t: "Align", d: "Optional DPO pass to push toward preferred behaviors." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
              <div className="mt-2 font-medium">{s.t}</div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-12 glass-strong rounded-3xl p-8 flex items-start gap-4">
        <Layers className="h-5 w-5 text-aurora mt-1" />
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          A good rule of thumb: start with prompting, escalate to RAG when you need knowledge, and
          only fine-tune when you need a new <em>behavior</em>. Fine-tuning teaches style; retrieval
          teaches facts.
        </p>
      </div>
    </ModuleLayout>
  );
}
