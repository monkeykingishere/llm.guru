import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Cpu,
  Layers,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  ChevronUp,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn/attention")({
  head: () => ({
    meta: [
      { title: "Attention Mechanism Laboratory — Latent" },
      {
        name: "description",
        content:
          "Interactive attention matrix. See which tokens influence which — the mechanism behind every modern LLM.",
      },
      { property: "og:title", content: "Attention Mechanism Laboratory — Latent" },
      {
        property: "og:description",
        content: "Visualize self-attention between tokens.",
      },
    ],
  }),
  component: Page,
});

// ----------------------------------------------------
// Core Math & Presets
// ----------------------------------------------------
const SENTENCES = [
  "The cat sat on the mat".split(" "),
  "Attention is all you need".split(" "),
  "Models learn to focus on context".split(" "),
];

// Generates a deterministic pseudo-random vector for a token string
function getMockVector(token: string, type: "q" | "k" | "v", head: number): number[] {
  const hash = token.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const length = 6;
  const vec: number[] = [];
  for (let i = 0; i < length; i++) {
    const val = Math.sin(hash * (i + 1) + type.charCodeAt(0) * (head + 1)) * 0.85;
    vec.push(Number(val.toFixed(2)));
  }
  return vec;
}

function dotProduct(v1: number[], v2: number[]): number {
  return v1.reduce((sum, val, idx) => sum + val * (v2[idx] || 0), 0);
}

// Full self-attention builder (bidirectional)
function buildAttention(tokens: string[], head: number): number[][] {
  const n = tokens.length;
  const m: number[][] = [];
  const d_k = 6;
  const sqrt_d_k = Math.sqrt(d_k);

  for (let i = 0; i < n; i++) {
    const qVec = getMockVector(tokens[i], "q", head);
    const rowScores: number[] = [];
    for (let j = 0; j < n; j++) {
      const kVec = getMockVector(tokens[j], "k", head);
      rowScores.push(dotProduct(qVec, kVec) / sqrt_d_k);
    }
    // softmax over row
    const exps = rowScores.map((s) => Math.exp(s * 2.2));
    const sum = exps.reduce((a, b) => a + b, 0);
    m.push(exps.map((s) => s / sum));
  }
  return m;
}

interface StepStage {
  title: string;
  subtitle: string;
  description: string;
}

const STEP_STAGES: StepStage[] = [
  {
    title: "1. Input Embedding",
    subtitle: "Representing raw tokens as vectors",
    description: "We start with the sequence of input tokens. Each token is mapped to an embedding vector (X) representing its semantic coordinates.",
  },
  {
    title: "2. Query Matrix (Q)",
    subtitle: "What is each token searching for?",
    description: "Each token embedding is multiplied by a learned Query Weight Matrix. The resulting Query vector (Q) represents the target information this token is looking to retrieve.",
  },
  {
    title: "3. Key Matrix (K)",
    subtitle: "What content does each token represent?",
    description: "Embeddings are also projected to Key vectors (K) representing what characteristics, context, or syntactical roles this token has to offer to other queries.",
  },
  {
    title: "4. Value Matrix (V)",
    subtitle: "What values does each token carry?",
    description: "Finally, tokens project into Value vectors (V). This holds the actual semantic substance that will be extracted and propagated forward in the network.",
  },
  {
    title: "5. Score Calculation",
    subtitle: "Matching Queries against Keys",
    description: "We compute the dot product between the Queries of each token and the Keys of all tokens (Q · Kᵀ). This calculates their raw semantic similarity scores.",
  },
  {
    title: "6. Softmax Normalization",
    subtitle: "Generating the probability distribution",
    description: "We divide scores by the square root of dimension (scale factor) and apply the Softmax function. This yields normalized attention weights representing percentage focus.",
  },
  {
    title: "7. Weighted Sum",
    subtitle: "Aggregating semantic values",
    description: "Each token collects the Value vectors of all tokens in the sequence, multiplying them by its calculated attention weights (Weights · V).",
  },
  {
    title: "8. Contextual Output",
    subtitle: "The final enriched vector representations",
    description: "The output (Y) is a set of context-aware vectors where each token's representation now holds blended information from the surrounding sequence.",
  },
];

