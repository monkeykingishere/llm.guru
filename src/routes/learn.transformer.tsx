import { createFileRoute } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, Text } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/transformer")({
  head: () => ({
    meta: [
      { title: "Transformer Architecture - Latent" },
      {
        name: "description",
        content:
          "Explore the original encoder-decoder Transformer architecture with integrated sinusoidal positional encoding and precise tensor flow.",
      },
      { property: "og:title", content: "Transformer Architecture - Latent" },
      {
        property: "og:description",
        content: "Interactive 3D Transformer architecture visualization.",
      },
    ],
  }),
  component: Page,
});

type NodeId =
  | "inputs"
  | "inputEmbedding"
  | "encoderPosition"
  | "encoderAdd"
  | "encoderSelfAttention"
  | "encoderNorm1"
  | "encoderFeedForward"
  | "encoderNorm2"
  | "shiftedOutputs"
  | "outputEmbedding"
  | "decoderPosition"
  | "decoderAdd"
  | "decoderMaskedAttention"
  | "decoderNorm1"
  | "decoderCrossAttention"
  | "decoderNorm2"
  | "decoderFeedForward"
  | "decoderNorm3"
  | "linear"
  | "softmax"
  | "probabilities";

type FlowKind = "main" | "position" | "residual" | "cross" | "output";

type NodeSpec = {
  id: NodeId;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  detail: string;
  formula?: string;
};

const easeSmooth = [0.22, 1, 0.36, 1] as const;
const modelDim = 16;
const sequenceLength = 10;

const NODE_COLORS = {
  embedding: "#E2B870", // sleek warm copper/gold
  position: "#00F0FF", // neon cyan
  attention: "#8B5CF6", // electric violet
  norm: "#64748B", // steel slate
  feedForward: "#F59E0B", // vibrant amber
  output: "#3B82F6", // cyber blue
  softmax: "#10B981", // emerald
  terminal: "#475569", // dark steel
};

