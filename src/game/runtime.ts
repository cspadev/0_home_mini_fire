// Shared runtime singletons: the game state, merged input, and a tiny UI event bus.
import { createGame, type GameEvent, type GameInput } from "./sim";

export const game = createGame();

export const keys = new Set<string>();
export const touch = { x: 0, y: 0, run: false };
export const edges = { jump: false, action: false };

export function readInput(): GameInput {
  const k = (...c: string[]) => c.some((x) => keys.has(x));
  let forward = (k("KeyW", "ArrowUp") ? 1 : 0) - (k("KeyS", "ArrowDown") ? 1 : 0);
  let turn = (k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0);
  if (Math.abs(touch.y) > 0.12) forward = touch.y;
  if (Math.abs(touch.x) > 0.12) turn = touch.x;
  // Simplified controls: one steady speed, no sprint or jump (mobile-friendly).
  const input: GameInput = { forward, turn, run: false, jump: false, action: edges.action };
  edges.jump = false;
  edges.action = false;
  return input;
}

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();
export function onGameEvent(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function emitUi(e: GameEvent) {
  listeners.forEach((l) => l(e));
}

/** camera shake budget, decays in the scene stepper */
export const shake = { amount: 0 };

// ---- room selection (the scene re-mounts room content when this changes)
import { setRoom, currentRoom, type RoomId } from "./layout";
const roomListeners = new Set<() => void>();
export function selectRoom(id: RoomId) {
  setRoom(id);
  roomListeners.forEach((l) => l());
}
export function subscribeRoom(fn: () => void) {
  roomListeners.add(fn);
  return () => {
    roomListeners.delete(fn);
  };
}
export const getRoomId = () => currentRoom.id;
