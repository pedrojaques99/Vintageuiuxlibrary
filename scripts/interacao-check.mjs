#!/usr/bin/env node
/**
 * Portão: a peça RESPONDE ao gesto, pelo mouse e pelo teclado, sem erro.
 *
 * Tipos, build, palco centrado e instalação limpa provam que a peça existe. Não
 * provam que ela funciona: uma mola que nunca dispara, um `onKeyDown` que não
 * chega, um arrasto que joga exceção só aparecem quando alguém mexe. A colheita
 * de 24 peças foi escrita por agentes que não podiam abrir a vitrine; este
 * script é a mão que mexe em todas.
 *
 * Pra cada peça, na rota solo (`/c/<nome>?solo=1`):
 *   1. clique no primeiro controle  → a tela tem de mudar
 *   2. teclado: Tab até um controle, foco VISÍVEL (outline ou box-shadow),
 *      depois setas, Enter, Espaço  → a tela tem de mudar
 *   3. arrasto horizontal sobre a peça (pra quem é de gesto)
 *   4. Esc
 * e em toda a sessão: nenhum `pageerror` nem `console.error`.
 *
 * "Mudar" = o screenshot da peça antes e depois do gesto não é idêntico.
 *
 *   node scripts/interacao-check.mjs nome nome…      # dev server em :5182
 *   node scripts/interacao-check.mjs --colheita
 *   node scripts/interacao-check.mjs --todas         # o acervo inteiro
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE ?? "http://localhost:5182";
const args = process.argv.slice(2);
let nomes = args.filter((a) => !a.startsWith("--"));
if (args.includes("--todas")) {
  const src = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");
  nomes = [
    ...src
      .slice(src.indexOf("export const CATALOG"))
      .matchAll(/^\s{4}name: "([^"]+)",([\s\S]*?)(?=^\s{4}name: "|^\];)/gm),
  ]
    .filter((m) => /\n\s{4}demo: /.test(m[2]))
    .map((m) => m[1]);
}
if (args.includes("--colheita"))
  nomes = readdirSync(join(ROOT, "colheita"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(ROOT, "colheita", f), "utf8")).catalogo.name);

/** Gestos que não mudam a tela pra peças que só reagem a um tipo de entrada. */
const SO_PONTEIRO = new Set(["heat-word", "tilt-card", "magnify-dock", "fog-tree"]);

/** Gritos combinados, escritos nos dois lados (ver tests/vitrine.spec.ts). */
const AVISO_COMBINADO = /\[OctahedronLoader\]/;

const nav = await chromium.launch();
const resultados = [];

