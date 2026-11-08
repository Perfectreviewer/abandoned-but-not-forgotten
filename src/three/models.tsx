// Simplified, hand-built stand-ins for each object. They load instantly (no download),
// so the story works on slow mobile data. When the 3D lead has a compressed NASA glTF,
// set `modelPath` in objects.json and ModelViewer loads that instead.
import { useMemo } from 'react';
import * as THREE from 'three';
import type { ModelKind } from '../data/types';
import { foilNormal, solarTexture } from './textures';
import { LrvHD, RetroreflectorHD, SojournerHD, SurveyorHD } from './machines';

const M = {
  gold: { color: '#c9a23f', metalness: 0.85, roughness: 0.35 },
  silver: { color: '#b9bcc2', metalness: 0.8, roughness: 0.3 },
  white: { color: '#e9e6df', metalness: 0.1, roughness: 0.6 },
  dark: { color: '#2a2c33', metalness: 0.4, roughness: 0.6 },
  solar: { color: '#1b2c5a', metalness: 0.6, roughness: 0.25 },
  wheel: { color: '#8d8a83', metalness: 0.6, roughness: 0.5 },
  glass: { color: '#9fc7d8', metalness: 0.9, roughness: 0.05 },
  copper: { color: '#b4683a', metalness: 0.7, roughness: 0.4 },
} as const;

type Mat = keyof typeof M;
const mat = (m: Mat) =>
  m === 'gold' ? (
    <meshStandardMaterial {...M.gold} normalMap={foilNormal()} normalScale={new THREE.Vector2(0.9, 0.9)} />
  ) : m === 'solar' ? (
    <meshStandardMaterial {...M.solar} color="#ffffff" map={solarTexture()} />
  ) : (
    <meshStandardMaterial {...M[m]} />
  );

function Box({ p, s, m, r }: { p: [number, number, number]; s: [number, number, number]; m: Mat; r?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} castShadow receiveShadow>
      <boxGeometry args={s} />
      {mat(m)}
    </mesh>
  );
}

function Rod({ from, to, r = 0.025, m = 'silver' }: { from: [number, number, number]; to: [number, number, number]; r?: number; m?: Mat }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: dir.length() };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      {mat(m)}
    </mesh>
  );
}

function Wheel({ p, r = 0.3, w = 0.2, m = 'wheel' }: { p: [number, number, number]; r?: number; w?: number; m?: Mat }) {
  return (
    <group position={p} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, w, 24, 1, true]} />
        <meshStandardMaterial {...M[m]} side={THREE.DoubleSide} wireframe={m === 'wheel' && r > 0.25} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[r * 0.35, r * 0.35, w * 1.05, 12]} />
        {mat('dark')}
      </mesh>
    </group>
  );
}

