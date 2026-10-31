#!/usr/bin/env node
/**
 * The interaction lab's verbs. This is what the daily agent run calls.
 *
 *   pnpm lab:next [--seed N]             # today's tag combo (Thompson sampling over lab/taste.json)
 *   pnpm lab:new <slug> <drag|tilt|scroll|pointer|press>
 *                --family F --intensity I --response R --rationale "..."
 *                [--label WORD] [--hint "..."] [--title "..."] [--date yyyy-mm-dd]
 *   (npm works too: `npm run lab:new -- <slug> <input>`; the input is positional
 *    because npm under PowerShell eats unknown `--flags` before they get here.)
 *   pnpm lab:check                       # gate: shape + rules, exit 1 on any error
 *   pnpm lab:keep <id> "why"              # status → kept, reason logged in PREFERENCES.md
 *   pnpm lab:discard <id> "why"          # file deleted, reason logged (git keeps the code)
 *   pnpm lab:sync                        # pull the verdicts given on /lab?admin into git
 *
 * `lab:sync` reads https://ui.visantlabs.com/api/lab (the verdict store) and, for
 * each verdict not yet in git, does what keep/discard would: kept → status flip,
 * discarded → file deleted, reason logged either way. Idempotent: a verdict
 * already reflected in the files is skipped. `--url <base>` points elsewhere.
 * Every verdict (with the experiment's tags, read before a discard deletes the
 * file) is kept in `lab/taste.json`, and sync rewrites the scoreboard there and
 * between the `lab:taste` markers in PREFERENCES.md (scripts/lab-taste.mjs).
 *
 * The checks are regex on purpose: an experiment is a small file with a fixed
 * shape, and parsing TSX would mean a new dependency for no extra certainty.
 * Rule ids come from lab/RULES.md, so the rules file stays the only source.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DIMENSIONS, jaccard, markdown, next, rng, sameCombo, scoreboard } from "./lab-taste.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAB = path.join(ROOT, "lab");
const DIR = path.join(LAB, "experiments");
const TEMPLATE = path.join(DIR, "_template.tsx");
const RULES = path.join(LAB, "RULES.md");
const PREFS = path.join(LAB, "PREFERENCES.md");
const TASTE = path.join(LAB, "taste.json");

const INPUTS = DIMENSIONS.input;
const TOO_CLOSE = 0.6;
const IMPORTS_OK = ["react", "motion/react", "../types", "@/lib/utils"];
const SOFT_MAX = 150;
const HARD_MAX = 175;

const today = () => new Date().toISOString().slice(0, 10);
const die = (msg) => {
  console.error(`lab: ${msg}`);
  process.exit(1);
};

function args(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return { pos, opt };
}

const files = () =>
  fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.tsx$/.test(f)) : [];

const ruleIds = () =>
  new Set([...fs.readFileSync(RULES, "utf8").matchAll(/\*\*`([a-z0-9-]+)`\*\*/g)].map((m) => m[1]));

const field = (src, key) => src.match(new RegExp(`\\b${key}:\\s*"([^"]*)"`))?.[1];

const readTags = (src) => {
  const body = src.match(/\btags:\s*\{([^}]*)\}/)?.[1];
  if (!body) return null;
  return Object.fromEntries(Object.keys(DIMENSIONS).map((k) => [k, field(body, k)]));
};
/** The header comment's first paragraph: "LABEL: the metaphor...". */
const metaphor = (src) =>
  (src.match(/^\/\*\n([\s\S]*?)(?:\n \*\n|\n \*\/)/)?.[1] ?? "").replace(/^\s*\*\s?/gm, " ").trim();
const describe = (src) => `${field(src, "title") ?? ""} ${metaphor(src)}`;

// ── Taste ledger (lab/taste.json) ──────────────────────────────────────────
const loadTaste = () => (fs.existsSync(TASTE) ? JSON.parse(fs.readFileSync(TASTE, "utf8")) : { decisions: [] });

