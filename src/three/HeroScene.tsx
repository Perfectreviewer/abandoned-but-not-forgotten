// Landing-page flight: from the Moon (with its three landing sites) across to Mars.
// The camera follows a spline whose position along it is driven by GSAP ScrollTrigger.
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Globe, faceSite, latLonToVec, type Site } from './Globe';

export interface HeroProps {
  /** 0..1, written by GSAP as the visitor scrolls. */
  progress: { value: number };
  moonSites: Site[];
  marsSites: Site[];
  onPick: (id: string) => void;
  /** Click-to-fly: GSAP tweens value 0 -> 1 and the camera dives to that world (and site, if given). */
  dive: { value: number; place: 'moon' | 'mars' | null; id: string | null };
}

/** Lets the camera rig ask the planets where a landing site currently is in the scene. */
interface SiteApi {
  locate: ((id: string, out: THREE.Vector3) => boolean) | null;
}

const MOON = new THREE.Vector3(0, 0, 0);
const MARS = new THREE.Vector3(16, -2.5, -26);

// Camera keyframes [position, lookAt]. Not to scale: the real trip is ~80 million km.
const KEYS: [THREE.Vector3, THREE.Vector3][] = [
  [new THREE.Vector3(0, 0.4, 9.5), new THREE.Vector3(-2.6, 0, 0)],
  [new THREE.Vector3(0.6, 0.9, 4.6), new THREE.Vector3(0.9, 0.3, 0)],
  [new THREE.Vector3(6, 2.2, -4), new THREE.Vector3(10, -1, -16)],
  [MARS.clone().add(new THREE.Vector3(-0.8, 0.6, 6.4)), MARS.clone().add(new THREE.Vector3(1.7, 0.1, 0))],
  [MARS.clone().add(new THREE.Vector3(-0.5, 0.9, 8.6)), MARS.clone().add(new THREE.Vector3(-2.3, 0, 0))],
];

// Portrait phones: keep each planet centred in the top half, above the captions.
const KEYS_PORTRAIT: [THREE.Vector3, THREE.Vector3][] = [
  [new THREE.Vector3(0, -2.2, 17), new THREE.Vector3(0, -2.8, 0)],
  [new THREE.Vector3(0.4, -1.4, 13.5), new THREE.Vector3(0.3, -2.4, 0)],
  [new THREE.Vector3(6, 2.2, -4), new THREE.Vector3(10, -1, -16)],
  [MARS.clone().add(new THREE.Vector3(-0.4, -1.2, 12.5)), MARS.clone().add(new THREE.Vector3(0, -2.0, 0))],
  [MARS.clone().add(new THREE.Vector3(0, -1.4, 15.5)), MARS.clone().add(new THREE.Vector3(0, -2.4, 0))],
];

function Rig({ progress, dive, api }: { progress: { value: number }; dive: HeroProps['dive']; api: SiteApi }) {
  const goal = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), n: new THREE.Vector3(), site: new THREE.Vector3() }), []);
  const portrait = useThree((s) => s.size.width < s.size.height);
  const keys = portrait ? KEYS_PORTRAIT : KEYS;
  const pos = useMemo(() => new THREE.CatmullRomCurve3(keys.map((k) => k[0]), false, 'centripetal'), [keys]);
  const look = useMemo(() => new THREE.CatmullRomCurve3(keys.map((k) => k[1]), false, 'centripetal'), [keys]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const mouse = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    const t = THREE.MathUtils.clamp(progress.value, 0, 1);
    // gentle drift with the pointer for depth
    mouse.current.x = THREE.MathUtils.damp(mouse.current.x, state.pointer.x, 2, dt);
    mouse.current.y = THREE.MathUtils.damp(mouse.current.y, state.pointer.y, 2, dt);
    pos.getPoint(t, state.camera.position);
    state.camera.position.x += mouse.current.x * 0.25;
    state.camera.position.y += mouse.current.y * 0.15;
    look.getPoint(t, target);
    if (dive.value > 0 && dive.place) {
      // fly from the scroll path down to the chosen world, ending just above the site
      const C = dive.place === 'moon' ? MOON : MARS;
      const R = dive.place === 'moon' ? 2 : 1.6;
      if (dive.id && api.locate?.(dive.id, goal.site)) {
        goal.n.copy(goal.site).sub(C).normalize();
        goal.pos.copy(C).addScaledVector(goal.n, R * 1.28);
        goal.look.copy(goal.site);
      } else {
        goal.n.copy(state.camera.position).sub(C).normalize();
        goal.pos.copy(C).addScaledVector(goal.n, R * 1.42);
        goal.look.copy(C);
      }
      state.camera.position.lerp(goal.pos, dive.value);
      target.lerp(goal.look, dive.value);
    }
    state.camera.lookAt(target);
  });
  return null;
}

