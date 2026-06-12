// import { createFileRoute } from "@tanstack/react-router";
// import { motion } from "framer-motion";
// import { useMemo, useState } from "react";
// import { Gauge, TrendingUp, Cpu } from "lucide-react";
// import { ModuleLayout } from "@/components/modules/ModuleLayout";

// export const Route = createFileRoute("/learn/scaling")({
//   head: () => ({
//     meta: [
//       { title: "Parameters & Scaling — Latent" },
//       { name: "description", content: "Scaling laws made tangible. Move the parameter slider and watch loss, FLOPs, and capabilities respond." },
//       { property: "og:title", content: "Parameters & Scaling" },
//       { property: "og:description", content: "What changes when you go from 1B to 1T." },
//     ],
//   }),
//   component: Page,
// });

// const LANDMARKS = [
//   { p: 0.117, name: "GPT-2 small" },
//   { p: 1.5, name: "GPT-2 XL" },
//   { p: 7, name: "Llama-7B" },
//   { p: 70, name: "Llama-70B" },
//   { p: 175, name: "GPT-3" },
//   { p: 1000, name: "Frontier ~1T" },
// ];

// function Page() {
//   const [params, setParams] = useState(7); // billions
//   const [tokens, setTokens] = useState(2000); // billions

//   // Chinchilla-ish: optimal tokens ≈ 20 × params (B)
//   const optimalTokens = params * 20;
//   const lossProxy = useMemo(() => {
//     // toy power-law: L = 1.69 + 0.5 / N^0.34 + 0.4 / D^0.28
//     const N = params * 1e9;
//     const D = tokens * 1e9;
//     return 1.69 + 0.5 / Math.pow(N, 0.095) + 0.4 / Math.pow(D, 0.085);
//   }, [params, tokens]);
//   const flops = 6 * params * 1e9 * tokens * 1e9; // 6ND
//   const compute = flops / 1e21; // ZFLOPs

//   const curve = useMemo(() => {
//     const pts = [];
//     for (let i = -1; i <= 3.5; i += 0.1) {
//       const n = Math.pow(10, i); // B params
//       const N = n * 1e9;
//       const D = n * 20 * 1e9;
//       const l = 1.69 + 0.5 / Math.pow(N, 0.095) + 0.4 / Math.pow(D, 0.085);
//       pts.push({ n, l });
//     }
//     return pts;
//   }, []);

//   const xMin = -1, xMax = 3.5;
//   const yMin = 1.7, yMax = 3.0;
//   const W = 600, H = 260;
//   const px = (x: number) => ((x - xMin) / (xMax - xMin)) * (W - 60) + 50;
//   const py = (y: number) => H - 30 - ((y - yMin) / (yMax - yMin)) * (H - 60);

//   const path = curve.map((p, i) => `${i ? "L" : "M"} ${px(Math.log10(p.n))} ${py(p.l)}`).join(" ");

