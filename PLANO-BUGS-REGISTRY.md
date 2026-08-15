# Plano — zerar os 47 bugs abertos do registry

Fonte: `bugs/REPORTS.md` (47 abertos, 25 resolvidos). Regra do trabalho: **valorizar
cada componente, no tamanho dele**.

---

## O diagnóstico que junta 15 bugs

`src/app/Gallery.tsx:212` monta todo card como faixa cheia (`shell-max` = 90rem) e
prende o palco em `maxWidth: Math.max(w, 720)`, alinhado à esquerda, com
`FitStage maxScale={1}`.

Resultado: uma demo declarada com 420px desenha 420px reais, encostada à esquerda,
dentro de um card de ~1350px. É literalmente o que os reports dizem — "não ocupa
espaço suficiente no card", "espremido ou pequeno no catálogo", "centralizar".

Não é bug de 15 componentes. É um bug de layout, 15 vezes.

### O conserto: grade mosaico (Pinterest de componentes)

A grade passa a ler o `preview: { w, h }` que cada item **já declara** e derivar
dele o quanto de grade a peça ocupa:

| tamanho natural | ocupa | exemplos |
| --- | --- | --- |
| `w ≤ 440` | 1 coluna (ladrilho) | chip, plate, spring-dots, vintage-knob |
| `440 < w ≤ 700` | 2 colunas | rail, gleam, line-reveal, cover-art |
| `w > 700` | faixa cheia | testimonial-wall, pinned-scene, photo-flip, kanban |

- Coluna base fixa (~330px) + goteira generosa: a peça desenha em **escala 1**,
  centrada. Encolher só acontece quando a coluna é menor que a peça (celular).
- Altura do card sai de `h` — masonry por `grid-row: span N` (técnica padrão de
  CSS grid, sem lib, sobrevive ao prerender).
- Peça grande **não** vira ladrilho gigante escalado: ela ganha a faixa inteira,
  que é o tamanho em que foi desenhada.

Bugs que isso fecha: `sticky-filterbar-2/3`, `timeline-2`, `cover-art-2` (parte),
`skeleton-rail-2`, `pinned-scene-1`, `spine-card-2` (parte), `measure-bar-1`,
`spring-dots-2`, `erase-field-2`, `testimonial-wall-3`, `showcase-card-2`,
`vintage-toggle-1`, `assignee-stack-2` (parte), `sim-slider-1` (parte),
`vintage-large-knob-1` (parte).

---

## As frentes em paralelo

Cada frente é dona dos **arquivos de componente** dela e escreve demo nova em
`src/app/demos/<nome>-demo.tsx`. Ninguém encosta em `catalog.tsx` nem em
`Gallery.tsx` — a fiação e a grade são feitas em passe único, pra não haver duas
mãos no mesmo arquivo.

| # | frente | itens |
| --- | --- | --- |
| 0 | grade mosaico + fiação | `Gallery.tsx`, `stage.tsx`, `catalog.tsx` |
| 1 | aquisição slop | chip, plate, rail, store-status, masonry-gallery, measure-picker |
| 2 | superfície de trabalho | sticky-filterbar, timeline, assignee-stack, brand-selector, kanban (drag) |
| 3 | galeria de loadings | glitch-chars, working-glyph, paper-shuttle, generating-tile, status-ticker, octahedron-loader |
| 4 | motion e campo | grid-dots, turbulence-field, drop-overlay, count-up, fold-motion, use-pointer-parallax, repulsive-hover |
| 5 | foto e marca | photo-compare, gleam, line-reveal, cover-art, step-cards, masonry, showcase-card, spine-card, skeleton-rail |
| 6 | kit vintage | vintage-knob, vintage-large-knob, vintage-meter, vintage-slider, vintage-led |

### Decisões tomadas

- **"Juntar numa galeria"** (6 loadings, hover, vintage-led): os itens continuam
  publicados individualmente no registry — ninguém que já instalou quebra. O que
  muda é a vitrine: um card de galeria mostra todos rodando, cada um com o nome
  do item embaixo. Valoriza cada peça em vez de enterrar seis cards mortos.
- **Nada de ampliar por CSS.** Peça pequena que parece pobre não se resolve com
  `scale(1.6)` — se resolve desenhando uma cena que mereça o ladrilho.
- **A demo é o componente de verdade**, importado do mesmo arquivo que o
  `shadcn add` entrega. Regra que já vale no repo e não muda aqui.

### Portões antes de fechar

```
npm run typecheck
npm run check:catalog
npm run check:deps
npm run check:css-tokens
```

E o bloco `css` das peças é **gerado** por `scripts/registry-css.mjs` — nunca
espelhado à mão.
