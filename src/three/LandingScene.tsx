// Intro loader: a lander descends to the lunar surface with its engine burning,
// kicks up dust, touches down and settles on its legs. One GSAP timeline drives
// the descent, thrust, dust, camera move and the progress number.
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import gsap from 'gsap';
import { fbm, rng } from './noise';
import { foilNormal, regolithTexture } from './textures';
import { EarthInSky } from './Surface';

export interface LandingProps {
  onProgress: (p: number) => void;
  onDone: () => void;
}

interface Anim {
  thrust: number; // engine power 0..1
  dust: number; // touchdown dust ring 0..1
  cam: number; // camera move 0..1
  shake: number;
}

function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60, 110, 110);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = Math.hypot(x, z);
      const flat = THREE.MathUtils.smoothstep(d, 2.5, 8);
      let h = (fbm(x / 8, z / 8, 4, 4) - 0.5) * 1.6 * flat + (fbm(x, z, 2, 9) - 0.5) * 0.06;
      h += THREE.MathUtils.smoothstep(d, 14, 28) * fbm(x / 5, z / 5, 3, 17) * 3.5;
      pos.setY(i, h);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const rocks = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 40 }, () => {
      const a = r() * Math.PI * 2;
      const d = 2.6 + r() * 12;
      const s = 0.05 + Math.pow(r(), 3) * 0.3;
      return { p: [Math.cos(a) * d, s * 0.3, Math.sin(a) * d] as [number, number, number], s, rot: [r() * 3, r() * 3, r() * 3] as [number, number, number] };
    });
  }, []);
  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial map={regolithTexture('moon')} roughness={1} />
      </mesh>
      {rocks.map((k, i) => (
        <mesh key={i} position={k.p} rotation={k.rot} scale={[k.s, k.s * 0.7, k.s]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7d7a74" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A compact lunar lander: gold-foil descent stage, silver cabin, four legs, engine bell. */
function Lander({ anim }: { anim: Anim }) {
  const flame = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const legs = [0, 1, 2, 3].map((i) => (i / 4) * Math.PI * 2 + Math.PI / 4);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d6a84a', metalness: 1, roughness: 0.3, normalMap: foilNormal(), normalScale: new THREE.Vector2(1.4, 1.4) }), []);
  const silver = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfd2d9', metalness: 0.9, roughness: 0.35 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2c33', metalness: 0.6, roughness: 0.5 }), []);

  useFrame((s) => {
    const f = anim.thrust * (0.85 + Math.sin(s.clock.elapsedTime * 60) * 0.08 + Math.sin(s.clock.elapsedTime * 37) * 0.07);
    if (flame.current) {
      flame.current.scale.set(0.7 + f * 0.4, Math.max(0.001, f), 0.7 + f * 0.4);
      flame.current.visible = f > 0.02;
    }
    if (glow.current) glow.current.intensity = f * 40;
  });

  const leg = (a: number, i: number) => {
    const top = new THREE.Vector3(Math.cos(a) * 0.62, 0.95, Math.sin(a) * 0.62);
    const foot = new THREE.Vector3(Math.cos(a) * 1.25, 0.05, Math.sin(a) * 1.25);
    const mid = top.clone().add(foot).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(top).normalize());
    return (
      <group key={i}>
        <mesh position={mid} quaternion={q} castShadow material={silver}>
          <cylinderGeometry args={[0.035, 0.035, top.distanceTo(foot), 8]} />
        </mesh>
        <mesh position={[foot.x, 0.03, foot.z]} castShadow material={gold}>
          <cylinderGeometry args={[0.17, 0.2, 0.06, 20]} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {/* descent stage */}
      <mesh position={[0, 0.98, 0]} castShadow material={gold}>
        <cylinderGeometry args={[0.82, 0.82, 0.6, 8]} />
      </mesh>
      {/* cabin */}
      <mesh position={[0, 1.62, 0]} castShadow material={silver}>
        <cylinderGeometry args={[0.52, 0.66, 0.7, 10]} />
      </mesh>
      <mesh position={[0, 2.02, 0]} castShadow material={silver}>
        <sphereGeometry args={[0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* window, hatch, antenna */}
      <mesh position={[0.35, 1.72, 0.42]} rotation={[0, 0.7, 0]}>
        <planeGeometry args={[0.22, 0.2]} />
        <meshStandardMaterial color="#12203a" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.3, 2.5, 0]} material={silver}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
      </mesh>
      <mesh position={[-0.3, 2.82, 0]} rotation={[0.4, 0, 0.5]} material={silver}>
        <coneGeometry args={[0.2, 0.1, 20, 1, true]} />
      </mesh>
      {/* engine bell */}
      <mesh position={[0, 0.56, 0]} material={dark}>
        <cylinderGeometry args={[0.16, 0.3, 0.34, 20, 1, true]} />
      </mesh>
      {legs.map(leg)}
      {/* engine flame */}
      <group ref={flame} position={[0, 0.42, 0]}>
        <mesh position={[0, -0.75, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.26, 1.5, 24, 1, true]} />
          <meshBasicMaterial color="#ff8a3c" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.13, 0.9, 20, 1, true]} />
          <meshBasicMaterial color="#fff6dc" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={glow} position={[0, 0.2, 0]} color="#ff9a4a" distance={7} decay={2} />
    </group>
  );
}

