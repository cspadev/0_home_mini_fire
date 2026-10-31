// Particle pool for comic effects. Plain TS; the scene draws it with one InstancedMesh.

export const MAX_PARTICLES = 500;

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  r: number;
  g: number;
  b: number;
  grav: number;
  drag: number;
}

export const particles: Particle[] = [];
let cursor = 0;

for (let i = 0; i < MAX_PARTICLES; i++) {
  particles.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0, grow: 0, r: 1, g: 1, b: 1, grav: 0, drag: 0 });
}

function hex(c: number): [number, number, number] {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}

interface EmitOpts {
  count: number;
  colors: number[];
  speed: [number, number];
  up: [number, number];
  life: [number, number];
  size: [number, number];
  grow?: number;
  grav?: number;
  drag?: number;
  spread?: number;
}

const rr = (a: number, b: number) => a + Math.random() * (b - a);

export function emit(x: number, y: number, z: number, o: EmitOpts) {
  for (let i = 0; i < o.count; i++) {
    const p = particles[cursor];
    cursor = (cursor + 1) % MAX_PARTICLES;
    const a = Math.random() * Math.PI * 2;
    const sp = rr(o.speed[0], o.speed[1]);
    const sr = o.spread ?? 0.2;
    p.x = x + (Math.random() - 0.5) * sr;
    p.y = y + (Math.random() - 0.5) * sr;
    p.z = z + (Math.random() - 0.5) * sr;
    p.vx = Math.cos(a) * sp;
    p.vz = Math.sin(a) * sp;
    p.vy = rr(o.up[0], o.up[1]);
    p.max = p.life = rr(o.life[0], o.life[1]);
    p.size = rr(o.size[0], o.size[1]);
    p.grow = o.grow ?? 0;
    p.grav = o.grav ?? 0;
    p.drag = o.drag ?? 1.5;
    const [r, g, b] = hex(o.colors[Math.floor(Math.random() * o.colors.length)]);
    p.r = r;
    p.g = g;
    p.b = b;
  }
}

export type BurstKind = "splash" | "sparks" | "fireball" | "co2" | "splat" | "smother" | "steam" | "pickup" | "hurt";

export function burst(kind: BurstKind, x: number, y: number, z: number) {
  switch (kind) {
    case "splash":
      emit(x, y + 0.6, z, { count: 45, colors: [0x5ec8ff, 0x9fe0ff, 0xffffff], speed: [1.5, 4], up: [2, 6], life: [0.5, 1], size: [0.08, 0.18], grav: 14 });
      break;
    case "steam":
      emit(x, y + 0.3, z, { count: 30, colors: [0xf2f2f2, 0xd8dde3, 0xbfc6cc], speed: [0.3, 1.2], up: [1, 2.5], life: [1, 1.8], size: [0.25, 0.45], grow: 0.8, drag: 2 });
      break;
    case "sparks":
      emit(x, y + 0.5, z, { count: 80, colors: [0xffffff, 0xfff27a, 0x8fe9ff], speed: [3, 9], up: [1, 7], life: [0.3, 0.8], size: [0.04, 0.1], grav: 16, drag: 1 });
      emit(x, y + 0.5, z, { count: 12, colors: [0x9fe8ff, 0xffffff], speed: [0.2, 1], up: [0, 1], life: [0.15, 0.3], size: [0.6, 1.0], grow: 3 });
      break;
    case "fireball":
      emit(x, y + 0.4, z, { count: 90, colors: [0xff4d1a, 0xff8a1f, 0xffc93c, 0xfff1a8], speed: [1, 5], up: [3, 9], life: [0.6, 1.3], size: [0.3, 0.7], grow: 1.6, drag: 2.2, spread: 0.6 });
      emit(x, y + 1.5, z, { count: 14, colors: [0xffe17a, 0xffffff], speed: [0, 1], up: [2, 4], life: [0.35, 0.6], size: [1.2, 1.8], grow: 4 });
      emit(x, y + 1, z, { count: 40, colors: [0x5a514c, 0x3d3733, 0x7a706a], speed: [0.5, 2], up: [2, 4], life: [1.4, 2.4], size: [0.4, 0.7], grow: 1.2, drag: 1.5 });
      break;
    case "co2":
      emit(x, y + 0.4, z, { count: 55, colors: [0xffffff, 0xe9f3f7, 0xcfe3ea], speed: [1, 3.5], up: [0.2, 1.8], life: [0.6, 1.2], size: [0.2, 0.4], grow: 1.4, drag: 2.5 });
      break;
    case "splat":
      emit(x, y + 0.4, z, { count: 60, colors: [0xff7a1a, 0xffb21f, 0xffde59], speed: [3, 7], up: [2, 5], life: [0.5, 1], size: [0.1, 0.22], grav: 12 });
      emit(x, y + 0.4, z, { count: 30, colors: [0xffffff, 0xe9f3f7], speed: [1, 3], up: [0.2, 1.5], life: [0.5, 1], size: [0.2, 0.4], grow: 1.2, drag: 2.5 });
      break;
    case "smother":
      emit(x, y + 0.2, z, { count: 40, colors: [0x9a918b, 0x6f6863, 0xc9c2bc], speed: [0.5, 2.5], up: [0.3, 1.6], life: [0.8, 1.6], size: [0.25, 0.45], grow: 1, drag: 2 });
      break;
    case "pickup":
      emit(x, y + 1, z, { count: 18, colors: [0xffe066, 0xffffff, 0x2ec4b6], speed: [1, 2.5], up: [1, 3], life: [0.3, 0.6], size: [0.05, 0.1], grav: 6 });
      break;
    case "hurt":
      emit(x, y + 0.9, z, { count: 30, colors: [0xff5a36, 0xffd23f, 0xffffff], speed: [2, 5], up: [1, 4], life: [0.3, 0.6], size: [0.06, 0.14], grav: 10 });
      break;
  }
}

export function stepParticles(dt: number) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.life -= dt;
    const d = Math.exp(-p.drag * dt);
    p.vx *= d;
    p.vz *= d;
    p.vy = p.vy * d - p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.y < 0.02 && p.grav > 0) {
      p.y = 0.02;
      p.vy *= -0.3;
    }
    p.size += p.grow * dt * p.size;
  }
}
