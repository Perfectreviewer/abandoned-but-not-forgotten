// The Hangar: one machine at a time on a glowing pedestal under a spotlight.
// It turns slowly, can be dragged to spin, and each new machine rises into place (GSAP).
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Grid, Lightformer, OrbitControls, Sparkles } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import gsap from 'gsap';
import type { SpaceObject } from '../data/types';
import { CAMERA_DISTANCE, GROUND_Y, MODELS } from './models';
import { ModelBoundary, NasaModel } from './ModelViewer';

const BASE = import.meta.env.BASE_URL;

export interface HangarProps {
  object: SpaceObject;
  reducedMotion: boolean;
}

/** The machine itself: rises onto the pedestal when it changes, then turns slowly. */
function Exhibit({ object, reducedMotion }: HangarProps) {
  const rise = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const Stand = MODELS[object.modelKind];
  const ground = GROUND_Y[object.modelKind];

  useLayoutEffect(() => {
    const g = rise.current;
    if (!g || reducedMotion) return;
    const tl = gsap.timeline();
    tl.fromTo(g.position, { y: -1.2 }, { y: 0, duration: 1.3, ease: 'expo.out' }, 0)
      .fromTo(g.scale, { x: 0.55, y: 0.55, z: 0.55 }, { x: 1, y: 1, z: 1, duration: 1.3, ease: 'expo.out' }, 0)
      .fromTo(g.rotation, { y: -1.6 }, { y: 0, duration: 1.6, ease: 'power3.out' }, 0);
    return () => {
      tl.kill();
    };
  }, [object.id, reducedMotion]);

  useFrame((_, dt) => {
    if (spin.current && !reducedMotion) spin.current.rotation.y += dt * 0.22;
  });

  return (
    <group ref={rise}>
      <group ref={spin} position={[0, -ground, 0]}>
        {object.modelPath ? (
          <ModelBoundary fallback={<Stand />}>
            <NasaModel path={`${BASE}${object.modelPath}`} kind={object.modelKind} />
          </ModelBoundary>
        ) : (
          <Stand />
        )}
      </group>
    </group>
  );
}

/** Pedestal with a glowing rim and a slowly counter-rotating holographic ring. */
function Pedestal({ color }: { color: string }) {
  const ring = useRef<THREE.Mesh>(null);
  const ticks = useMemo(() => Array.from({ length: 48 }, (_, i) => (i / 48) * Math.PI * 2), []);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z -= dt * 0.15;
  });
  return (
    <group position={[0, -0.02, 0]}>
      <mesh position={[0, -0.09, 0]} receiveShadow>
        <cylinderGeometry args={[2.25, 2.45, 0.18, 96]} />
        <meshStandardMaterial color="#12141f" metalness={0.9} roughness={0.32} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[2.2, 96]} />
        <meshStandardMaterial color="#0c0d16" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* glowing rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[2.16, 2.22, 128]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* holographic tick ring */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <ringGeometry args={[2.62, 2.64, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
        {ticks.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 2.74, Math.sin(a) * 2.74, 0]} rotation={[0, 0, a]}>
            <planeGeometry args={[i % 4 === 0 ? 0.16 : 0.07, 0.012]} />
            <meshBasicMaterial color={color} transparent opacity={i % 4 === 0 ? 0.9 : 0.45} toneMapped={false} />
          </mesh>
        ))}
      </mesh>
      {/* soft spotlight cone */}
      <mesh position={[0, 3.4, 0]}>
        <coneGeometry args={[2.1, 7, 48, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.014} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function HangarScene({ object, reducedMotion }: HangarProps) {
  const mars = object.location === 'mars';
  const accent = mars ? '#ff9b63' : '#ffcf7a';
  const rim = mars ? '#ff6a3d' : '#7fa8ff';
  const d = CAMERA_DISTANCE[object.modelKind] * 1.02;
  const dir = useMemo(() => new THREE.Vector3(0.5, 0.3, 0.82).normalize(), []);

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.6]}
      camera={{ position: [dir.x * 5.4, dir.y * 5.4 + 0.5, dir.z * 5.4], fov: 36, near: 0.05, far: 120 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#05060d', 9, 26]} />
      <ambientLight intensity={0.12} />
      <spotLight position={[0, 9, 2]} angle={0.42} penumbra={0.9} intensity={160} color="#fff3dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
      <directionalLight position={[-6, 3, -4]} intensity={2.2} color={rim} />
      <directionalLight position={[6, 2, 5]} intensity={0.7} color="#ffffff" />
      <Environment resolution={128} frames={1} background={false}>
        <Lightformer intensity={3} position={[0, 6, 2]} scale={[8, 4, 1]} rotation-x={Math.PI / 2} color="#fff3dc" />
        <Lightformer intensity={1.6} position={[-6, 2, -3]} scale={[3, 6, 1]} color={rim} />
        <Lightformer intensity={0.8} position={[6, 1, 4]} scale={[3, 5, 1]} color="#ffffff" />
      </Environment>

      <Suspense fallback={null}>
        <Exhibit key={object.id} object={object} reducedMotion={reducedMotion} />
      </Suspense>
      <Pedestal color={accent} />
      <ContactShadows position={[0, 0.02, 0]} scale={6} blur={2.4} opacity={0.55} far={3} />
      <Grid position={[0, -0.19, 0]} infiniteGrid cellSize={0.6} sectionSize={3} cellThickness={0.5} sectionThickness={1} cellColor="#23263a" sectionColor="#3a3f63" fadeDistance={22} fadeStrength={2.5} />
      {!reducedMotion && <Sparkles count={70} scale={[9, 5, 9]} position={[0, 2.2, 0]} size={2.2} speed={0.25} opacity={0.55} color={accent} />}

      <OrbitControls
        key={object.id}
        enablePan={false}
        enableZoom={false}
        enableDamping
        rotateSpeed={0.6}
        minDistance={d}
        maxDistance={d}
        minPolarAngle={0.7}
        maxPolarAngle={Math.PI / 2 - 0.06}
        target={[0, object.modelKind === 'surveyor' ? 1.0 : 0.65, 0]}
      />

      <EffectComposer multisampling={4}>
        <Bloom intensity={0.7} luminanceThreshold={0.8} mipmapBlur />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
