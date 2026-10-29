#!/usr/bin/env node
/**
 * A cadeia de artefatos da documentação, em ordem, num comando.
 *
 * São quatro passos e a ordem não é opcional — cada um lê o que o anterior
 * escreveu:
 *
 *   props-extract  →  props.generated.json         (o TypeScript das peças)
 *   demo-props     →  demos.props.generated.json   (o que a demo põe no palco)
 *   controls       →  controls.generated.json      (os knobs, dos dois acima)
 *   llms           →  dist/llms.txt, dist/r/*.md   (o acervo pra um agente ler)
 *
 * Rodar na mão, um a um, funciona até a semana em que alguém roda o terceiro
 * sem o primeiro e publica um painel com a API da versão passada. Daí este
 * arquivo: o `build` chama um comando, e a ordem mora aqui.
 *
 * O `llms` só roda depois do `vite build`, porque escreve dentro de `dist/`.
 * Por isso ele aceita `--depois-do-build` e é pulado por padrão.
 */

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const passos = [
  "props-extract.mjs",
  "demo-props.mjs",
  "controls.mjs",
  "novidades.mjs",
  // O portão fecha a cadeia: gerar e não conferir é gerar com confiança falsa.
  "controls-check.mjs",
];

for (const passo of passos) {
  execFileSync(process.execPath, [join(ROOT, "scripts", passo)], { stdio: "inherit", cwd: ROOT });
}
