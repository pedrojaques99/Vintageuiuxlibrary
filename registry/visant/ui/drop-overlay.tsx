import { cn } from "@/lib/utils";

/**
 * Alvo de soltar arquivo — a confirmação visual do drag-and-drop.
 *
 * Pequeno, mas não opcional: sem ele o usuário arrasta um arquivo sobre a área e
 * não tem sinal nenhum de que a página aceita, então solta fora e acha que o
 * upload está quebrado. É o estado que todo mundo esquece de desenhar.
 *
 * ── Os três estados, que são o item inteiro ────────────────────────────────
 *
 * | `state` | quando | o que a pessoa vê |
 * |---|---|---|
 * | `idle` | ninguém arrastando | nada — a zona é o conteúdo |
 * | `over` | arquivo pairando | tracejado + convite |
 * | `drop` | soltou, sistema aceitou | cheio na cor da marca, por um instante |
 *
 * O `drop` existe porque o instante entre soltar e o arquivo aparecer na lista é
 * onde o gesto some: sem uma confirmação de meio segundo, quem soltou não sabe
 * se acertou a zona ou se largou fora e a página ignorou.
 *
 * ── Dois detalhes que fazem funcionar ──────────────────────────────────────
 *
 * `pointer-events-none`: o overlay aparece POR CIMA da zona, e se ele capturasse
 * o ponteiro dispararia o `dragleave` do próprio pai — o overlay piscaria
 * infinitamente e o `drop` nunca chegaria.
 *
 * A camada **fica montada** e troca de opacidade, em vez de desmontar. Overlay
 * que nasce e morre aparece com corte seco no quadro exato em que o cursor cruza
 * a borda, e o corte lê como falha de render; a transição lê como resposta.
 * Montado e invisível não custa nada — é um `div` sem filho pintado.
 *
 * A borda tracejada é a convenção de "solte aqui" desde sempre; sólida no estado
 * de espera lê como erro. No `drop` ela fecha, porque aí não é mais convite.
 */
export function DropOverlay({
  visible,
  state,
  message = "Solte o arquivo aqui",
  doneMessage = "Recebido",
  className,
}: {
  /** Atalho para `state="over"`. Mantido porque é o uso de uma linha. */
  visible?: boolean;
  /** Quando presente, manda em `visible`. */
  state?: "idle" | "over" | "drop";
  message?: string;
  doneMessage?: string;
  className?: string;
}) {
  const estado = state ?? (visible ? "over" : "idle");
  const solto = estado === "drop";

  return (
    <div
      aria-hidden={estado === "idle" ? "true" : undefined}
      // `role="status"` só nos estados que dizem algo: um live region que existe
      // o tempo todo com texto fixo faz o leitor de tela repetir sozinho.
      role={estado === "idle" ? undefined : "status"}
      data-state={estado}
      // A cor do estado aceito sai de `--brand` por `color-mix`, e vai em
      // `style` porque é valor calculado — classe utilitária com `color-mix`
      // dentro depende de escape e não sobrevive a um build de terceiro.
      style={
        solto
          ? {
              borderColor: "var(--brand)",
              background: "color-mix(in oklab, var(--brand) 16%, var(--background))",
            }
          : undefined
      }
      className={cn(
        "pointer-events-none absolute inset-0 z-50 flex items-center justify-center",
        "rounded-[var(--r-surface)] border-2",
        "transition-[opacity,border-color,background-color,transform]",
        "[transition-duration:var(--dur-base,220ms)] [transition-timing-function:var(--ease-out)]",
        "motion-reduce:transition-none",
        estado === "idle" && "scale-[0.985] opacity-0",
        estado === "over" &&
          "scale-100 border-dashed border-ring/50 bg-background/70 opacity-100 backdrop-blur-sm",
        solto && "scale-100 border-solid opacity-100",
        estado === "idle" && "border-dashed border-transparent",
        className,
      )}
    >
      <span
        className={cn(
          "font-mono text-sm uppercase tracking-widest",
          solto ? "text-[var(--brand)]" : "text-muted-foreground",
        )}
      >
        {solto ? doneMessage : message}
      </span>
    </div>
  );
}
