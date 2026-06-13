import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  ScrollText,
  Database,
  Cpu,
  Layers,
  Settings,
  Play,
  Pause,
  RotateCcw,
  FileText,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Coins,
  Eye,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn/context-window")({
  head: () => ({
    meta: [
      { title: "Context Window Laboratory — Latent" },
      {
        name: "description",
        content:
          "Why models forget, what the KV-cache really costs, and how techniques like RAG and sliding windows extend memory.",
      },
      { property: "og:title", content: "Context Window Laboratory — Latent" },
      { property: "og:description", content: "Interactive laboratory to visualize context limits of LLMs." },
    ],
  }),
  component: Page,
});

// ----------------------------------------------------
// Core Types & Constants
// ----------------------------------------------------
interface Token {
  id: string;
  text: string;
  colorIndex: number;
}

interface ModelPreset {
  id: string;
  name: string;
  company: string;
  limit: number; // in tokens
  costPerMillion: number; // in USD
  color: string;
  glowColor: string;
}

interface DocPreset {
  name: string;
  description: string;
  sizeDesc: string;
  tokenCount: number;
  icon: typeof FileText;
}

const MODELS: ModelPreset[] = [
  { id: "gpt4-legacy", name: "GPT-4 (Original)", company: "OpenAI", limit: 8192, costPerMillion: 30.00, color: "text-rose-400", glowColor: "rgba(244, 63, 94, 0.15)" },
  { id: "mistral7b", name: "Mistral 7B", company: "Mistral", limit: 32768, costPerMillion: 0.25, color: "text-purple-400", glowColor: "rgba(168, 85, 247, 0.15)" },
  { id: "gpt4o-mini", name: "GPT-4o Mini", company: "OpenAI", limit: 128000, costPerMillion: 0.15, color: "text-teal-400", glowColor: "rgba(20, 184, 166, 0.15)" },
  { id: "claude35-sonnet", name: "Claude 3.5 Sonnet", company: "Anthropic", limit: 200000, costPerMillion: 3.00, color: "text-amber-400", glowColor: "rgba(245, 158, 11, 0.15)" },
  { id: "gemini25-pro", name: "Gemini 2.5 Pro", company: "Google", limit: 2000000, costPerMillion: 7.00, color: "text-blue-400", glowColor: "rgba(59, 130, 246, 0.15)" },
];

const DOCUMENT_PRESETS: DocPreset[] = [
  { name: "Short Email", description: "A routine check-in email.", sizeDesc: "2 paragraphs", tokenCount: 150, icon: FileText },
  { name: "Blog Article", description: "An essay explaining Transformers.", sizeDesc: "1,500 words", tokenCount: 2000, icon: FileText },
  { name: "Research Paper", description: "Academic study on Attention scaling.", sizeDesc: "15 pages", tokenCount: 12000, icon: FileText },
  { name: "Book Chapter", description: "Textbook chapter on neural networks.", sizeDesc: "40 pages", tokenCount: 35000, icon: FileText },
  { name: "Large Codebase", description: "React source directory (50+ modules).", sizeDesc: "12,000 LOC", tokenCount: 85000, icon: FileText },
  { name: "Entire Conversation", description: "Long multi-turn log transcript.", sizeDesc: "5 hours of chat", tokenCount: 180000, icon: FileText },
];

