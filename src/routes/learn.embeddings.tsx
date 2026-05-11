import { createFileRoute } from "@tanstack/react-router";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/embeddings")({
  head: () => ({
    meta: [
      { title: "Embeddings — Latent" },
      {
        name: "description",
        content:
          "Fly through a 3D semantic space where related words cluster together. Learn how meaning becomes geometry.",
      },
      { property: "og:title", content: "Embeddings — Latent" },
      {
        property: "og:description",
        content: "3D semantic space visualization for word embeddings.",
      },
    ],
  }),
  component: Page,
});

type Word = { word: string; pos: [number, number, number]; cluster: number };

const CLUSTERS: { name: string; color: string; words: [string, [number, number, number]][] }[] = [
  {
    name: "Animals",
    color: "#ec4899",
    words: [
      ["cat", [-2.4, 1.2, 1.0]],
      ["dog", [-2.1, 1.6, 0.6]],
      ["wolf", [-2.7, 1.0, 0.2]],
      ["lion", [-2.3, 0.6, 1.3]],
      ["tiger", [-2.8, 0.8, 0.9]],
      ["puppy", [-1.9, 1.8, 1.1]],
    ],
  },
  {
    name: "Royalty",
    color: "#a78bfa",
    words: [
      ["king", [1.8, 1.6, -1.4]],
      ["queen", [2.2, 1.4, -1.1]],
      ["prince", [1.4, 1.9, -1.6]],
      ["princess", [1.7, 1.7, -0.9]],
      ["throne", [2.0, 1.0, -1.8]],
    ],
  },
  {
    name: "Technology",
    color: "#38bdf8",
    words: [
      ["computer", [2.2, -1.4, 1.2]],
      ["server", [2.6, -1.1, 0.8]],
      ["network", [1.9, -1.7, 1.5]],
      ["algorithm", [2.4, -0.9, 1.7]],
      ["data", [2.1, -1.3, 0.6]],
      ["model", [2.5, -0.7, 1.1]],
    ],
  },
  {
    name: "Emotions",
    color: "#f59e0b",
    words: [
      ["joy", [-1.6, -1.4, -1.0]],
      ["love", [-2.0, -1.1, -1.5]],
      ["fear", [-1.4, -1.8, -1.2]],
      ["anger", [-1.9, -1.6, -0.7]],
      ["hope", [-1.7, -0.9, -1.6]],
    ],
  },
  {
    name: "Food",
    color: "#34d399",
    words: [
      ["bread", [0.4, 2.2, 1.6]],
      ["pizza", [0.8, 2.4, 1.2]],
      ["pasta", [0.2, 2.0, 1.9]],
      ["sushi", [0.9, 1.9, 1.5]],
      ["coffee", [0.1, 2.5, 1.1]],
    ],
  },
];

const WORDS: Word[] = CLUSTERS.flatMap((c, i) =>
  c.words.map(([w, p]) => ({ word: w, pos: p, cluster: i })),
);

function WordPoint({
  word,
  position,
  color,
  active,
  onClick,
  selected,
}: {
  word: string;
  position: [number, number, number];
  color: string;
  active: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    const target = selected ? 0.14 : active ? 0.1 : 0.07;
    ref.current.scale.setScalar(
      THREE.MathUtils.lerp(ref.current.scale.x, target, 0.15),
    );
    const e = (ref.current.material as THREE.MeshStandardMaterial)
      .emissiveIntensity;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      THREE.MathUtils.lerp(e, selected ? 2.4 : active ? 1.4 : 0.6, 0.1);
    const t = s.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 1.2 + position[0]) * 0.03;
  });
  return (
    <group position={position}>
      <mesh ref={ref} onClick={onClick}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <Html
        center
        distanceFactor={8}
        position={[0, 0.18, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`px-2 py-0.5 rounded-md font-mono text-[11px] whitespace-nowrap transition-opacity ${
            selected || active ? "opacity-100" : "opacity-60"
          }`}
          style={{
            background: "rgba(15,15,35,0.7)",
            backdropFilter: "blur(8px)",
            color: "white",
            border: `1px solid ${color}55`,
          }}
        >
          {word}
        </div>
      </Html>
    </group>
  );
}

