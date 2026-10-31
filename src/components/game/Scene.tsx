import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

import studentModel from "@/assets/models/student.glb.asset.json";
import deskModel from "@/assets/models/desk.glb.asset.json";
import chairModel from "@/assets/models/chairDesk.glb.asset.json";
import screenModel from "@/assets/models/computerScreen.glb.asset.json";
import stoveModel from "@/assets/models/kitchenStove.glb.asset.json";
import cabinetModel from "@/assets/models/kitchenCabinet.glb.asset.json";
import sinkModel from "@/assets/models/kitchenSink.glb.asset.json";
import trashModel from "@/assets/models/trashcan.glb.asset.json";
import bookcaseModel from "@/assets/models/bookcaseOpen.glb.asset.json";
import plantModel from "@/assets/models/pottedPlant.glb.asset.json";

import { DOOR, FURNITURE, ROOM, STATIONS, type ModelKey, type Tool } from "@/game/layout";
import { fireRadius, forwardOf, step, TUNING, type GameEvent } from "@/game/sim";
import { burst, emit, MAX_PARTICLES, particles, stepParticles } from "@/game/fx";
import { edges, emitUi, game, readInput, shake } from "@/game/runtime";
import { setFireLevel, sfx } from "@/game/audio";
import { floorTexture, glowTexture, scorchTexture, signTexture, wallTexture } from "./textures";

const MODEL_URL: Record<ModelKey, string> = {
  desk: deskModel.url,
  chairDesk: chairModel.url,
  computerScreen: screenModel.url,
  kitchenStove: stoveModel.url,
  kitchenCabinet: cabinetModel.url,
  kitchenSink: sinkModel.url,
  trashcan: trashModel.url,
  bookcaseOpen: bookcaseModel.url,
  pottedPlant: plantModel.url,
};
Object.values(MODEL_URL).forEach((u) => useGLTF.preload(u));
useGLTF.preload(studentModel.url);

// ---------------------------------------------------------------- models

function fitClone(src: THREE.Object3D, size: [number, number, number], skinned = false) {
  const c = skinned ? SkeletonUtils.clone(src) : src.clone(true);
  // skinned meshes report posed bounds in three; use the raw geometry bounds instead
  const box = new THREE.Box3();
  if (skinned) {
    c.updateMatrixWorld(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.computeBoundingBox();
        box.union(m.geometry.boundingBox!.clone());
      }
    });
  } else box.setFromObject(c);
  const s = box.getSize(new THREE.Vector3());
  const k = Math.min(size[0] / s.x, size[1] / s.y, size[2] / s.z);
  const ctr = box.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group();
  c.scale.multiplyScalar(k);
  c.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
  wrap.add(c);
  c.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return wrap;
}

function FitModel({ url, size, x, y = 0, z, rotY }: { url: string; size: [number, number, number]; x: number; y?: number | undefined; z: number; rotY: number }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => fitClone(scene, size), [scene, size]);
  return <primitive object={obj} position={[x, y, z]} rotation-y={rotY} />;
}

function Furniture() {
  return (
    <>
      {FURNITURE.map((f, i) => (
        <FitModel key={i} url={MODEL_URL[f.model]} size={f.size} x={f.x} y={f.y} z={f.z} rotY={f.rotY} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- tools

function ToolMesh({ tool }: { tool: Tool }) {
  if (tool === "water")
    return (
      <group>
        <mesh castShadow position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.17, 0.13, 0.34, 16, 1, true]} />
          <meshStandardMaterial color="#2f7fd6" roughness={0.4} metalness={0.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.16, 16]} />
          <meshStandardMaterial color="#7fd4ff" roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <torusGeometry args={[0.17, 0.012, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#cfd6dc" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    );
  if (tool === "co2")
    return (
      <group>
        <mesh castShadow position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 14]} />
          <meshStandardMaterial color="#d7262e" roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.102, 0.102, 0.1, 14]} />
          <meshStandardMaterial color="#1d1b22" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.66, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.12, 8]} />
          <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.1, 0.62, 0.06]} rotation-z={-0.9}>
          <coneGeometry args={[0.06, 0.22, 10, 1, true]} />
          <meshStandardMaterial color="#1d1b22" side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.36, 0.4, 0.1]} />
        <meshStandardMaterial color="#e2332f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.27, 0.052]}>
        <planeGeometry args={[0.28, 0.08]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.08, 0.02, 0.06]}>
        <boxGeometry args={[0.04, 0.08, 0.02]} />
        <meshStandardMaterial color="#f2f2f2" />
      </mesh>
      <mesh position={[0.08, 0.02, 0.06]}>
        <boxGeometry args={[0.04, 0.08, 0.02]} />
        <meshStandardMaterial color="#f2f2f2" />
      </mesh>
    </group>
  );
}

