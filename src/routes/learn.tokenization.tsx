import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/tokenization")({
  head: () => ({
    meta: [
      { title: "Tokenization — Latent" },
      {
        name: "description",
        content:
          "Interactive tokenizer playground. See how text becomes the discrete units that LLMs read.",
      },
      { property: "og:title", content: "Tokenization — Latent" },
      {
        property: "og:description",
        content: "Interactive tokenizer playground for LLMs.",
      },
    ],
  }),
  component: Page,
});

// Lightweight BPE-style demo tokenizer (educational, not real GPT BPE)
const COMMON = [
  " the",
  " and",
  " of",
  " to",
  " a",
  " in",
  " is",
  " it",
  " you",
  " that",
  " he",
  " was",
  " for",
  " on",
  " are",
  " with",
  " as",
  " I",
  " his",
  " they",
  "the",
  "ing",
  "tion",
  "ed ",
  "er ",
  "ly ",
  "ous",
  "ate",
  "ent",
  "ion",
  " be",
  " by",
  " not",
  " or",
  " an",
  " we",
  " all",
  " can",
  " out",
  " up",
  "GPT",
  "LLM",
  "AI",
  "model",
  " token",
  " word",
  " text",
  "Hello",
  " hello",
  "world",
  "language",
  "neural",
  "network",
  "attention",
  "transformer",
];

function tokenize(input: string): string[] {
  if (!input) return [];
  const tokens: string[] = [];
  let i = 0;
  const sorted = [...COMMON].sort((a, b) => b.length - a.length);
  while (i < input.length) {
    let matched: string | null = null;
    for (const piece of sorted) {
      if (input.startsWith(piece, i)) {
        matched = piece;
        break;
      }
    }
    if (matched) {
      tokens.push(matched);
      i += matched.length;
    } else {
      // fall back: 2-3 char chunks
      const chunk = input.slice(i, Math.min(i + 3, input.length));
      // try shorter if it spans whitespace boundary mid-word
      const space = chunk.indexOf(" ");
      if (space > 0) {
        tokens.push(input.slice(i, i + space));
        i += space;
      } else {
        tokens.push(chunk);
        i += chunk.length;
      }
    }
  }
  return tokens;
}

const PALETTE = [
  "from-violet-500/80 to-fuchsia-500/80",
  "from-sky-500/80 to-indigo-500/80",
  "from-fuchsia-500/80 to-rose-500/80",
  "from-amber-400/80 to-rose-500/80",
  "from-emerald-400/80 to-sky-500/80",
];

function hashId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const EXAMPLES = [
  "Hello world, this is a language model.",
  "Attention is all you need.",
  "The transformer architecture revolutionized AI.",
];

function Page() {
  const [text, setText] = useState(EXAMPLES[0]);
  const tokens = useMemo(() => tokenize(text), [text]);
  const chars = text.length;
  const ratio = chars > 0 ? (chars / Math.max(tokens.length, 1)).toFixed(2) : "0";

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 02 · Tokenization"
        title="From text to tokens."
        description="Before a model can think about language, it has to chop it into pieces. These pieces — tokens — are the atoms of every prompt and every response."
        next={{ to: "/learn/embeddings", label: "Embeddings" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,360px]">
          <div className="glass-strong rounded-3xl p-6">
            <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Input text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="mt-2 w-full bg-transparent text-lg outline-none resize-none border-b border-white/10 focus:border-[color:var(--glow-violet)] transition-colors py-2 font-mono"
              placeholder="Type anything…"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className="text-xs px-2.5 py-1 rounded-full glass hover:bg-white/[0.07] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ex.slice(0, 28)}…
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Tokens
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tokens.map((t, i) => {
                  const color = PALETTE[hashId(t) % PALETTE.length];
                  return (
                    <motion.span
                      key={i}
                      layout
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: i * 0.012,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`inline-flex items-center rounded-lg bg-gradient-to-br ${color} px-2 py-1 font-mono text-sm text-white shadow-sm`}
                    >
                      <span className="whitespace-pre">{t.replace(/ /g, "·")}</span>
                    </motion.span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Stat label="Tokens" value={tokens.length} />
            <Stat label="Characters" value={chars} />
            <Stat label="Chars / token" value={ratio} />
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Why it matters
              </div>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                Pricing, context limits, and even latency are measured in tokens. A word like{" "}
                <span className="font-mono">"unbelievable"</span> may cost 3 tokens, while{" "}
                <span className="font-mono">"the"</span> is just 1.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Insight
            title="Subword units"
            body="Real tokenizers learn merges from data — frequent character pairs are joined into single tokens, balancing vocabulary size and coverage."
          />
          <Insight
            title="Whitespace counts"
            body="Most tokenizers attach a leading space to a word. The token for ' world' is different from 'world'."
          />
          <Insight
            title="Numbers and code"
            body="Digits, symbols, and rare words often fragment into many tokens — that's why long math gets expensive."
          />
        </div>
      </ModuleLayout>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-4xl font-semibold tracking-tight text-gradient">{value}</div>
    </div>
  );
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
