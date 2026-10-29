# Colheita — livro 3D do `visant-club` → `@visant/book-3d` + `@visant/book-shelf`

**Origem** `Z:\Cursor\visant-club` (Next 15 + React 19) · **Registry** 81 → **83 itens**

---

## STATUS — feito e verificado, **não publicado**

| Portão | Resultado |
|---|---|
| `tsc --noEmit` | ✔ |
| Hex em `registry/visant/` | ✔ **zero** nos 5 arquivos novos (medido no JSON construído) |
| `check:deps` | ✔ (e o portão ganhou um conserto — ver abaixo) |
| `check:catalog` | ✔ 84 entradas × 83 itens |
| `check:css-tokens` | ✔ 78 classes (e o portão ganhou um conserto) |
| `test:install --only book-3d,book-shelf` | ✔ instala e compila em projeto limpo |
| Renderizado e conferido | ✔ tema claro e tema escuro, na própria vitrine |

**O deploy ficou de fora de propósito**, e pelo mesmo motivo da colheita de
11/08: a árvore tinha **54 arquivos modificados e 26 novos** de outra sessão
quando esta começou, e o `npm run ship` faz `git add -A` (linha 227). Publicar
agora poria trabalho de terceiro no ar. Fica para quem terminou aquilo.

---

## Os dois itens

| Item | O que é |
|---|---|
| `book-3d` | O item de catálogo como objeto: capa dura em WebGL, lombada curva, espessura vinda da contagem de páginas, praça. |
| `book-shelf` | A grade sem moldura, com o rótulo só no hover. Depende do `book-3d`. |

Arquivos: `lib/book-geometry.ts` (geometria e gesto, zero cor),
`lib/book-material.ts` (tokens → matéria), `lib/book-faces.ts` (lombada,
contracapa, corte e capa desenhada em canvas), `ui/book-stage.tsx` (a cena),
`ui/book-3d.tsx` (porta pública, `React.lazy`), `ui/book-shelf.tsx`.

---

## O problema central: **WebGL não lê CSS**

A tese da library é "componente nunca tem cor própria: ele consome
`var(--brand)`". Um `MeshStandardMaterial` não pode fazer isso — não há cascata
dentro de uma cena WebGL.

A saída não foi abrir exceção e escrever hex. Foi usar o **navegador como
resolvedor**: escreve-se a expressão de token num elemento descartável e lê-se o
computed de volta. Isso resolve `var()` e `color-mix(in oklch, …)` de graça, sem
reimplementar espaço de cor nenhum.

**Só que a primeira versão disso estava errada, e falhava calada.**
`getComputedStyle(el).color` PRESERVA o espaço de cor: um token declarado como
`oklch(0.9896 0.0021 17.19)` volta exatamente assim, e a regex que eu usei lia
`0.98 / 0.002 / 17` como canais 0–255. A palheta inteira saía plausível —
escura, monocromática — e da cor errada. Nada quebrava. `canvas.fillStyle`
também preserva `oklch`, então normalizar por ele não resolve.

O único ponto do pipeline que OBRIGA sRGB é o rasterizador. A versão final
resolve em duas etapas: computed style para achatar `var()`/`color-mix()`, e
depois pinta 1×1 e lê o pixel. Funciona pra `oklch`, `lab`, `color(display-p3 …)`
e pro que a CSS inventar depois, porque o que se lê é o que a tela mostra.

### Matiz vem da arte, valor vem da marca

Pegar a cor dominante da capa e pintar a lombada com ela é o caminho óbvio e
está errado: pinturas têm dominantes claras, e uma lombada bege de luminância
0.65 numa interface escura lê como vazamento de CSS.

Só o **matiz** atravessa. A saturação entra amortecida e a luminância é derivada
do `--background` de quem instalou, com um único `sign` que decide o lado:
marca escura → livro mais claro que a página; marca clara → mais escuro. É por
isso que a peça não precisa de variante "dark", e foi conferido nos dois temas
da vitrine.

