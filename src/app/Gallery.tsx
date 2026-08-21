"use client";

/**
 * A vitrine do registry: todo item, com demo viva, busca, filtro e vista de foco.
 *
 * O que a página precisa responder em cinco segundos: *o que existe aqui, e
 * isso serve para o meu caso?* Por isso a busca casa também com tag e descrição
 * — quem procura "arrastar" tem de achar o `scrub-input` sem saber o nome dele —
 * e por isso o comando de instalação fica em cada card, não numa página de doc
 * separada: o passo seguinte ao reconhecer a peça é instalar a peça.
 *
 * Três coisas que a versão anterior errava e que mandam no desenho desta:
 *
 * - **Palco de altura fixa cortava as peças grandes.** Agora cada item declara
 *   seu tamanho natural no catálogo e o palco escala pra caber (`FitStage`).
 *   A altura do card passa a ser consequência da peça, e é daí que vem o ritmo
 *   da grade — não de um `h-48` chutado igual pra board e pra knob.
 * - **45 demos montavam juntas no load**, uma dúzia delas em `setInterval`
 *   eterno. Agora a demo monta ao entrar na tela e o relógio dela para quando
 *   sai (ou quando a aba é escondida).
 * - **Não dava pra usar a peça.** O card mostra; a vista de foco deixa usar,
 *   em tamanho real e nos presets de viewport.
 *
 * Os controles desta página são componentes do próprio registry (`Chip`,
 * `SegmentedControl`). Vitrine que desenha o próprio filtro à mão está dizendo
 * que a library não serve nem para a casa.
 */

import * as React from "react";
import { Expand, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandTheme } from "@/lib/brand-theme";
import { Chip } from "../../registry/visant/ui/chip";
import { SegmentedControl } from "../../registry/visant/ui/segmented-control";
import {
  CATALOG,
  FAMILIES,
  TYPE_LABEL,
  familyLabel,
  fold,
  matches,
  previewOf,
  stageSurfaceOf,
  type CatalogItem,
  type Family,
} from "./catalog";
import { REGISTRY_PUBLIC_LABEL, installCommand } from "./registry-meta";
import { CopyCommand } from "./copy-command";
import { DepBadges, DepLogo } from "./dep-badges";
import { SEM_DEPS, allDeps, matchesDep } from "./deps";
import { PalcoFixo, useElementWidth, useLazyDemo } from "./stage";
import { GRID_GAP, colsIn, useFundoEscuro } from "./mosaic";
import { ehNovo } from "./novidades";
import { WireframeToggle } from "./media";
import { BugButton } from "./bug-report";

type Mode = "vitrine" | "lista";
type FamilyFilter = Family | "todos";
type TipoFilter = CatalogItem["type"] | null;

const MODES = [
  { value: "vitrine" as const, icon: LayoutGrid, ariaLabel: "Ver em mosaico, cada peça no tamanho dela" },
  { value: "lista" as const, icon: List, ariaLabel: "Ver em lista" },
];

/**
 * Quem tem demo ganha palco; quem não tem entra como LINHA, na mesma lista.
 *
 * Isto já foi uma aba separada ("Sem interface"), e a razão original era boa: na
 * grade de quatro colunas, uma peça desenhada ao lado de um cartão escrito "sem
 * superfície visual própria" dava o mesmo peso visual pro que se olha e pro que
 * só se instala.
 *
 * O que mudou é que **a grade acabou** — hoje é uma peça por linha. Numa coluna
 * vertical, a linha densa ao lado do card grande JÁ é a diferença de peso que a
 * aba tentava criar, e sem o custo dela: um hook escondido atrás de um segundo
 * clique é um hook que ninguém acha, e a aba era um eixo de filtro a mais
 * competindo com a categoria, que é o eixo que importa.
 *
 * Quem quiser só os hooks agora filtra por **tipo**, que é a pergunta que a aba
 * estava tentando responder por aproximação.
 */
const TEM_INTERFACE = (i: CatalogItem) => Boolean(i.demo);

/**
 * A ordem da página do acervo: o que entrou por último primeiro.
 *
 * A ordem do arquivo é a ordem em que as peças foram escritas, que não diz nada
 * a quem lê. E quem volta à vitrine volta pra ver o que mudou — pôr as novas no
 * topo é o que faz o selo `novo` significar alguma coisa, em vez de ficar
 * espalhado no meio de oitenta cards.
 */
/** Quanto o cursor precisa ficar parado sobre o card pra a peça acordar. */
const ATRASO_HOVER = 140;

/** E quanto ela espera antes de voltar a ser foto, pra resvalo não piscar. */
const ATRASO_SAIDA = 220;

const ACERVO_ORDENADO = [...CATALOG].sort(
  (a, b) => Number(ehNovo(b.name)) - Number(ehNovo(a.name)),
);

/**
 * A capa de uma categoria, no índice.
 *
 * Três miniaturas empilhadas, o nome, a contagem — e **nenhuma demo viva**. É a
 * diferença entre uma home que abre instantânea e uma que monta 81 componentes
 * antes da primeira leitura.
 *
 * As miniaturas saem de `public/shots/`, geradas offline (`npm run build:shots`)
 * a partir da mesma rota `?solo=1` que o iframe de foco usa — mesma peça, mesmo
 * CSS, sem chance de a capa mentir sobre o que o `add` entrega. É o caminho que
 * o shadcn usa no fallback mobile dos blocks.
 *
 * Se o arquivo ainda não existe, a capa cai no nome da peça em mono: degradação,
 * não erro. Uma library que quebra a home porque faltou rodar um script é uma
 * library que ninguém publica na sexta.
 */