async function medir(nome, r) {
  const ctx = await nav.newContext({ viewport: { width: 900, height: 700 } });
  const p = await ctx.newPage();
  const erros = r.erros;
  p.on("pageerror", (e) => erros.push("pageerror: " + String(e).slice(0, 160)));
  p.on("console", (m) => m.type() === "error" && !AVISO_COMBINADO.test(m.text()) && erros.push("console: " + m.text().slice(0, 160)));

  await p.goto(`${BASE}/c/${nome}?solo=1&dark=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const raiz = p.locator("#root");
  const foto = async () => (await raiz.screenshot()).toString("base64");
  const assentar = () => p.waitForTimeout(700);

  // 1. clique
  const controle = p.locator("button, [role=switch], [role=slider], [role=radio], [role=combobox], input").first();
  if (await controle.count()) {
    const antes = await foto();
    await controle.click({ timeout: 3000 }).catch(() => {});
    await assentar();
    r.clique = (await foto()) !== antes;
    await p.keyboard.press("Escape");
    await assentar();
  }

  // 2. teclado
  await p.goto(`${BASE}/c/${nome}?solo=1&dark=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await p.keyboard.press("Tab");
  await p.waitForTimeout(250);
  r.foco = await p.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "nada focou";
    const cs = getComputedStyle(el);
    const anel = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
    // O anel pode morar num ancestral (`has-[:focus-visible]`).
    let pai = el.parentElement;
    let anelPai = false;
    for (let i = 0; i < 3 && pai; i++, pai = pai.parentElement) {
      const c = getComputedStyle(pai);
      if (c.boxShadow && c.boxShadow !== "none") anelPai = true;
    }
    return anel || anelPai ? "visível" : `sem anel em ${el.tagName.toLowerCase()}`;
  });
  {
    /*
     * Uma foto depois de CADA tecla, não só no fim: Enter abre e Espaço fecha
     * (expandable-card, folding-bill), e comparar só o começo com o fim dizia
     * "o teclado não faz nada" de um controle que funciona duas vezes.
     * O Tab extra alcança o segundo controle (o "Anual" do slot-text), e o
     * Enter segurado é o gesto do hold-to-confirm.
     */
    const antes = await foto();
    let mudou = false;
    const olhar = async () => {
      await p.waitForTimeout(260);
      if (!mudou && (await foto()) !== antes) mudou = true;
    };
    for (const k of ["ArrowRight", "ArrowDown", "Enter"]) {
      await p.keyboard.press(k);
      await olhar();
    }
    await p.keyboard.press("Tab");
    await p.keyboard.press("Enter");
    await olhar();
    await p.keyboard.press("Shift+Tab");
    await p.keyboard.down("Enter");
    await p.waitForTimeout(1600);
    await olhar();
    await p.keyboard.up("Enter");
    r.teclado = mudou;
    await p.keyboard.press("Escape");
  }

  /*
   * 2b. TODO focável tem de mostrar que está focado — medido em pixel.
   *
   * O teste de estilo (outline/box-shadow) errava pros dois lados: no Tailwind
   * v4, `outline-none` + `focus-visible:outline-2` dá um outline de estilo
   * `none` (invisível) e passava; um polegar de range com anel próprio, ou uma
   * borda que acende, não passava. Aqui é a região do elemento fotografada com
   * foco de teclado e sem foco: se nada muda, ninguém vê onde o teclado está.
   */
  {
    await p.goto(`${BASE}/c/${nome}?solo=1&dark=1`, { waitUntil: "networkidle" });
    await p.waitForTimeout(900);
    // O mouse sai do caminho: parado sobre um controle, o anel de HOVER (o
    // polegar do Slider do shadcn usa o mesmo `ring-4` nos dois) já aparece
    // nas duas fotos e o foco parecia não mudar nada.
    await p.mouse.move(0, 0);
    await p.keyboard.press("Shift"); // a próxima `.focus()` conta como teclado: :focus-visible
    const focaveis = await p.evaluate(() => {
      const sel = 'a[href],button:not([disabled]),input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"]),[role=slider],[role=switch]';
      return [...document.querySelectorAll(`#root ${sel.split(",").join(",#root ")}`)]
        // `tabindex="-1"` saiu da ordem de Tab de propósito: não é parada de teclado.
        .filter((e) => e.getAttribute("tabindex") !== "-1" && !e.closest("[inert]") && !e.closest('[aria-hidden="true"]'))
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; })
        .slice(0, 12)
        .map((e, i) => { e.setAttribute("data-foco-i", String(i)); return i; });
    });
    r.semAnel = [];
    // Controle que só o mouse alcança: cursor de gesto num elemento que não recebe foco.
    r.semTeclado = await p.evaluate(() => {
      const gesto = /^(pointer|grab|grabbing|ns-resize|ew-resize|col-resize|row-resize|move|crosshair)$/;
      const focavel = (e) => e.matches('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
      return [...document.querySelectorAll("#root *")]
        .filter((e) => gesto.test(getComputedStyle(e).cursor) && !focavel(e) && !e.closest("a[href],button,input,[tabindex]:not([tabindex='-1'])"))
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 8 && r.height > 8; })
        .filter((e) => !(e.parentElement && gesto.test(getComputedStyle(e.parentElement).cursor)))
        .slice(0, 4)
        .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(" ").slice(0, 2).join(".")}(${getComputedStyle(e).cursor})`);
    });
    for (const i of focaveis) {
      const alvo = p.locator(`[data-foco-i="${i}"]`);
      await alvo.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
      const caixa = await alvo.boundingBox({ timeout: 2000 }).catch(() => null);
      if (!caixa) continue;
      // A tela inteira, não um recorte em volta do elemento: o indicador pode
      // morar num ancestral (a placa do showcase-card acende com
      // `group-focus-within`) ou num irmão, e o recorte não o via.
      const vp = p.viewportSize();
      const clip = { x: 0, y: 0, width: vp.width, height: vp.height };
      // Elemento que some ao ganhar foco (abre outra coisa, remonta) não trava a peça.
      const ok = await alvo.evaluate((e) => e.blur(), undefined, { timeout: 2000 }).then(() => true, () => false);
      if (!ok) continue;
      await p.waitForTimeout(260);
      const sem = (await p.screenshot({ clip })).toString("base64");
      await p.keyboard.press("Shift");
      if (!(await alvo.evaluate((e) => e.focus(), undefined, { timeout: 2000 }).then(() => true, () => false))) continue;
      await p.waitForTimeout(260);
      const com = (await p.screenshot({ clip })).toString("base64");
      if (sem === com) {
        r.semAnel.push(
          await alvo
            .evaluate((e) => `${e.tagName.toLowerCase()}${e.getAttribute("aria-label") ? `"${e.getAttribute("aria-label")}"` : ""}.${String(e.className).split(" ").slice(0, 3).join(".")}`, undefined, { timeout: 2000 })
            .catch(() => "elemento que some ao focar"),
        );
      }
      await alvo.evaluate((e) => e.blur(), undefined, { timeout: 2000 }).catch(() => {});
    }
  }

  // 3. arrasto horizontal sobre o centro da peça
  {
    await p.goto(`${BASE}/c/${nome}?solo=1&dark=1`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1000);
    // O centro da PEÇA (o maior filho da demo), não do `#root`, que é a página toda.
    const caixa = await p.evaluate(() => {
      const nos = [...document.querySelectorAll("#root *")].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 40 && r.height > 40 && r.width < innerWidth - 2;
      });
      const r = (nos[0] ?? document.querySelector("#root")).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    const cx = caixa.x + caixa.width / 2;
    const cy = caixa.y + caixa.height / 2;
    // Hover antes do arrasto: peça de ponteiro (heat-word, tilt-card) reage ao mover.
    await p.mouse.move(cx - 30, cy - 10);
    await p.mouse.move(cx + 30, cy + 10, { steps: 6 });
    await p.waitForTimeout(200);
    const antes = await foto();
    await p.mouse.move(cx - 60, cy);
    await p.mouse.down();
    for (let i = 1; i <= 8; i++) await p.mouse.move(cx - 60 + i * 20, cy, { steps: 2 });
    await p.waitForTimeout(120);
    const durante = await foto();
    await p.mouse.up();
    await assentar();
    r.arrasto = durante !== antes || (await foto()) !== antes;
  }

  await ctx.close();
}