//   return (
//     <ModuleLayout
//       eyebrow="Module 13"
//       title="The scaling laws of intelligence"
//       description="As you grow parameters and data together, loss falls on a power-law curve — and new abilities appear at predictable thresholds."
//       prev={{ to: "/learn/fine-tuning", label: "Fine-Tuning" }}
//       next={{ to: "/learn/limitations", label: "Limitations" }}
//     >
//       <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
//         {/* Curve */}
//         <div className="glass rounded-3xl p-6 sm:p-8">
//           <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
//             <TrendingUp className="h-3.5 w-3.5 text-aurora" /> Loss vs. parameters (log-log)
//           </div>
//           <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full h-auto">
//             <defs>
//               <linearGradient id="curveG" x1="0" x2="1">
//                 <stop offset="0" stopColor="oklch(0.66 0.21 285)" />
//                 <stop offset="1" stopColor="oklch(0.72 0.24 330)" />
//               </linearGradient>
//             </defs>
//             {/* axes */}
//             <line x1={50} y1={H - 30} x2={W - 10} y2={H - 30} stroke="oklch(1 0 0 / 0.15)" />
//             <line x1={50} y1={20} x2={50} y2={H - 30} stroke="oklch(1 0 0 / 0.15)" />
//             {/* gridlines */}
//             {[-1, 0, 1, 2, 3].map((x) => (
//               <g key={x}>
//                 <line x1={px(x)} y1={20} x2={px(x)} y2={H - 30} stroke="oklch(1 0 0 / 0.06)" />
//                 <text x={px(x)} y={H - 12} fontSize="10" fill="oklch(0.7 0 0)" textAnchor="middle">
//                   10^{x} B
//                 </text>
//               </g>
//             ))}
//             {/* curve */}
//             <path d={path} stroke="url(#curveG)" strokeWidth={2.5} fill="none" />
//             {/* landmarks */}
//             {LANDMARKS.map((m) => {
//               const N = m.p * 1e9;
//               const D = m.p * 20 * 1e9;
//               const l = 1.69 + 0.5 / Math.pow(N, 0.095) + 0.4 / Math.pow(D, 0.085);
//               return (
//                 <g key={m.name}>
//                   <circle cx={px(Math.log10(m.p))} cy={py(l)} r={3} fill="oklch(0.72 0.24 330)" />
//                   <text x={px(Math.log10(m.p)) + 6} y={py(l) - 4} fontSize="9" fill="oklch(0.85 0 0)">
//                     {m.name}
//                   </text>
//                 </g>
//               );
//             })}
//             {/* current */}
//             <circle cx={px(Math.log10(params))} cy={py(lossProxy)} r={6} fill="oklch(0.78 0.15 210)" stroke="white" strokeWidth={1.5} />
//           </svg>

//           <div className="mt-4 grid gap-4 sm:grid-cols-2">
//             <label className="block text-xs text-muted-foreground">
//               Parameters: <span className="text-foreground">{params < 1 ? `${(params * 1000).toFixed(0)}M` : `${params}B`}</span>
//               <input
//                 type="range"
//                 min={0.1}
//                 max={1500}
//                 step={0.1}
//                 value={params}
//                 onChange={(e) => setParams(+e.target.value)}
//                 className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
//               />
//             </label>
//             <label className="block text-xs text-muted-foreground">
//               Training tokens: <span className="text-foreground">{tokens}B</span>{" "}
//               <span className="text-[10px]">(optimal: {optimalTokens.toFixed(0)}B)</span>
//               <input
//                 type="range"
//                 min={10}
//                 max={20000}
//                 step={10}
//                 value={tokens}
//                 onChange={(e) => setTokens(+e.target.value)}
//                 className="mt-2 w-full accent-[color:var(--glow-fuchsia)]"
//               />
//             </label>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid gap-4 content-start">
//           {[
//             { label: "Validation loss (proxy)", value: lossProxy.toFixed(3) },
//             { label: "Compute (FLOPs ≈ 6ND)", value: `${compute.toFixed(1)} ZFLOPs` },
//             { label: "Memory at fp16", value: `${(params * 2).toFixed(1)} GB` },
//             { label: "Inference cost / 1M tok", value: `$${(params * 0.15).toFixed(2)}` },
//           ].map((s) => (
//             <motion.div
//               key={s.label}
//               initial={{ opacity: 0, y: 6 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.4 }}
//               className="glass rounded-2xl p-5 flex items-center justify-between"
//             >
//               <span className="text-sm text-muted-foreground">{s.label}</span>
//               <span className="text-xl font-semibold tracking-tight text-gradient tabular-nums">{s.value}</span>
//             </motion.div>
//           ))}
//           <div className="glass rounded-2xl p-5">
//             <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
//               <Cpu className="h-3.5 w-3.5" /> Chinchilla rule
//             </div>
//             <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
//               For a fixed compute budget, train on roughly <span className="font-mono">20 tokens per parameter</span>. Most pre-2022 models were over-parameterized and under-fed.
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Emergent abilities */}
//       <div className="mt-12">
//         <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
//           <Gauge className="h-3.5 w-3.5" /> Emergent abilities
//         </div>
//         <h3 className="mt-3 text-2xl font-semibold tracking-tight">Capabilities don't fade in — they unlock.</h3>
//         <div className="mt-6 grid gap-4 md:grid-cols-4">
//           {[
//             { p: "~1B", c: "Fluent grammar" },
//             { p: "~10B", c: "Basic instruction following" },
//             { p: "~50B", c: "Few-shot reasoning" },
//             { p: "~100B+", c: "Tool use, chain-of-thought" },
//           ].map((e, i) => (
//             <motion.div
//               key={e.p}
//               initial={{ opacity: 0, y: 10 }}
//               whileInView={{ opacity: 1, y: 0 }}
//               viewport={{ once: true }}
//               transition={{ duration: 0.4, delay: i * 0.05 }}
//               className="glass rounded-2xl p-5"
//             >
//               <div className="font-mono text-xs text-muted-foreground">{e.p}</div>
//               <div className="mt-2 font-medium">{e.c}</div>
//             </motion.div>
//           ))}
//         </div>
//       </div>
//     </ModuleLayout>
//   );
// }
import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  Gauge,
  TrendingUp,
  DollarSign,
  Cpu,
  Database,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  Layers,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { SectionHeader } from "@/components/ui/SectionHeader";
