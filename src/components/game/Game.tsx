import { useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene } from "./Scene";
import { Hud } from "./Hud";
import { TouchControls } from "./TouchControls";
import { edges, game, keys } from "@/game/runtime";
import { initAudio } from "@/game/audio";
import { newGame, step, startGame, type GameInput } from "@/game/sim";

const BLOCK = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

export interface GameProps {
  /** Set when running inside the host game: called once from the evaluation screen. */
  onFinish?: ((successRate: number, payload: unknown) => void) | undefined;
}

export default function Game({ onFinish }: GameProps) {
  const wrap = useRef<HTMLDivElement>(null);

  // Every (re)start from the host game begins a brand-new game on the room picker.
  useEffect(() => {
    newGame(game);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (BLOCK.has(e.code)) e.preventDefault();
      keys.add(e.code);
      if (e.repeat) return;
      initAudio();
      if (game.phase !== "playing") return;
      if (e.code === "KeyE" || e.code === "KeyF" || e.code === "Space") edges.action = true;
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    if (import.meta.env.DEV) {
      const idle: GameInput = { forward: 0, turn: 0, run: false, jump: false, action: false };
      (window as unknown as { __game: unknown }).__game = {
        state: game,
        start: () => startGame(game),
        sim: (seconds: number, input: Partial<GameInput> = {}) => {
          for (let t = 0; t < seconds; t += 1 / 60) step(game, { ...idle, ...input }, 1 / 60);
          return { phase: game.phase, fires: game.fires.length, smoke: game.smoke };
        },
      };
    }
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const onReady = useCallback(() => {
    wrap.current?.setAttribute("data-scene-ready", "true");
  }, []);

  return (
    <div ref={wrap} className="relative h-dvh w-full overflow-hidden bg-background">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 62, near: 0.1, far: 80, position: [0, 4, 9] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <Scene onReady={onReady} />
      </Canvas>
      <Hud onFinish={onFinish} />
      <TouchControls />
    </div>
  );
}
