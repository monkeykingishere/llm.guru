import { createFileRoute } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/learn/neural-network")({
  head: () => ({
    meta: [
      { title: "Neural Networks — Latent" },
      {
        name: "description",
        content:
          "Build intuition for how layers of artificial neurons compose to form a model. Tune the architecture and watch activations flow.",
      },
      { property: "og:title", content: "Neural Networks — Latent" },
      {
        property: "og:description",
        content: "Interactive 3D neural network with live activation flow.",
      },
    ],
  }),
  component: Page,
});

function useLayers(sizes: number[]) {
  return useMemo(() => {
    const xs = sizes.map((_, i) => (i - (sizes.length - 1) / 2) * 1.7);
    return sizes.map((n, li) => {
      const ys: number[] = [];
      const gap = 0.55;
      for (let i = 0; i < n; i++) ys.push((i - (n - 1) / 2) * gap);
      return ys.map((y) => [xs[li], y, 0] as [number, number, number]);
    });
  }, [sizes]);
}

function Edges({
  layers,
  activations,
}: {
  layers: [number, number, number][][];
  activations: number[][];
}) {
  const lines = useMemo(() => {
    const arr: { a: THREE.Vector3; b: THREE.Vector3; w: number }[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const from = layers[l];
      const to = layers[l + 1];
      for (let i = 0; i < from.length; i++) {
        for (let j = 0; j < to.length; j++) {
          // Pseudo-random weight derived deterministically
          const w = Math.sin((i + 1) * (j + 2) * (l + 3) * 1.337) * 0.5 + 0.5;
          arr.push({
            a: new THREE.Vector3(...from[i]),
            b: new THREE.Vector3(...to[j]),
            w,
          });
        }
      }
    }
    return arr;
  }, [layers]);

  return (
    <group>
      {lines.map((ln, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints([ln.a, ln.b]);
        const fromLayer = Math.floor(i / 1); // not exact, but cheap
        // Use activation-based color: average of endpoints
        const act = ln.w;
        return (
          <line key={i}>
            <primitive object={geo} attach="geometry" />
            <lineBasicMaterial
              color={new THREE.Color().setHSL(0.72 - act * 0.2, 0.7, 0.5)}
              transparent
              opacity={0.06 + act * 0.25}
            />
          </line>
        );
      })}
    </group>
  );
}

