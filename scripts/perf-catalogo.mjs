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

/*
 * GPU real por padrão. O Chromium headless desenha WebGL com SwiftShader (GPU
 * emulada na CPU), e o perfil desktop chegou a medir renderização por software,
 * quando quem visita tem GPU. `--sem-gpu` volta ao SwiftShader, que é o caso real de
 * VM, driver bloqueado e desktop remoto (o `aparelho.ts` põe esses no médio).
 */
const ARGS_GPU = process.argv.includes("--sem-gpu") ? [] : ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=default"];

/*
 * `--janela`: Chrome com janela de verdade. É o número que vale para o desktop.
 * Calibrado na mesma máquina e na mesma rolagem do nível alto: janela + GPU deu
 * 13–19% de quadros lentos; headless + GPU, 35% (o headless desenha fora da tela
 * e copia cada quadro); headless + SwiftShader, 22% (mede outra máquina). Parado,
 * os três dão 60 fps. Headless continua sendo o padrão porque CI não tem tela, e
 * para notebook e celular, que são limitados pela CPU estrangulada, a diferença
 * de modo não muda a leitura.
 *
 * Com `--janela`, não cubra a janela de teste: o Chrome estrangula janela
 * encoberta para 1 quadro por segundo, e a medição se enche de tarefas longas de
 * ~1.012 ms que não são da página.
 */
const JANELA = process.argv.includes("--janela");

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
  const browser = await chromium.launch({ headless: !JANELA, args: ["--enable-precise-memory-info", ...ARGS_GPU] });
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

/*
 * `--teto`: julga contra o orçamento do PLANO-PERFORMANCE.md e sai com código 1
 * se passar. É o que o `ship` chama depois do deploy. Desktop fica de fora: o
 * headless não mede o desktop direito (ver `--janela`).
 */
const TETO = { celular: 20, notebook: 10 };
if (process.argv.includes("--teto")) {
  const falhas = [];
  for (const r of saida) {
    if (TETO[r.perfil] != null && r.quadrosPerdidosPct >= TETO[r.perfil])
      falhas.push(`${r.perfil}: ${r.quadrosPerdidosPct}% de quadros lentos (teto ${TETO[r.perfil]}%)`);
    const erros = r.erros.filter((e) => !/Failed to load resource/.test(e));
    if (erros.length) falhas.push(`${r.perfil}: ${erros.length} erro(s) de console — ${erros[0]}`);
    const chunks = r.notFound.filter((u) => u.includes("/assets/"));
    if (chunks.length) falhas.push(`${r.perfil}: chunk 404 — ${chunks[0]}`);
  }
  if (falhas.length) {
    console.log("\n✗ fora do orçamento:\n  " + falhas.join("\n  "));
    process.exit(1);
  }
  console.log("\n✓ dentro do orçamento de performance");
}
