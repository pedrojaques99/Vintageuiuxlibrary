# Botão de bug report na vitrine

## Decisão

Reporte **grava em arquivo local** via middleware do dev server do Vite. Sem conta,
sem rede, sem serviço: você clica, escreve uma frase, e o texto cai em `bugs/reports.jsonl`
+ `bugs/REPORTS.md`. Eu leio o MD na sessão seguinte e conserto.

Botão aparece **só nos cards da vitrine** (Showcase e Row), e **só no hover/foco** —
em repouso o card continua com nome, descrição, comando e Focar, nada a mais.
Em toque (`hover: none`) fica sempre visível, porque lá não existe hover pra revelar.

Só existe em `import.meta.env.DEV`. Em produção (Vercel) não há endpoint pra receber,
então o botão nem é renderizado.

## Peças

| Arquivo | Papel |
| --- | --- |
| `scripts/vite-bug-report.mjs` | Plugin Vite dev-only: `GET/POST /__bugs`, `POST /__bugs/resolve`. Escreve JSONL + regenera o MD. |
| `src/app/bug-report.tsx` | `BugButton` — ícone, popover com textarea + severidade, estado enviado. Chrome de app, igual `copy-command.tsx`. Não toca no registry. |
| `vite.config.ts` | Registra o plugin. |
| `src/app/Gallery.tsx` | Coloca o botão no header do `Showcase` e na `Row`. |
| `scripts/bugs.mjs` (`npm run bugs`) | Lista os abertos no terminal; `--resolve <id>` fecha. |

## O que cada reporte carrega sem você digitar

componente, severidade, URL, viewport, tema claro/escuro, marca ativa, user agent, data.

## Fora de escopo

Nada de issue no GitHub, nada de captura de tela, nada dentro do `ComponentFocus`.
