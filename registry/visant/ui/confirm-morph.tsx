"use client";

// Adaptado de Confirm morph — https://uiarc.dev/components/confirm-morph — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type Transition,
  type Variants,
} from "motion/react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Confirm Morph: o botão destrutivo que pergunta no próprio lugar.
 *
 * Apagar um projeto pede confirmação, e um modal pra isso é desproporcional:
 * escurece a página, rouba o foco e pergunta longe de onde a pessoa clicou.
 * Aqui a mesma pílula vira a pergunta (Cancelar, Apagar), depois o "apagando",
 * depois o resultado com Desfazer. Nada em volta pula de lugar.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **Só a largura anda.** Cada rosto fica na largura natural, encostado na
 *    borda de início, e a pílula revela o resto conforme a mola abre. Texto
 *    nunca escala, nunca espreme, nunca sai da linha de base. Crescer tem um
 *    pouco de vida; encolher assenta sem passar do ponto.
 * 2. **Um clique colado no que abriu a pergunta não responde.** Os primeiros
 *    280 ms depois de abrir ignoram clique e tecla repetida: um duplo clique
 *    ou um Enter segurado nunca apagam nada sem querer.
 * 3. **O foco acompanha o morph, mas só se já estava dentro.** Apagar na
 *    pergunta, a raiz enquanto trabalha, Desfazer no resultado, o gatilho no
 *    repouso. Um tempo esgotado nunca rouba foco de outro lugar da página.
 * 4. **Os tempos esgotam num relógio que pausa.** Ponteiro em cima da peça ou
 *    aba escondida seguram o relógio: ninguém perde o Desfazer porque foi ler
 *    o que estava ao lado.
 * 5. **`onConfirm` pode devolver promessa.** Aí aparece o "apagando"; se a
 *    promessa falhar, o rosto de erro oferece Tentar de novo. Sem promessa, vai
 *    direto pro resultado.
 *
 * Esc cancela a pergunta ou dispensa o resultado; clique fora cancela.
 */

export type ConfirmMorphState = "idle" | "confirming" | "pending" | "done" | "error";

export interface ConfirmMorphProps {
  /** Rótulo em repouso, como "Apagar projeto". */
  label: React.ReactNode;
  /** Ícone antes do rótulo em repouso. */
  icon?: React.ReactNode;
  /** A pergunta, como "Apagar 3 arquivos?". Sem ela, vira o rótulo com interrogação. */
  prompt?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ao lado do giro, enquanto `onConfirm` resolve. */
  pendingLabel?: string;
  doneLabel?: string;
  errorLabel?: string;
  retryLabel?: string;
  undoLabel?: string;
  /** Ao lado do giro, enquanto `onUndo` resolve. */
  undoingLabel?: string;
  /** `danger` pinta o Apagar de destrutivo; `brand` usa a cor da marca, pra ação importante mas reversível. */
  tone?: "danger" | "brand";
  /** Roda ao confirmar. Devolva promessa pra mostrar o "apagando"; rejeição mostra o erro. */
  onConfirm?: () => void | Promise<unknown>;
  /** Se existir, o resultado ganha Desfazer. */
  onUndo?: () => void | Promise<unknown>;
  onCancel?: () => void;
  /** Ms até a pergunta sem resposta voltar ao repouso. 0 desliga. */
  confirmTimeout?: number;
  /** Ms que o resultado fica antes de voltar ao repouso. 0 desliga. */
  resultTimeout?: number;
  disabled?: boolean;
  className?: string;
}

const ARMA_MS = 280;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const CRESCE: Transition = { type: "spring", visualDuration: 0.3, bounce: 0.18 };
const ENCOLHE: Transition = { type: "spring", visualDuration: 0.28, bounce: 0 };

// O rosto novo chega por partes, em ordem de leitura, cada uma limpando um desfoque leve.
const rostoV: Variants = {
  escondido: { opacity: 1 },
  visivel: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
  saindo: { opacity: 0, filter: "blur(2px)", transition: { duration: 0.12 } },
};
const parteV: Variants = {
  escondido: { opacity: 0, filter: "blur(4px)" },
  visivel: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.24, ease: EASE_OUT } },
};
const rostoReduzido: Variants = {
  escondido: { opacity: 0 },
  visivel: { opacity: 1, transition: { duration: 0.14 } },
  saindo: { opacity: 0, transition: { duration: 0.1 } },
};
const parteReduzida: Variants = { escondido: { opacity: 1 }, visivel: { opacity: 1 } };

