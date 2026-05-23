import { createFileRoute } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/neural-network")({
  head: () => ({
    meta: [
      { title: "Neural Networks - Latent" },
      {
        name: "description",
        content:
          "Build intuition for how layers of artificial neurons compose to form a model. Tune the architecture and watch activations flow.",
      },
      { property: "og:title", content: "Neural Networks - Latent" },
      {
        property: "og:description",
        content: "Interactive 3D neural network with live activation flow.",
      },
    ],
  }),
  component: Page,
});

type Phase = "forward" | "loss" | "backward" | "update";
type HoverTarget =
  | { type: "neuron"; layer: number; index: number }
  | { type: "weight"; layer: number; from: number; to: number }
  | null;

const INPUT = [0.82, 0.28, 0.64, 0.16];
const TARGET = [1, 0, 0];
const LABELS = ["positive", "neutral", "negative"];
const easeSmooth = [0.22, 1, 0.36, 1] as const;

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exp = values.map((v) => Math.exp(v - max));
  const sum = exp.reduce((acc, v) => acc + v, 0);
  return exp.map((v) => v / sum);
}

function layerName(index: number, count: number) {
  if (index === 0) return "Input layer";
  if (index === count - 1) return "Output layer";
  return `Hidden layer ${index}`;
}

function segmentPulse(
  elapsed: number,
  phase: Phase,
  segment: number,
  totalSegments: number,
  speed: number,
) {
  if (phase === "loss") return { intensity: 0, progress: 1 };
  if (phase === "update") {
    const wave = (Math.sin(elapsed * speed * 2.8 + segment * 0.42) + 1) / 2;
    return { intensity: 0.35 + wave * 0.65, progress: wave };
  }

  const order = phase === "forward" ? segment : totalSegments - 1 - segment;
  const timeline = (elapsed * speed * 0.85) % (totalSegments + 0.9);
  const local = timeline - order;
  const inWindow = local >= 0 && local <= 1;
  const progress = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(local, 0, 1), 0, 1);
  const intensity = inWindow ? Math.sin(progress * Math.PI) : 0;
  return { intensity, progress };
}

function layerPulse(
  elapsed: number,
  phase: Phase,
  layer: number,
  totalLayers: number,
  speed: number,
) {
  if (phase === "loss") return layer === totalLayers - 1 ? 1 : 0.12;
  if (phase === "update") return 0.55;
  const totalSegments = totalLayers - 1;
  const order = phase === "forward" ? layer : totalLayers - 1 - layer;
  const timeline = (elapsed * speed * 0.85) % (totalSegments + 0.9);
  const distance = Math.abs(timeline - order);
  return THREE.MathUtils.clamp(1 - distance, 0, 1);
}

function useLayers(sizes: number[]) {
  return useMemo(() => {
    const xs = sizes.map((_, i) => (i - (sizes.length - 1) / 2) * 1.85);
    return sizes.map((n, li) => {
      const gap = n > 6 ? 0.43 : 0.56;
      return Array.from({ length: n }, (_, i) => {
        const y = (i - (n - 1) / 2) * gap;
        const z = li === 0 || li === sizes.length - 1 ? 0 : li % 2 ? 0.16 : -0.16;
        return [xs[li], y, z] as [number, number, number];
      });
    });
  }, [sizes]);
}

