import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import {
  TinyTransformer,
  TinyModelManager,
  VOCAB,
  EMBEDDING_COORDS,
  type SamplingConfig,
  type InferenceResult,
} from "@/lib/tiny-model";
import { animate, random } from "animejs";
import {
  Play,
  Square,
  RotateCcw,
  Cpu,
  HelpCircle,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Info,
  Check,
  Copy,
  AlertTriangle,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/learn/tiny-generator")({
  head: () => ({
    meta: [
      { title: "Tiny Text Generator — Latent" },
      {
        name: "description",
        content:
          "Explore the inner mechanics of an autoregressive transformer. Run real TensorFlow.js inference in your browser and visualize logits, attention, and embeddings.",
      },
      { property: "og:title", content: "Tiny Text Generator — Latent" },
      {
        property: "og:description",
        content:
          "Real-time TensorFlow.js transformer model simulation with attention maps, embeddings, and sampling labs.",
      },
    ],
  }),
  component: TinyGeneratorPage,
});

// Category color mappings
const CATEGORY_COLORS = {
  nouns: "oklch(0.78 0.025 235)", // Steel / Slate
  verbs: "oklch(0.82 0.04 85)", // Amber / Brass
  tech: "oklch(0.82 0.022 220)", // Cyan / Platinum
  grammar: "oklch(0.68 0.03 245)", // Violet / Indigo
  special: "oklch(0.74 0.04 175)", // Emerald / Green
};

const EXAMPLES = [
  "a robot must obey the laws of robotics",
  "attention is all you need to design transformer neural networks",
  "tensorflow js runs deep learning models in browser real time",
  "once upon a time in a distant kingdom",
  "explore parameters memory gpu webgl backend",
];

const SPEEDS = [
  { label: "Slow (400ms)", delay: 400 },
  { label: "Normal (220ms)", delay: 220 },
  { label: "Fast (80ms)", delay: 80 },
];

const classifyCategory = (token: string) => {
  const nouns = [
    "robot",
    "robotics",
    "human",
    "prince",
    "princess",
    "king",
    "queen",
    "dragon",
    "castle",
    "kingdom",
    "village",
    "land",
    "forest",
    "agent",
    "text",
    "prompt",
    "input",
    "output",
    "curriculum",
    "models",
    "llmguru",
    "atlas",
    "guide",
    "llms",
    "matrix",
    "query",
    "key",
    "value",
    "projection",
    "context",
    "sequence",
    "length",
    "vocab",
    "size",
    "fps",
  ];
  const verbs = [
    "must",
    "obey",
    "design",
    "runs",
    "makes",
    "explore",
    "run",
    "generate",
    "play",
    "learn",
    "work",
    "lived",
    "fly",
    "need",
    "protect",
    "obeying",
    "generates",
    "was",
    "stands",
    "break",
    "can",
  ];
  const tech = [
    "attention",
    "transformer",
    "neural",
    "networks",
    "tensorflow",
    "js",
    "deep",
    "learning",
    "latent",
    "embeddings",
    "semantic",
    "artificial",
    "intelligence",
    "future",
    "possible",
    "in-browser",
    "accelerated",
    "neural-network",
    "webgl",
    "gpu",
  ];
  const grammar = [
    "a",
    "the",
    "of",
    "is",
    "all",
    "you",
    "to",
    "in",
    "through",
    "and",
    "but",
    "or",
    "for",
    "with",
    "by",
    "from",
    "on",
    "at",
    "not",
    "first",
    "second",
    "third",
    "law",
    "order",
    "how",
    "once",
    "upon",
    "there",
  ];

  if (nouns.includes(token)) return "nouns";
  if (verbs.includes(token)) return "verbs";
  if (tech.includes(token)) return "tech";
  if (grammar.includes(token)) return "grammar";
  return "special";
};

// Replicate TF.js softmax sampling in JS for instant sliders feedback
function recalculateProbabilitiesInJS(logits: Float32Array, config: SamplingConfig, seq: number[]) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  const stableLogits = Array.from(logits).map((l) => l - max);

  // Apply repetition penalty
  const penalty = config.repetitionPenalty ?? 1.0;
  if (penalty !== 1.0 && seq.length > 0) {
    const uniqueTokens = new Set(seq);
    for (const tid of uniqueTokens) {
      const val = stableLogits[tid];
      if (val > 0) {
        stableLogits[tid] = val / penalty;
      } else {
        stableLogits[tid] = val * penalty;
      }
    }
  }

  // Clamp stable logits to a safe range
  const clampedLogits = stableLogits.map((l) => Math.max(Math.min(l, 50.0), -50.0));

  const temp = Math.max(config.temperature, 0.05);
  const scaled = clampedLogits.map((l) => l / temp);

  const exps = scaled.map((l) => Math.exp(l));
  const sum = exps.reduce((a, b) => a + b, 0) || 1.0;
  const probs = exps.map((e) => e / sum);

  let candidates = VOCAB.map((token, idx) => ({
    token,
    prob: probs[idx],
    logit: logits[idx],
    rank: 0,
  }));

  candidates.sort((a, b) => b.prob - a.prob);
  candidates = candidates.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  return candidates;
}

function sampleTokenIdFromProbs(
  candidates: { token: string; prob: number; logit: number; rank: number }[],
  config: SamplingConfig,
): number {
  if (config.deterministic) {
    return VOCAB.indexOf(candidates[0].token);
  }

  const k = Math.min(config.topK, VOCAB.length);
  const p = config.topP;

  let filtered = candidates.slice(0, k);

  let cumSum = 0;
  const pFiltered: typeof filtered = [];
  for (const item of filtered) {
    cumSum += item.prob;
    pFiltered.push(item);
    if (cumSum >= p) {
      break;
    }
  }
  filtered = pFiltered;

  const sumProb = filtered.reduce((acc, item) => acc + item.prob, 0) || 1.0;
  const normalizedProbs = filtered.map((item) => item.prob / sumProb);

  const r = Math.random();
  let runningSum = 0;
  let chosenTokenId = VOCAB.indexOf(filtered[0].token);
  for (let i = 0; i < filtered.length; i++) {
    runningSum += normalizedProbs[i];
    if (r <= runningSum) {
      chosenTokenId = VOCAB.indexOf(filtered[i].token);
      break;
    }
  }

  return chosenTokenId;
}