function Connections({ selectedIdx }: { selectedIdx: number | null }) {
  if (selectedIdx === null) return null;
  const sel = WORDS[selectedIdx];
  const sameCluster = WORDS.filter(
    (w, i) => i !== selectedIdx && w.cluster === sel.cluster,
  );
  return (
    <group>
      {sameCluster.map((w, i) => {
        const pts = [
          new THREE.Vector3(...sel.pos),
          new THREE.Vector3(...w.pos),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <line key={i}>
            <primitive object={geo} attach="geometry" />
            <lineBasicMaterial
              color={CLUSTERS[sel.cluster].color}
              transparent
              opacity={0.45}
            />
          </line>
        );
      })}
    </group>
  );
}

function Axes() {
  return (
    <group>
      {[
        { dir: [1, 0, 0], color: "#ff5cc0" },
        { dir: [0, 1, 0], color: "#7c5cff" },
        { dir: [0, 0, 1], color: "#5cd6ff" },
      ].map((a, i) => {
        const pts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(...(a.dir.map((v) => v * 3.2) as [number, number, number])),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <line key={i}>
            <primitive object={geo} attach="geometry" />
            <lineBasicMaterial color={a.color} transparent opacity={0.25} />
          </line>
        );
      })}
    </group>
  );
}

function Scene({
  selected,
  setSelected,
  highlightCluster,
}: {
  selected: number | null;
  setSelected: (i: number | null) => void;
  highlightCluster: number | null;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#a78bfa" />
      <pointLight position={[-5, -5, -5]} intensity={0.8} color="#ec4899" />
      <Axes />
      <Connections selectedIdx={selected} />
      {WORDS.map((w, i) => (
        <WordPoint
          key={i}
          word={w.word}
          position={w.pos}
          color={CLUSTERS[w.cluster].color}
          selected={selected === i}
          active={highlightCluster === w.cluster}
          onClick={() => setSelected(selected === i ? null : i)}
        />
      ))}
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
        maxDistance={12}
        minDistance={4}
      />
    </>
  );
}

function distance(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function Page() {
  const [selected, setSelected] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);

  const neighbors = useMemo(() => {
    if (selected === null) return [];
    const sel = WORDS[selected];
    return WORDS.map((w, i) => ({ ...w, i, d: distance(sel.pos, w.pos) }))
      .filter((w) => w.i !== selected)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
  }, [selected]);

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 03 · Embeddings"
        title="Meaning has geometry."
        description="An embedding is a list of numbers that places a word in a high-dimensional space. Words that mean similar things sit close together. We've projected a tiny example down to 3D so you can fly through it."
        prev={{ to: "/learn/tokenization", label: "Tokenization" }}
        next={{ to: "/learn/attention", label: "Attention" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
          <div className="relative aspect-[5/4] w-full rounded-3xl glass-strong overflow-hidden ring-glow">
            <Suspense fallback={<div className="h-full w-full animate-shimmer" />}>
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [5, 3, 6], fov: 50 }}
                gl={{ antialias: true, alpha: true }}
              >
                <Scene
                  selected={selected}
                  setSelected={setSelected}
                  highlightCluster={highlight}
                />
              </Canvas>
            </Suspense>
            <div className="absolute left-4 top-4 flex flex-wrap gap-1.5 max-w-[80%]">
              {CLUSTERS.map((c, i) => (
                <button
                  key={c.name}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseLeave={() => setHighlight(null)}
                  className="inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-[11px] text-foreground/80 hover:text-foreground transition-colors"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
            <div className="absolute right-4 bottom-4 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground">
              drag · scroll · click points
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Selected
              </div>
              <div className="mt-1 text-2xl font-semibold font-mono">
                {selected !== null ? WORDS[selected].word : "—"}
              </div>
              {selected !== null && (
                <div className="mt-2 text-xs text-muted-foreground">
                  cluster ·{" "}
                  <span style={{ color: CLUSTERS[WORDS[selected].cluster].color }}>
                    {CLUSTERS[WORDS[selected].cluster].name}
                  </span>
                </div>
              )}
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Nearest neighbors
              </div>
              <div className="mt-3 space-y-2">
                {neighbors.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Click a point to find its closest meanings.
                  </div>
                )}
                {neighbors.map((n) => (
                  <button
                    key={n.i}
                    onClick={() => setSelected(n.i)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-mono">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: CLUSTERS[n.cluster].color }}
                      />
                      {n.word}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {n.d.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Why it works
              </div>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                During training, the model nudges similar words closer and
                dissimilar ones apart. The result: arithmetic on meaning. The
                classic example —{" "}
                <span className="font-mono">king − man + woman ≈ queen</span> —
                is a real consequence of this geometry.
              </p>
            </div>
          </div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}
