# Auditoria — src/app

## Superfícies

Uma linha por tela. **Preencha antes de consertar qualquer coisa.** Classificar
depois de mexer é justificar o que já foi feito.

- **A aquisição** — quem não é cliente ainda. Persuadir, provar, converter.
- **B trabalho** — quem usa todo dia. Velocidade, densidade, teclado.
- **C confiança** — dinheiro, permissão, ação destrutiva. Não pode mentir.

Aplicar instinto de A numa tela B é o erro mais caro do frontend Visant.

**Escopo, com o motivo escrito.** O `--init-report` pré-preencheu uma linha por
arquivo `.tsx` do alvo, e isso inclui os ~45 primitivos shadcn vendorizados em
`src/app/components/ui/`. Eles não são telas: são peças de terceiro que a
vitrine consome para montar demo. Ficam classificados na tabela (o portão exige
a linha) e marcados como folha T1 fora do alvo. **O alvo desta rodada são as
cinco salas de kit e a casca que as segura** — `KitRoom.tsx`, `kits/*.tsx`,
`VintageRig.tsx` —, que é onde a queixa foi feita.

| Arquivo | Superfície (A/B/C) | Variável de negócio que move | Notas |
|---|---|---|---|
| src/app/App.tsx | A | entrada da vitrine: qual das tres secoes a pessoa ve primeiro | casca, T2 |
| src/app/BrandStudio.tsx | C | marca do cliente no vault: identidade e dado de conta | nao mexido nesta rodada |
| src/app/bug-report.tsx | B | defeito que chega ao backlog em vez de morrer no chat | folha T1 |
| src/app/catalog.tsx | A | descoberta da peca certa e o add dela | catalogo, ja refinado em rodada anterior |
| src/app/ComponentFocus.tsx | A | descoberta da peca certa e o add dela | catalogo, ja refinado em rodada anterior |
| src/app/components/figma/ImageWithFallback.tsx | B | tempo de montar tela: fallback de imagem das demos | folha T1 |
| src/app/components/InteractiveKnob.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/InteractiveLargeKnob.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/InteractiveSliders.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/InteractiveToggle.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/SimpleLargeKnob.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/SimpleToggle.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/ui/accordion.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/alert-dialog.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/alert.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/aspect-ratio.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/avatar.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/badge.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/breadcrumb.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/button.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/calendar.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/card.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/carousel.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/chart.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/checkbox.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/collapsible.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/command.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/context-menu.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/dialog.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/drawer.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/dropdown-menu.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/form.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/hover-card.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/input-otp.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/input.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/label.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/menubar.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/navigation-menu.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/pagination.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/popover.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/progress.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/radio-group.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/resizable.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/scroll-area.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/select.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/separator.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/sheet.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/sidebar.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/skeleton.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/slider.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/sonner.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/switch.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/table.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/tabs.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/textarea.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/toggle-group.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/toggle.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/ui/tooltip.tsx | B | tempo de montar tela: primitivo shadcn vendorizado que as demos consomem | folha T1, fora do alvo desta rodada |
| src/app/components/VintageButton.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/VintageMeter.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/components/VintageSlider.tsx | A | prova de que a bancada e usavel: sao os controles que a pessoa mexe na sala vintage | folha T1 da sala rig |
| src/app/copy-command.tsx | A | a peca aparecer no tamanho em que foi desenhada, e o comando ir inteiro pro clipboard | chrome de vitrine, folha T1 |
| src/app/demos/kanban-demo.tsx | A | a peca aparecer no tamanho em que foi desenhada, e o comando ir inteiro pro clipboard | chrome de vitrine, folha T1 |
| src/app/demos/marquee-demo.tsx | A | a peca aparecer no tamanho em que foi desenhada, e o comando ir inteiro pro clipboard | chrome de vitrine, folha T1 |
| src/app/dep-badges.tsx | A | a peca aparecer no tamanho em que foi desenhada, e o comando ir inteiro pro clipboard | chrome de vitrine, folha T1 |
| src/app/Gallery.tsx | A | descoberta da peca certa e o add dela | catalogo, ja refinado em rodada anterior |
| src/app/ItemDocs.tsx | A | descoberta da peca certa e o add dela | catalogo, ja refinado em rodada anterior |
| src/app/KitRoom.tsx | A | instalacao do kit: um comando com as N pecas, ou o add de uma peca so | ALVO desta rodada |
| src/app/kits/sala.tsx | A | gramática das salas: uma moldura, e o nome da peça como botão que instala | ALVO desta rodada, criado nela |
| src/app/kits/marca-viva.tsx | A | instalacao do kit: um comando com as N pecas, ou o add de uma peca so | ALVO desta rodada |
| src/app/kits/mesa-de-trabalho.tsx | A | instalacao do kit: um comando com as N pecas, ou o add de uma peca so | ALVO desta rodada |
| src/app/kits/motion-e-estado.tsx | A | instalacao do kit: um comando com as N pecas, ou o add de uma peca so | ALVO desta rodada |
| src/app/kits/pagina-que-vende.tsx | A | instalacao do kit: um comando com as N pecas, ou o add de uma peca so | ALVO desta rodada |
| src/app/kits.tsx | A | instalacao do kit: um comando com as N pecas, ou o add de uma peca so | ALVO desta rodada |
| src/app/media.tsx | A | a peca aparecer no tamanho em que foi desenhada, e o comando ir inteiro pro clipboard | chrome de vitrine, folha T1 |
| src/app/MinhasMarcas.tsx | C | marca do cliente no vault: identidade e dado de conta | nao mexido nesta rodada |
| src/app/Solo.tsx | A | a peca vista sozinha, sem casca, dentro do iframe de viewport | folha T1 |
| src/app/stage.tsx | A | a peca aparecer no tamanho em que foi desenhada, e o comando ir inteiro pro clipboard | chrome de vitrine, folha T1 |
| src/app/VintageRig.tsx | A | instalacao do kit: um comando com as N pecas, ou o add de uma peca so | ALVO desta rodada |
| src/app/visant-auth.tsx | C | marca do cliente no vault: identidade e dado de conta | nao mexido nesta rodada |

