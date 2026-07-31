#!/usr/bin/env node
/**
 * As imagens de prévia dos links (1200×630), uma por item.
 *
 * Desenhadas no Chromium que já está instalado para os testes: sem serviço
 * externo, sem conta em lugar nenhum, e o texto sai do mesmo `registry.json`
 * que o mundo consome — a prévia não pode dizer uma coisa e o `add` outra.
 *
 * Saem em `public/og/`, versionadas de propósito: gerar imagem exige um browser,
 * e o build da Vercel não tem. Rodar isto na publicação quebraria o deploy.
 *
 * Roda quando a lista de itens ou as descrições mudam: `npm run build:og`.
 */

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

const escapar = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const RESUMO_DA_HOME = `${registry.items.length} componentes React em registry shadcn, com temas de marca compilados: nenhum componente sabe a cor de um cliente.`;

const cartao = ({ titulo, subtitulo, nome }) => `<!doctype html>
<meta charset="utf-8" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; flex-direction: column;
    justify-content: space-between; padding: 84px;
    background: #f4eeec; color: #171412;
    font-family: "Segoe UI", Inter, system-ui, sans-serif;
  }
  .marca { display: flex; align-items: center; gap: 14px; font-size: 24px; letter-spacing: -0.01em; }
  .quadrado { width: 34px; height: 34px; border-radius: 9px; background: #3ecfcf; }
  h1 { font-size: ${"${TAMANHO}"}px; line-height: 1.02; letter-spacing: -0.035em; font-weight: 650; }
  p { margin-top: 26px; font-size: 30px; line-height: 1.4; color: #6b615c; max-width: 62ch; }
  .rodape { display: flex; justify-content: space-between; align-items: flex-end; font-size: 22px; color: #6b615c; }
  code { font-family: Consolas, "SF Mono", monospace; font-size: 22px; }
</style>
<div class="marca"><span class="quadrado"></span> @visant/ui</div>
<div>
  <h1>${escapar(titulo)}</h1>
  <p>${escapar(subtitulo)}</p>
</div>
<div class="rodape">
  <code>${nome ? `npx shadcn@latest add @visant/${escapar(nome)}` : "ui.visantlabs.com"}</code>
  <span>Visant Labs</span>
</div>`;

const alvos = [
  { arquivo: "home", titulo: "A library da Visant", subtitulo: RESUMO_DA_HOME, nome: null },
  ...registry.items.map((i) => ({
    arquivo: i.name,
    titulo: i.title ?? i.name,
    subtitulo: (i.description ?? "").slice(0, 160),
    nome: i.name,
  })),
];

const destino = join(ROOT, "public", "og");
mkdirSync(destino, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });

for (const alvo of alvos) {
  // Título longo em corpo grande estoura a caixa; o tamanho acompanha.
  const html = cartao(alvo).replace("${TAMANHO}", alvo.titulo.length > 26 ? "76" : "92");
  await pagina.setContent(html, { waitUntil: "load" });
  await pagina.screenshot({ path: join(destino, `${alvo.arquivo}.png`) });
}

await navegador.close();
console.log(`imagens de prévia: ${alvos.length} → public/og/`);
