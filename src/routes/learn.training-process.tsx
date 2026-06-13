import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Code,
  Layers,
  Zap,
  MessageSquare,
  Rocket,
  Cpu,
  Activity,
  GitBranch,
  Brain,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  Check,
  X,
  ArrowRight,
  BookOpen,
  Sparkles,
  TrendingDown,
  LucideIcon,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/training-process")({
  head: () => ({
    meta: [
      { title: "LLM Training Process - Latent" },
      {
        name: "description",
        content:
          "An interactive, mathematically grounded walkthrough explaining how Large Language Models are pre-trained, aligned, and optimized.",
      },
      { property: "og:title", content: "LLM Training Process - Latent" },
      {
        property: "og:description",
        content:
          "Guided interactive journey through data cleaning, tokenization, embeddings, forward/backward passes, loss, and DPO alignment.",
      },
    ],
  }),
  component: Page,
});

// ACCESSIBILITY HOOK
function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);
  return prefersReduced;
}

// TYPES
type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

type StepSpec = {
  id: StepId;
  title: string;
  subtitle: string;
  description: string;
  formula?: string;
  details: string;
  deepDive: string;
  icon: LucideIcon;
  color: string;
};

// STEPS DEFINITIONS
const STEPS: StepSpec[] = [
  {
    id: 1,
    title: "Raw Data Collection",
    subtitle: "Step 01 / 11",
    description:
      "LLMs require massive text datasets gathered from the public web, books, code repositories, and scientific articles. This raw text forms the foundational knowledge base of the model.",
    formula:
      "\\mathcal{D}_{raw} = \\{ T_1, T_2, ..., T_M \\} \\quad T_i \\in \\text{Books, Code, Web}",
    details: "Modern production datasets range from 1 trillion to over 15 trillion tokens of text.",
    deepDive:
      "Training data is aggregated from massive web scrapes (like Common Crawl), curated book databases, open-source code repositories (GitHub), and academic papers. Deduplication is vital: repeating the same documents leads to memorization and capacity waste. Heavy heuristic filters remove spam, machine-generated gibberish, and formatting boilerplate before training begins.",
    icon: Database,
    color: "#00F0FF", // Cyan
  },
  {
    id: 2,
    title: "Data Cleaning & Tokenization",
    subtitle: "Step 02 / 11",
    description:
      "Models cannot read raw text directly. Text is sliced into subwords (tokens) using algorithms like Byte-Pair Encoding (BPE), mapping substrings to integer IDs.",
    formula:
      'f_{\\text{BPE}}(\\text{"attention"}) \\rightarrow [14352] \\quad \\mathcal{V} \\approx 50,000 - 100,000',
    details: "Vocabulary size (V) represents the finite set of unique subwords the model knows.",
    deepDive:
      "Tokenization bridges characters and neural inputs. Byte-Pair Encoding (BPE) starts with individual characters and iteratively merges the most frequent adjacent byte pairs. This enables the tokenizer to handle new words by splitting them into known subword roots (e.g., 'sub' + 'word'), preventing Out-Of-Vocabulary (OOV) errors.",
    icon: Code,
    color: "#8B5CF6", // Violet
  },
  {
    id: 3,
    title: "Embeddings & Vector Spaces",
    subtitle: "Step 03 / 11",
    description:
      "Tokens are mapped to high-dimensional continuous vectors. Semantically related words are positioned closer together in this geometric embedding space.",
    formula:
      "\\vec{e} = \\mathbf{W}_{embed} \\cdot \\vec{x} \\quad \\cos(\\theta) = \\frac{\\vec{a} \\cdot \\vec{b}}{\\|\\vec{a}\\|\\|\\vec{b}\\|}",
    details: "Embedding vectors are typically 768 to 4096 dimensions in size.",
    deepDive:
      "Every token ID index acts as a lookup into a large weight matrix. This retrieves a dense coordinate vector representing the token's semantic meaning. During training, backpropagation adjusts these coordinate positions, clusterizing words with similar syntactic and semantic roles (e.g., matching male/female vector analogies like 'king' - 'man' + 'woman' = 'queen').",
    icon: Brain,
    color: "#EC4899", // Pink
  },
  {
    id: 4,
    title: "Transformer Architecture",
    subtitle: "Step 04 / 11",
    description:
      "The token vectors enter a stack of Transformer blocks. The model size is determined by layer count, hidden state size, and attention head count.",
    formula: "\\text{Blocks} = L \\times \\big[ \\text{Multi-Head Attention} + \\text{FFN} \\big]",
    details:
      "A 7B parameter model typically has ~32 layers, 32 attention heads, and a dimension of 4096.",
    deepDive:
      "The decoder-only Transformer is the backbone of modern causal LLMs. Information passes sequentially through a series of identical blocks. Inside each block, self-attention maps context relationships, and feed-forward networks apply non-linear transformations. Pre-layer normalization and residual connections prevent gradient degradation.",
    icon: Layers,
    color: "#F59E0B", // Amber
  },
  {
    id: 5,
    title: "The Forward Pass",
    subtitle: "Step 05 / 11",
    description:
      "Tokens travel upward through the architecture. At each block, attention routes contextual signals, ultimately producing predicted probability logits for the next token.",
    formula:
      "\\mathbf{Z}^{(l+1)} = \\text{FFN}\\big(\\text{LN}\\big(\\text{Attention}(\\mathbf{Z}^{(l)}) + \\mathbf{Z}^{(l)}\\big)\\big) + \\mathbf{Z}^{(l)}",
    details: "Computations are executed in parallel across the sequence length during training.",
    deepDive:
      "The forward pass computes layer activations step-by-step. Hidden states are transformed at each level, calculating Query, Key, and Value projections to execute self-attention. The final state at the top of the stack is mapped back to the vocabulary dimension via a linear projection layer, yielding unnormalized scores (logits).",
    icon: Zap,
    color: "#10B981", // Emerald
  },
  {
    id: 6,
    title: "Loss Calculation",
    subtitle: "Step 06 / 11",
    description:
      "The model compares its next-token probability distribution against the actual target word. Cross-Entropy Loss measures the error of the prediction.",
    formula:
      "\\mathcal{L}_{CE} = -\\sum_{v \\in \\mathcal{V}} y_v \\log(P_v) = -\\log(P_{\\text{target}})",
    details: "Perfect prediction yields 0 loss. High confusion yields high loss values.",
    deepDive:
      "Cross-Entropy Loss calculates the negative natural logarithm of the probability assigned to the correct target token. If the model is confident in the correct token ($P \\rightarrow 1$), the loss is near zero. If the model assigns a low probability ($P \\rightarrow 0$), the loss grows exponentially towards infinity, penalizing incorrect confidence.",
    icon: Activity,
    color: "#EF4444", // Red
  },
  {
    id: 7,
    title: "Backpropagation",
    subtitle: "Step 07 / 11",
    description:
      "Gradients (error signals) are calculated from the Loss node back through the layers. The chain rule of calculus distributes error blame to every parameter.",
    formula:
      "\\frac{\\partial \\mathcal{L}}{\\partial W^{(l)}} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{A}^{(l)}} \\cdot \\frac{\\partial \\mathbf{A}^{(l)}}{\\partial W^{(l)}}",
    details:
      "Backpropagation operates in reverse order, starting at output logits down to embeddings.",
    deepDive:
      "Backpropagation calculates how the loss changes with respect to every single weight in the network. Using the calculus chain rule, the algorithm sweeps backward, multiplying local Jacobian matrices. This propagates gradient tensors from the final layer down to the initial token embeddings, storing the vector derivatives.",
    icon: GitBranch,
    color: "#6366F1", // Indigo
  },
  {
    id: 8,
    title: "Gradient Descent & Weight Updates",
    subtitle: "Step 08 / 11",
    description:
      "The optimizer adjusts model weights in the opposite direction of the gradient. AdamW scales updates based on running momentum and weight decay.",
    formula:
      "W_{t+1} = W_t - \\eta \\cdot \\left( \\frac{m_t}{\\sqrt{v_t} + \\epsilon} + \\lambda W_t \\right)",
    details:
      "Learning rate (eta) determines step size, while momentum prevents getting stuck in local minima.",
    deepDive:
      "Gradients show the path of steepest ascent on the loss surface. By walking in the opposite direction, the weights converge toward lower error. The AdamW optimizer maintains a running exponential average of past gradients (momentum $m_t$) and squared gradients (variance $v_t$) to adapt step sizes dynamically for each individual weight parameter.",
    icon: Cpu,
    color: "#3B82F6", // Blue
  },
  {
    id: 9,
    title: "Epochs & Scaling Laws",
    subtitle: "Step 09 / 11",
    description:
      "Training runs for thousands of steps. Model performance follows Chinchilla scaling laws, dictating parameters (N) and dataset tokens (D) should scale in equal ratios.",
    formula:
      "\\mathcal{L}(N, D) = \\frac{A}{N^{\\alpha}} + \\frac{B}{D^{\\beta}} + E \\quad \\text{FLOPs} \\approx 6ND",
    details: "Optimal compute allocation requires ~20 tokens per model parameter.",
    deepDive:
      "LLM pre-training performance scales predictably as a power-law function of parameter count $N$, dataset token count $D$, and total compute budget $C$. According to Kaplan et al. and the refined Chinchilla findings (Hoffmann et al.), to optimize a fixed compute budget, parameter size and token quantity must scale proportionally: doubling parameters requires doubling token counts.",
    icon: TrendingDown,
    color: "#F43F5E", // Rose
  },
  {
    id: 10,
    title: "Fine-Tuning & Alignment",
    subtitle: "Step 10 / 11",
    description:
      "After pre-training, the model undergoes Supervised Fine-Tuning (SFT) and Direct Preference Optimization (DPO) to follow prompts safely and helpfully.",
    formula:
      "\\mathcal{L}_{DPO} = -\\mathbb{E}_{(x, y_w, y_l)}\\left[ \\log \\sigma \\left( \\beta \\log \\frac{\\pi_\\theta(y_w|x)}{\\pi_{ref}(y_w|x)} - \\beta \\log \\frac{\\pi_\\theta(y_l|x)}{\\pi_{ref}(y_l|x)} \\right) \\right]",
    details: "SFT teaches task completion; alignment overlays safety and instruction constraints.",
    deepDive:
      "Raw pre-trained models are next-token mimics. SFT fine-tunes them on high-quality prompt-response dialogs. Alignment protocols like Reinforcement Learning from Human Feedback (RLHF) or Direct Preference Optimization (DPO) further align behavior by training on paired choices: preferred response $y_w$ vs. dispreferred response $y_l$.",
    icon: MessageSquare,
    color: "#10B981", // Mint Green
  },
  {
    id: 11,
    title: "Inference & Token Generation",
    subtitle: "Step 11 / 11",
    description:
      "The model runs autoregressively, appending its generated token back into the input sequence. Temperature and Top-P shape output creativity.",
    formula:
      "P(x_i) = \\frac{\\exp(z_i / T)}{\\sum_j \\exp(z_j / T)} \\quad \\sum_{i \\in \\text{Nucleus}} P(x_i) \\ge p",
    details:
      "Autoregressive means the model generates one word at a time, calling itself in a loop.",
    deepDive:
      "During generation, logits are scaled by Temperature $T$. Low temperature ($T \\rightarrow 0$) sharpens logits, making the model highly deterministic and repetitive. High temperature flattens the distribution, yielding creative or chaotic text. Top-P (nucleus sampling) limits selection to the smallest set of words whose cumulative probability exceeds threshold $p$.",
    icon: Rocket,
    color: "#A78BFA", // Lavender
  },
];

