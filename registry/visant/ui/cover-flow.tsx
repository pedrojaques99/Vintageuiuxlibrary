"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Cover Flow — a prateleira de capas em perspectiva.
 *
 * Grade de fotos mostra tudo ao mesmo tempo e não destaca nada. Carrossel
 * plano destaca uma e esconde o resto. A prateleira em perspectiva faz as duas
 * coisas: a capa da vez fica de frente, inteira, e as vizinhas viram de lado
 * mostrando que a coleção continua. Serve a portfólio, coleção, cardápio de
 * roteiros: qualquer lista em que a imagem vende antes do texto.
 *
 * ── O que se vê, e o que reage a quê ───────────────────────────────────────
 *
 * - A capa do centro de frente; as de cada lado giradas ~48° em Y, empilhadas
 *   para trás, com um reflexo curto no chão.
 * - Arrastar desliza a prateleira junto do dedo (a posição é contínua, não por
 *   degrau); soltar com força joga algumas capas adiante e assenta em mola.
 * - Clique numa capa lateral traz ela para o centro. Setas, Home e End fazem o
 *   mesmo pelo teclado; o título e a legenda embaixo acompanham a capa da vez.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Uma posição fracionária manda em tudo.** Cada capa só sabe a distância
 *    `o = i − pos` e deriva dela deslocamento, giro, profundidade e ordem. Por
 *    isso o arrasto no meio do caminho já é a animação, e soltar é só levar
 *    `pos` a um inteiro.
 * 2. **O espaçamento encolhe longe do centro.** A primeira vizinha se afasta
 *    72% de uma capa; as seguintes, 26%. Com passo uniforme a prateleira não
 *    cabe em tela nenhuma depois da terceira capa.
 * 3. **Medida sem escala**: o delta do ponteiro é dividido pela escala do
 *    palco (`rect.width / offsetWidth`), senão sob `scale(0.5)` a prateleira
 *    anda a metade do dedo.
 * 4. **O reflexo é `-webkit-box-reflect`**, sem duplicar a mídia. Onde não
 *    existe (Firefox), simplesmente não há reflexo: é enfeite, não informação.
 * 5. **Hierarquia em três sinais juntos.** A da vez é a única em escala cheia,
 *    sem véu e na frente; as laterais recuam 12%, ganham véu da cor do fundo e
 *    afundam em Z. Um sinal só (giro) deixava cinco capas disputando o olho.
 */

export interface CoverFlowItem {
  title: string;
  caption?: string;
  /** A capa: imagem, vídeo, qualquer coisa que preencha a caixa. */
  media: React.ReactNode;
}

export interface CoverFlowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: CoverFlowItem[];
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Largura da capa em px. A altura segue 4:5. */
  cardWidth?: number;
  /** Graus de giro das capas laterais. */
  tilt?: number;
  /** Rótulo da prateleira para leitor de tela. */
  label?: string;
}

const MOLA = { type: "spring" as const, stiffness: 300, damping: 34, mass: 0.8 };

function Capa({
  pos,
  i,
  largura,
  tilt,
  children,
}: {
  pos: MotionValue<number>;
  i: number;
  largura: number;
  tilt: number;
  children: React.ReactNode;
}) {
  const o = useTransform(pos, (p) => i - p);
  const x = useTransform(o, (v) => {
    const a = Math.abs(v);
    return Math.sign(v) * (Math.min(a, 1) * largura * 0.72 + Math.max(a - 1, 0) * largura * 0.26);
  });
  const rotateY = useTransform(o, (v) => -Math.max(-1, Math.min(1, v)) * tilt);
  const z = useTransform(o, (v) => -Math.min(Math.abs(v), 4) * 90);
  // A da vez é a única em tamanho cheio: as vizinhas recuam um degrau, e a
  // hierarquia se lê antes do título.
  const scale = useTransform(o, (v) => 1 - Math.min(Math.abs(v), 1) * 0.12);
  const zIndex = useTransform(o, (v) => 100 - Math.round(Math.abs(v) * 10));
  const opacity = useTransform(o, (v) => Math.max(0, Math.min(1, 3.6 - Math.abs(v))));
  // Véu e não `opacity` pra apagar as laterais: capa translúcida deixaria ver a
  // de trás através dela, e a pilha viraria um borrão. O véu é da cor do
  // fundo, então a lateral "some no papel" igual nos dois temas.
  const veu = useTransform(o, (v) => Math.min(0.62, Math.abs(v) * 0.48));

  return (
    <motion.div
      aria-hidden
      data-capa={i}
      className="absolute top-0 left-1/2 aspect-[4/5] cursor-pointer overflow-hidden rounded-[var(--r-surface)] bg-muted"
      style={{
        width: largura,
        marginLeft: -largura / 2,
        x,
        z,
        scale,
        rotateY,
        zIndex,
        opacity,
        boxShadow:
          "0 1px 0 color-mix(in oklab, var(--foreground) 8%, transparent) inset, 0 26px 44px -18px color-mix(in oklab, black 62%, transparent)",
        WebkitBoxReflect:
          "below 6px linear-gradient(transparent 76%, color-mix(in oklab, var(--foreground) 14%, transparent))",
      }}
    >
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[var(--background)]"
        style={{ opacity: veu }}
      />
    </motion.div>
  );
}

