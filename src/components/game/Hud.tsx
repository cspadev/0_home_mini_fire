import { useEffect, useRef, useState } from "react";
import { FIRE_LABEL, TOOL_LABEL, type Tool } from "@/game/layout";
import { continueGame, nearestFire, nearestStation, startGame, TUNING, type Phase, type RoundResult } from "@/game/sim";
import { game, onGameEvent } from "@/game/runtime";
import { initAudio, isMuted, setMuted } from "@/game/audio";

interface Snap {
  phase: Phase;
  score: number;
  best: number;
  lives: number;
  round: number;
  time: number;
  held: Tool | null;
  uses: number;
  blocked: boolean;
  smoke: number;
  prompt: string | null;
  result: RoundResult | null;
}

function snapshot(): Snap {
  let prompt: string | null = null;
  if (game.phase === "playing") {
    const f = game.held ? nearestFire(game) : null;
    const st = nearestStation(game);
    if (game.held && f) prompt = `Use ${TOOL_LABEL[game.held]} on the ${FIRE_LABEL[f.kind].toLowerCase()}`;
    else if (st) prompt = game.held === st.tool ? `Refill ${st.label}` : `Grab the ${st.label}`;
  }
  return {
    phase: game.phase,
    score: game.score,
    best: game.best,
    lives: game.lives,
    round: game.round,
    time: game.timeLeft,
    held: game.held,
    uses: game.uses,
    blocked: game.doorBlocked,
    smoke: game.smoke,
    prompt,
    result: game.result,
  };
}

interface Pop {
  id: number;
  word: string;
  tone: "good" | "meh" | "bad" | "info";
  tip?: string;
}

const TOOL_ICON: Record<Tool, string> = { water: "🪣", co2: "🧯", blanket: "🟥" };

