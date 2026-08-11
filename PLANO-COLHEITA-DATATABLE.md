# Colheita — data-table, busca e filtro

> **Estado: publicado em 11/08/2026.** Os 6 itens novos e o `chip` atualizado estão
> em `https://ui.visantlabs.com/r/`, com página em `/c/<nome>`. Auditoria pós-deploy:
> zero CRLF embutido em qualquer item do registry.
>
> **Pendente, e não é meu para resolver:** o merge de `colheita/data-table-search`
> em `main`. O checkout principal está com trabalho não commitado de outra sessão
> (`erase-field.tsx`, `COLHEITA-VISANTISMO-CLUB.md`, e edições em `marquee.tsx`,
> `registry.json`, `catalog.tsx`) — e `registry.json` e `catalog.tsx` são arquivos
> que as duas colheitas tocam. Um fast-forward apagaria o trabalho de lá.
> A branch está empurrada para `origin`; o merge sai quando aquela sessão commitar.s

**Worktree:** `Z:\Cursor\.worktrees\registry-datatable` · branch `colheita/data-table-search`
**Origem:** `Z:\Jobs 2.0\2026\@Automations\gpt-image-generator\visant-board`
**Destino:** registry `@visant` → `https://visant-ui.vercel.app/r/{name}.json`

---

## O portão de entrada

A skill `visant-registry` cobra quatro perguntas. Componente que falha em uma não
entra como está — entra **generalizado**, ou não entra.

| Candidato | 1. Dois usos? | 2. Vive sem cor própria? | 3. Vazio/foco/sem-motion? | 4. Ignora de onde vem o dado? | Veredito |
|---|---|---|---|---|---|
| `data-table` | sim (20+ telas) | sim | sim | já acoplado a Next, e o item declara isso | **Atualizar** |
| `FilterChip` | sim (2 telas) | sim | sim | sim | **Entra** (como prop do `chip`) |
| `IssueSearchBar` | sim | sim | sim | ❌ `useI18n` | **Generalizar** → `search-field` |
| `searchable-select` | sim (Cliente, Job, Responsável…) | sim | sim | sim, strings PT fixas | **Entra** (strings viram prop) |
| `IssueFiltersBar` | 1 uso | sim | sim | ❌ `FilterState`, `LinearState`, prioridades PT fixas | **Generalizar** → `filter-bar` |
| `IssueFiltersMenu` | 1 uso | cor vem do dado (ok) | sim | ❌ `FilterState`, `PRIORITY_LABELS`, `dateFilter` | **Generalizar** → `filter-menu` |
| `GlobalSearch` | 1 uso | sim | sim | ❌ **faz `fetch('/api/admin/search')`**, rotas fixas, `useSidebar`, `useRouter` | **Generalizar** → `command-search` |

O item 4 é o que mais reprova: metade desses componentes conhece o formato do dado
do board. `IssueFiltersMenu` sabe que existe prioridade 0–4 em português e um
`dateFilter.range`; o próximo cliente tem outra coisa. A forma é boa, o miolo não viaja.

---

## O que vai pro registry

### 1. `data-table` — atualizar (não é colheita nova)

O registry tem um snapshot de **807 linhas**; o board está em **851**. As 44 linhas
de diferença são três correções que valem para qualquer consumidor:

- **Ctrl+Z dentro de célula.** A pilha de undo da tabela roubava o undo nativo do
  `<input>` e revertia a célula anterior inteira em vez de apagar a última letra.
- **Hydration error.** O invólucro do header era sempre `<button>` — inclusive em
  volta do `<Checkbox>` do Radix, que também é `<button>`. Botão dentro de botão é
  HTML inválido; o React derrubava erro no console de **toda** tela com seleção.
- **A11y da coluna de ações.** Deixava de se anunciar como botão que não faz nada.

Ação: copiar o corpo do board por cima, **preservando os imports adaptados** do
registry (`./inline-edit`, `./input`). O acoplamento a `next-auth` + `next/navigation`
continua — já está declarado na `description` do item e destravá-lo é outro trabalho.

### 2. `chip` — ganha `onRemove` (aditivo, não quebra ninguém)

