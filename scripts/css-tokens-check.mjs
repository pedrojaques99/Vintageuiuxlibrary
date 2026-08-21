#!/usr/bin/env node
/**
 * Portão: classe utilitária que consome token da casa tem de VIRAR ESTILO.
 *
 * Existe por causa de um defeito que nenhum outro portão vê. `tsc` passa (é
 * string), lint passa, build passa, o teste de instalação passa — e a peça não
 * desenha nada.
 *
 * ## O defeito, com a causa certa
 *
 * `shadow-[var(--focus)]` compila. O CSS gerado é este:
 *
 * ```css
 * .shadow-\[var\(--focus\)\] {
 *   --tw-shadow: var(--focus);
 *   box-shadow: var(--tw-inset-shadow), …, var(--tw-shadow);
 * }
 * ```
 *
 * Parece certo e não é: no Tailwind v4 `--tw-shadow` é uma custom property
 * REGISTRADA (`@property`, com sintaxe e valor inicial). Atribuir a ela uma
 * referência `var(--focus)` falha na hora de computar o valor, e a propriedade
 * registrada cai no inicial — transparente. O seletor casa, a regra existe, o
 * `box-shadow` computado sai `rgba(0,0,0,0) 0 0 0 0`. O anel de foco do
 * `brand-selector` estava assim desde que foi colhido.
 *
 * A saída é a propriedade arbitrária, que não passa por `--tw-shadow`:
 *
 * ```
 * focus-visible:[box-shadow:var(--focus)]      hover:[box-shadow:var(--e-raised)]
 * ```
 *
 * ## O que este portão NÃO é
 *
 * Não é um detector genérico de "token que não chega ao CSS". Tentei essa versão
 * e ela deu falso negativo no próprio bug que motivou o script: conferia se o
 * bloco cita o token, e o bloco cita — o valor é que morre depois, em tempo de
 * computação, onde CSS estático não alcança. Detector que passa no teste de
 * positivo é o que vale; este cobre a forma comprovadamente morta, e o resto
 * fica para a checagem de que a classe ao menos gerou regra.
 */

import fs from "node:fs";
import path from "node:path";

const RAIZES = ["registry", "src"];
const DIST = "dist/assets";

/** Tokens resolvidos por outra camada (Radix, shell da vitrine, kit vintage). */
const IGNORAR = /--radix-|--shell-|--vintage-/;

/** A forma morta: passa por uma custom property registrada e vira transparente. */
const PROIBIDAS = [
  {
    re: /(^|:)shadow-\[var\(/,
    porque: "`shadow-[var(--x)]` cai no valor inicial de `--tw-shadow` (transparente)",
    saida: (t) => `[box-shadow:var(${t})]`,
  },
];

function arquivosTsx(dir, saida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) arquivosTsx(p, saida);
    else if (/\.tsx?$/.test(e.name)) saida.push(p);
  }
  return saida;
}

function cssConstruido() {
  if (!fs.existsSync(DIST)) return null;
  const arqs = fs.readdirSync(DIST).filter((n) => n.endsWith(".css"));
  if (!arqs.length) return null;
  return arqs
    .map((n) => fs.readFileSync(path.join(DIST, n), "utf8"))
    .join("\n")
    .replace(/\s*([:,{};])\s*/g, "$1");
}

/*
 * `@` entra na lista: o Tailwind escapa a arroba no seletor
 * (`.\[\@media\(hover\:none\)\]\:text-…`) e sem ela a busca montava um seletor
 * que não existe em CSS nenhum. O portão acusava de "não gerou regra" uma
 * classe cuja regra estava lá — falso positivo em toda variante `[@media…]`.
 */
const escapar = (cls) => cls.replace(/[.[\]()#,%:&>+~*/!'"$^=|?@]/g, (c) => "\\" + c);

/*
 * A classe é fatiada por ESPAÇO, não por regex de forma.
 *
 * Variante pode carregar colchete aninhado com sinal de igual
 * (`[[data-tone=surface]_&]:bg-[var(--brand)]`), e regex que tenta descrever o
 * prefixo corta a classe no meio — o portão passa a acusar o que ele mesmo
 * mutilou (aconteceu: três falsos positivos na primeira versão). Classe do
 * Tailwind nunca tem espaço, então o pedaço entre delimitadores é a classe
 * inteira, sempre.
 */
/*
 * Comentário não é regra de estilo.
 *
 * O portão lia o arquivo inteiro, então um comentário que CITA uma classe
 * derrubava o build. Caso real: o `book-3d` documenta que
 * `rounded-[var(--r-surface,4px)]` não gera regra nenhuma — a vírgula do
 * fallback quebra o parser de valor arbitrário do Tailwind — e explica por que
 * o valor foi pro `style`. Apagar a citação apagaria a única pista que impede
 * a próxima pessoa de reintroduzir exatamente o mesmo defeito.
 *
 * É a mesma decisão, e pelo mesmo motivo, do portão de hex em `ship.mjs`: a
 * regra continua cega para intenção no CÓDIGO, que é onde ela precisa ser cega.
 * Ela só para de acusar prosa.
 */
const semComentario = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const achados = new Map();
for (const raiz of RAIZES) {
  if (!fs.existsSync(raiz)) continue;
  for (const arq of arquivosTsx(raiz)) {
    for (const pedaco of semComentario(fs.readFileSync(arq, "utf8")).split(/[\s"'`{}]+/)) {
      if (!pedaco.includes("-[var(--")) continue;
      const token = pedaco.match(/-\[var\((--[a-z0-9-]+)/)?.[1];
      if (!token || IGNORAR.test(token)) continue;
      const classe = pedaco.replace(/,$/, "");
      if (!achados.has(classe)) achados.set(classe, { token, onde: arq });
    }
  }
}

const falhas = [];

// 1. Forma morta — não depende do build, e é a que já custou caro.
for (const [classe, { token, onde }] of achados) {
  for (const p of PROIBIDAS) {
    if (p.re.test(classe)) {
      falhas.push({ classe, onde, motivo: `${p.porque} → use ${p.saida(token)}` });
    }
  }
}

// 2. Classe que nem virou regra (fallback com vírgula em posição que o parser recusa).
const css = cssConstruido();
if (css) {
  for (const [classe, { onde }] of achados) {
    if (css.indexOf("." + escapar(classe)) === -1) {
      falhas.push({ classe, onde, motivo: "não gerou regra nenhuma no CSS construído" });
    }
  }
} else {
  console.warn("dist/ vazio — só a checagem de forma rodou. Faça o build para a checagem completa.");
}

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} de ${achados.size} classes de token não viram estilo:\n`);
  for (const f of falhas) console.error(`  ${f.classe}\n    ${f.onde} — ${f.motivo}`);
  console.error("");
  process.exit(1);
}

console.log(`✓ ${achados.size} classes de token OK (forma + presença no CSS construído)`);