function useNetwork(sizes: number[], learningStep: number) {
  return useMemo(() => {
    const baseWeights = sizes.slice(0, -1).map((fromSize, layer) =>
      Array.from({ length: fromSize }, (_, from) =>
        Array.from({ length: sizes[layer + 1] }, (_, to) => {
          const raw = Math.sin((layer + 1) * 1.7 + (from + 1) * 2.31 - (to + 1) * 1.43);
          return raw * 0.9;
        }),
      ),
    );
    const baseBiases = sizes
      .slice(1)
      .map((size, layer) =>
        Array.from({ length: size }, (_, i) => Math.cos((layer + 1) * 1.21 + i * 0.81) * 0.16),
      );

    const forward = (weights: number[][][], biases: number[][]) => {
      const activations = [INPUT.slice()];
      const zValues: number[][] = [];
      for (let l = 0; l < weights.length; l++) {
        const previous = activations[l];
        const z = biases[l].map((bias, to) =>
          previous.reduce((sum, a, from) => sum + a * weights[l][from][to], bias),
        );
        zValues.push(z);
        activations.push(l === weights.length - 1 ? softmax(z) : z.map(sigmoid));
      }
      return { activations, zValues };
    };

    const first = forward(baseWeights, baseBiases);
    const deltas = new Array(sizes.length) as number[][];
    deltas[sizes.length - 1] = first.activations.at(-1)!.map((a, i) => a - TARGET[i]);
    for (let l = sizes.length - 2; l > 0; l--) {
      deltas[l] = first.activations[l].map((a, i) => {
        const downstream = deltas[l + 1].reduce(
          (sum, delta, to) => sum + delta * baseWeights[l][i][to],
          0,
        );
        return downstream * a * (1 - a);
      });
    }
    deltas[0] = INPUT.map(() => 0);

    const gradients = baseWeights.map((matrix, l) =>
      matrix.map((row, from) => row.map((_, to) => first.activations[l][from] * deltas[l + 1][to])),
    );

    const lr = 0.55;
    const improvement = Math.min(learningStep, 12) / 12;
    const weights = baseWeights.map((matrix, l) =>
      matrix.map((row, from) => row.map((w, to) => w - gradients[l][from][to] * lr * improvement)),
    );
    const biases = baseBiases.map((row, l) =>
      row.map((b, i) => b - deltas[l + 1][i] * lr * improvement),
    );
    const current = forward(weights, biases);
    const loss = -Math.log(Math.max(current.activations.at(-1)![0], 0.0001));

    return {
      weights,
      activations: current.activations,
      deltas,
      gradients,
      loss,
      prediction: current.activations.at(-1)!,
    };
  }, [sizes, learningStep]);
}

function Connection({
  from,
  to,
  weight,
  gradient,
  phase,
  speed,
  segment,
  totalSegments,
  hovered,
  onHover,
}: {
  from: [number, number, number];
  to: [number, number, number];
  weight: number;
  gradient: number;
  phase: Phase;
  speed: number;
  segment: number;
  totalSegments: number;
  hovered: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const pulse = useRef<THREE.Mesh>(null!);
  const pulseMaterial = useRef<THREE.MeshBasicMaterial>(null!);
  const tube = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    return { start, end, midpoint, length, quaternion };
  }, [from, to]);
  const strength = Math.min(Math.abs(weight), 1);
  const gradStrength = Math.min(Math.abs(gradient) * 6, 1);
  const positive = weight >= 0;

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const { intensity, progress } = segmentPulse(
      clock.elapsedTime,
      phase,
      segment,
      totalSegments,
      speed,
    );
    const significantUpdate = phase !== "update" || Math.abs(gradient) > 0.01;
    pulse.current.visible = intensity > 0.04 && significantUpdate;
    if (phase === "update") {
      pulse.current.position.copy(tube.midpoint);
    } else {
      const direction = phase === "backward" ? -1 : 1;
      const mix = direction > 0 ? progress : 1 - progress;
      pulse.current.position.copy(tube.start).lerp(tube.end, mix);
    }
    const scale =
      phase === "backward" || phase === "update"
        ? 0.035 + gradStrength * 0.06
        : 0.035 + strength * 0.05;
    pulse.current.scale.setScalar(scale);
    if (pulseMaterial.current) {
      pulseMaterial.current.opacity = (phase === "update" ? 0.72 : 0.95) * intensity;
    }
  });

  return (
    <group>
      <mesh
        position={tube.midpoint}
        quaternion={tube.quaternion}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
      >
        <cylinderGeometry args={[0.075, 0.075, tube.length, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh
        position={tube.midpoint}
        quaternion={tube.quaternion}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
      >
        <cylinderGeometry
          args={[0.012 + strength * 0.01, 0.012 + strength * 0.01, tube.length, 8]}
        />
        <meshBasicMaterial
          color={positive ? "#8ea0b8" : "#c8b28c"}
          transparent
          opacity={hovered ? 0.58 : 0.14 + strength * 0.18}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          ref={pulseMaterial}
          color={phase === "backward" || phase === "update" ? "#d8c48f" : "#b8c7dd"}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Neuron({
  position,
  activation,
  delta,
  layer,
  index,
  selected,
  phase,
  speed,
  totalLayers,
  onHover,
}: {
  position: [number, number, number];
  activation: number;
  delta: number;
  layer: number;
  index: number;
  selected: boolean;
  phase: Phase;
  speed: number;
  totalLayers: number;
  onHover: (hovered: boolean) => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phaseActivity = layerPulse(clock.elapsedTime, phase, layer, totalLayers, speed);
    const target = 0.15 + activation * 0.18 + phaseActivity * 0.05 + (selected ? 0.08 : 0);
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, target, 0.15));
    ref.current.position.y =
      position[1] + phaseActivity * Math.sin(clock.elapsedTime * 2.4 + index + layer) * 0.015;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      0.22 + activation * 1.1 + phaseActivity * 0.7 + (selected ? 0.65 : 0),
      0.12,
    );
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
      >
        <sphereGeometry args={[1, 28, 28]} />
        <meshStandardMaterial
          color={layer === 0 ? "#94a3b8" : layer > 0 && delta < -0.02 ? "#b7c4d9" : "#aeb8c8"}
          emissive={delta < -0.02 ? "#9fb3cc" : "#6f7f94"}
          emissiveIntensity={0.55}
          metalness={0.45}
          roughness={0.28}
        />
      </mesh>
      {selected && (
        <Html center distanceFactor={8} position={[0, 0.36, 0]}>
          <div className="rounded-lg glass px-2 py-1 text-[11px] text-foreground/90 shadow-xl">
            a={activation.toFixed(2)}
          </div>
        </Html>
      )}
    </group>
  );
}

