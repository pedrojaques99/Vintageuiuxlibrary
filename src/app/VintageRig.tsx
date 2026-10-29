"use client";

/**
 * Rig vintage: o kit montado como um rack de estúdio de exemplo.
 *
 * O dono leu a versão anterior do mesmo jeito que a página que vende: cinco
 * trechos com legenda ("01 fonte", "02 ganho"...) e notas explicando o que
 * olhar. Aqui é um rack: quatro unidades parafusadas uma em cima da outra, como
 * num estúdio, com o monitor no alto e o canal, o tom e o sampler embaixo. A
 * única escrita é serigrafia de painel. Quem quer o nome da peça passa o mouse
 * (camada de inspeção, `kits/sala.tsx`), peça por peça.
 *
 * A cadeia continua LIGADA (`kits/rig-sinal.ts`): o fader e o DRIVE fazem o
 * nível, o nível move o ponteiro do VU e acende o CLIP, e o EQ, os knobs de tom
 * e o XY pad moldam o traço do osciloscópio. Mexer embaixo muda em cima.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

import { VintageKnob } from "../../registry/vintage/ui/vintage-knob";
import { VintageLargeKnob } from "../../registry/vintage/ui/vintage-large-knob";
import { VintageMeter } from "../../registry/vintage/ui/vintage-meter";
import { VintageButton } from "../../registry/vintage/ui/vintage-button";
import { VintageSlider } from "../../registry/vintage/ui/vintage-slider";
import { VintageToggle } from "../../registry/vintage/ui/vintage-toggle";
import { VintageParametricEQ } from "../../registry/vintage/ui/vintage-parametric-eq";
import { VintageLed } from "../../registry/vintage/ui/vintage-led";
import { VintageCommandPalette } from "../../registry/vintage/ui/vintage-command-palette";
import { VintageTvFrame } from "../../registry/vintage/ui/vintage-tv-frame";
import { VintageSoundboardPad } from "../../registry/vintage/ui/vintage-soundboard-pad";
import { VintageXYPad } from "../../registry/vintage/ui/vintage-xy-pad";
import { VintageOscilloscope } from "../../registry/vintage/ui/vintage-oscilloscope";

import { Pecas } from "./kits/sala";
import { usePageVisible, useElementWidth, useInView } from "./stage";
import { PAD_VOICES, SCOPE_PHOSPHOR, SCOPE_SAMPLES } from "./demo-fixtures";
import {
  CORTE,
  ROTULO_DE_FONTE,
  TOM_NEUTRO,
  nivelDe,
  preencherOnda,
  respiro,
  type Fonte,
  type Tom,
} from "./kits/rig-sinal";

/** Abaixo disto o traço do osciloscópio deixa de ser onda e vira um risco. */
const PISO_DO_TUBO = 260;

/** Uma casa decimal, vírgula brasileira. O nível é lido, não contado. */
const NUM = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/* -------------------------------------------------------------------------- */
/* chrome da bancada                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Rótulo de sub-grupo dentro de um faceplate.
 *
 * Mono e miúdo de propósito: quem tem de gritar aqui é o instrumento. Os nove
 * títulos em Orbitron da versão anterior tinham mais peso tipográfico que o
 * ponteiro do VU, e numa bancada isso é o mesmo que serigrafar o painel inteiro
 * em caixa alta e esperar que alguém ache o botão.
 */
function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-vintage-mono text-rotulo uppercase tracking-[0.18em] text-[var(--vintage-text-muted)]">
      {children}
    </p>
  );
}

/** Parafuso de orelha de rack. Só desenho, nenhum texto. */
function Parafuso() {
  return (
    <span
      aria-hidden="true"
      className="block size-3 rounded-full border border-[var(--vintage-border)] bg-[radial-gradient(circle_at_35%_35%,var(--vintage-metal-light),var(--vintage-metal-dark))]"
    />
  );
}

/**
 * Uma unidade de rack: orelhas com parafuso, faceplate de metal e a placa de
 * modelo serigrafada no canto. É a moldura que um aparelho de verdade tem, e a
 * única desta sala.
 */
