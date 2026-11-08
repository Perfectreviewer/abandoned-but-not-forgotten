// Terrain, sky and lighting for each place: the Moon, Mars and deep space.
import { useMemo } from 'react';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';
import { fbm, rng } from './noise';
import { regolithTexture } from './textures';

type Place = 'moon' | 'mars' | 'interstellar';

/** Rolling ground with craters (Moon) or scattered rocks (Mars). The object sits near y = 0. */
export function Terrain({ place, y = 0 }: { place: 'moon' | 'mars'; y?: number }) {
  const geo = useMemo(() => {
    const size = 60;
    const seg = 220;
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const rand = rng(place === 'moon' ? 42 : 7);
    const craters = Array.from({ length: place === 'moon' ? 26 : 8 }, () => {
      const r = 0.6 + rand() * (rand() < 0.15 ? 5 : 1.6);
      let cx = (rand() - 0.5) * size * 0.9;
      let cz = (rand() - 0.5) * size * 0.9;
      // keep the stage clear for the object
      if (Math.hypot(cx, cz) < r + 3.2) cx += Math.sign(cx || 1) * (r + 4);
      if (Math.hypot(cx, cz) < r + 3.2) cz += Math.sign(cz || 1) * (r + 4);
      return { cx, cz, r, d: r * (0.18 + rand() * 0.1) };
    });
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z);
      const flat = THREE.MathUtils.smoothstep(dist, 2.5, 9); // flat stage in the middle
      let h = (fbm(x / 9, z / 9, 5, place === 'moon' ? 2 : 6) - 0.5) * (place === 'moon' ? 1.8 : 2.6) * flat;
      h += (fbm(x * 0.7, z * 0.7, 3, 13) - 0.5) * 0.08; // small bumps everywhere
      for (const c of craters) {
        const d = Math.hypot(x - c.cx, z - c.cz) / c.r;
        if (d < 1) h -= c.d * (1 - d * d);
        else if (d < 1.5) h += c.d * 0.35 * Math.sin(((d - 1) / 0.5) * Math.PI); // raised rim
      }
      // distant ridge line on the horizon
      h += THREE.MathUtils.smoothstep(dist, 16, 30) * (fbm(x / 5, z / 5, 3, 21) * (place === 'moon' ? 4 : 3));
      pos.setY(i, h);
    }
    g.computeVertexNormals();
    return g;
  }, [place]);

  const rocks = useMemo(() => {
    const rand = rng(place === 'moon' ? 99 : 5);
    return Array.from({ length: place === 'mars' ? 140 : 60 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 2.3 + rand() * 14;
      const s = (place === 'mars' ? 0.05 : 0.04) + Math.pow(rand(), 3) * 0.35;
      return { p: [Math.cos(a) * r, s * 0.3, Math.sin(a) * r] as [number, number, number], s, rot: [rand() * 3, rand() * 3, rand() * 3] as [number, number, number] };
    });
  }, [place]);

  const tex = regolithTexture(place);
  const rockColor = place === 'moon' ? '#7d7a74' : '#7a3c22';

  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial map={tex} roughness={1} metalness={0} />
      </mesh>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} rotation={r.rot} scale={[r.s, r.s * 0.7, r.s]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={rockColor} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Sky dome: black with stars on the Moon, butterscotch haze on Mars. */
export function Sky({ place }: { place: Place }) {
  const mat = useMemo(() => {
    if (place !== 'mars') return null;
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#6e5a4a') },
        horizon: { value: new THREE.Color('#d6a27a') },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float t = pow(clamp(vP.y,0.0,1.0), 0.55); gl_FragColor = vec4(mix(horizon, top, t), 1.0); }',
    });
  }, [place]);

  if (place === 'mars') {
    return (
      <>
        <mesh material={mat!}>
          <sphereGeometry args={[80, 32, 16]} />
        </mesh>
        <fog attach="fog" args={['#c99674', 14, 55]} />
      </>
    );
  }
  return (
    <>
      <color attach="background" args={['#020205']} />
      <Stars radius={70} depth={30} count={place === 'interstellar' ? 6000 : 3000} factor={3} saturation={0} fade speed={0} />
      {place === 'moon' && <fog attach="fog" args={['#020205', 30, 60]} />}
    </>
  );
}

/** A small Earth hanging in the black lunar sky. */
export function EarthInSky() {
  return (
    <group position={[-18, 14, -40]}>
      <mesh>
        <sphereGeometry args={[2.2, 48, 32]} />
        <meshStandardMaterial color="#3a6fc4" emissive="#1b3a7a" emissiveIntensity={0.35} roughness={0.6} />
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[2.2, 48, 32]} />
        <meshBasicMaterial color="#8fc0ff" transparent opacity={0.18} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/** Harsh sunlight. The Moon has no air to soften shadows; Mars light is warmer and dimmer. */
export function SunLight({ place }: { place: Place }) {
  const intensity = place === 'moon' ? 3.4 : place === 'mars' ? 2.4 : 3.0;
  const color = place === 'mars' ? '#ffe2c4' : '#ffffff';
  return (
    <>
      <ambientLight intensity={place === 'mars' ? 0.35 : 0.06} color={place === 'mars' ? '#ffcfa8' : '#9fb0ff'} />
      <hemisphereLight args={[place === 'mars' ? '#e8b48e' : '#2a3050', place === 'mars' ? '#6a2e18' : '#4a4740', place === 'mars' ? 0.55 : 0.35]} />
      <directionalLight
        position={[6, 7, 4]}
        intensity={intensity}
        color={color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      {/* a weak fill from the ground bounce so shadowed sides are not pure black */}
      <directionalLight position={[-4, 1.5, -3]} intensity={place === 'moon' ? 0.35 : 0.5} color={place === 'mars' ? '#d98a5c' : '#9aa5c8'} />
    </>
  );
}