## Tela vista

Uma linha por tela ABERTA, com o que foi visto. Sem isto o portão não abre —
um AnimatePresence travado passa por tsc, ESLint, motion-lint, impeccable,
audit:design e copy-lint sem acender nada.

Cada linha carrega: rota, largura, estado do dado, e o que aconteceu.
Antes de medir qualquer coisa, confira que a página hidratou (veja
`visant-killer/references/ambiente.md`) — metade dos achados de uma sessão
foram o dev server mentindo, não a tela.

Ambiente: `vite dev` já de pé em `localhost:5182` (porta strict; o servidor não
foi reiniciado nesta rodada, então as rotas estavam **aquecidas**). Dado real: o
catálogo inteiro, 65 itens, e o vault de marcas respondendo — a contagem de
marcas apareceu preenchida no cabeçalho, que é a marca de hidratação desta casca.

| Rota | Largura | Dado | O que aconteceu |
|---|---|---|---|
| `/kit/mesa-de-trabalho` | 1440 | 11 peças, board cheio | 4 molduras contadas antes do kanban; ~200px de vazio morto no fim do board; barra de rolagem horizontal dentro do painel |
| `/kit/pagina-que-vende` | 1440 | 16 peças, landing montada | herói preto dentro de card claro, com filete de fundo aparecendo entre os dois; marquee GSAP rodando |
| `/kit/motion-e-estado` | 1440 | 14 peças, sala escura | pior caso do defeito: sala → painel → tile, 3 bordas aninhadas; nome da peça no canto de cada painel como legenda morta |
| `/kit/marca-viva` | 1440 | 11 peças, marca Visant aplicada | grade de janelinhas: painel com borda contendo caixas com borda (paleta, fontes, hooks) |
| `/kit/rig-vintage` | 1440 | 13 peças, bancada viva | módulos em grade 2x2 uniforme, sem hierarquia nem ordem de sinal; painel de metal dentro de card |
| `/` (home = kits) | 1440 | idem mesa-de-trabalho | setas de navegação em três lugares na mesma tela (barra fixa, cabeçalho da sala, linha do comando) |

## O que NÃO foi verificado