import "./learn.parameters-scaling.css";

const AI_MODELS = [
  {
    name: "GPT-4",
    parameters: "1.76T",
    trainingData: "45TB",
    estimatedCost: "$63M",
    performance: 94,
    category: "Frontier",
    releaseYear: 2023,
    tokens: "8K",
    context: "128K",
    description: "OpenAI's flagship model with advanced reasoning",
  },
  {
    name: "Claude 3 Opus",
    parameters: "1.5T",
    trainingData: "30TB",
    estimatedCost: "$45M",
    performance: 92,
    category: "Frontier",
    releaseYear: 2024,
    tokens: "200K",
    context: "200K",
    description: "Anthropic's most capable model",
  },
  {
    name: "Gemini 1.5 Pro",
    parameters: "1.2T",
    trainingData: "25TB",
    estimatedCost: "$38M",
    performance: 89,
    category: "Frontier",
    releaseYear: 2024,
    tokens: "1M",
    context: "1M",
    description: "Google's multimodal powerhouse",
  },
  {
    name: "Llama 3 70B",
    parameters: "70B",
    trainingData: "15TB",
    estimatedCost: "$8M",
    performance: 85,
    category: "Open Source",
    releaseYear: 2024,
    tokens: "8K",
    context: "8K",
    description: "Meta's leading open source model",
  },
  {
    name: "Mistral Large",
    parameters: "8x7B",
    trainingData: "8TB",
    estimatedCost: "$4M",
    performance: 82,
    category: "Open Source",
    releaseYear: 2023,
    tokens: "32K",
    context: "32K",
    description: "Efficient mixture of experts model",
  },
  {
    name: "Phi-3 Small",
    parameters: "3.8B",
    trainingData: "4TB",
    estimatedCost: "$1M",
    performance: 75,
    category: "Compact",
    releaseYear: 2024,
    tokens: "4K",
    context: "4K",
    description: "Microsoft's small but capable model",
  },
];

const SCALING_METRICS = [
  { metric: "Parameters", unit: "billions", base: 1, factor: 2 },
  { metric: "Training Data", unit: "TB", base: 1, factor: 4 },
  { metric: "Compute", unit: "Petaflops", base: 1, factor: 8 },
  { metric: "Cost", unit: "millions $", base: 1, factor: 16 },
];

export const Route = createFileRoute("/learn/scaling")({
  head: () => ({
    meta: [
      { title: "Parameters & Scaling — Latent" },
      {
        name: "description",
        content:
          "Interactive scaling calculator for top AI models with their cost and parameter size in 3D visualization.",
      },
      { property: "og:title", content: "Parameters & Scaling" },
      {
        property: "og:description",
        content: "Interactive AI model scaling calculator with 3D visualizations.",
      },
    ],
  }),
  component: Component,
});

