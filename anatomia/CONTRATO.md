# Contrato da figura (@visant/anatomia)

Toda figura tem duas partes. O núcleo (`registry/visant/lib/anatomia.ts`) cuida do resto: Shadow DOM, tema, pinos, painel, passo a passo, controles, teclado, acessibilidade, web component `<visant-anatomia>` e o wrapper React.

## 1. `anatomia/figuras/<id>/geometria.mjs` (roda no Node, na hora do build)

```js
export default function figura({ k, G, T, logo }) {
  // k = kit/iso-kit.mjs · G = kit/lathe.mjs · T = kit/tube.mjs · logo = helper de logo no topo (ver 4)
  return {
    id: "como-sobe",                 // kebab, igual ao nome da pasta
    fig: "Fig 1.4",
    titulo: "Como a ferramenta sobe",
    resumo: "Uma frase: o que o objeto é e o que ele mostra.",   // vira aria-label e legenda
    width: 640, height: 400,
    svg,                             // k.figureSvg(...): ver regras abaixo
    P,                               // a projeção (o controlador precisa pra mover pino)
    modelo: {},                      // tudo que o controlador precisa, serializável em JSON
    pecas: [{ n: 1, nome: "A pasta no teu computador.", texto: "...", ancora: [x, y, z], acao: "Tirar o .gitignore" /* opcional */ }],
    passos: [{ titulo: "...", texto: "...", foco: [1, 2], pose: /* qualquer JSON que o controlador entende */ 0 }],
    leitura: "texto inicial do canto de leitura",
  };
}
```

Regras do SVG:

- **Toda peça do primeiro nível** é um `<g data-peca="n">`. A base, que não tem pino, é `data-peca="0"`.
- **Peça que se move:** o `data-peca` vai num `<g>` de fora, e o `transform` num `<g data-part="...">` de dentro. O hover nunca mexe em `transform`, mas o ímã do foco usa o `getBBox` do grupo de fora.
- **Slot** (`<g data-slot="...">`) é pra peça que troca de camada na ordem de pintura.
- **Nada de cor** no SVG: os tons vêm do kit (`hi`, `mid`, `lo`, `faint`, `lit`), e o tema do site pinta.
- **As regras da skill anatomy valem todas:** o objeto é a explicação, muitas peças pequenas, um acento só (`lit`), linha termina em alguma coisa, no máximo um texto gravado no desenho.
- **Tamanho Figure:** 40 a 80 peças.

## 2. `anatomia/figuras/<id>/controlador.ts` (roda no navegador)

```ts
import type { AnatomiaApi, Controle } from "../../../registry/visant/lib/anatomia-tipos";
export default function controlador(raiz: ParentNode, M: Modelo, api: AnatomiaApi): Controle
```

- **`raiz`:** busque tudo com `raiz.querySelector`. **Nunca** em `document`, porque cabem várias figuras numa página.
- **`api.kit`:** `iso`, `translateAlong`, `holdStill`, `axisVector`, `lineOnTop`, `onTop`, `ring` (o runtime do kit).
- **`api.P`, `api.dizer(texto)`** (escreve no canto de leitura), **`api.moverPino(n, [x, y, z])`**.
- **`api.reduzido()`:** quando é `true`, mostra a pose final parada.
- **`api.loop(tick)`:** devolve `{ iniciar, parar }`. O `tick(dt)` devolve `true` pra continuar. O núcleo só roda o loop com a figura visível e sem pausa.
- **O `Controle` devolvido:** `{ acoes?: { [n]: { rotulo(): string, rodar(): void } }, irParaPasso?(i), tocar(), pausar(), reiniciar(), destruir() }`.
- **A pose é função pura do tempo:** `poseAt(plano, t)`, como em `como-sobe`. Assim dá pra congelar em qualquer instante e testar.

## 3. Texto

- Português falado da casa: "sobe", "fica em casa", "no ar".
- Proibido: "workflow", "entregável", "convenção", travessão, emoji.
- Todo número tem fonte: arquivo medido ou documentação oficial. Na dúvida, contador em vez de valor.

## 4. Logo

O `logo(nomeSimpleIcons, [x, y], tamanho, z, P)` desenha a marca deitada no topo de uma face, monocromática, no tom `mid`. Os logos vêm do `simple-icons` (CC0). O da Visant sai de `anatomia/logos/visant.svg`.
