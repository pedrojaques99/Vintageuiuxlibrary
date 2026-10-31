// node --test scripts/lab-taste.test.mjs   (pnpm test:lab)
import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, beta, jaccard, markdown, next, rate, rng, sameCombo, scoreboard, sentences } from "./lab-taste.mjs";

const t = (input, family, intensity, response) => ({ input, family, intensity, response });
const D = [
  { id: "a", status: "kept", tags: t("drag", "fluid", "medium", "spring"), motivos: ["lindo"] },
  { id: "b", status: "kept", tags: t("tilt", "fluid", "subtle", "spring"), motivos: ["lindo", "útil"] },
  { id: "c", status: "kept", tags: t("drag", "fluid", "bold", "inertia") },
  { id: "d", status: "discarded", tags: t("press", "mechanical", "bold", "snap"), motivos: ["lento demais"] },
  { id: "e", status: "discarded", tags: t("scroll", "mechanical", "medium", "snap"), motivos: ["lento demais", "já vi"] },
];

test("Beta(1,1) prior: no data is 50%, tiny samples stay away from 0/100", () => {
  assert.equal(rate(0, 0), 0.5);
  assert.equal(rate(1, 1), 2 / 3);
  assert.equal(rate(0, 1), 1 / 3);
  assert.equal(rate(3, 3), 0.8);
});

test("scoreboard counts per tag value and per reason chip", () => {
  const b = scoreboard(D);
  assert.equal(b.n, 5);
  assert.equal(b.kept, 3);
  assert.deepEqual([b.dims.family.fluid.kept, b.dims.family.fluid.n], [3, 3]);
  assert.equal(b.dims.family.fluid.rate, 0.8);
  assert.equal(b.dims.family.mechanical.rate, 0.25);
  assert.equal(b.dims.family.optics.n, 0);
  assert.equal(b.motivos.discarded["lento demais"], 2);
  assert.equal(b.motivos.kept.lindo, 2);
});

test("decisions without tags still count reasons, never crash", () => {
  const b = scoreboard([{ id: "x", status: "discarded", motivos: ["confuso"] }]);
  assert.equal(b.n, 1);
  assert.equal(b.motivos.discarded.confuso, 1);
});

test("sentences come from the numbers", () => {
  const s = sentences(scoreboard(D));
  assert.ok(s.length >= 3 && s.length <= 5);
  assert.match(s[0], /3 de 5/);
  assert.ok(s.some((x) => /Gosta de fluid \(family, 3\/3\)/.test(x)));
  assert.ok(s.some((x) => /Rejeita .*mechanical/.test(x)));
  assert.ok(s.some((x) => /lento demais" \(2×\)/.test(x)));
  assert.deepEqual(sentences(scoreboard([])), ["Ainda sem veredito: a próxima rodada explora sem preferência."]);
  assert.match(markdown(scoreboard(D)), /\| family \| fluid \| 3 \| 0 \| 80% \|/);
});

test("seeded rng is reproducible and Beta samples have the right mean", () => {
  assert.equal(rng(42)(), rng(42)());
  const r = rng(7);
  let sum = 0;
  for (let i = 0; i < 4000; i++) sum += beta(4, 2, r);
  assert.ok(Math.abs(sum / 4000 - 4 / 6) < 0.02, `mean ${sum / 4000}`);
  const r2 = rng(8);
  for (let i = 0; i < 500; i++) {
    const x = beta(1, 1, r2);
    assert.ok(x > 0 && x < 1);
  }
});

test("Thompson: no data explores uniformly", () => {
  const r = rng(1);
  const seen = Object.fromEntries(DIMENSIONS.family.map((f) => [f, 0]));
  const empty = scoreboard([]);
  for (let i = 0; i < 4000; i++) seen[next(empty, r).tags.family]++;
  for (const k of Object.values(seen)) assert.ok(k > 350 && k < 650, JSON.stringify(seen));
  assert.match(next(empty, rng(3)).rationale, /exploração: .* nunca testado/);
});

test("Thompson: a proven value wins most draws but not all (explore stays alive)", () => {
  const many = [];
  for (let i = 0; i < 8; i++) many.push({ id: `k${i}`, status: "kept", tags: t("drag", "fluid", "medium", "spring") });
  for (let i = 0; i < 8; i++) many.push({ id: `d${i}`, status: "discarded", tags: t("press", "mechanical", "bold", "snap") });
  const b = scoreboard(many);
  const r = rng(99);
  let fluid = 0;
  let mech = 0;
  for (let i = 0; i < 2000; i++) {
    const f = next(b, r).tags.family;
    if (f === "fluid") fluid++;
    if (f === "mechanical") mech++;
  }
  assert.ok(fluid > 1000, `fluid ${fluid}`);
  assert.ok(fluid < 2000, "untested families still get drawn");
  assert.ok(mech < 20, `mechanical ${mech}`);
  const pick = next(b, rng(5));
  assert.equal(Object.keys(pick.tags).length, 4);
  assert.match(pick.rationale, /(aposta|exploração): /);
});

test("anti-repeat helpers", () => {
  assert.equal(jaccard("Stamp rubber stamp ink pad", "Stamp: rubber stamp, the ink pad"), 1);
  assert.ok(jaccard("Compass needle swings toward pointer", "Ratchet toothed wheel turns one way") < 0.1);
  assert.ok(sameCombo(t("drag", "fluid", "bold", "snap"), t("drag", "fluid", "bold", "snap")));
  assert.ok(!sameCombo(t("drag", "fluid", "bold", "snap"), t("drag", "fluid", "bold", "spring")));
  assert.ok(!sameCombo(undefined, t("drag", "fluid", "bold", "snap")));
});
