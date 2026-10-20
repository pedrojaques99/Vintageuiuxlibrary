"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { Check, MoreHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Orbit Menu — um botão que abre as ações em arco ao redor dele.
 *
 * Três a seis ações sobre UM objeto (a foto, a nota, o pedido) num lugar onde
 * não cabe barra de ferramentas. Menu suspenso resolve, mas pede dois toques e
 * uma leitura de lista. A órbita junta tudo num gesto só: aperta, arrasta até a
 * ação, solta. É o gesto que o polegar já conhece de app de câmera.
 *
 * Dois jeitos de usar, e os dois precisam funcionar sem aviso:
 *
 * 1. **Apertar e arrastar.** O arco abre no `pointerdown`. Enquanto o dedo anda,
 *    a ação mais próxima em ÂNGULO cresce e o rótulo central diz o nome dela.
 *    Soltar dispara. Soltar perto do botão não dispara nada.
 * 2. **Clicar.** Um clique sem arrasto deixa o arco aberto, e aí cada ação é um
 *    botão comum. Clicar no botão central de novo fecha.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * - **A escolha é por ângulo, não por acerto.** Exigir que o dedo pouse em cima
 *   de um alvo de 44px num arco é pedir precisão de mouse num telefone. Basta
 *   apontar a direção e passar de uma distância mínima do centro.
 * - **O vetor vem do centro medido na tela.** Ângulo não muda com a escala da
 *   vitrine, e a distância mínima é dividida pela escala (`r.width / offsetWidth`)
 *   pra valer em px locais, os mesmos do raio.
 * - **Depois de disparar, o botão vira um visto por um instante** e o rótulo diz
 *   o `feedback` da ação. Quem dispara às cegas, no gesto, precisa da confirmação
 *   no mesmo lugar onde o dedo está.
 * - **Teclado:** o botão abre com Enter/Espaço/seta e o foco vai pra primeira
 *   ação; setas giram pelo arco, Enter/Espaço dispara, Esc e Tab fecham e devolvem
 *   o foco. As ações são `menuitem` dentro de `menu`.
 * - **Redução de movimento:** o arco aparece no lugar, só com opacidade.
 */

export interface OrbitAction {
  id: string;
  /** Nome curto, aparece no rótulo central e no leitor de tela. */
  label: string;
  icon: React.ReactNode;
  /** Frase de confirmação depois de disparar: "Fixado". Sem isto, usa o `label`. */
  feedback?: string;
  /** `danger` pinta o ícone com o token destrutivo. */
  tone?: "default" | "danger";
}

