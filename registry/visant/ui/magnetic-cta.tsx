"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * Magnetic CTA — o botão principal que vem buscar o ponteiro.
 *
 * O registry já tinha o `repulsive-hover`, que é o gesto oposto: o elemento
 * FOGE do cursor. Foge serve pra hero decorativo. O botão que fecha a venda
 * precisa do contrário — ele atrai, e a atração é o que faz o clique parecer
 * inevitável. Por isso são dois itens e não um com `direction="away"`: as regras
 * de acessibilidade são opostas. Um elemento que foge nunca pode ser a ação
 * principal; um que atrai só pode ser a ação principal.
 *
 * ── O campo é geometria, e não um elemento que recebe ponteiro ─────────────
 *
 * A primeira versão desenhava o campo como um `<span>` com `padding: 84px` e
 * `margin: -84px` — a área de escuta crescia sem mexer no layout, e o
 * `pointerenter`/`pointerleave` do próprio span era o gatilho. Elegante, e
 * errado: um span com padding continua sendo caixa de clique. Dois CTAs lado a
 * lado com 32px de vão têm halos de 84px que se cruzam, e o halo do primeiro
 * cobre o segundo botão. Na demo da vitrine dava pra ver: o botão da direita
 * simplesmente não recebia o hover.
 *
 * Agora o campo é `pointer-events: none` — ele existe só pra reservar espaço
 * visual — e a conta de distância acontece contra um retângulo em memória. Foi
 * o que devolveu o botão vizinho.
 *
 * ── Um listener pra página inteira, não um por botão ──────────────────────
 *
 * Com o campo fora do jogo, alguém precisa saber onde o ponteiro está antes de
 * ele chegar no botão — e isso só o documento sabe. O `repulsive-hover` resolve
 * com um `mousemove` no `window` POR PEÇA: cinco peças na página, cinco
 * handlers, cinco contas por varredura do mouse.
 *
 * Aqui existe **um** listener no documento pra todas as instâncias, com um
 * `requestAnimationFrame` só. Cada peça inscrita paga quatro comparações
 * numéricas contra o retângulo em cache; quem está longe sai na primeira. É a
 * diferença entre custo por PEÇA e custo por PÁGINA.
 *
 * ── As outras decisões que valem mais que o código ────────────────────────
 *
 * 1. **A medida é lida uma vez por aproximação, não por frame.**
 *    `getBoundingClientRect()` a cada `pointermove` força layout 120 vezes por
 *    segundo pra ler um retângulo que não mudou. Lê ao entrar no campo e
 *    reinvalida no `scroll` e no `resize` — as duas únicas coisas que movem o
 *    botão enquanto o ponteiro se aproxima.
 *
 * 2. **O rótulo anda MENOS que o botão.** É o detalhe que separa "botão que
 *    escorrega" de "objeto com massa": a casca vai a 100% do puxão e o texto
 *    fica `labelLag` pra trás, então existe paralaxe dentro da peça. Sem isso o
 *    conjunto desliza inteiro e lê como bug de posicionamento.
 *
 * 3. **A volta tem overshoot; a ida não.** Indo, a peça persegue o ponteiro e
 *    qualquer overshoot vira tremor. Voltando, ela passa do ponto e assenta —
 *    é o que dá a sensação de mola solta. Por isso o `data-magnet="rest"` troca
 *    a curva, e não só a duração.
 *
 * 4. **Teclado não move nada.** Ímã é gesto de ponteiro. O foco desenha o anel
 *    de `--focus` no lugar exato onde o botão está parado — se ele se deslocasse
 *    no `:focus`, o anel apontaria pra um alvo que o dedo não vai encontrar.
 *    O ímã só liga em `(hover: hover) and (pointer: fine)`; no toque, e sob
 *    `prefers-reduced-motion`, isto é um `<button>` comum. Esse é o caminho sem
 *    movimento, e ele é o padrão, não a exceção.
 *
 * Nenhuma cor mora aqui: `--brand` e `--brand-foreground` pintam, então o mesmo
 * botão sai lime numa marca e âmbar noutra sem fork.
 */

