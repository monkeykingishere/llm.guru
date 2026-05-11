import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Binary,
  Telescope,
  Eye,
  Layers,
  Network,
  Cpu,
  Activity,
  ScanLine,
  Brain,
  Wand2,
  Sparkles,
  ShieldCheck,
  Gauge,
  GitBranch,
  Goal,
  ArrowRight,
  Lock,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const Route = createFileRoute("/curriculum")({
  head: () => ({
    meta: [
      { title: "Curriculum — Latent" },
      {
        name: "description",
        content:
          "The full Latent curriculum. Fifteen modules covering everything from tokenization to safety, with interactive 3D visualizations throughout.",
      },
      { property: "og:title", content: "Latent Curriculum" },
      {
        property: "og:description",
        content: "A guided path through how large language models actually work.",
      },
    ],
  }),
  component: Page,
});

type Item = {
  n: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  to?: string;
  status: "ready" | "soon";
};

const ITEMS: Item[] = [
  { n: "01", title: "Introduction to LLMs", desc: "What they are, what they aren't, and why the world cares.", icon: Brain, status: "soon" },
  { n: "02", title: "Tokenization", desc: "Text becomes the discrete atoms a model can reason over.", icon: Binary, to: "/learn/tokenization", status: "ready" },
  { n: "03", title: "Embeddings", desc: "Meaning becomes geometry — fly through a 3D semantic space.", icon: Telescope, to: "/learn/embeddings", status: "ready" },
  { n: "04", title: "Positional Encoding", desc: "Teaching a permutation-invariant model about order.", icon: ScanLine, to: "/learn/positional-encoding", status: "ready" },
  { n: "05", title: "Neural Networks", desc: "From a single neuron to billions, with intuition intact.", icon: Network, to: "/learn/neural-network", status: "ready" },
  { n: "06", title: "Vision & Multimodal", desc: "When pixels and text share the same latent space.", icon: Eye, to: "/learn/vision", status: "ready" },
  { n: "07", title: "Transformer Architecture", desc: "The stack of blocks that changed everything.", icon: Layers, to: "/learn/transformer", status: "ready" },
  { n: "08", title: "Attention Mechanism", desc: "Soft, learned routing between every pair of tokens.", icon: Activity, to: "/learn/attention", status: "ready" },
  { n: "09", title: "Context Window", desc: "Why models forget, and how we stretch their memory.", icon: GitBranch, status: "soon" },
  { n: "10", title: "Prediction Process", desc: "Watch a generation happen, token by token.", icon: Wand2, to: "/learn/prediction", status: "ready" },
  { n: "11", title: "Training Process", desc: "Loss landscapes, gradients, and lots of GPUs.", icon: Cpu, status: "soon" },
  { n: "12", title: "Fine-Tuning", desc: "Bending a base model toward a specific shape.", icon: Sparkles, status: "soon" },
  { n: "13", title: "Parameters & Scaling", desc: "What changes when you go from 1B to 1T.", icon: Gauge, status: "soon" },
  { n: "14", title: "Limitations", desc: "The honest list — hallucinations, math, and the rest.", icon: Goal, status: "soon" },
  { n: "15", title: "Safety & Ethics", desc: "Building systems that deserve the trust they ask for.", icon: ShieldCheck, status: "soon" },
];

function Page() {
  return (
    <PageShell>
      <div className="relative">
        <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[500px] grid-bg pointer-events-none" />

        <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-16">
          <SectionHeader
            eyebrow="The full path"
            title={
              <>
                Fifteen modules. <br />
                <span className="text-gradient">One coherent picture.</span>
              </>
            }
            description="A guided journey from the first character of a prompt all the way to the ethics of deployment. Take it in order, or jump into whatever you're curious about."
          />
        </section>

        <section className="relative mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ITEMS.map((it, i) => {
              const Icon = it.icon;
              const ready = it.status === "ready";
              const inner = (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: (i % 6) * 0.04 }}
                  className={`group relative h-full overflow-hidden rounded-2xl glass p-5 transition-all duration-500 ${
                    ready
                      ? "hover:bg-white/[0.05] hover:-translate-y-0.5"
                      : "opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      {it.n}
                    </span>
                    {ready ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em]">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 text-muted-foreground px-2 py-0.5 text-[10px] uppercase tracking-[0.15em]">
                        <Lock className="h-2.5 w-2.5" /> Soon
                      </span>
                    )}
                  </div>
                  <div className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                    <Icon className="h-4.5 w-4.5 text-foreground" strokeWidth={2.2} />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    {it.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {it.desc}
                  </p>
                  {ready && (
                    <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-foreground/80 group-hover:text-foreground">
                      Open module
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </motion.div>
              );
              return ready && it.to ? (
                <Link key={it.n} to={it.to}>
                  {inner}
                </Link>
              ) : (
                <div key={it.n}>{inner}</div>
              );
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
