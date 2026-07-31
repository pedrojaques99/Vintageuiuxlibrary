"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plate — a placa onde a foto de catálogo senta.
 *
 * Colhida do concept Hockey Direct, e resolve um problema chato de verdade:
 * **foto de catálogo vem recortada sobre branco.** Jogada num fundo colorido ou
 * escuro, ela aparece como um retângulo branco duro — o defeito que a auditoria
 * chamou de "duas placas concorrentes" quando metade da página usava recorte e
 * a outra metade não.
 *
 * A saída não é recortar de novo nem pedir foto nova ao cliente: é multiplicar a
 * foto sobre uma placa clara. O branco do arquivo vira a placa, os pixels
 * escuros ficam. Uma placa só na página inteira, e a foto casa com o fundo sem
 * ninguém abrir o Photoshop.
 *
 * `isolation: isolate` é obrigatório: sem ele o `multiply` sangra para o que
 * estiver atrás da placa.
 */

export interface PlateProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** Proporção da placa. Produto alto (stick, garrafa) pede 4/5 ou 3/4. */
  ratio?: string;
  /** Respiro entre o produto e a borda da placa. */
  inset?: number;
  /** Cresce um degrau no hover do card em volta. */
  zoomOnGroupHover?: boolean;
  as?: "div" | "span";
}

export function Plate({
  children,
  ratio = "4 / 5",
  inset = 20,
  zoomOnGroupHover = true,
  as: Tag = "div",
  className,
  style,
  ...props
}: PlateProps) {
  return (
    <Tag
      className={cn(
        "relative block overflow-hidden bg-[var(--muted)] [isolation:isolate]",
        // A foto é filha direta; o multiply e o zoom vivem aqui para o consumidor
        // só precisar passar um <img> ou um next/image.
        "[&_img]:block [&_img]:size-full [&_img]:object-contain [&_img]:mix-blend-multiply",
        "[&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        zoomOnGroupHover && "[.group:hover_&_img]:scale-[1.045]",
        className,
      )}
      style={{ aspectRatio: ratio, padding: `${inset}px`, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}
