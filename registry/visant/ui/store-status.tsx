"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StoreStatus — "aberto agora" de loja física.
 *
 * Colhido de um concept de e-commerce, e a razão dele existir é uma regra de
 * honestidade, não de UI:
 *
 * **O visitante pode estar em qualquer fuso.** Se você resolver a hora no
 * relógio do navegador, um cliente em Lisboa vê "aberto" com a loja de Londres
 * fechada. A hora é sempre resolvida no fuso DA LOJA, via `Intl`.
 *
 * E o componente **não renderiza nada até o JS confirmar a hora**. Um HTML
 * estático dizendo "aberto" é uma afirmação que ninguém verificou — e no
 * primeiro print de tela errado vira reclamação. Nada na tela é melhor que
 * horário errado na tela.
 *
 * Feriado não é calculável com o dado que a maioria dos clientes tem. Diga isso
 * em texto ao lado (`note`) em vez de fingir precisão.
 *
 * ── O que ele calculava e jogava fora ──────────────────────────────────────
 *
 * A peça já resolvia a hora no fuso certo e devolvia UMA linha: "aberto" ou
 * "fechado". Todo o trabalho caro — a conta que ninguém vê — morria num
 * adjetivo, e o adjetivo sozinho não decide nada: quem lê "aberto" às 17h50
 * pega o carro e chega com a porta fechada, e quem lê "fechado" não sabe se
 * volta em vinte minutos ou na segunda.
 *
 * Agora o mesmo cálculo entrega as três coisas que a pessoa está de fato
 * perguntando:
 *
 * 1. **Quanto falta pra fechar** — e um estado próprio (`closing`) na última
 *    hora, porque "aberto por 8 minutos" e "aberto por 6 horas" não são a mesma
 *    informação e não podem ter a mesma cara.
 * 2. **Quando reabre** — hoje, amanhã ou no próximo dia que `openDays`
 *    permitir. A busca anda dia a dia até achar um aberto, então loja que fecha
 *    domingo e segunda responde "terça" sem ninguém escrever a regra.
 * 3. **Que a resposta é de agora.** O ponto pulsa enquanto está aberto — é o
 *    único jeito de um dado calculado parecer vivo em vez de impresso. Ele
 *    para inteiro em `prefers-reduced-motion`.
 *
 * Tudo em `labels`, e as duas chaves antigas (`open`/`closed`) continuam com a
 * mesma assinatura: quem já traduziu a peça não recebe inglês de volta.
 */

export interface StoreStatusLabels {
  /** Linha principal, aberto. Recebe a hora de fechar. */
  open: (closeHour: number) => string;
  /** Linha principal, fechado. Recebe a hora de abrir. */
  closed: (openHour: number) => string;
  /** Linha de baixo, aberto: quanto falta pra fechar. */
  closesIn: (falta: { horas: number; minutos: number }) => string;
  /** Linha de baixo, fechado: quando reabre. `dia` é `null` quando é hoje. */
  opensAt: (quando: { hora: string; dia: string | null; emDias: number }) => string;
  /** Como a hora cheia se escreve: 9 → "9am". */
  hour: (h: number) => string;
}

export interface StoreStatusProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Fuso IANA da loja, ex.: "Europe/London". */
  timeZone: string;
  openHour?: number;
  closeHour?: number;
  /** Dias abertos, 0 = domingo. Padrão: todos. */
  openDays?: number[];
  /** Locale do nome do dia da semana. */
  locale?: string;
  /** Minutos que fazem o estado virar `closing`. */
  closingSoon?: number;
  labels?: Partial<StoreStatusLabels>;
}

