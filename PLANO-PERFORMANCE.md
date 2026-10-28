# Plano — performance do catálogo (134 peças vivas)

Data: 2026-10-28. Medido em produção (`ui.visantlabs.com`) com
`scripts/perf-catalogo.mjs` (página inteira, 3 perfis) e `scripts/perf-pecas.mjs`
(cada peça sozinha, CPU 4x). JSONs brutos em `perf/`.

## 1. O que a medição mostrou

### Página inteira, rolando do topo ao fim

| Perfil | CPU | Peças vivas no pico | WebGL no pico | Tarefas longas | Tempo bloqueado | Pior quadro | Quadros > 33ms |
|---|---|---|---|---|---|---|---|
| desktop | 1x | 27 | 11 | 33 | 9,1 s | 1,2 s | 25% |
| notebook fraco | 4x | 27 | 9 | 198 | 28,8 s | 2,3 s | **56%** |
| celular (Pixel 7) | 6x | 11 | 8 | 351 | 42,3 s | 2,2 s | **85%** |

O desktop parece ok. Notebook e celular não estão ok: com 85% dos quadros
perdidos, o celular rola travando o tempo todo.

### A tela preta do print

Ela se reproduziu sozinha na medição desktop: um deploy entrou durante a rolagem
(`Age` do HTML bate com o horário). A aba tinha os nomes de chunk antigos,
`expanding-search-demo-*.js`, `gauge-demo-*.js`, `icon-morph-demo-*.js` e
`plus-*.js` deram 404, o `React.lazy` lançou o erro, nenhum boundary pegou e a
árvore inteira desmontou (0 peças na tela).

Isso é **version skew**. O cache do HTML está certo (`max-age=0, must-revalidate`).
O catálogo é especialmente exposto porque busca ~130 chunks sob demanda conforme a
pessoa rola, então a janela de risco é a sessão inteira, e não só o carregamento.

### Quem pesa (cada peça sozinha, CPU 4x)

| Peça | Quadros lentos | Pior quadro | Bloqueado | WebGL |
|---|---|---|---|---|
| fog-hero | 98% | 300 ms | 2,7 s | 1 |
| fog-garden | 67% | 1,4 s | 4,5 s | 1 |
| lathe-object | 83% | 1,0 s | 2,1 s | 1 |
| book-shelf | 25% | 1,1 s | 4,8 s | **4** |
| fog-tree | 43% | 1,1 s | 3,1 s | 1 |
| carousel-3d | 10% | 1,0 s | 1,7 s | 1 |
| book-3d | 7% | 950 ms | 1,6 s | 1 |
| lathe-riso | 11% | 183 ms | 209 ms | 2 |
| ink-wordmark / mist-* / dot-cursor | 11–13% | ≤200 ms | ≤370 ms | 0 |
| erase-field | 4% | 400 ms | 1,1 s | 0 |

No resto do acervo, só duas peças passam de 5% de quadros lentos: `countdown`
(10%) e `activity-heatmap` (6%). A `hold-to-confirm` tem um pico de 550 ms na
montagem. A medição cobriu 112 das 128 peças. As 16 que faltam são os seis
`shader-*` (WebGL, provavelmente também entram no grupo pesado), mais
`mist-dialog`, `reactions`, `signature-pad`, `slide-to-confirm`, `sticker-peel`,
`streamgraph`, `time-dial`, `voice-note`, `wallet-stack` e `anatomia`. Para
completar: `node scripts/perf-pecas.mjs --pular 112`.

Umas 10 peças (todas WebGL ou canvas em tela cheia) respondem pela maior parte do
custo. As outras ~120 ficam abaixo de 3% de quadros lentos. **O problema não é
"140 peças", e sim deixar as 10 pesadas vivas juntas, em qualquer aparelho.**

### Bundle

