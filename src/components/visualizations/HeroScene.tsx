import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Html, Line } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";

interface NodeData {
  id: string;
  position: [number, number, number];
  color: string;
  region: string;
  side: "left" | "right";
}

interface ConnectionData {
  id: string;
  startNode: NodeData;
  endNode: NodeData;
  color: string;
}

interface CustomLineMaterial extends THREE.Material {
  linewidth: number;
}

interface CustomLine extends THREE.Mesh {
  material: CustomLineMaterial;
}

const LOBE_DETAILS: Record<
  string,
  { title: string; functions: string; analogy: string; badgeColor: string; hudBorder: string }
> = {
  "Frontal Lobe": {
    title: "Frontal Lobe L1 Core",
    functions: "Attention Routing · Core Reasoner",
    analogy: "Coordinates dynamic self-attention heads, directing focus and filtering prompts.",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    hudBorder: "border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]",
  },
  "Parietal Lobe": {
    title: "Parietal Lobe L2 Map",
    functions: "Sensory Mapping · High-Dim Geometry",
    analogy:
      "Maps tokens into a high-dimensional vector space where semantic meaning has geometry.",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    hudBorder: "border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]",
  },
  "Temporal Lobe": {
    title: "Temporal Lobe RAM Cache",
    functions: "Parametric Storage · KV Cache",
    analogy: "Serves as the KV cache and feed-forward weights, recalling facts from pre-training.",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    hudBorder: "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  },
  "Occipital Lobe": {
    title: "Occipital Lobe Visual Die",
    functions: "Visual Processing · Patch Encoder",
    analogy:
      "Similar to a Vision Transformer's patch projection, decoding sensory data into latent vectors.",
    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    hudBorder: "border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]",
  },
  Cerebellum: {
    title: "Cerebellum Output MCU",
    functions: "Fine-Tuning Gating · Logit Stabilizer",
    analogy:
      "Functions as the RLHF safety layers and decoder temperature gating, smoothing token outputs.",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    hudBorder: "border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
  },
};

const DEFAULT_LOBE = {
  title: "Cybernetic Brain Core",
  functions: "Interactive Printed Circuit Board",
  analogy:
    "Hover over the active nodes or trace buses to explore the hardware lobes and their corresponding LLM computational analogies.",
  badgeColor: "bg-white/5 text-zinc-400 border-white/10",
  hudBorder: "border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]",
};

// Generates points conforming to a human brain's shape
function generateBrainNode(i: number, total: number): NodeData {
  const side = i < total / 2 ? -1 : 1; // Split into left/right hemispheres

  // Use golden spiral distribution over hemisphere surface
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1); // polar angle 0 to PI

  // Base dimensions of brain (elongated in Z axis)
  const rx = 0.8;
  const ry = 0.82;
  const rz = 1.15;

  let x = rx * Math.sin(phi) * Math.cos(theta);
  let y = ry * Math.sin(phi) * Math.sin(theta);
  let z = rz * Math.cos(phi);

  // Separate hemispheres along the sagittal midline
  x = side * (0.13 + Math.abs(x) * 0.87);

  // Flatten bottom slightly
  if (y < -0.15) {
    y *= 0.65;
  }

  // Taper frontal lobe (anterior, Z > 0)
  if (z > 0) {
    const taper = 1.0 - (z / rz) * 0.22;
    x *= taper;
    y *= taper;
  }

  // Create Cerebellum structure (tucked underneath at back: Z < -0.38, Y < -0.18)
  let region = "Parietal Lobe";
  let color = "#8B5CF6"; // Violet for Parietal

  const isCerebellum = z < -0.38 && y < -0.18;
  if (isCerebellum) {
    z = -0.55 + (z + 0.55) * 0.6; // compress slightly
    y = -0.42 + (y + 0.42) * 0.5;
    x = side * (0.12 + Math.abs(x) * 0.65);
    color = "#3B82F6"; // Blue for Cerebellum
    region = "Cerebellum";
  } else {
    // Standard cerebrum lobes
    if (z > 0.45) {
      color = "#00F0FF"; // Cyan for Frontal
      region = "Frontal Lobe";
    } else if (z < -0.45) {
      color = "#EC4899"; // Pink for Occipital
      region = "Occipital Lobe";
    } else if (y < -0.05 && z > -0.2 && z < 0.35) {
      color = "#10B981"; // Emerald for Temporal
      region = "Temporal Lobe";
    }
  }

  // Add gyri/sulci convolutions (folds) along surface normal
  const foldFreq = 12;
  const foldAmp = 0.07;
  const foldVal = Math.sin(x * foldFreq) * Math.cos(y * foldFreq) * Math.sin(z * foldFreq);

  const normal = new THREE.Vector3(x, y, z).normalize();
  x += normal.x * foldVal * foldAmp;
  y += normal.y * foldVal * foldAmp;
  z += normal.z * foldVal * foldAmp;

  return {
    id: `node-${i}`,
    position: [x, y, z],
    color,
    region,
    side: side === 1 ? "right" : "left",
  };
}

