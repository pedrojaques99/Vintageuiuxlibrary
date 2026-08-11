# @visant/ui — plano de registry de componentes e blocks

**Uso interno Visant.** Levantado em 30/07/2026 nos seis repos.

---

## STATUS — 30/07/2026: no ar e verificado ponta a ponta

**`https://visant-ui.vercel.app/r/{name}.json`** — **33 itens + 3 temas de marca**.

```
ui     27  marquee rail plate chip sticky-filterbar store-status measure-picker
           data-table segmented-control octahedron-loader inline-edit timeline
           assignee-stack repulsive-hover + 13 do kit vintage
block   1  kanban  (dnd + selecao por marquee + multi-selecao)
lib     2  motion-layer (ciclo do editor Shopify) · smooth-scroll-provider
base    1  vintage-base          hook 1  use-knob-drag
theme   1  vintage-theme  +  theme-hockey-direct · theme-visant · theme-days-n-days
```

O método de colher virou a skill **`visant-registry`** — ela dispara sozinha
quando alguém está prestes a copiar código entre projetos, que é a hora que
importa. `COLHEITA.md` é só o ponteiro, para não haver duas verdades.

```jsonc
// components.json de qualquer projeto de cliente
"registries": { "@visant": "https://visant-ui.vercel.app/r/{name}.json" }
```

```bash
npx shadcn@latest add @visant/theme-hockey-direct   # 80 vars: cor, tipo, craft
npx shadcn@latest add @visant/marquee @visant/rail @visant/plate
```

Verificado num projeto limpo, não em teoria:

| Prova | Resultado |
|---|---|
| Instalação a partir do registry publicado | 4 arquivos + 80 CSS vars escritas |
| Keyframes e `prefers-reduced-motion` do marquee | chegaram no `globals.css` |
| Hex hardcoded nos três componentes | **zero** |
| Trocar Hockey Direct → Visant | `--brand` e `--font-display` mudaram, **componentes byte a byte idênticos** |

Feito: **F1** (publicado), **F1b** (motor consertado, 39 testes), **F2** (os três
repos com shadcn apontam para `@visant`), **F3** (17 itens colhidos — 7 do
Hockey Direct, 9 do visant-board, 1 bloco).

Falta: **F4**, a trilha Shopify por `registry:file` com `target: ~/assets` e
`~/sections`. E o domínio `ui.visantlabs.com` pende de um CNAME — a URL da
Vercel funciona hoje, e trocar depois é editar uma string nos `components.json`.

### As cópias de origem: decisão de não deletar (30/07/2026)

Levantei as três e a conclusão foi **não retrofitar**. O valor do registry está
nos projetos novos; mexer em app que já funciona é risco sem receita.

| Cópia | O que o levantamento mostrou | Decisão |
|---|---|---|
| `keyboard-ui` em `7panel_studio` e aqui | **Não é duplicata, é fork:** 58 vs 30 arquivos, ~20 painéis só no 7panel, e os comuns diferem | Deletar seria perder trabalho. O que é comum já está no registry como `vintage-*` |
| Os 9 itens no `visant-board` | Funcionam. E `smooth-scroll-provider` **mudou de API na colheita** (`setLenis` → `onReady`): trocar quebraria o snap do herói 3D **sem erro de compilação** | Fica como está |
| `PremiumCard` (Visant Library ↔ visant-board) | Byte a byte idêntico, 1 uso em cada | Única duplicata real; ainda assim não compensa |

O que substitui a deleção: **cabeçalho de sinalização** no arquivo de origem
(`// Colhido para o registry: @visant/<nome>`), para ninguém corrigir bug na
cópia morta. Duplicata sinalizada custa quase nada; a silenciosa custa o dia em
que alguém arruma dos dois lados de um jeito diferente.

---

## 0. A descoberta que muda a pergunta

**A biblioteca já existe.** `Z:\Cursor\Vintageuiuxlibrary` **é** um registry
shadcn, e bem-formado:

```
package.json   → "name": "@visant/ui", script "build:registry": "npx shadcn build"
registry.json  → "name": "visant", homepage "https://ui.visantlabs.com", 16 itens
public/r/      → 17 JSONs já construídos
```

