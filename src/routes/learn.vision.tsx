import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ImageIcon,
  Sparkles,
  Eye,
  Layers,
  Sliders,
  Play,
  Pause,
  RotateCw,
  Info,
  HelpCircle,
  Database,
  Target,
  LineChart,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

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

// Convolution presets (3x3 kernels)
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

const SIZE = 96; // Standardized grayscale working dimensions
const CLASSES = ["Landscape", "Portrait", "Object", "Text/Document", "Pattern/Texture"];

// Converts an image source into a Float32Array of grayscale intensities in [0, 1]
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

// Executes advanced 2D convolution with padding and stride support
function convolveAdvanced(
  src: Float32Array,
  size: number,
  k: number[][],
  stride: number,
  padding: "same" | "valid",
): { data: Float32Array; outSize: number } {
  const padVal = padding === "same" ? 1 : 0;
  const outSize =
    padding === "same"
      ? Math.ceil(size / stride)
      : Math.floor((size - 3 + 2 * padVal) / stride) + 1;

  const out = new Float32Array(outSize * outSize);

  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      const srcY = y * stride - (padding === "same" ? 1 : 0) + 1;
      const srcX = x * stride - (padding === "same" ? 1 : 0) + 1;

      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const yy = srcY + ky;
          const xx = srcX + kx;

          if (yy >= 0 && yy < size && xx >= 0 && xx < size) {
            sum += src[yy * size + xx] * k[ky + 1][kx + 1];
          }
        }
      }
      out[y * outSize + x] = sum;
    }
  }

  return { data: out, outSize };
}

// Advanced pooling supporting Max and Average options
function poolAdvanced(
  src: Float32Array,
  size: number,
  poolType: "max" | "avg",
  poolSize: number,
): { data: Float32Array; outSize: number } {
  const stride = poolSize;
  const outSize = Math.floor(size / stride);
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
      out[y * outSize + x] = poolType === "max" ? val : val / Math.max(1, count);
    }
  }

  return { data: out, outSize };
}

// Nonlinear activation functions
function activate(
  src: Float32Array,
  type: "relu" | "leaky" | "sigmoid",
  threshold = 0,
): Float32Array {
  const o = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (type === "relu") {
      o[i] = v > threshold ? v : 0;
    } else if (type === "leaky") {
      o[i] = v > threshold ? v : v * 0.1;
    } else if (type === "sigmoid") {
      o[i] = 1 / (1 + Math.exp(-v));
    }
  }
  return o;
}

// Draw feature maps to canvas, normalizing intensities
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

// Spatial-Color K-Means Image Segmentation (Runs completely client-side in JS)
function segmentImage(
  src: Float32Array,
  size: number,
  k: number,
  spatialWeight: number,
): Int32Array {
  const dataLen = src.length;
  const labels = new Int32Array(dataLen);

  // Initialize centroids at random pixel coordinates
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
    // Label assignment
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

        // Balance color similarities against physical spatial distances
        const dist = dx * dx * spatialWeight + dy * dy * spatialWeight + dv * dv;
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      labels[i] = bestCluster;
    }

    // Centroid updates
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
        // Re-seed empty clusters
        const randIdx = Math.floor(Math.random() * dataLen);
        centroids[c].x = randIdx % size;
        centroids[c].y = Math.floor(randIdx / size);
        centroids[c].val = src[randIdx];
      }
    }
  }

  return labels;
}

// Renders K-Means cluster masks with customizable opacity and Sobel boundary contours
function drawSegmentation(
  canvas: HTMLCanvasElement,
  srcGray: Float32Array,
  labels: Int32Array,
  size: number,
  opacity: number,
  showEdges: boolean,
) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = size;
  canvas.height = size;
  const img = ctx.createImageData(size, size);

  const colors = [
    [6, 182, 212], // Cyan
    [236, 72, 153], // Pink
    [16, 185, 129], // Emerald
    [245, 158, 11], // Amber
    [139, 92, 246], // Violet
    [59, 130, 246], // Blue
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
      const r = grayVal * (1 - opacity) + color[0] * opacity;
      const g = grayVal * (1 - opacity) + color[1] * opacity;
      const b = grayVal * (1 - opacity) + color[2] * opacity;

      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Default synthetic image to display before uploads
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
        <VisionLab />
        <CrossAttentionDemo />
      </ModuleLayout>
    </PageShell>
  );
}

// Helper to map input coordinates to convolved feature map coordinates
function getConvCoords(
  hx: number,
  hy: number,
  stride: number,
  padding: "same" | "valid",
): [number, number] {
  if (padding === "same") {
    return [Math.floor(hx / stride), Math.floor(hy / stride)];
  } else {
    return [Math.floor((hx - 1) / stride), Math.floor((hy - 1) / stride)];
  }
}