// Routes connections with 45-degree chamfered corners (PCB style)
function getCircuitPath(
  start: [number, number, number],
  end: [number, number, number],
): [number, number, number][] {
  const p0 = new THREE.Vector3(...start);
  const p3 = new THREE.Vector3(...end);

  // Midpoint step along Z axis
  const midZ = (p0.z + p3.z) * 0.5;

  const p1 = new THREE.Vector3(p0.x, p0.y, midZ);
  const p2 = new THREE.Vector3(p3.x, p3.y, midZ);

  const pathPoints: [number, number, number][] = [];
  const chamfer = 0.055; // Corner size

  pathPoints.push([p0.x, p0.y, p0.z]);

  const d1 = new THREE.Vector3().subVectors(p1, p0);
  const d2 = new THREE.Vector3().subVectors(p2, p1);
  const d3 = new THREE.Vector3().subVectors(p3, p2);

  const len1 = d1.length();
  const len2 = d2.length();
  const len3 = d3.length();

  // Chamfer first corner
  if (len1 > chamfer * 1.5 && len2 > chamfer * 1.5) {
    const p1_pre = p1.clone().sub(d1.clone().normalize().multiplyScalar(chamfer));
    const p1_post = p1.clone().add(d2.clone().normalize().multiplyScalar(chamfer));
    pathPoints.push([p1_pre.x, p1_pre.y, p1_pre.z]);
    pathPoints.push([p1_post.x, p1_post.y, p1_post.z]);
  } else {
    pathPoints.push([p1.x, p1.y, p1.z]);
  }

  // Chamfer second corner
  if (len2 > chamfer * 1.5 && len3 > chamfer * 1.5) {
    const p2_pre = p2.clone().sub(d2.clone().normalize().multiplyScalar(chamfer));
    const p2_post = p2.clone().add(d3.clone().normalize().multiplyScalar(chamfer));
    pathPoints.push([p2_pre.x, p2_pre.y, p2_pre.z]);
    pathPoints.push([p2_post.x, p2_post.y, p2_post.z]);
  } else {
    pathPoints.push([p2.x, p2.y, p2.z]);
  }

  pathPoints.push([p3.x, p3.y, p3.z]);

  return pathPoints;
}