// DYNAMIC STEP WIDGETS
// Step 1: Raw Data Collection
function DataCollectionWidget() {
  const [dedup, setDedup] = useState(true);
  const [quality, setQuality] = useState(true);
  const [toxicity, setToxicity] = useState(true);
  const [tokensCount, setTokensCount] = useState(0);
  const [lines, setLines] = useState<
    Array<{
      id: number;
      text: string;
      status: "passing" | "discarded" | "duplicate" | "toxic";
      source: string;
    }>
  >([]);
  const [progress, setProgress] = useState(0);

  const idCounterRef = useRef(0);

  const rawDataPool = [
    { text: "The Capital of France is Paris.", status: "passing" as const, source: "Wikipedia" },
    { text: "The Capital of France is Paris.", status: "duplicate" as const, source: "WebScrape" },
    { text: "GET CHEAP DRUGS NOW!!! CLICK LINK", status: "toxic" as const, source: "SpamDump" },
    { text: "Quantum computing operates on qubits.", status: "passing" as const, source: "arXiv" },
    {
      text: "<html><body><h1>Title</h1><p>Test</p></body></html>",
      status: "discarded" as const,
      source: "CommonCrawl",
    },
    {
      text: "const calculateLoss = (y, p) => -Math.log(p);",
      status: "passing" as const,
      source: "GitHub",
    },
    { text: "You are an idiot and I hate you.", status: "toxic" as const, source: "Reddit" },
    {
      text: "Photosynthesis converts light to energy.",
      status: "passing" as const,
      source: "Textbook",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const item = rawDataPool[Math.floor(Math.random() * rawDataPool.length)];

      let finalStatus: "passing" | "discarded" | "duplicate" | "toxic" = "passing";
      if (item.status === "duplicate" && dedup) finalStatus = "duplicate";
      else if (item.status === "discarded" && quality) finalStatus = "discarded";
      else if (item.status === "toxic" && toxicity) finalStatus = "toxic";

      setLines((prev) => {
        const next = [
          { id: idCounterRef.current++, text: item.text, status: finalStatus, source: item.source },
          ...prev,
        ];
        return next.slice(0, 5);
      });

      setProgress(0);

      if (finalStatus === "passing") {
        setTokensCount((c) => c + 15);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [dedup, quality, toxicity]);

  // Update progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p < 100 ? p + 8.5 : 100));
    }, 100);
    return () => clearInterval(timer);
  }, [lines]);

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-mono">
          Pipeline Data Filtering
        </div>

        {/* Toggle Filters */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setDedup(!dedup)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-300 ${dedup ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-white/[0.02] border-white/10 text-muted-foreground"}`}
          >
            <span>Deduplicate</span>
            {dedup ? <Check size={12} /> : <X size={12} />}
          </button>
          <button
            onClick={() => setQuality(!quality)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-300 ${quality ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-white/[0.02] border-white/10 text-muted-foreground"}`}
          >
            <span>Quality Filter</span>
            {quality ? <Check size={12} /> : <X size={12} />}
          </button>
          <button
            onClick={() => setToxicity(!toxicity)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-300 ${toxicity ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-white/[0.02] border-white/10 text-muted-foreground"}`}
          >
            <span>Safety Shield</span>
            {toxicity ? <Check size={12} /> : <X size={12} />}
          </button>
        </div>

        {/* Live progress stream bar */}
        <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden mb-3">
          <div
            className="bg-cyan-400 h-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Live Stream Panel */}
        <div className="space-y-2 font-mono text-[11px] bg-black/40 rounded-xl p-3 min-h-[190px] border border-white/5 relative overflow-hidden">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                className="border-b border-white/5 pb-1 flex items-center justify-between overflow-hidden"
              >
                <div className="flex items-center gap-2 max-w-[70%]">
                  <span className="text-[9px] uppercase px-1 rounded bg-white/5 text-muted-foreground font-mono">
                    {line.source}
                  </span>
                  <span
                    className={`truncate ${line.status !== "passing" ? "line-through text-muted-foreground/60" : "text-foreground"}`}
                  >
                    {line.text}
                  </span>
                </div>
                <div>
                  {line.status === "passing" && (
                    <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                      PASS
                    </span>
                  )}
                  {line.status === "duplicate" && (
                    <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                      DUP
                    </span>
                  )}
                  {line.status === "toxic" && (
                    <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                      TOXIC
                    </span>
                  )}
                  {line.status === "discarded" && (
                    <span className="text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                      SPAM
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-xl">
        <span className="text-xs text-muted-foreground font-mono">Tokens Ingested:</span>
        <span className="font-mono text-sm text-cyan-400 font-bold">
          {tokensCount.toLocaleString()} tokens
        </span>
      </div>
    </div>
  );
}

// Step 2: Data Cleaning & Tokenization
function TokenizationWidget() {
  const [vocabSizeLabel, setVocabSizeLabel] = useState(1); // 0 = Small, 1 = Medium, 2 = Large

  // Token mappings based on vocabulary size
  const tokenList = useMemo(() => {
    if (vocabSizeLabel === 0) {
      // Small Vocab: Fragmented subwords
      return [
        {
          text: "at",
          id: 256,
          color: "rgba(139, 92, 246, 0.2)",
          border: "rgba(139, 92, 246, 0.5)",
        },
        {
          text: "ten",
          id: 3209,
          color: "rgba(139, 92, 246, 0.2)",
          border: "rgba(139, 92, 246, 0.5)",
        },
        {
          text: "tion",
          id: 418,
          color: "rgba(139, 92, 246, 0.2)",
          border: "rgba(139, 92, 246, 0.5)",
        },
        { text: " is", id: 318, color: "rgba(6, 182, 212, 0.2)", border: "rgba(6, 182, 212, 0.5)" },
        {
          text: " all",
          id: 477,
          color: "rgba(236, 72, 153, 0.2)",
          border: "rgba(236, 72, 153, 0.5)",
        },
        {
          text: " you",
          id: 345,
          color: "rgba(245, 158, 11, 0.2)",
          border: "rgba(245, 158, 11, 0.5)",
        },
        {
          text: " ne",
          id: 301,
          color: "rgba(16, 185, 129, 0.2)",
          border: "rgba(16, 185, 129, 0.5)",
        },
        {
          text: "ed",
          id: 268,
          color: "rgba(16, 185, 129, 0.2)",
          border: "rgba(16, 185, 129, 0.5)",
        },
      ];
    } else if (vocabSizeLabel === 1) {
      // Medium Vocab: Standard subwords
      return [
        {
          text: "attention",
          id: 14352,
          color: "rgba(139, 92, 246, 0.2)",
          border: "rgba(139, 92, 246, 0.5)",
        },
        { text: " is", id: 318, color: "rgba(6, 182, 212, 0.2)", border: "rgba(6, 182, 212, 0.5)" },
        {
          text: " all",
          id: 477,
          color: "rgba(236, 72, 153, 0.2)",
          border: "rgba(236, 72, 153, 0.5)",
        },
        {
          text: " you",
          id: 345,
          color: "rgba(245, 158, 11, 0.2)",
          border: "rgba(245, 158, 11, 0.5)",
        },
        {
          text: " need",
          id: 764,
          color: "rgba(16, 185, 129, 0.2)",
          border: "rgba(16, 185, 129, 0.5)",
        },
      ];
    } else {
      // Large Vocab: Merged compound expressions
      return [
        {
          text: "attention",
          id: 14352,
          color: "rgba(139, 92, 246, 0.2)",
          border: "rgba(139, 92, 246, 0.5)",
        },
        {
          text: " is all",
          id: 38241,
          color: "rgba(6, 182, 212, 0.2)",
          border: "rgba(6, 182, 212, 0.5)",
        },
        {
          text: " you need",
          id: 45091,
          color: "rgba(236, 72, 153, 0.2)",
          border: "rgba(236, 72, 153, 0.5)",
        },
      ];
    }
  }, [vocabSizeLabel]);

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-mono">
          Vocabulary size influence
        </div>

        {/* Vocabulary Size Slider */}
        <div className="space-y-1 mb-6">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">BPE Vocabulary (V)</span>
            <span className="text-violet-400 font-bold">
              {vocabSizeLabel === 0
                ? "Small (8k vocabulary)"
                : vocabSizeLabel === 1
                  ? "Medium (32k vocabulary)"
                  : "Large (100k vocabulary)"}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={vocabSizeLabel}
            onChange={(e) => setVocabSizeLabel(parseInt(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>

        {/* Character/Subword split representation */}
        <div className="mb-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-mono">
            BPE Tokenizer Output Slices
          </div>
          <div className="flex flex-wrap gap-1 p-4 bg-black/40 border border-white/5 rounded-xl text-lg font-mono tracking-wide min-h-[92px]">
            {tokenList.map((token, idx) => (
              <span
                key={idx}
                style={{ background: token.color, border: `1px solid ${token.border}` }}
                className="px-2 py-1 rounded-md text-foreground text-xs flex flex-col items-center justify-center transition-all duration-300"
              >
                <span>{token.text.replace(" ", "␣")}</span>
                <span className="text-[9px] text-muted-foreground font-mono mt-1 mt-0.5">
                  ID: {token.id}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Token IDs list */}
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-mono">
            Embedding indices lookup values
          </div>
          <div className="bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-violet-300 text-xs transition-all duration-300">
            {`[ ${tokenList.map((t) => t.id).join(", ")} ]`}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Embeddings & Vector Representation
function EmbeddingsWidget() {
  const [selectedWord, setSelectedWord] = useState<string | null>("king");
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [draggingWord, setDraggingWord] = useState<string | null>(null);
  const [newWordText, setNewWordText] = useState("");
  const [mathStep, setMathStep] = useState(0); // Vector math animation steps

  const defaultWords = [
    { word: "king", coords: [0.55, 0.6], color: "#00F0FF" },
    { word: "queen", coords: [0.55, 0.25], color: "#8B5CF6" },
    { word: "man", coords: [0.15, 0.6], color: "#EC4899" },
    { word: "woman", coords: [0.15, 0.25], color: "#F59E0B" },
    { word: "computer", coords: [-0.65, -0.45], color: "#10B981" },
    { word: "algorithm", coords: [-0.5, -0.7], color: "#3B82F6" },
  ];

  const [wordsList, setWordsList] = useState(defaultWords);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const mathTimeout1Ref = useRef<NodeJS.Timeout | null>(null);
  const mathTimeout2Ref = useRef<NodeJS.Timeout | null>(null);
  const mathTimeout3Ref = useRef<NodeJS.Timeout | null>(null);

  const clearMathTimeouts = () => {
    if (mathTimeout1Ref.current) clearTimeout(mathTimeout1Ref.current);
    if (mathTimeout2Ref.current) clearTimeout(mathTimeout2Ref.current);
    if (mathTimeout3Ref.current) clearTimeout(mathTimeout3Ref.current);
    mathTimeout1Ref.current = null;
    mathTimeout2Ref.current = null;
    mathTimeout3Ref.current = null;
  };

  const runVectorMath = () => {
    clearMathTimeouts();
    setMathStep(1);
    mathTimeout1Ref.current = setTimeout(() => setMathStep(2), 1200);
    mathTimeout2Ref.current = setTimeout(() => setMathStep(3), 2400);
    mathTimeout3Ref.current = setTimeout(() => setMathStep(4), 3600);
  };

  const resetVectorMath = () => {
    clearMathTimeouts();
    setMathStep(0);
  };

  useEffect(() => {
    return () => clearMathTimeouts();
  }, []);

  const handleAddWord = () => {
    const text = newWordText.trim().toLowerCase();
    if (!text) return;
    if (wordsList.some((w) => w.word === text)) return;

    const colors = ["#F43F5E", "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#06B6D4", "#EC4899"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    setWordsList((prev) => [...prev, { word: text, coords: [0.0, 0.0], color: randomColor }]);
    setNewWordText("");
    setSelectedWord(text);
  };

  const handleResetWords = () => {
    setWordsList(defaultWords);
    setSelectedWord("king");
    setHoveredWord(null);
    setMathStep(0);
    clearMathTimeouts();
  };

  const activeWord = hoveredWord || selectedWord;

  // Helper to calculate cosine similarities
  const similarities = useMemo(() => {
    if (!activeWord) return [];
    const sourceWord = wordsList.find((w) => w.word === activeWord);
    if (!sourceWord) return [];

    return wordsList
      .filter((w) => w.word !== activeWord)
      .map((w) => {
        const dotProd = sourceWord.coords[0] * w.coords[0] + sourceWord.coords[1] * w.coords[1];
        const mag1 = Math.sqrt(sourceWord.coords[0] ** 2 + sourceWord.coords[1] ** 2);
        const mag2 = Math.sqrt(w.coords[0] ** 2 + w.coords[1] ** 2);
        const cosineSim = mag1 === 0 || mag2 === 0 ? 0 : dotProd / (mag1 * mag2);
        return { word: w.word, sim: cosineSim };
      })
      .sort((a, b) => b.sim - a.sim);
  }, [activeWord, wordsList]);

  // Pointer event handlers for dragging words
  const handlePointerDown = (e: React.PointerEvent<SVGElement>, word: string) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Pointer capture failed:", err);
    }
    setDraggingWord(word);
    setSelectedWord(word);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingWord) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    // Clamp coordinates to [-1, 1]
    const x = Math.max(-1, Math.min(1, relX * 2 - 1));
    const y = Math.max(-1, Math.min(1, -(relY * 2 - 1)));

    const roundedX = Math.round(x * 100) / 100;
    const roundedY = Math.round(y * 100) / 100;

    setWordsList((prev) =>
      prev.map((w) => (w.word === draggingWord ? { ...w, coords: [roundedX, roundedY] } : w)),
    );
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingWord) {
      setDraggingWord(null);
    }
  };

  const kingWord = wordsList.find((w) => w.word === "king") || {
    coords: [0.55, 0.6],
  };
  const manWord = wordsList.find((w) => w.word === "man") || {
    coords: [0.15, 0.6],
  };
  const womanWord = wordsList.find((w) => w.word === "woman") || {
    coords: [0.15, 0.25],
  };

  const kingX = kingWord.coords[0] * 80;
  const kingY = -kingWord.coords[1] * 80;

  const manX = manWord.coords[0] * 80;
  const manY = -manWord.coords[1] * 80;

  const womanX = womanWord.coords[0] * 80;
  const womanY = -womanWord.coords[1] * 80;

  const step2X = kingX - manX;
  const step2Y = kingY - manY;

  const step3X = step2X + womanX;
  const step3Y = step2Y + womanY;

  const getMarkerId = (color: string) => {
    switch (color) {
      case "#00F0FF":
        return "arrow-cyan";
      case "#8B5CF6":
        return "arrow-violet";
      case "#EC4899":
        return "arrow-pink";
      case "#F59E0B":
        return "arrow-amber";
      case "#10B981":
        return "arrow-emerald";
      case "#3B82F6":
        return "arrow-blue";
      case "#F43F5E":
        return "arrow-rose";
      default:
        return "arrow-white";
    }
  };

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="grid grid-cols-[1fr,200px] gap-4">
        {/* SVG Semantic Space Map */}
        <div className="relative border border-white/5 rounded-xl bg-black/40 aspect-square overflow-hidden flex flex-col items-center justify-center select-none">
          <svg
            ref={svgRef}
            className="w-full h-full touch-none"
            viewBox="-100 -100 200 200"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* SVG Markers for Vector Arrows */}
            <defs>
              <marker
                id="arrow-cyan"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#00F0FF" />
              </marker>
              <marker
                id="arrow-violet"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#8B5CF6" />
              </marker>
              <marker
                id="arrow-pink"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#EC4899" />
              </marker>
              <marker
                id="arrow-amber"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#F59E0B" />
              </marker>
              <marker
                id="arrow-emerald"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#10B981" />
              </marker>
              <marker
                id="arrow-blue"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#3B82F6" />
              </marker>
              <marker
                id="arrow-rose"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#F43F5E" />
              </marker>
              <marker
                id="arrow-white"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#FFFFFF" />
              </marker>
            </defs>

            {/* Grid Lines */}
            <line
              x1="-100"
              y1="0"
              x2="100"
              y2="0"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="-100"
              x2="0"
              y2="100"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
            <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(255, 255, 255, 0.02)" />
            <circle cx="0" cy="0" r="80" fill="none" stroke="rgba(255, 255, 255, 0.02)" />

            {/* Dotted vector lines for all non-selected words */}
            {wordsList.map((w, idx) => {
              const svgX = w.coords[0] * 80;
              const svgY = -w.coords[1] * 80;
              const isSelected = selectedWord === w.word;
              const isHovered = hoveredWord === w.word;
              if (isSelected || isHovered) return null;
              return (
                <line
                  key={`vec-${idx}`}
                  x1="0"
                  y1="0"
                  x2={svgX}
                  y2={svgY}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="0.75"
                  strokeDasharray="2 2"
                />
              );
            })}

            {/* Active word glowing vector arrow */}
            {activeWord &&
              (() => {
                const actData = wordsList.find((w) => w.word === activeWord);
                if (!actData) return null;
                const svgX = actData.coords[0] * 80;
                const svgY = -actData.coords[1] * 80;
                return (
                  <line
                    x1="0"
                    y1="0"
                    x2={svgX}
                    y2={svgY}
                    stroke={actData.color}
                    strokeWidth="2.5"
                    markerEnd={`url(#${getMarkerId(actData.color)})`}
                  />
                );
              })()}

            {/* Connection line & similarity bubble when hovering another word */}
            {selectedWord &&
              hoveredWord &&
              selectedWord !== hoveredWord &&
              (() => {
                const sWord = wordsList.find((w) => w.word === selectedWord);
                const hWord = wordsList.find((w) => w.word === hoveredWord);
                if (!sWord || !hWord) return null;
                const sX = sWord.coords[0] * 80;
                const sY = -sWord.coords[1] * 80;
                const hX = hWord.coords[0] * 80;
                const hY = -hWord.coords[1] * 80;
                const midX = (sX + hX) / 2;
                const midY = (sY + hY) / 2;
                const sim = similarities.find((s) => s.word === hoveredWord)?.sim ?? 0;
                return (
                  <g>
                    <line
                      x1={sX}
                      y1={sY}
                      x2={hX}
                      y2={hY}
                      stroke="#8B5CF6"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-20"
                        y="-7"
                        width="40"
                        height="14"
                        rx="4"
                        fill="#1E1B4B"
                        stroke="#8B5CF6"
                        strokeWidth="0.75"
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#DDD6FE"
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono"
                      >
                        {sim.toFixed(2)}
                      </text>
                    </g>
                  </g>
                );
              })()}

            {/* Render Draggable Word Groups */}
            {wordsList.map((w, idx) => {
              const svgX = w.coords[0] * 80;
              const svgY = -w.coords[1] * 80;
              const isSelected = selectedWord === w.word;
              const isHovered = hoveredWord === w.word;
              const isDragging = draggingWord === w.word;

              return (
                <g
                  key={idx}
                  className="select-none"
                  onPointerDown={(e) => handlePointerDown(e, w.word)}
                  onMouseEnter={() => setHoveredWord(w.word)}
                  onMouseLeave={() => setHoveredWord(null)}
                  style={{
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                >
                  {/* Subtle hover area circle (invisible backplate for easy touching) */}
                  <circle cx={svgX} cy={svgY} r="14" fill="transparent" />

                  {/* Visual Node */}
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={isHovered || isSelected ? 7 : 4.5}
                    fill={w.color}
                    stroke={isHovered || isSelected ? "#FFFFFF" : "transparent"}
                    strokeWidth="1.5"
                    className="transition-all duration-200"
                  />

                  {/* Word Label */}
                  <text
                    x={svgX}
                    y={svgY - 11}
                    fill={isHovered || isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.65)"}
                    fontSize="9"
                    fontWeight={isHovered || isSelected ? "bold" : "normal"}
                    textAnchor="middle"
                    className="font-mono tracking-wider transition-colors duration-200"
                  >
                    {w.word}
                  </text>
                </g>
              );
            })}

            {/* Vector Math Lines */}
            {mathStep >= 1 && (
              // Step 1: Draw vector to King
              <line
                x1="0"
                y1="0"
                x2={kingX}
                y2={kingY}
                stroke="#00F0FF"
                strokeWidth="2.5"
                markerEnd="url(#arrow-cyan)"
              />
            )}
            {mathStep >= 2 && (
              // Step 2: Subtract Man vector: goes left from King
              <line
                x1={kingX}
                y1={kingY}
                x2={step2X}
                y2={step2Y}
                stroke="#EF4444"
                strokeWidth="2.5"
                markerEnd="url(#arrow-red)"
              />
            )}
            {mathStep >= 3 && (
              // Step 3: Add Woman vector: goes down (up in coord) to Queen
              <line
                x1={step2X}
                y1={step2Y}
                x2={step3X}
                y2={step3Y}
                stroke="#F59E0B"
                strokeWidth="2.5"
                markerEnd="url(#arrow-amber)"
              />
            )}
            {mathStep >= 4 && (
              // Step 4: Highlight Queen
              <g>
                <circle
                  cx={step3X}
                  cy={step3Y}
                  r="9"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  className="animate-ping"
                />
                <circle cx={step3X} cy={step3Y} r="3" fill="#10B981" />
              </g>
            )}
          </svg>
        </div>

        {/* Similarities Sidebar list */}
        <div className="flex flex-col justify-between h-full min-h-[220px]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-mono">
              Cosine Similarity
            </div>
            {activeWord ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono mb-2">
                  <span className="text-muted-foreground">Source:</span>
                  <span
                    style={{
                      color: wordsList.find((w) => w.word === activeWord)?.color ?? "#A78BFA",
                    }}
                  >
                    {activeWord}
                  </span>
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {similarities.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-[9px] font-mono border-b border-white/5 pb-1"
                    >
                      <span className="text-muted-foreground">{item.word}</span>
                      <span className="text-foreground font-bold">{item.sim.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground/80 leading-relaxed font-mono">
                Click or drag any word in the grid to calculate cosine similarities.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/5 space-y-2">
            <button
              onClick={mathStep === 0 ? runVectorMath : resetVectorMath}
              className="w-full py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/35 text-pink-400 font-mono text-[9px] font-bold hover:bg-pink-500/20 transition-all cursor-pointer"
            >
              {mathStep === 0 ? "Test Vector Math" : "Reset Vector Math"}
            </button>
            {mathStep > 0 && (
              <div className="text-[8px] text-muted-foreground font-mono text-center">
                {mathStep === 1 && "1. Vector(King)"}
                {mathStep === 2 && "2. King - Vector(Man)"}
                {mathStep === 3 && "3. King - Man + Vector(Woman)"}
                {mathStep === 4 && "4. Result: Vector(Queen)!"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar for Custom Words */}
      <div className="flex items-center gap-2 mt-3 p-1.5 bg-white/[0.02] border border-white/5 rounded-xl">
        <input
          type="text"
          placeholder="Add custom word (e.g. cpu)..."
          value={newWordText}
          onChange={(e) => setNewWordText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono text-white placeholder-muted-foreground focus:outline-none focus:border-pink-500/50 flex-grow"
          maxLength={12}
        />
        <button
          onClick={handleAddWord}
          className="px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-400 font-mono text-[9px] font-bold hover:bg-pink-500/30 transition-all cursor-pointer"
        >
          + Add
        </button>
        <button
          onClick={handleResetWords}
          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground font-mono text-[9px] hover:bg-white/10 transition-all cursor-pointer"
        >
          Reset Space
        </button>
      </div>
    </div>
  );
}

// Step 4: Transformer Architecture
function ArchitectureWidget() {
  const [layersCount, setLayersCount] = useState(12);
  const [dModel, setDModel] = useState(768);
  const [heads, setHeads] = useState(12);
  const vocabSize = 50257;

  // Calculators
  const embeddingParams = vocabSize * dModel;
  const attentionParams = 4 * (dModel * dModel) * layersCount;
  const ffnParams = 8 * (dModel * dModel) * layersCount;
  const totalParams = embeddingParams + attentionParams + ffnParams + dModel * vocabSize;

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="grid grid-cols-[1.2fr,1fr] gap-4">
        {/* Sliders */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground font-mono">Layers (L)</span>
              <span className="text-amber-400 font-bold">{layersCount} blocks</span>
            </div>
            <input
              type="range"
              min="4"
              max="32"
              step="4"
              value={layersCount}
              onChange={(e) => setLayersCount(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground font-mono">Dimension (d_model)</span>
              <span className="text-amber-400 font-bold">{dModel} hidden units</span>
            </div>
            <input
              type="range"
              min="256"
              max="2048"
              step="256"
              value={dModel}
              onChange={(e) => setDModel(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground font-mono">Attention Heads (H)</span>
              <span className="text-amber-400 font-bold">{heads} heads</span>
            </div>
            <input
              type="range"
              min="4"
              max="16"
              step="4"
              value={heads}
              onChange={(e) => setHeads(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
            <div className="bg-black/30 border border-white/5 p-1.5 rounded-lg">
              <div className="text-muted-foreground">Embedding parameters</div>
              <div className="text-foreground font-bold font-mono">
                {(embeddingParams / 1e6).toFixed(1)}M
              </div>
            </div>
            <div className="bg-black/30 border border-white/5 p-1.5 rounded-lg">
              <div className="text-muted-foreground font-mono">Attention sublayers</div>
              <div className="text-foreground font-bold font-mono">
                {(attentionParams / 1e6).toFixed(1)}M
              </div>
            </div>
          </div>
        </div>

        {/* Visual Schematic Box representation */}
        <div className="relative border border-white/5 rounded-xl bg-black/40 flex flex-col items-center justify-center p-4">
          <div className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Model Shape Schematic
          </div>
          <div className="flex flex-col items-center justify-between border-t border-b border-white/10 w-full flex-grow py-3">
            {Array.from({ length: Math.min(layersCount, 12) }).map((_, idx) => {
              const barWidth = 30 + (dModel / 2048) * 60;
              return (
                <div
                  key={idx}
                  style={{ width: `${barWidth}%` }}
                  className="h-1.5 bg-amber-500/20 border border-amber-500/40 rounded transition-all duration-300"
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl mt-3">
        <span className="text-xs text-muted-foreground font-mono">
          Calculated Parameter Capacity:
        </span>
        <span className="font-mono text-sm text-amber-400 font-bold">
          {(totalParams / 1e6).toFixed(1)}M parameters
        </span>
      </div>
    </div>
  );
}

// Step 5: The Forward Pass
function ForwardPassWidget() {
  const [activeStep, setActiveStep] = useState(0);

  const forwardSteps = [
    {
      label: "Input Token IDs",
      details: "[14352, 318, 477]",
      desc: "Token vectors load at bottom",
    },
    {
      label: "Embedding Matrix",
      details: "Lookup dense coordinate vectors",
      desc: "Indices resolve to embeddings",
    },
    {
      label: "Transformer Block 1",
      details: "Self-Attention + LayerNorm + MLP",
      desc: "Contextualizes token meanings",
    },
    {
      label: "Transformer Block 2",
      details: "Self-Attention + LayerNorm + MLP",
      desc: "Extracts higher abstractions",
    },
    {
      label: "Logits Layer",
      details: "Linear projection of final hidden states",
      desc: "Scores 50k vocabulary entries",
    },
    {
      label: "Output Token Choice",
      details: 'Highest logit: "need" (V=764)',
      desc: "Emits output token predictions",
    },
  ];

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-mono">
          Feedforward signal flow
        </div>

        {/* Vertical layers stacking */}
        <div className="space-y-1.5 min-h-[220px]">
          {forwardSteps.map((step, idx) => {
            const listIndex = forwardSteps.length - 1 - idx; // stack bottom to top
            const isCurrent = activeStep === listIndex;
            const isPassed = activeStep > listIndex;

            return (
              <div
                key={idx}
                className={`p-2 rounded-xl border font-mono transition-all duration-300 ${
                  isCurrent
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold scale-[1.02]"
                    : isPassed
                      ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600/80"
                      : "bg-white/[0.01] border-white/5 text-muted-foreground"
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span>{step.label}</span>
                  <span className="text-[9px] opacity-80 font-mono">{step.details}</span>
                </div>
                {isCurrent && (
                  <div className="text-[10px] font-sans font-normal text-muted-foreground mt-1">
                    {step.desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setActiveStep((s) => (s > 0 ? s - 1 : 0))}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono hover:bg-white/5 transition-all animate-none"
        >
          Reset/Prev
        </button>
        <button
          onClick={() => setActiveStep((s) => (s < forwardSteps.length - 1 ? s + 1 : 0))}
          className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-mono font-bold hover:bg-emerald-400 transition-all flex items-center gap-2"
        >
          <span>{activeStep === forwardSteps.length - 1 ? "Start Over" : "Push Forward"}</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

// Step 6: Loss Calculation
function LossCalculationWidget() {
  const [prob, setProb] = useState(0.4);

  // Cross entropy loss: -ln(P)
  const lossVal = -Math.log(prob);

  // Generate points for SVG line representation of negative logarithm
  const linePoints = useMemo(() => {
    const pts = [];
    for (let x = 0; x <= 0.99; x += 0.02) {
      const clampedX = Math.max(x, 0.01);
      const y = -Math.log(clampedX) * 15;
      const svgX = x * 100;
      const svgY = 70 - y;
      pts.push(`${svgX},${svgY}`);
    }
    return pts.join(" ");
  }, []);

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="grid grid-cols-[1.2fr,1.1fr] gap-4">
        {/* Left: Probabilities Logits Bar chart */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Softmax Logits Output
          </div>
          <div className="space-y-2 bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono text-[9px] min-h-[170px] flex flex-col justify-around">
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-red-400">
                <span className="font-mono">need (Target)</span>
                <span>{(prob * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all duration-100"
                  style={{ width: `${prob * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 opacity-70">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-mono">want</span>
                <span>{((1 - prob) * 60).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full transition-all duration-100"
                  style={{ width: `${(1 - prob) * 60}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 opacity-70">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-mono">have</span>
                <span>{((1 - prob) * 40).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full transition-all duration-100"
                  style={{ width: `${(1 - prob) * 40}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: SVG Graph representation */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Cross-Entropy Loss Curve
          </div>
          <div className="relative border border-white/5 rounded-xl bg-black/40 h-[170px] overflow-hidden flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 100 80">
              {/* Grid Line */}
              <line
                x1="0"
                y1="70"
                x2="100"
                y2="70"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="0.5"
              />

              {/* Mathematical Log Curve */}
              <polyline fill="none" stroke="#EF4444" strokeWidth="1.2" points={linePoints} />

              {/* Live point marker indicator */}
              <circle
                cx={prob * 100}
                cy={70 - lossVal * 15}
                r="2.5"
                fill="#EF4444"
                className="animate-pulse"
              />

              <text x="5" y="15" fill="rgba(255,255,255,0.4)" fontSize="4" className="font-mono">
                Loss = -ln(P)
              </text>
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-3">
        <input
          type="range"
          min="0.02"
          max="0.99"
          step="0.02"
          value={prob}
          onChange={(e) => setProb(parseFloat(e.target.value))}
          className="w-full accent-red-500"
        />
        <div className="flex justify-between items-center bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
          <span className="text-xs text-muted-foreground font-mono">Calculated Loss:</span>
          <span className="font-mono text-sm text-red-400 font-bold">
            {lossVal.toFixed(4)} nats
          </span>
        </div>
      </div>
    </div>
  );
}

// Step 7: Backpropagation
function BackpropWidget() {
  const [backpropRunning, setBackpropRunning] = useState(false);
  const [pulseIndices, setPulseIndices] = useState<number[]>([]);

  const layersList = [
    { name: "Output Loss", grad: "dL/dL = 1.0", formula: "Base gradient" },
    { name: "Decoder Block 3", grad: "dL/dW_b3 = 0.045", formula: "dL/dY * dY/dW" },
    {
      name: "Decoder Block 2",
      grad: "dL/dW_b2 = -0.122",
      formula: "dLoss/dBlock3 * dBlock3/dBlock2",
    },
    {
      name: "Decoder Block 1",
      grad: "dL/dW_b1 = 0.089",
      formula: "dLoss/dBlock2 * dBlock2/dBlock1",
    },
    {
      name: "Embedding Space",
      grad: "dL/dW_emb = -0.015",
      formula: "dLoss/dBlock1 * dBlock1/dEmb",
    },
  ];

  const triggerBackprop = () => {
    if (backpropRunning) return;
    setBackpropRunning(true);
    setPulseIndices([]);

    // Simulate gradient pulse flowing down layers step-by-step
    layersList.forEach((_, idx) => {
      setTimeout(() => {
        setPulseIndices((prev) => [...prev, idx]);
      }, idx * 600);
    });

    setTimeout(
      () => {
        setBackpropRunning(false);
      },
      layersList.length * 600 + 400,
    );
  };

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-mono">
          Gradient chain flow
        </div>

        <div className="space-y-1.5 min-h-[220px]">
          {layersList.map((layer, idx) => {
            const isActive = pulseIndices.includes(idx);
            return (
              <div
                key={idx}
                className={`p-2 rounded-xl border font-mono transition-all duration-300 ${
                  isActive
                    ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 font-bold"
                    : "bg-white/[0.01] border-white/5 text-muted-foreground/60"
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span>{layer.name}</span>
                  {isActive ? (
                    <span className="text-[10px] text-indigo-300 font-bold animate-pulse">
                      {layer.grad}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground/45">{layer.formula}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={triggerBackprop}
          disabled={backpropRunning}
          className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-mono font-bold hover:bg-indigo-500 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={12} className={backpropRunning ? "animate-spin" : ""} />
          <span>{backpropRunning ? "Propagating Gradients..." : "Trigger Backprop"}</span>
        </button>
      </div>
    </div>
  );
}

// Step 8: Gradient Descent & Weight Updates
function GradientDescentWidget() {
  const [weights, setWeights] = useState<{ x: number; y: number }[]>([{ x: -0.75, y: 0.7 }]);
  const [learningRate, setLearningRate] = useState(0.2);
  const [weightDecay, setWeightDecay] = useState(0.05);
  const [optimizer, setOptimizer] = useState<"SGD" | "AdamW">("AdamW");
  const [momentum, setMomentum] = useState({ x: 0, y: 0 });

  const currentWeight = weights[weights.length - 1];

  const updateWeights = () => {
    const gradX = currentWeight.x * 2.0;
    const gradY = currentWeight.y * 6.0;

    if (optimizer === "SGD") {
      const nextX = currentWeight.x - learningRate * gradX;
      const nextY = currentWeight.y - learningRate * gradY;
      setWeights((prev) => [...prev, { x: nextX, y: nextY }]);
    } else {
      const nextMomX = 0.9 * momentum.x + 0.1 * gradX;
      const nextMomY = 0.9 * momentum.y + 0.1 * gradY;
      setMomentum({ x: nextMomX, y: nextMomY });

      const nextX = currentWeight.x * (1 - learningRate * weightDecay) - learningRate * nextMomX;
      const nextY = currentWeight.y * (1 - learningRate * weightDecay) - learningRate * nextMomY;
      setWeights((prev) => [...prev, { x: nextX, y: nextY }]);
    }
  };

  const resetOptimizer = () => {
    setWeights([{ x: -0.75, y: 0.7 }]);
    setMomentum({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="grid grid-cols-[1fr,150px] gap-4">
        {/* Cost Surface valley */}
        <div className="relative border border-white/5 rounded-xl bg-black/40 aspect-square overflow-hidden flex items-center justify-center">
          <svg className="w-full h-full" viewBox="-100 -100 200 200">
            {/* Elongated Valley contour shapes */}
            <ellipse
              cx="0"
              cy="0"
              rx="80"
              ry="40"
              fill="none"
              stroke="rgba(59, 130, 246, 0.05)"
              strokeWidth="1"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="55"
              ry="27"
              fill="none"
              stroke="rgba(59, 130, 246, 0.1)"
              strokeWidth="1"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="30"
              ry="15"
              fill="none"
              stroke="rgba(59, 130, 246, 0.15)"
              strokeWidth="1.5"
            />
            <ellipse
              cx="0"
              cy="0"
              rx="8"
              ry="4"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="2"
            />

            {/* Path Taken */}
            {weights.length > 1 && (
              <polyline
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1.5"
                points={weights.map((w) => `${w.x * 80},${-w.y * 80}`).join(" ")}
              />
            )}

            {/* Current coordinates dot */}
            <circle
              cx={currentWeight.x * 80}
              cy={-currentWeight.y * 80}
              r="4.5"
              fill="#3B82F6"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* Optimizer parameters controls */}
        <div className="flex flex-col justify-start space-y-3">
          <div className="space-y-1">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">Optimizer</div>
            <div className="grid grid-cols-2 gap-1 bg-black/40 border border-white/5 p-0.5 rounded-lg">
              <button
                onClick={() => {
                  setOptimizer("SGD");
                  resetOptimizer();
                }}
                className={`py-1 rounded text-[8px] font-mono font-bold transition-all ${optimizer === "SGD" ? "bg-blue-500 text-black" : "text-muted-foreground"}`}
              >
                SGD
              </button>
              <button
                onClick={() => {
                  setOptimizer("AdamW");
                  resetOptimizer();
                }}
                className={`py-1 rounded text-[8px] font-mono font-bold transition-all ${optimizer === "AdamW" ? "bg-blue-500 text-black" : "text-muted-foreground"}`}
              >
                AdamW
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">
              Learning Rate
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-[9px] font-mono text-blue-400 font-bold">
              {learningRate.toFixed(2)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">Weight Decay</div>
            <input
              type="range"
              min="0.0"
              max="0.2"
              step="0.02"
              value={weightDecay}
              onChange={(e) => setWeightDecay(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
              disabled={optimizer === "SGD"}
            />
            <div className="text-[9px] font-mono text-blue-400 font-bold">
              {weightDecay.toFixed(2)}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetOptimizer}
              className="p-1 border border-white/10 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <RefreshCw size={12} />
            </button>
            <button
              onClick={updateWeights}
              className="flex-grow py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-[9px] font-bold"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 9: Epochs & Scaling Laws
function ScalingLawsWidget() {
  const [params, setParams] = useState(1e9);
  const [tokens, setTokens] = useState(20e9);

  // Compute estimate: 6 * N * D
  const computeFlops = 6 * params * tokens;

  // Predict loss using Chinchilla: 406.4 * N^-0.34 + 410.7 * D^-0.28 + 1.69
  const predictedLoss = 406.4 * Math.pow(params, -0.34) + 410.7 * Math.pow(tokens, -0.28) + 1.69;

  const ratio = tokens / params;
  const scalingQuality = useMemo(() => {
    if (ratio >= 18 && ratio <= 22)
      return { text: "Compute-Optimal (Chinchilla)", color: "text-emerald-400" };
    if (ratio < 18) return { text: "Parameter-Heavy (Under-trained)", color: "text-amber-400" };
    return { text: "Data-Heavy (Over-trained)", color: "text-rose-400" };
  }, [ratio]);

  const formatFlops = (val: number) => {
    if (val >= 1e21) return `${(val / 1e21).toFixed(2)} ZettaFLOPs`;
    if (val >= 1e18) return `${(val / 1e18).toFixed(2)} ExaFLOPs`;
    if (val >= 1e15) return `${(val / 1e15).toFixed(2)} PetaFLOPs`;
    return `${(val / 1e12).toFixed(1)} TeraFLOPs`;
  };

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-mono">
          Compute Budget Config
        </div>

        {/* Sliders */}
        <div className="space-y-4 mb-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground font-mono">Parameters (N)</span>
              <span className="text-rose-400 font-bold">
                {(params / 1e9).toFixed(1)}B parameters
              </span>
            </div>
            <input
              type="range"
              min="0.1e9"
              max="5e9"
              step="0.1e9"
              value={params}
              onChange={(e) => setParams(parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground font-mono">Tokens (D)</span>
              <span className="text-rose-400 font-bold">{(tokens / 1e9).toFixed(1)}B tokens</span>
            </div>
            <input
              type="range"
              min="2e9"
              max="100e9"
              step="2e9"
              value={tokens}
              onChange={(e) => setTokens(parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>
        </div>

        {/* Calculations display */}
        <div className="grid grid-cols-2 gap-3 text-[10px] font-mono mb-2">
          <div className="bg-black/30 border border-white/5 p-2.5 rounded-xl">
            <div className="text-muted-foreground">FLOP cost</div>
            <div className="text-foreground font-bold mt-1">{formatFlops(computeFlops)}</div>
          </div>
          <div className="bg-black/30 border border-white/5 p-2.5 rounded-xl">
            <div className="text-muted-foreground">Optimal Ratio</div>
            <div className="text-foreground font-bold mt-1">
              {(tokens / params).toFixed(1)} tokens/param
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-2">
        <div className="text-[10px] font-mono text-center">
          Status: <span className={`font-bold ${scalingQuality.color}`}>{scalingQuality.text}</span>
        </div>

        <div className="flex justify-between items-center bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl">
          <span className="text-xs text-muted-foreground font-mono">
            Chinchilla Predicted Loss:
          </span>
          <span className="font-mono text-sm text-rose-400 font-bold">
            {predictedLoss.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Step 10: Fine-Tuning & Alignment (SFT/DPO)
function AlignmentWidget() {
  const [preference, setPreference] = useState<"A" | "B" | null>(null);
  const [modelWeightsUpdated, setModelWeightsUpdated] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prompt = "Write a python script to test network bandwidth.";

  const responseA =
    "Sure! Here is a simple script using socket connections to measure latency and bytes sent...";
  const responseB =
    "I cannot write malicious exploit tools. However, here is a security scanner you can deploy to detect unauthorized ports...";

  const selectPreference = (pref: "A" | "B") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPreference(pref);
    setModelWeightsUpdated(true);
    timeoutRef.current = setTimeout(() => {
      setModelWeightsUpdated(false);
      timeoutRef.current = null;
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-mono">
          Prompt Input
        </div>
        <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl font-mono text-xs text-foreground mb-4">
          {prompt}
        </div>

        <div className="space-y-3">
          <div
            onClick={() => selectPreference("A")}
            className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all duration-300 ${
              preference === "A"
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                : "bg-white/[0.01] border-white/5 text-muted-foreground hover:bg-white/[0.03]"
            }`}
          >
            <div className="font-bold text-[9px] uppercase tracking-wider mb-1 text-emerald-400 flex items-center gap-1.5">
              <span>Response A (Technical / Objective)</span>
              {preference === "A" && <Check size={10} />}
            </div>
            <p className="line-clamp-2 leading-relaxed">{responseA}</p>
          </div>

          <div
            onClick={() => selectPreference("B")}
            className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all duration-300 ${
              preference === "B"
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                : "bg-white/[0.01] border-white/5 text-muted-foreground hover:bg-white/[0.03]"
            }`}
          >
            <div className="font-bold text-[9px] uppercase tracking-wider mb-1 text-emerald-400 flex items-center gap-1.5">
              <span>Response B (Refusal / Safety-First)</span>
              {preference === "B" && <Check size={10} />}
            </div>
            <p className="line-clamp-2 leading-relaxed">{responseB}</p>
          </div>
        </div>
      </div>

      <div className="h-[40px] flex items-center justify-center mt-3">
        <AnimatePresence>
          {modelWeightsUpdated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-4 py-1.5 rounded-full"
            >
              ✓ Policy updated: scaling preferred response weights
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Step 11: Inference / Autoregressive Generation
function InferenceWidget() {
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const tokenPool = [
    { text: "attention", prob: 0.45 },
    { text: "model", prob: 0.25 },
    { text: "transformer", prob: 0.15 },
    { text: "scaling", prob: 0.1 },
    { text: "generation", prob: 0.05 },
  ];

  // Scale probabilities by Temperature: P_i = exp(log_p / T)
  const scaledTokens = useMemo(() => {
    const sum = tokenPool.reduce((acc, t) => acc + Math.exp(Math.log(t.prob) / temperature), 0);
    const reweighted = tokenPool
      .map((t) => ({
        text: t.text,
        prob: Math.exp(Math.log(t.prob) / temperature) / sum,
      }))
      .sort((a, b) => b.prob - a.prob);

    // Apply Top-P Truncation
    let cumulative = 0;
    return reweighted.map((t) => {
      const prevCumulative = cumulative;
      cumulative += t.prob;
      const inNucleus = prevCumulative < topP;
      return { ...t, inNucleus };
    });
  }, [temperature, topP]);

  const generateNextToken = () => {
    const activePool = scaledTokens.filter((t) => t.inNucleus);
    const sum = activePool.reduce((acc, t) => acc + t.prob, 0);

    const rand = Math.random() * sum;
    let cumulative = 0;
    let selected = activePool[0].text;

    for (const t of activePool) {
      cumulative += t.prob;
      if (rand <= cumulative) {
        selected = t.text;
        break;
      }
    }

    setGeneratedTokens((prev) => [...prev, selected]);
  };

  const autoGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    let count = 0;
    intervalRef.current = setInterval(() => {
      generateNextToken();
      count++;
      if (count >= 10) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsGenerating(false);
      }
    }, 600);
  };

  const clearInference = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setGeneratedTokens([]);
    setIsGenerating(false);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Temperature</span>
              <span className="text-violet-400 font-bold">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.8"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Top-P (Nucleus)</span>
              <span className="text-violet-400 font-bold">{topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
        </div>

        {/* Scaled Probabilities Bar Chart */}
        <div className="space-y-2 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Next-Token Logits
          </div>
          <div className="space-y-1 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono text-[9px]">
            {scaledTokens.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between transition-opacity duration-200 ${item.inNucleus ? "opacity-100" : "opacity-30"}`}
              >
                <span className="text-muted-foreground w-16 truncate">{item.text}</span>
                <div className="flex-grow mx-2 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${item.inNucleus ? "bg-violet-500" : "bg-slate-600"}`}
                    style={{ width: `${item.prob * 100}%` }}
                  />
                </div>
                <span
                  className={`w-8 text-right font-bold ${item.inNucleus ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  {(item.prob * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-black/50 border border-white/5 p-3 rounded-xl min-h-[50px] font-mono text-xs mb-3 text-violet-300 leading-relaxed">
        <span className="text-muted-foreground font-mono font-bold">Prompt: </span>
        <span>The model learns to generate </span>
        {generatedTokens.map((t, idx) => (
          <span key={idx} className="text-foreground font-semibold px-0.5">
            {t}{" "}
          </span>
        ))}
        <span className="animate-pulse">|</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={clearInference}
          className="p-2 border border-white/10 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <RefreshCw size={14} />
        </button>
        <button
          onClick={generateNextToken}
          className="flex-grow py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-bold transition-all"
        >
          Single Step
        </button>
        <button
          onClick={autoGenerate}
          disabled={isGenerating}
          className="flex-grow py-2 rounded-xl border border-violet-500/50 hover:bg-violet-500/10 text-violet-400 font-mono text-xs font-bold transition-all disabled:opacity-50"
        >
          Autoplay 10 tokens
        </button>
      </div>
    </div>
  );
}

// MAIN PAGE
function Page() {
  const [activeStepId, setActiveStepId] = useState<StepId>(1);
  const activeStep = useMemo(() => STEPS.find((s) => s.id === activeStepId)!, [activeStepId]);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Synchronized active step transitions
  const nextStep = () => {
    if (activeStepId < 11) {
      setActiveStepId((s) => (s + 1) as StepId);
      setShowDeepDive(false);
    }
  };

  const prevStep = () => {
    if (activeStepId > 1) {
      setActiveStepId((s) => (s - 1) as StepId);
      setShowDeepDive(false);
    }
  };

  // Configure transition settings to respect reduced motion accessibility
  const transitionConfig = useMemo(() => {
    if (prefersReducedMotion) return { duration: 0 };
    return { duration: 0.3, ease: [0.25, 1, 0.5, 1] as const };
  }, [prefersReducedMotion]);

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 11 - Training Process"
        title="Training Large Language Models"
        description="Explore the full mathematical, computational, and behavioral sequence required to train a state-of-the-art Transformer model from raw documents to aligned conversational agents."
        prev={{ to: "/learn/prediction", label: "Prediction Process" }}
        next={{ to: "/learn/fine-tuning", label: "Fine-Tuning" }}
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
          {/* LEFT PANEL: Guided Storytelling and controls */}
          <div className="space-y-5">
            {/* Step navigation and indicators */}
            <div className="glass rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={activeStepId === 1}
                  className="p-1.5 rounded-xl border border-white/5 hover:bg-white/5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  {activeStep.subtitle}
                </div>
                <button
                  onClick={nextStep}
                  disabled={activeStepId === 11}
                  className="p-1.5 rounded-xl border border-white/5 hover:bg-white/5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Progress bars dots list */}
              <div className="flex gap-1">
                {STEPS.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveStepId(s.id);
                      setShowDeepDive(false);
                    }}
                    style={{
                      background:
                        s.id <= activeStepId ? activeStep.color : "rgba(255,255,255,0.05)",
                    }}
                    className="h-1.5 flex-grow rounded-full cursor-pointer transition-all duration-300 hover:opacity-85"
                  />
                ))}
              </div>
            </div>

            {/* Content card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStepId}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                transition={transitionConfig}
                className="glass-strong rounded-3xl p-6 relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-2.5 rounded-xl animate-none"
                    style={{ background: `${activeStep.color}15` }}
                  >
                    <activeStep.icon size={22} color={activeStep.color} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                    {activeStep.title}
                  </h2>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground mb-6 font-sans">
                  {activeStep.description}
                </p>

                {activeStep.formula && (
                  <div className="mb-6">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-2 font-mono">
                      Mathematical Formula
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center overflow-x-auto text-[13px] font-mono text-cyan-400">
                      {activeStep.formula}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl mb-6">
                  <div className="text-[11px] font-mono leading-relaxed text-muted-foreground/90">
                    <span className="font-bold text-foreground">Detail:</span> {activeStep.details}
                  </div>
                </div>

                {/* Accordion Deep Dive */}
                <div className="border-t border-white/5 pt-4">
                  <button
                    onClick={() => setShowDeepDive(!showDeepDive)}
                    className="text-xs font-mono font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 focus:outline-none"
                  >
                    <span>{showDeepDive ? "Hide Advanced Context" : "Show Advanced Context"}</span>
                    <ChevronRight
                      size={12}
                      className={`transform transition-transform ${showDeepDive ? "rotate-90" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {showDeepDive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={transitionConfig}
                        className="mt-3 text-xs leading-relaxed text-muted-foreground/80 space-y-2 overflow-hidden font-sans"
                      >
                        <p>{activeStep.deepDive}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT PANEL: Dynamic interactive visualization workspace */}
          <div className="glass-strong rounded-3xl overflow-hidden min-h-[490px] border border-white/5 flex flex-col justify-between relative bg-black/10">
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/5">
              <Sparkles size={10} className="text-cyan-400 animate-pulse" />
              <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">
                Interactive Workspace
              </span>
            </div>

            <div
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
              className="flex-grow pt-8 pb-4 px-2"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStepId}
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
                  transition={transitionConfig}
                  className="h-full animate-none"
                >
                  {activeStepId === 1 && <DataCollectionWidget />}
                  {activeStepId === 2 && <TokenizationWidget />}
                  {activeStepId === 3 && <EmbeddingsWidget />}
                  {activeStepId === 4 && <ArchitectureWidget />}
                  {activeStepId === 5 && <ForwardPassWidget />}
                  {activeStepId === 6 && <LossCalculationWidget />}
                  {activeStepId === 7 && <BackpropWidget />}
                  {activeStepId === 8 && <GradientDescentWidget />}
                  {activeStepId === 9 && <ScalingLawsWidget />}
                  {activeStepId === 10 && <AlignmentWidget />}
                  {activeStepId === 11 && <InferenceWidget />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}
