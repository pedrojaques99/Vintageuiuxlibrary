#!/usr/bin/env node
/**
 * Custo de cada peça sozinha, pra saber QUEM pesa no catálogo.
 *
 *   node scripts/perf-pecas.mjs                     # produção, CPU 4x
 *   node scripts/perf-pecas.mjs --url http://localhost:5182 --cpu 6 --top 30
 *
 * Abre `/c/<nome>?solo=1` de cada peça com CPU estrangulada, deixa viver 3s e
 * mede: % de quadros acima de 33ms, pior quadro, tempo bloqueado por tarefa
 * longa, contextos WebGL e heap. Ordena do mais caro pro mais barato e grava
 * `perf/pecas-<data>.json`.
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const URL_BASE = arg("url", "https://ui.visantlabs.com");
const CPU = Number(arg("cpu", 4));
const TOP = Number(arg("top", 25));
const PARALELO = Number(arg("paralelo", 4));

const PULAR = Number(arg("pular", 0));
const nomes = JSON.parse(readFileSync("registry.json", "utf8"))
  .items.filter((i) => /registry:(ui|block|component)/.test(i.type))
  .map((i) => i.name)
  .slice(PULAR);

const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
const ctx = await browser.newContext({ ...devices["Desktop Chrome"] });
await ctx.addInitScript(() => {
  const w = window;
  w.__perf = { gl: 0, longas: [], quadros: [] };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) {
    const c = orig.call(this, t, ...a);
    if (c && /webgl/.test(t) && !this.__contado) {
      this.__contado = true;
      w.__perf.gl++;
    }
    return c;
  };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__perf.longas.push(e.duration))).observe({
    type: "longtask",
    buffered: true,
  });
  let t0 = performance.now();
  const loop = (t) => {
    w.__perf.quadros.push(t - t0);
    t0 = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

async function medir(page, nome) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  try {
    await page.goto(`${URL_BASE}/c/${nome}?solo=1`, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(3000);
    return await page.evaluate(() => {
      const p = window.__perf;
      const q = p.quadros.slice(10);
      return {
        lentosPct: Math.round((q.filter((d) => d > 33).length / Math.max(1, q.length)) * 100),
        piorQuadroMs: Math.round(Math.max(0, ...q)),
        bloqueadoMs: Math.round(p.longas.reduce((s, d) => s + Math.max(0, d - 50), 0)),
        webgl: p.gl,
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
      };
    });
  } catch (e) {
    return { erro: String(e).slice(0, 120) };
  } finally {
    await cdp.detach().catch(() => {});
  }
}

const fila = [...nomes];
const res = [];
const ARQ = `perf/pecas-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
mkdirSync("perf", { recursive: true });
// Aba nova por peça, e tudo dentro do prazo: uma peça que trava a aba (ou o
// próprio newPage) não pode parar a fila. O parcial vai pro disco a cada peça.
const comPrazo = (p, ms, msg) =>
  Promise.race([p, new Promise((ok) => setTimeout(() => ok({ erro: msg }), ms))]);
await Promise.all(
  Array.from({ length: PARALELO }, async () => {
    while (fila.length) {
      const nome = fila.shift();
      const r = await comPrazo(
        (async () => {
          const page = await ctx.newPage();
          try {
            return await medir(page, nome);
          } finally {
            page.close().catch(() => {});
          }
        })(),
        60_000,
        "travou (60s)",
      );
      res.push({ nome, ...r });
      writeFileSync(ARQ, JSON.stringify({ url: URL_BASE, cpu: CPU, res }, null, 2));
      process.stdout.write(`${res.length}/${nomes.length} ${nome.padEnd(28)}`);
    }
  }),
);
await comPrazo(browser.close(), 10_000, "");

// Custo = quadros lentos pesam mais que bloqueio pontual de carga; WebGL entra como multa fixa.
const custo = (r) => (r.lentosPct ?? 0) * 10 + (r.bloqueadoMs ?? 0) / 10 + (r.webgl ?? 0) * 50;
res.sort((a, b) => custo(b) - custo(a));
console.log(`\n\nTop ${TOP} mais caras (CPU ${CPU}x):`);
console.table(res.slice(0, TOP));
writeFileSync(ARQ, JSON.stringify({ url: URL_BASE, cpu: CPU, res }, null, 2));
console.log(`→ ${ARQ}`);
