import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { TOP_Y } from "./arrange";

export const NECK_Y = -1.0;
const NECK_R = 0.36;

type Sheet = { angle: number; span: number; height: number; scale: number; tone: number };

const fan = (count: number, from: number, to: number, span: number, height: (x: number) => number, scale: number): Sheet[] =>
  Array.from({ length: count }, (_, i) => {
    const angle = from + ((to - from) * i) / (count - 1);
    const x = Math.abs(Math.PI - ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / Math.PI;
    return { angle, span, height: height(x), scale, tone: i % 2 ? 0.93 : 1 };
  });

const OUTER: Sheet[] = [
  ...fan(11, 0.75, Math.PI * 2 - 0.75, 0.9, (x) => 1 - 0.38 * x * x, 1),
  { angle: 0.32, span: 0.9, height: 0.46, scale: 1.04, tone: 0.96 },
  { angle: -0.32, span: 0.9, height: 0.46, scale: 1.04, tone: 1 },
];

const INNER: Sheet[] = fan(9, 1.05, Math.PI * 2 - 1.05, 0.85, (x) => 1.08 - 0.4 * x * x, 0.95);

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function sheetGeometry(s: Sheet, rTop: number, seed: number) {
  const segU = 22;
  const segV = 18;
  const H = TOP_Y + 0.2 - NECK_Y;
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    for (let i = 0; i <= segU; i++) {
      const x = (i / segU) * 2 - 1;
      const a = s.angle + (s.span / 2) * x;
      const top = s.height * (1 - 0.1 * x * x) * (1 + 0.025 * Math.sin(a * 9 + seed));
      const y = NECK_Y + v * H * top;
      const t = Math.max(0, (y - NECK_Y) / H);
      let r = NECK_R + (rTop - NECK_R) * t ** 0.72;
      r *= s.scale * (1 + 0.1 * v * v) * (1 + 0.09 * Math.cos(x * Math.PI * 0.5) * v + 0.1 * x ** 4 * v * v);
      r *= 1 + 0.03 * Math.sin(a * 17 + seed) * smooth(0.7, 1, v);
      positions.push(r * Math.sin(a), y, r * Math.cos(a));
      uvs.push(i / segU, v);
      const shade = s.tone * (0.9 + 0.1 * Math.cos(x * Math.PI * 0.5));
      colors.push(shade, shade, shade);
    }
  }
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + segU + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function layer(sheets: Sheet[], rTop: number, seed: number) {
  const parts = sheets.map((s, i) => sheetGeometry(s, rTop, seed + i * 3.1));
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

export function Wrap({ radius, paper, ribbon }: { radius: number; paper: [string, string]; ribbon: string }) {
  const rTop = Math.round((radius + 0.6) * 8) / 8;
  const outer = useMemo(() => layer(OUTER, rTop, 1), [rTop]);
  const inner = useMemo(() => layer(INNER, rTop * 0.98, 7), [rTop]);
  useEffect(
    () => () => {
      outer.dispose();
      inner.dispose();
    },
    [outer, inner]
  );
  return (
    <group>
      <mesh geometry={outer} castShadow receiveShadow>
        <meshPhysicalMaterial color={paper[0]} vertexColors roughness={0.82} sheen={0.35} sheenRoughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={inner} castShadow receiveShadow>
        <meshPhysicalMaterial color={paper[1]} vertexColors roughness={0.82} sheen={0.35} sheenRoughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Bow color={ribbon} />
    </group>
  );
}

function Bow({ color }: { color: string }) {
  const y = NECK_Y + 0.14;
  return (
    <group>
      <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 2]}>
        <torusGeometry args={[NECK_R + 0.03, 0.05, 8, 48]} />
        <meshPhysicalMaterial color={color} roughness={0.32} sheen={1} sheenRoughness={0.25} />
      </mesh>
      <group position={[0, y, NECK_R + 0.1]}>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.27, 0.06, 0]} rotation={[0, 0, side * -0.35]} scale={[1, 0.62, 0.38]} castShadow>
              <torusGeometry args={[0.26, 0.07, 10, 32]} />
              <meshPhysicalMaterial color={color} roughness={0.32} sheen={1} sheenRoughness={0.25} />
            </mesh>
            <mesh position={[side * 0.13, -0.42, 0.02]} rotation={[0, 0, side * 0.28]} castShadow>
              <boxGeometry args={[0.13, 0.85, 0.02]} />
              <meshPhysicalMaterial color={color} roughness={0.32} sheen={1} sheenRoughness={0.25} />
            </mesh>
          </group>
        ))}
        <mesh scale={[1.2, 1, 0.8]} castShadow>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshPhysicalMaterial color={color} roughness={0.32} sheen={1} sheenRoughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}
