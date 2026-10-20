"use client";

/**
 * Três atividades que costumam morar numa ilha: uma ligação em curso, um timer
 * e uma música. Os chips embaixo trocam a atividade (a ilha morfa de uma forma
 * pra outra); tocar na ilha abre os controles, tocar no vazio dela recolhe.
 *
 * O relógio é de verdade e corre nos dois tamanhos, pra mostrar que abrir e
 * fechar não reinicia nada: a ilha só muda de forma em volta do mesmo estado.
 */

import * as React from "react";
import {
  Mic,
  MicOff,
  Music2,
  Pause,
  Phone,
  PhoneOff,
  Play,
  SkipForward,
  Timer,
} from "lucide-react";

import { Chip } from "../../../registry/visant/ui/chip";
import { DynamicIsland } from "../../../registry/visant/ui/dynamic-island";
import type { DemoProps } from "../catalog";

type Atividade = "chamada" | "timer" | "musica";

const NOMES: Record<Atividade, string> = {
  chamada: "Ligação",
  timer: "Timer",
  musica: "Música",
};

const relogio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Botão redondo do miolo aberto. `marca` pinta com a cor do cliente. */
function Controle({
  marca,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { marca?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={
        "grid size-10 place-items-center rounded-[var(--r-pill)] outline-none transition-[background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:[box-shadow:var(--focus)] [&_svg]:size-[18px] " +
        (marca
          ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
          : "bg-background/15 text-background hover:bg-background/25") +
        (className ? ` ${className}` : "")
      }
    />
  );
}

export default function DynamicIslandDemo({ props }: DemoProps) {
  const [atividade, setAtividade] = React.useState<Atividade>("timer");
  const [aberta, setAberta] = React.useState(false);
  const [segundos, setSegundos] = React.useState(296);
  const [ligacao, setLigacao] = React.useState(42);
  const [pausado, setPausado] = React.useState(false);
  const [tocando, setTocando] = React.useState(true);
  const [mudo, setMudo] = React.useState(false);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      if (!pausado) setSegundos((s) => (s > 0 ? s - 1 : 300));
      setLigacao((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [pausado]);

  const icone = {
    chamada: <Phone />,
    timer: <Timer />,
    musica: <Music2 />,
  }[atividade];

  const compacto = (
    <div className="flex h-9 w-44 items-center justify-between px-3 text-sm tabular-nums [&_svg]:size-4">
      {icone}
      <span>
        {atividade === "chamada" && relogio(ligacao)}
        {atividade === "timer" && relogio(segundos)}
        {atividade === "musica" && (tocando ? "Tocando" : "Pausada")}
      </span>
    </div>
  );

  const aberto = (
    <div className="flex w-80 items-center gap-3 p-3">
      {atividade === "chamada" && (
        <>
          <div className="grid size-10 place-items-center rounded-[var(--r-pill)] bg-background/15 text-sm font-medium">
            MC
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Marina Costa</p>
            <p className="text-xs tabular-nums text-background/60">{relogio(ligacao)}</p>
          </div>
          <Controle aria-label={mudo ? "Ligar microfone" : "Silenciar"} onClick={() => setMudo((m) => !m)}>
            {mudo ? <MicOff /> : <Mic />}
          </Controle>
          <Controle marca aria-label="Desligar" onClick={() => setAberta(false)}>
            <PhoneOff />
          </Controle>
        </>
      )}
      {atividade === "timer" && (
        <>
          <Controle marca aria-label={pausado ? "Continuar" : "Pausar"} onClick={() => setPausado((p) => !p)}>
            {pausado ? <Play /> : <Pause />}
          </Controle>
          <p className="flex-1 text-sm text-background/60">Foco</p>
          <p className="text-4xl font-medium leading-none tabular-nums">{relogio(segundos)}</p>
        </>
      )}
      {atividade === "musica" && (
        <>
          <div className="grid size-10 place-items-center rounded-[var(--r-control)] bg-background/15 [&_svg]:size-[18px]">
            <Music2 />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Noite de estrada</p>
            <p className="truncate text-xs text-background/60">Trio Aurora</p>
          </div>
          <Controle aria-label={tocando ? "Pausar" : "Tocar"} onClick={() => setTocando((t) => !t)}>
            {tocando ? <Pause /> : <Play />}
          </Controle>
          <Controle aria-label="Próxima">
            <SkipForward />
          </Controle>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8">
      <div className="flex h-16 items-start justify-center">
        <DynamicIsland
          label={NOMES[atividade]}
          activityKey={atividade}
          compact={compacto}
          expanded={aberta}
          onExpandedChange={setAberta}
          {...props}
        >
          {aberto}
        </DynamicIsland>
      </div>

      <div className="flex gap-2">
        {(Object.keys(NOMES) as Atividade[]).map((a) => (
          <Chip key={a} pressed={atividade === a} onClick={() => setAtividade(a)}>
            {NOMES[a]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
