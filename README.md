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

## Tech Stack

- **React 19** with TypeScript
- **Vite 8** for bundling and development server
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Web Audio API** for procedural 8-bit sound effects
- **localStorage** for pet persistence

## License

MIT