E ele já usa os padrões certos: `registry:theme` com `cssVars`, `registry:base`
para a fundação, `registryDependencies` para composição.

Então a pergunta não é *"como criamos uma library tipo shadcn"*. É:

> **Como a gente promove o registry que já existe de "kit vintage de áudio"
> para "o design system da Visant, multi-tema", e faz os outros cinco repos
> consumirem em vez de reimplementar.**

Isso importa porque **não existe nada custom a construir**. O shadcn resolve
registry próprio, namespace, tema e registry privado nativamente — confirmado
na doc, não de memória:

- **Namespace:** `components.json` → `"registries": { "@visant": "https://ui.visantlabs.com/r/{name}.json" }`, e daí `npx shadcn add @visant/marquee`.
- **Privado:** formato objeto com `headers: { "Authorization": "Bearer ${REGISTRY_TOKEN}" }`, expandido do `.env.local`.
- **Tema:** `registry:theme` + `cssVars` (`theme` / `light` / `dark`) e `css` para regras em `@layer`.
- **Arquivo arbitrário:** `registry:file` com `target`, aceitando `~/` para a raiz do projeto.

Esse último ponto é o que destrava a trilha Shopify: dá para entregar
`~/assets/marquee.css` e `~/sections/marquee.liquid` pelo mesmo canal que
entrega um componente React.

---

## 1. O estado real dos seis repos

| Repo | Stack | shadcn | O que ele é para o registry |
|---|---|---|---|
| **Vintageuiuxlibrary** | React 18 · TW 4.1 · 26 Radix | **é o registry** | A casa. Vira `@visant/ui` multi-tema |
| **visantlabs-os** | React 19 · TW 4.1 · 7 Radix | `scripts/components.json` | Consumidor **e** doador (`packages/brand-tokens`, `extrude3d`) |
| **jaques-os** | React 18 · TW 4.1 | `ProspectOS/frontend/components.json` | Consumidor. Doa padrões de work-surface |
| **auto-video-editor-ai** | React 19 · **Next 15** · TW 4.2 · 11 Radix | `apps/web/components.json` | Consumidor |
| **7panel_studio** | React 19 · TW 4.2 | não | `keyboard-ui` é irmão do vintage kit |
| **@Clients - Web** | Next+Sanity (template) · vanilla (mockups) | não | **Maior doador.** Ver §3 |
| **Visant Library** | 10 `.tsx` soltos | não | Não é library, é pasta. Vira itens ou morre |

**Boa notícia:** Tailwind v4 em todos. Sem migração de config, sem `tailwind.config.js`
divergente — `@theme` e `cssVars` funcionam igual em todo lugar.

**Nó:** React 18 em dois, React 19 em três. Componente que use API de 19 precisa
declarar isso, ou quebra silenciosamente no jaques-os.

---

## 2. A arquitetura: um registry, quatro camadas

```
@visant/ui
├── registry:theme   ← A CAMADA "POR TEMA". Só cssVars, zero componente.
│   ├── visant-core      paleta, tipo e motion da casa
│   ├── vintage          o kit de áudio que já existe
│   └── client-<nome>    um por cliente (hockey-direct, kastrup, days…)
│
├── registry:base    ← fundação: reset, tokens de motion SSoT, cn()
│   └── visant-base
│
├── registry:ui      ← primitivas de arquivo único
│   └── marquee · rail · plate · chip · price · stat · knob · led…
│
└── registry:block   ← blocos multi-arquivo, prontos para colar numa página
    └── product-grid-filter · trust-bar · mega-nav · store-status · hero-campaign
```

**A regra que faz isso funcionar: componente NUNCA tem cor própria.** Ele
consome `var(--…)` do tema. É o que permite o mesmo `marquee` sair lime sobre
verde num cliente e âmbar sobre preto no vintage — sem fork, sem prop de cor.

### A trilha Shopify, no mesmo registry

Cliente em Shopify não roda React. Esses itens saem como `registry:file`:

```json
{ "type": "registry:file",
  "files": [
    { "path": "shopify/marquee.css",     "target": "~/assets/visant-marquee.css" },
    { "path": "shopify/marquee.liquid",  "target": "~/sections/visant-marquee.liquid" }
  ] }
```