function Rack({
  modelo,
  nome,
  id,
  className,
  children,
}: {
  modelo: string;
  nome: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={nome}
      className={cn(
        "flex overflow-hidden rounded-[6px] border border-[var(--vintage-border)]",
        "bg-[linear-gradient(180deg,var(--vintage-surface-2),var(--vintage-surface-1))]",
        "[box-shadow:0_1px_0_color-mix(in_oklab,var(--vintage-metal-light)_25%,transparent)_inset,0_18px_40px_-24px_color-mix(in_oklab,var(--vintage-surface-1)_90%,transparent)]",
        className,
      )}
    >
      <div className="hidden w-7 shrink-0 flex-col items-center justify-between border-r border-[var(--vintage-border)] bg-[var(--vintage-surface-3)] py-3 sm:flex">
        <Parafuso />
        <Parafuso />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 px-5 pt-3 sm:px-7">
          <span className="font-vintage-display text-apoio tracking-[0.12em] text-[var(--vintage-label)]">
            {modelo}
          </span>
          <span className="font-vintage-mono text-micro uppercase tracking-[0.2em] text-[var(--vintage-text-dim)]">
            {nome}
          </span>
        </div>
        {children}
      </div>
      <div className="hidden w-7 shrink-0 flex-col items-center justify-between border-l border-[var(--vintage-border)] bg-[var(--vintage-surface-3)] py-3 sm:flex">
        <Parafuso />
        <Parafuso />
      </div>
    </section>
  );
}

/**
 * Container que deixa o instrumento largo rolar de lado em vez de estourar a
 * página.
 *
 * O EQ gráfico tem 472px fixos e o chassi da TV, 400. A 390px de viewport
 * qualquer um dos dois empurra o documento e o celular inteiro passa a rolar na
 * horizontal. Encolher por `scale` deixaria a serigrafia em 6px, que é pior:
 * rolar de lado é chato, ilegível é inútil.
 */