function Neurons({
  layers,
  activations,
}: {
  layers: [number, number, number][][];
  activations: number[][];
}) {
  const refs = useRef<THREE.Mesh[][]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((row, li) => {
      row?.forEach((m, ni) => {
        if (!m) return;
        const a = activations[li]?.[ni] ?? 0.4;
        const target = 0.18 + a * 0.18;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, target, 0.12));
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          0.4 + a * 1.8,
          0.1,
        );
        m.position.x =
          layers[li][ni][0] + Math.sin(t * 1.5 + li + ni) * 0.015;
      });
    });
  });
  return (
    <group>
      {layers.map((row, li) => (
        <group key={li}>
          {row.map((p, ni) => (
            <mesh
              key={ni}
              position={p}
              ref={(el) => {
                if (!refs.current[li]) refs.current[li] = [];
                if (el) refs.current[li][ni] = el;
              }}
            >
              <sphereGeometry args={[1, 24, 24]} />
              <meshStandardMaterial
                color="#a78bfa"
                emissive="#7c5cff"
                emissiveIntensity={0.6}
                metalness={0.4}
                roughness={0.3}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function FlowPulse({
  layers,
  speed,
}: {
  layers: [number, number, number][][];
  speed: number;
}) {
  const ref = useRef<THREE.Points>(null!);
  const data = useMemo(() => {
    const N = 200;
    const positions = new Float32Array(N * 3);
    const t = new Float32Array(N);
    const edges: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      for (const a of layers[l]) {
        for (const b of layers[l + 1]) {
          edges.push({
            a: new THREE.Vector3(...a),
            b: new THREE.Vector3(...b),
          });
        }
      }
    }
    for (let i = 0; i < N; i++) {
      t[i] = Math.random();
      const e = edges[i % edges.length];
      const v = e.a.clone().lerp(e.b, t[i]);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    return { positions, t, edges, N };
  }, [layers]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < data.N; i++) {
      data.t[i] += dt * speed;
      if (data.t[i] > 1) data.t[i] -= 1;
      const e = data.edges[i % data.edges.length];
      const x = e.a.x + (e.b.x - e.a.x) * data.t[i];
      const y = e.a.y + (e.b.y - e.a.y) * data.t[i];
      const z = e.a.z + (e.b.z - e.a.z) * data.t[i];
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#f0abfc"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function Page() {
  const [hidden, setHidden] = useState(2);
  const [width, setWidth] = useState(5);
  const [speed, setSpeed] = useState(0.6);

  const sizes = useMemo(() => {
    const arr = [4];
    for (let i = 0; i < hidden; i++) arr.push(width);
    arr.push(3);
    return arr;
  }, [hidden, width]);

  const layers = useLayers(sizes);
  const activations = useMemo(
    () =>
      sizes.map((n, li) =>
        Array.from({ length: n }, (_, i) =>
          Math.abs(Math.sin((i + 1) * (li + 2) * 1.111)),
        ),
      ),
    [sizes],
  );

  const totalParams = useMemo(() => {
    let p = 0;
    for (let i = 0; i < sizes.length - 1; i++) p += sizes[i] * sizes[i + 1] + sizes[i + 1];
    return p;
  }, [sizes]);

  return (
    <PageShell>
      <ModuleLayout
        eyebrow="Module 05 · Neural Networks"
        title="A choir of simple cells."
        description="A neural network is just layers of tiny functions — each one a weighted sum followed by a nonlinearity. Stack a few, and you can approximate almost anything."
        prev={{ to: "/learn/embeddings", label: "Embeddings" }}
        next={{ to: "/learn/attention", label: "Attention" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,320px]">
          <div className="relative aspect-[5/4] rounded-3xl glass-strong overflow-hidden ring-glow">
            <Suspense fallback={<div className="h-full w-full animate-shimmer" />}>
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0, 8.5], fov: 50 }}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={0.45} />
                <pointLight position={[5, 5, 5]} intensity={1} color="#a78bfa" />
                <pointLight position={[-5, -3, -5]} intensity={1} color="#ec4899" />
                <Edges layers={layers} activations={activations} />
                <Neurons layers={layers} activations={activations} />
                <FlowPulse layers={layers} speed={speed} />
                <OrbitControls
                  enablePan={false}
                  autoRotate
                  autoRotateSpeed={0.25}
                  maxDistance={14}
                  minDistance={5}
                />
              </Canvas>
            </Suspense>
            <div className="absolute left-4 top-4 flex gap-1.5">
              {sizes.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full glass px-2 py-0.5 text-[11px] font-mono text-foreground/80"
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="absolute right-4 bottom-4 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground">
              params · {totalParams.toLocaleString()}
            </div>
          </div>

          <div className="space-y-4">
            <Slider label="Hidden layers" value={hidden} min={1} max={5} onChange={setHidden} />
            <Slider label="Layer width" value={width} min={2} max={9} onChange={setWidth} />
            <Slider
              label="Signal speed"
              value={Math.round(speed * 10)}
              min={1}
              max={20}
              onChange={(v) => setSpeed(v / 10)}
              format={(v) => `${(v / 10).toFixed(1)}×`}
            />
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Why depth helps
              </div>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                Each layer composes the features of the previous one. Early
                layers learn edges, later layers learn shapes, and the final
                layers learn concepts. The same principle scales from MNIST to
                GPT.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-5"
          >
            <div className="text-sm font-medium">Forward pass</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Inputs flow left to right. Each neuron computes a weighted sum of
              the previous layer, adds a bias, and squashes it through a
              nonlinearity like ReLU or GELU.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-5"
          >
            <div className="text-sm font-medium">Backward pass</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Error flows right to left via the chain rule. Each weight is
              nudged by a small amount proportional to how much it contributed
              to the mistake.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5"
          >
            <div className="text-sm font-medium">Universal approximator</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Given enough neurons, a network with a single hidden layer can
              approximate any continuous function. Depth makes this efficient,
              not just possible.
            </p>
          </motion.div>
        </div>
      </ModuleLayout>
    </PageShell>
  );
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
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-mono text-gradient">
          {format ? format(value) : value}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="mt-3 w-full accent-[color:var(--glow-violet)]"
      />
    </div>
  );
}
