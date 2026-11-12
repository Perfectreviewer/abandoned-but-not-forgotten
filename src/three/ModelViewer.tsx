// "Meet the machine" scene (FR-03, FR-09). Lazy-loaded so the landing page never pays for it.
// - Real NASA glTF models where NASA publishes one; hand-built stand-ins otherwise.
// - Sculpted terrain, sky and harsh sunlight for the Moon and Mars; deep space for Voyager.
// - GSAP flies the camera in on arrival and over to each part when a hotspot is picked.
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import type { ModelKind, SpaceObject } from '../data/types';
import { CAMERA_DISTANCE, GROUND_Y, MODELS, NASA_FIT } from './models';
import { EarthInSky, Sky, SunLight, Terrain } from './Surface';
import { foilNormal } from './textures';

const BASE = import.meta.env.BASE_URL;
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

/** Dev helper: open a story with ?debug and click the model to print hotspot coordinates. */
function logPoint(e: ThreeEvent<MouseEvent>) {
  e.stopPropagation();
  const p = e.point;
  // eslint-disable-next-line no-console
  console.log(`[hotspot] "position": [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]`);
}

interface Props {
  object: SpaceObject;
  active: string | null;
  onHotspot: (id: string) => void;
  reducedMotion: boolean;
}

/** A NASA glTF, scaled to a known size and set down on the ground. */
export function NasaModel({ path, kind }: { path: string; kind: ModelKind }) {
  const { scene } = useGLTF(path);
  const cfg = NASA_FIT[kind] ?? { fit: 2.6 };
  const obj = useMemo(() => {
    const root = scene.clone(true);
    if (cfg.rotate) root.rotation.set(...cfg.rotate);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          const s = mat as THREE.MeshStandardMaterial;
          if (s.isMeshStandardMaterial) {
            s.envMapIntensity = 0.9;
            // NASA's files ship flat defaults; give foil a crinkled metal finish and paint a satin one
            if (/foil|gold|mli/i.test(s.name)) {
              s.metalness = 0.95;
              s.roughness = 0.28;
              s.normalMap = foilNormal();
              s.normalScale = new THREE.Vector2(1.1, 1.1);
            } else if (s.metalness === 0) {
              s.metalness = 0.25;
              s.roughness = 0.62;
            }
          }
          mat.side = THREE.DoubleSide; // some NASA meshes have flipped faces
        });
      }
    });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    root.scale.multiplyScalar(cfg.fit / Math.max(size.x, size.y, size.z));
    root.updateMatrixWorld(true);
    box.setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.x -= c.x;
    root.position.z -= c.z;
    root.position.y -= cfg.float ? c.y : box.min.y - GROUND_Y[kind];
    if (cfg.offset) root.position.add(new THREE.Vector3(...cfg.offset));
    return root;
  }, [scene, cfg, kind]);
  return <primitive object={obj} />;
}

/** The Apollo Lunar Module in the background of the Apollo-era scenes. */
function LunarModuleBackdrop({ kind }: { kind: ModelKind }) {
  const { scene } = useGLTF(`${BASE}models/lunar-module.glb`);
  const obj = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    root.scale.multiplyScalar(3.4 / size.y); // an LM was about 7 m tall
    root.updateMatrixWorld(true);
    box.setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z);
    return root;
  }, [scene]);
  const where: Record<string, [number, number, number]> = {
    retroreflector: [-4.2, 0, -6.5],
    lrv: [-5.5, 0, -7.5],
    surveyor: [-7.5, 0, -11], // Apollo 12 landed about 180 m from Surveyor 3
  };
  return (
    <group position={where[kind]} rotation={[0, 0.6, 0]}>
      <group position={[0, GROUND_Y[kind] - 0.05, 0]}>
        <primitive object={obj} />
      </group>
    </group>
  );
}

/** If a glTF fails to load, fall back to the hand-built stand-in instead of a blank canvas. */
export class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const DIR = new THREE.Vector3(0.62, 0.24, 0.75).normalize();
const HOME_TARGET = new THREE.Vector3(0, 0.15, 0);