function saveTaste(taste) {
  const board = scoreboard(taste.decisions);
  const out = { updated: today(), n: board.n, kept: board.kept, decisions: taste.decisions, board: board.dims, motivos: board.motivos };
  fs.writeFileSync(TASTE, JSON.stringify(out, null, 2) + "\n");
  const prefs = fs.readFileSync(PREFS, "utf8");
  const block = `<!-- lab:taste (written by pnpm lab:sync; edits here are overwritten) -->\n${markdown(board)}\n<!-- /lab:taste -->`;
  fs.writeFileSync(PREFS, prefs.replace(/<!-- lab:taste[\s\S]*?<!-- \/lab:taste -->/, () => block));
  return board;
}

/** Upsert by id: the latest verdict on an experiment is the one that counts. */
function record(taste, d) {
  const i = taste.decisions.findIndex((x) => x.id === d.id);
  const prev = i >= 0 ? taste.decisions[i] : {};
  const merged = { ...prev, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v != null)) };
  if (i >= 0) taste.decisions[i] = merged;
  else taste.decisions.push(merged);
}

const fromFile = (id, src) => ({ id, title: field(src, "title"), metaphor: metaphor(src), tags: readTags(src) });

function log(verb, id, why) {
  const line = `- ${today()} · ${verb} · \`${id}\` · ${why}\n`;
  fs.appendFileSync(PREFS, line.replace(/\r/g, ""));
}