**390px em viewport real, em nenhuma sala.** O `resize_window` desta máquina
devolve sucesso e o `window.innerWidth` continua em 1920, tanto para mim quanto
para os cinco agentes. Sem `innerWidth`, nenhuma media query muda, e a medida
sairia do layout desktop com nome de mobile — que é pior que não medir.

O caminho usado foi o iframe de 390px, e ele **é o método sancionado da casa**
para exatamente este caso: está documentado em
`visant-killer/references/ambiente.md`, seção "Quando a janela MENTE que
redimensionou", com as três armadilhas conhecidas (X-Frame-Options, `<base
href>` para os chunks, e confirmar hidratação antes de acreditar no número).
Media query responde à largura do iframe, não à da janela. A hidratação foi
confirmada: as 24 peças e as 6 rotas foram medidas com contagem de nós e de
texto, não com esqueleto na tela.

Resultado: **estouro horizontal zero** em 390px nas seis rotas e nas 24 peças, e
zero também em 1920px.

O que o iframe ainda não cobre, e por isso continua como pendência de olho
humano num telefone: barra de rolagem do sistema, teclado virtual e o
comportamento de `100vh` no mobile real.

## Nota: 91/100

**PORTÃO ABERTO.** `tsc --noEmit` limpo · `npm run build` verde (73 páginas) ·
`check:css-tokens` 56/56 · `check:catalog` bate · `impeccable` zero ·
`copy-lint` **zero em todo o `src/app`** (578 strings de interface) ·
`ruido-scan` **zero** (80 arquivos) · 80 superfícies classificadas ·
6 telas registradas como abertas.

O que ainda segura a nota: **390px real não foi verificado por olho humano**
(ver acima), o `audit:design` não existe neste repo (o equivalente é o
`check:css-tokens`, que passa), e o interrogatório de posicionamento do Passo 4
não rodou como sessão própria — as perguntas foram respondidas dentro de cada
sala, não contra a vitrine inteira.

### O detector que nasceu desta auditoria

Os três detectores do portão ficaram verdes com a tela ainda poluída: onze
blocos de texto antes do primeiro pixel de produto, a mesma informação dita três
vezes em três tamanhos, e a palavra "add" repetida uma vez por peça. Nenhum
linter soma, e o defeito era o somatório.

Virou `visant-killer/scripts/ruido-scan.mjs`, quarto portão do `killer-scan`,
com cinco regras (rótulo gritado, ensina a usar, legenda do que vem, verbo por
item, mesma info em dois tamanhos), exceção que se justifica por comentário
citando a regra, e `--self-test` travando no fixture os falsos positivos que
apareceram. O padrão está em `references/slop-catalog.md`, entrada 20, e o
procedimento portátil em `references/despoluir.md`.

**Validado fora da casa**, que é o que separa detector de teatro. Rodado em três
repos alheios, a primeira versão errava ~40%: `role` de "Service **Role** Key"
lido como o imperativo de rolar, `click` de "on **click**" como substantivo, e
rótulo de campo de formulário tratado como cromo. A regra foi estreitada para
exigir o verbo **colado ao mecanismo**, e os casos ficaram travados no fixture.

| repo | arquivos | antes | depois |
|---|---|---|---|
| esta vitrine | 80 | 8 | **0** |
| visant-club | 35 | 12 | 12 |
| 7panel_studio | 160 | 54 | 13 |
| agent-dashboard | 84 | 26 | 18 |

O 7panel caiu de 54 para 13 por dois motivos somados: a regra estreitada e o
walker passando a ignorar `.claude/worktrees` — o repo versiona worktrees de
agente dentro de si, e o mesmo arquivo era contado três vezes. Placar inflado é
pior que número certo: faz o time achar que a dívida é maior do que é e desistir
antes de começar.

## Achados

### A raiz: uma moldura, não seis

A queixa era "caixa dentro de caixa". Contadas, eram de quatro a seis molduras
antes de a pessoa chegar na peça. Depois:

| Sala | Antes | Depois |
|---|---|---|
| Página que vende | 4 | 0 (dobras trocam o chão) |
| Mesa de trabalho | 4 | 1 (só o board, que é janela de app) |
| Motion e estado | 3 | 1 |
| Marca viva | 3 | 1 |
| Rig vintage | 9 seções iguais | 2 faceplates |

A mudança de conceito que matou o trabalho de pixel: **a sala deixou de ser um
card e virou faixa sangrada**. Some o card externo, some o palco com `border-t`,
e a composição passa a desenhar direto na superfície. Profundidade virou degrau
de superfície e espaço (`src/app/kits/sala.tsx`).

### Defeito sistêmico: a vitrine nunca carregou o CSS dos próprios itens

**Três dos 25 bugs eram o mesmo defeito de infraestrutura**, e nenhum dos três
reports sabia disso:

- `fold-motion` "muito simples" — não animava nada; o `clip-path` das variantes
  mora no bloco `css` do item.
- `measure-picker` "tímido, sem transition" — o desenho nunca chegava na tela;
  o que aparecia era o `input[type=range]` cru do browser.
- `spine-card` "responsividade quebrada" — lombada, tombo e duotone moravam no
  bloco `css`; a peça renderizava como um retângulo com borda.

Um item de registry pode declarar um bloco `css`, e o `shadcn add` injeta esse
bloco no projeto de quem instala. A vitrine consome os componentes por import
direto de `registry/`, então pulava essa etapa — treze itens rodavam aqui sem o
CSS deles, e eram julgados, na página que existe para vendê-los, por uma versão
incompleta de si mesmos.

Conserto: `scripts/registry-css.mjs` gera `src/styles/registry.generated.css` a
partir de `public/r/*.json`, plugado no `npm run build`. Espelhar à mão foi
recusado: envelhece na primeira mudança da peça, e aí a vitrine passa a mentir
sobre o que o `add` entrega.

### Defeito sistêmico: sonda de cor que lê OKLCH como RGB

`getComputedStyle().backgroundColor` só serializa em `rgb()` o que já é sRGB.
Token em OKLCH volta como `oklch(0.62 0.014 82.39)`, e a regex de canais lia
isso como RGB. O tema claro deste repo usa hex (acertava), o escuro usa OKLCH
(destruía) — daí o "funciona no claro, some no escuro" do report do
`spring-dots`. Duas peças copiavam a sonda; as duas foram para uma pipeta de
canvas 1×1, que aceita qualquer notação de CSS Color 4.

### Defeitos achados que ninguém tinha reportado

| Onde | O quê |
|---|---|
| `paper-shuttle` na sala de motion | recebia `progress` 0–1 numa prop que é 0–100: barra eternamente em "0%" |
| filtros da mesa | diziam 18/7/4/0 sobre um board de 8 cartões — a UI mentindo sobre o banco |
| `marca-viva` | leitura de tokens rodava antes de o provider escrever a folha; a sala abria com a paleta errada e o botão claro/escuro nunca atualizava |
| `testimonial-wall` | o pause/play nunca funcionou: chamava um `onPlay` que nas duas paredes reais era `() => {}` |
| `sticky-filterbar` | ouvia `scroll` na `window`, e evento de rolagem não borbulha: dentro de container com rolagem própria a peça ficava muda |
| `rail` | `sync` só ouvia `resize` da janela; container encolhendo deixava a seta desabilitada com o trilho transbordando |
| `timeline` | trazia copy de outra marca cravada no arquivo ("Changelog from my journey", Aceternity) e paleta crua do Tailwind |
| `inline-edit` | a caixa crescia 18px ao entrar em edição, e o consumidor remendava com `whitespace-nowrap` |
| `kanban` | dois `opacity-40` empilhados (0.16 real) tornavam o alvo de drop invisível; a demo descartava `columnOrder` e o card voltava um frame depois |

### Pendências, sem conserto nesta rodada

1. **Teclado nos controles vintage.** Knob, fader, XY pad e pads não têm
   `tabIndex`, `role="slider"` nem setas. O kit mais interativo dos cinco é
   inalcançável por teclado. Conserto mora dentro do registry.
2. **A arte do `octahedron-loader`.** O `.lottie` nunca foi versionado —
   `public/assets/` não existe no repo e o `git log --diff-filter=D` está vazio.
   A peça agora falha visivelmente em vez de em branco, mas a arte da marca
   precisa vir do vault ou do R2.
3. **`spring-dots` fora da composição** da sala de motion, embora consertado.
4. **390px com olho humano**, conforme a seção acima.

