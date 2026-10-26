import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { paperSwatch, ribbonSwatch } from "../design";
import type { Bouquet } from "../design";
import { STEM_BOTTOM, TIE, TOP_Y, arrange } from "./arrange";
import { Eucalyptus, Flowers, Gypsophila } from "./Bouquet";
import { Bear, Butterflies, Card, Chocolates, Crown, FairyLights, FallingPetals } from "./Extras";
import { Wrap } from "./Wrap";

export type Insets = { left: number; right: number; bottom: number };

const PALETTE = {
  light: { base: "#f4ece3", a: "#f3c3cd", b: "#f6dcc2", walls: "#d9c4b4", shadow: "#6b4636" },
  dark: { base: "#170d11", a: "#5c1d31", b: "#342340", walls: "#3b2a2f", shadow: "#000000" },
};

function Backdrop({ tint, dark }: { tint: string; dark: boolean }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          time: { value: 0 },
          base: { value: new THREE.Color("#f4ece3") },
          blobA: { value: new THREE.Color("#f3c3cd") },
          blobB: { value: new THREE.Color("#f6dcc2") },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float time;
          uniform vec3 base;
          uniform vec3 blobA;
          uniform vec3 blobB;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float a = smoothstep(1.1, 0.0, distance(d, normalize(vec3(sin(time * 0.07) * 0.8, 0.3, cos(time * 0.07) * 0.8))));
            float b = smoothstep(1.0, 0.0, distance(d, normalize(vec3(-cos(time * 0.05), -0.25, sin(time * 0.05)))));
            vec3 col = mix(base, blobA, a * 0.6);
            col = mix(col, blobB, b * 0.55);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    []
  );
  const target = useMemo(() => {
    const p = dark ? PALETTE.dark : PALETTE.light;
    return { base: new THREE.Color(p.base), a: new THREE.Color(p.a).lerp(new THREE.Color(tint), dark ? 0.3 : 0.22), b: new THREE.Color(p.b) };
  }, [dark, tint]);
  const started = useRef(false);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    const u = material.uniforms;
    u.time.value += dt;
    const k = started.current ? 1 - Math.exp(-dt * 3) : 1;
    started.current = true;
    u.base.value.lerp(target.base, k);
    u.blobA.value.lerp(target.a, k);
    u.blobB.value.lerp(target.b, k);
  });
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[90, 32, 16]} />
    </mesh>
  );
}

function CameraRig({ radius, insets, reset }: { radius: number; insets: Insets; reset: number }) {
  const { camera, size, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    size: { width: number; height: number };
    controls: OrbitControlsImpl | null;
  };
  const fit = useRef({ active: true });

  useEffect(() => {
    const dx = (insets.right - insets.left) / 2;
    camera.setViewOffset(size.width, size.height, dx, insets.bottom / 2, size.width, size.height);
    camera.updateProjectionMatrix();
    return () => {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
  }, [camera, size.width, size.height, insets.left, insets.right, insets.bottom]);

  const top = TOP_Y + 2.4;
  const bottom = STEM_BOTTOM - 0.4;
  const targetY = (top + bottom) / 2;
  const distance = useMemo(() => {
    const freeW = size.width - insets.left - insets.right;
    const freeH = size.height - insets.bottom;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byH = (top - bottom) / 2 / (tan * (freeH / size.height));
    const byW = (radius + 1.9) / (tan * camera.aspect * (freeW / size.width));
    return THREE.MathUtils.clamp(Math.max(byH, byW) * 1.08, 8, 44);
  }, [radius, insets, size.width, size.height, camera, top, bottom]);

  useEffect(() => {
    fit.current.active = true;
  }, [distance, reset]);
  useEffect(() => {
    if (!controls) return;
    const stop = () => (fit.current.active = false);
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (!fit.current.active || !controls) return;
    const k = 1 - Math.exp(-dt * 2.4);
    controls.target.y += (targetY - controls.target.y) * k;
    dir.copy(camera.position).sub(controls.target);
    const current = dir.length();
    const next = current + (distance - current) * k;
    camera.position.copy(controls.target).addScaledVector(dir.normalize(), next);
    controls.update();
    if (Math.abs(next - distance) < 0.01 && Math.abs(controls.target.y - targetY) < 0.005) fit.current.active = false;
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 3) onReady();
  });
  return null;
}

