# Interaction lab: the rules

The generator (a daily agent run) makes **one** new experiment per day by these
rules. The owner keeps the ones he likes; `PREFERENCES.md` records why, and the
next run reads it before inventing anything. Over time the lab converges on his
taste instead of on the average.

Inspired by Emil Kowalski's interaction lab: a dark grid of small cards, each one
a single gesture with the math printed under it.

Each rule has an id. An experiment lists the ids it follows in `meta.rules`, and
`npm run lab:check` refuses ids that are not in this file.

## The card

- **`one-input`**: exactly one input per experiment, one of `drag`, `tilt`,
  `scroll`, `pointer`, `press`. Not drag *and* press. The hint names it.
- **`one-metaphor`**: one physical metaphor (a spirit level, a loupe, a compass
  needle, a spring, a ratchet). If you need two sentences to explain it, cut one.
- **`mono-labels`**: the label is one word in caps (`LEVEL`), rendered by the
  page as `[ LEVEL ]` in Geist Mono. The hint is lowercase, short, imperative:
  `drag sideways to tilt`, `read the small print · press to zoom`.
- **`formula`**: `meta.formula` is the real math the component runs, in one
  mono line (`θ = atan2(Δy, Δx) · k 170 · c 18`). No marketing, no decoration.
- **`born-in-best-state`**: the card looks good before anyone touches it (in a
  screenshot, on touch, in a grid thumbnail). Interaction intensifies, it never
  reveals.

## The code

- **`no-new-deps`**: only what the repo already has. Allowed imports: `react`,
  `motion/react`, `../types`, `@/lib/utils`. Anything else fails `lab:check`.
- **`tokens`**: color, type, radius and motion come from the house tokens
  (`--casa-*`, `--ease-out`, `--dur-*`, `font-casa-mono`, `text-casa-*`). Zero
  hex, zero `rgb(` literals. Springs are allowed for gesture (see visant-motion).
- **`reduced-motion`**: under `prefers-reduced-motion` the outcome still happens,
  the travel doesn't (no spring, no slosh, the value just lands). Use
  `useReducedMotion()` from `motion/react`.
- **`touch`**: works with a finger on a phone. Pointer Events only (no mouse
  events), `touch-action: none` on the surface you drag, and nothing hidden behind
  hover.
- **`small`**: under ~150 lines per file, including comments. If it doesn't fit,
  the idea is two experiments.
- **`only-transform`**: animate `transform` / `opacity`, or a paint-only value on
  one small element (a gradient angle, an SVG attribute). Never layout
  properties (`width`, `height`, `top`, `margin`, `padding`).

## The run

1. Read `PREFERENCES.md` first. Repeat what was kept, avoid what was discarded.
2. Pick an input and a metaphor not already on the board (`lab/experiments/`).
3. `pnpm lab:new <slug> <drag|tilt|scroll|pointer|press> --label WORD --hint "..."`
4. Fill in the component and the meta. Status stays `candidate`.
5. `pnpm lab:check && pnpm typecheck`. Both green, or no commit.
6. Never touch `registry/`, never deploy to production. A kept experiment only
   becomes a registry item when the owner says so.
