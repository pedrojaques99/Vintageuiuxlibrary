"use client";

// Adaptado de Toast stack — https://uiarc.dev/components/toast-stack — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Toast Stack: os avisos se empilham no canto e abrem em leque quando alguém
 * vai até eles.
 *
 * Toast solto resolve um aviso; o problema é o terceiro. Empilhados em coluna,
 * três toasts comem meia tela de telefone. Aqui o mais novo fica na frente e os
 * antigos se escondem atrás dele, mostrando só a borda. Passar o ponteiro (ou o
 * foco, ou um toque) abre o leque, e aí cada um tem a própria altura e a
 * própria ação.
 *
 * ── O contrato ─────────────────────────────────────────────────────────────
 *
 * `ToastStackProvider` guarda a fila, `useToastStack()` dispara, atualiza e
 * dispensa de qualquer lugar abaixo dele, e `<ToastStack />` é a vitrine. A fila
 * é uma store externa (`useSyncExternalStore`): disparar um toast não renderiza
 * a árvore inteira de quem chamou, só a pilha.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Fechado, todo mundo tem a altura do da frente.** As bordas de trás
 *    ficam alinhadas, e o conteúdo delas some, senão o texto vazaria embaixo.
 *    Aberto, cada um volta à própria altura com um respiro entre eles.
 * 2. **O relógio para enquanto alguém lê.** Ponteiro em cima, foco dentro ou
 *    aba escondida congelam o tempo que falta; ninguém perde um aviso por estar
 *    lendo o anterior. `loading` não tem relógio: espera o `update`.
 * 3. **`update` transforma no lugar.** "Publicando" vira "Publicado" sem sair e
 *    entrar de novo; o título troca com um deslize curto e o relógio recomeça.
 * 4. **Arrastar para a direita dispensa.** Para a esquerda resiste, porque é o
 *    lado errado. Botão de fechar e Esc fazem o mesmo para quem não arrasta.
 * 5. **`contained` prende a pilha no ancestral posicionado** em vez da janela,
 *    para painel, preview e a própria vitrine.
 */

export type ToastType = "success" | "info" | "warning" | "error" | "loading";

export interface ToastOptions {
  /** Reusar um id atualiza o toast no lugar em vez de empilhar outro. */
  id?: string;
  type?: ToastType;
  title: string;
  description?: string;
  /** Ação curta, tipo Desfazer ou Ver. O toast fecha depois, a menos que a ação o atualize. */
  action?: { label: string; onClick: (id: string) => void };
  /** Milissegundos até fechar sozinho. `Infinity` mantém até fechar à mão. */
  duration?: number;
}

export interface ToastStackApi {
  toast: (options: ToastOptions) => string;
  update: (id: string, patch: Partial<Omit<ToastOptions, "id">>) => void;
  dismiss: (id?: string) => void;
}

type Registro = Required<Pick<ToastOptions, "id" | "type" | "title" | "duration">> &
  Pick<ToastOptions, "description" | "action"> & { seq: number; versao: number };

type Store = ToastStackApi & {
  subscribe: (fn: () => void) => () => void;
  get: () => Registro[];
  rodarAcao: (id: string) => void;
};

const VAZIO: Registro[] = [];
/** Quanto cada toast escondido aparece acima do da frente. */
const PEEK = 14;
/** Respiro entre toasts com o leque aberto. */
const GAP = 10;
/** Quanto cada degrau para trás encolhe. */
const ENCOLHE = 0.05;

const rotulos: Record<ToastType, string> = {
  success: "Feito",
  info: "Aviso",
  warning: "Atenção",
  error: "Erro",
  loading: "Em andamento",
};
const icones = { success: CircleCheck, info: Info, warning: TriangleAlert, error: CircleX, loading: LoaderCircle };

// Aviso e erro pedem mais leitura; loading espera o update.
const tempoPara = (tipo: ToastType, base: number) =>
  tipo === "loading" ? Infinity : tipo === "warning" || tipo === "error" ? base * 1.6 : base;

function criarStore(base: number, limite: number): Store {
  let fila: Registro[] = [];
  let seq = 0;
  const ouvintes = new Set<() => void>();
  const gravar = (nova: Registro[]) => {
    fila = nova;
    ouvintes.forEach((fn) => fn());
  };
  const update: ToastStackApi["update"] = (id, patch) => {
    const achado = fila.find((t) => t.id === id);
    if (!achado) return;
    const type = patch.type ?? achado.type;
    const novo: Registro = { ...achado, ...patch, type, duration: patch.duration ?? tempoPara(type, base), versao: achado.versao + 1 };
    gravar(fila.map((t) => (t.id === id ? novo : t)));
  };
  const toast: ToastStackApi["toast"] = ({ id, ...op }) => {
    if (id && fila.some((t) => t.id === id)) {
      update(id, op);
      return id;
    }
    const type = op.type ?? "info";
    seq += 1;
    const novo: Registro = { ...op, id: id ?? `toast-${seq}`, type, duration: op.duration ?? tempoPara(type, base), seq, versao: 0 };
    gravar([novo, ...fila].slice(0, limite));
    return novo.id;
  };
  const dismiss: ToastStackApi["dismiss"] = (id) => {
    if (id === undefined) return void (fila.length && gravar([]));
    if (fila.some((t) => t.id === id)) gravar(fila.filter((t) => t.id !== id));
  };
  return {
    toast,
    update,
    dismiss,
    rodarAcao: (id) => {
      const achado = fila.find((t) => t.id === id);
      if (!achado?.action) return;
      achado.action.onClick(id);
      // Se a ação não atualizou o toast, ele cumpriu o papel e fecha.
      if (fila.find((t) => t.id === id)?.versao === achado.versao) dismiss(id);
    },
    subscribe: (fn) => {
      ouvintes.add(fn);
      return () => void ouvintes.delete(fn);
    },
    get: () => fila,
  };
}