const NODES: NodeSpec[] = [
  {
    id: "inputs",
    label: "Inputs",
    position: [-2.45, -5.0, 0],
    size: [1.55, 0.28, 0.18],
    color: NODE_COLORS.terminal,
    detail: "Source tokens enter the encoder branch in sequence order.",
  },
  {
    id: "inputEmbedding",
    label: "Input\nEmbedding",
    position: [-2.45, -4.2, 0],
    size: [1.45, 0.58, 0.28],
    color: NODE_COLORS.embedding,
    detail: "Token ids are looked up as dense vectors E[token].",
  },
  {
    id: "encoderPosition",
    label: "Positional\nEncoding",
    position: [-3.95, -3.4, 0.12],
    size: [1.45, 0.58, 0.28],
    color: NODE_COLORS.position,
    formula: "PE(pos,2i)=sin(pos/10000^(2i/d))",
    detail:
      "A deterministic sinusoidal vector is generated for each input position inside the Transformer pipeline.",
  },
  {
    id: "encoderAdd",
    label: "+",
    position: [-2.45, -3.4, 0],
    size: [0.48, 0.48, 0.2],
    color: NODE_COLORS.position,
    detail: "Vector addition fuses token embedding and positional signal: x = E[token] + PE[pos].",
  },
  {
    id: "encoderSelfAttention",
    label: "Multi-Head\nAttention",
    position: [-2.45, -2.2, 0],
    size: [1.58, 0.7, 0.36],
    color: NODE_COLORS.attention,
    detail: "Encoder self-attention mixes every input position through parallel Q/K/V heads.",
  },
  {
    id: "encoderNorm1",
    label: "Add & Norm",
    position: [-2.45, -1.2, 0],
    size: [1.58, 0.34, 0.32],
    color: NODE_COLORS.norm,
    detail: "The attention output is added to its residual stream and normalized.",
  },
  {
    id: "encoderFeedForward",
    label: "Feed\nForward",
    position: [-2.45, -0.2, 0],
    size: [1.58, 0.72, 0.36],
    color: NODE_COLORS.feedForward,
    detail: "A position-wise MLP transforms each encoder position independently.",
  },
  {
    id: "encoderNorm2",
    label: "Add & Norm",
    position: [-2.45, 0.8, 0],
    size: [1.58, 0.34, 0.32],
    color: NODE_COLORS.norm,
    detail: "The feed-forward result rejoins the residual stream and is layer-normalized.",
  },
  {
    id: "shiftedOutputs",
    label: "Outputs\nshifted right",
    position: [2.45, -5.0, 0],
    size: [1.65, 0.34, 0.18],
    color: NODE_COLORS.terminal,
    detail: "Training-time decoder inputs are previous target tokens shifted right.",
  },
  {
    id: "outputEmbedding",
    label: "Output\nEmbedding",
    position: [2.45, -4.2, 0],
    size: [1.45, 0.58, 0.28],
    color: NODE_COLORS.embedding,
    detail: "Decoder token ids are embedded before causal attention.",
  },
  {
    id: "decoderPosition",
    label: "Positional\nEncoding",
    position: [3.95, -3.4, 0.12],
    size: [1.45, 0.58, 0.28],
    color: NODE_COLORS.position,
    formula: "PE(pos,2i+1)=cos(pos/10000^(2i/d))",
    detail:
      "The decoder branch receives the same sinusoidal position basis before masked attention.",
  },
  {
    id: "decoderAdd",
    label: "+",
    position: [2.45, -3.4, 0],
    size: [0.48, 0.48, 0.2],
    color: NODE_COLORS.position,
    detail: "Decoder embeddings are position-aware before any attention operation.",
  },
  {
    id: "decoderMaskedAttention",
    label: "Masked\nMulti-Head\nAttention",
    position: [2.45, -2.2, 0],
    size: [1.68, 0.82, 0.36],
    color: NODE_COLORS.attention,
    detail: "Causal self-attention prevents each target position from seeing future target tokens.",
  },
  {
    id: "decoderNorm1",
    label: "Add & Norm",
    position: [2.45, -1.2, 0],
    size: [1.58, 0.34, 0.32],
    color: NODE_COLORS.norm,
    detail: "The masked attention sublayer is added back to the decoder residual stream.",
  },
  {
    id: "decoderCrossAttention",
    label: "Multi-Head\nAttention",
    position: [2.45, 0.8, 0],
    size: [1.68, 0.72, 0.36],
    color: NODE_COLORS.attention,
    detail:
      "Decoder queries attend to encoder keys and values, carrying source context into generation.",
  },
  {
    id: "decoderNorm2",
    label: "Add & Norm",
    position: [2.45, 1.8, 0],
    size: [1.58, 0.34, 0.32],
    color: NODE_COLORS.norm,
    detail: "Cross-attention output is added and normalized.",
  },
  {
    id: "decoderFeedForward",
    label: "Feed\nForward",
    position: [2.45, 2.8, 0],
    size: [1.58, 0.72, 0.36],
    color: NODE_COLORS.feedForward,
    detail: "A position-wise MLP refines each decoder vector before output projection.",
  },
  {
    id: "decoderNorm3",
    label: "Add & Norm",
    position: [2.45, 3.8, 0],
    size: [1.58, 0.34, 0.32],
    color: NODE_COLORS.norm,
    detail: "The final decoder residual merge and normalization completes one block.",
  },
  {
    id: "linear",
    label: "Linear",
    position: [2.45, 4.7, 0],
    size: [1.45, 0.32, 0.28],
    color: NODE_COLORS.output,
    detail: "The decoder state is projected to vocabulary logits.",
  },
  {
    id: "softmax",
    label: "Softmax",
    position: [2.45, 5.4, 0],
    size: [1.45, 0.32, 0.28],
    color: NODE_COLORS.softmax,
    detail: "Logits are normalized into next-token probabilities.",
  },
  {
    id: "probabilities",
    label: "Output\nProbabilities",
    position: [2.45, 6.1, 0],
    size: [1.65, 0.36, 0.18],
    color: NODE_COLORS.terminal,
    detail: "The model emits a probability distribution over the vocabulary.",
  },
];

const nodeMap = Object.fromEntries(NODES.map((node) => [node.id, node])) as Record<
  NodeId,
  NodeSpec
>;