function Trilho({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 medição — o traço                                                        */
/* -------------------------------------------------------------------------- */

/**
 * O osciloscópio e o relógio que o alimenta.
 *
 * Fica num componente próprio por causa de re-render: o buffer é preenchido no
 * lugar e o `vintage-oscilloscope` o lê por ref dentro do próprio rAF, então o
 * traço anda a 30fps **sem** que a bancada re-renderize. Os parâmetros de tom
 * entram por ref pelo mesmo motivo: mudar o EQ não pode custar um ciclo de
 * React por quadro.
 *
 * `ativo` desliga o relógio E desmonta o canvas. Desligar só o relógio não
 * bastaria: o rAF do componente continuaria desenhando o último quadro para
 * sempre com a sala fora da tela.
 */
function Traco({
  ativo,
  amplitude,
  tom,
}: {
  ativo: boolean;
  amplitude: number;
  tom: Tom;
}) {
  const [medida, largura] = useElementWidth<HTMLDivElement>();
  const buffer = React.useRef(new Float32Array(SCOPE_SAMPLES));
  const vivo = React.useRef({ amplitude, tom });
  vivo.current = { amplitude, tom };

  React.useEffect(() => {
    if (!ativo) return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.05;
      preencherOnda(buffer.current, t, vivo.current.amplitude, vivo.current.tom);
    }, 33);
    return () => clearInterval(id);
  }, [ativo]);

  // O tubo ocupa a largura que sobrou, com piso para não virar um risco.
  const w = Math.max(PISO_DO_TUBO, Math.min(560, Math.round(largura) || PISO_DO_TUBO));

  /*
   * `min-w` igual ao piso, e não `min-w-0`.
   *
   * Com `flex-1 min-w-0` o container encolhia para os 138px que sobravam ao
   * lado do VU num celular, o canvas mantinha os 260px de piso e a página
   * inteira passava a rolar de lado (121px de estouro medidos a 390px). Com o
   * piso declarado como largura mínima, a linha quebra antes: o tubo desce para
   * baixo do VU e usa a faixa inteira, que é o que uma ponte de medidores faz
   * quando o rack é estreito.
   */
  return (
    <div ref={medida} className="min-w-[16.25rem] max-w-full flex-1 overflow-hidden">
      {ativo ? (
        <VintageOscilloscope
          data={buffer.current}
          color={SCOPE_PHOSPHOR}
          width={w}
          height={180}
        />
      ) : (
        <div style={{ width: w, height: 180, maxWidth: "100%" }} aria-hidden />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 medição — a ponte de medidores                                           */
/* -------------------------------------------------------------------------- */

/**
 * A leitura da bancada: número, régua, ponteiro e lâmpadas.
 *
 * O nível vive aqui, e não na sala, porque ele muda 10 vezes por segundo. Com o
 * estado no topo, cada tique re-renderizava os treze controles, inclusive o
 * knob que a pessoa está arrastando naquele instante.
 *
 * A anatomia é a da casa, na ordem: rótulo, valor, qualificador, evidência. O
 * qualificador ("de 10, corta em 8,5") existe porque "6,4" sozinho não é
 * informação, e porque o CLIP não pode ser a única coisa que conta onde é o
 * limite: cor sozinha obriga a decorar a legenda.
 */
function Medicao({
  ativo,
  ligado,
  mute,
  bypass,
  fonte,
  ganho,
  drive,
  disparos,
  tom,
}: {
  ativo: boolean;
  ligado: boolean;
  mute: boolean;
  bypass: boolean;
  fonte: Fonte;
  ganho: number;
  drive: number;
  /** Contador de pads disparados. Cada mudança injeta um transiente. */
  disparos: number;
  tom: Tom;
}) {
  const [nivel, setNivel] = React.useState(0);
  const transiente = React.useRef(0);
  const cadeia = React.useRef({ ligado, mute, fonte, ganho, drive });
  cadeia.current = { ligado, mute, fonte, ganho, drive };

  // O pad é um golpe, não um estado: sobe o nível de uma vez e decai no relógio.
  React.useEffect(() => {
    if (disparos > 0) transiente.current = 1;
  }, [disparos]);

  React.useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => {
      transiente.current *= 0.82;
      setNivel(respiro(nivelDe({ ...cadeia.current, transiente: transiente.current })));
    }, 100);
    return () => clearInterval(id);
  }, [ativo]);

  const estourou = nivel > CORTE;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
      <div className="min-w-[8.5rem]">
        <Etiqueta>saída</Etiqueta>
        <p
          className="mt-1.5 font-vintage-display text-[2.75rem] leading-none tabular-nums text-[var(--vintage-value)]"
          aria-live="off"
        >
          {NUM.format(nivel)}
        </p>
        <p className="mt-1.5 font-vintage-mono text-apoio text-[var(--vintage-text-dim)]">
          de 10, corta em {NUM.format(CORTE)}
        </p>
        <Pecas nomes={["vintage-led"]} canto="base-inicio" className="mt-5 w-fit">
          <div className="flex gap-3.5">
            <VintageLed color="green" active={ligado} label="PWR" />
            <VintageLed color="yellow" active={bypass} label="BYP" />
            <VintageLed color="orange" active={mute} label="MUTE" />
            <VintageLed color="red" active={estourou} label="CLIP" />
          </div>
        </Pecas>
      </div>

      <Pecas nomes={["vintage-meter"]}>
        <VintageMeter label="SIGNAL" value={nivel} />
      </Pecas>

      <Pecas nomes={["vintage-oscilloscope"]} className="min-w-[16.25rem] max-w-full flex-1">
        <Traco ativo={ativo} amplitude={nivel / 10} tom={bypass ? TOM_NEUTRO : tom} />
      </Pecas>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* a bancada                                                                   */
/* -------------------------------------------------------------------------- */

export default function VintageRig() {
  const [ligado, setLigado] = React.useState(true);
  const [mute, setMute] = React.useState(false);
  const [bypass, setBypass] = React.useState(false);
  const [fonte, setFonte] = React.useState<Fonte>("up");

  const [ganho, setGanho] = React.useState(5);
  const [drive, setDrive] = React.useState(5);

  const [grave, setGrave] = React.useState(5);
  const [agudo, setAgudo] = React.useState(5);
  const [bandas, setBandas] = React.useState<number[]>(() => Array(6).fill(5));
  const [xy, setXy] = React.useState({ x: 0.35, y: 0.2 });

  const [padsAtivos, setPadsAtivos] = React.useState<Set<number>>(new Set());
  const [disparos, setDisparos] = React.useState(0);
  const [paleta, setPaleta] = React.useState(false);

  /*
   * Os dois relógios da bancada (nível e traço) param com a aba escondida E com
   * a sala fora da tela. `rootMargin` generoso porque quem chega rolando devolve
   * o instrumento já andando, e não um canvas preto que acorda meio segundo
   * depois.
   */
  const [alvo, naTela] = useInView<HTMLDivElement>("200px");
  const aba = usePageVisible();
  const ativo = naTela && aba;

  const tom: Tom = React.useMemo(
    () => ({
      grave,
      agudo,
      medio: bandas.reduce((s, v) => s + v, 0) / bandas.length,
      filtro: xy.x,
      cauda: xy.y,
    }),
    [grave, agudo, bandas, xy],
  );

  /*
   * ⌘K/ctrl+K abre a paleta. Seta NÃO entra aqui: o `KitRoom` só atravessa as
   * salas com o foco em nada, justamente para o knob e o fader ficarem com as
   * teclas deles, e um segundo ouvinte global de seta desfaria esse acordo.
   */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaleta((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const irPara = React.useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div ref={alvo} className="mx-auto flex max-w-6xl flex-col gap-2.5">
      {/* A tampa do rack: a etiqueta do estúdio e a tecla que abre a paleta. */}
      <div className="flex items-center gap-3 px-1 pb-1">
        <span className="font-vintage-mono text-micro uppercase tracking-[0.24em] text-[var(--vintage-text-dim)]">
          estúdio b · rack 2
        </span>
        <Pecas nomes={["vintage-command-palette"]} canto="base-fim" className="ml-auto">
          <button
            type="button"
            onClick={() => setPaleta(true)}
            aria-label="Abrir a paleta de módulos"
            className="alvo-toque inline-flex items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-[var(--vintage-border)] bg-[var(--vintage-surface-3)] px-3 py-1.5 font-vintage-mono text-micro uppercase tracking-[0.14em] text-[var(--vintage-text-muted)] outline-none transition-[color,border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--vintage-label)] hover:text-[var(--vintage-label)] focus-visible:[box-shadow:var(--focus)]"
          >
            <kbd className="font-vintage-mono">⌘K</kbd>
            módulos
          </button>
        </Pecas>
      </div>

      {/* monitor: o que sai, no alto, onde o olho está */}
      <Rack id="medicao" modelo="VM-2" nome="monitor">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-6 p-5 sm:p-7">
          <Pecas nomes={["vintage-tv-frame"]} className="w-full max-w-[20rem] shrink-0">
            <VintageTvFrame
                title="MONITOR"
                width={320}
                showTimecode="00:12:34"
                signalActive={ligado && !mute}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span
                    className="font-vintage-mono text-corpo font-bold uppercase tracking-[0.15em]"
                    style={{
                      color: SCOPE_PHOSPHOR,
                      textShadow: `0 0 8px color-mix(in oklab, ${SCOPE_PHOSPHOR} 60%, transparent)`,
                    }}
                  >
                    {ligado && !mute ? "NO AR" : "SEM SINAL"}
                  </span>
                  <span
                    className="font-vintage-mono text-micro tracking-[0.1em]"
                    style={{ color: `color-mix(in oklab, ${SCOPE_PHOSPHOR} 35%, transparent)` }}
                  >
                    CH 01 {ROTULO_DE_FONTE[fonte]}
                  </span>
                </div>
            </VintageTvFrame>
          </Pecas>
          <div className="min-w-0 flex-1">
            <Medicao
              ativo={ativo}
              ligado={ligado}
              mute={mute}
              bypass={bypass}
              fonte={fonte}
              ganho={ganho}
              drive={drive}
              disparos={disparos}
              tom={tom}
            />
          </div>
        </div>
      </Rack>

      {/* canal: de onde entra e o quanto entra */}
      <Rack id="ganho" modelo="CS-1" nome="canal">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-8 p-5 sm:p-7">
          <Pecas nomes={["vintage-toggle"]} className="pl-14 pt-8">
            <div id="fonte">
              <VintageToggle
                title="FONTE"
                labels={["LINE", "MIC", "INST"]}
                position={fonte}
                onChange={setFonte}
              />
            </div>
          </Pecas>

          <Pecas nomes={["vintage-large-knob"]} className="max-w-full">
            <div title="Arraste pra cima e pra baixo; com shift, o ajuste fica fino.">
              <Trilho>
                <VintageLargeKnob label="DRIVE" value={drive} onChange={setDrive} />
              </Trilho>
            </div>
          </Pecas>

          <div className="flex w-full min-w-0 max-w-[20rem] flex-col gap-8">
            <Pecas nomes={["vintage-slider"]} className="w-full">
              <VintageSlider label="GAIN" value={ganho} onChange={setGanho} className="w-full" />
            </Pecas>

            <Pecas nomes={["vintage-button"]} className="w-fit">
              <div id="corte" className="flex flex-col gap-3">
                <Etiqueta>corte</Etiqueta>
                <div className="flex flex-wrap items-center gap-5">
                  <VintageButton label="POWER" active={ligado} onClick={() => setLigado((v) => !v)} />
                  <VintageButton label="BYPASS" active={bypass} onClick={() => setBypass((v) => !v)} />
                  <VintageButton label="MUTE" active={mute} onClick={() => setMute((v) => !v)} />
                </div>
              </div>
            </Pecas>
          </div>
        </div>
      </Rack>

      {/* tom: o que molda o traço lá em cima */}
      <Rack id="tratamento" modelo="EQ-6" nome="tom">
        <div
          className={cn(
            "flex flex-wrap items-start gap-x-10 gap-y-8 p-5 sm:p-7",
            // Com BYPASS o tom sai do caminho, e o painel apaga junto.
            bypass && "opacity-45",
          )}
        >
          <Pecas nomes={["vintage-parametric-eq"]} className="max-w-full">
            <Trilho>
              <VintageParametricEQ
                title="PARAMETRIC EQ"
                onChange={(bs) => setBandas(bs.map((b) => 5 + (b.gain / 12) * 5))}
              />
            </Trilho>
          </Pecas>

          <div className="flex flex-wrap items-start gap-x-10 gap-y-8">
            <Pecas nomes={["vintage-knob"]}>
              <div className="flex flex-col gap-4">
                <Etiqueta>tom</Etiqueta>
                <div className="flex items-center gap-8">
                  <VintageKnob label="BASS" value={grave} onChange={setGrave} />
                  <VintageKnob label="TREBLE" value={agudo} onChange={setAgudo} />
                </div>
              </div>
            </Pecas>

            <Pecas nomes={["vintage-xy-pad"]}>
              <div className="flex flex-col gap-4">
                <Etiqueta>filtro · cauda</Etiqueta>
                <VintageXYPad
                  size={176}
                  labelX="FILTRO"
                  labelY="CAUDA"
                  value={xy}
                  onChange={(x, y) => setXy({ x, y })}
                  color="var(--vintage-light)"
                />
              </div>
            </Pecas>
          </div>
        </div>
      </Rack>

      {/* sampler: o golpe que o monitor mede */}
      <Rack id="pads" modelo="SP-8" nome="sampler">
        <div className="p-5 sm:p-7">
          <Pecas nomes={["vintage-soundboard-pad"]} className="w-fit max-w-full">
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
              {PAD_VOICES.map((pad, i) => (
                <VintageSoundboardPad
                  key={pad.label}
                  label={pad.label}
                  color={pad.color}
                  size={68}
                  active={padsAtivos.has(i)}
                  onTrigger={() => {
                    setPadsAtivos((s) => new Set(s).add(i));
                    setDisparos((n) => n + 1);
                  }}
                  onRelease={() =>
                    setPadsAtivos((s) => {
                      const proximo = new Set(s);
                      proximo.delete(i);
                      return proximo;
                    })
                  }
                />
              ))}
            </div>
          </Pecas>
        </div>
      </Rack>

      {paleta && (
        <VintageCommandPalette
          items={[
            { id: "fonte", label: "Seletor de fonte", group: "Sinal", active: true },
            { id: "pads", label: "Sampler", group: "Sinal" },
            { id: "corte", label: "Power, bypass e mute", group: "Sinal" },
            { id: "ganho", label: "Estágio de ganho", group: "Cadeia", active: true },
            { id: "tratamento", label: "Tom: EQ, knobs e XY", group: "Cadeia" },
            { id: "medicao", label: "Monitor e medidores", group: "Saída" },
          ]}
          groups={[
            { label: "Sinal", ids: ["fonte", "pads", "corte"] },
            { label: "Cadeia", ids: ["ganho", "tratamento"] },
            { label: "Saída", ids: ["medicao"] },
          ]}
          onSelect={irPara}
          onClose={() => setPaleta(false)}
          placeholder="Ir para um módulo do rack"
        />
      )}
    </div>
  );
}
