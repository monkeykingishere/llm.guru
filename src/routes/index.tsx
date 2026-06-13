import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect, lazy, Suspense } from "react";
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
import { cn } from "@/lib/utils";

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

// Restrained graphite/steel accents — no neon, no pink/purple gradients.
const STEEL = "from-slate-400/70 to-slate-600/70";
const PLATINUM = "from-zinc-300/70 to-zinc-500/70";
const GRAPHITE = "from-neutral-400/60 to-neutral-700/60";
const STEEL_BLUE = "from-slate-300/70 to-slate-500/60";
const GUNMETAL = "from-zinc-400/60 to-slate-700/70";
const SILVER = "from-stone-300/60 to-zinc-500/60";
const OBSIDIAN = "from-slate-500/60 to-neutral-800/70";
const easeSmooth = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
} as const;

const MODULES = [
  {
    to: "/learn/tokenization",
    icon: Binary,
    title: "Tokenization",
    desc: "Watch how raw text shatters into the discrete units that LLMs actually see.",
    accent: STEEL,
  },
  {
    to: "/learn/embeddings",
    icon: Telescope,
    title: "Embeddings",
    desc: "Fly through a 3D semantic space where meaning has geometry.",
    accent: PLATINUM,
  },
  {
    to: "/learn/attention",
    icon: Eye,
    title: "Attention",
    desc: "See which tokens influence which — the engine of context.",
    accent: STEEL_BLUE,
  },
  {
    to: "/learn/transformer",
    icon: Layers,
    title: "Transformer",
    desc: "Step through every block of the architecture that changed everything.",
    accent: GRAPHITE,
  },
  {
    to: "/learn/neural-network",
    icon: Network,
    title: "Neural Networks",
    desc: "Build intuition for how billions of parameters cooperate.",
    accent: GUNMETAL,
  },
  {
    to: "/learn/prediction",
    icon: Cpu,
    title: "Prediction",
    desc: "Watch a generation happen, token by token, distribution by distribution.",
    accent: SILVER,
  },
  {
    to: "/learn/vision",
    icon: Eye,
    title: "Vision & Multimodal",
    desc: "Drop an image and watch a CNN strip it into the latent a transformer can read.",
    accent: OBSIDIAN,
  },
  {
    to: "/learn/tiny-generator",
    icon: Cpu,
    title: "Tiny Text Generator",
    desc: "Interact with a real transformer running in-browser TensorFlow.js inference.",
    accent: SILVER,
  },
] as const;

function Index() {
  return (
    <PageShell>
      <Hero />
      <FeaturedLab />
      <Modules />
      <Manifesto />
    </PageShell>
  );
}

const ChessPieceTeaser: React.FC<{ type: "n" | "k" | "r"; color: "w" | "b"; className?: string }> = ({
  type,
  color,
  className,
}) => {
  const isWhite = color === "w";
  const fillColor = isWhite ? "#f8fafc" : "#0f172a";
  const strokeColor = isWhite ? "#475569" : "#cbd5e1";

  switch (type) {
    case "n":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,21 16,20 C 18,19 20,20 20,20 C 20,20 17,22 15,25 C 13,28 13,31 13,31 C 13,31 15,30 18,28 C 19,30 22,30 22,30 C 22,30 20,32 18,34 C 16,36 16,37 16,37 L 29,37 C 29,37 31,34 30,30 C 29,26 27,22 27,22 C 27,22 28,19 28,15 C 28,11 25,10 22,10 z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="16" r="2" fill={isWhite ? "#475569" : "#cbd5e1"} />
          <path d="M 14,39 L 31,39" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "r":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M9 39h27v-3H9v3zm3-13h21v-4H12v4zm2.5-4l1.5-8h18l1.5 8h-21z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 12v4h4v-4h3v4h7v-4h3v4h4v-4h3v-3H9v3h3z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M11 36h23v-3H11v3z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );
    case "k":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M22.5 11.63V6M20 8h5M22.5 25c2.4 0 5-2 5-6 0-3.5-3-5.5-5-5.5s-5 2-5 5.5c0 4 2.6 6 5 6z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 30c1.5-1.5 4-2.5 6-3h10c2 .5 4.5 1.5 6 3 .75.75 1.5.75 1.5 0V20H10v10c0 .75.75.75 1.5 0z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M11.5 33h22v-3h-22v3zm-2 4h26v-3h-26v3z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
};

