import { useEffect, useRef, useState } from "react";
import { currentRoom, ROOMS, type FireKind, type RoomId, type Tool } from "@/game/layout";
import { makeQuiz, quizPassed, QUIZ_PASS, type QuizQuestion } from "@/game/quiz";
import {
  continueGame,
  finishGame,
  isLastRoundPlayed,
  MATCH,
  nearAlarm,
  nearestFire,
  nearestStation,
  newGame,
  revive,
  startOrResume,
  successRate,
  toMenu,
  TUNING,
  type Phase,
  type RoundResult,
} from "@/game/sim";
import { formatDecimal, t } from "@/i18n";
import { game, onGameEvent, selectRoom } from "@/game/runtime";
import { initAudio, isMuted, setMuted } from "@/game/audio";

interface Snap {
  phase: Phase;
  score: number;
  best: number;
  lives: number;
  played: number;
  won: number;
  history: RoundResult["kind"][];
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
    if (!game.alarm && nearAlarm(game)) prompt = t.hud.promptAlarm;
    else if (game.held && f) prompt = t.hud.promptUse(game.held, f.kind);
    else if (st) prompt = game.held === st.tool ? t.hud.promptRefill(st.tool) : t.hud.promptGrab(st.tool);
  }
  return {
    phase: game.phase,
    score: game.score,
    best: game.best,
    lives: game.lives,
    played: game.played,
    won: game.won,
    history: [...game.history],
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

export interface HudProps {
  /** Set when running inside the host game: sends the result (successRate 0–1) and ends the minigame. */
  onFinish?: ((successRate: number, payload: unknown) => void) | undefined;
}

export function Hud({ onFinish }: HudProps) {
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
          setPop({ id, word: e.out ? t.hud.out(e.word) : e.word, tone });
          setTip({ id, word: "", tip: e.tip, tone });
        } else if (e.type === "hint") {
          setTip({ id, word: "", tip: e.text, tone: "info" });
        } else if (e.type === "hurt") {
          setPop({ id, word: t.hud.ouch, tone: "bad" });
          setTip({ id, word: "", tip: t.hud.ouchTip, tone: "bad" });
        } else if (e.type === "doorBlocked") {
          setTip({ id, word: "", tip: t.hud.doorBlockedTip, tone: "bad" });
        } else if (e.type === "alarm") {
          setPop({ id, word: t.hud.alarmRaised, tone: "good" });
          setTip({ id, word: "", tip: t.hud.alarmTip(TUNING.ROUND_TIME), tone: "good" });
        } else if (e.type === "firefighters") {
          setPop({ id, word: t.hud.firefighters, tone: "good" });
          setTip({ id, word: "", tip: t.hud.firefightersTip, tone: "good" });
        } else if (e.type === "grab") {
          setTip({ id, word: "", tip: t.hud.grabbed(e.tool, e.refill), tone: "info" });
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
    if (game.phase === "intro") startOrResume(game);
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

      {s.phase !== "intro" && s.phase !== "finished" && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
          <div className="comic-card px-3 py-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-ink/60">{t.hud.score}</div>
            <div className="font-display text-2xl leading-none sm:text-3xl">{s.score}</div>
            <div className="mt-1 text-xs font-bold text-ink/60">{t.hud.roundOf(Math.min(s.played + 1, MATCH.rounds), MATCH.rounds)}</div>
          </div>
          <div className={`comic-card px-4 py-2 text-center ${low ? "animate-pulse bg-flame text-cream" : ""}`}>
            {s.alarm ? (
              <>
                <div className="text-xs font-extrabold uppercase tracking-wider opacity-70">{t.hud.firefightersIn}</div>
                <div className="font-display text-3xl leading-none tabular-nums sm:text-4xl">{Math.ceil(s.time)}</div>
              </>
            ) : (
              <>
                <div className="text-xs font-extrabold uppercase tracking-wider opacity-70">{t.hud.step1}</div>
                <div className="font-display text-xl leading-none text-flame sm:text-2xl">{t.hud.pullAlarm}</div>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="comic-card flex gap-1 px-3 py-2 text-2xl" aria-label={t.hud.lives(s.lives)}>
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
              {muted ? t.hud.soundOff : t.hud.soundOn}
            </button>
          </div>
        </div>
      )}

      {s.phase === "playing" && (
        <>
          {/* exit status */}
          <div className="absolute left-1/2 top-32 -translate-x-1/2 sm:top-28">
            <div className={`comic-chip ${s.blocked ? "bg-flame text-cream animate-pulse" : "bg-exit text-cream"}`}>
              {s.blocked ? t.hud.exitBlocked : t.hud.exitOpen}
            </div>
          </div>

          {/* held item + prompt */}
          <div className="absolute inset-x-0 bottom-52 flex flex-col items-center gap-2 px-4 sm:bottom-8">
            {s.fireDistance !== null && (
              <div className="comic-chip bg-cream text-ink tabular-nums">
                {t.hud.fireDistance(formatDecimal(s.fireDistance), s.inRange)}
              </div>
            )}
            {s.prompt && (
              <div className="comic-chip bg-sun text-ink">
                <kbd className="mr-2 rounded-md border-2 border-ink bg-cream px-1.5 font-display">{t.hud.actionKey}</kbd>
                {s.prompt}
              </div>
            )}
            <div className="comic-card flex items-center gap-2 px-3 py-1.5 text-sm font-extrabold">
              {s.held ? (
                <>
                  <span className="text-xl">{TOOL_ICON[s.held]}</span>
                  {t.tools[s.held]}
                  <span className="text-ink/60">· {t.hud.uses(s.uses, s.held)}</span>
                </>
              ) : (
                <span className="text-ink/60">{t.hud.handsEmpty}</span>
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
      {s.phase === "gameOver" && (
        <ReviveQuiz
          score={s.score}
          onRevive={() => { revive(game); setS(snapshot()); }}
          onEnd={() => { finishGame(game); setS(snapshot()); }}
        />
      )}
      {s.phase === "finished" && (
        <Finished
          snap={s}
          embedded={onFinish !== undefined}
          onContinue={() => onFinish?.(successRate(game), { won: game.won, rounds: MATCH.rounds, score: game.score, history: game.history })}
          onPlayAgain={() => { newGame(game); setS(snapshot()); }}
        />
      )}
      {s.phase === "roundEnd" && s.result && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/40 p-4">
          <div className="comic-card w-full max-w-md p-6 text-center">
            <div className="font-display text-4xl text-flame sm:text-5xl">{s.result.title}</div>
            <p className="mt-3 font-bold">{s.result.text}</p>
            {s.result.points > 0 && <p className="mt-2 font-display text-2xl text-exit">+{s.result.points}</p>}
            {s.result.lifeLost && <p className="mt-2 font-extrabold text-flame">{t.roundEnd.lifeLost}</p>}
            <p className="mt-2 text-sm font-extrabold text-ink/70">{t.roundEnd.progress(s.won, s.played, MATCH.rounds)}</p>
            <div className="mt-4 flex justify-center gap-6 font-extrabold">
              <div>
                {t.roundEnd.score} <div className="font-display text-3xl">{s.score}</div>
              </div>
              <div>
                {t.roundEnd.best} <div className="font-display text-3xl">{s.best}</div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button className="comic-btn" onClick={begin} autoFocus>
                {isLastRoundPlayed(game) ? t.roundEnd.evaluation : t.roundEnd.nextRound(s.played + 1)}
              </button>
              {!isLastRoundPlayed(game) && (
                <button className="comic-btn bg-cream" onClick={() => { toMenu(game); setS(snapshot()); }}>
                  {t.roundEnd.pickRoom}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-ink/60">{t.roundEnd.orEnter}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Intro({ onStart }: { onStart: (id: RoomId) => void }) {
  const [room, setRoom] = useState<RoomId>(currentRoom.id);
  const rows: { fire: FireKind; icon: string; tool: Tool }[] = [
    { fire: "paper", icon: "🗑️", tool: "water" },
    { fire: "electric", icon: "🔌", tool: "co2" },
    { fire: "grease", icon: "🍳", tool: "blanket" },
  ];
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-ink/30 p-4">
      <div className="comic-card w-full max-w-lg p-5 sm:p-7">
        <h1 className="text-center font-display text-5xl leading-none text-flame sm:text-6xl">{t.intro.title}</h1>
        <p className="mt-3 text-center font-bold">
          {t.intro.leadStart}
          <b>{t.intro.leadBold}</b>
          {t.intro.leadEnd}
        </p>
        <div className="mt-4">
          <div className="mb-1.5 text-center font-display text-xl">{t.intro.pickRoom}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoom(r.id)}
                aria-pressed={room === r.id}
                className={`rounded-xl border-2 border-ink px-2 py-2 text-left font-extrabold leading-tight transition ${room === r.id ? "bg-sun shadow-[3px_3px_0_var(--ink)]" : "bg-cream"}`}
              >
                <span className="text-lg">{r.icon} {t.rooms[r.id].name}</span>
                <span className="mt-0.5 block text-xs font-bold text-ink/60">{t.rooms[r.id].blurb}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-1.5">
          {rows.map((r) => (
            <div key={r.tool} className="flex items-center justify-between gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-1.5 font-extrabold">
              <span>
                {r.icon} {t.intro.rows[r.fire]}
              </span>
              <span className="text-right text-ink/70">
                → {TOOL_ICON[r.tool]} {t.tools[r.tool]}
              </span>
            </div>
          ))}
          <p className="text-center text-xs font-bold text-ink/60">{t.intro.chalkboard}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-bold">
          <span><kbd className="kbd">W</kbd>/<kbd className="kbd">S</kbd> {t.intro.keysMove}</span>
          <span><kbd className="kbd">A</kbd>/<kbd className="kbd">D</kbd> {t.intro.keysSteer}</span>

          <span className="col-span-2"><kbd className="kbd">{t.hud.actionKey}</kbd> {t.intro.keysAction}</span>
          <span className="col-span-2 text-ink/60">{t.intro.phone}</span>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-ink/60">{t.intro.footnote(MATCH.rounds, TUNING.ROUND_TIME, TUNING.LIVES)}</p>
        <div className="mt-4 flex justify-center">
          <button className="comic-btn" onClick={() => onStart(room)} autoFocus>
            {t.intro.start(t.rooms[room].name)}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviveQuiz({ score, onRevive, onEnd }: { score: number; onRevive: () => void; onEnd: () => void }) {
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
        <div className="text-center font-display text-4xl text-flame">{t.quiz.title}</div>
        <p className="mt-1 text-center font-bold">{t.quiz.intro(QUIZ_PASS, qs.length, score)}</p>
        {!done && q && (
          <div className="mt-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-ink/60">{t.quiz.question(i + 1, qs.length)}</div>
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
                <p className="font-bold">{picked === q.answer ? t.quiz.correct : t.quiz.wrong}{q.why}</p>
                <button className="comic-btn mt-3" onClick={next} autoFocus>
                  {i + 1 < qs.length ? t.quiz.next : t.quiz.seeResult}
                </button>
              </div>
            )}
          </div>
        )}
        {done && (
          <div className="mt-4 text-center">
            <div className="font-display text-3xl">{t.quiz.resultCount(correct, qs.length)}</div>
            {passed ? (
              <>
                <p className="mt-2 font-bold text-exit">{t.quiz.passed}</p>
                <button className="comic-btn mt-4" onClick={onRevive} autoFocus>{t.quiz.revive}</button>
              </>
            ) : (
              <>
                <p className="mt-2 font-bold text-flame">{t.quiz.failed}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <button className="comic-btn" onClick={retry} autoFocus>{t.quiz.newTest}</button>
                  <button className="comic-btn bg-cream" onClick={onEnd}>{t.quiz.endGame}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Finished({ snap, embedded, onContinue, onPlayAgain }: { snap: Snap; embedded: boolean; onContinue: () => void; onPlayAgain: () => void }) {
  const total = MATCH.rounds;
  const title = snap.won === total ? t.finished.titleAll : snap.won > 0 ? t.finished.titleSome : t.finished.titleNone;
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-ink/50 p-4">
      <div className="comic-card w-full max-w-md p-6 text-center">
        <div className="text-xs font-extrabold uppercase tracking-wider text-ink/60">{t.finished.kicker}</div>
        <div className="mt-1 font-display text-4xl text-flame sm:text-5xl">{title}</div>
        <p className="mt-3 font-display text-2xl">{t.finished.summary(snap.won, total)}</p>
        <p className="mt-1 font-bold text-ink/70">{t.finished.score(snap.score)}</p>
        <ul className="mt-4 grid gap-1 text-left font-bold">
          {Array.from({ length: total }, (_, i) => {
            const kind = snap.history[i];
            return (
              <li key={i} className="rounded-xl border-2 border-ink bg-cream px-3 py-1.5">
                <span className="font-extrabold">{t.finished.round(i + 1)}</span> {kind ? t.finished.kinds[kind] : t.finished.notPlayed}
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex justify-center">
          {embedded ? (
            <button className="comic-btn" onClick={onContinue} autoFocus>{t.finished.continue}</button>
          ) : (
            <button className="comic-btn" onClick={onPlayAgain} autoFocus>{t.finished.playAgain}</button>
          )}
        </div>
      </div>
    </div>
  );
}