function VisionLab() {
  const [activeTab, setActiveTab] = useState<"stack" | "segmentation" | "training">("stack");
  const [gray, setGray] = useState<Float32Array>(() => defaultGray(SIZE));
  const [filename, setFilename] = useState<string>("synthetic.png");

  // Convolution config state
  const [selectedPreset, setSelectedPreset] = useState<string>("edge");
  const [customKernel, setCustomKernel] = useState<number[][]>(() => KERNELS.edge.k);
  const [stride, setStride] = useState<number>(1);
  const [padding, setPadding] = useState<"same" | "valid">("same");
  const [activation, setActivation] = useState<"relu" | "leaky" | "sigmoid">("relu");
  const [poolType, setPoolType] = useState<"max" | "avg">("max");
  const [poolSize, setPoolSize] = useState<number>(2);

  // Segmentation state
  const [kClusters, setKClusters] = useState<number>(4);
  const [spatialWeight, setSpatialWeight] = useState<number>(1.2);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.6);
  const [showEdges, setShowEdges] = useState<boolean>(true);

  // Training simulator state
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [epoch, setEpoch] = useState<number>(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [selectedTargetClass, setSelectedTargetClass] = useState<number>(0);
  const [learningRate, setLearningRate] = useState<number>(0.05);
  const [classConfidence, setClassConfidence] = useState<number[]>([0.2, 0.2, 0.2, 0.2, 0.2]);

  // Hover pixel inspection state
  const [hoveredCoords, setHoveredCoords] = useState<[number, number] | null>(null);

  // 3D Stacker tilt angle rotation state
  const [tilt, setTilt] = useState({ x: 16, y: -25 });

  // Canvases refs
  const latentRef = useRef<HTMLCanvasElement>(null);
  const stackInputCanvas = useRef<HTMLCanvasElement>(null);
  const segmentInputCanvas = useRef<HTMLCanvasElement>(null);
  const segmentCanvas = useRef<HTMLCanvasElement>(null);
  const stackConvCanvases = useRef<Record<string, HTMLCanvasElement | null>>({});
  const stackPooledCanvases = useRef<Record<string, HTMLCanvasElement | null>>({});
  const trainWeightCanvas = useRef<HTMLCanvasElement>(null);
  const trainOutputCanvas = useRef<HTMLCanvasElement>(null);

  // Synchronize Preset choices to the editable custom weight grid
  useEffect(() => {
    setCustomKernel(KERNELS[selectedPreset].k);
  }, [selectedPreset]);

  // Compute convolved, activated, and pooled maps on the input image
  const convResults = useMemo(() => {
    const results: Record<
      string,
      { feat: Float32Array; featSize: number; pooled: Float32Array; ps: number }
    > = {};
    for (const key of Object.keys(KERNELS)) {
      const kernelToUse = key === selectedPreset ? customKernel : KERNELS[key].k;
      const { data: convData, outSize: convSize } = convolveAdvanced(
        gray,
        SIZE,
        kernelToUse,
        stride,
        padding,
      );
      const actData = activate(convData, activation);
      const { data: pooledData, outSize: poolSizeOut } = poolAdvanced(
        actData,
        convSize,
        poolType,
        poolSize,
      );
      results[key] = {
        feat: actData,
        featSize: convSize,
        pooled: pooledData,
        ps: poolSizeOut,
      };
    }
    return results;
  }, [gray, customKernel, selectedPreset, stride, padding, activation, poolType, poolSize]);

  // Generate 96-dim flattened latent vector
  const latent = useMemo(() => {
    const dims: number[] = [];
    for (const key of Object.keys(KERNELS)) {
      const { pooled, ps } = convResults[key];
      const cells = 4;
      const step = ps / cells;
      for (let by = 0; by < cells; by++) {
        for (let bx = 0; bx < cells; bx++) {
          let s = 0;
          let count = 0;
          const y0 = Math.floor(by * step);
          const y1 = Math.floor((by + 1) * step);
          const x0 = Math.floor(bx * step);
          const x1 = Math.floor((bx + 1) * step);

          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              if (y * ps + x < pooled.length) {
                s += pooled[y * ps + x];
                count++;
              }
            }
          }
          dims.push(s / Math.max(1, count));
        }
      }
    }
    // Normalize latent dimensions
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const v of dims) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const span = maxVal - minVal || 1;
    return dims.map((v) => (v - minVal) / span);
  }, [convResults]);

  // Run spatial k-means segmentation in the background
  const segmentLabels = useMemo(() => {
    return segmentImage(gray, SIZE, kClusters, spatialWeight);
  }, [gray, kClusters, spatialWeight]);

  // Draw main tab visualization elements
  useEffect(() => {
    if (activeTab === "stack") {
      if (stackInputCanvas.current) drawMap(stackInputCanvas.current, gray, SIZE);
      for (const key of Object.keys(KERNELS)) {
        const cc = stackConvCanvases.current[key];
        const pc = stackPooledCanvases.current[key];
        if (cc) drawMap(cc, convResults[key].feat, convResults[key].featSize, tintFor(key));
        if (pc) drawMap(pc, convResults[key].pooled, convResults[key].ps, tintFor(key));
      }
    } else if (activeTab === "segmentation") {
      if (segmentInputCanvas.current) drawMap(segmentInputCanvas.current, gray, SIZE);
      if (segmentCanvas.current) {
        drawSegmentation(
          segmentCanvas.current,
          gray,
          segmentLabels,
          SIZE,
          overlayOpacity,
          showEdges,
        );
      }
    }
  }, [activeTab, gray, convResults, segmentLabels, overlayOpacity, showEdges]);

  // Draw 96-dim latent vector
  useEffect(() => {
    const canvas = latentRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.clientWidth || 384);
    const height = (canvas.height = canvas.clientHeight || 36);
    ctx.clearRect(0, 0, width, height);

    const numDims = latent.length;
    if (numDims === 0) return;
    const blockWidth = width / numDims;

    for (let i = 0; i < numDims; i++) {
      const val = latent[i]; // value in [0, 1]
      const alpha = 0.15 + val * 0.85;
      ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`; // Violet-400 with varying alpha
      ctx.fillRect(i * blockWidth, 0, blockWidth - 0.5, height);
    }
  }, [latent]);

  // Random base noise filter used in training simulation
  const noiseFilterBase = useMemo(
    () => [
      [Math.sin(1) * 0.45, Math.cos(2) * 0.45, Math.sin(3) * 0.45],
      [Math.cos(4) * 0.45, Math.sin(5) * 0.45, Math.cos(6) * 0.45],
      [Math.sin(7) * 0.45, Math.cos(8) * 0.45, Math.sin(9) * 0.45],
    ],
    [],
  );

  // Compute training simulator weight values based on epoch progress
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

  // Redraw the simulator weight grid and convolved maps during training
  useEffect(() => {
    if (activeTab === "training") {
      const wCanvas = trainWeightCanvas.current;
      const oCanvas = trainOutputCanvas.current;

      if (wCanvas) {
        // Draw weights visually as a crisp 150x150 color grid with grid line overlays & float text
        const ctx = wCanvas.getContext("2d")!;
        wCanvas.width = 150;
        wCanvas.height = 150;
        ctx.clearRect(0, 0, 150, 150);

        let minW = Infinity;
        let maxW = -Infinity;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const w = trainingWeights[r][c];
            if (w < minW) minW = w;
            if (w > maxW) maxW = w;
          }
        }
        const wSpan = maxW - minW || 1;

        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const normW = (trainingWeights[r][c] - minW) / wSpan;
            // High-tech slate-pink theme interpolation
            const red = Math.floor(normW * 236 + (1 - normW) * 39);
            const green = Math.floor(normW * 72 + (1 - normW) * 39);
            const blue = Math.floor(normW * 153 + (1 - normW) * 42);

            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            ctx.fillRect(c * 50, r * 50, 50, 50);

            // Draw grid borders
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = 1;
            ctx.strokeRect(c * 50, r * 50, 50, 50);

            // Draw numeric label
            ctx.fillStyle = normW > 0.55 ? "#ffffff" : "#d1d5db";
            ctx.font = "bold 9.5px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(trainingWeights[r][c].toFixed(2), c * 50 + 25, r * 50 + 25);
          }
        }
      }

      if (oCanvas) {
        // Compute and draw feature map for the currently morphing weights
        const { data: convData } = convolveAdvanced(gray, SIZE, trainingWeights, 1, "same");
        const actData = activate(convData, "relu");
        drawMap(oCanvas, actData, SIZE, [236, 72, 153]);
      }
    }
  }, [activeTab, gray, trainingWeights]);

  // Loop backpropagation training simulation increments
  useEffect(() => {
    let animFrame: number;
    let frameCount = 0;
    if (isTraining) {
      const step = () => {
        frameCount++;
        if (frameCount % 4 === 0) {
          // Throttled to ~15 epochs/sec for human readability
          setEpoch((prev) => {
            if (prev >= 100) {
              setIsTraining(false);
              return 100;
            }
            const next = prev + 1;
            // Calculate simulated descending loss
            const baseLoss = 1.6 * Math.exp(-next / 30);
            const noise = Math.sin(next * 0.7) * 0.03 + Math.random() * 0.02;
            const currentLoss = Math.max(0.04, baseLoss + 0.05 + noise);
            setLossHistory((history) => [...history, currentLoss]);

            // Update prediction probabilities
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

  // File loading and preprocessing
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

  // Handle custom weight input edits
  const handleWeightChange = (row: number, col: number, val: number) => {
    setCustomKernel((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = isNaN(val) ? 0 : val;
      return next;
    });
  };

  // 3D Stacker tilt animations
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: 16 - y * 18,
      y: -25 + x * 18,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 16, y: -25 });
  };

  // Retrieve values in the 3x3 inspect grid centered at hovered coordinates
  const inspectSubgrid = useMemo(() => {
    if (!hoveredCoords) return null;
    const [hx, hy] = hoveredCoords;
    const grid: number[][] = [];
    for (let dy = -1; dy <= 1; dy++) {
      const row: number[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        const yy = Math.min(SIZE - 1, Math.max(0, hy + dy));
        const xx = Math.min(SIZE - 1, Math.max(0, hx + dx));
        row.push(gray[yy * SIZE + xx]);
      }
      grid.push(row);
    }
    return grid;
  }, [hoveredCoords, gray]);

  // Compute interactive convolved output value at hovered subgrid coordinate
  const inspectCalculation = useMemo(() => {
    if (!inspectSubgrid) return null;
    let sum = 0;
    const elements: string[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const pixelVal = inspectSubgrid[r][c];
        const weightVal = customKernel[r][c];
        const product = pixelVal * weightVal;
        sum += product;
        elements.push(
          `(${pixelVal.toFixed(2)} × ${weightVal >= 0 ? "+" : ""}${weightVal.toFixed(1)})`,
        );
      }
    }
    let activated = sum;
    if (activation === "relu") {
      activated = Math.max(0, sum);
    } else if (activation === "leaky") {
      activated = sum > 0 ? sum : sum * 0.1;
    } else if (activation === "sigmoid") {
      activated = 1 / (1 + Math.exp(-sum));
    }
    return { sum, activated, formula: elements.join(" + ") };
  }, [inspectSubgrid, customKernel, activation]);

  return (
    <div className="grid gap-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="glass-strong rounded-3xl p-6 sm:p-8"
      >
        {/* Module Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Eye className="h-3.5 w-3.5 text-cyan-400" /> VISION LAB
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              Interactive Vision & Feature Extraction Sandbox
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Inspect how convolutions project image grids, cluster segments with spatial K-Means,
              and train weights with backpropagation.
            </p>
          </div>
          <label className="group inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-aurora px-4 py-2.5 text-sm font-medium text-white border border-white/5 hover:border-white/20 shadow-md shadow-black/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload custom image
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

        {/* Tab Selection */}
        <div className="mt-6 flex border-b border-white/10 gap-1 overflow-x-auto">
          {[
            { id: "stack", label: "CNN Layer Stack", icon: Layers },
            { id: "segmentation", label: "Image Segmentation", icon: Eye },
            { id: "training", label: "Learning & Backprop", icon: LineChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "stack" | "segmentation" | "training")}
                className={`relative px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors flex items-center gap-2 ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="active-lab-tab"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Sandbox Display */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {activeTab === "stack" && (
              <motion.div
                key="stack-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid gap-8 xl:grid-cols-[1fr,360px]"
              >
                <div className="space-y-6">
                  {/* Interactive 3D Stack */}
                  <div
                    className="relative h-[420px] w-full flex items-center justify-center overflow-hidden border border-white/5 rounded-3xl bg-black/40 [perspective:1200px]"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div
                      className="relative flex items-center justify-center transform-gpu transition-transform duration-500 ease-out"
                      style={{
                        transform: `rotateY(${tilt.y}deg) rotateX(${tilt.x}deg) scale(0.85)`,
                        transformStyle: "preserve-3d",
                      }}
                    >
                      {/* Layer 1: Input image */}
                      <div
                        className="absolute border border-cyan-500/30 bg-black/80 backdrop-blur-md rounded-2xl p-3.5 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center select-none"
                        style={{ transform: "translateZ(100px)" }}
                      >
                        <div className="relative">
                          <canvas
                            ref={stackInputCanvas}
                            className="h-28 w-28 rounded-lg [image-rendering:pixelated]"
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
                              const y = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
                              if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
                                setHoveredCoords([x, y]);
                              }
                            }}
                            onMouseLeave={() => setHoveredCoords(null)}
                          />
                          {hoveredCoords && (
                            <div
                              className="absolute pointer-events-none border border-cyan-400 bg-cyan-400/20 rounded shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                              style={{
                                left: `${((hoveredCoords[0] - 1) / SIZE) * 100}%`,
                                top: `${((hoveredCoords[1] - 1) / SIZE) * 100}%`,
                                width: `${(3 / SIZE) * 100}%`,
                                height: `${(3 / SIZE) * 100}%`,
                              }}
                            />
                          )}
                        </div>
                        <span className="mt-2 font-mono text-[9px] text-cyan-400 tracking-widest uppercase">
                          1 · Input Pixel Grid
                        </span>
                      </div>

                      {/* Layer 2: Convolved Feature Maps */}
                      <div
                        className="absolute border border-violet-500/30 bg-black/80 backdrop-blur-md rounded-2xl p-3.5 transition-all duration-300 shadow-[0_0_30px_rgba(139,92,246,0.15)] flex flex-col items-center"
                        style={{ transform: "translateZ(0px)" }}
                      >
                        <div className="grid grid-cols-3 gap-2">
                          {Object.keys(KERNELS).map((key) => {
                            const [cx, cy] = hoveredCoords
                              ? getConvCoords(hoveredCoords[0], hoveredCoords[1], stride, padding)
                              : [-1, -1];
                            const convSize = convResults[key]?.featSize || SIZE;
                            const showDot =
                              hoveredCoords && cx >= 0 && cx < convSize && cy >= 0 && cy < convSize;
                            const isActivePreset = key === selectedPreset;

                            return (
                              <div
                                key={key}
                                className={`relative rounded p-0.5 border ${
                                  isActivePreset
                                    ? "border-violet-400 bg-violet-400/10 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                                    : "border-white/5 bg-zinc-900/60"
                                }`}
                              >
                                <canvas
                                  ref={(el) => {
                                    stackConvCanvases.current[key] = el;
                                  }}
                                  className="h-10 w-10 rounded [image-rendering:pixelated]"
                                />
                                {showDot && (
                                  <div
                                    className="absolute pointer-events-none w-1.5 h-1.5 bg-violet-400 rounded-full border border-white shadow-[0_0_4px_rgba(139,92,246,0.8)]"
                                    style={{
                                      left: `${(cx / convSize) * 100}%`,
                                      top: `${(cy / convSize) * 100}%`,
                                      transform: "translate(-50%, -50%)",
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <span className="mt-2 font-mono text-[9px] text-violet-400 tracking-widest uppercase">
                          2 · Convolution Layer (6x)
                        </span>
                      </div>

                      {/* Layer 3: Maxpooled Activations */}
                      <div
                        className="absolute border border-pink-500/30 bg-black/80 backdrop-blur-md rounded-2xl p-3.5 transition-all duration-300 shadow-[0_0_30px_rgba(236,72,153,0.15)] flex flex-col items-center"
                        style={{ transform: "translateZ(-100px)" }}
                      >
                        <div className="grid grid-cols-3 gap-2">
                          {Object.keys(KERNELS).map((key) => {
                            const [cx, cy] = hoveredCoords
                              ? getConvCoords(hoveredCoords[0], hoveredCoords[1], stride, padding)
                              : [-1, -1];
                            const convSize = convResults[key]?.featSize || SIZE;
                            const px_coord = Math.floor(cx / poolSize);
                            const py_coord = Math.floor(cy / poolSize);
                            const ps = convResults[key]?.ps || 1;
                            const showDot =
                              hoveredCoords &&
                              cx >= 0 &&
                              cx < convSize &&
                              cy >= 0 &&
                              cy < convSize &&
                              px_coord >= 0 &&
                              px_coord < ps &&
                              py_coord >= 0 &&
                              py_coord < ps;
                            const isActivePreset = key === selectedPreset;

                            return (
                              <div
                                key={key}
                                className={`relative rounded p-0.5 border ${
                                  isActivePreset
                                    ? "border-pink-400 bg-pink-400/10 shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                                    : "border-white/5 bg-zinc-900/60"
                                }`}
                              >
                                <canvas
                                  ref={(el) => {
                                    stackPooledCanvases.current[key] = el;
                                  }}
                                  className="h-7 w-7 rounded [image-rendering:pixelated]"
                                />
                                {showDot && (
                                  <div
                                    className="absolute pointer-events-none w-1 h-1 bg-pink-400 rounded-full border border-white shadow-[0_0_3px_rgba(236,72,153,0.8)]"
                                    style={{
                                      left: `${(px_coord / ps) * 100}%`,
                                      top: `${(py_coord / ps) * 100}%`,
                                      transform: "translate(-50%, -50%)",
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <span className="mt-2 font-mono text-[9px] text-pink-400 tracking-widest uppercase">
                          3 · Pooling Downsample (6x)
                        </span>
                      </div>
                    </div>

                    <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground select-none">
                      <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
                      Move cursor to tilt perspective · Hover input map to inspect coordinates
                    </div>
                  </div>

                  {/* Editable Kernel Matrix grid */}
                  <div className="grid gap-6 md:grid-cols-[1fr,240px]">
                    <div className="rounded-2xl glass p-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <Sliders className="h-4 w-4 text-violet-400" />
                          Feature Map Configurations
                        </span>
                        <div className="flex gap-2">
                          <select
                            value={selectedPreset}
                            onChange={(e) => setSelectedPreset(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs outline-none"
                          >
                            {Object.entries(KERNELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal mb-4">
                        {KERNELS[selectedPreset].desc} Modify the weights below to manually edit the
                        kernel matrix and see output changes immediately.
                      </p>

                      <div className="flex flex-wrap items-center gap-8 justify-around">
                        {/* 3x3 Matrix weights inputs */}
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase mb-2">
                            Weight Kernel
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 bg-black/30 p-2 rounded-xl border border-white/5">
                            {customKernel.map((row, rIdx) =>
                              row.map((val, cIdx) => (
                                <input
                                  key={`${rIdx}-${cIdx}`}
                                  type="number"
                                  step="0.5"
                                  value={val}
                                  onChange={(e) =>
                                    handleWeightChange(rIdx, cIdx, parseFloat(e.target.value))
                                  }
                                  className="w-12 h-10 bg-zinc-900 border border-white/10 rounded-lg text-center font-mono text-xs text-white outline-none focus:border-cyan-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              )),
                            )}
                          </div>
                          <button
                            onClick={() => setCustomKernel(KERNELS[selectedPreset].k)}
                            className="mt-2 text-[10px] font-mono text-zinc-400 hover:text-cyan-400 flex items-center gap-1 transition-colors pointer-events-auto cursor-pointer"
                          >
                            <RotateCw className="h-3 w-3" /> Reset Matrix
                          </button>
                        </div>

                        {/* Extra hyperparameters config */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase">
                              Stride
                            </span>
                            <div className="flex gap-1.5">
                              {[1, 2].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setStride(s)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                                    stride === s
                                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                      : "glass text-zinc-400 border-white/5"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase">
                              Padding
                            </span>
                            <div className="flex gap-1.5">
                              {["same", "valid"].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setPadding(p as "same" | "valid")}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${
                                    padding === p
                                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                      : "glass text-zinc-400 border-white/5"
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase">
                              Activation
                            </span>
                            <select
                              value={activation}
                              onChange={(e) =>
                                setActivation(e.target.value as "relu" | "leaky" | "sigmoid")
                              }
                              className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs outline-none text-zinc-300 capitalize"
                            >
                              <option value="relu">ReLU</option>
                              <option value="leaky">Leaky ReLU</option>
                              <option value="sigmoid">Sigmoid</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase">
                              Pooling Function
                            </span>
                            <div className="flex gap-1">
                              <select
                                value={poolType}
                                onChange={(e) => setPoolType(e.target.value as "max" | "avg")}
                                className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs outline-none text-zinc-300 capitalize"
                              >
                                <option value="max">Max</option>
                                <option value="avg">Avg</option>
                              </select>
                              <select
                                value={poolSize}
                                onChange={(e) => setPoolSize(parseInt(e.target.value))}
                                className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs outline-none text-zinc-300"
                              >
                                <option value="2">2×</option>
                                <option value="3">3×</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Matrix presets lists */}
                    <div className="rounded-2xl glass p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                          Preset Filters
                        </span>
                        <div className="mt-2.5 space-y-1.5">
                          {Object.entries(KERNELS).map(([k, v]) => (
                            <button
                              key={k}
                              onClick={() => setSelectedPreset(k)}
                              className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex justify-between items-center transition-colors ${
                                selectedPreset === k
                                  ? "bg-white/10 text-white font-medium border border-white/10"
                                  : "hover:bg-white/5 text-zinc-400 border border-transparent"
                              }`}
                            >
                              <span>{v.name}</span>
                              <span className="text-[9px] font-mono opacity-50">3×3</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-zinc-500 leading-normal flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>
                          Different filters extract diverse features. Sobel identifies boundaries,
                          while Gaussian Blur acts as a low-pass noise filter.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subgrid Pixel Inspect Sidebar */}
                <div className="rounded-2xl glass p-5 flex flex-col justify-between h-full min-h-[380px]">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2 mb-3">
                      <HelpCircle className="h-4 w-4 text-cyan-400" />
                      Interactive Convolve
                    </span>
                    {inspectSubgrid && inspectCalculation ? (
                      <div className="space-y-4">
                        {/* 3x3 local pixel matrix values */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-mono text-zinc-400 mb-2 uppercase">
                            Receptive Field values
                          </span>
                          <div className="grid grid-cols-3 gap-1 bg-black/40 p-1.5 rounded-lg">
                            {inspectSubgrid.map((row, r) =>
                              row.map((val, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  className="w-10 h-8 rounded flex items-center justify-center font-mono text-[10px] border border-white/5 text-white/90"
                                  style={{ backgroundColor: `rgba(255,255,255,${val * 0.15})` }}
                                >
                                  {val.toFixed(2)}
                                </div>
                              )),
                            )}
                          </div>
                        </div>

                        {/* Detailed math calculation output */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                            Convolution Math:
                          </span>
                          <div className="bg-black/60 p-3 rounded-xl border border-white/10 font-mono text-[9.5px] text-zinc-300 leading-relaxed max-h-28 overflow-y-auto break-all scrollbar-thin scrollbar-thumb-zinc-800 shadow-inner">
                            {inspectCalculation.formula}
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono pt-1">
                            <span className="text-zinc-500">DOT PRODUCT SUM:</span>
                            <span className="text-zinc-300">
                              {inspectCalculation.sum.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono border-t border-white/5 pt-1.5">
                            <span className="text-cyan-400 uppercase font-semibold">
                              {activation} OUTPUT:
                            </span>
                            <span className="text-white font-bold">
                              {inspectCalculation.activated.toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-zinc-500 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border border-dashed border-zinc-600 flex items-center justify-center text-zinc-400 animate-pulse">
                          🎯
                        </div>
                        <p className="text-xs leading-normal">
                          Hover your cursor over the input image map in the 3D stack above to trace
                          and inspect the convolution math in real time.
                        </p>
                      </div>
                    )}
                  </div>

                  {hoveredCoords && (
                    <div className="pt-3 border-t border-white/5 text-[9.5px] font-mono text-zinc-500 flex justify-between">
                      <span>X COORDINATE: {hoveredCoords[0]}</span>
                      <span>Y COORDINATE: {hoveredCoords[1]}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "segmentation" && (
              <motion.div
                key="segmentation-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid gap-8 lg:grid-cols-[1fr,320px]"
              >
                {/* Segmentation output canvas comparison */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-6 border border-white/5 rounded-3xl bg-black/40 min-h-[320px] w-full">
                  {/* Original image */}
                  <div className="relative flex flex-col items-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mb-2 select-none">
                      Original Image
                    </span>
                    <canvas
                      ref={segmentInputCanvas}
                      className="h-56 w-56 rounded-2xl ring-1 ring-white/10 [image-rendering:pixelated]"
                    />
                  </div>

                  {/* Flow arrow */}
                  <div className="text-zinc-600 font-mono text-xl rotate-90 md:rotate-0 select-none">
                    &rarr;
                  </div>

                  {/* Segmented output */}
                  <div className="relative flex flex-col items-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mb-2 select-none">
                      Segment Mask
                    </span>
                    <canvas
                      ref={segmentCanvas}
                      className="h-56 w-56 rounded-2xl ring-1 ring-white/10 [image-rendering:pixelated]"
                    />
                  </div>
                </div>

                {/* K-Means controls sidebar */}
                <div className="rounded-2xl glass p-5 flex flex-col justify-between">
                  <div className="space-y-5">
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2 mb-1">
                      <Sliders className="h-4 w-4 text-emerald-400" />
                      Segmentation Controls
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Runs an edge-aware K-Means clustering algorithm on grayscale intensity and
                      coordinates $(X,Y)$ to outline semantic boundaries.
                    </p>

                    <div className="space-y-4">
                      {/* Cluster count slider */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">K-CLUSTERS:</span>
                          <span className="text-white font-bold">{kClusters}</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="6"
                          value={kClusters}
                          onChange={(e) => setKClusters(parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                      </div>

                      {/* Spatial compact factor weight */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">SPATIAL COMPACTNESS:</span>
                          <span className="text-white font-bold">{spatialWeight.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.2"
                          value={spatialWeight}
                          onChange={(e) => setSpatialWeight(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                      </div>

                      {/* Overlay Opacity */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">OVERLAY OPACITY:</span>
                          <span className="text-white font-bold">
                            {(overlayOpacity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="1.0"
                          step="0.1"
                          value={overlayOpacity}
                          onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                      </div>

                      {/* Edge toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-xs font-mono text-zinc-500">SHOW BOUNDARIES:</span>
                        <button
                          onClick={() => setShowEdges(!showEdges)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            showEdges
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "glass text-zinc-400 border-white/5"
                          }`}
                        >
                          {showEdges ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-white/5 text-[9.5px] font-mono text-zinc-500 flex justify-between items-center leading-normal">
                    <Database className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>Real-time spatial clustering computed in-browser.</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "training" && (
              <motion.div
                key="training-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid gap-8 lg:grid-cols-[1fr,320px]"
              >
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Visual weight updates */}
                  <div className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-3xl bg-black/40">
                    <span className="text-xs font-mono text-zinc-400 mb-3 uppercase tracking-wider">
                      Updating Weight Matrix (Filters)
                    </span>
                    <div className="relative">
                      <canvas
                        ref={trainWeightCanvas}
                        className="h-40 w-40 rounded-xl ring-1 ring-white/10 [image-rendering:pixelated]"
                      />
                      <div className="absolute left-2.5 top-2.5 rounded-full glass px-2 py-0.5 text-[9px] font-mono text-zinc-400 uppercase">
                        Weight 3×3 Grid
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono mt-4 text-center">
                      Morphs from random noise parameters into structured edge kernels as gradient
                      descent computes.
                    </span>
                  </div>

                  {/* Visual convolved updates */}
                  <div className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-3xl bg-black/40">
                    <span className="text-xs font-mono text-zinc-400 mb-3 uppercase tracking-wider">
                      Learned Feature Map Output
                    </span>
                    <div className="relative">
                      <canvas
                        ref={trainOutputCanvas}
                        className="h-40 w-40 rounded-xl ring-1 ring-white/10 [image-rendering:pixelated]"
                      />
                      <div className="absolute left-2.5 top-2.5 rounded-full glass px-2 py-0.5 text-[9px] font-mono text-zinc-400 uppercase">
                        Feature Map
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono mt-4 text-center">
                      Observe convolved outputs sharpen as filter weights adjust.
                    </span>
                  </div>
                </div>

                {/* Training control panel */}
                <div className="rounded-2xl glass p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2 mb-1">
                      <Target className="h-4 w-4 text-pink-400" />
                      Backprop Training Lab
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Choose a class for the current image and run SGD backpropagation to train the
                      final prediction classification nodes.
                    </p>

                    {/* Class target selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">
                        Target Image Class
                      </span>
                      <select
                        value={selectedTargetClass}
                        onChange={(e) => setSelectedTargetClass(parseInt(e.target.value))}
                        disabled={isTraining}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs outline-none text-zinc-300 cursor-pointer disabled:opacity-50"
                      >
                        {CLASSES.map((c, idx) => (
                          <option key={idx} value={idx}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Hyperparameters */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">
                        Learning Rate ($\eta$)
                      </span>
                      <select
                        value={learningRate}
                        onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                        disabled={isTraining}
                        className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs outline-none text-zinc-300 cursor-pointer disabled:opacity-50"
                      >
                        <option value="0.01">0.01 (Slow)</option>
                        <option value="0.05">0.05 (Medium)</option>
                        <option value="0.1">0.10 (Aggressive)</option>
                      </select>
                    </div>

                    {/* Class confidence bars */}
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                        Model Predictions Confidence
                      </span>
                      {CLASSES.map((name, idx) => {
                        const prob = classConfidence[idx];
                        const isTarget = idx === selectedTargetClass;
                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between text-[9px] font-mono">
                              <span
                                className={isTarget ? "text-pink-400 font-bold" : "text-zinc-400"}
                              >
                                {name}
                              </span>
                              <span className="text-zinc-300">{(prob * 100).toFixed(1)}%</span>
                            </div>
                            <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                                  isTarget
                                    ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                                    : "bg-zinc-600"
                                }`}
                                style={{ width: `${prob * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dynamic loss curve graph */}
                    {lossHistory.length > 0 && (
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                        <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                          <span>Loss Curve</span>
                          <span className="text-pink-400 font-bold">
                            {lossHistory[lossHistory.length - 1].toFixed(4)}
                          </span>
                        </div>
                        <svg viewBox="0 0 280 80" className="w-full h-16 overflow-visible">
                          {/* Grid lines */}
                          <line
                            x1="0"
                            y1="20"
                            x2="280"
                            y2="20"
                            stroke="rgba(255,255,255,0.05)"
                            strokeDasharray="3,3"
                          />
                          <line
                            x1="0"
                            y1="40"
                            x2="280"
                            y2="40"
                            stroke="rgba(255,255,255,0.05)"
                            strokeDasharray="3,3"
                          />
                          <line
                            x1="0"
                            y1="60"
                            x2="280"
                            y2="60"
                            stroke="rgba(255,255,255,0.05)"
                            strokeDasharray="3,3"
                          />

                          {/* Gradient fill */}
                          <path
                            d={`M 0 80 ${lossHistory.map((v, i) => `L ${(i / 100) * 280} ${80 - (Math.min(1.8, v) / 1.8) * 70}`).join(" ")} L ${((lossHistory.length - 1) / 100) * 280} 80 Z`}
                            fill="url(#lossGrad)"
                            opacity="0.15"
                          />

                          {/* Line curve */}
                          <path
                            d={lossHistory
                              .map(
                                (v, i) =>
                                  `${i === 0 ? "M" : "L"} ${(i / 100) * 280} ${80 - (Math.min(1.8, v) / 1.8) * 70}`,
                              )
                              .join(" ")}
                            fill="none"
                            stroke="rgb(236, 72, 153)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          <defs>
                            <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgb(236, 72, 153)" />
                              <stop offset="100%" stopColor="rgb(236, 72, 153)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    )}

                    {/* Simulator action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          if (epoch >= 100) {
                            setEpoch(0);
                            setLossHistory([]);
                          }
                          setIsTraining(!isTraining);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all pointer-events-auto cursor-pointer ${
                          isTraining
                            ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                            : "bg-aurora text-white border-white/5 hover:border-white/20"
                        }`}
                      >
                        {isTraining ? (
                          <>
                            <Pause className="h-3.5 w-3.5" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            {epoch >= 100 ? "Restart Training" : "Start Training"}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsTraining(false);
                          setEpoch(0);
                          setLossHistory([]);
                          setClassConfidence([0.2, 0.2, 0.2, 0.2, 0.2]);
                        }}
                        className="p-2 rounded-xl glass hover:bg-white/10 text-zinc-400 border border-white/5 hover:text-white transition-all cursor-pointer pointer-events-auto"
                        title="Reset simulator"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between font-mono text-[9px] text-zinc-500 pt-1">
                      <span>EPOCH: {epoch} / 100</span>
                      {lossHistory.length > 0 && (
                        <span>LOSS: {lossHistory[lossHistory.length - 1].toFixed(4)}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-white/5 text-[9.5px] font-mono text-zinc-500 flex justify-between items-center leading-normal">
                    <Database className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>Weights learn backprop derivatives in real-time.</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 96-dim Latent projection block */}
        <div className="mt-10 rounded-2xl glass p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground select-none">
              <Layers className="h-3.5 w-3.5 text-violet-400" /> Flattened Latent Embeddings ·
              96-dim
            </div>
            <div className="text-[11px] text-zinc-500 font-mono select-none">
              this vector is what a multimodal transformer attends to
            </div>
          </div>
          <div className="mt-3 overflow-x-auto select-none pointer-events-none">
            <canvas ref={latentRef} className="rounded-lg h-9 w-full max-w-full" />
          </div>
        </div>
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
  
  <!-- Person (Abstract Silhouette) -->
  <circle cx="90" cy="210" r="5" fill="#f43f5e"/>
  <line x1="90" y1="215" x2="90" y2="235" stroke="#f43f5e" stroke-width="2"/>
  <line x1="90" y1="220" x2="80" y2="228" stroke="#f43f5e" stroke-width="1.5"/>
  <line x1="90" y1="220" x2="100" y2="228" stroke="#f43f5e" stroke-width="1.5"/>
  <line x1="90" y1="235" x2="82" y2="250" stroke="#f43f5e" stroke-width="1.5"/>
  <line x1="90" y1="235" x2="98" y2="250" stroke="#f43f5e" stroke-width="1.5"/>

  <!-- Tree -->
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
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= tokens.length) setActive(Math.max(0, tokens.length - 1));
  }, [tokens, active]);

  const attn = useMemo(
    () =>
      tokens[active] ? attentionFor(tokens[active]) : new Array(PATCH_GRID * PATCH_GRID).fill(0),
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
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground select-none">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Text × Image cross-attention
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight leading-tight select-none">
            Words look at the parts of the picture they describe
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl select-none">
            Type a caption. Each token attends across a 6×6 grid of image patches. Brighter cells =
            higher attention weight. This is the mechanism behind CLIP, LLaVA, and GPT-4V.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr,auto] items-start">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono select-none">
              Caption
            </label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-2 w-full rounded-2xl glass px-4 py-3 text-sm outline-none focus:bg-white/[0.06] border border-white/5 focus:border-white/10 transition-all pointer-events-auto"
              placeholder="describe an image…"
            />
          </div>

          <div className="flex flex-wrap gap-2 pointer-events-auto">
            {tokens.map((t, i) => (
              <button
                key={`${t}-${i}`}
                onClick={() => setActive(i)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  i === active
                    ? "bg-aurora text-white shadow-md shadow-black/30 border border-white/10"
                    : "glass hover:bg-white/[0.06] text-foreground/80 border border-white/5"
                }`}
              >
                {t}
              </button>
            ))}
            {tokens.length === 0 && (
              <span className="text-xs font-mono text-muted-foreground select-none">
                type something to tokenize…
              </span>
            )}
          </div>

          <div className="rounded-2xl glass p-4 select-none">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">
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
                    <span className="text-sm flex-1">{PATCH_LABELS[i % PATCH_LABELS.length]}</span>
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

        <div className="mx-auto select-none">
          <div
            className="grid gap-1.5 rounded-2xl bg-black/40 ring-1 ring-white/10 p-3"
            style={{ gridTemplateColumns: `repeat(${PATCH_GRID}, minmax(0,1fr))` }}
          >
            {attn.map((v, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: 1 + v * 0.04,
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg ring-1 ring-white/10 relative overflow-hidden bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url("${LANDSCAPE_SVG}")`,
                  backgroundSize: "600% 600%",
                  backgroundPosition: `${(i % 6) * 20}% ${Math.floor(i / 6) * 20}%`,
                }}
                title={`${PATCH_LABELS[i % PATCH_LABELS.length]} · ${(v * 100).toFixed(1)}%`}
              >
                {/* Dimming overlay for low attention, glowing tint for high attention */}
                <div
                  className="absolute inset-0 transition-all duration-300"
                  style={{
                    backgroundColor:
                      v > 0.05
                        ? `rgba(6, 182, 212, ${Math.min(0.4, v * 2)})` // cyan tint for high attention
                        : "rgba(0, 0, 0, 0.65)", // dim overlay for low attention
                  }}
                />
                {/* Glowing border for highly attended patches */}
                {v > 0.08 && (
                  <div className="absolute inset-0 border border-cyan-400 shadow-[inset_0_0_8px_rgba(6,182,212,0.6)] animate-pulse pointer-events-none" />
                )}
                <span className="absolute bottom-0.5 right-1 text-[8.5px] font-mono text-white/80 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {(v * 100).toFixed(0)}
                </span>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
            6 × 6 image patches
          </div>
        </div>
      </div>
    </motion.div>
  );
}
