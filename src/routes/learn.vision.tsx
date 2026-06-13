import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, Component, ErrorInfo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import {
  Upload,
  ImageIcon,
  Sparkles as SparklesIcon,
  Eye,
  Layers,
  Sliders,
  Play,
  Pause,
  RotateCw,
  Target,
  LineChart,
  X,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { useVisionStore } from "@/lib/visionStore";

export const Route = createFileRoute("/learn/vision")({
  head: () => ({
    meta: [
      { title: "Vision & Multimodal — Latent" },
      {
        name: "description",
        content:
          "Explore convolutional networks, feature extraction, spatial image segmentation, and text-image cross-attention in our computer vision laboratory.",
      },
      { property: "og:title", content: "Vision & Multimodal — Latent" },
      {
        property: "og:description",
        content:
          "Interactive CNN feature-map visualizer, live K-Means segmentation, and text-to-image attention.",
      },
    ],
  }),
  component: Page,
});

const SIZE = 96;
const CLASSES = ["Landscape", "Portrait", "Object", "Text/Document", "Pattern/Texture"];

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

// Gabor filters presets
const KERNELS: Record<string, { name: string; k: number[][]; desc: string }> = {
  edge: {
    name: "Edge Detect (Laplacian)",
    k: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
    desc: "Highlights regions of rapid intensity change. Standard feature detection filter.",
  },
  sobelX: {
    name: "Sobel Horizontal",
    k: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    desc: "Detects vertical edges. Computes horizontal gradient magnitudes.",
  },
  sobelY: {
    name: "Sobel Vertical",
    k: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
    desc: "Detects horizontal edges. Computes vertical gradient magnitudes.",
  },
  blur: {
    name: "Gaussian Blur",
    k: [
      [1 / 16, 2 / 16, 1 / 16],
      [2 / 16, 4 / 16, 2 / 16],
      [1 / 16, 2 / 16, 1 / 16],
    ],
    desc: "Smooths high-frequency noise. Functions as a low-pass filter.",
  },
  sharpen: {
    name: "Sharpen",
    k: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    desc: "Exaggerates boundaries by accentuating differences with neighbors.",
  },
  emboss: {
    name: "Emboss",
    k: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2],
    ],
    desc: "Gives a 3D shadow depth effect by computing directional offsets.",
  },
};

// Conversions
function toGray(img: HTMLImageElement, size: number): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const out = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    out[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  return out;
}

function convolveAdvanced(
  src: Float32Array,
  size: number,
  k: number[][],
  stride: number,
  padding: number,
): { data: Float32Array; outSize: number } {
  const kSize = k ? k.length : 3;
  const outSize = Math.max(1, Math.floor((size - kSize + 2 * padding) / stride) + 1);
  const out = new Float32Array(outSize * outSize);

  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      const srcY = y * stride - padding;
      const srcX = x * stride - padding;

      let sum = 0;
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const yy = srcY + ky;
          const xx = srcX + kx;

          if (yy >= 0 && yy < size && xx >= 0 && xx < size) {
            const val = k && k[ky] ? k[ky][kx] : 0;
            sum += src[yy * size + xx] * val;
          }
        }
      }
      out[y * outSize + x] = sum;
    }
  }

  return { data: out, outSize };
}

function poolAdvanced(
  src: Float32Array,
  size: number,
  poolType: "max" | "avg",
  poolSize: number,
  stride: number,
): { data: Float32Array; outSize: number } {
  const outSize = Math.max(1, Math.floor((size - poolSize) / stride) + 1);
  const out = new Float32Array(outSize * outSize);

  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      let val = poolType === "max" ? -Infinity : 0;
      let count = 0;

      for (let py = 0; py < poolSize; py++) {
        for (let px = 0; px < poolSize; px++) {
          const yy = y * stride + py;
          const xx = x * stride + px;
          if (yy < size && xx < size) {
            const v = src[yy * size + xx];
            if (poolType === "max") {
              if (v > val) val = v;
            } else {
              val += v;
              count++;
            }
          }
        }
      }
      if (poolType === "max") {
        out[y * outSize + x] = val === -Infinity ? 0 : val;
      } else {
        out[y * outSize + x] = count > 0 ? val / count : 0;
      }
    }
  }

  return { data: out, outSize };
}

function activate(
  src: Float32Array,
  type: "relu" | "leaky" | "gelu",
  threshold = 0,
): Float32Array {
  const o = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (type === "relu") {
      o[i] = v > threshold ? v : 0;
    } else if (type === "leaky") {
      o[i] = v > threshold ? v : v * 0.1;
    } else if (type === "gelu") {
      o[i] = 0.5 * v * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (v + 0.044715 * Math.pow(v, 3))));
    }
  }
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

  let min = Infinity;
  let max = -Infinity;
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

function segmentImage(
  src: Float32Array,
  size: number,
  k: number,
  spatialWeight: number,
): Int32Array {
  const dataLen = src.length;
  const labels = new Int32Array(dataLen);

  const centroids: { x: number; y: number; val: number }[] = [];
  for (let c = 0; c < k; c++) {
    const angle = (c / k) * Math.PI * 2;
    const rx = 0.5 + Math.cos(angle) * 0.25;
    const ry = 0.5 + Math.sin(angle) * 0.25;
    centroids.push({
      x: Math.floor(rx * size),
      y: Math.floor(ry * size),
      val: Math.random(),
    });
  }

  const maxIter = 10;
  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < dataLen; i++) {
      const px = i % size;
      const py = Math.floor(i / size);
      const val = src[i];

      let minDist = Infinity;
      let bestCluster = 0;

      for (let c = 0; c < k; c++) {
        const dx = (px - centroids[c].x) / size;
        const dy = (py - centroids[c].y) / size;
        const dv = val - centroids[c].val;

        const dist = dx * dx * spatialWeight + dy * dy * spatialWeight + dv * dv;
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      labels[i] = bestCluster;
    }

    const sumsX = new Float32Array(k);
    const sumsY = new Float32Array(k);
    const sumsV = new Float32Array(k);
    const counts = new Int32Array(k);

    for (let i = 0; i < dataLen; i++) {
      const label = labels[i];
      const px = i % size;
      const py = Math.floor(i / size);
      const val = src[i];

      sumsX[label] += px;
      sumsY[label] += py;
      sumsV[label] += val;
      counts[label]++;
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c].x = sumsX[c] / counts[c];
        centroids[c].y = sumsY[c] / counts[c];
        centroids[c].val = sumsV[c] / counts[c];
      } else {
        const randIdx = Math.floor(Math.random() * dataLen);
        centroids[c].x = randIdx % size;
        centroids[c].y = Math.floor(randIdx / size);
        centroids[c].val = src[randIdx];
      }
    }
  }

  return labels;
}

function drawSegmentationWithHover(
  canvas: HTMLCanvasElement,
  srcGray: Float32Array,
  labels: Int32Array,
  size: number,
  opacity: number,
  showEdges: boolean,
  hoveredLabel?: number | null,
) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = size;
  canvas.height = size;
  const img = ctx.createImageData(size, size);

  const colors = [
    [6, 182, 212],   // Cyan
    [167, 139, 250], // Violet
    [16, 185, 129],  // Emerald Green
    [245, 158, 11],  // Amber Warning
    [103, 232, 249], // Light Cyan
    [196, 181, 253], // Light Violet
  ];

  for (let i = 0; i < srcGray.length; i++) {
    const label = labels[i];
    const grayVal = srcGray[i] * 255;
    const color = colors[label % colors.length];

    const px = i % size;
    const py = Math.floor(i / size);

    let isEdge = false;
    if (showEdges) {
      if (px > 0 && labels[i - 1] !== label) isEdge = true;
      if (px < size - 1 && labels[i + 1] !== label) isEdge = true;
      if (py > 0 && labels[i - size] !== label) isEdge = true;
      if (py < size - 1 && labels[i + size] !== label) isEdge = true;
    }

    if (isEdge) {
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 255;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = 255;
    } else {
      let r = grayVal * (1 - opacity) + color[0] * opacity;
      let g = grayVal * (1 - opacity) + color[1] * opacity;
      let b = grayVal * (1 - opacity) + color[2] * opacity;

      // Restrained isolation highlighting
      if (hoveredLabel !== undefined && hoveredLabel !== null && label !== hoveredLabel) {
        r = r * 0.25;
        g = g * 0.25;
        b = b * 0.25;
      }

      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function defaultGray(size: number): Float32Array {
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const r = Math.sqrt(cx * cx + cy * cy);
      const ring = Math.exp(-((r - size * 0.28) ** 2) / (2 * 6 * 6));
      const grad = x / size;
      const bar = Math.abs(cy) < 4 ? 0.6 : 0;
      out[y * size + x] = Math.min(1, grad * 0.4 + ring + bar);
    }
  }
  return out;
}

