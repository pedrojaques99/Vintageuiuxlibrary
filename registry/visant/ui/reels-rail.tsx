"use client";

import * as React from "react";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Rail } from "@/components/ui/rail";

/**
 * ReelsRail — o trilho de vídeo vertical: 9:16 passando, o do meio tocando.
 *
 * ── O que vem do `@visant/rail`, e por que não foi reescrito ────────────────
 *
 * Rolagem com encaixe, setas que desabilitam nas pontas, sangria que não
 * desalinha o primeiro item, esmaecimento que segue a borda REAL da lista e —
 * o mais caro de todos — o tabindex rotativo, que faz o trilho inteiro ser UMA
 * parada de Tab em vez de uma por card. Tudo isso já está resolvido e testado
 * ali. Um carrossel de reels escrito do zero repetiria os mesmos quatro erros
 * que o trilho já documenta.
 *
 * O que esta peça acrescenta é a única coisa que o trilho não tem como saber:
 * **qual card está no meio**. É dessa pergunta que sai o comportamento inteiro
 * do formato — um toca, os vizinhos param.
 *
 * ── Por que a posição é medida, e não observada ────────────────────────────
 *
 * `IntersectionObserver` responde "está visível?", e num trilho de reels três
 * cards estão visíveis ao mesmo tempo. A pergunta certa é "qual está mais perto
 * do centro do scroller?", que é uma comparação de distância, não um limiar. Por
 * isso a medida é `getBoundingClientRect` contra o centro do scroller, num
 * `requestAnimationFrame` por evento de rolagem. É um laço sobre N cards a cada
 * quadro de scroll — barato, e o único jeito de o card ativo trocar exatamente
 * quando o olho diz que trocou.
 *
 * O `IntersectionObserver` continua existindo, mas pra outra pergunta: se o
 * TRILHO INTEIRO saiu da tela, tudo pausa. Vídeo tocando fora da viewport é
 * bateria e banda queimadas em pixel que ninguém vê.
 *
 * ── O som ──────────────────────────────────────────────────────────────────
 *
 * Começa mudo, sempre, e não por timidez: navegador nenhum deixa um vídeo com
 * áudio tocar sozinho, e um `play()` recusado deixaria o trilho inteiro parado
 * no primeiro quadro. O botão de som é o gesto do usuário que libera o áudio, e
 * ele vale para UM card por vez — dois reels tocando som juntos é o defeito
 * clássico de quem liga o som por card.
 *
 * ── O que a peça impõe no `<video>` do slot ────────────────────────────────
 *
 * `playsInline`, `loop` e `muted` são escritos no nó por JS. Não é invasão: sem
 * `playsInline` o iOS abre o vídeo em tela cheia no play e o trilho some da
 * página, e esses três atributos são exatamente os que se esquece. A mídia
 * continua entrando por slot — a peça não busca nada e não escolhe formato.
 *
 * Sob `prefers-reduced-motion` nada toca sozinho: o card ativo mostra o pôster e
 * o botão de play, e quem quiser vídeo pede vídeo.
 *
 * ── O laço infinito, e por que ele NÃO clona sem fim ───────────────────────
 *
 * Um mural de reels que acaba no sexto card não é o formato: o formato é a
 * fileira que nunca chega ao fim. A tentação é clonar itens conforme a rolagem
 * avança — e é assim que se vaza memória com vídeo, porque cada clone traz um
 * `<video>` novo, com buffer novo, que nunca é recolhido.
 *
 * Aqui o número de nós é **fixo e calculado uma vez**: mede-se a largura de um
 * conjunto (`passo` = distância do primeiro item de um conjunto ao primeiro do
 * seguinte) e repete-se o conjunto o mínimo de vezes pra sobrar um de cada lado
 * da vista — 3 na maioria das telas. Daí em diante ninguém cria nada: quando a
 * rolagem passa de `2 × passo`, subtrai-se `passo` do `scrollLeft`. Como os
 * conjuntos são idênticos, o salto é invisível, e a fileira anda pra sempre com
 * os mesmos nós. Os `<video>` duplicados apontam pra mesma URL, então o segundo
 * conjunto não baixa um byte a mais — e a regra de reprodução continua sendo a
 * mesma de sempre: **um** card toca, o do meio, e todos os outros ficam
 * pausados no primeiro quadro.
 *
 * O encaixe (`scroll-snap`) sai enquanto o laço está ligado. Encaixe e deriva
 * contínua são dois donos da mesma rolagem: o navegador puxa de volta pro ponto
 * de encaixe a cada quadro e a fileira treme no lugar em vez de andar.
 *
 * O eco não é escondido do leitor de tela, e é decisão, não esquecimento: os
 * conjuntos repetidos são FUNCIONAIS (o card que está tocando pode ser um
 * deles, com os controles dele). `aria-hidden` no eco deixaria os botões do
 * vídeo que está tocando fora do alcance de quem usa teclado na maior parte do
 * tempo — trocar controle inalcançável por lista repetida é o pior dos dois.
 *
 * ── A deriva ───────────────────────────────────────────────────────────────
 *
 * A fileira anda sozinha, devagar, e para quando o ponteiro entra ou o foco cai
 * dentro dela: quem foi olhar um card não quer que ele fuja. Para também com o
 * trilho fora da tela e sob `prefers-reduced-motion` — movimento perpétuo é
 * exatamente o que essa preferência existe pra desligar.
 */