function Lights({ dark }: { dark: boolean }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const mix = useRef(dark ? 1 : 0);
  useFrame((_, dt) => {
    mix.current += ((dark ? 1 : 0) - mix.current) * (1 - Math.exp(-dt * 3));
    const m = mix.current;
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(0.9, 0.4, m);
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(2.4, 1.8, m);
    if (rim.current) rim.current.intensity = THREE.MathUtils.lerp(1.4, 3, m);
  });
  const small = window.matchMedia("(max-width: 899px)").matches;
  return (
    <>
      <hemisphereLight ref={hemi} args={["#fff6ee", "#e9d3c6", 0.9]} />
      <directionalLight
        ref={key}
        position={[-5, 9, 7]}
        intensity={2.4}
        color="#fff1e2"
        castShadow={!small}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <directionalLight ref={rim} position={[6, 3, -6]} intensity={1.4} color="#ffc6d4" />
    </>
  );
}

type StageProps = {
  bouquet: Bouquet;
  card: { to: string; message: string };
  tint: string;
  dark: boolean;
  insets: Insets;
  reset: number;
  reveal: boolean;
  onReady: () => void;
};

export default function Stage({ bouquet, card, tint, dark, insets, reset, reveal, onReady }: StageProps) {
  const small = window.matchMedia("(max-width: 899px)").matches;
  const layout = useMemo(() => arrange(bouquet), [bouquet]);
  const has = (id: Bouquet["extras"][number]) => bouquet.extras.includes(id);

  return (
    <Canvas
      className="stage"
      shadows="percentage"
      dpr={[1, small ? 1.5 : 1.75]}
      gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 0.1, far: 300, position: [9, 13, 22] }}
    >
      <Backdrop tint={tint} dark={dark} />
      <Lights dark={dark} />
      <Environment key={dark ? "dark" : "light"} resolution={128} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color={dark ? PALETTE.dark.walls : PALETTE.light.walls} side={THREE.BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={2.5} position={[0, 6, 8]} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffe3d6" position={[-8, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1} color="#ffd6e2" position={[8, 2, -2]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="circle" intensity={2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={5} />
      </Environment>

      <group position={[0, TIE.y, 0]} rotation={[0.24, 0, 0]}>
        <group position={[0, -TIE.y, 0]}>
          <Flowers layout={layout} stagger={reveal ? 0.05 : 0.016} lite={small} />
          {layout.gypsophila.length > 0 && <Gypsophila points={layout.gypsophila} />}
          {layout.eucalyptus.length > 0 && <Eucalyptus sprigs={layout.eucalyptus} />}
          <Wrap radius={layout.radius} paper={[paperSwatch(bouquet.paper[0]).hex, paperSwatch(bouquet.paper[1]).hex]} ribbon={ribbonSwatch(bouquet.ribbon).hex} />
          {has("bear") && layout.bear && <Bear position={layout.bear} ribbon={ribbonSwatch(bouquet.ribbon).hex} />}
          {has("crown") && <Crown position={layout.crown} />}
          {has("lights") && <FairyLights points={layout.lights} />}
          {has("chocolates") && <Chocolates points={layout.chocolates} />}
          {has("butterflies") && <Butterflies radius={layout.radius} />}
          {has("card") && <Card position={layout.card} to={card.to} message={card.message} />}
        </group>
      </group>
      <FallingPetals color={tint} count={small ? 14 : 24} />
      <ContactShadows
        key={layout.flowers.length + bouquet.paper.join() + dark}
        frames={150}
        resolution={small ? 256 : 512}
        position={[0, STEM_BOTTOM - 0.35, 0]}
        opacity={dark ? 0.6 : 0.35}
        scale={12}
        blur={2.6}
        far={6}
        color={dark ? PALETTE.dark.shadow : PALETTE.light.shadow}
      />

      <OrbitControls
        makeDefault
        target={[0, 1, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.55}
        minDistance={5}
        maxDistance={42}
        minPolarAngle={0.55}
        maxPolarAngle={1.75}
      />
      <CameraRig radius={layout.radius} insets={insets} reset={reset} />
      <EffectComposer multisampling={small ? 0 : 4}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={dark ? 1 : 0.7} radius={0.6} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.35} darkness={dark ? 0.45 : 0.22} />
      </EffectComposer>
      <Ready onReady={onReady} />
    </Canvas>
  );
}