function Rosto({
  id,
  reduzido,
  onLargura,
  rotuladoPor,
  children,
}: {
  id: ConfirmMorphState;
  reduzido: boolean;
  onLargura: (w: number) => void;
  rotuladoPor?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const presente = useIsPresent();
  React.useLayoutEffect(() => {
    const no = ref.current;
    if (!no) return;
    // `inert` por propriedade: o React 18 não repassa o atributo booleano.
    (no as HTMLElement & { inert: boolean }).inert = !presente;
    if (!presente) return;
    // Largura fracionária, pra mola pousar exatamente na largura natural e a volta pro `auto` não dar salto.
    // Do estilo computado, não do retângulo: dentro de um `transform: scale` (um palco, um preview)
    // o retângulo vem encolhido, e a largura de tela aplicada como largura local cortava o botão.
    const relatar = () => onLargura(parseFloat(getComputedStyle(no).width) || no.offsetWidth);
    relatar();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(relatar);
    obs.observe(no);
    return () => obs.disconnect();
  }, [onLargura, presente]);
  return (
    <motion.div
      ref={ref}
      data-face={id}
      role={rotuladoPor ? "group" : undefined}
      aria-labelledby={rotuladoPor}
      variants={reduzido ? rostoReduzido : rostoV}
      initial="escondido"
      animate="visivel"
      exit="saindo"
      className={cn(
        "flex h-full flex-none items-center gap-0.5 whitespace-nowrap",
        id === "idle" ? "p-0" : "px-1",
        // O rosto que sai deixa o fluxo exatamente onde estava e some enquanto a pílula anda.
        !presente && "pointer-events-none absolute left-0 top-0",
      )}
    >
      {children}
    </motion.div>
  );
}

function Parte({ reduzido, className, children }: { reduzido: boolean; className?: string; children: React.ReactNode }) {
  return (
    <motion.span variants={reduzido ? parteReduzida : parteV} className={cn("inline-flex h-full items-center", className)}>
      {children}
    </motion.span>
  );
}

const BOTAO =
  "inline-flex h-7 items-center rounded-[var(--r-pill)] px-3 font-medium outline-none transition-colors [transition-duration:var(--dur-fast)] focus-visible:[box-shadow:var(--focus)]";

export function ConfirmMorph({
  label,
  icon,
  prompt,
  confirmLabel = "Apagar",
  cancelLabel = "Cancelar",
  pendingLabel = "Apagando",
  doneLabel = "Apagado",
  errorLabel = "Não deu certo",
  retryLabel = "Tentar de novo",
  undoLabel = "Desfazer",
  undoingLabel = "Restaurando",
  tone = "danger",
  onConfirm,
  onUndo,
  onCancel,
  confirmTimeout = 6000,
  resultTimeout = 5000,
  disabled = false,
  className,
}: ConfirmMorphProps) {
  const reduzido = useReducedMotion() ?? false;
  const uid = React.useId();
  const perguntaId = `${uid}-pergunta`;
  const raiz = React.useRef<HTMLDivElement>(null);

  const [estado, setEstado] = React.useState<ConfirmMorphState>("idle");
  const [tarefa, setTarefa] = React.useState<"confirm" | "undo">("confirm");
  const [aviso, setAviso] = React.useState("");
  const vivo = React.useRef(estado);
  vivo.current = estado;
  const focoPendente = React.useRef(false);
  const rodada = React.useRef(0);
  const perguntouEm = React.useRef(0);

  const ir = React.useCallback((prox: ConfirmMorphState) => {
    if (prox === vivo.current) return;
    const r = raiz.current;
    focoPendente.current = !!r && (r.contains(document.activeElement) || document.activeElement === document.body);
    if (prox === "confirming") perguntouEm.current = performance.now();
    vivo.current = prox;
    setEstado(prox);
  }, []);

  const repousar = React.useCallback(() => {
    rodada.current++;
    ir("idle");
  }, [ir]);

  const executar = React.useCallback(
    async (tipo: "confirm" | "undo") => {
      const fn = tipo === "confirm" ? onConfirm : onUndo;
      const minha = ++rodada.current;
      setTarefa(tipo);
      let res: void | Promise<unknown> | undefined;
      try {
        res = fn?.();
      } catch {
        ir("error");
        setAviso(errorLabel);
        return;
      }
      if (res && typeof (res as Promise<unknown>).then === "function") {
        ir("pending");
        setAviso(tipo === "confirm" ? pendingLabel : undoingLabel);
        try {
          await res;
        } catch {
          if (minha !== rodada.current) return;
          ir("error");
          setAviso(errorLabel);
          return;
        }
        if (minha !== rodada.current) return;
      }
      if (tipo === "undo") {
        ir("idle");
        setAviso("Desfeito");
        return;
      }
      ir("done");
      setAviso(onUndo ? `${doneLabel}. ${undoLabel} disponível.` : doneLabel);
    },
    [doneLabel, errorLabel, ir, onConfirm, onUndo, pendingLabel, undoLabel, undoingLabel],
  );

  const cancelar = React.useCallback(() => {
    onCancel?.();
    repousar();
    setAviso("Cancelado");
  }, [onCancel, repousar]);

  /* A forma: uma pílula cuja largura anda até o rosto atual. Em repouso é `auto`, então renderiza certo antes de hidratar. */
  const largura = useMotionValue<number | "auto">("auto");
  const alvo = React.useRef(0);
  const voo = React.useRef(0);
  const onLargura = React.useCallback(
    (w: number) => {
      if (Math.abs(w - alvo.current) < 0.25) return;
      const de = alvo.current;
      alvo.current = w;
      if (!de || reduzido) {
        voo.current++;
        largura.jump("auto");
        return;
      }
      const agora = largura.get();
      if (agora === "auto") largura.jump(de);
      const meu = ++voo.current;
      animate(largura, w, w > (typeof agora === "number" ? agora : de) ? CRESCE : ENCOLHE).then(() => {
        if (meu === voo.current) largura.jump("auto");
      });
    },
    [reduzido, largura],
  );

  /* O relógio invisível dos tempos esgotados. Ponteiro em cima ou aba escondida seguram. */
  const relogio = useMotionValue(1);
  const controle = React.useRef<AnimationPlaybackControls | null>(null);
  const seguras = React.useRef({ hover: false, oculta: false });
  const prazo = estado === "confirming" ? confirmTimeout : estado === "done" || estado === "error" ? resultTimeout : 0;
  const esgotar = React.useRef(() => {});
  esgotar.current = () => (vivo.current === "confirming" ? cancelar() : repousar());
  const sincronizar = React.useCallback(() => {
    const c = controle.current;
    if (!c) return;
    if (seguras.current.hover || seguras.current.oculta) c.pause();
    else c.play();
  }, []);
  React.useEffect(() => {
    if (!prazo) return;
    relogio.jump(1);
    const c = animate(relogio, 0, { duration: prazo / 1000, ease: "linear" });
    controle.current = c;
    c.then(() => {
      if (controle.current === c) {
        controle.current = null;
        esgotar.current();
      }
    });
    sincronizar();
    return () => {
      if (controle.current === c) controle.current = null;
      c.stop();
    };
  }, [relogio, estado, sincronizar, prazo]);
  React.useEffect(() => {
    const vis = () => {
      seguras.current.oculta = document.hidden;
      sincronizar();
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [sincronizar]);

  // Clique fora responde "não".
  React.useEffect(() => {
    if (estado !== "confirming") return;
    const baixo = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) cancelar();
    };
    document.addEventListener("pointerdown", baixo);
    return () => document.removeEventListener("pointerdown", baixo);
  }, [cancelar, estado]);

  React.useLayoutEffect(() => {
    if (!focoPendente.current) return;
    focoPendente.current = false;
    const r = raiz.current;
    if (!r) return;
    const alvoFoco = r.querySelector<HTMLElement>(`[data-face="${estado}"] [data-autofocus]:not(:disabled)`);
    (alvoFoco ?? r).focus({ preventScroll: true });
  }, [estado]);

  const responder = () => {
    if (performance.now() - perguntouEm.current < ARMA_MS) return;
    void executar("confirm");
  };

  const perguntaVista = prompt ?? <>{label}?</>;
  const secundario = cn(BOTAO, "text-foreground hover:bg-muted");

  const rosto = (() => {
    switch (estado) {
      case "confirming":
        return (
          <>
            <Parte reduzido={reduzido} className="pl-2.5 pr-1.5 font-medium">
              <span id={perguntaId}>{perguntaVista}</span>
            </Parte>
            <Parte reduzido={reduzido}>
              <button type="button" className={secundario} onClick={cancelar}>
                {cancelLabel}
              </button>
            </Parte>
            <Parte reduzido={reduzido}>
              <button
                type="button"
                data-autofocus
                onClick={responder}
                onKeyDown={(e) => e.repeat && e.preventDefault()}
                className={cn(
                  BOTAO,
                  tone === "danger"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-[var(--brand)] text-[var(--brand-foreground)] hover:opacity-90",
                )}
              >
                {confirmLabel}
              </button>
            </Parte>
          </>
        );
      case "pending":
        return (
          <Parte reduzido={reduzido} className="gap-2 px-2.5">
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin text-muted-foreground motion-reduce:[animation-duration:2.4s]"
              strokeWidth={1.75}
            />
            <span>{tarefa === "undo" ? undoingLabel : pendingLabel}</span>
          </Parte>
        );
      case "done":
        return (
          <>
            <Parte reduzido={reduzido} className="gap-2 px-2.5">
              <motion.span
                aria-hidden="true"
                className="grid place-items-center text-foreground"
                initial={reduzido ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", visualDuration: 0.2, bounce: 0.3 }}
              >
                <CircleCheck className="size-4" strokeWidth={1.75} />
              </motion.span>
              <span>{doneLabel}</span>
            </Parte>
            {onUndo && (
              <Parte reduzido={reduzido}>
                <button type="button" data-autofocus className={secundario} onClick={() => void executar("undo")}>
                  {undoLabel}
                </button>
              </Parte>
            )}
          </>
        );
      case "error":
        return (
          <>
            <Parte reduzido={reduzido} className="gap-2 px-2.5">
              <CircleAlert aria-hidden="true" className="size-4 text-destructive" strokeWidth={1.75} />
              <span>{errorLabel}</span>
            </Parte>
            <Parte reduzido={reduzido}>
              <button type="button" data-autofocus className={secundario} onClick={() => void executar(tarefa)}>
                {retryLabel}
              </button>
            </Parte>
          </>
        );
      default:
        return (
          <Parte reduzido={reduzido}>
            <button
              type="button"
              data-autofocus
              disabled={disabled}
              onClick={() => {
                setAviso(typeof perguntaVista === "string" ? perguntaVista : "");
                ir("confirming");
              }}
              className="inline-flex h-full items-center gap-2 rounded-[var(--r-pill)] pl-3.5 pr-4 font-medium text-foreground outline-none transition-colors [transition-duration:var(--dur-fast)] hover:bg-muted focus-visible:[box-shadow:var(--focus)] disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
            >
              {icon && (
                <span aria-hidden="true" className="grid size-4 place-items-center text-muted-foreground [&_svg]:size-4">
                  {icon}
                </span>
              )}
              <span>{label}</span>
            </button>
          </Parte>
        );
    }
  })();

  return (
    <div
      ref={raiz}
      tabIndex={-1}
      data-state={estado}
      aria-busy={estado === "pending" || undefined}
      className={cn("relative inline-flex min-w-0 max-w-full align-middle text-sm text-foreground outline-none", className)}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        if (estado === "confirming") {
          e.preventDefault();
          e.stopPropagation();
          cancelar();
        } else if (estado === "done" || estado === "error") {
          e.preventDefault();
          e.stopPropagation();
          repousar();
        }
      }}
      onPointerEnter={() => {
        seguras.current.hover = true;
        sincronizar();
      }}
      onPointerLeave={() => {
        seguras.current.hover = false;
        sincronizar();
      }}
    >
      {/* A borda é um contorno por cima (after), pra nunca entrar na medida da largura. */}
      <motion.div
        style={{ width: largura }}
        className="relative flex h-9 max-w-full justify-start overflow-clip rounded-[var(--r-pill)] bg-card [box-shadow:var(--e-raised)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-border after:content-['']"
      >
        <AnimatePresence initial={false}>
          <Rosto
            key={estado}
            id={estado}
            reduzido={reduzido}
            onLargura={onLargura}
            rotuladoPor={estado === "confirming" ? perguntaId : undefined}
          >
            {rosto}
          </Rosto>
        </AnimatePresence>
      </motion.div>
      <span className="sr-only" role="status" aria-live="polite">
        {aviso}
      </span>
    </div>
  );
}

export default ConfirmMorph;
