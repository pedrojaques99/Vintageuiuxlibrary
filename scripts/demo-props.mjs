#!/usr/bin/env node
/**
 * O que a demo já passa pro componente — pra o painel não mentir sobre o palco.
 *
 * O knob nasce do padrão do componente. Só que a demo quase nunca usa o padrão:
 * o `rail-demo` passa `fade`, `remainder` e `progress`, e o padrão dos três no
 * código é `false`. Resultado da primeira versão: o palco mostrava o trilho COM
 * fade e o painel mostrava a chave `fade` DESLIGADA. Quem clicasse pra ligar não
 * veria mudança nenhuma — e concluiria, com razão, que o controle está quebrado.
 *
 * Então o painel passa a nascer do que está no palco. Este script lê a tag que
 * a demo escreve e extrai só os valores literais dela:
 *
 *     <Rail arrows fade speed={40} heading="Coleção" items={itens}>
 *            ↑     ↑        ↑              ↑              ↑
 *          true  true      40         "Coleção"       ignorado
 *
 * `items={itens}` fica de fora porque não é literal — é dado de fixture, e o
 * painel não tem o que fazer com ele.
 *
 * Saída: `src/app/demos.props.generated.json`, lido pelo `controls.mjs`.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");

const catalogo = readFileSync(join(APP, "catalog.tsx"), "utf8");

/**
 * Os pares `item → componente pilotado` que o catálogo declara.
 *
 * A âncora é o `knobs:` dentro do bloco do item; ler daqui em vez de adivinhar
 * garante que este script e a ficha falem do MESMO componente.
 */
function alvosDeclarados() {
  const alvos = {};
  for (const m of catalogo.matchAll(/name: "([a-z0-9-]+)",/g)) {
    const fim = catalogo.indexOf("\n  {", m.index);
    const bloco = catalogo.slice(m.index, fim === -1 ? undefined : fim);
    const knobs = /knobs: "(\w+)",/.exec(bloco);
    if (knobs) alvos[m[1]] = knobs[1];
  }
  return alvos;
}

/** O corpo da tag de abertura de `<Comp …>`, sem o `<Comp` nem o `>`. */
function corpoDaTag(src, comp) {
  const marca = "<" + comp;
  let i = -1;
  while ((i = src.indexOf(marca, i + 1)) !== -1) {
    if (" /\n>\t".includes(src[i + marca.length])) break;
  }
  if (i === -1) return null;

  let j = i + marca.length;
  let chaves = 0;
  let aspas = null;
  while (j < src.length) {
    const c = src[j];
    if (aspas) {
      if (c === aspas && src[j - 1] !== "\\") aspas = null;
    } else if (c === '"' || c === "'" || c === "`") aspas = c;
    else if (c === "{") chaves++;
    else if (c === "}") chaves--;
    else if (c === ">" && chaves === 0) {
      return src.slice(i + marca.length, src[j - 1] === "/" ? j - 1 : j);
    }
    j++;
  }
  return null;
}

/**
 * Quebra o corpo da tag em atributos, respeitando `{}` e aspas.
 *
 * Split por espaço não serve: `items={PECAS.map((p) => …)}` tem espaço dentro
 * de uma expressão que é UM atributo, e cortar ali produziria meia dúzia de
 * props inventadas.
 */
function atributos(corpoBruto) {
  /*
   * Comentário some antes de tokenizar.
   *
   * Dentro de uma tag, o TypeScript aceita `// …` solto entre props, e o
   * `rail-demo` usa isso pra explicar o `bleed`. Sem tirar antes, cada palavra
   * do comentário virava uma prop booleana: a primeira rodada extraiu `O`,
   * `respiro`, `do`, `palco` e mais oito. Prop inventada não dá erro — dá um
   * painel com knobs que não existem.
   */
  const corpo = corpoBruto
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");

  const partes = [];
  let atual = "";
  let chaves = 0;
  let parens = 0;
  let aspas = null;

  for (let i = 0; i < corpo.length; i++) {
    const c = corpo[i];
    if (aspas) {
      atual += c;
      if (c === aspas && corpo[i - 1] !== "\\") aspas = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      aspas = c;
      atual += c;
      continue;
    }
    if (c === "{") chaves++;
    if (c === "}") chaves--;
    if (c === "(") parens++;
    if (c === ")") parens--;

    if (/\s/.test(c) && chaves === 0 && parens === 0) {
      if (atual.trim()) partes.push(atual.trim());
      atual = "";
      continue;
    }
    atual += c;
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes;
}

/** `speed={40}` → `["speed", 40]`. Devolve `null` pro que não é literal. */
function literal(attr) {
  if (attr.startsWith("{")) return null; // spread

  const igual = attr.indexOf("=");
  // Prop sem valor é `true` — é o açúcar do JSX, e é como o `fade` do rail entra.
  if (igual === -1) return /^[a-zA-Z_$][\w$]*$/.test(attr) ? [attr, true] : null;

  const nome = attr.slice(0, igual);
  const valor = attr.slice(igual + 1);
  if (!/^[a-zA-Z_$][\w$]*$/.test(nome)) return null;

  if (/^"[^"]*"$/.test(valor) || /^'[^']*'$/.test(valor)) return [nome, valor.slice(1, -1)];

  const chaveado = /^\{(.*)\}$/s.exec(valor);
  if (!chaveado) return null;
  const dentro = chaveado[1].trim();

  if (dentro === "true") return [nome, true];
  if (dentro === "false") return [nome, false];
  if (/^-?\d+(\.\d+)?$/.test(dentro)) return [nome, Number(dentro)];
  if (/^"[^"]*"$/.test(dentro)) return [nome, dentro.slice(1, -1)];
  // `{itens}`, `{() => …}`, `{PECAS.map(…)}`: dado ou comportamento, não knob.
  return null;
}

const saida = {};
let comLiterais = 0;

for (const [item, comp] of Object.entries(alvosDeclarados())) {
  const arquivo = join(APP, "demos", `${item}-demo.tsx`);
  const fonte = existsSync(arquivo) ? readFileSync(arquivo, "utf8") : catalogo;

  const corpo = corpoDaTag(fonte, comp);
  if (corpo === null) continue;

  const props = {};
  for (const attr of atributos(corpo)) {
    const par = literal(attr);
    if (par) props[par[0]] = par[1];
  }

  if (Object.keys(props).length) {
    saida[item] = props;
    comLiterais++;
  }
}

writeFileSync(join(APP, "demos.props.generated.json"), JSON.stringify(saida, null, 2) + "\n");

const total = Object.values(saida).reduce((n, p) => n + Object.keys(p).length, 0);
console.log(
  `props literais das demos: ${total} em ${comLiterais} itens → src/app/demos.props.generated.json`,
);
