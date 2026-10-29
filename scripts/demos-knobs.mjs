#!/usr/bin/env node
/**
 * Liga o painel de controles às demos, uma edição mecânica por arquivo.
 *
 * O contrato é de duas linhas: a demo recebe `{ props }` e espalha no
 * componente que ela pilota. Fazer isso à mão em 44 arquivos é o tipo de
 * trabalho que sai errado no arquivo 30 — e que some no diff, porque cada edição
 * é pequena e todas se parecem. Então é script.
 *
 * O que ele NÃO faz, de propósito:
 *
 * - Não toca em demo cujo componente aparece mais de uma vez (o marquee tem
 *   quatro faixas, o photo-frame tem três molduras). Ali a pergunta "qual
 *   instância o knob pilota?" tem resposta de julgamento, não de regex.
 * - Não põe `{...props}` no começo da tag. Vai no fim, sempre: o painel corrige
 *   o que a demo fixou, e se entrasse antes seria a demo sobrescrevendo o knob.
 * - Não roda duas vezes no mesmo arquivo — quem já tem `{...props}` é pulado.
 *
 * `--dry` mostra o que mudaria sem escrever.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = join(ROOT, "src", "app", "demos");
const SECO = process.argv.includes("--dry");

const controles = JSON.parse(readFileSync(join(ROOT, "src", "app", "controls.generated.json"), "utf8"));

/** Quantas vezes `<Comp` abre uma tag de verdade (e não `<CompOutro`). */
function usos(src, comp) {
  return src.split("<" + comp).filter((p, i) => i > 0 && " /\n>\t".includes(p[0])).length;
}

/**
 * O índice logo antes do `>` que fecha a tag de abertura.
 *
 * Contar chaves é obrigatório: `<Rail items={a > b ? x : y}>` tem um `>` que não
 * fecha tag nenhuma, e cortar ali produziria um arquivo que não compila.
 */
function fimDaTagDeAbertura(src, inicio) {
  let i = inicio;
  let chaves = 0;
  let aspas = null;
  while (i < src.length) {
    const c = src[i];
    if (aspas) {
      if (c === aspas && src[i - 1] !== "\\") aspas = null;
    } else if (c === '"' || c === "'" || c === "`") {
      aspas = c;
    } else if (c === "{") {
      chaves++;
    } else if (c === "}") {
      chaves--;
    } else if (c === ">" && chaves === 0) {
      return src[i - 1] === "/" ? i - 1 : i;
    }
    i++;
  }
  return -1;
}

/** O componente que a demo vai pilotar: o que oferece mais knobs. */
function alvoDe(item, src) {
  const comps = Object.keys(controles[item]?.componentes ?? {});
  const candidatos = comps
    .filter((c) => usos(src, c) === 1)
    .map((c) => ({ comp: c, n: controles[item].componentes[c].length }))
    .sort((a, b) => b.n - a.n);
  return candidatos[0]?.comp ?? null;
}

const ligados = [];
const pulados = [];

/*
 * Só demo que o catálogo de fato monta.
 *
 * Três arquivos em `demos/` não são importados por ninguém (`vintage-tv-frame`,
 * `vintage-xy-pad`, `vintage-command-palette`): o catálogo desenha esses itens
 * inline. Ligar knob neles seria escrever contrato pra código morto.
 */
const catalogoFonte = readFileSync(join(ROOT, "src", "app", "catalog.tsx"), "utf8");

