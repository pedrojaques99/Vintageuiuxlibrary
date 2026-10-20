"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Papéis voando de uma pasta para outra — o loader de transferência.
 *
 * Existe para uma classe específica de espera: quando o sistema está MOVENDO
 * algo (importar, extrair, converter, sincronizar). Um spinner nesse caso não
 * conta nada; a metáfora da pasta conta a operação inteira sem uma palavra, e o
 * usuário entende que fechar a aba interrompe algo.
 *
 * Três papéis com delay escalonado (0 / .35 / .7 de um loop de 1.2s) dão fluxo
 * contínuo com uma única animação declarada. Mais que três vira confete.
 *
 * A parábola (`y` sobe e volta) importa: linha reta lê como barra de progresso
 * disfarçada; o arco lê como objeto atravessando espaço.
 *
 * Sem cor própria: a pasta usa `currentColor` (default: `--muted-foreground`,
 * neutra; passe `className="text-..."` pra tingir) e o papel os
 * tokens de superfície, então o loader troca de marca junto com o tema.
 *
 * `prefers-reduced-motion`: papéis parados no meio do trajeto, texto e barra
 * (que são informação real) intactos.
 */
export function PaperShuttle({
  progress,
  label,
  className,
}: {
  /** 0–100. Omitido ⇒ modo indeterminado, só o rótulo. */
  progress?: number;
  /** Texto sob a animação. Default: "Transferindo" (com a porcentagem ao lado) ou "Processando…". */
  label?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  // Grampeado uma vez só: antes a barra respeitava o limite e o número não, então
  // um `progress={130}` desenhava a barra cheia com "130%" escrito embaixo.
  const pct = progress == null ? null : Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("text-muted-foreground", className)} role="status" aria-live="polite">
      <div className="relative mx-auto h-[64px] w-[200px]">
        <div className="absolute bottom-0 left-0">
          <Folder open />
        </div>
        <div className="absolute bottom-0 right-0">
          <Folder />
        </div>

        <div className="pointer-events-none absolute inset-0">
          {[0, 0.35, 0.7].map((delay) => (
            <motion.div
              key={delay}
              className="absolute left-[14px] top-[6px]"
              initial={{ x: 0, y: 20, opacity: 0, rotate: -5 }}
              animate={
                reduced
                  ? { x: 70, y: -6, opacity: 1, rotate: -8 }
                  : {
                      x: [0, 50, 110, 150],
                      y: [20, -8, -4, 22],
                      opacity: [0, 1, 1, 0],
                      rotate: [-5, -18, 12, 5],
                    }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      duration: 1.2,
                      repeat: Infinity,
                      delay,
                      ease: "easeInOut",
                    }
              }
            >
              <Sheet />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-4 w-[200px]">
        {pct != null && (
          <div
            className="h-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className="h-full rounded-full bg-[var(--brand,var(--foreground))]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        )}
        {/* A linha é `aria-hidden` porque ela muda a cada quadro de progresso: numa
            região viva o leitor de tela leria "41%, 43%, 45%" sem parar. O que a
            região anuncia é o rótulo, a frase que de fato muda de sentido.
            Texto comum, sem ruído de máquina: a peça é genérica de propósito e
            herda a voz da interface onde for instalada. */}
        <p
          aria-hidden="true"
          className="mt-2 flex items-baseline justify-between gap-3 text-xs text-muted-foreground"
        >
          <span className="truncate">{label ?? (pct != null ? "Transferindo" : "Processando…")}</span>
          {pct != null ? <span className="tabular-nums text-foreground">{Math.round(pct)}%</span> : null}
        </p>
        <span className="sr-only">{label ?? "Processando"}</span>
      </div>
    </div>
  );
}

/** Pasta suspensa. `open` = a de origem (aba levantada, boca visível). */
function Folder({ open }: { open?: boolean }) {
  return (
    <svg width="40" height="34" viewBox="0 0 40 34" fill="none" aria-hidden="true">
      {open ? (
        <>
          <rect
            x="0"
            y="8"
            width="36"
            height="24"
            rx="1"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M0 8 L14 8 L17 3 L36 3 L36 8"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.75"
          />
          {/* faixa mais escura = a boca da pasta, o que dá o volume */}
          <rect
            x="0"
            y="8"
            width="36"
            height="4"
            fill="var(--foreground)"
            opacity="0.15"
          />
        </>
      ) : (
        <>
          <rect
            x="2"
            y="10"
            width="36"
            height="22"
            rx="1"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M2 10 L16 10 L19 5 L38 5 L38 10"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.75"
          />
        </>
      )}
    </svg>
  );
}

/** Folha com canto dobrado — o dobrado é o que a faz ler como papel em 20px. */
function Sheet() {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
      <path
        d="M1 1 H13 L19 7 V23 H1 Z"
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="1.2"
      />
      <path
        d="M13 1 V7 H19"
        fill="var(--muted)"
        stroke="var(--border)"
        strokeWidth="1.2"
      />
      <g stroke="var(--muted-foreground)" strokeWidth="1" opacity="0.5">
        <line x1="4" y1="11" x2="16" y2="11" />
        <line x1="4" y1="14" x2="16" y2="14" />
        <line x1="4" y1="17" x2="12" y2="17" />
      </g>
    </svg>
  );
}
