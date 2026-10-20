"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Black Hole — apagar em lote sem a lista dar um pulo.
 *
 * Apagar três linhas de uma lista costuma ser o gesto mais seco da interface:
 * as linhas somem e o resto despenca. Ninguém vê PARA ONDE foi o que saiu, e é
 * por isso que o "desfazer" logo embaixo parece arriscado. Aqui o que sai é
 * sugado para um ponto só, as vizinhas se inclinam para ele por um instante, e
 * o desfazer devolve tudo do mesmo ponto, girando ao contrário. O caminho de
 * ida e volta é visível, então desfazer vira um gesto de confiança.
 *
 * ── O que se vê, e o que reage a quê ───────────────────────────────────────
 *
 * - Marcar linhas acende o botão "Apagar N" no cabeçalho.
 * - Apagar: nasce uma singularidade no centro de massa das linhas marcadas.
 *   Elas deslizam encolhendo até ela, com um pouco de poeira (canvas 2D)
 *   junto; as linhas que ficam são puxadas uns pixels para o centro e voltam. Tudo em
 *   300ms. Depois a lista fecha o buraco em mola.
 * - Aparece "N apagadas · Desfazer". Desfazer reabre o espaço e as linhas
 *   saem do mesmo ponto, girando no sentido oposto.
 * - Teclado: Espaço marca a linha em foco; Delete apaga as marcadas.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Duas fases, não uma.** As linhas são sugadas ainda no fluxo e só
 *    depois saem da lista. Se saíssem juntas, a lista fecharia por baixo da
 *    animação e o ponto de fuga ficaria no meio de linhas que já subiram.
 * 2. **A medida é `offsetTop`, não `getBoundingClientRect`.** O palco da
 *    vitrine (e muito layout) escala a peça; offset é px local e ignora os
 *    transforms da própria animação em curso.
 * 3. **A poeira é canvas 2D**, sem WebGL: são algumas dezenas de pontos por
 *    300ms. A cor sai de `getComputedStyle` do próprio canvas (que tem
 *    `text-foreground`), então segue o tema e o modo escuro sem um hex sequer.
 * 4. **O desfazer guarda o vetor até o buraco** de cada linha. Elas voltam
 *    para a mesma posição de onde saíram, então o mesmo vetor serve de ponto
 *    de partida da volta.
 * 5. **Com `prefers-reduced-motion`** não há buraco nem poeira: a linha sai,
 *    a lista fecha, o desfazer continua lá.
 */

export interface BlackHoleProps<T extends { id: string }>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  items: T[];
  /** O miolo da linha. A caixa de seleção e o foco são da peça. */
  renderItem: (item: T) => React.ReactNode;
  /** Título no cabeçalho da lista. */
  title?: string;
  /** Rótulo de uma linha para leitor de tela. */
  itemLabel?: (item: T) => string;
  /** Texto do aviso depois de apagar. */
  deletedText?: (n: number) => string;
  /** Ids que já chegam marcados. */
  defaultSelected?: string[];
  /** ms até o desfazer sumir. */
  undoMs?: number;
  onDelete?: (ids: string[]) => void;
  onRestore?: (ids: string[]) => void;
}

type Lote<T> = { itens: { item: T; pos: number }[]; vetores: Record<string, { x: number; y: number }> };

const SUGAR = 300; // --dur-slow
/**
 * Graus de giro na ida (e ao contrário na volta). A primeira versão girava
 * 200°, encolhia a zero e soltava 22 grãos de poeira por linha: lia como efeito
 * de apresentação de slides. O buraco convence pelo caminho até o ponto, não
 * pelo giro. Doze graus, chega a 40% do tamanho e some no caminho.
 */
const GIRO = 12;

