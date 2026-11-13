import { describe, expect, it } from "vitest";
import { ROOMS, setRoom, OBSTACLES, SOURCES, DOOR, ALARM, STATIONS } from "./layout";
import { makeQuiz, quizPassed } from "./quiz";
import {
  applyTool,
  createGame,
  forwardOf,
  igniteSource,
  nearestFire,
  outcomeOf,
  revive,
  startGame,
  step,
  TUNING,
  TOOL_USES,
  type GameInput,
} from "./sim";

const idle: GameInput = { forward: 0, turn: 0, run: false, jump: false, action: false };
const src = (k: string) => SOURCES.find((s) => s.kind === k)!;

function playing() {
  const s = createGame(42);
  startGame(s);
  s.fires = [];
  s.pending = [];
  s.events = [];
  return s;
}

describe("equipment rules", () => {
  it.each(["water", "blanket"] as const)("%s supplies two uses per pickup", (tool) => {
    const s = playing();
    s.alarm = true;
    const station = STATIONS.find((st) => st.tool === tool);
    if (!station) throw new Error(`Missing ${tool} station`);
    s.player.x = station.x; s.player.z = station.z;
    step(s, { ...idle, action: true }, 0.016);
    expect(s.uses).toBe(2);
    const fire = igniteSource(s, src(tool === "water" ? "paper" : "grease"), 0.4);
    if (!fire) throw new Error("Missing fire");
    applyTool(s, fire);
    expect(s.held).toBe(tool);
    expect(s.uses).toBe(1);
  });

  it("CO2 supplies six bursts per pickup", () => {
    expect(TOOL_USES.co2).toBe(6);
    const s = playing();
    s.alarm = true;
    const station = STATIONS.find((st) => st.tool === "co2");
    if (!station) throw new Error("Missing CO2 station");
    s.player.x = station.x; s.player.z = station.z;
    step(s, { ...idle, action: true }, 0.016);
    expect(s.uses).toBe(6);
  });

  it("matches the fire-safety table", () => {
    expect(outcomeOf("water", "paper", 0.5)).toBe("right");
    expect(outcomeOf("co2", "electric", 0.5)).toBe("right");
    expect(outcomeOf("blanket", "grease", 0.5)).toBe("right");
    expect(outcomeOf("water", "electric", 0.5)).toBe("wrong");
    expect(outcomeOf("water", "grease", 0.5)).toBe("wrong");
    expect(outcomeOf("co2", "grease", 0.5)).toBe("wrong");
  });

  it("water on a cooking-oil fire makes it bigger and spreads it", () => {
    const s = playing();
    const f = igniteSource(s, src("grease"), 0.5)!;
    s.held = "water";
    s.uses = 1;
    applyTool(s, f);
    expect(f.intensity).toBeGreaterThan(0.5);
    expect(s.fires.length).toBeGreaterThan(1);
  });

  it("putting out a fire brings the firefighters 5 s sooner", () => {
    const s = playing();
    s.alarm = true;
    s.timeLeft = 20;
    const f = igniteSource(s, src("grease"), 0.5)!;
    s.held = "blanket";
    s.uses = 1;
    applyTool(s, f);
    expect(s.timeLeft).toBe(15);
  });

  it("a fire blanket puts out a cooking-oil fire", () => {
    const s = playing();
    const f = igniteSource(s, src("grease"), 0.9)!;
    s.held = "blanket";
    s.uses = 1;
    applyTool(s, f);
    expect(s.fires.length).toBe(0);
    expect(s.held).toBeNull();
  });

  it("CO2 has 4 bursts and two put out a mid-size electrical fire", () => {
    const s = playing();
    const f = igniteSource(s, src("electric"), 0.9)!;
    s.held = "co2";
    s.uses = 4;
    applyTool(s, f);
    expect(s.fires.length).toBe(1);
    applyTool(s, f);
    expect(s.fires.length).toBe(0);
    expect(s.uses).toBe(2);
  });
});

describe("rounds and lives", () => {
  it("starts with 3 lives and 2 burning sources plus 1 to come", () => {
    const s = createGame(1);
    startGame(s);
    expect(s.lives).toBe(3);
    expect(s.fires.length).toBe(2);
    expect(s.pending.length).toBe(1);
  });

  it("losing the last life ends the game", () => {
    const s = playing();
    igniteSource(s, src("paper"), 1);
    s.lives = 1;
    s.player.x = s.fires[0]!.x + 0.1;
    s.player.z = s.fires[0]!.z + 0.1;
    step(s, idle, 0.05);
    expect(s.phase).toBe("gameOver");
  });

  it("the exit is blocked when a big fire sits next to the door", () => {
    const s = playing();
    igniteSource(s, src("paper"), 1);
    s.fires.push({ id: 99, kind: "paper", x: DOOR.x + 1, y: 0, z: DOOR.z - 0.5, intensity: 0.9, isSource: false, spreadT: 0, regrow: 0 });
    step(s, idle, 0.016);
    expect(s.doorBlocked).toBe(true);
  });

  it("walking out of an open door ends the round as escaped", () => {
    const s = playing();
    igniteSource(s, src("paper"), 0.3);
    s.player.x = DOOR.x;
    s.player.z = DOOR.z;
    step(s, idle, 0.016);
    expect(s.result?.kind).toBe("escaped");
    expect(s.lives).toBe(3);
  });
});