let falhas = 0;
/** Imprime uma peça assim que ela termina: uma peça que trava não apaga as outras. */
function relatar(r) {
  const probs = [];
  if (r.erros.length) probs.push(...r.erros);
  if (r.quebrou) probs.push(`o teste quebrou nesta peça: ${r.quebrou}`);
  // Peça sem nada focável é de exibição: não se cobra foco nem teclado dela.
  const exibicao = r.foco === "nada focou";
  if (r.semAnel?.length) probs.push(`foco invisível em: ${r.semAnel.join(", ")}`);
  // Só é "controle sem teclado" quando a peça não tem NENHUM caminho de teclado:
  // num composto (trilho + polegar, grade + células com roving) o pedaço de
  // ponteiro é atalho, e o teclado entra por outro elemento.
  if (r.semTeclado?.length && exibicao && !SO_PONTEIRO.has(r.nome))
    probs.push(`controle sem teclado: ${r.semTeclado.join(", ")}`);
  const algumGesto = r.clique || r.teclado || r.arrasto;
  if (!algumGesto && !exibicao) probs.push("nenhum gesto mudou a tela");
  if (!SO_PONTEIRO.has(r.nome) && !exibicao && r.teclado === false) probs.push("teclado não mudou nada");
  if (probs.length) falhas++;
  console.log(
    `${probs.length ? "✗" : "✓"} ${r.nome.padEnd(18)} clique:${r.clique ?? "-"} teclado:${r.teclado} arrasto:${r.arrasto} foco:${r.foco}` +
      (probs.length ? `\n    ${probs.join("\n    ")}` : ""),
  );
}

for (const nome of nomes) {
  const r = { nome, clique: null, teclado: null, foco: null, arrasto: null, erros: [] };
  try {
    await medir(nome, r);
  } catch (e) {
    r.quebrou = String(e.message).split("\n")[0].slice(0, 120);
  }
  resultados.push(r);
  relatar(r);
}
await nav.close();

console.log(`\n${resultados.length - falhas}/${resultados.length} peças respondem sem erro`);
process.exit(falhas ? 1 : 0);