for (const arquivo of readdirSync(DEMOS).filter((f) => f.endsWith(".tsx"))) {
  const caminho = join(DEMOS, arquivo);
  const item = arquivo.replace(/-demo\.tsx$/, "");
  let src = readFileSync(caminho, "utf8");

  if (src.includes("{...props}")) {
    pulados.push(`${item}: já ligado`);
    continue;
  }
  if (!controles[item]) {
    pulados.push(`${item}: sem controles derivados`);
    continue;
  }
  if (!catalogoFonte.includes(`./demos/${item}-demo`)) {
    pulados.push(`${item}: demo órfã, o catálogo não importa este arquivo`);
    continue;
  }

  const comp = alvoDe(item, src);
  if (!comp) {
    pulados.push(`${item}: nenhum componente com uso único`);
    continue;
  }

  // A assinatura. Só o caso simples: `export default function Nome() {`.
  const assinatura = /export default function (\w+)\(\s*\)/.exec(src);
  if (!assinatura) {
    pulados.push(`${item}: assinatura fora do padrão`);
    continue;
  }

  const marca = "<" + comp;
  const abre = [...src.matchAll(new RegExp(marca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))]
    .map((m) => m.index)
    .find((i) => " /\n>\t".includes(src[i + marca.length]));
  if (abre === undefined) {
    pulados.push(`${item}: não achei a tag`);
    continue;
  }

  const fim = fimDaTagDeAbertura(src, abre);
  if (fim === -1) {
    pulados.push(`${item}: tag sem fechamento legível`);
    continue;
  }

  /*
   * `{...props}` por último: o painel corrige o que a demo fixou.
   *
   * A inserção respeita o arquivo em vez de reformatá-lo. Metade das demos está
   * em CRLF e metade em LF, e cada tag tem a sua indentação — normalizar aqui
   * encheria o diff de linhas que ninguém mexeu e esconderia a mudança de
   * verdade no meio.
   */
  const nl = src.includes("\r\n") ? "\r\n" : "\n";
  const cabeca = src.slice(0, fim);
  const multilinha = /\n[ \t]*$/.test(cabeca) || cabeca.slice(cabeca.lastIndexOf("<" + comp)).includes("\n");

  if (multilinha) {
    const linhas = cabeca.split(/\r?\n/);
    // A indentação da última prop escrita, pra `{...props}` entrar na fileira…
    const recuo = /^[ \t]*/.exec([...linhas].reverse().find((l) => l.trim()) ?? "")[0];
    // …e a da linha do `>`, pra ele voltar exatamente onde estava.
    const recuoFecha = /^[ \t]*/.exec(linhas[linhas.length - 1] ?? "")[0];
    src = cabeca.replace(/\s*$/, "") + nl + recuo + "{...props}" + nl + recuoFecha + src.slice(fim);
  } else {
    src = cabeca.replace(/[ \t]*$/, "") + " {...props}" + (src[fim] === "/" ? " " : "") + src.slice(fim);
  }

  src = src.replace(
    assinatura[0],
    `export default function ${assinatura[1]}({ props }: DemoProps)`,
  );

  // O import do tipo entra depois do último import, pra não brigar com a ordem
  // que já existe no arquivo.
  const imports = [...src.matchAll(/^import .*?;$/gm)];
  const ultimo = imports[imports.length - 1];
  src =
    src.slice(0, ultimo.index + ultimo[0].length) +
    nl +
    'import type { DemoProps } from "../catalog";' +
    src.slice(ultimo.index + ultimo[0].length);

  if (!SECO) writeFileSync(caminho, src);
  ligados.push({ item, comp, knobs: controles[item].componentes[comp].length });
}

for (const l of ligados) console.log(`  ✓ ${l.item} → ${l.comp} (${l.knobs} knobs)`);
for (const p of pulados) console.log(`  · ${p}`);
console.log(
  `\n${ligados.length} demos ligadas, ${pulados.length} puladas${SECO ? " (seco, nada escrito)" : ""}`,
);

/*
 * O catálogo declara `knobs` em cada item ligado.
 *
 * Sem isso a ficha não monta painel nenhum: `knobs` é a promessa de que a demo
 * espalha as props, e o painel só existe onde a promessa foi feita. A edição
 * entra pela linha do `demo:` do próprio item — é a única âncora que não
 * depende da ordem da lista nem do comentário que houver entre os itens.
 */
const CATALOGO = join(ROOT, "src", "app", "catalog.tsx");
let catalogo = readFileSync(CATALOGO, "utf8");
const nlCat = catalogo.includes("\r\n") ? "\r\n" : "\n";
let declarados = 0;

for (const { item, comp } of ligados) {
  if (new RegExp(`knobs: "${comp}"`).test(catalogo)) continue;

  const naLista = catalogo.indexOf(`name: "${item}",`);
  if (naLista === -1) {
    pulados.push(`${item}: não está no CATALOG`);
    continue;
  }

  /*
   * A busca fica DENTRO do bloco do item.
   *
   * Sem esse limite, item cuja demo é uma arrow inline no próprio catálogo
   * (`demo: () => (…)`, que não casa com o padrão de uma linha) fazia a busca
   * seguir em frente e achar o `demo:` do item SEGUINTE — e três `knobs:`
   * caíram todos dentro do `showcase-card`. Errar assim não dá erro de
   * sintaxe: dá um objeto com a mesma chave três vezes, e a última ganha.
   */
  const fimDoBloco = catalogo.indexOf("\n  {", naLista);
  const bloco = catalogo.slice(naLista, fimDoBloco === -1 ? undefined : fimDoBloco);

  const linhaDemo = /^([ \t]*)demo: \w+,$/m.exec(bloco);
  if (!linhaDemo) {
    pulados.push(`${item}: demo inline no catálogo, sem linha onde declarar knobs`);
    continue;
  }

  const pos = naLista + linhaDemo.index + linhaDemo[0].length;
  catalogo =
    catalogo.slice(0, pos) + nlCat + linhaDemo[1] + `knobs: "${comp}",` + catalogo.slice(pos);
  declarados++;
}

if (!SECO && declarados) writeFileSync(CATALOGO, catalogo);
console.log(`${declarados} itens do catálogo passaram a declarar \`knobs\``);
