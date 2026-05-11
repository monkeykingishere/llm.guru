import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { lazy, Suspense } from "react";
import {
  ArrowRight,
  Sparkles,
  Layers,
  Eye,
  Network,
  Cpu,
  Binary,
  Telescope,
  Zap,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";

const HeroScene = lazy(() =>
  import("@/components/visualizations/HeroScene").then((m) => ({
    default: m.HeroScene,
  })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LLMGuru — An interactive guide of how LLMs work" },
      {
        name: "description",
        content:
          "Explore tokenization, embeddings, attention, and transformers through premium 3D visualizations and hands-on interactive demos.",
      },
      {
        property: "og:title",
        content: "Latent — An interactive atlas of how LLMs work",
      },
      {
        property: "og:description",
        content:
          "Premium 3D visualizations and interactive demos that make LLM internals intuitive.",
      },
    ],
  }),
  component: Index,
});

const MODULES = [
  {
    to: "/learn/tokenization",
    icon: Binary,
    title: "Tokenization",
    desc: "Watch how raw text shatters into the discrete units that LLMs actually see.",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    to: "/learn/embeddings",
    icon: Telescope,
    title: "Embeddings",
    desc: "Fly through a 3D semantic space where meaning has geometry.",
    accent: "from-fuchsia-500 to-rose-500",
  },
  {
    to: "/learn/attention",
    icon: Eye,
    title: "Attention",
    desc: "See which tokens influence which — the engine of context.",
    accent: "from-sky-400 to-indigo-500",
  },
  {
    to: "/learn/transformer",
    icon: Layers,
    title: "Transformer",
    desc: "Step through every block of the architecture that changed everything.",
    accent: "from-indigo-500 to-violet-500",
  },
  {
    to: "/learn/neural-network",
    icon: Network,
    title: "Neural Networks",
    desc: "Build intuition for how billions of parameters cooperate.",
    accent: "from-amber-400 to-rose-500",
  },
  {
    to: "/learn/prediction",
    icon: Cpu,
    title: "Prediction",
    desc: "Watch a generation happen, token by token, distribution by distribution.",
    accent: "from-emerald-400 to-sky-500",
  },
  {
    to: "/learn/vision",
    icon: Eye,
    title: "Vision & Multimodal",
    desc: "Drop an image and watch a CNN strip it into the latent a transformer can read.",
    accent: "from-cyan-400 to-violet-500",
  },
] as const;

function Index() {
  return (
    <PageShell>
      <Hero />
      <Modules />
      <Manifesto />
    </PageShell>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 pt-10 pb-24 grid gap-12 lg:grid-cols-[1.05fr,1fr] items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--glow-fuchsia)]" />
            <span className="text-muted-foreground">
              An interactive atlas of large language models
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02]"
          >
            See how{" "}
            <span className="text-gradient">language models</span>
            <br /> actually think.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed"
          >
            From raw tokens to attention heads, every concept is a playable,
            3D-rendered exploration. No black boxes — just intuition, geometry,
            and gentle math.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/learn/tokenization"
              className="group inline-flex items-center gap-2 rounded-2xl bg-aurora px-5 py-3 text-sm font-medium text-white shadow-[0_10px_40px_-10px_oklch(0.66_0.21_285/0.9)] hover:shadow-[0_14px_60px_-10px_oklch(0.66_0.21_285/1)] transition-all"
            >
              Begin your journey
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/curriculum"
              className="inline-flex items-center gap-2 rounded-2xl glass px-5 py-3 text-sm font-medium hover:bg-white/[0.06] transition-colors"
            >
              View full curriculum
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-12 grid grid-cols-3 gap-6 max-w-md"
          >
            {[
              { k: "15", v: "Modules" },
              { k: "3D", v: "Visuals" },
              { k: "100%", v: "Interactive" },
            ].map((s) => (
              <div key={s.v}>
                <div className="text-3xl font-semibold tracking-tight text-gradient">
                  {s.k}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1">
                  {s.v}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-square w-full max-w-[620px] mx-auto"
        >
          <div className="absolute inset-0 rounded-full bg-aurora opacity-30 blur-3xl" />
          <div className="relative h-full w-full rounded-[2.5rem] glass-strong overflow-hidden ring-glow">
            <Suspense fallback={<div className="h-full w-full animate-shimmer" />}>
              <HeroScene />
            </Suspense>
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--glow-fuchsia)] animate-pulse" />
              Live · drag to orbit
            </div>
            <div className="absolute right-4 bottom-4 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground">
              latent.embedding.v3
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <SectionHeader
        eyebrow="The curriculum"
        title={
          <>
            Every concept,{" "}
            <span className="text-gradient">made tangible.</span>
          </>
        }
        description="Six core modules and nine deep-dives. Each one combines a 3D scene, a written explainer, and an interactive demo you can break."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          >
            <Link
              to={m.to}
              className="group relative block h-full overflow-hidden rounded-3xl glass p-6 hover:bg-white/[0.05] transition-all duration-500 hover:-translate-y-1"
            >
              <div
                className={`absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br ${m.accent} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500`}
              />
              <div
                className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${m.accent} shadow-lg`}
              >
                <m.icon className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <h3 className="relative mt-5 text-xl font-semibold tracking-tight">
                {m.title}
              </h3>
              <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">
                {m.desc}
              </p>
              <div className="relative mt-5 inline-flex items-center gap-1.5 text-sm text-foreground/80 group-hover:text-foreground">
                Explore
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-24">
      <div className="relative overflow-hidden rounded-[2rem] glass-strong p-10 sm:p-16">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-aurora opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-aurora opacity-20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Zap className="h-3.5 w-3.5" /> Why we built this
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight max-w-3xl">
            Reading papers teaches you syntax. <br />
            <span className="text-gradient">Seeing it move teaches you intuition.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-muted-foreground leading-relaxed">
            Latent is built on a simple belief: every important idea in modern
            AI has a beautiful geometric or dynamic form. If you can rotate it,
            poke it, and break it, you'll understand it.
          </p>
        </div>
      </div>
    </section>
  );
}
