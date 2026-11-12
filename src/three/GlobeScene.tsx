// Interactive Moon/Mars globe. Used on the Moon and Mars pages (drag to spin, pick a site)
// and in chapter 4, where GSAP scrubs a zoom from orbit down to the landing site.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import gsap from 'gsap';
import { Globe, faceSite, type Site } from './Globe';

export interface GlobeSceneProps {
  place: 'moon' | 'mars';
  sites: Site[];
  active: string | null;
  onPick?: (id: string) => void;
  /** When given, scrolling drives a zoom from orbit (0) to the active site (1). */
  zoom?: { value: number };
  /** Click-to-dive: GSAP tweens this 0 -> 1 and the camera flies down to the active site. */
  dive?: { value: number };
  /** True while a dive is in progress: drag is disabled and labels hide. */
  diving?: boolean;
  reducedMotion?: boolean;
}

function Spinner({ place, sites, active, onPick, zoom, dive, diving, reducedMotion }: GlobeSceneProps) {
  const diveFrom = useRef<THREE.Vector3 | null>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const rot = useRef({ x: 0.15, y: 0 });
  const auto = useRef(true);
  const site = sites.find((s) => s.id === active);
  const { camera } = useThree();

  // GSAP turns the globe so the chosen site faces you.
  useEffect(() => {
    if (!site) {
      auto.current = true;
      return;
    }
    auto.current = false;
    const f = faceSite(site.lat, site.lon);
    // pick the shortest way round
    const cur = rot.current.y;
    let y = f.y;
    while (y - cur > Math.PI) y -= Math.PI * 2;
    while (y - cur < -Math.PI) y += Math.PI * 2;
    const tw = gsap.to(rot.current, { x: f.x, y, duration: reducedMotion ? 0 : 1.6, ease: 'power3.inOut' });
    return () => {
      tw.kill();
    };
  }, [site, reducedMotion]);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (auto.current && !reducedMotion && !zoom && !diving) rot.current.y += dt * 0.08;
    if (dive && dive.value > 0) {
      // fly from wherever the camera is to just above the site (which faces +z)
      if (!diveFrom.current) diveFrom.current = camera.position.clone();
      const e = dive.value;
      tmp.set(0, 0.2, 1.24);
      camera.position.lerpVectors(diveFrom.current, tmp, e);
      // arc slightly outward mid-flight so it reads as a descent, not a straight zoom
      camera.position.y += Math.sin(e * Math.PI) * 0.35;
      camera.lookAt(0, 0, THREE.MathUtils.lerp(0, 1, e));
    } else if (diveFrom.current) {
      diveFrom.current = null;
    }
    if (tilt.current) tilt.current.rotation.x = rot.current.x;
    if (spin.current) spin.current.rotation.y = rot.current.y;
    if (zoom) {
      // orbit -> skim the surface above the site (site faces +z after rotation)
      const z = THREE.MathUtils.clamp(zoom.value, 0, 1);
      const e = 1 - Math.pow(1 - z, 3);
      tmp.set(0, THREE.MathUtils.lerp(0.6, 0.32, e), THREE.MathUtils.lerp(4.4, 1.48, e));
      camera.position.copy(tmp);
      camera.lookAt(0, 0, THREE.MathUtils.lerp(0, 1, e)); // end on the site itself
      if (spin.current && site) spin.current.rotation.y = rot.current.y + (1 - e) * 0.9; // last stretch of the turn
    }
  });

  return (
    <group ref={tilt}>
      <Globe ref={spin} place={place} radius={1} sites={sites} activeSite={active} onPick={onPick} markerScale={zoom ? () => 1 - zoom.value * 0.8 : dive ? () => 1 - dive.value * 0.86 : undefined}
        labelOpacity={zoom ? () => (zoom.value > 0.75 ? 0 : 1) : dive ? () => (dive.value > 0.25 ? 0 : 1) : 1} />
    </group>
  );
}

export default function GlobeScene(props: GlobeSceneProps) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: 36, position: [0, 0.6, 4.4], near: 0.01, far: 300 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} aria-hidden="true">
      <color attach="background" args={['#020206']} />
      <ambientLight intensity={0.05} />
      <directionalLight position={[-6, 2, 5]} intensity={3} />
      <Stars radius={60} depth={30} count={3000} factor={3} saturation={0} fade speed={0.3} />
      <Suspense fallback={null}>
        <Spinner {...props} />
      </Suspense>
      {!props.zoom && <OrbitControls enabled={!props.diving} enablePan={false} enableZoom={false} rotateSpeed={0.5} />}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.5} luminanceThreshold={0.85} mipmapBlur />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