Um comando, e a seção OS 2.0 aterrissa no tema. **Sem app, sem plano Plus.**

---

## 2b. O motor de tokens — a API de brand guidelines como fonte do tema

**Esta é a peça que faz a biblioteca economizar token, código e tempo.**

Sem ela, cada projeto de cliente começa com um humano (ou um agente) lendo o
manual da marca e transcrevendo cor e fonte na mão — que é caro, lento, e erra.
Com ela, o tema de um cliente é **uma chamada**.

> ### O motor JÁ EXISTE. Não escrever de novo.
>
> `Z:\Cursor\visantlabs-os\packages\brand-tokens` — **`@visant/brand-tokens`**:
>
> - **Duas camadas:** Layer 1 identidade (derivada da marca) + Layer 2 craft
>   (`craft.json`, invariante: radius, elevation, focus, density, **motion**).
>   A tese dele é explícita e está certa: *derivar a camada invariante por marca
>   reintroduz genericidade por aleatoriedade.*
> - **AA garantido por construção** via Adobe Leonardo + culori, com relatório de
>   contraste e 17 testes.
> - Emite **exatamente os nomes semânticos do shadcn** em OKLCH para Tailwind v4,
>   com dark mode sintetizado.
> - Roadmap do próprio README: *"live API fetch by brand id"* — que é literalmente
>   a rota dinâmica desta seção. **O elo que falta é só esse.**
>
> Duas correções ao que este plano dizia antes:
>
> 1. A tabela de mapeamento `role → var` que eu tinha escrito é **redundante e
>    pior** — o engine já faz, com contraste calculado em vez de mapeamento ingênuo.
> 2. O item `visant-motion` do inventário §3 seria **duplicata**: a escala de
>    motion da casa já é Layer 2 no `craft.json`. Ela sai do registry como parte
>    do tema, não como item separado.

### Como funciona

O shadcn só exige que a URL devolva um JSON válido de registry-item. Então:

```
ui.visantlabs.com/r/{name}.json           → itens estáticos (npx shadcn build)
ui.visantlabs.com/r/theme-{brandId}.json  → ROTA DINÂMICA
```

A rota dinâmica é uma função serverless no mesmo projeto Vercel: recebe o
`brandId`, chama `brand-guidelines-get`, mapeia para `cssVars` e devolve um
`registry:theme`. Nada além disso.

No `components.json` do projeto do cliente:

```json
{
  "registries": {
    "@visant": "https://ui.visantlabs.com/r/{name}.json",
    "@brand": {
      "url": "https://ui.visantlabs.com/r/theme-{name}.json",
      "headers": { "Authorization": "Bearer ${VISANT_TOKEN}" }
    }
  }
}
```

E o projeto inteiro de um cliente vira:

```bash
npx shadcn add @brand/6a35570c13ded9555a7435d7   # o tema da marca
npx shadcn add @visant/marquee @visant/rail      # os componentes, sem cor
```

**Trocar de cliente = rodar um comando.** O componente nunca soube a cor.

### O mapeamento (ancorado no shape real da API, não inventado)

Conferi o retorno de duas marcas. O que vem populado e confiável é
`colors[].role` e `typography[].role`:

```jsonc
// Visant®, seções colors + typography
"colors": [
  { "hex": "#f3e9e9", "name": "Offwhite",      "role": "background", "usage": 0.49, "usageRank": 1 },
  { "hex": "#0d0d0d", "name": "Chumbo",        "role": "primary",    "usage": 0.27, "usageRank": 2 },
  { "hex": "#1f7878", "name": "Mid Tone",      "role": "secondary",  "usage": 0.17, "usageRank": 3 },
  { "hex": "#52ddeb", "name": "Azul Destaque", "role": "accent",     "usage": 0.06, "usageRank": 4 },
  { "hex": "#000000", "name": "Escura",        "role": "text",       "usage": 0.01, "usageRank": 5 }
],
"typography": [
  { "family": "Manrope", "style": "Bold",    "role": "primary" },
  { "family": "Oswald",  "style": "Regular", "role": "secondary" }
]
```

