#!/usr/bin/env node
/**
 * The interaction lab's four verbs. This is what the daily agent run calls.
 *
 *   pnpm lab:new <slug> <drag|tilt|scroll|pointer|press>
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
 *
 * The checks are regex on purpose: an experiment is a small file with a fixed
 * shape, and parsing TSX would mean a new dependency for no extra certainty.
 * Rule ids come from lab/RULES.md, so the rules file stays the only source.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAB = path.join(ROOT, "lab");
const DIR = path.join(LAB, "experiments");
const TEMPLATE = path.join(DIR, "_template.tsx");
const RULES = path.join(LAB, "RULES.md");
const PREFS = path.join(LAB, "PREFERENCES.md");

const INPUTS = ["drag", "tilt", "scroll", "pointer", "press"];
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
    .replaceAll("__INPUT__", input);
  fs.writeFileSync(out, src);
  console.log(`lab: created ${path.relative(ROOT, out)}`);
  console.log("next: fill in the component + meta, then `pnpm lab:check && pnpm typecheck`");
}

function cmdCheck() {
  const ids = ruleIds();
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
  if (verb === "keep") {
    const src = fs.readFileSync(file, "utf8");
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
  if (!store) die("the verdict store is not configured in production (SUPABASE_* on Vercel)");
  let n = 0;
  for (const v of veredictos) {
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(v.id)) continue;
    const file = path.join(DIR, `${v.id}.tsx`);
    if (!fs.existsSync(file)) continue; // discarded and already deleted, or never here
    const src = fs.readFileSync(file, "utf8");
    const why = `${(v.reason || "(sem motivo)").replace(/\s+/g, " ")} · via /lab`;
    const line = (verb) => `- ${String(v.at).slice(0, 10)} · ${verb} · \`${v.id}\` · ${why}\n`;
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
  console.log(`lab: synced ${n} verdict(s) from ${base}`);
}

const [cmd, ...rest] = process.argv.slice(2);
const a = args(rest);
if (cmd === "new") cmdNew(a);
else if (cmd === "check") cmdCheck();
else if (cmd === "keep" || cmd === "discard") verdict(cmd, a);
else if (cmd === "sync") await cmdSync(a);
else die("commands: new | check | keep | discard | sync");
