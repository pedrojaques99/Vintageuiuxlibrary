#!/usr/bin/env node
/**
 * O portão dos controles: preset que não bate com a peça não passa.
 *
 * Um preset é um punhado de pares `prop: valor` escritos à mão num JSON. Nada
 * no TypeScript olha pra ele, e o modo de falha é silencioso da pior forma: o
 * chip aparece na ficha, a pessoa clica, e **nada acontece** — porque a prop foi
 * renomeada, ou porque o valor caiu fora da faixa do slider, ou porque o membro
 * da união deixou de existir. Ninguém reporta "cliquei e não mudou"; a pessoa
 * conclui que a peça é frouxa e vai embora.
 *
 * Este script compara cada preset com os controles derivados do TypeScript da
 * própria peça. Quatro perguntas:
 *
 *   1. a prop existe entre os controles daquele item?
 *   2. o valor de uma escolha está entre os membros da união?
 *   3. o valor de um número cabe na faixa do slider?
 *   4. o valor de uma chave é booleano?
 *
 * E mais uma sobre o outro lado do contrato: item que declara `knobs` no
 * catálogo precisa ter a demo espalhando `props`, senão o painel monta e não
 * pilota nada.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");

const controles = JSON.parse(readFileSync(join(APP, "controls.generated.json"), "utf8"));
const catalogo = readFileSync(join(APP, "catalog.tsx"), "utf8");

const erros = [];

/**
 * O corpo de `function Nome(...)` dentro de um arquivo, por contagem de chaves.
 *
 * Regex de "tudo até a próxima `}`" quebra na primeira arrow interna. Contar é
 * chato e é a única forma que não erra.
 */
function corpoDaFuncao(fonte, nome) {
  const abre = fonte.indexOf(`function ${nome}(`);
  if (abre === -1) return null;

  /*
   * O corpo começa depois dos PARÂMETROS.
   *
   * `indexOf("{")` a partir do nome cai no `{` da desestruturação —
   * `function PadDemo({ props }: DemoProps)` — e o contador fecha em `{ props }`
   * achando que leu a função inteira. O portão então dizia que a demo não
   * espalha props enquanto ela espalhava três linhas abaixo.
   */
  let parens = 0;
  let fimDosParams = -1;
  for (let i = fonte.indexOf("(", abre); i < fonte.length; i++) {
    if (fonte[i] === "(") parens++;
    else if (fonte[i] === ")") {
      parens--;
      if (parens === 0) {
        fimDosParams = i;
        break;
      }
    }
  }
  if (fimDosParams === -1) return null;

  const inicio = fonte.indexOf("{", fimDosParams);
  if (inicio === -1) return null;

  let nivel = 0;
  for (let i = inicio; i < fonte.length; i++) {
    if (fonte[i] === "{") nivel++;
    else if (fonte[i] === "}") {
      nivel--;
      if (nivel === 0) return fonte.slice(abre, i + 1);
    }
  }
  return null;
}

/* ── 1. presets × controles ──────────────────────────────────────────────── */

for (const [item, dados] of Object.entries(controles)) {
  if (!dados.presets?.length) continue;

  // Todos os controles do item, de qualquer componente: o preset é do ITEM.
  const porProp = {};
  for (const lista of Object.values(dados.componentes)) {
    for (const c of lista) porProp[c.prop] = c;
  }

  for (const preset of dados.presets) {
    if (!preset.nome || !preset.props || typeof preset.props !== "object") {
      erros.push(`${item}: preset sem nome ou sem props`);
      continue;
    }
    const props = Object.entries(preset.props);

    if (!props.length) {
      erros.push(`${item} · ${preset.nome}: preset vazio — chip que não muda nada`);
    }

    /*
     * Preset de uma prop só quase sempre é ruído.
     *
     * Se a prop já aparece como trilho segmentado logo abaixo — e ela aparece
     * sempre que a união tem até quatro membros —, o chip é um segundo botão
     * pro mesmo clique, dois centímetros acima. A primeira leva de presets tinha
     * seis assim: "cartão / papel / marca" no `quote-block` repetia exatamente o
     * controle `tone`.
     *
     * A exceção é a união GRANDE, que vira `<select>`: ali o chip é um atalho de
     * verdade, porque o valor está escondido atrás de um menu.
     */
    if (props.length === 1) {
      const [prop] = props[0];
      const c = porProp[prop];
      const escondido = c?.tipo === "escolha" && c.valores.length > 4;
      if (c && !escondido) {
        erros.push(
          `${item} · ${preset.nome}: muda só "${prop}", que já está na tela como controle — ` +
            `preset serve pra combinar duas ou mais`,
        );
      }
    }

    for (const [prop, valor] of Object.entries(preset.props)) {
      const c = porProp[prop];
      if (!c) {
        erros.push(`${item} · ${preset.nome}: prop "${prop}" não é um controle deste item`);
        continue;
      }
      if (c.tipo === "escolha" && !c.valores.includes(String(valor))) {
        erros.push(
          `${item} · ${preset.nome}: ${prop}="${valor}" fora de [${c.valores.join(", ")}]`,
        );
      }
      if (c.tipo === "numero") {
        if (typeof valor !== "number") {
          erros.push(`${item} · ${preset.nome}: ${prop}=${JSON.stringify(valor)} não é número`);
        } else if (valor < c.min || valor > c.max) {
          erros.push(`${item} · ${preset.nome}: ${prop}=${valor} fora da faixa ${c.min}–${c.max}`);
        }
      }
      if (c.tipo === "chave" && typeof valor !== "boolean") {
        erros.push(`${item} · ${preset.nome}: ${prop}=${JSON.stringify(valor)} não é booleano`);
      }
    }
  }
}

