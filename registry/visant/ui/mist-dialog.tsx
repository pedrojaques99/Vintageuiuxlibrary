"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Mist Dialog — um `<dialog>` modal que entra e sai em névoa.
 *
 * Abre de um desfoque de 14px e de `scale(0.98)` até assentar nítido; fecha
 * voltando para a névoa, e o fundo escurece e desfoca junto. Todo o movimento
 * é CSS (o bloco `css` do item); o JS só chama `showModal()` e `close()`.
 *
 * ── Por que `<dialog>` nativo e não um portal com `div` ────────────────────
 *
 * O navegador entrega de graça o que um modal feito à mão sempre esquece:
 * camada de topo (sem guerra de `z-index`, sem portal), o resto da página
 * `inert`, foco preso dentro e devolvido ao gatilho no fechamento, e o Esc. Nada
 * disso precisa de biblioteca.
 *
 * ── Como a saída anima, se `close()` tira o elemento de cena ───────────────
 *
 * `transition-behavior: allow-discrete` em `display` e `overlay`: o navegador
 * segura o `display: block` e a camada de topo até a transição de opacidade e
 * desfoque terminar. A entrada usa `@starting-style`, que dá ao `[open]` um
 * ponto de partida no primeiro quadro (sem ele não há "de onde" transicionar e
 * o modal surge seco). Navegador sem suporte simplesmente abre e fecha sem
 * névoa — o modal funciona igual, que é o degrau certo.
 *
 * A duração passa do teto de 300ms de propósito: isto não é controle
 * respondendo a clique, é uma passagem rara, de vitrine. Ajuste por
 * `--mist-dialog-dur` no próprio elemento ou num ancestral.
 *
 * ── As armadilhas ──────────────────────────────────────────────────────────
 *
 * 1. **Clique no fundo é clique no próprio `<dialog>`.** O `::backdrop` não é
 *    alvo de evento; quem recebe é o elemento. Por isso o conteúdo tem que
 *    preencher a caixa (o dialog é `p-0`): qualquer clique cujo alvo seja o
 *    dialog em si veio de fora do conteúdo.
 * 2. **Arrastar uma seleção para fora NÃO é clique no fundo.** Quem seleciona
 *    texto dentro e solta o mouse no fundo gera um `click` com alvo no dialog
 *    (o ancestral comum) — e o modal fecharia no meio de uma cópia. Só fecha se
 *    o `pointerdown` TAMBÉM nasceu no fundo.
 * 3. **O Esc fecha pelo navegador, sem perguntar ao React.** O evento `close`
 *    é a única fonte de verdade do fechamento: ele dispara no Esc, no
 *    `close()` e no `<form method="dialog">`, e é nele que o estado controlado
 *    é avisado. Sem isso o `open` do pai ficaria `true` com o modal fechado, e o
 *    próximo clique no gatilho não faria nada.
 * 4. **Scroll suave da página rouba a roda.** Lenis e afins escutam a janela;
 *    `data-lenis-prevent` devolve a rolagem interna ao modal. Para PAUSAR o
 *    scroll suave enquanto aberto, use `onOpen`/`onClose` — o item não importa
 *    lenis nenhum, porque a próxima página pode usar outro.
 * 5. **Desmontar aberto deixaria o `onClose` sem chamar.** Se o componente sai
 *    da árvore com o modal aberto (troca de rota), o efeito de limpeza chama o
 *    `onClose` — senão o scroll suave pausado em `onOpen` nunca voltaria.
 * 6. **`::backdrop` herda variáveis só nos navegadores atuais.** Em motor
 *    antigo `var(--foreground)` não chega ao fundo e ele fica transparente —
 *    o modal continua utilizável, só sem o véu.
 * 7. **Aberto, o filtro é `none`, não `blur(0)`.** Qualquer `filter` diferente
 *    de `none` vira bloco contentor de `position: fixed`: um toast, um menu ou
 *    um botão flutuante dentro do conteúdo passaria a ser posicionado pela
 *    caixa do modal em vez da tela. O desfoque existe só durante a passagem.
 *
 * `prefers-reduced-motion`: fica a opacidade, saem desfoque e escala.
 *
 * ── As outras entradas (`variant`) ─────────────────────────────────────────
 *
 * O report pediu opções de transição. `mist` (padrão) continua sendo o CSS do
 * item, sem uma linha de JS. As outras três rodam pela Web Animations API, que
 * é do navegador, e mais curtas, porque não são passagem contemplativa:
 *
 * | variant | entra                                   | sai          |
 * |---------|-----------------------------------------|--------------|
 * | `mist`  | da névoa, 700ms (o CSS do item)         | volta à névoa |
 * | `rise`  | sobe 24px e aparece                     | desce e some |
 * | `zoom`  | cresce de 0.92 com desfoque curto        | encolhe      |
 * | `wipe`  | abre de cima pra baixo num corte        | fecha o corte |
 *
 * Como a saída dessas três sobrevive ao `close()`: o `transition` em linha
 * mantém só `display` e `overlay` (allow-discrete), então o navegador segura o
 * modal em cena pelo tempo da saída, e a animação, que vence o estilo normal,
 * desenha o caminho. O Esc é pego no `cancel`, que dispara ANTES de o modal
 * sumir, pra a saída começar no mesmo quadro. O véu de fundo segue o CSS e
 * ganha a mesma duração por `--mist-dialog-dur`.
 */

export type MistDialogVariant = "mist" | "rise" | "zoom" | "wipe";

const ENTRADA_MS = 380;
const SAIDA_MS = 240;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 1, 0.45)";

