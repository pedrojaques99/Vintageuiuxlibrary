# Vitrine do @visant/ui — grade dinâmica, foco e audit de SSoT

Estado: **entregue e verificado no browser** (dev em `localhost:5199`, build de produção passando).

## Parte 1 — o que estava quebrado na vitrine

| Sintoma | Causa | Correção |
|---|---|---|
| Componentes maiores cortados | palco `h-48` fixo com `overflow-hidden` para todos os 46 itens | `FitStage`: a demo desenha no tamanho natural declarado e escala pra caber; a altura **cresce** se a peça pedir mais do que foi declarado, em vez de cortar |
| Não responsiva | `max-w-6xl` travado, grade parava em 3 colunas, filtro virava 4 linhas no celular | container até 1440px, grade 1→2→3→4 colunas, filtros rolam na horizontal no mobile |
| Grade sem ritmo | só existia `wide: true` | `preview: {w,h}` + `span` por item; a altura do card é consequência da peça |
| Sem foco num item | o card era o fim da linha | vista de foco em `#/c/<nome>`: tamanho real, presets de viewport 360/768/cheio, `←` `→` entre itens, `Esc` volta |
| Pesada | 46 demos montando juntas, 12 `setInterval` eternos | demo monta ao entrar na tela; relógio para fora da tela e com a aba escondida; `content-visibility: auto` nos cards |
| Difícil varrer | só existia o modo grade | modo **lista** (46 linhas densas) no mesmo controle |

Teclado: `/` busca · `←→↑↓` percorre os cards (o número de colunas é lido do próprio grid) · `Enter` abre · `Esc` limpa/fecha.

## Parte 2 — audit de SSoT

| Duplicação encontrada | Onde estava | Agora |
|---|---|---|
| Comando `npx shadcn@latest add @visant/…` escrito à mão | Gallery, ComponentFocus, BrandStudio | `installCommand()` em `src/app/registry-meta.ts` |
| Três botões "copiar comando", com tempos de confirmação diferentes | os mesmos três arquivos | `CopyCommand` (`variant="line" | "chip"`) em `src/app/copy-command.tsx` |
| URL do registry escrita na frase do hero | `Gallery.tsx` | `REGISTRY_PUBLIC_LABEL`, derivado de `VISANT_REGISTRY_URL` do item `@visant/brand-theme` |
| "21 temas" fixo no texto | `Gallery.tsx` | `brands.length` do `BrandThemeProvider` — o sync publica marca nova e a frase acompanha |
| `max-w-6xl px-6` copiado em 3 páginas e `top-14` combinando por sorte | App, Gallery, BrandStudio | tokens `--shell-max`, `--shell-pad`, `--header-h` + classes `.shell` / `.shell-bleed` |
| Rótulo de tipo (`ui`, `block`…) redeclarado | Gallery e ComponentFocus | `TYPE_LABEL` no catálogo |
| Busca sem acento reimplementada | Gallery | `fold()` / `matches()` no catálogo, com índice montado uma vez |
| Filtros e toggles desenhados à mão com `var(--brand)` inline | Gallery, ComponentFocus | `Chip` e `SegmentedControl` **do próprio registry** |
| Cores dos pads e verde do osciloscópio duplicados (e divergentes) | VintageRig e catalog | `PAD_VOICES`, `SCOPE_PHOSPHOR`, `SCOPE_SAMPLES` em `demo-fixtures.ts` |
| `#0a0a0a` misturado à mão no fundo da bancada | VintageRig | gradiente termina em `var(--vintage-surface-1)` |
| Aba e item em foco fora da URL | App | rota derivada do hash (`parseHash`/`formatHash`), `pushState` — botão voltar e link compartilhável funcionam |
| Catálogo da vitrine e `registry.json` podendo divergir em silêncio | — | `npm run check:catalog`, também como portão dentro do `npm run ship` |

## Arquivos

Novos: `src/app/stage.tsx`, `src/app/ComponentFocus.tsx`, `src/app/copy-command.tsx`, `src/app/registry-meta.ts`, `src/app/demo-fixtures.ts`, `scripts/catalog-check.mjs`.
Alterados: `Gallery.tsx`, `catalog.tsx`, `App.tsx`, `BrandStudio.tsx`, `VintageRig.tsx`, `src/styles/tailwind.css`, `scripts/ship.mjs`, `package.json`.

**Nenhum arquivo de `registry/` foi tocado** — a vitrine mudou, os componentes publicados não.

## Parte 3 — bugs achados depois, e o que os causava

| Sintoma | Causa real | Correção |
|---|---|---|
| Faixas em branco no scroll, cabeçalho "solto" no meio da página | duas mentiras sobre altura: `contain-intrinsic-size` declarava só o palco (sem rodapé nem escala) e o esqueleto do lazy mount tinha outra altura ainda | o palco nasce com a altura final e só o conteúdo dele chega depois; `content-visibility` removido. Medido: **0px de variação** de altura do documento no scroll inteiro |
| Filtrar por família deixava a tela num vazio | ir de 46 para 9 itens corta o documento de 5100 para 1500px; o navegador prende o scroll no novo fim e a pessoa fica 585px abaixo do primeiro card | `useLayoutEffect` reposiciona na primeira linha de resultados + `overflow-anchor: none` no body |

Duas armadilhas que custaram caro e estão comentadas no código para não voltarem:

- **Medir um elemento `sticky`.** No Chrome, `getBoundingClientRect` **e** `offsetTop` de um elemento grudado já vêm deslocados. Medindo pela barra de filtro, o alvo dava exatamente o scroll atual e o corretivo nunca rodava. A medição é feita pelo herói, que não gruda.
- **`requestAnimationFrame` não é entregue em aba de segundo plano.** A primeira versão do corretivo dependia de um quadro e simplesmente não acontecia. Virou `useLayoutEffect`.

## Parte 4 — portões

`npm run ship` agora roda quatro portões antes de qualquer commit:

1. `registry.json` parseia e todo `files[].path` existe
2. zero hex em `registry/visant/`
3. **catálogo × registry** batem (`npm run check:catalog`)
4. **tipos** (`npx tsc --noEmit`) — o `vite build` não checa tipo nenhum; sem este portão, `strict: true` era decoração

`typescript`, `@types/react` e `@types/react-dom` entraram como devDependency e `npm run typecheck` está **verde**. Foram 1013 erros no primeiro `tsc` (quase todos por falta de `@types/react`) até zero. Duas exclusões documentadas no `tsconfig.json`: o `data-table` (acoplado ao Next por natureza) e a sobra morta do Figma Make.

## Pendência que não é minha de resolver

**`ui.visantlabs.com` não resolve (NXDOMAIN)** — e é o `homepage` publicado dentro do `registry.json`, ou seja, quem seguir o manifesto bate num endereço morto. O domínio já está registrado no projeto da Vercel; falta o registro no DNS de `visantlabs.com` (CNAME `ui` → `cname.vercel-dns.com`). O ship agora **testa o DNS do homepage** e, quando ele não resolve, avisa e imprime a URL que funciona em vez de anunciar a morta.