const Ctx = React.createContext<Store | null>(null);

function useStore() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error("Use a pilha de toasts dentro de <ToastStackProvider>.");
  return s;
}

export interface ToastStackProviderProps {
  children: React.ReactNode;
  /** Vida base de um toast, em ms. Aviso e erro ficam 1,6 vez mais. */
  duration?: number;
  /** Acima disso, os mais antigos saem da fila. */
  limit?: number;
}

/** Escopo de uma fila. Duas pilhas na mesma página nunca dividem toasts. */
export function ToastStackProvider({ children, duration = 5000, limit = 12 }: ToastStackProviderProps) {
  const [store] = React.useState(() => criarStore(duration, limit));
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

/** Dispara, atualiza e dispensa toasts de qualquer lugar abaixo do provider. */
export function useToastStack(): ToastStackApi & { count: number } {
  const s = useStore();
  const count = React.useSyncExternalStore(s.subscribe, () => s.get().length, () => 0);
  return { toast: s.toast, update: s.update, dismiss: s.dismiss, count };
}

const assinarVisibilidade = (fn: () => void) => {
  document.addEventListener("visibilitychange", fn);
  return () => document.removeEventListener("visibilitychange", fn);
};

interface ItemProps {
  t: Registro;
  index: number;
  y: number;
  altura: number;
  aberto: boolean;
  visivel: boolean;
  pausado: boolean;
  reduce: boolean;
  store: Store;
  onMedir: (id: string, h: number) => void;
}

const mola: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.1 };
const curto: Transition = { duration: 0.16, ease: [0.23, 1, 0.32, 1] };
const parado: Transition = { duration: 0 };

function ToastItem({ t, index, y, altura, aberto, visivel, pausado, reduce, store, onMedir }: ItemProps) {
  const conteudo = React.useRef<HTMLDivElement>(null);
  const restante = React.useRef(t.duration);
  const frente = index === 0;
  const degrau = Math.min(index, 3);

  React.useLayoutEffect(() => {
    const el = conteudo.current;
    if (!el) return;
    const medir = () => onMedir(t.id, el.offsetHeight + 2);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [t.id, onMedir]);

  // Update recomeça o relógio; pausa guarda o que falta (decisão 2).
  React.useEffect(() => {
    restante.current = t.duration;
  }, [t.versao, t.duration]);
  React.useEffect(() => {
    if (pausado || !Number.isFinite(restante.current)) return;
    const inicio = performance.now();
    const timer = window.setTimeout(() => store.dismiss(t.id), Math.max(restante.current, 0));
    return () => {
      window.clearTimeout(timer);
      restante.current -= performance.now() - inicio;
    };
  }, [pausado, store, t.id, t.versao, t.duration]);

  const Icone = icones[t.type];
  const troca = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: curto }
    : { initial: { opacity: 0, y: "0.3em" }, animate: { opacity: 1, y: "0em" }, exit: { opacity: 0, y: "-0.3em" }, transition: curto };

  return (
    <motion.li
      className="absolute inset-x-0 bottom-0 origin-bottom"
      style={{ zIndex: t.seq }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: altura || 48 }}
      animate={{
        y,
        scale: aberto ? 1 : 1 - ENCOLHE * degrau,
        height: altura || "auto",
        opacity: visivel ? 1 : 0,
      }}
      exit={reduce ? { opacity: 0, transition: curto } : { opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      transition={reduce ? parado : mola}
      // `inert` como atributo cru: o React 18 não conhece a prop e só repassa string.
      {...({ inert: !visivel || (!aberto && !frente) ? "" : undefined } as object)}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        store.dismiss(t.id);
      }}
    >
      <motion.div
        drag={reduce ? false : "x"}
        dragSnapToOrigin
        dragElastic={{ left: 0.08, right: 0.9 }}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 110 || info.velocity.x > 600) store.dismiss(t.id);
        }}
        className="h-full touch-pan-y overflow-hidden rounded-[var(--r-surface)] border border-border bg-card text-foreground [box-shadow:var(--e-raised)]"
      >
        <motion.div
          ref={conteudo}
          className="flex items-start gap-3 py-3 pl-3.5 pr-2"
          initial={false}
          animate={{ opacity: aberto || frente ? 1 : 0 }}
          transition={reduce ? parado : curto}
        >
          <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center text-muted-foreground">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={t.type} {...troca} className="grid place-items-center">
                <Icone className={cn("size-[18px]", t.type === "loading" && "animate-spin", t.type === "error" && "text-destructive")} />
              </motion.span>
            </AnimatePresence>
          </span>
          <div className="min-w-0 flex-1">
            <span className="sr-only">{rotulos[t.type]}: </span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p key={t.title} {...troca} className="text-sm font-medium leading-5">
                {t.title}
              </motion.p>
            </AnimatePresence>
            {t.description && <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{t.description}</p>}
          </div>
          {t.action && (
            <button
              type="button"
              onClick={() => store.rodarAcao(t.id)}
              className="h-7 shrink-0 rounded-[var(--r-control)] border border-border bg-background px-2.5 text-xs font-medium outline-none transition-[background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-muted focus-visible:[box-shadow:var(--focus)]"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Dispensar aviso"
            onClick={() => store.dismiss(t.id)}
            className="grid size-7 shrink-0 place-items-center rounded-[var(--r-control)] text-muted-foreground outline-none transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-muted hover:text-foreground focus-visible:[box-shadow:var(--focus)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </motion.div>
      </motion.div>
    </motion.li>
  );
}

