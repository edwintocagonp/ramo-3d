import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { TOP_Y } from "./arrange";
import { mulberry32 } from "./flowers";

const GOLD = { color: "#f0c85a", metalness: 1, roughness: 0.3, envMapIntensity: 1.4 } as const;

export function Crown({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position} rotation={[0.18, 0.3, -0.06]} scale={0.8}>
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.38, 0.2, 40, 1, true]} />
        <meshStandardMaterial {...GOLD} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * 0.4, 0.24, Math.cos(a) * 0.4]} rotation={[Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15]}>
            <mesh castShadow>
              <coneGeometry args={[0.09, 0.3, 12]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <sphereGeometry args={[0.045, 14, 10]} />
              <meshPhysicalMaterial color="#fbf6ee" roughness={0.15} clearcoat={1} />
            </mesh>
            <mesh position={[0, -0.18, 0.02]}>
              <sphereGeometry args={[0.04, 12, 8]} />
              <meshPhysicalMaterial color={i % 2 ? "#c1123a" : "#2f62d6"} roughness={0.1} clearcoat={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function wingTexture(colors: [string, string]) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(0, size / 2);
  const wing = new Path2D("M4 0 C 30 -110, 210 -125, 236 -40 C 250 10, 170 20, 120 10 C 190 40, 200 110, 120 115 C 60 118, 20 60, 4 0 Z");
  const g = ctx.createRadialGradient(10, 0, 10, 10, 0, 240);
  g.addColorStop(0, colors[1]);
  g.addColorStop(0.35, colors[0]);
  g.addColorStop(0.82, colors[0]);
  g.addColorStop(0.9, "#1a1412");
  ctx.fillStyle = g;
  ctx.fill(wing);
  ctx.strokeStyle = "#1a1412";
  ctx.lineWidth = 7;
  ctx.stroke(wing);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(200 + Math.cos(i * 0.7) * 22 - i * 4, -70 + i * 12, 3 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BUTTERFLIES: [string, string][] = [
  ["#f08a24", "#ffd08a"],
  ["#2f74f0", "#9fd0ff"],
  ["#ee7fb0", "#ffe1ee"],
];

export function Butterflies({ radius }: { radius: number }) {
  const textures = useMemo(() => BUTTERFLIES.map(wingTexture), []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const refs = useRef(BUTTERFLIES.map(() => ({ body: null as THREE.Group | null, wings: [null, null] as (THREE.Group | null)[] })));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((b, i) => {
      if (!b.body) return;
      const a = t * (0.32 + i * 0.07) + i * 2.1;
      const r = radius + 0.65 + 0.25 * Math.sin(t * 0.7 + i);
      const y = TOP_Y - 0.3 + i * 0.45 + 0.25 * Math.sin(t * 1.3 + i * 2);
      b.body.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      b.body.rotation.set(-0.25, -a, 0);
      const flap = 0.15 + 1.05 * Math.abs(Math.sin(t * (11 + i * 1.7)));
      b.wings.forEach((w, k) => w && (w.rotation.z = (k ? -1 : 1) * flap));
    });
  });

  return (
    <group>
      {textures.map((tex, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i].body = g;
            if (g) g.rotation.order = "YXZ";
          }}
          scale={0.62}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.025, 0.32, 4, 8]} />
            <meshStandardMaterial color="#1b1512" roughness={0.6} />
          </mesh>
          {[1, -1].map((side, k) => (
            <group key={side} ref={(g) => void (refs.current[i].wings[k] = g)}>
              <mesh position={[side * 0.25, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[side, 1, 1]}>
                <planeGeometry args={[0.5, 0.5]} />
                <meshStandardMaterial map={tex} transparent alphaTest={0.4} side={THREE.DoubleSide} roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

export function FairyLights({ points }: { points: THREE.Vector3[] }) {
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const wire = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 4, 0.005, 4), [points]);
  useEffect(() => () => wire.dispose(), [wire]);
  const warm = useMemo(() => new THREE.Color("#ffb45c").multiplyScalar(4), []);
  const c = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const m = bulbs.current;
    if (!m) return;
    const d = new THREE.Object3D();
    points.forEach((p, i) => {
      d.position.copy(p);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, warm);
    });
    m.count = points.length;
    m.instanceMatrix.needsUpdate = true;
  }, [points, warm]);

  useFrame(({ clock }) => {
    const m = bulbs.current;
    if (!m || !m.instanceColor) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < m.count; i++) m.setColorAt(i, c.copy(warm).multiplyScalar(0.55 + 0.45 * Math.sin(t * 2.4 + i * 1.9) ** 2));
    m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={wire}>
        <meshStandardMaterial color="#c9a46a" metalness={0.6} roughness={0.4} />
      </mesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, 64]} count={0} frustumCulled={false}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function Chocolates({ points }: { points: THREE.Vector3[] }) {
  const foil = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.19, 3);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 61) * Math.sin(v.y * 53) * Math.sin(v.z * 47);
      v.multiplyScalar(1 + 0.07 * n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => foil.dispose(), [foil]);
  return (
    <group>
      {points.map((p, i) => (
        <group key={i} position={p}>
          <mesh geometry={foil} castShadow>
            <meshStandardMaterial color="#f0c35a" metalness={1} roughness={0.3} envMapIntensity={1.4} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.17, 0.12, 0.12, 18, 1, true]} />
            <meshStandardMaterial color="#5b3823" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Bear({ position, ribbon }: { position: THREE.Vector3; ribbon: string }) {
  const fur = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#b8875a", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#f6dcb9"), sheenRoughness: 0.75 }),
    []
  );
  const light = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#ead1ae", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#fff3e0"), sheenRoughness: 0.75 }),
    []
  );
  const black = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#151110", roughness: 0.2, clearcoat: 1 }), []);
  useEffect(
    () => () => {
      fur.dispose();
      light.dispose();
      black.dispose();
    },
    [fur, light, black]
  );
  const sphere = (p: [number, number, number], r: number, m: THREE.Material, s: [number, number, number] = [1, 1, 1]) => (
    <mesh position={p} scale={s} material={m} castShadow>
      <sphereGeometry args={[r, 24, 18]} />
    </mesh>
  );
  return (
    <group position={position} rotation={[-0.12, 0, 0]}>
      {sphere([0, 0.35, 0], 0.42, fur, [1, 1.05, 0.9])}
      {sphere([0, 0.32, 0.22], 0.25, light, [1, 1, 0.5])}
      {sphere([0, 0.95, 0.04], 0.34, fur)}
      {[-1, 1].map((s) => (
        <group key={s}>
          {sphere([s * 0.25, 1.22, 0], 0.13, fur)}
          {sphere([s * 0.25, 1.22, 0.07], 0.07, light, [1, 1, 0.5])}
          {sphere([s * 0.12, 1.03, 0.31], 0.038, black)}
          <mesh position={[s * 0.38, 0.48, 0.14]} rotation={[0.6, 0, s * 0.5]} material={fur} castShadow>
            <capsuleGeometry args={[0.1, 0.28, 6, 12]} />
          </mesh>
        </group>
      ))}
      {sphere([0, 0.89, 0.32], 0.14, light, [1, 0.8, 0.8])}
      {sphere([0, 0.94, 0.44], 0.048, black, [1.2, 0.85, 0.8])}
      <group position={[0, 0.68, 0.3]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0, 0]} rotation={[0, 0, s * -0.4]} scale={[1, 0.6, 0.4]}>
            <torusGeometry args={[0.08, 0.03, 8, 20]} />
            <meshPhysicalMaterial color={ribbon} roughness={0.3} sheen={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Card({ position, to, message }: { position: THREE.Vector3; to: string; message: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 440;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  useEffect(() => {
    let alive = true;
    const draw = () => {
      if (!alive) return;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fbf6ef";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#d8c3a5";
      ctx.lineWidth = 4;
      ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
      ctx.fillStyle = "#4a2f2a";
      ctx.textAlign = "center";
      ctx.font = '86px "Great Vibes"';
      ctx.fillText(to ? `Para ${to}` : "Para ti", canvas.width / 2, 140);
      ctx.font = 'italic 34px "Bodoni Moda Variable", serif';
      wrapText(ctx, message || "Con todo mi cariño", canvas.width / 2, 220, canvas.width - 120, 44, 4);
      texture.needsUpdate = true;
    };
    draw();
    Promise.all([document.fonts.load('86px "Great Vibes"'), document.fonts.load('italic 34px "Bodoni Moda Variable"')]).then(draw);
    return () => {
      alive = false;
    };
  }, [texture, to, message]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group position={position} rotation={[-0.25, -0.45, 0.06]}>
      <mesh castShadow>
        <boxGeometry args={[1.12, 0.77, 0.012]} />
        <meshStandardMaterial attach="material-0" color="#efe6d8" />
        <meshStandardMaterial attach="material-1" color="#efe6d8" />
        <meshStandardMaterial attach="material-2" color="#efe6d8" />
        <meshStandardMaterial attach="material-3" color="#efe6d8" />
        <meshStandardMaterial attach="material-4" map={texture} roughness={0.85} />
        <meshStandardMaterial attach="material-5" color="#efe6d8" />
      </mesh>
      <mesh position={[0, -1.05, -0.02]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 6]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.45} roughness={0.1} />
      </mesh>
    </group>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number, lines: number) {
  const words = text.split(/\s+/);
  let row = "";
  let n = 0;
  for (const w of words) {
    const test = row ? `${row} ${w}` : w;
    if (ctx.measureText(test).width > max && row) {
      ctx.fillText(row, x, y + n * line);
      row = w;
      if (++n >= lines) return;
    } else row = test;
  }
  if (row) ctx.fillText(row, x, y + n * line);
}

export function FallingPetals({ color, count = 26, spread = 6 }: { color: string; count?: number; spread?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const rand = mulberry32(99);
    return Array.from({ length: count }, () => ({ x: (rand() - 0.5) * 2, z: (rand() - 0.5) * 2, phase: rand() * 10, speed: 0.35 + rand() * 0.35, spin: rand() * 2 + 0.5 }));
  }, [count]);
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4);
    g.scale(1, 0.25, 1.35);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const d = useMemo(() => new THREE.Object3D(), []);
  const span = 11;

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      const fall = (t * s.speed + s.phase) % span;
      d.position.set(s.x * spread + Math.sin(t * 0.8 + s.phase) * 0.6, TOP_Y + 3 - fall, s.z * spread * 0.6 + Math.cos(t * 0.6 + s.phase) * 0.4);
      d.rotation.set(t * s.spin, t * s.spin * 0.7, Math.sin(t + s.phase));
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshPhysicalMaterial color={color} roughness={0.6} sheen={0.6} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
