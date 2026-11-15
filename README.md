# Zastav požár! (Firewise Room Runner)

Minihra **0_home_mini_fire** kariérní hry ČSpA. Vývoj probíhá v Lovable (tento repozitář);
stejný `main` se zrcadlí do `cspadev/0_home_mini_fire`, odkud ho nasazuje Vercel
(https://stop-fire-minig.vercel.app).

## Vstupy a výstupy (protokol v1)

- **Vstup (INIT):** zatím žádné parametry; `level` ani `payload` hra nepoužívá (jakýkoli payload přijme a ignoruje).
- **Výstup (FINISH):** po 3 kolech tlačítko „Pokračovat“ na obrazovce vyhodnocení pošle
  `successRate` = vyhraná kola / 3. Vyhrané kolo = všechny ohně uhašené, nebo hráč vydržel do příjezdu hasičů
  (nastavení `MATCH` v `src/game/config.ts`). Payload: `{ won, rounds, score, history }`.
- **Samostatně** (mimo hlavní hru) se místo „Pokračovat“ ukáže „Hrát znovu“.

## Kde co je

- Texty: `src/i18n/cs.ts` (výchozí čeština), `src/i18n/en.ts` (`?lang=en`).
- Herní parametry: `src/game/config.ts`.
- 3D modely: `public/models` (CC0 Kenney, viz `CREDITS.md`).
- Komunikace s hlavní hrou: `src/protokol` (kopie z `zimmerp-vse/minihry`, needitovat zde).

## Původní zadání pro Lovable


Create a 3D browser minigame for high-school students called “Stop the fire”.

The player, seen from behind with a third-person chase camera, is inside a building where a fire breaks out and spreads. They can run, jump, and steer. In each room they can either fight the fire with the equipment available there or get out before the fire blocks the exit. Using the wrong equipment makes things worse with big, playful visual effects. Include fast rounds, score, and lives.

Build the first playable room with the camera, movement controls, equipment stations, spreading fire hazards, comic feedback for right vs wrong equipment, and an exit door.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://firewise-room-runner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a9c9cf48-c523-4424-ba63-6ce547538c9f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
