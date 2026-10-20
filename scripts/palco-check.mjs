#!/usr/bin/env node
/**
 * Portão: toda peça do acervo aparece centrada no ladrilho, e nenhuma vaza.
 *
 * Nasceu de um print com o carrossel e o livro fora do centro e o trilho
 * "bugado" na grade. Nada no projeto via isso: o ladrilho é uma caixa `w×h`
 * declarada no catálogo, e cada demo decide sozinha como ocupa a caixa — umas
 * encostam no topo, outras pintam além da borda, outras são mais altas que o
 * `h` declarado. Só a medida da tela mostra.
 *
 * Como mede: abre o acervo (`/`), rola até o fim pra montar cada peça (elas
 * montam perto da tela), e pra cada ladrilho vivo junta a caixa de tudo o que
 * PINTA dentro do palco (folha, fundo, borda — o mesmo critério da captura),
 * recortada por quem recorta. Daí sai:
 *
 *   dx, dy      deslocamento do centro da tinta em relação ao centro do ladrilho,
 *               em fração do ladrilho (0,05 = 5%)
 *   transborda  quanto a demo é mais alta que a caixa declarada (px da demo)
 *
 * Precisa do dev server (ou de um preview) no ar:
 *
 *   node scripts/palco-check.mjs                     # http://localhost:5182
 *   node scripts/palco-check.mjs http://localhost:5199
 *
 * Exceção escrita, em src/app/catalog.tsx, na entrada da peça:
 *   // palco-check: motivo de verdade
 * (peça que é descentrada DE PROPÓSITO, como um trilho que sangra pela direita)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:5182";
const LIMITE = 0.05;
/*
 * Até 10px de "mais alta que a caixa" é folga de baseline (canvas em linha,
 * `h-full` com margem), recortada pela caixa e invisível — e ela CRESCE junto
 * com a caixa, então subir o `h` nunca a zerava. Acima disso é peça cortada.
 */
const SOBRA = 10;

/* As peças com exceção escrita no catálogo, com o motivo junto. */
const catalogo = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");
const isentas = new Map(
  [...catalogo.matchAll(/^\s{4}name: "([^"]+)",([\s\S]*?)(?=^\s{4}name: "|^\];)/gm)]
    .map(([, nome, corpo]) => [nome, corpo.match(/\/\/ palco-check: (.{8,})/)?.[1]])
    .filter(([, motivo]) => motivo),
);

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
await pagina.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pagina.waitForSelector("article[data-name]");