/** O quadro de fora de cada variante; o de dentro é sempre o natural. */
const FORA: Record<Exclude<MistDialogVariant, "mist">, Keyframe> = {
  rise: { opacity: 0, transform: "translateY(24px)", filter: "none" },
  zoom: { opacity: 0, transform: "scale(0.92)", filter: "blur(4px)" },
  wipe: { opacity: 1, transform: "none", filter: "none", clipPath: "inset(0 0 100% 0)" },
};
const DENTRO: Record<Exclude<MistDialogVariant, "mist">, Keyframe> = {
  rise: { opacity: 1, transform: "none", filter: "none" },
  zoom: { opacity: 1, transform: "none", filter: "blur(0px)" },
  wipe: { opacity: 1, transform: "none", filter: "none", clipPath: "inset(0 0 0% 0)" },
};
// Movimento reduzido: só opacidade. `filter`/`transform` explícitos pra vencer
// o estado fechado do CSS durante a passagem.
const FORA_REDUZIDO: Keyframe = { opacity: 0, transform: "none", filter: "none" };
const DENTRO_REDUZIDO: Keyframe = { opacity: 1, transform: "none", filter: "none" };

const reduzido = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export interface MistDialogProps
  extends Omit<React.DialogHTMLAttributes<HTMLDialogElement>, "open" | "onClose"> {
  /** Estado controlado. */
  open: boolean;
  /** Pedido de troca: Esc, clique no fundo, `close()` vindo de dentro. */
  onOpenChange: (open: boolean) => void;
  /** Depois de abrir. Lugar de pausar o scroll suave da página. */
  onOpen?: () => void;
  /** Depois de fechar (inclusive por Esc). Lugar de retomar o scroll suave. */
  onClose?: () => void;
  /** `id` do título dentro do conteúdo — vira `aria-labelledby`. */
  labelledBy?: string;
  /** Fecha ao clicar fora do conteúdo. */
  closeOnBackdrop?: boolean;
  /** Como entra e sai: `mist` (padrão, a névoa), `rise`, `zoom`, `wipe`. */
  variant?: MistDialogVariant;
  children?: React.ReactNode;
}

export function MistDialog({
  open,
  onOpenChange,
  onOpen,
  onClose,
  labelledBy,
  closeOnBackdrop = true,
  variant = "mist",
  className,
  style,
  children,
  onCancel,
  ...props
}: MistDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const downNoFundo = React.useRef(false);
  const passagem = React.useRef<Animation | null>(null);
  const variante = React.useRef(variant);
  variante.current = variant;

  // Toca a passagem das variantes de JS. `mist` não passa por aqui: é CSS.
  const tocar = React.useCallback((sentido: "entra" | "sai") => {
    const d = ref.current;
    const v = variante.current;
    if (!d || v === "mist" || typeof d.animate !== "function") return;
    passagem.current?.cancel();
    const r = reduzido();
    const fora = r ? FORA_REDUZIDO : FORA[v];
    const dentro = r ? DENTRO_REDUZIDO : DENTRO[v];
    const a = d.animate(sentido === "entra" ? [fora, dentro] : [dentro, fora], {
      duration: sentido === "entra" ? ENTRADA_MS : SAIDA_MS,
      easing: sentido === "entra" ? EASE_OUT : EASE_IN,
      // A saída segura o quadro final até o navegador tirar o modal de cena;
      // sem isso ele piscaria no estado aberto entre o fim da animação e o fim
      // do `display` segurado.
      fill: sentido === "sai" ? "forwards" : "none",
    });
    passagem.current = a;
    a.onfinish = () => {
      if (sentido === "sai") a.cancel();
      if (passagem.current === a) passagem.current = null;
    };
  }, []);

  // Os ganchos vão por ref: o efeito de abrir não pode re-disparar porque o pai
  // recriou uma arrow function a cada render.
  const ganchos = React.useRef({ onOpen, onClose, onOpenChange });
  ganchos.current = { onOpen, onClose, onOpenChange };

  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      tocar("entra");
      ganchos.current.onOpen?.();
    } else if (!open && d.open) {
      tocar("sai");
      d.close(); // o evento `close` avisa o `onClose`
    }
  }, [open, tocar]);

  // Armadilha 5: sair da árvore aberto ainda conta como fechar.
  React.useEffect(() => {
    const d = ref.current;
    return () => {
      if (d?.open) ganchos.current.onClose?.();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        // Esc: a saída começa aqui, antes de o navegador fechar.
        tocar("sai");
        onCancel?.(e);
      }}
      onClose={() => {
        ganchos.current.onClose?.();
        ganchos.current.onOpenChange(false);
      }}
      onPointerDown={(e) => {
        downNoFundo.current = e.target === ref.current;
      }}
      onClick={(e) => {
        if (closeOnBackdrop && downNoFundo.current && e.target === ref.current) onOpenChange(false);
        downNoFundo.current = false;
      }}
      className={cn(
        "mist-dialog m-auto max-h-[calc(100svh-32px)] w-[min(1100px,calc(100vw-32px))] max-w-none overflow-y-auto overscroll-contain rounded-[var(--r-surface,16px)] border border-border bg-background p-0 text-foreground",
        className,
      )}
      style={
        variant === "mist"
          ? style
          : ({
              // Só a parte discreta da transição fica: o resto é a animação.
              transition: `display ${SAIDA_MS}ms allow-discrete, overlay ${SAIDA_MS}ms allow-discrete`,
              "--mist-dialog-dur": `${SAIDA_MS}ms`,
              ...style,
            } as React.CSSProperties)
      }
      {...props}
    >
      {children}
    </dialog>
  );
}