const TOKEN_COLORS = [
  { bg: "bg-blue-500/10 border-blue-500/20 text-blue-300", raw: "rgba(59, 130, 246, 0.1)" },
  { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", raw: "rgba(16, 185, 129, 0.1)" },
  { bg: "bg-amber-500/10 border-amber-500/20 text-amber-300", raw: "rgba(245, 158, 11, 0.1)" },
  { bg: "bg-purple-500/10 border-purple-500/20 text-purple-300", raw: "rgba(168, 85, 247, 0.1)" },
  { bg: "bg-rose-500/10 border-rose-500/20 text-rose-300", raw: "rgba(244, 63, 94, 0.1)" },
  { bg: "bg-teal-500/10 border-teal-500/20 text-teal-300", raw: "rgba(20, 184, 166, 0.1)" },
  { bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300", raw: "rgba(99, 102, 241, 0.1)" },
  { bg: "bg-pink-500/10 border-pink-500/20 text-pink-300", raw: "rgba(236, 72, 153, 0.1)" },
  { bg: "bg-sky-500/10 border-sky-500/20 text-sky-300", raw: "rgba(14, 165, 233, 0.1)" },
  { bg: "bg-orange-500/10 border-orange-500/20 text-orange-300", raw: "rgba(249, 115, 22, 0.1)" },
];

const ATTENTION_TOKENS = [
  { id: "t1", text: "Attention", x: 60, y: 40 },
  { id: "t2", text: "enables", x: 180, y: 40 },
  { id: "t3", text: "models", x: 300, y: 40 },
  { id: "t4", text: "to", x: 420, y: 40 },
  { id: "t5", text: "attend", x: 60, y: 110 },
  { id: "t6", text: "across", x: 180, y: 110 },
  { id: "t7", text: "the", x: 300, y: 110 },
  { id: "t8", text: "entire", x: 420, y: 110 },
  { id: "t9", text: "sequence", x: 60, y: 180 },
  { id: "t10", text: "instead", x: 180, y: 180 },
  { id: "t11", text: "of", x: 300, y: 180 },
  { id: "t12", text: "left-to-right", x: 420, y: 180 },
];

const ATTENTION_MAP: Record<string, { targetId: string; weight: number; label: string }[]> = {
  "t1": [
    { targetId: "t3", weight: 0.35, label: "subject" },
    { targetId: "t5", weight: 0.40, label: "verb action" },
  ],
  "t3": [
    { targetId: "t1", weight: 0.45, label: "association" },
    { targetId: "t5", weight: 0.30, label: "action" },
    { targetId: "t9", weight: 0.15, label: "scope" },
  ],
  "t5": [
    { targetId: "t3", weight: 0.50, label: "subject" },
    { targetId: "t9", weight: 0.35, label: "argument" },
    { targetId: "t12", weight: 0.20, label: "method modifier" },
  ],
  "t9": [
    { targetId: "t1", weight: 0.20, label: "anchor" },
    { targetId: "t8", weight: 0.65, label: "quantifier" },
    { targetId: "t7", weight: 0.15, label: "article context" },
  ],
  "t12": [
    { targetId: "t10", weight: 0.55, label: "contrast target" },
    { targetId: "t5", weight: 0.30, label: "compared verb" },
  ],
};

const STREAM_TRANSCRIPT = [
  { sender: "System", text: "Meeting started at 10:00 AM. Recording is active." },
  { sender: "Alice", text: "Hi team, let's review the main architecture choices for the context window lab." },
  { sender: "Bob", text: "Sure, we should ensure it uses custom colors, smooth SVGs, and real tokenizers." },
  { sender: "Charlie", text: "Agreed. Let's make sure it simulates overflow truncation visually so users understand." },
  { sender: "Alice", text: "Let's also add a long document comparison to see which models can handle it." },
  { sender: "Bob", text: "Sounds good. Don't forget to display the estimated GPU memory (KV Cache) cost." },
  { sender: "Charlie", text: "Yes! Scale of layers * dimension * context is cubic/quadratic in attention." },
  { sender: "System", text: "Warning: Low bandwidth detected on host bob-workstation." },
  { sender: "Alice", text: "Okay, we will proceed with Framer Motion for animations. Let's keep it under 60fps." },
  { sender: "Bob", text: "Can we add some sample datasets like a codebase or a book chapter?" },
  { sender: "Charlie", text: "Yes, that will show why 8k context is too small for modern code tasks." },
  { sender: "Alice", text: "Perfect. We are aligned. Let's start coding. The meeting is adjourned." },
];

const TOKENIZATION_PLAYGROUND_PRESETS = [
  {
    name: "English Sentence",
    text: "Tokenization is the process of splitting text into small pieces.",
    description: "Simple English text splits clean. Normal words form single tokens.",
  },
  {
    name: "Python Code",
    text: "def calculate_cost(tokens, rate):\n    return tokens * rate / 1000000",
    description: "Spaces, indentation, and math symbols are split into individual tokens.",
  },
  {
    name: "JSON Data",
    text: '{\n  "model": "gpt-4o-mini",\n  "tokens_used": 1420,\n  "cache_hits": true\n}',
    description: "Curly braces, quotes, double spaces, and colons are highly token-dense.",
  },
  {
    name: "Markdown Text",
    text: "# Deep Learning Context\n- **Layers**: 32\n- **Dim**: 4096",
    description: "Formatting characters (- * #) generate distinct token boundaries.",
  },
  {
    name: "Long URL",
    text: "https://latent-llm-curriculum.com/modules/context-window?user=123&session=abc",
    description: "URLs are extremely inefficient, splitting slashes, dots, and queries into many tokens.",
  },
];

// Helper to split text into mock tokens
function mockTokenize(text: string): Token[] {
  if (!text) return [];
  const regex = /(\s+|[a-zA-Z0-9]+|[^\s\w])/g;
  const matches = Array.from(text.matchAll(regex));
  return matches.map((m, idx) => {
    const t = m[0];
    return {
      id: `${idx}-${t}`,
      text: t,
      colorIndex: idx % 10,
    };
  });
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

export function Page() {
  // ----------------------------------------------------
  // State variables
  // ----------------------------------------------------
  const [activeTab, setActiveTab] = useState<"lab" | "presets" | "attention">("lab");
  const [inputText, setInputText] = useState("Context windows hold a model's active memory.");
  const [selectedModel, setSelectedModel] = useState<ModelPreset>(MODELS[2]); // Default: GPT-4o Mini
  
  // Custom interactive context builder/simulator
  const [simulatorMessages, setSimulatorMessages] = useState<{ id: string; text: string; tokens: number }[]>([
    { id: "1", text: "Alice: Hey, did you read the new LLM training logs?", tokens: 12 },
    { id: "2", text: "Bob: Yes! The training loss look extremely stable.", tokens: 10 },
  ]);
  const [overflowAlert, setOverflowAlert] = useState<string | null>(null);
  const visualSimulatorLimit = 50; // Visual block limit for demonstration purposes

  // Document preset view states
  const [activeDocPreset, setActiveDocPreset] = useState<DocPreset | null>(null);
  const [loadingDocAnimation, setLoadingDocAnimation] = useState(false);
  const [loadedDocTokens, setLoadedDocTokens] = useState(0);

  // Long transcript stream simulation state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamIndex, setStreamIndex] = useState(-1);
  const [boundedLog, setBoundedLog] = useState<{ sender: string; text: string }[]>([]);
  const [unboundedLog, setUnboundedLog] = useState<{ sender: string; text: string }[]>([]);
  const [askedQuestion, setAskedQuestion] = useState(false);
  const [askingQuery, setAskingQuery] = useState(false);
  
  // Real Tokenization Playground state
  const [playgroundPresetName, setPlaygroundPresetName] = useState(TOKENIZATION_PLAYGROUND_PRESETS[0].name);
  const [playgroundText, setPlaygroundText] = useState(TOKENIZATION_PLAYGROUND_PRESETS[0].text);

  // Attention map interactive hover
  const [hoveredAttentionToken, setHoveredAttentionToken] = useState<string | null>(null);

  // KV Cache slide parameters
  const [layers, setLayers] = useState(32);
  const [dim, setDim] = useState(4096);
  const [kvContextSize, setKvContextSize] = useState(128000);

  // Collapsible FAQ state
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());

  // Context Capacity Explorer state variables
  const [explorerModelIdx, setExplorerModelIdx] = useState(2); // default: GPT-4o Mini (index 2)
  const [explorerAddedTokens, setExplorerAddedTokens] = useState(128000);
  const [explorerProgress, setExplorerProgress] = useState(100);

  const activeExplorerModel = MODELS[explorerModelIdx];

  // Adjust added tokens when changing model so it is in a reasonable range
  useEffect(() => {
    setExplorerAddedTokens(activeExplorerModel.limit);
  }, [explorerModelIdx]);

  useEffect(() => {
    setExplorerProgress(0);
    let start = 0;
    const interval = setInterval(() => {
      start += 5;
      if (start >= 100) {
        start = 100;
        clearInterval(interval);
      }
      setExplorerProgress(start);
    }, 15);
    return () => clearInterval(interval);
  }, [explorerModelIdx]);

  const containerWidthPct = useMemo(() => {
    const scale = [30, 45, 65, 80, 100];
    return scale[explorerModelIdx];
  }, [explorerModelIdx]);

  const totalVisibleBlocks = useMemo(() => {
    const blocks = [16, 24, 36, 48, 72];
    return blocks[explorerModelIdx];
  }, [explorerModelIdx]);

  const isLimitExceeded = explorerAddedTokens > activeExplorerModel.limit;

  const activeModelExplanation = useMemo(() => {
    const explanations = [
      "Legacy context limit. Fits small inputs. Easy to exceed in multi-turn chats.",
      "Compact open-weight model capacity. Fits simple documentation or multi-file scripts.",
      "Modern standard cost-efficient limit. Fits entire code folders, long logs, or payloads.",
      "High-capability balanced memory. Fits massive PDF research bundles or business audits.",
      "Industry leader in context footprint. Fits entire books, hours of video, or complete code repositories."
    ];
    return explanations[explorerModelIdx];
  }, [explorerModelIdx]);

  const realWorldComparison = useMemo(() => {
    const comparisons = [
      "≈ Short Conversation (email or brief FAQ)",
      "≈ Small Book Chapter (product guide or manual)",
      "≈ Large Codebase (React project or specifications)",
      "≈ Research Paper Collection (multiple documents)",
      "≈ Multiple Books (1.5M words, complete novels, or raw video)"
    ];
    return comparisons[explorerModelIdx];
  }, [explorerModelIdx]);

  const tokenFillPercent = useMemo(() => {
    const rawPct = (explorerAddedTokens / activeExplorerModel.limit) * 100;
    return (explorerProgress / 100) * Math.min(100, rawPct);
  }, [explorerAddedTokens, activeExplorerModel, explorerProgress]);

  // Derived tokenizer outputs
  const tokenizedList = useMemo(() => mockTokenize(inputText), [inputText]);
  const wordsCount = useMemo(() => {
    return inputText.trim().split(/\s+/).filter(Boolean).length;
  }, [inputText]);
  
  const totalTokens = tokenizedList.length;
  const estimatedCost = useMemo(() => {
    return (totalTokens / 1_000_000) * selectedModel.costPerMillion;
  }, [totalTokens, selectedModel]);

  const contextPercent = useMemo(() => {
    // Math.min to cap visual scale
    return Math.min(100, (totalTokens / selectedModel.limit) * 100);
  }, [totalTokens, selectedModel]);

  // KV cache bytes calculation
  const kvBytes = useMemo(() => 2 * layers * kvContextSize * dim * 2, [kvContextSize, layers, dim]);
  const kvGb = kvBytes / 1024 ** 3;

  // Simulator context load
  const totalSimulatorTokens = useMemo(() => {
    return simulatorMessages.reduce((sum, m) => sum + m.tokens, 0);
  }, [simulatorMessages]);

  const simulatorPercent = useMemo(() => {
    return Math.min(100, (totalSimulatorTokens / visualSimulatorLimit) * 100);
  }, [totalSimulatorTokens]);

  // Synchronize stream updates
  useEffect(() => {
    if (!isStreaming) return;
    if (streamIndex >= STREAM_TRANSCRIPT.length - 1) {
      setIsStreaming(false);
      return;
    }

    const timer = setTimeout(() => {
      const nextIdx = streamIndex + 1;
      const nextMsg = STREAM_TRANSCRIPT[nextIdx];
      
      setUnboundedLog((prev) => [...prev, nextMsg]);
      setBoundedLog((prev) => {
        const currentLog = [...prev, nextMsg];
        // Bounded simulator holds max 3 lines to illustrate physical truncation
        if (currentLog.length > 3) {
          return currentLog.slice(currentLog.length - 3);
        }
        return currentLog;
      });

      setStreamIndex(nextIdx);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isStreaming, streamIndex]);

  // Load preset animation
  const handleSelectDocPreset = (preset: DocPreset) => {
    setActiveDocPreset(preset);
    setLoadingDocAnimation(true);
    setLoadedDocTokens(0);

    let current = 0;
    const step = Math.ceil(preset.tokenCount / 20);
    const interval = setInterval(() => {
      current += step;
      if (current >= preset.tokenCount) {
        current = preset.tokenCount;
        clearInterval(interval);
        setLoadingDocAnimation(false);
      }
      setLoadedDocTokens(current);
    }, 40);
  };

  const handleAddSimulatorContext = () => {
    const texts = [
      "Charlie: Let's run a performance test on the attention engine.",
      "Alice: Added the cache context variables to variables table.",
      "Bob: Perfect, this reduces redundant processing cycles.",
      "Charlie: Watch the memory usage of the system rise quickly.",
      "Alice: We have hit the visual threshold boundary limit!",
    ];
    const newMsg = {
      id: Math.random().toString(),
      text: texts[Math.floor(Math.random() * texts.length)],
      tokens: 15,
    };

    setSimulatorMessages((prev) => {
      const nextMsgs = [...prev, newMsg];
      const newTotal = nextMsgs.reduce((sum, m) => sum + m.tokens, 0);
      if (newTotal > visualSimulatorLimit) {
        setOverflowAlert("Old information is discarded to fit new tokens.");
        // Slide out/fade oldest message
        return nextMsgs.slice(1);
      } else {
        setOverflowAlert(null);
      }
      return nextMsgs;
    });
  };

  const handlePlaygroundPreset = (presetName: string) => {
    const p = TOKENIZATION_PLAYGROUND_PRESETS.find((x) => x.name === presetName);
    if (p) {
      setPlaygroundPresetName(presetName);
      setPlaygroundText(p.text);
    }
  };

  const handleStartStream = () => {
    setStreamIndex(-1);
    setBoundedLog([]);
    setUnboundedLog([]);
    setAskedQuestion(false);
    setAskingQuery(false);
    setIsStreaming(true);
  };

  const handleAskQuery = () => {
    setAskingQuery(true);
    setTimeout(() => {
      setAskingQuery(false);
      setAskedQuestion(true);
    }, 1200);
  };

  const toggleFaq = (idx: number) => {
    setExpandedFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 09 · LLM Architecture"
        title="Context Window Laboratory"
        description="See how AI models remember information through tokens. Inspect tokenized streams, adjust model capacities, and watch how older text is truncated when context limits overflow."
        prev={{ to: "/learn/attention", label: "Attention Mechanisms" }}
        next={{ to: "/learn/prediction", label: "Prediction Process" }}
      >
        {/* Main Tab Controller */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("lab")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeTab === "lab"
                  ? "bg-white/10 text-white border border-white/10 shadow-lg"
                  : "text-muted-foreground hover:text-white border border-transparent"
              )}
            >
              <Cpu className="h-4 w-4 text-emerald-400" />
              Token Lab & Simulator
            </button>
            <button
              onClick={() => setActiveTab("presets")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeTab === "presets"
                  ? "bg-white/10 text-white border border-white/10 shadow-lg"
                  : "text-muted-foreground hover:text-white border border-transparent"
              )}
            >
              <FileText className="h-4 w-4 text-blue-400" />
              Capacity & Document Presets
            </button>
            <button
              onClick={() => setActiveTab("attention")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                activeTab === "attention"
                  ? "bg-white/10 text-white border border-white/10 shadow-lg"
                  : "text-muted-foreground hover:text-white border border-transparent"
              )}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              Attention Link Map
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>Visual Token Scale: 1 Block ≈ 4 Chars</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "lab" && (
            <motion.div
              key="token-lab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Hero Realtime Animation Diagram */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
                
                {/* Visual block 1: Input text stream */}
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.01] border border-white/5 relative z-10">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
                    <ScrollText className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Stage 1: User Prompt</span>
                  <p className="text-xs text-foreground mt-2 text-center truncate max-w-[200px]">
                    &quot;{inputText || "Type something below..."}&quot;
                  </p>
                  <div className="mt-2 text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">
                    Streaming Text
                  </div>
                </div>

                {/* Visual block 2: Context window tank */}
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.01] border border-white/5 relative z-10">
                  <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-2">
                    <Database className="h-4 w-4 text-teal-400" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Stage 2: Context Window</span>
                  
                  {/* Dynamic mini-progress bars */}
                  <div className="w-full mt-3 space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                      <span>Loaded Memory</span>
                      <span>{totalTokens} tokens</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-teal-500"
                        animate={{ width: `${contextPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Visual block 3: Model Core Processing */}
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.01] border border-white/5 relative z-10">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-2">
                    <Cpu className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Stage 3: Inference Core</span>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    <span className="text-xs text-purple-300 font-mono">
                      {selectedModel.name} Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Lab Core Interactive Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
                
                {/* Left Column: Playground input and live token highlight stream */}
                <div className="space-y-6 flex flex-col h-full">
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-emerald-400" />
                        Prompt Tokenizer Playground
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Estimates based on OpenAI cl100k_base
                      </span>
                    </div>

                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type your prompt here..."
                      className="w-full h-28 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-muted-foreground resize-none"
                    />

                    {/* Visual Token Stream */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        Real-time tokenized visualization:
                      </div>
                      <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 min-h-[90px] flex flex-wrap gap-1.5 items-start">
                        {tokenizedList.length > 0 ? (
                          tokenizedList.map((token) => {
                            const styles = TOKEN_COLORS[token.colorIndex];
                            return (
                              <motion.span
                                key={token.id}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={cn(
                                  "inline-block px-2 py-0.5 rounded text-xs font-mono border select-none cursor-help transition-all hover:bg-opacity-25",
                                  styles.bg
                                )}
                                title={`Token: "${token.text}" | ID: ${token.id}`}
                              >
                                {token.text.replace("\n", "↵")}
                              </motion.span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono italic">
                            Begin typing to generate tokens...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Model selector chips */}
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        Select Model context boundary limit:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {MODELS.map((model) => {
                          const isActive = selectedModel.id === model.id;
                          return (
                            <button
                              key={model.id}
                              onClick={() => setSelectedModel(model)}
                              className={cn(
                                "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 hover:bg-white/[0.02]",
                                isActive
                                  ? "bg-white/10 border-white/10 shadow-lg"
                                  : "bg-transparent border-white/5 hover:border-white/10"
                              )}
                              style={{
                                boxShadow: isActive ? `inset 0 0 12px ${model.glowColor}` : undefined
                              }}
                            >
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                {model.company}
                              </span>
                              <span className="text-xs font-semibold text-white block mt-1">
                                {model.name}
                              </span>
                              <span className={cn("text-[10px] font-mono mt-1.5 block", model.color)}>
                                {fmt(model.limit)} ctx
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual Telemetry metrics & Memory fill simulator */}
                <div className="space-y-6 flex flex-col h-full">
                  {/* Telemetry card */}
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-4">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      Token Telemetry
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-3 border-t border-white/5">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                        <span className="text-[9px] text-muted-foreground font-mono block">Characters</span>
                        <span className="text-base font-semibold text-white font-mono mt-0.5 block">
                          {inputText.length}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                        <span className="text-[9px] text-muted-foreground font-mono block">Words</span>
                        <span className="text-base font-semibold text-white font-mono mt-0.5 block">
                          {wordsCount}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                        <span className="text-[9px] text-muted-foreground font-mono block">Tokens</span>
                        <span className="text-base font-semibold text-emerald-400 font-mono mt-0.5 block">
                          {totalTokens}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                        <span className="text-[9px] text-muted-foreground font-mono block">Estimated Cost</span>
                        <span className="text-base font-semibold text-white font-mono mt-0.5 block">
                          ${estimatedCost.toFixed(6)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Context Used</span>
                        <span className="font-semibold text-teal-400 font-mono">
                          {((totalTokens / selectedModel.limit) * 100).toFixed(4)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-mono">Cost per 1M tokens</span>
                        <span className="font-semibold text-foreground font-mono">
                          ${selectedModel.costPerMillion.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual sliding memory tank simulator */}
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>Context Overflow Simulator</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Scale: 50 limit
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Watch how older context slides out when memory limits are exceeded.
                      </p>
                    </div>

                    {/* Scaled memory container displaying active messages */}
                    <div className="flex-1 min-h-[140px] bg-slate-950/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-end gap-2 overflow-hidden relative">
                      {/* Grid overlay lines */}
                      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />

                      <AnimatePresence initial={false}>
                        {simulatorMessages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ y: 20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-center justify-between relative z-10"
                          >
                            <span className="text-xs text-foreground truncate max-w-[210px]">
                              {msg.text}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-md">
                              {msg.tokens} tokens
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {overflowAlert && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] p-2.5 rounded-xl flex items-start gap-1.5"
                      >
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <span className="font-semibold uppercase font-mono">Context Truncated:</span> {overflowAlert}
                        </div>
                      </motion.div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddSimulatorContext}
                        className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add Context Chunk
                      </button>
                      <button
                        onClick={() => {
                          setSimulatorMessages([]);
                          setOverflowAlert(null);
                        }}
                        className="px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-[0.98] transition-all flex items-center justify-center border border-white/5"
                        title="Reset Simulator"
                      >
                        <RotateCcw className="h-4 w-4 text-muted-foreground hover:text-white" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === "presets" && (
            <motion.div
              key="presets-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Context Capacity Explorer Section */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    Context Capacity Explorer
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Drag the slider or click a model to compare context capacity. Watch the memory container grow and test how overflow occurs.
                  </p>
                </div>

                {/* Model selector list */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {MODELS.map((model, idx) => {
                    const isActive = explorerModelIdx === idx;
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setExplorerModelIdx(idx);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300",
                          isActive
                            ? "bg-white/10 border-white/10 scale-[1.02] shadow-lg shadow-blue-500/5 ring-1 ring-white/10"
                            : "bg-transparent border-white/5 opacity-60 hover:opacity-100 hover:border-white/10"
                        )}
                      >
                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider block">
                          {model.company}
                        </span>
                        <span className="text-xs font-semibold text-white block mt-1">
                          {model.name}
                        </span>
                        <span className={cn("text-[10px] font-mono mt-1.5 block font-bold", model.color)}>
                          {fmt(model.limit)} ctx
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Large Context Container Centerpiece */}
                <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[240px] relative overflow-hidden">
                  <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />

                  {/* Growing/Shrinking Container */}
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="border border-white/10 bg-white/[0.02] rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden"
                    style={{
                      width: `${containerWidthPct}%`,
                      minHeight: "140px",
                    }}
                  >
                    {/* Background glow when limit exceeded */}
                    {isLimitExceeded && (
                      <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
                    )}

                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground z-10">
                      <span>{activeExplorerModel.name} Window</span>
                      <span className="text-blue-300 font-bold">{fmt(activeExplorerModel.limit)} Limit</span>
                    </div>

                    {/* Token Grid blocks representing capacity */}
                    <div className="my-4 flex flex-wrap gap-1 content-start overflow-hidden h-14 z-10">
                      {Array.from({ length: totalVisibleBlocks }).map((_, i) => {
                        const blockPercentage = (i / totalVisibleBlocks) * 100;
                        const isFilled = blockPercentage < tokenFillPercent;
                        const isOverflow = isFilled && blockPercentage >= (activeExplorerModel.limit / Math.max(activeExplorerModel.limit, explorerAddedTokens)) * 100;

                        return (
                          <motion.div
                            key={i}
                            className={cn(
                              "w-2.5 h-6 rounded-[3px] border transition-all duration-300",
                              isOverflow
                                ? "bg-rose-500/30 border-rose-500/50 shadow-sm shadow-rose-500/10"
                                : isFilled
                                ? "bg-blue-500/30 border-blue-500/50 shadow-sm shadow-blue-500/10"
                                : "bg-white/5 border-white/5"
                            )}
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground border-t border-white/5 pt-2 z-10">
                      <span>Simulated Input: {explorerAddedTokens.toLocaleString()} tokens</span>
                      <span className={cn(isLimitExceeded ? "text-rose-400 font-bold" : "text-emerald-400")}>
                        {isLimitExceeded ? "⚠️ Context limit reached!" : "✓ Under Limit"}
                      </span>
                    </div>

                    {/* Visual Limit Line (Overlay) */}
                    <div className="absolute right-4 top-4 bottom-4 w-[2px] bg-red-500/40 border-r border-dashed border-red-500/50 flex items-center justify-center pointer-events-none z-10">
                      <span className="absolute -top-1 right-1 text-[8px] font-mono text-red-400 rotate-90 uppercase tracking-widest origin-right whitespace-nowrap">
                        Limit
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Info & Slider Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Model Capacity Profile</span>
                    <h4 className="text-sm font-semibold text-white">{activeExplorerModel.name} Memory</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activeModelExplanation}
                    </p>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Real-world scale comparison</span>
                      <div className="text-xs font-semibold text-blue-300 font-mono mt-1">
                        {realWorldComparison}
                      </div>
                    </div>
                    
                    {/* Simulation Slider to add tokens dynamically */}
                    <div className="space-y-2 pt-3 border-t border-white/5">
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Add simulated tokens:</span>
                        <span className="font-bold text-white">{explorerAddedTokens.toLocaleString()} tokens</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={activeExplorerModel.limit * 1.3}
                        step={Math.ceil(activeExplorerModel.limit / 100)}
                        value={explorerAddedTokens}
                        onChange={(e) => setExplorerAddedTokens(+e.target.value)}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Document Preset Selection Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {DOCUMENT_PRESETS.map((preset) => {
                  const isActive = activeDocPreset?.name === preset.name;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => handleSelectDocPreset(preset)}
                      className={cn(
                        "p-4 rounded-3xl border text-left flex flex-col justify-between transition-all duration-300 hover:bg-white/[0.02] min-h-[120px]",
                        isActive
                          ? "bg-white/10 border-white/10 shadow-lg"
                          : "bg-transparent border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {preset.sizeDesc}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-blue-400 mt-2 block font-semibold">
                        {preset.tokenCount.toLocaleString()} tokens
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Preset Visual Comparison Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
                
                {/* Visual model bar chart analysis */}
                <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Selected Document Context comparison analysis
                    </div>
                    {activeDocPreset && (
                      <span className="text-xs font-semibold text-blue-300">
                        Analyzing: {activeDocPreset.name} ({activeDocPreset.tokenCount.toLocaleString()} tokens)
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {MODELS.map((model) => {
                      const tokenVal = activeDocPreset ? activeDocPreset.tokenCount : 0;
                      const percentUsed = (tokenVal / model.limit) * 100;
                      const isOverflow = tokenVal > model.limit;
                      const truncatedPercent = isOverflow ? ((tokenVal - model.limit) / tokenVal) * 100 : 0;

                      return (
                        <div key={model.id} className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-white flex items-center gap-1.5">
                              {model.name}
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({fmt(model.limit)} limit)
                              </span>
                            </span>
                            
                            <span className="font-mono text-xs flex items-center gap-2">
                              {activeDocPreset ? (
                                isOverflow ? (
                                  <span className="text-rose-400 font-bold flex items-center gap-1">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Truncates {truncatedPercent.toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Fits ({(percentUsed).toFixed(1)}%)
                                  </span>
                                )
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </span>
                          </div>

                          {/* Progress visual bar */}
                          <div className="h-3.5 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                            {activeDocPreset && (
                              <motion.div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isOverflow ? "bg-rose-500" : "bg-emerald-500"
                                )}
                                initial={{ width: "0%" }}
                                animate={{ width: `${Math.min(100, percentUsed)}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!activeDocPreset && (
                    <div className="py-12 text-center text-xs text-muted-foreground font-mono italic">
                      Select a document preset card above to visualize capacity metrics.
                    </div>
                  )}
                </div>

                {/* Split View Needle-in-a-Haystack Simulator */}
                <div className="glass-strong rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Long Context Stream Comparison</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full font-mono uppercase tracking-[0.1em]">
                        Interactive Demo
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Compare a Bounded 32K model vs a Large 1M model on raw logs.
                    </p>
                  </div>

                  {/* Split terminal stream display */}
                  <div className="grid grid-cols-2 gap-3 flex-1 min-h-[180px]">
                    
                    {/* Bounded Terminal */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between overflow-hidden relative">
                      <div className="text-[10px] font-mono text-rose-300 border-b border-rose-950 pb-1.5 mb-2 uppercase tracking-wide">
                        Bounded (32K limit)
                      </div>
                      
                      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                        {boundedLog.map((log, idx) => (
                          <div key={idx} className="text-[10px] text-slate-400 font-mono leading-tight">
                            <span className="text-slate-300 font-bold">{log.sender}:</span> {log.text}
                          </div>
                        ))}
                        {boundedLog.length === 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono italic block mt-4 text-center">
                            Logs clear.
                          </span>
                        )}
                      </div>

                      <div className="text-[9px] font-mono text-rose-400 mt-2 text-right">
                        {streamIndex >= 3 ? "Truncating oldest lines" : "Capacity filled"}
                      </div>
                    </div>

                    {/* Unbounded Terminal */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between overflow-hidden relative">
                      <div className="text-[10px] font-mono text-emerald-300 border-b border-emerald-950 pb-1.5 mb-2 uppercase tracking-wide">
                        Unbounded (1M limit)
                      </div>
                      
                      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                        {unboundedLog.map((log, idx) => (
                          <div key={idx} className="text-[10px] text-slate-400 font-mono leading-tight">
                            <span className="text-slate-300 font-bold">{log.sender}:</span> {log.text}
                          </div>
                        ))}
                        {unboundedLog.length === 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono italic block mt-4 text-center">
                            Logs clear.
                          </span>
                        )}
                      </div>

                      <div className="text-[9px] font-mono text-emerald-400 mt-2 text-right">
                        100% logs retained
                      </div>
                    </div>

                  </div>

                  {/* Asking/Result interface */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {isStreaming && (
                      <div className="text-[10px] font-mono text-muted-foreground text-center animate-pulse">
                        Streaming log packets ({streamIndex + 1}/{STREAM_TRANSCRIPT.length})...
                      </div>
                    )}

                    {!isStreaming && streamIndex === STREAM_TRANSCRIPT.length - 1 && (
                      <div className="space-y-2">
                        <button
                          onClick={handleAskQuery}
                          disabled={askingQuery}
                          className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          {askingQuery ? "Querying models..." : "Ask: What time did meeting start?"}
                        </button>

                        <AnimatePresence>
                          {askedQuestion && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="grid grid-cols-2 gap-3 pt-2"
                            >
                              <div className="bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl text-[10px] text-rose-200 leading-normal">
                                <span className="font-bold text-rose-300 block mb-0.5">Bounded output:</span>
                                &quot;I apologize, but I don&apos;t have that information. The transcript headers were truncated.&quot;
                              </div>
                              <div className="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-xl text-[10px] text-emerald-200 leading-normal">
                                <span className="font-bold text-emerald-300 block mb-0.5">Unbounded output:</span>
                                &quot;The meeting started at 10:00 AM, and bob-workstation logs indicate low bandwidth.&quot;
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleStartStream}
                    disabled={isStreaming}
                    className="w-full py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-4 w-4" />
                    {isStreaming ? "Simulating logs..." : "Start Streaming Transcript"}
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === "attention" && (
            <motion.div
              key="attention-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Attention Link Map grid canvas */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
                
                {/* Attention interactive SVG grid map */}
                <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      Attention Weight Matrix Grid
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                      Hover over any token block to visualize the attention links that connect relative meanings in a model.
                    </p>
                  </div>

                  {/* SVG Drawing Board */}
                  <div className="flex-1 min-h-[300px] bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden">
                    <svg viewBox="0 0 540 220" className="w-full h-full max-w-[540px] overflow-visible">
                      <g>
                        {/* Render active hovered attention Bezier lines */}
                        {hoveredAttentionToken &&
                          ATTENTION_MAP[hoveredAttentionToken]?.map((link, idx) => {
                            const source = ATTENTION_TOKENS.find((x) => x.id === hoveredAttentionToken)!;
                            const target = ATTENTION_TOKENS.find((x) => x.id === link.targetId)!;

                            // Calculate coordinate positions
                            const fromX = source.x + 50;
                            const fromY = source.y + 15;
                            const toX = target.x + 50;
                            const toY = target.y + 15;

                            // Quadratic curve anchor point
                            const cpX = (fromX + toX) / 2;
                            const cpY = (fromY + toY) / 2 - 45;

                            return (
                              <g key={idx} className="animate-fade-in">
                                <path
                                  d={`M ${fromX} ${fromY} Q ${cpX} ${cpY} ${toX} ${toY}`}
                                  fill="none"
                                  stroke="rgba(245, 158, 11, 0.6)"
                                  strokeWidth={link.weight * 5}
                                  strokeDasharray="4 2"
                                  className="stroke-amber-400 transition-all duration-300"
                                />
                                <text
                                  x={cpX}
                                  y={cpY + 12}
                                  className="fill-amber-300 text-[8px] font-mono text-center"
                                  textAnchor="middle"
                                >
                                  {(link.weight * 100).toFixed(0)}%
                                </text>
                              </g>
                            );
                          })}

                        {/* Render default attention paths if no hover */}
                        {!hoveredAttentionToken && (
                          <path
                            d="M 110 55 Q 230 25 350 55"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth="1.5"
                          />
                        )}

                        {/* Render Token Nodes */}
                        {ATTENTION_TOKENS.map((token) => {
                          const isHovered = hoveredAttentionToken === token.id;
                          const isTargetOfHover =
                            hoveredAttentionToken &&
                            ATTENTION_MAP[hoveredAttentionToken]?.some((x) => x.targetId === token.id);

                          return (
                            <g
                              key={token.id}
                              transform={`translate(${token.x}, ${token.y})`}
                              onMouseEnter={() => setHoveredAttentionToken(token.id)}
                              onMouseLeave={() => setHoveredAttentionToken(null)}
                              className="cursor-pointer group"
                            >
                              <rect
                                x="0"
                                y="0"
                                width="100"
                                height="30"
                                rx="8"
                                className={cn(
                                  "transition-all duration-300 border stroke-1",
                                  isHovered
                                    ? "fill-amber-500/10 stroke-amber-500"
                                    : isTargetOfHover
                                    ? "fill-blue-500/10 stroke-blue-400"
                                    : "fill-white/[0.02] stroke-white/10 group-hover:stroke-white/30"
                                )}
                              />
                              <text
                                x="50"
                                y="19"
                                className={cn(
                                  "text-[10px] font-mono text-center font-medium pointer-events-none select-none transition-colors",
                                  isHovered
                                    ? "fill-amber-300"
                                    : isTargetOfHover
                                    ? "fill-blue-300"
                                    : "fill-white/70"
                                )}
                                textAnchor="middle"
                              >
                                {token.text}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>

                  {/* Quick context info */}
                  {hoveredAttentionToken && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3 mt-4 animate-fade-in">
                      <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-200 leading-normal">
                        <span className="font-semibold">Attention Link: </span>
                        The token <span className="font-mono text-white">&quot;{ATTENTION_TOKENS.find(x => x.id === hoveredAttentionToken)?.text}&quot;</span> links attention pathways across the context matrix, capturing semantic relations regardless of sequence order.
                      </div>
                    </div>
                  )}
                </div>

                {/* KV Cache hardware side calculator */}
                <div className="glass-strong rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-400" />
                      KV Cache Calculator
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      LLM attention holds past keys/values in GPU memory. See the scale of memory costs.
                    </p>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-4 pt-3 border-t border-white/5">
                    <label className="block text-xs text-muted-foreground">
                      Model Layers: <span className="text-foreground font-semibold font-mono">{layers}</span>
                      <input
                        type="range"
                        min={8}
                        max={96}
                        step={8}
                        value={layers}
                        onChange={(e) => setLayers(+e.target.value)}
                        className="mt-2 w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </label>

                    <label className="block text-xs text-muted-foreground">
                      Hidden Dimension Size: <span className="text-foreground font-semibold font-mono">{dim}</span>
                      <input
                        type="range"
                        min={1024}
                        max={12288}
                        step={512}
                        value={dim}
                        onChange={(e) => setDim(+e.target.value)}
                        className="mt-2 w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </label>

                    <label className="block text-xs text-muted-foreground">
                      Active Context Size: <span className="text-foreground font-semibold font-mono">{fmt(kvContextSize)}</span>
                      <input
                        type="range"
                        min={8192}
                        max={500000}
                        step={8192}
                        value={kvContextSize}
                        onChange={(e) => setKvContextSize(+e.target.value)}
                        className="mt-2 w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </label>
                  </div>

                  {/* Readout block */}
                  <div className="mt-4 rounded-2xl bg-white/[0.02] p-4 border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Estimated GPU Memory (FP16 Cache)
                    </div>
                    <div className="mt-1.5 text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                      {kvGb < 1 ? `${(kvGb * 1024).toFixed(0)} MB` : `${kvGb.toFixed(2)} GB`}
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground leading-normal">
                      At large context limits, caching memory scales linearly with sequence length, requiring massive multi-GPU hardware.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real Tokenization Playground section */}
        <div className="mt-12 glass-strong rounded-3xl p-6 border border-white/10 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-emerald-400" />
              Real Tokenization Playground
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Examine how tokenization efficiency changes depending on syntax formats. Code, JSON, and URLs split differently than English.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {TOKENIZATION_PLAYGROUND_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePlaygroundPreset(preset.name)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-mono border transition-all duration-200",
                  playgroundPresetName === preset.name
                    ? "bg-white/10 border-white/10 text-white"
                    : "bg-transparent border-white/5 text-muted-foreground hover:text-white"
                )}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Input display */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Raw Input Text:</span>
              <textarea
                value={playgroundText}
                onChange={(e) => setPlaygroundText(e.target.value)}
                className="w-full h-36 bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none leading-normal"
              />
              <span className="text-[10px] text-muted-foreground block italic leading-normal">
                {TOKENIZATION_PLAYGROUND_PRESETS.find(x => x.name === playgroundPresetName)?.description}
              </span>
            </div>

            {/* Tokenized output */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <span>Tokenized Blocks:</span>
                <span className="text-blue-300 text-[11px] font-bold">
                  {mockTokenize(playgroundText).length} tokens / {playgroundText.length} chars ({(playgroundText.length > 0 ? mockTokenize(playgroundText).length / playgroundText.length : 0).toFixed(2)} ratio)
                </span>
              </div>
              
              <div className="w-full h-36 bg-slate-950/40 border border-white/5 rounded-2xl p-4 overflow-y-auto flex flex-wrap gap-1 items-start content-start">
                {mockTokenize(playgroundText).map((token) => (
                  <span
                    key={token.id}
                    className={cn(
                      "inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border select-none",
                      TOKEN_COLORS[token.colorIndex].bg
                    )}
                  >
                    {token.text.replace(" ", "␣").replace("\n", "↵")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Educational accordion FAQ cards */}
        <div className="mt-12 space-y-4">
          <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2 mb-2">
            <HelpCircle className="h-5 w-5 text-purple-400" />
            Interactive Concept Guide
          </h3>

          {[
            {
              title: "What is a Token?",
              body: "A token is the basic unit of text that a language model reads and writes. A token can be a single character, a sub-word (like 'token' and 'ization'), a full word, or even a punctuation mark. On average, one token corresponds to approximately 4 characters or 0.75 words in English. Models do not read raw letters; they process numeric token IDs."
            },
            {
              title: "What is a Context Window?",
              body: "The context window represents the maximum capacity of tokens that a language model can process in a single request. It acts as the model's active short-term memory, holding the entire history of the conversation, document uploads, and system instructions. If you exceed this limit, the model cannot access older details."
            },
            {
              title: "Why Do Models Forget?",
              body: "Because Transformers rely on Attention matrices, the active memory has a strict upper limit (bounded by GPU memory limits). To handle inputs larger than the context window, systems must use sliding window truncation, summaries, or retrieval architectures (RAG) to keep the token size within bounds. The truncated tokens fall out of the window and are entirely forgotten."
            },
            {
              title: "What is KV-Cache Memory Cost?",
              body: "During generation, the Key-Value (KV) cache stores past token coordinates so the model doesn't re-calculate attention weights from scratch. However, this cache grows linearly with context size and number of layers, consuming gigabytes of high-bandwidth GPU memory. Managing this cache is the primary hardware challenge for long-context inference."
            },
            {
              title: "What Are Retrieval Systems (RAG)?",
              body: "Retrieval-Augmented Generation (RAG) acts as an external search index. Instead of loading an entire database directly into the context window (which overflows and costs too much), RAG retrieves only the most relevant snippets of document text and injects them into the prompt dynamically, achieving unbounded effective memory at low cost."
            }
          ].map((faq, idx) => {
            const isExpanded = expandedFaqs.has(idx);
            return (
              <div
                key={idx}
                className="glass-strong border border-white/10 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.01]"
                >
                  <span className="text-sm font-semibold text-white">
                    {idx + 1}. {faq.title}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 pt-0 text-sm text-muted-foreground border-t border-white/5 leading-relaxed">
                        {faq.body}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </ModuleLayout>
    </PageShell>
  );
}
