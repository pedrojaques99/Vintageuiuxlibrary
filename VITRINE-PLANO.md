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

## Parte 5 — a rodada "nível shadcn/Apple"

### Credibilidade

**O registry nunca tinha sido instalado.** `npm run test:install` cria um projeto Vite+TS+Tailwind do zero num diretório temporário, sobe um servidor sobre `public/r` (prova os itens desta máquina, antes do deploy), roda `shadcn add` item por item e compila. Achou, na primeira execução:

| Defeito | Alcance |
|---|---|
| `registryDependencies` sem namespace (`vintage-theme` em vez de `@visant/vintage-theme`) | **14 itens não instalavam para ninguém** — o CLI procurava no registry do shadcn |
| `types.ts` do kanban declarado como `registry:lib` | ia para `src/lib/`, e os componentes importavam `./types` do lado deles |
| `lucide-react`, `framer-motion`, `@lottiefiles/dotlottie-react`, `cva` não declarados | arquivo chega, import falha, culpa parece do consumidor |
| `data-table` sem `inline-edit`, `input`, `use-media-query`, `checkbox`, `table`, `context-menu` | item publicado que nunca compilou fora daqui |
| `use-media-query` importado e nunca publicado | arquivo inexistente |

Hoje: **47/47 instalam e o projeto limpo compila.** E virou portão: `npm run check:deps` compara os imports reais de cada arquivo com o que o item declara, e roda no `ship`.

**Regressão visual** (`npm test`, Playwright): 9 testes que travam invariantes, não pixels — altura do documento estável no scroll, filtro que não deixa rolagem órfã, nenhuma demo cortada, zero overflow horizontal em 390/768/1024/1440, console limpo, foco abrindo por URL e voltando com Esc. Os testes acharam três bugs enquanto eram escritos, incluindo o pior de todos:

> O demo do `sticky-filterbar` monta o componente real, que **mede o cabeçalho da página e escreve `--header-h` na raiz do documento**. Como a casca da vitrine dimensionava o header com essa mesma variável, cada medição o fazia crescer, o ResizeObserver disparava de novo, e a página inchava alguns pixels por segundo, para sempre. A regra que ficou: nada na casca lê variável que um componente publicado escreve.

### Documentação

- **Props** extraídas do TypeScript dos itens com `react-docgen-typescript` (`npm run build:props`): 288 props em 43 itens, em `props.generated.json`, versionado — o diff do git mostra quando a API pública muda.
- **Código** lido do próprio JSON do registry em runtime: é literalmente o arquivo que o `add` copia, com seletor de arquivo e botão de copiar.
- **Rotas reais** (`/c/kanban`), um HTML por item gerado no build, com `title`, `description`, canonical e OG. **47 imagens de prévia** 1200×630 desenhadas no Chromium dos testes (`npm run build:og`). O hash antigo continua abrindo e se corrige sozinho na URL.
- As descrições do `registry.json` estavam sem acento e com recado interno ("colhido do visant-board") — e é esse texto que aparece no `add`, na meta tag e na imagem. Agora o portão de catálogo compara as duas fontes e `--fix` sincroniza.

### Acabamento

- **Escala tipográfica**: 74 tamanhos arbitrários (9/10/11/12/13/14/15/19px) viraram seis degraus com nome de uso — `micro`, `rotulo`, `apoio`, `corpo`, `destaque`, `titulo`.
- **Motion**: os tokens `--dur-*`/`--ease-*` eram lidos por metade dos componentes e **não existiam em lugar nenhum** — cada peça caía no próprio fallback. Agora existem uma vez, com as curvas da skill `visant-motion`, mais o guarda de `prefers-reduced-motion`.
- **Toque e foco**: área clicável de 44px sem mudar o desenho (pseudo-elemento), um anel de foco só para tudo (`:where()`, especificidade zero), e a afordância que só aparecia no hover passou a existir em touch.
- **Peso**: studio, bancada e a demo do kanban saem do carregamento inicial; vendor separado por ritmo de mudança. De um arquivo de 638KB para 304+140+132KB paralelos e cacheáveis em separado.

## Pendência que não é minha de resolver

**`ui.visantlabs.com` não resolve (NXDOMAIN)** — e é o `homepage` publicado dentro do `registry.json`, ou seja, quem seguir o manifesto bate num endereço morto. O domínio já está registrado no projeto da Vercel; falta o registro no DNS de `visantlabs.com` (CNAME `ui` → `cname.vercel-dns.com`). O ship agora **testa o DNS do homepage** e, quando ele não resolve, avisa e imprime a URL que funciona em vez de anunciar a morta.