export interface OrbitMenuProps {
  actions: OrbitAction[];
  /** Chamado com o `id` da ação escolhida. */
  onAction?: (id: string) => void;
  /** Nome do menu: rótulo do botão e texto central com o arco aberto. */
  label?: string;
  /** Distância do centro do botão até o centro de cada ação, em px. */
  radius?: number;
  /** Abertura do arco em graus, centrado em cima do botão. */
  spread?: number;
  /** Ícone do botão fechado. */
  icon?: React.ReactNode;
  /** Avisa quando o arco abre ou fecha (pra esmaecer o objeto, por exemplo). */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const BOTAO = 52;
const ACAO = 44;
const CONFIRMA_MS = 1200;

const mola: Transition = { type: "spring", stiffness: 520, damping: 30, mass: 0.8 };

export function OrbitMenu({
  actions,
  onAction,
  label = "Ações",
  radius = 100,
  spread = 160,
  icon,
  onOpenChange,
  className,
}: OrbitMenuProps) {
  const reduzir = useReducedMotion();
  const [aberto, setAberto] = React.useState(false);
  const [mira, setMira] = React.useState<number | null>(null);
  const [feito, setFeito] = React.useState<string | null>(null);
  const botaoRef = React.useRef<HTMLButtonElement>(null);
  const itensRef = React.useRef<(HTMLButtonElement | null)[]>([]);
  const gesto = React.useRef<{ x: number; y: number; moveu: boolean; abriuAgora: boolean } | null>(null);
  const timer = React.useRef<number | undefined>(undefined);

  const raizRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  // Aberto por clique, fecha com toque fora, como qualquer menu.
  React.useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) {
        setAberto(false);
        setMira(null);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto, onOpenChange]);

  const n = actions.length;
  // Ângulo de cada ação em graus, 0 = direita, -90 = em cima (eixo y da tela).
  const angulos = React.useMemo(() => {
    if (n === 1) return [-90];
    const ini = -90 - spread / 2;
    return actions.map((_, i) => ini + (spread * i) / (n - 1));
  }, [actions, n, spread]);

  const mudar = (sim: boolean) => {
    setAberto(sim);
    if (!sim) setMira(null);
    onOpenChange?.(sim);
  };

  const disparar = (i: number) => {
    const acao = actions[i];
    if (!acao) return;
    mudar(false);
    setFeito(acao.feedback ?? acao.label);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFeito(null), CONFIRMA_MS);
    onAction?.(acao.id);
    botaoRef.current?.focus();
  };

  const mirar = (cx: number, cy: number) => {
    const el = botaoRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const escala = r.width / el.offsetWidth || 1;
    const dx = (cx - (r.left + r.width / 2)) / escala;
    const dy = (cy - (r.top + r.height / 2)) / escala;
    if (Math.hypot(dx, dy) < radius * 0.45) return null;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    let melhor = 0;
    let menor = Infinity;
    angulos.forEach((alvo, i) => {
      const d = Math.abs(((a - alvo + 540) % 360) - 180);
      if (d < menor) {
        menor = d;
        melhor = i;
      }
    });
    // Apontar pra baixo do botão, longe de qualquer ação, não escolhe nada.
    return menor <= 50 ? melhor : null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { x: e.clientX, y: e.clientY, moveu: false, abriuAgora: !aberto };
    if (!aberto) mudar(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesto.current;
    if (!g) return;
    if (!g.moveu && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.moveu = true;
    if (g.moveu) setMira(mirar(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesto.current;
    gesto.current = null;
    if (!g) return;
    if (g.moveu) {
      const alvo = mirar(e.clientX, e.clientY);
      // Arrastou e voltou pro centro: é desistência, fecha sem disparar.
      if (alvo !== null) disparar(alvo);
      else mudar(false);
    } else if (!g.abriuAgora) {
      // Clique simples com o arco já aberto: fecha.
      mudar(false);
    }
  };

  const abrirPeloTeclado = (foco: number) => {
    mudar(true);
    requestAnimationFrame(() => itensRef.current[foco]?.focus());
  };

  const onKeyDownBotao = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      if (aberto) mudar(false);
      else abrirPeloTeclado(0);
    } else if (e.key === "Escape" && aberto) {
      e.preventDefault();
      mudar(false);
    }
  };

  const onKeyDownItem = (e: React.KeyboardEvent, i: number) => {
    const ir = (j: number) => {
      const k = (j + n) % n;
      setMira(k);
      itensRef.current[k]?.focus();
    };
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      ir(i + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      ir(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      ir(0);
    } else if (e.key === "End") {
      e.preventDefault();
      ir(n - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      mudar(false);
      botaoRef.current?.focus();
    } else if (e.key === "Tab") {
      mudar(false);
    }
  };

  const texto = feito ?? (aberto && mira !== null ? actions[mira]?.label : aberto ? label : null);

  return (
    <div
      ref={raizRef}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: BOTAO, height: BOTAO }}
    >
      <AnimatePresence>
        {aberto && (
          <motion.div
            key="arco"
            role="menu"
            aria-label={label}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {actions.map((acao, i) => {
              const rad = (angulos[i] * Math.PI) / 180;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const ativo = mira === i;
              return (
                <motion.button
                  key={acao.id}
                  ref={(el) => {
                    itensRef.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  aria-label={acao.label}
                  tabIndex={-1}
                  onClick={() => disparar(i)}
                  onKeyDown={(e) => onKeyDownItem(e, i)}
                  onFocus={() => setMira(i)}
                  onPointerEnter={() => !gesto.current && setMira(i)}
                  className={cn(
                    "pointer-events-auto absolute grid place-items-center rounded-[var(--r-pill)] border border-border [box-shadow:var(--e-raised)] [font:inherit]",
                    "transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
                    "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
                    ativo ? "bg-foreground text-background" : "bg-background text-foreground",
                    !ativo && acao.tone === "danger" && "text-destructive",
                  )}
                  style={{ width: ACAO, height: ACAO, left: -ACAO / 2, top: -ACAO / 2 }}
                  initial={reduzir ? { x, y, scale: 1, opacity: 0 } : { x: 0, y: 0, scale: 0.4, opacity: 0 }}
                  animate={{ x, y, scale: ativo ? 1.18 : 1, opacity: 1 }}
                  exit={reduzir ? { opacity: 0 } : { x: 0, y: 0, scale: 0.4, opacity: 0 }}
                  transition={reduzir ? { duration: 0.12 } : { ...mola, delay: aberto ? i * 0.025 : 0 }}
                >
                  {acao.icon}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {texto && (
          <motion.span
            key="rotulo"
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[var(--r-pill)] border border-border bg-background px-3 py-1 text-xs text-foreground [box-shadow:var(--e-raised)]"
            style={{ bottom: BOTAO + 4 }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16 }}
          >
            {feito && <Check aria-hidden="true" className="-ml-0.5 mr-1 inline size-3.5 align-[-2px]" />}
            {texto}
          </motion.span>
        )}
      </AnimatePresence>

      <button
        ref={botaoRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesto.current = null;
          setMira(null);
        }}
        onKeyDown={onKeyDownBotao}
        className={cn(
          "relative z-20 grid touch-none select-none place-items-center rounded-[var(--r-pill)] bg-foreground text-background [box-shadow:var(--e-raised)] [font:inherit]",
          "transition-transform duration-[var(--dur-press)] ease-[var(--ease-out)] active:scale-95",
          "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
        )}
        style={{ width: BOTAO, height: BOTAO }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={feito ? "feito" : aberto ? "fechar" : "abrir"}
            className="grid place-items-center"
            initial={reduzir ? { opacity: 0 } : { opacity: 0, rotate: -45, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.6 }}
            transition={{ duration: 0.12 }}
          >
            {feito ? (
              <Check aria-hidden="true" className="size-5" />
            ) : aberto ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              (icon ?? <MoreHorizontal aria-hidden="true" className="size-5" />)
            )}
          </motion.span>
        </AnimatePresence>
      </button>

      <span className="sr-only" aria-live="polite">
        {feito ?? ""}
      </span>
    </div>
  );
}