const FLOWS: {
  from: NodeId;
  to: NodeId;
  kind: FlowKind;
  tStart: number;
  tEnd: number;
  bend?: [number, number, number][];
}[] = [
  { from: "inputs", to: "inputEmbedding", kind: "main", tStart: 0.0, tEnd: 0.8 },
  { from: "inputEmbedding", to: "encoderAdd", kind: "main", tStart: 1.4, tEnd: 2.2 },
  { from: "encoderPosition", to: "encoderAdd", kind: "position", tStart: 1.4, tEnd: 2.2 },
  { from: "encoderAdd", to: "encoderSelfAttention", kind: "main", tStart: 2.7, tEnd: 3.5 },
  { from: "encoderSelfAttention", to: "encoderNorm1", kind: "main", tStart: 4.2, tEnd: 4.9 },
  { from: "encoderNorm1", to: "encoderFeedForward", kind: "main", tStart: 5.4, tEnd: 6.2 },
  { from: "encoderFeedForward", to: "encoderNorm2", kind: "main", tStart: 6.9, tEnd: 7.5 },

  { from: "shiftedOutputs", to: "outputEmbedding", kind: "main", tStart: 0.0, tEnd: 0.8 },
  { from: "outputEmbedding", to: "decoderAdd", kind: "main", tStart: 1.4, tEnd: 2.2 },
  { from: "decoderPosition", to: "decoderAdd", kind: "position", tStart: 1.4, tEnd: 2.2 },
  { from: "decoderAdd", to: "decoderMaskedAttention", kind: "main", tStart: 2.7, tEnd: 3.5 },
  { from: "decoderMaskedAttention", to: "decoderNorm1", kind: "main", tStart: 4.2, tEnd: 4.9 },

  // Cross connection: encoderNorm2 output and decoderNorm1 output both feed cross-attention
  {
    from: "encoderNorm2",
    to: "decoderCrossAttention",
    kind: "cross",
    tStart: 8.0,
    tEnd: 9.0,
    bend: [
      [-0.7, 0.8, -0.3],
      [0.75, 0.8, -0.3],
    ],
  },
  { from: "decoderNorm1", to: "decoderCrossAttention", kind: "main", tStart: 8.0, tEnd: 9.0 },

  { from: "decoderCrossAttention", to: "decoderNorm2", kind: "main", tStart: 9.7, tEnd: 10.3 },
  { from: "decoderNorm2", to: "decoderFeedForward", kind: "main", tStart: 10.8, tEnd: 11.6 },
  { from: "decoderFeedForward", to: "decoderNorm3", kind: "main", tStart: 12.3, tEnd: 12.9 },
  { from: "decoderNorm3", to: "linear", kind: "output", tStart: 13.4, tEnd: 13.9 },
  { from: "linear", to: "softmax", kind: "output", tStart: 13.9, tEnd: 14.3 },
  { from: "softmax", to: "probabilities", kind: "output", tStart: 14.7, tEnd: 15.2 },
];

const RESIDUALS: {
  from: NodeId;
  to: NodeId;
  tStart: number;
  tEnd: number;
  side: "left" | "right";
}[] = [
  { from: "encoderAdd", to: "encoderNorm1", tStart: 2.7, tEnd: 4.9, side: "left" },
  { from: "encoderNorm1", to: "encoderNorm2", tStart: 5.4, tEnd: 7.5, side: "left" },
  { from: "decoderAdd", to: "decoderNorm1", tStart: 2.7, tEnd: 4.9, side: "right" },
  { from: "decoderNorm1", to: "decoderNorm2", tStart: 8.0, tEnd: 10.3, side: "right" },
  { from: "decoderNorm2", to: "decoderNorm3", tStart: 10.8, tEnd: 12.9, side: "right" },
];

function positionalEncoding(position: number, dim: number, dModel = modelDim) {
  const pair = Math.floor(dim / 2);
  const denominator = Math.pow(10000, (2 * pair) / dModel);
  return dim % 2 === 0 ? Math.sin(position / denominator) : Math.cos(position / denominator);
}

function getNodeEdges(from: NodeSpec, to: NodeSpec): [THREE.Vector3, THREE.Vector3] {
  const start = new THREE.Vector3(...from.position);
  const end = new THREE.Vector3(...to.position);
  const direction = end.clone().sub(start);
  if (Math.abs(direction.y) >= Math.abs(direction.x)) {
    start.y += Math.sign(direction.y || 1) * from.size[1] * 0.5;
    end.y -= Math.sign(direction.y || 1) * to.size[1] * 0.5;
  } else {
    start.x += Math.sign(direction.x || 1) * from.size[0] * 0.5;
    end.x -= Math.sign(direction.x || 1) * to.size[0] * 0.5;
  }
  return [start, end];
}

function curvePoints(
  from: NodeId,
  to: NodeId,
  bend: [number, number, number][] = [],
): THREE.Vector3[] {
  const [start, end] = getNodeEdges(nodeMap[from], nodeMap[to]);
  return [start, ...bend.map((point) => new THREE.Vector3(...point)), end];
}