export interface ReelItem {
  id: string;
  /** A mídia, por slot. Um `<video>` com `poster` é o caso normal. */
  media: React.ReactNode;
  title?: React.ReactNode;
  /** A linha miúda: autor, duração, cliente. */
  meta?: React.ReactNode;
  /** Vira link no título. Reel que leva a algum lugar precisa de âncora. */
  href?: string;
}

export interface ReelsRailProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ReelItem[];
  /** Largura de cada card, em px. 9:16 em 260px dá ~462px de altura. */
  itemWidth?: number;
  /** Proporção do card, formato CSS. Reels é `"9/16"`; TikTok idem. */
  ratio?: string;
  gap?: number;
  /** Sangra pra fora do container. Passe o mesmo respiro lateral do pai. */
  bleed?: number | false;
  fade?: boolean;
  arrows?: boolean;
  heading?: React.ReactNode;
  hint?: React.ReactNode;
  label?: string;
  /** Mostra o botão de som no card ativo. Desligue em vídeo sem áudio. */
  sound?: boolean;
  /** O card do meio toca sozinho. Desligue e o play passa a ser sempre manual. */
  autoPlay?: boolean;
  /**
   * A fileira dá a volta em vez de acabar. Ver a nota do cabeçalho.
   *
   * Precisa de itens suficientes pra encher a vista: com dois cards numa faixa
   * larga, o conjunto repetido aparece na tela ao lado do original e a repetição
   * fica óbvia. De 5 pra cima é confortável.
   */
  loop?: boolean;
  /**
   * Quem toca: o card do MEIO ou o card sob o cursor.
   *
   * `"center"` (padrão) é o formato de feed: a fileira decide, o dedo rola, o
   * do meio toca — e funciona igual no celular, onde não existe hover.
   *
   * `"hover"` devolve a escolha ao cursor: nada toca até alguém apontar, e aí
   * toca aquele. Combina com a deriva, que já para quando o ponteiro entra —
   * apontar vira "segura aí que eu quero ver esse". Num aparelho sem cursor
   * ele cai sozinho no `"center"`: um trilho onde nada nunca toca não é uma
   * opção, é um defeito.
   */
  playOn?: "center" | "hover";
  /** A fileira anda sozinha. Só faz sentido com `loop`. */
  drift?: boolean;
  /** Velocidade da deriva, em px por segundo. Acima de ~60 vira esteira. */
  driftSpeed?: number;
}

