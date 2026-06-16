import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Slider } from "@/components/ui/slider";
import { 
  Activity, 
  Grid, 
  Info, 
  Sparkles, 
  Eye, 
  Sliders 
} from "lucide-react";

export const Route = createFileRoute("/learn/positional-encoding")({
  head: () => ({
    meta: [
      { title: "Positional Encoding — Latent" },
      {
        name: "description",
        content:
          "Visualize the sinusoidal patterns that give a permutation-invariant transformer a sense of order.",
      },
      { property: "og:title", content: "Positional Encoding — Latent" },
      {
        property: "og:description",
        content: "Interactive sinusoidal positional encoding heatmap and wave explorer.",
      },
    ],
  }),
  component: Page,
});

const dModel = 512;
const numPositions = 256;

// Mathematically exact Positional Encoding equation
function encoding(pos: number, dim: number, dModel: number): number {
  const i = Math.floor(dim / 2);
  const denom = Math.pow(10000, (2 * i) / dModel);
  return dim % 2 === 0 ? Math.sin(pos / denom) : Math.cos(pos / denom);
}

// Blends between dimensions for smooth, snap-free SVG path morphing
function getInterpolatedPE(pos: number, d: number, dModel: number): number {
  const dLow = Math.floor(d);
  const dHigh = Math.ceil(d);
  if (dLow === dHigh) {
    return encoding(pos, dLow, dModel);
  }
  const w = d - dLow;
  const valLow = encoding(pos, dLow, dModel);
  const valHigh = encoding(pos, dHigh, dModel);
  return valLow * (1 - w) + valHigh * w;
}

