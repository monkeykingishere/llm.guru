import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, Sparkles } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp, LocateFixed, Terminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Vec3 = [number, number, number];

interface Cluster {
  name: string;
  color: string;
  center: Vec3;
  words: string[];
}

interface VectorNode {
  id: string;
  word: string;
  cluster: number;
  position: Vec3;
  magnitude: number;
}

interface VectorEdge {
  a: number;
  b: number;
  similarity: number;
}

const CLUSTERS: Cluster[] = [
  {
    name: "Intelligence",
    color: "#67e8f9",
    center: [0.15, 0.35, 0.15],
    words: ["transformer", "model", "attention", "reasoning", "learning", "neural", "inference"],
  },
  {
    name: "Language",
    color: "#a78bfa",
    center: [-1.45, 0.9, 0.55],
    words: ["language", "token", "syntax", "meaning", "context", "sentence", "semantic"],
  },
  {
    name: "Knowledge",
    color: "#f472b6",
    center: [1.35, 1.05, -0.65],
    words: ["knowledge", "memory", "concept", "fact", "wisdom", "science", "theory"],
  },
  {
    name: "Systems",
    color: "#60a5fa",
    center: [1.45, -1.0, 0.8],
    words: ["compute", "network", "vector", "matrix", "server", "data", "algorithm"],
  },
  {
    name: "Human",
    color: "#34d399",
    center: [-1.25, -1.05, -0.8],
    words: ["human", "thought", "emotion", "creative", "curious", "voice", "intent"],
  },
];

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.17 + salt * 47.31) * 43758.5453;
  return value - Math.floor(value);
}

const NODES: VectorNode[] = CLUSTERS.flatMap((cluster, clusterIndex) =>
  cluster.words.map((word, wordIndex) => {
    const index = clusterIndex * 11 + wordIndex;
    const spread = wordIndex === 0 ? 0.32 : 0.62;
    const position: Vec3 = [
      cluster.center[0] + (seeded(index, 1) - 0.5) * spread,
      cluster.center[1] + (seeded(index, 2) - 0.5) * spread,
      cluster.center[2] + (seeded(index, 3) - 0.5) * spread,
    ];
    return {
      id: `vec-${String(index + 1).padStart(3, "0")}`,
      word,
      cluster: clusterIndex,
      position,
      magnitude: 0.92 + seeded(index, 4) * 0.15,
    };
  }),
);

function distance(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function similarity(a: Vec3, b: Vec3) {
  return Math.max(0.5, Math.min(0.99, 1 - distance(a, b) / 5));
}

const EDGES: VectorEdge[] = NODES.flatMap((node, index) => {
  const nearest = NODES.map((candidate, candidateIndex) => ({
    candidate,
    candidateIndex,
    distance: distance(node.position, candidate.position),
  }))
    .filter(
      ({ candidate, candidateIndex }) =>
        candidateIndex > index && candidate.cluster === node.cluster,
    )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2);

  return nearest.map(({ candidate, candidateIndex }) => ({
    a: index,
    b: candidateIndex,
    similarity: similarity(node.position, candidate.position),
  }));
});

function neighborIndices(index: number) {
  return NODES.map((node, nodeIndex) => ({
    index: nodeIndex,
    distance: distance(NODES[index].position, node.position),
    similarity: similarity(NODES[index].position, node.position),
  }))
    .filter(({ index: nodeIndex }) => nodeIndex !== index)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);
}

