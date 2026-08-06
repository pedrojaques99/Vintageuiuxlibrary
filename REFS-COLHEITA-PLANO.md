# Colheita das refs de `.refs` → registry → visant-board

10 capturas de site de agência (ManyPixels, DesignJoy e afins) em
`Z:\Cursor\Vintageuiuxlibrary\.refs`. O pedido: virar componente na library,
escolher os melhores, importar e customizar na `visant-board`.

## A leitura: 10 telas, 5 componentes

As capturas não são 10 peças. Cinco delas são **a mesma peça com variação**, e
um cabeçalho de seção se repete em quatro. Colher 10 clones criaria cinco CTAs
quase iguais no registry — exatamente o que a regra de entrada existe para
impedir.

| Item | Tipo | Refs que cobre | O que resolve |
|---|---|---|---|
| `section-intro` | `registry:ui` | 091347, 091518, 091818, 091941 | Pílula de rótulo + título grande + subtítulo, com medida de linha e centragem já resolvidas |
| `cta-surface` | `registry:ui` | 091523, 091603, 091920, 092104, 091557 | Uma superfície de conversão em três variantes (`bar` \| `panel` \| `card`), com slot de marca/avatares e botão primário + secundário |
| `showcase-card` | `registry:ui` | 091347 | Card de serviço: mídia com selo de seta, título e nuvem de chips |
| `step-cards` | `registry:block` | 091818, 091941 | Passos numerados com visual por slot — a arte de cada passo é do projeto, não do componente |
| `testimonial-wall` | `registry:block` | 091915 | Parede heterogênea de prova social: citação, número, retrato e vídeo na mesma malha |

## O laço, por item

Para cada um dos cinco, na ordem da tabela:

1. **Escrever** em `registry/visant/{ui,blocks}/<nome>.tsx`
   - `"use client"` só se tiver estado/evento
   - zero hex — só `var(--brand)`, `var(--muted)`, `var(--r-surface)`, `var(--ease-out)`
   - dado por prop/slot, nunca `fetch`
   - estado vazio, foco visível, caminho sem movimento (`prefers-reduced-motion`)
2. **Registrar** em `registry.json` (com o campo `css` quando houver keyframe)
3. **Demo viva** em `src/app/catalog.tsx` — a demo importa o mesmo arquivo que o
   `shadcn add` entrega, com `preview: {w,h}` e `span` para o card ter ritmo
4. **Portão**: `npm run verify` (parse do registry, zero hex, catálogo × registry, typecheck)
5. **Olhar** na vitrine em `#/c/<nome>` antes de passar para o próximo

Publicação (`npm run ship` → `shadcn build` + `vite build` + `vercel deploy`)
acontece **uma vez, no fim dos cinco** — não a cada item.

## Fase 2 — seleção

Vitrine no ar, a escolha é sua item a item. Só o escolhido entra na board.

## Fase 3 — visant-board

Destino decidido: **`/services`, `/about` e `/analise`**. Home fica fora (a copy
e o palco 3D estão travados por decisão anterior).

1. `components.json` da board ganha `"@visant": "https://visant-ui.vercel.app/r/{name}.json"`
   (hoje só tem `@aceternity`)
2. `npx shadcn@latest add @visant/<escolhidos>`
3. Customizar **no consumidor**, não no registry: token da board, copy da casa
   (skill `visant-copy`), e o que for correção genérica volta para o registry primeiro
4. Portão de saída: `npm run audit:design`, detector de impeccable e `copy:lint`
   nas rotas tocadas — sem `next build` com o dev de pé

## Riscos anotados

- **Cor da referência é da marca do concorrente.** O lime, o azul e os gradientes
  das capturas não entram no componente; entram como token do tema de quem consome.
- **`section-intro` é pequeno.** Passa no porteiro por repetição (4 das 10 refs),
  não por complexidade. Se na revisão parecer supérfluo, morre antes de publicar.
- **`step-cards` e `testimonial-wall` têm arte dentro do card.** Os mockups e as
  fotos das refs são conteúdo — vão por slot, senão o componente só serve para
  um cliente.
