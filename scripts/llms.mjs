#!/usr/bin/env node
/**
 * O acervo em texto, pra quem não é browser.
 *
 * A vitrine é boa pra uma pessoa e opaca pra um agente: palco em iframe, painel
 * de knobs, tabela montada em React. Um modelo que abre `ui.visantlabs.com` lê
 * um `<div id="root">` vazio e conclui que a library não tem nada.
 *
 * E é o agente que instala componente hoje. Se ele não consegue ler o acervo,
 * ele escreve o marquee do zero — que é exatamente o desperdício que o registry
 * existe pra evitar, só que agora em escala de máquina.
 *
 * Dois arquivos, seguindo a convenção que o `llms.txt` firmou:
 *
 *   dist/llms.txt      índice do acervo inteiro, uma linha por peça
 *   dist/r/<item>.md   a ficha da peça: o que é, como instalar, como usar, API
 *
 * Tudo é derivado — descrição do `registry.json`, props do `props.generated.json`,
 * uso do `controls.generated.json` com o que a demo põe no palco. Nada aqui é
 * escrito à mão, porque um índice escrito à mão mente na primeira peça nova.
 *
 * Roda DEPOIS do `vite build`: escreve dentro de `dist/`.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");
const DIST = join(ROOT, "dist");
const SITE = "https://ui.visantlabs.com";

if (!existsSync(DIST)) {
  console.error("llms: dist/ não existe — rode depois do `vite build`.");
  process.exit(0);
}

const ler = (p) => JSON.parse(readFileSync(p, "utf8"));

const registry = ler(join(ROOT, "registry.json"));
const props = ler(join(APP, "props.generated.json"));
const controles = ler(join(APP, "controls.generated.json"));
const deps = ler(join(APP, "deps.generated.json"));

const TIPO = {
  "registry:ui": "componente",
  "registry:block": "bloco",
  "registry:lib": "utilitário",
  "registry:hook": "hook",
  "registry:theme": "tema",
  "registry:base": "base de CSS",
};

/** `finish?: "grayscale" | "mono" | "none" = "grayscale"` */
function assinatura(p) {
  const tipo = p.valores?.length ? p.valores.map((v) => `"${v}"`).join(" | ") : p.tipo;
  // O padrão sai do docgen sem aspas. `= grayscale` lido por um agente vira uma
  // variável chamada grayscale — que é justamente o erro que uma ficha de API
  // existe pra não deixar acontecer.
  const cru = p.padrao;
  const literal =
    cru === null || cru === undefined
      ? null
      : /^(true|false|-?\d+(\.\d+)?|\[.*\]|\{.*\}|".*"|'.*')$/.test(String(cru).trim())
        ? String(cru).trim()
        : `"${cru}"`;
  return `${p.nome}${p.obrigatoria ? "" : "?"}: ${tipo}${literal ? ` = ${literal}` : ""}`;
}

/**
 * A chamada de exemplo, com o que a demo da vitrine tem no palco.
 *
 * É a mesma regra do snippet da ficha: só o que difere do padrão do componente.
 * Despejar as nove props com o valor que a peça já tem ensinaria o agente a
 * fixar padrões que deveriam continuar chegando de graça.
 */
function exemplo(item) {
  const doItem = controles[item.name];
  if (!doItem) return null;

  const [comp, lista] = Object.entries(doItem.componentes)[0] ?? [];
  if (!comp) return null;

  const linhas = lista
    .filter((c) => c.inicial !== undefined && c.inicial !== c.padrao)
    .map((c) => {
      const v = c.inicial;
      if (typeof v === "boolean") return v ? `  ${c.prop}` : `  ${c.prop}={false}`;
      if (typeof v === "number") return `  ${c.prop}={${v}}`;
      return `  ${c.prop}="${v}"`;
    });

  return linhas.length ? [`<${comp}`, ...linhas, "/>"].join("\n") : `<${comp} />`;
}

function fichaEmMarkdown(item) {
  const l = [];
  l.push(`# ${item.title ?? item.name}`);
  l.push("");
  if (item.description) {
    l.push(item.description);
    l.push("");
  }
  l.push(`- Nome no registry: \`${item.name}\``);
  l.push(`- Tipo: ${TIPO[item.type] ?? item.type}`);
  const pacotes = deps[item.name] ?? [];
  l.push(`- Dependências npm: ${pacotes.length ? pacotes.join(", ") : "nenhuma"}`);
  l.push(`- Demo: ${SITE}/c/${item.name}`);
  l.push("");
  l.push("## Instalar");
  l.push("");
  l.push("```bash");
  l.push(`npx shadcn@latest add @visant/${item.name}`);
  l.push("```");

  const uso = exemplo(item);
  if (uso) {
    l.push("");
    l.push("## Usar");
    l.push("");
    l.push("```tsx");
    l.push(uso);
    l.push("```");
  }

  const componentes = props[item.name] ?? [];
  const comProps = componentes.filter((c) => c.props?.length);
  if (comProps.length) {
    l.push("");
    l.push("## API");
    for (const c of comProps) {
      l.push("");
      l.push(`### ${c.nome}`);
      if (c.descricao) {
        l.push("");
        l.push(c.descricao.split("\n")[0]);
      }
      l.push("");
      for (const p of c.props) {
        const nota = p.descricao?.split("\n")[0];
        l.push(`- \`${assinatura(p)}\`${nota ? ` — ${nota}` : ""}`);
      }
    }
  }

  l.push("");
  return l.join("\n");
}

mkdirSync(join(DIST, "r"), { recursive: true });

const itens = [...registry.items].sort((a, b) => a.name.localeCompare(b.name));
for (const item of itens) {
  writeFileSync(join(DIST, "r", `${item.name}.md`), fichaEmMarkdown(item));
}

/*
 * O índice.
 *
 * Uma linha por peça, com a descrição junto — sem ela o agente teria de abrir
 * as 81 fichas pra descobrir qual serve, e nenhum abre. Com a descrição na
 * mesma linha, escolher a peça é uma leitura só.
 */
const porTipo = {};
for (const item of itens) (porTipo[item.type] ??= []).push(item);

const indice = [
  "# @visant/ui",
  "",
  "Registry de componentes shadcn da Visant Labs. Todo item é instalável com",
  "`npx shadcn@latest add @visant/<nome>` e vem com o código no projeto — não é",
  "pacote npm, é arquivo copiado, e você pode editar depois.",
  "",
  `${itens.length} peças. A ficha completa de cada uma está em \`${SITE}/r/<nome>.md\`,`,
  `e o JSON que o \`add\` consome em \`${SITE}/r/<nome>.json\`.`,
  "",
];

for (const [tipo, lista] of Object.entries(porTipo).sort()) {
  indice.push(`## ${(TIPO[tipo] ?? tipo).replace(/^\w/, (c) => c.toUpperCase())} (${lista.length})`);
  indice.push("");
  for (const item of lista) {
    const desc = (item.description ?? "").split(/(?<=\.)\s/)[0];
    indice.push(`- [${item.name}](${SITE}/r/${item.name}.md): ${desc}`);
  }
  indice.push("");
}

writeFileSync(join(DIST, "llms.txt"), indice.join("\n"));

console.log(`llms: ${itens.length} fichas em dist/r/*.md + dist/llms.txt`);