function Page() {
  const [activeDim, setActiveDim] = useState(32);
  const [visualDim, setVisualDim] = useState(32);
  const [currentPosition, setCurrentPosition] = useState(42);
  
  // Selection and hover states
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverHeatmap, setHoverHeatmap] = useState<{ p: number; d: number } | null>(null);
  
  // UI Configuration
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isDetailView, setIsDetailView] = useState(false);
  const [activeTokenIdx, setActiveTokenIdx] = useState<number | null>(null);

  // Dimension list for selection
  const selectorDimensions = [0, 32, 64, 128, 256, 510];

  // Dimensions used in Comparison Mode
  const compareDims = [0, 32, 128, 510];
  const compareColors = [
    "oklch(0.82 0.022 220)", // Cyan
    "oklch(0.86 0.018 250)", // Fuchsia
    "oklch(0.78 0.025 235)", // Steel Blue
    "oklch(0.82 0.04 85)",   // Amber
  ];

  // Precompute encoding values for 256 positions and 512 dimensions for the Heatmap
  const heatmapData = useMemo(() => {
    const data = new Float32Array(numPositions * dModel);
    for (let p = 0; p < numPositions; p++) {
      for (let d = 0; d < dModel; d++) {
        data[p * dModel + d] = encoding(p, d, dModel);
      }
    }
    return data;
  }, []);

  // requestAnimationFrame loop to smoothly morph between dimensions
  useEffect(() => {
    let startTime: number | null = null;
    const startVal = visualDim;
    const endVal = activeDim;
    const duration = 400; // 400ms transition
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Smooth ease-in-out cubic
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const current = startVal + (endVal - startVal) * ease;
      setVisualDim(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeDim]);

  // Canvas Heatmap rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numCols = isDetailView ? 64 : dModel;
    const numRows = numPositions;

    canvas.width = numCols;
    canvas.height = numRows;

    const imgData = ctx.createImageData(numCols, numRows);
    const data = imgData.data;

    for (let p = 0; p < numRows; p++) {
      for (let d = 0; d < numCols; d++) {
        const val = heatmapData[p * dModel + d];
        const intensity = (val + 1) / 2; // Normalize -1..1 to 0..1

        let r = 24, g = 25, b = 31; // Default Charcoal theme background
        if (val >= 0) {
          // Blend from charcoal (24, 25, 31) to premium violet (139, 92, 246)
          r = Math.round(24 + intensity * (139 - 24));
          g = Math.round(25 + intensity * (92 - 25));
          b = Math.round(31 + intensity * (246 - 31));
        } else {
          // Blend from charcoal (24, 25, 31) to cool cyan/blue (6, 182, 212)
          const negIntensity = 1 - intensity;
          r = Math.round(24 + negIntensity * (6 - 24));
          g = Math.round(25 + negIntensity * (182 - 25));
          b = Math.round(31 + negIntensity * (212 - 31));
        }

        const idx = (p * numCols + d) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [isDetailView, heatmapData]);

  // SVG dimensions for coordinate calculations
  const svgWidth = 800;
  const svgHeight = 300;
  const svgPadding = 40;
  const chartWidth = svgWidth - svgPadding * 2;
  const chartHeight = svgHeight - svgPadding * 2;

  // Generates the SVG curve points for a given dimension
  const generatePathData = (dimVal: number) => {
    const points: string[] = [];
    const stepCount = 150; // High resolution for smooth vectors
    for (let i = 0; i <= stepCount; i++) {
      const p = (i / stepCount) * (numPositions - 1);
      const val = getInterpolatedPE(p, dimVal, dModel);
      const x = svgPadding + (i / stepCount) * chartWidth;
      const y = svgPadding + chartHeight / 2 - val * (chartHeight / 2);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${points.join(" L ")}`;
  };

  // Convert logical position to SVG x coordinate
  const getXCoordForPosition = (pos: number) => {
    return svgPadding + (pos / (numPositions - 1)) * chartWidth;
  };

  // Convert logical value to SVG y coordinate
  const getYCoordForValue = (val: number) => {
    return svgPadding + chartHeight / 2 - val * (chartHeight / 2);
  };

  // Handle mouse hovering/scrubbing on SVG wave explorer
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, (mouseX - (svgPadding / svgWidth) * rect.width) / ((chartWidth / svgWidth) * rect.width)));
    const pos = Math.max(0, Math.min(numPositions - 1, Math.round(percent * (numPositions - 1))));
    setHoverPosition(pos);
  };

  const handleSvgMouseLeave = () => {
    setHoverPosition(null);
  };

  const handleSvgClick = () => {
    if (hoverPosition !== null) {
      setCurrentPosition(hoverPosition);
    }
  };

  // Heatmap mouse handlers
  const handleHeatmapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const numCols = isDetailView ? 64 : dModel;
    const colIdx = Math.max(0, Math.min(numCols - 1, Math.floor((mouseX / rect.width) * numCols)));
    const rowIdx = Math.max(0, Math.min(numPositions - 1, Math.floor((mouseY / rect.height) * numPositions)));

    setHoverHeatmap({ p: rowIdx, d: colIdx });
  };

  const handleHeatmapMouseLeave = () => {
    setHoverHeatmap(null);
  };

  const handleHeatmapClick = () => {
    if (hoverHeatmap) {
      setCurrentPosition(hoverHeatmap.p);
      if (!isComparisonMode) {
        // Find closest even selector dimension or set exactly
        const closestDim = selectorDimensions.reduce((prev, curr) => 
          Math.abs(curr - hoverHeatmap.d) < Math.abs(prev - hoverHeatmap.d) ? curr : prev
        );
        setActiveDim(closestDim);
      }
    }
  };

  // Token demo configurations
  const tokens = ["The", "king", "attacks", "the", "queen"];

  const activePositionVal = hoverPosition !== null ? hoverPosition : currentPosition;

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 04 · Positional Encoding"
        title="Order, encoded as waves."
        description="Attention by itself treats a sequence as a bag of tokens. To restore order, we add a unique pattern of sines and cosines to each position — a signature the model can decode."
        prev={{ to: "/learn/embeddings", label: "Embeddings" }}
        next={{ to: "/learn/neural-network", label: "Neural Networks" }}
      >
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* Main Visualizations Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* HERO WAVE EXPLORER */}
            <div className="glass-strong rounded-3xl p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Activity className="w-3.5 h-3.5 text-primary/80" />
                    <span>Interactive Wave Explorer</span>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mt-1">
                    {isComparisonMode ? "Dimension Frequency Comparison" : `Dimension ${activeDim} Waveform`}
                  </h3>
                </div>

                {/* Mode Selector */}
                <div className="flex p-0.5 rounded-lg bg-secondary/80 border border-border/40 self-start">
                  <button
                    onClick={() => setIsComparisonMode(false)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      !isComparisonMode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Single Dim
                  </button>
                  <button
                    onClick={() => setIsComparisonMode(true)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      isComparisonMode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Compare Dims
                  </button>
                </div>
              </div>

              {/* The SVG Line Graph */}
              <div className="relative bg-background/30 rounded-2xl border border-border/30 overflow-hidden select-none">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto cursor-crosshair"
                  onMouseMove={handleSvgMouseMove}
                  onMouseLeave={handleSvgMouseLeave}
                  onClick={handleSvgClick}
                >
                  {/* Grid Lines */}
                  <line
                    x1={svgPadding}
                    y1={svgPadding}
                    x2={svgPadding}
                    y2={svgHeight - svgPadding}
                    stroke="var(--color-border)"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />
                  <line
                    x1={svgPadding}
                    y1={svgPadding + chartHeight / 2}
                    x2={svgWidth - svgPadding}
                    y2={svgPadding + chartHeight / 2}
                    stroke="var(--color-border)"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={svgWidth - svgPadding}
                    y1={svgPadding}
                    x2={svgWidth - svgPadding}
                    y2={svgHeight - svgPadding}
                    stroke="var(--color-border)"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />

                  {/* Vertical position indicator lines */}
                  {/* Active Scrubber Line */}
                  <line
                    x1={getXCoordForPosition(currentPosition)}
                    y1={svgPadding}
                    x2={getXCoordForPosition(currentPosition)}
                    y2={svgHeight - svgPadding}
                    className="stroke-primary/50"
                    strokeWidth="1.5"
                  />

                  {/* Hover position Line */}
                  {hoverPosition !== null && (
                    <line
                      x1={getXCoordForPosition(hoverPosition)}
                      y1={svgPadding}
                      x2={getXCoordForPosition(hoverPosition)}
                      y2={svgHeight - svgPadding}
                      className="stroke-primary/30"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Axis Labels */}
                  <text
                    x={svgPadding}
                    y={svgPadding - 10}
                    className="fill-muted-foreground/80 font-mono text-[10px]"
                    textAnchor="middle"
                  >
                    +1.0
                  </text>
                  <text
                    x={svgPadding}
                    y={svgHeight - svgPadding + 15}
                    className="fill-muted-foreground/80 font-mono text-[10px]"
                    textAnchor="middle"
                  >
                    -1.0
                  </text>
                  <text
                    x={svgPadding}
                    y={svgPadding + chartHeight / 2 + 4}
                    className="fill-muted-foreground/50 font-mono text-[10px]"
                    textAnchor="end"
                    dx="-6"
                  >
                    0.0
                  </text>

                  <text
                    x={svgPadding}
                    y={svgHeight - svgPadding + 22}
                    className="fill-muted-foreground/80 font-mono text-[10px]"
                    textAnchor="start"
                  >
                    Pos 0
                  </text>
                  <text
                    x={svgWidth - svgPadding}
                    y={svgHeight - svgPadding + 22}
                    className="fill-muted-foreground/80 font-mono text-[10px]"
                    textAnchor="end"
                  >
                    Pos 255
                  </text>

                  {/* Curve Rendering */}
                  {!isComparisonMode ? (
                    <>
                      {/* Background static reference waves to show contrast */}
                      <path
                        d={generatePathData(0)}
                        fill="none"
                        stroke="oklch(0.82 0.022 220)"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                        strokeDasharray="4 4"
                      />
                      <path
                        d={generatePathData(128)}
                        fill="none"
                        stroke="oklch(0.78 0.025 235)"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                        strokeDasharray="4 4"
                      />
                      <path
                        d={generatePathData(510)}
                        fill="none"
                        stroke="oklch(0.82 0.04 85)"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                        strokeDasharray="4 4"
                      />

                      {/* Active morphing wave path */}
                      <path
                        d={generatePathData(visualDim)}
                        fill="none"
                        stroke="oklch(0.78 0.025 235)"
                        strokeWidth="2.5"
                        className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                      />

                      {/* Highlight Dot for Active Scrubber Position */}
                      <circle
                        cx={getXCoordForPosition(currentPosition)}
                        cy={getYCoordForValue(getInterpolatedPE(currentPosition, visualDim, dModel))}
                        r="5"
                        fill="oklch(0.78 0.025 235)"
                        className="stroke-background border-2"
                        strokeWidth="1.5"
                      />
                    </>
                  ) : (
                    /* Comparison Mode - Display multiple dimensions */
                    compareDims.map((dimVal, index) => (
                      <g key={dimVal}>
                        <path
                          d={generatePathData(dimVal)}
                          fill="none"
                          stroke={compareColors[index]}
                          strokeWidth={2}
                          className="opacity-80 hover:opacity-100 transition-opacity"
                        />
                        {/* Highlight dot on each compared dimension */}
                        <circle
                          cx={getXCoordForPosition(activePositionVal)}
                          cy={getYCoordForValue(encoding(activePositionVal, dimVal, dModel))}
                          r="4"
                          fill={compareColors[index]}
                          className="stroke-background"
                          strokeWidth="1"
                        />
                      </g>
                    ))
                  )}
                </svg>

                {/* Live Tooltip over Wave Explorer */}
                {hoverPosition !== null && (
                  <div
                    className="absolute z-10 glass pointer-events-none p-3 rounded-xl text-xs font-mono space-y-1.5 shadow-xl border border-border/40"
                    style={{
                      left: getXCoordForPosition(hoverPosition) > svgWidth - 210
                        ? `${(getXCoordForPosition(hoverPosition) / svgWidth) * 100 - 28}%`
                        : `${(getXCoordForPosition(hoverPosition) / svgWidth) * 100 + 2}%`,
                      top: "12%",
                    }}
                  >
                    <div className="text-[10px] text-muted-foreground border-b border-border/30 pb-1 flex justify-between gap-4">
                      <span>Position: {hoverPosition}</span>
                      <span className="text-primary/70">Click to Lock</span>
                    </div>
                    {!isComparisonMode ? (
                      <div>
                        <div className="text-foreground font-semibold flex items-center justify-between gap-6">
                          <span>dim {activeDim}:</span>
                          <span className="text-gradient">
                            {encoding(hoverPosition, activeDim, dModel).toFixed(5)}
                          </span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1">
                          PE(p, d) = {activeDim % 2 === 0 ? "sin" : "cos"}(p / 10000^({Math.floor(activeDim / 2) * 2}/512))
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {compareDims.map((dimVal, idx) => (
                          <div key={dimVal} className="flex items-center justify-between gap-6">
                            <span style={{ color: compareColors[idx] }}>dim {dimVal}:</span>
                            <span className="text-foreground">
                              {encoding(hoverPosition, dimVal, dModel).toFixed(4)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dimension Selector (For Single Wave Mode) */}
              {!isComparisonMode && (
                <div className="mt-5 border-t border-border/20 pt-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary/70" />
                    <span>Select Dimension to Morph Waveform</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {selectorDimensions.map((d) => (
                      <button
                        key={d}
                        onClick={() => setActiveDim(d)}
                        className={`py-2 px-3 text-xs font-mono rounded-xl border transition-all ${
                          activeDim === d
                            ? "bg-primary/10 border-primary text-primary font-medium ring-1 ring-primary/20 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                            : "bg-secondary/40 border-border/30 hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        dim {d === 510 ? "512" : d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dimension Legend (For Comparison Mode) */}
              {isComparisonMode && (
                <div className="mt-5 border-t border-border/20 pt-4 flex flex-wrap gap-4 items-center justify-center sm:justify-start">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Legend:</div>
                  <div className="flex flex-wrap gap-3">
                    {compareDims.map((dimVal, idx) => (
                      <div
                        key={dimVal}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-border/30 bg-secondary/20 text-xs font-mono"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: compareColors[idx] }}
                        />
                        <span className="text-foreground">dim {dimVal === 510 ? "512" : dimVal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* LIVE TOKEN DEMONSTRATION */}
            <div className="glass-strong rounded-3xl p-5 relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
                <Sparkles className="w-3.5 h-3.5 text-primary/80" />
                <span>Live Sequence Positional Signature</span>
              </div>

              {/* Tokens row */}
              <div className="grid grid-cols-5 gap-3">
                {tokens.map((token, idx) => {
                  const isActive = activePositionVal === idx;
                  const isHovered = activeTokenIdx === idx;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => {
                        setActiveTokenIdx(idx);
                        setHoverPosition(idx);
                      }}
                      onMouseLeave={() => {
                        setActiveTokenIdx(null);
                        setHoverPosition(null);
                      }}
                      onClick={() => setCurrentPosition(idx)}
                      className={`cursor-pointer group flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        isActive
                          ? "bg-primary/15 border-primary shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-[1.02]"
                          : isHovered
                          ? "bg-secondary/70 border-primary/30"
                          : "bg-secondary/20 border-border/20"
                      }`}
                    >
                      <div className="text-[10px] font-mono text-muted-foreground/60 mb-2">Pos {idx}</div>
                      <div className={`text-sm sm:text-base font-medium tracking-wide ${
                        isActive ? "text-primary font-bold" : "text-foreground group-hover:text-primary/80"
                      }`}>
                        {token}
                      </div>

                      {/* Micro-heatmap representation of the first 16 dimensions */}
                      <div className="w-full mt-3 flex gap-[1px] h-3.5 rounded-md overflow-hidden bg-background/50 p-[1px] border border-border/20">
                        {Array.from({ length: 16 }).map((_, d) => {
                          const val = encoding(idx, d, dModel);
                          const intensity = (val + 1) / 2;
                          const bg = val >= 0
                            ? `rgba(139, 92, 246, ${0.15 + intensity * 0.85})`
                            : `rgba(6, 182, 212, ${0.15 + (1 - intensity) * 0.85})`;
                          return (
                            <div
                              key={d}
                              className="flex-1 h-full rounded-[1px] transition-transform duration-200 hover:scale-y-125"
                              style={{ backgroundColor: bg }}
                              title={`dim ${d}: ${val.toFixed(3)}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Token Vector Popover Display */}
              <div className="mt-4 bg-background/30 border border-border/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-secondary/80 text-primary font-mono text-xs font-bold border border-border/30">
                    Pos {activePositionVal}
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Active Token</h4>
                    <p className="text-sm font-semibold text-foreground">
                      "{tokens[activePositionVal] || `Custom Position`}"
                    </p>
                  </div>
                </div>

                {/* PE Vector preview values */}
                <div className="flex-1 max-w-md font-mono text-[11px] text-muted-foreground flex gap-1 items-center justify-end overflow-hidden">
                  <span className="text-foreground/60 select-none">Vector:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto bg-background/50 border border-border/30 rounded-lg px-2.5 py-1.5 scrollbar-thin">
                    {Array.from({ length: 6 }).map((_, d) => {
                      const val = encoding(activePositionVal, d, dModel);
                      const isEven = d % 2 === 0;
                      return (
                        <div key={d} className="flex items-center gap-0.5 whitespace-nowrap">
                          <span className={isEven ? "text-primary/70" : "text-cyan-400/70"}>
                            {isEven ? "sin" : "cos"}
                          </span>
                          <span className="text-foreground font-medium">
                            {val.toFixed(3)}
                          </span>
                          {d < 5 && <span className="text-muted-foreground/30">,</span>}
                        </div>
                      );
                    })}
                    <span className="text-muted-foreground/50">...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HEATMAP VISUALIZATION */}
            <div className="glass-strong rounded-3xl p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Grid className="w-3.5 h-3.5 text-primary/80" />
                    <span>Encoding Heatmap Visualization</span>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mt-1">
                    Matrix Signature (Position × Dimension)
                  </h3>
                </div>

                {/* Detail View Selector */}
                <div className="flex p-0.5 rounded-lg bg-secondary/80 border border-border/40 self-start">
                  <button
                    onClick={() => setIsDetailView(false)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      !isDetailView
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Full View (0-512)
                  </button>
                  <button
                    onClick={() => setIsDetailView(true)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      isDetailView
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Detail View (0-64)
                  </button>
                </div>
              </div>

              {/* Heatmap Area with Grid Axes */}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 select-none">
                
                {/* Y-axis Ruler (Position) */}
                <div className="flex flex-col justify-between text-[10px] font-mono text-muted-foreground/60 w-10 text-right py-4 pr-1 border-r border-border/20">
                  <span>Pos 0</span>
                  <span>Pos 64</span>
                  <span>Pos 128</span>
                  <span>Pos 192</span>
                  <span>Pos 255</span>
                </div>

                {/* Heatmap Container */}
                <div className="relative border border-border/40 rounded-xl overflow-hidden bg-background/30">
                  
                  {/* The Canvas */}
                  <div
                    className="relative w-full aspect-[2/1] overflow-hidden"
                    onMouseMove={handleHeatmapMouseMove}
                    onMouseLeave={handleHeatmapMouseLeave}
                    onClick={handleHeatmapClick}
                  >
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full"
                      style={{ imageRendering: "pixelated" }}
                    />

                    {/* Interactive Highlights (HTML Overlays for optimal performance) */}
                    
                    {/* Active Scrubber Position Line (Horizontal) */}
                    <div
                      className="absolute left-0 right-0 h-[1.5px] bg-primary/60 pointer-events-none shadow-[0_0_6px_rgba(139,92,246,0.6)]"
                      style={{
                        top: `${(currentPosition / numPositions) * 100}%`,
                        transform: "translateY(-50%)",
                      }}
                    />

                    {/* Hover state crosshairs */}
                    {hoverHeatmap && (
                      <>
                        {/* Horizontal hover line */}
                        <div
                          className="absolute left-0 right-0 h-[1px] border-t border-dashed border-primary/40 pointer-events-none"
                          style={{
                            top: `${(hoverHeatmap.p / numPositions) * 100}%`,
                          }}
                        />
                        {/* Vertical hover line */}
                        <div
                          className="absolute top-0 bottom-0 w-[1px] border-l border-dashed border-primary/40 pointer-events-none"
                          style={{
                            left: `${(hoverHeatmap.d / (isDetailView ? 64 : dModel)) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Heatmap Cursor details (floating box) */}
                  {hoverHeatmap && (
                    <div
                      className="absolute z-20 glass pointer-events-none p-3 rounded-xl text-xs font-mono space-y-1 shadow-lg border border-primary/30"
                      style={{
                        left: `${(hoverHeatmap.d / (isDetailView ? 64 : dModel)) * 100 > 70 
                          ? ((hoverHeatmap.d / (isDetailView ? 64 : dModel)) * 100) - 26 
                          : ((hoverHeatmap.d / (isDetailView ? 64 : dModel)) * 100) + 2}%`,
                        top: `${(hoverHeatmap.p / numPositions) * 100 > 60
                          ? ((hoverHeatmap.p / numPositions) * 100) - 34
                          : ((hoverHeatmap.p / numPositions) * 100) + 4}%`,
                      }}
                    >
                      <div className="text-[10px] text-muted-foreground border-b border-border/20 pb-0.5">
                        PE Matrix Cell
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Position (p):</span>
                        <span className="text-foreground font-semibold">{hoverHeatmap.p}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Dimension (d):</span>
                        <span className="text-foreground font-semibold">
                          {hoverHeatmap.d}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-border/20 pt-0.5">
                        <span>Value:</span>
                        <span className="text-gradient font-bold">
                          {heatmapData[hoverHeatmap.p * dModel + hoverHeatmap.d].toFixed(5)}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground/60 text-right pt-0.5 italic">
                        Click to Select
                      </div>
                    </div>
                  )}
                </div>

                {/* X-axis Ruler (Dimension) */}
                <div /> {/* blank spacer for alignment */}
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60 pt-1 border-t border-border/20">
                  <span>Dim 0</span>
                  {isDetailView ? (
                    <>
                      <span>Dim 16</span>
                      <span>Dim 32</span>
                      <span>Dim 48</span>
                      <span>Dim 63</span>
                    </>
                  ) : (
                    <>
                      <span>Dim 128</span>
                      <span>Dim 256</span>
                      <span>Dim 384</span>
                      <span>Dim 511</span>
                    </>
                  )}
                </div>
              </div>

              {/* Color Gradient Legend Bar */}
              <div className="mt-5 border-t border-border/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Info className="w-3.5 h-3.5 text-primary/70" />
                  <span>Diverging OKLCH colors represent encoding values (-1 to +1)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-cyan-400">-1.0 (cos/sin min)</span>
                  <div className="w-36 h-3 rounded bg-gradient-to-r from-cyan-500 via-secondary/70 to-violet-500 border border-border/30" />
                  <span className="font-mono text-[10px] text-primary">+1.0 (cos/sin max)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Panel Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* POSITION SCRUBBER */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <Sliders className="w-3.5 h-3.5 text-primary/80" />
                  <span>Sequence Scrubber</span>
                </div>
                <div className="text-sm font-mono text-gradient font-bold">
                  {currentPosition} / 255
                </div>
              </div>

              <Slider
                min={0}
                max={255}
                step={1}
                value={[currentPosition]}
                onValueChange={(val) => setCurrentPosition(val[0])}
                className="my-3 py-1 cursor-ew-resize"
              />

              <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                Drag the scrubber to inspect how the encoding signature changes. As positions progress from 0 to 255, waves with varying frequencies blend to form a unique vector key.
              </p>
            </div>

            {/* DIMENSION DETAILS */}
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-primary/80" />
                <span>Vector Coordinates at Position {currentPosition}</span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                {selectorDimensions.map((d) => {
                  const val = encoding(currentPosition, d, dModel);
                  const isEven = d % 2 === 0;
                  return (
                    <div
                      key={d}
                      onClick={() => setActiveDim(d)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                        activeDim === d
                          ? "bg-primary/5 border-primary/50 text-foreground"
                          : "bg-background/20 border-border/10 hover:border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-semibold text-[11px]">dim {d === 510 ? "512" : d}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/60">
                          {isEven ? "sin" : "cos"}({currentPosition} / 10000^({Math.floor(d/2)*2}/512))
                        </span>
                        <span className="font-bold text-foreground">
                          {val.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* THE FORMULA */}
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                The Formula
              </div>
              <div className="space-y-2 font-mono text-[13px] text-foreground/80 bg-background/50 p-3.5 border border-border/20 rounded-xl">
                <div className="flex items-center gap-1">
                  <span className="text-primary font-semibold">PE</span>
                  <span>(pos, 2i) =</span>
                  <span className="text-gradient font-bold">sin</span>
                  <span>(pos / 10000<sup>2i/d</sup>)</span>
                </div>
                <div className="flex items-center gap-1 border-t border-border/15 pt-2">
                  <span className="text-primary font-semibold">PE</span>
                  <span>(pos, 2i+1) =</span>
                  <span className="text-cyan-400 font-bold">cos</span>
                  <span>(pos / 10000<sup>2i/d</sup>)</span>
                </div>
              </div>
              <p className="mt-3.5 text-xs text-muted-foreground leading-relaxed">
                Low-frequency waves (high dimensions) capture coarse-grained sequence position, while high-frequency waves (low dimensions) capture fine-grained coordinates. Together, their combination gives every single index a unique fingerprint.
              </p>
            </div>

          </div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}
