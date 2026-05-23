import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Brain, MessageSquare, Sparkles, Zap, Bot, BookOpen } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/introduction")({
  head: () => ({
    meta: [
      { title: "Introduction to LLMs — Latent" },
      {
        name: "description",
        content:
          "What large language models are, what they are not, and the intuition that ties everything together.",
      },
      { property: "og:title", content: "Introduction to LLMs" },
      {
        property: "og:description",
        content: "Start here. Build a clean mental model of how LLMs really work.",
      },
    ],
  }),
  component: Page,
});

const MISCONCEPTIONS = [
  {
    myth: "LLMs understand language like humans do",
    truth:
      "They model statistical patterns over tokens. The 'understanding' is geometry in a high-dimensional space, not lived experience.",
  },
  {
    myth: "They look things up in a database",
    truth:
      "There is no database at inference. Knowledge is compressed into the weights — a lossy, generalizing memory.",
  },
  {
    myth: "They reason step by step internally",
    truth:
      "They predict one token at a time. Reasoning emerges only when the chain of thought is written into the context.",
  },
  {
    myth: "Bigger is always better",
    truth:
      "Scale helps, but data quality, alignment and architecture often matter more than raw parameter count.",
  },
];

const TIMELINE = [
  {
    year: "2017",
    title: "Attention Is All You Need",
    body: "The Transformer paper replaces recurrence with self-attention.",
  },
  {
    year: "2018",
    title: "BERT & GPT-1",
    body: "Pre-training on raw text becomes the dominant paradigm.",
  },
  {
    year: "2020",
    title: "GPT-3",
    body: "175B parameters. Few-shot prompting demonstrates emergent abilities.",
  },
  {
    year: "2022",
    title: "ChatGPT",
    body: "RLHF turns a base model into a chat assistant the world can use.",
  },
  {
    year: "2023+",
    title: "Multimodal & Agents",
    body: "Vision, audio, tool use, and long context become standard.",
  },
];

function Page() {
  const [tokens] = useState("the cat sat on the".split(" "));
  const [picked, setPicked] = useState(0);
  const choices = useMemo(
    () => [
      { word: "mat", p: 0.62 },
      { word: "rug", p: 0.18 },
      { word: "floor", p: 0.09 },
      { word: "couch", p: 0.06 },
      { word: "moon", p: 0.005 },
    ],
    [],
  );

  return (
    <ModuleLayout
      eyebrow="Module 01"
      title="A language model, demystified"
      description="An LLM is a function: text in, a probability distribution over the next token out. Everything else — chat, reasoning, code — is built on that one idea."
      next={{ to: "/learn/tokenization", label: "Tokenization" }}
    >
      {/* What is an LLM */}
      <div className="grid gap-6 lg:grid-cols-3">
        {[
          {
            icon: Brain,
            title: "A compressed view of language",
            body: "Trained on trillions of tokens, the model learns the shape of how humans write.",
          },
          {
            icon: Zap,
            title: "Predicts one token at a time",
            body: "It outputs a probability for every token in its vocabulary, then samples.",
          },
          {
            icon: Bot,
            title: "Behavior comes from data",
            body: "Helpfulness, tone and refusals are not magic — they are taught with examples.",
          },
        ].map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="glass rounded-2xl p-6"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
              <c.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
          </motion.div>
        ))}
      </div>

      {/* Interactive next-token */}
      <div className="mt-12 glass rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-aurora" /> Live demo · pick the next token
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          Every reply is a chain of these tiny choices.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Below is the model's predicted distribution after the prompt. Click any candidate to
          commit it — that's literally how text generation works under the hood.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-sm">
          {tokens.map((t) => (
            <span key={t} className="rounded-md bg-white/[0.06] px-2 py-1">
              {t}
            </span>
          ))}
          <span className="rounded-md bg-aurora/30 px-2 py-1 ring-1 ring-white/20">
            {choices[picked].word}
          </span>
          <span className="text-muted-foreground">…</span>
        </div>

        <div className="mt-6 grid gap-2">
          {choices.map((c, i) => (
            <button
              key={c.word}
              onClick={() => setPicked(i)}
              className={`group relative flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                picked === i
                  ? "border-white/20 bg-white/[0.06]"
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              <span className="font-mono">{c.word}</span>
              <div className="flex items-center gap-3 w-2/3">
                <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.p * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-aurora"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                  {(c.p * 100).toFixed(1)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Myths vs reality */}
      <div className="mt-16">
        <h3 className="text-2xl font-semibold tracking-tight">Myths vs. reality</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {MISCONCEPTIONS.map((m, i) => (
            <motion.div
              key={m.myth}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-rose-300/80">Myth</div>
              <p className="mt-1 font-medium">{m.myth}</p>
              <div className="mt-4 text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                Reality
              </div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{m.truth}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-16">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> A six-year arc
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          From a single paper to a global platform.
        </h3>
        <div className="mt-8 relative pl-6">
          <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-aurora/60 via-white/10 to-transparent" />
          {TIMELINE.map((t, i) => (
            <motion.div
              key={t.year}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative mb-6"
            >
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-aurora ring-4 ring-background" />
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {t.year}
              </div>
              <div className="mt-1 font-medium">{t.title}</div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-xl">
                {t.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-12 glass-strong rounded-3xl p-8 flex items-start gap-4">
        <MessageSquare className="h-5 w-5 text-aurora mt-1" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          The rest of the curriculum unpacks each layer of this idea — how text becomes numbers, how
          numbers become meaning, and how meaning becomes the answer you read.
        </p>
      </div>
    </ModuleLayout>
  );
}
