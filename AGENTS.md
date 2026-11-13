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