| Arquivo | Peso | Por quê |
|---|---|---|
| `index-*.js` (entrada) | **764 KB** | `props.generated.json` (442 KB) e `controls.generated.json` (180 KB) entram por import estático (`ItemDocs`, `copiar-pra-ia`, `controls`). Só a ficha usa esses arquivos. |
| `fog-tree-scene-*.js` | **3,9 MB** | 20 texturas em base64 (16 JPEG, 4 PNG) embutidas pelo `@dgreenheck/ez-tree`. Só é baixado quando a fog-tree monta, mas no celular isso pesa. |
| `index-*.css` | 304 KB | Tailwind de 134 peças. Aceitável por ora. |
| `/shots/*.webp` | 28 KB em média | Ok. Faltam 4 fotos: `lathe-riso`, `fader`, `tempo-bar`, `tempo-clock`. |

### Ruído em produção

- `GET /__bugs` dava 404 em toda visita (o endpoint é do plugin do dev server).
- 4 fotos 404 (as que faltam acima).

## 2. O que já foi feito nesta rodada (P0)

- [x] `src/main.tsx`: o listener `vite:preloadError` recarrega a página uma vez
      (é o caminho que a doc do Vite indica). Uma trava de 10s em
      `sessionStorage` evita laço.
- [x] `src/app/Gallery.tsx`: um `ErrorBoundary` (lib `react-error-boundary`) em
      volta de cada ladrilho. Uma peça que quebra cai sozinha e a foto fica no
      lugar.
- [x] `src/app/ComponentFocus.tsx`: o mesmo boundary no palco da ficha.
- [x] `src/app/bug-report.tsx`: `/__bugs` só é buscado em `import.meta.env.DEV`.
- [x] `scripts/perf-catalogo.mjs` e `scripts/perf-pecas.mjs`: as réguas de antes
      e depois.

### Rodada 2 (mesmo dia)

- [x] P4: a ficha (`ComponentFocus`) virou lazy, com prefetch no ocioso. A
      entrada caiu de **764 KB para 304 KB** (97 KB gzip).
- [x] P1 + P2: `src/app/aparelho.ts` define o nível (alto/médio/baixo, ou
      `?nivel=` para forçar) e a fila de vagas de GPU (teto 6/3/2). A grade
      (`Gallery`) usa os dois.
- [x] `scripts/gpu-extract.mjs` gera `gpu.generated.json` (15 peças, com
      book-shelf×4 e lathe-riso×2). Roda no `build`.
- [x] P6: um `IntersectionObserver` por `rootMargin` (`stage.tsx`).
- [x] P7 parcial: `npm run perf` e `npm run perf:pecas`.
- [~] P3: a Skew Protection não está ligada no projeto e é configuração paga do
      painel. O reload do P0 cobre o caso.
- [~] P5: o base64 vem do `dist` publicado do `ez-tree`. Trade-off aceito: o
      chunk só carrega sob demanda, e no nível baixo ele nem carrega.

### Rodada 3: o nível médio acorda por intenção

A primeira versão do médio ("vivo só perto da tela") não moveu o notebook:
56% → 46% → 63% conforme o ajuste. Medir a curva (`?vivas=N`, CPU 4x) mostrou
por quê:

| Peças vivas | Quadros > 33ms | Bloqueado |
|---|---|---|
| 0 (só foto) | 15% | 1,1 s |
| 2 | 55% | 4,1 s |
| 4 | 60% | 7,0 s |

Uma ou duas peças em animação contínua (o topo da grade tem `tempo-bar`,
`tempo-clock` e `lathe-riso`) já derrubam uma CPU fraca. Então, no médio, a
peça fica em foto até o cursor, o foco ou o toque chegar no ladrilho, e depois
segue viva enquanto estiver perto da tela. O teto de 6 vivas segura quem passa o
cursor pela grade inteira. Também testei esperar a rolagem assentar antes de
montar: não ajudou na medição e saiu.

- [x] Fotos de `fader`, `tempo-bar`, `tempo-clock` e `lathe-riso` (conferidas,
      não vieram em branco).
- [x] O `streamgraph` passou 3 de 3 isolado: a falha anterior foi instabilidade
      sob carga da suíte paralela.
- [x] `tests/aparelho.spec.ts` prende as regras dos níveis baixo e médio.
- [x] O `perf-catalogo.mjs` força o nível por perfil (`notebook` = médio),
      porque a emulação não muda `hardwareConcurrency`. `--nivel` e
      `--query vivas=N` servem para A/B.

### Rodada 4: a régua mentia sobre o desktop

