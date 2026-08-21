#!/usr/bin/env node
/**
 * Quando cada peça entrou — pra vitrine poder dizer o que é novo.
 *
 * Uma library que cresce e não mostra o que cresceu parece parada. Quem já
 * visitou volta, vê a mesma grade e vai embora; as treze peças colhidas no mês
 * passado ficam invisíveis pra exatamente quem já conhecia o acervo e teria
 * usado.
 *
 * A data podia ser um campo escrito à mão no `registry.json`. Não é, por dois
 * motivos: campo de data é a primeira coisa que alguém esquece de preencher no
 * item novo (e um item sem data ficaria pra sempre "não novo", que é o pior
 * silêncio possível), e a resposta já existe no git — a data em que o arquivo
 * da peça foi ADICIONADO.
 *
 * `--diff-filter=A` é o que faz isso: pega a adição, não a última mexida. Sem
 * ele, corrigir um espaço em branco num item de 2024 o traria de volta pro topo
 * como novidade.
 *
 * Saída: `src/app/novidades.generated.json` — `{ "<item>": "2026-08-14" }`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

/** A data em que o caminho apareceu pela primeira vez, ISO curto. */
function nascimento(caminho) {
  try {
    const saida = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--follow", "--format=%aI", "-1", "--", caminho],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return saida ? saida.slice(0, 10) : null;
  } catch {
    // Sem git (tarball, CI raso): a vitrine perde o selo e nada mais quebra.
    return null;
  }
}

const saida = {};

for (const item of registry.items) {
  // O primeiro arquivo do item é o arquivo DA peça; os seguintes costumam ser
  // dependência interna que já existia antes e daria uma data velha demais.
  const caminho = item.files?.[0]?.path;
  if (!caminho) continue;
  const data = nascimento(caminho);
  if (data) saida[item.name] = data;
}

writeFileSync(
  join(ROOT, "src", "app", "novidades.generated.json"),
  JSON.stringify(saida, null, 2) + "\n",
);

const ordenadas = Object.values(saida).sort();
console.log(
  `novidades: ${Object.keys(saida).length} datas ` +
    `(${ordenadas[0]} → ${ordenadas[ordenadas.length - 1]}) → src/app/novidades.generated.json`,
);