// ----------------------------------------------------
// Sub-Components
// ----------------------------------------------------
const ArrowConnector: React.FC<{ active?: boolean }> = ({ active }) => {
  return (
    <div className="flex md:flex-col items-center justify-center py-2 text-muted-foreground select-none">
      <ArrowRight className={cn("hidden md:block h-5 w-5 transition-colors duration-300", active ? "text-blue-400" : "text-white/10")} />
      <ChevronDown className={cn("block md:hidden h-5 w-5 transition-colors duration-300", active ? "text-blue-400" : "text-white/10")} />
    </div>
  );
};

function AttentionHero() {
  const [autoStep, setAutoStep] = useState(0);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (hoveredStage !== null) return;
    const interval = setInterval(() => {
      setAutoStep((prev) => (prev + 1) % 5);
    }, 2500);
    return () => clearInterval(interval);
  }, [hoveredStage]);

  const activeStage = useMemo(() => {
    if (hoveredStage !== null) return hoveredStage;
    const stages = ["qkv", "scores", "matrix", "weighted", "output"];
    return stages[autoStep];
  }, [hoveredStage, autoStep]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: Number((y * -2.0).toFixed(2)), y: Number((x * 2.0).toFixed(2)) });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHoveredStage(null);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.15s ease-out",
      }}
      className="glass-strong rounded-3xl p-8 border border-white/10 relative overflow-hidden mb-8 shadow-2xl transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Attention Pipeline Centerpiece
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          Hover stages to inspect pathways
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-4xl mx-auto gap-4 md:gap-6 pt-4">
        {/* Node 1: Input */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">Input</span>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col gap-1 w-16 h-28 justify-center shadow-xl">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-2.5 bg-slate-800/80 border border-white/5 rounded-md" />
            ))}
          </div>
        </div>

        {/* Arrow */}
        <ArrowConnector active={activeStage === "qkv"} />

        {/* Node 2: Projections */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">Projections</span>
          <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 rounded-2xl p-3 shadow-xl">
            <div className={cn("text-[9px] font-mono px-2.5 py-0.5 rounded-md transition-colors border", 
              activeStage === "qkv" ? "bg-amber-500/20 text-amber-300 border-amber-500/20" : "text-muted-foreground border-transparent")}>W_q</div>
            <div className={cn("text-[9px] font-mono px-2.5 py-0.5 rounded-md transition-colors border", 
              activeStage === "qkv" ? "bg-rose-500/20 text-rose-300 border-rose-500/20" : "text-muted-foreground border-transparent")}>W_k</div>
            <div className={cn("text-[9px] font-mono px-2.5 py-0.5 rounded-md transition-colors border", 
              activeStage === "qkv" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" : "text-muted-foreground border-transparent")}>W_v</div>
          </div>
        </div>

        {/* Arrow */}
        <ArrowConnector active={activeStage === "qkv"} />

        {/* Node 3: Q, K, V Matrices */}
        <div className="flex flex-col items-center gap-2 relative">
          <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">Q · K · V</span>
          <div className="flex gap-2.5 items-center bg-white/[0.01] border border-white/5 rounded-2xl p-4 shadow-xl">
            {/* Q Card */}
            <div 
              onMouseEnter={() => setHoveredStage("qkv")}
              onMouseLeave={() => setHoveredStage(null)}
              className={cn("w-10 h-16 rounded-xl flex flex-col justify-between p-2 border transition-all duration-300 cursor-help", 
                activeStage === "qkv" || activeStage === "scores" ? "bg-amber-500/10 border-amber-500/30 scale-105" : "bg-white/[0.02] border-white/5 opacity-50")}
            >
              <span className="text-[9px] font-bold text-amber-300 font-mono">Q</span>
              <div className="space-y-1">
                <div className="h-1 bg-amber-400/50 rounded-sm w-full" />
                <div className="h-1 bg-amber-400/50 rounded-sm w-4/5" />
              </div>
            </div>

            {/* K Card */}
            <div 
              onMouseEnter={() => setHoveredStage("scores")}
              onMouseLeave={() => setHoveredStage(null)}
              className={cn("w-10 h-16 rounded-xl flex flex-col justify-between p-2 border transition-all duration-300 cursor-help", 
                activeStage === "qkv" || activeStage === "scores" ? "bg-rose-500/10 border-rose-500/30 scale-105" : "bg-white/[0.02] border-white/5 opacity-50")}
            >
              <span className="text-[9px] font-bold text-rose-300 font-mono">K</span>
              <div className="space-y-1">
                <div className="h-1 bg-rose-400/50 rounded-sm w-full" />
                <div className="h-1 bg-rose-400/50 rounded-sm w-3/4" />
              </div>
            </div>

            {/* V Card */}
            <div 
              onMouseEnter={() => setHoveredStage("weighted")}
              onMouseLeave={() => setHoveredStage(null)}
              className={cn("w-10 h-16 rounded-xl flex flex-col justify-between p-2 border transition-all duration-300 cursor-help", 
                activeStage === "qkv" || activeStage === "weighted" ? "bg-emerald-500/10 border-emerald-500/30 scale-105" : "bg-white/[0.02] border-white/5 opacity-50")}
            >
              <span className="text-[9px] font-bold text-emerald-300 font-mono">V</span>
              <div className="space-y-1">
                <div className="h-1 bg-emerald-400/50 rounded-sm w-full" />
                <div className="h-1 bg-emerald-400/50 rounded-sm w-5/6" />
              </div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ArrowConnector active={activeStage === "scores" || activeStage === "matrix"} />

        {/* Node 4: Attention Matrix Heatmap */}
        <div 
          onMouseEnter={() => setHoveredStage("matrix")}
          onMouseLeave={() => setHoveredStage(null)}
          className="flex flex-col items-center gap-2 cursor-help"
        >
          <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">Attention Matrix</span>
          <div className={cn("bg-white/[0.01] border rounded-2xl p-3.5 shadow-xl flex flex-col gap-1 transition-all duration-300",
            activeStage === "matrix" || activeStage === "weighted" ? "border-blue-500/35 bg-blue-500/5 scale-105" : "border-white/5")}>
            <div className="grid grid-cols-4 gap-1 w-14 h-14">
              {Array.from({ length: 16 }).map((_, i) => {
                const isBright = (i * 7) % 5 === 0;
                return (
                  <div key={i} className={cn("rounded-[2px] transition-colors duration-300",
                    activeStage === "matrix" || activeStage === "weighted"
                      ? isBright ? "bg-blue-400/70" : "bg-blue-900/20"
                      : isBright ? "bg-slate-700/50" : "bg-slate-800/10"
                  )} />
                );
              })}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ArrowConnector active={activeStage === "weighted" || activeStage === "output"} />

        {/* Node 5: Output */}
        <div 
          onMouseEnter={() => setHoveredStage("output")}
          onMouseLeave={() => setHoveredStage(null)}
          className="flex flex-col items-center gap-2 cursor-help"
        >
          <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">Output (Y)</span>
          <div className={cn("bg-white/[0.01] border rounded-2xl p-4 flex flex-col gap-1 w-16 h-28 justify-center shadow-xl transition-all duration-300",
            activeStage === "output" ? "border-emerald-500/35 bg-emerald-500/5 scale-105" : "border-white/5")}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn("h-2.5 border rounded-md transition-all duration-300",
                activeStage === "output" 
                  ? "bg-emerald-500/30 border-emerald-500/40" 
                  : "bg-slate-800/80 border-white/5"
              )} />
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Explanation box */}
      <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 mt-6 text-center max-w-2xl mx-auto">
        <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest block mb-1">
          Current Pipeline Activity
        </span>
        <p className="text-xs text-slate-300 font-mono transition-all duration-300 leading-relaxed min-h-[32px]">
          {activeStage === "qkv" && "Projections: Embeddings are projected into Queries (Q), Keys (K), and Values (V) using learned weight matrices."}
          {activeStage === "scores" && "Scoring: Query vectors dot-product with Key vectors to calculate semantic similarity scores."}
          {activeStage === "matrix" && "Attention distribution: Softmax normalizes scores into probability weights representing token focus."}
          {activeStage === "weighted" && "Weighted Context: Attention matrix weights are multiplied by the Value vectors to collect information."}
          {activeStage === "output" && "Output representation: Final contextual embeddings carry semantic weight from the entire sequence."}
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Page Component
// ----------------------------------------------------
export function Page() {
  const [activeTab, setActiveTab] = useState<"visualizer" | "stepbystep" | "playground">("visualizer");
  const [sentIdx, setSentIdx] = useState(0);
  const [head, setHead] = useState(0);
  const [selectedTokenIdx, setSelectedTokenIdx] = useState<number>(0);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  
  // Custom Playground Text
  const [playgroundText, setPlaygroundText] = useState("The king attacks the queen");
  const [customTokens, setCustomTokens] = useState<string[]>(["The", "king", "attacks", "the", "queen"]);

  // Vector Details Expand panel
  const [vectorDetailsExpanded, setVectorDetailsExpanded] = useState(false);

  // Stepper State
  const [currentStep, setCurrentStep] = useState(0);
  const [isStepPlaying, setIsStepPlaying] = useState(false);

  // Derive active tokens based on playground or preset
  const tokens = useMemo(() => {
    if (activeTab === "playground") return customTokens;
    return SENTENCES[sentIdx];
  }, [activeTab, sentIdx, customTokens]);

  const attention = useMemo(() => buildAttention(tokens, head), [tokens, head]);

  // Adjust selected token index if tokens length changes
  useEffect(() => {
    if (selectedTokenIdx >= tokens.length) {
      setSelectedTokenIdx(0);
    }
  }, [tokens, selectedTokenIdx]);

  // Detailed attention vectors calculations for selected token
  const attentionDetails = useMemo(() => {
    if (selectedTokenIdx >= tokens.length) return null;
    const qVec = getMockVector(tokens[selectedTokenIdx], "q", head);
    const d_k = 6;
    const sqrt_d_k = Math.sqrt(d_k);
    
    const rawScores = tokens.map((t) => {
      const kVec = getMockVector(t, "k", head);
      return dotProduct(qVec, kVec) / sqrt_d_k;
    });

    const exps = rawScores.map((s) => Math.exp(s * 2.2));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const weights = exps.map((e) => e / sumExps);

    return {
      qVec,
      rawScores,
      weights,
      keys: tokens.map((t) => getMockVector(t, "k", head)),
      values: tokens.map((t) => getMockVector(t, "v", head)),
    };
  }, [tokens, selectedTokenIdx, head]);

  // Step-by-step automatic playback
  useEffect(() => {
    if (!isStepPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEP_STAGES.length - 1) {
          setIsStepPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isStepPlaying]);

  const handlePlaygroundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWords = playgroundText.trim().split(/\s+/).filter(Boolean);
    if (cleanWords.length > 0) {
      setCustomTokens(cleanWords);
      setSelectedTokenIdx(0);
    }
  };

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 08 · Attention"
        title="Every token, in conversation."
        description="Self-attention lets each token decide how much to listen to every other token. It's a soft, learned routing system — and it's the reason transformers can hold long-range context."
        prev={{ to: "/learn/embeddings", label: "Embeddings" }}
        next={{ to: "/learn/transformer", label: "Transformer" }}
      >
        {/* Large premium centerpiece hero visualization */}
        <AttentionHero />

        {/* Navigation tabs */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("visualizer")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeTab === "visualizer"
                  ? "bg-white/10 text-white border border-white/10 shadow-lg"
                  : "text-muted-foreground hover:text-white border border-transparent"
              )}
            >
              <Sliders className="h-4 w-4 text-emerald-400" />
              Interactive Matrix
            </button>
            <button
              onClick={() => {
                setActiveTab("stepbystep");
                setCurrentStep(0);
                setIsStepPlaying(false);
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeTab === "stepbystep"
                  ? "bg-white/10 text-white border border-white/10 shadow-lg"
                  : "text-muted-foreground hover:text-white border border-transparent"
              )}
            >
              <Cpu className="h-4 w-4 text-blue-400" />
              Step-by-Step Flow
            </button>
            <button
              onClick={() => setActiveTab("playground")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeTab === "playground"
                  ? "bg-white/10 text-white border border-white/10 shadow-lg"
                  : "text-muted-foreground hover:text-white border border-transparent"
              )}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              Custom Playground
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mr-2 font-semibold">
              Attention Head:
            </span>
            {[0, 1, 2, 3].map((h) => (
              <button
                key={h}
                onClick={() => setHead(h)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-md transition-colors",
                  head === h
                    ? "bg-white/10 text-foreground font-semibold"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                Head {h + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content wrappers */}
        <AnimatePresence mode="wait">
          {activeTab === "visualizer" && (
            <motion.div
              key="visualizer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Presets selector */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mr-2 font-mono">
                  Preset Sentence:
                </div>
                {SENTENCES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSentIdx(i)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full transition-colors",
                      sentIdx === i
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "glass text-muted-foreground hover:text-foreground border border-white/5"
                    )}
                  >
                    {s.join(" ")}
                  </button>
                ))}
              </div>

              {/* Main Visual flow diagram panel */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  Self-Attention Matrix weights map
                </div>

                {/* Flow Diagram */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1.5fr] gap-6 items-center pt-2">
                  
                  {/* Pipeline Step 1: Input Vector & Linear Projections (3D Glass plates) */}
                  <div className="flex flex-col gap-4">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      Input Projection & QKV generation
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Q matrix representation */}
                      <div className="glass-strong rounded-2xl p-4 border border-white/10 relative shadow-2xl flex flex-col justify-between h-28 transform perspective-[800px] rotateX(12deg) rotateY(-8deg) hover:translate-y-[-4px] transition-transform duration-300">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-amber-300 font-mono">Query (Q)</span>
                          <span className="text-[8px] bg-amber-500/10 text-amber-300 px-1.5 py-0.2 rounded font-mono">Weight W_q</span>
                        </div>
                        <div className="w-full bg-white/5 rounded h-1 overflow-hidden">
                          <div className="bg-amber-400 h-full w-4/5" />
                        </div>
                        <span className="text-[9px] text-muted-foreground font-mono leading-tight">What is token searching for?</span>
                      </div>

                      {/* K matrix representation */}
                      <div className="glass-strong rounded-2xl p-4 border border-white/10 relative shadow-2xl flex flex-col justify-between h-28 transform perspective-[800px] rotateX(12deg) rotateY(-8deg) hover:translate-y-[-4px] transition-transform duration-300">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-rose-300 font-mono">Key (K)</span>
                          <span className="text-[8px] bg-rose-500/10 text-rose-300 px-1.5 py-0.2 rounded font-mono">Weight W_k</span>
                        </div>
                        <div className="w-full bg-white/5 rounded h-1 overflow-hidden">
                          <div className="bg-rose-400 h-full w-2/3" />
                        </div>
                        <span className="text-[9px] text-muted-foreground font-mono leading-tight">What features does it offer?</span>
                      </div>

                      {/* V matrix representation */}
                      <div className="glass-strong rounded-2xl p-4 border border-white/10 relative shadow-2xl flex flex-col justify-between h-28 transform perspective-[800px] rotateX(12deg) rotateY(-8deg) hover:translate-y-[-4px] transition-transform duration-300">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-emerald-300 font-mono">Value (V)</span>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.2 rounded font-mono">Weight W_v</span>
                        </div>
                        <div className="w-full bg-white/5 rounded h-1 overflow-hidden">
                          <div className="bg-emerald-400 h-full w-5/6" />
                        </div>
                        <span className="text-[9px] text-muted-foreground font-mono leading-tight">Semantic info block</span>
                      </div>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="hidden lg:flex flex-col items-center justify-center p-2 text-muted-foreground">
                    <ArrowRight className="h-6 w-6 text-white/20" />
                    <span className="text-[8px] font-mono mt-1 uppercase tracking-widest text-white/40">Dot Prod</span>
                  </div>

                  {/* Pipeline Step 2: Attention Matrix Grid (Interactive Matrix) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        Attention Matrix: Q · Kᵀ (Softmax Map)
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Active Head: {head + 1}
                      </span>
                    </div>

                    <div className="overflow-x-auto bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center">
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
                            className="text-[11px] font-mono text-muted-foreground text-center pb-1 select-none"
                          >
                            {t}
                          </div>
                        ))}
                        {attention.map((row, i) => (
                          <div key={i} className="contents">
                            <div
                              className={cn(
                                "pr-3 text-right text-[11px] font-mono whitespace-nowrap self-center transition-colors select-none",
                                hoverRow === i ? "text-white font-bold" : "text-muted-foreground"
                              )}
                            >
                              {tokens[i]}
                            </div>
                            {row.map((v, j) => (
                              <motion.div
                                key={j}
                                onMouseEnter={() => setHoverRow(i)}
                                onMouseLeave={() => setHoverRow(null)}
                                className="aspect-square rounded-md relative overflow-hidden cursor-pointer"
                                style={{
                                  background: `oklch(${0.2 + v * 0.55} ${0.05 + v * 0.2} ${285 - v * 50})`,
                                  boxShadow:
                                    v > 0.35 ? `0 0 ${v * 16}px oklch(0.66 0.21 285 / ${v})` : undefined,
                                  transition: "background .3s, box-shadow .3s",
                                }}
                              >
                                <span className="absolute inset-0 grid place-items-center text-[10px] font-mono text-white/80 tabular-nums">
                                  {v < 0.05 ? "" : v.toFixed(2)}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer instructions */}
                <div className="mt-6 text-xs text-muted-foreground leading-relaxed">
                  Each row is a token <em>asking</em>: &quot;who should I pay attention to?&quot; Rows sum to 1 —
                  the brighter the cell, the stronger the connection.
                </div>
              </div>

              {/* Dynamic QKV Vector Explorer details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual sentence chip select */}
                <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Interactive Token Map
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Select a token below to inspect its Query, Key, and Value vectors and see its attention weight output.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {tokens.map((token, idx) => {
                      const isActive = selectedTokenIdx === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedTokenIdx(idx)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-mono border transition-all duration-300",
                            isActive
                              ? "bg-white/10 border-white/15 text-white scale-105"
                              : "bg-transparent border-white/5 text-muted-foreground hover:text-white"
                          )}
                        >
                          {token}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active QKV Vector Display */}
                {attentionDetails && (
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-4 lg:col-span-2">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                        Vectors for: &quot;{tokens[selectedTokenIdx]}&quot; (H-{head + 1})
                      </div>
                      <button
                        onClick={() => setVectorDetailsExpanded(!vectorDetailsExpanded)}
                        className="text-[10px] font-mono text-blue-400 hover:text-blue-300"
                      >
                        {vectorDetailsExpanded ? "Hide Math" : "Expand Math Details"}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Query vector display */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-amber-300 block">Query Vector (q)</span>
                        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5 flex flex-wrap gap-1 content-start h-16 overflow-y-auto">
                          {attentionDetails.qVec.map((v, i) => (
                            <span key={i} className="text-[9px] font-mono text-amber-200 bg-amber-500/5 px-1 rounded">
                              {v > 0 ? `+${v}` : v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Key vector display for selected */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-rose-300 block">Key Vector (k)</span>
                        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5 flex flex-wrap gap-1 content-start h-16 overflow-y-auto">
                          {attentionDetails.keys[selectedTokenIdx]?.map((v, i) => (
                            <span key={i} className="text-[9px] font-mono text-rose-200 bg-rose-500/5 px-1 rounded">
                              {v > 0 ? `+${v}` : v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Value vector display for selected */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-emerald-300 block">Value Vector (v)</span>
                        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5 flex flex-wrap gap-1 content-start h-16 overflow-y-auto">
                          {attentionDetails.values[selectedTokenIdx]?.map((v, i) => (
                            <span key={i} className="text-[9px] font-mono text-emerald-200 bg-emerald-500/5 px-1 rounded">
                              {v > 0 ? `+${v}` : v}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {vectorDetailsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-3 pt-3 border-t border-white/5 overflow-hidden text-xs text-muted-foreground leading-relaxed font-mono animate-fade-in"
                        >
                          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 space-y-1">
                            <span className="text-white block font-semibold">QKV Linear Math:</span>
                            <span>Input embedding X vector size = 1x6. Weight Matrix W = 6x6.</span>
                            <span className="block text-slate-300">
                              q = X · W_q = [{attentionDetails.qVec.join(", ")}]
                            </span>
                            <span className="block text-slate-300">
                              k = X · W_k = [{attentionDetails.keys[selectedTokenIdx]?.join(", ")}]
                            </span>
                            <span className="block text-slate-300">
                              v = X · W_v = [{attentionDetails.values[selectedTokenIdx]?.join(", ")}]
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {activeTab === "stepbystep" && (
            <motion.div
              key="stepbystep"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Stepper centerpiece diagram highlight */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Attention Step-by-Step Flow Pipeline
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5 text-xs text-blue-300 font-mono">
                    Step {currentStep + 1} / {STEP_STAGES.length}
                  </div>
                </div>

                {/* Pipeline visual highlight blocks */}
                <div className="grid grid-cols-2 md:grid-cols-8 gap-3 items-center">
                  {STEP_STAGES.map((stage, idx) => {
                    const isPassed = idx < currentStep;
                    const isActive = idx === currentStep;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setCurrentStep(idx);
                          setIsStepPlaying(false);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border flex flex-col justify-between h-20 transition-all duration-300 cursor-pointer select-none",
                          isActive
                            ? "bg-blue-500/10 border-blue-500/35 shadow-lg shadow-blue-500/5 ring-1 ring-white/10 scale-102"
                            : isPassed
                            ? "bg-white/[0.03] border-white/15 opacity-80"
                            : "bg-transparent border-white/5 opacity-40 hover:opacity-60"
                        )}
                      >
                        <span className="text-[8px] font-mono text-muted-foreground block uppercase">
                          Stage {idx + 1}
                        </span>
                        <span className="text-[10px] font-semibold text-white mt-1.5 block leading-tight">
                          {stage.title.split(". ")[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Stage explanation reader card */}
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-300 px-3 py-1 text-xs font-mono uppercase tracking-wider">
                      {STEP_STAGES[currentStep].title}
                    </span>
                    <h3 className="text-xl font-semibold text-white tracking-tight">
                      {STEP_STAGES[currentStep].subtitle}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                      {STEP_STAGES[currentStep].description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsStepPlaying(false);
                          setCurrentStep((prev) => Math.max(0, prev - 1));
                        }}
                        disabled={currentStep === 0}
                        className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-white rounded-xl active:scale-[0.98] transition-all flex items-center justify-center"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => setIsStepPlaying(!isStepPlaying)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                      >
                        {isStepPlaying ? <Pause className="h-3.5 w-3.5 fill-slate-950" /> : <Play className="h-3.5 w-3.5 fill-slate-950" />}
                        {isStepPlaying ? "Pause autoplay" : "Autoplay steps"}
                      </button>

                      <button
                        onClick={() => {
                          setIsStepPlaying(false);
                          setCurrentStep((prev) => Math.min(STEP_STAGES.length - 1, prev + 1));
                        }}
                        disabled={currentStep === STEP_STAGES.length - 1}
                        className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-white rounded-xl active:scale-[0.98] transition-all flex items-center justify-center"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setIsStepPlaying(false);
                        setCurrentStep(0);
                      }}
                      className="text-[10px] font-mono text-muted-foreground hover:text-white flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset Flow
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "playground" && (
            <motion.div
              key="playground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Custom text playground console */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Attention Vector Playground Console
                </div>
                
                <form onSubmit={handlePlaygroundSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={playgroundText}
                    onChange={(e) => setPlaygroundText(e.target.value)}
                    placeholder="Enter custom sentence..."
                    className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 font-mono placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs rounded-xl active:scale-[0.98] transition-all"
                  >
                    Visualize Attention
                  </button>
                </form>

                <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                  Enter any text above. Words will be parsed as tokens, deterministic projections will generate Q, K, and V vectors, and attention scores will calculate live.
                </p>
              </div>

              {/* Connected Visual Grid Map for Custom Input */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                
                <div className="flex justify-between items-center text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <span>Custom attention matrix values</span>
                  <span className="text-amber-400 font-bold">Head: {head + 1}</span>
                </div>

                <div className="overflow-x-auto bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center">
                  <div
                    className="inline-grid gap-1"
                    style={{
                      gridTemplateColumns: `auto repeat(${tokens.length}, minmax(42px, 1fr))`,
                    }}
                  >
                    <div />
                    {tokens.map((t, i) => (
                      <div
                        key={i}
                        className="text-[10px] font-mono text-muted-foreground text-center pb-1 select-none"
                      >
                        {t}
                      </div>
                    ))}
                    {attention.map((row, i) => (
                      <div key={i} className="contents">
                        <div
                          className={cn(
                            "pr-3 text-right text-[10px] font-mono whitespace-nowrap self-center transition-colors select-none",
                            hoverRow === i ? "text-white font-bold" : "text-muted-foreground"
                          )}
                        >
                          {tokens[i]}
                        </div>
                        {row.map((v, j) => (
                          <div
                            key={j}
                            onMouseEnter={() => setHoverRow(i)}
                            onMouseLeave={() => setHoverRow(null)}
                            className="aspect-square rounded-md relative overflow-hidden cursor-pointer"
                            style={{
                              background: `oklch(${0.2 + v * 0.55} ${0.05 + v * 0.2} ${285 - v * 50})`,
                              boxShadow:
                                v > 0.35 ? `0 0 ${v * 16}px oklch(0.66 0.21 285 / ${v})` : undefined,
                              transition: "background .3s, box-shadow .3s",
                            }}
                          >
                            <span className="absolute inset-0 grid place-items-center text-[9px] font-mono text-white/80 tabular-nums">
                              {v < 0.05 ? "" : v.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Micro-interaction: select token card */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                    Interactive Attention link connections:
                  </span>
                  
                  <div className="flex flex-wrap gap-2">
                    {tokens.map((token, idx) => {
                      const isActive = selectedTokenIdx === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedTokenIdx(idx)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-mono border transition-all duration-300",
                            isActive
                              ? "bg-white/10 border-white/15 text-white scale-105"
                              : "bg-transparent border-white/5 text-muted-foreground hover:text-white"
                          )}
                        >
                          {token}
                        </button>
                      );
                    })}
                  </div>

                  {/* Attention connections list display */}
                  {attentionDetails && (
                    <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3 animate-fade-in">
                      <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">
                        Attention weights from: &quot;{tokens[selectedTokenIdx]}&quot;
                      </div>

                      <div className="space-y-2">
                        {tokens.map((token, idx) => {
                          const w = attentionDetails.weights[idx] || 0;
                          return (
                            <div key={idx} className="flex items-center gap-3 text-xs font-mono">
                              <span className="w-16 text-slate-300 text-right truncate">
                                {token}
                              </span>
                              <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div
                                  className="bg-amber-400 h-full rounded-full"
                                  initial={{ width: "0%" }}
                                  animate={{ width: `${w * 100}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                              <span className="w-10 text-white font-bold text-right">
                                {(w * 100).toFixed(0)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Static explanations cards with strict visual alignment */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Card 1: QKV explained */}
          <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              Q · K · V
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed pt-1">
              Each token projects itself into three vectors: a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 font-medium">Query</span> (what am I looking for?), a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-200 to-rose-500 font-medium">Key</span> (what do I represent?), and a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-500 font-medium">Value</span> (what do I contribute?).
              Attention is the dot product of Queries and Keys, softmaxed, then used to weight the
              Values.
            </p>
          </div>

          {/* Card 2: Multi-head explained */}
          <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              Multi-head
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed pt-1">
              Real models run this in parallel across dozens of heads. Each head learns a
              different specialty: nearby syntax, long-range co-reference, semantic roles, and
              more. Click between heads above to see different patterns emerge.
            </p>
          </div>
        </div>

      </ModuleLayout>
    </PageShell>
  );
}
