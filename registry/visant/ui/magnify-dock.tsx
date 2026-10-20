"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { playSfx } from "@/lib/sfx-bus";
import { cn } from "@/lib/utils";

/**
 * Magnify Dock — a barra de atalhos que cresce em onda na direção do cursor.
 *
 * Uma fileira de ícones iguais pede que o olho leia todos pra achar um. A onda
 * resolve isso sem texto: o ícone mais perto do cursor incha mais, os vizinhos
 * um pouco, os de longe nada. O alvo cresce ANTES de chegar nele, e o rótulo
 * aparece em cima do que está sob o ponteiro.
 *
 * ── Decisões que não se veem de primeira ──────────────────────────────────
 *
 * 1. **A ampliação é função da distância, não estado de hover.** O ponteiro
 *    vira um motion value com o X dentro da barra; cada ícone deriva a própria
 *    escala da distância até o seu centro (curva de cosseno: cheia no centro,
 *    zero em `reach` ícones de distância) e passa por uma mola. Por isso a onda
 *    desliza com o cursor em vez de pular de ícone em ícone, e nada disso
 *    renderiza o React a cada quadro.
 * 2. **O centro de cada ícone vem do `offsetLeft` da casa dele, não do
 *    retângulo.** `getBoundingClientRect` inclui a escala que a própria onda
 *    aplica, e o ícone mediria um centro que muda conforme cresce. A casa (o
 *    wrapper sem transform) dá o lugar de repouso, que é o que a distância
 *    precisa.
 * 3. **Cresce no lugar, a partir da base.** A largura dos vãos não muda: a
 *    barra não sacode e o ícone sob o cursor não foge dele. A origem do
 *    transform é a base, então o ícone sobe como num dock de verdade, e `lift`
 *    soma um degrau de altura. Cada atalho é uma pastilha com borda: o ícone
 *    inchado passa da borda da barra como num dock, e é a pastilha que diz
 *    "isso é um objeto que cresceu", não um glifo solto atravessando a linha.
 * 4. **O teclado faz a mesma onda.** A barra é um `toolbar` com uma parada de
 *    Tab só; as setas andam entre os ícones, e o foco põe a onda no ícone
 *    focado, com o rótulo junto.
 *
 * `prefers-reduced-motion`: sem onda e sem degrau; o rótulo continua.
 */

export interface MagnifyDockItem {
  id: string;
  /** Nome do atalho: vai no rótulo flutuante e no `aria-label`. */
  label: string;
  /** Ícone (lucide-react ou do projeto). */
  icon: React.ReactNode;
}

export interface MagnifyDockProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: MagnifyDockItem[];
  /** Item marcado como atual (ganha o ponto embaixo). */
  active?: string;
  onSelect?: (id: string) => void;
  /** Escala do ícone mais perto do cursor. 1 desliga a onda. */
  magnify?: number;
  /** Quanto o ícone mais perto sobe, em px. */
  lift?: number;
  /** Alcance da onda, em ícones de distância. */
  reach?: number;
  /** Lado do ícone em repouso, em px. */
  size?: number;
}

const FORA = Number.POSITIVE_INFINITY;
const MOLA = { stiffness: 420, damping: 30, mass: 0.6 };

