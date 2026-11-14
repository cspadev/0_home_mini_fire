import { useEffect, useRef, useState } from "react";
import { edges, game, touch } from "@/game/runtime";
import { initAudio } from "@/game/audio";

export function TouchControls() {
  const [show, setShow] = useState(false);
  const [playing, setPlaying] = useState(game.phase === "playing");
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setShow(coarse);
    const onTouch = () => setShow(true);
    window.addEventListener("touchstart", onTouch, { once: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPlaying(game.phase === "playing"), 250);
    return () => clearInterval(t);
  }, []);

  if (!show || !playing) return null;

  const move = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const R = r.width / 2;
    let dx = (clientX - (r.left + R)) / R;
    let dy = (clientY - (r.top + R)) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    touch.x = dx;
    touch.y = -dy; // up on screen = forward
    if (knob.current) knob.current.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  };
  const reset = () => {
    activeId.current = null;
    touch.x = 0;
    touch.y = 0;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-end justify-between px-5">
      <div
        ref={base}
        className="pointer-events-auto relative flex h-36 w-36 touch-none items-center justify-center rounded-full border-4 border-ink/60 bg-cream/50"
        onPointerDown={(e) => {
          initAudio();
          activeId.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          move(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activeId.current === e.pointerId) move(e.clientX, e.clientY);
        }}
        onPointerUp={reset}
        onPointerCancel={reset}
      >
        <span className="absolute top-1.5 font-display text-sm text-ink/50">▲</span>
        <span className="absolute bottom-1.5 font-display text-sm text-ink/50">▼</span>
        <span className="absolute left-2.5 font-display text-sm text-ink/50">◀</span>
        <span className="absolute right-2.5 font-display text-sm text-ink/50">▶</span>
        <div ref={knob} className="h-16 w-16 rounded-full border-4 border-ink bg-sun" />
      </div>
      <div className="pointer-events-auto flex touch-none flex-col gap-3">
        <button
          className="h-20 w-20 rounded-full border-4 border-ink bg-flame font-display text-xl text-cream shadow-[4px_4px_0_var(--ink)]"
          onPointerDown={(e) => {
            e.preventDefault();
            initAudio();
            if (game.phase === "playing") edges.action = true;
          }}
        >
          USE
        </button>
      </div>
    </div>
  );
}