function LayerLabels({ layers, sizes }: { layers: [number, number, number][][]; sizes: number[] }) {
  return (
    <>
      {layers.map((row, index) => {
        const x = row[0]?.[0] ?? 0;
        const top = Math.max(...row.map((p) => p[1])) + 0.58;
        return (
          <Html
            key={index}
            center
            distanceFactor={8}
            position={[x, top, 0.18]}
            style={{ pointerEvents: "none" }}
          >
            <div className="whitespace-nowrap rounded-full glass px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-foreground/80">
              {layerName(index, sizes.length)}
            </div>
          </Html>
        );
      })}
    </>
  );
}

function NeuralScene({
  sizes,
  layers,
  network,
  phase,
  speed,
  hovered,
  setHovered,
}: {
  sizes: number[];
  layers: [number, number, number][][];
  network: ReturnType<typeof useNetwork>;
  phase: Phase;
  speed: number;
  hovered: HoverTarget;
  setHovered: (target: HoverTarget) => void;
}) {
  const totalSegments = sizes.length - 1;

  return (
    <>
      <ambientLight intensity={0.52} />
      <pointLight position={[5, 5, 5]} intensity={1.1} color="#cbd5e1" />
      <pointLight position={[-5, -3, -5]} intensity={0.65} color="#d6c7a5" />
      {layers
        .slice(0, -1)
        .map((row, l) =>
          row.map((from, i) =>
            layers[l + 1].map((to, j) => (
              <Connection
                key={`${l}-${i}-${j}`}
                from={from}
                to={to}
                weight={network.weights[l][i][j]}
                gradient={network.gradients[l][i][j]}
                phase={phase}
                speed={speed}
                segment={l}
                totalSegments={totalSegments}
                hovered={
                  hovered?.type === "weight" &&
                  hovered.layer === l &&
                  hovered.from === i &&
                  hovered.to === j
                }
                onHover={(isHovered) =>
                  setHovered(isHovered ? { type: "weight", layer: l, from: i, to: j } : null)
                }
              />
            )),
          ),
        )}
      {layers.map((row, l) =>
        row.map((position, i) => (
          <Neuron
            key={`${l}-${i}`}
            position={position}
            activation={network.activations[l][i] ?? 0}
            delta={network.deltas[l]?.[i] ?? 0}
            layer={l}
            index={i}
            selected={hovered?.type === "neuron" && hovered.layer === l && hovered.index === i}
            phase={phase}
            speed={speed}
            totalLayers={sizes.length}
            onHover={(isHovered) =>
              setHovered(isHovered ? { type: "neuron", layer: l, index: i } : null)
            }
          />
        )),
      )}
      <LayerLabels layers={layers} sizes={sizes} />
      <Html center position={[0, -2.45, 0]} distanceFactor={8}>
        <div className="rounded-full glass px-10 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {phase === "forward" && "forward pass: activations move left to right"}
          {phase === "loss" && "loss: prediction is compared with target"}
          {phase === "backward" && "backprop: gradients move right to left"}
          {phase === "update" && "update: weights shift opposite the gradient"}
        </div>
      </Html>
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.16}
        dampingFactor={0.065}
        enableDamping
        maxDistance={14}
        minDistance={5}
      />
    </>
  );
}

