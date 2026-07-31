"use client";

import * as React from "react";
import { Pickaxe } from "lucide-react";

import { cn } from "@/lib/utils";
import { GlitchChars } from "@/components/ui/glitch-chars";

/**
 * Um ícone que "bate" com faíscas — trabalho manual acontecendo, não espera.
 *
 * A diferença para um spinner é de narrativa: spinner é o sistema pedindo
 * paciência, isto é o sistema mostrando esforço. Em geração de imagem (20–60s)
 * essa leitura é o que segura o usuário na tela.
 *
 * O ícone entra por prop — a picareta é só o default da casa. Troque por
 * `Hammer`, `Wand`, `Cog` conforme a metáfora do produto; a mecânica (balanço +
 * brilho + faísca) é o que se colhe aqui.
 *
 * Balanço em 0.9s com `transform-origin` em 60%/80%: o pivô fica onde a mão
 * seguraria o cabo. Centralizar o pivô mata o gesto na hora.
 *
 * `prefers-reduced-motion`: ícone parado, faísca congelada (regra no bloco `css`
 * do item — se o glifo não parar, o CSS do registry não foi instalado).
 */
export function WorkingGlyph({
  icon,
  size = 20,
  framed = true,
  className,
}: {
  /** Glifo animado. Default: picareta (lucide). */
  icon?: React.ReactNode;
  size?: number;
  /** Moldura discreta atrás do ícone. Desligue ao usar sobre imagem. */
  framed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-visible text-brand",
        framed &&
          "rounded-[var(--r-control)] border border-border bg-background/30 px-3 py-2",
        className,
      )}
      aria-hidden="true"
    >
      <span className="working-glyph-swing working-glyph-shine relative z-10 inline-block">
        {icon ?? <Pickaxe size={size} />}
      </span>

      {/* faísca na zona de impacto da ponta, mais rápida que o texto de status */}
      <GlitchChars
        length={1}
        intervalMs={120}
        className="absolute bottom-1 right-1.5 text-[10px] font-bold leading-none opacity-80"
      />
    </div>
  );
}
