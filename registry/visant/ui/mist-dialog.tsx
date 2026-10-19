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
 */

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
  children?: React.ReactNode;
}

export function MistDialog({
  open,
  onOpenChange,
  onOpen,
  onClose,
  labelledBy,
  closeOnBackdrop = true,
  className,
  children,
  ...props
}: MistDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const downNoFundo = React.useRef(false);

  // Os ganchos vão por ref: o efeito de abrir não pode re-disparar porque o pai
  // recriou uma arrow function a cada render.
  const ganchos = React.useRef({ onOpen, onClose, onOpenChange });
  ganchos.current = { onOpen, onClose, onOpenChange };

  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      ganchos.current.onOpen?.();
    } else if (!open && d.open) {
      d.close(); // o evento `close` avisa o `onClose`
    }
  }, [open]);

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
      {...props}
    >
      {children}
    </dialog>
  );
}
