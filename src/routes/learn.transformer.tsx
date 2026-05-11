import { createFileRoute } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/transformer")({
  head: () => ({
    meta: [
      { title: "Transformer Architecture — Latent" },
      {
        name: "description",
        content:
          "Step through the transformer architecture in 3D. From embeddings up through attention, feed-forward, and the output head.",
      },
      { property: "og:title", content: "Transformer Architecture — Latent" },
      {
        property: "og:description",
        content: "Interactive 3D tour of the transformer stack.",
      },
    ],
  }),
  component: Page,
});

const LAYERS = [
  { name: "Input Embeddings", color: "#5cd6ff", detail: "Tokens become dense vectors carrying initial meaning." },
  { name: "Positional Encoding", color: "#5cd6ff", detail: "Sinusoidal or learned signals inject order into the sequence." },
  { name: "Multi-Head Attention", color: "#a78bfa", detail: "Every token decides who to listen to — in parallel, with many heads." },
  { name: "Add & Norm", color: "#a78bfa", detail: "Residual connections + LayerNorm stabilize deep training." },
  { name: "Feed-Forward", color: "#ec4899", detail: "A wide MLP applied independently to each position. Where most params live." },
  { name: "Add & Norm", color: "#ec4899", detail: "Again the residual + norm pattern that makes deep stacks possible." },
  { name: "× N Blocks", color: "#f59e0b", detail: "This block stacks 12 to 120+ times depending on model size." },
  { name: "Output Projection", color: "#34d399", detail: "Final vectors become logits over the entire vocabulary." },
];

function Block({
  y,
  color,
  label,
  active,
  onClick,
}: {
  y: number;
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    const target = active ? 1.15 : 1;
    ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, target, 0.12);
    ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, target, 0.12);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      active ? 1.6 : 0.4,
      0.1,
    );
    ref.current.position.y = y + Math.sin(t * 1.2 + y) * 0.02;
  });
  return (
    <group position={[0, y, 0]} onClick={onClick}>
      <mesh ref={ref}>
        <boxGeometry args={[2.8, 0.35, 1.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>
      <Text
        position={[1.7, 0, 0]}
        anchorX="left"
        anchorY="middle"
        fontSize={0.18}
        color={active ? "#ffffff" : "#cbd5f5"}
      >
        {label}
      </Text>
    </group>
  );
}

function DataFlow() {
  const ref = useRef<THREE.Points>(null!);
  const N = 60;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2.2;
    positions[i * 3 + 1] = Math.random() * 6 - 1.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
  }
  useFrame((_, dt) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += dt * 0.4;
      if (arr[i + 1] > 4.5) arr[i + 1] = -1.7;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#a78bfa"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Page() {
  const [active, setActive] = useState(2);

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 07 · Transformer"
        title="The architecture that changed everything."
        description="The transformer is, at its heart, a stack of identical blocks. Each one is a small machine for mixing information across positions, then refining it. Stack enough of them and language emerges."
        prev={{ to: "/learn/attention", label: "Attention" }}
        next={{ to: "/curriculum", label: "Full curriculum" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,360px]">
          <div className="relative aspect-[5/6] sm:aspect-[5/5] rounded-3xl glass-strong overflow-hidden ring-glow">
            <Suspense fallback={<div className="h-full w-full animate-shimmer" />}>
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [4.5, 1.5, 5.5], fov: 50 }}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={0.4} />
                <pointLight position={[5, 5, 5]} intensity={1} color="#a78bfa" />
                <pointLight position={[-5, -3, -5]} intensity={1} color="#ec4899" />
                <DataFlow />
                {LAYERS.map((l, i) => (
                  <Block
                    key={l.name + i}
                    y={(LAYERS.length - 1 - i) * 0.55 - 1.2}
                    color={l.color}
                    label={l.name}
                    active={active === i}
                    onClick={() => setActive(i)}
                  />
                ))}
                <OrbitControls
                  enablePan={false}
                  autoRotate
                  autoRotateSpeed={0.3}
                  maxDistance={10}
                  minDistance={4}
                />
              </Canvas>
            </Suspense>
            <div className="absolute left-4 top-4 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground">
              click blocks to inspect
            </div>
          </div>

          <div className="space-y-3">
            {LAYERS.map((l, i) => (
              <motion.button
                key={l.name + i}
                onClick={() => setActive(i)}
                animate={{
                  scale: active === i ? 1 : 0.98,
                }}
                className={`w-full text-left rounded-2xl p-4 transition-all ${
                  active === i
                    ? "glass-strong ring-1"
                    : "glass hover:bg-white/[0.05]"
                }`}
                style={
                  active === i
                    ? {
                        boxShadow: `0 0 40px -8px ${l.color}55`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: l.color }}
                  />
                  <span className="text-sm font-medium">{l.name}</span>
                </div>
                {active === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 text-xs text-muted-foreground leading-relaxed"
                  >
                    {l.detail}
                  </motion.p>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
}