function Planets({ progress, moonSites, marsSites, onPick, dive, api }: HeroProps & { api: SiteApi }) {
  const moon = useRef<THREE.Group>(null);
  const mars = useRef<THREE.Group>(null);
  const near = faceSite(8, 0); // the Moon's near side, where Apollo landed
  const labels = useRef({ moon: 0, mars: 0 });

  // tell the camera rig where a site is right now (the globes keep turning)
  api.locate = (id, out) => {
    const onMoon = moonSites.find((s) => s.id === id);
    const s = onMoon ?? marsSites.find((m) => m.id === id);
    const g = onMoon ? moon.current : mars.current;
    if (!s || !g) return false;
    out.copy(latLonToVec(s.lat, s.lon, onMoon ? 2 : 1.6));
    g.localToWorld(out);
    return true;
  };

  useFrame((state, dt) => {
    const t = progress.value;
    if (moon.current) moon.current.rotation.y = near.y + Math.sin(state.clock.elapsedTime * 0.08) * 0.06 - 0.25 * (1 - t);
    if (mars.current) {
      // sweep from Sojourner/Opportunity (west) round to InSight (east) as you scroll
      const sweep = THREE.MathUtils.smoothstep(t, 0.62, 1);
      const a = faceSite(10, THREE.MathUtils.lerp(-20, 125, sweep));
      mars.current.rotation.set(a.x * 0.6, a.y, 0);
    }
    labels.current.moon = THREE.MathUtils.damp(labels.current.moon, dive.value === 0 && t > 0.16 && t < 0.45 ? 1 : 0, 6, dt);
    labels.current.mars = THREE.MathUtils.damp(labels.current.mars, dive.value === 0 && t > 0.66 && t < 0.9 ? 1 : 0, 6, dt);
  });

  return (
    <>
      <group position={MOON}>
        <group rotation={[near.x, 0, 0]}>
          <Globe ref={moon} place="moon" radius={2} sites={moonSites} onPick={onPick} labelOpacity={() => labels.current.moon} />
        </group>
      </group>
      <group position={MARS}>
        <Globe ref={mars} place="mars" radius={1.6} sites={marsSites} onPick={onPick} labelOpacity={() => labels.current.mars} />
      </group>
    </>
  );
}

export default function HeroScene(props: HeroProps) {
  const api = useMemo<SiteApi>(() => ({ locate: null }), []);
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: 38, near: 0.1, far: 400, position: [0, 0.4, 7.2] }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} aria-hidden="true">
      <color attach="background" args={['#020206']} />
      <ambientLight intensity={0.03} />
      {/* the Sun, off to the left, gives both worlds a crisp day/night line */}
      <directionalLight position={[-12, 3, 7]} intensity={4} />
      <Stars radius={120} depth={60} count={7000} factor={4} saturation={0} fade speed={0.4} />
      <Suspense fallback={null}>
        <Planets {...props} api={api} />
      </Suspense>
      <Rig progress={props.progress} dive={props.dive} api={api} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.6} luminanceThreshold={0.85} mipmapBlur />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
