import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type PetalShape = {
  width: number;
  length: number;
  cup: number;
  curl: number;
  bend: number;
  point?: number;
  base?: number;
};

export function petalGeometry(s: PetalShape, segX = 8, segY = 10) {
  const g = new THREE.PlaneGeometry(1, 1, segX, segY);
  const pos = g.attributes.position;
  const colors: number[] = [];
  const point = s.point ?? 0;
  const base = s.base ?? 0.35;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getY(i) + 0.5;
    const body = 0.22 + 0.78 * Math.sin(Math.min(1, v / 0.62) * (Math.PI / 2));
    const tip = v > 0.62 ? Math.sqrt(Math.max(0, 1 - ((v - 0.62) / 0.38) ** 2)) : 1;
    const w = body * (point ? THREE.MathUtils.lerp(tip, 1 - (v - 0.62) / 0.38, point * (v > 0.62 ? 1 : 0)) : tip);
    const x = u * s.width * Math.max(0.02, w);
    const y = v * s.length;
    const across = (2 * u) ** 2;
    let z = s.cup * across * s.width * 0.5 * (1 - 0.45 * v);
    z -= s.curl * smooth(0.5, 1, v) ** 2 * s.length * 0.4 * (1 + 0.6 * across);
    z += s.bend * Math.sin(Math.PI * v) * s.length * 0.18;
    pos.setXYZ(i, x, y, z);
    const shade = 0.55 + 0.45 * smooth(0, 0.45, v);
    const warm = 1 - base * (1 - smooth(0, 0.3, v));
    colors.push(shade, shade * (0.94 + 0.06 * warm), shade * warm);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

export type MeshId =
  | "roseInner"
  | "roseMid"
  | "roseOuter"
  | "sepal"
  | "bud"
  | "sunPetal"
  | "sunDisk"
  | "floret";

export type Part = { mesh: MeshId; matrix: THREE.Matrix4; tint: number; colorIndex: number };

const dummy = new THREE.Object3D();
dummy.rotation.order = "YXZ";

function ringPart(mesh: MeshId, angle: number, open: number, offset: number, y: number, scale: number, tint: number, colorIndex = 0): Part {
  const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  dummy.position.set(out.x * offset, y, out.z * offset);
  dummy.rotation.set(-open, Math.atan2(-out.x, -out.z), 0);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  return { mesh, matrix: dummy.matrix.clone(), tint, colorIndex };
}

function roseTemplate(seed: number): Part[] {
  const rand = mulberry32(seed);
  const parts: Part[] = [];
  const n = 22;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const mesh: MeshId = t < 0.3 ? "roseInner" : t < 0.66 ? "roseMid" : "roseOuter";
    const angle = i * GOLDEN + (rand() - 0.5) * 0.35;
    const open = 0.05 + 1.05 * t ** 1.55 + (rand() - 0.5) * 0.1;
    const offset = 0.012 + 0.055 * t;
    const y = 0.05 - 0.11 * t;
    const scale = (0.6 + 0.5 * t) * (0.94 + rand() * 0.12);
    parts.push(ringPart(mesh, angle, open, offset, y, scale, 0.82 + 0.26 * t + (rand() - 0.5) * 0.06, i));
  }
  for (let k = 0; k < 5; k++) parts.push(ringPart("sepal", (k / 5) * Math.PI * 2 + rand() * 0.4, 2.1, 0.05, -0.06, 1, 1));
  dummy.position.set(0, -0.05, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.setScalar(1);
  dummy.updateMatrix();
  parts.push({ mesh: "bud", matrix: dummy.matrix.clone(), tint: 1, colorIndex: 0 });
  return parts;
}

function sunflowerTemplate(seed: number): Part[] {
  const rand = mulberry32(seed);
  const parts: Part[] = [];
  dummy.position.set(0, 0.03, 0);
  dummy.rotation.set(0, rand() * Math.PI, 0);
  dummy.scale.setScalar(1);
  dummy.updateMatrix();
  parts.push({ mesh: "sunDisk", matrix: dummy.matrix.clone(), tint: 1, colorIndex: 0 });
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < 17; i++) {
      const angle = ((i + ring * 0.5) / 17) * Math.PI * 2 + (rand() - 0.5) * 0.12;
      parts.push(ringPart("sunPetal", angle, 1.28 - ring * 0.16 + (rand() - 0.5) * 0.12, 0.24, -0.01 - ring * 0.02, 0.95 + rand() * 0.12, 0.9 + rand() * 0.18));
    }
  }
  for (let k = 0; k < 10; k++) parts.push(ringPart("sepal", (k / 10) * Math.PI * 2, 1.9, 0.18, -0.05, 1.1, 1));
  return parts;
}

