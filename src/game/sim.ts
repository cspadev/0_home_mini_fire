// Pure game rules for "Stop the fire". No React, no three.js.
import {
  DOOR,
  OBSTACLES,
  PLAYER_START,
  ROOM,
  SOURCES,
  STATIONS,
  type FireKind,
  type Source,
  type Tool,
} from "./layout";

export const TUNING = {
  WALK: 4.4,
  RUN: 7.2,
  BACK_FACTOR: 0.55,
  TURN: 2.9,
  ACCEL: 12,
  GRAVITY: 24,
  JUMP_V: 8.4,
  PLAYER_R: 0.35,
  REACH: 2.2,
  STATION_REACH: 1.7,
  ROUND_TIME: 50,
  MAX_FIRES: 16,
  SPREAD_AT: 0.85,
  SPREAD_EVERY: 4.5,
  DOOR_BLOCK_R: 2.3,
  DOOR_BLOCK_I: 0.6,
  SMOKE_LIMIT: 9,
  INVULN: 2,
  LIVES: 3,
  LATE_FIRE_AT: 10,
  MAX_INTENSITY: 1.6,
};

export const TOOL_USES: Record<Tool, number> = { water: 1, co2: 4, blanket: 1 };
export const GROW: Record<FireKind, number> = { paper: 0.075, electric: 0.06, grease: 0.09 };

export const POINTS = {
  OUT: 100,
  OUT_SOURCE_BONUS: 50,
  KNOCKDOWN: 20,
  WRONG: -50,
  SAVED: 300,
  PER_SECOND_LEFT: 10,
  ESCAPED: 150,
};

export type Outcome = "right" | "weak" | "wrong";

export interface Fire {
  id: number;
  kind: FireKind;
  x: number;
  y: number;
  z: number;
  intensity: number;
  isSource: boolean;
  spreadT: number;
  /** seconds of faster regrowth after a weak hit (e.g. CO2 on hot oil) */
  regrow: number;
}

export interface Player {
  x: number;
  y: number;
  z: number;
  yaw: number;
  vy: number;
  speed: number;
  kvx: number;
  kvz: number;
  onGround: boolean;
  invuln: number;
  stun: number;
}

export type GameEvent =
  | {
      type: "use";
      tool: Tool;
      fireKind: FireKind;
      outcome: Outcome;
      word: string;
      tip: string;
      x: number;
      y: number;
      z: number;
      out: boolean;
    }
  | { type: "grab"; tool: Tool; refill: boolean }
  | { type: "hint"; text: string }
  | { type: "hurt"; x: number; z: number }
  | { type: "ignite"; x: number; y: number; z: number; kind: FireKind }
  | { type: "doorBlocked" }
  | { type: "jump" }
  | { type: "roundEnd"; result: RoundResult };

export interface RoundResult {
  kind: "saved" | "escaped" | "smoke" | "timeout" | "burned";
  title: string;
  text: string;
  points: number;
  lifeLost: boolean;
}

export interface GameInput {
  forward: number; // -1..1
  turn: number; // -1..1, +1 = steer right
  run: boolean;
  jump: boolean; // edge
  action: boolean; // edge
}

export type Phase = "intro" | "playing" | "roundEnd" | "gameOver";

export interface GameState {
  phase: Phase;
  round: number;
  score: number;
  lives: number;
  timeLeft: number;
  elapsed: number;
  player: Player;
  fires: Fire[];
  held: Tool | null;
  uses: number;
  nextFireId: number;
  doorBlocked: boolean;
  smoke: number;
  pending: { source: Source; at: number }[];
  result: RoundResult | null;
  events: GameEvent[];
  seed: number;
  best: number;
}

// ---------- helpers ----------

