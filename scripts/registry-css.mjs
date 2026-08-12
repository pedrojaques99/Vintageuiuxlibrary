/**
 * Gera `src/styles/registry.generated.css` a partir do bloco `css` de cada item
 * publicado em `public/r/*.json`.
 *
 * O defeito que isto conserta é grande e passou despercebido por muito tempo: a
 * vitrine **nunca carregou o CSS dos próprios itens**. Um item de registry pode
 * declarar um bloco `css`, e o `shadcn add` injeta esse bloco no projeto de quem
 * instala. A vitrine, que consome os componentes por import direto do
 * `registry/`, pulava essa etapa — então doze peças rodavam aqui dentro sem o
 * CSS delas.
 *
 * O sintoma não parecia bug: parecia peça sem graça. O `fold-motion` foi
 * reportado como "muito simples" quando na verdade não animava nada — o
 * `clip-path` das variantes mora no bloco `css`. O `working-glyph` girava sem o
 * brilho, o `marquee` ignorava `prefers-reduced-motion`, e assim por diante.
 * Cada uma dessas peças estava sendo julgada, na vitrine que existe para
 * vendê-las, por uma versão incompleta de si mesma.
 *
 * A alternativa era espelhar cada bloco à mão num `.css` do `src/styles`. Foi o
 * que se fez com o `fold-motion` no dia em que o defeito apareceu, e é
 * exatamente o tipo de conserto que envelhece: no dia em que a peça mudar o
 * próprio CSS, a cópia da vitrine continua a antiga, e a vitrine passa a mentir
 * sobre o que o `add` entrega. Aqui a fonte é o JSON publicado, sempre.
 *
 * Rode depois do `build:registry` — é dele que sai o `public/r`.
 */

import fs from "node:fs";
import path from "node:path";

const R_DIR = path.resolve("public/r");
const SAIDA = path.resolve("src/styles/registry.generated.css");

/**
 * Um bloco `css` de item é objeto aninhado: chave que aponta para string é
 * declaração, chave que aponta para objeto é seletor ou at-rule.
 */
function serializar(obj, recuo = "") {
  let out = "";
  for (const [chave, valor] of Object.entries(obj)) {
    if (valor && typeof valor === "object") {
      out += `${recuo}${chave} {\n${serializar(valor, recuo + "  ")}${recuo}}\n`;
    } else {
      out += `${recuo}${chave}: ${valor};\n`;
    }
  }
  return out;
}

/**
 * Funde blocos repetidos em vez de emiti-los N vezes.
 *
 * Os quatro itens de tema publicam o MESMO bloco (`[data-density="compact"]`),
 * porque densidade é da casa e não da marca. Sem fundir, a folha sairia com a
 * regra quatro vezes — e a próxima marca somaria uma quinta.
 */
function fundir(alvo, origem) {
  for (const [chave, valor] of Object.entries(origem)) {
    if (valor && typeof valor === "object") {
      alvo[chave] = fundir(alvo[chave] ?? {}, valor);
    } else {
      alvo[chave] = valor;
    }
  }
  return alvo;
}

if (!fs.existsSync(R_DIR)) {
  console.error(`registry-css: ${R_DIR} não existe. Rode 'npm run build:registry' antes.`);
  process.exit(1);
}

const itens = fs
  .readdirSync(R_DIR)
  .filter((f) => f.endsWith(".json") && f !== "registry.json")
  .sort();

const acumulado = {};
const comCss = [];

for (const arquivo of itens) {
  let item;
  try {
    item = JSON.parse(fs.readFileSync(path.join(R_DIR, arquivo), "utf8"));
  } catch {
    continue;
  }
  if (!item.css || !Object.keys(item.css).length) continue;
  comCss.push(item.name ?? arquivo.replace(/\.json$/, ""));
  fundir(acumulado, item.css);
}

const cabecalho = `/* GERADO por scripts/registry-css.mjs — não edite à mão.
 *
 * O bloco \`css\` de cada item publicado em public/r/*.json, que é o CSS que o
 * \`shadcn add\` injeta no projeto de quem instala. A vitrine importa componente
 * direto de registry/, então sem este arquivo ela mostraria as peças SEM o CSS
 * delas — e foi assim que o fold-motion virou bug reportado como "muito
 * simples" quando na verdade não animava nada.
 *
 * ${comCss.length} ${comCss.length === 1 ? "item" : "itens"}: ${comCss.join(", ")}
 */\n\n`;

fs.writeFileSync(SAIDA, cabecalho + serializar(acumulado), "utf8");
console.log(`registry-css: ${comCss.length} item(ns) com bloco css → ${path.relative(process.cwd(), SAIDA)}`);