export function MagnifyDock({
  items,
  active,
  onSelect,
  magnify = 1.4,
  lift = 8,
  reach = 2,
  size = 40,
  className,
  ...props
}: MagnifyDockProps) {
  const reduzir = useReducedMotion();
  const cursorX = useMotionValue(FORA);
  const [rotulo, setRotulo] = React.useState<string | null>(null);
  const [foco, setFoco] = React.useState(0);
  const botoes = React.useRef<(HTMLButtonElement | null)[]>([]);

  const gap = Math.round(size * 0.3);
  // Distância em px onde a onda zera: `reach` passos de ícone + vão.
  const alcance = Math.max(1, reach) * (size + gap);

  /*
   * O tic de detente a cada ícone que o ponteiro cruza: o dock vira um seletor
   * de dentes, como um knob de volume. Portão de 45 ms porque passar o mouse
   * rápido pela barra cruza seis ícones em um piscar, e seis tics colados viram
   * zumbido. O barramento já tem portão próprio; este é o da peça.
   */
  const ultimoTic = React.useRef(0);
  const tic = () => {
    const agora = performance.now();
    if (agora - ultimoTic.current < 45) return;
    ultimoTic.current = agora;
    playSfx("detent");
  };

  const mirar = (i: number) => {
    const casa = botoes.current[i]?.parentElement;
    if (casa) cursorX.set(casa.offsetLeft + casa.offsetWidth / 2);
  };

  const andar = (e: React.KeyboardEvent) => {
    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let alvo: number | null = null;
    if (passo) alvo = (foco + passo + items.length) % items.length;
    if (e.key === "Home") alvo = 0;
    if (e.key === "End") alvo = items.length - 1;
    if (alvo === null) return;
    e.preventDefault();
    setFoco(alvo);
    botoes.current[alvo]?.focus();
  };

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      {...props}
      className={cn(
        "relative flex items-end rounded-[var(--r-surface)] border border-border bg-card px-3 pb-3 pt-3 [box-shadow:var(--e-raised)]",
        className,
      )}
      style={{ gap, ...props.style }}
      onPointerMove={(e) => {
        props.onPointerMove?.(e);
        if (e.pointerType !== "mouse") return;
        cursorX.set(e.clientX - e.currentTarget.getBoundingClientRect().left);
      }}
      onPointerLeave={(e) => {
        props.onPointerLeave?.(e);
        cursorX.set(FORA);
        setRotulo(null);
      }}
      onKeyDown={(e) => {
        props.onKeyDown?.(e);
        andar(e);
      }}
    >
      {items.map((item, i) => (
        <DockIcone
          key={item.id}
          item={item}
          ref={(el) => {
            botoes.current[i] = el;
          }}
          size={size}
          cursorX={cursorX}
          alcance={alcance}
          magnify={reduzir ? 1 : magnify}
          lift={reduzir ? 0 : lift}
          ativo={item.id === active}
          tabIndex={i === foco ? 0 : -1}
          mostrarRotulo={rotulo === item.id}
          onPointerEnter={() => {
            setRotulo(item.id);
            tic();
          }}
          onFocus={(e) => {
            setFoco(i);
            setRotulo(item.id);
            // Só o foco de teclado move a onda; o de clique já tem o cursor.
            if (e.currentTarget.matches(":focus-visible")) mirar(i);
          }}
          onBlur={() => {
            setRotulo((r) => (r === item.id ? null : r));
            cursorX.set(FORA);
          }}
          onClick={() => onSelect?.(item.id)}
        />
      ))}
    </div>
  );
}

interface DockIconeProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  item: MagnifyDockItem;
  size: number;
  cursorX: MotionValue<number>;
  alcance: number;
  magnify: number;
  lift: number;
  ativo: boolean;
  mostrarRotulo: boolean;
}

const DockIcone = React.forwardRef<HTMLButtonElement, DockIconeProps>(function DockIcone(
  { item, size, cursorX, alcance, magnify, lift, ativo, mostrarRotulo, ...props },
  ref,
) {
  const proprio = React.useRef<HTMLButtonElement | null>(null);

  // 0 longe, 1 em cima: a mesma proximidade alimenta escala e degrau.
  const perto = useTransform(cursorX, (x) => {
    // A casa do ícone (o wrapper), que não sofre transform e mede contra a barra.
    const el = proprio.current?.parentElement;
    if (!el || !Number.isFinite(x)) return 0;
    const d = Math.abs(x - (el.offsetLeft + el.offsetWidth / 2));
    return d >= alcance ? 0 : (Math.cos((Math.PI * d) / alcance) + 1) / 2;
  });
  const escala = useSpring(
    useTransform(perto, (p) => 1 + (magnify - 1) * p),
    MOLA,
  );
  const y = useSpring(
    useTransform(perto, (p) => -lift * p),
    MOLA,
  );
  // O rótulo acompanha o topo do ícone inchado, pra não ser engolido por ele.
  const rotuloY = useTransform([y, escala], ([v, e]) => (v as number) - size * ((e as number) - 1));

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {mostrarRotulo && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute bottom-full z-10 mb-3 whitespace-nowrap rounded-[var(--r-control)] bg-foreground px-2 py-1 text-xs font-medium text-background"
            style={{ y: rotuloY }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.button
        {...props}
        ref={(el) => {
          proprio.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        type="button"
        aria-label={item.label}
        aria-current={ativo ? "page" : undefined}
        className={cn(
          // Sem caixa própria: o ícone mora direto na barra. Borda em cada botão
          // dentro da borda da barra era moldura dentro de moldura, e a onda de
          // ampliação lia como caixas se empurrando em vez de ícones crescendo.
          "grid place-items-center rounded-[var(--r-control)] outline-none focus-visible:[box-shadow:var(--focus)]",
          "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-muted",
          "[&_svg]:size-[50%] [&_svg]:shrink-0",
          ativo || mostrarRotulo ? "text-foreground" : "text-muted-foreground",
        )}
        style={{ width: size, height: size, scale: escala, y, originY: 1 }}
      >
        {item.icon}
      </motion.button>

      <span
        aria-hidden
        className={cn(
          "absolute -bottom-2 size-1 rounded-[var(--r-pill)] bg-foreground transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)]",
          ativo ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
});
