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

Candidates go straight to production, hidden: the public `/lab` renders only
`kept`. The owner judges them on `ui.visantlabs.com/lab?admin` ("Entrar com
GitHub", then "Aprovar" / "Descartar" + an optional reason). `api/lab.ts` commits
the verdict to `main` as that GitHub user, who needs push on the repo (status
flip or file delete, plus a line in `PREFERENCES.md`)
and the Git deploy publishes it in ~1–2 min. No PR, no command for the owner.

Work in the worktree `Z:/Cursor/.worktrees/interaction-lab`, never in the main
checkout (it holds the owner's uncommitted work and has `main` checked out).

1. `git fetch origin && git checkout -B lab/<yyyy-mm-dd>-<slug> origin/main`
   (fresh from `main`, so the verdicts committed by `/lab` are in).
2. Read `PREFERENCES.md` first. Repeat what was kept, avoid what was discarded.
3. Pick an input and a metaphor not already on the board (`lab/experiments/`).
4. `pnpm lab:new <slug> <drag|tilt|scroll|pointer|press> --label WORD --hint "..."`
5. Fill in the component and the meta. Status stays `candidate`.
6. `pnpm lab:check && pnpm typecheck`. Both green, or nothing ships.
7. `cp -r Z:/Cursor/Vintageuiuxlibrary/.vercel .vercel` (if missing; the
   worktree has no Vercel link, see VISANT-REGISTRY-PLANO.md §8).
8. `node scripts/ship.mjs --main --no-perf -m "lab: <LABEL> (<input>), candidate"`
   (all ship gates, commit, push `HEAD:main`, `vercel deploy --prod`). If the
   push is refused (main moved), `git rebase origin/main` and run it again.
9. Never touch `registry/`, never set `status: "kept"` yourself. A kept
   experiment only becomes a registry item when the owner says so.
