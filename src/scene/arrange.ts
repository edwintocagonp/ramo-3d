import * as THREE from "three";

import type { FlowerKind, Variant } from "../content";
import { variant } from "../design";
import type { Bouquet } from "../design";
import { GOLDEN, hash, mulberry32 } from "./flowers";

export const TIE = new THREE.Vector3(0, -0.8, 0);
export const TOP_Y = 4.3;
export const STEM_BOTTOM = -3.4;

const SIZE: Record<FlowerKind, number> = { rose: 1, sunflower: 1.5, hydrangea: 1.9 };
const SPACING = 0.74;

export type Placement = {
  id: string;
  variant: Variant;
  kind: FlowerKind;
  template: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: number;
  order: number;
};

export type Arrangement = {
  flowers: Placement[];
  radius: number;
  sphere: number;
  centre: THREE.Vector3;
  onDome: (x: number, z: number, lift: number) => { position: THREE.Vector3; normal: THREE.Vector3 };
  gypsophila: THREE.Vector3[];
  eucalyptus: { base: THREE.Vector3; direction: THREE.Vector3; seed: number }[];
  lights: THREE.Vector3[];
  chocolates: THREE.Vector3[];
  bear: THREE.Vector3 | null;
  crown: THREE.Vector3;
  card: THREE.Vector3;
};

// (x² + y² − 1)³ − x²y³ ≤ 0
const heartScore = (x: number, y: number) => (x * x + y * y - 1) ** 3 - x * x * y ** 3;

const up = new THREE.Vector3(0, 1, 0);

export function arrange(b: Bouquet): Arrangement {
  const items = b.order.flatMap((id) => Array.from({ length: b.counts[id] ?? 0 }, (_, k) => ({ id: `${id}-${k}`, variant: variant(id) })));
  const withBear = b.extras.includes("bear");
  const area = items.reduce((s, it) => s + (SIZE[it.variant.kind] * SPACING) ** 2 * 0.9, 0);
  const bearArea = withBear ? 2.4 : 0;
  const radius = Math.max(0.35, Math.sqrt((area + bearArea) / Math.PI));
  const sphere = Math.max(radius * 1.35, 2.4);
  const centre = new THREE.Vector3(0, TOP_Y - sphere, 0);

  const onDome = (x: number, z: number, lift: number) => {
    const r = Math.hypot(x, z);
    const phi = Math.asin(Math.min(0.92, r / sphere));
    const a = Math.atan2(z, x);
    const normal = new THREE.Vector3(Math.sin(phi) * Math.cos(a), Math.cos(phi), Math.sin(phi) * Math.sin(a));
    return { position: centre.clone().addScaledVector(normal, sphere + lift), normal };
  };

  const reserve = withBear ? Math.max(2, Math.round(bearArea / (SPACING ** 2 * 0.9))) : 0;
  const total = items.length + reserve;
  const slots = Array.from({ length: total }, (_, i) => {
    const r = radius * Math.sqrt((i + 0.5) / total);
    const a = i * GOLDEN;
    return { x: r * Math.cos(a), z: r * Math.sin(a), i };
  }).slice(reserve);

  const byHash = [...items].sort((p, q) => hash(p.id) - hash(q.id));
  let assigned: { item: (typeof items)[number]; slot: (typeof slots)[number] }[];
  if (b.arrangement === "rings") {
    assigned = items.map((item, i) => ({ item, slot: slots[i] }));
  } else if (b.arrangement === "heart" && items.length > 3) {
    const lead = b.order[0];
    const k = 1.25 / radius;
    const ranked = [...slots].sort((p, q) => heartScore(p.x * k, -p.z * k + 0.12) - heartScore(q.x * k, -q.z * k + 0.12));
    const leads = items.filter((it) => it.variant.id === lead);
    const rest = byHash.filter((it) => it.variant.id !== lead);
    const inside = ranked.slice(0, leads.length);
    const outside = ranked.slice(leads.length).sort((p, q) => p.i - q.i);
    assigned = [...leads.map((item, i) => ({ item, slot: inside[i] })), ...rest.map((item, i) => ({ item, slot: outside[i] }))];
  } else {
    assigned = byHash.map((item, i) => ({ item, slot: slots[i] }));
  }

  const flowers: Placement[] = assigned.map(({ item, slot }) => {
    const { position, normal } = onDome(slot.x, slot.z, 0);
    const h = hash(item.id);
    const twist = new THREE.Quaternion().setFromAxisAngle(up, h * Math.PI * 2);
    const lean = normal.clone().lerp(new THREE.Vector3(normal.x, 0, normal.z), 0.15).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, lean).multiply(twist);
    return {
      id: item.id,
      variant: item.variant,
      kind: item.variant.kind,
      template: Math.floor(h * 1000) % 3,
      position,
      quaternion,
      scale: (item.variant.kind === "rose" ? 0.82 : 1) * (0.94 + 0.12 * hash(`${item.id}s`)),
      order: slot.i,
    };
  });

  const rand = mulberry32(items.length * 31 + 7);
  const fillCount = b.filler === "lots" ? Math.max(6, Math.round(items.length * 0.55)) : b.filler === "some" ? Math.max(3, Math.round(items.length * 0.28)) : 0;
  const gypsophila = Array.from({ length: fillCount }, (_, i) => {
    const r = radius * 1.02 * Math.sqrt((i + 0.5) / fillCount);
    const a = i * GOLDEN + GOLDEN / 2 + 0.4;
    return onDome(r * Math.cos(a), r * Math.sin(a), 0.05).position;
  });

  const sprigs = b.eucalyptus ? Math.min(12, Math.max(5, Math.round(radius * 3.4))) : 0;
  const eucalyptus = Array.from({ length: sprigs }, (_, i) => {
    const a = (i / sprigs) * Math.PI * 2 + rand() * 0.4;
    const base = onDome(Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9, -0.25).position;
    const direction = new THREE.Vector3(Math.cos(a), 0.55 + rand() * 0.35, Math.sin(a)).normalize();
    return { base, direction, seed: i * 13 + 5 };
  });

  const bulbs = 40;
  const lightsRand = mulberry32(17);
  const lights = Array.from({ length: bulbs }, (_, i) => {
    const t = (i + 0.5) / bulbs;
    const r = radius * (0.25 + 0.75 * t) * (0.9 + 0.2 * lightsRand());
    const a = t * Math.PI * 2 * 2.6 + (lightsRand() - 0.5) * 0.6;
    return onDome(r * Math.cos(a), r * Math.sin(a), 0.12 + 0.2 * lightsRand()).position;
  });

  const chocolates = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI * (0.18 + (i / 5) * 0.64);
    const r = radius * (i % 2 ? 0.48 : 0.72);
    return onDome(r * Math.cos(a), r * Math.sin(a), 0.22).position;
  });

  const top = onDome(0, 0, 0).position;
  const bear = withBear ? top.clone().add(new THREE.Vector3(0, -0.1, 0.05)) : null;
  const crown = withBear ? top.clone().add(new THREE.Vector3(0, 1.32, 0.05)) : top.clone().add(new THREE.Vector3(0, 0.42, 0));
  const card = onDome(radius * 0.62, radius * 0.6, 0.9).position;

  return { flowers, radius, sphere, centre, onDome, gypsophila, eucalyptus, lights, chocolates, bear, crown, card };
}
