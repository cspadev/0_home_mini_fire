// Big floating labels + light beacons so every interactive thing is easy to spot,
// plus the fire alarm pull station and its strobe/siren.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ALARM, DOOR, SOURCES, STATIONS, type FireKind } from "@/game/layout";
import { game } from "@/game/runtime";
import { sfx } from "@/game/audio";
import { signTexture } from "./textures";

interface MarkerDef {
  key: string;
  x: number;
  z: number;
  y: number;
  icon: string;
  text: string;
  bg: string;
  ink: string;
  beacon: string;
  kind?: "alarm" | "station" | "door" | FireKind;
}

const FIRE_TAG: Record<FireKind, { icon: string; text: string; bg: string; ink: string }> = {
  paper: { icon: "🗑️", text: "PAPER FIRE", bg: "#fff3c4", ink: "#8a5a00" },
  electric: { icon: "⚡", text: "ELECTRICAL", bg: "#fff36b", ink: "#2b2235" },
  grease: { icon: "🍳", text: "OIL FIRE", bg: "#ffd2b8", ink: "#b0211d" },
};

const STATION_TAG = {
  water: { icon: "🪣", text: "WATER", bg: "#d6efff", ink: "#1d5fa8", beacon: "#3fa7ff" },
  co2: { icon: "🧯", text: "CO₂", bg: "#ffffff", ink: "#2b2235", beacon: "#e9e9ff" },
  blanket: { icon: "🟥", text: "BLANKET", bg: "#ffe0d6", ink: "#b0211d", beacon: "#ff5a4f" },
} as const;

function markers(): MarkerDef[] {
  const out: MarkerDef[] = [
    { key: "alarm", x: ALARM.x, z: ALARM.z + 0.45, y: 2.6, icon: "🚨", text: "ALARM", bg: "#e2332f", ink: "#ffffff", beacon: "#ff2a2a", kind: "alarm" },
    { key: "door", x: DOOR.x, z: DOOR.z - 0.3, y: 3.0, icon: "🚪", text: "EXIT", bg: "#1f9d55", ink: "#ffffff", beacon: "#3cff8a", kind: "door" },
  ];
  for (const s of STATIONS) {
    const t = STATION_TAG[s.tool];
    out.push({ key: s.tool, x: s.x, z: s.z, y: 2.4, icon: t.icon, text: t.text, bg: t.bg, ink: t.ink, beacon: t.beacon, kind: "station" });
  }
  for (const s of SOURCES) {
    const t = FIRE_TAG[s.kind];
    out.push({ key: `src-${s.kind}`, x: s.x, z: s.z, y: s.y + 2.2, icon: t.icon, text: t.text, bg: t.bg, ink: t.ink, beacon: "#ff7a1a", kind: s.kind });
  }
  return out;
}

export function Markers() {
  const defs = useMemo(markers, []);
  const tex = useMemo(
    () =>
      defs.map((d) =>
        signTexture(
          [
            { text: d.icon, color: d.ink, size: 90 },
            { text: d.text, color: d.ink, size: 64 },
          ],
          d.bg,
          "#2b2235",
          384,
          256,
        ),
      ),
    [defs],
  );
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const beams = useRef<(THREE.Mesh | null)[]>([]);
  const strobe = useRef<THREE.PointLight>(null);
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const sirenT = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const playing = game.phase === "playing";
    defs.forEach((d, i) => {
      const sp = sprites.current[i];
      const bm = beams.current[i];
      if (!sp) return;
      let visible = true;
      let emphasis = 0;
      if (d.kind === "alarm") {
        visible = !game.alarm;
        emphasis = 1;
      } else if (d.kind === "station") {
        emphasis = game.alarm ? 0.5 : 0;
        // dim the stations until the alarm is raised
        (sp.material as THREE.SpriteMaterial).opacity = game.alarm ? 1 : 0.55;
      } else if (d.kind === "door") {
        visible = !game.doorBlocked;
      } else if (d.kind) {
        visible = game.fires.some((f) => f.isSource && f.kind === d.kind);
      }
      visible = visible && game.phase !== "intro";
      sp.visible = visible;
      sp.position.y = d.y + Math.sin(t * 2.2 + i) * 0.12 + emphasis * Math.abs(Math.sin(t * 5)) * 0.15;
      const sc = 1 + emphasis * 0.15 * Math.abs(Math.sin(t * 5));
      sp.scale.set(1.3 * sc, 0.87 * sc, 1);
      if (bm) {
        bm.visible = visible && d.kind !== undefined && !(d.kind in FIRE_TAG);
        (bm.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.08 * Math.sin(t * 3 + i) + emphasis * 0.1;
      }
    });

    // alarm strobe + siren loop
    const on = game.alarm && playing;
    const flash = on && Math.sin(t * 14) > 0.3;
    if (strobe.current) strobe.current.intensity = flash ? 18 : 0;
    if (lamp.current) lamp.current.color.set(flash ? "#ff3030" : on ? "#7a1010" : "#ff8a8a");
    if (on) {
      sirenT.current -= delta;
      if (sirenT.current <= 0) {
        sfx.alarm();
        sirenT.current = 1.1;
      }
    } else sirenT.current = 0;
  });

  return (
    <>
      {/* fire alarm pull station on the south wall */}
      <group position={[ALARM.x, 1.3, 7.9]} rotation-y={Math.PI}>
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.6, 0.14]} />
          <meshStandardMaterial color="#d8221e" roughness={0.45} />
        </mesh>
        <mesh position={[0, -0.05, 0.08]}>
          <boxGeometry args={[0.26, 0.16, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0.02]}>
          <sphereGeometry args={[0.1, 14, 10]} />
          <meshBasicMaterial ref={lamp} color="#ff8a8a" toneMapped={false} />
        </mesh>
        <pointLight ref={strobe} position={[0, 0.5, 0.6]} color="#ff2020" intensity={0} distance={14} />
      </group>
      <mesh position={[ALARM.x, 0.02, ALARM.z]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.55, 0.75, 32]} />
        <meshBasicMaterial color="#ff2a2a" transparent opacity={0.8} toneMapped={false} />
      </mesh>

      {defs.map((d, i) => (
        <group key={d.key}>
          <sprite
            ref={(el) => {
              sprites.current[i] = el;
            }}
            position={[d.x, d.y, d.z]}
            renderOrder={10}
          >
            <spriteMaterial map={tex[i]!} transparent depthTest={false} toneMapped={false} />
          </sprite>
          <mesh
            ref={(el) => {
              beams.current[i] = el;
            }}
            position={[d.x, d.y / 2, d.z]}
          >
            <cylinderGeometry args={[0.32, 0.5, d.y, 16, 1, true]} />
            <meshBasicMaterial color={d.beacon} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