const medidas = await pagina.evaluate(async () => {
  const out = new Map();
  const de = document.documentElement;
  const pinta = (el, cs) => {
    if (!el.children.length) return true;
    if (cs.backgroundImage !== "none") return true;
    const m = cs.backgroundColor.match(/[\d.]+/g);
    if (m && (m.length < 4 || +m[3] > 0.02)) return true;
    return ["Top", "Right", "Bottom", "Left"].some(
      (l) => parseFloat(cs[`border${l}Width`]) > 0 && cs[`border${l}Style`] !== "none",
    );
  };
  // A caixa visível de um nó: a dele, recortada por cada ancestral que recorta.
  const recortada = (el, ate) => {
    let r = el.getBoundingClientRect();
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowX !== "visible" || o.overflowY !== "visible") {
        const k = p.getBoundingClientRect();
        r = {
          left: Math.max(r.left, k.left),
          right: Math.min(r.right, k.right),
          top: Math.max(r.top, k.top),
          bottom: Math.min(r.bottom, k.bottom),
        };
      }
      if (p === ate) break;
    }
    return r;
  };

  for (let y = 0; y < de.scrollHeight; y += 300) {
    window.scrollTo(0, y);
    /* Espera a peça PINTAR, não só montar: o ladrilho só apaga a foto de
       espera depois do primeiro quadro da peça viva. Medir antes disso mede o
       palco vazio — que foi exatamente o falso alarme da primeira versão. */
    const prontas = () =>
      [...document.querySelectorAll("article[data-viva]")].every((a) => {
        const foto = a.querySelector("[data-palco] > div > img");
        return !foto || getComputedStyle(foto).opacity === "0";
      });
    for (let t = 0; t < 40 && !prontas(); t++) await new Promise((r) => setTimeout(r, 150));
    await new Promise((r) => setTimeout(r, 400));
    for (const a of document.querySelectorAll("article[data-viva]")) {
      if (out.has(a.dataset.name)) continue;
      /* Só o ladrilho inteiro NA TELA. Os que montaram na margem ainda não
         viram o viewport, e peça com entrada por `inView` está em opacidade 0
         ali — medida, daria "palco vazio" sem estar. */
      const r = a.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) continue;
      const palco = a.querySelector("[data-palco]");
      if (!palco) continue;
      const caixa = palco.firstElementChild;
      const ladrilho = palco.getBoundingClientRect();
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      const visitar = (el) => {
        // A foto de espera mora na mesma caixa; ela não é a peça.
        if (el.tagName === "IMG" && el.parentElement === caixa) return;
        const r0 = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const visivel =
          r0.width > 0 && r0.height > 0 && cs.visibility !== "hidden" && +cs.opacity > 0.02;
        if (visivel && pinta(el, cs)) {
          const r = recortada(el, caixa);
          if (r.right > r.left && r.bottom > r.top) {
            x1 = Math.min(x1, r.left);
            y1 = Math.min(y1, r.top);
            x2 = Math.max(x2, r.right);
            y2 = Math.max(y2, r.bottom);
          }
        }
        if (visivel) for (const f of el.children) visitar(f);
      };
      for (const f of caixa.children) visitar(f);
      if (!Number.isFinite(x1)) {
        out.set(a.dataset.name, { vazio: true });
        continue;
      }
      out.set(a.dataset.name, {
        dx: ((x1 + x2) / 2 - (ladrilho.left + ladrilho.right) / 2) / ladrilho.width,
        dy: ((y1 + y2) / 2 - (ladrilho.top + ladrilho.bottom) / 2) / ladrilho.height,
        transborda: caixa.scrollHeight - caixa.clientHeight,
      });
    }
  }
  return [...out.entries()];
});

await navegador.close();

const ruins = medidas.filter(
  ([nome, m]) =>
    !isentas.has(nome) &&
    (m.vazio || Math.abs(m.dx) > LIMITE || Math.abs(m.dy) > LIMITE || m.transborda > SOBRA),
);

console.log(`palco-check: ${medidas.length} peças medidas, ${isentas.size} com exceção escrita`);
for (const [nome, m] of ruins) {
  if (m.vazio) console.log(`  ${nome}: palco vazio`);
  else
    console.log(
      `  ${nome}: centro ${(m.dx * 100).toFixed(0)}% x, ${(m.dy * 100).toFixed(0)}% y` +
        (m.transborda > SOBRA ? `, ${m.transborda}px mais alta que a caixa` : ""),
    );
}
/*
 * `--fix`: a parte mecânica, que é subir o `h` de quem transborda.
 *
 * Demo mais alta que a caixa é dado errado no catálogo, não decisão de desenho:
 * o `preview` declarado é o tamanho natural da peça. Sobe pro que ela mede, mais
 * 8px de respiro, arredondado pra dezena. Descentramento (dx/dy) NÃO tem conserto
 * automático — é a demo que não centra, e quem decide é quem lê a demo.
 */
if (process.argv.includes("--fix")) {
  let src = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");
  const consertadas = [];
  for (const [nome, m] of ruins) {
    if (!(m.transborda > SOBRA)) continue;
    const re = new RegExp(
      `(name: "${nome}",[\\s\\S]*?preview: \\{ w: \\d+, h: )(\\d+)( \\})`,
    );
    src = src.replace(re, (_, antes, h, depois) => {
      const novo = Math.ceil((Number(h) + m.transborda + 8) / 10) * 10;
      consertadas.push(`${nome}: h ${h} → ${novo}`);
      return `${antes}${novo}${depois}`;
    });
  }
  writeFileSync(join(ROOT, "src", "app", "catalog.tsx"), src);
  for (const c of consertadas) console.log(`  consertado ${c}`);
  console.log(`\n--fix: ${consertadas.length} preview(s) ajustado(s). Rode de novo pra conferir, e`);
  console.log("refaça a foto delas: npm run build && npm run build:shots -- --force --only <nome>");
}

if (ruins.length) {
  console.log(`\n${ruins.length} peça(s) fora do centro. Ajuste a demo ou o preview do catálogo.`);
  process.exit(1);
}
console.log("todas centradas");
