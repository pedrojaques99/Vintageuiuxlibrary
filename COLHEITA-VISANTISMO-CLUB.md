# Colheita — `visantismo` + `visant-club` → `@visant/ui`

**Data** 11/08/2026 · **Origens** `Z:\Cursor\visantismo` (vanilla HTML/CSS/JS, 4 rotas)
e `Z:\Cursor\visant-club` (Next 15 + Drizzle) · **Registry** 51 → **64 itens**.

---

## STATUS — feito e verificado, **não publicado**

| Portão | Resultado |
|---|---|
| `tsc --noEmit` | ✔ |
| Hex em `registry/visant/` | ✔ **zero** nos 64 itens |
| `check:deps` | ✔ (e o portão ganhou um conserto — ver abaixo) |
| `check:catalog` | ✔ 65 entradas × 64 itens |
| `check:css-tokens` | ✔ 41 classes (pegou um `duration-[var(…)]` que não gerava regra) |
| `test:install` em projeto limpo | ✔ **13/13** dos novos instalam e compilam |
| Playwright | ✔ **94/94**, incluindo os 13 itens novos a 360px e 768px |
| `vite build` | ✔ 67 páginas |

**O deploy ficou de fora de propósito.** No meio desta rodada apareceu na árvore
trabalho não commitado de outra sessão — `registry/visant/ui/marquee.tsx` com
+327 linhas reescrevendo o motor para GSAP + ScrollTrigger, mais
`src/app/demos/kanban-demo.tsx` e um `public/media/` novo. O `npm run ship` faz
`git add -A`, então publicar agora colocaria um marquee em obra no ar, e é dele
que os projetos de cliente fazem `shadcn add`. Fica para quem terminou aquilo.

Dois consertos que a colheita provocou em coisa que já existia:

- **`scripts/deps-check.mjs`** acusava o `cover-art` de não declarar dependência
  de si mesmo. O ramo de import por alias (`@/lib/x`) não olhava os arquivos do
  próprio item — o ramo de import relativo já olhava. A "correção" fácil seria
  partir o item em dois só pra agradar o portão.
- **`@visant/rail`** ganhou o tabindex rotativo do `visant-club`.

O método é a skill `visant-registry`. O que muda aqui: as duas origens **não são
React** no mesmo sentido dos doadores anteriores. O visantismo é vanilla puro e o
club é Next com `next/image` e um schema de banco. Então esta colheita tem uma
etapa a mais que as anteriores: **portar sem perder a decisão**.

---

## O portão, aplicado

Quatro perguntas, todas obrigatórias. Falhou em uma, não colhe.

| # | Item | Origem | 2 usos? | Sem cor própria? | Vazio/foco/sem-motion? | Sem dado? |
|---|---|---|---|---|---|---|
| 1 | `erase-field` | `js/bg-erase.js` | 1 + pedido | lê `--accent`/`--bg` | reduced-motion desenha 1 quadro | ✔ |
| 2 | `spring-dots` | `js/bg-field.js` | 1 + irmão do 1 | lê `--accent` | idem | ✔ |
| 3 | `sfx-bus` | `js/sfx.js` | **2 reais** | sem cor | mudo sob reduced-motion | ✔ |
| 4 | `sfx-toggle` | `.sfx-toggle` + `SfxToggle.tsx` | **2 reais** | `--muted`/`--fg` | `aria-pressed`, estado nulo desenhado | ✔ |
| 5 | `count-up` | `js/count.js` | 3 rotas | sem cor | sai fora inteiro sob reduced-motion | ✔ |
| 6 | `pointer-parallax` | `js/hero.js` | 4 rotas | sem cor | só em `pointer: fine` | ✔ |
| 7 | `fold-motion` | `js/reveal.js` + `[data-fold]` | ~30 dobras | sem cor | o repouso É o conteúdo | ✔ |
| 8 | `measure-bar` | `.stat .meter` | 6 lugares | `--faint`/`--muted` | sem `.js` já nasce cheia | ✔ |
| 9 | `spine-card` | `.product-card` + `.piece-card` | **2 reais** | tonal | foco junto com hover | ✔ |
| 10 | `cover-art` | `Capa.tsx` + `lib/capa.ts` | 3 superfícies | rampa tonal | determinística, SSR == cliente | ✔ |
| 11 | `empty-state` | `Vazio.tsx` | **4 rotas** | tokens | *é* o estado vazio | ✔ |
| 12 | `skeleton-rail` | `Skeletons.tsx` | 2 rotas | `--muted` | *é* o estado de espera | ✔ |
| 13 | `use-local-search` | `BibliotecaBusca.tsx` | 2 + a própria vitrine | sem UI | devolve lista vazia | ✔ |

**Treze itens.** Mais **uma melhoria** no item que já existe:

| — | `rail` (já publicado) | `components/club/Rail.tsx` | o roving tabindex que resolve as 21 paradas de Tab medidas na `/biblioteca` |

### Rejeitados, e por quê — vale mais que a lista de aceitos

