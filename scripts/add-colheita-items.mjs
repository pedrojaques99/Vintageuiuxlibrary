/**
 * Registra a colheita `visantismo` + `visant-club` no registry.json.
 *
 * Script e não edição à mão porque `registry.json` tem 1500+ linhas e treze
 * itens no meio dela é exatamente o tamanho em que um merge à mão erra uma
 * vírgula e o portão descobre depois. Idempotente: rodar duas vezes substitui,
 * não duplica.
 *
 * ATENÇÃO: rodou uma vez, cumpriu o papel. As `description` daqui estão sem
 * acento e a fonte de verdade delas passou a ser o `catalog.tsx` (sincronizado
 * por `node scripts/catalog-check.mjs --fix`). Rodar de novo REGRIDE o texto
 * que aparece no `shadcn add`, na meta tag e na imagem de OG. Se precisar mexer
 * num destes itens, mexa no `registry.json` direto.
 */
import { readFileSync, writeFileSync } from "node:fs";

const AUTOR = "Visant Labs <visantsupply@gmail.com>";
const ui = (p) => ({ path: `registry/visant/ui/${p}.tsx`, type: "registry:ui" });
const lib = (p, ext = "ts") => ({ path: `registry/visant/lib/${p}.${ext}`, type: "registry:lib" });
const hook = (p) => ({
  path: `registry/visant/hooks/${p}.ts`,
  type: "registry:hook",
  target: `@hooks/${p}.ts`,
});

