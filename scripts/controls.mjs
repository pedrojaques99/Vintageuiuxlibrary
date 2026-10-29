#!/usr/bin/env node
/**
 * Os knobs da vitrine saem das props, não da mão de ninguém.
 *
 * O card responde "isso existe?" e o palco responde "como é?". Falta a terceira
 * pergunta, que é a que decide se a peça entra no projeto: **"serve pro meu
 * caso?"** — e essa só se responde mexendo. Daí o painel de controles.
 *
 * Escrever a spec de controle à mão nos 78 itens seria a mesma armadilha da
 * tabela de props escrita à mão: envelhece na primeira prop nova. Então aqui o
 * controle é *derivado* do `props.generated.json`, que por sua vez é derivado do
 * TypeScript dos arquivos que o `shadcn add` entrega. A cadeia inteira tem uma
 * fonte só.
 *
 * A derivação automática acerta o tipo do controle mas não conhece intenção:
 * ela não sabe que `intensity` só faz sentido entre 0 e 1, nem que `finish`
 * merece aparecer antes de `gap`. Para isso existe `src/app/controls.overrides.json`,
 * que ajusta **só o que o automático errou** — nunca reescreve a lista inteira,
 * senão volta a envelhecer.
 *
 * Saída: `src/app/controls.generated.json`, consumido por três lugares que não
 * podem divergir:
 *
 *   1. o painel `Customize` na página do item;
 *   2. o snippet de uso, que mostra só o que fugiu do padrão;
 *   3. o `llms.txt` / MCP, que descreve a peça pra um agente.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");

const props = JSON.parse(readFileSync(join(APP, "props.generated.json"), "utf8"));
const overrides = JSON.parse(readFileSync(join(APP, "controls.overrides.json"), "utf8"));

/*
 * O que a demo já passa (ver `scripts/demo-props.mjs`).
 *
 * Vira o valor INICIAL do knob, e o padrão do componente continua registrado à
 * parte. Os dois números são diferentes e os dois importam: o inicial é o que
 * está no palco — sem ele o painel diz `fade: off` embaixo de um trilho com
 * fade — e o padrão é o que a pessoa recebe ao instalar, que é contra o que o
 * snippet de uso compara pra decidir o que precisa ser escrito.
 */
const daDemo = JSON.parse(readFileSync(join(APP, "demos.props.generated.json"), "utf8"));

/**
 * Props que existem em quase todo componente e não dizem nada sobre a peça.
 *
 * `className` e `style` são a porta de fuga do design system — dar um campo de
 * texto pra elas convida a vitrine a virar editor de CSS, que é exatamente o
 * que a library existe pra evitar.
 */
const NUNCA = new Set([
  "className",
  "style",
  "children",
  "id",
  "ref",
  "key",
  "asChild",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
]);

/** Handler, render prop, dado de fixture: nada disso vira knob. */
const naoEhKnob = (p) =>
  NUNCA.has(p.nome) ||
  /^on[A-Z]/.test(p.nome) ||
  /^render[A-Z]/.test(p.nome) ||
  /=>/.test(p.tipo) ||
  /\[\]$/.test(p.tipo) ||
  p.tipo === "any" ||
  p.tipo === "unknown" ||
  p.tipo === "ReactNode" ||
  p.tipo === "ReactElement";

