import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/prediction")({
  head: () => ({
    meta: [
      { title: "Prediction Process — Latent" },
      {
        name: "description",
        content:
          "Watch a language model generate text one token at a time, with live probability distributions and temperature controls.",
      },
      { property: "og:title", content: "Prediction Process — Latent" },
      {
        property: "og:description",
        content: "Token-by-token generation with live probabilities.",
      },
    ],
  }),
  component: Page,
});

type Sequence = { prompt: string; steps: { chosen: string; candidates: [string, number][] }[] };

const SEQUENCES: Sequence[] = [
  {
    prompt: "The cat sat on the",
    steps: [
      {
        chosen: " mat",
        candidates: [
          [" mat", 0.62],
          [" floor", 0.14],
          [" chair", 0.09],
          [" couch", 0.07],
          [" roof", 0.04],
          [" table", 0.04],
        ],
      },
      {
        chosen: " and",
        candidates: [
          [" and", 0.48],
          [" while", 0.18],
          [",", 0.12],
          [".", 0.1],
          [" near", 0.07],
          [" then", 0.05],
        ],
      },
      {
        chosen: " watched",
        candidates: [
          [" watched", 0.35],
          [" stared", 0.22],
          [" purred", 0.18],
          [" slept", 0.13],
          [" waited", 0.07],
          [" listened", 0.05],
        ],
      },
      {
        chosen: " the",
        candidates: [
          [" the", 0.71],
          [" a", 0.12],
          [" some", 0.06],
          [" silently", 0.05],
          [" carefully", 0.04],
          [" quietly", 0.02],
        ],
      },
      {
        chosen: " birds",
        candidates: [
          [" birds", 0.38],
          [" world", 0.21],
          [" rain", 0.15],
          [" sunset", 0.11],
          [" mouse", 0.09],
          [" stars", 0.06],
        ],
      },
      {
        chosen: ".",
        candidates: [
          [".", 0.55],
          [" outside", 0.18],
          [" carefully", 0.12],
          [",", 0.08],
          [" intently", 0.05],
          [" peacefully", 0.02],
        ],
      },
    ],
  },
  {
    prompt: "Once upon a time, in a",
    steps: [
      {
        chosen: " distant",
        candidates: [
          [" distant", 0.31],
          [" small", 0.21],
          [" land", 0.18],
          [" magical", 0.12],
          [" faraway", 0.1],
          [" quiet", 0.08],
        ],
      },
      {
        chosen: " kingdom",
        candidates: [
          [" kingdom", 0.45],
          [" village", 0.19],
          [" land", 0.17],
          [" forest", 0.1],
          [" galaxy", 0.06],
          [" realm", 0.03],
        ],
      },
      {
        chosen: " there",
        candidates: [
          [" there", 0.54],
          [",", 0.21],
          [" lived", 0.13],
          [" stood", 0.06],
          [" was", 0.04],
          [" reigned", 0.02],
        ],
      },
      {
        chosen: " lived",
        candidates: [
          [" lived", 0.62],
          [" was", 0.21],
          [" ruled", 0.08],
          [" dwelt", 0.05],
          [" reigned", 0.03],
          [" stood", 0.01],
        ],
      },
      {
        chosen: " a",
        candidates: [
          [" a", 0.74],
          [" an", 0.12],
          [" the", 0.08],
          [" two", 0.03],
          [" many", 0.02],
          [" three", 0.01],
        ],
      },
      {
        chosen: " young",
        candidates: [
          [" young", 0.27],
          [" brave", 0.22],
          [" wise", 0.17],
          [" kind", 0.15],
          [" lonely", 0.12],
          [" curious", 0.07],
        ],
      },
    ],
  },
];