const ITENS = [
  {
    name: "erase-field",
    type: "registry:ui",
    title: "Erase Field",
    description:
      "Fundo em canvas que a mao raspa pra revelar a luz por baixo, com acabamento liquido, poeira que volta em deriva e passeio ocioso pra quem nao mexe o ponteiro.",
    registryDependencies: ["utils"],
    files: [ui("erase-field")],
  },
  {
    name: "spring-dots",
    type: "registry:ui",
    title: "Spring Dots",
    description:
      "Malha de pontos com mola: o ponteiro empurra, o atrito segura, e quem sai de casa acende na cor da marca.",
    registryDependencies: ["utils"],
    files: [ui("spring-dots")],
  },
  {
    name: "sfx-bus",
    type: "registry:lib",
    title: "SFX Bus",
    description:
      "Dois sons de interface em WebAudio puro, hover e clique, com throttle, debounce por alvo, contexto armado no primeiro gesto e mudo sob prefers-reduced-motion.",
    dependencies: ["react"],
    files: [lib("sfx-bus")],
  },
  {
    name: "sfx-toggle",
    type: "registry:ui",
    title: "SFX Toggle",
    description:
      "Liga e desliga o som da casa em um icone so: as ondas recolhem pro alto-falante, e o estado nulo antes da hidratacao fica desenhado em vez de chutado.",
    registryDependencies: ["utils", "@visant/sfx-bus"],
    files: [ui("sfx-toggle")],
    css: {
      "@layer components": {
        ".sfx-toggle .sfx-wave": {
          "transform-origin": "6px 12px",
          transition:
            "opacity var(--dur-base, 240ms) var(--ease-out), transform var(--dur-base, 240ms) var(--ease-out)",
        },
        '.sfx-toggle[data-state="off"] .sfx-wave': {
          opacity: "0",
          transform: "scale(0.4)",
        },
      },
      "@media (prefers-reduced-motion: reduce)": {
        ".sfx-toggle .sfx-wave": { transition: "none" },
      },
    },
  },
  {
    name: "count-up",
    type: "registry:ui",
    title: "Count Up",
    description:
      "O numero que se apura em vez de aparecer pronto: le o valor final do proprio texto, trava a largura antes do primeiro quadro e nao anima o que nao da pra parsear.",
    registryDependencies: ["utils"],
    files: [ui("count-up")],
  },
  {
    name: "use-pointer-parallax",
    type: "registry:hook",
    title: "usePointerParallax",
    description:
      "Escreve --px e --py uma vez por quadro e deixa o CSS decidir a profundidade de cada objeto. So em ponteiro fino, volta ao repouso ao sair da janela.",
    dependencies: ["react"],
    files: [hook("use-pointer-parallax")],
  },
  {
    name: "fold-motion",
    type: "registry:lib",
    title: "Fold Motion",
    description:
      "Hierarquia de entradas por dobra: rise, drift, mask, settle, climax e invert em vez de trinta entradas iguais. O esconderijo e aplicado pelo componente, nunca por CSS estatico.",
    dependencies: ["react"],
    registryDependencies: ["utils"],
    files: [lib("fold-motion", "tsx")],
    css: {
      "@layer components": {
        /* Nada acontece sem `data-armed`: se o componente nao montou, o
           conteudo fica visivel. Esconder por CSS estatico e o que faz a pagina
           sumir inteira quando um script falha. */
        ".visant-fold[data-armed]": {
          opacity: "0",
          transform: "translateY(14px)",
          transition:
            "opacity var(--dur-slow, 700ms) var(--ease-out), transform var(--dur-slow, 700ms) var(--ease-out)",
        },
        ".visant-fold[data-armed][data-in]": { opacity: "1", transform: "none" },

        /* drift: o deslocamento vai no FILHO. Na section (largura da viewport)
           ele cria estouro horizontal real. `clip` e nao `hidden`, senao vira
           container de rolagem. */
        '.visant-fold[data-fold="drift-l"][data-armed], .visant-fold[data-fold="drift-r"][data-armed]':
          { opacity: "1", transform: "none", "overflow-x": "clip" },
        '.visant-fold[data-fold="drift-l"][data-armed] > [data-fold-part], .visant-fold[data-fold="drift-r"][data-armed] > [data-fold-part]':
          {
            opacity: "0",
            transition:
              "opacity var(--dur-slow, 700ms) var(--ease-out), transform var(--dur-slow, 700ms) var(--ease-drawer)",
          },
        '.visant-fold[data-fold="drift-l"][data-armed] > [data-fold-part]': {
          transform: "translateX(-22px)",
        },
        '.visant-fold[data-fold="drift-r"][data-armed] > [data-fold-part]': {
          transform: "translateX(22px)",
        },
        '.visant-fold[data-fold="drift-l"][data-armed][data-in] > [data-fold-part], .visant-fold[data-fold="drift-r"][data-armed][data-in] > [data-fold-part]':
          { opacity: "1", transform: "none" },

        /* mask: o titulo sobe por tras de uma borda. clip-path anima na GPU
           igual a transform. */
        '.visant-fold[data-fold="mask"][data-armed]': { opacity: "1", transform: "none" },
        '.visant-fold[data-fold="mask"][data-armed] :is(h1, h2, h3)': {
          "clip-path": "inset(0 0 100% 0)",
          transform: "translateY(0.24em)",
          transition:
            "clip-path var(--dur-slow, 700ms) var(--ease-out), transform var(--dur-slow, 700ms) var(--ease-out)",
        },
        '.visant-fold[data-fold="mask"][data-armed][data-in] :is(h1, h2, h3)': {
          "clip-path": "inset(0 0 -0.2em 0)",
          transform: "none",
        },

        /* settle: numero que sobe parece estar chegando; numero que assenta
           parece estar sendo apurado. A diferenca e pequena de proposito. */
        '.visant-fold[data-fold="settle"][data-armed]': { opacity: "1", transform: "none" },
        '.visant-fold[data-fold="settle"][data-armed] > *': {
          opacity: "0",
          transform: "scale(1.03)",
          transition:
            "opacity var(--dur-slow, 700ms) var(--ease-out), transform var(--dur-slow, 700ms) var(--ease-out)",
        },
        '.visant-fold[data-fold="settle"][data-armed][data-in] > *': {
          opacity: "1",
          transform: "none",
        },

        /* climax: sobe menos e demora mais. A dobra que pede dinheiro nao deve
           parecer apressada. */
        '.visant-fold[data-fold="climax"][data-armed]': {
          transform: "translateY(8px) scale(0.994)",
          "transition-duration": "var(--dur-climax, 1100ms)",
        },

        /* invert: o unico ponto em que a cor de fundo se move. Uma vez por
           pagina, no argumento central. */
        '.visant-fold[data-fold="invert"][data-armed]': {
          opacity: "1",
          transform: "none",
          background: "var(--background)",
          color: "var(--foreground)",
          transition:
            "background-color var(--dur-climax, 1100ms) var(--ease-in-out), color var(--dur-climax, 1100ms) var(--ease-in-out)",
        },
        '.visant-fold[data-fold="invert"][data-armed][data-in]': {
          background: "var(--foreground)",
          color: "var(--background)",
        },
      },
      /* O guard global com `*` zera duracao e delay mas NAO desfaz um estado
         inicial escondido: uma dobra em opacity 0 continuaria invisivel pra
         sempre. Cada variante nasce no estado final. */
      "@media (prefers-reduced-motion: reduce)": {
        ".visant-fold[data-armed], .visant-fold[data-armed] > [data-fold-part], .visant-fold[data-armed] > *":
          { opacity: "1", transform: "none", transition: "none" },
        ".visant-fold[data-armed] :is(h1, h2, h3)": {
          "clip-path": "none",
          transform: "none",
          transition: "none",
        },
      },
    },
  },
  {
    name: "measure-bar",
    type: "registry:ui",
    title: "Measure Bar",
    description:
      "Nenhum numero sem regua: valor, qualificador, evidencia e rotulo nessa ordem. Sem denominador honesto a barra nao desenha, e o estado desconhecido fica tracejado em vez de zerado.",
    registryDependencies: ["utils"],
    files: [ui("measure-bar")],
    css: {
      "@layer components": {
        /* Cheia por padrao: o estado de repouso, sem JS e sem observer, e a
           evidencia VISIVEL. Esconder a prova porque um script nao rodou e o
           modo de falha caro. */
        ".measure-bar-fill": {
          width: "100%",
          transform: "scaleX(var(--v, 1))",
          transition: "transform var(--dur-slow, 700ms) var(--ease-out)",
        },
        /* Compoe com @visant/fold-motion quando ele existe: dentro de uma dobra
           armada e ainda nao entrada, a regua cresce junto. */
        ".visant-fold[data-armed]:not([data-in]) .measure-bar-fill": { transform: "scaleX(0)" },
        '.measure-bar-track[data-state="unknown"]': {
          background:
            "repeating-linear-gradient(90deg, var(--border) 0 6px, transparent 6px 12px)",
        },
      },
      "@media (prefers-reduced-motion: reduce)": {
        ".measure-bar-fill": { transition: "none" },
      },
    },
  },
  {
    name: "spine-card",
    type: "registry:ui",
    title: "Spine Card",
    description:
      "O retangulo que le como objeto: lombada de luz na borda, tombo apoiado na base que endireita no hover, e capa em duotone que so ganha cor onde a atencao esta.",
    registryDependencies: ["utils"],
    files: [ui("spine-card")],
    css: {
      "@layer components": {
        ".spine-card": {
          "--tilt": "-5deg",
          "--lift": "0px",
          transform: "rotate(var(--tilt)) translateY(var(--lift))",
          /* A base e o ponto de apoio: no centro eles giram e parecem flutuando
             em vez de encostados. */
          "transform-origin": "bottom center",
          transition:
            "transform var(--dur-slow, 700ms) var(--ease-out), border-color var(--dur-slow, 700ms) ease",
        },
        /* A lombada fica SOBRE a capa e sobre o texto, porque numa capa real ela
           atravessa os dois. */
        ".spine-card::before": {
          content: '""',
          position: "absolute",
          "z-index": "1",
          top: "0",
          bottom: "0",
          left: "0",
          width: "12px",
          "border-right": "1px solid var(--border)",
          background:
            "linear-gradient(90deg, color-mix(in oklch, var(--foreground) 7%, transparent), transparent)",
          "pointer-events": "none",
        },
        /* Vem depois, entao vence pela ordem sem inflar seletor. */
        ".spine-card:hover, .spine-card:focus-visible": {
          "--tilt": "0deg",
          "--lift": "-10px",
        },
        ".spine-card-cover :is(img, svg, video)": {
          display: "block",
          width: "100%",
          height: "auto",
          "object-fit": "cover",
          /* sepia + hue-rotate e o duotone de um filtro so: sem camada extra no
             DOM, sem segunda copia da imagem. O hue-rotate persegue o --brand. */
          filter: "grayscale(1) sepia(0.5) hue-rotate(155deg) saturate(1.3) brightness(0.92) contrast(1.06)",
          transition: "filter var(--dur-slow, 700ms) ease",
        },
        /* :focus-visible junto com :hover, senao a capa em cor e informacao que
           so existe pra quem usa mouse. */
        ".spine-card:hover .spine-card-cover :is(img, svg, video), .spine-card:focus-visible .spine-card-cover :is(img, svg, video), .spine-card[data-full-color] .spine-card-cover :is(img, svg, video)":
          { filter: "none" },
      },
      /* Sem hover nao existe 'o que a pessoa esta olhando', e mono viraria um
         estado permanente do qual ninguem pode sair. */
      "@media (hover: none)": {
        ".spine-card-cover :is(img, svg, video)": { filter: "none" },
        ".spine-card": { "--tilt": "0deg" },
      },
      "@media (prefers-reduced-motion: reduce)": {
        ".spine-card": { transition: "none" },
      },
    },
  },
  {
    name: "cover-art",
    type: "registry:ui",
    title: "Cover Art",
    description:
      "Capa deterministica em CSS pra item sem arte: tres familias (livro, app, placa), monograma, e rampa tonal derivada da marca por color-mix. Zero byte de imagem, SSR igual ao cliente.",
    registryDependencies: ["utils"],
    files: [lib("cover-art"), ui("cover-art")],
  },
  {
    name: "empty-state",
    type: "registry:ui",
    title: "Empty State",
    description:
      "O estado vazio canonico: arte por slot com veu de contraste garantido, eyebrow, frase que diz o que vai aparecer ali, e no maximo uma acao.",
    registryDependencies: ["utils"],
    files: [ui("empty-state")],
  },
  {
    name: "skeleton-rail",
    type: "registry:ui",
    title: "Skeleton Rail",
    description:
      "O esqueleto do trilho com as mesmas medidas do trilho: mesmos nomes de prop, overflow hidden em vez de auto, e pulse em vez de shimmer.",
    registryDependencies: ["utils"],
    files: [ui("skeleton-rail")],
  },
  {
    name: "use-local-search",
    type: "registry:hook",
    title: "useLocalSearch",
    description:
      "Busca em memoria tolerante a acento: indice montado uma vez por lista, todos os termos batendo em qualquer ordem, e termo vazio devolvendo a lista inteira.",
    dependencies: ["react"],
    files: [hook("use-local-search")],
  },
];

const caminho = new URL("../registry.json", import.meta.url);
const reg = JSON.parse(readFileSync(caminho, "utf8"));

const novos = new Set(ITENS.map((i) => i.name));
reg.items = reg.items.filter((i) => !novos.has(i.name));
for (const item of ITENS) reg.items.push({ ...item, author: AUTOR });

writeFileSync(caminho, JSON.stringify(reg, null, 2) + "\n");
console.log(`registry.json: ${ITENS.length} itens da colheita registrados · total ${reg.items.length}`);
