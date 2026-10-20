"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Folding Bill — a conta que dobra em três e desdobra quando você puxa.
 *
 * Um resumo de pedido fechado é um cabeçalho; aberto, é a conta inteira. Em
 * vez de um acordeão que empurra o layout, a conta dobra em sanfona no próprio
 * lugar, como papel: o cabeçalho fica, o miolo dobra para trás e o rodapé dobra
 * por cima dele. Arrastar para cima dobra, para baixo abre; um toque alterna.
 *
 * ── Decisões ───────────────────────────────────────────────────────────────
 *
 * 1. **CSS 3D aninhado, sem three.** Cada painel é filho do anterior com a
 *    dobradiça na borda de cima (`transform-origin: top`), então girar o miolo
 *    leva o rodapé junto, como papel. A ordem das dobras está no `giro2/3`.
 * 2. **Um número só manda em tudo.** `p` (0 aberta, 1 dobrada) é uma
 *    `MotionValue`; ângulos, sombra das dobras e a altura reservada derivam dela.
 *    O arrasto escreve em `p` direto e a mola só entra ao soltar, com a
 *    velocidade do dedo — por isso não há salto entre gesto e animação.
 * 3. **A altura acompanha a dobra.** A caixa reserva `altura × (3 − 2p)`: a
 *    conta dobrada não deixa um buraco de duas dobras embaixo dela.
 * 4. **Teclado e leitor de tela.** A conta é um botão com `aria-expanded`;
 *    Enter e Espaço alternam. O conteúdo dos painéis dobrados continua no DOM
 *    (é papel virado, não removido), mas sai da leitura com `aria-hidden`.
 *
 * `stiffness` é a rigidez da mola ao soltar; `settle` é o quanto o papel
 * balança antes de assentar (0 = assenta seco).
 */

export interface BillItem {
  label: string;
  value: string;
}

export interface FoldingBillProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Controlado: `true` = dobrada. */
  folded?: boolean;
  defaultFolded?: boolean;
  onFoldedChange?: (folded: boolean) => void;
  /** Nome no cabeçalho (loja, mesa, pedido). */
  title?: string;
  /** Linha de apoio do cabeçalho (data, número do pedido). */
  meta?: string;
  items?: BillItem[];
  total?: BillItem;
  /** Altura de cada uma das três dobras, em px. */
  panelHeight?: number;
  /** 0–100. Rigidez da mola ao soltar. */
  stiffness?: number;
  /** 0–100. Balanço antes de assentar. */
  settle?: number;
}

const ITENS_PADRAO: BillItem[] = [
  { label: "Café coado", value: "R$ 9,00" },
  { label: "Pão de queijo", value: "R$ 7,50" },
  { label: "Suco de caju", value: "R$ 11,00" },
];

/** Escurece a face conforme ela se afasta de frente. Opacidade, nunca cor nova. */
function Sombra({ p, max }: { p: MotionValue<number>; max: number }) {
  const opacity = useTransform(p, [0, 1], [0, max]);
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-foreground"
      style={{ opacity }}
    />
  );
}