O `chip` do registry é um **toggle** (`aria-pressed`, filtro que liga/desliga).
O `FilterChip` do board é um **filtro já aplicado que se remove no clique**. São dois
papéis diferentes, e o Linear tem os dois na mesma tela — mas não merecem dois
componentes quase idênticos.

Prop opcional `onRemove`: quando presente, o chip renderiza o `×` e vira botão de
remoção (`aria-label="Remover filtro X"`), sem `aria-pressed`. Quem não passa nada
recebe exatamente o de hoje.

### 3. `search-field` — novo `registry:ui`

Campo de busca com debounce, ícone e botão de limpar. O que justifica colher em vez
de reescrever é a **referência `agreedValue`** — 30 linhas de comentário guardando um
bug caro: sem ela o campo se limpava sozinho no commit em que o debounce fechava, e a
tabela filtrava/desfiltrava em loop com o texto piscando fora do campo.

Desacoplar: `useI18n` sai, `placeholder` vira prop com default. Depende de
`use-debounce` (novo hook), `input`, `button`, `utils`.

### 4. `use-debounce` — novo `registry:hook`

Trivial, mas é dependência de `search-field` e de `command-search`. Segue o padrão do
`use-media-query` já publicado (`target: @hooks/…`).

### 5. `filter-menu` — novo `registry:ui`

A forma do `IssueFiltersMenu` sem o miolo do board. API por descrição, não por domínio:

```ts
groups: { key, label, mode: "multi" | "single",
          options: { id, label, dot?: string }[] }[]
selected: Record<string, (string | number)[]>
onToggle(groupKey, optionId): void
onClear?(): void
```

O `dot` é cor **vinda do dado** (a cor do status no Linear), não cor do componente —
passa no grep de hex porque não está no arquivo. O contador no gatilho conta **grupos**
ativos, não opções, que é o que o board já fazia certo.

### 6. `filter-bar` — novo `registry:ui`

O esqueleto do `IssueFiltersBar` sem `FilterState`: recebe `chips`, e slots
`search` / `filters` / `sort` / `view` / `extras`, mais `filteredCount`/`totalCount`.
Monta a linha de controles e a segunda linha de chips ativos. Zero conhecimento de
status, prioridade ou label.

Distinto do `sticky-filterbar` já publicado, que resolve **grudar e condensar** e não
sabe montar nada — os dois compõem: `<StickyFilterbar><FilterBar …/></StickyFilterbar>`.

### 7. `command-search` — novo `registry:ui`

O ⌘K do board, sem o board. O fetch sai por completo:

```ts
onSearch: (q: string) => Promise<Result[]>   // quem chama busca; o componente só pinta
quickLinks?: Result[]                         // o "Acesso Rápido" com a busca vazia
onSelect: (r: Result) => void                 // navegação é do consumidor
iconFor?: (type: string) => ReactNode
minChars?: number                             // default 2
```

Saem: `useRouter` (o registry é React/Vite, não Next), `useSidebar`, as nove rotas
`/admin?tab=…` cravadas, e o mapa de palavras-chave em português — esse vira exemplo
na vitrine, não código do componente.

**Não colide com `vintage-command-palette`**: aquele é do kit vintage, preso ao
`vintage-theme`, e é paleta de *comando*. Este é busca de *conteúdo* com resultado
assíncrono e estado de carregando.

---

## Ordem de execução

1. `use-debounce` (dependência de dois itens)
2. `chip` ganha `onRemove`
3. `search-field`
4. `filter-menu`
5. `filter-bar`
6. `searchable-select`
7. `command-search`
8. `data-table` sincronizado
9. Registrar os 7 itens novos/alterados em `registry.json` — incluindo o campo `css`
   onde houver keyframe ou `prefers-reduced-motion`
10. Demo de cada um na vitrine (`src/`)
11. `pnpm install` no worktree, `npm run build:registry`, `npm run verify`
12. **Verificar em projeto limpo** — nunca no de origem
13. Merge em `main` e `npm run ship`

## Os portões (nenhum é opcional)

