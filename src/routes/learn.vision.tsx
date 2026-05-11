import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, ImageIcon, Sparkles, Eye, Layers } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/vision")({
  head: () => ({
    meta: [
      { title: "Vision & Multimodal — Latent" },
      {
        name: "description",
        content:
          "See how a CNN turns pixels into a latent vector, and how text tokens cross-attend to image patches to form multimodal understanding.",
      },
      { property: "og:title", content: "Vision & Multimodal — Latent" },
      {
        property: "og:description",
        content:
          "Interactive CNN feature-map visualizer and live text→image cross-attention demo.",
      },
    ],
  }),
  component: Page,
});

// 3x3 convolution kernels
const KERNELS: Record<string, { name: string; k: number[][] }> = {
  edge: {
    name: "Edge detect",
    k: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
  },
  sobelX: {
    name: "Sobel · X",
    k: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
  },
  sobelY: {
    name: "Sobel · Y",
    k: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
  },
  blur: {
    name: "Gaussian blur",
    k: [
      [1 / 16, 2 / 16, 1 / 16],
      [2 / 16, 4 / 16, 2 / 16],
      [1 / 16, 2 / 16, 1 / 16],
    ],
  },
  sharpen: {
    name: "Sharpen",
    k: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
  },
  emboss: {
    name: "Emboss",
    k: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2],
    ],
  },
};

const SIZE = 96; // working grayscale size

function toGray(img: HTMLImageElement, size: number): Float32Array {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const out = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4],
      g = data[i * 4 + 1],
      b = data[i * 4 + 2];
    out[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  return out;
}

function convolve(src: Float32Array, size: number, k: number[][]): Float32Array {
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const yy = Math.min(size - 1, Math.max(0, y + ky));
          const xx = Math.min(size - 1, Math.max(0, x + kx));
          s += src[yy * size + xx] * k[ky + 1][kx + 1];
        }
      }
      out[y * size + x] = s;
    }
  }
  return out;
}

function maxPool2(src: Float32Array, size: number): { data: Float32Array; size: number } {
  const ns = Math.floor(size / 2);
  const out = new Float32Array(ns * ns);
  for (let y = 0; y < ns; y++) {
    for (let x = 0; x < ns; x++) {
      const a = src[y * 2 * size + x * 2];
      const b = src[y * 2 * size + x * 2 + 1];
      const c = src[(y * 2 + 1) * size + x * 2];
      const d = src[(y * 2 + 1) * size + x * 2 + 1];
      out[y * ns + x] = Math.max(a, b, c, d);
    }
  }
  return { data: out, size: ns };
}

function relu(src: Float32Array): Float32Array {
  const o = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) o[i] = Math.max(0, src[i]);
  return o;
}

function drawMap(
  canvas: HTMLCanvasElement,
  data: Float32Array,
  size: number,
  tint: [number, number, number] = [255, 255, 255],
) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = size;
  canvas.height = size;
  const img = ctx.createImageData(size, size);
  // normalize
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const span = max - min || 1;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - min) / span;
    img.data[i * 4] = v * tint[0];
    img.data[i * 4 + 1] = v * tint[1];
    img.data[i * 4 + 2] = v * tint[2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Default synthetic image (gradient + shapes) to show before upload
function defaultGray(size: number): Float32Array {
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const r = Math.sqrt(cx * cx + cy * cy);
      const ring = Math.exp(-((r - size * 0.28) ** 2) / (2 * 6 * 6));
      const grad = x / size;
      const bar = Math.abs(cy) < 3 ? 0.6 : 0;
      out[y * size + x] = Math.min(1, grad * 0.45 + ring + bar);
    }
  }
  return out;
}

function Page() {
  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 06 · Vision & Multimodal"
        title="When pixels and text share a latent space."
        description="Drop an image and watch a tiny convolutional network strip it into edges, textures, and finally a compact latent vector — the same vector a language model can attend to."
        prev={{ to: "/learn/neural-network", label: "Neural Networks" }}
        next={{ to: "/learn/transformer", label: "Transformer Architecture" }}
      >
        <VisionDemo />
        <CrossAttentionDemo />
      </ModuleLayout>
    </PageShell>
  );
}