**Mas o vocabulário de `role` NÃO é fixo entre marcas.** Amostrei três e vieram
três vocabulários diferentes:

| Marca | Roles de cor | Roles de tipo |
|---|---|---|
| Visant® | `background · primary · secondary · accent · text` | `primary · secondary` |
| Hockey Direct | `background · surface · secondary · accent · accent-secondary · text-on-dark · muted · text` | `display · body · label · feature` |
| Days n' Days | `text · accent` (só 3 cores) | `heading` |

Consequência direta no gerador: **não é um mapa fixo, é um mapa de sinônimos com
cadeia de fallback.** `display → primary → heading → a primeira que existir`.
Um mapa rígido de cinco roles quebraria em duas das três marcas que testei.

Com isso, o alvo cai no vocabulário de tokens do shadcn:

| `role` da API | CSS var | Observação |
|---|---|---|
| `background` | `--background`, `--card` | Se faltar, usa o de maior `usageRank` |
| `text` | `--foreground` | |
| `primary` | `--primary` | |
| `secondary` | `--secondary` | |
| `accent` | `--accent`, `--ring` | |
| — | `--muted`, `--border` | **Derivados** por `color-mix` de background+text |
| — | `--primary-foreground` etc. | **Calculados por contraste**, nunca chutados |
| `typography[role=primary]` | `--font-display` | |
| `typography[role=secondary]` | `--font-sans` | |

`usage` e `usageRank` são o desempate: quando `role` falta ou repete, a cor de
maior participação é a tela. Sem isso, uma marca com dois `text` vira moeda ao ar.

### O bug que trava tudo, verificado hoje

O engine casa `role` por **igualdade exata** (`src/engine.js:37`), e tira a fonte
só de `typography[role=primary|secondary]`. Rodei ele com o seed real da Hockey
Direct:

```
node scripts/build.js /tmp/hockey.json

[light]  PASS 14.89:1 foreground/background   ✓ cores certas, AA passando
[dark]   PASS 16.05:1 foreground/background   ✓ --brand = oklch(.9256 .2066 127.69) = o lime

--font-sans:    'Manrope'   ✗  a marca é Archivo
--font-display: 'Oswald'    ✗  a marca é Archivo/Syncopate
```

**As fontes da Visant vazaram para a Hockey Direct, sem erro nenhum.** A marca
não tem `role: primary`, então o fallback entrou calado. Um site inteiro sairia
fora da marca, e o defeito só apareceria quando um humano olhasse.

É a correção número um, e é barata: mapa de sinônimos com cadeia de fallback
(`display → primary → heading → a primeira que existir`) e **falhar alto** quando
nenhuma casar. Fallback silencioso é pior que falha — ele se espalha antes de
alguém ver.

*(A verificar com designer, não afirmo: o `--background` gerado saiu mais claro
que o `#011301` do vault. Pode ser derivação deliberada do Leonardo para a rampa
fechar em AA, ou perda do canvas real. Precisa de olho humano.)*

### O portão — e por que ele é obrigatório

**Os vaults não são todos confiáveis, e a própria API declara isso.** As duas
marcas que inspecionei vieram com `extraction.completeness: 64`. E a Hockey
Direct já nos custou caro: o vault dela estava **29% completo, com tipografia e
cores trocadas** — o sistema real estava nos layouts, não no vault.

Então a rota dinâmica **não gera tema cego**:

1. Abaixo de um limiar de `completeness`, ela devolve erro com o número, não um
   tema ruim em silêncio. Tema errado é pior que tema ausente: ele se espalha
   por todo o site antes de alguém perceber.
2. `brand-guidelines-health-check` roda antes de promover uma marca a fonte.
3. O tema gerado sai com `_source: { brandId, version, completeness, geradoEm }`
   dentro do próprio item. Quando alguém perguntar de onde veio a cor, a
   resposta está no arquivo.

