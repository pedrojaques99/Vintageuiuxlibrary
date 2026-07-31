import { cn } from "@/lib/utils";

/**
 * Malha de pontos de fundo — o "papel milimetrado" das telas de ferramenta.
 *
 * Um `radial-gradient` repetido, não SVG e não canvas: zero nós no DOM, zero
 * requisição, e o navegador desenha no compositor. Numa página com sidebar,
 * canvas e grade de resultados, isso é a diferença entre textura de graça e mais
 * um elemento para o layout engine resolver.
 *
 * A cor vem de `currentColor` (default: `--foreground`), então inverte sozinha
 * entre tema claro e escuro sem hook de tema nem prop de cor.
 *
 * Opacidade default 0.07 é o teto útil: acima disso a malha compete com o
 * conteúdo em vez de dar profundidade.
 */
export function GridDots({
  opacity = 0.07,
  dotSize = 1.5,
  spacing = 20,
  className,
}: {
  /** 0–1. Acima de ~0.1 vira ruído. */
  opacity?: number;
  /** Raio do ponto, em px. */
  dotSize?: number;
  /** Distância entre pontos, em px. */
  spacing?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 text-foreground", className)}
      style={{
        opacity,
        backgroundImage: `radial-gradient(circle, currentColor ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
      }}
    />
  );
}