function VisionDemo() {
  const [gray, setGray] = useState<Float32Array>(() => defaultGray(SIZE));
  const [filename, setFilename] = useState<string>("synthetic.png");
  const inputCanvas = useRef<HTMLCanvasElement>(null);
  const convCanvases = useRef<Record<string, HTMLCanvasElement | null>>({});
  const pooledCanvases = useRef<Record<string, HTMLCanvasElement | null>>({});
  const latentRef = useRef<HTMLCanvasElement>(null);

  const conv = useMemo(() => {
    const result: Record<string, { feat: Float32Array; pooled: Float32Array; ps: number }> = {};
    for (const key of Object.keys(KERNELS)) {
      const c = convolve(gray, SIZE, KERNELS[key].k);
      const r = relu(c);
      const p = maxPool2(r, SIZE);
      result[key] = { feat: c, pooled: p.data, ps: p.size };
    }
    return result;
  }, [gray]);

  const latent = useMemo(() => {
    // average-pool each feature map down to 4x4 then flatten
    const dims: number[] = [];
    for (const key of Object.keys(KERNELS)) {
      const { pooled, ps } = conv[key];
      const cellsPerSide = 4;
      const step = ps / cellsPerSide;
      for (let by = 0; by < cellsPerSide; by++) {
        for (let bx = 0; bx < cellsPerSide; bx++) {
          let s = 0,
            n = 0;
          const y0 = Math.floor(by * step),
            y1 = Math.floor((by + 1) * step);
          const x0 = Math.floor(bx * step),
            x1 = Math.floor((bx + 1) * step);
          for (let y = y0; y < y1; y++)
            for (let x = x0; x < x1; x++) {
              s += pooled[y * ps + x];
              n++;
            }
          dims.push(s / Math.max(1, n));
        }
      }
    }
    // normalize
    let mn = Infinity,
      mx = -Infinity;
    for (const v of dims) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const span = mx - mn || 1;
    return dims.map((v) => (v - mn) / span);
  }, [conv]);

  // Render canvases
  useEffect(() => {
    if (inputCanvas.current) drawMap(inputCanvas.current, gray, SIZE);
    for (const key of Object.keys(KERNELS)) {
      const cc = convCanvases.current[key];
      const pc = pooledCanvases.current[key];
      if (cc) drawMap(cc, conv[key].feat, SIZE, tintFor(key));
      if (pc) drawMap(pc, conv[key].pooled, conv[key].ps, tintFor(key));
    }
  }, [gray, conv]);

  useEffect(() => {
    const cv = latentRef.current;
    if (!cv) return;
    const cols = 16;
    const rows = Math.ceil(latent.length / cols);
    const cell = 18;
    cv.width = cols * cell;
    cv.height = rows * cell;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < latent.length; i++) {
      const x = (i % cols) * cell;
      const y = Math.floor(i / cols) * cell;
      const v = latent[i];
      ctx.fillStyle = `oklch(${0.3 + v * 0.55} ${0.12 + v * 0.18} ${
        260 + v * 80
      })`;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }, [latent]);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setGray(toGray(img, SIZE));
      setFilename(file.name);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="grid gap-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="glass-strong rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Pixels → Latent
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              A tiny CNN, fully in your browser
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Six learned-style filters scan your image. Each produces a feature
              map. We ReLU, max-pool, and flatten — the result is a 96-dim
              latent vector a transformer can read.
            </p>
          </div>
          <label className="group inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-aurora px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_40px_-10px_oklch(0.66_0.21_285/0.9)] hover:shadow-[0_14px_60px_-10px_oklch(0.66_0.21_285/1)] transition-all">
            <Upload className="h-4 w-4" />
            Upload image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[auto,1fr] items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl ring-1 ring-white/10 overflow-hidden bg-black/40">
              <canvas
                ref={inputCanvas}
                className="h-48 w-48 [image-rendering:pixelated]"
              />
            </div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              <span className="truncate max-w-[180px]">{filename}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {SIZE}×{SIZE} · grayscale
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(KERNELS).map(([key, k], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="rounded-2xl glass p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{k.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    conv 3×3
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg ring-1 ring-white/10 overflow-hidden bg-black/40">
                    <canvas
                      ref={(el) => (convCanvases.current[key] = el)}
                      className="h-full w-full aspect-square [image-rendering:pixelated]"
                    />
                  </div>
                  <div className="rounded-lg ring-1 ring-white/10 overflow-hidden bg-black/40">
                    <canvas
                      ref={(el) => (pooledCanvases.current[key] = el)}
                      className="h-full w-full aspect-square [image-rendering:pixelated]"
                    />
                  </div>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <span>feature map</span>
                  <span>maxpool 2×</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl glass p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Flattened latent · 96-dim
            </div>
            <div className="text-[11px] text-muted-foreground">
              this vector is what a multimodal LLM consumes
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <canvas ref={latentRef} className="rounded-lg" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function tintFor(key: string): [number, number, number] {
  switch (key) {
    case "edge":
      return [180, 220, 255];
    case "sobelX":
      return [255, 180, 230];
    case "sobelY":
      return [180, 255, 220];
    case "blur":
      return [220, 220, 255];
    case "sharpen":
      return [255, 220, 180];
    case "emboss":
      return [230, 200, 255];
    default:
      return [255, 255, 255];
  }
}

// ---------- Cross-attention demo ----------

const PATCH_GRID = 6; // 6x6 patches
const PATCH_LABELS = [
  "sky",
  "cloud",
  "horizon",
  "mountain",
  "tree",
  "leaf",
  "grass",
  "ground",
  "water",
  "rock",
  "person",
  "face",
  "hand",
  "shirt",
  "shadow",
  "light",
  "edge",
  "texture",
  "blur",
  "contrast",
  "warm",
  "cool",
  "detail",
  "void",
  "smooth",
  "rough",
  "round",
  "angular",
  "near",
  "far",
  "soft",
  "hard",
  "bright",
  "dim",
  "object",
  "background",
];

// each "concept" matches certain patch semantics (vector of patch affinities)
const CONCEPTS: Record<string, number[]> = {
  sky: [0, 1, 5, 15, 19, 21, 29, 32, 33],
  mountain: [3, 9, 13, 22, 24, 27, 28],
  tree: [4, 5, 7, 23, 25, 27, 34],
  person: [10, 11, 12, 13, 14, 16, 34],
  water: [8, 15, 18, 24, 30, 32],
  cloud: [1, 6, 18, 25, 30, 32],
  bright: [15, 20, 32, 21],
  shadow: [14, 23, 29, 33, 35],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .slice(0, 8);
}

function attentionFor(token: string): number[] {
  const base = new Array(PATCH_GRID * PATCH_GRID).fill(0);
  // seed pseudo-random per token
  let seed = 0;
  for (let i = 0; i < token.length; i++) seed = (seed * 31 + token.charCodeAt(i)) >>> 0;
  const rand = (i: number) => {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < base.length; i++) base[i] = rand(i) * 0.25;

  const concept = CONCEPTS[token];
  if (concept) {
    for (const idx of concept) base[idx % base.length] += 1.2;
  } else {
    // partial match via prefix
    for (const [k, v] of Object.entries(CONCEPTS)) {
      if (token.startsWith(k.slice(0, 3)) || k.startsWith(token.slice(0, 3))) {
        for (const idx of v) base[idx % base.length] += 0.6;
        break;
      }
    }
  }
  // softmax
  const max = Math.max(...base);
  const exps = base.map((v) => Math.exp((v - max) * 3));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function CrossAttentionDemo() {
  const [text, setText] = useState("a person standing near the mountain under a bright sky");
  const tokens = useMemo(() => tokenize(text), [text]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= tokens.length) setActive(Math.max(0, tokens.length - 1));
  }, [tokens, active]);

  const attn = useMemo(
    () => (tokens[active] ? attentionFor(tokens[active]) : new Array(PATCH_GRID * PATCH_GRID).fill(0)),
    [tokens, active],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55 }}
      className="mt-10 glass-strong rounded-3xl p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Text × Image cross-attention
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            Words look at the parts of the picture they describe
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Type a caption. Each token attends across a 6×6 grid of image
            patches. Brighter cells = higher attention weight. This is the
            mechanism behind CLIP, LLaVA, and GPT-4V.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr,auto] items-start">
        <div>
          <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Caption
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 w-full rounded-2xl glass px-4 py-3 text-sm outline-none focus:bg-white/[0.06] transition-colors"
            placeholder="describe an image…"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {tokens.map((t, i) => (
              <button
                key={`${t}-${i}`}
                onClick={() => setActive(i)}
                className={`rounded-xl px-3 py-1.5 text-sm transition-all ${
                  i === active
                    ? "bg-aurora text-white shadow-[0_8px_30px_-10px_oklch(0.66_0.21_285/0.9)]"
                    : "glass hover:bg-white/[0.06] text-foreground/80"
                }`}
              >
                {t}
              </button>
            ))}
            {tokens.length === 0 && (
              <span className="text-sm text-muted-foreground">
                type something to tokenize…
              </span>
            )}
          </div>

          <div className="mt-6 rounded-2xl glass p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Top-3 attended patches
            </div>
            <div className="mt-3 grid gap-2">
              {[...attn]
                .map((v, i) => ({ v, i }))
                .sort((a, b) => b.v - a.v)
                .slice(0, 3)
                .map(({ v, i }) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground w-14">
                      patch {String(i).padStart(2, "0")}
                    </span>
                    <span className="text-sm flex-1">
                      {PATCH_LABELS[i % PATCH_LABELS.length]}
                    </span>
                    <div className="relative h-1.5 w-32 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-aurora"
                        style={{ width: `${Math.min(100, v * 200)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground w-12 text-right">
                      {(v * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="mx-auto">
          <div
            className="grid gap-1.5 rounded-2xl bg-black/40 ring-1 ring-white/10 p-3"
            style={{ gridTemplateColumns: `repeat(${PATCH_GRID}, minmax(0,1fr))` }}
          >
            {attn.map((v, i) => (
              <motion.div
                key={i}
                animate={{
                  backgroundColor: `oklch(${0.22 + v * 0.55} ${
                    0.05 + v * 0.22
                  } ${280 + v * 60} / 1)`,
                  scale: 1 + v * 0.05,
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg ring-1 ring-white/10 relative overflow-hidden"
                title={`${PATCH_LABELS[i % PATCH_LABELS.length]} · ${(v * 100).toFixed(1)}%`}
              >
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: `radial-gradient(circle at center, oklch(0.9 0.2 ${
                      280 + v * 60
                    } / ${v}) 0%, transparent 70%)`,
                  }}
                />
                <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/60">
                  {(v * 100).toFixed(0)}
                </span>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            6 × 6 image patches
          </div>
        </div>
      </div>
    </motion.div>
  );
}
