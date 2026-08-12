import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Empty State — o estado vazio da casa, com a imagem trabalhando.
 *
 * ── Por que isto é um item, e não uma `<div>` que cada tela escreve ────────
 *
 * Na origem eram quatro rotas com quatro caixas `card px-6 py-12 text-center`
 * escritas à mão, cada uma com uma frase e mais nada. Quatro caixas iguais é
 * uma caixa duplicada quatro vezes: bastava alguém melhorar uma pras outras
 * três ficarem pra trás. E o vazio é justamente a tela que ninguém volta pra
 * melhorar, porque em desenvolvimento quase nunca se vê.
 *
 * A regra de entrada do registry exige estado vazio em todo item. Faltava o
 * estado vazio **canônico**.
 *
 * ── Por que a arte entra AQUI e não no meio do conteúdo ────────────────────
 *
 * Estado vazio é o único momento em que a tela não tem o que mostrar e ainda
 * precisa dizer o que vai acontecer ali. É a superfície onde a imagem trabalha
 * em vez de enfeitar. Com conteúdo na tela, a mesma imagem viraria concorrente
 * do que a pessoa veio ver.
 *
 * O véu sobre a arte não é decoração: sem ele o texto fica legível em três das
 * cinco imagens — as que têm luz de janela — e ninguém descobre isso até um
 * cliente reclamar. Contraste garantido custa uma `<div>`.
 *
 * ── A anatomia, e as duas coisas que ela deliberadamente NÃO faz ───────────
 *
 * `arte → eyebrow → título → corpo → ação`, e no máximo **uma** ação. Vazio com
 * três botões não é ajuda, é a interface passando pra frente a decisão que ela
 * não soube tomar.
 *
 * · **Sem tombo, sem tilt.** Aqui a imagem é fundo de uma mensagem, não objeto
 *   pra pegar na mão, e fundo torto atrapalha a leitura da frase por cima.
 * · **A imagem entra por slot.** Cada app tem o seu componente de imagem
 *   otimizada; um item que impõe `<img>` cru obriga o consumidor a abrir mão
 *   dele. Sem `art`, o vazio ainda funciona — vira a caixa de texto centrada,
 *   que é o piso honesto.
 */

// `title` é ReactNode aqui, e o `title` do DOM é string (a tooltip nativa).
// Omitir é o certo: aceitar os dois nomes no mesmo lugar faria o consumidor
// escrever um e receber o outro.
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Slot da arte. `next/image`, `<img>`, ou um `@visant/cover-art`. */
  art?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Uma frase que diz o que vai aparecer ali, não que lamenta a ausência. */
  children?: React.ReactNode;
  /** UMA ação. Ver a nota acima. */
  action?: React.ReactNode;
}

export function EmptyState({
  art,
  eyebrow,
  title,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--r-surface)] border border-border bg-card",
        className,
      )}
      {...props}
    >
      {art && (
        <div className="relative">
          {art}
          {/* Contraste garantido sobre qualquer arte. Ver a nota do véu. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, color-mix(in oklch, var(--card) 20%, transparent), var(--card) 96%)",
            }}
          />
        </div>
      )}

      <div className={cn("relative px-6 pb-10 text-center", art ? "-mt-6 pt-0" : "pt-10")}>
        {eyebrow && (
          <div className="mb-2 text-[length:var(--text-rotulo,0.72rem)] uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        {children && (
          <div className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {children}
          </div>
        )}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