function ConnectionPath({
  id,
  start,
  end,
  color,
  highlighted,
  reducedMotion,
  index,
}: {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  highlighted: boolean;
  reducedMotion: boolean;
  index: number;
}) {
  const lineRef = useRef<CustomLine>(null);
  const lineRef2 = useRef<CustomLine>(null);
  const packetRef = useRef<THREE.Mesh>(null);
  const packetRef2 = useRef<THREE.Mesh>(null);

  // Track continuous transition values
  const opacityRef = useRef(0.08);
  const widthRef = useRef(0.5);

  const phaseOffset = useMemo(() => index * 0.13, [index]);
  const isCorpus = id.includes("corpus");
  const offsetVal = 0.024; // Spacing for parallel double-lane data bus

  // Generate chamfered PCB traces
  const { curvePath, points } = useMemo(() => {
    const pts = getCircuitPath(start, end);
    const cPath = new THREE.CurvePath<THREE.Vector3>();
    for (let j = 0; j < pts.length - 1; j++) {
      const pA = new THREE.Vector3(...pts[j]);
      const pB = new THREE.Vector3(...pts[j + 1]);
      cPath.add(new THREE.LineCurve3(pA, pB));
    }
    return { curvePath: cPath, points: pts };
  }, [start, end]);

  const pointsA = useMemo(
    () =>
      isCorpus
        ? points.map((p) => [p[0], p[1] + offsetVal, p[2]] as [number, number, number])
        : null,
    [points, isCorpus],
  );
  const pointsB = useMemo(
    () =>
      isCorpus
        ? points.map((p) => [p[0], p[1] - offsetVal, p[2]] as [number, number, number])
        : null,
    [points, isCorpus],
  );

  useFrame((state, delta) => {
    const clampDelta = Math.min(delta, 0.1);

    // Speed up and scale up packet on highlighting
    const speed = highlighted ? 0.65 : 0.22;
    const t = (state.clock.getElapsedTime() * speed + phaseOffset) % 1.0;

    const targetPacketOpacity = highlighted ? 0.9 : 0.22;
    const targetScale = highlighted ? 1.4 : 0.7;

    const updatePacket = (pRef: React.RefObject<THREE.Mesh | null>, yOffset: number) => {
      const p = pRef.current;
      if (p) {
        if (reducedMotion) {
          if (p.material) (p.material as THREE.Material).opacity = 0;
        } else {
          const pos = curvePath.getPointAt(t);
          p.position.set(pos.x, pos.y + yOffset, pos.z);

          if (p.material) {
            const mat = p.material as THREE.Material;
            mat.opacity += (targetPacketOpacity - mat.opacity) * clampDelta * 5.0;
          }
          const currentScale = p.scale.x;
          const nextScale = currentScale + (targetScale - currentScale) * clampDelta * 5.0;
          p.scale.set(nextScale, nextScale, nextScale);
        }
      }
    };

    if (isCorpus) {
      updatePacket(packetRef, offsetVal);
      updatePacket(packetRef2, -offsetVal);
    } else {
      updatePacket(packetRef, 0);
    }

    // Smooth connection line highlight
    const targetLineOpacity = highlighted ? 0.75 : 0.08;
    const targetLineWidth = highlighted ? 1.6 : 0.5;

    opacityRef.current += (targetLineOpacity - opacityRef.current) * clampDelta * 4.5;
    widthRef.current += (targetLineWidth - widthRef.current) * clampDelta * 4.5;

    const updateLine = (lRef: React.RefObject<CustomLine | null>) => {
      const l = lRef.current;
      if (l && l.material) {
        l.material.opacity = opacityRef.current;
        l.material.linewidth = widthRef.current;
      }
    };

    updateLine(lineRef);
    if (isCorpus) {
      updateLine(lineRef2);
    }
  });

  return (
    <group>
      {isCorpus ? (
        <>
          <Line
            ref={lineRef}
            points={pointsA!}
            color={color}
            lineWidth={widthRef.current}
            opacity={opacityRef.current}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
          <Line
            ref={lineRef2}
            points={pointsB!}
            color={color}
            lineWidth={widthRef.current}
            opacity={opacityRef.current}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
          <mesh ref={packetRef}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
          </mesh>
          <mesh ref={packetRef2}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
          </mesh>
        </>
      ) : (
        <>
          <Line
            ref={lineRef}
            points={points}
            color={color}
            lineWidth={widthRef.current}
            opacity={opacityRef.current}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
          <mesh ref={packetRef}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

function InteractiveNode({
  node,
  isActive,
  isHovered,
  setHoveredNodeId,
  setHoveredRegion,
  reducedMotion,
  index,
}: {
  node: NodeData;
  isActive: boolean;
  isHovered: boolean;
  setHoveredNodeId: (id: string | null) => void;
  setHoveredRegion: (region: string | null) => void;
  reducedMotion: boolean;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const padRef = useRef<THREE.Group>(null);

  const phaseOffset = useMemo(() => index * 0.43, [index]);
  const scaleRef = useRef(1.0);
  const haloOpacityRef = useRef(0.0);

  // Align the golden circular via pads flat to the brain exterior surface
  useEffect(() => {
    if (padRef.current) {
      const pos = new THREE.Vector3(...node.position);
      const target = pos.clone().multiplyScalar(2.0);
      padRef.current.lookAt(target);
    }
  }, [node.position]);

  useFrame((state, delta) => {
    const clampDelta = Math.min(delta, 0.1);
    const time = state.clock.getElapsedTime();

    // Subtle asynchronous breathing pulses for nodes
    const breathing = reducedMotion ? 0 : Math.sin(time * 2.0 + phaseOffset) * 0.08;
    const baseTarget = isActive || isHovered ? 1.4 : 1.0;
    const targetScale = baseTarget + breathing;

    scaleRef.current += (targetScale - scaleRef.current) * clampDelta * 6.0;

    if (meshRef.current) {
      const scaleVal = 0.055 * scaleRef.current;
      meshRef.current.scale.set(scaleVal, scaleVal, scaleVal);
    }

    // Smooth halo highlights
    const targetHaloOpacity = isActive || isHovered ? 0.28 + Math.sin(time * 3.5) * 0.08 : 0.0;
    haloOpacityRef.current += (targetHaloOpacity - haloOpacityRef.current) * clampDelta * 7.0;

    if (haloRef.current && haloRef.current.material) {
      (haloRef.current.material as THREE.Material).opacity = haloOpacityRef.current;
      const haloScaleVal = 0.13 * scaleRef.current;
      haloRef.current.scale.set(haloScaleVal, haloScaleVal, haloScaleVal);
    }
  });

  return (
    <group position={node.position}>
      {/* Golden PCB via pad base */}
      <group ref={padRef}>
        <mesh>
          <ringGeometry args={[0.012, 0.038, 8]} />
          <meshBasicMaterial color="#D97706" side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* LED Synapse Core */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredNodeId(node.id);
          setHoveredRegion(node.region);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredNodeId(null);
          setHoveredRegion(null);
        }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={node.color} toneMapped={false} />
      </mesh>

      {/* LED Glow Halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Microchip({
  position,
  color,
  label,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  color: string;
  label: string;
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Grey PCB Processor Body */}
      <mesh>
        <boxGeometry args={[0.22, 0.035, 0.22]} />
        <meshStandardMaterial color="#1f1f23" roughness={0.2} metalness={0.8} toneMapped={false} />
      </mesh>

      {/* Glowing Silicon Die Center */}
      <mesh position={[0, 0.019, 0]}>
        <boxGeometry args={[0.13, 0.005, 0.13]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>

      {/* Gold Connectors Pins */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.26, 0.008, 0.04]} />
        <meshBasicMaterial color="#D97706" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.008, 0.26]} />
        <meshBasicMaterial color="#D97706" toneMapped={false} />
      </mesh>

      {/* Floating Microchip ID badge */}
      <Html distanceFactor={6} center position={[0, 0.06, 0]}>
        <div className="px-1 py-0.5 rounded border border-white/10 bg-black/85 text-[5px] font-mono text-zinc-400 tracking-wider whitespace-nowrap select-none uppercase">
          {label}
        </div>
      </Html>
    </group>
  );
}

function CentralStemCore({ reducedMotion }: { reducedMotion: boolean }) {
  const beamRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();

    // Upward-traveling pulse inside the ventricles / brain stem core
    if (pulseRef.current) {
      const y = -0.9 + ((t * 0.45) % 1.7);
      pulseRef.current.position.y = y;

      const dist = Math.abs(y + 0.05);
      const opacity = Math.max(0, 1.0 - dist / 0.85) * 0.32;
      if (pulseRef.current.material) {
        (pulseRef.current.material as THREE.Material).opacity = opacity;
      }
    }
  });

  return (
    <group>
      {/* Central neural signal stream */}
      <mesh ref={beamRef} position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.7, 8, 1, true]} />
        <meshBasicMaterial
          color="#8B5CF6"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Upward pulsing energy ring */}
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.08, 0.11, 24]} />
        <meshBasicMaterial
          color="#00F0FF"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function NetworkField({
  reducedMotion,
  setHoveredRegion,
}: {
  reducedMotion: boolean;
  setHoveredRegion: (region: string | null) => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [activeCycleId, setActiveCycleId] = useState("node-0");

  const nodes = useMemo(() => {
    const list: NodeData[] = [];
    const count = 136;
    for (let i = 0; i < count; i++) {
      list.push(generateBrainNode(i, count));
    }
    return list;
  }, []);

  const connections = useMemo(() => {
    const list: ConnectionData[] = [];

    nodes.forEach((nodeA) => {
      const candidates = nodes
        .filter((n) => n.id !== nodeA.id)
        .map((nodeB) => {
          const dx = nodeA.position[0] - nodeB.position[0];
          const dy = nodeA.position[1] - nodeB.position[1];
          const dz = nodeA.position[2] - nodeB.position[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          return { node: nodeB, dist };
        });

      // 1. Same-hemisphere local structural links
      const sameHemi = candidates.filter((c) => c.node.side === nodeA.side);
      sameHemi.sort((a, b) => a.dist - b.dist);

      const connCount = nodeA.region === "Cerebellum" ? 3 : 2;
      for (let j = 0; j < Math.min(connCount, sameHemi.length); j++) {
        const target = sameHemi[j];
        if (target.dist < 0.44) {
          const exists = list.some(
            (c) =>
              (c.startNode.id === nodeA.id && c.endNode.id === target.node.id) ||
              (c.startNode.id === target.node.id && c.endNode.id === nodeA.id),
          );
          if (!exists) {
            list.push({
              id: `c-${nodeA.id}-${target.node.id}`,
              startNode: nodeA,
              endNode: target.node,
              color: nodeA.color,
            });
          }
        }
      }

      // 2. Inter-hemisphere bridge fibers (Corpus Callosum)
      if (Math.abs(nodeA.position[0]) < 0.28) {
        const crossHemi = candidates.filter(
          (c) => c.node.side !== nodeA.side && Math.abs(c.node.position[0]) < 0.28,
        );
        crossHemi.sort((a, b) => a.dist - b.dist);
        if (crossHemi.length > 0) {
          const target = crossHemi[0];
          if (target.dist < 0.36) {
            const exists = list.some(
              (c) =>
                (c.startNode.id === nodeA.id && c.endNode.id === target.node.id) ||
                (c.startNode.id === target.node.id && c.endNode.id === nodeA.id),
            );
            if (!exists) {
              list.push({
                id: `c-corpus-${nodeA.id}-${target.node.id}`,
                startNode: nodeA,
                endNode: target.node,
                color: "#f59e0b", // Gold/Amber data bus color
              });
            }
          }
        }
      }
    });

    return list;
  }, [nodes]);

  // Cycle a visual thought impulse when there's no hovered node
  useEffect(() => {
    if (hoveredNodeId) return;
    const interval = setInterval(() => {
      setActiveCycleId((prev) => {
        const idx = parseInt(prev.split("-")[1], 10);
        const nextIdx = (idx + 13) % 136; // Jumps across hemispheres/lobes
        return `node-${nextIdx}`;
      });
    }, 3800);
    return () => clearInterval(interval);
  }, [hoveredNodeId]);

  const activeNodeId = hoveredNodeId || activeCycleId;

  // Scanning boundary rings
  const getRingPoints = (radius: number, y: number) => {
    const points: [number, number, number][] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push([Math.cos(theta) * radius, y, Math.sin(theta) * radius]);
    }
    return points;
  };

  const scanHPoints = useMemo(() => getRingPoints(1.5, -0.05), []);
  const scanVPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 64;
    const r = 1.6;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push([0, Math.cos(theta) * r * 0.9, Math.sin(theta) * r]);
    }
    return pts;
  }, []);

  const scanHRef = useRef<THREE.Group>(null);
  const scanVRef = useRef<THREE.Group>(null);
  const brainGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const clampDelta = Math.min(delta, 0.1);
    const t = state.clock.getElapsedTime();

    // Alternate rotations for holographic diagnostic tracks
    if (scanHRef.current) scanHRef.current.rotation.y = t * 0.04;
    if (scanVRef.current) scanVRef.current.rotation.z = -t * 0.03;

    // Interactive pointer tilting
    const targetTiltX = -state.pointer.y * 0.35;
    const targetTiltY = state.pointer.x * 0.35;

    if (brainGroupRef.current) {
      brainGroupRef.current.rotation.x +=
        (targetTiltX - brainGroupRef.current.rotation.x) * clampDelta * 3.5;
      brainGroupRef.current.rotation.y +=
        (targetTiltY - brainGroupRef.current.rotation.y) * clampDelta * 3.5;
    }
  });

  return (
    <group>
      {/* Laser Scanning Holograms */}
      <group ref={scanHRef}>
        <Line points={scanHPoints} color="#8B5CF6" lineWidth={0.65} opacity={0.06} transparent />
      </group>
      <group ref={scanVRef}>
        <Line points={scanVPoints} color="#00F0FF" lineWidth={0.65} opacity={0.05} transparent />
      </group>

      <group ref={brainGroupRef}>
        {/* Central signal core stem */}
        <CentralStemCore reducedMotion={reducedMotion} />

        {/* Silicon Lobe microprocessors */}
        <Microchip position={[0, 0.15, 0.55]} color="#00F0FF" label="SYS.CPU.FRONTAL" />
        <Microchip position={[0, 0.42, 0.0]} color="#8B5CF6" label="SYS.RAM.PARIETAL" />
        <Microchip position={[0, -0.2, 0.15]} color="#10B981" label="SYS.MEM.TEMPORAL" />
        <Microchip position={[0, 0.15, -0.55]} color="#EC4899" label="SYS.GPU.OCCIPITAL" />
        <Microchip position={[0, -0.42, -0.45]} color="#3B82F6" label="SYS.MCU.CEREBELLUM" />

        {/* Neural pathways */}
        {connections.map((conn, idx) => {
          const isHighlighted =
            conn.startNode.id === activeNodeId || conn.endNode.id === activeNodeId;
          return (
            <ConnectionPath
              key={conn.id}
              id={conn.id}
              start={conn.startNode.position}
              end={conn.endNode.position}
              color={conn.color}
              highlighted={isHighlighted}
              reducedMotion={reducedMotion}
              index={idx}
            />
          );
        })}

        {/* Brain Synapse Nodes */}
        {nodes.map((node, idx) => {
          const isActive = activeNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          return (
            <InteractiveNode
              key={node.id}
              node={node}
              isActive={isActive}
              isHovered={isHovered}
              setHoveredNodeId={setHoveredNodeId}
              setHoveredRegion={setHoveredRegion}
              reducedMotion={reducedMotion}
              index={idx}
            />
          );
        })}
      </group>
    </group>
  );
}