export function BlackHole<T extends { id: string }>({
  items,
  renderItem,
  title = "Caixa de entrada",
  itemLabel,
  deletedText = (n) => (n === 1 ? "1 apagada" : `${n} apagadas`),
  defaultSelected,
  undoMs = 5000,
  onDelete,
  onRestore,
  className,
  ...props
}: BlackHoleProps<T>) {
  const reduzir = useReducedMotion();
  const [lista, setLista] = React.useState(items);
  const [marcadas, setMarcadas] = React.useState<Set<string>>(() => new Set(defaultSelected));
  const [buraco, setBuraco] = React.useState<{ x: number; y: number } | null>(null);
  const [vetores, setVetores] = React.useState<Record<string, { x: number; y: number }>>({});
  const [sumindo, setSumindo] = React.useState(false);
  const [lote, setLote] = React.useState<Lote<T> | null>(null);
  const [voltando, setVoltando] = React.useState<Set<string>>(new Set());
  const corpo = React.useRef<HTMLDivElement>(null);
  const tela = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => setLista(items), [items]);

  // O aviso de desfazer tem prazo.
  React.useEffect(() => {
    if (!lote) return;
    const t = window.setTimeout(() => setLote(null), undoMs);
    return () => clearTimeout(t);
  }, [lote, undoMs]);

  const alternar = (id: string) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  /** Poeira: pontos tirados das caixas das linhas, espiralando até o buraco. */
  const poeira = (caixas: { x: number; y: number; w: number; h: number }[], c: { x: number; y: number }) => {
    const cv = tela.current;
    const box = corpo.current;
    if (!cv || !box) return;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const cor = getComputedStyle(cv).color;
    const pontos = caixas.flatMap((b) =>
      Array.from({ length: 12 }, () => {
        const x = b.x + Math.random() * b.w;
        const y = b.y + Math.random() * b.h;
        return {
          r0: Math.hypot(x - c.x, y - c.y),
          a0: Math.atan2(y - c.y, x - c.x),
          giro: 0.25 + Math.random() * 0.35,
          tam: 0.5 + Math.random() * 0.9,
        };
      }),
    );
    const inicio = performance.now();
    const quadro = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / (SUGAR + 60));
      const e = t * t * (3 - 2 * t);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = cor;
      for (const p of pontos) {
        const r = p.r0 * (1 - e);
        const a = p.a0 + e * p.giro * Math.PI;
        // Poeira é sugestão, não confete: some antes de chegar no ponto.
        ctx.globalAlpha = 0.3 * (1 - t);
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, p.tam * (1 - e * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      if (t < 1) requestAnimationFrame(quadro);
      else ctx.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(quadro);
  };

  const apagar = () => {
    if (sumindo || marcadas.size === 0) return;
    const ids = lista.filter((i) => marcadas.has(i.id)).map((i) => i.id);
    const box = corpo.current;
    // A caixa guarda a altura que já teve: a lista encolhe por dentro, mas o
    // cartão não sobe na página a cada lote apagado (e o desfazer tem onde cair).
    if (box) box.style.minHeight = `${Math.max(parseFloat(box.style.minHeight) || 0, box.offsetHeight)}px`;
    const linhas = new Map<string, HTMLElement>();
    box?.querySelectorAll<HTMLElement>("[data-linha]").forEach((el) => linhas.set(el.dataset.linha!, el));
    const caixas = ids
      .map((id) => linhas.get(id))
      .filter(Boolean)
      .map((el) => ({ x: el!.offsetLeft, y: el!.offsetTop, w: el!.offsetWidth, h: el!.offsetHeight }));
    const c = caixas.length
      ? {
          x: caixas.reduce((s, b) => s + b.x + b.w / 2, 0) / caixas.length,
          y: caixas.reduce((s, b) => s + b.y + b.h / 2, 0) / caixas.length,
        }
      : { x: 0, y: 0 };
    const vs: Record<string, { x: number; y: number }> = {};
    lista.forEach((item) => {
      const el = linhas.get(item.id);
      if (!el) return;
      vs[item.id] = { x: c.x - (el.offsetLeft + el.offsetWidth / 2), y: c.y - (el.offsetTop + el.offsetHeight / 2) };
    });
    const novoLote: Lote<T> = {
      itens: lista.flatMap((item, pos) => (marcadas.has(item.id) ? [{ item, pos }] : [])),
      vetores: vs,
    };
    const resto = lista.filter((i) => !marcadas.has(i.id));
    const fechar = () => {
      setLista(resto);
      setMarcadas(new Set());
      setSumindo(false);
      setBuraco(null);
      setLote(novoLote);
      onDelete?.(ids);
    };
    if (reduzir) {
      fechar();
      return;
    }
    setVetores(vs);
    setBuraco(c);
    setSumindo(true);
    poeira(caixas, c);
    window.setTimeout(fechar, SUGAR);
  };

  const desfazer = () => {
    if (!lote) return;
    const nova = [...lista];
    for (const { item, pos } of lote.itens) nova.splice(Math.min(pos, nova.length), 0, item);
    const ids = lote.itens.map((i) => i.item.id);
    setVetores(lote.vetores);
    setVoltando(new Set(ids));
    setLista(nova);
    setLote(null);
    onRestore?.(ids);
  };

  const nMarcadas = marcadas.size;

  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)} {...props}>
      <div className="w-full overflow-hidden rounded-[var(--r-surface)] bg-card text-foreground [box-shadow:var(--e-raised)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <span className="text-sm font-medium">{title}</span>
          <button
            type="button"
            onClick={apagar}
            disabled={nMarcadas === 0 || sumindo}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-control)] bg-muted px-3 text-sm text-foreground outline-none transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:[box-shadow:var(--focus)] disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden />
            Apagar{nMarcadas > 0 ? ` ${nMarcadas}` : ""}
          </button>
        </div>

        <div ref={corpo} role="list" aria-label={title} className="relative flex flex-col p-1.5">
          <AnimatePresence initial={false}>
            {lista.map((item) => {
              const marcada = marcadas.has(item.id);
              const v = vetores[item.id] ?? { x: 0, y: 0 };
              const vai = sumindo && marcada;
              const volta = voltando.has(item.id);
              // As que ficam são puxadas ~6% do caminho e voltam: a "curvatura".
              const puxa = sumindo && !marcada;
              const d = Math.hypot(v.x, v.y) || 1;
              const forca = Math.min(4, 400 / (d + 40));
              return (
                <motion.div
                  key={item.id}
                  role="listitem"
                  layout={!sumindo}
                  data-linha={item.id}
                  initial={
                    volta && !reduzir
                      ? { x: v.x * 0.8, y: v.y * 0.8, scale: 0.4, rotate: GIRO, opacity: 0, filter: "blur(3px)" }
                      : false
                  }
                  animate={
                    vai
                      ? { x: v.x * 0.8, y: v.y * 0.8, scale: 0.4, rotate: -GIRO, opacity: 0, filter: "blur(3px)" }
                      : puxa
                        ? {
                            x: [0, (v.x / d) * forca, 0],
                            y: [0, (v.y / d) * forca, 0],
                            scale: 1,
                            rotate: 0,
                            opacity: 1,
                            filter: "blur(0px)",
                          }
                        : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, filter: "blur(0px)" }
                  }
                  exit={{ opacity: 0, transition: { duration: 0 } }}
                  transition={
                    vai || puxa
                      ? { duration: SUGAR / 1000, ease: [0.4, 0, 0.7, 0.2] }
                      : { type: "spring", stiffness: 320, damping: 32, mass: 0.8 }
                  }
                  onAnimationComplete={() => {
                    if (volta)
                      setVoltando((s) => {
                        const n = new Set(s);
                        n.delete(item.id);
                        return n;
                      });
                  }}
                  className="origin-center"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={marcada}
                    aria-label={itemLabel?.(item)}
                    onClick={() => alternar(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Delete" || e.key === "Backspace") {
                        e.preventDefault();
                        apagar();
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--r-control)] px-2.5 py-2 text-left [font:inherit] outline-none transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:[box-shadow:var(--focus)]",
                      marcada ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[var(--r-pill)] border transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]",
                        marcada
                          ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                          : "border-border",
                      )}
                    >
                      {marcada && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1">{renderItem(item)}</span>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* A singularidade: ponto de tinta com anel de lente. Redondo em 50%, não
              no raio da marca: um buraco negro quadrado não é buraco. */}
          <AnimatePresence>
            {buraco && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute z-10 size-1.5 rounded-[50%] bg-foreground"
                style={{
                  left: buraco.x - 3,
                  top: buraco.y - 3,
                  boxShadow: "0 0 0 5px color-mix(in oklab, var(--foreground) 6%, transparent)",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.8 }}
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: SUGAR / 2000, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </AnimatePresence>
          <canvas
            ref={tela}
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full text-foreground"
          />
        </div>
      </div>

      <div aria-live="polite" className="min-h-9">
        <AnimatePresence>
          {lote && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-[var(--r-pill)] bg-card py-1.5 pr-1.5 pl-4 text-sm text-muted-foreground [box-shadow:var(--e-raised)]"
            >
              {deletedText(lote.itens.length)}
              <button
                type="button"
                onClick={desfazer}
                className="rounded-[var(--r-pill)] px-3 py-1 text-sm font-medium text-foreground outline-none transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-muted focus-visible:[box-shadow:var(--focus)]"
              >
                Desfazer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