function applyTemperature(candidates: [string, number][], T: number): [string, number][] {
  const logits = candidates.map(([_, p]) => Math.log(Math.max(p, 1e-9)));
  const scaled = logits.map((l) => l / Math.max(T, 0.05));
  const m = Math.max(...scaled);
  const exps = scaled.map((l) => Math.exp(l - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return candidates.map(([t], i) => [t, exps[i] / sum]);
}

function Page() {
  const [seqIdx, setSeqIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [temp, setTemp] = useState(0.8);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = SEQUENCES[seqIdx];
  const maxStep = seq.steps.length;

  useEffect(() => {
    if (!playing) return;
    if (step >= maxStep) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setStep((s) => s + 1), 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, step, maxStep]);

  const generated = useMemo(
    () =>
      seq.steps
        .slice(0, step)
        .map((s) => s.chosen)
        .join(""),
    [seq, step],
  );

  const current = step < maxStep ? seq.steps[step] : null;
  const tempered = useMemo(
    () => (current ? applyTemperature(current.candidates, temp) : []),
    [current, temp],
  );

  const reset = () => {
    setStep(0);
    setPlaying(false);
  };

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 10 · Prediction"
        title="One token at a time."
        description="A language model doesn't 'write' — it picks the next token from a probability distribution, appends it, and repeats. Hit play to watch the distribution collapse, token after token."
        prev={{ to: "/learn/attention", label: "Attention" }}
        next={{ to: "/learn/transformer", label: "Transformer" }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mr-2">
            Prompt
          </div>
          {SEQUENCES.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setSeqIdx(i);
                setStep(0);
                setPlaying(false);
              }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                seqIdx === i
                  ? "bg-aurora text-white"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.prompt}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr,1fr]">
          <div className="glass-strong rounded-3xl p-6 min-h-[260px]">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Output</div>
            <div className="mt-3 font-mono text-2xl leading-relaxed">
              <span className="text-foreground/70">{seq.prompt}</span>
              <AnimatePresence>
                {seq.steps.slice(0, step).map((s, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 8, color: "#a78bfa" }}
                    animate={{ opacity: 1, y: 0, color: "#f5f3ff" }}
                    transition={{ duration: 0.5 }}
                  >
                    {s.chosen}
                  </motion.span>
                ))}
              </AnimatePresence>
              {step < maxStep && playing && (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block w-2 h-6 align-middle bg-[color:var(--glow-violet)] ml-1 rounded-sm"
                />
              )}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => {
                  if (step >= maxStep) setStep(0);
                  setPlaying((p) => !p);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-aurora px-4 py-2 text-sm font-medium text-white"
              >
                {playing ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> {step >= maxStep ? "Replay" : "Generate"}
                  </>
                )}
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl glass px-3 py-2 text-sm"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStep((s) => Math.min(s + 1, maxStep))}
                className="text-sm px-3 py-2 rounded-xl glass text-muted-foreground hover:text-foreground"
              >
                Step →
              </button>
              <div className="ml-auto text-xs text-muted-foreground">
                {step} / {maxStep} tokens
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span>Temperature</span>
                <span className="font-mono text-gradient text-sm">{temp.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={5}
                max={200}
                value={Math.round(temp * 100)}
                onChange={(e) => setTemp(parseInt(e.target.value) / 100)}
                className="mt-2 w-full accent-[color:var(--glow-violet)]"
              />
              <div className="flex justify-between text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                <span>determined</span>
                <span>creative</span>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Next-token distribution
            </div>
            <div className="mt-4 space-y-2.5">
              {current ? (
                tempered
                  .slice()
                  .sort((a, b) => b[1] - a[1])
                  .map(([token, p], i) => (
                    <div key={token + i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono">{token.replace(/ /g, "·")}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {(p * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p * 100}%` }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-aurora"
                        />
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  Generation complete. Hit replay.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-medium">Greedy vs sampling</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              At temperature 0, the model always picks the top token — safe but repetitive. Higher
              temperatures flatten the distribution and invite creativity (and mistakes).
            </p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-medium">Autoregression</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Each generated token becomes part of the input for the next prediction. The model is,
              in effect, talking to itself.
            </p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-medium">Top-k & top-p</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Production samplers usually restrict choices to the top-k tokens or the smallest set
              whose probabilities sum to p. This trims the long tail of nonsense.
            </p>
          </div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}