function SemanticNode({
  index,
  selected,
  hovered,
  activeCluster,
  reducedMotion,
  onSelect,
  onHover,
}: {
  index: number;
  selected: boolean;
  hovered: boolean;
  activeCluster: number | null;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}) {
  const node = NODES[index];
  const cluster = CLUSTERS[node.cluster];
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const dimmed = activeCluster !== null && activeCluster !== node.cluster;

  useFrame(({ clock }, delta) => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) return;

    const pulse = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 2.2 + index) * 0.06;
    const target = selected ? 1.65 : hovered ? 1.35 : 1 + pulse;
    core.scale.lerp(new THREE.Vector3(target, target, target), Math.min(delta * 9, 1));
    halo.scale.setScalar(selected ? 2.5 + pulse : hovered ? 2.05 : 1.65 + pulse);
    (halo.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
      (halo.material as THREE.MeshBasicMaterial).opacity,
      selected ? 0.24 : hovered ? 0.15 : 0.045,
      Math.min(delta * 7, 1),
    );
  });

  return (
    <group position={node.position}>
      <mesh ref={haloRef} raycast={() => null} scale={1.65}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshBasicMaterial
          color={cluster.color}
          transparent
          opacity={0.045}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={coreRef}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(index);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(index);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "default";
          onHover(null);
        }}
      >
        <icosahedronGeometry args={[selected ? 0.105 : 0.08, 2]} />
        <meshStandardMaterial
          color={cluster.color}
          emissive={cluster.color}
          emissiveIntensity={selected ? 3.2 : hovered ? 2.2 : 1.1}
          metalness={0.25}
          roughness={0.18}
          transparent
          opacity={dimmed ? 0.18 : 1}
          toneMapped={false}
        />
      </mesh>
      {(selected || hovered) && (
        <Html center position={[0, 0.2, 0]} distanceFactor={7} style={{ pointerEvents: "none" }}>
          <div
            className="rounded-md border px-2 py-1 font-mono text-[9px] font-medium tracking-wide text-white shadow-xl backdrop-blur-md whitespace-nowrap"
            style={{
              borderColor: `${cluster.color}55`,
              background: "rgba(5, 8, 15, 0.88)",
              boxShadow: `0 0 20px ${cluster.color}22`,
            }}
          >
            {node.word} <span className="ml-1 text-white/40">{node.id}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function SimilarityPacket({
  start,
  end,
  color,
  offset,
  reducedMotion,
}: {
  start: Vec3;
  end: Vec3;
  color: string;
  offset: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const startVector = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVector = useMemo(() => new THREE.Vector3(...end), [end]);

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const progress = (clock.elapsedTime * 0.28 + offset) % 1;
    ref.current.position.lerpVectors(startVector, endVector, progress);
    const fade = Math.sin(progress * Math.PI);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;
  });

  if (reducedMotion) return null;

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.025, 10, 10]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function VectorSpace({
  selected,
  hovered,
  activeCluster,
  reducedMotion,
  onSelect,
  onHover,
}: {
  selected: number;
  hovered: number | null;
  activeCluster: number | null;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedNeighbors = useMemo(() => neighborIndices(selected), [selected]);
  const selectedSet = useMemo(
    () => new Set(selectedNeighbors.map((neighbor) => neighbor.index)),
    [selectedNeighbors],
  );

  useFrame((state, delta) => {
    if (!groupRef.current || reducedMotion) return;
    const targetX = -state.pointer.y * 0.08;
    const targetY = state.pointer.x * 0.08;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      Math.min(delta * 2, 1),
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetY,
      Math.min(delta * 2, 1),
    );
  });

  return (
    <group ref={groupRef}>
      <gridHelper
        args={[6, 12, "#334155", "#1e293b"]}
        position={[0, -1.75, 0]}
        material-transparent
        material-opacity={0.18}
      />
      <Line
        points={[
          [-2.6, 0, 0],
          [2.6, 0, 0],
        ]}
        color="#64748b"
        opacity={0.14}
        transparent
      />
      <Line
        points={[
          [0, -2, 0],
          [0, 2, 0],
        ]}
        color="#64748b"
        opacity={0.14}
        transparent
      />
      <Line
        points={[
          [0, 0, -2.4],
          [0, 0, 2.4],
        ]}
        color="#64748b"
        opacity={0.14}
        transparent
      />

      {EDGES.map((edge, edgeIndex) => {
        const connected = edge.a === selected || edge.b === selected;
        const cluster = CLUSTERS[NODES[edge.a].cluster];
        const dimmed = activeCluster !== null && activeCluster !== NODES[edge.a].cluster;
        return (
          <Line
            key={`${edge.a}-${edge.b}`}
            points={[NODES[edge.a].position, NODES[edge.b].position]}
            color={connected ? cluster.color : "#64748b"}
            lineWidth={connected ? 1.35 : 0.45}
            opacity={dimmed ? 0.015 : connected ? 0.72 : 0.12 + (edgeIndex % 3) * 0.02}
            transparent
            depthWrite={false}
          />
        );
      })}

      {selectedNeighbors.map((neighbor, index) => (
        <group key={neighbor.index}>
          <Line
            points={[NODES[selected].position, NODES[neighbor.index].position]}
            color={CLUSTERS[NODES[selected].cluster].color}
            lineWidth={1.1}
            opacity={0.52}
            transparent
            depthWrite={false}
          />
          <SimilarityPacket
            start={NODES[selected].position}
            end={NODES[neighbor.index].position}
            color={CLUSTERS[NODES[selected].cluster].color}
            offset={index * 0.21}
            reducedMotion={reducedMotion}
          />
        </group>
      ))}

      {NODES.map((_, index) => (
        <SemanticNode
          key={NODES[index].id}
          index={index}
          selected={selected === index}
          hovered={hovered === index}
          activeCluster={activeCluster}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}

      <Sparkles
        count={70}
        scale={[5, 3.8, 4]}
        size={1.1}
        speed={reducedMotion ? 0 : 0.12}
        opacity={0.18}
        color="#cbd5e1"
      />
    </group>
  );
}

export function HeroScene() {
  const defaultIndex = NODES.findIndex((node) => node.word === "transformer");
  const [selected, setSelected] = useState(defaultIndex);
  const [hovered, setHovered] = useState<number | null>(null);
  const [activeCluster, setActiveCluster] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projection, setProjection] = useState(98.4);
  const reducedMotion = useReducedMotion() ?? false;

  const selectedNode = NODES[selected];
  const cluster = CLUSTERS[selectedNode.cluster];
  const neighbors = useMemo(() => neighborIndices(selected), [selected]);
  const connectionCount = EDGES.filter((edge) => edge.a === selected || edge.b === selected).length;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProjection(98.1 + Math.random() * 0.7);
    }, 1400);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full w-full select-none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0.2, 0.1, 5.2], fov: 46 }}
        gl={{
          alpha: true,
          antialias: true,
          depth: true,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
        performance={{ min: 0.7, max: 1, debounce: 250 }}
        onPointerMissed={() => setHovered(null)}
      >
        <ambientLight intensity={0.55} />
        <pointLight position={[4, 5, 4]} intensity={1.2} color="#67e8f9" />
        <pointLight position={[-4, -3, -4]} intensity={1} color="#a78bfa" />
        <VectorSpace
          selected={selected}
          hovered={hovered}
          activeCluster={activeCluster}
          reducedMotion={reducedMotion}
          onSelect={setSelected}
          onHover={setHovered}
        />
        <OrbitControls
          enableZoom
          enablePan={false}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.45}
          dampingFactor={0.055}
          enableDamping
          rotateSpeed={0.42}
          minDistance={3.4}
          maxDistance={8}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 z-10 flex max-w-[58%] flex-wrap gap-1.5">
        {CLUSTERS.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActiveCluster((current) => (current === index ? null : index))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur-md transition-all ${
              activeCluster === index
                ? "border-white/20 bg-black/85 text-white"
                : "border-white/[0.06] bg-black/45 text-zinc-500 hover:border-white/15 hover:text-zinc-300"
            }`}
            aria-pressed={activeCluster === index}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
            />
            {item.name}
          </button>
        ))}
      </div>

      <div className="absolute right-4 top-4 z-10 w-56 pointer-events-none transition-all duration-500 sm:w-64">
        <div
          className={`pointer-events-auto overflow-hidden rounded-2xl border bg-black/80 backdrop-blur-md transition-all duration-500 ease-[var(--ease-smooth)] ${
            isCollapsed
              ? "ml-auto w-40 cursor-pointer border-white/10 p-2.5 shadow-[0_0_12px_rgba(255,255,255,0.03)] hover:bg-black/95"
              : "w-56 border-cyan-500/20 p-4 shadow-[0_0_20px_rgba(34,211,238,0.1)] sm:w-64"
          }`}
          onClick={() => {
            if (isCollapsed) setIsCollapsed(false);
          }}
        >
          <div
            className={`flex items-center justify-between transition-all duration-500 ${
              isCollapsed ? "max-h-8 opacity-100" : "max-h-0 pointer-events-none opacity-0"
            }`}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                VECTOR LOGS
              </span>
            </div>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 animate-pulse text-zinc-500" />
          </div>

          <div
            className={`transition-all duration-500 ${
              isCollapsed ? "max-h-0 pointer-events-none opacity-0" : "max-h-[410px] opacity-100"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                </span>
                <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                  HUD · VECTOR LOG
                </h4>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsCollapsed(true);
                }}
                className="pointer-events-auto cursor-pointer rounded p-1 text-zinc-500 transition-all hover:bg-white/10 hover:text-zinc-300"
                aria-label="Collapse vector diagnostics"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-white">
                  {selectedNode.word}
                </h3>
                <div className="mt-1 font-mono text-[9px] text-zinc-400">
                  {selectedNode.id} · {cluster.name}
                </div>
              </div>
              <LocateFixed className="mt-0.5 h-4 w-4 shrink-0" style={{ color: cluster.color }} />
            </div>

            <div className="my-3 h-px w-full bg-white/10" />

            <div className="mb-3 space-y-1.5 font-mono text-[9px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">DIMENSIONS:</span>
                <span className="text-zinc-300">1,536</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">L2 NORM:</span>
                <span className="text-zinc-300">{selectedNode.magnitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CONNECTIONS:</span>
                <span className="text-zinc-300">{connectionCount + neighbors.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">PROJECTION:</span>
                <span className="font-bold text-emerald-400">{projection.toFixed(1)}% STABLE</span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${projection}%`,
                    backgroundColor: cluster.color,
                    boxShadow: `0 0 8px ${cluster.color}88`,
                  }}
                />
              </div>
            </div>

            <div className="mb-2 h-px w-full bg-white/10" />
            <div className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-500">
              Nearest neighbors · cosine
            </div>
            <div className="space-y-0.5">
              {neighbors.map((neighbor) => {
                const node = NODES[neighbor.index];
                const nodeCluster = CLUSTERS[node.cluster];
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(neighbor.index);
                    }}
                    className="group flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <span className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-300 group-hover:text-white">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: nodeCluster.color }}
                      />
                      {node.word}
                    </span>
                    <span className="font-mono text-[8px] tabular-nums text-zinc-500">
                      {neighbor.similarity.toFixed(3)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 border-t border-white/10 pt-2 text-[9px] leading-relaxed text-zinc-500">
              Click any node or neighbor to inspect its semantic neighborhood.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
