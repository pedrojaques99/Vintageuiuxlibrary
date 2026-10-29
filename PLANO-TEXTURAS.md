# Plano — família Texturas (14 peças)

Família nova `texturas` no catálogo (chave `texturas`, rótulo "Texturas"), ao lado de `shaders`.
Peças em `registry/visant/ui/textura-<nome>.tsx`, todas WebGL self-contained no contrato do
`shader-halftone` / `shader-voronoi`: tokens de cor (`resolveCssColor` + `onThemeChange`),
canvas nascendo no efeito, laço dormindo fora da tela e com movimento reduzido (um quadro
parado), `WEBGL_lose_context` no unmount, props com `@min/@max/@step`, zero hex.

A tese da família: **superfície que reage ao ponteiro**. Cada uma tem um gesto só.

## Sobre imagem (`src`)

| Peça | Gesto |
|---|---|
| `textura-pinch` | A imagem é sugada pro ponteiro, como pele beliscada. |
| `textura-sphere` | Uma bolha de vidro (fisheye) passeia sob o ponteiro. |
| `textura-twist` | A imagem gira em redemoinho em volta do ponteiro, e desfaz ao sair. |
| `textura-tiles` | A imagem em ladrilhos que se inclinam e se afastam perto do ponteiro. |
| `textura-warp` | A imagem escorre em ruído (domain warp); o ponteiro rápido agita. |

## Gerativas (sem imagem)

| Peça | Gesto |
|---|---|
| `textura-watch` | Grade de mostradores cujos ponteiros apontam pro cursor. |
| `textura-gaze` | Grade de olhos; as pupilas seguem o cursor e piscam de vez em quando. |
| `textura-magnet` | Limalha de ferro: traços curtos que se alinham ao campo do ponteiro. |
| `textura-settle` | Areia/grão que o ponteiro espalha e que assenta de volta devagar. |
| `textura-glow` | Brilho macio na cor da marca que segue o ponteiro sobre grão fino. |
| `textura-beam` | Facho de luz do alto, com poeira, que mira o ponteiro. |
| `textura-current` | Linhas de fluxo como correnteza, que desviam do ponteiro. |
| `textura-curtain` | Cortina de dobras verticais que ondula onde o ponteiro passa. |
| `textura-pillars` | Campo de pilares em pseudo-3D que sobem perto do ponteiro. |

## Fiação (igual aos shaders do ImageLab)

Componente + demo (`src/app/demos/textura-<nome>-demo.tsx`) + fragmento `colheita/textura-<nome>.json`
+ entrada no `registry.json` + `catalog.tsx` (família `texturas`) + `uso.json` + ATTRIBUTIONS,
geradores rodados (`registry-meta`, `props/controls/gpu`, `lang-extract`), `build:shots`.

## Portões

`tsc`, `pnpm build`, `catalog-check`, `deps-check`, `controls-check`, `css-tokens-check`,
`casa-lint`, `privacy-check`, `shadcn build`, Playwright `pecas-fundo-branco` + `pecas-responsivas`
filtrando `textura-`, folha de contato claro/escuro. Depois `npm run ship`.
