# A vitrine vende peça solta. Ninguém compra peça solta.

Diagnóstico e proposta para a library da Visant — 2026-08-11.

## O que os prints mostram

65 itens numa coluna única, cada um num palco de altura própria, ordenados por
nada em particular. Quatro defeitos, e nenhum deles é de CSS:

1. **Não existe unidade de compra.** O `theme-visant` (uma linha) e o
   `testimonial-wall` (uma seção inteira de landing page) disputam o mesmo eixo
   visual. Quem chega não consegue responder "o que eu levo daqui hoje?".
2. **Os temas estão misturados na vertical.** O `vintage-large-knob` (painel
   preto, LED âmbar, alumínio escovado) encosta no card de papel claro do
   `spine-card`. Rolar a página é atravessar quatro linguagens visuais em
   trinta segundos — a library parece três libraries num arquivo só.
3. **O palco engole a peça.** `scrub-input` e `segmented-control` são objetos de
   180px sozinhos num palco de 720. 80% do card é vazio, e vazio ao lado de
   vazio vira ruído: o `kanban` aparece cortado com barra de rolagem enquanto o
   vizinho tem meia tela sobrando.
4. **Card sem demo continua ocupando palco.** `brand-selector` gasta 300px de
   altura pra escrever "está na barra do topo →".

Nada disso se conserta ajustando espaçamento. O problema é que a página está
organizada pelo que o repositório TEM (65 arquivos) e não pelo que o ICP QUER
(uma composição pronta que ele cola no projeto hoje à noite).

## A tese

> O criativo vibecoder não instala um `chip`. Ele instala **uma mesa de trabalho
> inteira** e passa a tarde ajustando.

Então a unidade da vitrine passa a ser o **kit**: um conjunto curado, com tema
próprio, composição viva em tamanho real, SFX ligado, e **um comando só**.
A peça solta continua existindo — mas embaixo, pra quem já sabe o nome dela.

## Arquitetura: kit é item de registry, não invenção

Nada de formato novo. O shadcn já resolve isto com `registryDependencies`:

```jsonc
// registry/visant/kits/rig-vintage.json
{
  "name": "rig-vintage",
  "type": "registry:block",
  "registryDependencies": ["@visant/vintage-knob", "@visant/vintage-meter", "…13 peças"],
  "files": [{ "path": "kits/rig-vintage.tsx", "type": "registry:component" }]
}
```

`npx shadcn@latest add @visant/rig-vintage` puxa as 13 peças **mais a
composição montada**. O arquivo de composição é o que o `VintageRig.tsx` já é
hoje na aba "Rig vintage" — ele vira o produto em vez de ser demo interna.

## Os kits (a partir do que já existe)

| Kit | De onde sai | Tema da sala | O que é |
| --- | --- | --- | --- |
| **Rig vintage** | família `vintage`, 13 | Painel escuro, LED âmbar, SFX de clique | A bancada. Já existe montada. |
| **Mesa de trabalho** | `trabalho`, 11 | shadcn burilado, claro, sóbrio | Kanban + data-table + tabs + command. O "normal, mas bem feito". |
| **Página que vende** | `aquisicao`, 16 | Papel da marca, tipografia grande | Hero + prova social + step cards + marquee. Landing inteira. |
| **Motion e estado** | `motion`, 14 | Fundo neutro escuro, tudo em loop | O nichado. Vende por hipnose, então roda sozinho. |
| **Marca viva** | `marca` + `fundacao`, 11 | Troca de cor ao vivo | Tokens, tema, selector. O que faz os outros quatro repintarem. |

Cinco kits. Cinco salas. **Um tema por sala, nunca dois na mesma tela** — é o
que mata o defeito 2.

## A tela

```
┌──────────────────────────────────────────────────────────┐
│  ‹     RIG VINTAGE            2 / 5                 ›    │  ← setinha entre kits
│  13 peças · dnd-kit zero · um comando                    │
│  npx shadcn add @visant/rig-vintage            [copiar]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│         [ a composição inteira, viva, no tema dela ]     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  as 13 peças  ▸  knob · meter · fader · led · pad · …    │  ← tira densa, abre o solo
└──────────────────────────────────────────────────────────┘
```

- **Uma sala por vez**, setinha (e ←/→) pra próxima. Não é rolagem infinita de
  65 cards: são 5 telas que se atravessa em 20 segundos.
- **A sala carrega o tema dela** num container isolado (`data-kit="vintage"`),
  então o vintage nunca encosta no claro.
- **SFX do visantismo ligado por kit** (`src/lib/sfx-bus.ts` já existe): clique
  do knob no rig, tick do drag no kanban. Mudo por padrão, com um botão de som
  na sala — SFX que toca sem pedir é o jeito mais rápido de fechar a aba.
- **A tira de peças embaixo** é onde a peça solta continua acessível: nome +
  `add`. Clicar abre o foco que já existe.
- **Catálogo completo vira segunda aba** ("todas as 65"), exatamente a lista de
  hoje. Quem chega por busca cai lá; quem chega pra decidir cai nos kits.

## Ordem de execução

1. `catalog.tsx` ganha `KITS` — nome, tese, itens, tema, componente de
   composição. Deriva das famílias que já existem; zero item recadastrado.
2. `KitRoom.tsx` — a sala: header, palco em tamanho real, tira de peças, setas.
3. Composições: `rig-vintage` já pronta (`VintageRig.tsx`). Faltam 4 — é o
   grosso do trabalho, e é o que a library não tem hoje.
4. JSON de kit no registry + `npm run build:registry`, e o portão do
   `check:catalog` passa a exigir que todo kit resolva suas peças.
5. Rota `/kits` vira a home; catálogo continua em `/catalogo`.

## O que isso não faz

Não mexe em nenhum componente do registry (as 65 peças ficam como estão), não
inventa formato de registry, e não toca no vault de marcas.
