"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { LatheObject, type LatheObjectProps } from "@/components/ui/lathe-object";
import { ShaderRiso, type ShaderRisoProps } from "@/components/ui/shader-riso";

/**
 * Lathe Riso — a peça 3D do `lathe-object` impressa ao vivo pelo `shader-riso`:
 * gira, orbita no arrasto e sai do registro onde o cursor passa, em duas tintas.
 *
 * ── As decisões que não se veem ────────────────────────────────────────────
 *
 * 1. **Dois itens, não um shader novo.** A peça desenha no canvas dela e o riso
 *    lê esse canvas como fonte viva (`source`), quadro a quadro. Cada item segue
 *    servindo sozinho, e o riso imprime qualquer outra fonte (vídeo, outro canvas).
 * 2. **A peça fica por baixo, invisível e tocável.** `opacity: 0` continua
 *    desenhando e recebendo o arrasto; o riso por cima tem `pointer-events: none`
 *    e lê o cursor na janela. Assim o arrasto gira a peça e o mesmo gesto puxa as
 *    tintas.
 * 3. **`preserveDrawingBuffer` ligado só aqui.** Sem ele o navegador pode limpar o
 *    buffer antes do riso ler, e a fruta pisca em papel branco.
 * 4. **Fundo transparente vira papel.** O alfa da peça entra na cobertura, então
 *    não há caixa em volta: só a tinta onde há objeto.
 */

export interface LatheRisoProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    Pick<LatheObjectProps, "profile" | "sticks" | "autoRotate">,
    Pick<ShaderRisoProps, "mode" | "cell" | "misregistration" | "paper" | "interactive"> {
  /**
   * Paradas do riso: papel, primeira tinta e segunda tinta. Qualquer cor CSS ou token.
   * Padrão: `--background`, `--brand` e a marca escurecida.
   */
  colors?: string[];
  /** Cor do corpo da peça antes da tinta (só o valor tonal conta). */
  body?: string;
  /** Cor das varetas antes da tinta. */
  detail?: string;
  /** Descrição para leitor de tela. */
  "aria-label"?: string;
}

export function LatheRiso({
  profile,
  sticks,
  autoRotate = true,
  mode = "grain",
  cell = 4,
  misregistration = 35,
  paper = 40,
  interactive = true,
  colors,
  body = "var(--muted-foreground)",
  detail = "var(--foreground)",
  "aria-label": ariaLabel = "Objeto em 3D impresso em risografia, arraste para girar",
  className,
  ...props
}: LatheRisoProps) {
  const [fonte, setFonte] = React.useState<HTMLCanvasElement | null>(null);

  return (
    <div className={cn("relative aspect-square w-full", className)} {...props}>
      <LatheObject
        profile={profile}
        sticks={sticks}
        autoRotate={autoRotate}
        body={body}
        detail={detail}
        preserveDrawingBuffer
        onCanvas={setFonte}
        aria-label={ariaLabel}
        className="absolute inset-0 opacity-0"
      />
      {fonte && (
        <ShaderRiso
          source={fonte}
          alt={ariaLabel}
          aria-hidden="true"
          mode={mode}
          cell={cell}
          misregistration={misregistration}
          paper={paper}
          interactive={interactive}
          colors={colors}
          className="pointer-events-none absolute inset-0 aspect-auto h-full"
        />
      )}
    </div>
  );
}