O desktop parecia preso em 20–25%. Fui atrás e descobri que o Chromium headless
desenha WebGL com **SwiftShader** (GPU emulada na CPU): o perfil desktop media
uma máquina sem GPU. Calibrado na mesma máquina, na mesma rolagem do nível alto:

| Modo | Quadros > 33ms |
|---|---|
| headless + SwiftShader | 22% |
| headless + GPU | 35% (desenha fora da tela e copia cada quadro) |
| **Chrome com janela + GPU** | **11–12%** |

Parado, os três dão 60 fps. O número que vale para o desktop é o da janela
(`--janela`). Nesse modo, a produção antes desta rodada já dava 12%, e a nova dá
11%: os "25% do desktop" eram quase todos artefato.

O que entrou mesmo assim, porque garante coisas que a régua não mostrava:

- [x] **Máquina sem GPU de verdade** (VM, driver bloqueado, desktop remoto) é
      detectada pelo nome do renderer (`swiftshader`, `llvmpipe`,
      `basic render`) e cai no médio. É o caso que mais sofria.
- [x] **Alto com teto de 12 vivas**, sem comer a tela: o que está visível sempre
      entra, e a faixa de pré-aquecimento usa as vagas que sobram, uma por janela
      ociosa (`requestIdleCallback`). O pico caiu de 27 para 12 peças vivas.
- [x] **Cenas pesadas** (perdem ≥20% dos quadros sozinhas, flag gerada pelo
      `gpu-extract.mjs`): no máximo 2 vivas juntas no alto. São book-shelf,
      fog-hero, lathe-object, fog-tree e fog-garden.
- [x] As réguas usam GPU real por padrão; `--sem-gpu` simula a máquina sem GPU.
- [x] `tests/marquee.spec.ts` e `tests/vitrine.spec.ts` declaram `?nivel=alto`,
      porque testam a grade viva e o Chromium do teste não tem GPU real.
- [x] **P7 feito:** `perf-catalogo.mjs --teto` julga contra o orçamento (celular
      < 20%, notebook < 10%, 0 erro de console, 0 chunk 404) e sai com código 1.
      O `ship` roda isso na produção depois do deploy, como aviso
      (`--no-perf` pula).

Testei e tirei: pré-carregar o chunk da demo no ocioso. A medição não mudou
(20–22% com e sem), e a versão quebrava em demo que é componente e não função.
Complexidade sem retorno medido não fica.

### Rodada 5: shader compilado em paralelo

Corrigindo a rodada 4: medi cada peça sozinha com GPU real, e `spine-card`,
`reels-rail` e `erase-field` montam sem nenhuma tarefa longa. Elas só caíam na
conta por montarem ao lado de quem pesa. Quem pesa é a `book-shelf`: 4 contextos
WebGL, cada um compilando os mesmos shaders, e o three.js **bloqueando a thread**
em `getProgramParameter(LINK_STATUS)` até o driver terminar.

- [x] `book-stage`: `renderer.compileAsync` (`KHR_parallel_shader_compile`). O
      canvas nasce com `frameloop` "never" e só desenha depois de compilar; o
      livro 2D de reserva cobre a espera, como já cobria. Cache frio, 4 rodadas:
      tempo bloqueado **357 → 200 ms**, pior tarefa **314 → 143 ms**.
- [x] **Pixels a mais na grade.** As cenas desenhavam 3 a 4,4x os pixels que
      apareciam: o palco reduz com `transform: scale`, e o canvas usava o
      `devicePixelRatio` cheio no tamanho de layout. Medi antes de mexer, e o
      resultado foi diferente por máquina:
      - desktop com GPU real: as 5 cenas pesadas vivas juntas, com o cursor
        passando, a 119–140 fps e 0% de quadros lentos. Ali o excesso não custa
        nada;
      - sem GPU forte, acordada no nível médio: a fog-tree a 9 fps, e metade dos
        pixels já levava de 13 a 20 fps. Ali custa.
      O `fog-post` ganhou `densidadeDoCanvas` (DPR × escala visual), usado pela
      fog-tree e pela fog-garden: **9 → 21 fps**, p95 de 133 para 67 ms, buffer
      638×518 → 319×259 para 305×247 na tela. Fora de escala nada muda. O grão de
      filme fica como na ficha (antes ele saía borrado na grade).
