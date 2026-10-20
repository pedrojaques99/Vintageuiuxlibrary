# Redesign da casa: design system e tokens da library

Data: 2026-10-19 · Branch: `vitrine-nivel-reactbits` · Referências: Bench (bench.basement.studio), Apple

> Decidido com o usuário: **casca neutra**, **navegação no modelo Bench (sem sidebar)**,
> **o card é só a demo**, **uma sans e mono só em código** (Geist, com Manrope como alternativa).

---

## 1. Diagnóstico (o advogado do diabo)

### A raiz: a casca não tem identidade própria

- `src/styles/theme.css` é o tema padrão do shadcn/Figma Make, **nunca editado**
  (`--primary: #030213`, `--radius: 0.625rem`, `chart-*` de exemplo).
- O header, a sidebar e os cards leem `--brand`, `--r-control`, `--r-pill` e `--r-surface`
  (49 + 29 + 14 + 13 usos em `src/app/*.tsx`). Esses tokens são definidos pelo
  **preset da marca do cliente** (`.brands-local/theme-*.json`).
- Resultado: quem escolhe "Vega Noturno" repinta a library inteira. Daí vêm a borda
  rosa e ciano no card ativo, o contorno grosso em "Catálogo" e "Todas as categorias",
  e os raios que mudam de marca pra marca. **A vitrine se veste com o que deveria só
  estar mostrando.**

### O acúmulo (print de /catalogo, contado)

| Região | Peças de cromo hoje | Problema |
|---|---|---|
| Header | logo, Buscar ⌘K, 2 toggles de layout, tema, seletor de marca (avatar + nome + fonte + versão + switch + ⌘B), Entrar | 9 controles; o seletor sozinho tem 5 informações |
| Barra da grade | 2ª busca, Mídia, mosaico/lista, "Tipo e peso" | **duas buscas na mesma tela** (`busca.tsx` e `Gallery.tsx:865`): porta repetida |
| Sidebar | SEÇÕES, CATÁLOGO · 95 PEÇAS · 15 NOVAS, 6 cabeçalhos em caixa-alta, 95 nomes mono, 7 selos NOVO | é a grade inteira escrita uma segunda vez |
| Card | moldura externa, moldura interna da demo, título, `FAMÍLIA · TIPO` em mono caixa-alta, botão "add" | bloco dentro de bloco; "add" 95 vezes |

Antes do primeiro pixel de demo, a tela tem **mais de dez** blocos de texto. A meta é três.

### O que o Bench faz e a gente não

1. O tile **é** a peça: um tom de cinza acima do fundo, sem stroke, raio generoso.
2. A separação vem de **tom e espaço**, nunca de linha.
3. Nome, descrição, controles e ação moram **no painel que abre ao clicar**, não no card.
4. Um só destaque por tela (o botão branco "Add to bench"). O resto é cinza.
5. Controle segmentado e slider de valor **dentro** do painel, nunca na grade.

---

## 2. Tokens da casa (novos, `--casa-*`)

**Por que um prefixo próprio e não reescrever `--background`:** as peças do registry
leem as variáveis do preset em `document.documentElement` (`book-material.ts:101`,
`css-color.ts:23`). Isolar a marca num wrapper quebraria essas peças. Então o preset
continua no `:root` (contrato das peças, intocado) e a casca passa a ler **só** `--casa-*`.

Arquivo novo: `src/styles/casa.css`, importado em `index.css`. Canal HSL solto, como manda o portão.

### Cor (dark-first, espelhado no claro)

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| `--casa-bg` | `0 0% 4%` | `0 0% 98%` | fundo da página |
| `--casa-tile` | `0 0% 9%` | `0 0% 94%` | tile, painel, campo |
| `--casa-tile-2` | `0 0% 13%` | `0 0% 90%` | hover do tile, controle ativo |
| `--casa-fg` | `0 0% 96%` | `0 0% 8%` | texto principal |
| `--casa-fg-2` | `0 0% 60%` | `0 0% 40%` | texto de apoio |
| `--casa-fg-3` | `0 0% 38%` | `0 0% 62%` | atalho de teclado, placeholder |
| `--casa-line` | `0 0% 100% / 0.06` | `0 0% 0% / 0.08` | **só** divisor de painel, nunca contorno de card |
| `--casa-cta` | `0 0% 100%` | `0 0% 6%` | o único destaque: botão primário (branco sobre preto) |

Zero cor de marca na casca. A marca aparece só dentro do palco da demo.

### Forma

