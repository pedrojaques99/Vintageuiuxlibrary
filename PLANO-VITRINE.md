# Plano — a vitrine que aguenta 80 peças

Escrito depois de medir a página e de olhar como shadcn/ui, Origin UI, 21st.dev,
Magic UI, Cult UI, Tailwind Plus, Aceternity, Mantine e Base UI resolvem o mesmo
problema. As fontes estão citadas em cada decisão.

---

## O que a medição diz

| medida | valor |
| --- | --- |
| altura do catálogo | **26.253px** |
| cards com demo | 70 (de 81 entradas) |
| demos montadas em repouso | **6 de 70** — o lazy funciona |
| ocupação do card | **50% a 65%** |

A ocupação **não é o defeito**. O palco de preview do shadcn é `flex h-72 w-full
p-10` — 288px fixos e 40px de padding para qualquer componente, e um botão ali
ocupa ~10% ([component-preview-tabs.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/components/component-preview-tabs.tsx)).
O que incomoda é o ar **desigual** entre vizinhos, e isso vem de eu ter dado a
cada peça um número em px livre. Nenhuma referência faz isso: a mais próxima é o
Origin UI, e ela limita a três baldes (`meta.colSpan` 1/2/3 →
`col-span-4/6/12`, [component-card.tsx](https://github.com/origin-space/originui/blob/main/apps/origin/components/component-card.tsx)).

Os 26.253px, sim, são defeito. **Nenhuma** das referências monta o catálogo
inteiro numa página: todas fatiam por categoria com rota estática
([blocks/[...categories]/page.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/(app)/blocks/%5B...categories%5D/page.tsx),
[originui app/[category]/page.tsx](https://github.com/origin-space/originui/blob/main/apps/origin/app/%5Bcategory%5D/page.tsx)).

---

## O que já existe aqui e vai ser reusado

Isto não é projeto novo — é ligar peças que o repo já tem:

- **`?solo=1`** (`src/app/Solo.tsx`): a peça sozinha, sem casca, no mesmo bundle
  e no mesmo CSS. É a rota de iframe e de captura, já pronta.
- **`scripts/og-images.mjs`**: já abre Chromium via `@playwright/test` e escreve
  PNG em `public/og/`. O script de captura é irmão dele, não invenção.
- **`scripts/prerender.mjs`**: já escreve `dist/c/<item>/index.html` por item. As
  rotas de categoria entram no mesmo laço.
- **`src/app/catalog.tsx`**: cada item já declara `family` — a taxonomia da
  fatia já existe, não precisa de campo novo no registry.

---

## As cinco mudanças, em ordem de impacto

### 1. Rotas estáticas por categoria

`/catalogo` vira índice; `/catalogo/<familia>` carrega 10–15 peças vivas.
Seis famílias já declaradas: trabalho, aquisição, motion, marca, vintage,
fundação. O `prerender.mjs` escreve um HTML por família, com título e descrição
próprios — mesmo tratamento que os itens já recebem.

**Mata os 26.253px.** É o passo que sozinho resolve o sintoma.

### 2. Índice com screenshot, vivo só dentro da categoria

`scripts/capture-registry.mjs`, irmão do `og-images.mjs`: Playwright abre
`/c/<nome>?solo=1&bg=...` em claro e escuro, 2× de densidade, e escreve
`public/shots/<nome>-{claro,escuro}.webp`. Pula o que já existe, como o
`capture-registry.mts` do shadcn faz.

É o mesmo caminho que o shadcn usa para o fallback mobile — lá o `lg:hidden`
troca o iframe por `/r/styles/new-york-v4/{name}-light.png`
([block-viewer.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/components/block-viewer.tsx)).

### 3. Degraus no lugar de px livre

O `preview: { w, h }` continua sendo a verdade da peça. O que muda é que o card
consome isso em **balde**, não em pixel:

| balde | largura declarada | colunas | altura do palco |
| --- | --- | --- | --- |
| `ladrilho` | `w < 480` | 1 | 260px |
| `duplo` | `480 ≤ w < 700` | 2 | 340px |
| `faixa` | `w ≥ 700` | 3 (cheia) | 460px |

Peça que declara mais alto que o balde continua ganhando a altura dela — o
degrau é piso de ritmo, não teto. O ganho é vizinho alinhado com vizinho.

### 4. Iframe `loading="lazy"` nas pesadas

Só onde a peça mexe com o documento inteiro: scroll-driven (`pinned-scene`,
`photo-split`, `marquee` em modo scrub), canvas/WebGL, observer global. Nas
outras, render inline continua sendo mais barato — é o mesmo `if` do shadcn,
que só usa iframe quando `type === "block"`
([component-preview.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/components/component-preview.tsx)).

### 5. Busca que começa vazia

`if (!tags.length) return []` — a linha do Origin UI
([components-container.tsx](https://github.com/origin-space/originui/blob/main/apps/origin/app/search/components-container.tsx)).
Custo zero, derruba o custo do modo busca a zero.

---

## O que NÃO copiar

- **Redimensionador 100/60/30%** — no shadcn existe porque um block *é* uma
  página de 930px. Para 80 peças pequenas é chrome caro e sem uso.
- **Vídeo no hover para tudo** (21st.dev) — só compensa onde a graça é o
  movimento; para o resto é asset a mais para manter.
- **Masonry por px natural** — o que eu fiz hoje. Ninguém faz.
- **Índice de texto puro** (Mantine, Base UI) — funciona porque elas vendem API.
  Aqui se vende aparência: o índice visual **é** o produto.

---

## Divisão do trabalho e o contrato entre as frentes

Três mãos, arquivos disjuntos. O contrato abaixo é o que impede colisão — quem
consome não edita, quem edita publica primeiro.

| frente | é dona de | não encosta em |
| --- | --- | --- |
| **A — rotas** | `src/app/App.tsx`, `scripts/prerender.mjs`, `tests/vitrine.spec.ts` | `Gallery.tsx`, `mosaic.ts`, `catalog.tsx` |
| **B — captura** | `scripts/capture-registry.mjs`, `package.json`, `src/app/Solo.tsx` | tudo de `src/app/` fora do `Solo.tsx` |
| **C — vitrine** (eu) | `src/app/Gallery.tsx`, `src/app/mosaic.ts`, `src/app/catalog.tsx` | `App.tsx`, `prerender.mjs`, scripts |

### Contrato publicado pela frente C, antes de tudo

```tsx
// src/app/Gallery.tsx
export function Gallery({
  focus, onFocus,
  familia,   // Family | null — null = índice de categorias, sem demo viva
  onFamilia, // (f: Family | null) => void — o card de categoria navega
}: GalleryProps)
```

- `familia = null` → a Gallery desenha o **índice**: seis capas de categoria com
  contagem, mais a busca. Nenhuma demo monta.
- `familia = "motion"` → a Gallery desenha só as peças daquela família, vivas.
- A frente A chama; a frente C implementa. Nenhuma das duas edita o arquivo da
  outra.

### Contrato publicado pela frente B

```
public/shots/<nome>-claro.webp
public/shots/<nome>-escuro.webp
```

1200×750, `deviceScaleFactor: 2`, fundo do tema. A frente C consome pelo caminho
— se o arquivo não existir, o card cai no palco vivo de hoje (degradação, não
erro).

---

## Portões

```
npm run typecheck
npm run check:catalog
npm run check:deps
npm run check:css-tokens
npx playwright test
```

Estado ao começar: todos verdes, com **uma** exceção conhecida e anterior a este
trabalho — `marquee.spec.ts › drive: parada sem scroll`, que já falhava no
`HEAD` antes de qualquer mudança desta leva.