- [x] **As outras 4 peças 3D**, medidas uma a uma sem GPU forte e acordadas no
      médio: lathe-object, carousel-3d e lathe-riso rodam a 72–73 fps com p95
      de 16,7 ms, e o excesso não custa nada a elas, então ficaram como estavam.
      O book-3d tinha p95 de 33 ms seguindo o cursor: ganhou a mesma regra
      (`useDensidade` no book-stage) e caiu para **16,7 ms**, com buffer 288×360
      → 166×207, o tamanho da tela. Na ficha continua 288×360.
- Testei e descartei: trocar a book-shelf por `<View>` do drei. O `View` posiciona
  pelo retângulo já escalado, o canvas mede o layout sem escala, e na grade os
  livros sairiam desalinhados. O `compileAsync` resolve o custo sem esse risco.

## Resultado (produção, mesma régua)

| Perfil | Quadros > 33ms antes → depois | Bloqueado antes → depois |
|---|---|---|
| desktop (alto, Chrome com janela) | 12% → **11%** | → **1,9 s** |
| notebook (médio, CPU 4x) | 56% → **8%** | 28,8 s → **1,0 s** |
| celular (baixo, CPU 6x) | 85% → **1%** | 42,3 s → **1,8 s** |

E, nos três perfis: 0 chunk 404, 0 erro de console, heap de 43–67 MB para
10–48 MB.

No desktop a grade continua viva na tela, como antes. A linha "antes" do
desktop na tabela da seção 1 (25%) foi medida em SwiftShader (ver rodada 4).
No Chrome real, o que sobra é o pior quadro de ~330 ms, que é a montagem de
peças específicas (`spine-card`, `reels-rail`, `erase-field`). Mexer nisso é
mexer dentro do componente, e isso é decisão sua. O pico de contextos WebGL medido foi
9 com teto de 6: na troca, o contexto da peça que sai só é liberado no tick
seguinte (`ContextLossGuard`), então dois se sobrepõem por um instante. Continua
longe do limite de ≈16.

Se o desktop precisar descer mais, a alavanca é a mesma do médio (acordar por
intenção), mas isso muda a experiência de quem tem máquina boa, e é decisão de
produto, não de engenharia.

## 3. O plano

Ordem: primeiro o que mais muda a experiência com menos código. Nenhuma peça do
design system é redesenhada. As mudanças ficam na casca do catálogo (`Gallery`,
`stage`), com uma exceção: a da seção 3.4, que mexe dentro de `fog-tree-scene`.

### P1 — Perfil de aparelho decide quanto fica vivo

Hoje a regra é a mesma para todo mundo: tudo a até uma tela de distância
(`PERTO = "100% 0px"`) fica vivo. A proposta é um `useNivelAparelho()` em
`stage.tsx`, lido uma vez, que só usa sinais de API padrão:

| Sinal | API |
|---|---|
| núcleos | `navigator.hardwareConcurrency` |
| memória | `navigator.deviceMemory` (só Chromium; sem ele, cai no médio) |
| toque | `matchMedia("(pointer: coarse)")` |
| economia | `navigator.connection?.saveData`, `prefers-reduced-motion`, `prefers-reduced-data` |

| Nível | Quem | Regra na grade |
|---|---|---|
| **alto** | desktop ≥ 8 núcleos | como hoje |
| **médio** | notebook, tablet | vivo só no viewport (`rootMargin` 0, sem a faixa de uma tela); **WebGL no máximo 2 vivos** |
| **baixo** | celular, `saveData`, reduced-motion | **grade só com foto** (`/shots` já existe). A peça monta com o toque no ladrilho ou na ficha. |

O nível baixo reaproveita a foto que a grade já usa como espera. Não precisa de
componente novo.

### P2 — Orçamento de WebGL (vale para todos os níveis)

- A grade marca as peças pesadas (as ~10 da tabela) com um campo `pesada: true`
  no `catalog.tsx`, ou deriva isso de `deps.generated.json` (quem importa
  `three`, `@react-three/*` ou `webgl-stage`).