export function ReelsRail({
  items,
  itemWidth = 260,
  ratio = "9/16",
  gap = 16,
  bleed = false,
  fade = true,
  arrows = true,
  heading,
  hint,
  label = "Vídeos",
  sound = true,
  autoPlay = true,
  playOn = "center",
  loop = true,
  drift = true,
  driftSpeed = 26,
  className,
  ...props
}: ReelsRailProps) {
  const raizRef = React.useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = React.useState(0);
  const [naTela, setNaTela] = React.useState(true);
  const [comSom, setComSom] = React.useState(false);
  const [tocando, setTocando] = React.useState(false);
  /**
   * A vontade explícita da pessoa, e ela ganha do automático.
   *
   * `null` é "ninguém mandou nada" — aí vale a política (`autoPlay`, e nunca sob
   * movimento reduzido). Sem este estado, o botão de pausa não funcionava com
   * `autoPlay` ligado: pausar disparava o efeito de reprodução, que via
   * "autoPlay, card ativo, na tela" e mandava tocar de novo no mesmo quadro.
   * O botão parecia morto, e a causa era o próprio automático.
   *
   * Volta a `null` quando o card ativo troca: a decisão era sobre AQUELE vídeo.
   */
  const [manual, setManual] = React.useState<boolean | null>(null);

  /**
   * O card sob o cursor, e o aparelho que tem cursor.
   *
   * `any-hover: hover` e não `pointer: fine`: um laptop com tela sensível ao
   * toque responde às duas coisas, e a pergunta aqui é "existe um jeito de
   * apontar sem tocar?", não "o ponteiro é preciso?".
   */
  const [sobCursor, setSobCursor] = React.useState<number | null>(null);
  const [temCursor, setTemCursor] = React.useState(true);
  React.useEffect(() => {
    const mq = window.matchMedia("(any-hover: hover)");
    const ler = () => setTemCursor(mq.matches);
    ler();
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);

  // Quem toca. No modo hover sem cursor, cai no do meio — ver a nota da prop.
  const porHover = playOn === "hover" && temCursor;
  const alvo = porHover ? sobCursor : ativo;

  React.useEffect(() => setManual(null), [alvo]);

  // Decidido uma vez, no cliente: o valor é usado dentro de efeitos que não
  // devem depender de um `matchMedia` refeito a cada render.
  const [reduzido, setReduzido] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ler = () => setReduzido(mq.matches);
    ler();
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);

  /*
   * O scroller é o `role="group"` que o trilho desenha por dentro.
   *
   * Não existe prop pra recebê-lo, e criar uma obrigaria a mexer no trilho pra
   * servir uma peça só. A busca é por papel ARIA e não por classe: o papel faz
   * parte do contrato acessível do trilho — ele é o que anuncia a lista — então
   * é a parte dele com menos chance de mudar de nome.
   */
  const scrollerDe = React.useCallback(
    () => raizRef.current?.querySelector<HTMLElement>('[role="group"]') ?? null,
    [],
  );

  /** Qual card está mais perto do centro do scroller. Ver a nota do cabeçalho. */
  React.useEffect(() => {
    const scroller = scrollerDe();
    if (!scroller) return;

    let pendente = 0;
    const medir = () => {
      pendente = 0;
      const caixa = scroller.getBoundingClientRect();
      const centro = caixa.left + caixa.width / 2;
      let melhor = 0;
      let menor = Infinity;
      Array.from(scroller.children).forEach((filho, i) => {
        const r = (filho as HTMLElement).getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - centro);
        if (d < menor) {
          menor = d;
          melhor = i;
        }
      });
      setAtivo(melhor);
    };

    const agendar = () => {
      if (pendente) return;
      pendente = requestAnimationFrame(medir);
    };

    medir();
    scroller.addEventListener("scroll", agendar, { passive: true });
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(agendar);
    ro?.observe(scroller);

    return () => {
      cancelAnimationFrame(pendente);
      scroller.removeEventListener("scroll", agendar);
      ro?.disconnect();
    };
  }, [scrollerDe, items.length]);

  /*
   * ── O laço ────────────────────────────────────────────────────────────────
   *
   * `copias` é quantas vezes a lista é repetida no DOM. Ele muda no máximo uma
   * ou duas vezes (na medida inicial e quando a caixa muda de largura), e
   * DEPOIS disso nada mais é criado — é o que separa este laço do carrossel que
   * clona e vaza. Ver a nota do cabeçalho.
   */
  const [copias, setCopias] = React.useState(loop ? 3 : 1);
  const passoRef = React.useRef(0);

  React.useEffect(() => {
    if (!loop) {
      setCopias(1);
      passoRef.current = 0;
      return;
    }
    const scroller = scrollerDe();
    const n = items.length;
    if (!scroller || !n) return;

    // Encaixe e deriva brigam pela mesma rolagem — ver a nota. O valor antigo
    // volta na limpeza porque o scroller é do trilho, não desta peça.
    const encaixeAntes = scroller.style.scrollSnapType;
    scroller.style.scrollSnapType = "none";

    const medir = () => {
      const filhos = scroller.children;
      if (filhos.length <= n) return;
      // O passo é a distância entre o primeiro item de um conjunto e o primeiro
      // do seguinte: já inclui o `gap` e o arredondamento de sub-pixel do grid.
      // Dividir `scrollWidth` por `copias` erraria um `gap` por volta, e o erro
      // se acumularia até a emenda ficar visível.
      const a = (filhos[0] as HTMLElement).getBoundingClientRect().left;
      const b = (filhos[n] as HTMLElement).getBoundingClientRect().left;
      const passo = b - a;
      if (passo <= 0) return;
      passoRef.current = passo;

      // Um conjunto de folga de cada lado da vista: é o mínimo pra a subtração
      // acontecer sempre sobre conteúdo já pintado.
      const precisa = Math.max(3, Math.ceil(scroller.clientWidth / passo) + 2);
      if (precisa !== copias) {
        setCopias(precisa);
        return;
      }
      // A janela de trabalho é [passo, 2·passo). Começar em `passo` é o que dá
      // lista pra trás — sem isso, arrastar pra esquerda no primeiro gesto
      // esbarraria no zero e a fileira teria um fim, do lado errado.
      if (scroller.scrollLeft < passo * 0.5) scroller.scrollLeft = passo;
    };

    const aoRolar = () => {
      const p = passoRef.current;
      if (!p) return;
      if (scroller.scrollLeft >= p * 2) scroller.scrollLeft -= p;
      else if (scroller.scrollLeft < p) scroller.scrollLeft += p;
    };

    medir();
    scroller.addEventListener("scroll", aoRolar, { passive: true });
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir);
    ro?.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", aoRolar);
      ro?.disconnect();
      scroller.style.scrollSnapType = encaixeAntes;
    };
  }, [loop, items.length, copias, scrollerDe]);

  /** Ponteiro dentro ou foco dentro: a fileira espera. */
  const [pausado, setPausado] = React.useState(false);

  React.useEffect(() => {
    if (!loop || !drift || reduzido || !naTela || pausado) return;
    const scroller = scrollerDe();
    if (!scroller) return;

    let raf = 0;
    let ultimo = 0;
    /*
     * A posição é mantida em ponto flutuante aqui fora porque `scrollLeft`
     * arredonda: a 26px/s são 0,43px por quadro, e escrevendo direto no
     * elemento cada quadro perderia a fração — a fileira andaria aos trancos ou
     * não sairia do lugar. Quando alguém MAIS mexe na rolagem (o dedo, a seta
     * do trilho, a emenda do laço), a divergência passa de 2px e o nosso número
     * obedece ao elemento, nunca o contrário.
     */
    let pos = scroller.scrollLeft;

    const quadro = (t: number) => {
      if (ultimo) {
        const dt = Math.min(64, t - ultimo);
        if (Math.abs(scroller.scrollLeft - pos) > 2) pos = scroller.scrollLeft;
        pos += (driftSpeed * dt) / 1000;
        scroller.scrollLeft = pos;
      }
      ultimo = t;
      raf = requestAnimationFrame(quadro);
    };

    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [loop, drift, reduzido, naTela, pausado, driftSpeed, scrollerDe]);

  /** O trilho inteiro fora da tela para tudo. */
  React.useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e) setNaTela(e.isIntersecting);
      },
      { threshold: 0.15 },
    );
    io.observe(raiz);
    return () => io.disconnect();
  }, []);

  const videos = React.useCallback((): (HTMLVideoElement | null)[] => {
    const scroller = scrollerDe();
    if (!scroller) return [];
    return Array.from(scroller.children).map((c) =>
      (c as HTMLElement).querySelector("video"),
    );
  }, [scrollerDe]);

  /**
   * O comando de reprodução: um toca, o resto para.
   *
   * Roda em efeito, e não no `onClick` do botão, porque a troca de card ativo
   * vem da ROLAGEM — o dedo é quem mais troca de vídeo aqui, e ele não passa por
   * botão nenhum. Deixar a regra num só lugar é o que impede o estado de
   * divergir entre "arrastei" e "cliquei".
   */
  React.useEffect(() => {
    const lista = videos();
    if (!lista.length) return;

    // Movimento reduzido nunca toca sozinho — mas um `play` pedido no botão
    // continua valendo, porque aí não é a página que se mexe sozinha.
    // No modo hover, "ninguém apontando" é uma resposta legítima: tudo parado.
    const querTocar =
      naTela && alvo !== null && (manual ?? (autoPlay && !reduzido));

    lista.forEach((v, i) => {
      if (!v) return;
      // Ver a nota do cabeçalho: os três atributos que sempre faltam.
      v.playsInline = true;
      v.loop = true;

      if (i === alvo && querTocar) {
        v.muted = !(sound && comSom);
        // `play()` devolve promessa e ela REJEITA quando o navegador barra a
        // reprodução (política de autoplay, aba em economia). Sem o catch isso
        // vira "unhandled rejection" no console de quem instalou, por algo que
        // a pessoa nem viu falhar.
        void v.play().catch(() => undefined);
      } else {
        v.muted = true;
        v.pause();
        // Volta ao começo: reel é peça de 6 segundos, e reencontrar um card
        // parado no meio parece vídeo quebrado, não vídeo pausado.
        if (i !== alvo) v.currentTime = 0;
      }
    });
  }, [alvo, naTela, comSom, sound, autoPlay, manual, reduzido, videos, items]);

  /** O ícone de play só conta a verdade se o estado vier do elemento. */
  React.useEffect(() => {
    const v = alvo === null ? null : videos()[alvo];
    if (!v) return;
    const sincronizar = () => setTocando(!v.paused);
    sincronizar();
    v.addEventListener("play", sincronizar);
    v.addEventListener("pause", sincronizar);
    return () => {
      v.removeEventListener("play", sincronizar);
      v.removeEventListener("pause", sincronizar);
    };
  }, [alvo, videos, items]);

  // O botão só declara a vontade; quem toca e quem para é o efeito acima. Uma
  // regra de reprodução, num lugar só — ver a nota dele.
  const alternarPlay = () => setManual(!tocando);

  /**
   * A saída só apaga o card se ele ainda for o apontado.
   *
   * Andando de um card ao vizinho, o `enter` do novo chega ANTES do `leave` do
   * velho. Um `leave` que zera sem conferir apagaria a escolha recém-feita, e o
   * vídeo pararia meio segundo depois de começar — o defeito clássico de mover
   * o cursor rápido por uma fileira.
   */
  const apontar = React.useCallback((posicao: number, dentro: boolean) => {
    setSobCursor((atual) => (dentro ? posicao : atual === posicao ? null : atual));
  }, []);

  /*
   * `min-w-0` na raiz, e não é detalhe de estilo.
   *
   * Item de flex (e de grid) nasce com `min-width: auto`, que é "não encolha
   * abaixo do seu conteúdo". O conteúdo aqui é um trilho de seis cartões de
   * 196px: ~1250px de largura intrínseca. Largado numa linha flex — que é como
   * qualquer página real o usa —, o trilho deixava de rolar e passava a EMPURRAR
   * a página inteira de lado no celular. Quem rola é o trilho; a página, nunca.
   */
  return (
    <div
      ref={raizRef}
      className={cn("relative min-w-0", className)}
      // Os quatro juntos porque a deriva tem que parar pelos DOIS caminhos de
      // atenção: o ponteiro que chega e o foco que entra por teclado. Parar só
      // no hover deixaria a fileira fugindo debaixo de quem navega com Tab.
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausado(false);
      }}
      {...props}
    >
      <Rail
        itemWidth={itemWidth}
        gap={gap}
        bleed={bleed}
        fade={fade}
        arrows={arrows}
        heading={heading}
        hint={hint}
        label={label}
      >
        {Array.from({ length: copias }).flatMap((_, c) =>
          items.map((item, i) => {
            // O índice do card na fileira INTEIRA: é ele que a medida do centro
            // devolve, e é por ele que "o do meio" é decidido — o conjunto de
            // origem não importa pra quem toca.
            const posicao = c * items.length + i;
            return (
              <ReelCard
                key={`${c}:${item.id}`}
                item={item}
                ratio={ratio}
                ativo={posicao === alvo}
                onHover={porHover ? (dentro) => apontar(posicao, dentro) : undefined}
                tocando={tocando}
                comSom={sound && comSom}
                mostrarSom={sound}
                onPlay={alternarPlay}
                onSom={() => setComSom((v) => !v)}
              />
            );
          }),
        )}
      </Rail>
    </div>
  );
}

