import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Sphere } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function ParticleField() {
  const ref = useRef<THREE.Points>(null!);
  const { positions, colors } = useMemo(() => {
    const N = 1800;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const c1 = new THREE.Color("#7c5cff");
    const c2 = new THREE.Color("#ff5cc0");
    const c3 = new THREE.Color("#5cd6ff");
    for (let i = 0; i < N; i++) {
      // sphere shell with some noise
      const r = 2.6 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      const c = t < 0.4 ? c1 : t < 0.75 ? c2 : c3;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.06;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.18;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CoreOrb() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.25;
    ref.current.rotation.x = s.clock.elapsedTime * 0.12;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <Sphere ref={ref} args={[1.1, 64, 64]}>
        <meshStandardMaterial
          color="#1a1240"
          emissive="#7c5cff"
          emissiveIntensity={0.5}
          metalness={0.7}
          roughness={0.15}
          wireframe
        />
      </Sphere>
      <Sphere args={[1.4, 32, 32]}>
        <meshBasicMaterial
          color="#7c5cff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </Sphere>
    </Float>
  );
}

export function HeroScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6.5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#a78bfa" />
      <pointLight position={[-5, -3, -5]} intensity={1} color="#ec4899" />
      <CoreOrb />
      <ParticleField />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        rotateSpeed={0.4}
      />
    </Canvas>
  );
}