function FeaturedLab() {
  const [ticker, setTicker] = useState(12840);
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((prev) => {
        if (prev > 14500) return 12840;
        return prev + Math.floor(Math.random() * 80) + 40;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-12">
      <SectionHeader
        eyebrow="Featured interactive lab"
        title={
          <>
            Chess Engine <span className="text-gradient">Thinking Lab</span>
          </>
        }
        description="See how engines evaluate millions of possibilities before choosing a move. Look directly into the search tree and watch minimax and alpha-beta pruning in action."
      />

      <div className="mt-12 relative overflow-hidden rounded-[2.5rem] glass-strong p-8 sm:p-12 border border-white/10 group tilt-card sheen">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-aurora opacity-25 blur-3xl group-hover:opacity-40 transition-opacity duration-1000" />
        
        <div className="grid gap-10 lg:grid-cols-[1.25fr,0.75fr] items-center relative z-10">
          {/* Card description */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-300 px-3 py-1 text-xs font-mono uppercase tracking-[0.15em] border border-amber-500/20">
              <Sparkles className="h-3.5 w-3.5 fill-amber-300" /> Flagship Showcase
            </span>
            
            <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              A Playable Window Into Algorithmic Thinking.
            </h3>
            
            <p className="text-muted-foreground leading-relaxed">
              Why treat chess AI as a black box? With the Thinking Lab, you can load tactical positions, play your own moves, and watch the Minimax tree build live. See exactly where Alpha-Beta Pruning slices away candidate replies to save computational power.
            </p>

            <ul className="space-y-3.5 text-sm text-foreground/80">
              {[
                "Interactive chessboard with live FEN library loading",
                "Fully dynamic search tree layout with Bezier curves",
                "Step-by-step thinking simulation and backtracking tracing",
                "Alpha-Beta pruning toggles with visual lockout feedback",
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <Link
                to="/learn/chess-engine"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-semibold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-xl shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 animate-pulse-glow"
              >
                Explore Engine Thinking
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Interactive Teaser visuals */}
          <div className="relative max-w-[280px] w-full mx-auto rounded-3xl glass border border-white/5 p-5 flex flex-col space-y-4 shadow-2xl justify-center items-center">
            {/* Header Telemetry Preview */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] font-mono text-muted-foreground w-full">
              <span>ENGINE ANALYSIS</span>
              <span className="text-amber-400 animate-pulse">● ACTIVE</span>
            </div>

            {/* Mini Board */}
            <div className="aspect-square w-[190px] h-[190px] rounded-lg overflow-hidden border border-white/10 grid grid-cols-8 grid-rows-8 bg-slate-900/60 shadow-lg select-none">
              {Array.from({ length: 64 }).map((_, i) => {
                const r = Math.floor(i / 8);
                const c = i % 8;
                const isDark = (r + c) % 2 === 1;
                
                // Put some pieces in the mini board for visual teaser
                let pieceChar: "n" | "k" | "r" | "" = "";
                let isWhitePiece = true;
                if (i === 18) {
                  pieceChar = "n";
                  isWhitePiece = true;
                } // Nc6
                if (i === 2) {
                  pieceChar = "k";
                  isWhitePiece = false;
                } // Ke8
                if (i === 0) {
                  pieceChar = "r";
                  isWhitePiece = false;
                } // Ra8
                if (i === 60) {
                  pieceChar = "k";
                  isWhitePiece = true;
                } // Ke1

                return (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square flex items-center justify-center",
                      isDark ? "bg-slate-800/80" : "bg-slate-700/10",
                      i === 18 && "bg-amber-500/20",
                    )}
                  >
                    {pieceChar && (
                      <ChessPieceTeaser
                        type={pieceChar}
                        color={isWhitePiece ? "w" : "b"}
                        className="w-[75%] h-[75%]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Decision branch summary */}
            <div className="w-full space-y-2 font-mono text-[10px] pt-1.5 border-t border-white/5">
              <div className="flex items-center justify-between text-muted-foreground pb-1">
                <span>Calculated Move</span>
                <span>Evaluation</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 font-semibold bg-white/[0.02] px-2 py-1.5 rounded-lg border border-white/5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  1. Nf3 (Best)
                </span>
                <span>+0.8</span>
              </div>
              <div className="flex items-center justify-between text-foreground/80 px-2 py-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  2. d4
                </span>
                <span>+0.5</span>
              </div>
              <div className="flex items-center justify-between text-rose-500/60 px-2 py-1">
                <span className="flex items-center gap-1.5">
                  <span>🔒</span>
                  3. e4 (Pruned)
                </span>
                <span className="line-through">--</span>
              </div>
            </div>
            
            {/* Micro Telemetry values */}
            <div className="w-full pt-1.5 flex justify-between font-mono text-[9px] text-muted-foreground">
              <span>Nodes: {ticker.toLocaleString()}</span>
              <span>Speed: 14,200 NPS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
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
            transition={{ duration: 0.6, ease: easeSmooth }}
            className="inline-flex transform-gpu items-center gap-2 rounded-full glass px-3 py-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--glow-fuchsia)]" />
            <span className="text-muted-foreground">
              An interactive atlas of large language models
            </span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: easeSmooth }}
            className="mt-6 transform-gpu text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02]"
          >
            See how <span className="text-gradient">language models</span>
            <br /> actually think.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.1, ease: easeSmooth }}
            className="mt-6 max-w-xl transform-gpu text-lg text-muted-foreground leading-relaxed"
          >
            From raw tokens to attention heads, every concept is a playable, 3D-rendered
            exploration. No black boxes — just intuition, geometry, and gentle math.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.18, ease: easeSmooth }}
            className="mt-8 flex transform-gpu flex-wrap items-center gap-3"
          >
            <Link
              to="/learn/tokenization"
              className="group inline-flex items-center gap-2 rounded-2xl bg-aurora px-5 py-3 text-sm font-medium text-white border border-white/5 hover:border-white/20 shadow-lg shadow-black/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[var(--ease-smooth)]"
            >
              Begin your journey
              <ArrowRight className="h-4 w-4 transform-gpu transition-transform duration-300 ease-[var(--ease-smooth)] group-hover:translate-x-1" />
            </Link>
            <Link
              to="/learn/tiny-generator"
              className="group inline-flex items-center gap-2 rounded-2xl glass px-5 py-3 text-sm font-medium hover:bg-white/[0.06] transition-colors border border-white/5 hover:border-white/20 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[var(--ease-smooth)]"
            >
              <Cpu className="h-4 w-4 text-[color:var(--glow-cyan)] animate-pulse" />
              Try our Tiny Text Generator Model
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
            className="mt-12 grid max-w-md transform-gpu grid-cols-3 gap-6"
          >
            {[
              { k: "15", v: "Modules" },
              { k: "3D", v: "Visuals" },
              { k: "100%", v: "Interactive" },
            ].map((s) => (
              <div key={s.v}>
                <div className="text-3xl font-semibold tracking-tight text-gradient">{s.k}</div>
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
          transition={{ duration: 1, ease: easeSmooth }}
          className="relative mx-auto aspect-square w-full max-w-[620px] transform-gpu"
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
              embedding.space.v3D
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
            Every concept, <span className="text-gradient">made tangible.</span>
          </>
        }
        description="Six core modules and nine deep-dives. Each one combines a 3D scene, a written explainer, and an interactive demo you can break."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 perspective-1200">
        {MODULES.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: easeSmooth }}
            className="transform-gpu"
          >
            <Link
              to={m.to}
              className="group relative block h-full overflow-hidden rounded-3xl glass depth-hover sheen p-6"
            >
              <div
                className={`absolute -top-16 -right-16 h-44 w-44 rounded-full bg-gradient-to-br ${m.accent} opacity-[0.18] blur-3xl group-hover:opacity-30 transition-opacity duration-700`}
              />
              <div
                className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${m.accent} ring-1 ring-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]`}
              >
                <m.icon className="h-5 w-5 text-white/90" strokeWidth={2.1} />
              </div>
              <h3 className="relative mt-5 text-xl font-semibold tracking-tight">{m.title}</h3>
              <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">
                {m.desc}
              </p>
              <div className="relative mt-5 inline-flex items-center gap-1.5 text-sm text-foreground/80 group-hover:text-foreground">
                Explore
                <ArrowRight className="h-3.5 w-3.5 transform-gpu transition-transform duration-300 ease-[var(--ease-smooth)] group-hover:translate-x-1" />
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
            Latent is built on a simple belief: every important idea in modern AI has a beautiful
            geometric or dynamic form. If you can rotate it, poke it, and break it, you'll
            understand it.
          </p>
        </div>
      </div>
    </section>
  );
}