function ReelCard({
  item,
  ratio,
  ativo,
  tocando,
  comSom,
  mostrarSom,
  onPlay,
  onSom,
  onHover,
}: {
  item: ReelItem;
  ratio: string;
  ativo: boolean;
  tocando: boolean;
  comSom: boolean;
  mostrarSom: boolean;
  onPlay: () => void;
  onSom: () => void;
  /** Só existe no modo `playOn="hover"`. Ausente = o card não escuta ponteiro. */
  onHover?: (dentro: boolean) => void;
}) {
  return (
    <article
      data-ativo={ativo || undefined}
      // `pointerenter/leave` e não `mouseenter`: o mesmo par cobre caneta e
      // mouse, e não dispara no toque (que já não usa este modo).
      onPointerEnter={onHover ? () => onHover(true) : undefined}
      onPointerLeave={onHover ? () => onHover(false) : undefined}
      // Teclado chega ao card pelo link do título: quem tabula até ele também
      // quer ver o vídeo, senão o modo hover exclui quem não usa cursor.
      onFocusCapture={onHover ? () => onHover(true) : undefined}
      onBlurCapture={
        onHover
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHover(false);
            }
          : undefined
      }
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--r-surface,1rem)] bg-[var(--muted)]",
        // O vizinho recua: um pouco menor e um pouco mais apagado. É o que faz o
        // card do meio ser lido como "o que está tocando" sem precisar de borda
        // nem de rótulo dizendo isso.
        // `--dur-slow`: a troca do card ativo acontece sozinha com a deriva, e
        // a 200ms ela piscava a cada passagem. Mais lenta, ela respira.
        "transition-transform [transition-duration:var(--dur-slow,300ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "scale-[0.965] data-[ativo]:scale-100",
        "motion-reduce:scale-100 motion-reduce:transition-none",
        /*
         * O vizinho recua por VÉU, não por `opacity` no card.
         *
         * Com `opacity-70` no elemento inteiro, a foto clara se mistura com o
         * papel da página e o card vira um retângulo em branco — foi o que
         * apareceu na vitrine, sobre fundo claro, com retrato de estúdio. O véu
         * escurece por cima e a foto continua opaca: recua igual no tema claro e
         * no escuro, porque a referência é o preto do véu, não o fundo de quem
         * hospeda.
         */
        "after:pointer-events-none after:absolute after:inset-0 after:z-10 after:bg-black/30",
        "after:transition-opacity after:[transition-duration:var(--dur-slow,300ms)]",
        "data-[ativo]:after:opacity-0 motion-reduce:after:transition-none",
      )}
      style={{ aspectRatio: ratio }}
    >
      <div
        className={cn(
          "absolute inset-0 -z-10",
          "[&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
        )}
      >
        {item.media}
      </div>

      {/* A legenda paga o próprio contraste: a mídia atrás é imprevisível. */}
      {item.title || item.meta ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-12 text-white">
          {item.title ? (
            <p className="text-[length:var(--text-destaque,0.9375rem)] font-semibold leading-[1.25]">
              {item.href ? (
                <a
                  href={item.href}
                  className="no-underline outline-none focus-visible:[box-shadow:var(--focus)]"
                >
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </p>
          ) : null}
          {item.meta ? (
            <p className="text-[length:var(--text-micro,0.6875rem)] leading-[1.4] opacity-80">
              {item.meta}
            </p>
          ) : null}
        </div>
      ) : null}

      {/*
       * Os controles existem SÓ no card ativo, e existem no DOM só quando ele é
       * o ativo. Não é economia de pixel: com eles montados nos oito cards, o
       * tabindex rotativo do trilho teria dezesseis botões pra gerenciar e a
       * pessoa de teclado atravessaria dois controles por card. Aqui há no
       * máximo dois, e eles pertencem ao vídeo que está tocando.
       */}
      {ativo ? (
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <ControleReel
            onClick={onPlay}
            label={tocando ? "Pausar o vídeo" : "Tocar o vídeo"}
          >
            {tocando ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
          </ControleReel>

          {mostrarSom ? (
            <ControleReel
              onClick={onSom}
              pressionado={comSom}
              label={comSom ? "Desligar o som" : "Ligar o som"}
            >
              {comSom ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </ControleReel>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ControleReel({
  onClick,
  label,
  pressionado,
  children,
}: {
  onClick: () => void;
  label: string;
  pressionado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      {...(pressionado === undefined ? null : { "aria-pressed": pressionado })}
      className={cn(
        "grid size-9 place-items-center rounded-[var(--r-pill,9999px)]",
        // Fundo próprio e não `--background`: o controle mora sobre a mídia, e
        // ali o contraste não pode depender do tema da página.
        "bg-black/55 text-white backdrop-blur-[2px]",
        "transition-transform [transition-duration:var(--dur-press,120ms)]",
        "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        "hover:bg-black/70 active:scale-95 motion-reduce:active:scale-100",
        "outline-none focus-visible:[box-shadow:var(--focus)]",
      )}
    >
      <span aria-hidden="true" className="grid place-items-center">
        {children}
      </span>
    </button>
  );
}
