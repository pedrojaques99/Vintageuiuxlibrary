import { cn } from "@/lib/utils";

/**
 * Alvo de soltar arquivo — a confirmação visual do drag-and-drop.
 *
 * Pequeno, mas não opcional: sem ele o usuário arrasta um arquivo sobre a área e
 * não tem sinal nenhum de que a página aceita, então solta fora e acha que o
 * upload está quebrado. É o estado que todo mundo esquece de desenhar.
 *
 * `pointer-events-none` é o detalhe que faz funcionar: o overlay aparece POR
 * CIMA da zona, e se ele capturasse o ponteiro dispararia o `dragleave` do
 * próprio pai — o overlay piscaria infinitamente e o `drop` nunca chegaria.
 *
 * A borda tracejada é a convenção de "solte aqui" desde sempre; trocar por sólida
 * lê como estado de erro.
 */
export function DropOverlay({
  visible,
  message = "Solte o arquivo aqui",
  className,
}: {
  visible: boolean;
  message?: string;
  className?: string;
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-50 flex items-center justify-center",
        "border-2 border-dashed border-ring/50 bg-background/70 backdrop-blur-sm",
        "rounded-[var(--r-surface)]",
        className,
      )}
    >
      <span className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
        {message}
      </span>
    </div>
  );
}
