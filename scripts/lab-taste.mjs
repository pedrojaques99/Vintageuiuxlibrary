/**
 * The lab's taste model: small, pure, testable (scripts/lab-taste.test.mjs).
 *
 * Every verdict is one Bernoulli trial per tag value (kept = 1, discarded = 0).
 * A Beta(1,1) prior turns counts into a rate that small samples can't push to
 * 0% or 100%: (kept + 1) / (n + 2). `lab:sync` writes the scoreboard; `lab:next`
 * Thompson-samples one value per dimension from Beta(kept + 1, discarded + 1):
 * a proven value usually wins (exploit), an untested one sometimes does
 * (explore), and with no data at all every pick is uniform.
 */

import MOTIVOS_JSON from "../lab/motivos.json" with { type: "json" };

export const DIMENSIONS = {
  input: ["drag", "tilt", "scroll", "pointer", "press"],
  family: ["mechanical", "ink-print", "fluid", "optics", "typography", "light", "material", "other"],
  intensity: ["subtle", "medium", "bold"],
  response: ["snap", "spring", "inertia", "direct"],
};

/** One-tap reasons on the admin card (lab/motivos.json, shared with the page and the API). */
export const MOTIVOS = MOTIVOS_JSON;

export const rate = (kept, n) => (kept + 1) / (n + 2);

/** decisions: [{ id, status: "kept"|"discarded", tags?: {...}, motivos?: string[] }] */
export function scoreboard(decisions) {
  const dims = {};
  for (const [dim, values] of Object.entries(DIMENSIONS)) {
    dims[dim] = Object.fromEntries(values.map((v) => [v, { kept: 0, discarded: 0, n: 0, rate: rate(0, 0) }]));
  }
  const motivos = { kept: {}, discarded: {} };
  for (const d of decisions) {
    if (d.status !== "kept" && d.status !== "discarded") continue;
    for (const m of d.motivos ?? []) motivos[d.status][m] = (motivos[d.status][m] ?? 0) + 1;
    if (!d.tags) continue;
    for (const dim of Object.keys(DIMENSIONS)) {
      const cell = dims[dim][d.tags[dim]];
      if (!cell) continue;
      cell[d.status]++;
      cell.n++;
      cell.rate = rate(cell.kept, cell.n);
    }
  }
  const n = decisions.filter((d) => d.status === "kept" || d.status === "discarded").length;
  const kept = decisions.filter((d) => d.status === "kept").length;
  return { n, kept, dims, motivos };
}

const pct = (r) => `${Math.round(r * 100)}%`;
const top = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

/** 3–5 sentences, every one read off the numbers. */
export function sentences(board) {
  if (!board.n) return ["Ainda sem veredito: a próxima rodada explora sem preferência."];
  const out = [`${board.kept} de ${board.n} aprovados até aqui.`];
  const cells = Object.entries(board.dims).flatMap(([dim, vals]) =>
    Object.entries(vals).filter(([, c]) => c.n >= 2).map(([v, c]) => ({ dim, v, ...c })),
  );
  const liked = cells.filter((c) => c.rate >= 0.6).sort((a, b) => b.rate - a.rate || b.n - a.n).slice(0, 2);
  const disliked = cells.filter((c) => c.rate <= 0.4).sort((a, b) => a.rate - b.rate || b.n - a.n).slice(0, 2);
  if (liked.length) out.push(`Gosta de ${liked.map((c) => `${c.v} (${c.dim}, ${c.kept}/${c.n})`).join(" e ")}.`);
  if (disliked.length) out.push(`Rejeita ${disliked.map((c) => `${c.v} (${c.dim}, ${c.kept}/${c.n})`).join(" e ")}.`);
  const [whyKept] = top(board.motivos.kept);
  const [whyNot] = top(board.motivos.discarded);
  if (whyKept) out.push(`O que mais aprova: "${whyKept[0]}" (${whyKept[1]}×).`);
  if (whyNot && out.length < 5) out.push(`O que mais derruba: "${whyNot[0]}" (${whyNot[1]}×).`);
  if (out.length === 1) out.push("Ainda pouco dado por tag (menos de 2 vereditos em cada) pra afirmar gosto.");
  return out.slice(0, 5);
}

/** The block between the markers in PREFERENCES.md. */
export function markdown(board) {
  const rows = Object.entries(board.dims).flatMap(([dim, vals]) =>
    Object.entries(vals)
      .filter(([, c]) => c.n > 0)
      .sort((a, b) => b[1].rate - a[1].rate)
      .map(([v, c]) => `| ${dim} | ${v} | ${c.kept} | ${c.discarded} | ${pct(c.rate)} |`),
  );
  const chips = (side) => top(board.motivos[side]).map(([m, k]) => `${m} ${k}`).join(", ") || "nenhum";
  return [
    ...sentences(board).map((s) => `- ${s}`),
    "",
    rows.length
      ? ["| dimensão | valor | kept | discarded | taxa (Beta 1,1) |", "|---|---|---|---|---|", ...rows].join("\n")
      : "_Tabela vazia: nenhum veredito com tags ainda._",
    "",
    `Motivos ao aprovar: ${chips("kept")}. Ao descartar: ${chips("discarded")}.`,
  ].join("\n");
}

// ── Sampling ───────────────────────────────────────────────────────────────
/** mulberry32: tiny seeded PRNG, so tests and `--seed` are reproducible. */
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(r) {
  const u = 1 - r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Gamma(k, 1), Marsaglia–Tsang; k < 1 boosted by U^(1/k). */
function gamma(k, r) {
  if (k < 1) return gamma(k + 1, r) * Math.pow(1 - r(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do {
      x = normal(r);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = 1 - r();
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
}

export function beta(a, b, r) {
  const x = gamma(a, r);
  return x / (x + gamma(b, r));
}

/** One value per dimension, Thompson-sampled, with a one-line reason each. */
export function next(board, r = rng()) {
  const pick = {};
  const bet = [];
  const tried = [];
  const fresh = [];
  for (const [dim, vals] of Object.entries(board.dims)) {
    let best = null;
    for (const [v, c] of Object.entries(vals)) {
      const s = beta(c.kept + 1, c.discarded + 1, r);
      if (!best || s > best.s) best = { v, s, c };
    }
    pick[dim] = best.v;
    const bestMean = Math.max(...Object.values(vals).map((c) => c.rate));
    if (best.c.n === 0) fresh.push(best.v);
    else if (best.c.rate >= bestMean) bet.push(`${best.v} ${best.c.kept}/${best.c.n}`);
    else tried.push(`${best.v} ${best.c.kept}/${best.c.n}`);
  }
  const why = [
    bet.length && `aposta: ${bet.join(", ")}`,
    tried.length && `exploração: ${tried.join(", ")}`,
    fresh.length && `exploração: ${fresh.join(", ")} nunca testado${fresh.length > 1 ? "s" : ""}`,
  ].filter(Boolean);
  return { tags: pick, rationale: why.join(" · ") };
}

// ── Anti-repeat ────────────────────────────────────────────────────────────
const STOP = new Set(["a", "an", "the", "of", "to", "and", "that", "it", "is", "its", "in", "on", "with", "for", "one", "each"]);
export const tokens = (s) =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );

export function jaccard(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export const sameCombo = (a, b) => Object.keys(DIMENSIONS).every((k) => a?.[k] && a[k] === b?.[k]);
