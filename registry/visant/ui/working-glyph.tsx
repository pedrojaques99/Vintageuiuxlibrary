"use client";

import * as React from "react";
import { Cog, Hammer, Paintbrush, Pickaxe, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { GlitchChars } from "@/components/ui/glitch-chars";

/**
 * Um ícone trabalhando: o sistema mostrando esforço em vez de pedir paciência.
 *
 * A diferença para um spinner é de narrativa: spinner é o sistema pedindo
 * paciência, isto é o sistema mostrando esforço. Em geração de imagem (20–60s)
 * essa leitura é o que segura o usuário na tela.
 *
 * ── Cinco ofícios, cada um com o gesto dele ────────────────────────────────
 *
 * | `variant` | ícone | gesto |
 * |---|---|---|
 * | `picareta` | Pickaxe | balanço com pivô no cabo, faísca na ponta |
 * | `martelo` | Hammer | golpe seco e volta lenta, faísca no impacto |
 * | `engrenagem` | Cog | giro contínuo, sem faísca (máquina, não mão) |
 * | `pincel` | Paintbrush | pincelada curta indo e voltando |
 * | `faisca` | Sparkles | respiro de escala, pra espera de "mágica" |
 *
 * O `icon` continua aberto: passe outro glifo e ele herda o gesto da variante.
 *
 * ── O brilho mora no traço, não na caixa ───────────────────────────────────
 *
 * A versão anterior varria um gradiente por cima da caixa inteira, e com a
 * moldura ligada o brilho atravessava o quadrado todo em vez do ícone. Agora o
 * brilho é uma CÓPIA do próprio ícone em tom cheio sobre a base um tom abaixo,
 * revelada por uma faixa inclinada em `clip-path`. Só os pixels do traço acendem.
 *
 * Toda animação é Web Animations API, sem bloco `css` a instalar à parte. Sob
 * `prefers-reduced-motion` o ícone fica parado e sem brilho.
 */

export type WorkingGlyphVariant = "picareta" | "martelo" | "engrenagem" | "pincel" | "faisca";

type Gesto = {
  icone: LucideIcon;
  quadros: Keyframe[];
  opcoes: KeyframeAnimationOptions;
  origem: string;
  faisca: boolean;
};

const GESTOS: Record<WorkingGlyphVariant, Gesto> = {
  picareta: {
    icone: Pickaxe,
    // Pivô em 60%/80%: onde a mão seguraria o cabo. Centralizar mata o gesto.
    quadros: [
      { transform: "rotate(-8deg) translateY(0)" },
      { transform: "rotate(6deg) translateY(1px)", offset: 0.4 },
      { transform: "rotate(3deg) translateY(2px)", offset: 0.6 },
      { transform: "rotate(-8deg) translateY(0)" },
    ],
    opcoes: { duration: 900, iterations: Infinity, easing: "ease-in-out" },
    origem: "60% 80%",
    faisca: true,
  },
  martelo: {
    icone: Hammer,
    // Golpe em 25% do ciclo, volta no resto: a assimetria é o peso do martelo.
    quadros: [
      { transform: "rotate(-28deg)", easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
      { transform: "rotate(6deg)", offset: 0.25, easing: "ease-out" },
      { transform: "rotate(2deg)", offset: 0.35, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
      { transform: "rotate(-28deg)" },
    ],
    opcoes: { duration: 1000, iterations: Infinity },
    origem: "20% 85%",
    faisca: true,
  },
  engrenagem: {
    icone: Cog,
    quadros: [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    opcoes: { duration: 2800, iterations: Infinity, easing: "linear" },
    origem: "50% 50%",
    faisca: false,
  },
  pincel: {
    icone: Paintbrush,
    quadros: [
      { transform: "translate(-2px, 1px) rotate(-6deg)" },
      { transform: "translate(2px, -1px) rotate(4deg)", offset: 0.5 },
      { transform: "translate(-2px, 1px) rotate(-6deg)" },
    ],
    opcoes: { duration: 1100, iterations: Infinity, easing: "ease-in-out" },
    origem: "80% 20%",
    faisca: false,
  },
  faisca: {
    icone: Sparkles,
    quadros: [
      { transform: "scale(0.9) rotate(-4deg)", opacity: 0.75 },
      { transform: "scale(1.08) rotate(4deg)", opacity: 1, offset: 0.5 },
      { transform: "scale(0.9) rotate(-4deg)", opacity: 0.75 },
    ],
    opcoes: { duration: 1600, iterations: Infinity, easing: "ease-in-out" },
    origem: "50% 50%",
    faisca: false,
  },
};

/** Faixa inclinada atravessando o glifo, e depois pausa: brilho, não estrobo. */
const BRILHO: Keyframe[] = [
  { clipPath: "polygon(-40% 0%, -10% 0%, -30% 100%, -60% 100%)" },
  { clipPath: "polygon(110% 0%, 140% 0%, 120% 100%, 90% 100%)", offset: 0.45 },
  { clipPath: "polygon(110% 0%, 140% 0%, 120% 100%, 90% 100%)" },
];

function useAnimacao(
  ref: React.RefObject<HTMLElement | null>,
  quadros: Keyframe[] | null,
  opcoes: KeyframeAnimationOptions,
  chave: string,
) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !quadros || typeof el.animate !== "function") return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let anim: Animation | null = null;
    const aplicar = () => {
      anim?.cancel();
      anim = media?.matches ? null : el.animate(quadros, opcoes);
    };
    aplicar();
    media?.addEventListener?.("change", aplicar);
    return () => {
      anim?.cancel();
      media?.removeEventListener?.("change", aplicar);
    };
    // `chave` resume quadros + opções: os objetos vêm de uma tabela estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
}

export function WorkingGlyph({
  variant = "picareta",
  icon,
  size = 20,
  framed = true,
  shine = true,
  className,
}: {
  /** O ofício: ícone + gesto. Ver a tabela acima. */
  variant?: WorkingGlyphVariant;
  /** Troca o glifo e mantém o gesto da variante. */
  icon?: React.ReactNode;
  size?: number;
  /** Moldura discreta atrás do ícone. Desligue ao usar sobre imagem. */
  framed?: boolean;
  /** Faixa de luz passando pelo traço do ícone. */
  shine?: boolean;
  className?: string;
}) {
  const gesto = GESTOS[variant] ?? GESTOS.picareta;
  const Icone = gesto.icone;
  const glifo = icon ?? <Icone size={size} />;

  const corpo = React.useRef<HTMLSpanElement>(null);
  const luz = React.useRef<HTMLSpanElement>(null);
  useAnimacao(corpo, gesto.quadros, gesto.opcoes, variant);
  useAnimacao(
    luz,
    shine ? BRILHO : null,
    { duration: 2600, iterations: Infinity, easing: "ease-in-out", delay: 300 },
    `${variant}-${shine}`,
  );

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-visible text-foreground",
        framed && "rounded-[var(--r-control)] border border-border bg-background/30 px-3 py-2",
        className,
      )}
      aria-hidden="true"
    >
      <span ref={corpo} className="relative inline-grid" style={{ transformOrigin: gesto.origem }}>
        {/* Com brilho, o glifo de base descansa um tom abaixo e a faixa devolve
            o tom cheio: a luz aparece em qualquer cor de marca e em qualquer
            tema, porque é contraste com o próprio ícone, não uma cor nova. */}
        <span className={cn("col-start-1 row-start-1 inline-flex", shine && "opacity-70")}>{glifo}</span>
        {shine ? (
          // A cópia que acende. Começa fora do quadro (clip vazio), então sem
          // animação, ou com movimento reduzido, ela simplesmente não aparece.
          <span
            ref={luz}
            className="col-start-1 row-start-1 inline-flex [filter:brightness(1.35)]"
            style={{ clipPath: "polygon(-40% 0%, -10% 0%, -30% 100%, -60% 100%)" }}
          >
            {glifo}
          </span>
        ) : null}
      </span>

      {/* Faísca só nos ofícios de impacto. Sem moldura a caixa é do tamanho do
          ícone, então a faísca sai pra fora dela; dentro, cairia em cima do
          próprio glifo e viraria sujeira. */}
      {gesto.faisca ? (
        <GlitchChars
          length={1}
          intervalMs={120}
          className={cn(
            "absolute text-[10px] font-bold leading-none opacity-80",
            framed ? "bottom-1 right-1.5" : "-bottom-1.5 -right-1.5",
          )}
        />
      ) : null}
    </div>
  );
}