function generatePresetImage(
  type: "synthetic" | "stripes" | "checkers" | "text" | "circles",
  size: number,
): Float32Array {
  const out = new Float32Array(size * size);
  if (type === "synthetic") {
    return defaultGray(size);
  }
  if (type === "stripes") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        out[y * size + x] = Math.floor(x / 8) % 2 === 0 ? 0.85 : 0.15;
      }
    }
    return out;
  }
  if (type === "checkers") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const bx = Math.floor(x / 12);
        const by = Math.floor(y / 12);
        out[y * size + x] = (bx + by) % 2 === 0 ? 0.85 : 0.15;
      }
    }
    return out;
  }
  if (type === "circles") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = x - size / 2;
        const cy = y - size / 2;
        const dist = Math.sqrt(cx * cx + cy * cy);
        out[y * size + x] = Math.sin(dist / 4.5) > 0 ? 0.9 : 0.1;
      }
    }
    return out;
  }
  if (type === "text") {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#eeeeee";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CNN", size / 2, size / 2);
    const imgData = ctx.getImageData(0, 0, size, size).data;
    for (let i = 0; i < size * size; i++) {
      out[i] = imgData[i * 4] / 255;
    }
    return out;
  }
  return out;
}

function generateGaborKernel(size: number, angle: number): number[][] {
  const kernel: number[][] = [];
  const half = Math.floor(size / 2);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const sigma = Math.max(0.5, size / 3);
  const lambda = Math.max(1.0, size / 1.5);
  const psi = 0;
  const gamma = 0.5;

  for (let y = -half; y <= half; y++) {
    const row: number[] = [];
    for (let x = -half; x <= half; x++) {
      const xt = x * cos + y * sin;
      const yt = -x * sin + y * cos;
      const val =
        Math.exp(-(xt * xt + gamma * gamma * yt * yt) / (2 * sigma * sigma)) *
        Math.cos((2 * Math.PI * xt) / lambda + psi);
      row.push(val);
    }
    kernel.push(row);
  }

  const absSum =
    kernel.reduce(
      (s, r) => s + r.reduce((sr, v) => sr + Math.abs(v), 0),
      0,
    ) || 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= absSum;
    }
  }
  return kernel;
}

function getDefaultKernel(size: number, preset: string): number[][] {
  if (size === 1) return [[1]];
  if (size === 3) {
    if (preset === "edge")
      return [
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1],
      ];
    if (preset === "blur")
      return [
        [1 / 16, 2 / 16, 1 / 16],
        [2 / 16, 4 / 16, 2 / 16],
        [1 / 16, 2 / 16, 1 / 16],
      ];
    if (preset === "sharpen")
      return [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0],
      ];
    if (preset === "emboss")
      return [
        [-2, -1, 0],
        [-1, 1, 1],
        [0, 1, 2],
      ];
    if (preset === "sobelX")
      return [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
      ];
    if (preset === "sobelY")
      return [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1],
      ];
    return [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ];
  }
  return generateGaborKernel(size, 0);
}

function MapCanvas({
  data,
  size,
  tint,
  className,
  onMouseMove,
  onMouseLeave,
}: {
  data: Float32Array;
  size: number;
  tint?: [number, number, number];
  className: string;
  onMouseMove?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tintR = tint?.[0];
  const tintG = tint?.[1];
  const tintB = tint?.[2];

  useEffect(() => {
    if (ref.current) drawMap(ref.current, data, size, tint);
  }, [data, size, tintR, tintG, tintB]);

  return (
    <canvas
      ref={ref}
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    />
  );
}

function PreviewCanvas({
  data,
  size,
  className,
  onMouseMove,
  onMouseLeave,
}: {
  data: Float32Array;
  size: number;
  className: string;
  onMouseMove?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) drawMap(ref.current, data, size, [255, 255, 255]);
  }, [data, size]);

  return (
    <canvas
      ref={ref}
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    />
  );
}

function SegmentationCanvas({
  gray,
  labels,
  opacity,
  showEdges,
  hoveredLabel,
  className,
  onMouseMove,
  onMouseLeave,
}: {
  gray: Float32Array;
  labels: Int32Array;
  opacity: number;
  showEdges: boolean;
  hoveredLabel?: number | null;
  className: string;
  onMouseMove?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current)
      drawSegmentationWithHover(ref.current, gray, labels, SIZE, opacity, showEdges, hoveredLabel);
  }, [gray, labels, opacity, showEdges, hoveredLabel]);

  return (
    <canvas
      ref={ref}
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    />
  );
}

function TrainingWeightsCanvas({
  weights,
  className,
}: {
  weights: number[][];
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 150;
    canvas.height = 150;
    ctx.clearRect(0, 0, 150, 150);

    let minW = Infinity;
    let maxW = -Infinity;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const w = weights[r]?.[c] ?? 0;
        if (w < minW) minW = w;
        if (w > maxW) maxW = w;
      }
    }
    const wSpan = maxW - minW || 1;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const w = weights[r]?.[c] ?? 0;
        const normW = (w - minW) / wSpan;
        const red = Math.floor(normW * 167 + (1 - normW) * 39);
        const green = Math.floor(normW * 139 + (1 - normW) * 39);
        const blue = Math.floor(normW * 250 + (1 - normW) * 42);

        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(c * 50, r * 50, 50, 50);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(c * 50, r * 50, 50, 50);

        ctx.fillStyle = normW > 0.55 ? "#ffffff" : "#d1d5db";
        ctx.font = "bold 9.5px monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(w.toFixed(2), c * 50 + 25, r * 50 + 25);
      }
    }
  }, [weights]);

  return <canvas ref={ref} className={className} />;
}

function LatentCanvas({
  latent,
  className,
}: {
  latent: Float32Array | number[];
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.clientWidth || 384);
    const height = (canvas.height = canvas.clientHeight || 36);
    ctx.clearRect(0, 0, width, height);

    const numDims = latent?.length || 0;
    if (numDims === 0) return;
    const blockWidth = width / numDims;

    for (let i = 0; i < numDims; i++) {
      const val = latent?.[i] ?? 0;
      const alpha = 0.15 + val * 0.85;
      ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
      ctx.fillRect(i * blockWidth, 0, blockWidth - 0.5, height);
    }
  }, [latent]);

  return <canvas ref={ref} className={className} />;
}

interface LocalErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface LocalErrorBoundaryState {
  hasError: boolean;
}

