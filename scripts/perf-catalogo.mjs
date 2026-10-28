#!/usr/bin/env node
/**
 * Mede o custo do catálogo rolando a página inteira, em perfis de aparelho.
 *
 *   node scripts/perf-catalogo.mjs                       # produção, todos os perfis
 *   node scripts/perf-catalogo.mjs --url http://localhost:5182 --perfil celular
 *
 * O que sai, por perfil: erro de console, chunk 404, tarefas longas (>50ms),
 * pior quadro, quadros perdidos, contextos WebGL vivos no pico, peças vivas no
 * pico, heap JS e bytes de JS transferidos. Grava JSON em `perf/` pra comparar
 * antes e depois de cada rodada.
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const URL_BASE = arg("url", "https://ui.visantlabs.com");
const SO = arg("perfil", null);
const NIVEL = arg("nivel", null);
const EXTRA = arg("query", ""); // ex.: --query vivas=2

/*
 * `nivel` força o nível de aparelho (`src/app/aparelho.ts`). A emulação
 * estrangula a CPU mas não muda `hardwareConcurrency` nem `deviceMemory`, então
 * sem isto o "notebook" herdava os núcleos da máquina que mede e caía no nível
 * alto. O celular não precisa: toque e tela estreita já são emulados.
 */
const PERFIS = {
  desktop: { device: devices["Desktop Chrome"], cpu: 1 },
  notebook: { device: devices["Desktop Chrome"], cpu: 4, nivel: "medio" },
  celular: { device: devices["Pixel 7"], cpu: 6 },
};

async function medir(nome, { device, cpu, nivel }) {
  const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  const erros = [];
  const notFound = [];
  let jsBytes = 0;
  page.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));
  page.on("response", async (r) => {
    if (r.status() === 404) notFound.push(r.url());
    if (r.url().endsWith(".js")) jsBytes += Number(r.headers()["content-length"] || 0);
  });

  // Conta contexto WebGL criado e perdido, e tarefa longa, antes de qualquer script da página.
  await page.addInitScript(() => {
    const w = window;
    w.__perf = { gl: 0, glPico: 0, longas: [], quadros: [] };
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...a) {
      const c = orig.call(this, t, ...a);
      if (c && /webgl/.test(t) && !this.__contado) {
        this.__contado = true;
        w.__perf.gl++;
        w.__perf.glPico = Math.max(w.__perf.glPico, w.__perf.gl);
        this.addEventListener("webglcontextlost", () => w.__perf.gl--);
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

  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

  const t = Date.now();
  await page.goto(URL_BASE + "/?" + [nivel && `nivel=${nivel}`, EXTRA].filter(Boolean).join("&"), { waitUntil: "networkidle", timeout: 90_000 });
  const carregou = Date.now() - t;

  // Rola em passos de meia tela, como alguém lendo, e anota o pico de peças vivas.
  let vivasPico = 0;
  const altura = await page.evaluate(() => document.documentElement.scrollHeight);
  const passo = Math.round((device.viewport?.height ?? 800) / 2);
  for (let y = 0; y < altura; y += passo) {
    await page.mouse.wheel(0, passo);
    await page.waitForTimeout(250);
    vivasPico = Math.max(vivasPico, await page.evaluate(() => document.querySelectorAll("[data-viva]").length));
  }
  await page.waitForTimeout(1000);

  const r = await page.evaluate(() => {
    const p = window.__perf;
    const q = p.quadros.slice(5);
    return {
      tarefasLongas: p.longas.length,
      tempoBloqueadoMs: Math.round(p.longas.reduce((s, d) => s + Math.max(0, d - 50), 0)),
      piorQuadroMs: Math.round(Math.max(...q)),
      quadrosPerdidosPct: Math.round((q.filter((d) => d > 33).length / q.length) * 100),
      webglVivos: p.gl,
      webglPico: p.glPico,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
      pecas: document.querySelectorAll("[data-name]").length,
    };
  });
  await browser.close();
  return { perfil: nome, cpu, carregouMs: carregou, vivasPico, jsKB: Math.round(jsBytes / 1024), ...r, notFound, erros };
}

const saida = [];
for (const [nome, p] of Object.entries(PERFIS)) {
  if (SO && SO !== nome) continue;
  process.stdout.write(`medindo ${nome}… `);
  const r = await medir(nome, NIVEL ? { ...p, nivel: NIVEL } : p);
  saida.push(r);
  const { notFound, erros, ...resumo } = r;
  console.log(JSON.stringify(resumo));
  if (notFound.length) console.log("  404:", notFound.slice(0, 5));
  if (erros.length) console.log("  erros:", erros.slice(0, 5));
}
mkdirSync("perf", { recursive: true });
const arq = `perf/catalogo-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
writeFileSync(arq, JSON.stringify({ url: URL_BASE, saida }, null, 2));
console.log(`→ ${arq}`);