function Opportunity() {
  return (
    <group>
      <Box p={[0, 0.0, 0]} s={[1.3, 0.38, 0.85]} m="white" />
      {/* solar deck with wings */}
      <Box p={[0, 0.22, 0]} s={[1.5, 0.04, 1.05]} m="solar" />
      <Box p={[-0.55, 0.22, 0.85]} s={[1.1, 0.03, 0.65]} m="solar" r={[0.05, 0, 0]} />
      <Box p={[-0.55, 0.22, -0.85]} s={[1.1, 0.03, 0.65]} m="solar" r={[-0.05, 0, 0]} />
      <Box p={[-1.0, 0.22, 0]} s={[0.4, 0.03, 0.9]} m="solar" />
      {/* mast and camera head */}
      <Rod from={[0.45, 0.24, 0.1]} to={[0.45, 1.1, 0.1]} r={0.04} />
      <Box p={[0.45, 1.17, 0.1]} s={[0.18, 0.14, 0.42]} m="white" />
      <mesh position={[0.55, 1.17, 0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
        {mat('dark')}
      </mesh>
      <mesh position={[0.55, 1.17, -0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
        {mat('dark')}
      </mesh>
      {/* high-gain antenna */}
      <mesh position={[-0.35, 0.42, -0.25]} rotation={[0.3, 0, 0.2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
        {mat('white')}
      </mesh>
      <Rod from={[-0.25, 0.24, 0.3]} to={[-0.25, 0.85, 0.3]} r={0.012} m="dark" />
      {/* robotic arm + tool turret */}
      <Rod from={[0.66, -0.05, 0.2]} to={[1.0, 0.05, 0.3]} r={0.03} />
      <Rod from={[1.0, 0.05, 0.3]} to={[1.12, -0.2, 0.3]} r={0.03} />
      <mesh position={[1.14, -0.28, 0.3]}>
        <cylinderGeometry args={[0.09, 0.09, 0.12, 12]} />
        {mat('silver')}
      </mesh>
      {/* rocker-bogie */}
      {[-0.55, 0.55].map((z) => (
        <group key={z}>
          <Rod from={[0.65, -0.48, z]} to={[0.0, -0.1, z]} r={0.03} />
          <Rod from={[0.0, -0.1, z]} to={[-0.35, -0.3, z]} r={0.03} />
          <Rod from={[-0.05, -0.48, z]} to={[-0.35, -0.3, z]} r={0.03} />
          <Rod from={[-0.65, -0.48, z]} to={[-0.35, -0.3, z]} r={0.03} />
          {[0.65, -0.05, -0.65].map((x) => (
            <Wheel key={x} p={[x, -0.5, z * 1.1]} r={0.15} w={0.15} m="silver" />
          ))}
        </group>
      ))}
    </group>
  );
}

function InSight() {
  return (
    <group>
      {/* deck */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.65, 0.65, 0.3, 6]} />
        {mat('white')}
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.04, 6]} />
        {mat('gold')}
      </mesh>
      {/* legs */}
      {[0, 2.09, 4.19].map((a) => (
        <group key={a}>
          <Rod from={[Math.cos(a) * 0.4, -0.05, Math.sin(a) * 0.4]} to={[Math.cos(a) * 0.65, -0.5, Math.sin(a) * 0.65]} r={0.035} />
          <mesh position={[Math.cos(a) * 0.65, -0.52, Math.sin(a) * 0.65]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
            {mat('silver')}
          </mesh>
        </group>
      ))}
      {/* round solar panels */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Rod from={[s * 0.6, 0.15, 0]} to={[s * 0.85, 0.15, 0]} r={0.03} />
          <mesh position={[s * 1.45, 0.15, 0]}>
            <cylinderGeometry args={[0.62, 0.62, 0.03, 10]} />
            {mat('solar')}
          </mesh>
        </group>
      ))}
      {/* robotic arm */}
      <Rod from={[0.3, 0.32, 0.35]} to={[0.6, 0.75, 0.55]} r={0.03} />
      <Rod from={[0.6, 0.75, 0.55]} to={[0.75, 0.35, 0.7]} r={0.03} />
      {/* SEIS under its wind and thermal shield */}
      <mesh position={[1.05, -0.55, 0.75]}>
        <sphereGeometry args={[0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {mat('white')}
      </mesh>
      <mesh position={[1.05, -0.54, 0.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 24]} />
        <meshStandardMaterial {...M.gold} side={THREE.DoubleSide} />
      </mesh>
      {/* HP3 heat probe support */}
      <Box p={[-1.0, -0.4, 0.8]} s={[0.22, 0.28, 0.18]} m="gold" />
      <Rod from={[-1.0, -0.55, 0.8]} to={[-1.0, -0.25, 0.8]} r={0.015} m="dark" />
      {/* weather booms */}
      <Rod from={[-0.3, 0.3, -0.4]} to={[-0.3, 0.7, -0.4]} r={0.012} m="dark" />
    </group>
  );
}

function Voyager() {
  return (
    <group rotation={[0.15, 0, 0]}>
      {/* high-gain dish */}
      <mesh position={[0, 2.35, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[2.0, 40, 10, 0, Math.PI * 2, 0, 0.45]} />
        <meshStandardMaterial {...M.white} side={THREE.DoubleSide} />
      </mesh>
      <Rod from={[0, 0.35, 0]} to={[0, 0.85, 0]} r={0.02} />
      <Rod from={[0, 0.35, 0]} to={[0, -0.1, 0]} r={0.035} />
      {/* bus */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
        {mat('silver')}
      </mesh>
      {/* golden record */}
      <mesh position={[0.4, -0.15, 0.3]} rotation={[0, 0.9, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
        {mat('gold')}
      </mesh>
      {/* RTG boom */}
      <Rod from={[-0.4, -0.25, 0]} to={[-1.45, -0.25, 0]} r={0.02} />
      {[-0.95, -1.15, -1.35].map((x) => (
        <mesh key={x} position={[x, -0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.16, 12]} />
          {mat('dark')}
        </mesh>
      ))}
      {/* science boom */}
      <Rod from={[0.4, -0.25, 0]} to={[1.3, -0.35, 0]} r={0.02} />
      <Box p={[1.35, -0.35, 0]} s={[0.22, 0.18, 0.18]} m="silver" />
      {/* magnetometer boom */}
      <Rod from={[0, -0.35, -0.3]} to={[-0.6, -0.9, -1.6]} r={0.008} m="dark" />
    </group>
  );
}

/** Where the ground sits under each hand-built model (their feet/wheels touch this height). */
export const GROUND_Y: Record<ModelKind, number> = {
  retroreflector: -0.62,
  lrv: -0.64,
  surveyor: -0.7,
  sojourner: -0.6,
  opportunity: -0.66,
  insight: -0.55,
  voyager: 0,
};

/**
 * How NASA glTF models are placed: scaled so their largest side is `fit` units,
 * then centred and set on the ground (or floated in space with `float`).
 * `rotate` fixes models exported facing a different way.
 */
export const NASA_FIT: Partial<Record<ModelKind, { fit: number; float?: boolean; rotate?: [number, number, number]; offset?: [number, number, number] }>> = {
  opportunity: { fit: 2.6 },
  insight: { fit: 3.8 },
  // the long magnetometer boom sets the size, so re-centre on the dish and body
  voyager: { fit: 9, float: true, offset: [0.13, 1.71, 2.57] },
};

/** How far the camera sits from each model, so wide ones (InSight's panels) fit in frame. */
export const CAMERA_DISTANCE: Record<ModelKind, number> = {
  retroreflector: 4.4,
  lrv: 4.5,
  surveyor: 6.2,
  sojourner: 3.4,
  opportunity: 5.0,
  insight: 6.2,
  voyager: 5.2,
};

export const MODELS: Record<ModelKind, () => JSX.Element> = {
  retroreflector: RetroreflectorHD,
  lrv: LrvHD,
  surveyor: SurveyorHD,
  sojourner: SojournerHD,
  opportunity: Opportunity,
  insight: InSight,
  voyager: Voyager,
};
