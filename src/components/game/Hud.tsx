import { useEffect, useRef, useState } from "react";
import { currentRoom, FIRE_LABEL, ROOMS, TOOL_LABEL, type RoomId, type Tool } from "@/game/layout";
import { makeQuiz, quizPassed, QUIZ_PASS, type QuizQuestion } from "@/game/quiz";
import { continueGame, toMenu, nearAlarm, nearestFire, nearestStation, revive, startGame, TUNING, type Phase, type RoundResult } from "@/game/sim";
import { game, onGameEvent, selectRoom } from "@/game/runtime";
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
  alarm: boolean;
  smoke: number;
  fireDistance: number | null;
  inRange: boolean;
  prompt: string | null;
  result: RoundResult | null;
}

function snapshot(): Snap {
  let prompt: string | null = null;
  if (game.phase === "playing") {
    const f = game.held ? nearestFire(game) : null;
    const st = nearestStation(game);
    if (!game.alarm && nearAlarm(game)) prompt = "PULL THE FIRE ALARM";
    else if (game.held && f) prompt = `Use ${TOOL_LABEL[game.held]} on the ${FIRE_LABEL[f.kind].toLowerCase()}`;
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
    alarm: game.alarm,
    smoke: game.smoke,
    fireDistance: game.fires.length ? Math.min(...game.fires.map((f) => Math.hypot(f.x - game.player.x, f.z - game.player.z))) : null,
    inRange: nearestFire(game) !== null,
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
          setTip({ id, word: "", tip: "Don't touch the flames — go around them!", tone: "bad" });
        } else if (e.type === "doorBlocked") {
          setTip({ id, word: "", tip: "The exit is blocked! Clear the fire by the door.", tone: "bad" });
        } else if (e.type === "alarm") {
          setPop({ id, word: "ALARM RAISED!", tone: "good" });
          setTip({ id, word: "", tip: `Firefighters are on the way — hold the fire back for ${TUNING.ROUND_TIME} seconds, or put it out!`, tone: "good" });
        } else if (e.type === "firefighters") {
          setPop({ id, word: "FIREFIGHTERS!!", tone: "good" });
          setTip({ id, word: "", tip: "Help is here — step back and let the pros handle it.", tone: "good" });
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
      if (e.code === "Enter" && (game.phase === "intro" || game.phase === "roundEnd")) begin();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const smokeK = Math.min(1, s.smoke / TUNING.SMOKE_LIMIT);
  const low = s.alarm && s.time < 10;

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
            {s.alarm ? (
              <>
                <div className="text-xs font-extrabold uppercase tracking-wider opacity-70">🚒 Firefighters in</div>
                <div className="font-display text-3xl leading-none tabular-nums sm:text-4xl">{Math.ceil(s.time)}</div>
              </>
            ) : (
              <>
                <div className="text-xs font-extrabold uppercase tracking-wider opacity-70">Step 1</div>
                <div className="font-display text-xl leading-none text-flame sm:text-2xl">🚨 Pull the alarm!</div>
              </>
            )}
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
          <div className="absolute left-1/2 top-32 -translate-x-1/2 sm:top-28">
            <div className={`comic-chip ${s.blocked ? "bg-flame text-cream animate-pulse" : "bg-exit text-cream"}`}>
              {s.blocked ? "🚫 Exit blocked" : "🚪 Exit open"}
            </div>
          </div>

          {/* held item + prompt */}
          <div className="absolute inset-x-0 bottom-28 flex flex-col items-center gap-2 px-4 sm:bottom-8">
            {s.fireDistance !== null && (
              <div className="comic-chip bg-cream text-ink tabular-nums">
                🔥 {s.fireDistance.toFixed(1)} m · {s.inRange ? "In reach" : "Out of reach"}
              </div>
            )}
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
                  <span className="text-ink/60">· {s.uses} {s.held === "co2" ? "bursts" : "uses"}</span>
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

      {s.phase === "intro" && <Intro onStart={(id) => { selectRoom(id); begin(); }} />}
      {s.phase === "gameOver" && <ReviveQuiz score={s.score} onRevive={() => { revive(game); setS(snapshot()); }} onRestart={begin} />}
      {s.phase === "roundEnd" && s.result && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/40 p-4">
          <div className="comic-card w-full max-w-md p-6 text-center">
            <div className="font-display text-4xl text-flame sm:text-5xl">{s.result.title}</div>
            <p className="mt-3 font-bold">{s.result.text}</p>
            {s.result.points > 0 && <p className="mt-2 font-display text-2xl text-exit">+{s.result.points}</p>}
            {s.result.lifeLost && <p className="mt-2 font-extrabold text-flame">−1 life</p>}
            <div className="mt-4 flex justify-center gap-6 font-extrabold">
              <div>
                Score <div className="font-display text-3xl">{s.score}</div>
              </div>
              <div>
                Best <div className="font-display text-3xl">{s.best}</div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button className="comic-btn" onClick={begin} autoFocus>
                {s.result.lifeLost ? "Try again" : `Round ${s.round} →`}
              </button>
              <button className="comic-btn bg-cream" onClick={() => { toMenu(game); setS(snapshot()); }}>
                Pick a room
              </button>
            </div>
            <p className="mt-2 text-xs font-bold text-ink/60">or press Enter</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Intro({ onStart }: { onStart: (id: RoomId) => void }) {
  const [room, setRoom] = useState<RoomId>(currentRoom.id);
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
          A fire breaks out at school and it's spreading. <b>First pull the red fire alarm</b> by the exit — then the firefighters are on their way. Hold the fire
          back with the <em>right</em> equipment until they arrive, put it out, or get out before the flames block the exit. Wrong tool? Things get <span className="text-flame">much</span> worse.
        </p>
        <div className="mt-4">
          <div className="mb-1.5 text-center font-display text-xl">Pick a room</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoom(r.id)}
                aria-pressed={room === r.id}
                className={`rounded-xl border-2 border-ink px-2 py-2 text-left font-extrabold leading-tight transition ${room === r.id ? "bg-sun shadow-[3px_3px_0_var(--ink)]" : "bg-cream"}`}
              >
                <span className="text-lg">{r.icon} {r.name}</span>
                <span className="mt-0.5 block text-xs font-bold text-ink/60">{r.blurb}</span>
              </button>
            ))}
          </div>
        </div>
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

          <span className="col-span-2"><kbd className="kbd">E</kbd> grab equipment / use it on a fire</span>
          <span className="col-span-2 text-ink/60">On a phone: joystick to run & steer, USE button.</span>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-ink/60">
          Firefighters arrive {TUNING.ROUND_TIME}s after the alarm · 3 lives · escaping costs no life · out of lives? Pass a safety quiz to revive
        </p>
        <div className="mt-4 flex justify-center">
          <button className="comic-btn" onClick={() => onStart(room)} autoFocus>
            Start: {ROOMS.find((r) => r.id === room)?.name}
          </button>
        </div>
      </div>
    </div>
  );
}