Sem arte, o matiz vem da MESMA rampa (`mix()` do `cover-look`) que o `cover-art`
usa pra desenhar a capa 2D do mesmo item — que é o que faz o livro e o card
serem reconhecíveis como a mesma coisa.

---

## A linha do react-three-fiber

`dependencies` fixa `@react-three/fiber@^8` + `@react-three/drei@^9` +
`three@^0.170`. Não é conservadorismo: **o fiber v9 exige React ≥ 19 e a
instalação falha num projeto React 18** com um erro de peer que não diz o que
fazer. A linha 8 instala nos dois.

O código roda igual nas duas linhas, e isso foi verificado, não deduzido: fiber
8 + drei 9 sobre React 18 nesta vitrine, e fiber 9 + drei 10 sobre React 19 no
app de origem.

**Armadilha ao contrário, e ela é cara:** instalar o fiber v9 num projeto React
18 não quebra só em runtime. A augmentação de JSX dele mira `React.JSX`, que não
existe nos types do 18, e o namespace vazio que ela cria APAGA a tipagem de todo
elemento intrínseco — `<div>` passa a aceitar `never`. Aconteceu aqui: instalar
o v9 derrubou o typecheck do `gleam` e do `spine-card`, arquivos sem nenhuma
relação com 3D.

---

## Dois consertos que a colheita provocou em coisa que já existia

- **`scripts/deps-check.mjs` exigia uma declaração inválida.** Ele resolvia
  `@/lib/cover-look` para um item chamado `cover-look`, que não existe — quem
  entrega esse arquivo é o `cover-art`. Obedecer ao portão QUEBRARIA o
  consumidor, porque `registryDependencies: ["cover-look"]` faz o `shadcn add`
  procurar um item inexistente. Agora a resolução é por ARQUIVO: um mapa de quem
  entrega o quê. É a mesma classe do conserto anterior (o ramo de alias não
  olhava os arquivos do próprio item).

- **`scripts/css-tokens-check.mjs` acusava prosa.** O portão lia o arquivo
  inteiro, então um comentário que CITA uma classe derrubava o build — no caso,
  o comentário que documenta por que `rounded-[var(--r-surface,4px)]` não gera
  regra nenhuma (a vírgula do fallback quebra o parser de valor arbitrário do
  Tailwind). Apagar a citação apagaria a única pista que impede a próxima pessoa
  de reintroduzir o mesmo defeito. Agora ele ignora comentário, exatamente como
  o portão de hex do `ship.mjs` já fazia, e pelo mesmo motivo.

---

## Coisas que o `shadcn add` só revela em projeto limpo

- **Dependência entre itens precisa do namespace.** `registryDependencies:
  ["book-3d"]` faz o shadcn procurar em `ui.shadcn.com`. O certo é
  `"@visant/book-3d"`. O erro só aparece no `test:install`.
- **`w-full` dentro de um flex `items-center` colapsa.** O filho encolhe pra
  caber no conteúdo, o conteúdo pede 100% do pai, a largura vira circular e dá
  zero. Quatro canvases de largura zero, que o fiber nunca configura — e a tela
  mostra área em branco, sem erro. Pegou a demo da estante.

---

## O que ficou de fora, de propósito

- **Sombra de contato.** Estava no desenho original e foi medida: preta a 75%
  sobre superfície escura move o pixel em menos de 15/255. Custava um alvo de
  render de 512 por quadro pra não aparecer. Numa marca clara voltaria a valer,
  e o comentário no `book-stage` diz isso.
- **Palheta curada por SKU.** No app de origem havia um mapa SKU → cor, colhido
  do `ai-extract-colors`. Isso é dado de aplicação, não de componente: virou a
  prop `artColor`, e sem ela a peça mede o matiz da própria textura.

---

## A aposta que o `book-shelf` faz

Item com arte não tem título legível em repouso — só a lombada, pequena. É fiel
a uma estante e **é uma aposta**: se o catálogo vende por reconhecimento de NOME
e não de capa, o rótulo tem que ser fixo, e aí a peça é a errada. No toque não
existe hover, e lá o rótulo só aparece durante o arraste. Está escrito no
cabeçalho do componente pra ninguém adotar sem saber.