function cmdNew({ pos, opt }) {
  const slug = pos[0];
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die("usage: lab:new <kebab-slug> <input>");
  const input = opt.input ?? pos[1];
  if (!INPUTS.includes(input)) die(`input must be one of ${INPUTS.join(", ")}`);
  const date = opt.date ?? today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die("--date must be yyyy-mm-dd");
  const id = `${date}-${slug}`;
  const out = path.join(DIR, `${id}.tsx`);
  if (fs.existsSync(out)) die(`${path.relative(ROOT, out)} already exists`);
  const taken = files().find((f) => f.endsWith(`-${slug}.tsx`));
  if (taken) console.warn(`lab: warning, the slug "${slug}" was already used in ${taken}`);

  const tags = { input, family: opt.family, intensity: opt.intensity, response: opt.response };
  for (const [k, v] of Object.entries(tags))
    if (!DIMENSIONS[k].includes(v)) die(`--${k} must be one of ${DIMENSIONS[k].join(", ")} (see pnpm lab:next)`);
  if (!opt.rationale?.trim()) die('--rationale "..." is required (the lab:next line, or why you deviate from it)');

  const label = (opt.label ?? slug.split("-")[0]).toUpperCase();
  const title = opt.title ?? slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  const src = fs
    .readFileSync(TEMPLATE, "utf8")
    .replace(/^\/\*[\s\S]*?\*\/\n/, `/*\n * ${label}: <one sentence: the physical metaphor and why it feels right>.\n */\n`)
    .replaceAll("__DATE__", date)
    .replaceAll("__SLUG__", slug)
    .replaceAll("__TITLE__", title)
    .replaceAll("__LABEL__", label)
    .replaceAll("__HINT__", opt.hint ?? `${input} to <verb>`)
    .replaceAll("__INPUT__", input)
    .replace(/^  tags: .*$/m, `  tags: { input: "${input}", family: "${tags.family}", intensity: "${tags.intensity}", response: "${tags.response}" },`)
    .replaceAll("__RATIONALE__", opt.rationale.replace(/"/g, "'"));
  fs.writeFileSync(out, src);
  console.log(`lab: created ${path.relative(ROOT, out)}`);
  console.log("next: fill in the component + meta, then `pnpm lab:check && pnpm typecheck`");
}

function cmdCheck() {
  const ids = ruleIds();
  const discarded = loadTaste().decisions.filter((d) => d.status === "discarded");
  const all = files().map((f) => ({ f, src: fs.readFileSync(path.join(DIR, f), "utf8") }));
  const labels = new Map();
  let errors = 0;
  let warnings = 0;
  for (const f of files()) {
    const src = fs.readFileSync(path.join(DIR, f), "utf8");
    const err = (m) => (errors++, console.error(`  ✗ ${f}: ${m}`));
    const warn = (m) => (warnings++, console.warn(`  ! ${f}: ${m}`));
    const id = f.replace(/\.tsx$/, "");

    if (field(src, "id") !== id) err(`meta.id must be "${id}"`);
    if (field(src, "date") !== id.slice(0, 10)) err(`meta.date must be "${id.slice(0, 10)}"`);
    for (const k of ["title", "hint", "formula"]) if (!field(src, k)?.trim()) err(`meta.${k} is empty`);
    const label = field(src, "label");
    if (!label || !/^[A-Z0-9]+$/.test(label)) err("meta.label must be one word in caps");
    else if (labels.has(label)) warn(`label ${label} also used by ${labels.get(label)}`);
    else labels.set(label, f);
    if (!["candidate", "kept"].includes(field(src, "status"))) err('meta.status must be "candidate" or "kept"');
    if (/<[^>]+>/.test(field(src, "hint") ?? "") || field(src, "formula") === "x = Δx · k")
      err("hint/formula still hold the template placeholder");

    const tags = readTags(src);
    if (!tags) err("meta.tags is missing ({ input, family, intensity, response })");
    else
      for (const [k, values] of Object.entries(DIMENSIONS))
        if (!values.includes(tags[k])) err(`meta.tags.${k} must be one of ${values.join(", ")}`);
    const rationale = field(src, "rationale");
    if (!rationale?.trim() || rationale.includes("__RATIONALE__")) err("meta.rationale is empty (pnpm lab:next)");

    // Anti-repeat, for candidates only, and only against what came BEFORE them
    // (older experiments, discards decided before the candidate was made), so a
    // later verdict never retro-fails a candidate that was fine on its day.
    if (field(src, "status") === "candidate" && tags) {
      const before = discarded.filter((d) => d.id !== id && (d.at ?? d.id.slice(0, 10)) <= id.slice(0, 10));
      const twin = before.find((d) => sameCombo(d.tags, tags));
      if (twin) err(`same tag combo as discarded ${twin.id}; pick another (pnpm lab:next)`);
      const me = describe(src);
      const others = [
        ...all.filter((o) => o.f !== f && o.f.slice(0, 10) <= f.slice(0, 10)).map((o) => ({ id: o.f.replace(/\.tsx$/, ""), text: describe(o.src) })),
        ...before.map((d) => ({ id: `${d.id} (discarded)`, text: `${d.title ?? ""} ${d.metaphor ?? ""}` })),
      ];
      for (const o of others) {
        const j = jaccard(me, o.text);
        if (j > TOO_CLOSE) err(`title/metaphor too close to ${o.id} (Jaccard ${j.toFixed(2)} > ${TOO_CLOSE})`);
      }
    }

    const rules = src.match(/rules:\s*\[([\s\S]*?)\]/)?.[1].match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
    if (!rules.length) err("meta.rules is empty");
    for (const r of rules) if (!ids.has(r)) err(`unknown rule "${r}" (not in lab/RULES.md)`);

    for (const m of src.matchAll(/^import[\s\S]*?from\s+"([^"]+)"/gm))
      if (!IMPORTS_OK.includes(m[1])) err(`import "${m[1]}" not allowed (no-new-deps)`);
    if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(src)) err("literal color found; use --casa-* tokens");
    if (/\bonMouse[A-Z]/.test(src)) err("mouse events found; use Pointer Events (touch)");
    if (!/useReducedMotion/.test(src)) err("no useReducedMotion() (reduced-motion)");
    if (/onPointer(Down|Move)/.test(src) && !/touch-none|touchAction/.test(src))
      err("pointer handlers without touch-none (touch)");
    if (/transition-all|cubic-bezier\(/.test(src)) err("transition-all or inline cubic-bezier; use motion tokens");

    const lines = src.split("\n").length;
    if (lines > HARD_MAX) err(`${lines} lines (max ~${SOFT_MAX})`);
    else if (lines > SOFT_MAX) warn(`${lines} lines (aim for < ${SOFT_MAX})`);
  }
  const n = files().length;
  console.log(`lab: ${n} experiment(s), ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors ? 1 : 0);
}

function verdict(verb, { pos }) {
  const [id, ...why] = pos;
  const reason = why.join(" ").trim();
  if (!id || !reason) die(`usage: lab:${verb} -- <id> "why"   (the why is what teaches the next run)`);
  const file = path.join(DIR, `${id}.tsx`);
  if (!fs.existsSync(file)) die(`no experiment ${id}`);
  const src = fs.readFileSync(file, "utf8");
  const taste = loadTaste();
  record(taste, { ...fromFile(id, src), status: verb === "keep" ? "kept" : "discarded", reason, at: today() });
  saveTaste(taste);
  if (verb === "keep") {
    fs.writeFileSync(file, src.replace(/status:\s*"candidate"/, 'status: "kept"'));
    log("kept", id, reason);
  } else {
    fs.unlinkSync(file);
    log("discarded", id, reason);
  }
  console.log(`lab: ${verb === "keep" ? "kept" : "discarded"} ${id}; reason logged in lab/PREFERENCES.md`);
}

async function cmdSync({ opt }) {
  const base = (opt.url ?? "https://ui.visantlabs.com").replace(/\/$/, "");
  const res = await fetch(`${base}/api/lab`);
  if (!res.ok) die(`GET ${base}/api/lab → ${res.status}`);
  const { store, veredictos = [] } = await res.json();
  if (!store) die("the verdict store is not reachable in production (SUPABASE_* on Vercel)");
  const taste = loadTaste();
  let n = 0;
  for (const v of veredictos) {
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(v.id) || !["kept", "discarded"].includes(v.status)) continue;
    const motivos = Array.isArray(v.motivos) ? v.motivos : [];
    const decision = { id: v.id, status: v.status, motivos, reason: v.reason ?? "", at: String(v.at).slice(0, 10) };
    const file = path.join(DIR, `${v.id}.tsx`);
    if (!fs.existsSync(file)) {
      record(taste, decision); // already deleted: keep the tags we had, if any
      continue;
    }
    const src = fs.readFileSync(file, "utf8");
    record(taste, { ...fromFile(v.id, src), ...decision });
    const why = [motivos.join(", "), (v.reason || "").replace(/\s+/g, " ")].filter(Boolean).join(" · ") || "(sem motivo)";
    const line = (verb) => `- ${decision.at} · ${verb} · \`${v.id}\` · ${why} · via /lab\n`;
    if (v.status === "kept" && /status:\s*"candidate"/.test(src)) {
      fs.writeFileSync(file, src.replace(/status:\s*"candidate"/, 'status: "kept"'));
      fs.appendFileSync(PREFS, line("kept"));
    } else if (v.status === "discarded") {
      fs.unlinkSync(file);
      fs.appendFileSync(PREFS, line("discarded"));
    } else continue;
    n++;
    console.log(`lab: ${v.status} ${v.id}`);
  }
  const board = saveTaste(taste);
  console.log(`lab: synced ${n} verdict(s) from ${base}; taste: ${board.kept}/${board.n} kept → lab/taste.json`);
}

function cmdNext({ opt }) {
  const taste = loadTaste();
  const board = scoreboard(taste.decisions);
  const r = rng(opt.seed ? Number(opt.seed) : Date.now());
  const discarded = taste.decisions.filter((d) => d.status === "discarded");
  let pick = next(board, r);
  for (let i = 0; i < 50 && discarded.some((d) => sameCombo(d.tags, pick.tags)); i++) pick = next(board, r);
  const { input, family, intensity, response } = pick.tags;
  console.log(JSON.stringify(pick, null, 2));
  console.log(`\nnext: pnpm lab:new <slug> ${input} --family ${family} --intensity ${intensity} --response ${response} --rationale "${pick.rationale}"`);
  console.log("(deviate only with a written reason in --rationale)");
}

const [cmd, ...rest] = process.argv.slice(2);
const a = args(rest);
if (cmd === "new") cmdNew(a);
else if (cmd === "check") cmdCheck();
else if (cmd === "keep" || cmd === "discard") verdict(cmd, a);
else if (cmd === "sync") await cmdSync(a);
else if (cmd === "next") cmdNext(a);
else die("commands: next | new | check | keep | discard | sync");
