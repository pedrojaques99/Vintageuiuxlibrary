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
 * ── Cinco decisões que valem mais que o código ────────────────────────────
 *
 * 1. **O ímã é um campo, não um listener de janela.** O `repulsive-hover`
 *    escuta `mousemove` no `window` — cada peça na página recalcula em toda
 *    varredura do ponteiro, mesmo com o cursor do outro lado da tela. Aqui o
 *    campo é um elemento real com `padding: field`, e o `pointermove` mora
 *    nele. Fora do campo, zero trabalho. Bônus: `pointerleave` do próprio
 *    campo é o gatilho de volta, sem cálculo de distância nenhum.
 *
 * 2. **A medida é lida uma vez por entrada, não por frame.**
 *    `getBoundingClientRect()` a cada `pointermove` força layout 120 vezes por
 *    segundo pra ler um retângulo que não mudou. Lê no `pointerenter` e
 *    reinvalida no `scroll` — que é a única coisa que move o botão enquanto o
 *    ponteiro está dentro.
 *
 * 3. **O rótulo anda MENOS que o botão.** É o detalhe que separa "botão que
 *    escorrega" de "objeto com massa": a casca vai a 100% do puxão e o texto a
 *    `labelLag` disso, então existe paralaxe dentro da peça. Sem isso o
 *    conjunto desliza inteiro e lê como bug de posicionamento.
 *
 * 4. **A volta tem overshoot; a ida não.** Indo, a peça persegue o ponteiro e
 *    qualquer overshoot vira tremor. Voltando, ela passa do ponto e assenta —
 *    é o que dá a sensação de mola solta. Por isso o `data-magnet="rest"` troca
 *    a curva, e não só a duração.
 *
 * 5. **Teclado não move nada.** Ímã é gesto de ponteiro. O foco desenha o anel
 *    de `--focus` no lugar exato onde o botão está parado — se ele se deslocasse
 *    no `:focus`, o anel apontaria pra um alvo que o dedo não vai encontrar.
 *    O campo só liga em `(hover: hover) and (pointer: fine)`; no toque, e sob
 *    `prefers-reduced-motion`, isto é um `<button>` comum. Esse é o caminho sem
 *    movimento, e ele é o padrão, não a exceção.
 *
 * Nenhuma cor mora aqui: `--brand` e `--brand-foreground` pintam, então o mesmo
 * botão sai lime numa marca e âmbar noutra sem fork.
 */

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
  /** Fração do deslocamento que o rótulo acompanha. `0` trava o texto no lugar. */
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
  ...props
}: MagneticCtaProps) {
  const fieldRef = React.useRef<HTMLSpanElement>(null);
  const buttonRef = React.useRef<HTMLElement | null>(null);
  const rectRef = React.useRef<DOMRect | null>(null);
  const frameRef = React.useRef(0);

  const Comp = asChild ? Slot : "button";

  React.useEffect(() => {
    const host = fieldRef.current;
    if (!host) return;

    // Duas perguntas, uma resposta: se qualquer uma falha, a peça é um botão.
    // `pointer: fine` exclui o toque (onde não existe hover) e a TV.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    const target = () => (buttonRef.current ?? host.firstElementChild) as HTMLElement | null;

    const write = (x: number, y: number) => {
      host.style.setProperty("--mx", `${x}px`);
      host.style.setProperty("--my", `${y}px`);
    };

    const onEnter = () => {
      rectRef.current = target()?.getBoundingClientRect() ?? null;
      host.dataset.magnet = "hold";
    };

    // O `scroll` invalida a medida em vez de recalcular: quem vai precisar dela
    // é o próximo `pointermove`, e ele pode nunca vir (a pessoa rolou e foi
    // embora). Medir ali seria pagar layout por um valor que ninguém lê.
    const onScroll = () => {
      rectRef.current = null;
    };

    const onMove = (e: PointerEvent) => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        const rect = (rectRef.current ??= target()?.getBoundingClientRect() ?? null);
        if (!rect) return;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Normaliza por meia-caixa MAIS o campo: assim a força é 0 na borda do
        // campo e 1 no centro do botão, independente do tamanho do botão. Um
        // divisor fixo faria o CTA largo puxar menos que o estreito.
        const nx = (e.clientX - cx) / (rect.width / 2 + field);
        const ny = (e.clientY - cy) / (rect.height / 2 + field);
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));

        write(clamp(nx) * pull, clamp(ny) * pull);

        // O brilho é posição do ponteiro DENTRO do botão, em %, e pode passar de
        // 0–100 quando o cursor ainda está no campo. É o certo: o brilho entra
        // pela beirada antes de o dedo chegar.
        if (sheen) {
          host.style.setProperty("--sx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
          host.style.setProperty("--sy", `${((e.clientY - rect.top) / rect.height) * 100}%`);
        }
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      rectRef.current = null;
      host.dataset.magnet = "rest";
      write(0, 0);
    };

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frameRef.current);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [field, pull, sheen]);

  return (
    <span
      ref={fieldRef}
      data-magnet="rest"
      // O campo é `inline-flex` e não `block`: um CTA mora no meio de uma linha
      // de texto tantas vezes quanto sozinho numa dobra.
      className="magnet-field relative inline-flex isolate"
      // O campo é `padding` positivo com `margin` negativo do mesmo tamanho: a
      // área de escuta cresce e o botão continua ocupando no layout exatamente o
      // que ocupava. Sem a margem, todo CTA com ímã empurraria o vizinho em 84px
      // de vão invisível — e o defeito só apareceria na dobra com dois botões.
      style={
        { padding: field, margin: -field, "--lag": labelLag } as React.CSSProperties
      }
    >
      <Comp
        ref={buttonRef as React.Ref<HTMLButtonElement>}
        data-variant={variant}
        className={cn(
          "magnet-body group/magnet relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden",
          "h-[var(--control-h,2.75rem)] rounded-[var(--r-pill,9999px)] px-6",
          "text-[length:var(--text-corpo,0.9375rem)] font-medium tracking-[-0.01em]",
          "outline-none focus-visible:[box-shadow:var(--focus)]",
          // `will-change` só existe enquanto o ímã está segurando: deixado fixo,
          // ele promove uma camada por CTA da página inteira, o tempo todo.
          "[transform:translate3d(var(--mx,0),var(--my,0),0)]",
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