function rand(s: GameState): number {
  // mulberry32
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function fireRadius(f: Pick<Fire, "intensity">): number {
  return 0.35 + 0.6 * f.intensity;
}

export function forwardOf(yaw: number): { x: number; z: number } {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

const dist2 = (ax: number, az: number, bx: number, bz: number) =>
  (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

// ---------- equipment rules ----------

export function outcomeOf(tool: Tool, kind: FireKind, intensity: number): Outcome {
  if (kind === "paper") {
    if (tool === "water") return "right";
    if (tool === "blanket") return intensity < 1 ? "right" : "weak";
    return "weak"; // co2
  }
  if (kind === "electric") {
    if (tool === "co2") return "right";
    if (tool === "water") return "wrong";
    return "weak"; // blanket
  }
  // grease
  if (tool === "blanket") return "right";
  return "wrong"; // water or co2
}

const COPY: Record<string, { word: string; tip: string }> = {
  "water:paper:right": { word: "SPLOOSH!", tip: "Water is perfect for paper, wood and cloth fires." },
  "blanket:paper:right": { word: "SMOTHERED!", tip: "Small paper fire? A blanket cuts off its oxygen." },
  "blanket:paper:weak": { word: "TOO BIG!", tip: "Too big to smother — soak it with water." },
  "co2:paper:weak": { word: "PFFT…", tip: "CO₂ knocks it down, but water soaks paper fires better." },
  "co2:electric:right": { word: "FSSSHH!", tip: "CO₂ is safe on electrical fires — it doesn't conduct." },
  "blanket:electric:weak": { word: "STILL LIVE!", tip: "Smothering doesn't cut the power. Use the CO₂ extinguisher." },
  "water:electric:wrong": { word: "BZZZAP!", tip: "Water conducts electricity! Never throw it on electrical fires." },
  "blanket:grease:right": { word: "SMOTHERED!", tip: "A fire blanket starves a pan fire of oxygen." },
  "water:grease:wrong": { word: "KA-WHOOOSH!", tip: "Water on burning oil turns to steam and blasts a fireball!" },
  "co2:grease:wrong": { word: "SPLAT!", tip: "The blast sprayed burning oil around. Smother pan fires with a blanket." },
};

export function copyFor(tool: Tool, kind: FireKind, outcome: Outcome) {
  return COPY[`${tool}:${kind}:${outcome}`] ?? { word: "HMM", tip: "" };
}

// ---------- lifecycle ----------

function freshPlayer(): Player {
  return {
    x: PLAYER_START.x,
    y: 0,
    z: PLAYER_START.z,
    yaw: PLAYER_START.yaw,
    vy: 0,
    speed: 0,
    kvx: 0,
    kvz: 0,
    onGround: true,
    invuln: 0,
    stun: 0,
  };
}

export function createGame(seed = Date.now() % 100000): GameState {
  return {
    phase: "intro",
    round: 1,
    score: 0,
    lives: TUNING.LIVES,
    timeLeft: TUNING.ROUND_TIME,
    elapsed: 0,
    player: freshPlayer(),
    fires: [],
    held: null,
    uses: 0,
    nextFireId: 1,
    doorBlocked: false,
    smoke: 0,
    pending: [],
    result: null,
    events: [],
    seed,
    best: 0,
  };
}

function addFire(s: GameState, kind: FireKind, x: number, y: number, z: number, intensity: number, isSource: boolean) {
  if (s.fires.length >= TUNING.MAX_FIRES) return null;
  const f: Fire = { id: s.nextFireId++, kind, x, y, z, intensity, isSource, spreadT: 0, regrow: 0 };
  s.fires.push(f);
  s.events.push({ type: "ignite", x, y, z, kind });
  return f;
}

export function igniteSource(s: GameState, src: Source, intensity: number) {
  return addFire(s, src.kind, src.x, src.y, src.z, intensity, true);
}

export function startRound(s: GameState) {
  s.phase = "playing";
  s.player = freshPlayer();
  s.fires = [];
  s.held = null;
  s.uses = 0;
  s.elapsed = 0;
  s.timeLeft = TUNING.ROUND_TIME;
  s.result = null;
  s.doorBlocked = false;
  s.pending = [];
  // shuffle sources
  const order = [...SOURCES];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  igniteSource(s, order[0], 0.4);
  igniteSource(s, order[1], 0.25);
  s.pending.push({ source: order[2], at: Math.max(4, TUNING.LATE_FIRE_AT - (s.round - 1) * 1.5) });
}

export function startGame(s: GameState) {
  s.score = 0;
  s.lives = TUNING.LIVES;
  s.round = 1;
  startRound(s);
}

/** Called from the round-end / game-over screen. */
export function continueGame(s: GameState) {
  if (s.phase === "gameOver") startGame(s);
  else if (s.phase === "roundEnd") startRound(s);
}

function endRound(s: GameState, r: Omit<RoundResult, "points"> & { points?: number }) {
  const result: RoundResult = { points: 0, ...r };
  s.score = Math.max(0, s.score + result.points);
  if (result.lifeLost) s.lives -= 1;
  s.best = Math.max(s.best, s.score);
  s.result = result;
  if (s.lives <= 0) {
    s.phase = "gameOver";
  } else {
    s.phase = "roundEnd";
    if (!result.lifeLost) s.round += 1;
  }
  s.events.push({ type: "roundEnd", result });
}

// ---------- actions ----------

export function nearestFire(s: GameState): Fire | null {
  const p = s.player;
  let best: Fire | null = null;
  let bestD = Infinity;
  for (const f of s.fires) {
    const d = Math.sqrt(dist2(p.x, p.z, f.x, f.z)) - fireRadius(f) * 0.5;
    if (d < TUNING.REACH && d < bestD) {
      best = f;
      bestD = d;
    }
  }
  return best;
}

export function nearestStation(s: GameState) {
  const p = s.player;
  let best: (typeof STATIONS)[number] | null = null;
  let bestD = TUNING.STATION_REACH ** 2;
  for (const st of STATIONS) {
    const d = dist2(p.x, p.z, st.x, st.z);
    if (d < bestD) {
      best = st;
      bestD = d;
    }
  }
  return best;
}

function spawnPatchNear(s: GameState, f: Fire, minR: number, maxR: number, towardDoorChance: number) {
  let ang = rand(s) * Math.PI * 2;
  if (rand(s) < towardDoorChance) {
    ang = Math.atan2(DOOR.x - f.x, DOOR.z - f.z) + (rand(s) - 0.5) * 0.9;
  }
  const r = minR + rand(s) * (maxR - minR);
  const x = Math.min(ROOM.maxX - 0.6, Math.max(ROOM.minX + 0.6, f.x + Math.sin(ang) * r));
  const z = Math.min(ROOM.maxZ - 0.6, Math.max(ROOM.minZ + 0.6, f.z + Math.cos(ang) * r));
  const near = s.fires.find((o) => dist2(o.x, o.z, x, z) < 1.0);
  if (near) {
    near.intensity = Math.min(TUNING.MAX_INTENSITY, near.intensity + 0.15);
    return;
  }
  addFire(s, "paper", x, 0, z, 0.3, false);
}

export function useTool(s: GameState, f: Fire) {
  const tool = s.held;
  if (!tool) return;
  const outcome = outcomeOf(tool, f.kind, f.intensity);
  const { word, tip } = copyFor(tool, f.kind, outcome);
  const before = f.intensity;

  if (outcome === "right") {
    const power = tool === "co2" ? 0.6 : tool === "blanket" ? 1.6 : 1.2;
    f.intensity -= power;
  } else if (outcome === "weak") {
    f.intensity -= tool === "blanket" && f.kind === "electric" ? 0.2 : 0.35;
    f.regrow = 4;
  } else {
    // wrong: big comic flare-up
    if (tool === "water" && f.kind === "grease") {
      f.intensity = Math.min(TUNING.MAX_INTENSITY, f.intensity + 0.8);
      for (let i = 0; i < 3; i++) spawnPatchNear(s, f, 1.4, 2.6, 0);
    } else if (tool === "water" && f.kind === "electric") {
      f.intensity = Math.min(TUNING.MAX_INTENSITY, f.intensity + 0.5);
      spawnPatchNear(s, f, 1.2, 2, 0);
      s.player.stun = 0.9;
    } else {
      f.intensity = Math.min(TUNING.MAX_INTENSITY, f.intensity + 0.35);
      for (let i = 0; i < 2; i++) spawnPatchNear(s, f, 1.2, 2.2, 0);
    }
    s.score = Math.max(0, s.score + POINTS.WRONG);
  }

  let out = false;
  if (f.intensity <= 0.05) {
    out = true;
    s.fires = s.fires.filter((o) => o !== f);
    s.score += POINTS.OUT + (f.isSource ? POINTS.OUT_SOURCE_BONUS : 0);
  } else if (outcome !== "wrong" && f.intensity < before) {
    s.score += POINTS.KNOCKDOWN;
  }

  s.uses -= 1;
  if (s.uses <= 0) {
    s.held = null;
    s.uses = 0;
  }
  s.events.push({ type: "use", tool, fireKind: f.kind, outcome, word, tip, x: f.x, y: f.y, z: f.z, out });
}

function doAction(s: GameState) {
  const fire = s.held ? nearestFire(s) : null;
  if (s.held && fire) {
    useTool(s, fire);
    return;
  }
  const st = nearestStation(s);
  if (st) {
    const refill = s.held === st.tool;
    s.held = st.tool;
    s.uses = TOOL_USES[st.tool];
    s.events.push({ type: "grab", tool: st.tool, refill });
    return;
  }
  s.events.push({
    type: "hint",
    text: s.held ? "Get closer to a fire to use it!" : "Grab equipment from a glowing station first.",
  });
}

// ---------- step ----------

function movePlayer(s: GameState, input: GameInput, dt: number) {
  const p = s.player;
  const T = TUNING;
  const stunned = p.stun > 0;
  const fwdIn = stunned ? 0 : input.forward;
  const turnIn = stunned ? 0 : input.turn;
  const top = input.run ? T.RUN : T.WALK;
  const target = fwdIn * top * (fwdIn < 0 ? T.BACK_FACTOR : 1);
  p.speed += (target - p.speed) * (1 - Math.exp(-T.ACCEL * dt));
  p.yaw -= turnIn * T.TURN * dt;

  if (input.jump && p.onGround && !stunned) {
    p.vy = T.JUMP_V;
    p.onGround = false;
    s.events.push({ type: "jump" });
  }
  p.vy -= T.GRAVITY * dt;
  p.y += p.vy * dt;
  if (p.y <= 0) {
    p.y = 0;
    p.vy = 0;
    p.onGround = true;
  }

  const f = forwardOf(p.yaw);
  p.x += (f.x * p.speed + p.kvx) * dt;
  p.z += (f.z * p.speed + p.kvz) * dt;
  const kd = Math.exp(-5 * dt);
  p.kvx *= kd;
  p.kvz *= kd;

  // furniture
  const R = T.PLAYER_R;
  for (const b of OBSTACLES) {
    if (p.y >= b.h) continue;
    const cx = Math.max(b.x - b.hw, Math.min(p.x, b.x + b.hw));
    const cz = Math.max(b.z - b.hd, Math.min(p.z, b.z + b.hd));
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > R * R) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * R;
      p.z = cz + (dz / d) * R;
    } else {
      // centre inside the box: push out along the shallowest axis
      const ox = b.hw + R - Math.abs(p.x - b.x);
      const oz = b.hd + R - Math.abs(p.z - b.z);
      if (ox < oz) p.x += Math.sign(p.x - b.x || 1) * ox;
      else p.z += Math.sign(p.z - b.z || 1) * oz;
    }
  }
  // walls
  p.x = Math.min(ROOM.maxX - R, Math.max(ROOM.minX + R, p.x));
  p.z = Math.min(ROOM.maxZ - R, Math.max(ROOM.minZ + R, p.z));
}

function updateFires(s: GameState, dt: number) {
  const diff = 1 + (s.round - 1) * 0.15;
  for (const f of [...s.fires]) {
    const regrowBoost = f.regrow > 0 ? 1.8 : 1;
    f.regrow = Math.max(0, f.regrow - dt);
    f.intensity = Math.min(TUNING.MAX_INTENSITY, f.intensity + GROW[f.kind] * diff * regrowBoost * dt);
    if (f.intensity > TUNING.SPREAD_AT) {
      f.spreadT += dt * diff;
      if (f.spreadT >= TUNING.SPREAD_EVERY) {
        f.spreadT = 0;
        spawnPatchNear(s, f, 1.4, 2.2, 0.35);
      }
    }
  }
  for (const pnd of [...s.pending]) {
    if (s.elapsed >= pnd.at) {
      s.pending = s.pending.filter((x) => x !== pnd);
      igniteSource(s, pnd.source, 0.3);
    }
  }
}

export function isDoorBlocked(s: GameState): boolean {
  return s.fires.some(
    (f) => f.intensity > TUNING.DOOR_BLOCK_I && dist2(f.x, f.z, DOOR.x, DOOR.z) < TUNING.DOOR_BLOCK_R ** 2,
  );
}

function checkHurt(s: GameState) {
  const p = s.player;
  if (p.invuln > 0) return;
  for (const f of s.fires) {
    if (f.intensity < 0.25) continue;
    if (!f.isSource && p.y > 0.6) continue; // jumping over floor flames is safe
    const r = fireRadius(f) * 0.85;
    const d2v = dist2(p.x, p.z, f.x, f.z);
    if (d2v < r * r) {
      s.lives -= 1;
      p.invuln = TUNING.INVULN;
      const d = Math.sqrt(d2v) || 1;
      const nx = d2v > 1e-6 ? (p.x - f.x) / d : -Math.sin(p.yaw);
      const nz = d2v > 1e-6 ? (p.z - f.z) / d : -Math.cos(p.yaw);
      p.kvx = nx * 9;
      p.kvz = nz * 9;
      p.speed = 0;
      s.events.push({ type: "hurt", x: p.x, z: p.z });
      if (s.lives <= 0) {
        s.lives = 1; // endRound removes the final life
        endRound(s, {
          kind: "burned",
          title: "Ouch! Too close!",
          text: "Never walk through flames — jump small floor fires or go around.",
          lifeLost: true,
        });
      }
      return;
    }
  }
}

export function step(s: GameState, input: GameInput, rawDt: number) {
  if (s.phase !== "playing") return;
  const dt = Math.min(rawDt, 0.05);
  s.elapsed += dt;
  s.timeLeft = Math.max(0, s.timeLeft - dt);
  const p = s.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.stun = Math.max(0, p.stun - dt);

  movePlayer(s, input, dt);
  if (input.action && p.stun <= 0) doAction(s);
  if (s.phase !== "playing") return;
  updateFires(s, dt);

  const blocked = isDoorBlocked(s);
  if (blocked && !s.doorBlocked) s.events.push({ type: "doorBlocked" });
  s.doorBlocked = blocked;
  s.smoke = s.fires.reduce((a, f) => a + f.intensity, 0);

  checkHurt(s);
  if (s.phase !== "playing") return;

  if (s.fires.length === 0 && s.pending.length === 0) {
    const bonus = Math.floor(s.timeLeft) * POINTS.PER_SECOND_LEFT;
    endRound(s, {
      kind: "saved",
      title: "Room saved!",
      text: `Every fire is out. Time bonus +${bonus}.`,
      points: POINTS.SAVED + bonus,
      lifeLost: false,
    });
    return;
  }
  if (!s.doorBlocked && dist2(p.x, p.z, DOOR.x, DOOR.z) < 1.3 * 1.3) {
    endRound(s, {
      kind: "escaped",
      title: "You got out!",
      text: "Getting out safely is always a smart call. Close the door behind you!",
      points: POINTS.ESCAPED,
      lifeLost: false,
    });
    return;
  }
  if (s.smoke >= TUNING.SMOKE_LIMIT) {
    endRound(s, {
      kind: "smoke",
      title: "Too much smoke!",
      text: "The fire got away. When it's spreading fast, leave early.",
      lifeLost: true,
    });
    return;
  }
  if (s.timeLeft <= 0) {
    endRound(s, {
      kind: "timeout",
      title: "Out of time!",
      text: "The room filled with smoke. Fight fast — or get out fast.",
      lifeLost: true,
    });
  }
}