function getResidualPoints(from: NodeSpec, to: NodeSpec, side: "left" | "right"): THREE.Vector3[] {
  const sign = side === "left" ? -1 : 1;
  const start = new THREE.Vector3(
    from.position[0] + sign * from.size[0] * 0.5,
    from.position[1],
    0,
  );
  const end = new THREE.Vector3(to.position[0] + sign * to.size[0] * 0.5, to.position[1], 0);
  const bendX = from.position[0] + sign * 1.05;

  return [
    start,
    new THREE.Vector3(bendX, from.position[1], -0.15),
    new THREE.Vector3(bendX, (from.position[1] + to.position[1]) * 0.5, -0.5),
    new THREE.Vector3(bendX, to.position[1], -0.15),
    end,
  ];
}

function flowColor(kind: FlowKind) {
  if (kind === "position") return "#00F0FF"; // neon cyan
  if (kind === "residual") return "#64748B"; // sleek slate-blue
  if (kind === "cross") return "#8B5CF6"; // electric violet
  if (kind === "output") return "#10B981"; // emerald
  return "#475569"; // main pipeline flow
}

function getNodeActivation(nodeId: NodeId, time: number): number {
  const intervals: Record<NodeId, [number, number]> = {
    inputs: [0.0, 0.8],
    inputEmbedding: [0.8, 1.4],
    encoderPosition: [0.8, 1.4],
    encoderAdd: [2.2, 2.7],
    encoderSelfAttention: [3.5, 4.2],
    encoderNorm1: [4.9, 5.4],
    encoderFeedForward: [6.2, 6.9],
    encoderNorm2: [7.5, 8.0],

    shiftedOutputs: [0.0, 0.8],
    outputEmbedding: [0.8, 1.4],
    decoderPosition: [0.8, 1.4],
    decoderAdd: [2.2, 2.7],
    decoderMaskedAttention: [3.5, 4.2],
    decoderNorm1: [4.9, 5.4],
    decoderCrossAttention: [9.0, 9.7],
    decoderNorm2: [10.3, 10.8],
    decoderFeedForward: [11.6, 12.3],
    decoderNorm3: [12.9, 13.4],
    linear: [13.9, 14.3],
    softmax: [14.7, 15.1],
    probabilities: [15.6, 16.0],
  };

  const interval = intervals[nodeId];
  if (!interval) return 0;

  const [start, end] = interval;
  if (time >= start && time <= end) {
    const duration = end - start;
    const progress = (time - start) / duration;
    return Math.sin(progress * Math.PI); // peak in middle
  }
  return 0;
}

function TensorFlow({
  points,
  kind,
  tStart,
  tEnd,
  globalSpeed,
}: {
  points: THREE.Vector3[];
  kind: FlowKind;
  tStart: number;
  tEnd: number;
  globalSpeed: number;
}) {
  const pulse1 = useRef<THREE.Mesh>(null!);
  const pulse2 = useRef<THREE.Mesh>(null!);
  const pulse3 = useRef<THREE.Mesh>(null!);
  const mat1 = useRef<THREE.MeshBasicMaterial>(null!);
  const mat2 = useRef<THREE.MeshBasicMaterial>(null!);
  const mat3 = useRef<THREE.MeshBasicMaterial>(null!);

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.18),
    [points],
  );
  const samples = useMemo(() => curve.getPoints(48), [curve]);
  const color = flowColor(kind);
  const cycleDuration = 16.0;

  useFrame(({ clock }) => {
    const time = (clock.elapsedTime * globalSpeed) % cycleDuration;

    let active = false;
    let progress = 0;

    if (time >= tStart && time <= tEnd) {
      active = true;
      progress = (time - tStart) / (tEnd - tStart);
    }

    const ease = (val: number) => val * val * (3 - 2 * val);

    const updateParticle = (
      mesh: THREE.Mesh,
      mat: THREE.MeshBasicMaterial,
      pOffset: number,
      baseScale: number,
    ) => {
      if (!mesh || !mat) return;
      const p = progress - pOffset;
      if (active && p >= 0 && p <= 1) {
        const easedP = ease(p);
        const pos = curve.getPointAt(easedP);
        mesh.position.copy(pos);

        const scaleMult = kind === "position" ? 1.15 : kind === "cross" ? 1.0 : 0.85;
        mesh.scale.setScalar(baseScale * scaleMult);

        mat.opacity = Math.sin(p * Math.PI) * 0.95;
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    };

    updateParticle(pulse1.current, mat1.current, 0.0, 0.045);
    updateParticle(pulse2.current, mat2.current, 0.025, 0.055);
    updateParticle(pulse3.current, mat3.current, 0.05, 0.035);
  });

  return (
    <group>
      <Line
        points={samples}
        color={color}
        transparent
        opacity={kind === "residual" ? 0.2 : 0.32}
        lineWidth={kind === "residual" ? 1.0 : 1.5}
      />
      <mesh ref={pulse1}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial ref={mat1} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={pulse2}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial ref={mat2} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={pulse3}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial ref={mat3} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ArrowHead({ from, to, color }: { from: NodeId; to: NodeId; color: string }) {
  const [start, end] = getNodeEdges(nodeMap[from], nodeMap[to]);
  const direction = end.clone().sub(start).normalize();
  const position = start.clone().lerp(end, 0.82);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  );
  return (
    <mesh position={position} quaternion={quaternion}>
      <coneGeometry args={[0.055, 0.14, 14]} />
      <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} />
    </mesh>
  );
}

