#!/usr/bin/env node
/**
 * Os bugs da vitrine, no terminal.
 *
 *   npm run bugs                  lista os abertos, agrupados por peça
 *   npm run bugs -- --all         inclui os resolvidos
 *   npm run bugs -- --resolve id  fecha um (e regenera o REPORTS.md)
 *
 * Existe porque o ciclo é: reportar no browser → consertar no editor → fechar
 * sem sair do editor. Ter que abrir o MD e editar à mão a linha certa é o tipo
 * de atrito que faz a lista apodrecer com bug já consertado dentro.
 */

import { readReports, resolveReport } from "./vite-bug-report.mjs";

const argv = process.argv.slice(2);
const root = process.cwd();

const iResolve = argv.indexOf("--resolve");
if (iResolve >= 0) {
  const id = argv[iResolve + 1];
  if (!id) {
    console.error("uso: npm run bugs -- --resolve <id>");
    process.exit(1);
  }
  const ok = resolveReport(root, id);
  console.log(ok ? `✔ ${id} resolvido` : `✖ id não encontrado: ${id}`);
  process.exit(ok ? 0 : 1);
}

const todos = readReports(root);
const lista = argv.includes("--all") ? todos : todos.filter((r) => !r.resolvido);

if (!lista.length) {
  console.log(todos.length ? "Nada aberto. 🎉" : "Nenhum reporte ainda.");
  process.exit(0);
}

const porItem = new Map();
for (const r of lista) {
  if (!porItem.has(r.item)) porItem.set(r.item, []);
  porItem.get(r.item).push(r);
}

console.log(`\n${lista.length} reporte(s):\n`);
for (const [item, rs] of [...porItem].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${item}`);
  for (const r of rs) {
    const marca = r.resolvido ? "✔" : r.severidade === "quebrado" ? "●" : "○";
    console.log(`    ${marca} ${r.id.padEnd(24)} ${r.mensagem}`);
    console.log(`      ${[r.severidade, r.viewport, r.tema, r.data?.slice(0, 10)].filter(Boolean).join(" · ")}`);
  }
  console.log("");
}
