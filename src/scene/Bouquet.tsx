import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { VARIANTS } from "../content";
import { STEM_BOTTOM, TIE } from "./arrange";
import type { Arrangement } from "./arrange";
import { TEMPLATES, hash, makeFlowerKit, mulberry32, partsPerFlower } from "./flowers";
import type { MeshId } from "./flowers";

const MAX = { rose: 0, sunflower: 0, hydrangea: 0 };
for (const v of VARIANTS) MAX[v.kind] = Math.max(MAX[v.kind], v.max);
const MAX_FLOWERS = MAX.rose + MAX.sunflower + MAX.hydrangea;

const CAPACITY = (() => {
  const cap: Partial<Record<MeshId, number>> = {};
  for (const kind of ["rose", "sunflower", "hydrangea"] as const) {
    const per = partsPerFlower(kind);
    for (const k in per) cap[k as MeshId] = (cap[k as MeshId] ?? 0) + per[k as MeshId]! * MAX[kind];
  }
  return cap as Record<MeshId, number>;
})();

const MESHES = Object.keys(CAPACITY) as MeshId[];

const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type FlowerState = { position: THREE.Vector3; quaternion: THREE.Quaternion; born: number };

export function Flowers({ layout, stagger, lite }: { layout: Arrangement; stagger: number; lite: boolean }) {
  const kit = useMemo(() => makeFlowerKit(lite), [lite]);
  const meshes = useRef<Partial<Record<MeshId, THREE.InstancedMesh>>>({});
  const stems = useRef<THREE.InstancedMesh>(null);
  const states = useRef(new Map<string, FlowerState>());
  const idle = useRef(0);

  const stemGeometry = useMemo(() => new THREE.CylinderGeometry(0.03, 0.036, 1, 6, 1).translate(0, -0.5, 0), []);
  useEffect(
    () => () => {
      Object.values(kit.geometries).forEach((g) => g.dispose());
      Object.values(kit.materials).forEach((m) => m.dispose());
      stemGeometry.dispose();
    },
    [kit, stemGeometry]
  );

  useLayoutEffect(() => {
    const color = new THREE.Color();
    const counts: Partial<Record<MeshId, number>> = {};
    for (const f of layout.flowers) {
      const tpl = TEMPLATES[f.kind][f.template % TEMPLATES[f.kind].length];
      const jitter = 0.94 + 0.12 * hash(`${f.id}c`);
      for (const part of tpl) {
        const mesh = meshes.current[part.mesh];
        if (!mesh) continue;
        const i = (counts[part.mesh] = (counts[part.mesh] ?? 0) + 1) - 1;
        if (part.mesh === "sepal" || part.mesh === "bud" || part.mesh === "sunDisk") color.setRGB(1, 1, 1);
        else color.set(f.variant.colors[part.colorIndex % f.variant.colors.length]).multiplyScalar(part.tint * jitter);
        mesh.setColorAt(i, color);
      }
    }
    for (const m of MESHES) if (meshes.current[m]?.instanceColor) meshes.current[m]!.instanceColor!.needsUpdate = true;
    idle.current = 0;
  }, [layout]);

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), part: new THREE.Matrix4(), s: new THREE.Vector3(), q: new THREE.Quaternion(), dir: new THREE.Vector3(), down: new THREE.Vector3(0, -1, 0) }),
    []
  );

  useFrame(({ clock }, dt) => {
    if (idle.current > 90) return;
    const now = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 7);
    const counts: Partial<Record<MeshId, number>> = {};
    let moving = false;
    const live = new Set<string>();
    let stemCount = 0;

    for (const f of layout.flowers) {
      live.add(f.id);
      let st = states.current.get(f.id);
      if (!st) {
        st = { position: f.position.clone().add(new THREE.Vector3(0, 1.2, 0.4)), quaternion: f.quaternion.clone(), born: now + Math.min(f.order * stagger, 2.6) };
        states.current.set(f.id, st);
      }
      st.position.lerp(f.position, k);
      st.quaternion.slerp(f.quaternion, k);
      const pop = easeOutBack(clamp01((now - st.born) / 0.6));
      if (pop < 1 || st.position.distanceToSquared(f.position) > 1e-6) moving = true;

      tmp.s.setScalar(Math.max(1e-4, f.scale * pop));
      tmp.m.compose(st.position, st.quaternion, tmp.s);
      const tpl = TEMPLATES[f.kind][f.template % TEMPLATES[f.kind].length];
      for (const part of tpl) {
        const mesh = meshes.current[part.mesh];
        if (!mesh) continue;
        const i = (counts[part.mesh] = (counts[part.mesh] ?? 0) + 1) - 1;
        tmp.part.multiplyMatrices(tmp.m, part.matrix);
        mesh.setMatrixAt(i, tmp.part);
      }

      const thick = f.kind === "rose" ? 1 : 1.4;
      const grow = clamp01(pop);
      tmp.dir.copy(TIE).sub(st.position);
      const upper = tmp.dir.length();
      tmp.dir.normalize();
      tmp.q.setFromUnitVectors(tmp.down, tmp.dir);
      tmp.s.set(thick, upper * grow, thick);
      tmp.m.compose(st.position, tmp.q, tmp.s);
      stems.current?.setMatrixAt(stemCount++, tmp.m);
      tmp.dir.lerp(tmp.down, 0.6).normalize();
      tmp.q.setFromUnitVectors(tmp.down, tmp.dir);
      tmp.s.set(thick, ((TIE.y - STEM_BOTTOM) / -tmp.dir.y) * grow, thick);
      tmp.m.compose(TIE, tmp.q, tmp.s);
      stems.current?.setMatrixAt(stemCount++, tmp.m);
    }

    for (const id of states.current.keys()) if (!live.has(id)) states.current.delete(id);
    for (const m of MESHES) {
      const mesh = meshes.current[m];
      if (!mesh) continue;
      mesh.count = counts[m] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (stems.current) {
      stems.current.count = stemCount;
      stems.current.instanceMatrix.needsUpdate = true;
    }
    idle.current = moving ? 0 : idle.current + 1;
  });

  useEffect(() => {
    idle.current = 0;
  }, [layout, stagger]);

  return (
    <group>
      {MESHES.map((m) => (
        <instancedMesh
          key={m}
          ref={(mesh) => {
            if (!mesh) return;
            meshes.current[m] = mesh;
            if (!mesh.instanceColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY[m] * 3).fill(1), 3);
          }}
          args={[kit.geometries[m], kit.materials[m], CAPACITY[m]]}
          count={0}
          frustumCulled={false}
          castShadow={!lite}
          receiveShadow={!lite}
        />
      ))}
      <instancedMesh ref={stems} args={[stemGeometry, undefined, MAX_FLOWERS * 2]} count={0} frustumCulled={false} castShadow={!lite}>
        <meshStandardMaterial color="#4f7d3c" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

