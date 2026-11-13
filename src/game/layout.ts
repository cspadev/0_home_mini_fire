// Room 1 layout — shared by the simulation (collisions) and the scene (models).
// Units are metres. North wall is z = -8, the exit door is in the south wall.

export type FireKind = "paper" | "electric" | "grease";
export type Tool = "water" | "co2" | "blanket";

export const ROOM = { minX: -10, maxX: 10, minZ: -8, maxZ: 8, height: 3.4 };
export const DOOR = { x: -6.5, z: 7.6, width: 1.7 };
/** wall-mounted fire alarm pull station, next to the exit */
export const ALARM = { x: -4.6, z: 7.3 };
export const PLAYER_START = { x: 0, z: 3.4, yaw: Math.PI };

export type ModelKey =
  | "desk" | "chairDesk" | "computerScreen" | "kitchenStove" | "kitchenCabinet" | "kitchenSink"
  | "trashcan" | "bookcaseOpen" | "pottedPlant" | "table" | "bench" | "kitchenFridge" | "kitchenMicrowave"
  | "laptop" | "stoolBar" | "cardboardBoxClosed" | "speaker" | "kitchenStoveElectric" | "kitchenBar" | "televisionModern";

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
const CAB: [number, number, number] = [1.2, 0.95, 0.9];
const f = (model: ModelKey, x: number, z: number, rotY: number, size: [number, number, number], collide = true, y?: number): Furniture =>
  ({ model, x, z, rotY, size, collide, ...(y !== undefined ? { y } : {}) });
const sink = f("kitchenSink", 0, -7.45, 0, CAB);
const deskRow = (x: number, z: number): Furniture[] => [
  f("desk", x, z, 0, [1.6, 0.78, 0.8]),
  f("computerScreen", x, z - 0.1, 0, [0.7, 0.55, 0.3], false, 0.78),
  f("chairDesk", x, z + 0.8, Math.PI, [0.55, 0.95, 0.55], false),
];
const table = (x: number, z: number): Furniture[] => [
  f("table", x, z, 0, [2.0, 0.78, 1.1]),
  f("stoolBar", x - 0.6, z - 0.85, 0, [0.45, 0.7, 0.45], false),
  f("stoolBar", x + 0.6, z - 0.85, 0, [0.45, 0.7, 0.45], false),
  f("stoolBar", x - 0.6, z + 0.85, 0, [0.45, 0.7, 0.45], false),
  f("stoolBar", x + 0.6, z + 0.85, 0, [0.45, 0.7, 0.45], false),
];

export interface Box {
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
}

export interface Source {
  kind: FireKind;
  x: number;
  z: number;
  y: number;
  label: string;
}

export interface RoomTheme {
  floorA: string;
  floorB: string;
  floorStyle: "tile" | "wood" | "carpet";
  wall: string;
  wainscot: string;
  trim: string;
  sky: string;
  hoops?: boolean;
}

export type RoomId = "kitchen" | "computer" | "gym" | "cafeteria" | "chemistry";

export interface RoomDef {
  id: RoomId;
  name: string;
  icon: string;
  blurb: string;
  theme: RoomTheme;
  furniture: Furniture[];
  sources: Source[];
}