function Page() {
  const [hidden, setHidden] = useState(2);
  const [width, setWidth] = useState(5);
  const [speed, setSpeed] = useState(0.8);
  const [phase, setPhase] = useState<Phase>("forward");
  const [learningStep, setLearningStep] = useState(0);
  const [hovered, setHovered] = useState<HoverTarget>(null);

  const sizes = useMemo(() => {
    const arr = [4];
    for (let i = 0; i < hidden; i++) arr.push(width);
    arr.push(3);
    return arr;
  }, [hidden, width]);
  const layers = useLayers(sizes);
  const network = useNetwork(sizes, learningStep);
  const totalParams = useMemo(() => {
    let p = 0;
    for (let i = 0; i < sizes.length - 1; i++) p += sizes[i] * sizes[i + 1] + sizes[i + 1];
    return p;
  }, [sizes]);
  const confidence = Math.max(...network.prediction);
  const predicted = network.prediction.indexOf(confidence);
  const hoverText = getHoverText(hovered, network, sizes);

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 05 - Neural Networks"
        title="A choir of simple cells."
        description="A neural network is just layers of tiny functions: each neuron takes weighted inputs, adds a bias, applies a nonlinearity, and passes the result forward. Backpropagation sends error gradients backward so the weights can improve."
        prev={{ to: "/learn/embeddings", label: "Embeddings" }}
        next={{ to: "/learn/attention", label: "Attention" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
          <div className="relative aspect-[5/4] rounded-3xl glass-strong overflow-hidden ring-glow">
            <Suspense fallback={<div className="h-full w-full animate-shimmer" />}>
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0.15, 8.8], fov: 50 }}
                gl={{
                  alpha: true,
                  antialias: true,
                  depth: true,
                  powerPreference: "high-performance",
                  stencil: false,
                }}
                performance={{ min: 0.7, max: 1, debounce: 250 }}
              >
                <NeuralScene
                  sizes={sizes}
                  layers={layers}
                  network={network}
                  phase={phase}
                  speed={speed}
                  hovered={hovered}
                  setHovered={setHovered}
                />
              </Canvas>
            </Suspense>
            <div className="absolute left-4 top-4 flex flex-wrap gap-1.5 max-w-[80%]">
              {sizes.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full glass px-2 py-0.5 text-[11px] font-mono text-foreground/80"
                >
                  {i === 0 ? "input" : i === sizes.length - 1 ? "output" : `h${i}`} | {s}
                </span>
              ))}
            </div>
            <div className="absolute right-4 bottom-4 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground">
              params | {totalParams.toLocaleString()}
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Learning cycle
                  </div>
                  <div className="mt-1 text-sm text-foreground/80">{phaseLabel(phase)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">loss</div>
                  <div className="font-mono text-lg text-gradient">{network.loss.toFixed(3)}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1.5">
                {(["forward", "loss", "backward", "update"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPhase(p)}
                    className={`rounded-lg px-2 py-2 text-[11px] transition-colors ${
                      phase === p
                        ? "bg-white/10 text-foreground"
                        : "bg-white/[0.03] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    setPhase((p) =>
                      p === "forward"
                        ? "loss"
                        : p === "loss"
                          ? "backward"
                          : p === "backward"
                            ? "update"
                            : "forward",
                    )
                  }
                  className="flex-1 rounded-xl bg-aurora px-3 py-2 text-sm font-medium text-white transition-shadow hover:shadow-[0_12px_40px_-14px_oklch(0.78_0.025_235/0.75)]"
                >
                  Step phase
                </button>
                <button
                  onClick={() => {
                    setLearningStep((v) => v + 1);
                    setPhase("forward");
                  }}
                  className="rounded-xl glass px-3 py-2 text-sm font-medium hover:bg-white/[0.05] transition-colors"
                >
                  Train once
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Output probabilities
              </div>
              <div className="mt-3 space-y-2">
                {network.prediction.map((v, i) => (
                  <div key={LABELS[i]}>
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={i === predicted ? "text-foreground" : "text-muted-foreground"}
                      >
                        {LABELS[i]}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {(v * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full bg-aurora"
                        animate={{ width: `${v * 100}%` }}
                        transition={{ duration: 0.42, ease: easeSmooth }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Slider label="Hidden layers" value={hidden} min={1} max={5} onChange={setHidden} />
            <Slider label="Layer width" value={width} min={2} max={9} onChange={setWidth} />
            <Slider
              label="Signal speed"
              value={Math.round(speed * 10)}
              min={3}
              max={20}
              onChange={(v) => setSpeed(v / 10)}
              format={(v) => `${(v / 10).toFixed(1)}x`}
            />

            <div className="glass rounded-2xl p-5 min-h-[112px]">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Inspect
              </div>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{hoverText}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Forward pass",
              body: "Inputs move left to right. Each neuron computes a weighted sum, adds a bias, applies a sigmoid activation in hidden layers, and the output layer becomes probabilities with softmax.",
            },
            {
              title: "Backward pass",
              body: "The target is compared with the prediction. Output error is propagated right to left through the same weights, scaled by each hidden neuron's activation derivative.",
            },
            {
              title: "Weight update",
              body: "Each connection receives a gradient: previous activation multiplied by downstream error. Gradient descent nudges weights opposite that gradient to reduce loss.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, ease: easeSmooth }}
              className="glass rounded-2xl p-5"
            >
              <div className="text-sm font-medium">{item.title}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </ModuleLayout>
    </PageShell>
  );
}

function getHoverText(
  hovered: HoverTarget,
  network: ReturnType<typeof useNetwork>,
  sizes: number[],
) {
  if (!hovered) {
    return "Hover or tap a neuron or connection to inspect activations, weights, and gradients.";
  }
  if (hovered.type === "neuron") {
    const activation = network.activations[hovered.layer][hovered.index] ?? 0;
    const delta = network.deltas[hovered.layer]?.[hovered.index] ?? 0;
    return `${layerName(hovered.layer, sizes.length)} neuron ${hovered.index + 1}: activation ${activation.toFixed(
      3,
    )}, error signal ${delta.toFixed(3)}.`;
  }
  const weight = network.weights[hovered.layer][hovered.from][hovered.to];
  const gradient = network.gradients[hovered.layer][hovered.from][hovered.to];
  return `Weight from ${layerName(hovered.layer, sizes.length)} neuron ${hovered.from + 1} to ${layerName(
    hovered.layer + 1,
    sizes.length,
  )} neuron ${hovered.to + 1}: w=${weight.toFixed(3)}, gradient=${gradient.toFixed(3)}.`;
}

function phaseLabel(phase: Phase) {
  if (phase === "forward") return "Activations propagate from inputs to outputs.";
  if (phase === "loss") return "Prediction is compared with the target class.";
  if (phase === "backward") return "Gradients propagate from outputs back through hidden layers.";
  return "Weights move opposite the gradient to reduce future loss.";
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
        <div className="text-sm font-mono text-gradient">{format ? format(value) : value}</div>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-3 w-full accent-[color:var(--glow-violet)]"
      />
    </div>
  );
}