export function Gypsophila({ points }: { points: THREE.Vector3[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const per = 40;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const rand = mulberry32(points.length * 7 + 1);
    let i = 0;
    for (const p of points) {
      for (let k = 0; k < per; k++) {
        const u = rand() * Math.PI * 2;
        const r = Math.cbrt(rand()) * 0.34;
        const y = (rand() - 0.3) * 0.36;
        d.position.set(p.x + Math.cos(u) * r, p.y + y, p.z + Math.sin(u) * r);
        d.scale.setScalar(0.7 + rand() * 0.6);
        d.updateMatrix();
        m.setMatrixAt(i++, d.matrix);
      }
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
  }, [points]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 70 * per]} count={0} frustumCulled={false}>
      <icosahedronGeometry args={[0.034, 0]} />
      <meshStandardMaterial color="#fbfaf5" roughness={0.55} />
    </instancedMesh>
  );
}

export function Eucalyptus({ sprigs }: { sprigs: Arrangement["eucalyptus"] }) {
  const leaves = useRef<THREE.InstancedMesh>(null);
  const per = 11;
  const leafGeometry = useMemo(() => {
    const g = new THREE.CircleGeometry(0.09, 16);
    g.scale(0.85, 1, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i)) / 0.09;
      pos.setZ(i, -0.025 * r * r);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const twigs = useMemo(
    () =>
      sprigs.map(({ base, direction }) => {
        const pts = [0, 0.33, 0.66, 1].map((s) => base.clone().addScaledVector(direction, s * 1.5).add(new THREE.Vector3(0, -0.3 * s * s, 0)));
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.012, 5);
      }),
    [sprigs]
  );
  useEffect(() => () => twigs.forEach((g) => g.dispose()), [twigs]);
  useEffect(() => () => leafGeometry.dispose(), [leafGeometry]);

  useLayoutEffect(() => {
    const m = leaves.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const color = new THREE.Color();
    let i = 0;
    for (const { base, direction, seed } of sprigs) {
      const rand = mulberry32(seed);
      for (let k = 0; k < per; k++) {
        const s = 0.15 + (k / (per - 1)) * 0.85;
        const side = k % 2 ? 1 : -1;
        const along = base.clone().addScaledVector(direction, s * 1.5).add(new THREE.Vector3(0, -0.3 * s * s, 0));
        const sideways = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
        d.position.copy(along).addScaledVector(sideways, side * 0.09);
        d.lookAt(along.clone().add(new THREE.Vector3(direction.x, 1.4, direction.z)));
        d.rotateZ(rand() * Math.PI);
        d.scale.setScalar(0.75 + 0.45 * (1 - s) + rand() * 0.2);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
        m.setColorAt(i, color.set("#7f998e").offsetHSL((rand() - 0.5) * 0.03, 0, (rand() - 0.5) * 0.08));
        i++;
      }
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sprigs]);

  return (
    <group>
      <instancedMesh ref={leaves} args={[leafGeometry, undefined, 12 * per]} count={0} frustumCulled={false} castShadow>
        <meshStandardMaterial roughness={0.75} side={THREE.DoubleSide} />
      </instancedMesh>
      {twigs.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#6f7d5e" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