function TransformerNode({
  node,
  selected,
  onSelect,
  speed,
}: {
  node: NodeSpec;
  selected: boolean;
  onSelect: () => void;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const cycleDuration = 16.0;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const time = (clock.elapsedTime * speed) % cycleDuration;
    const activation = getNodeActivation(node.id, time);

    const material = ref.current.material as THREE.MeshStandardMaterial;

    const targetEmissive = selected || hovered ? 0.95 : 0.15 + activation * 0.55;
    material.emissiveIntensity = THREE.MathUtils.lerp(
      material.emissiveIntensity,
      targetEmissive,
      0.1,
    );

    const targetScale = selected || hovered ? 1.05 : 1.0 + activation * 0.035;
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.15));

    const floatOffset = Math.sin(clock.elapsedTime * 0.9 + node.position[0]) * 0.005;
    const targetZ = node.position[2] + (selected || hovered ? 0.16 : 0) + floatOffset;
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetZ, 0.15);
  });

  const isAdd = node.label === "+";
  const isAttention = node.id.toLowerCase().includes("attention");

  return (
    <group position={[node.position[0], node.position[1], 0]}>
      <mesh
        ref={ref}
        position={[0, 0, node.position[2]]}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        {isAdd ? (
          <cylinderGeometry args={[node.size[0] * 0.5, node.size[0] * 0.5, node.size[2], 32]} />
        ) : isAttention ? (
          <boxGeometry args={[node.size[0], node.size[1], 0.01]} />
        ) : (
          <boxGeometry args={node.size} />
        )}
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.15}
          metalness={0.25}
          roughness={0.25}
          transparent={isAttention}
          opacity={isAttention ? 0 : 1}
        />

        {isAttention &&
          Array.from({ length: 4 }).map((_, idx) => {
            const sliceThickness = (node.size[2] * 0.65) / 4;
            const gap = (node.size[2] * 0.35) / 3;
            const totalThickness = node.size[2];
            const zOffset = -totalThickness / 2 + sliceThickness / 2 + idx * (sliceThickness + gap);
            return (
              <mesh key={idx} position={[0, 0, zOffset]}>
                <boxGeometry args={[node.size[0], node.size[1], sliceThickness]} />
                <meshStandardMaterial
                  color={node.color}
                  emissive={node.color}
                  emissiveIntensity={selected || hovered ? 0.95 : 0.2}
                  metalness={0.3}
                  roughness={0.2}
                />
              </mesh>
            );
          })}
      </mesh>

      <mesh
        position={[
          0,
          0,
          node.position[2] + (selected || hovered ? 0.16 : 0) + node.size[2] * 0.5 + 0.015,
        ]}
      >
        <Text
          anchorX="center"
          anchorY="middle"
          color="#ffffff"
          fontSize={isAdd ? 0.22 : 0.115}
          lineHeight={1.1}
          maxWidth={node.size[0] * 0.85}
          textAlign="center"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        >
          {node.label}
        </Text>
      </mesh>
    </group>
  );
}

function BlockFrame({
  label,
  position,
  size,
}: {
  label: string;
  position: [number, number, number];
  size: [number, number, number];
}) {
  const isEncoder = label.toLowerCase().includes("encoder");
  const themeColor = isEncoder ? "#00F0FF" : "#8B5CF6";

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.17]}>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color="#0f172a"
          transparent
          opacity={0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <Line
        points={[
          [-size[0] / 2, -size[1] / 2, 0.04],
          [size[0] / 2, -size[1] / 2, 0.04],
          [size[0] / 2, size[1] / 2, 0.04],
          [-size[0] / 2, size[1] / 2, 0.04],
          [-size[0] / 2, -size[1] / 2, 0.04],
        ]}
        color={themeColor}
        transparent
        opacity={0.38}
        lineWidth={1.5}
      />
      <Text
        position={[size[0] / 2 + 0.35, 0.0, 0.08]}
        anchorX="center"
        anchorY="middle"
        color="#cbd5e1"
        fontSize={0.2}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        Nx
      </Text>
      <Text
        position={[0, size[1] / 2 + 0.28, 0.08]}
        anchorX="center"
        anchorY="middle"
        color="#e2e8f0"
        fontSize={0.16}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {label}
      </Text>
    </group>
  );
}