export function CoverFlow({
  items,
  defaultIndex = 0,
  onIndexChange,
  cardWidth = 180,
  tilt = 48,
  label = "Coleção",
  className,
  ...props
}: CoverFlowProps) {
  const reduzir = useReducedMotion();
  const ultimo = items.length - 1;
  const pos = useMotionValue(defaultIndex);
  const [indice, setIndice] = React.useState(defaultIndex);
  const alvoRef = React.useRef(defaultIndex);
  const palco = React.useRef<HTMLDivElement>(null);
  const passo = cardWidth * 0.72;

  useMotionValueEvent(pos, "change", (p) => {
    const r = Math.max(0, Math.min(ultimo, Math.round(p)));
    setIndice((atual) => (atual === r ? atual : r));
  });

  const ir = (n: number) => {
    const alvo = Math.max(0, Math.min(ultimo, n));
    if (reduzir) pos.set(alvo);
    else animate(pos, alvo, MOLA);
    if (alvo !== alvoRef.current) {
      alvoRef.current = alvo;
      onIndexChange?.(alvo);
    }
  };

  const gesto = React.useRef<{
    x0: number;
    p0: number;
    escala: number;
    t: number;
    v: number;
    ult: number;
    andou: boolean;
    capa: number | null;
  } | null>(null);

  const atual = items[indice];
  const altura = cardWidth * 1.25;

  return (
    <div
      role="group"
      aria-roledescription="prateleira"
      aria-label={label}
      className={cn("flex w-full flex-col items-center gap-4", className)}
      {...props}
    >
      <div
        ref={palco}
        tabIndex={0}
        aria-label={`${label}: ${indice + 1} de ${items.length}. Use as setas para trocar.`}
        className="relative w-full touch-pan-y cursor-grab overflow-hidden select-none rounded-[var(--r-surface)] outline-none focus-visible:[box-shadow:var(--focus)] active:cursor-grabbing"
        style={{ height: altura + cardWidth * 0.3, perspective: cardWidth * 5 }}
        onKeyDown={(e) => {
          const mapa: Record<string, number> = {
            ArrowLeft: alvoRef.current - 1,
            ArrowRight: alvoRef.current + 1,
            Home: 0,
            End: ultimo,
          };
          if (!(e.key in mapa)) return;
          e.preventDefault();
          ir(mapa[e.key]);
        }}
        // Imagem dentro da peça dispara o arrasto nativo do navegador, que cancela
        // o ponteiro no meio do gesto.
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const el = palco.current!;
          const escala = el.getBoundingClientRect().width / (el.offsetWidth || 1);
          el.setPointerCapture(e.pointerId);
          pos.stop();
          // Com o ponteiro capturado, o clique não chega na capa: guarda aqui
          // qual foi tocada e decide no soltar se foi toque ou arrasto.
          const capa = (e.target as HTMLElement).closest<HTMLElement>("[data-capa]");
          gesto.current = {
            capa: capa ? Number(capa.dataset.capa) : null,
            x0: e.clientX,
            p0: pos.get(),
            escala,
            t: performance.now(),
            v: 0,
            ult: pos.get(),
            andou: false,
          };
        }}
        onPointerMove={(e) => {
          const g = gesto.current;
          if (!g) return;
          const dx = (e.clientX - g.x0) / g.escala;
          if (Math.abs(dx) > 4) g.andou = true;
          // Além das pontas, resiste: anda um terço do dedo.
          let p = g.p0 - dx / passo;
          if (p < 0) p /= 3;
          if (p > ultimo) p = ultimo + (p - ultimo) / 3;
          const agora = performance.now();
          g.v = (p - g.ult) / Math.max(1, agora - g.t);
          g.ult = p;
          g.t = agora;
          pos.set(p);
        }}
        onPointerUp={() => {
          const g = gesto.current;
          if (!g) return;
          gesto.current = null;
          if (!g.andou && g.capa !== null) {
            ir(g.capa);
            return;
          }
          // Peteleco: a velocidade (capas/ms) projeta onde a prateleira pararia.
          ir(Math.round(pos.get() + g.v * 180));
        }}
        onPointerCancel={() => {
          gesto.current = null;
          ir(Math.round(pos.get()));
        }}
      >
        <div className="absolute inset-0 top-2 [transform-style:preserve-3d]">
          {items.map((item, i) => (
            <Capa
              key={i}
              pos={pos}
              i={i}
              largura={cardWidth}
              tilt={tilt}
            >
              {item.media}
            </Capa>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="flex min-h-11 flex-col items-center text-center">
        <span className="text-base font-medium text-foreground">{atual?.title}</span>
        {atual?.caption && <span className="text-sm text-muted-foreground">{atual.caption}</span>}
      </div>

      <div className="flex items-center gap-1.5" aria-hidden>
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            onClick={() => ir(i)}
            className={cn(
              "h-1.5 rounded-[var(--r-pill)] transition-[width,background-color] duration-[var(--dur-base)] ease-[var(--ease-out)]",
              i === indice ? "w-5 bg-foreground" : "w-1.5 bg-border hover:bg-muted-foreground",
            )}
          />
        ))}
      </div>
    </div>
  );
}
