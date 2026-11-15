import * as THREE from "three";

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // redraw once the web fonts are ready so signs use the comic font
  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => {
      g.clearRect(0, 0, w, h);
      draw(g);
      t.needsUpdate = true;
    });
  }
  return t;
}

import type { RoomTheme } from "@/game/layout";

export function floorTexture(th: RoomTheme) {
  const t = canvasTex(512, 512, (g) => {
    if (th.floorStyle === "wood") {
      for (let i = 0; i < 16; i++) {
        g.fillStyle = i % 2 ? th.floorA : th.floorB;
        g.fillRect(0, i * 32, 512, 32);
        g.fillStyle = "rgba(90,50,20,0.18)";
        g.fillRect(((i * 197) % 512), i * 32, 3, 32);
        for (let k = 0; k < 30; k++) {
          g.fillStyle = "rgba(110,60,20,0.08)";
          g.fillRect(Math.random() * 512, i * 32 + Math.random() * 32, 30, 2);
        }
      }
      return;
    }
    if (th.floorStyle === "carpet") {
      g.fillStyle = th.floorA;
      g.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 4000; k++) {
        g.fillStyle = Math.random() < 0.5 ? th.floorB : "rgba(20,30,50,0.25)";
        g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      return;
    }
    const n = 4;
    const s = 512 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        g.fillStyle = (i + j) % 2 === 0 ? th.floorA : th.floorB;
        g.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 60; k++) {
          g.fillStyle = "rgba(60,50,40,0.08)";
          g.fillRect(i * s + Math.random() * s, j * s + Math.random() * s, 3, 3);
        }
      }
    g.strokeStyle = "rgba(60,50,40,0.25)";
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, 512);
      g.moveTo(0, i * s);
      g.lineTo(512, i * s);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 4);
  return t;
}

/** Basketball court markings drawn over the whole gym floor. */
export function courtTexture() {
  return canvasTex(1024, 820, (g) => {
    g.clearRect(0, 0, 1024, 820);
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 8;
    g.strokeRect(60, 60, 904, 700);
    g.beginPath();
    g.moveTo(512, 60);
    g.lineTo(512, 760);
    g.stroke();
    g.beginPath();
    g.arc(512, 410, 90, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(214,47,47,0.55)";
    g.fillRect(60, 300, 170, 220);
    g.fillRect(794, 300, 170, 220);
    g.strokeRect(60, 300, 170, 220);
    g.strokeRect(794, 300, 170, 220);
  });
}

export function wallTexture(th: RoomTheme) {
  const t = canvasTex(256, 512, (g) => {
    g.fillStyle = th.wall;
    g.fillRect(0, 0, 256, 512);
    for (let k = 0; k < 400; k++) {
      g.fillStyle = `rgba(120,100,80,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * 256, Math.random() * 512, 4, 4);
    }
    g.fillStyle = th.wainscot;
    g.fillRect(0, 330, 256, 182);
    g.fillStyle = th.trim;
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 330, 4, 182);
    g.fillStyle = "#3a2f4a";
    g.fillRect(0, 322, 256, 12);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function signTexture(lines: { text: string; color: string; size: number }[], bg: string, border = "#2b2235", w = 512, h = 256) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = border;
    roundRect(g, 0, 0, w, h, 28);
    g.fill();
    g.fillStyle = bg;
    roundRect(g, 10, 10, w - 20, h - 20, 22);
    g.fill();
    g.textAlign = "center";
    g.textBaseline = "middle";
    const total = lines.reduce((a, l) => a + l.size * 1.15, 0);
    let y = h / 2 - total / 2;
    for (const l of lines) {
      g.font = `${l.size}px "Luckiest Guy", "Arial Black", system-ui, sans-serif`;
      // shrink lines that would not fit the sign (translations can be longer)
      const fit = Math.min(1, (w - 48) / Math.max(1, g.measureText(l.text).width));
      if (fit < 1) g.font = `${Math.floor(l.size * fit)}px "Luckiest Guy", "Arial Black", system-ui, sans-serif`;
      g.fillStyle = l.color;
      y += l.size * 0.575;
      g.fillText(l.text, w / 2, y + l.size * 0.08);
      y += l.size * 0.575;
    }
  });
}

export function glowTexture() {
  return canvasTex(
    128,
    128,
    (g) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.4, "rgba(255,255,255,0.45)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    },
    false,
  );
}

export function scorchTexture() {
  return canvasTex(
    128,
    128,
    (g) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(30,20,15,0.85)");
      grd.addColorStop(0.6, "rgba(30,20,15,0.4)");
      grd.addColorStop(1, "rgba(30,20,15,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    },
    false,
  );
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