export function FoldingBill({
  folded,
  defaultFolded = true,
  onFoldedChange,
  title = "Mesa 12",
  meta = "Hoje, 19h42",
  items = ITENS_PADRAO,
  total = { label: "Total", value: "R$ 27,50" },
  panelHeight = 92,
  stiffness = 40,
  settle = 0,
  className,
  ...props
}: FoldingBillProps) {
  const reduzir = useReducedMotion() ?? false;
  const [interno, setInterno] = React.useState(defaultFolded);
  const dobrada = folded ?? interno;

  const p = useMotionValue(dobrada ? 1 : 0);
  // Duas fases, como papel de verdade: na primeira metade o rodapé dobra para
  // trás do miolo; na segunda, miolo e rodapé juntos dobram para trás do
  // cabeçalho. Dobrar os dois ao mesmo tempo faz o rodapé atravessar o
  // cabeçalho no meio do caminho (medido na bancada, em p ≈ 0,75).
  const s3 = useTransform(p, (v) => Math.min(1, v * 2));
  const s2 = useTransform(p, (v) => Math.max(0, v * 2 - 1));
  // translateZ separa as camadas no fim (cabeçalho 0, rodapé −1, miolo −2):
  // com as três no mesmo plano o navegador sorteia quem aparece na frente.
  const giro2 = useTransform(p, (v) => `translateZ(${-2 * v}px) rotateX(${-180 * Math.max(0, v * 2 - 1)}deg)`);
  const giro3 = useTransform(p, (v) => `translateZ(${-1 * v}px) rotateX(${-180 * Math.min(1, v * 2)}deg)`);
  const altura = useTransform(p, (v) => panelHeight * (3 - 2 * v));
  // Dobradas, as costas das dobras ficam exatamente atrás do cabeçalho, e o
  // canto reto delas aparecia como um triângulo cinza por trás do canto
  // arredondado dele. Da metade em diante (quando a dobra já virou), as bordas
  // que caem sobre o topo do cabeçalho ganham o mesmo raio.
  const canto = useTransform(p, (v) => (v > 0.5 ? "var(--r-surface)" : "0px"));

  const mola = React.useMemo(() => {
    const k = 120 + (stiffness / 100) * 480;
    const zeta = 1 - (settle / 100) * 0.7; // 1 = crítico, assenta sem balanço
    return { type: "spring" as const, stiffness: k, damping: 2 * Math.sqrt(k) * zeta };
  }, [stiffness, settle]);

  const assentar = React.useCallback(
    (alvo: number, velocity = 0) => {
      if (reduzir) {
        p.jump(alvo);
        return;
      }
      animate(p, alvo, { ...mola, velocity });
    },
    [mola, p, reduzir],
  );

  // O estado externo manda: quando `folded` muda por fora, o papel vai junto.
  // Exceto logo depois de um arrasto, que já soltou a mola com a velocidade do
  // dedo; reanimar aqui zeraria essa velocidade e o papel daria um tranco.
  const doGesto = React.useRef(false);
  React.useEffect(() => {
    if (doGesto.current) {
      doGesto.current = false;
      return;
    }
    assentar(dobrada ? 1 : 0);
  }, [dobrada, assentar]);

  const definir = (novo: boolean) => {
    if (folded === undefined) setInterno(novo);
    onFoldedChange?.(novo);
    if (novo === dobrada) assentar(novo ? 1 : 0); // soltou perto de onde estava
  };

  const gesto = React.useRef<{ y: number; p: number; t: number; vy: number; moveu: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    p.stop();
    gesto.current = { y: e.clientY, p: p.get(), t: e.timeStamp, vy: 0, moveu: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (!g) return;
    const dy = e.clientY - g.y;
    if (Math.abs(dy) > 4) g.moveu = true;
    if (!g.moveu) return;
    // Duas dobras de curso: arrastar 2× a altura do painel vai de aberta a dobrada.
    const novo = Math.min(1, Math.max(0, g.p - dy / (panelHeight * 2)));
    const dt = Math.max(1, e.timeStamp - g.t);
    g.vy = ((novo - p.get()) / dt) * 1000;
    g.t = e.timeStamp;
    p.set(novo);
  };

  const onPointerUp = () => {
    const g = gesto.current;
    gesto.current = null;
    if (!g) return;
    if (!g.moveu) {
      definir(!dobrada);
      return;
    }
    const projetado = p.get() + g.vy * 0.12;
    const novo = projetado > 0.5;
    if (novo !== dobrada) doGesto.current = true;
    if (folded === undefined) setInterno(novo);
    onFoldedChange?.(novo);
    if (reduzir) p.jump(novo ? 1 : 0);
    else animate(p, novo ? 1 : 0, { ...mola, velocity: g.vy });
  };

  const face = "absolute inset-0 overflow-hidden bg-card [backface-visibility:hidden]";
  const verso = "absolute inset-0 bg-muted [backface-visibility:hidden] [transform:rotateX(180deg)]";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!dobrada}
      aria-label={dobrada ? `${title}, conta dobrada. Abrir` : `${title}, conta aberta. Dobrar`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          definir(!dobrada);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "relative w-[260px] cursor-grab touch-none select-none rounded-[var(--r-surface)] outline-none active:cursor-grabbing",
        "focus-visible:[box-shadow:var(--focus)] [perspective:900px]",
        className,
      )}
      {...props}
    >
      <motion.div style={{ height: altura }}>
      {/* Painel 1: o cabeçalho, que nunca sai do lugar. */}
      <div
        className="relative [transform-style:preserve-3d]"
        style={{ height: panelHeight }}
      >
        <div className={cn(face, "flex flex-col justify-center gap-1 rounded-t-[var(--r-surface)] border border-border px-4 [box-shadow:var(--e-raised)]")}>
          <span className="truncate text-[length:var(--text-destaque,0.9375rem)] font-semibold tracking-tight text-foreground">
            {title}
          </span>
          <span className="flex items-baseline justify-between gap-3 text-[length:var(--text-apoio,0.75rem)] text-muted-foreground">
            <span className="truncate">{meta}</span>
            <span className="tabular-nums text-foreground">{total.value}</span>
          </span>
        </div>

        {/* Painel 2: os itens. Dobra para trás do cabeçalho. */}
        <motion.div
          aria-hidden={dobrada}
          className="absolute inset-x-0 top-full origin-top [transform-style:preserve-3d]"
          style={{ height: panelHeight, transform: giro2 }}
        >
          <motion.div
            className={cn(face, "flex flex-col justify-center gap-1.5 border-x border-border px-4")}
            style={{ borderBottomLeftRadius: canto, borderBottomRightRadius: canto }}
          >
            {items.slice(0, 3).map((it) => (
              <span
                key={it.label}
                className="flex items-baseline justify-between gap-3 text-[length:var(--text-corpo,0.8125rem)]"
              >
                <span className="truncate text-muted-foreground">{it.label}</span>
                <span className="tabular-nums text-foreground">{it.value}</span>
              </span>
            ))}
            <Sombra p={s2} max={0.12} />
          </motion.div>
          <motion.div className={verso} style={{ borderBottomLeftRadius: canto, borderBottomRightRadius: canto }} />

          {/* Painel 3: o total, com a borda serrilhada do papel destacado. */}
          <motion.div
            className="absolute inset-x-0 top-full origin-top [transform-style:preserve-3d]"
            style={{ height: panelHeight, transform: giro3 }}
          >
            <motion.div
              className={cn(face, "flex flex-col justify-center gap-1 border-x border-border px-4")}
              style={{
                borderTopLeftRadius: canto,
                borderTopRightRadius: canto,
                // Serrilha por máscara: a borda de baixo é papel rasgado sem desenhar nada.
                WebkitMask:
                  "radial-gradient(circle at 6px 100%, transparent 5px, currentColor 5.5px) bottom / 12px 100% repeat-x",
                mask:
                  "radial-gradient(circle at 6px 100%, transparent 5px, currentColor 5.5px) bottom / 12px 100% repeat-x",
              }}
            >
              <span className="border-t border-dashed border-border" />
              <span className="flex items-baseline justify-between gap-3 pt-2">
                <span className="text-[length:var(--text-corpo,0.8125rem)] font-medium text-foreground">
                  {total.label}
                </span>
                <span className="text-[length:var(--text-destaque,0.9375rem)] font-semibold tabular-nums text-foreground">
                  {total.value}
                </span>
              </span>
              <Sombra p={s3} max={0.2} />
            </motion.div>
            <motion.div className={verso} style={{ borderTopLeftRadius: canto, borderTopRightRadius: canto }} />
          </motion.div>
        </motion.div>
      </div>
      </motion.div>
    </div>
  );
}