| Token | Valor | Uso |
|---|---|---|
| `--casa-r-tile` | `20px` | tile da grade e painel de foco |
| `--casa-r-control` | `10px` | campo de busca, botão, segmentado |
| `--casa-gap` | `12px` | entre tiles |
| `--casa-stroke` | **nenhum** | card e painel não têm borda; foco usa `outline` de 2px em `--casa-fg` |

Fim do `rounded-full` em filtro e selo. Fim de raio por marca na casca.

### Tipo

- **Geist** pra toda a casca (`@fontsource-variable/geist`) e **Geist Mono** só em
  comando e código (`@fontsource-variable/geist-mono`). É o mesmo par, do mesmo desenho,
  o que fecha o sistema com uma família só. Manrope (`@fontsource-variable/manrope`) é a
  alternativa, mas não tem mono par, então o código ficaria em outra família.
- Pesos: **400 e 500**. Nada de 600/700 na casca.
- Escala substitui os seis degraus atuais (`micro`, `rotulo`, `apoio`, `corpo`, `destaque`, `titulo`):

| Token | Tamanho / altura | Uso |
|---|---|---|
| `--text-casa-sm` | 12 / 16 | atalho, metadado no painel |
| `--text-casa-base` | 14 / 20 | nav, filtro, nome no tile, corpo do painel |
| `--text-casa-lg` | 16 / 24 | título do painel |
| `--text-casa-xl` | 32 / 36, tracking -0.02em | título de página (Kits, Marca) |

- **Proibido na casca:** caixa-alta com tracking, mono decorativo, `text-micro`.
- Saem do `fonts.css` o Red Hat Mono e o Orbitron globais. Ficam só no `vintage.css`,
  que é do kit vintage.

### Movimento

Mantém a SSoT atual (`--ease-out`, `--dur-*` no `tailwind.css`). Hover do tile muda
**só o tom** (`--casa-tile` pra `--casa-tile-2`), com 160ms. Sem escala, sem levantar.

---

## 3. Superfícies, de ponta a ponta

### Header (único, 56px, `App.tsx:289`)

```
[◆ visant/ui]   Kits  Catálogo  Marca          [ Buscar   ⌘K ]   ◐   Entrar
```

- Sai o `backdrop-blur-xl` (proibido fora de dialog): fundo sólido `--casa-bg`.
- Sai a `border-b`: a separação é o próprio scroll.
- **Seletor de marca** encolhe pra um ponto de cor com o nome da marca (sem fonte, versão,
  switch e ⌘B visíveis). O resto abre no popover. O atalho fica, só não é anunciado.
- Os dois toggles de layout do header saem: mosaico/lista é decisão da grade, não da casa.

### Navegação (sem sidebar)

- `src/app/sidebar.tsx` sai da rota. O argumento dela ("mostrar o tamanho do acervo")
  passa a ser coberto por: a contagem na linha de filtro (`Tudo 95`) e a grade em si.
  O índice por nome vive no ⌘K (`busca.tsx`), que já existe.
- Linha de filtro acima da grade, em **texto**, não chip: `Tudo  Trabalho  Aquisição  Motion  Marca  Vintage  Fundação`.
  Ativo = `--casa-fg`; inativo = `--casa-fg-2`. Sem fundo, sem borda.
- Os rótulos das famílias encurtam ("Superfície de trabalho" vira "Trabalho", "Motion e estado" vira "Motion").

### Grade do catálogo (`Gallery.tsx`)

- **Uma busca só:** a do header (⌘K). A segunda, em `Gallery.tsx:865`, sai.
- "Mídia" e "Tipo e peso" saem da barra e vão pro painel de foco (são controles da peça,
  não da grade). Mosaico/lista vira um ícone discreto no fim da linha de filtro.
- Selo "NOVO" vira um ponto de 6px ao lado do nome no tile, só no hover. A família
  **Novidades** entra como filtro (`Novas 15`).

### Tile (o card)

```
┌──────────────────────────┐
│                          │
│        (demo viva)       │
│                          │
│ Count Up                 │  ← só no hover / fixo no toque
└──────────────────────────┘
```

- Um bloco só: `--casa-tile`, `--casa-r-tile`, sem borda e sem moldura interna da demo.
- Mantém a vitrine fatiada: em `/catalogo` o tile mostra a capa estática (`build:shots`),
  e em `/catalogo/<familia>` mostra a demo viva. O desenho do tile é o mesmo nos dois.
