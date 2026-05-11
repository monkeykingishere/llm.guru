import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
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
  Brain
} from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { SectionHeader } from "@/components/ui/SectionHeader";
import "./learn.training-process.css";

const TRAINING_STEPS = [
  {
    id: 1,
    icon: Database,
    color: '#6366f1',
    title: 'Define Dataset',
    description: 'Collect and clean text data, split into train/validation/test sets',
    details: '10M-1B tokens',
    fullDescription: 'Collect and clean high-quality text data from diverse sources. Split into training (80%), validation (10%), and test (10%) sets. Ensure data quality and remove duplicates.',
    highlights: ['Data collection', 'Quality filtering', 'Train/val/test split', 'Deduplication']
  },
  {
    id: 2,
    icon: Code,
    color: '#8b5cf6',
    title: 'Build Tokenizer',
    description: 'Train BPE or SentencePiece tokenizer to convert text to integer IDs',
    details: '16k-50k vocab',
    fullDescription: 'Train a Byte-Pair Encoding (BPE) or SentencePiece tokenizer on your corpus. This converts raw text into integer IDs that model can process.',
    highlights: ['BPE training', 'Vocabulary size', 'Special tokens', 'Encoding/decoding']
  },
  {
    id: 3,
    icon: Layers,
    color: '#c084fc',
    title: 'Choose Architecture',
    description: 'Select layer count, hidden size, attention heads, context length',
    details: 'decoder-only',
    fullDescription: 'Design transformer architecture: number of layers, hidden dimension, attention heads, context window size, normalization, and activation functions.',
    highlights: ['Layer count', 'Hidden size', 'Attention heads', 'Context length']
  },
  {
    id: 4,
    icon: Zap,
    color: '#f59e0b',
    title: 'Pre-Train',
    description: 'Self-supervised next-token prediction with batching and checkpoints',
    details: 'next token',
    fullDescription: 'Train model on next-token prediction objective using large batches, gradient accumulation, learning rate warmup, and regular checkpointing.',
    highlights: ['Next-token prediction', 'Large batches', 'Gradient accumulation', 'LR warmup']
  },
  {
    id: 5,
    icon: MessageSquare,
    color: '#10b981',
    title: 'Instruction Tune',
    description: 'Teach model to follow prompts using conversations and examples',
    details: 'SFT + DPO',
    fullDescription: 'Fine-tune on curated instruction-response pairs. Use Supervised Fine-Tuning (SFT) followed by Direct Preference Optimization (DPO) for better instruction following.',
    highlights: ['Instruction pairs', 'SFT training', 'DPO alignment', 'Refusal examples']
  },
  {
    id: 6,
    icon: Rocket,
    color: '#ef4444',
    title: 'Evaluate and Ship',
    description: 'Benchmark accuracy, latency, safety, and deploy with monitoring',
    details: 'guardrails',
    fullDescription: 'Comprehensive evaluation of accuracy, latency, safety, and hallucination rates. Deploy with monitoring, guardrails, and rollback capabilities.',
    highlights: ['Benchmark testing', 'Safety evaluation', 'Performance metrics', 'Deployment']
  }
];

const TRAINING_CONFIG = {
  name: 'tiny-transformer-llm',
  objective: 'next-token-prediction',
  context: 2048,
  optimizer: 'adamw',
  learning_rate: 1e-4,
  batch_size: 32,
  checkpoint: 'every-1000-steps'
};

const TRAINING_FLOW = [
  { id: 'data', label: 'Data', color: '#6366f1', x: 0, y: -100 },
  { id: 'tokens', label: 'Tokens', color: '#8b5cf6', x: 100, y: -50 },
  { id: 'model', label: 'Model', color: '#c084fc', x: 100, y: 50 },
  { id: 'loss', label: 'Loss', color: '#f59e0b', x: 0, y: 100 },
  { id: 'behavior', label: 'Behavior', color: '#10b981', x: -100, y: 50 },
  { id: 'deploy', label: 'Deploy', color: '#ef4444', x: -100, y: -50 }
];

export const Route = createFileRoute("/learn/training-process")({
  head: () => ({
    meta: [
      { title: "Training Process — Latent" },
      {
        name: "description",
        content: "A practical, visual build plan for turning raw text into a small instruction-following language model.",
      },
      { property: "og:title", content: "Training Process" },
      {
        property: "og:description",
        content: "Interactive guide to training large language models from scratch.",
      },
    ],
  }),
  component: Component,
});