function Component() {
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [scalingFactor, setScalingFactor] = useState(1);
  const [activeView, setActiveView] = useState<"3d" | "calculator" | "comparison">("3d");
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // 3D rotation controls
  const rotateX = useMotionValue(30);
  const rotateY = useMotionValue(45);
  const scale = useMotionValue(1);

  const rotateXSpring = useSpring(rotateX, { stiffness: 100, damping: 20 });
  const rotateYSpring = useSpring(rotateY, { stiffness: 100, damping: 20 });
  const scaleSpring = useSpring(scale, { stiffness: 100, damping: 20 });

  const calculateScaledMetrics = (baseMetrics: (typeof SCALING_METRICS)[0], factor: number) => {
    return {
      parameters: baseMetrics.base * factor,
      data: baseMetrics.base * factor ** 0.8,
      compute: baseMetrics.base * factor ** 1.2,
      cost: baseMetrics.base * factor ** 1.5,
    };
  };

  const formatNumber = (num: number, unit: string) => {
    if (num >= 1000000000000) return `${(num / 1000000000000).toFixed(1)}B ${unit}`;
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}M ${unit}`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K ${unit}`;
    return `${num.toFixed(1)} ${unit}`;
  };

  const formatCost = (cost: string) => {
    const num = parseFloat(cost.replace(/[^0-9.]/g, ""));
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}B`;
    return cost;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll(".animate-on-mount");
      elements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add("animate-in");
        }, index * 100);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <PageShell>
      <ModuleLayout
      eyebrow="Module 13"
      title="Parameters & Scaling"
      description="Interactive scaling calculator for top AI models with their cost and parameter size in 3D visualization."
      prev={{ to: "/learn/training-process", label: "Training Process" }}
      next={{ to: "/learn/limitations", label: "Limitations" }}
    >
      {/* View Selector */}
      <div className="mb-8 animate-on-mount">
        <div className="flex justify-center">
          <div className="inline-flex glass rounded-xl p-1">
            {(["3d", "calculator", "comparison"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === view
                    ? "bg-aurora text-white shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                }`}
              >
                {view === "3d" && "3D View"}
                {view === "calculator" && "Calculator"}
                {view === "comparison" && "Comparison"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3D Visualization View */}
      <AnimatePresence mode="wait">
        {activeView === "3d" && (
          <motion.div
            key="3d"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="animate-on-mount"
          >
            <div className="grid gap-8 lg:grid-cols-2 mb-12">
              {/* 3D Model Comparison */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-aurora" />
                  3D Model Comparison
                </h3>
                <div className="space-y-4">
                  {AI_MODELS.map((model, index) => (
                    <motion.div
                      key={model.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedModel.name === model.name
                          ? "bg-aurora/10 border border-aurora/30"
                          : "hover:bg-white/[0.05]"
                      }`}
                      onClick={() => setSelectedModel(model)}
                      onMouseEnter={() => setHoveredModel(model.name)}
                      onMouseLeave={() => setHoveredModel(null)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{model.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            model.category === "Frontier"
                              ? "bg-red-500/10 text-red-300"
                              : model.category === "Open Source"
                                ? "bg-green-500/10 text-green-300"
                                : "bg-blue-500/10 text-blue-300"
                          }`}
                        >
                          {model.category}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{model.parameters}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{model.trainingData}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{model.estimatedCost}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{model.performance}%</span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {hoveredModel === model.name && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-3 pt-3 border-t border-white/10"
                          >
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Tokens:</span>
                                <span className="font-medium">{model.tokens}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Context:</span>
                                <span className="font-medium">{model.context}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Year:</span>
                                <span className="font-medium">{model.releaseYear}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Enhanced 3D Scaling Visualization */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-aurora" />
                  Interactive 3D Scaling Laws
                </h3>

                {/* 3D Controls */}
                <div className="mb-6 flex justify-center gap-4">
                  <button
                    onClick={() => setIsRotating(!isRotating)}
                    className="px-4 py-2 glass rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/[0.05]"
                  >
                    {isRotating ? "Stop Rotation" : "Auto Rotate"}
                  </button>
                  <button
                    onClick={() => {
                      rotateX.set(30);
                      rotateY.set(45);
                      scale.set(1);
                    }}
                    className="px-4 py-2 glass rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/[0.05]"
                  >
                    Reset View
                  </button>
                </div>

                <div className="relative h-96 flex items-center justify-center scaling-3d-container">
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 400 400"
                    style={{
                      filter: "drop-shadow(0 0 40px rgba(99, 102, 241, 0.2))",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* Enhanced 3D Coordinate System */}
                    <g className="coordinate-system">
                      {/* X-axis */}
                      <line
                        x1="50"
                        y1="350"
                        x2="350"
                        y2="350"
                        stroke="rgba(99, 102, 241, 0.4)"
                        strokeWidth="2"
                      />
                      <line
                        x1="350"
                        y1="350"
                        x2="340"
                        y2="345"
                        stroke="rgba(99, 102, 241, 0.4)"
                        strokeWidth="2"
                      />
                      <line
                        x1="350"
                        y1="350"
                        x2="340"
                        y2="355"
                        stroke="rgba(99, 102, 241, 0.4)"
                        strokeWidth="2"
                      />

                      {/* Y-axis */}
                      <line
                        x1="50"
                        y1="350"
                        x2="50"
                        y2="50"
                        stroke="rgba(239, 68, 68, 0.4)"
                        strokeWidth="2"
                      />
                      <line
                        x1="50"
                        y1="50"
                        x2="45"
                        y2="60"
                        stroke="rgba(239, 68, 68, 0.4)"
                        strokeWidth="2"
                      />
                      <line
                        x1="50"
                        y1="50"
                        x2="55"
                        y2="60"
                        stroke="rgba(239, 68, 68, 0.4)"
                        strokeWidth="2"
                      />

                      {/* Z-axis */}
                      <line
                        x1="50"
                        y1="350"
                        x2="200"
                        y2="200"
                        stroke="rgba(16, 185, 129, 0.4)"
                        strokeWidth="2"
                        strokeDasharray="6,4"
                      />
                      <line
                        x1="200"
                        y1="200"
                        x2="190"
                        y2="195"
                        stroke="rgba(16, 185, 129, 0.4)"
                        strokeWidth="2"
                      />
                      <line
                        x1="200"
                        y1="200"
                        x2="195"
                        y2="205"
                        stroke="rgba(16, 185, 129, 0.4)"
                        strokeWidth="2"
                      />

                      {/* Enhanced Axis Labels */}
                      <text
                        x="350"
                        y="380"
                        textAnchor="middle"
                        className="fill-foreground text-base font-bold"
                      >
                        Parameters
                      </text>
                      <text
                        x="30"
                        y="200"
                        textAnchor="middle"
                        className="fill-foreground text-base font-bold"
                        transform="rotate(-90 30 200)"
                      >
                        Performance
                      </text>
                      <text
                        x="380"
                        y="200"
                        textAnchor="middle"
                        className="fill-foreground text-base font-bold"
                        transform="rotate(45 380 200)"
                      >
                        Cost
                      </text>
                    </g>

                    {/* Enhanced 3D Grid Lines */}
                    <g className="grid-lines" opacity="0.15">
                      {[100, 150, 200, 250, 300].map((pos) => (
                        <g key={pos}>
                          <line
                            x1={50}
                            y1={350 - pos}
                            x2={350}
                            y2={350 - pos}
                            stroke="rgba(99, 102, 241, 0.15)"
                            strokeWidth="0.8"
                          />
                          <line
                            x1={50 + pos}
                            y1={50}
                            x2={50 + pos}
                            y2={350}
                            stroke="rgba(99, 102, 241, 0.15)"
                            strokeWidth="0.8"
                          />
                        </g>
                      ))}
                    </g>

                    {/* Masterpiece 3D Model Points */}
                    {AI_MODELS.map((model, index) => {
                      // Perfect parameter parsing
                      const parseParam = (str: string) => {
                        if (str.includes("T")) return parseFloat(str) * 1000;
                        if (str.includes("B")) return parseFloat(str);
                        if (str.includes("x")) {
                          const parts = str.split("x");
                          return parseFloat(parts[0]) * parseFloat(parts[1]);
                        }
                        return parseFloat(str) || 0;
                      };

                      const paramValue = parseParam(model.parameters);
                      const costValue = parseParam(model.estimatedCost);

                      // Perfect 3D positioning
                      const maxParam = 2000;
                      const maxCost = 100;

                      const paramScale = Math.min(paramValue / maxParam, 1);
                      const costScale = Math.min(costValue / maxCost, 1);

                      const x = 50 + paramScale * 280;
                      const y = 350 - (model.performance / 100) * 280;
                      const z = 50 + costScale * 120;

                      return (
                        <motion.g key={model.name} className="model-point-3d">
                          <motion.circle
                            cx={x}
                            cy={y}
                            r={selectedModel.name === model.name ? 14 : 10}
                            fill={
                              model.category === "Frontier"
                                ? "#ef4444"
                                : model.category === "Open Source"
                                  ? "#10b981"
                                  : "#3b82f6"
                            }
                            fillOpacity={selectedModel.name === model.name ? 0.95 : 0.8}
                            stroke="white"
                            strokeWidth="2.5"
                            className="cursor-pointer model-3d-point"
                            whileHover={{
                              scale: 1.5,
                              strokeWidth: 3.5,
                              filter:
                                "brightness(1.4) drop-shadow(0 0 30px rgba(99, 102, 241, 0.5))",
                            }}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => setSelectedModel(model)}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: selectedModel.name === model.name ? 1.3 : 1,
                              opacity: 1,
                            }}
                            transition={{
                              duration: 0.6,
                              delay: index * 0.12,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{
                              filter:
                                selectedModel.name === model.name
                                  ? `drop-shadow(0 0 25px ${
                                      model.category === "Frontier"
                                        ? "#ef444480"
                                        : model.category === "Open Source"
                                          ? "#10b98180"
                                          : "#3b82f680"
                                    })`
                                  : "drop-shadow(0 0 12px rgba(0,0,0,0.3))",
                            }}
                          />
                          <motion.text
                            x={x}
                            y={y - 30}
                            textAnchor="middle"
                            className="fill-foreground text-base font-bold pointer-events-none"
                            initial={{ opacity: 0, y: y - 15 }}
                            animate={{ opacity: 1, y: y - 30 }}
                            transition={{ duration: 0.4, delay: index * 0.12 + 0.2 }}
                          >
                            {model.name.split(" ")[0]}
                          </motion.text>

                          {/* Enhanced 3D Projection Lines */}
                          {selectedModel.name === model.name && (
                            <motion.g
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.6 }}
                              transition={{ duration: 0.5 }}
                              className="projection-lines"
                            >
                              <line
                                x1={x}
                                y1={y}
                                x2={x}
                                y2={350}
                                stroke="rgba(99, 102, 241, 0.5)"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                              />
                              <line
                                x1={x}
                                y1={y}
                                x2={50}
                                y2={y}
                                stroke="rgba(239, 68, 68, 0.5)"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                              />
                              <line
                                x1={x}
                                y1={y}
                                x2={200}
                                y2={200}
                                stroke="rgba(16, 185, 129, 0.5)"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                              />
                            </motion.g>
                          )}
                        </motion.g>
                      );
                    })}

                    {/* Auto-rotation animation */}
                    {isRotating && (
                      <motion.g
                        animate={{ rotateY: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        style={{ transformOrigin: "200px 200px" }}
                      >
                        <circle cx="200" cy="200" r="3" fill="rgba(99, 102, 241, 0.3)" />
                      </motion.g>
                    )}
                  </svg>
                </div>

                {/* 3D Model Info Panel */}
                {selectedModel && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 p-4 glass rounded-xl border border-aurora/30"
                  >
                    <h4 className="font-semibold text-lg mb-3">{selectedModel.name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Parameters:</span>
                        <span className="font-mono font-medium">{selectedModel.parameters}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Training Data:</span>
                        <span className="font-mono font-medium">{selectedModel.trainingData}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estimated Cost:</span>
                        <span className="font-mono font-medium text-aurora">
                          {selectedModel.estimatedCost}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Performance:</span>
                        <span className="font-mono font-medium">{selectedModel.performance}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {selectedModel.description}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Calculator View */}
        {activeView === "calculator" && (
          <motion.div
            key="calculator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="animate-on-mount"
          >
            <div className="glass rounded-2xl p-6 mb-12">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Gauge className="h-5 w-5 text-aurora" />
                Scaling Calculator
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Scaling Factor: {scalingFactor}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={scalingFactor}
                    onChange={(e) => setScalingFactor(parseFloat(e.target.value))}
                    className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.1x</span>
                    <span>10x</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {SCALING_METRICS.map((metric) => {
                    const scaled = calculateScaledMetrics(metric, scalingFactor);
                    return (
                      <motion.div
                        key={metric.metric}
                        className="p-4 rounded-xl bg-background/50 border border-white/10"
                        whileHover={{ scale: 1.02 }}
                        onClick={() =>
                          setExpandedMetric(expandedMetric === metric.metric ? null : metric.metric)
                        }
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-foreground">{metric.metric}</span>
                          <Zap className="h-4 w-4 text-aurora" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Base:</span>
                            <span className="font-mono">
                              {metric.base} {metric.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Scaled:</span>
                            <span className="font-mono text-aurora">
                              {formatNumber(scaled.parameters, metric.unit)}
                            </span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedMetric === metric.metric && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-3 pt-3 border-t border-white/10 text-xs text-muted-foreground"
                            >
                              <p>
                                Scaling factor: {metric.factor}x per order of magnitude increase
                              </p>
                              <div className="mt-2 space-y-1">
                                <div>Data: {formatNumber(scaled.data, "TB")}</div>
                                <div>Compute: {formatNumber(scaled.compute, "PFLOPs")}</div>
                                <div>Cost: ${formatNumber(scaled.cost, "M")}</div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Comparison View */}
        {activeView === "comparison" && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="animate-on-mount"
          >
            <div className="glass rounded-2xl p-6 mb-12">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-aurora" />
                Model Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 font-medium text-foreground">Model</th>
                      <th className="text-left p-3 font-medium text-foreground">Parameters</th>
                      <th className="text-left p-3 font-medium text-foreground">Training Data</th>
                      <th className="text-left p-3 font-medium text-foreground">Cost</th>
                      <th className="text-left p-3 font-medium text-foreground">Performance</th>
                      <th className="text-left p-3 font-medium text-foreground">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AI_MODELS.map((model, index) => (
                      <motion.tr
                        key={model.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/[0.05] cursor-pointer"
                        onClick={() => setSelectedModel(model)}
                      >
                        <td className="p-3 font-medium">{model.name}</td>
                        <td className="p-3 font-mono">{model.parameters}</td>
                        <td className="p-3 font-mono">{model.trainingData}</td>
                        <td className="p-3 font-mono">{formatCost(model.estimatedCost)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-background rounded h-2">
                              <div
                                className="h-full bg-aurora rounded"
                                style={{ width: `${model.performance}%` }}
                              />
                            </div>
                            <span>{model.performance}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              model.category === "Frontier"
                                ? "bg-red-500/10 text-red-300"
                                : model.category === "Open Source"
                                  ? "bg-green-500/10 text-green-300"
                                  : "bg-blue-500/10 text-blue-300"
                            }`}
                          >
                            {model.category}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </ModuleLayout>
    </PageShell>
  );
}
