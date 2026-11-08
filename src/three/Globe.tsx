// A real Moon or Mars globe built from NASA maps, with landing-site markers at true lat/lon.
import { forwardRef, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';

const BASE = import.meta.env.BASE_URL;
export const MAPS = {
  moon: { color: `${BASE}textures/moon.jpg`, height: `${BASE}textures/moon-height.jpg` },
  mars: { color: `${BASE}textures/mars.jpg`, height: null },
} as const;

/** Unit vector for a latitude/longitude, matching three.js sphere UVs on an equirectangular map. */
export function latLonToVec(lat: number, lon: number, r = 1) {
  const phi = THREE.MathUtils.degToRad(lon + 180);
  const theta = THREE.MathUtils.degToRad(90 - lat);
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}

/** Rotation that brings a site to face the +z axis (towards a default camera). */
export function faceSite(lat: number, lon: number) {
  const v = latLonToVec(lat, lon);
  return { y: Math.atan2(-v.x, v.z), x: THREE.MathUtils.degToRad(lat) };
}

export interface Site {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

interface Props {
  place: 'moon' | 'mars';
  radius?: number;
  sites?: Site[];
  activeSite?: string | null;
  showLabels?: boolean;
  labelOpacity?: number | (() => number);
  onPick?: (id: string) => void;
}

/** Label that hides itself when its site turns to the far side of the globe. */
function SiteLabel({ label, on, opacity, onPick }: { label: string; on: boolean; opacity: number | (() => number); onPick?: () => void }) {
  const anchor = useRef<THREE.Group>(null);
  const el = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), c: new THREE.Vector3(), n: new THREE.Vector3() }), []);
  useFrame(() => {
    const a = anchor.current;
    const parent = a?.parent?.parent; // marker group -> globe group
    if (!a || !parent || !el.current) return;
    a.getWorldPosition(tmp.p);
    parent.getWorldPosition(tmp.c);
    tmp.n.copy(tmp.p).sub(tmp.c).normalize();
    const facing = tmp.n.dot(tmp.c.copy(camera.position).sub(tmp.p).normalize());
    const o = typeof opacity === 'function' ? opacity() : opacity;
    const vis = THREE.MathUtils.clamp((facing - 0.05) * 5, 0, 1) * o;
    el.current.style.opacity = String(vis);
    el.current.style.pointerEvents = vis > 0.3 ? 'auto' : 'none';
  });
  return (
    <group ref={anchor}>
      <Html center zIndexRange={[10, 0]}>
        <div ref={el} style={{ opacity: 0 }}>
          {onPick ? (
            <button type="button" tabIndex={-1} className={`globe-label${on ? ' is-on' : ''}`} onClick={onPick}>
              {label}
            </button>
          ) : (
            <span className={`globe-label${on ? ' is-on' : ''}`}>{label}</span>
          )}
        </div>
      </Html>
    </group>
  );
}

function Atmosphere({ radius }: { radius: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { glow: { value: new THREE.Color('#ff9a63') } },
        vertexShader:
          'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 glow; varying vec3 vN; void main(){ float f = pow(max(0.0, 0.68 - dot(vN, vec3(0.0, 0.0, 1.0))), 5.0) * 0.9; gl_FragColor = vec4(glow, 1.0) * f; }',
      }),
    [],
  );
  return (
    <mesh scale={1.1} material={mat}>
      <sphereGeometry args={[radius, 64, 32]} />
    </mesh>
  );
}

export const Globe = forwardRef<THREE.Group, Props>(function Globe(
  { place, radius = 1, sites = [], activeSite = null, showLabels = true, labelOpacity = 1, onPick },
  ref,
) {
  const maps = MAPS[place];
  const color = useTexture(maps.color);
  const height = useTexture(maps.height ?? maps.color);
  useMemo(() => {
    color.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = 8;
  }, [color]);

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[radius, 192, 96]} />
        <meshStandardMaterial
          map={color}
          displacementMap={maps.height ? height : undefined}
          displacementScale={maps.height ? radius * 0.025 : 0}
          displacementBias={maps.height ? -radius * 0.0125 : 0}
          bumpMap={height}
          bumpScale={place === 'moon' ? 2.5 : 1.2}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {place === 'mars' && <Atmosphere radius={radius} />}
      {sites.map((s) => {
        const p = latLonToVec(s.lat, s.lon, radius * 1.012);
        const on = activeSite === s.id;
        return (
          <group key={s.id} position={p}>
            <mesh>
              <sphereGeometry args={[radius * (on ? 0.014 : 0.01), 16, 16]} />
              <meshBasicMaterial color={on ? '#ffffff' : '#ffcf7a'} toneMapped={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[radius * 0.024, 16, 16]} />
              <meshBasicMaterial color="#ffcf7a" transparent opacity={on ? 0.45 : 0.25} toneMapped={false} depthWrite={false} />
            </mesh>
            {showLabels && <SiteLabel label={s.label} on={on} opacity={labelOpacity} onPick={onPick ? () => onPick(s.id) : undefined} />}
          </group>
        );
      })}
    </group>
  );
});

useTexture.preload(MAPS.moon.color);