function PECell({
  x,
  z,
  pos,
  dim,
  side,
  initialValue,
  speed,
}: {
  x: number;
  z: number;
  pos: number;
  dim: number;
  side: "encoder" | "decoder";
  initialValue: number;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const cycleDuration = 16.0;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pair = Math.floor(dim / 2);
    const denominator = Math.pow(10000, (2 * pair) / modelDim);
    const angle = pos / denominator - clock.elapsedTime * 1.5 * speed;
    const val = dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);

    const height = 0.012 + Math.abs(val) * 0.05;
    meshRef.current.scale.set(0.034, height, 0.034);

    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    const intensity = (val + 1) / 2;
    material.emissiveIntensity = 0.1 + intensity * 0.28;
  });

  return (
    <mesh ref={meshRef} position={[x, 0, z]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={initialValue >= 0 ? "#00F0FF" : "#8B5CF6"}
        emissive={initialValue >= 0 ? "#00F0FF" : "#8B5CF6"}
        metalness={0.2}
        roughness={0.3}
      />
    </mesh>
  );
}

function PositionWave({ side, speed }: { side: "encoder" | "decoder"; speed: number }) {
  const group = useRef<THREE.Group>(null!);
  const x = side === "encoder" ? -3.95 : 3.95;
  const y = -3.4;
  const cells = useMemo(() => {
    const values: { x: number; z: number; value: number; dim: number; pos: number }[] = [];
    for (let pos = 0; pos < sequenceLength; pos++) {
      for (let dim = 0; dim < modelDim; dim++) {
        values.push({
          x: (dim - (modelDim - 1) / 2) * 0.045,
          z: (pos - (sequenceLength - 1) / 2) * 0.055,
          value: positionalEncoding(pos, dim),
          dim,
          pos,
        });
      }
    }
    return values;
  }, []);

  return (
    <group ref={group} position={[x, y - 0.6, 0.42]}>
      {cells.map((cell) => (
        <PECell
          key={`${side}-${cell.pos}-${cell.dim}`}
          x={cell.x}
          z={cell.z}
          pos={cell.pos}
          dim={cell.dim}
          side={side}
          initialValue={cell.value}
          speed={speed}
        />
      ))}
      <Text
        position={[0, -0.16, -0.42]}
        anchorX="center"
        anchorY="middle"
        color="#94A3B8"
        fontSize={0.07}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        sinusoidal PE matrix
      </Text>
    </group>
  );
}

function CausalMaskGrid({ position }: { position: [number, number, number] }) {
  const size = 6;
  const cells = useMemo(() => {
    const arr = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        arr.push({ r, c, isMasked: c > r });
      }
    }
    return arr;
  }, []);

  return (
    <group position={position}>
      {cells.map((cell) => {
        const cellX = (cell.c - (size - 1) / 2) * 0.08;
        const cellY = ((size - 1) / 2 - cell.r) * 0.08;
        return (
          <mesh key={`${cell.r}-${cell.c}`} position={[cellX, cellY, 0]}>
            <boxGeometry args={[0.06, 0.06, 0.02]} />
            <meshStandardMaterial
              color={cell.isMasked ? "#334155" : "#8B5CF6"}
              transparent
              opacity={cell.isMasked ? 0.25 : 0.85}
              emissive={cell.isMasked ? "#000000" : "#8B5CF6"}
              emissiveIntensity={cell.isMasked ? 0 : 0.4}
              metalness={0.1}
              roughness={0.4}
            />
          </mesh>
        );
      })}
      <Text
        position={[0, -0.32, 0.02]}
        color="#94A3B8"
        fontSize={0.07}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        Causal Mask
      </Text>
    </group>
  );
}

