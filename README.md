# Retro Virtual Pet 🐣

A browser-based Tamagotchi-style virtual pet game built with React, TypeScript, and Vite. Care for your digital companion as it hatches, grows, and evolves through five unique life stages.

## Features

- **Pet lifecycle** — egg → baby → child → teen → adult (angel or dragon branch)
- **Core care actions** — feed, play mini-games, clean, sleep, heal, and chat
- **Three mini-games** — Guess Direction, Catch Apples, Whack-a-Mole
- **8-bit retro audio** — procedural Web Audio API sound effects (no audio files)
- **Pixel art sprites** — hand-crafted dot-matrix pixel art rendered with SVG
- **Shell color themes** — Classic White, Retro Yellow, Translucent Purple
- **Evolution Dex** — track all unlocked species
- **Persistent state** — pet is saved in `localStorage` with offline decay simulation
- **Keyboard controls** — `A` (Select), `B` (Execute), `C` (Cancel)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Type-check and build for production
pnpm build

# Preview the production build locally
pnpm preview
```

## Controls

| Button | Keyboard shortcut | Action |
|--------|------------------|--------|
| A | `A` / `1` | Select / cycle menu items |
| B | `B` / `2` / `Enter` | Execute / confirm |
| C | `C` / `3` / `Esc` | Cancel / go back |

## Evolution Paths

```
Egg
 └── Baby Bobo
      └── Pip Chick
           └── Flap Bunny
                ├── Angel Bloop  (low care mistakes + high friendship)
                └── Cyber Dragon (otherwise)
```

## Project Structure

```
src/
├── App.tsx                   # Root component & game controller
├── index.css                 # Global styles & Tailwind utilities
├── main.tsx                  # React entry point
└── game/
    ├── types.ts              # TypeScript types and species catalog
    ├── gameState.ts          # Pet state logic (tick, evolution, save/load)
    ├── dialogues.ts          # Situational pet dialogues
    ├── events.ts             # Random event definitions
    ├── shellThemes.ts        # Shell color theme definitions
    ├── sound.ts              # Web Audio API sound engine
    ├── sprites.ts            # Pixel art sprite matrices
    └── components/
        ├── HandheldCase.tsx       # Device shell & physical buttons
        ├── LcdScreen.tsx          # LCD display & all sub-screens
        ├── MiniGame.tsx           # Three mini-game implementations
        ├── PixelRenderer.tsx      # SVG pixel art renderer
        ├── EncyclopediaModal.tsx  # Evolution Dex overlay
        └── ShellColorSwitcher.tsx # Shell theme selector
```

## Anna LLM Integration

The pet can hold a free-text conversation via Anna LLM (`llm.complete`, text-only). On the Anna platform, **CHAT** opens a free-text chat screen: type a message (max 140 characters) and the pet replies in character — 1–2 short sentences, reacting to its live stats (hungry, sick, sleepy, low energy, happy). Outside Anna (local dev, plain web), the LLM is unavailable and **CHAT** falls back to the existing canned dialogues, exactly as before.

### Where the code lives

| Piece | Location |
|---|---|
| Anna host runtime (detect/connect, standalone fallback) | `src/services/anna/runtime.ts` |
| LLM service wrapper (`getLlmService`, `LlmUnavailableError`) | `src/services/anna/llm.ts` |
| Pet chat: prompt builder, reply cleaner, history persistence | `src/services/anna/chat.ts` |
| Chat UI (`ai_chat` screen) | `src/game/components/LcdScreen.tsx` |
| Chat wiring (availability check, send, stat rewards, keyboard guard) | `src/App.tsx` |
| App manifest + host capabilities | `app.json`, `manifest.json` |
| Tests | `src/services/anna/__tests__/chat.test.ts`, `src/__tests__/anna-llm.test.ts` |

Chat history (last 6 exchanges) persists in `localStorage` under `tamagotchi_chat_v1`, separate from the pet save (`tamagotchi_save_v1`). A successful AI reply grants mood +8, happiness +6, and `totalDialogues` +1. While typing in the chat input, the `A`/`B`/`C`/`Enter` keys type text instead of triggering the handheld buttons; `Enter` sends and `Escape` exits the chat.

### Publish flow (Anna platform)

```bash
pnpm build                          # tsc + vite -> bundle/ (app.js, styles.css, index.html)
anna-app validate --strict          # or: pnpm validate
anna-app dev --port 5193 --no-llm   # or: pnpm harness — local harness smoke test
# then: publish -> install test -> submit-review -> release
```

`anna-app validate` / `publish` run on the user's machine (the `anna-app` CLI is not installed on this dev VM). The production bundle uses relative paths (`base: './'`), so `bundle/index.html` works wherever the host serves it.

> Note: `index.html` references `/favicon.png`, but no favicon file exists in the repo, so no favicon is shipped in `bundle/` and the request 404s when served statically (harmless — the browser just shows no icon). To add one, drop a `favicon.png` in `public/` and it will be copied into `bundle/` at build time.

## Tech Stack

- **React 19** with TypeScript
- **Vite 8** for bundling and development server
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Web Audio API** for procedural 8-bit sound effects
- **localStorage** for pet persistence

## License

MIT