**Atenção, achado real:** as seções `tokens` e `themes` aparecem em
`activeSections` das duas marcas, mas **voltaram vazias** quando pedidas. Ou
seja: hoje a fonte de verdade utilizável é `colors` + `typography`, e o gerador
tem que derivar o resto. Popular `tokens` no vault é o que faria o motor sair de
"bom" para "exato" — vale medir quantas das 24 marcas têm `tokens` de fato antes
de decidir se o gerador deriva ou lê.

---

## 3. Inventário de colheita — o que já está pronto para virar item

### De `@Clients - Web/Hockey Direct` (auditado a fundo, alta confiança)

| Item | Tipo | Onde está | Por que vale |
|---|---|---|---|
| `visant-motion` | `registry:theme` | `mockup/src/style.css` | `--ease-*`, `--dur-*`. SSoT de motion da casa. **Primeiro item a subir** |
| `marquee` | `registry:ui` | `mockup/src/style.css` | Base + `--fade --band --tilt --reverse`, pausa fora da tela, reduced-motion. Já nasceu com API |
| `rail` | `registry:ui` | `mockup-b` | scroll-snap nativo + setas com estado desabilitado |
| `plate` | `registry:ui` | `mockup-b` | Placa `multiply` que resolve foto de catálogo sobre fundo colorido |
| `filter-chips` | `registry:ui` | `mockup-b` | Pastilha com estado `aria-pressed` |
| `product-grid-filter` | `registry:block` | `mockup-b` | Filtro + grade + contagem viva + load-more honesto. O bloco mais valioso |
| `filterbar-sticky` | `registry:block` | `mockup-b` | Gruda e condensa, com `--header-h` **medido** |
| `trust-bar` | `registry:block` | `mockup-b` | Quatro provas com ícone |
| `mega-nav` | `registry:block` | `mockup-b` | Painel full-width sem reflow, com o gotcha do contexto resolvido |
| `store-status` | `registry:ui` | `mockup/src/folds/proof.js` | Horário em fuso fixo, sem afirmar hora errada |
| `range-picker` | `registry:ui` | `mockup-c` | `<input type=range>` repintado. Acessível de graça |
| `gsap-motion-layer` | `registry:lib` | `mockup-b/src/motion.js` | Lenis + ScrollTrigger **com o ciclo de vida do editor Shopify** |

### De `visantlabs-os` — COLHIDO em 30/07/2026

Estados de espera e controles de painel. O motivo de terem vindo juntos: quatro
telas do mesmo produto montaram o mesmo card de "gerando" por conta própria, cada
uma com espaçamento e verbos diferentes — espera é onde a inconsistência mais
aparece, porque é onde o usuário fica olhando.

| Item | Origem | Usos na origem | Por que vale |
|---|---|---|---|
| `glitch-chars` | `GlitchLoader.tsx` | 132 | A primitiva de ruído. Base de `status-ticker` e `working-glyph` |
| `status-ticker` | `PremiumGlitchLoader.tsx` | 8 | Verbo que gira + cronômetro. Para espera longa **sem progresso real para medir** |
| `turbulence-field` | `TurbulenceField.tsx` | 2 | `feTurbulence` puro — grade inteira sem estourar contexto WebGL |
| `working-glyph` | `GlitchPickaxe.tsx` | via `generating-tile` | Mostra esforço em vez de pedir paciência. Ícone entra por prop |
| `paper-shuttle` | `FlyingPaperLoader.tsx` | 10 | Loader de **transferência**. A metáfora conta a operação sem uma palavra |
| `generating-tile` | `GeneratingImageCard.tsx` | 7 | A superfície canônica. Variantes `tile` / `inline` / `overlay` |
| `masonry-gallery` | `Masonry.tsx` | 4 | Round-robin: anexar página **nunca reflui** o que já está na tela |
| `scrub-input` | `ScrubInput.tsx` | 14 | Arrasto + roda + setas + duplo-clique no mesmo valor |
| `grid-dots` | `GridDotsBackground.tsx` | 22 | Malha de fundo em um gradiente. Zero nós no DOM |
| `drop-overlay` | `DropOverlay.tsx` | 4 | O estado de drag-and-drop que todo mundo esquece de desenhar |

O que foi **desacoplado** na colheita (a origem continua funcionando; os headers
`// Colhido para o registry` marcam a duplicata):