/* --- o barramento de ponteiro, um pra página inteira ---------------------- */

type Assinante = (x: number, y: number) => void;

const assinantes = new Set<Assinante>();
let quadro = 0;
let ligado = false;

function aoMover(e: PointerEvent) {
  if (quadro) return;
  quadro = requestAnimationFrame(() => {
    quadro = 0;
    for (const f of assinantes) f(e.clientX, e.clientY);
  });
}

function assinar(f: Assinante) {
  assinantes.add(f);
  if (!ligado) {
    // `passive`: a peça nunca chama `preventDefault`, e sem a dica o navegador
    // precisa esperar o handler antes de decidir a rolagem.
    document.addEventListener("pointermove", aoMover, { passive: true });
    ligado = true;
  }
  return () => {
    assinantes.delete(f);
    if (assinantes.size === 0 && ligado) {
      document.removeEventListener("pointermove", aoMover);
      cancelAnimationFrame(quadro);
      quadro = 0;
      ligado = false;
    }
  };
}

/* --- a peça --------------------------------------------------------------- */

export interface MagneticCtaProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Renderiza no elemento filho em vez de um `<button>`. Use pra `<a>`, `<Link>`
   * do Next, ou o botão do design system do cliente.
   */
  asChild?: boolean;
  /**
   * Raio do campo magnético em px, medido a partir da borda do botão. É o quanto
   * ANTES de chegar o ponteiro começa a puxar. Abaixo de ~48px o efeito só
   * acontece depois que o cursor já está em cima, e aí não serve pra nada.
   */
  field?: number;
  /** Deslocamento máximo do botão, em px. Acima de ~14 vira escorregão. */
  pull?: number;
  /** Quanto o rótulo fica pra trás do botão. `0` cola o texto na casca. */
  labelLag?: number;
  /** Brilho que segue o ponteiro sobre a superfície. Desligue em fundo claro chapado. */
  sheen?: boolean;
  /** Sem `--brand`: superfície de contorno, pro CTA secundário da mesma dobra. */
  variant?: "solid" | "outline";
}