function ReviveQuiz({ score, onRevive, onRestart }: { score: number; onRevive: () => void; onRestart: () => void }) {
  const [qs, setQs] = useState<QuizQuestion[]>(() => makeQuiz());
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const done = i >= qs.length;
  const passed = quizPassed(correct);
  const q = qs[i];

  const choose = (k: number) => {
    if (picked !== null || !q) return;
    setPicked(k);
    if (k === q.answer) setCorrect((c) => c + 1);
  };
  const next = () => {
    setPicked(null);
    setI((x) => x + 1);
  };
  const retry = () => {
    setQs(makeQuiz());
    setI(0);
    setCorrect(0);
    setPicked(null);
  };

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-ink/50 p-4">
      <div className="comic-card w-full max-w-lg p-5 sm:p-6">
        <div className="text-center font-display text-4xl text-flame">Out of lives!</div>
        <p className="mt-1 text-center font-bold">
          Pass the fire safety test to revive — get {QUIZ_PASS} of {qs.length} right. Score so far: {score}
        </p>
        {!done && q && (
          <div className="mt-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-ink/60">
              Question {i + 1} / {qs.length}
            </div>
            <div className="mt-1 text-lg font-extrabold">{q.q}</div>
            <div className="mt-3 grid gap-2">
              {q.options.map((o, k) => {
                const state = picked === null ? "" : k === q.answer ? "bg-exit text-cream" : k === picked ? "bg-flame text-cream" : "opacity-50";
                return (
                  <button key={k} className={`rounded-xl border-2 border-ink bg-cream px-3 py-2 text-left font-extrabold ${state}`} onClick={() => choose(k)}>
                    {o}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-3 text-center">
                <p className="font-bold">{picked === q.answer ? "✅ Correct! " : "❌ Not quite. "}{q.why}</p>
                <button className="comic-btn mt-3" onClick={next} autoFocus>
                  {i + 1 < qs.length ? "Next question" : "See result"}
                </button>
              </div>
            )}
          </div>
        )}
        {done && (
          <div className="mt-4 text-center">
            <div className="font-display text-3xl">{correct} / {qs.length} correct</div>
            {passed ? (
              <>
                <p className="mt-2 font-bold text-exit">Test passed — you're back in with full lives!</p>
                <button className="comic-btn mt-4" onClick={onRevive} autoFocus>Revive ❤️❤️❤️</button>
              </>
            ) : (
              <>
                <p className="mt-2 font-bold text-flame">Not enough this time.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <button className="comic-btn" onClick={retry} autoFocus>New test</button>
                  <button className="comic-btn" onClick={onRestart}>Start over</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