/* ── 2. `knobs` no catálogo × `{...props}` na demo ───────────────────────── */

for (const m of catalogo.matchAll(/name: "([a-z0-9-]+)",/g)) {
  const fim = catalogo.indexOf("\n  {", m.index);
  const bloco = catalogo.slice(m.index, fim === -1 ? undefined : fim);
  const knobs = /knobs: "(\w+)",/.exec(bloco);
  if (!knobs) continue;

  const item = m[1];

  if (!controles[item]?.componentes?.[knobs[1]]) {
    erros.push(`${item}: declara knobs "${knobs[1]}", que não tem controles derivados`);
    continue;
  }

  /*
   * Onde a demo mora — e são três lugares.
   *
   * 1. arquivo próprio em `demos/`, quando o catálogo o importa;
   * 2. arrow inline no bloco do item (`demo: ({ props }) => …`);
   * 3. função nomeada em outro ponto do próprio `catalog.tsx` (`demo: PadDemo`).
   *
   * O caso 3 é o que passou batido e produziu um painel morto: o
   * `vintage-soundboard-pad` tem um arquivo em `demos/` que NINGUÉM importa, e o
   * catálogo desenha a peça com uma `PadDemo` local. Olhar só o bloco do item
   * dizia "não espalha props" quando a função certa espalhava — e olhar só o
   * arquivo órfão dizia o contrário. Os dois errados, por motivos opostos.
   */
  const arquivo = join(APP, "demos", `${item}-demo.tsx`);
  const importada = catalogo.includes(`./demos/${item}-demo`);

  let fonte;
  if (existsSync(arquivo) && importada) {
    fonte = readFileSync(arquivo, "utf8");
  } else {
    const nomeada = /demo: (\w+),/.exec(bloco);
    const corpo = nomeada
      ? corpoDaFuncao(catalogo, nomeada[1])
      : null;
    fonte = corpo ?? bloco;
  }

  // Também vale o resto desestruturado de `props`: a demo "um por vez" tira o
  // `variant` (quem manda nele é o seletor) e espalha o resto — `const {
  // variant, ...resto } = props ?? {}` e depois `{...resto}`. Isso pilota.
  const resto = /const \{[^}]*\.\.\.(\w+)\s*\}\s*=\s*\(?\s*props\b/.exec(fonte)?.[1];
  const espalha = fonte.includes("{...props}") || (resto && fonte.includes(`{...${resto}}`));
  if (!espalha) {
    erros.push(
      `${item}: declara knobs mas a demo não espalha props — o painel monta e não pilota nada`,
    );
  }
}

/* ── veredito ────────────────────────────────────────────────────────────── */

const comPresets = Object.values(controles).filter((i) => i.presets).length;
const totalPresets = Object.values(controles).reduce((n, i) => n + (i.presets?.length ?? 0), 0);

if (erros.length) {
  console.error(`\n✗ ${erros.length} problema(s) nos controles:\n`);
  for (const e of erros) console.error(`  · ${e}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ controles OK — ${totalPresets} presets em ${comPresets} itens, todos batendo com o TypeScript`,
);