export function MagneticCta({
  asChild = false,
  field = 84,
  pull = 10,
  labelLag = 0.35,
  sheen = true,
  variant = "solid",
  className,
  children,
  disabled,
  type,
  ...props
}: MagneticCtaProps) {
  const fieldRef = React.useRef<HTMLSpanElement>(null);
  const buttonRef = React.useRef<HTMLElement | null>(null);

  const Comp = asChild ? Slot : "button";

  React.useEffect(() => {
    const host = fieldRef.current;
    if (!host || disabled) return;

    // Duas perguntas, uma resposta: se qualquer uma falha, a peça é um botão.
    // `pointer: fine` exclui o toque (onde não existe hover) e a TV.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    let rect: DOMRect | null = null;
    let dentro = false;

    const alvo = () => (buttonRef.current ?? host.firstElementChild) as HTMLElement | null;
    const medir = () => (rect = alvo()?.getBoundingClientRect() ?? null);

    // O `scroll` invalida a medida em vez de recalcular: quem vai precisar dela
    // é a próxima aproximação, e ela pode nunca vir (a pessoa rolou e foi
    // embora). Medir ali seria pagar layout por um valor que ninguém lê.
    const invalidar = () => {
      rect = null;
    };

    const soltar = () => {
      dentro = false;
      host.dataset.magnet = "rest";
      host.style.setProperty("--mx", "0px");
      host.style.setProperty("--my", "0px");
    };

    const cancelar = assinar((x, y) => {
      if (!rect) medir();
      if (!rect) return;

      // O portão barato: quatro comparações. Quem está longe do botão sai aqui,
      // e é por isso que um listener global não custa nada mesmo com dez CTAs.
      const perto =
        x >= rect.left - field &&
        x <= rect.right + field &&
        y >= rect.top - field &&
        y <= rect.bottom + field;

      if (!perto) {
        if (dentro) soltar();
        return;
      }

      if (!dentro) {
        dentro = true;
        medir();
        host.dataset.magnet = "hold";
      }

      const cx = rect!.left + rect!.width / 2;
      const cy = rect!.top + rect!.height / 2;

      // Normaliza por meia-caixa MAIS o campo: assim a força é 0 na borda do
      // campo e 1 no centro do botão, independente do tamanho do botão. Um
      // divisor fixo faria o CTA largo puxar menos que o estreito.
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      const nx = clamp((x - cx) / (rect!.width / 2 + field));
      const ny = clamp((y - cy) / (rect!.height / 2 + field));

      host.style.setProperty("--mx", `${nx * pull}px`);
      host.style.setProperty("--my", `${ny * pull}px`);

      // O brilho é a posição do ponteiro DENTRO do botão, em %, e passa de
      // 0–100 enquanto o cursor ainda está no campo. É o certo: o brilho entra
      // pela beirada antes de o dedo chegar.
      if (sheen) {
        host.style.setProperty("--sx", `${((x - rect!.left) / rect!.width) * 100}%`);
        host.style.setProperty("--sy", `${((y - rect!.top) / rect!.height) * 100}%`);
      }
    });

    window.addEventListener("scroll", invalidar, { passive: true });
    window.addEventListener("resize", invalidar);
    // Sai a aba, sai o ímã: sem isto o botão fica torto esperando um ponteiro
    // que voltou noutro lugar da tela.
    document.addEventListener("pointerleave", soltar);

    return () => {
      cancelar();
      soltar();
      window.removeEventListener("scroll", invalidar);
      window.removeEventListener("resize", invalidar);
      document.removeEventListener("pointerleave", soltar);
    };
  }, [field, pull, sheen, disabled]);

  return (
    <span
      ref={fieldRef}
      data-magnet="rest"
      // `padding` positivo com `margin` negativa do mesmo tamanho: a peça
      // reserva o halo sem empurrar o vizinho no layout. E `pointer-events:
      // none` no campo com `auto` no botão — ver a nota sobre halos que se
      // cruzam. O campo é geometria; quem recebe ponteiro é o botão.
      className="magnet-field pointer-events-none relative isolate inline-flex"
      style={
        { padding: field, margin: -field, "--lag": labelLag } as React.CSSProperties
      }
    >
      <Comp
        ref={buttonRef as React.Ref<HTMLButtonElement>}
        // Sem isto, um CTA dentro de `<form>` vira `type="submit"` por padrão do
        // HTML e envia o formulário no primeiro clique. É o defeito que só
        // aparece no cliente que colocou o botão dentro de um form.
        type={asChild ? type : (type ?? "button")}
        disabled={disabled}
        data-variant={variant}
        className={cn(
          "magnet-body group/magnet pointer-events-auto relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden",
          "h-[var(--control-h,2.75rem)] rounded-[var(--r-pill,9999px)] px-6",
          "text-[length:var(--text-corpo,0.9375rem)] font-medium tracking-[-0.01em]",
          "outline-none focus-visible:[box-shadow:var(--focus)]",
          "[transform:translate3d(var(--mx,0px),var(--my,0px),0)]",
          "active:scale-[0.97] active:[transition-duration:var(--dur-press,90ms)]",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "solid"
            ? "bg-[var(--brand,var(--foreground))] text-[var(--brand-foreground,var(--background))]"
            : "border border-border bg-transparent text-foreground",
          className,
        )}
        {...props}
      >
        {sheen && variant === "solid" && (
          <span
            aria-hidden="true"
            className="magnet-sheen pointer-events-none absolute inset-0 -z-10"
          />
        )}
        <span className="magnet-label inline-flex items-center gap-2">{children}</span>
      </Comp>
    </span>
  );
}