- Saem do tile: `FAMÍLIA · TIPO`, botão "add", contorno de ativo.
- Clique abre o painel de foco. `focus-visible` revela o nome igual ao hover.

### Painel de foco (`ComponentFocus.tsx`)

Modelo Bench: palco à esquerda, coluna de 320px à direita.

```
[ palco da demo                ]  Count Up                  ✕
[                              ]  Uma frase do que faz.
[                              ]
[  ⬚ preview  </> código       ]  Controles (segmentado e slider de valor)
[                              ]
[                              ]  [   Copiar pra IA   ]   ← contorno
[                              ]  [ npx shadcn add ... ]   ← --casa-cta
```

- Sai a grade de pontos do palco (`ComponentFocus.tsx:391`, achado `grade-de-pontos`).
- Controles usam os primitivos que já existem (`controls.tsx`), só com tokens `--casa-*`.
- Um único CTA branco: o comando de instalar.

### Kits, Marca, rota solo

- Mesmos tokens: título `--text-casa-xl`, tiles `--casa-tile`, sem borda.
- `KitRoom.tsx:228` troca o glifo de seta por ícone (`lucide-react`, que já está no projeto).
- Kits e salas mantêm a faixa sangrada (`kits/sala.tsx`); só a casca em volta muda.

---

## 4. O que NÃO muda

- **Peças do registry** (`registry/visant/**`) e o contrato de tokens dos presets de marca.
  Os clientes recebem o mesmo `shadcn add` de hoje.
- `registry.generated.css` (gerado por script, ver memória do CSS dos itens).
- Demos individuais em `src/app/demos/*`: os achados delas (setas, SVG à mão) vão em
  lista separada, fora deste redesign.

---

## 5. Fases

Cada fase é um commit, com print antes/depois. **Nenhuma começa sem o seu ok**, porque
mexem em componentes da casa.

| Fase | Entrega | Arquivos |
|---|---|---|
| 0 | Fonte: `pnpm add @fontsource-variable/geist @fontsource-variable/geist-mono`; tirar Red Hat Mono e Orbitron do `fonts.css` global | `fonts.css`, `main.tsx` |
| 1 | `casa.css` com os tokens da seção 2; `theme.css` do shadcn aponta `--background`/`--foreground` da casca pra `--casa-*` | `src/styles/*` |
| 2 | Header limpo, seletor de marca compacto, sidebar fora, linha de filtro em texto | `App.tsx`, `Gallery.tsx`, `sidebar.tsx` |
| 3 | Tile só demo, busca única, barra da grade enxuta | `Gallery.tsx`, `catalog.tsx` (rótulos) |
| 4 | Painel de foco no modelo Bench | `ComponentFocus.tsx`, `controls.tsx`, `instalar.tsx`, `copiar-pra-ia.tsx` |
| 5 | Kits, Marca, Solo nos tokens novos; `npm run build:shots` pras capas | `KitRoom.tsx`, `BrandStudio.tsx`, `Solo.tsx` |
| 6 | Script `scripts/casa-lint.mjs`: reprova `var(--brand`, `var(--r-`, `uppercase`, `font-mono` e `border` de card dentro de `src/app/*.tsx` da casca. Entra no `verify` | `scripts/`, `package.json` |

A fase 6 é o "script esperto" pra não voltar: a casca não pode reler a marca nem
reintroduzir rótulo gritado sem uma exceção escrita.

---

## 6. Verificação

- `npm run typecheck` e `npm run verify` em cada fase.
- `killer-scan` e `ruido-scan` em `src/app`, com zero achado na casca (as demos ficam fora).
- Abrir de verdade: `/catalogo`, `/catalogo/<familia>`, `/c/<peça>`, `/kits`, `/marca`,
  a 1440px e a 390px, nos temas escuro e claro, com **dois presets diferentes**.
  Critério: a casca fica idêntica ao trocar de marca; só o palco muda.
- Contagem final: blocos de texto antes do primeiro pixel de demo ≤ 3; destaques por tela = 1.

---

## 7. Decisões pendentes

1. **Geist ou Manrope.** Recomendo Geist, pelo par mono do mesmo desenho.
2. **"Entrar com Visant" no header.** Recomendo virar só "Entrar" (texto, sem ícone).
   Também dá pra ir pro popover do seletor de marca, já que o login só serve pra puxar marca.
3. **Bug report nos cards** (memória: botão grava em `bugs/REPORTS.md`). Com o tile só demo,
   ele vai pro painel de foco, como ícone ao lado do ✕. Ok?