export function Hud() {
  const [s, setS] = useState<Snap>(snapshot);
  const [pop, setPop] = useState<Pop | null>(null);
  const [tip, setTip] = useState<Pop | null>(null);
  const [muted, setM] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setS(snapshot()), 100);
    return () => clearInterval(t);
  }, []);

  useEffect(
    () =>
      onGameEvent((e) => {
        const id = ++idRef.current;
        if (e.type === "use") {
          const tone = e.outcome === "right" ? "good" : e.outcome === "weak" ? "meh" : "bad";
          setPop({ id, word: e.out ? `${e.word} OUT!` : e.word, tone });
          setTip({ id, word: "", tip: e.tip, tone });
        } else if (e.type === "hint") {
          setTip({ id, word: "", tip: e.text, tone: "info" });
        } else if (e.type === "hurt") {
          setPop({ id, word: "OUCH!", tone: "bad" });
          setTip({ id, word: "", tip: "Don't touch the flames — jump over small floor fires!", tone: "bad" });
        } else if (e.type === "doorBlocked") {
          setTip({ id, word: "", tip: "The exit is blocked! Clear the fire by the door.", tone: "bad" });
        } else if (e.type === "grab") {
          setTip({ id, word: "", tip: `${e.refill ? "Refilled" : "Picked up"}: ${TOOL_LABEL[e.tool]}`, tone: "info" });
        }
      }),
    [],
  );

  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop((p) => (p?.id === pop.id ? null : p)), 1300);
    return () => clearTimeout(t);
  }, [pop]);
  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => setTip((p) => (p?.id === tip.id ? null : p)), 3200);
    return () => clearTimeout(t);
  }, [tip]);

  const begin = () => {
    initAudio();
    if (game.phase === "intro") startGame(game);
    else continueGame(game);
    setS(snapshot());
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === "Enter" && game.phase !== "playing") begin();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const smokeK = Math.min(1, s.smoke / TUNING.SMOKE_LIMIT);
  const low = s.time < 10;

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-body text-ink">
      {/* smoke vignette */}
      <div className="smoke-overlay absolute inset-0" style={{ opacity: s.phase === "playing" ? smokeK * 0.85 : 0 }} />

      {s.phase !== "intro" && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
          <div className="comic-card px-3 py-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-ink/60">Score</div>
            <div className="font-display text-2xl leading-none sm:text-3xl">{s.score}</div>
            <div className="mt-1 text-xs font-bold text-ink/60">Round {s.round} · Room 1</div>
          </div>
          <div className={`comic-card px-4 py-2 text-center ${low ? "animate-pulse bg-flame text-cream" : ""}`}>
            <div className="text-xs font-extrabold uppercase tracking-wider opacity-70">Time</div>
            <div className="font-display text-3xl leading-none tabular-nums sm:text-4xl">{Math.ceil(s.time)}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="comic-card flex gap-1 px-3 py-2 text-2xl" aria-label={`${s.lives} lives`}>
              {Array.from({ length: TUNING.LIVES }, (_, i) => (
                <span key={i} className={i < s.lives ? "" : "opacity-20 grayscale"}>
                  ❤️
                </span>
              ))}
            </div>
            <button
              className="comic-card pointer-events-auto px-2 py-1 text-xs font-extrabold"
              onClick={() => {
                setMuted(!isMuted());
                setM(isMuted());
              }}
            >
              {muted ? "🔇 Sound off" : "🔊 Sound on"}
            </button>
          </div>
        </div>
      )}

      {s.phase === "playing" && (
        <>
          {/* exit status */}
          <div className="absolute left-1/2 top-24 -translate-x-1/2 sm:top-28">
            <div className={`comic-chip ${s.blocked ? "bg-flame text-cream animate-pulse" : "bg-exit text-cream"}`}>
              {s.blocked ? "🚫 Exit blocked" : "🚪 Exit open"}
            </div>
          </div>

          {/* held item + prompt */}
          <div className="absolute inset-x-0 bottom-28 flex flex-col items-center gap-2 px-4 sm:bottom-8">
            {s.prompt && (
              <div className="comic-chip bg-sun text-ink">
                <kbd className="mr-2 rounded-md border-2 border-ink bg-cream px-1.5 font-display">E</kbd>
                {s.prompt}
              </div>
            )}
            <div className="comic-card flex items-center gap-2 px-3 py-1.5 text-sm font-extrabold">
              {s.held ? (
                <>
                  <span className="text-xl">{TOOL_ICON[s.held]}</span>
                  {TOOL_LABEL[s.held]}
                  {s.held === "co2" && <span className="text-ink/60">· {s.uses} bursts</span>}
                </>
              ) : (
                <span className="text-ink/60">Hands empty — grab equipment at a glowing ring</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* comic word */}
      {pop && s.phase === "playing" && (
        <div key={pop.id} className="absolute inset-x-0 top-[30%] flex justify-center">
          <div className={`comic-word comic-word-${pop.tone}`}>{pop.word}</div>
        </div>
      )}
      {tip && s.phase === "playing" && (
        <div key={`t${tip.id}`} className="absolute inset-x-0 top-[46%] flex justify-center px-4">
          <div className={`comic-tip comic-tip-${tip.tone}`}>{tip.tip}</div>
        </div>
      )}

      {s.phase === "intro" && <Intro onStart={begin} />}
      {(s.phase === "roundEnd" || s.phase === "gameOver") && s.result && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/40 p-4">
          <div className="comic-card w-full max-w-md p-6 text-center">
            <div className="font-display text-4xl text-flame sm:text-5xl">{s.phase === "gameOver" ? "Game over" : s.result.title}</div>
            <p className="mt-3 font-bold">{s.phase === "gameOver" ? s.result.title + " " + s.result.text : s.result.text}</p>
            {s.result.points > 0 && <p className="mt-2 font-display text-2xl text-exit">+{s.result.points}</p>}
            {s.result.lifeLost && s.phase !== "gameOver" && <p className="mt-2 font-extrabold text-flame">−1 life</p>}
            <div className="mt-4 flex justify-center gap-6 font-extrabold">
              <div>
                Score <div className="font-display text-3xl">{s.score}</div>
              </div>
              <div>
                Best <div className="font-display text-3xl">{s.best}</div>
              </div>
            </div>
            <button className="comic-btn mt-6" onClick={begin} autoFocus>
              {s.phase === "gameOver" ? "Play again" : s.result.lifeLost ? "Try again" : `Round ${s.round} →`}
            </button>
            <p className="mt-2 text-xs font-bold text-ink/60">or press Enter</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const rows: { fire: string; icon: string; tool: Tool }[] = [
    { fire: "Paper / trash", icon: "🗑️", tool: "water" },
    { fire: "Computer / plug", icon: "🔌", tool: "co2" },
    { fire: "Frying pan oil", icon: "🍳", tool: "blanket" },
  ];
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-ink/30 p-4">
      <div className="comic-card w-full max-w-lg p-5 sm:p-7">
        <h1 className="text-center font-display text-5xl leading-none text-flame sm:text-6xl">Stop the fire!</h1>
        <p className="mt-3 text-center font-bold">
          A fire breaks out in the home-ec lab and it's spreading. Grab the <em>right</em> equipment and put it out — or get out
          before the flames block the exit. Wrong tool? Things get <span className="text-flame">much</span> worse.
        </p>
        <div className="mt-4 grid gap-1.5">
          {rows.map((r) => (
            <div key={r.tool} className="flex items-center justify-between rounded-xl border-2 border-ink bg-cream px-3 py-1.5 font-extrabold">
              <span>
                {r.icon} {r.fire}
              </span>
              <span className="text-ink/70">
                → {TOOL_ICON[r.tool]} {TOOL_LABEL[r.tool]}
              </span>
            </div>
          ))}
          <p className="text-center text-xs font-bold text-ink/60">Check the chalkboard in the room if you forget. Try the wrong one once — just to see!</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-bold">
          <span><kbd className="kbd">W</kbd>/<kbd className="kbd">S</kbd> run forward / back</span>
          <span><kbd className="kbd">A</kbd>/<kbd className="kbd">D</kbd> steer</span>
          <span><kbd className="kbd">Shift</kbd> sprint</span>
          <span><kbd className="kbd">Space</kbd> jump</span>
          <span className="col-span-2"><kbd className="kbd">E</kbd> grab equipment / use it on a fire</span>
          <span className="col-span-2 text-ink/60">On a phone: joystick to run & steer, USE and JUMP buttons.</span>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-ink/60">
          {TUNING.ROUND_TIME}s per round · 3 lives · bonus points for time left
        </p>
        <div className="mt-4 flex justify-center">
          <button className="comic-btn" onClick={onStart} autoFocus>
            Start round 1
          </button>
        </div>
      </div>
    </div>
  );
}