const STATION_STYLE: Record<Tool, { color: string; sign: string; sub: string; bg: string; ink: string }> = {
  water: { color: "#3fa7ff", sign: "WATER", sub: "paper · wood", bg: "#d6efff", ink: "#1d5fa8" },
  co2: { color: "#2b2b33", sign: "CO₂", sub: "electrical", bg: "#ececf2", ink: "#2b2235" },
  blanket: { color: "#e2332f", sign: "BLANKET", sub: "cooking oil", bg: "#ffe0d6", ink: "#b0211d" },
};

function Stations() {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const signs = useMemo(
    () =>
      STATIONS.map((s) => {
        const st = STATION_STYLE[s.tool];
        return signTexture(
          [
            { text: st.sign, color: st.ink, size: 92 },
            { text: st.sub, color: "#2b2235", size: 44 },
          ],
          st.bg,
        );
      }),
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    rings.current.forEach((m, i) => {
      if (!m) return;
      const near = Math.hypot(game.player.x - STATIONS[i]!.x, game.player.z - STATIONS[i]!.z) < TUNING.STATION_REACH;
      const s = 1 + Math.sin(t * 4 + i) * 0.06 + (near ? 0.15 : 0);
      m.scale.setScalar(s);
      (m.material as THREE.MeshBasicMaterial).opacity = near ? 0.95 : 0.55;
    });
  });
  // where the equipment itself is shown, and which way its sign faces
  const mounts: Record<Tool, { pos: [number, number, number]; rot: number; signPos: [number, number, number] }> = {
    water: { pos: [0.75, 0.95, -7.35], rot: 0, signPos: [0, 2.05, -7.93] },
    co2: { pos: [-3.4, 0.75, 7.82], rot: Math.PI, signPos: [-3.4, 1.85, 7.93] },
    blanket: { pos: [9.9, 1.15, 4], rot: -Math.PI / 2, signPos: [9.93, 1.95, 4] },
  };
  return (
    <>
      {STATIONS.map((s, i) => {
        const m = mounts[s.tool];
        return (
          <group key={s.tool}>
            <mesh
              ref={(el) => {
                rings.current[i] = el;
              }}
              position={[s.x, 0.02, s.z]}
              rotation-x={-Math.PI / 2}
            >
              <ringGeometry args={[0.55, 0.75, 32]} />
              <meshBasicMaterial color={STATION_STYLE[s.tool].color} transparent opacity={0.6} toneMapped={false} />
            </mesh>
            <group position={m.pos} rotation-y={m.rot}>
              <ToolMesh tool={s.tool} />
            </group>
            <mesh position={m.signPos} rotation-y={m.rot}>
              <planeGeometry args={[1.2, 0.6]} />
              <meshBasicMaterial map={signs[i]!} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- room

function Room() {
  const floor = useMemo(() => floorTexture(), []);
  const wallNS = useMemo(() => {
    const t = wallTexture();
    t.repeat.set(8, 1);
    return t;
  }, []);
  const wallEW = useMemo(() => {
    const t = wallTexture();
    t.repeat.set(6, 1);
    return t;
  }, []);
  const exitSign = useMemo(() => signTexture([{ text: "EXIT →", color: "#ffffff", size: 120 }], "#1f9d55", "#0f4d2a"), []);
  const blockedSign = useMemo(() => signTexture([{ text: "BLOCKED!", color: "#ffffff", size: 110 }], "#d62f2f", "#5e1010"), []);
  const board = useMemo(
    () =>
      signTexture(
        [
          { text: "WHICH TOOL?", color: "#ffe9a8", size: 64 },
          { text: "paper → water", color: "#ffffff", size: 44 },
          { text: "plug → CO₂", color: "#ffffff", size: 44 },
          { text: "pan → blanket", color: "#ffffff", size: 44 },
        ],
        "#2f5a4a",
        "#8a5a34",
        512,
        384,
      ),
    [],
  );
  const pass = useMemo(
    () =>
      signTexture(
        [
          { text: "P.A.S.S.", color: "#d62f2f", size: 84 },
          { text: "Pull · Aim", color: "#2b2235", size: 44 },
          { text: "Squeeze · Sweep", color: "#2b2235", size: 44 },
        ],
        "#fff6e0",
      ),
    [],
  );
  const exitRef = useRef<THREE.Mesh>(null);
  const blockRef = useRef<THREE.Mesh>(null);
  const stripRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const b = game.doorBlocked;
    if (exitRef.current) exitRef.current.visible = !b;
    if (blockRef.current) blockRef.current.visible = b && Math.sin(state.clock.elapsedTime * 10) > -0.3;
    if (stripRef.current) stripRef.current.color.set(b ? "#ff3b2f" : "#3dff8a");
  });

  const H = ROOM.height;
  const W = ROOM.maxX - ROOM.minX;
  const D = ROOM.maxZ - ROOM.minZ;
  const dl = DOOR.x - DOOR.width / 2;
  const dr = DOOR.x + DOOR.width / 2;
  const doorH = 2.3;
  const wallMat = (t: THREE.Texture) => <meshStandardMaterial map={t} roughness={0.9} />;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#fbf3e4" emissive="#f3e2c4" emissiveIntensity={0.55} roughness={1} />
      </mesh>
      {[-5, 0, 5].map((x) =>
        [-4, 2].map((z) => (
          <mesh key={`${x}${z}`} position={[x, H - 0.03, z]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[1.6, 0.5]} />
            <meshBasicMaterial color="#fffbe8" toneMapped={false} />
          </mesh>
        )),
      )}
      {/* north */}
      <mesh position={[0, H / 2, ROOM.minZ - 0.1]} receiveShadow>
        <boxGeometry args={[W, H, 0.2]} />
        {wallMat(wallNS)}
      </mesh>
      {/* east / west */}
      <mesh position={[ROOM.maxX + 0.1, H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, H, D]} />
        {wallMat(wallEW)}
      </mesh>
      <mesh position={[ROOM.minX - 0.1, H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, H, D]} />
        {wallMat(wallEW)}
      </mesh>
      {/* south with door gap */}
      <mesh position={[(ROOM.minX + dl) / 2, H / 2, ROOM.maxZ + 0.1]} receiveShadow>
        <boxGeometry args={[dl - ROOM.minX, H, 0.2]} />
        {wallMat(wallNS)}
      </mesh>
      <mesh position={[(dr + ROOM.maxX) / 2, H / 2, ROOM.maxZ + 0.1]} receiveShadow>
        <boxGeometry args={[ROOM.maxX - dr, H, 0.2]} />
        {wallMat(wallNS)}
      </mesh>
      <mesh position={[DOOR.x, (H + doorH) / 2, ROOM.maxZ + 0.1]}>
        <boxGeometry args={[DOOR.width, H - doorH, 0.2]} />
        {wallMat(wallNS)}
      </mesh>
      {/* door frame */}
      {[dl, dr].map((x) => (
        <mesh key={x} position={[x, doorH / 2, ROOM.maxZ]} castShadow>
          <boxGeometry args={[0.12, doorH, 0.3]} />
          <meshStandardMaterial color="#7a4a2a" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[DOOR.x, doorH, ROOM.maxZ]}>
        <boxGeometry args={[DOOR.width + 0.12, 0.12, 0.3]} />
        <meshStandardMaterial color="#7a4a2a" roughness={0.7} />
      </mesh>
      {/* open door leaf */}
      <mesh position={[dr - 0.05, doorH / 2 - 0.02, ROOM.maxZ + 0.75]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[DOOR.width - 0.1, doorH - 0.06, 0.06]} />
        <meshStandardMaterial color="#2ea3a0" roughness={0.6} />
      </mesh>
      {/* daylight outside */}
      <mesh position={[DOOR.x, doorH / 2, ROOM.maxZ + 1.6]}>
        <planeGeometry args={[4, 4]} />
        <meshBasicMaterial color="#cfeeff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[DOOR.x, 0.01, ROOM.maxZ + 0.6]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[DOOR.width, 1.2]} />
        <meshBasicMaterial color="#9fd27a" toneMapped={false} />
      </mesh>
      {/* floor strip at the door */}
      <mesh position={[DOOR.x, 0.025, ROOM.maxZ - 0.35]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[DOOR.width, 0.25]} />
        <meshBasicMaterial ref={stripRef} color="#3dff8a" toneMapped={false} />
      </mesh>
      <mesh ref={exitRef} position={[DOOR.x, doorH + 0.45, ROOM.maxZ - 0.02]} rotation-y={Math.PI}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshBasicMaterial map={exitSign} toneMapped={false} />
      </mesh>
      <mesh ref={blockRef} position={[DOOR.x, doorH + 0.45, ROOM.maxZ - 0.03]} rotation-y={Math.PI}>
        <planeGeometry args={[1.4, 0.7]} />
        <meshBasicMaterial map={blockedSign} toneMapped={false} />
      </mesh>
      {/* chalkboard + poster */}
      <mesh position={[ROOM.minX + 0.02, 1.7, 2.6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[2.4, 1.8]} />
        <meshStandardMaterial map={board} roughness={0.9} />
      </mesh>
      <mesh position={[5, 1.7, ROOM.minZ + 0.02]}>
        <planeGeometry args={[1.6, 0.8]} />
        <meshStandardMaterial map={pass} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- fire

const flameGeo = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.9) * (1 - t) ** 0.5 * 0.5;
    pts.push(new THREE.Vector2(Math.max(0.0001, r), t * 1.3));
  }
  return new THREE.LatheGeometry(pts, 9);
})();

const FIRE_COLORS = {
  normal: ["#ff4b1f", "#ff9124", "#ffe066"],
  electric: ["#ff6a2a", "#ffb23a", "#a8f0ff"],
};

function FireSlot({ index, glow, scorch }: { index: number; glow: THREE.Texture; scorch: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const layers = useRef<(THREE.Mesh | null)[]>([]);
  const tongues = useRef<(THREE.Mesh | null)[]>([]);
  const inner = useRef<THREE.MeshBasicMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const scorchRef = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame((state) => {
    const f = game.fires[index];
    const g = group.current;
    if (!g) return;
    if (!f || game.phase === "intro") {
      g.visible = false;
      if (scorchRef.current) scorchRef.current.visible = false;
      return;
    }
    g.visible = true;
    const t = state.clock.elapsedTime * 1 + seed;
    const s = 0.45 + f.intensity * 0.95;
    g.position.set(f.x, f.y, f.z);
    layers.current.forEach((m, i) => {
      if (!m) return;
      const k = 1 - i * 0.22;
      const fl = 1 + Math.sin(t * (9 + i * 3)) * 0.08 + Math.sin(t * 17 + i) * 0.05;
      m.scale.set(s * k * (1 + Math.sin(t * 7 + i) * 0.05), s * k * fl * 1.25, s * k);
      m.rotation.z = Math.sin(t * 3 + i) * 0.08;
      m.rotation.y = t * (0.5 + i * 0.4);
    });
    tongues.current.forEach((m, i) => {
      if (!m) return;
      const a = t * 1.3 + (i * Math.PI * 2) / 3;
      const r = s * 0.35;
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const fl = 0.5 + 0.5 * Math.abs(Math.sin(t * 5 + i * 2));
      m.scale.set(s * 0.45, s * (0.5 + fl * 0.5), s * 0.45);
    });
    if (inner.current) {
      const elec = f.kind === "electric";
      inner.current.color.set(elec && Math.sin(t * 23) > 0.2 ? "#ffffff" : elec ? FIRE_COLORS.electric[2]! : FIRE_COLORS.normal[2]!);
    }
    if (glowRef.current) {
      const r = fireRadius(f) * 2.6;
      glowRef.current.scale.set(r, r, 1);
    }
    if (scorchRef.current) {
      scorchRef.current.visible = true;
      scorchRef.current.position.set(f.x, f.y + 0.012, f.z);
      const r = fireRadius(f) * 2.2;
      scorchRef.current.scale.set(r, r, 1);
    }
  });

  return (
    <>
      <mesh ref={scorchRef} rotation-x={-Math.PI / 2} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={scorch} transparent depthWrite={false} />
      </mesh>
      <group ref={group} visible={false}>
        {FIRE_COLORS.normal.map((c, i) => (
          <mesh
            key={i}
            geometry={flameGeo}
            ref={(el) => {
              layers.current[i] = el;
            }}
            renderOrder={2 + i}
          >
            {i === 2 ? (
              <meshBasicMaterial ref={inner} color={c} toneMapped={false} transparent opacity={0.95} depthWrite={false} />
            ) : (
              <meshBasicMaterial color={c} toneMapped={false} transparent opacity={i === 0 ? 0.85 : 0.92} depthWrite={false} />
            )}
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh
            key={`t${i}`}
            geometry={flameGeo}
            ref={(el) => {
              tongues.current[i] = el;
            }}
          >
            <meshBasicMaterial color="#ff7a22" toneMapped={false} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        ))}
        <mesh ref={glowRef} rotation-x={-Math.PI / 2} position-y={0.03}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={glow} color="#ff8a2a" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

function Fires() {
  const glow = useMemo(() => glowTexture(), []);
  const scorch = useMemo(() => scorchTexture(), []);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  useFrame((state) => {
    const sorted = [...game.fires].sort((a, b) => b.intensity - a.intensity);
    const t = state.clock.elapsedTime;
    lights.current.forEach((l, i) => {
      if (!l) return;
      const f = sorted[i];
      if (!f || game.phase === "intro") {
        l.intensity = 0;
        return;
      }
      l.position.set(f.x, f.y + 0.8, f.z);
      l.intensity = (6 + f.intensity * 14) * (0.85 + Math.sin(t * 13 + i) * 0.1 + Math.sin(t * 29) * 0.05);
      l.color.set(f.kind === "electric" && Math.sin(t * 19) > 0.6 ? "#bfe9ff" : "#ff8a3a");
    });
  });
  return (
    <>
      {Array.from({ length: TUNING.MAX_FIRES }, (_, i) => (
        <FireSlot key={i} index={i} glow={glow} scorch={scorch} />
      ))}
      {[0, 1, 2].map((i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lights.current[i] = el;
          }}
          distance={7}
          decay={1.6}
          intensity={0}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- particles

function Particles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useLayoutEffect(() => {
    const m = ref.current!;
    for (let i = 0; i < MAX_PARTICLES; i++) m.setColorAt(i, col.setRGB(1, 1, 1));
  }, [col]);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i]!;
      if (p.life <= 0) {
        tmp.scale.setScalar(0);
        tmp.position.set(0, -50, 0);
      } else {
        const a = p.life / p.max;
        tmp.position.set(p.x, p.y, p.z);
        tmp.scale.setScalar(p.size * Math.min(1, a * 2.5));
        col.setRGB(p.r, p.g, p.b);
        m.setColorAt(i, col);
      }
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------- player

const CLIP_FADE = 0.15;

function Player() {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const toolRefs = useRef<Record<Tool, THREE.Group | null>>({ water: null, co2: null, blanket: null });
  const { scene, animations } = useGLTF(studentModel.url);
  const model = useMemo(() => fitClone(scene, [2, 1.45, 2], true), [scene]);
  const { actions } = useAnimations(animations, inner);
  const current = useRef<string>("");

  useEffect(() => {
    actions["idle"]?.play();
    current.current = "idle";
  }, [actions]);

  useFrame((state) => {
    const p = game.player;
    const g = outer.current;
    if (!g) return;
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.yaw;
    g.visible = p.invuln <= 0 || Math.floor(state.clock.elapsedTime * 12) % 2 === 0;
    if (inner.current) inner.current.rotation.z = p.stun > 0 ? Math.sin(state.clock.elapsedTime * 40) * 0.15 : 0;
    let clip = "idle";
    if (!p.onGround) clip = p.vy > 0 ? "jump" : "fall";
    else if (Math.abs(p.speed) > 5.2) clip = "sprint";
    else if (Math.abs(p.speed) > 0.3) clip = "walk";
    if (p.stun > 0) clip = "emote-no";
    if (clip !== current.current && actions[clip]) {
      actions[current.current]?.fadeOut(CLIP_FADE);
      actions[clip]!.reset().fadeIn(CLIP_FADE).play();
      current.current = clip;
    }
    const w = actions["walk"];
    if (w) w.timeScale = p.speed < 0 ? -1 : 1;
    (Object.keys(toolRefs.current) as Tool[]).forEach((k) => {
      const tg = toolRefs.current[k];
      if (tg) tg.visible = game.held === k;
    });
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <primitive object={model} />
      </group>
      {(["water", "co2", "blanket"] as Tool[]).map((t) => (
        <group
          key={t}
          ref={(el) => {
            toolRefs.current[t] = el;
          }}
          position={[0.32, 0.45, 0.28]}
          visible={false}
        >
          <ToolMesh tool={t} />
        </group>
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
        <circleGeometry args={[0.38, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- stepper + camera

const LOOK = new THREE.Vector3();
const WANT = new THREE.Vector3();
const lookSmoothed = new THREE.Vector3(0, 1, 0);

function handleEvent(e: GameEvent) {
  const p = game.player;
  switch (e.type) {
    case "use": {
      // streak from hand to fire
      const hx = p.x;
      const hz = p.z;
      for (let i = 1; i <= 8; i++) {
        const t = i / 9;
        const x = hx + (e.x - hx) * t;
        const z = hz + (e.z - hz) * t;
        const y = 0.9 + (e.y + 0.5 - 0.9) * t + Math.sin(t * Math.PI) * 0.5;
        const c = e.tool === "water" ? [0x5ec8ff, 0xbfeaff] : e.tool === "co2" ? [0xffffff, 0xdfeef5] : [0xe2332f];
        emit(x, y, z, { count: e.tool === "blanket" ? 1 : 3, colors: c, speed: [0.1, 0.6], up: [-0.5, 0.5], life: [0.25, 0.45], size: [0.08, 0.16], drag: 3 });
      }
      if (e.outcome === "wrong") {
        if (e.tool === "water" && e.fireKind === "grease") {
          burst("fireball", e.x, e.y, e.z);
          sfx.whoosh();
          shake.amount = 0.7;
        } else if (e.tool === "water") {
          burst("sparks", e.x, e.y, e.z);
          burst("sparks", p.x, 0.6, p.z);
          sfx.zap();
          shake.amount = 0.4;
        } else {
          burst("splat", e.x, e.y, e.z);
          sfx.splat();
          shake.amount = 0.35;
        }
      } else {
        if (e.tool === "water") {
          burst("splash", e.x, e.y, e.z);
          sfx.splash();
        } else if (e.tool === "co2") {
          burst("co2", e.x, e.y, e.z);
          sfx.hiss();
        } else {
          burst("smother", e.x, e.y, e.z);
          sfx.smother();
        }
        if (e.out) burst("steam", e.x, e.y, e.z);
      }
      break;
    }
    case "grab":
      burst("pickup", p.x, 0, p.z);
      sfx.pickup();
      break;
    case "hurt":
      burst("hurt", e.x, 0, e.z);
      sfx.hurt();
      shake.amount = Math.max(shake.amount, 0.35);
      break;
    case "ignite":
      emit(e.x, e.y + 0.3, e.z, { count: 14, colors: [0xff7a22, 0xffd23f], speed: [1, 3], up: [2, 4], life: [0.3, 0.6], size: [0.06, 0.12], grav: 8 });
      sfx.ignite();
      break;
    case "doorBlocked":
      sfx.alarm();
      break;
    case "jump":
      sfx.jump();
      break;
    case "roundEnd":
      if (e.result.lifeLost) sfx.lose();
      else sfx.win();
      break;
    case "hint":
      sfx.hint();
      break;
  }
  emitUi(e);
}

function Stepper() {
  const { camera, scene } = useThree();
  const wasPlaying = useRef(false);
  const shakeOff = useRef(new THREE.Vector3());
  const emberT = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const input = readInput();
    if (game.phase === "playing") step(game, input, dt);
    else {
      edges.jump = false;
      edges.action = false;
    }
    for (const e of game.events) handleEvent(e);
    game.events.length = 0;

    // ambient embers + smoke
    emberT.current += dt;
    if (emberT.current > 0.06 && game.phase !== "intro") {
      emberT.current = 0;
      for (const f of game.fires) {
        if (Math.random() < 0.5 + f.intensity * 0.3)
          emit(f.x, f.y + 0.4 + f.intensity * 0.6, f.z, { count: 1, colors: [0xffb23a, 0xffe066, 0xff6a2a], speed: [0.1, 0.5], up: [1.2, 2.6], life: [0.6, 1.1], size: [0.03, 0.06], drag: 0.6 });
        if (f.intensity > 0.7 && Math.random() < 0.35)
          emit(f.x, f.y + 1.2 + f.intensity * 0.6, f.z, { count: 1, colors: [0x5a514c, 0x6e6560, 0x4a4340], speed: [0.1, 0.4], up: [0.7, 1.3], life: [1.6, 2.6], size: [0.25, 0.4], grow: 0.5, drag: 0.4 });
        if (f.kind === "electric" && Math.random() < 0.3)
          emit(f.x, f.y + 0.3, f.z, { count: 2, colors: [0xffffff, 0x9fe8ff], speed: [2, 4], up: [1, 3], life: [0.15, 0.3], size: [0.03, 0.05], grav: 12 });
      }
    }
    stepParticles(dt);
    setFireLevel(game.phase === "playing" ? game.smoke : 0);

    // smoky haze builds with the fire
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      const k = Math.min(1, game.smoke / TUNING.SMOKE_LIMIT);
      fog.far = THREE.MathUtils.lerp(fog.far, 60 - k * 42, 1 - Math.exp(-2 * dt));
      fog.near = fog.far * 0.25;
    }

    // chase camera
    const p = game.player;
    const f = forwardOf(p.yaw);
    camera.position.sub(shakeOff.current);
    WANT.set(p.x - f.x * 5.4, 3.0 + p.y * 0.4, p.z - f.z * 5.4);
    WANT.x = THREE.MathUtils.clamp(WANT.x, ROOM.minX + 0.4, ROOM.maxX - 0.4);
    WANT.z = THREE.MathUtils.clamp(WANT.z, ROOM.minZ + 0.4, ROOM.maxZ - 0.4);
    LOOK.set(p.x + f.x * 3, 0.9 + p.y * 0.6, p.z + f.z * 3);
    const playing = game.phase === "playing";
    if (playing && !wasPlaying.current && game.elapsed < 0.2) {
      camera.position.copy(WANT);
      lookSmoothed.copy(LOOK);
    }
    wasPlaying.current = playing;
    if (game.phase === "intro") {
      const t = state.clock.elapsedTime * 0.15;
      WANT.set(Math.sin(t) * 7, 4.2, 4 + Math.cos(t) * 2.5);
      LOOK.set(0, 0.8, -2);
    }
    const k = 1 - Math.exp(-6 * dt);
    camera.position.lerp(WANT, k);
    lookSmoothed.lerp(LOOK, 1 - Math.exp(-9 * dt));
    camera.lookAt(lookSmoothed);
    // shake
    shake.amount *= Math.exp(-5 * dt);
    shakeOff.current.set((Math.random() - 0.5) * shake.amount, (Math.random() - 0.5) * shake.amount, (Math.random() - 0.5) * shake.amount);
    camera.position.add(shakeOff.current);
  }, -1);
  return null;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

export function Scene({ onReady }: { onReady: () => void }) {
  return (
    <>
      <color attach="background" args={["#f3d9b5"]} />
      <fog attach="fog" args={["#bfb4a8", 15, 60]} />
      <hemisphereLight args={["#fff4e0", "#c98a5a", 0.9]} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.6}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#fff3dd" />
        <Lightformer intensity={1} color="#8fd3c8" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={1} color="#ffb48a" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <Room />
      <Stations />
      <Fires />
      <Particles />
      <Stepper />
      <Suspense fallback={null}>
        <Furniture />
        <Player />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </>
  );
}