function TokenEmbeddingRibbon({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y - 0.48, 0.38]}>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[(i - 3.5) * 0.12, 0, Math.sin(i) * 0.035]}>
          <boxGeometry args={[0.075, 0.18 + (i % 3) * 0.035, 0.055]} />
          <meshStandardMaterial
            color="#E2B870"
            emissive="#E2B870"
            emissiveIntensity={0.11}
            metalness={0.3}
            roughness={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

function BackgroundGrid() {
  const count = 21 * 29;
  const tempObject = new THREE.Object3D();

  const handleInstancedMeshRef = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    let idx = 0;
    const step = 0.5;
    for (let x = -5.0; x <= 5.0; x += step) {
      for (let y = -6.5; y <= 7.5; y += step) {
        if (idx >= count) break;
        tempObject.position.set(x, y, -0.65);
        tempObject.updateMatrix();
        mesh.setMatrixAt(idx++, tempObject.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  return (
    <instancedMesh ref={handleInstancedMeshRef} args={[null!, null!, count]}>
      <planeGeometry args={[0.025, 0.025]} />
      <meshBasicMaterial color="#1e293b" transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  );
}

function ArchitectureScene({
  selected,
  setSelected,
  speed,
}: {
  selected: NodeId;
  setSelected: (id: NodeId) => void;
  speed: number;
}) {
  const mainGroup = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!mainGroup.current) return;
    // Ambient floating motion
    mainGroup.current.position.y = Math.sin(clock.elapsedTime * 0.4) * 0.04;
    mainGroup.current.position.z = Math.cos(clock.elapsedTime * 0.3) * 0.02;
    mainGroup.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.015;
    mainGroup.current.rotation.x = Math.cos(clock.elapsedTime * 0.1) * 0.008;
  });

  return (
    <>
      <ambientLight intensity={0.52} />
      <directionalLight position={[2, 5, 6]} intensity={1.4} color="#f2f6ff" />
      <pointLight position={[-4, -2, 4]} intensity={1.8} color="#b8c8df" />
      <pointLight position={[4.5, 2, 3]} intensity={1.15} color="#d5c397" />

      {/* Main interactive group */}
      <group ref={mainGroup}>
        {/* Background slab */}
        <mesh position={[0, 0.5, -0.72]}>
          <boxGeometry args={[9.4, 13.0, 0.08]} />
          <meshStandardMaterial color="#0b0f19" transparent opacity={0.45} roughness={0.6} />
        </mesh>

        <BackgroundGrid />

        <Line
          points={[
            [-4.7, -6.0, -0.51],
            [4.7, -6.0, -0.51],
            [4.7, 7.0, -0.51],
            [-4.7, 7.0, -0.51],
            [-4.7, -6.0, -0.51],
          ]}
          color="#94A3B8"
          transparent
          opacity={0.28}
          lineWidth={1.5}
        />

        <Text
          position={[0, -6.4, -0.42]}
          color="#94A3B8"
          fontSize={0.16}
          anchorX="center"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        >
          Transformer computational graph - positional encoding is inside the model before attention
        </Text>

        <BlockFrame label="Encoder block" position={[-2.45, -0.7, -0.08]} size={[2.2, 3.7, 0.08]} />
        <BlockFrame label="Decoder block" position={[2.45, 0.8, -0.08]} size={[2.3, 6.8, 0.08]} />

        <PositionWave side="encoder" speed={speed} />
        <PositionWave side="decoder" speed={speed} />
        <TokenEmbeddingRibbon x={-2.45} y={-4.2} />
        <TokenEmbeddingRibbon x={2.45} y={-4.2} />

        {/* Causal Mask Grid next to Decoder Masked Attention */}
        <CausalMaskGrid position={[4.05, -2.2, 0.12]} />

        {FLOWS.map((flow) => (
          <TensorFlow
            key={`${flow.from}-${flow.to}`}
            points={curvePoints(flow.from, flow.to, flow.bend)}
            kind={flow.kind}
            tStart={flow.tStart}
            tEnd={flow.tEnd}
            globalSpeed={speed}
          />
        ))}

        {RESIDUALS.map((flow) => {
          const from = nodeMap[flow.from];
          const to = nodeMap[flow.to];
          return (
            <TensorFlow
              key={`residual-${flow.from}-${flow.to}`}
              points={getResidualPoints(from, to, flow.side)}
              kind="residual"
              tStart={flow.tStart}
              tEnd={flow.tEnd}
              globalSpeed={speed}
            />
          );
        })}

        {FLOWS.map((flow) => (
          <ArrowHead
            key={`arrow-${flow.from}-${flow.to}`}
            from={flow.from}
            to={flow.to}
            color={flowColor(flow.kind)}
          />
        ))}

        {NODES.map((node) => (
          <TransformerNode
            key={node.id}
            node={node}
            selected={selected === node.id}
            onSelect={() => setSelected(node.id)}
            speed={speed}
          />
        ))}

        <Html position={[0, 7.15, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="rounded-full glass px-4 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/80">
            Original encoder-decoder topology with internal PE addition
          </div>
        </Html>
      </group>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.12}
        minDistance={4.5}
        maxDistance={30}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={Math.PI * 0.35}
      />
    </>
  );
}

function Page() {
  const [selected, setSelected] = useState<NodeId>("encoderAdd");
  const [speed, setSpeed] = useState(1);
  const selectedNode = nodeMap[selected];
  const samplePe = useMemo(
    () => Array.from({ length: 8 }, (_, dim) => positionalEncoding(4, dim)),
    [],
  );

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 07 - Transformer"
        title="The Transformer, as a working 3D circuit."
        description="The original encoder-decoder architecture is shown as a layered computational graph. Positional encoding lives inside the Transformer, where sinusoidal vectors are added to embeddings before attention begins."
        prev={{ to: "/learn/attention", label: "Attention" }}
        next={{ to: "/curriculum", label: "Full curriculum" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
          <div className="relative aspect-[4/5] min-h-[640px] overflow-hidden rounded-3xl glass-strong ring-glow lg:aspect-[5/6]">
            <Suspense fallback={<div className="h-full w-full animate-shimmer" />}>
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0.15, 17.0], fov: 42 }}
                gl={{
                  alpha: true,
                  antialias: true,
                  depth: true,
                  powerPreference: "high-performance",
                  stencil: false,
                }}
                performance={{ min: 0.65, max: 1, debounce: 250 }}
              >
                <ArchitectureScene selected={selected} setSelected={setSelected} speed={speed} />
              </Canvas>
            </Suspense>
            <div className="absolute left-4 top-4 rounded-full glass px-3 py-1 text-[11px] text-muted-foreground">
              drag to orbit | scroll to zoom | tap modules to inspect
            </div>
            <div className="absolute bottom-4 left-4 right-4 grid gap-2 rounded-2xl glass p-3 text-[11px] text-muted-foreground sm:grid-cols-3">
              <div>
                <span className="text-foreground font-semibold">1</span> embedding + PE vector
                addition
              </div>
              <div>
                <span className="text-foreground font-semibold">2</span> encoder output feeds
                decoder cross-attention
              </div>
              <div>
                <span className="text-foreground font-semibold">3</span> linear then softmax
                produces probabilities
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: easeSmooth }}
              className="glass-strong rounded-2xl p-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: selectedNode.color }}
                />
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Inspect
                </div>
              </div>
              <h2 className="mt-3 whitespace-pre-line text-xl font-semibold leading-tight text-foreground">
                {selectedNode.label}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {selectedNode.detail}
              </p>
              {selectedNode.formula && (
                <div className="mt-4 rounded-xl bg-white/[0.04] p-3 font-mono text-[12px] text-cyan-400">
                  {selectedNode.formula}
                </div>
              )}
            </motion.div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Tensor pulse speed
                  </div>
                  <div className="mt-1 text-sm text-foreground/80">{speed.toFixed(1)}x</div>
                </div>
              </div>
              <input
                aria-label="Tensor pulse speed"
                type="range"
                min={0.5}
                max={1.8}
                step={0.1}
                value={speed}
                onChange={(event) => setSpeed(parseFloat(event.target.value))}
                className="mt-4 w-full accent-[color:var(--glow-violet)]"
              />
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Positional injection
              </div>
              <div className="mt-4 grid grid-cols-8 gap-1">
                {samplePe.map((value, index) => (
                  <div key={index} className="space-y-1">
                    <div
                      className="h-16 rounded-md border border-white/10"
                      style={{
                        background: value >= 0 ? "#00F0FF" : "#8B5CF6",
                        opacity: 0.35 + Math.abs(value) * 0.55,
                        transform: `scaleY(${0.35 + Math.abs(value) * 0.65})`,
                        transformOrigin: value >= 0 ? "bottom" : "top",
                      }}
                    />
                    <div className="text-center font-mono text-[10px] text-muted-foreground">
                      {index}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The wave matrix is not a side panel in the scene. It is physically routed into the
                addition nodes before encoder and decoder attention, matching x + PE(pos).
              </p>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Architecture invariants
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div>{"Encoder: self-attention -> Add & Norm -> feed-forward -> Add & Norm."}</div>
                <div>{"Decoder: masked self-attention -> cross-attention -> feed-forward."}</div>
                <div>
                  Residual paths bypass each sublayer and terminate at the matching Add &amp; Norm.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}