/** GSAP camera moves: a fly-in when the scene opens, and a glide to each picked part. */
function CameraRig({ object, active, reducedMotion }: { object: SpaceObject; active: string | null; reducedMotion: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const dist = CAMERA_DISTANCE[object.modelKind];
  const home = useMemo(() => DIR.clone().multiplyScalar(dist), [dist]);

  // Fly in from high above on first load.
  useEffect(() => {
    if (!controls) return;
    controls.target.copy(HOME_TARGET);
    if (reducedMotion) {
      camera.position.copy(home);
      controls.update();
      return;
    }
    camera.position.copy(home.clone().multiplyScalar(2.6).add(new THREE.Vector3(-2, 4, 0)));
    const tw = gsap.to(camera.position, { x: home.x, y: home.y, z: home.z, duration: 2.6, ease: 'power3.out', onUpdate: () => controls.update() });
    return () => {
      tw.kill();
    };
  }, [controls, camera, home, reducedMotion]);

  // Glide to the picked part, or back home.
  useEffect(() => {
    if (!controls) return;
    const hs = object.hotspots.find((h) => h.id === active);
    const target = hs ? new THREE.Vector3(...hs.position) : HOME_TARGET.clone();
    let pos: THREE.Vector3;
    if (hs) {
      const out = camera.position.clone().sub(controls.target).normalize();
      out.y = Math.max(out.y, 0.25);
      pos = target.clone().add(out.normalize().multiplyScalar(Math.max(1.9, dist * 0.42)));
    } else {
      pos = home.clone();
    }
    const d = reducedMotion ? 0 : 1.4;
    const tl = gsap.timeline({ defaults: { duration: d, ease: 'power2.inOut' }, onUpdate: () => controls.update() });
    tl.to(controls.target, { x: target.x, y: target.y, z: target.z }, 0).to(camera.position, { x: pos.x, y: pos.y, z: pos.z }, 0);
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, controls]);

  return null;
}

/** Studio-free reflections: a few soft light panels baked into an environment map (no download). */
function Reflections({ place }: { place: SpaceObject['location'] }) {
  const warm = place === 'mars';
  return (
    <Environment resolution={128} frames={1} background={false}>
      <Lightformer intensity={2.2} position={[6, 7, 4]} scale={[6, 6, 1]} color={warm ? '#ffe2c4' : '#ffffff'} />
      <Lightformer intensity={0.6} position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color={warm ? '#a0502a' : '#6e6a62'} />
      <Lightformer intensity={0.4} position={[-6, 2, -4]} scale={[8, 4, 1]} color={warm ? '#d6a27a' : '#2a3050'} />
    </Environment>
  );
}

export default function ModelViewer({ object, active, onHotspot, reducedMotion }: Props) {
  const Stand = MODELS[object.modelKind];
  const place = object.location;
  const space = place === 'interstellar';
  const kind = object.modelKind;
  const apollo = kind === 'retroreflector' || kind === 'lrv' || kind === 'surveyor';
  const dist = CAMERA_DISTANCE[kind];
  const start = DIR.clone().multiplyScalar(dist);

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.6]}
      camera={{ position: [start.x, start.y, start.z], fov: 38, near: 0.05, far: 200 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: place === 'mars' ? 1.0 : 0.95 }}
      aria-hidden="true"
    >
      <Sky place={place} />
      <SunLight place={place} />
      <Reflections place={place} />
      {place === 'moon' && <EarthInSky />}
      {space && (
        <mesh position={[30, 12, -60]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color="#fff6e0" toneMapped={false} />
        </mesh>
      )}

      <Suspense fallback={null}>
        <group onClick={DEBUG ? logPoint : undefined}>
        {place === 'moon' || place === 'mars' ? <Terrain place={place} y={GROUND_Y[kind]} /> : null}
        {object.modelPath ? (
          <ModelBoundary fallback={<Stand />}>
            <NasaModel path={`${BASE}${object.modelPath}`} kind={kind} />
          </ModelBoundary>
        ) : (
          <Stand />
        )}
        {apollo && (
          <ModelBoundary fallback={null}>
            <LunarModuleBackdrop kind={kind} />
          </ModelBoundary>
        )}
        </group>
      </Suspense>


      {object.hotspots.map((h, i) => (
        <Html key={h.id} position={h.position} center zIndexRange={[20, 0]}>
          <button type="button" className={`hotspot-pin${active === h.id ? ' is-active' : ''}`} onClick={() => onHotspot(h.id)} aria-label={h.label} tabIndex={-1}>
            {i + 1}
          </button>
        </Html>
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={1.6}
        maxDistance={dist * 1.8}
        autoRotate={!DEBUG && !reducedMotion && active === null}
        autoRotateSpeed={0.45}
        maxPolarAngle={space ? Math.PI : Math.PI / 2 - 0.08}
      />
      <CameraRig object={object} active={active} reducedMotion={reducedMotion} />

      <EffectComposer multisampling={0}>
        {/* ambient occlusion: soft contact shadows where parts meet each other and the ground */}
        <N8AO aoRadius={0.35} distanceFalloff={0.6} intensity={2.2} halfRes quality="medium" />
        <Bloom intensity={0.35} luminanceThreshold={0.9} mipmapBlur />
        <SMAA />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </Canvas>
  );
}