const fmtHour = (h: number) => (h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`);

const PADRAO: StoreStatusLabels = {
  open: () => "Open now",
  closed: () => "Closed",
  closesIn: ({ horas, minutos }) =>
    `Closes in ${horas ? `${horas}h${String(minutos).padStart(2, "0")}` : `${minutos}min`}`,
  opensAt: ({ hora, dia, emDias }) =>
    emDias === 0
      ? `Opens at ${hora}`
      : emDias === 1
        ? `Opens tomorrow at ${hora}`
        : `Opens ${dia} at ${hora}`,
  hour: fmtHour,
};

const DIAS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Leitura {
  estado: "open" | "closing" | "closed";
  /** Minutos até fechar. Só existe com a loja aberta. */
  falta: number;
  /** Em quantos dias reabre, e o nome do dia. Só existe com a loja fechada. */
  emDias: number;
  dia: string | null;
}

export function StoreStatus({
  timeZone,
  openHour = 9,
  closeHour = 17,
  openDays,
  locale = "en-GB",
  closingSoon = 60,
  labels,
  className,
  ...props
}: StoreStatusProps) {
  const [leitura, setLeitura] = React.useState<Leitura | null>(null);
  const texto = { ...PADRAO, ...labels };

  // `openDays` costuma chegar como literal (`[1,2,3]`), que é um array novo a
  // cada render do pai. Comparar pela chave em vez do objeto evita reagendar o
  // relógio sessenta vezes por minuto sem nada ter mudado.
  const chaveDias = openDays?.join(",") ?? "";

  React.useEffect(() => {
    const dias = chaveDias ? chaveDias.split(",").map(Number) : null;

    const ler = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
        weekday: "short",
      }).formatToParts(new Date());

      const hora = Number(parts.find((p) => p.type === "hour")?.value);
      const min = Number(parts.find((p) => p.type === "minute")?.value);
      if (!Number.isFinite(hora) || !Number.isFinite(min)) return;

      const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
      const diaIdx = DIAS.indexOf(wd);
      const hojeAbre = !dias || dias.includes(diaIdx);

      const agora = hora * 60 + min;
      const abre = openHour * 60;
      const fecha = closeHour * 60;

      if (hojeAbre && agora >= abre && agora < fecha) {
        const falta = fecha - agora;
        setLeitura({
          estado: falta <= closingSoon ? "closing" : "open",
          falta,
          emDias: 0,
          dia: null,
        });
        return;
      }

      // Fechado: o próximo dia útil da loja. Anda dia a dia porque a regra é
      // uma lista de dias, não um intervalo — loja que abre só sábado também
      // tem resposta certa aqui.
      let emDias = -1;
      if (hojeAbre && agora < abre) emDias = 0;
      else {
        for (let d = 1; d <= 7; d++) {
          if (!dias || dias.includes((diaIdx + d) % 7)) {
            emDias = d;
            break;
          }
        }
      }

      const dia =
        emDias > 1
          ? new Intl.DateTimeFormat(locale, { timeZone, weekday: "long" }).format(
              new Date(Date.now() + emDias * 86_400_000),
            )
          : null;

      setLeitura({ estado: "closed", falta: 0, emDias, dia });
    };

    ler();
    // Um minuto: é a menor unidade que a peça mostra. Contar segundo a segundo
    // acordaria a aba sessenta vezes pra redesenhar o mesmo texto.
    const t = setInterval(ler, 60_000);
    return () => clearInterval(t);
  }, [timeZone, openHour, closeHour, chaveDias, locale, closingSoon]);

  // Até o JS confirmar, a página não afirma nada.
  if (leitura === null) return null;

  const aberto = leitura.estado !== "closed";

  /*
   * A linha de baixo só aparece se ela puder falar o mesmo idioma da de cima.
   *
   * Quem já traduziu a peça passou `open`/`closed` e nada mais — o padrão das
   * chaves novas é inglês, e cair nele imprimiria "Closes in 2h14" embaixo de
   * "Atende agora". Meia tradução é pior que a linha ausente: a de cima
   * continua sendo a resposta, e a peça volta a ser exatamente o que era antes
   * pra quem não pediu nada.
   */
  const podeDetalhar =
    !(labels?.open || labels?.closed) || Boolean(labels?.closesIn || labels?.opensAt);

  const detalhe = aberto
    ? texto.closesIn({ horas: Math.floor(leitura.falta / 60), minutos: leitura.falta % 60 })
    : texto.opensAt({
        hora: texto.hour(openHour),
        dia: leitura.dia,
        emDias: leitura.emDias,
      });

  return (
    <p
      data-state={leitura.estado}
      className={cn("inline-flex items-center gap-2.5", className)}
      {...props}
    >
      <span aria-hidden="true" className="relative flex size-2 shrink-0">
        {aberto && (
          /* O halo é o que faz a leitura parecer de AGORA. Ele nasce do mesmo
             ponto e some pra fora, então não muda uma linha de layout — e em
             `closing` bate mais rápido, porque a última hora é a informação
             que a pessoa precisa notar sem ler. */
          <span
            className={cn(
              "absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden",
              "bg-[var(--brand)]",
              leitura.estado === "closing" && "[animation-duration:1s]",
            )}
          />
        )}
        <span
          className={cn(
            "relative size-2 rounded-full",
            aberto ? "bg-[var(--brand)]" : "bg-[var(--muted-foreground)]",
          )}
        />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12px] font-bold uppercase leading-none tracking-[0.1em]">
          {aberto ? texto.open(closeHour) : texto.closed(openHour)}
        </span>
        {podeDetalhar && (
          <span className="text-[12px] leading-none text-[var(--muted-foreground)] tabular-nums">
            {detalhe}
          </span>
        )}
      </span>
    </p>
  );
}