/** Dust blown outward by the engine near the ground, then a ring that expands at touchdown. */
function Dust({ anim, lander }: { anim: Anim; lander: RefObject<THREE.Group> }) {
  const disc = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const pts = useRef<THREE.Points>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, 'rgba(210,205,195,0)');
    grad.addColorStop(0.35, 'rgba(210,205,195,0.9)');
    grad.addColorStop(1, 'rgba(210,205,195,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  const { geo, dirs } = useMemo(() => {
    const r = rng(5);
    const n = 260;
    const pos = new Float32Array(n * 3);
    const d: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      d.push(Math.cos(a), 0.15 + r() * 0.6, Math.sin(a), 0.5 + r());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo: g, dirs: d };
  }, []);

  useFrame(() => {
    const y = lander.current?.position.y ?? 9;
    const near = THREE.MathUtils.clamp(1 - y / 3, 0, 1) * anim.thrust; // engine wash
    if (disc.current) {
      const s = 2 + near * 5;
      disc.current.scale.set(s, s, 1);
      (disc.current.material as THREE.MeshBasicMaterial).opacity = near * 0.5;
    }
    if (ring.current) {
      const s = 1.5 + anim.dust * 9;
      ring.current.scale.set(s, s, 1);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = anim.dust > 0 ? (1 - anim.dust) * 0.55 : 0;
    }
    if (pts.current) {
      const p = geo.attributes.position as THREE.BufferAttribute;
      const t = Math.max(near * 0.6, anim.dust);
      for (let i = 0; i < p.count; i++) {
        const k = i * 4;
        const reach = t * 5 * dirs[k + 3];
        p.setXYZ(i, dirs[k] * (0.6 + reach), dirs[k + 1] * reach * (1 - t * 0.6), dirs[k + 2] * (0.6 + reach));
      }
      p.needsUpdate = true;
      (pts.current.material as THREE.PointsMaterial).opacity = t > 0 ? Math.min(0.7, (1 - anim.dust) * 0.8) : 0;
    }
  });

  return (
    <group position={[0, 0.03, 0]}>
      <mesh ref={disc} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} />
      </mesh>
      <points ref={pts} geometry={geo}>
        <pointsMaterial color="#cfc9bd" size={0.07} transparent opacity={0} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  );
}

function Sequence({ onProgress, onDone }: LandingProps) {
  const lander = useRef<THREE.Group>(null);
  const anim = useMemo<Anim>(() => ({ thrust: 1, dust: 0, cam: 0, shake: 0 }), []);
  const { camera } = useThree();

  useLayoutEffect(() => {
    const g = lander.current;
    if (!g) return;
    const tl = gsap.timeline({ onUpdate: () => onProgress(Math.min(1, tl.time() / 2.9)), onComplete: onDone });
    tl.fromTo(g.position, { y: 7.5 }, { y: 0, duration: 2.6, ease: 'power2.out' }, 0)
      .fromTo(g.rotation, { z: 0.1, x: -0.06, y: -0.5 }, { z: 0, x: 0, y: 0, duration: 2.6, ease: 'sine.out' }, 0)
      .fromTo(anim, { cam: 0 }, { cam: 1, duration: 3.6, ease: 'sine.inOut' }, 0)
      .to(anim, { thrust: 0, duration: 0.3, ease: 'power2.in' }, 2.5)
      // touchdown: legs take the load, dust rolls outward, the camera feels it
      .to(g.position, { y: -0.07, duration: 0.12, ease: 'power2.out' }, 2.6)
      .to(g.position, { y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, 2.72)
      .fromTo(anim, { dust: 0 }, { dust: 1, duration: 1.3, ease: 'power2.out' }, 2.55)
      .fromTo(anim, { shake: 1 }, { shake: 0, duration: 0.5, ease: 'power2.out' }, 2.6)
      .to({}, { duration: 0.25 });
    return () => {
      tl.kill();
    };
  }, [anim, onDone, onProgress]);

  useFrame((s) => {
    // slow arc around the landing site, easing closer
    const a = THREE.MathUtils.lerp(-0.75, 0.2, anim.cam);
    const d = THREE.MathUtils.lerp(10.5, 6.6, anim.cam);
    const sh = anim.shake * 0.06;
    camera.position.set(Math.sin(a) * d + Math.sin(s.clock.elapsedTime * 70) * sh, THREE.MathUtils.lerp(2.6, 1.5, anim.cam) + Math.cos(s.clock.elapsedTime * 83) * sh, Math.cos(a) * d);
    const ly = lander.current ? lander.current.position.y : 0;
    camera.lookAt(0, 1.1 + ly * 0.55, 0);
  });

  return (
    <>
      <group ref={lander}>
        <Lander anim={anim} />
      </group>
      <Dust anim={anim} lander={lander} />
    </>
  );
}

export default function LandingScene(props: LandingProps) {
  return (
    <Canvas shadows="soft" dpr={[1, 1.6]} camera={{ fov: 40, near: 0.1, far: 200, position: [-7, 2.6, 8] }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} aria-hidden="true">
      <color attach="background" args={['#020205']} />
      <fog attach="fog" args={['#020205', 26, 58]} />
      <ambientLight intensity={0.05} color="#9fb0ff" />
      <hemisphereLight args={['#2a3050', '#4a4740', 0.3]} />
      <directionalLight
        position={[6, 7, 4]}
        intensity={3.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
      />
      <Stars radius={70} depth={30} count={3500} factor={3} saturation={0} fade speed={0} />
      <EarthInSky />
      <Ground />
      <Sequence {...props} />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.9} luminanceThreshold={0.7} mipmapBlur />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