- hex fixos (`#F5D245`, `#7e7e7eff`, `neutral-*`) → `currentColor` e tokens
- `useTheme` do `grid-dots` → `currentColor` resolve claro/escuro sozinho
- `useTranslation` do `generating-tile` → verbos entram por prop (são voz de marca)
- `pickaxe-swing`/`pickaxe-shine` do `index.css` global → campo `css` do item
- `prefers-reduced-motion`, que **não existia** em nenhum dos originais

**Rejeitados**, e por quê — vale mais que a lista de aceitos:

- `ExtractionOverlay` — zero usos fora de si mesmo. `generating-tile` variante
  `overlay` cobre o caso.
- `VHSText` — depende de `PersistentShaderRenderer` e carrega altura fixa de
  1710px. É peça de campanha, não primitiva.

### De `visant-board` — COLHIDO em 11/08/2026

Busca e filtro. Vieram juntos porque são uma peça só na tela: a barra não serve sem
o campo, o campo não serve sem o menu, e o chip é o que amarra os três. O `data-table`
já era item — o que faltava era tudo que fica **em cima** dele.

| Item | Origem | Por que vale |
|---|---|---|
| `use-debounce` | `hooks/use-debounce.ts` | Dependência de `search-field` e `command-search`. Só borda de saída |
| `search-field` | `IssueSearchBar.tsx` | A referência `agreedValue`: o campo para de se limpar sozinho no commit em que o debounce fecha |
| `filter-menu` | `IssueFiltersMenu.tsx` | Facetas por `groups`. O contador conta **grupos**, não opções |
| `filter-bar` | `IssueFiltersBar.tsx` | Controles por slot — a única API de barra que não cresce em props booleanas |
| `searchable-select` | `ui/searchable-select.tsx` | Combobox que digita dentro de Dialog, com `keywords` ocultos e criação que sobrevive à falha |
| `command-search` | `admin/GlobalSearch.tsx` | ⌘K sem saber buscar nem navegar. Ganhou guarda de corrida que o original não tinha |
| `chip` (prop `onRemove`) | `linear/FilterChip.tsx` | Não virou item: era o mesmo chip com outra semântica |
| `data-table` (sync) | `ui/data-table.tsx` | 44 linhas de correção que o item publicado não tinha: undo em célula, botão dentro de botão, a11y da coluna de ações |

O que foi **desacoplado** na colheita:

- `useI18n` do `search-field` e do `filter-menu` → toda string é prop com default
- `FilterState` / `LinearState` / `PRIORITY_LABELS` / `dateFilter` → `groups` e `chips`
  genéricos. Metade desta colheita reprovou na pergunta 4 do portão como estava
- `fetch('/api/admin/search')`, `useRouter` e `useSidebar` do `command-search` →
  `onSearch` e `onSelect` por prop. É o que faz a peça rodar fora do Next
- prioridade 0–4 em português cravada no arquivo → dado do consumidor

O que foi **acrescentado**, e não existia em nenhum original:

- **guarda de corrida** no `command-search`: resposta que chega fora de ordem não
  repovoa a lista. Sem isso a busca "é ruim" e ninguém sabe dizer por quê
- **`shortcut={null}`**: o atalho é registrado no `document`, então duas buscas na
  mesma página disputavam o ⌘K e abriam as duas
- **erro como estado** na busca — em branco, servidor fora parece "não achei"
- **`aria-live`** na contagem da barra: filtrar muda a lista longe do foco
- **`RadioGroup` de verdade** para faceta excludente, no lugar de checkbox que finge

**Rejeitados como item próprio**, e por quê:

- `FilterChip` — é o `chip` com outra semântica. Dois componentes quase idênticos é
  como se garante que alguém vai corrigir um bug só de um lado.
- `IssueSorting` e `ViewModeToggle` — não auditados, e o `segmented-control` já
  publicado provavelmente resolve o segundo.

### Dos outros repos (levantamento raso — confirmar antes de colher)

- **visantlabs-os** → `packages/brand-tokens` é candidato natural a `registry:theme`
  gerado; `extrude3d` a `registry:lib`.