- [x] `grep -cE "#[0-9a-fA-F]{6}"` em cada arquivo novo → **0** nos sete
- [x] Trocar de tema não toca componente — nenhum item de tema tem `files`, só
      `cssVars`, e nenhum arquivo tem cor própria. O portão de hex é o que prova
- [x] Nenhum `fetch` dentro de componente
- [x] Estado vazio, foco visível e caminho sem movimento em cada um
- [x] `registryDependencies` e `dependencies` declarados — `npm run check:deps`
      confirma que todo item declara o que importa
- [x] `tsc --noEmit` limpo, com os itens novos **dentro** do typecheck (as pontes
      em `src/hooks` e `src/components/ui` existem para isso)
- [x] `npm run check:css-tokens` — pegou `shadow-[var(--x)]` caindo no valor
      inicial transparente do Tailwind v4 em três arquivos. Corrigido para
      `[box-shadow:var(--x)]`
- [x] `npm run test:install` — os 7 itens instalam e compilam em projeto limpo,
      contra o registry servido localmente, **antes** do deploy
- [x] Cabeçalho de origem nos 8 arquivos do board
- [x] Inventário atualizado em `VISANT-REGISTRY-PLANO.md`

## O que apareceu no caminho e não estava no plano

- **`shortcut` no `command-search`.** O atalho é registrado no `document`: montar
  a demo na vitrine roubaria o ⌘K de quem só está navegando o catálogo — e o mesmo
  choque acontece num app com busca no cabeçalho **e** dentro de um painel.
  `shortcut={null}` desliga. Sem essa prop, a peça não podia ser demonstrada.
- **Guarda de corrida na busca.** O original não tinha: duas consultas em voo
  voltam fora de ordem e a lista mostra o resultado da antiga com o texto novo no
  campo. Cada disparo agora carimba um número e só o último escreve no estado.
- **Erro como estado.** Servidor fora aparecia como "nada encontrado".
- **`aria-live` na contagem** e **`RadioGroup`** para faceta excludente.
- **Pontes de vitrine** (`src/hooks/use-debounce.ts`, `src/components/ui/chip.tsx`):
  reexport, não cópia. Sem elas os arquivos novos ficariam fora do `tsc`, e o
  registry publicaria código que ninguém checou — que é como o `data-table` foi
  parar na exclusão do `tsconfig`.
- **`.gitattributes` com `eol=lf`** — a armadilha mais cara desta sessão.

## A armadilha do CRLF, escrita para não voltar

O worktree foi criado num Windows com `core.autocrlf=true`, então os fontes
vieram com CRLF. O `shadcn build` embute o **conteúdo** de cada arquivo dentro do
JSON publicado — e carimbou `\r\n` literal em **51 itens**, inclusive os 44 que
esta colheita não tocou.

O sintoma engana: `git diff --stat` acusava 51 arquivos alterados sem uma linha de
código diferente. Publicado assim, todo `shadcn add` na casa de quem instala
passaria a escrever arquivos com fim de linha do Windows.

Pior: **já tinha acontecido antes**. `timeline`, `assignee-stack`, `inline-edit`,
`kanban`, `octahedron-loader`, `repulsive-hover` e `segmented-control` estavam
publicados com `\r\n` gravado no conteúdo, de um build anterior feito numa árvore
CRLF. O rebuild desta sessão os conserta de carona.

`* text=auto eol=lf` no `.gitattributes` fecha isso para qualquer clone futuro. As
linhas `binary` ao lado não são decoração: normalizar a árvore inteira sem elas
corrompe PNG e fonte em silêncio — foi o que aconteceu com 59 arquivos aqui,
restaurados do HEAD.

## O que este plano NÃO faz

- **Não retrofita o visant-board.** Trocar os componentes de um app que funciona é
  risco sem receita; o valor está nos projetos novos. Só o cabeçalho de sinalização
  entra lá — a decisão de 30/07/2026 vale como padrão.
- **Não destrava o `data-table` do Next.** `next-auth` e `next/navigation` continuam;
  é trabalho próprio, com seu próprio risco de regressão silenciosa.
- **Não colhe** `IssueSorting` nem `ViewModeToggle` — não olhei ainda, e o registry já
  tem `segmented-control`, que provavelmente resolve o segundo.