export function HeroScene() {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [metrics, setMetrics] = useState({ freq: 840, volt: 1.18 });
  const reducedMotion = useReducedMotion() ?? false;

  const activeLobe = hoveredRegion ? LOBE_DETAILS[hoveredRegion] : DEFAULT_LOBE;

  // Generate subtle dynamic fluctuation for BIOS diagnostics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        freq: Math.floor(830 + Math.random() * 25),
        volt: parseFloat((1.16 + Math.random() * 0.04).toFixed(2)),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full select-none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.3], fov: 45 }}
        gl={{
          alpha: true,
          antialias: true,
          depth: true,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
        performance={{ min: 0.7, max: 1, debounce: 250 }}
      >
        <ambientLight intensity={0.65} />
        <pointLight position={[5, 5, 5]} intensity={0.9} color="#8b5cf6" />
        <pointLight position={[-5, -4, -5]} intensity={0.7} color="#00f0ff" />

        <Float
          speed={reducedMotion ? 0 : 0.5}
          rotationIntensity={reducedMotion ? 0 : 0.12}
          floatIntensity={reducedMotion ? 0 : 0.15}
        >
          <NetworkField reducedMotion={reducedMotion} setHoveredRegion={setHoveredRegion} />
        </Float>

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          autoRotate={!reducedMotion && !hoveredRegion}
          autoRotateSpeed={0.32} // Calm, orbital rotate
          dampingFactor={0.06}
          enableDamping
          rotateSpeed={0.4}
          minDistance={2.5}
          maxDistance={8}
        />
      </Canvas>

      {/* Holographic Diagnostic HUD Overlay */}
      <div className="absolute top-4 right-4 z-10 w-64 pointer-events-none transition-all duration-500 ease-out">
        <div
          className={`pointer-events-auto rounded-2xl backdrop-blur-md bg-black/80 border transition-all duration-500 ease-[var(--ease-smooth)] overflow-hidden ${
            isCollapsed
              ? "p-2.5 w-40 ml-auto border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.03)] hover:bg-black/95 cursor-pointer"
              : `p-4 w-64 ${activeLobe.hudBorder}`
          }`}
          onClick={() => {
            if (isCollapsed) setIsCollapsed(false);
          }}
        >
          {/* Collapsed Badge Layout */}
          <div
            className={`transition-all duration-500 flex items-center justify-between ${
              isCollapsed ? "opacity-100 max-h-8" : "opacity-0 max-h-0 pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Terminal className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="text-[9px] font-mono tracking-wider text-zinc-400 uppercase truncate">
                SYS LOGS
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0 ml-1 animate-pulse" />
          </div>

          {/* Expanded Diagnostics Card Layout */}
          <div
            className={`transition-all duration-500 ${
              isCollapsed ? "opacity-0 max-h-0 pointer-events-none" : "opacity-100 max-h-[380px]"
            }`}
          >
            {/* Title Bar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      hoveredRegion ? "bg-indigo-400" : "bg-zinc-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      hoveredRegion ? "bg-indigo-500" : "bg-zinc-500"
                    }`}
                  />
                </span>
                <h4 className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-400">
                  HUD · SYSTEM LOG
                </h4>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                }}
                className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer pointer-events-auto"
                aria-label="Collapse Diagnostics"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>

            <h3 className="text-[15px] font-semibold text-white tracking-tight leading-tight mb-1">
              {activeLobe.title}
            </h3>

            <div className="text-[9px] font-mono opacity-80 mb-3 text-zinc-300">
              {activeLobe.functions}
            </div>

            <div className="h-[1px] w-full bg-white/10 mb-3" />

            {/* Hardcore BIOS Diagnostics */}
            <div className="space-y-1.5 mb-3 font-mono text-[9px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">CLOCK SPEED:</span>
                <span className="text-zinc-300">4.88 GHz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">SYNAPSE CLOCK:</span>
                <span className="text-zinc-300 font-bold transition-all duration-300">
                  {metrics.freq} Hz
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CORE VOLTAGE:</span>
                <span className="text-zinc-300 transition-all duration-300">{metrics.volt} V</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">THROUGHPUT:</span>
                <span className="text-emerald-400 font-bold">
                  {hoveredRegion ? "94.2% ACTIVE" : "12.5% IDLE"}
                </span>
              </div>
              {/* Live signal level bar */}
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1 transition-all duration-500">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    hoveredRegion
                      ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                      : "bg-zinc-600"
                  }`}
                  style={{ width: hoveredRegion ? "94%" : "12%" }}
                />
              </div>
            </div>

            <div className="h-[1px] w-full bg-white/10 mb-3" />

            <div className="text-[10px] text-zinc-400 leading-relaxed font-sans">
              {activeLobe.analogy}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
