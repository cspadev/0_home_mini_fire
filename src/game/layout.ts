// Room 1 layout — shared by the simulation (collisions) and the scene (models).
// Units are metres. North wall is z = -8, the exit door is in the south wall.

export type FireKind = "paper" | "electric" | "grease";
export type Tool = "water" | "co2" | "blanket";

export const ROOM = { minX: -10, maxX: 10, minZ: -8, maxZ: 8, height: 3.4 };
export const DOOR = { x: -6.5, z: 7.6, width: 1.7 };
export const PLAYER_START = { x: 0, z: 5.2, yaw: Math.PI };

export type ModelKey =
  | "desk"
  | "chairDesk"
  | "computerScreen"
  | "kitchenStove"
  | "kitchenCabinet"
  | "kitchenSink"
  | "trashcan"
  | "bookcaseOpen"
  | "pottedPlant";

export interface Furniture {
  model: ModelKey;
  x: number;
  z: number;
  y?: number;
  rotY: number;
  /** size in the model's own (unrotated) frame: width (x), height, depth (z) */
  size: [number, number, number];
  collide: boolean;
}

const Q = Math.PI / 2;

export const FURNITURE: Furniture[] = [
  // Kitchen counter along the north wall
  { model: "kitchenCabinet", x: -6.2, z: -7.45, rotY: 0, size: [1.2, 0.95, 0.9], collide: true },
  { model: "kitchenStove", x: -4.0, z: -7.45, rotY: 0, size: [1.2, 0.95, 0.9], collide: true },
  { model: "kitchenCabinet", x: -2.8, z: -7.45, rotY: 0, size: [1.2, 0.95, 0.9], collide: true },
  { model: "kitchenSink", x: 0, z: -7.45, rotY: 0, size: [1.2, 0.95, 0.9], collide: true },
  { model: "kitchenCabinet", x: 1.2, z: -7.45, rotY: 0, size: [1.2, 0.95, 0.9], collide: true },
  // Bookcase on the west wall
  { model: "bookcaseOpen", x: -9.6, z: -3, rotY: Q, size: [1.8, 2.0, 0.5], collide: true },
  // Computer desk on the east wall
  { model: "desk", x: 8.95, z: -2, rotY: -Q, size: [1.8, 0.8, 0.9], collide: true },
  { model: "computerScreen", x: 9.05, z: -2, y: 0.8, rotY: -Q, size: [0.8, 0.6, 0.3], collide: false },
  { model: "chairDesk", x: 7.9, z: -2, rotY: Q, size: [0.6, 1.0, 0.6], collide: false },
  // Student desks
  { model: "desk", x: -1.6, z: -1.2, rotY: 0, size: [1.6, 0.78, 0.8], collide: true },
  { model: "desk", x: 2.6, z: -1.2, rotY: 0, size: [1.6, 0.78, 0.8], collide: true },
  { model: "desk", x: 2.6, z: 2.4, rotY: 0, size: [1.6, 0.78, 0.8], collide: true },
  { model: "chairDesk", x: -1.6, z: -0.4, rotY: Math.PI, size: [0.55, 0.95, 0.55], collide: false },
  { model: "chairDesk", x: 2.6, z: -0.4, rotY: Math.PI, size: [0.55, 0.95, 0.55], collide: false },
  { model: "chairDesk", x: 2.6, z: 3.2, rotY: Math.PI, size: [0.55, 0.95, 0.55], collide: false },
  // Trash can
  { model: "trashcan", x: -6.5, z: 1.5, rotY: 0, size: [0.55, 0.7, 0.55], collide: true },
  // Plants
  { model: "pottedPlant", x: 9.3, z: 7.3, rotY: 0, size: [0.7, 1.3, 0.7], collide: true },
  { model: "pottedPlant", x: -9.3, z: 6.0, rotY: 0, size: [0.7, 1.3, 0.7], collide: true },
];

export interface Box {
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
}

export const OBSTACLES: Box[] = FURNITURE.filter((f) => f.collide).map((f) => {
  const quarter = Math.abs(Math.round(f.rotY / Q)) % 2 === 1;
  const [w, h, d] = f.size;
  return { x: f.x, z: f.z, hw: (quarter ? d : w) / 2, hd: (quarter ? w : d) / 2, h };
});

export interface Station {
  tool: Tool;
  x: number;
  z: number;
  label: string;
}

export const STATIONS: Station[] = [
  { tool: "water", x: 0, z: -6.5, label: "Water bucket" },
  { tool: "co2", x: -3.4, z: 7.1, label: "CO₂ extinguisher" },
  { tool: "blanket", x: 9.2, z: 4, label: "Fire blanket" },
];

export interface Source {
  kind: FireKind;
  x: number;
  z: number;
  y: number;
  label: string;
}

export const SOURCES: Source[] = [
  { kind: "grease", x: -4.0, z: -7.4, y: 0.95, label: "frying pan" },
  { kind: "electric", x: 9.0, z: -2, y: 0.85, label: "computer" },
  { kind: "paper", x: -6.5, z: 1.5, y: 0.7, label: "trash can" },
];

export const TOOL_LABEL: Record<Tool, string> = {
  water: "Water bucket",
  co2: "CO₂ extinguisher",
  blanket: "Fire blanket",
};

export const FIRE_LABEL: Record<FireKind, string> = {
  paper: "Paper / wood fire",
  electric: "Electrical fire",
  grease: "Cooking-oil fire",
};