/** `"24"` → `24`; `"true"` → `true`; `"'mono'"` → `"mono"`. */
function valorPadrao(bruto, tipo) {
  if (bruto === null || bruto === undefined) return null;
  const s = String(bruto).trim();
  if (s === "" || s === "undefined" || s === "null") return null;
  if (tipo === "boolean") return s === "true";
  if (tipo === "number") return Number.isFinite(Number(s)) ? Number(s) : null;
  return s.replace(/^["'`]|["'`]$/g, "");
}

/** Props em que o fundo da faixa não é um estado válido, é um defeito. */
const NAO_ZERA = /speed|duration|count|columns|rows|size|scale|per|interval|fps|length|width|height/i;

/**
 * A faixa de um slider quando ninguém declarou `@min` / `@max`.
 *
 * Chutar `0..100` num `opacity` cujo padrão é `0.4` dá um controle inútil: 99
 * das 100 posições quebram a peça. A heurística lê a ordem de grandeza do
 * padrão, que é a única pista honesta que o código dá.
 */
function faixaHeuristica(nome, padrao) {
  const faixa =
    padrao === null
      ? { min: 0, max: 100, step: 1 }
      : (() => {
          const abs = Math.abs(padrao);
          if (abs > 0 && abs <= 1) return { min: 0, max: 1, step: 0.05 };
          if (abs <= 10) return { min: 0, max: 20, step: 1 };
          if (abs <= 100) return { min: 0, max: Math.ceil((abs * 2.5) / 10) * 10, step: 1 };
          return { min: 0, max: Math.ceil((abs * 2) / 100) * 100, step: 10 };
        })();

  // Zero em `speed` vira divisão por zero; em `columns`, grade sem coluna. São
  // as poucas props onde o fundo da faixa não é um estado, é um defeito.
  if (padrao !== null && padrao > 0 && NAO_ZERA.test(nome)) faixa.min = faixa.step;
  return faixa;
}

/**
 * A ordem em que os knobs aparecem.
 *
 * Escolha e chave primeiro porque cada clique muda a peça de forma visível — é
 * o que faz a pessoa entender que o painel funciona. Texto por último porque
 * mexer nele é digitar, não brincar.
 */
const PESO = { escolha: 0, chave: 1, numero: 2, texto: 3 };

/** Quantos knobs cabem antes de virar painel de aeronave. */
const DESTAQUE = 6;

function controleDe(p) {
  if (naoEhKnob(p)) return null;
  const padrao = valorPadrao(p.padrao, p.tipo);
  const resumo = p.descricao?.split("\n")[0]?.trim() || null;

  if (p.valores?.length) {
    return { prop: p.nome, tipo: "escolha", valores: p.valores, padrao, resumo };
  }
  if (p.tipo === "boolean") {
    return { prop: p.nome, tipo: "chave", padrao: padrao ?? false, resumo };
  }
  if (p.tipo === "number") {
    return { prop: p.nome, tipo: "numero", ...(p.faixa ?? faixaHeuristica(p.nome, padrao)), padrao, resumo };
  }
  if (p.tipo === "string") {
    return { prop: p.nome, tipo: "texto", padrao, resumo };
  }
  return null;
}

/** `{ min, max, step, valores, rotulo, ... }` do override, por cima do derivado. */
function aplicarAjustes(controle, ajuste) {
  if (!ajuste) return controle;
  const junto = { ...controle, ...ajuste };
  // Padrão continua sendo o do código: o override existe pra corrigir a FAIXA,
  // não pra mentir sobre o que o componente faz quando ninguém passa nada.
  junto.padrao = controle.padrao;
  return junto;
}

const saida = {};
let totalControles = 0;
let itensComPainel = 0;

for (const [item, componentes] of Object.entries(props)) {
  const over = overrides[item] ?? {};
  const esconder = new Set(over.esconder ?? []);
  const ordem = over.ordem ?? [];

  const mapa = {};

  for (const comp of componentes) {
    const controles = comp.props
      .filter((p) => !esconder.has(p.nome))
      .map(controleDe)
      .filter(Boolean)
      .map((c) => aplicarAjustes(c, over.ajustes?.[c.prop]))
      .map((c) => {
        const noPalco = daDemo[item]?.[c.prop];
        if (noPalco === undefined || noPalco === c.padrao) return c;

        const com = { ...c, inicial: noPalco };

        /*
         * A faixa tem de caber o que está no palco.
         *
         * A heurística lê a ordem de grandeza do padrão do COMPONENTE, e o
         * `measure-picker` tem `min` sem padrão (faixa 0–100) enquanto a demo
         * passa 130. O slider nascia encostado no fim do curso, sem nenhuma
         * posição pra direita — um controle que só anda pra um lado lê como
         * quebrado, e a culpa não é da peça.
         */
        if (com.tipo === "numero" && typeof noPalco === "number") {
          if (noPalco > (com.max ?? 0)) com.max = Math.ceil((noPalco * 1.5) / 10) * 10;
          if (noPalco < (com.min ?? 0)) com.min = Math.floor(noPalco / 2);
        }
        return com;
      })
      .sort((a, b) => {
        const ia = ordem.indexOf(a.prop);
        const ib = ordem.indexOf(b.prop);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        return PESO[a.tipo] - PESO[b.tipo] || a.prop.localeCompare(b.prop);
      });

    if (!controles.length) continue;

    // Os que passam do corte não somem: ficam atrás de "mais controles". Sumir
    // com prop pública seria a vitrine mentindo por omissão.
    controles.forEach((c, i) => {
      if (i >= DESTAQUE) c.secundario = true;
    });

    mapa[comp.nome] = controles;
    totalControles += controles.length;
  }

  if (!Object.keys(mapa).length) continue;

  saida[item] = {
    componentes: mapa,
    ...(over.presets?.length ? { presets: over.presets } : {}),
  };
  itensComPainel++;
}

writeFileSync(join(APP, "controls.generated.json"), JSON.stringify(saida, null, 2) + "\n");

const comPreset = Object.values(saida).filter((i) => i.presets).length;
const comInicial = Object.values(saida)
  .flatMap((i) => Object.values(i.componentes).flat())
  .filter((c) => "inicial" in c).length;
console.log(
  `controles derivados: ${totalControles} em ${itensComPainel} itens ` +
    `(${comInicial} nascem do palco, ${comPreset} com presets) → src/app/controls.generated.json`,
);