describe("controls", () => {
  it("equipment reaches a little farther but still has a distance limit", () => {
    const s = playing();
    const fire = igniteSource(s, src("paper"), 0.5);
    if (!fire) throw new Error("Missing fire");
    expect(TUNING.REACH).toBe(3.4);
    s.player.x = fire.x + 3.6; s.player.z = fire.z;
    expect(nearestFire(s)).toBe(fire);
    s.player.x = fire.x + 4;
    expect(nearestFire(s)).toBeNull();
  });

  it("steering right turns the player toward screen-right (+x when facing -z)", () => {
    const s = playing();
    igniteSource(s, src("paper"), 0.1);
    expect(forwardOf(s.player.yaw).z).toBeCloseTo(-1);
    step(s, { ...idle, turn: 1 }, 0.05);
    expect(forwardOf(s.player.yaw).x).toBeGreaterThan(0);
  });

  it("forward input moves the player the way they face", () => {
    const s = playing();
    igniteSource(s, src("paper"), 0.1);
    const z0 = s.player.z;
    for (let i = 0; i < 10; i++) step(s, { ...idle, forward: 1 }, 0.05);
    expect(s.player.z).toBeLessThan(z0);
  });

  it("jumping clears the ground", () => {
    const s = playing();
    igniteSource(s, src("paper"), 0.1);
    step(s, { ...idle, jump: true }, 0.05);
    expect(s.player.y).toBeGreaterThan(0);
    expect(TUNING.JUMP_V).toBeGreaterThan(0);
  });
});

describe("alarm, firefighters and revive", () => {
  it("equipment is locked until the alarm is pulled", () => {
    const s = playing();
    igniteSource(s, src("paper"), 0.3);
    const st = STATIONS[0]!;
    s.player.x = st.x; s.player.z = st.z;
    step(s, { ...idle, action: true }, 0.016);
    expect(s.held).toBe(null);
  });

  it("the 30 s firefighter countdown only runs after the alarm", () => {
    const s = playing();
    igniteSource(s, src("paper"), 0.1);
    expect(TUNING.ROUND_TIME).toBe(30);
    step(s, idle, 0.05);
    expect(s.timeLeft).toBe(30);
    s.player.x = ALARM.x; s.player.z = ALARM.z - 0.5;
    step(s, { ...idle, action: true }, 0.05);
    expect(s.alarm).toBe(true);
    step(s, idle, 0.05);
    expect(s.timeLeft).toBeLessThan(30);
  });

  it("firefighters arriving wins the round without losing a life", () => {
    const s = playing();
    igniteSource(s, src("paper"), 0.1);
    s.alarm = true;
    s.timeLeft = 0.01;
    step(s, idle, 0.05);
    expect(s.rescueT).toBeGreaterThanOrEqual(0);
    expect(s.result).toBeNull();
    for (let i = 0; i < 80; i++) step(s, idle, 0.05);
    expect(s.result?.kind).toBe("rescued");
    expect(s.fires.length).toBe(0);
    expect(s.lives).toBe(3);
  });

  it("revive after game over restores 3 lives and keeps the score", () => {
    const s = playing();
    s.phase = "gameOver"; s.lives = 0; s.score = 420;
    revive(s);
    expect(s.phase).toBe("playing");
    expect(s.lives).toBe(3);
    expect(s.score).toBe(420);
  });

  it("quiz has 3 questions, needs 2 right", () => {
    const q = makeQuiz();
    expect(q.length).toBe(3);
    expect(quizPassed(2)).toBe(true);
    expect(quizPassed(1)).toBe(false);
  });
});

describe("rooms", () => {
  it("has the 5 school rooms, each with 3 fire sources", () => {
    expect(ROOMS.map((r) => r.id)).toEqual(["kitchen", "computer", "gym", "cafeteria", "chemistry"]);
    for (const r of ROOMS) expect(r.sources.length).toBe(3);
  });

  it("picking a room swaps the fire sources and the player starts clear of furniture", () => {
    for (const r of ROOMS) {
      setRoom(r.id);
      expect(SOURCES[0]!.label).toBe(r.sources[0]!.label);
      const s = createGame(3);
      startGame(s);
      const p = s.player;
      for (const b of OBSTACLES) expect(Math.abs(p.x - b.x) > b.hw + 0.3 || Math.abs(p.z - b.z) > b.hd + 0.3).toBe(true);
      for (const st of STATIONS) for (const b of OBSTACLES) expect(Math.abs(st.x - b.x) > b.hw || Math.abs(st.z - b.z) > b.hd).toBe(true);
    }
    setRoom("kitchen");
  });
});