function hydrangeaTemplate(seed: number): Part[] {
  const rand = mulberry32(seed);
  const parts: Part[] = [];
  const n = 74;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 1.25;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * GOLDEN;
    const normal = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).normalize();
    dummy.position.copy(normal).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.12, 0));
    dummy.quaternion.setFromUnitVectors(up, normal);
    dummy.rotateY(rand() * Math.PI);
    dummy.scale.setScalar(0.85 + rand() * 0.35);
    dummy.updateMatrix();
    parts.push({ mesh: "floret", matrix: dummy.matrix.clone(), tint: 0.82 + rand() * 0.3, colorIndex: i });
  }
  dummy.rotation.set(0, 0, 0);
  return parts;
}

export const TEMPLATES = {
  rose: [roseTemplate(3), roseTemplate(11), roseTemplate(29)],
  sunflower: [sunflowerTemplate(5), sunflowerTemplate(17)],
  hydrangea: [hydrangeaTemplate(7), hydrangeaTemplate(23)],
};

export function partsPerFlower(kind: keyof typeof TEMPLATES) {
  const counts: Partial<Record<MeshId, number>> = {};
  for (const tpl of TEMPLATES[kind]) {
    const c: Partial<Record<MeshId, number>> = {};
    for (const p of tpl) c[p.mesh] = (c[p.mesh] ?? 0) + 1;
    for (const k in c) counts[k as MeshId] = Math.max(counts[k as MeshId] ?? 0, c[k as MeshId]!);
  }
  return counts;
}

function seedTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#2a160b";
  ctx.fillRect(0, 0, size, size);
  const n = 420;
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(i / n) * size * 0.48;
    const a = i * GOLDEN;
    const t = i / n;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r;
    ctx.fillStyle = t < 0.18 ? "#5b6b22" : t < 0.3 ? "#6a4a14" : `hsl(${22 + 10 * Math.sin(i)}, 55%, ${12 + 10 * (i % 3)}%)`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3.6 + 2.5 * t, 2.6 + 1.6 * t, a, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function floretGeometry() {
  const petals = [0, 1, 2, 3].map((k) => {
    const p = petalGeometry({ width: 0.11, length: 0.1, cup: 0.25, curl: 0.15, bend: 0, base: 0.15 }, 4, 4);
    p.rotateX(-Math.PI / 2 + 0.3);
    p.rotateY((k * Math.PI) / 2);
    return p;
  });
  const merged = mergeGeometries(petals)!;
  petals.forEach((p) => p.dispose());
  return merged;
}

function sunDiskGeometry() {
  const g = new THREE.CircleGeometry(0.25, 40);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i)) / 0.25;
    pos.setY(i, 0.05 * (1 - r * r));
  }
  g.computeVertexNormals();
  return white(g);
}

export function white(g: THREE.BufferGeometry) {
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return g;
}

export function makeFlowerKit(lite = false) {
  const petal = (s: PetalShape) => (lite ? petalGeometry(s, 6, 7) : petalGeometry(s));
  const velvet = (extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}): THREE.Material =>
    lite
      ? new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: extra.roughness ?? 0.62 })
      : new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 0.62,
          sheen: 0.7,
          sheenRoughness: 0.45,
          sheenColor: new THREE.Color("#ffffff"),
          ...extra,
        });
  const green = new THREE.MeshStandardMaterial({ color: "#4d7a3a", roughness: 0.7, side: THREE.DoubleSide, vertexColors: true });
  const geometries: Record<MeshId, THREE.BufferGeometry> = {
    roseInner: petal({ width: 0.3, length: 0.36, cup: 0.95, curl: 0.08, bend: 0.35, base: 0.3 }),
    roseMid: petal({ width: 0.44, length: 0.46, cup: 0.62, curl: 0.3, bend: 0.2, base: 0.35 }),
    roseOuter: petal({ width: 0.56, length: 0.52, cup: 0.36, curl: 0.62, bend: 0.08, base: 0.4 }),
    sepal: petal({ width: 0.08, length: 0.3, cup: 0.25, curl: 0.35, bend: 0, point: 1, base: 0 }),
    bud: white(new THREE.SphereGeometry(0.075, 12, 8)),
    sunPetal: petal({ width: 0.13, length: 0.42, cup: 0.3, curl: -0.05, bend: -0.15, point: 0.8, base: 0.1 }),
    sunDisk: sunDiskGeometry(),
    floret: floretGeometry(),
  };
  const materials: Record<MeshId, THREE.Material> = {
    roseInner: velvet(),
    roseMid: velvet(),
    roseOuter: velvet(),
    sepal: green,
    bud: green,
    sunPetal: velvet({ sheen: 0.3, roughness: 0.55 }),
    sunDisk: new THREE.MeshStandardMaterial({ map: seedTexture(), roughness: 0.95, vertexColors: true }),
    floret: velvet({ sheen: 0.4, roughness: 0.7 }),
  };
  return { geometries, materials };
}