export function TinyGeneratorPage() {
  const [model, setModel] = useState<TinyTransformer | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);

  // States
  const [promptText, setPromptText] = useState(EXAMPLES[0]);
  const [activeSequence, setActiveSequence] = useState<number[]>([]);
  const sequenceRef = useRef<number[]>([]);
  const [tokenConfidences, setTokenConfidences] = useState<number[]>([]);
  const [promptLength, setPromptLength] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const stepRef = useRef<(() => void) | null>(null);
  const [generationDelay, setGenerationDelay] = useState(220);
  const [samplingConfig, setSamplingConfig] = useState<SamplingConfig>({
    temperature: 0.7,
    topK: 15,
    topP: 0.9,
    maxTokens: 30,
    deterministic: false,
    repetitionPenalty: 1.1,
  });

  const [lastResult, setLastResult] = useState<InferenceResult | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(true);
  const [fps, setFps] = useState(60);

  // Visualizer states
  const [activeAttentionHead, setActiveAttentionHead] = useState(0);
  const [hoveredQueryIdx, setHoveredQueryIdx] = useState<number | null>(null);
  const [hoveredKeyIdx, setHoveredKeyIdx] = useState<number | null>(null);
  const [selectedSequenceTokenIdx, setSelectedSequenceTokenIdx] = useState<number | null>(null);

  // Embedding states
  const [selectedEmbeddingIdx, setSelectedEmbeddingIdx] = useState<number | null>(null);
  const [secondSelectedEmbeddingIdx, setSecondSelectedEmbeddingIdx] = useState<number | null>(null);
  const [hoveredEmbeddingIdx, setHoveredEmbeddingIdx] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Hypothetical branch preview state
  const [hoveredCandidateToken, setHoveredCandidateToken] = useState<string | null>(null);

  // Refs for loops
  const generationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isGeneratingRef = useRef(false);
  const heroTokensRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const now = new Date();
    const timeStr =
      now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
    setLogs((prev) => [...prev.slice(-99), `[${timeStr}] ${msg}`]);
  }, []);

  const updateSequence = (seq: number[]) => {
    setActiveSequence(seq);
    sequenceRef.current = seq;
  };

  const initializeModel = useCallback(
    async (forcedBackend?: string) => {
      setModelLoading(true);
      setLoadingProgress(10);
      setModelError(null);
      addLog(
        `Initializing TensorFlow.js engine${forcedBackend ? ` (Forced Backend: ${forcedBackend.toUpperCase()})` : ""}...`,
      );

      try {
        const modelManager = TinyModelManager.getInstance();
        const m = await modelManager.getOrCreateModel((p) => {
          setLoadingProgress(p);
          if (p === 60) addLog("Populating associative matrix weights...");
          if (p === 80) addLog("Executing Keras model layer mapping...");
          if (p === 90) addLog("Running model warmup inference pass...");
        }, forcedBackend);

        m.onContextLostCallback = () => {
          addLog("CRITICAL: WebGL Context Lost! Initiating automatic recovery CPU fallback...");
          setModelError("WebGL hardware context was lost. Switching backend...");
          initializeModel("cpu");
        };
        m.onContextRestoredCallback = () => {
          addLog("WebGL Context Restored. Reinitializing engine on GPU...");
          initializeModel("webgl");
        };

        setModel(m);
        setModelLoading(false);
        addLog(`Engine ready! Running on ${m.backendName.toUpperCase()} backend.`);

        // Run first default tokenization
        const tokens = m.tokenize(promptText);
        updateSequence(tokens);
        setPromptLength(tokens.length);
        setTokenConfidences(new Array(tokens.length).fill(1.0));
      } catch (err) {
        console.error(err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setModelError(errMsg);
        setModelLoading(false);
      }
    },
    [promptText, addLog],
  );

  // 1. Initialize Tiny Transformer
  useEffect(() => {
    initializeModel();

    return () => {
      if (generationIntervalRef.current) {
        clearTimeout(generationIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Hardware FPS meter
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let frameId: number;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // 3. Floating Token Hero Animations (anime.js)
  useEffect(() => {
    if (!heroTokensRef.current || modelLoading) return;

    const anims: { revert: () => void }[] = [];

    // Animate background attention nodes / floating vocab tokens
    const tokens = heroTokensRef.current.querySelectorAll(".floating-token");
    tokens.forEach((el, idx) => {
      // Speed scales up if temperature is high, introducing ambient chaotic movement
      const tempScale = samplingConfig.temperature > 1.2 ? 0.6 : 1.0;
      const anim = animate(el, {
        translateX: () => [0, random(-60, 60)],
        translateY: () => [0, random(-40, 40)],
        opacity: [0.12, 0.45],
        duration: () => random(6000 * tempScale, 12000 * tempScale),
        direction: "alternate",
        loop: true,
        ease: "inOutSine",
        delay: idx * 200,
      });
      anims.push(anim);
    });

    return () => {
      anims.forEach((a) => {
        try {
          a.revert();
        } catch (e) {
          // Ignore
        }
      });
    };
  }, [modelLoading, samplingConfig.temperature]);

  // Recalculate probabilities on the raw logits when sampling config is modified (Idle state only)
  useEffect(() => {
    if (isGenerating || !lastResult || !model) return;
    const newProbs = recalculateProbabilitiesInJS(
      lastResult.logits,
      samplingConfig,
      activeSequence,
    );
    setLastResult((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        probs: newProbs.slice(0, 8),
        chosenTokenId: sampleTokenIdFromProbs(newProbs, samplingConfig),
        chosenTokenText: VOCAB[sampleTokenIdFromProbs(newProbs, samplingConfig)],
      };
    });
    addLog(
      `Reshaped probability distribution (Temp: ${samplingConfig.temperature}, K: ${samplingConfig.topK}, P: ${samplingConfig.topP}, Penalty: ${samplingConfig.repetitionPenalty})`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    samplingConfig.temperature,
    samplingConfig.topK,
    samplingConfig.topP,
    samplingConfig.deterministic,
    samplingConfig.repetitionPenalty,
  ]);

  // 4. Tokenizer callback for prompt changes
  const handlePromptChange = (val: string) => {
    setPromptText(val);
    if (!model || !model.initialized || isGenerating) return;
    const tokens = model.tokenize(val);
    updateSequence(tokens);
    setPromptLength(tokens.length);
    setTokenConfidences(new Array(tokens.length).fill(1.0));
  };

  // 5. Autoregressive loop trigger
  const handleGenerate = () => {
    if (!model || !model.initialized) return;

    // Halt any overlapping active generation thread first
    handleStop();

    setIsGenerating(true);
    isGeneratingRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    addLog(`Initiating sequence generation. Prompt: "${promptText}"`);

    // Reset sequence to prompt
    const tokenIds = model.tokenize(promptText);
    updateSequence(tokenIds);
    setPromptLength(tokenIds.length);
    setTokenConfidences(new Array(tokenIds.length).fill(1.0));

    const runStep = () => {
      if (!isGeneratingRef.current || !model || !model.initialized) return;
      if (isPausedRef.current) return;

      const currentSeq = sequenceRef.current;
      if (currentSeq.length - promptLength >= samplingConfig.maxTokens) {
        addLog("Max tokens limit reached. Ending generation loop.");
        handleStop();
        return;
      }

      try {
        const start = performance.now();
        const res = model.generateNextToken(currentSeq, samplingConfig);
        const end = performance.now();
        const latency = end - start;

        setLastResult(res);
        setLatencyHistory((prev) => [...prev.slice(-9), latency]);

        addLog(
          `Step ${currentSeq.length - promptLength + 1}: Predicted "${res.chosenTokenText}" (id: ${res.chosenTokenId}, latency: ${latency.toFixed(1)}ms)`,
        );

        const chosenProbObj = res.probs.find((p) => p.token === res.chosenTokenText);
        const confidence = chosenProbObj ? chosenProbObj.prob : res.probs[0]?.prob || 1.0;
        setTokenConfidences((prev) => [...prev, confidence]);

        const nextSeq = [...currentSeq, res.chosenTokenId];
        updateSequence(nextSeq);

        if (res.chosenTokenId === 2) {
          // <eos> token
          addLog("Model predicted end-of-sequence (<eos>). Stopping.");
          handleStop();
          return;
        }

        generationIntervalRef.current = setTimeout(runStep, generationDelay);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog(`Inference Error: ${errMsg}`);
        handleStop();
      }
    };

    stepRef.current = runStep;
    generationIntervalRef.current = setTimeout(runStep, 50);
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    addLog("Generation paused.");
  };

  const handleResume = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    addLog("Generation resumed.");
    if (stepRef.current) {
      stepRef.current();
    }
  };

  const handleStop = () => {
    setIsGenerating(false);
    isGeneratingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    if (generationIntervalRef.current) {
      clearTimeout(generationIntervalRef.current);
      generationIntervalRef.current = null;
    }
  };

  const handleRegenerate = () => {
    handleStop();
    setTimeout(() => {
      handleGenerate();
    }, 50);
  };

  const handleReset = () => {
    handleStop();
    if (model) {
      const tokens = model.tokenize(promptText);
      updateSequence(tokens);
      setPromptLength(tokens.length);
      setTokenConfidences(new Array(tokens.length).fill(1.0));
      setLastResult(null);
      setSelectedEmbeddingIdx(null);
      setSecondSelectedEmbeddingIdx(null);
      setSelectedSequenceTokenIdx(null);
      addLog("Generation sequence reset to prompt boundaries.");
    }
  };

  // Forcing manual token selection on candidate card clicks
  const handleManualTokenSelect = (tokenId: number) => {
    if (!model || !model.initialized || isGenerating) return;
    addLog(`Manual selection: Forced token "${VOCAB[tokenId]}"`);
    const currentSeq = sequenceRef.current;
    const nextSeq = [...currentSeq, tokenId];

    // Find prob of forced token if lastResult has it, otherwise default to 1.0
    const chosenProbObj = lastResult?.probs.find((p) => VOCAB.indexOf(p.token) === tokenId);
    const confidence = chosenProbObj ? chosenProbObj.prob : 1.0;
    setTokenConfidences((prev) => [...prev, confidence]);
    updateSequence(nextSeq);

    // Run single step inference
    try {
      const start = performance.now();
      const res = model.generateNextToken(nextSeq, samplingConfig);
      const end = performance.now();
      setLastResult(res);
      setLatencyHistory((prev) => [...prev.slice(-9), end - start]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`Manual selection error: ${errMsg}`);
    }
  };

  // Computed properties
  const avgLatency = useMemo(() => {
    if (latencyHistory.length === 0) return 0;
    return latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
  }, [latencyHistory]);

  const activeTokensText = useMemo(() => {
    return activeSequence.map((id) => VOCAB[id]);
  }, [activeSequence]);

  const entropy = useMemo(() => {
    if (!lastResult || lastResult.probs.length === 0) return 0;
    let sum = 0;
    for (const item of lastResult.probs) {
      if (item.prob > 0) {
        sum -= item.prob * Math.log2(item.prob);
      }
    }
    return sum;
  }, [lastResult]);

  // Compute similarities in real TFJS logic
  const computeEmbeddingSimilarities = useCallback(
    (tokenId: number) => {
      if (!model || !model.initialized) return [];
      return tf.tidy(() => {
        const embTensor = (model as unknown as { weights: Record<string, tf.Tensor> }).weights.emb;
        if (!embTensor) return [];

        const targetVector = tf.slice(embTensor, [tokenId, 0], [1, -1]);

        const targetNorm = targetVector.div(tf.norm(targetVector, "euclidean", 1, true));
        const embNorm = embTensor.div(tf.norm(embTensor, "euclidean", 1, true));

        const similarities = tf.matMul(targetNorm, embNorm, false, true).squeeze();
        const rawData = similarities.dataSync() as Float32Array;

        const list = Array.from(rawData).map((sim, idx) => ({
          idx,
          token: VOCAB[idx],
          similarity: sim,
        }));

        return list
          .filter((item) => item.idx !== tokenId)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5); // Return top-5 closest
      });
    },
    [model],
  );

  const embeddingSimilarities = useMemo(() => {
    if (selectedEmbeddingIdx === null || !model || !model.initialized) return [];
    return computeEmbeddingSimilarities(selectedEmbeddingIdx);
  }, [selectedEmbeddingIdx, model, computeEmbeddingSimilarities]);

  // Calculate similarity between two selected points
  const calculatedSimilarity = useMemo(() => {
    if (
      selectedEmbeddingIdx === null ||
      secondSelectedEmbeddingIdx === null ||
      !model ||
      !model.initialized
    )
      return 0;
    return tf.tidy(() => {
      const embTensor = (model as unknown as { weights: Record<string, tf.Tensor> }).weights.emb;
      if (!embTensor) return 0;

      const vec1 = tf.slice(embTensor, [selectedEmbeddingIdx, 0], [1, -1]);
      const vec2 = tf.slice(embTensor, [secondSelectedEmbeddingIdx, 0], [1, -1]);

      const norm1 = vec1.div(tf.norm(vec1, "euclidean", 1, true));
      const norm2 = vec2.div(tf.norm(vec2, "euclidean", 1, true));

      const sim = tf.matMul(norm1, norm2, false, true).dataSync()[0];
      return sim;
    });
  }, [selectedEmbeddingIdx, secondSelectedEmbeddingIdx, model]);

  const handleCopyText = () => {
    if (!model) return;
    const detokenized = model.detokenize(activeSequence);
    navigator.clipboard.writeText(detokenized);
    setCopiedToken("text");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Helper: map coordinate points for interactive 2D Embedding space
  const embeddingProjectedCoords = useMemo(() => {
    // Range maps: X [-75, 95] -> [-90, 90], Y [-85, 65] -> [-90, 90]
    return VOCAB.map((token, idx) => {
      const c = EMBEDDING_COORDS[idx];
      const x = ((c[0] - 10) / 85) * 80;
      const y = ((c[1] + 10) / 75) * 80;
      const cat = classifyCategory(token);

      return { idx, token, cx: x, cy: y, category: cat };
    });
  }, []);

  const handleEmbeddingClick = (idx: number) => {
    if (selectedEmbeddingIdx === null) {
      setSelectedEmbeddingIdx(idx);
    } else if (secondSelectedEmbeddingIdx === null) {
      if (selectedEmbeddingIdx === idx) {
        setSelectedEmbeddingIdx(null);
      } else {
        setSecondSelectedEmbeddingIdx(idx);
      }
    } else {
      if (selectedEmbeddingIdx === idx) {
        setSelectedEmbeddingIdx(secondSelectedEmbeddingIdx);
        setSecondSelectedEmbeddingIdx(null);
      } else if (secondSelectedEmbeddingIdx === idx) {
        setSecondSelectedEmbeddingIdx(null);
      } else {
        setSelectedEmbeddingIdx(idx);
        setSecondSelectedEmbeddingIdx(null);
      }
    }
  };

  // Fallback recovery trigger
  const handleRetryLoading = (backend?: string) => {
    initializeModel(backend);
  };

  return (
    <PageShell>
      <style>{`
        @keyframes attentionMarch {
          to {
            stroke-dashoffset: -24;
          }
        }
        .attention-flow-line {
          stroke-dasharray: 6 12;
          animation: attentionMarch infinite linear;
        }
        @keyframes heatGlow {
          0%, 100% {
            box-shadow: 0 0 15px oklch(0.82 0.04 85 / 0.12);
            border-color: oklch(0.82 0.04 85 / 0.15);
          }
          50% {
            box-shadow: 0 0 35px oklch(0.82 0.04 85 / 0.32);
            border-color: oklch(0.82 0.04 85 / 0.45);
          }
        }
        .heat-glow-panel {
          animation: heatGlow 2.5s ease-in-out infinite;
        }
        @keyframes microJitter {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-0.8px, 0.8px); }
          40% { transform: translate(0.8px, -0.8px); }
          60% { transform: translate(-0.8px, -0.8px); }
          80% { transform: translate(0.8px, 0.8px); }
        }
        .micro-jitter {
          animation: microJitter 0.12s linear infinite;
        }
      `}</style>

      <ModuleLayout
        eyebrow="Special Module · Simulator"
        title="Tiny Text Generator"
        description="Interact with a micro autoregressive transformer model loading and running local TensorFlow.js weights on your hardware."
        prev={{ to: "/learn/vision", label: "Vision & Multimodal" }}
      >
        {modelError ? (
          <div className="mx-auto max-w-xl p-8 glass-strong rounded-3xl border border-destructive/20 text-center my-12 space-y-6">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto animate-bounce" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Transformer Initialization Failed
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The WebGL accelerator encountered a hardware context error or is unsupported on this
              device.
              <span className="font-mono text-xs block bg-black/30 p-4 rounded-xl mt-3 text-rose-300 border border-white/5 select-text">
                {modelError}
              </span>
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => handleRetryLoading("webgl")}
                className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-sm cursor-pointer shadow-md"
              >
                Retry (WebGL Backend)
              </button>
              <button
                onClick={() => handleRetryLoading("cpu")}
                className="glass font-semibold px-5 py-2.5 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all text-sm cursor-pointer border border-white/5"
              >
                Fallback to CPU Backend
              </button>
            </div>
          </div>
        ) : modelLoading ? (
          <div className="glass-strong rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-white/5 border-t-white/60 animate-spin" />
              <Cpu className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Initializing Transformer Model</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Setting up WebGL/WASM shaders and mapping structural parameter weights...
            </p>
            <div className="w-full max-w-xs mt-6 bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out animate-pulse"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-2">{loadingProgress}%</span>

            {/* Step-by-step Scientific Checklist */}
            <div className="w-full max-w-xs mt-8 space-y-3.5 text-left border-t border-white/5 pt-6">
              {[
                { label: "Initialize Accelerator Backend", minProg: 10 },
                { label: "Map Structural Weights Manifest", minProg: 60 },
                { label: "Compile Layer Graph Topology", minProg: 80 },
                { label: "Execute Warmup Inference Cycle", minProg: 90 },
              ].map((st, sIdx) => {
                const isDone = loadingProgress > st.minProg;
                const isActive = loadingProgress === st.minProg;
                return (
                  <div key={sIdx} className="flex items-center gap-3 transition-all duration-300">
                    <div
                      className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold transition-all ${
                        isDone
                          ? "bg-primary/20 border-primary text-primary"
                          : isActive
                            ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse scale-105"
                            : "border-white/10 text-transparent"
                      }`}
                    >
                      {isDone ? "✓" : isActive ? "⚡" : ""}
                    </div>
                    <span
                      className={`text-[11px] font-mono transition-all ${
                        isDone
                          ? "text-foreground"
                          : isActive
                            ? "text-primary font-semibold"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* SECTION 1 — HERO & INTRO */}
            <div className="relative glass-strong rounded-3xl overflow-hidden p-8 sm:p-12 lg:grid lg:grid-cols-[1.2fr,0.8fr] gap-8 items-center border border-white/10 shadow-glow-fuchsia">
              <div
                ref={heroTokensRef}
                className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 select-none"
              >
                {/* floating particles backing the hero section */}
                {[
                  "attention",
                  "robot",
                  "embedding",
                  "softmax",
                  "dense",
                  "layer",
                  "transformer",
                  "neural",
                  "gpu",
                  "logits",
                ].map((tok, i) => (
                  <div
                    key={i}
                    className="floating-token absolute font-mono text-xs font-semibold px-2.5 py-1 rounded-full glass bg-white/[0.03] text-muted-foreground/40 pointer-events-none"
                    style={{
                      left: `${15 + i * 8}%`,
                      top: `${20 + (i % 3) * 25}%`,
                    }}
                  >
                    {tok}
                  </div>
                ))}
              </div>

              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-primary bg-primary/5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Real-time local tfjs inference</span>
                </div>
                <h2 className="text-4xl font-semibold tracking-tight leading-tight">
                  Play with a Live Autoregressive Transformer
                </h2>
                <p className="text-muted-foreground leading-relaxed text-base max-w-xl">
                  Step inside the vocabulary dictionary and observe language mathematics emerge.
                  Below, a complete 500K-parameter generative GPT model executes token-by-token
                  causal attention computation right in your browser tab.
                </p>
                <div className="flex flex-wrap gap-3 font-medium">
                  <a
                    href="#generation-engine"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Try the Live Model
                  </a>
                  <a
                    href="#embedding-space"
                    className="inline-flex items-center gap-2 glass px-5 py-2.5 rounded-2xl text-sm hover:bg-white/[0.06] transition-colors"
                  >
                    Explore Embedding Space
                  </a>
                </div>
              </div>

              <div className="relative hidden lg:block z-10 glass rounded-3xl p-6 border border-white/5 space-y-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5" /> Core Parameters
                </div>
                <div className="space-y-3 font-mono text-xs text-muted-foreground">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Vocabulary Size:</span>
                    <span className="text-foreground">136 tokens</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Embedding Dim (D):</span>
                    <span className="text-foreground">32 units</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Attention Heads:</span>
                    <span className="text-foreground">4 virtual heads</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Context Length:</span>
                    <span className="text-foreground">32 tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Hardware Accelerator:</span>
                    <span className="text-primary font-bold">
                      {model?.backendName.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 — LIVE GENERATION ENGINE */}
            <div id="generation-engine" className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Live
                      Generation Engine
                    </h3>
                    <div className="flex items-center gap-2">
                      {EXAMPLES.map((ex, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePromptChange(ex)}
                          disabled={isGenerating}
                          className="text-[10px] px-2.5 py-1 rounded-full glass hover:bg-white/[0.08] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                          Sample {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Prompt Input
                    </label>
                    <textarea
                      value={promptText}
                      onChange={(e) => handlePromptChange(e.target.value)}
                      disabled={isGenerating}
                      rows={2}
                      className="w-full bg-white/5 rounded-2xl p-4 text-base text-foreground outline-none resize-none border border-white/5 focus:border-primary transition-colors font-mono focus:ring-1 focus:ring-primary/20"
                      placeholder="Enter keywords from the vocabulary list..."
                    />
                  </div>

                  {/* Configurable Generation Speed */}
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground block">
                      Generation Cadence Speed
                    </span>
                    <div className="flex gap-2">
                      {SPEEDS.map((sp) => (
                        <button
                          key={sp.delay}
                          onClick={() => setGenerationDelay(sp.delay)}
                          className={`text-xs px-3.5 py-1.5 rounded-xl font-mono border transition-all cursor-pointer ${
                            generationDelay === sp.delay
                              ? "bg-primary border-primary/20 text-primary-foreground font-bold"
                              : "glass border-white/5 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stream Controls */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {isGenerating ? (
                      <>
                        {isPaused ? (
                          <button
                            onClick={handleResume}
                            className="inline-flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-emerald-600 transition-colors cursor-pointer"
                          >
                            <Play className="h-4 w-4" fill="currentColor" /> Resume
                          </button>
                        ) : (
                          <button
                            onClick={handlePause}
                            className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-amber-600 transition-colors cursor-pointer"
                          >
                            <span className="h-4 w-4 flex gap-1 justify-center items-center">
                              <span className="h-3 w-1 bg-white rounded-full" />
                              <span className="h-3 w-1 bg-white rounded-full" />
                            </span>
                            Pause
                          </button>
                        )}
                        <button
                          onClick={handleStop}
                          className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-destructive/90 transition-colors cursor-pointer"
                        >
                          <Square className="h-4 w-4" fill="currentColor" /> Stop
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleGenerate}
                          disabled={!model || promptText.trim().length === 0}
                          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-md"
                        >
                          <Play className="h-4 w-4" fill="currentColor" /> Generate Text
                        </button>
                        {activeSequence.length > promptLength && (
                          <button
                            onClick={handleRegenerate}
                            className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" /> Regenerate
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 glass px-5 py-2.5 rounded-2xl text-sm hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" /> Reset
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Model Autoregressive Output Sequence
                    </span>
                    <button
                      onClick={handleCopyText}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer font-medium"
                    >
                      {copiedToken === "text" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Clean Text
                        </>
                      )}
                    </button>
                  </div>

                  <div className="glass rounded-2xl p-6 min-h-[140px] flex flex-wrap gap-2 items-start content-start bg-black/20 border border-white/5 select-text">
                    {activeSequence.length === 0 && (
                      <span className="text-muted-foreground text-sm font-mono italic">
                        No tokens initialized...
                      </span>
                    )}

                    {activeSequence.map((id, index) => {
                      const isPrompt = index < promptLength;
                      const tokenStr = VOCAB[id];
                      const isLastGenerated = index === activeSequence.length - 1 && !isPrompt;
                      const confidence = tokenConfidences[index] ?? 1.0;

                      return (
                        <TokenBadge
                          key={`${index}-${id}`}
                          token={tokenStr}
                          isPrompt={isPrompt}
                          isLast={isLastGenerated}
                          confidence={confidence}
                          isSelected={selectedSequenceTokenIdx === index}
                          onClick={() =>
                            setSelectedSequenceTokenIdx(
                              index === selectedSequenceTokenIdx ? null : index,
                            )
                          }
                        />
                      );
                    })}

                    {/* Hypothetical Future Branch Preview */}
                    {hoveredCandidateToken && !isGenerating && (
                      <span className="inline-block px-3 py-1 font-mono text-sm rounded-lg border border-dashed border-primary/45 bg-primary/5 text-primary/50 select-none animate-pulse">
                        + {hoveredCandidateToken === "<eos>" ? "</s>" : hoveredCandidateToken}
                      </span>
                    )}

                    {isGenerating && !isPaused && (
                      <span className="inline-flex gap-1.5 items-center px-3 py-1 font-mono text-sm text-primary/80 animate-pulse bg-white/5 border border-primary/20 rounded-lg">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                        thinking
                      </span>
                    )}
                  </div>
                  {!isGenerating && activeSequence.length > 0 && (
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      * Hover candidate card below to view branch forecast. Click candidate card to
                      force insert. Click any badge above to lock its attention weights path.
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 3 — SAMPLING LAB */}
              <div
                className={`rounded-3xl p-6 border transition-all duration-500 space-y-6 flex flex-col justify-between ${
                  samplingConfig.temperature > 1.2
                    ? "heat-glow-panel bg-orange-500/[0.01]"
                    : "glass-strong border-white/10"
                }`}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                      <Sliders className="h-4 w-4" /> Sampling Lab
                    </h3>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      <div className="pointer-events-none absolute right-0 top-6 w-64 glass p-3 text-[11px] leading-relaxed text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-xl z-35">
                        Configure parameters defining candidate likelihood. Adjusting sliders
                        instantly scales probabilities.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Temperature */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-muted-foreground">Temperature</span>
                        <span
                          className={`font-mono font-bold ${
                            samplingConfig.temperature > 1.2 ? "text-orange-400" : "text-primary"
                          }`}
                        >
                          {samplingConfig.temperature.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.8"
                        step="0.05"
                        value={samplingConfig.temperature}
                        onChange={(e) =>
                          setSamplingConfig((prev) => ({
                            ...prev,
                            temperature: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Focused (Low)</span>
                        <span>Creative (High)</span>
                      </div>
                    </div>

                    {/* Repetition Penalty */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-muted-foreground">
                          Repetition Penalty
                        </span>
                        <span className="font-mono text-primary font-bold">
                          {samplingConfig.repetitionPenalty?.toFixed(2) || "1.00"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="2.0"
                        step="0.05"
                        value={samplingConfig.repetitionPenalty || 1.0}
                        onChange={(e) =>
                          setSamplingConfig((prev) => ({
                            ...prev,
                            repetitionPenalty: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Top-K */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-muted-foreground">Top-K</span>
                        <span className="font-mono text-primary font-bold">
                          {samplingConfig.topK}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={samplingConfig.topK}
                        onChange={(e) =>
                          setSamplingConfig((prev) => ({
                            ...prev,
                            topK: parseInt(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Top-P */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-muted-foreground">Top-P</span>
                        <span className="font-mono text-primary font-bold">
                          {samplingConfig.topP.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={samplingConfig.topP}
                        onChange={(e) =>
                          setSamplingConfig((prev) => ({
                            ...prev,
                            topP: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Max Tokens */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-muted-foreground">Max New Tokens</span>
                        <span className="font-mono text-primary font-bold">
                          {samplingConfig.maxTokens}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={samplingConfig.maxTokens}
                        onChange={(e) =>
                          setSamplingConfig((prev) => ({
                            ...prev,
                            maxTokens: parseInt(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Deterministic mode */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs text-muted-foreground font-medium">
                        Deterministic (ArgMax)
                      </span>
                      <input
                        type="checkbox"
                        checked={samplingConfig.deterministic}
                        onChange={(e) =>
                          setSamplingConfig((prev) => ({
                            ...prev,
                            deterministic: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Metrics Visual */}
                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                  <div
                    className={`glass rounded-xl p-3 text-center space-y-1 ${
                      samplingConfig.temperature > 1.2 ? "micro-jitter" : ""
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Entropy
                    </div>
                    <div className="text-lg font-mono font-semibold text-gradient">
                      {lastResult ? `${entropy.toFixed(2)} bits` : "—"}
                    </div>
                    <div className="text-[9px] text-muted-foreground leading-tight">
                      {lastResult
                        ? entropy > 2.0
                          ? "Highly Creative"
                          : "Predictable / Focused"
                        : "No predictions yet"}
                    </div>
                  </div>
                  <div className="glass rounded-xl p-3 text-center space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Confidence
                    </div>
                    <div className="text-lg font-mono font-semibold text-gradient">
                      {lastResult ? `${(lastResult.probs[0]?.prob * 100).toFixed(1)}%` : "—"}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {lastResult ? `Top token: "${lastResult.probs[0]?.token}"` : "Model inactive"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4 — TOKEN PROBABILITY VISUALIZER */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Step Candidate Token Probabilities
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Softmax output candidates for the prediction step. Probabilities are normalized to
                  sum to exactly 100% based on active Top-K/Top-P filtering. Click a card to
                  manually force selection.
                </p>
              </div>

              {!lastResult ? (
                <div className="text-center py-12 glass rounded-2xl border border-white/5">
                  <Info className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground font-mono">
                    Start text generation to visualize probabilities distribution.
                  </span>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {lastResult.probs.map((item, idx) => {
                    const isWinner = item.token === lastResult.chosenTokenText;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredCandidateToken(item.token)}
                        onMouseLeave={() => setHoveredCandidateToken(null)}
                        onClick={() => handleManualTokenSelect(VOCAB.indexOf(item.token))}
                        className={`relative glass rounded-2xl p-4 border transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                          isWinner
                            ? "border-primary/45 ring-1 ring-primary/25 shadow-glow bg-primary/[0.04] scale-[1.02]"
                            : "border-white/5 hover:border-white/15 hover:scale-[1.01]"
                        }`}
                        style={{
                          opacity: isWinner ? 1.0 : Math.max(0.4, 1.0 - idx * 0.08),
                        }}
                      >
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <span className="text-xs text-muted-foreground font-mono">
                              Rank #{item.rank}
                            </span>
                            <h4 className="text-lg font-mono font-bold mt-1 text-white">
                              {item.token === "<eos>" ? "</s>" : item.token}
                            </h4>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                              isWinner
                                ? "bg-primary/20 text-primary"
                                : "bg-white/5 text-muted-foreground"
                            }`}
                          >
                            {(item.prob * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Logit detail */}
                        <div className="flex justify-between items-center mt-6 font-mono text-[10px] text-muted-foreground z-10">
                          <span>Raw Logit:</span>
                          <span className={item.logit > 0 ? "text-emerald-400" : "text-rose-400"}>
                            {item.logit > 0 ? `+${item.logit.toFixed(2)}` : item.logit.toFixed(2)}
                          </span>
                        </div>

                        {/* Probability Progress Bar */}
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              isWinner ? "bg-primary" : "bg-white/20"
                            }`}
                            style={{ width: `${item.prob * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 5 — ATTENTION VISUALIZER */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Transformer Attention Maps</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualize self-attention weights showing where each token focuses during
                  computation. Toggle heads to observe different semantic projection maps.
                </p>
              </div>

              {activeSequence.length <= 1 ? (
                <div className="text-center py-12 glass rounded-2xl border border-white/5">
                  <Info className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground font-mono">
                    Ensure sequence contains multiple tokens to display attention weights.
                  </span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Head switch bar */}
                  <div className="flex flex-wrap gap-2 items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                        Attention Head Selector
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map((head) => (
                        <button
                          key={head}
                          onClick={() => setActiveAttentionHead(head)}
                          className={`text-xs px-3.5 py-1.5 rounded-xl font-mono border transition-all cursor-pointer ${
                            activeAttentionHead === head
                              ? "bg-primary border-primary/20 text-primary-foreground font-bold shadow-md"
                              : "glass border-white/5 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Head {head}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-2">
                    {/* Visual 1: Query-Key connection lines */}
                    <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold">Causal Attention Connections</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Hover queries to draw normalized self-attention weight paths.
                        </p>
                      </div>

                      <div className="relative flex justify-between select-none py-2 max-h-[380px] overflow-y-auto pr-2">
                        {/* Queries */}
                        <div className="flex flex-col gap-1 z-10 w-28">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-center font-mono">
                            Queries
                          </span>
                          {activeTokensText.map((tok, idx) => (
                            <div
                              key={`q-${idx}`}
                              onMouseEnter={() => setHoveredQueryIdx(idx)}
                              onMouseLeave={() => setHoveredQueryIdx(null)}
                              onClick={() =>
                                setSelectedSequenceTokenIdx(
                                  idx === selectedSequenceTokenIdx ? null : idx,
                                )
                              }
                              className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                                hoveredQueryIdx === idx || selectedSequenceTokenIdx === idx
                                  ? "bg-primary/20 border-primary text-primary font-bold shadow-md scale-102"
                                  : "glass border-white/5 text-foreground/80 hover:bg-white/5"
                              }`}
                            >
                              {tok}
                            </div>
                          ))}
                        </div>

                        {/* Connections SVG */}
                        <div className="absolute inset-x-28 inset-y-8 pointer-events-none">
                          <svg
                            className="w-full h-full"
                            style={{ minHeight: `${activeSequence.length * 36}px` }}
                          >
                            {activeSequence.map((_, qIdx) => {
                              return activeSequence.map((_, kIdx) => {
                                // Causal mask constraint
                                if (kIdx > qIdx) return null;

                                const weight =
                                  lastResult?.attentions[0]?.[activeAttentionHead]?.[qIdx]?.[
                                    kIdx
                                  ] ?? (kIdx === qIdx ? 1.0 : 0.0);

                                if (weight < 0.05) return null;

                                const y1 = qIdx * 34 + 16;
                                const y2 = kIdx * 34 + 16;

                                // Highlight logic
                                const activeQueryIdx =
                                  hoveredQueryIdx !== null
                                    ? hoveredQueryIdx
                                    : selectedSequenceTokenIdx;
                                const isQueryHovered = activeQueryIdx !== null;
                                const isKeyHovered = hoveredKeyIdx !== null;
                                const isActiveQuery = activeQueryIdx === qIdx;
                                const isActiveKey = hoveredKeyIdx === kIdx;

                                let strokeOpacity = weight * 0.45;
                                let strokeColor = "oklch(0.78 0.025 235)"; // primary steel
                                let strokeWidth = weight * 2.5;

                                if (isQueryHovered) {
                                  if (isActiveQuery) {
                                    strokeOpacity = weight * 0.9;
                                    strokeColor = "oklch(0.82 0.022 220)"; // cyan highlight
                                    strokeWidth = weight * 3.5;
                                  } else {
                                    strokeOpacity = weight * 0.08;
                                  }
                                } else if (isKeyHovered) {
                                  if (isActiveKey) {
                                    strokeOpacity = weight * 0.9;
                                    strokeColor = "oklch(0.82 0.04 85)"; // amber highlight
                                    strokeWidth = weight * 3.5;
                                  } else {
                                    strokeOpacity = weight * 0.08;
                                  }
                                }

                                const flowDuration = 0.45 + (1 - weight) * 1.5;

                                return (
                                  <g key={`flow-${qIdx}-${kIdx}`}>
                                    {/* Base static path */}
                                    <path
                                      d={`M 0,${y1} C 35,${y1} 45,${y2} 80,${y2}`}
                                      fill="none"
                                      stroke={strokeColor}
                                      strokeWidth={strokeWidth}
                                      strokeOpacity={strokeOpacity}
                                      className="transition-all duration-300"
                                    />
                                    {/* Marching active pulse path */}
                                    {(!isQueryHovered || isActiveQuery) &&
                                      (!isKeyHovered || isActiveKey) && (
                                        <path
                                          d={`M 0,${y1} C 35,${y1} 45,${y2} 80,${y2}`}
                                          fill="none"
                                          stroke={
                                            isActiveQuery
                                              ? "oklch(0.82 0.022 220)"
                                              : "oklch(0.78 0.025 235)"
                                          }
                                          strokeWidth={strokeWidth * 1.3}
                                          strokeOpacity={strokeOpacity * 1.6}
                                          className="attention-flow-line"
                                          style={{ animationDuration: `${flowDuration}s` }}
                                        />
                                      )}
                                  </g>
                                );
                              });
                            })}
                          </svg>
                        </div>

                        {/* Keys */}
                        <div className="flex flex-col gap-1 z-10 w-28">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-center font-mono">
                            Keys (Source)
                          </span>
                          {activeTokensText.map((tok, idx) => (
                            <div
                              key={`k-${idx}`}
                              onMouseEnter={() => setHoveredKeyIdx(idx)}
                              onMouseLeave={() => setHoveredKeyIdx(null)}
                              className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border text-center transition-all cursor-crosshair ${
                                hoveredKeyIdx === idx
                                  ? "bg-primary/20 border-primary text-primary"
                                  : "glass border-white/5 text-foreground/80"
                              }`}
                            >
                              {tok}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Visual 2: Heatmap grid */}
                    <div className="glass rounded-2xl p-6 border border-white/5">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold">Weight Attention Heatmap (Q × K)</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Grid representation. Grid cell opacity correlates to dot-product score
                          weights.
                        </p>
                      </div>

                      <div className="max-h-[320px] overflow-auto border border-white/5 rounded-xl p-2 bg-black/10 select-none">
                        <div
                          className="grid gap-1 font-mono text-[9px]"
                          style={{
                            gridTemplateColumns: `repeat(${activeSequence.length + 1}, minmax(36px, 1fr))`,
                          }}
                        >
                          {/* Column headers (Keys) */}
                          <div className="text-center font-bold border-b border-white/10 pb-1 text-muted-foreground">
                            Q\K
                          </div>
                          {activeTokensText.map((tok, idx) => (
                            <div
                              key={`header-k-${idx}`}
                              className="text-center font-bold border-b border-white/10 pb-1 truncate text-muted-foreground"
                            >
                              {tok}
                            </div>
                          ))}

                          {/* Grid Rows */}
                          {activeSequence.map((_, qIdx) => {
                            const queryTok = VOCAB[activeSequence[qIdx]];
                            return (
                              <div key={`row-${qIdx}`} className="contents">
                                <div className="text-left font-bold py-1 truncate text-muted-foreground">
                                  {queryTok}
                                </div>
                                {activeSequence.map((_, kIdx) => {
                                  // Mask boundary
                                  const isMasked = kIdx > qIdx;
                                  const weight =
                                    lastResult?.attentions[0]?.[activeAttentionHead]?.[qIdx]?.[
                                      kIdx
                                    ] ?? (kIdx === qIdx ? 1.0 : 0.0);

                                  return (
                                    <div
                                      key={`cell-${qIdx}-${kIdx}`}
                                      className={`h-7 rounded-sm flex items-center justify-center transition-all ${
                                        isMasked
                                          ? "bg-white/[0.01] border border-white/[0.02]"
                                          : "border border-white/5 hover:scale-[1.08] cursor-help"
                                      }`}
                                      style={{
                                        backgroundColor: isMasked
                                          ? "transparent"
                                          : `oklch(0.78 0.025 235 / ${Math.max(weight, 0.04)})`,
                                      }}
                                      title={
                                        isMasked
                                          ? "Causal mask blocked"
                                          : `Score: ${weight.toFixed(3)}`
                                      }
                                    >
                                      {!isMasked && weight > 0.08 && (
                                        <span className="text-[7px] text-white opacity-80 font-bold">
                                          {weight.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 6 — EMBEDDING SPACE */}
            <div
              id="embedding-space"
              className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Interactive Embedding Space Projection
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scatter plot representation of the 136-token vocabulary. Clicking a single point
                  projects similarity lines. Clicking a **second** point draws a vector ruler
                  comparing them.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
                {/* 2D Projection SVG container */}
                <div className="glass rounded-2xl p-4 border border-white/5 flex flex-col justify-between items-center relative overflow-hidden bg-black/10 select-none">
                  {/* Category Legends */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-3 z-10 text-[10px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS.nouns }}
                      />{" "}
                      Nouns
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS.verbs }}
                      />{" "}
                      Verbs
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS.tech }}
                      />{" "}
                      AI & Technical
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS.grammar }}
                      />{" "}
                      Grammar
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS.special }}
                      />{" "}
                      Punctuation
                    </span>
                  </div>

                  <div className="w-full relative h-[360px] flex items-center justify-center">
                    <svg viewBox="-105 -105 210 210" className="w-full h-full max-w-[480px]">
                      {/* Grid overlays */}
                      <circle
                        r="85"
                        fill="none"
                        stroke="oklch(1 0 0 / 0.02)"
                        strokeDasharray="3,3"
                      />
                      <circle
                        r="50"
                        fill="none"
                        stroke="oklch(1 0 0 / 0.02)"
                        strokeDasharray="3,3"
                      />
                      <line x1="-100" y1="0" x2="100" y2="0" stroke="oklch(1 0 0 / 0.025)" />
                      <line x1="0" y1="-100" x2="0" y2="100" stroke="oklch(1 0 0 / 0.025)" />

                      {/* Cosine similarity lines from selected token */}
                      {selectedEmbeddingIdx !== null &&
                        secondSelectedEmbeddingIdx === null &&
                        embeddingSimilarities.map((item, idx) => {
                          const targetNode = embeddingProjectedCoords[item.idx];
                          const selectedNode = embeddingProjectedCoords[selectedEmbeddingIdx];

                          if (!targetNode || !selectedNode) return null;

                          return (
                            <path
                              key={`sim-line-${idx}`}
                              d={`M ${selectedNode.cx},${selectedNode.cy} L ${targetNode.cx},${targetNode.cy}`}
                              fill="none"
                              stroke="oklch(0.82 0.022 220)" // cyan theme line
                              strokeWidth={item.similarity * 1.5}
                              strokeOpacity={item.similarity * 0.6}
                              strokeDasharray="2,2"
                              className="transition-all duration-300"
                            />
                          );
                        })}

                      {/* Vector Ruler line between two selected points */}
                      {selectedEmbeddingIdx !== null &&
                        secondSelectedEmbeddingIdx !== null &&
                        (() => {
                          const pt1 = embeddingProjectedCoords[selectedEmbeddingIdx];
                          const pt2 = embeddingProjectedCoords[secondSelectedEmbeddingIdx];
                          if (!pt1 || !pt2) return null;
                          const midX = (pt1.cx + pt2.cx) / 2;
                          const midY = (pt1.cy + pt2.cy) / 2 - 3;
                          return (
                            <g>
                              <line
                                x1={pt1.cx}
                                y1={pt1.cy}
                                x2={pt2.cx}
                                y2={pt2.cy}
                                stroke="oklch(0.82 0.04 85)"
                                strokeWidth="1.5"
                                strokeDasharray="3 2"
                                className="animate-pulse"
                              />
                              <text
                                x={midX}
                                y={midY}
                                textAnchor="middle"
                                fill="oklch(0.82 0.04 85)"
                                className="font-mono font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                                style={{ fontSize: "5px" }}
                              >
                                {calculatedSimilarity.toFixed(4)}
                              </text>
                            </g>
                          );
                        })()}

                      {/* Node dots */}
                      {embeddingProjectedCoords.map((pt) => {
                        const isSelected = selectedEmbeddingIdx === pt.idx;
                        const isSecondSelected = secondSelectedEmbeddingIdx === pt.idx;
                        const isHovered = hoveredEmbeddingIdx === pt.idx;
                        const isNeighbor =
                          secondSelectedEmbeddingIdx === null &&
                          embeddingSimilarities.some((sim) => sim.idx === pt.idx);

                        const color =
                          CATEGORY_COLORS[pt.category as keyof typeof CATEGORY_COLORS] ||
                          CATEGORY_COLORS.special;

                        return (
                          <g key={`node-${pt.idx}`}>
                            <circle
                              cx={pt.cx}
                              cy={pt.cy}
                              r={
                                isSelected || isSecondSelected
                                  ? 5.5
                                  : isHovered
                                    ? 4.5
                                    : isNeighbor
                                      ? 3.5
                                      : 2.2
                              }
                              fill={color}
                              className="transition-all duration-300 cursor-pointer"
                              style={{
                                filter:
                                  isSelected || isSecondSelected || isHovered || isNeighbor
                                    ? `drop-shadow(0 0 3px ${color})`
                                    : "none",
                              }}
                              onMouseEnter={() => setHoveredEmbeddingIdx(pt.idx)}
                              onMouseLeave={() => setHoveredEmbeddingIdx(null)}
                              onClick={() => handleEmbeddingClick(pt.idx)}
                            />
                          </g>
                        );
                      })}

                      {/* Top labels rendering overlay to prevent cluttering */}
                      {embeddingProjectedCoords.map((pt) => {
                        const isSelected = selectedEmbeddingIdx === pt.idx;
                        const isSecondSelected = secondSelectedEmbeddingIdx === pt.idx;
                        const isHovered = hoveredEmbeddingIdx === pt.idx;
                        const isNeighbor =
                          secondSelectedEmbeddingIdx === null &&
                          embeddingSimilarities.some((sim) => sim.idx === pt.idx);

                        if (!isSelected && !isSecondSelected && !isHovered && !isNeighbor)
                          return null;

                        return (
                          <text
                            key={`lbl-${pt.idx}`}
                            x={pt.cx}
                            y={pt.cy - 5}
                            textAnchor="middle"
                            fill="oklch(0.96 0.004 250)"
                            className="font-mono font-bold pointer-events-none select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                            style={{ fontSize: "5px" }}
                          >
                            {pt.token}
                          </text>
                        );
                      })}
                    </svg>
                  </div>

                  <span className="text-[10px] text-muted-foreground mt-2 font-mono">
                    Click coordinates to measure cosine distance mapping vectors.
                  </span>
                </div>

                {/* Similarity Side ruler */}
                <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                      Cosine Similarity Ruler
                    </h4>

                    {selectedEmbeddingIdx === null ? (
                      <div className="text-center py-12 text-muted-foreground text-xs font-mono italic">
                        Select a token point in the 2D cluster map to run dot-product
                        similarities...
                      </div>
                    ) : secondSelectedEmbeddingIdx === null ? (
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            Selected Token
                          </span>
                          <h4 className="text-lg font-mono font-bold mt-1 text-white">
                            "{VOCAB[selectedEmbeddingIdx]}"
                          </h4>
                          <span className="text-[10px] text-muted-foreground block font-mono mt-1">
                            Coordinates: [
                            {EMBEDDING_COORDS[selectedEmbeddingIdx]
                              .map((c) => c.toFixed(2))
                              .join(", ")}
                            ]
                          </span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                            Nearest Latent Neighbors
                          </span>

                          <div className="space-y-2.5">
                            {embeddingSimilarities.map((item, idx) => (
                              <div
                                key={idx}
                                className="glass rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors flex justify-between items-center cursor-pointer"
                                onClick={() => handleEmbeddingClick(item.idx)}
                              >
                                <span className="font-mono text-sm font-semibold text-white">
                                  "{item.token}"
                                </span>
                                <div className="text-right font-mono">
                                  <span className="text-xs text-primary font-bold">
                                    {item.similarity.toFixed(4)}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground block">
                                    similarity
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Dual point comparison view
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <span className="text-[9px] text-muted-foreground uppercase font-mono">
                              Token A
                            </span>
                            <h4 className="text-sm font-mono font-bold mt-1 text-white truncate">
                              "{VOCAB[selectedEmbeddingIdx]}"
                            </h4>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <span className="text-[9px] text-muted-foreground uppercase font-mono">
                              Token B
                            </span>
                            <h4 className="text-sm font-mono font-bold mt-1 text-white truncate">
                              "{VOCAB[secondSelectedEmbeddingIdx]}"
                            </h4>
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center space-y-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                            Cosine Similarity
                          </span>
                          <div className="text-3xl font-mono font-bold text-gradient">
                            {calculatedSimilarity.toFixed(6)}
                          </div>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {calculatedSimilarity > 0.8
                              ? "Very Close / Semantic Synonym"
                              : calculatedSimilarity > 0.4
                                ? "Moderately Related"
                                : calculatedSimilarity > 0.0
                                  ? "Weakly Related / Different Context"
                                  : "Opposing Meaning / Permutation Outlier"}
                          </span>
                        </div>

                        {/* Slider indicator */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                            <span>-1.0 (Opposite)</span>
                            <span>0.0</span>
                            <span>+1.0 (Identical)</span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded-full relative overflow-hidden">
                            <div
                              className="absolute top-0 bottom-0 bg-primary transition-all duration-300"
                              style={{
                                left: "50%",
                                width: `${(calculatedSimilarity / 2) * 100}%`,
                              }}
                            />
                            <div
                              className="absolute h-3 w-1 bg-white top-[-2px] shadow-md transition-all duration-300"
                              style={{
                                left: `${((calculatedSimilarity + 1) / 2) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedEmbeddingIdx !== null && (
                    <button
                      onClick={() => {
                        setSelectedEmbeddingIdx(null);
                        setSecondSelectedEmbeddingIdx(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground text-center mt-4 transition-colors font-mono block cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 7 — MODEL INSPECTOR / SYSTEM LOGS */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Hardware diagnostics & Model Inspector
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Real-time GPU tensor allocations and latency performance logs.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-muted-foreground">FPS:</span>
                    <span className="font-bold text-white">{fps}</span>
                  </div>
                  <button
                    onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 glass px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    {isLogsExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" /> Collapse Logs
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" /> Expand Logs
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <div className="glass rounded-2xl p-4 border border-white/5 space-y-1 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Tensors Count
                  </span>
                  <h4 className="text-xl font-mono font-bold text-white">
                    {tf.memory().numTensors}
                  </h4>
                  <span className="text-[9px] text-muted-foreground block">
                    allocated in backend
                  </span>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/5 space-y-1 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    VRAM / Heap
                  </span>
                  <h4 className="text-xl font-mono font-bold text-white">
                    {(tf.memory().numBytes / 1024).toFixed(1)} KB
                  </h4>
                  <span className="text-[9px] text-muted-foreground block">
                    GPU weight structures
                  </span>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/5 space-y-1 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Context Depth
                  </span>
                  <h4 className="text-xl font-mono font-bold text-white">
                    {activeSequence.length} / 32
                  </h4>
                  <span className="text-[9px] text-muted-foreground block">
                    sequence token depth
                  </span>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/5 space-y-1 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Active Backend
                  </span>
                  <h4 className="text-xl font-mono font-bold text-primary uppercase">
                    {model?.backendName || "cpu"}
                  </h4>
                  <div className="flex gap-1 justify-center mt-1">
                    {["webgl", "wasm", "cpu"].map((b) => (
                      <button
                        key={b}
                        disabled={model?.backendName === b || modelLoading}
                        onClick={() => handleRetryLoading(b)}
                        className={`text-[9.5px] px-1 py-0.5 rounded font-mono border transition-all cursor-pointer disabled:opacity-40 ${
                          model?.backendName === b
                            ? "bg-primary/20 border-primary text-primary font-bold"
                            : "glass border-white/5 hover:border-white/20 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {b.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/5 space-y-1 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Inference Latency
                  </span>
                  <h4 className="text-xl font-mono font-bold text-white">
                    {avgLatency > 0 ? `${avgLatency.toFixed(1)} ms` : "—"}
                  </h4>
                  <span className="text-[9px] text-muted-foreground block">
                    average prediction cycle
                  </span>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/5 space-y-1 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Inference Speed
                  </span>
                  <h4 className="text-xl font-mono font-bold text-white">
                    {avgLatency > 0 ? `${(1000 / avgLatency).toFixed(1)} tok/s` : "—"}
                  </h4>
                  <span className="text-[9px] text-muted-foreground block">throughput rate</span>
                </div>
              </div>

              {/* Collapsible logs shell */}
              <AnimatePresence initial={false}>
                {isLogsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="glass rounded-2xl p-4 border border-white/5 bg-black/40 h-44 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 text-emerald-400/90 shadow-inner select-text">
                      {logs.map((log, idx) => (
                        <div key={idx}>{log}</div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </ModuleLayout>
    </PageShell>
  );
}

// TokenBadge component handling entering animation with anime.js
function TokenBadge({
  token,
  isPrompt,
  isLast,
  confidence = 1.0,
  isSelected = false,
  onClick,
}: {
  token: string;
  isPrompt: boolean;
  isLast: boolean;
  confidence?: number;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const badgeRef = useRef<HTMLSpanElement>(null);

  const animsRef = useRef<{ revert: () => void }[]>([]);

  useEffect(() => {
    // Clear any previous animations
    animsRef.current.forEach((a) => {
      try {
        a.revert();
      } catch (e) {
        // Ignore
      }
    });
    animsRef.current = [];

    if (isLast && badgeRef.current) {
      // Entrance stagger elastic bounce
      const anim1 = animate(badgeRef.current, {
        scale: [0.5, 1],
        translateY: [8, 0],
        opacity: [0, 1],
        duration: 380,
        ease: "outElastic(1.1, 0.65)",
      });
      animsRef.current.push(anim1);

      // Neon pulse shadow ring based on confidence
      const glowColorBase =
        confidence > 0.7
          ? "0.74 0.16 160" // Emerald green
          : confidence > 0.3
            ? "0.82 0.12 90" // Amber/Gold
            : "0.70 0.15 30"; // Warm red/coral

      const anim2 = animate(badgeRef.current, {
        boxShadow: [
          `0 0 0px oklch(${glowColorBase} / 0)`,
          `0 0 16px oklch(${glowColorBase} / 0.75)`,
          `0 0 0px oklch(${glowColorBase} / 0)`,
        ],
        duration: 800,
        ease: "outQuad",
      });
      animsRef.current.push(anim2);
    }

    return () => {
      animsRef.current.forEach((a) => {
        try {
          a.revert();
        } catch (e) {
          // Ignore
        }
      });
      animsRef.current = [];
    };
  }, [isLast, confidence]);

  const cleanText = token === "<bos>" ? "<s>" : token === "<eos>" ? "</s>" : token;

  const confidenceBorder = isPrompt
    ? "border-white/10"
    : confidence > 0.7
      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10"
      : confidence > 0.3
        ? "border-amber-500/40 text-amber-300 bg-amber-500/5 hover:bg-amber-500/10"
        : "border-rose-500/40 text-rose-300 bg-rose-500/5 hover:bg-rose-500/10";

  return (
    <span
      ref={badgeRef}
      onClick={onClick}
      className={`inline-block px-3 py-1 font-mono text-sm rounded-lg border transition-all duration-300 select-none cursor-pointer ${
        isPrompt
          ? "bg-white/5 border-white/10 text-muted-foreground"
          : `${confidenceBorder} font-bold shadow-sm`
      } ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-black scale-[1.05]" : ""}`}
      title={
        isPrompt ? "Prompt Token" : `Model prediction confidence: ${(confidence * 100).toFixed(1)}%`
      }
    >
      {cleanText}
    </span>
  );
}
