# Kits — o que ficou de pé

Diagnóstico e execução — 11/08/2026. A vitrine vendia peça solta; ninguém compra
peça solta. A unidade passou a ser o **kit**.

## O diagnóstico (dos prints)

65 itens numa coluna única, ordenados pelo que o repositório tem. Quatro defeitos:

1. **Não existia unidade de compra.** `theme-visant` (uma linha) competia com
   `testimonial-wall` (uma seção inteira de landing) no mesmo eixo visual.
2. **Temas empilhados na vertical.** O painel preto do `vintage-large-knob`
   encostava no papel claro do `spine-card` — rolar era atravessar três
   libraries.
3. **O palco engolia a peça.** `scrub-input` sozinho num palco de 720px; o
   `kanban` cortado com barra de rolagem no vizinho.
4. **Card sem demo gastava palco.** `brand-selector` usava 300px de altura para
   escrever "está na barra do topo →".

## O que foi feito

**Cinco salas, uma por tela, com seta e tecla entre elas.** Kits viraram a home;
o catálogo de 65 peças continua inteiro em `/catalogo`.

| Sala | Peças | O que é |
| --- | --- | --- |
| Mesa de trabalho | 11 | Board denso (4 colunas), trilho com capa, linha do tempo, filtro que gruda, nome que se edita onde se lê, estado vazio. |
| Página que vende | 16 | Landing completa: hero raspável, faixa, serviços, passos, número com régua, prova social, estante, mosaico, CTA. |
| Motion e estado | 14 | Sala escura, tudo em loop: fila de geração, exportação, área de largar, colagem com paralaxe. |
| Rig vintage | 13 | A bancada, agora sem pintar o próprio fundo — quem manda na superfície é a sala. |
| Marca viva | 11 | Tokens lidos do `getComputedStyle`, par tipográfico, hooks mostrando o valor de agora, busca real sobre o catálogo. |

### Decisões que sustentam isso

- **A lista de peças de cada kit é derivada do catálogo, por família.** Lista
  escrita à mão envelheceria na primeira colheita: peça nova entraria no
  catálogo e ficaria fora do kit sem ninguém ver.
- **Tema por container (`.dark` + fundo), nunca no documento.** É o que impede
  a bancada de encostar no papel claro, e o que mantém cabeçalho e seletor de
  marca no tema da pessoa enquanto a sala escura acontece dentro deles. Tem
  teste.
- **Composição lazy, uma por sala.** Cada kit virou um chunk próprio
  (4–7KB + o que ele puxa); quem abre a home não paga GSAP nem dnd-kit.
- **Peça ausente aparece esmaecida na tira, com o motivo.** Sem isso, a pessoa
  conta 14 nomes, acha 12 na tela e conclui que a demo quebrou.
- **`←/→` só quando nada está focado.** A primeira versão roubava a seta do knob
  e do fader — mudava o ganho e pulava de kit no mesmo gesto. Tem teste.

### O comando

A sala mostra **um comando com os N nomes** (`shadcn add` aceita vários), não um
`@visant/<kit>` que ainda não existe. Comando comprido e verdadeiro é melhor que
comando curto que entrega menos do que a tela mostrou.

## Também nesta leva

- **Botão de bug em cada card**, revelado no hover, gravando em `bugs/` por um
  middleware do Vite dev-only. `npm run bugs` lista; `-- --resolve <id>` fecha.
- **Rotas e SEO:** `/` = primeira sala, `/kit/<slug>`, `/catalogo`, e `/rig`
  virou apelido de `/kit/rig-vintage`. O prerender lê os kits do próprio
  `kits.tsx` — 73 páginas com meta própria.
- **Suíte:** 149 testes passando, incluindo 9 novos de sala.

## O que ficou de fora, e por quê

- **Item de kit no registry.** Um `@visant/mesa-de-trabalho` só vale a pena
  quando levar **a composição junto** — é isso que o kit vende. Hoje as
  composições importam o banco de mídia da vitrine (`src/app/media`), que não vai
  para o consumidor. O passo é publicar cada composição recebendo a mídia por
  slot; aí o comando colapsa num nome só.
- **`octahedron-loader` e `spring-dots`** saíram da composição de motion, com o
  motivo escrito na tira e o reporte em `bugs/REPORTS.md`. Um aponta para um
  `.lottie` que não existe no repositório; o outro sonda a cor no documento e
  some dentro de um container escurecido por classe.