function CapaDeCategoria({
  familia,
  itens,
  onAbrir,
}: {
  familia: Family;
  itens: CatalogItem[];
  onAbrir: () => void;
}) {
  // As três primeiras COM demo: peça sem superfície visual não ilustra nada.
  const amostra = itens.filter(TEM_INTERFACE).slice(0, 3);
  const escuro = useFundoEscuro();
  const tom = escuro ? "escuro" : "claro";
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card text-left outline-none",
        "transition-[border-color,box-shadow] [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out)]",
        "hover:border-[var(--brand)] hover:[box-shadow:var(--e-raised)] focus-visible:border-[var(--brand)]",
      )}
    >
      {/*
        Altura fixa na tira, não proporção por miniatura.
        Com `aspect-ratio` em cada figura, a categoria que só tem UMA peça com
        demo (`marca`, com três itens e uma superfície) ganhava uma miniatura
        larga e altíssima, e a capa virava um retângulo oco do dobro da altura
        das vizinhas. A tira tem a altura de uma tira; quantas peças cabem nela
        é outro assunto.
      */}
      <div className="flex h-[104px] gap-1.5 bg-muted/40 p-3">
        {amostra.map((i) => (
          <figure
            key={i.name}
            className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[var(--r-control,0.5rem)] border border-border bg-background"
          >
            {/*
              UMA imagem, escolhida pela luminância do fundo — não um par
              `dark:hidden`/`dark:block`. Ver `useFundoEscuro`: marca de tema
              escuro não liga a classe `.dark`, e o par mostrava a foto clara
              sobre papel preto.

              `object-contain`, depois de a captura passar a recortar no
              conteúdo (`caixaDaPeca`, em `capture-registry.mjs`).

              A ordem importa e foi aprendida na tela: com as fotos antigas, de
              margem enorme, `contain` mostrava um selo no meio do nada e `cover`
              era melhor. Com o recorte justo, `cover` passou a CORTAR PALAVRA
              NO MEIO — "mpanha Verão 26" — e é isso que lê como defeito, não
              como miniatura. Peça inteira e pequena ganha de metade de peça em
              tamanho grande.
            */}
            <img
              src={`/shots/${i.name}-${tom}.webp`}
              alt=""
              /*
               * `eager`, e não `lazy`.
               *
               * São dezoito miniaturas de ~40KB, e as seis capas cabem na
               * primeira tela em qualquer desktop — `lazy` aqui só garante que
               * a pessoa veja o índice VAZIO no primeiro quadro e as fotos
               * aparecerem depois. Adiar carga que já está na dobra é o uso
               * errado do atributo: ele existe pro que está longe.
               */
              loading="eager"
              decoding="async"
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            {/*
              Sem legenda sobre a foto.

              A tira tem 104px e a miniatura já é pequena; um nome por cima dela
              cobre justamente a peça, e o degradê que o nome precisa para ser
              legível cobre mais ainda. Numa capa de categoria o nome de cada
              peça não decide nada — quem decide é a categoria, e os nomes estão
              todos a um clique de distância, ao lado da peça viva.

              O `sr-only` fica: quem navega por leitor de tela precisa saber o
              que a capa está ilustrando, e ali o texto não custa pixel nenhum.
            */}
            <figcaption className="sr-only">{i.name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="flex items-baseline gap-2 px-4 py-3">
        <span className="text-destaque font-medium group-hover:text-[var(--brand)]">
          {familyLabel(familia)}
        </span>
        <span className="font-mono text-apoio tabular-nums text-muted-foreground">
          {itens.length}
        </span>
      </div>
    </button>
  );
}

/*
 * Sem `uppercase tracking-wider`: o selo de tipo aparece uma vez por linha numa
 * lista de 65, e caixa-alta com tracking transforma a coluna inteira em
 * textura. O mono miúdo já separa o selo do nome da peça.
 */
function TypeBadge({ type }: { type: CatalogItem["type"] }) {
  return (
    <span className="shrink-0 rounded-full border border-border px-1.5 py-px font-mono text-micro text-muted-foreground">
      {TYPE_LABEL[type]}
    </span>
  );
}

/**
 * O ladrilho da grade: uma moldura igual pra toda peça.
 *
 * ── Por que o card de altura livre não deu certo ───────────────────────────
 *
 * A grade anterior deixava cada card ter a altura da peça que hospedava. Era
 * defensável no papel — a peça desenha no tamanho natural, ninguém corta nada —
 * e produziu uma página que não parece vitrine:
 *
 * · **Nada é comparável.** Duas peças em molduras de tamanhos diferentes não se
 *   comparam; o olho lê primeiro a diferença das caixas e só depois o conteúdo.
 * · **A grade precisa de máquina pra fechar.** Altura livre em três colunas é
 *   mosaico, e mosaico exige medir cada card, converter em `gridRow: span`,
 *   arredondar por degraus e observar redimensionamento — tudo isso pra decidir
 *   onde o próximo ladrilho encaixa.
 * · **A página nunca fica parada.** Card que mede a si mesmo muda de tamanho
 *   depois de a demo montar, e a grade escorrega debaixo do cursor no scroll.
 *
 * Agora a moldura é fixa e a peça cabe dentro dela (`PalcoFixo`). A grade é um
 * `grid` de três colunas, sem medição, sem span, sem degrau. O que se perde é a
 * peça grande em tamanho grande; o que se ganha é uma vitrine em que dá pra
 * varrer sessenta peças com o olho — e o tamanho real continua a um clique, na
 * ficha, com os presets de viewport.
 *
 * Embaixo da moldura vão as duas informações que decidem o clique: o nome da
 * peça e a categoria. A descrição saiu — em três colunas ela vira uma linha
 * truncada que não informa e desalinha o rodapé de cada card.
 */
const Ladrilho = React.memo(function Ladrilho({
  item,
  onOpen,
  index,
  foto = false,
}: {
  item: CatalogItem;
  onOpen: () => void;
  index: number;
  /**
   * Foto em repouso, peça viva no hover.
   *
   * É o que torna possível a página com o acervo INTEIRO. Oitenta e duas demos
   * vivas na mesma rota foi o que produziu os 26.253px de altura e uma dúzia de
   * `setInterval` competindo — a razão de o catálogo ter sido fatiado.
   *
   * Mas grade de foto parada é lápide: metade destas peças SÃO movimento (a
   * faixa que anda, o glitch, o reveal), e uma foto delas mostra justamente o
   * quadro em que elas não estão fazendo nada.
   *
   * A saída não é gravar oitenta e dois vídeos — é montar a demo de verdade
   * quando o cursor chega, e desmontar quando sai. Uma peça viva por vez, que é
   * exatamente o custo que a página aguenta, e ainda por cima interativa: dá pra
   * arrastar o knob de dentro do card. Vídeo não faz isso.
   */
  foto?: boolean;
}) {
  const Demo = item.demo;
  const { w, h } = previewOf(item);
  const { ref, mounted, active } = useLazyDemo<HTMLElement>();
  const escuro = useFundoEscuro();
  // Foto que ainda não foi gerada não pode virar moldura vazia: card em branco
  // no meio da grade lê como peça quebrada. Cai no nome, como o item sem demo.
  const [semFoto, setSemFoto] = React.useState(false);

  /*
   * O hover que acorda a peça.
   *
   * `ATRASO_HOVER` existe porque o gesto mais comum na grade é atravessá-la com
   * o mouse a caminho de outra coisa. Sem espera, varrer três fileiras montaria
   * e desmontaria vinte demos em meio segundo — GSAP, canvas, `setInterval`, tudo
   * — e a página engasgaria justamente por causa do recurso que existe pra ela
   * parecer viva.
   *
   * `focus-within` entra junto: quem percorre a grade pelo teclado tem o mesmo
   * direito de ver a peça se mexendo.
   */
  const [acordado, setAcordado] = React.useState(false);
  const relogio = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(relogio.current), []);

  const acordar = React.useCallback(() => {
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setAcordado(true), ATRASO_HOVER);
  }, []);

  const dormir = React.useCallback(() => {
    clearTimeout(relogio.current);
    // Desmontar na hora faz a peça piscar de volta pra foto quando o cursor
    // resvala na borda. Um respiro curto cobre o resvalo sem segurar CPU.
    relogio.current = setTimeout(() => setAcordado(false), ATRASO_SAIDA);
  }, []);

  // Toque não tem hover. Em vez de a peça nunca acordar no celular, o card
  // inteiro continua sendo o alvo de abrir — a ficha é que mostra a peça viva.
  const viva = Boolean(Demo) && (!foto || acordado);

  /*
   * A moldura de foto, uma vez só.
   *
   * Ela aparece em dois papéis: como o card em repouso e como a espera enquanto
   * o chunk da demo chega. Duplicar o markup faria os dois divergirem no
   * primeiro ajuste de padding — e aí a troca no hover ganharia um pulinho.
   */
  const moldura = (
    <div
      role="button"
      tabIndex={-1}
      onClick={onOpen}
      className="flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden border-b border-border p-2"
      style={stageSurfaceOf(item)}
    >
      {/* `object-contain`: a captura já vem recortada no conteúdo, e `cover`
          passou a cortar palavra no meio — que lê como defeito, não como
          miniatura. Peça inteira e pequena ganha de metade de peça grande. */}
      <img
        src={`/shots/${item.name}-${escuro ? "escuro" : "claro"}.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
        /* Degradação, não erro: uma library que quebra a home porque faltou
           rodar um script ninguém publica na sexta. */
        onError={() => setSemFoto(true)}
      />
    </div>
  );

  return (
    <article
      ref={ref}
      /* O nome no DOM.
       *
       * O card mostra o TÍTULO ("Logo Wall"), que é o que se lê; o nome do
       * registry ("logo-wall") é o que se digita no `add` e o que a suíte usa
       * pra achar a peça. Antes os testes procuravam o nome no texto visível —
       * e no dia em que o card passou a mostrar o título, quinze deles ficaram
       * vermelhos sem que nada tivesse quebrado. Âncora é atributo, não texto. */
      data-name={item.name}
      onPointerEnter={foto ? acordar : undefined}
      onPointerLeave={foto ? dormir : undefined}
      onFocusCapture={foto ? acordar : undefined}
      onBlurCapture={foto ? dormir : undefined}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card",
        "transition-[border-color,box-shadow] [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out)]",
        "focus-within:border-[var(--brand)] hover:border-[var(--brand)] hover:[box-shadow:var(--e-raised)]",
      )}
    >
      {/*
        A moldura NÃO é um botão — e essa é a diferença entre a peça viva ser
        um enfeite e ser usável.
        
        A primeira versão embrulhava moldura e rótulo num `<button>` só. Parecia
        bom (o card inteiro vira alvo) e quebrava duas coisas ao mesmo tempo:
        toda demo que tem um botão dentro passou a produzir `<button>` dentro de
        `<button>` — HTML inválido, 26 avisos do React na fatia — e, pior, o
        clique no knob virava clique no card. O recurso existe justamente pra
        deixar a pessoa arrastar o knob de dentro da grade.
        
        Então: a moldura é clicável só ENQUANTO É FOTO, e o título é o botão que
        sempre abre. Acordada, a peça é dela.
      */}
      <div className="flex min-w-0 flex-1 flex-col">
        {Demo && !viva && !semFoto ? (
          moldura
        ) : viva ? (
          <PalcoFixo
            w={w}
            h={h}
            /* A mesma moldura da foto: a fatia viva e o acervo em foto têm de
               dar cards do mesmo tamanho, senão trocar de página parece trocar
               de site. E 16/10 é mais generoso com as peças largas — em 4/3 uma
               cena de 1280×300 virava uma faixa fina no meio de um vazio. */
            ratio={16 / 10}
            active={active}
            className="border-b border-border"
            style={stageSurfaceOf(item)}
          >
            {/*
              A FOTO é a espera, não um esqueleto.
              
              A demo chega por `import()`, e a primeira versão punha um retângulo
              pulsando no lugar. O resultado no hover era foto → cinza piscando →
              peça: um passo a mais do que existia antes, e o passo do meio não
              informa nada. A captura já está na tela e é a mesma peça; deixá-la
              ali faz a troca parecer a peça ganhando vida em vez de a página
              recarregando.
              
              A fronteira precisa ficar AQUI dentro: sem ela a suspensão sobe até
              o topo da árvore e a grade inteira pisca por causa de um card.
            */}
            <React.Suspense fallback={foto ? moldura : <div className="h-full w-full animate-pulse bg-muted/40" />}>
              {mounted && Demo ? <Demo /> : <div className="h-full w-full animate-pulse bg-muted/40" />}
            </React.Suspense>
          </PalcoFixo>
        ) : (
          /* Lib, hook e tema não têm superfície. Em vez de sumirem da grade —
             que era o efeito de mandá-los pra uma linha densa —, recebem a
             mesma moldura com o nome desenhado nela. A library tem 81 peças, e
             nove delas não serem visíveis é nove peças que ninguém descobre. */
          <div className="flex aspect-[16/10] items-center justify-center border-b border-border bg-muted/20 px-6">
            <span className="text-center font-mono text-apoio text-muted-foreground">
              {item.name}
            </span>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-0.5 px-4 pb-3 pt-3">
          {/* O botão de verdade do card: o título. É por ele que a navegação
              por seta percorre a grade (`data-card-index`) e é ele que o
              teclado alcança — a moldura fica fora da ordem de tabulação
              justamente pra não haver dois alvos pro mesmo destino. */}
          <button
            type="button"
            data-card-index={index}
            onClick={onOpen}
            className="truncate text-left text-destaque font-semibold tracking-tight outline-none hover:text-[var(--brand)] focus-visible:underline"
          >
            {item.title}
          </button>
          <p className="truncate pr-24 font-mono text-micro uppercase tracking-wider text-muted-foreground">
            {familyLabel(item.family)} · {TYPE_LABEL[item.type]}
          </p>
        </div>
      </div>

      {/* O selo do que entrou por último, dentro da moldura, onde o olho já
          está. Borda e fundo na marca; a cor do texto continua a do tema. */}
      {ehNovo(item.name) ? (
        <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-[var(--brand)] bg-background/80 px-1.5 py-px font-mono text-micro uppercase tracking-wider backdrop-blur-sm">
          novo
        </span>
      ) : null}

      {/* Copiar o `add` é a ação que a vitrine existe pra provocar: fica sempre
          visível. Reportar bug some em repouso — é a única ação aqui que não é
          sobre usar a peça. */}
      <div className="absolute bottom-2.5 right-3 flex items-center gap-1">
        <BugButton item={item.name} />
        <CopyCommand variant="chip" text={installCommand(item.name)} />
      </div>
    </article>
  );
});

function Row({ item, onOpen, index }: { item: CatalogItem; onOpen: () => void; index: number }) {
  return (
    <div className="group flex items-center gap-3 border-b border-border px-2 py-2.5 transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:bg-muted/40">
      <button
        type="button"
        data-card-index={index}
        onClick={onOpen}
        className="min-w-0 flex-1 text-left outline-none"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-apoio group-hover:text-[var(--brand)]">{item.name}</span>
          <TypeBadge type={item.type} />
          {/* Sem `onPick` aqui: a linha inteira já é um botão, e um botão dentro
              de outro é HTML inválido antes de ser problema de teclado. */}
          <DepBadges name={item.name} variant="icones" />
        </span>
        <span className="mt-0.5 line-clamp-1 block text-apoio text-muted-foreground">
          {item.description}
        </span>
      </button>
      {/*
        Sem `no-hover`: numa linha de item que não tem o que mostrar, copiar o
        comando é a ÚNICA ação que existe. Escondê-la atrás do hover é esconder
        a linha inteira — e no toque não há hover para revelar nada.
      */}
      <CopyCommand variant="chip" text={installCommand(item.name)} />
      <BugButton item={item.name} variant="chip" />
    </div>
  );
}

/**
 * O catálogo, em dois modos — e é a rota que decide qual.
 *
 * `familia = null` desenha o ÍNDICE: as seis capas de categoria, com contagem, e
 * nenhuma demo montada. `familia = "motion"` desenha só aquela família, viva.
 *
 * A razão é medida, não gosto: com as 81 entradas numa página só, o documento
 * fechava em 26.253px. Nenhuma library de referência faz isso — shadcn e Origin
 * UI fatiam por categoria em rota estática, e o índice geral delas é estático.
 * Ver `PLANO-VITRINE.md`.
 *
 * Quem chama é o `App.tsx` (a rota); quem desenha é este arquivo. Os dois lados
 * do contrato foram publicados antes de qualquer um dos dois ser escrito, para
 * as duas frentes poderem andar juntas sem editar o arquivo da outra.
 */
export interface GalleryProps {
  focus: string | null;
  onFocus: (name: string | null) => void;
  /** `null` = índice de categorias. Uma família = aquela fatia, com demo viva. */
  familia?: Family | null;
  /** O card de categoria navega por aqui. Ausente = a Gallery troca por estado. */
  onFamilia?: (f: Family | null) => void;
}

export function Gallery({ focus, onFocus, familia = null, onFamilia }: GalleryProps) {
  const [q, setQ] = React.useState("");
  const [family, setFamily] = React.useState<FamilyFilter>("todos");
  /** `null` = não filtra por dependência. `SEM_DEPS` = só o que não puxa nada. */
  const [dep, setDep] = React.useState<string | null>(null);
  const [tipo, setTipo] = React.useState<TipoFilter>(null);
  const [mode, setMode] = React.useState<Mode>("vitrine");
  /**
   * Os dois eixos secundários ficam recolhidos.
   *
   * A barra tinha três linhas permanentes — busca, categoria e npm — e com 65
   * itens a terceira linha empurrava o primeiro card pra baixo da dobra em
   * qualquer laptop. Categoria é a pergunta que quase todo mundo faz e fica à
   * vista; tipo e peso de bundle são perguntas de quem já está decidindo, e
   * cabem atrás de um clique. O botão diz quantos filtros estão ligados, então
   * recolher nunca esconde um filtro ATIVO.
   */
  const [abertos, setAbertos] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // `| null` explícito: a grade recebe um ref de callback (mede a largura) que
  // também alimenta este aqui, e ref só é atribuível quando é mutável.
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const heroRef = React.useRef<HTMLElement>(null);
  const { brands } = useBrandTheme();

  /*
   * A grade mede a si mesma, e não o viewport.
   *
   * Contar coluna por breakpoint dá certo até a página ganhar uma barra lateral
   * ou o `shell` mudar de teto — aí o número chutado e o número real divergem, e
   * a divergência aparece como card atravessando duas colunas e meia. Aqui a
   * largura vem do próprio nó, então a conta não tem como envelhecer.
   */
  const [gridWidthRef, gridWidth] = useElementWidth<HTMLDivElement>();
  const cols = colsIn(gridWidth);
  const colW = gridWidth ? (gridWidth - (cols - 1) * GRID_GAP) / cols : 0;
  const gridRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      gridWidthRef(node);
    },
    [gridWidthRef],
  );

  /*
   * A rota manda na fatia; o filtro de família só existe DENTRO de uma fatia.
   *
   * Com `familia = null` a página não é uma lista com filtro — é o índice das
   * seis categorias. Foi a medição que forçou isso: as 81 entradas juntas davam
   * um documento de 26.253px, e nenhuma library de referência monta o catálogo
   * inteiro numa página só (ver `PLANO-VITRINE.md`).
   */
  const pool = React.useMemo(
    () => (familia ? CATALOG.filter((i) => i.family === familia) : CATALOG),
    [familia],
  );

  /** Índice: nem fatia escolhida, nem busca digitada. */
  const noIndice = !familia && !q.trim();

  const results = React.useMemo(() => {
    // Busca que começa vazia — o truque do Origin UI. No índice, nada monta até
    // a pessoa pedir; é o que mantém a home barata mesmo com 81 peças.
    if (noIndice) return [];
    const needle = fold(q.trim());
    return pool.filter(
      (i) =>
        (family === "todos" || i.family === family) &&
        (tipo === null || i.type === tipo) &&
        matchesDep(i.name, dep) &&
        matches(i, needle),
    );
  }, [q, family, dep, tipo, pool, noIndice]);

  /*
   * O filtro de dependência se monta do que EXISTE ali, com a contagem junto.
   *
   * A alternativa era uma lista fixa de libs escrita à mão — e ela envelheceria
   * no dia em que alguém colhesse a primeira peça com `three`, oferecendo um
   * filtro que não existe e escondendo o que passou a existir.
   *
   * O escopo é a categoria E o tipo escolhidos, pelo mesmo motivo que a contagem
   * de categoria não olha o catálogo inteiro: número de chip que o clique
   * seguinte desmente contamina a confiança em todos os outros.
   */
  const escopoDep = React.useMemo(
    () => pool.filter((i) => (family === "todos" || i.family === family) && (tipo === null || i.type === tipo)),
    [pool, family, tipo],
  );
  const depsDoEscopo = React.useMemo(() => allDeps(escopoDep.map((i) => i.name)), [escopoDep]);
  const semDepsCount = React.useMemo(
    () => escopoDep.filter((i) => matchesDep(i.name, SEM_DEPS)).length,
    [escopoDep],
  );

  /* Dependência que sumiu do escopo deixaria a pessoa olhando lista vazia sem pedir. */
  React.useEffect(() => {
    if (!dep) return;
    const existe =
      dep === SEM_DEPS ? semDepsCount > 0 : depsDoEscopo.some((d) => d.info.key === dep);
    if (!existe) setDep(null);
  }, [depsDoEscopo, semDepsCount, dep]);

  const pickDep = React.useCallback((chave: string) => {
    // Clicar de novo na mesma dependência desfaz: o ícone do card é o mesmo
    // controle, ligado e desligado, e não um caminho só de ida.
    setDep((atual) => (atual === chave ? null : chave));
    // E abre o painel: filtrar pelo ícone do card com o painel fechado mudaria
    // a lista sem mostrar QUAL controle mudou, que é como filtro vira mágica.
    setAbertos(true);
  }, []);

  /*
   * A contagem de cada categoria já obedece aos outros dois filtros.
   *
   * Um chip escrito "Fundação 8" que entrega 1 porque o filtro de tipo está
   * ligado é uma promessa que a própria tela desmente no clique seguinte — e
   * some com a confiança no resto dos números.
   */
  const escopoFamilia = React.useMemo(
    () => pool.filter((i) => matchesDep(i.name, dep) && (tipo === null || i.type === tipo)),
    [pool, dep, tipo],
  );

  /** Idem para o eixo de tipo: conta dentro da categoria e do npm escolhidos. */
  const countByTipo = React.useMemo(() => {
    const escopo = pool.filter(
      (i) => (family === "todos" || i.family === family) && matchesDep(i.name, dep),
    );
    return escopo.reduce<Record<string, number>>((acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [pool, family, dep]);

  /* Tipo que sumiu do escopo deixaria a pessoa olhando lista vazia sem pedir. */
  React.useEffect(() => {
    if (tipo && !countByTipo[tipo]) setTipo(null);
  }, [countByTipo, tipo]);

  /** Quantos eixos secundários estão ligados — é o que o botão recolhido diz. */
  const secundariosAtivos = (tipo ? 1 : 0) + (dep ? 1 : 0);

  const countByFamily = React.useMemo(
    () =>
      escopoFamilia.reduce<Record<string, number>>((acc, i) => {
        acc[i.family] = (acc[i.family] ?? 0) + 1;
        return acc;
      }, {}),
    [escopoFamilia],
  );

  /* Família vazia na aba nova deixaria a pessoa olhando um nada que ela não pediu. */
  React.useEffect(() => {
    if (family !== "todos" && !countByFamily[family]) setFamily("todos");
  }, [countByFamily, family]);

  /*
   * Filtrar encolhe a página embaixo de quem está rolando.
   *
   * Sair de "Todos" (46 itens, ~5100px) para uma família de 9 corta o documento
   * para ~1500px. O navegador prende o scroll no novo fim e a pessoa fica
   * centenas de pixels ABAIXO do primeiro resultado, olhando um vazio — parece
   * bug de layout e é só posição de scroll órfã. Então, quando o resultado muda
   * e a barra de controle já saiu por cima, a página volta para ela (não para o
   * topo absoluto: o herói já foi lido, os controles é que precisam estar à mão).
   */
  const first = React.useRef(true);
  React.useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const hero = heroRef.current;
    if (!hero) return;

    /*
     * `useLayoutEffect`, e não `useEffect` + `requestAnimationFrame`.
     *
     * Roda depois de o DOM novo existir e ANTES da pintura, então a pessoa nunca
     * vê o quadro errado. A versão com rAF parecia equivalente e não é: quadro
     * não é entregue em aba de segundo plano, e o corretivo simplesmente não
     * acontecia (foi assim que o bug sobreviveu ao primeiro conserto).
     *
     * Medimos o HERÓI, não a barra de controle: a barra é `sticky`, e no Chrome
     * tanto o `getBoundingClientRect` quanto o `offsetTop` dela já vêm deslocados
     * pela grudada — a conta se anulava e o alvo saía igual ao scroll atual. O
     * fim do herói é onde a barra começa no layout, e ele não gruda.
     */
    const headerH = document.querySelector("header")?.offsetHeight ?? 0;
    const target = Math.max(0, hero.getBoundingClientRect().bottom + window.scrollY - headerH);
    // Salto seco: a lista mudou inteira, rolagem suave aqui só atrasaria o que a
    // pessoa pediu — e ainda seria cancelada pelo reflow do próprio filtro.
    if (window.scrollY > target) window.scrollTo({ top: target, behavior: "auto" });
  }, [family, dep, tipo, mode, results.length]);

  /*
   * A grade não monta mais a ficha.
   *
   * Enquanto a ficha era um diálogo, ela vivia por cima desta lista e precisava
   * dela pra saber o que `←`/`→` percorrem. Como página, `/c/<item>` é outra
   * rota — quem decide o que renderizar é o `App`, e a lista de irmãos sai da
   * família da peça, não do filtro que estava aplicado na grade.
   */

  // Atalhos da grade. `/` foca a busca — convenção de quem usa o teclado — e as
  // setas percorrem os cards a partir do que estiver focado, com o número de
  // colunas lido do próprio grid em vez de chutado por breakpoint.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && typing) {
        if (q) setQ("");
        else inputRef.current?.blur();
        return;
      }
      if (typing || !listRef.current) return;

      const cards = Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-card-index]"));
      if (!cards.length) return;
      const current = cards.findIndex((b) => b === el);

      const move = (delta: number) => {
        e.preventDefault();
        const target =
          current < 0 ? 0 : Math.min(Math.max(current + delta, 0), cards.length - 1);
        cards[target]?.focus();
        cards[target]?.scrollIntoView({ block: "nearest" });
      };

      /*
       * Esquerda/direita andam um card; cima/baixo andam uma fileira.
       *
       * "Uma fileira" no mosaico não é um número fixo — o card de faixa cheia
       * come as três colunas sozinho. Andar pelo número de colunas é aproximação,
       * e é a aproximação certa: quem usa seta espera sair do lugar de forma
       * previsível, não aterrissar no vizinho geométrico exato. No modo lista o
       * salto é sempre 1, porque lá é uma coluna só.
       */
      const fileira = mode === "vitrine" ? cols : 1;
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowDown") move(fileira);
      else if (e.key === "ArrowUp") move(-fileira);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [q, mode, cols]);

  return (
    <div className="shell pb-24">
      {/*
       * A dobra encolhe quando a sidebar existe.
       *
       * Com a coluna da esquerda na tela, a fatia repetia três coisas que já
       * estavam ali: a volta pras categorias, o nome da categoria e a contagem.
       * Somando o parágrafo de tese, eram QUATRO blocos de texto antes do
       * primeiro componente — numa página cuja única promessa é mostrar
       * componente. Acima de `lg` sobra o título; abaixo, onde não há sidebar,
       * tudo continua como estava, porque lá é a única porta.
       */}
      <section
        ref={heroRef}
        className={cn(
          "pt-10 pb-7 sm:pt-14 sm:pb-8",
          familia && "lg:pt-8 lg:pb-5",
        )}
      >
        {familia ? (
          <button
            type="button"
            onClick={() => onFamilia?.(null)}
            className="mb-3 inline-flex items-center gap-1.5 font-mono text-apoio text-muted-foreground outline-none hover:text-[var(--brand)] focus-visible:text-[var(--brand)] focus-visible:underline lg:hidden"
          >
            ← todas as categorias
          </button>
        ) : null}
        <h1
          className={cn(
            "font-semibold leading-[1.02] tracking-[-0.03em]",
            familia
              ? "text-[clamp(1.5rem,4vw,2.4rem)]"
              : "text-[clamp(1.75rem,5vw,3.2rem)]",
          )}
          style={{ fontFamily: "var(--font-display, inherit)" }}
        >
          {familia ? familyLabel(familia) : "A library da Visant"}
        </h1>
        {/* Duas frases, e a segunda é a tese. A versão anterior tinha quatro e
            explicava também onde ficam as marcas reais — informação de conta,
            que pertence à tela de conta, não à primeira dobra do catálogo. */}
        <p
          className={cn(
            "mt-4 max-w-2xl text-corpo leading-relaxed text-muted-foreground sm:text-destaque",
            // A tese é da porta de entrada. Repetida em cada uma das seis fatias
            // ela vira cabeçalho institucional, e cabeçalho institucional é o
            // que empurra o conteúdo pra fora da primeira tela.
            familia && "lg:hidden",
          )}
        >
          {/* Conta a lista que está na tela, e não um número escrito à mão que
              envelhece: o portão `npm run check:catalog` garante que esta lista
              e o registry.json não divergem. */}
          {familia ? pool.length : CATALOG.length} peças servidas por{" "}
          <code className="font-mono text-corpo">{REGISTRY_PUBLIC_LABEL}</code>, em{" "}
          {/*
            O número de temas vem do índice do vault — o sync publica marca nova e
            a frase acompanha sozinha. A frase inteira fica no ar desde o primeiro
            quadro, com o número reservado num slot de largura fixa: antes ela
            APARECIA quando o vault respondia, e o parágrafo ganhava uma linha
            com a pessoa já lendo.
          */}
          <span className="inline-block min-w-[1.6ch] tabular-nums">{brands.length || "…"}</span>{" "}
          marcas. Nenhum componente sabe a cor de um cliente. Trocar a marca no seletor repinta
          esta página inteira.
        </p>
      </section>

      {/* controles */}
      <div className="shell-bleed sticky top-[var(--shell-header-h)] z-30 border-b border-border bg-background/85 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-[var(--r-pill,9999px)] border border-border bg-card px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, uso ou tag…"
              aria-label="Buscar no catálogo"
              className="w-full min-w-0 bg-transparent text-corpo outline-none placeholder:text-muted-foreground"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Limpar busca"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden rounded border border-border px-1.5 font-mono text-micro text-muted-foreground sm:block">
                /
              </kbd>
            )}
          </div>

          {/* Ao lado do modo de visualização porque é a mesma natureza: as duas
              mudam COMO se olha o catálogo, não O QUE ele mostra. Filtro tira
              peça da lista; estes dois não tiram nenhuma. */}
          <WireframeToggle />

          <SegmentedControl
            value={mode}
            onChange={setMode}
            variant="compact"
            aria-label="Modo de visualização"
            options={MODES}
          />
        </div>

        {/* A ÚNICA linha permanente de filtro: a categoria. Rola na horizontal
            no celular em vez de virar quatro linhas. */}
        <div className="shell-bleed mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {/*
            Os chips de CATEGORIA somem acima de `lg` — e só eles.
            
            A sidebar já lista as seis categorias com a contagem, e dois
            controles pra mesma pergunta ensinam a pessoa a não confiar em
            nenhum dos dois. Já "tipo e peso" não tem equivalente na coluna: ele
            responde "isso pesa no meu bundle?", que é a pergunta de quem JÁ
            escolheu a categoria. Esconder os dois juntos foi o que sumiu com o
            filtro de npm inteiro no desktop.
          */}
          <span className="contents lg:hidden">
          {/*
            Dentro de uma fatia, o chip de categoria NAVEGA em vez de filtrar.
            São a mesma pergunta — "quero ver outra categoria" — e ter as duas
            respostas na mesma barra (um chip que filtra dentro da rota e uma
            rota que faz o mesmo) é o tipo de duplicidade que faz a pessoa clicar
            e não entender o que mudou. No índice a barra some: as capas já são
            as categorias.
          */}
          {/*
            Na fatia este chip é uma SAÍDA, não um filtro — e por isso ele perde
            o número. Com a contagem, "Todos 81" ao lado de "Motion 22" numa
            página que mostra 22 peças se lê como "81 aqui": o número certo, na
            barra errada, mentindo. Todo outro número desta barra fala do que
            está na tela; este falaria de outro lugar.
          */}
          <Chip
            pressed={familia ? false : family === "todos"}
            // A contagem do "Todos" também obedece aos eixos recolhidos — senão
            // ele anuncia 65 e entrega 5, que é o tipo de número que ensina a
            // pessoa a não confiar em nenhum outro na barra.
            count={familia ? undefined : escopoFamilia.length}
            onClick={() => (familia ? onFamilia?.(null) : setFamily("todos"))}
            className="rounded-[var(--r-pill,9999px)] py-1.5 text-apoio"
          >
            {familia ? "← todas" : "Todos"}
          </Chip>
          {FAMILIES.filter((f) => (familia ? true : countByFamily[f.key])).map((f) => (
            <Chip
              key={f.key}
              pressed={familia ? familia === f.key : family === f.key}
              count={
                familia
                  ? CATALOG.filter((i) => i.family === f.key).length
                  : (countByFamily[f.key] ?? 0)
              }
              onClick={() => (familia ? onFamilia?.(f.key) : setFamily(f.key))}
              className="rounded-[var(--r-pill,9999px)] py-1.5 text-apoio"
            >
              {f.label}
            </Chip>
          ))}
          </span>

          {/* O botão dos eixos secundários. Carrega a contagem do que está
              ligado, então recolhido nunca esconde filtro ativo — o modo de
              falha clássico de disclosure em barra de filtro. */}
          <span className="shrink-0 sm:ml-auto sm:pl-3">
            <Chip
              pressed={abertos || secundariosAtivos > 0}
              count={secundariosAtivos}
              onClick={() => setAbertos((v) => !v)}
              icon={<SlidersHorizontal className="h-3 w-3" />}
              aria-expanded={abertos}
              className="gap-1.5 rounded-[var(--r-pill,9999px)] py-1.5 text-apoio"
            >
              Tipo e peso
            </Chip>
          </span>
        </div>

        {/*
          Os dois eixos secundários, recolhidos.

          "Que tipo de peça é essa?" e "isso pesa no meu bundle?" são perguntas
          de quem JÁ escolheu a categoria e está decidindo. Elas ocupavam duas
          linhas permanentes da barra — com 65 itens, isso empurrava o primeiro
          card pra baixo da dobra em qualquer laptop, e a página abria mostrando
          controle em vez de componente.
        */}
        {abertos ? (
          <div className="shell-bleed mt-2 space-y-1.5 border-t border-border pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="w-8 shrink-0 font-mono text-micro text-muted-foreground">
                tipo
              </span>
              {(Object.keys(TYPE_LABEL) as CatalogItem["type"][])
                .filter((t) => countByTipo[t])
                .map((t) => (
                  <Chip
                    key={t}
                    pressed={tipo === t}
                    count={countByTipo[t]}
                    // Clicar de novo desfaz: o mesmo controle ligado e
                    // desligado, e não um caminho só de ida.
                    onClick={() => setTipo((atual) => (atual === t ? null : t))}
                    className="rounded-[var(--r-pill,9999px)] px-2.5 py-1 font-mono text-micro font-normal"
                  >
                    {TYPE_LABEL[t]}
                  </Chip>
                ))}
            </div>

            {depsDoEscopo.length ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="w-8 shrink-0 font-mono text-micro text-muted-foreground">
                  npm
                </span>
                {semDepsCount ? (
                  <Chip
                    pressed={dep === SEM_DEPS}
                    count={semDepsCount}
                    onClick={() => pickDep(SEM_DEPS)}
                    className="rounded-[var(--r-pill,9999px)] px-2.5 py-1 text-micro font-normal"
                  >
                    Nenhuma
                  </Chip>
                ) : null}
                {depsDoEscopo.map(({ info, count }) => (
                  <Chip
                    key={info.key}
                    pressed={dep === info.key}
                    count={count}
                    onClick={() => pickDep(info.key)}
                    icon={info.icon ? <DepLogo icon={info.icon} className="h-3 w-3" /> : undefined}
                    title={info.packages.join(", ")}
                    className="gap-1.5 rounded-[var(--r-pill,9999px)] px-2.5 py-1 text-micro font-normal"
                  >
                    {info.label}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {noIndice ? (
        /*
         * O acervo inteiro numa página — em foto.
         *
         * A versão anterior mostrava seis CAPAS de categoria e nenhuma peça. Era
         * a resposta certa pra pergunta errada: resolvia os 26.253px que as 81
         * demos vivas produziam, e resolvia escondendo a library atrás de mais
         * um clique. Quem chega numa vitrine de componente quer ver componente,
         * não seis retângulos com nome de categoria.
         *
         * A foto resolve os dois de uma vez, e é como toda vitrine grande de
         * componente funciona: o card é uma imagem, a peça viva mora um clique
         * adiante. As capturas saem da MESMA rota `?solo=1` que a ficha usa
         * (`npm run build:shots`), então não há como a grade mentir sobre o que
         * o `add` entrega.
         *
         * A fatia por categoria continua existindo e continua viva: lá são dez
         * ou vinte demos, que é o número em que montar tudo ainda é barato.
         */
        <div
          style={{ gap: GRID_GAP }}
          className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        >
          {ACERVO_ORDENADO.map((item, i) => (
            <Ladrilho
              key={item.name}
              item={item}
              index={i}
              foto
              onOpen={() => onFocus(item.name)}
            />
          ))}
        </div>
      ) : results.length ? (
        mode === "vitrine" ? (
          <div
            ref={gridRefs}
            /*
             * Uma grade de verdade, e nada de mosaico.
             *
             * `overflow-anchor: none` fica: o Chrome tenta manter na tela o
             * elemento "âncora" quando o conteúdo acima muda, e ao filtrar ele
             * desfazia a reposição logo depois de nós a fazermos — a página
             * voltava pro fim do documento novo.
             *
             * O que saiu foi o `gridAutoRows` de 8px com `gridRow: span N` por
             * card. Aquilo era a máquina de encaixar alturas diferentes; com a
             * moldura fixa do `PalcoFixo` não há altura diferente pra encaixar,
             * e três colunas iguais resolvem sozinhas.
             */
            style={{ overflowAnchor: "none", gap: GRID_GAP }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          >
            {results.map((item, i) => (
              <Ladrilho
                key={item.name}
                item={item}
                index={i}
                onOpen={() => onFocus(item.name)}
              />
            ))}
          </div>
        ) : (
          <div ref={listRef} style={{ overflowAnchor: "none" }} className="mt-6 border-t border-border">
            {results.map((item, i) => (
              <Row key={item.name} item={item} index={i} onOpen={() => onFocus(item.name)} />
            ))}
          </div>
        )
      ) : (
        <div className="mt-16 text-center">
          <p className="text-destaque">Nada com “{q}”.</p>
          <p className="mx-auto mt-2 max-w-md text-corpo text-muted-foreground">
            Se a peça não existe aqui e você está prestes a escrevê-la, ela provavelmente deveria
            virar item. É assim que o registry cresce.
          </p>
        </div>
      )}

    </div>
  );
}