export interface ToastStackProps {
  /** Nome acessível da região. */
  label?: string;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  /** Prende a pilha no ancestral posicionado em vez da janela. */
  contained?: boolean;
  /** Quantos aparecem de uma vez. Os demais esperam atrás. */
  visibleToasts?: number;
  /** Abre o leque sem precisar de ponteiro. Útil para vitrine e documentação. */
  defaultExpanded?: boolean;
  className?: string;
}

export function ToastStack({
  label = "Avisos",
  position = "bottom-right",
  contained = false,
  visibleToasts = 3,
  defaultExpanded = false,
  className,
}: ToastStackProps) {
  const store = useStore();
  const fila = React.useSyncExternalStore(store.subscribe, store.get, () => VAZIO);
  const reduce = useReducedMotion() ?? false;
  const escondida = React.useSyncExternalStore(assinarVisibilidade, () => document.visibilityState === "hidden", () => false);
  const [hover, setHover] = React.useState(false);
  const [foco, setFoco] = React.useState(false);
  const [toque, setToque] = React.useState(false);
  const [alturas, setAlturas] = React.useState<Record<string, number>>({});

  const onMedir = React.useCallback((id: string, h: number) => {
    setAlturas((a) => (a[id] === h ? a : { ...a, [id]: h }));
  }, []);

  const aberto = defaultExpanded || hover || foco || toque;
  const pausado = hover || foco || escondida;

  // Fila vazia fecha o leque de toque, senão o próximo toast já nasceria aberto.
  React.useEffect(() => {
    if (!fila.length) setToque(false);
  }, [fila.length]);

  // Geometria (decisão 1): fechado, degraus de PEEK com a altura do da frente; aberto, cada um na sua altura.
  const hFrente = fila[0] ? alturas[fila[0].id] ?? 0 : 0;
  let acumulado = 0;
  const alvos = fila.map((t, i) => {
    const h = alturas[t.id] ?? 0;
    const visivel = i < visibleToasts;
    const alvo = aberto
      ? { y: -acumulado, altura: h }
      : { y: -PEEK * Math.min(i, visibleToasts), altura: i === 0 ? h : hFrente };
    if (visivel) acumulado += h + GAP;
    return { ...alvo, visivel };
  });
  const alturaLista = !fila.length
    ? 0
    : aberto
      ? acumulado - GAP
      : hFrente + PEEK * (Math.min(fila.length, visibleToasts) - 1);

  return (
    <section
      aria-label={label}
      className={cn(
        contained ? "absolute" : "fixed",
        "bottom-4 z-50 w-[min(22.5rem,calc(100%-2rem))]",
        position === "bottom-right" && "right-4",
        position === "bottom-left" && "left-4",
        position === "bottom-center" && "left-1/2 -translate-x-1/2",
        className,
      )}
    >
      <motion.ol
        aria-live="polite"
        aria-relevant="additions text"
        className="relative"
        initial={false}
        animate={{ height: alturaLista }}
        transition={reduce ? parado : mola}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
        onPointerUp={(e) => {
          // Toque não tem hover: tocar no cartão abre ou fecha o leque, tocar num botão só aperta o botão.
          if (e.pointerType === "mouse" || (e.target as Element).closest("button")) return;
          setToque((v) => !v);
        }}
        onFocus={() => setFoco(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFoco(false);
        }}
      >
        <AnimatePresence initial={false}>
          {fila.map((t, i) => (
            <ToastItem
              key={t.id}
              t={t}
              index={i}
              y={alvos[i].y}
              altura={alvos[i].altura}
              aberto={aberto}
              visivel={alvos[i].visivel}
              pausado={pausado}
              reduce={reduce}
              store={store}
              onMedir={onMedir}
            />
          ))}
        </AnimatePresence>
      </motion.ol>
    </section>
  );
}

export default ToastStack;