- **7panel_studio / Vintageuiuxlibrary** → `keyboard-ui` aparece nos dois. **Está
  duplicado**, e duplicata é exatamente o que o registry existe para matar.
- **Visant Library** → `PremiumCard.tsx` está numa pasta `shareable/`. Ou vira
  item, ou some.
- **jaques-os / ProspectOS** → padrões de work-surface (fila, board). Alto valor,
  mas são os mais acoplados a dado — colher por último.

---

## 4. A regra de entrada (o que impede virar lixão)

Um componente só entra no registry se passar nos quatro:

1. **Já foi usado em dois lugares** — ou está prestes a ser. Um uso não é padrão, é arquivo.
2. **Não tem cor própria.** Consome token do tema.
3. **Tem estado vazio, foco visível e `prefers-reduced-motion`** onde couber.
4. **Não sabe de onde vem o dado.** Recebe por prop/slot. Componente que faz `fetch` é feature, não primitiva.

E a regra do CLAUDE.md continua valendo por cima: **componente novo no design
system só com autorização.** O registry facilita distribuir, não autoriza criar.

---

## 5. Fases

### F1 — Promover o registry *(meio dia)*
- `registry.json`: manter `name: "visant"`, dividir em `visant-core` + `vintage`.
- Publicar em `ui.visantlabs.com` (Vercel). `npx shadcn build` já existe no `package.json`.
- Provar o caminho ponta a ponta com **um** item: `visant-motion`.

### F1b — Ligar o motor que já existe *(meio dia, não um dia)*
1. **Corrigir o fallback silencioso de fonte** em `@visant/brand-tokens` — mapa
   de sinônimos + falhar alto. É o que impede usar em produção hoje.
2. `compileBrandTokens` passa a aceitar `brandId` e buscar da API (é o próximo
   item do roadmap do próprio README).
3. Rota `/r/theme-{brandId}.json` em `ui.visantlabs.com` chamando o engine, com
   carimbo `_source: { brandId, version, completeness, geradoEm }` no item.
4. `dist/<brand>.tokens.css` em vez do `visant.tokens.css` fixo — hoje duas
   marcas seguidas sobrescrevem uma à outra.

### F2 — Consumidores *(uma hora)*
Nos três `components.json` que já existem, adicionar:
```json
"registries": { "@visant": "https://ui.visantlabs.com/r/{name}.json" }
```
Teste real: `npx shadcn add @visant/visant-motion` no visantlabs-os.

### F3 — Colher a safra do Hockey Direct *(1–2 dias)*
Subir os 12 itens da tabela §3. Eles já estão escritos, comentados e verificados
a 390px. É a colheita mais barata que existe.

### F4 — Trilha Shopify *(1 dia)*
`registry:file` com `target: ~/assets` e `~/sections`. Validar num tema de teste.

### F5 — Deduplicar *(contínuo)*
`keyboard-ui`, `PremiumCard`, e o que mais aparecer em dois repos.

---

## 6. As três decisões que são suas

1. **Público ou privado?** `ui.visantlabs.com` aberto vira portfólio e recruta —
   mas entrega os blocos de cliente para qualquer um. Recomendo **dois
   namespaces**: `@visant` público (primitivas, temas) e `@visant-pro` privado
   com token (blocos comerciais, ex.: `product-grid-filter`).
2. **React 18 ou 19 como piso?** Dois repos ainda estão em 18. Sugiro piso 18 e
   marcar item que exija 19 — ou o jaques-os quebra em silêncio.
3. **Quem é o dono da regra de entrada?** Registry sem porteiro vira pasta
   compartilhada em seis meses.

---

## 7. O que NÃO fazer

- **Não escrever um CLI.** `npx shadcn add` já resolve namespace, dependência,
  tema e registry privado.
- **Não publicar em npm.** O modelo do shadcn é copiar o código para dentro do
  projeto, e é isso que permite o cliente editar sem fork.
- **Não fazer monorepo dos seis.** Eles têm ciclos de vida diferentes. O registry
  é justamente o acoplamento fraco que dispensa isso.
- **Não colher tudo de uma vez.** Doze itens bons valem mais que oitenta itens
  que ninguém confia.
