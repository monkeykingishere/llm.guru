import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Goal, AlertTriangle, Calculator, Clock, Globe2, Brain } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/limitations")({
  head: () => ({
    meta: [
      { title: "Limitations — Latent" },
      {
        name: "description",
        content:
          "Hallucinations, arithmetic, knowledge cutoffs and the rest. The honest list — with interactive examples.",
      },
      { property: "og:title", content: "Limitations" },
      { property: "og:description", content: "An honest tour of where LLMs still fall short." },
    ],
  }),
  component: Page,
});

const CASES = [
  {
    id: "halluc",
    icon: AlertTriangle,
    title: "Hallucination",
    prompt: "Who won the 1923 Nobel Prize in Literature?",
    bad: "The 1923 Nobel Prize in Literature was awarded to Marcel Proust for 'In Search of Lost Time'.",
    good: "It was W. B. Yeats, 'for his always inspired poetry, which in a highly artistic form gives expression to the spirit of a whole nation.'",
    why: "Confident fabrication. The model averaged across plausible candidates rather than retrieving the actual fact.",
  },
  {
    id: "math",
    icon: Calculator,
    title: "Arithmetic at scale",
    prompt: "What is 8473 × 9264?",
    bad: "78,514,272",
    good: "78,512,272 — and even this should be verified with a calculator. Token-level prediction is the wrong tool for exact arithmetic.",
    why: "Each digit is a separate token. Long carries compound errors; tool use (a Python sandbox) fixes it instantly.",
  },
  {
    id: "cutoff",
    icon: Clock,
    title: "Knowledge cutoff",
    prompt: "Who is the current Prime Minister of the UK?",
    bad: "Rishi Sunak.",
    good: "I don't know anything that happened after my training cutoff. To get a reliable answer, query a live source or enable browsing.",
    why: "Weights are frozen at training time. Without retrieval, models drift further from reality every month.",
  },
  {
    id: "bias",
    icon: Globe2,
    title: "Cultural & data bias",
    prompt: "Describe a typical wedding.",
    bad: "A white dress, a church, a cake-cutting — vows, rings, a first dance.",
    good: "Weddings vary enormously by culture — colors, locations, rituals and durations differ. Without context, default answers tend to over-represent the training distribution.",
    why: "The model reflects the corpus. English-web data over-weights certain regions, eras and demographics.",
  },
  {
    id: "reason",
    icon: Brain,
    title: "Brittle reasoning",
    prompt:
      "If a bat and ball cost $1.10 and the bat costs $1 more than the ball, how much is the ball?",
    bad: "10 cents.",
    good: "5 cents. (Bat is $1.05, ball is $0.05.) Most humans get this wrong too — and so do small LLMs unless asked to think step by step.",
    why: "Without an explicit chain of thought, the model jumps to the lexically obvious answer.",
  },
];

function Page() {
  const [open, setOpen] = useState<string>("halluc");

  return (
    <PageShell>
      <ModuleLayout
      eyebrow="Module 14"
      title="The honest list"
      description="Knowing where a model breaks is more useful than knowing where it shines. Click any case to see the failure, the fix, and why it happens."
      prev={{ to: "/learn/scaling", label: "Parameters & Scaling" }}
      next={{ to: "/learn/safety", label: "Safety & Ethics" }}
    >
      <div className="grid gap-3">
        {CASES.map((c, i) => {
          const isOpen = open === c.id;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="glass rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? "" : c.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.03] transition-colors"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10 shrink-0">
                  <c.icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{c.prompt}</div>
                </div>
                <span
                  className={`text-xs text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                >
                  ›
                </span>
              </button>
              <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-rose-500/[0.06] border border-rose-500/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-rose-300/90">
                      Naive output
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{c.bad}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/90">
                      Honest output
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{c.good}</p>
                  </div>
                  <p className="sm:col-span-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">Why it happens — </span>
                    {c.why}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 glass-strong rounded-3xl p-8 flex items-start gap-4">
        <Goal className="h-5 w-5 text-aurora mt-1" />
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Every limitation here has a workaround: retrieval for knowledge, tools for math,
          chain-of-thought for reasoning, evals for bias. A great AI product is not a great model —
          it's a system that knows when to ask the model and when not to.
        </p>
      </div>
      </ModuleLayout>
    </PageShell>
  );
}
