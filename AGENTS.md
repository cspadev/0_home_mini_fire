<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Game architecture ("Stop the fire")
- Game rules live in `src/game/sim.ts` + `src/game/layout.ts` as plain TS (no React/three) and are unit-tested in `src/game/sim.test.ts`; the R3F scene in `src/components/game/` only draws sim state — keeps rules testable without a GPU.
- Rooms are `ROOMS` entries in `layout.ts` (theme, furniture, fire sources; shell/door/alarm/stations shared); `setRoom` refills the live FURNITURE/OBSTACLES/SOURCES arrays in place and the scene re-mounts room content keyed by room id — one source for collisions and rendering.
- Firefighter arrival is a sim-driven rescue sequence (`rescueT`, `RESCUE_TIME`) before the round ends, so the scene animation and the rules stay in sync.
- One stepper `useFrame` (priority -1, in `Scene.tsx`) advances the sim, drains `game.events` into FX/audio/HUD, then moves the chase camera; per-frame state never goes through React state.
- Dev hook: `window.__game` (`state`, `start()`, `sim(seconds, input)`) in dev builds for scripted checks; the canvas wrapper gets `data-scene-ready` once models load.
- 3D models are CC0 Kenney GLBs hosted via lovable-assets pointers in `src/assets/models/` (see CREDITS.md).
- Revive quiz questions live in `src/game/quiz.ts` (plain TS, tested in sim.test.ts); the HUD only renders them — keeps safety content editable in one place.
- The shoulder camera uses named CHASE constants; the fire reach ring and HUD use nearestFire from the simulation so visual reach matches actions.
- All player-facing texts live in `src/i18n` (`cs.ts` is the default and defines the shape, `en.ts` must match it; `?lang=en` switches language). Texts are plain strings/functions (no JSX) so the pure game rules can use them too. Never hard-code UI text in components or in `src/game`; add a key to every language file instead. This includes texts drawn onto 3D signs (`signs`, `markers`).
- All tunable game parameters (rounds per game and which round results count as won, movement, fire growth, points, tool uses, revive quiz length/pass mark) live in `src/game/config.ts`; `sim.ts` re-exports them for older imports. Quiz questions are in `src/i18n`, their answer key in `src/game/quiz.ts` (`QUIZ_ANSWERS`, same order in every language).
- 3D models are bundled in `public/models/*.glb` and loaded with `modelUrl("<name>")` from `src/game/models.ts`. Do not use Lovable asset pointers (`*.asset.json`, `/__l5e/...` URLs): the game is deployed on Vercel, where those URLs do not exist. To add a model, put the `.glb` file into `public/models`.
- One game = `MATCH.rounds` rounds (attempts, including lost ones). After the last round the round-end button leads to the evaluation screen (`phase: "finished"`). A failed revive quiz offers "end the game" (unplayed rounds count as lost).
- The game runs inside the host game's iframe and talks to it through `src/protokol` (READY → INIT → FINISH/ERROR, protocol v1). `src/protokol` is a copy from zimmerp-vse/minihry — do not edit it here. `src/routes/index.tsx` wraps the game in `<Minihra>`; when embedded, the evaluation screen's button sends FINISH with successRate = won rounds / rounds and payload `{ won, rounds, score, history }`. Every new INIT starts a brand-new game.