- Um contador simples em `stage.tsx` limita quantas pesadas ficam vivas ao mesmo
  tempo (alto: 4, médio: 2, baixo: 0). As que passam do teto ficam na foto até
  uma vaga abrir. Hoje o pico é 11 contextos, e o Chrome derruba o mais antigo a
  partir de ≈16 (no celular, menos que isso).
- `book-shelf` abre **4 contextos** sozinha. Vale trocar por um canvas só, com
  `<View>` do drei, que é o caminho da própria lib. **Isso mexe no componente,
  então só com sua aprovação.**

### P3 — Version skew de verdade (além do reload)

O reload do P0 é a rede de proteção. A correção é não apagar o chunk velho:

- **Vercel Skew Protection**: o projeto `visant-ui` usa Vite puro, sem suporte
  embutido, então a doc manda anexar `?dpl=<VERCEL_DEPLOYMENT_ID>` nos assets.
  No Vite, isso se faz com `experimental.renderBuiltUrl` lendo
  `process.env.VERCEL_DEPLOYMENT_ID` no build. Antes de mexer: confirmar no
  painel que a Skew Protection está habilitada (Settings → Advanced), porque ela
  depende do plano.
- Sem Skew Protection, o reload do P0 continua sendo a solução, e basta.

### P4 — Tirar 620 KB da entrada

- `ItemDocs.tsx`, `copiar-pra-ia.tsx` e `controls.tsx` passam a carregar
  `props.generated.json` e `controls.generated.json` com `import()` dinâmico,
  quando a ficha abre. A expectativa é a entrada cair de 764 KB para algo perto
  de 150 KB.
- Conferência: `dist/assets/index-*.js` antes e depois, e
  `grep vintage-meter` não pode mais achar a chave no chunk de entrada.

### P5 — fog-tree: texturas fora do JS

- Os 3,9 MB vêm de base64 dentro do `ez-tree`. A ideia é servir as texturas como
  arquivo (`public/` ou `?url`) e passar as URLs para a cena, que é a API de
  textura do `three` (`TextureLoader`).
- **Mexe em `registry/visant/lib/fog-tree-scene.ts`, que é do registry, então só
  com sua aprovação.**

### P6 — Miúdos

- Gerar as 4 fotos que faltam: `npm run build:shots` só para elas.
- Cada ladrilho cria 2 `IntersectionObserver` (`useLazyDemo` e `useInView`), o
  que dá 268 na página. Trocar por um observer compartilhado com
  `rootMargin` por nível. Ganho pequeno, mas de graça.

### P7 — Portão ✔

- `npm run perf` → `perf-catalogo.mjs`; `--teto` julga e sai com código 1.
- Teto: quadros > 33ms **< 20%** no celular e **< 10%** no notebook, 0 erro de
  console, 0 chunk 404. Roda no `ship.mjs` depois do deploy, como aviso.

## 4. Como medir antes e depois

```bash
node scripts/perf-catalogo.mjs                              # produção, 3 perfis
node scripts/perf-catalogo.mjs --url http://localhost:5182  # local (pnpm preview)
node scripts/perf-pecas.mjs --cpu 4 --top 30                # ranking por peça
node scripts/perf-pecas.mjs --pular 80                      # continua de onde parou
node scripts/perf-catalogo.mjs --perfil desktop --janela     # o número real do desktop
node scripts/perf-catalogo.mjs --perfil notebook --query vivas=2  # A/B do teto
node scripts/perf-catalogo.mjs --teto                        # julga contra o orçamento
```

## 5. Decisões que são suas

O que é de engenharia na casca do catálogo está feito e medido. O que resta
mexe em componente do registry ou em configuração paga:

1. **Montagem das peças mais caras** (`spine-card`, `reels-rail`,
   `erase-field`): é o pior quadro de ~330 ms do desktop. Mexe no componente.
2. **book-shelf com um canvas só** (`<View>` do drei): 4 contextos → 1. Mexe no
   componente.
3. **fog-tree**: os 4 MB são texturas em base64 no `dist` do `ez-tree`. Só
   desce quando a peça monta, e no celular nunca monta.
4. **Skew Protection da Vercel**: está desligada no projeto e é paga. A
   recarga do `vite:preloadError` cobre o caso.