function Component() {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeFlowNode, setActiveFlowNode] = useState('data');
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add entrance animations when component mounts
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.animate-on-mount');
      elements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add('animate-in');
        }, index * 100);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleNodeClick = (nodeId: string) => {
    setActiveFlowNode(nodeId);
    // Auto-select corresponding step
    const stepMap: Record<string, number> = {
      'data': 1,
      'tokens': 2,
      'model': 3,
      'loss': 4,
      'behavior': 5,
      'deploy': 6
    };
    setSelectedStep(stepMap[nodeId]);
  };

  const handleStepClick = (stepId: number) => {
    setSelectedStep(selectedStep === stepId ? null : stepId);
  };

  return (
    <ModuleLayout
      eyebrow="Module 11"
      title="How to Train Your LLM"
      description="A practical, visual build plan for turning raw text into a small instruction-following language model."
      prev={{ to: "/learn/prediction", label: "Prediction Process" }}
      next={{ to: "/learn/fine-tuning", label: "Fine-Tuning" }}
    >
      {/* Interactive Diagram Section */}
      <div ref={diagramRef} className="mb-16 animate-on-mount">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* Configuration Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <Code className="h-5 w-5 text-aurora" />
              <span className="font-mono text-sm text-muted-foreground">training-run.yaml</span>
            </div>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">model:</span>
                <span className="text-foreground">{TRAINING_CONFIG.name}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">objective:</span>
                <span className="text-foreground">{TRAINING_CONFIG.objective}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">context:</span>
                <span className="text-foreground">{TRAINING_CONFIG.context}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">optimizer:</span>
                <span className="text-foreground">{TRAINING_CONFIG.optimizer}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">learning_rate:</span>
                <span className="text-foreground">{TRAINING_CONFIG.learning_rate}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">batch_size:</span>
                <span className="text-foreground">{TRAINING_CONFIG.batch_size}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">checkpoint:</span>
                <span className="text-foreground">{TRAINING_CONFIG.checkpoint}</span>
              </div>
            </div>
          </motion.div>

          {/* Circular Flow Diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex justify-center items-center"
          >
            <svg className="w-full max-w-md h-auto" viewBox="-150 -150 300 300" style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.1))' }}>
              {/* Connection Lines */}
              {TRAINING_FLOW.map((node, i) => {
                const nextNode = TRAINING_FLOW[(i + 1) % TRAINING_FLOW.length];
                return (
                  <line
                    key={`line-${i}`}
                    x1={node.x}
                    y1={node.y}
                    x2={nextNode.x}
                    y2={nextNode.y}
                    stroke="rgba(99, 102, 241, 0.2)"
                    strokeWidth="2"
                    strokeDasharray="5, 5"
                    className="animate-pulse"
                  />
                );
              })}
              
              {/* Flow Nodes */}
              {TRAINING_FLOW.map((node) => (
                <g key={node.id} className="cursor-pointer">
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="35"
                    fill={node.color}
                    fillOpacity={activeFlowNode === node.id ? "0.9" : "0.7"}
                    stroke={node.color}
                    strokeWidth="3"
                    className="transition-all duration-300 hover:brightness-110"
                    onClick={() => handleNodeClick(node.id)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="600"
                    className="pointer-events-none select-none font-sans uppercase tracking-wider"
                  >
                    {node.label}
                  </text>
                  <AnimatePresence>
                    {hoveredNode === node.id && (
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r="40"
                        fill="none"
                        stroke={node.color}
                        strokeWidth="2"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        pointerEvents="none"
                      />
                    )}
                  </AnimatePresence>
                </g>
              ))}
              
              {/* Center LLM Text */}
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="16"
                fontWeight="700"
                className="pointer-events-none select-none font-sans uppercase tracking-wider"
              >
                LLM
              </text>
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Step-by-Step Guide */}
      <div className="animate-on-mount">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TRAINING_STEPS.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
              className="h-full"
            >
              <div
                className={`glass rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-1 relative overflow-hidden ${
                  selectedStep === step.id ? 'ring-2 ring-aurora/20 bg-white/[0.02]' : ''
                }`}
                onClick={() => handleStepClick(step.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-3xl font-mono font-bold text-muted-foreground/60">
                    {String(step.id).padStart(2, '0')}
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-110" style={{ background: `${step.color}20` }}>
                    <step.icon size={24} color={step.color} />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {step.description}
                </p>
                
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold text-aurora bg-aurora/10">
                    {step.details}
                  </span>
                </div>

                <AnimatePresence>
                  {selectedStep === step.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-white/10 pt-4 mt-4"
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {step.fullDescription}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {step.highlights.map((highlight, i) => (
                          <div key={i} className="inline-flex items-center px-3 py-1 rounded-lg bg-background/50 border border-white/10 text-xs text-muted-foreground transition-colors duration-300 hover:bg-aurora/10 hover:border-aurora/20 hover:text-foreground">
                            {highlight}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step Indicator */}
                <div 
                  className="absolute bottom-0 left-0 w-1 h-full transition-opacity duration-300 step-indicator-gradient"
                  style={{ 
                    '--step-color': step.color,
                    opacity: selectedStep === step.id ? 1 : 0.3
                  } as any}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
