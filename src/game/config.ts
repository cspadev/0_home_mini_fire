// All tunable game parameters live here. Texts live in src/i18n (cs.ts is the default language).
import type { FireKind, Tool } from "./layout";

/** How one game (a "match") is played and scored for the host game. */
export const MATCH = {
  /** Rounds in one game. After the last one the evaluation screen sends the result to the host game. */
  rounds: 3,
  /**
   * Round results that count as won. successRate = won rounds / rounds.
   * Possible values: "saved" (all fires out), "rescued" (held on until firefighters came),
   * "escaped" (got out of the room), "smoke" (too much smoke), "burned" (lost the last life).
   */
  winKinds: ["saved", "rescued"] as readonly string[],
};

export const TUNING = {
  WALK: 5.6,
  RUN: 7.2,
  BACK_FACTOR: 0.55,
  TURN: 2.9,
  ACCEL: 12,
  GRAVITY: 24,
  JUMP_V: 8.4,
  PLAYER_R: 0.35,
  REACH: 3.4,
  OUT_TIME_CUT: 5, // seconds shaved off the firefighter countdown per fire put out
  STATION_REACH: 1.7,
  ROUND_TIME: 30, // firefighter arrival countdown, starts when the alarm is raised
  MAX_FIRES: 16,
  SPREAD_AT: 0.85,
  SPREAD_EVERY: 7,
  DOOR_BLOCK_R: 2.3,
  DOOR_BLOCK_I: 0.6,
  SMOKE_LIMIT: 9,
  INVULN: 2,
  LIVES: 3,
  LATE_FIRE_AT: 10,
  MAX_INTENSITY: 1.6,
};

/** Uses per pick-up of each tool. */
export const TOOL_USES: Record<Tool, number> = { water: 2, co2: 6, blanket: 2 };
/** Growth of each fire type per second. */
export const GROW: Record<FireKind, number> = { paper: 0.075, electric: 0.06, grease: 0.09 };

export const POINTS = {
  OUT: 100,
  OUT_SOURCE_BONUS: 50,
  KNOCKDOWN: 20,
  WRONG: -50,
  SAVED: 300,
  PER_SECOND_LEFT: 10,
  ESCAPED: 150,
  ALARM: 50,
  RESCUED: 200,
};

/** Seconds of the firefighter rescue animation before the round ends. */
export const RESCUE_TIME = 3.5;

/** Revive quiz after losing all lives. Questions are in src/i18n, answers in src/game/quiz.ts. */
export const QUIZ = { length: 3, pass: 2 };