| Candidato | Por que não |
|---|---|
| `ratchet` (`js/ratchet.js`) | Preço que sobe por venda é **mecânica comercial de um produto**, não primitiva. Fala com `/api/sold`. Falha a pergunta 4. |
| `serie` (`js/serie.js`) | Vale muito, mas o valor dele está em **clonar o nó de título do próprio item** pra não criar segunda fonte de copy. Em React isso é `children`, e aí sobra um Tabs — que o Radix já resolve. Reimplementar seria pagar peso pra entregar menos. |
| `film-grain` | Seis linhas de `background-image`. Isso é camada de tema, não item; entra no `craft.json` quando alguém pedir, e vale pra todas as marcas de uma vez. |
| `ForaDoAr` | O valor dele é o **texto** ("seu acesso está intacto, só não dá pra validar agora"). Texto é voz de marca, e voz de marca não se distribui por registry. Vira exemplo na doc do `empty-state`. |
| `PosterCard` / `Billboard` | Bons, mas casados com o tipo `DeckItem` e com `next/image`. Desacoplar os dois de uma vez é reescrever, não colher. Ficam pra depois do `cover-art` estar de pé. |
| `CommandPalette` | Já existe `@visant/vintage-command-palette`. Duplicata seria exatamente o que o registry existe pra matar. |
| Tabelas do `admin/` | Padrão de work-surface, o mais acoplado a dado que existe. A regra do plano é colher isso por último. |

---

## Mapa de token — o trabalho invisível da colheita

Nenhuma das duas origens usa o vocabulário do registry. Sem esta tabela, cada
item colhido chega no cliente com uma variável que não existe e cai em preto.

| visantismo | visant-club | registry |
|---|---|---|
| `--bg` | `--color-bg` | `--background` |
| `--fg` | `--color-fg` | `--foreground` |
| `--accent` | `--color-accent` | `--brand` |
| `--muted` | `--color-muted` | `--muted-foreground` |
| `--faint` | `--color-faint` · `--color-border` | `--border` |
| — | `--color-surface` | `--card` |
| — | `--color-surface-2` | `--muted` |
| `--radius` | — | `--r-control` / `--r-surface` |
| `--dur-*` · `--ease-*` | idem | **já batem** (os dois vieram da skill `visant-motion`) |

O `#0a0a0bcc` que aparece sete vezes no club é `--background` escrito à mão com
alpha; vira `color-mix(in oklch, var(--background) 80%, transparent)`. O
`--track-label` do club não tem token no registry e **não vai virar um**: é
`letter-spacing`, craft, e entra com valor literal.

---

## As três armadilhas específicas desta colheita

1. **Canvas que lê `getComputedStyle` uma vez.** Os dois fundos leem `--accent`
   no `init`. Isso funciona no visantismo (tema fixo) e **quebra no registry**,
   onde a graça é trocar de tema. Os dois passam a reler no `resize` e a aceitar
   override por prop.
2. **`hex()` sobre `--accent`.** O parser dos dois arquivos só entende
   `#rrggbb`. O registry emite **OKLCH**. Sem conserto, todo fundo colhido cai
   no cyan de fallback da Visant em qualquer marca — é exatamente o bug de
   fallback silencioso que o `VISANT-REGISTRY-PLANO.md` já documentou uma vez.
   Solução: pintar com `color-mix`/`currentColor` via CSS var no elemento e ler
   o canal computado, em vez de parsear hex.
3. **`.js` no `<html>` como esconderijo.** O `fold-motion` esconde a dobra sob
   `html.js`. Num app React o script sempre roda, mas se o componente não
   montar (erro de boundary) a página fica em `opacity: 0`. No item, o
   esconderijo passa a ser aplicado pelo **próprio provider no efeito**, não por
   CSS estático — a pendência nº3 que o `AUDIT-SENSORIAL.md` deixou aberta na
   origem, consertada na versão canônica.

---

## Ordem de execução

1. Escrever os 13 arquivos em `registry/visant/{ui,lib,hooks}/`.
2. Registrar em `registry.json` — com o campo `css` de cada um, que é onde vive
   keyframe, `prefers-reduced-motion` e seletor de atributo. Sem isso o item
   instala e não anima.
3. Demo viva no `catalog.tsx` (a vitrine importa o mesmo arquivo que o `add`
   entrega — nada de reimplementar "só pra vitrine").
4. `npm run ship`: os portões de hex, deps, catálogo, tipos e **instalação em
   projeto limpo** já existem e são o teste de verdade.
5. Cabeçalho `// Colhido para o registry: @visant/<nome>` nas duas origens.
   **Sem retrofitar** — a decisão de 30/07/2026 vale, e retrofitar o visantismo
   (que é vanilla) seria pior ainda que retrofitar um app React.

---

## Depois da colheita: burilar a vitrine

Pedido separado, mesma rodada: *"mt ui desnecessária, deixe tudo categorizado e
filtrável"*. A vitrine hoje tem busca + aba + chips de família + filtro de npm +
grade/lista + contagens — seis controles competindo na mesma barra. Com 64 itens
isso piora. O alvo é **um** eixo de categoria visível e o resto recolhido, sem
perder nenhum caminho de filtro que já existe.