export const ROOMS: RoomDef[] = [
  {
    id: "kitchen",
    name: "Home-Ec Kitchen",
    icon: "🍳",
    blurb: "Frying pans, a computer and an overflowing bin.",
    theme: { floorA: "#efe6d2", floorB: "#5fb3a8", floorStyle: "tile", wall: "#f6dcb8", wainscot: "#e0704f", trim: "#c95a3d", sky: "#f3d9b5" },
    furniture: [
      f("kitchenCabinet", -6.2, -7.45, 0, CAB),
      f("kitchenStove", -4.0, -7.45, 0, CAB),
      f("kitchenCabinet", -2.8, -7.45, 0, CAB),
      sink,
      f("kitchenCabinet", 1.2, -7.45, 0, CAB),
      f("bookcaseOpen", -9.6, -3, Q, [1.8, 2.0, 0.5]),
      f("desk", 8.95, -2, -Q, [1.8, 0.8, 0.9]),
      f("computerScreen", 9.05, -2, -Q, [0.8, 0.6, 0.3], false, 0.8),
      f("chairDesk", 7.9, -2, Q, [0.6, 1.0, 0.6], false),
      f("desk", -1.6, -1.2, 0, [1.6, 0.78, 0.8]),
      f("desk", 2.6, -1.2, 0, [1.6, 0.78, 0.8]),
      f("desk", 2.6, 2.4, 0, [1.6, 0.78, 0.8]),
      f("chairDesk", -1.6, -0.4, Math.PI, [0.55, 0.95, 0.55], false),
      f("chairDesk", 2.6, -0.4, Math.PI, [0.55, 0.95, 0.55], false),
      f("chairDesk", 2.6, 3.2, Math.PI, [0.55, 0.95, 0.55], false),
      f("trashcan", -6.5, 1.5, 0, [0.55, 0.7, 0.55]),
      f("pottedPlant", 9.3, 7.3, 0, [0.7, 1.3, 0.7]),
      f("pottedPlant", -9.3, 6.0, 0, [0.7, 1.3, 0.7]),
    ],
    sources: [
      { kind: "grease", x: -4.0, z: -7.4, y: 0.95, label: "frying pan" },
      { kind: "electric", x: 9.0, z: -2, y: 0.85, label: "computer" },
      { kind: "paper", x: -6.5, z: 1.5, y: 0.7, label: "trash can" },
    ],
  },
  {
    id: "computer",
    name: "Computer Lab",
    icon: "💻",
    blurb: "Rows of humming computers and a pile of printer paper.",
    theme: { floorA: "#5d6f8f", floorB: "#6c7fa0", floorStyle: "carpet", wall: "#dde8f2", wainscot: "#3c78b4", trim: "#2c5c8c", sky: "#cfe0ee" },
    furniture: [
      sink,
      ...deskRow(-5.5, -4), ...deskRow(-2.6, -4), ...deskRow(2.6, -4), ...deskRow(5.5, -4),
      ...deskRow(-5.5, -0.6), ...deskRow(5.5, -0.6),
      f("desk", 8.95, 1, -Q, [1.8, 0.8, 0.9]),
      f("laptop", 9.0, 1, -Q, [0.5, 0.35, 0.45], false, 0.8),
      f("cardboardBoxClosed", -8.7, 3.6, 0, [0.9, 1.0, 0.9]),
      f("cardboardBoxClosed", -8.7, 4.6, 0.3, [0.8, 0.8, 0.8]),
      f("bookcaseOpen", -9.6, -2, Q, [1.8, 2.0, 0.5]),
      f("pottedPlant", 9.3, 7.3, 0, [0.7, 1.3, 0.7]),
    ],
    sources: [
      { kind: "electric", x: 5.5, z: -4.1, y: 0.95, label: "computer" },
      { kind: "electric", x: -5.5, z: -0.7, y: 0.95, label: "computer" },
      { kind: "paper", x: -8.7, z: 3.6, y: 1.0, label: "printer paper" },
    ],
  },
  {
    id: "gym",
    name: "Gym",
    icon: "🏀",
    blurb: "A big open court, a sound system and the snack stand.",
    theme: { floorA: "#e2a865", floorB: "#d39552", floorStyle: "wood", wall: "#f1ece0", wainscot: "#2f6fb0", trim: "#1f4f80", sky: "#efe6d0", hoops: true },
    furniture: [
      sink,
      f("bench", -6, -7.5, 0, [0.85, 1.0, 0.42]),
      f("bench", -3, -7.5, 0, [0.85, 1.0, 0.42]),
      f("bench", 3.4, -7.5, 0, [0.85, 1.0, 0.42]),
      f("bench", 6.4, -7.5, 0, [0.85, 1.0, 0.42]),
      f("speaker", 9.5, -3, -Q, [0.7, 1.5, 0.7]),
      f("speaker", 9.5, -4.2, -Q, [0.7, 1.5, 0.7]),
      f("kitchenBar", -9.45, -1.8, Q, CAB),
      f("kitchenStoveElectric", -9.45, -3, Q, CAB),
      f("kitchenBar", -9.45, -4.2, Q, CAB),
      f("cardboardBoxClosed", 6.8, 6.6, 0, [1.0, 1.0, 1.0]),
      f("cardboardBoxClosed", 7.9, 6.9, 0.4, [0.8, 0.7, 0.8]),
    ],
    sources: [
      { kind: "electric", x: 9.5, z: -3, y: 1.5, label: "sound system" },
      { kind: "grease", x: -9.45, z: -3, y: 0.95, label: "snack-stand fryer" },
      { kind: "paper", x: 6.8, z: 6.6, y: 1.0, label: "cardboard boxes" },
    ],
  },
  {
    id: "cafeteria",
    name: "Cafeteria",
    icon: "🍔",
    blurb: "Lunch rush! A deep fryer, a microwave and the big bin.",
    theme: { floorA: "#fff3c8", floorB: "#e9573f", floorStyle: "tile", wall: "#fff0d8", wainscot: "#f2a531", trim: "#c97f12", sky: "#fde6c0" },
    furniture: [
      f("kitchenFridge", -8.8, -7.4, 0, [1.2, 2.1, 0.9]),
      f("kitchenBar", -6.2, -7.45, 0, CAB),
      f("kitchenStove", -4.0, -7.45, 0, CAB),
      f("kitchenBar", -2.8, -7.45, 0, CAB),
      f("kitchenMicrowave", -2.8, -7.5, 0, [0.7, 0.45, 0.5], false, 0.95),
      sink,
      f("kitchenBar", 1.2, -7.45, 0, CAB),
      ...table(-4.5, -2.2), ...table(4.5, -2.2), ...table(-4.5, 2.4), ...table(4.5, 2.4),
      f("trashcan", 7.2, 6.8, 0, [0.7, 0.9, 0.7]),
      f("pottedPlant", -9.3, 4.5, 0, [0.7, 1.3, 0.7]),
    ],
    sources: [
      { kind: "grease", x: -4.0, z: -7.4, y: 0.95, label: "deep fryer" },
      { kind: "electric", x: -2.8, z: -7.5, y: 1.4, label: "microwave" },
      { kind: "paper", x: 7.2, z: 6.8, y: 0.9, label: "trash bin" },
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry Lab",
    icon: "🧪",
    blurb: "Lab benches, an oil bath on a hot plate and paper towels.",
    theme: { floorA: "#f4f6f0", floorB: "#7fbf8f", floorStyle: "tile", wall: "#e6f2e8", wainscot: "#3f9a6a", trim: "#2c7550", sky: "#dceede" },
    furniture: [
      f("kitchenCabinet", -1.2, -7.45, 0, CAB),
      sink,
      f("kitchenCabinet", 1.2, -7.45, 0, CAB),
      f("kitchenBar", -5.4, -3.5, 0, CAB),
      f("kitchenStoveElectric", -4.2, -3.5, 0, CAB),
      f("kitchenBar", 3.6, -3.5, 0, CAB),
      f("kitchenBar", 4.8, -3.5, 0, CAB),
      f("computerScreen", 4.8, -3.5, 0, [0.7, 0.55, 0.3], false, 0.95),
      f("kitchenBar", -5.4, 0.6, 0, CAB),
      f("kitchenBar", -4.2, 0.6, 0, CAB),
      f("kitchenBar", 3.6, 0.6, 0, CAB),
      f("kitchenBar", 4.8, 0.6, 0, CAB),
      f("stoolBar", -4.8, 1.5, 0, [0.45, 0.7, 0.45], false),
      f("stoolBar", 4.2, 1.5, 0, [0.45, 0.7, 0.45], false),
      f("bookcaseOpen", -9.6, -3, Q, [1.8, 2.0, 0.5]),
      f("bookcaseOpen", 9.6, -1, -Q, [1.8, 2.0, 0.5]),
      f("trashcan", -7.5, 4.5, 0, [0.6, 0.75, 0.6]),
    ],
    sources: [
      { kind: "grease", x: -4.2, z: -3.5, y: 0.95, label: "oil bath" },
      { kind: "electric", x: 4.8, z: -3.5, y: 1.0, label: "lab computer" },
      { kind: "paper", x: -7.5, z: 4.5, y: 0.75, label: "paper towels" },
    ],
  },
];

/** Live room data, refilled in place by setRoom so every importer sees the current room. */
export const FURNITURE: Furniture[] = [];
export const OBSTACLES: Box[] = [];
export const SOURCES: Source[] = [];
export let currentRoom: RoomDef = ROOMS[0]!;

function toBox(fu: Furniture): Box {
  const quarter = Math.abs(Math.round(fu.rotY / Q)) % 2 === 1;
  const [w, h, d] = fu.size;
  return { x: fu.x, z: fu.z, hw: (quarter ? d : w) / 2, hd: (quarter ? w : d) / 2, h };
}

export function setRoom(id: RoomId) {
  currentRoom = ROOMS.find((r) => r.id === id) ?? ROOMS[0]!;
  FURNITURE.splice(0, FURNITURE.length, ...currentRoom.furniture);
  OBSTACLES.splice(0, OBSTACLES.length, ...currentRoom.furniture.filter((x) => x.collide).map(toBox));
  SOURCES.splice(0, SOURCES.length, ...currentRoom.sources);
}
setRoom("kitchen");

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
