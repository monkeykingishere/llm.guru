import { create } from "zustand";

export type ActiveTabType = "stack" | "segmentation" | "training";
export type LayerType =
  | "input"
  | "grayscale"
  | "conv"
  | "relu"
  | "pool"
  | "deep"
  | "flatten"
  | "classify";

interface VisionState {
  // Image Tensor State
  uploadedImageSrc: string | null;
  gray: Float32Array;
  filename: string;
  uploadError: string | null;
  activeTab: ActiveTabType;
  expandedLayer: LayerType | null;
  stackViewMode: "3d" | "flat";

  // CNN Hyperparameters
  selectedPreset: string;
  customKernel: number[][];
  stride: number;
  padding: number;
  kernelSize: number;
  filtersCount: number;
  activation: "relu" | "leaky" | "gelu";
  poolType: "max" | "avg";
  poolSize: number;
  poolStride: number;

  // Segmentation State
  kClusters: number;
  spatialWeight: number;
  overlayOpacity: number;
  showEdges: boolean;

  // Training State
  isTraining: boolean;
  epoch: number;
  lossHistory: number[];
  selectedTargetClass: number;
  learningRate: number;
  classConfidence: number[];

  // Hover Pixel Coordinates
  hoveredCoords: [number, number] | null;

  // Actions
  setUploadedImageSrc: (src: string | null) => void;
  setGray: (gray: Float32Array) => void;
  setFilename: (filename: string) => void;
  setUploadError: (err: string | null) => void;
  setActiveTab: (tab: ActiveTabType) => void;
  setExpandedLayer: (layer: LayerType | null) => void;
  setStackViewMode: (mode: "3d" | "flat") => void;

  setSelectedPreset: (preset: string) => void;
  setCustomKernel: (kernel: number[][] | ((prev: number[][]) => number[][])) => void;
  setStride: (stride: number) => void;
  setPadding: (padding: number) => void;
  setKernelSize: (size: number) => void;
  setFiltersCount: (count: number) => void;
  setActivation: (activation: "relu" | "leaky" | "gelu") => void;
  setPoolType: (type: "max" | "avg") => void;
  setPoolSize: (size: number) => void;
  setPoolStride: (stride: number) => void;

  setKClusters: (k: number) => void;
  setSpatialWeight: (w: number) => void;
  setOverlayOpacity: (o: number) => void;
  setShowEdges: (show: boolean) => void;

  setIsTraining: (is: boolean) => void;
  setEpoch: (epoch: number | ((prev: number) => number)) => void;
  setLossHistory: (history: number[] | ((prev: number[]) => number[])) => void;
  setSelectedTargetClass: (cls: number) => void;
  setLearningRate: (lr: number) => void;
  setClassConfidence: (conf: number[]) => void;
  setHoveredCoords: (coords: [number, number] | null) => void;
}

const SIZE = 96;

// Helper to generate the default synthetic image
function generateDefaultGray(size: number): Float32Array {
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

export const useVisionStore = create<VisionState>((set) => ({
  // Defaults
  uploadedImageSrc: null,
  gray: generateDefaultGray(SIZE),
  filename: "synthetic.png",
  uploadError: null,
  activeTab: "stack",
  expandedLayer: null,
  stackViewMode: "3d",

  selectedPreset: "edge",
  customKernel: [
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
  ],
  stride: 1,
  padding: 1,
  kernelSize: 3,
  filtersCount: 8,
  activation: "relu",
  poolType: "max",
  poolSize: 2,
  poolStride: 2,

  kClusters: 4,
  spatialWeight: 1.2,
  overlayOpacity: 0.6,
  showEdges: true,

  isTraining: false,
  epoch: 0,
  lossHistory: [],
  selectedTargetClass: 0,
  learningRate: 0.05,
  classConfidence: [0.2, 0.2, 0.2, 0.2, 0.2],

  hoveredCoords: null,

  // Actions
  setUploadedImageSrc: (uploadedImageSrc) => set({ uploadedImageSrc }),
  setGray: (gray) => set({ gray }),
  setFilename: (filename) => set({ filename }),
  setUploadError: (uploadError) => set({ uploadError }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setExpandedLayer: (expandedLayer) => set({ expandedLayer }),
  setStackViewMode: (stackViewMode) => set({ stackViewMode }),

  setSelectedPreset: (selectedPreset) => set({ selectedPreset }),
  setCustomKernel: (customKernel) =>
    set((state) => ({
      customKernel:
        typeof customKernel === "function"
          ? customKernel(state.customKernel)
          : customKernel,
    })),
  setStride: (stride) => set({ stride }),
  setPadding: (padding) => set({ padding }),
  setKernelSize: (kernelSize) => set({ kernelSize }),
  setFiltersCount: (filtersCount) => set({ filtersCount }),
  setActivation: (activation) => set({ activation }),
  setPoolType: (poolType) => set({ poolType }),
  setPoolSize: (poolSize) => set({ poolSize }),
  setPoolStride: (poolStride) => set({ poolStride }),

  setKClusters: (kClusters) => set({ kClusters }),
  setSpatialWeight: (spatialWeight) => set({ spatialWeight }),
  setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
  setShowEdges: (showEdges) => set({ showEdges }),

  setIsTraining: (isTraining) => set({ isTraining }),
  setEpoch: (epoch) =>
    set((state) => ({
      epoch: typeof epoch === "function" ? epoch(state.epoch) : epoch,
    })),
  setLossHistory: (lossHistory) =>
    set((state) => ({
      lossHistory:
        typeof lossHistory === "function"
          ? lossHistory(state.lossHistory)
          : lossHistory,
    })),
  setSelectedTargetClass: (selectedTargetClass) => set({ selectedTargetClass }),
  setLearningRate: (learningRate) => set({ learningRate }),
  setClassConfidence: (classConfidence) => set({ classConfidence }),
  setHoveredCoords: (hoveredCoords) => set({ hoveredCoords }),
}));