class LocalErrorBoundary extends Component<LocalErrorBoundaryProps, LocalErrorBoundaryState> {
  public override state: LocalErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): LocalErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in ${this.props.name || "Component"}:`, error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-rose-950/20 p-6 rounded-2xl border border-rose-500/20 text-center my-4 select-none">
            <h4 className="text-sm font-semibold text-rose-400 font-bold uppercase tracking-wider mb-2">
              {this.props.name || "Module"} Render Failed
            </h4>
            <p className="text-xs text-zinc-400 font-mono">
              Something went wrong while rendering this interactive widget.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

function Page() {
  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 06 · Vision & Multimodal"
        title="Visual Intelligence Sandbox"
        description="Explore how CNNs process pixels, extract edge and texture maps, perform semantic image segmentation, and project visual features into a shared latent space."
        prev={{ to: "/learn/neural-network", label: "Neural Networks" }}
        next={{ to: "/learn/transformer", label: "Transformer Architecture" }}
      >
        <LocalErrorBoundary name="VisionLab">
          <VisionLab />
        </LocalErrorBoundary>
        <LocalErrorBoundary name="CrossAttentionDemo">
          <CrossAttentionDemo />
        </LocalErrorBoundary>
      </ModuleLayout>
    </PageShell>
  );
}

// 3D Tilt Card wrapper
function TiltCard({
  children,
  className,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * 12, y: x * 12 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      aria-expanded={onClick ? true : false}
      onKeyDown={handleKeyDown}
      style={{
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`${className} focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none`}
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}

// 3D Latent Embedding Canvas Components
function EmbeddingSpace3D({ targetClass }: { targetClass: number }) {
  const hasWebGL = useMemo(() => isWebGLAvailable(), []);

  const clustersData = useMemo(() => {
    const points: { pos: [number, number, number]; color: string; id: number }[] = [];
    const colors = [
      "#06b6d4", // Cyan - Landscape
      "#a78bfa", // Violet - Portrait
      "#10b981", // Emerald Green - Object
      "#a78bfa", // Violet - Text
      "#06b6d4", // Cyan - Texture
    ];
    const centers: [number, number, number][] = [
      [1.1, 0.7, -0.4],
      [-1.2, 0.5, 0.7],
      [0.2, -1.0, -0.5],
      [1.0, -0.7, 0.9],
      [-0.7, -0.8, -1.0],
    ];

    for (let c = 0; c < 5; c++) {
      const center = centers[c];
      for (let p = 0; p < 12; p++) {
        const spread = 0.4;
        points.push({
          pos: [
            center[0] + Math.sin(p * 5.3 + c) * spread,
            center[1] + Math.cos(p * 3.7 + c) * spread,
            center[2] + Math.sin(p * 2.1 + c) * spread,
          ],
          color: colors[c],
          id: c * 20 + p,
        });
      }
    }
    return { points, centers };
  }, []);

  const centers2D = [
    { x: 50, y: 50 },
    { x: 190, y: 60 },
    { x: 110, y: 150 },
    { x: 210, y: 130 },
    { x: 50, y: 140 },
  ];

  const colors = [
    "#06b6d4", // Cyan - Landscape
    "#a78bfa", // Violet - Portrait
    "#10b981", // Emerald Green - Object
    "#a78bfa", // Violet - Text
    "#06b6d4", // Cyan - Texture
  ];

  if (!hasWebGL) {
    return (
      <div className="h-[280px] w-full bg-zinc-950/60 rounded-2xl border border-white/5 overflow-hidden relative p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between select-none">
          <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            2D Projection Fallback (WebGL Disabled)
          </span>
        </div>
        
        <div className="relative flex-1 flex items-center justify-center">
          <svg className="w-full h-full max-h-[180px] overflow-visible">
            {/* Draw 2D cluster points */}
            {centers2D.map((center, cIdx) => (
              <g key={cIdx}>
                {Array.from({ length: 8 }).map((_, pIdx) => {
                  const angle = (pIdx / 8) * Math.PI * 2;
                  const dist = 10 + (pIdx % 3) * 4;
                  const px = center.x + Math.cos(angle) * dist;
                  const py = center.y + Math.sin(angle) * dist;
                  return (
                    <circle
                      key={pIdx}
                      cx={px}
                      cy={py}
                      r="3"
                      fill={colors[cIdx]}
                      opacity="0.55"
                    />
                  );
                })}
              </g>
            ))}

            {/* Glowing target node */}
            <motion.g
              animate={{
                x: centers2D[targetClass]?.x ?? 120,
                y: centers2D[targetClass]?.y ?? 90,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
            >
              <circle r="10" fill="#06b6d4" opacity="0.3" className="animate-pulse" />
              <circle r="5.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
            </motion.g>
          </svg>
        </div>

        <div className="flex flex-wrap gap-2 pointer-events-none select-none">
          {[
            { name: "Landscape", color: "bg-cyan-400" },
            { name: "Portrait", color: "bg-violet-400" },
            { name: "Object", color: "bg-emerald-400" },
            { name: "Text", color: "bg-violet-400" },
            { name: "Texture", color: "bg-cyan-400" },
          ].map((cls, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-black/60 backdrop-blur border border-white/5 px-2 py-0.5 rounded-full text-[8px] font-mono text-zinc-300">
              <span className={`h-1.5 w-1.5 rounded-full ${cls.color}`} />
              {cls.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full bg-zinc-950/60 rounded-2xl border border-white/5 overflow-hidden relative">
      <LocalErrorBoundary name="3D Embedding Canvas fallback" fallback={
        <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 bg-zinc-950/30">
          <Database className="h-6 w-6 text-zinc-500 mb-2" />
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">WebGL Context Error</div>
          <p className="text-[9px] text-zinc-500 font-mono mt-1 max-w-[180px]">Your browser or hardware might have WebGL disabled.</p>
        </div>
      }>
        <Canvas camera={{ position: [0, 0, 4.2], fov: 50 }}>
          <ambientLight intensity={0.65} />
          <pointLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-5, -5, -5]} intensity={0.8} color="#a78bfa" />

          {clustersData.points.map((pt) => (
            <mesh key={pt.id} position={pt.pos}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshStandardMaterial color={pt.color} roughness={0.3} metalness={0.1} />
            </mesh>
          ))}

          <mesh position={[0, 0, 0]} raycast={() => null}>
            <sphereGeometry args={[2.0, 16, 16]} />
            <meshBasicMaterial color="rgba(255, 255, 255, 0.03)" wireframe transparent opacity={0.06} />
          </mesh>

          <ActiveImageNode centers={clustersData.centers} targetClass={targetClass} />

          <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={0.35} />
          <Sparkles count={40} scale={[4, 4, 4]} size={1.2} speed={0.1} color="#ffffff" opacity={0.2} />
        </Canvas>
      </LocalErrorBoundary>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none select-none">
        {[
          { name: "Landscape", color: "bg-cyan-400" },
          { name: "Portrait", color: "bg-violet-400" },
          { name: "Object", color: "bg-emerald-400" },
          { name: "Text", color: "bg-violet-400" },
          { name: "Texture", color: "bg-cyan-400" },
        ].map((cls, idx) => (
          <div key={idx} className="flex items-center gap-1.5 bg-black/60 backdrop-blur border border-white/5 px-2 py-0.5 rounded-full text-[8px] font-mono text-zinc-300">
            <span className={`h-1.5 w-1.5 rounded-full ${cls.color}`} />
            {cls.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveImageNode({ centers, targetClass }: { centers: [number, number, number][]; targetClass: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const targetPos = useMemo(() => {
    const idx = Math.max(0, Math.min(4, targetClass));
    return new THREE.Vector3(...centers[idx]);
  }, [targetClass, centers]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos, Math.min(delta * 5, 1));
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.06;
      meshRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.11, 16, 16]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#06b6d4"
        emissiveIntensity={2.5}
        roughness={0.15}
        metalness={0.85}
        toneMapped={false}
      />
      <mesh scale={1.8}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </mesh>
  );
}

function VisionLab() {
  const store = useVisionStore();
  const {
    uploadedImageSrc,
    gray,
    filename,
    uploadError,
    selectedPreset,
    customKernel,
    stride,
    padding,
    kernelSize,
    filtersCount,
    activation,
    poolType,
    poolSize,
    poolStride,
    kClusters,
    spatialWeight,
    overlayOpacity,
    showEdges,
    isTraining,
    epoch,
    lossHistory,
    selectedTargetClass,
    learningRate,
    classConfidence,
    setUploadedImageSrc,
    setGray,
    setFilename,
    setUploadError,
    setSelectedPreset,
    setCustomKernel,
    setStride,
    setPadding,
    setKernelSize,
    setFiltersCount,
    setActivation,
    setPoolType,
    setPoolSize,
    setPoolStride,
    setKClusters,
    setSpatialWeight,
    setOverlayOpacity,
    setShowEdges,
    setIsTraining,
    setEpoch,
    setLossHistory,
    setSelectedTargetClass,
    setLearningRate,
    setClassConfidence,
  } = store;

  const [expandedCNNCard, setExpandedCNNCard] = useState<string | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number>(0);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [isMetricsCollapsed, setIsMetricsCollapsed] = useState(false);

  const [localKernel, setLocalKernel] = useState<string[][]>(() =>
    customKernel.map((row) => row.map((v) => v.toString()))
  );

  useEffect(() => {
    setLocalKernel(customKernel.map((row) => row.map((v) => v.toString())));
  }, [customKernel]);

  const segmentData = useMemo(() => {
    return [
      { id: 0, name: "Sky/Background Space", desc: "Flat intensity clusters and lower visual focus.", conf: "94.2%" },
      { id: 1, name: "Secondary Object Contour", desc: "Supporting structural details and textures.", conf: "89.5%" },
      { id: 2, name: "Main Focal Subject", desc: "Central high-contrast spatial components.", conf: "91.8%" },
      { id: 3, name: "Deep Shadow Bounds", desc: "Low-intensity gradients and edge intersections.", conf: "87.4%" },
      { id: 4, name: "Midtone Transitions", desc: "Average luminance and diffuse boundaries.", conf: "90.1%" },
      { id: 5, name: "Highlights/Peak Reflections", desc: "Maximum brightness centers and specularity.", conf: "95.3%" },
    ];
  }, []);

  const CNN_CARDS = [
    { id: "input", name: "1. Input Tensor", desc: "Normalized pixels matrix projection.", shape: "96×96×1", tint: [6, 182, 212], color: "from-cyan-500/5 to-cyan-500/10 border-cyan-500/10" },
    { id: "edge", name: "2. Edge Detection", desc: "High-frequency Laplacian spatial gradients.", shape: `${SIZE - 2}×${SIZE - 2}×1`, tint: [167, 139, 250], color: "from-violet-500/5 to-violet-500/10 border-violet-500/10" },
    { id: "texture", name: "3. Texture Extraction", desc: "Gabor directional multi-angle maps.", shape: `${SIZE - 2}×${SIZE - 2}×${filtersCount}`, tint: [6, 182, 212], color: "from-cyan-500/5 to-cyan-500/10 border-cyan-500/10" },
    { id: "shape", name: "4. Shape Pooling", desc: "Max downsampled boundary summaries.", shape: "47×47×8", tint: [167, 139, 250], color: "from-violet-500/5 to-violet-500/10 border-violet-500/10" },
    { id: "object", name: "5. Object Composition", desc: "Deep composition feature descriptors.", shape: "23×23×8", tint: [16, 185, 129], color: "from-emerald-500/5 to-emerald-500/10 border-emerald-500/10" },
    { id: "embedding", name: "6. Dense Embedding", desc: "1D flattened abstract code array.", shape: "1×96", tint: [167, 139, 250], color: "from-violet-500/5 to-violet-500/10 border-violet-500/10" },
  ];

  const kernelsList = useMemo(() => {
    const list: number[][][] = [];
    for (let i = 0; i < filtersCount; i++) {
      if (i === 0) {
        if (customKernel.length === kernelSize) {
          list.push(customKernel);
        } else {
          list.push(getDefaultKernel(kernelSize, selectedPreset));
        }
      } else {
        const angle = (i * Math.PI) / Math.max(1, filtersCount - 1);
        list.push(generateGaborKernel(kernelSize, angle));
      }
    }
    return list;
  }, [filtersCount, kernelSize, customKernel, selectedPreset]);

  useEffect(() => {
    setCustomKernel(getDefaultKernel(kernelSize, selectedPreset));
  }, [selectedPreset, kernelSize]);

  const cnnForward = useMemo(() => {
    const inputMap = gray;
    const grayscaleMap = gray;

    const convOutputs: Float32Array[] = [];
    let convSize = 96;
    for (let f = 0; f < filtersCount; f++) {
      const { data: convData, outSize } = convolveAdvanced(
        grayscaleMap,
        SIZE,
        kernelsList[f],
        stride,
        padding,
      );
      convOutputs.push(convData);
      convSize = outSize;
    }

    const reluOutputs: Float32Array[] = [];
    for (let f = 0; f < filtersCount; f++) {
      reluOutputs.push(activate(convOutputs[f], activation));
    }

    const poolOutputs: Float32Array[] = [];
    let poolSizeOut = 1;
    for (let f = 0; f < filtersCount; f++) {
      const { data: poolData, outSize } = poolAdvanced(
        reluOutputs[f],
        convSize,
        poolType,
        poolSize,
        poolStride,
      );
      poolOutputs.push(poolData);
      poolSizeOut = outSize;
    }

    const deepOutputs: Float32Array[] = [];
    const deepSize = Math.max(1, Math.floor(poolSizeOut / 2));
    for (let f = 0; f < filtersCount; f++) {
      const pMap = poolOutputs[f];
      const deepMap = new Float32Array(deepSize * deepSize);
      for (let y = 0; y < deepSize; y++) {
        for (let x = 0; x < deepSize; x++) {
          const py = Math.min(poolSizeOut - 1, Math.floor(y * (poolSizeOut / deepSize)));
          const px = Math.min(poolSizeOut - 1, Math.floor(x * (poolSizeOut / deepSize)));
          deepMap[y * deepSize + x] = pMap[py * poolSizeOut + px] * 1.35;
        }
      }
      deepOutputs.push(deepMap);
    }

    const flattenDim = deepSize * deepSize * filtersCount;

    return {
      inputMap,
      grayscaleMap,
      convOutputs,
      convSize,
      reluOutputs,
      poolOutputs,
      poolSizeOut,
      deepOutputs,
      deepSize,
      flattenDim,
    };
  }, [gray, kernelsList, stride, padding, activation, poolType, poolSize, poolStride, filtersCount]);

  const metrics = useMemo(() => {
    const paramsPerFilter = kernelSize * kernelSize;
    const totalConvParams = paramsPerFilter * filtersCount;
    const classifierParams = cnnForward.flattenDim * 5;
    const totalParams = totalConvParams + classifierParams;

    const convOps =
      cnnForward.convSize *
      cnnForward.convSize *
      filtersCount *
      (kernelSize * kernelSize);
    const denseOps = cnnForward.flattenDim * 5;
    const totalOps = convOps + denseOps;

    const inputMem = SIZE * SIZE * 4;
    const convMem = cnnForward.convSize * cnnForward.convSize * filtersCount * 4;
    const poolMem = cnnForward.poolSizeOut * cnnForward.poolSizeOut * filtersCount * 4;
    const totalMemBytes = inputMem + convMem + poolMem;
    const totalMemKB = (totalMemBytes / 1024).toFixed(1);

    return {
      totalParams,
      totalOps,
      totalMemKB,
    };
  }, [cnnForward, filtersCount, kernelSize]);

  const segmentLabels = useMemo(() => {
    return segmentImage(gray, SIZE, kClusters, spatialWeight);
  }, [gray, kClusters, spatialWeight]);

  const latent = useMemo(() => {
    const dims: number[] = [];
    const poolOutputs = cnnForward?.poolOutputs || [];
    const targetTotalDims = 96;

    if (poolOutputs.length === 0) {
      return new Float32Array(targetTotalDims);
    }

    for (let f = 0; f < poolOutputs.length; f++) {
      const pooled = poolOutputs[f];
      if (!pooled) continue;
      const startDim = Math.floor((f * targetTotalDims) / poolOutputs.length);
      const endDim = Math.floor(((f + 1) * targetTotalDims) / poolOutputs.length);
      const numDimsForFilter = endDim - startDim;

      const segmentSize = pooled.length / numDimsForFilter;
      for (let d = 0; d < numDimsForFilter; d++) {
        const idxStart = Math.floor(d * segmentSize);
        const idxEnd = Math.min(pooled.length, Math.floor((d + 1) * segmentSize));
        let sum = 0;
        let count = 0;
        for (let i = idxStart; i < idxEnd; i++) {
          sum += pooled[i];
          count++;
        }
        dims.push(sum / Math.max(1, count));
      }
    }

    if (dims.length === 0) {
      return new Float32Array(targetTotalDims);
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const v of dims) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const span = maxVal - minVal || 1;
    return dims.map((v) => (v - minVal) / span);
  }, [cnnForward]);

  const noiseFilterBase = useMemo(
    () => [
      [Math.sin(1) * 0.45, Math.cos(2) * 0.45, Math.sin(3) * 0.45],
      [Math.cos(4) * 0.45, Math.sin(5) * 0.45, Math.cos(6) * 0.45],
      [Math.sin(7) * 0.45, Math.cos(8) * 0.45, Math.sin(9) * 0.45],
    ],
    [],
  );

  const trainingWeights = useMemo(() => {
    const t = epoch / 100;
    const target = customKernel;
    return [
      [
        noiseFilterBase[0][0] * (1 - t) + target[0][0] * t,
        noiseFilterBase[0][1] * (1 - t) + target[0][1] * t,
        noiseFilterBase[0][2] * (1 - t) + target[0][2] * t,
      ],
      [
        noiseFilterBase[1][0] * (1 - t) + target[1][0] * t,
        noiseFilterBase[1][1] * (1 - t) + target[1][1] * t,
        noiseFilterBase[1][2] * (1 - t) + target[1][2] * t,
      ],
      [
        noiseFilterBase[2][0] * (1 - t) + target[2][0] * t,
        noiseFilterBase[2][1] * (1 - t) + target[2][1] * t,
        noiseFilterBase[2][2] * (1 - t) + target[2][2] * t,
      ],
    ];
  }, [epoch, customKernel, noiseFilterBase]);

  const trainOutput = useMemo(() => {
    const { data } = convolveAdvanced(gray, SIZE, trainingWeights, 1, 1);
    return data;
  }, [gray, trainingWeights]);

  useEffect(() => {
    let animFrame: number;
    let frameCount = 0;
    if (isTraining) {
      const step = () => {
        frameCount++;
        if (frameCount % 4 === 0) {
          setEpoch((prev) => {
            if (prev >= 100) {
              setIsTraining(false);
              return 100;
            }
            const next = prev + 1;
            const baseLoss = 1.6 * Math.exp(-next / 30);
            const noise = Math.sin(next * 0.7) * 0.03 + Math.random() * 0.02;
            const currentLoss = Math.max(0.04, baseLoss + 0.05 + noise);
            setLossHistory((history) => [...history, currentLoss]);

            const t = next / 100;
            const targetProb = 0.2 + t * 0.75 + Math.sin(next * 0.5) * 0.01;
            const updatedConfidences = [0.2, 0.2, 0.2, 0.2, 0.2];
            updatedConfidences[selectedTargetClass] = targetProb;

            const remainder = 1 - targetProb;
            for (let c = 0; c < 5; c++) {
              if (c !== selectedTargetClass) {
                const fraction = 0.25 * remainder;
                updatedConfidences[c] = Math.max(0.01, fraction);
              }
            }
            setClassConfidence(updatedConfidences);

            return next;
          });
        }
        animFrame = requestAnimationFrame(step);
      };
      animFrame = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isTraining, selectedTargetClass]);

  function handleFile(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose a valid image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setUploadError("Image must be smaller than 12 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setUploadError("Failed to read image.");
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          setGray(toGray(img, SIZE));
          setUploadedImageSrc(dataUrl);
          setFilename(file.name);
        } catch (err) {
          setUploadError("Processing failed.");
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  const handleWeightChange = (row: number, col: number, val: number) => {
    setCustomKernel((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = isNaN(val) ? 0 : val;
      return next;
    });
  };

  const handleSegmentationMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
    
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
      const idx = y * SIZE + x;
      const label = segmentLabels[idx];
      if (label >= 0 && label < 6) {
        setHoveredSegment(label);
      }
    }
  };

  const handleSegmentationMouseLeave = () => {
    setHoveredSegment(null);
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 space-y-16"
      >
        <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground select-none font-bold">
              <Eye className="h-3.5 w-3.5 text-cyan-400 animate-pulse" /> VISION LAB
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white select-none">
              Interactive Vision & Feature Extraction Showcase
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl select-none">
              Inspect how convolutions process pixels, cluster spatial segments, and morph weights in real-time.
            </p>
          </div>
        </div>

        {/* 1. Source Input & Presets Controls Panel (Solid Card) */}
        <div className="bg-zinc-950/40 rounded-2xl p-6 border border-white/5 shadow-md space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <ImageIcon className="h-4.5 w-4.5 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider select-none font-bold text-white">
              Source Input & Presets Config
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-[auto,1fr] items-start">
            {/* Image Preview Container */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative flex justify-center items-center bg-black/35 rounded-xl p-3 border border-white/5 group overflow-hidden w-36 h-36">
                {uploadedImageSrc ? (
                  <img
                    src={uploadedImageSrc}
                    alt="Uploaded input"
                    className="h-full w-full object-contain rounded-lg ring-1 ring-white/10"
                  />
                ) : (
                  <PreviewCanvas
                    data={gray}
                    size={SIZE}
                    className="h-full w-full rounded-lg ring-1 ring-white/10 [image-rendering:pixelated]"
                  />
                )}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-2 pointer-events-none z-10">
                  <span className="text-[10px] font-mono text-white font-semibold">Normalized Tensor</span>
                  <span className="text-[9px] font-mono text-zinc-400 mt-1">{SIZE} × {SIZE} Matrix</span>
                </div>
              </div>
            </div>

            {/* Pattern Presets list and upload button */}
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                  Pattern Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "synthetic", label: "Ring Pattern" },
                    { id: "stripes", label: "Vertical Lines" },
                    { id: "checkers", label: "Checker Grid" },
                    { id: "circles", label: "Concentric" },
                    { id: "text", label: "OCR Word" },
                  ].map((preset) => {
                    const isActive = filename === `${preset.id}.png`;
                    return (
                      <button
                        key={preset.id}
                        aria-label={`Select ${preset.label} image preset`}
                        onClick={() => {
                          setGray(generatePresetImage(preset.id as any, SIZE));
                          setUploadedImageSrc(null);
                          setFilename(`${preset.id}.png`);
                          setUploadError(null);
                        }}
                        className={`py-1.5 px-3 rounded-xl text-[10px] font-semibold border text-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                          isActive
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 font-bold"
                            : "bg-zinc-900/40 hover:bg-zinc-800/40 text-zinc-400 border-white/5"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-aurora px-4 py-2.5 text-xs font-semibold text-white border border-white/5 hover:border-white/20 shadow-md shadow-black/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold focus-within:ring-2 focus-within:ring-cyan-400 focus-within:outline-none">
                  <Upload className="h-3.5 w-3.5 text-cyan-400" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload custom image file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleFile(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                <div
                  className={`font-mono text-[9.5px] truncate max-w-full ${
                    uploadError ? "text-rose-400 font-bold" : "text-zinc-400"
                  }`}
                  title={uploadError ?? filename}
                >
                  {uploadError ?? `ACTIVE · ${filename}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CNN Diagnostics HUD (Collapsible) */}
        <div
          className={`bg-zinc-950/40 rounded-2xl border transition-all duration-500 select-none shadow-md cursor-pointer p-5 ${
            isMetricsCollapsed
              ? "border-white/5 hover:bg-white/5"
              : "border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]"
          }`}
          onClick={() => {
            if (isMetricsCollapsed) setIsMetricsCollapsed(false);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                CNN DIAGNOSTICS
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMetricsCollapsed(!isMetricsCollapsed);
              }}
              className="rounded p-1 text-zinc-500 transition-all hover:bg-white/10 hover:text-zinc-300 cursor-pointer animate-none focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none"
              aria-label={isMetricsCollapsed ? "Expand CNN Diagnostics" : "Collapse CNN Diagnostics"}
            >
              {isMetricsCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {!isMetricsCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 font-mono text-[9.5px] mt-4 pt-3 border-t border-white/5">
                  <div className="flex justify-between border-b border-white/5 sm:border-none pb-1 sm:pb-0">
                    <span className="text-zinc-400">INPUT SHAPE:</span>
                    <span className="text-white font-bold">96×96×1</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 sm:border-none pb-1 sm:pb-0">
                    <span className="text-zinc-400">CONV KERNELS:</span>
                    <span className="text-white font-bold">{kernelSize}×{kernelSize}×{filtersCount}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 sm:border-none pb-1 sm:pb-0">
                    <span className="text-zinc-400">CONV SHAPE:</span>
                    <span className="text-white font-bold">{cnnForward.convSize}×{cnnForward.convSize}×{filtersCount}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 sm:border-none pb-1 sm:pb-0">
                    <span className="text-zinc-400">POOL SHAPE:</span>
                    <span className="text-white font-bold">{cnnForward.poolSizeOut}×{cnnForward.poolSizeOut}×{filtersCount}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 sm:border-none pb-1 sm:pb-0">
                    <span className="text-zinc-400">FLATTEN SIZE:</span>
                    <span className="text-white font-bold">{cnnForward.flattenDim}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 sm:border-none pb-1 sm:pb-0">
                    <span className="text-zinc-400">TOTAL PARAMS:</span>
                    <span className="text-cyan-400 font-bold">{metrics.totalParams}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 sm:border-none pb-1 sm:pb-0">
                    <span className="text-zinc-400">EST. FLOPS:</span>
                    <span className="text-violet-400 font-bold">~{(metrics.totalOps / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">MEMORY COST:</span>
                    <span className="text-emerald-400 font-bold">{metrics.totalMemKB} KB</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>

        {/* 3. Main CNN Visualizer & Stages (Evolution Timeline) (Section 1) */}
        <section className="space-y-8 pt-8 border-t border-white/5">
          <div className="flex flex-col gap-1 select-none">
            <h3 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-cyan-400" />
              1. Convolution Explorer & Feature Evolution
            </h3>
            <p className="text-xs text-zinc-400">Scrub the timeline to see features extract layer-by-layer, or click any card below to tune hyperparameters.</p>
          </div>

          {/* Feature Evolution Scrub Timeline */}
          <div className="bg-zinc-950/40 rounded-2xl p-6 border border-white/5 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 select-none">
              <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">Evolution Progress</span>
              <div className="font-mono text-[9px] text-zinc-400">
                Stage: <span className="text-white font-bold">{CNN_CARDS[scrubIndex]?.name}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Opacity Cross-fader Viewer */}
              <div className="relative w-36 h-36 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0 select-none bg-black/20">
                <MapCanvas data={gray} size={SIZE} tint={[240, 240, 240]} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scrubIndex === 0 ? "opacity-100" : "opacity-0"}`} />
                {cnnForward.convOutputs[0] && <MapCanvas data={cnnForward.convOutputs[0]} size={cnnForward.convSize} tint={[167, 139, 250]} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scrubIndex === 1 ? "opacity-100" : "opacity-0"}`} />}
                {cnnForward.convOutputs[1] && <MapCanvas data={cnnForward.convOutputs[1]} size={cnnForward.convSize} tint={[6, 182, 212]} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scrubIndex === 2 ? "opacity-100" : "opacity-0"}`} />}
                {cnnForward.poolOutputs[0] && <MapCanvas data={cnnForward.poolOutputs[0]} size={cnnForward.poolSizeOut} tint={[167, 139, 250]} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scrubIndex === 3 ? "opacity-100" : "opacity-0"}`} />}
                {cnnForward.deepOutputs[0] && <MapCanvas data={cnnForward.deepOutputs[0]} size={cnnForward.deepSize} tint={[16, 185, 129]} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scrubIndex === 4 ? "opacity-100" : "opacity-0"}`} />}
                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${scrubIndex === 5 ? "opacity-100" : "opacity-0"} z-10`}>
                  <LatentCanvas latent={latent} className="w-28 h-6 rounded" />
                </div>
              </div>

              <div className="flex-1 space-y-4 select-none">
                <p className="text-[11.5px] text-zinc-300 leading-relaxed max-w-lg">
                  {CNN_CARDS[scrubIndex]?.desc}
                </p>
                <div className="flex items-center gap-2">
                  {CNN_CARDS.map((card, idx) => (
                    <button
                      key={card.id}
                      onClick={() => setScrubIndex(idx)}
                      aria-label={`Show ${card.name} evolution stage`}
                      className={`h-2.5 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                        idx === scrubIndex ? "w-8 bg-cyan-400" : "w-2.5 bg-white/10 hover:bg-white/20"
                      }`}
                      title={card.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CNN Layer Cards Grid */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {CNN_CARDS.map((card, idx) => {
              const isExpanded = expandedCNNCard === card.id;
              return (
                <div key={card.id} className="relative">
                  <TiltCard
                    onClick={() => setExpandedCNNCard(isExpanded ? null : card.id)}
                    ariaLabel={`View details for ${card.name}`}
                    className={`bg-zinc-950/40 rounded-2xl border p-5 cursor-pointer bg-gradient-to-br ${card.color} h-44 flex flex-col justify-between transition-all select-none hover:shadow-[0_0_25px_rgba(255,255,255,0.03)]`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-zinc-400 bg-zinc-900/60 border border-white/5 px-1.5 py-0.5 rounded">
                          {card.shape}
                        </span>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `rgb(${card.tint.join(",")})` }} />
                      </div>
                      <h4 className="mt-4 text-sm font-semibold tracking-tight text-white">{card.name}</h4>
                      <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2 mt-1">{card.desc}</p>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-zinc-400 font-mono">
                      <span>STAGE 0{idx + 1}</span>
                      <span className="text-cyan-400 font-medium hover:underline">Expand Detail →</span>
                    </div>
                  </TiltCard>
                </div>
              );
            })}
          </div>

          {/* Expanded Card Detail Drawer */}
          <AnimatePresence>
            {expandedCNNCard && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                 className="overflow-hidden bg-zinc-950/60 rounded-3xl border border-white/10 mt-6 shadow-lg"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {CNN_CARDS.find(c => c.id === expandedCNNCard)?.name} Layer Details
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {CNN_CARDS.find(c => c.id === expandedCNNCard)?.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedCNNCard(null)}
                      aria-label="Close details"
                      className="p-1.5 rounded-xl bg-zinc-900/50 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {expandedCNNCard === "input" && (
                    <div className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl border border-white/5 select-none">
                      <span className="text-[10px] font-mono text-zinc-400 mb-3 uppercase font-bold tracking-wider">Normalized Input Grid</span>
                      <PreviewCanvas data={gray} size={SIZE} className="h-48 w-48 rounded-xl ring-1 ring-white/10 [image-rendering:pixelated]" />
                    </div>
                  )}

                  {expandedCNNCard === "edge" && (
                    <div className="grid gap-6 md:grid-cols-2 bg-black/45 p-5 rounded-2xl border border-white/5">
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">Convolution Parameters</span>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-mono">Filters Count:</span>
                          <div className="flex items-center gap-3">
                            <input
                              type="range" min="1" max="16" value={filtersCount}
                              aria-label="Filters count"
                              onChange={(e) => setFiltersCount(parseInt(e.target.value))}
                              className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                            <span className="font-mono text-white font-bold w-4 text-right">{filtersCount}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-mono">Kernel Size:</span>
                          <div className="flex gap-1 bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
                            {[1, 3, 5].map((k) => (
                              <button
                                key={k} onClick={() => setKernelSize(k)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none ${kernelSize === k ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500"}`}
                              >
                                {k}x{k}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-mono">Stride:</span>
                          <div className="flex gap-1 bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
                            {[1, 2, 3].map((s) => (
                              <button
                                key={s} onClick={() => setStride(s)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none ${stride === s ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500"}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase">Kernel presets</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: "edge", label: "Edge Detect" },
                              { id: "blur", label: "Gaussian Blur" },
                              { id: "sharpen", label: "Sharpen" },
                              { id: "emboss", label: "Emboss Map" },
                              { id: "sobelX", label: "Sobel Horiz" },
                              { id: "sobelY", label: "Sobel Vert" },
                            ].map((preset) => (
                              <button
                                key={preset.id} onClick={() => setSelectedPreset(preset.id)}
                                className={`py-1 px-1.5 rounded-lg text-[9px] font-bold border text-center transition-all cursor-pointer truncate focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none ${selectedPreset === preset.id ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500"}`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center border-l border-white/5 pl-6">
                        <span className="text-[10px] font-mono text-zinc-400 mb-3 uppercase tracking-wider text-center font-bold">Interactive Kernel Weights</span>
                        <div className="flex flex-col items-center">
                          <div
                            className="grid gap-1.5 bg-zinc-950/40 p-2.5 rounded-xl border border-white/5"
                            style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                          >
                            {kernelsList[0]?.map((row, rIdx) =>
                              row.map((val, cIdx) => {
                                const valStr = localKernel[rIdx]?.[cIdx] ?? val.toString();
                                return (
                                  <input
                                    key={`${rIdx}-${cIdx}`}
                                    type="text"
                                    value={valStr}
                                    aria-label={`Kernel weight row ${rIdx} column ${cIdx}`}
                                    onChange={(e) => {
                                      const valInput = e.target.value;
                                      if (/^-?\d*\.?\d*$/.test(valInput) || valInput === "") {
                                        setLocalKernel((prev) => {
                                          const next = prev.map((r) => [...r]);
                                          if (!next[rIdx]) next[rIdx] = [];
                                          next[rIdx][cIdx] = valInput;
                                          return next;
                                        });
                                        const parsed = parseFloat(valInput);
                                        if (!isNaN(parsed)) {
                                          handleWeightChange(rIdx, cIdx, parsed);
                                        } else if (valInput === "" || valInput === "-") {
                                          handleWeightChange(rIdx, cIdx, 0);
                                        }
                                      }
                                    }}
                                    onBlur={() => {
                                      const currentVal = localKernel[rIdx]?.[cIdx] ?? "";
                                      const parsed = parseFloat(currentVal);
                                      const cleanVal = isNaN(parsed) ? 0 : parsed;
                                      handleWeightChange(rIdx, cIdx, cleanVal);
                                      setLocalKernel((prev) => {
                                        const next = prev.map((r) => [...r]);
                                        if (!next[rIdx]) next[rIdx] = [];
                                        next[rIdx][cIdx] = cleanVal.toString();
                                        return next;
                                      });
                                    }}
                                    className="w-10 h-8 bg-zinc-900 border border-white/10 rounded-lg text-center font-mono text-xs text-white outline-none focus:border-cyan-400/50 [appearance:textfield] font-bold focus:ring-1 focus:ring-cyan-400"
                                  />
                                );
                              })
                            )}
                          </div>
                          <button
                            onClick={() => setCustomKernel(getDefaultKernel(kernelSize, selectedPreset))}
                            className="mt-2.5 text-[8.5px] font-mono text-zinc-500 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer select-none font-bold focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none"
                          >
                            <RotateCw className="h-2.5 w-2.5" /> Reset weights
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedCNNCard === "texture" && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">Texture Filter Outputs (Gabor Kernels)</span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-black/45 p-3 rounded-2xl border border-white/5">
                        {cnnForward.convOutputs.map((out, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/5 bg-zinc-900/30">
                            <span className="text-[8px] font-mono font-bold text-zinc-500">Filter {idx}</span>
                            <MapCanvas data={out} size={cnnForward.convSize} tint={[6, 182, 212]} className="h-10 w-10 rounded-md [image-rendering:pixelated]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedCNNCard === "shape" && (
                    <div className="grid gap-6 md:grid-cols-2 bg-black/40 p-5 rounded-2xl border border-white/5">
                      <div className="space-y-4 select-none">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold border-b border-white/5 pb-2">Pooling parameters</span>
                        <div className="flex gap-2">
                          {["max", "avg"].map((type) => (
                            <button
                              key={type} onClick={() => setPoolType(type as any)}
                              className={`flex-1 py-1.5 px-3 rounded-xl border text-[10px] font-bold text-center cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none ${poolType === type ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500"}`}
                            >
                              {type === "max" ? "Max Pool" : "Average Pool"}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400 font-mono">Pool size:</span>
                          <div className="flex gap-1 bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
                            {[2, 3].map((size) => (
                              <button
                                key={size} onClick={() => setPoolSize(size)}
                                className={`px-3 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-cyan-400 ${poolSize === size ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500"}`}
                              >
                                {size}x{size}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center border-l border-white/5 pl-6">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold mb-2">Max Pool Output</span>
                        {cnnForward.poolOutputs[0] && (
                          <MapCanvas data={cnnForward.poolOutputs[0]} size={cnnForward.poolSizeOut} tint={[6, 182, 212]} className="h-20 w-20 rounded-lg ring-1 ring-white/10 [image-rendering:pixelated]" />
                        )}
                      </div>
                    </div>
                  )}

                  {expandedCNNCard === "object" && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">Composite Feature Activations</span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-black/45 p-3 rounded-2xl border border-white/5">
                        {cnnForward.deepOutputs.map((out, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/5 bg-zinc-900/30">
                            <span className="text-[8px] font-mono font-bold text-zinc-500">Map {idx}</span>
                            <MapCanvas data={out} size={cnnForward.deepSize} tint={[16, 185, 129]} className="h-10 w-10 rounded-md [image-rendering:pixelated]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedCNNCard === "embedding" && (
                    <div className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-mono text-zinc-400 mb-3 uppercase font-bold tracking-wider">Dense Embedded Vector (96-Dim)</span>
                      <LatentCanvas latent={latent} className="rounded-lg h-9 w-full max-w-full" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 4. Semantic Image Segmentation (Section 2) */}
        <section className="space-y-8 pt-8 border-t border-white/5">
          <div className="flex flex-col gap-1 select-none">
            <h3 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <Eye className="h-4.5 w-4.5 text-emerald-400" />
              2. Semantic Image Segmentation
            </h3>
            <p className="text-xs text-zinc-400">Hover regions on the mask or the list items to isolate spatial color-texture clusters.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-[1fr,260px] bg-black/40 p-5 rounded-3xl border border-white/5">
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/20 border border-white/5 rounded-2xl min-h-[280px]">
              <span className="text-[10px] font-mono text-zinc-400 mb-3 uppercase tracking-wider font-bold">Interactive Segment Mask</span>
              <div className="relative select-none group">
                <SegmentationCanvas
                  gray={gray}
                  labels={segmentLabels}
                  opacity={overlayOpacity}
                  showEdges={showEdges}
                  hoveredLabel={hoveredSegment}
                  onMouseMove={handleSegmentationMouseMove}
                  onMouseLeave={handleSegmentationMouseLeave}
                  className="h-64 w-64 rounded-2xl ring-1 ring-white/10 [image-rendering:pixelated] cursor-crosshair transition-all duration-300 bg-black/20"
                />
                {hoveredSegment !== null && (
                  <div className="absolute top-3 right-3 bg-black/85 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-[9px] text-zinc-300 space-y-0.5 select-none pointer-events-none animate-fade-in shadow-xl z-30">
                    <div className="font-bold text-emerald-400 uppercase">{segmentData[hoveredSegment]?.name}</div>
                    <div>Conf: <span className="text-white font-bold">{segmentData[hoveredSegment]?.conf}</span></div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold border-b border-white/5 pb-2">Segment Diagnostics</span>
              <p className="text-[10.5px] text-zinc-400 leading-normal font-mono select-none">
                This spatial-color clustering (K-Means) balances pixel coordinate locations (X, Y) and color intensities to isolate cohesive features.
              </p>
              
              <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin pr-1 select-none">
                {segmentData.map((seg) => {
                  const isHovered = hoveredSegment === seg.id;
                  return (
                    <div
                      key={seg.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Highlight segment ${seg.name}`}
                      onMouseEnter={() => setHoveredSegment(seg.id)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onFocus={() => setHoveredSegment(seg.id)}
                      onBlur={() => setHoveredSegment(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setHoveredSegment(hoveredSegment === seg.id ? null : seg.id);
                        }
                      }}
                      className={`p-2 rounded-xl border transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                        isHovered
                          ? "bg-emerald-500/10 border-emerald-500/30 shadow-md shadow-emerald-500/5"
                          : "bg-zinc-900/30 border-transparent hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                        <span className={isHovered ? "text-emerald-400" : "text-zinc-300"}>
                          {seg.name}
                        </span>
                        <span className="text-zinc-400">{seg.conf}</span>
                      </div>
                      <p className="text-[8.5px] text-zinc-400 mt-0.5 truncate">{seg.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Model Learning & Backpropagation (Section 3) */}
        <section className="space-y-8 pt-8 border-t border-white/5">
          <div className="flex flex-col gap-1 select-none">
            <h3 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <LineChart className="h-4.5 w-4.5 text-violet-400" />
              3. Model Learning & Backpropagation pipeline
            </h3>
            <p className="text-xs text-zinc-400">Choose a target category and execute backprop updates to watch weights morph and predictions sharpen.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr,250px] bg-black/40 p-5 rounded-3xl border border-white/5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-center justify-center p-4 border border-white/5 rounded-2xl bg-zinc-950/20">
                <span className="text-[9px] font-mono text-zinc-400 mb-3 uppercase tracking-wider font-bold">Updating Filter Weights</span>
                <TrainingWeightsCanvas weights={trainingWeights} className="h-32 w-32 rounded-xl ring-1 ring-white/10 [image-rendering:pixelated]" />
                <span className="text-[8.5px] text-zinc-400 font-mono mt-3 text-center leading-normal">
                  Weights morph from initial random noise values into edge-focused custom kernels.
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-4 border border-white/5 rounded-2xl bg-zinc-950/20">
                <span className="text-[9px] font-mono text-zinc-400 mb-3 uppercase tracking-wider font-bold">Convolved Output Map</span>
                <MapCanvas data={trainOutput} size={SIZE} tint={[167, 139, 250]} className="h-32 w-32 rounded-xl ring-1 ring-white/10 [image-rendering:pixelated]" />
                <span className="text-[8.5px] text-zinc-400 font-mono mt-3 text-center leading-normal">
                  Observe feature filters adjust to capture high-frequency patterns.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold border-b border-white/5 pb-2 select-none">Hyperparameter Tuning</span>
              
              <div className="flex flex-col gap-1 select-none">
                <span className="text-[9px] font-mono text-zinc-400 uppercase">Target Image Class</span>
                <select
                  value={selectedTargetClass}
                  aria-label="Select target image class"
                  onChange={(e) => setSelectedTargetClass(parseInt(e.target.value))}
                  disabled={isTraining}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs outline-none text-zinc-300 cursor-pointer disabled:opacity-50 font-bold focus-visible:ring-1 focus-visible:ring-cyan-400"
                >
                  {CLASSES.map((c, idx) => (
                    <option key={idx} value={idx}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 select-none">
                <span className="text-[9px] font-mono text-zinc-400 uppercase">Learning Rate</span>
                <select
                  value={learningRate}
                  aria-label="Select learning rate"
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  disabled={isTraining}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs outline-none text-zinc-300 cursor-pointer disabled:opacity-50 font-bold focus-visible:ring-1 focus-visible:ring-cyan-400"
                >
                  <option value="0.01">0.01 (Slow)</option>
                  <option value="0.05">0.05 (Medium)</option>
                  <option value="0.1">0.10 (Aggressive)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5 select-none font-bold">
                <button
                  onClick={() => {
                    if (epoch >= 100) {
                      setEpoch(0);
                      setLossHistory([]);
                    }
                    setIsTraining(!isTraining);
                  }}
                  aria-label={isTraining ? "Pause training simulation" : "Start training simulation"}
                  className={`flex-grow flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                    isTraining
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-aurora text-white border-white/5 hover:border-white/20"
                  }`}
                >
                  {isTraining ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isTraining ? "Pause" : epoch >= 100 ? "Restart" : "Train"}
                </button>
                <button
                  onClick={() => {
                    setIsTraining(false);
                    setEpoch(0);
                    setLossHistory([]);
                    setClassConfidence([0.2, 0.2, 0.2, 0.2, 0.2]);
                  }}
                  aria-label="Reset training simulation"
                  className="p-2 rounded-xl bg-zinc-900/40 hover:bg-white/10 text-zinc-400 border border-white/5 hover:text-white transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-none"
                  title="Reset simulator"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex justify-between font-mono text-[9px] text-zinc-400 pt-1 select-none">
                <span>EPOCH: {epoch} / 100</span>
                {lossHistory.length > 0 && (
                  <span>LOSS: {lossHistory[lossHistory.length - 1].toFixed(4)}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 6. 3D Latent Embedding Space (Section 4) */}
        <section className="space-y-8 pt-8 border-t border-white/5">
          <div className="flex flex-col gap-1 select-none">
            <h3 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-cyan-400" />
              4. 3D Latent Embedding Space
            </h3>
            <p className="text-xs text-zinc-400">Interact with the 3D embedding sphere to observe similarity groupings and locate your source image coordinate.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr,250px] bg-black/40 p-5 rounded-3xl border border-white/5">
            <EmbeddingSpace3D targetClass={selectedTargetClass} />
            
            <div className="space-y-4 flex flex-col justify-center select-none">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold border-b border-white/5 pb-2">Clustering Narrative</span>
              <p className="text-[10.5px] text-zinc-400 leading-relaxed font-mono">
                High-dimensional features are compressed into a 96-dimensional array, then projected onto a 3D sphere.
              </p>
              <p className="text-[10px] text-zinc-400 leading-normal font-mono">
                Similar image types reside in nearby clusters. Changing presets or the target class moves the glowing white target coordinate.
              </p>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}

// ---------- Cross-attention demo ----------

const LANDSCAPE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0e7490"/>
      <stop offset="100%" stop-color="#155e75"/>
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="#0b0f19"/>
  <rect width="300" height="150" fill="url(#skyGrad)"/>
  
  <circle cx="80" cy="80" r="15" fill="#38bdf8" opacity="0.15"/>
  <circle cx="210" cy="70" r="25" fill="#38bdf8" opacity="0.1"/>

  <polygon points="-20,160 60,90 140,160" fill="#1e1b4b"/>
  <polygon points="120,160 210,80 300,160" fill="#111827"/>
  <polygon points="50,160 130,105 220,160" fill="#2e1065"/>

  <rect y="160" width="300" height="140" fill="url(#waterGrad)"/>
  
  <circle cx="90" cy="210" r="5" fill="#f43f5e"/>
  <line x1="90" y1="215" x2="90" y2="235" stroke="#f43f5e" stroke-width="2"/>
  <line x1="90" y1="220" x2="80" y2="228" stroke="#f43f5e" stroke-width="1.5"/>
  <line x1="90" y1="220" x2="100" y2="228" stroke="#f43f5e" stroke-width="1.5"/>
  <line x1="90" y1="235" x2="82" y2="250" stroke="#f43f5e" stroke-width="1.5"/>
  <line x1="90" y1="235" x2="98" y2="250" stroke="#f43f5e" stroke-width="1.5"/>

  <polygon points="230,220 210,265 250,265" fill="#059669"/>
  <polygon points="230,200 215,240 245,240" fill="#10b981"/>
  <rect x="227" y="265" width="6" height="15" fill="#78350f"/>
</svg>
`)}`;

const PATCH_GRID = 6;
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

const CONCEPTS: Record<string, number[]> = {
  sky: [0, 1, 2, 3, 8, 9],
  cloud: [4, 5, 6, 7],
  mountain: [12, 13, 14, 15, 18, 19],
  person: [20, 26, 27],
  tree: [22, 23, 28, 29],
  water: [24, 25, 30, 31, 32, 33],
  bright: [0, 1, 4, 5, 6],
  shadow: [13, 14, 19, 34, 35],
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
    for (const [k, v] of Object.entries(CONCEPTS)) {
      if (token.startsWith(k.slice(0, 3)) || k.startsWith(token.slice(0, 3))) {
        for (const idx of v) base[idx % base.length] += 0.6;
        break;
      }
    }
  }

  const max = Math.max(...base);
  const exps = base.map((v) => Math.exp((v - max) * 3));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function CrossAttentionDemo() {
  const [text, setText] = useState("a person standing near the mountain under a bright sky");
  const tokens = useMemo(() => tokenize(text), [text]);
  const [activeTokenIdx, setActiveTokenIdx] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [paths, setPaths] = useState<{ d: string; opacity: number; label: string }[]>([]);

  useEffect(() => {
    if (activeTokenIdx >= tokens.length) {
      setActiveTokenIdx(Math.max(0, tokens.length - 1));
    }
  }, [tokens, activeTokenIdx]);

  const activeTokenAttn = useMemo(
    () =>
      tokens[activeTokenIdx] ? attentionFor(tokens[activeTokenIdx]) : new Array(PATCH_GRID * PATCH_GRID).fill(0),
    [tokens, activeTokenIdx],
  );

  // Generate Bezier curves paths on the fly when mouse hovers a patch
  useEffect(() => {
    if (hoveredCell === null) {
      setPaths([]);
      return;
    }

    const updatePaths = () => {
      const parentElement = document.getElementById("vit-attention-container");
      const cellElement = document.getElementById(`vit-patch-${hoveredCell}`);
      if (!parentElement || !cellElement) return;

      const parentRect = parentElement.getBoundingClientRect();
      const cellRect = cellElement.getBoundingClientRect();

      const cellX = (cellRect.left + cellRect.width / 2) - parentRect.left;
      const cellY = (cellRect.top + cellRect.height / 2) - parentRect.top;

      const newPaths = tokens.map((token, tokenIdx) => {
        const tokenElement = document.getElementById(`vit-token-${tokenIdx}`);
        if (!tokenElement) return null;
        const tokenRect = tokenElement.getBoundingClientRect();

        const tokenX = (tokenRect.left + tokenRect.width / 2) - parentRect.left;
        const tokenY = (tokenRect.top + tokenRect.height / 2) - parentRect.top;

        const dx = Math.abs(tokenX - cellX);
        const cp1x = cellX + dx * 0.45;
        const cp2x = tokenX - dx * 0.45;

        const pathD = `M ${cellX} ${cellY} C ${cp1x} ${cellY}, ${cp2x} ${tokenY}, ${tokenX} ${tokenY}`;

        const tokenAttn = attentionFor(token);
        const weight = tokenAttn[hoveredCell] || 0.02;

        return {
          d: pathD,
          opacity: Math.min(1, Math.max(0.04, weight * 7.5)),
          label: token,
        };
      }).filter(Boolean) as { d: string; opacity: number; label: string }[];

      setPaths(newPaths);
    };

    updatePaths();
    window.addEventListener("resize", updatePaths);
    return () => {
      window.removeEventListener("resize", updatePaths);
    };
  }, [hoveredCell, tokens]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55 }}
      className="mt-16 glass-strong rounded-3xl p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 select-none">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground select-none font-bold">
            <SparklesIcon className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
            5. Vision Transformer Patch Attention
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight leading-tight text-white">
            Bi-directional Cross-Attention Mapping
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Type a caption. Hover over visual patches to see active bezier connections mapping pixel coordinates directly to corresponding text embeddings.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono select-none font-bold">
          Input text prompt / Caption description
        </label>
        <input
          value={text}
          aria-label="Input text prompt description"
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full rounded-2xl bg-zinc-950/50 px-4 py-3 text-sm outline-none focus:bg-zinc-900/50 border border-white/5 focus:border-white/10 transition-all pointer-events-auto text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          placeholder="describe an image…"
        />
      </div>

      <div
        id="vit-attention-container"
        className="relative mt-8 flex flex-col md:flex-row gap-12 items-center justify-between p-4 sm:p-6 bg-black/40 border border-white/5 rounded-3xl overflow-visible"
      >
        {/* Transparent SVG connection layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {paths.map((p, idx) => (
            <motion.path
              key={idx}
              d={p.d}
              fill="none"
              stroke="url(#glowGrad)"
              strokeWidth={p.opacity * 2.5 + 0.5}
              opacity={p.opacity}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </svg>

        <div className="mx-auto select-none shrink-0 z-20">
          <div
            id="vit-attention-grid"
            className="grid gap-1.5 rounded-2xl bg-black/40 ring-1 ring-white/10 p-3"
            style={{ gridTemplateColumns: `repeat(${PATCH_GRID}, minmax(0,1fr))` }}
          >
            {activeTokenAttn.map((v, i) => {
              const isHovered = hoveredCell === i;
              return (
                <motion.div
                  key={i}
                  id={`vit-patch-${i}`}
                  onMouseEnter={() => setHoveredCell(i)}
                  onMouseLeave={() => setHoveredCell(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Visual patch ${i} attends ${v.toFixed(3)}`}
                  onFocus={() => setHoveredCell(i)}
                  onBlur={() => setHoveredCell(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setHoveredCell(hoveredCell === i ? null : i);
                    }
                  }}
                  animate={{
                    scale: isHovered ? 1.06 : 1 + v * 0.04,
                  }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-[34px] w-[34px] min-[375px]:h-10 min-[375px]:w-10 sm:h-12 sm:w-12 rounded-lg ring-1 ring-white/10 relative overflow-hidden bg-cover bg-no-repeat cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                  style={{
                    backgroundImage: `url("${LANDSCAPE_SVG}")`,
                    backgroundSize: "600% 600%",
                    backgroundPosition: `${(i % 6) * 20}% ${Math.floor(i / 6) * 20}%`,
                  }}
                  title={`${PATCH_LABELS[i % PATCH_LABELS.length]} · ${(v * 100).toFixed(1)}%`}
                >
                  <div
                    className="absolute inset-0 transition-all duration-300 pointer-events-none"
                    style={{
                      backgroundColor:
                        isHovered
                          ? "rgba(6, 182, 212, 0.25)"
                          : v > 0.05
                          ? `rgba(6, 182, 212, ${Math.min(0.4, v * 2)})`
                          : "rgba(0, 0, 0, 0.65)",
                    }}
                  />
                  {v > 0.08 && (
                    <div className="absolute inset-0 border border-cyan-400 shadow-[inset_0_0_8px_rgba(6,182,212,0.6)] animate-pulse pointer-events-none" />
                  )}
                </motion.div>
              );
            })}
          </div>
          <div className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
            6 × 6 image patches
          </div>
        </div>

        <div id="attention-tokens-container" className="flex flex-col gap-3.5 flex-1 min-w-[200px] z-20">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold select-none">Tokens spotlight</span>
          <div className="flex flex-wrap gap-2 pointer-events-auto">
            {tokens.map((t, i) => {
              const isActive = i === activeTokenIdx;
              return (
                <button
                  key={`${t}-${i}`}
                  id={`vit-token-${i}`}
                  onClick={() => setActiveTokenIdx(i)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                    isActive
                      ? "bg-aurora text-white shadow-md shadow-black/30 border-white/10"
                      : "bg-zinc-900/40 hover:bg-white/[0.06] text-foreground/80 border-white/5 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              );
            })}
            {tokens.length === 0 && (
              <span className="text-xs font-mono text-muted-foreground select-none">
                type something to tokenize…
              </span>
            )}
          </div>

          <div className="bg-zinc-950/40 p-4 rounded-2xl border border-white/5 space-y-2 mt-2 select-none">
            <div className="text-xs text-white font-medium">
              Active Focus: <span className="text-cyan-400 font-bold">"{tokens[activeTokenIdx]}"</span>
            </div>
            <p className="text-[10.5px] text-zinc-400 leading-normal">
              Hover over image patches on the left to trace glowing Bezier vector curves connecting pixel regions directly to their semantic text representations.
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
