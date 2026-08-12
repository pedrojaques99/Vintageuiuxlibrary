"use client";

/**
 * Rig vintage — a bancada, e não a vitrine das peças da bancada.
 *
 * O que estava errado, e é o mesmo defeito duas vezes:
 *
 * 1. **Nove caixas iguais numa grade 2x2.** Cada módulo era uma `section` com
 *    gradiente, borda e `shadow-2xl`, título em Orbitron e o mesmo respiro em
 *    todo lugar. Cinco das nove peças (EQ, VU, osciloscópio, XY pad, TV) já
 *    desenham a própria moldura, então metade da tela era moldura em volta de
 *    moldura. Formulário com pele de metal.
 * 2. **Nenhuma ordem de sinal.** Bancada de verdade tem caminho, e o olho entra
 *    por ele. Aqui os módulos estavam em ordem de commit: knobs, VU, botões,
 *    fader, knob grande, toggle, EQ, TV, scope, pads, XY. O VU sorteava um
 *    número a cada 100ms e o osciloscópio desenhava senos fixos, então girar o
 *    DRIVE não movia nada e o CLIP acendia sozinho.
 *
 * A bancada agora corre na ordem do sinal, em cinco blocos:
 *
 *     01 fonte → 02 ganho → 03 tratamento → 04 medição → 05 saída
 *
 * e os cinco estão **ligados** (`kits/rig-sinal.ts`): o fader e o DRIVE fazem o
 * nível, o nível move o ponteiro do VU e acende o CLIP, e o EQ, os knobs de tom
 * e o XY pad moldam o traço do osciloscópio. Mexer em qualquer coisa aqui em
 * cima muda alguma coisa lá embaixo, que é a única promessa que um kit de
 * controle precisa cumprir.
 *
 * Moldura: `Painel` (da gramática da sala, com a pele da bancada) aparece duas
 * vezes, e só onde o grupo é de controles nus que num rack estariam parafusados
 * num faceplate: fonte e ganho. Peça que já traz bezel apoia direto no gradiente
 * da sala. Título de módulo é o rótulo do `Bloco`, em mono discreto, porque
 * Orbitron em nove cabeçalhos competia com os próprios instrumentos.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

import { VintageKnob } from "../../registry/vintage/ui/vintage-knob";
import { VintageLargeKnob } from "../../registry/vintage/ui/vintage-large-knob";
import { VintageMeter } from "../../registry/vintage/ui/vintage-meter";
import { VintageButton } from "../../registry/vintage/ui/vintage-button";
import { VintageSlider } from "../../registry/vintage/ui/vintage-slider";
import { VintageToggle } from "../../registry/vintage/ui/vintage-toggle";
import { VintageEQ } from "../../registry/vintage/ui/vintage-eq";
import { VintageLed } from "../../registry/vintage/ui/vintage-led";
import { VintageCommandPalette } from "../../registry/vintage/ui/vintage-command-palette";
import { VintageTvFrame } from "../../registry/vintage/ui/vintage-tv-frame";
import { VintageSoundboardPad } from "../../registry/vintage/ui/vintage-soundboard-pad";
import { VintageXYPad } from "../../registry/vintage/ui/vintage-xy-pad";
import { VintageOscilloscope } from "../../registry/vintage/ui/vintage-oscilloscope";

import { Atos, Bloco, Fecho, Painel } from "./kits/sala";
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

/**
 * O `Painel` da sala vestido de rack.
 *
 * Não é um painel novo: é o mesmo primitivo, com a pele desta sala trocada por
 * `className` (o `cn` deixa a última classe de fundo e de cor de borda vencer).
 * Assim a bancada continua obedecendo à regra de "uma moldura por nível" da
 * gramática das salas, e ainda parece metal.
 */
function Faceplate({
  barra,
  className,
  children,
}: {
  barra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Painel
      barra={barra}
      className={cn(
        "border-[var(--vintage-border)]",
        "bg-[linear-gradient(180deg,var(--vintage-surface-2),var(--vintage-surface-1))]",
        className,
      )}
    >
      {children}
    </Painel>
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
    <div className="flex flex-wrap items-center gap-x-10 gap-y-7">
      <div className="min-w-[9rem]">
        <Etiqueta>nível de saída</Etiqueta>
        <p
          className="mt-1.5 font-vintage-display text-[2.75rem] leading-none tabular-nums text-[var(--vintage-value)]"
          aria-live="off"
        >
          {NUM.format(nivel)}
        </p>
        <p className="mt-1.5 font-vintage-mono text-apoio text-[var(--vintage-text-dim)]">
          de 10, corta em {NUM.format(CORTE)}
        </p>

        {/* A régua de lâmpadas: o estado da cadeia em quatro pontos. */}
        <div className="mt-5 flex gap-3.5">
          <VintageLed color="green" active={ligado} label="PWR" />
          <VintageLed color="yellow" active={bypass} label="BYP" />
          <VintageLed color="orange" active={mute} label="MUTE" />
          <VintageLed color="red" active={estourou} label="CLIP" />
        </div>
      </div>

      <VintageMeter label="SIGNAL" value={nivel} />

      <Traco ativo={ativo} amplitude={nivel / 10} tom={bypass ? TOM_NEUTRO : tom} />
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
    <div ref={alvo}>
      <Atos>
        {/* A abertura saiu. Ela narrava o que a bancada faz quando se mexe nela,
            e a bancada faz isso na frente da pessoa, com ponteiro, traço e LED.
            A ordem do sinal continua dita, mas pelos rótulos numerados dos
            blocos (01 fonte a 05 saída), que é onde ela orienta de fato; e o
            corte em {NUM.format(CORTE)} continua ao lado do número de nível,
            que é onde ele decide alguma coisa. */}

        {/* ---------------------------------------------------------------- */}
        <Bloco
          titulo="01 fonte"
          nota="de onde o sinal entra, o que dispara e o que corta."
          pecas={["vintage-toggle", "vintage-soundboard-pad", "vintage-button"]}
        >
          <Faceplate
            barra={
              <>
                <Etiqueta>entrada</Etiqueta>
                <span className="ml-auto font-vintage-mono text-apoio text-[var(--vintage-text-dim)]">
                  fonte {ROTULO_DE_FONTE[fonte]}
                </span>
              </>
            }
          >
            <div className="flex flex-wrap items-start gap-x-10 gap-y-8 p-5 sm:p-7">
              {/*
                O `vintage-toggle` desenha o próprio título e serigrafa os três
                rótulos em `left:-50px`, fora da carcaça. Com "LINE/MIC/INST" no
                lugar do "U/M/D" de fábrica, a serigrafia sai do painel pela
                esquerda e some por baixo do vizinho. O espaço é reservado aqui,
                no consumidor, que é onde sobrescrita de default de primitivo
                deve morar: a peça continua igual para quem a instala.
              */}
              <div id="fonte" className="pl-14 pt-10">
                <VintageToggle
                  title="FONTE"
                  labels={["LINE", "MIC", "INST"]}
                  position={fonte}
                  onChange={setFonte}
                />
              </div>

              <div id="pads" className="min-w-0 flex flex-col gap-3 pt-10">
                <Etiqueta>disparo</Etiqueta>
                <div className="grid grid-cols-4 gap-2.5">
                  {PAD_VOICES.map((pad, i) => (
                    <VintageSoundboardPad
                      key={pad.label}
                      label={pad.label}
                      icon={pad.icon}
                      color={pad.color}
                      size={68}
                      active={padsAtivos.has(i)}
                      onTrigger={() => {
                        setPadsAtivos((s) => new Set(s).add(i));
                        // O disparo vira transiente na ponte de medidores.
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
              </div>

              {/* Empurrado para a direita a partir do tablet: fonte à esquerda,
                  disparo no meio, corte na ponta. É a ordem em que a mão anda
                  num console, e sem isto o terço direito do faceplate ficava
                  vazio parecendo layout inacabado. */}
              <div id="corte" className="flex flex-col gap-3 pt-10 sm:ml-auto">
                <Etiqueta>corte</Etiqueta>
                <div className="flex flex-wrap items-center gap-6">
                  <VintageButton
                    label="POWER"
                    active={ligado}
                    onClick={() => setLigado((v) => !v)}
                  />
                  <VintageButton
                    label="BYPASS"
                    active={bypass}
                    onClick={() => setBypass((v) => !v)}
                  />
                  <VintageButton label="MUTE" active={mute} onClick={() => setMute((v) => !v)} />
                </div>
              </div>
            </div>
          </Faceplate>
        </Bloco>

        {/* ---------------------------------------------------------------- */}
        {/*
          O herói da bancada.

          É o módulo mais alto e o único com o faceplate largo, porque é onde a
          mão entra: o knob de 318px é o maior objeto da sala e o fader ocupa a
          linha inteira ao lado dele. Tudo o que vem depois é consequência do que
          se faz aqui, e a hierarquia precisa dizer isso antes de qualquer texto.
        */}
        <Bloco
          titulo="02 ganho"
          nota="o quanto entra. É o módulo que manda no resto da bancada."
          pecas={["vintage-large-knob", "vintage-slider"]}
        >
          <Faceplate
            barra={
              <>
                <Etiqueta>estágio de ganho</Etiqueta>
                {/* EXCEÇÃO ao `ruido-scan/ensina-a-usar`, com motivo: o `shift`
                    para ajuste fino é invisível por natureza — não existe pixel
                    que anuncie um modificador de teclado, e quem não souber vai
                    embora achando que o knob é grosseiro. A primeira metade da
                    frase acompanha porque separá-las deixaria "shift para fino"
                    sozinho, sem dizer fino no quê. */}
                <span className="ml-auto font-vintage-mono text-apoio text-[var(--vintage-text-dim)]">
                  arrasta pra cima e pra baixo, shift para fino
                </span>
              </>
            }
          >
            <div
              id="ganho"
              className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 p-5 sm:p-9"
            >
              <Trilho>
                <VintageLargeKnob label="DRIVE" value={drive} onChange={setDrive} />
              </Trilho>

              <div className="flex w-full min-w-0 max-w-[22rem] flex-col gap-4">
                <VintageSlider label="GAIN" value={ganho} onChange={setGanho} className="w-full" />
                <p className="text-corpo leading-relaxed text-[var(--vintage-text-muted)]">
                  DRIVE satura, GAIN empurra. Os dois somam no mesmo número, e é esse número
                  que a ponte lá embaixo marca.
                </p>
              </div>
            </div>
          </Faceplate>
        </Bloco>

        {/* ---------------------------------------------------------------- */}
        {/*
          Sem faceplate: EQ e XY pad já trazem bezel próprio, e envolvê-los
          reproduziria exatamente a caixa dentro de caixa que a sala veio matar.
          Os dois knobs de tom ficam nus sobre o gradiente, com serigrafia mono.
        */}
        <Bloco
          titulo="03 tratamento"
          nota="o que muda a forma do sinal antes de ele ser medido."
          pecas={["vintage-eq", "vintage-knob", "vintage-xy-pad"]}
        >
          <div
            id="tratamento"
            className={cn(
              "flex flex-wrap items-start gap-x-10 gap-y-8",
              // Com BYPASS ligado o tratamento sai do caminho, e o painel diz
              // isso apagando: estado que muda o sinal e não muda a tela é o
              // jeito mais rápido de a demo mentir.
              bypass && "opacity-45",
            )}
          >
            <Trilho>
              <VintageEQ
                title="GRAPHIC EQ"
                labels={["63Hz", "125Hz", "250Hz", "500Hz", "1kHz", "2kHz"]}
                onChange={setBandas}
              />
            </Trilho>

            <div className="flex flex-wrap items-start gap-x-10 gap-y-8">
              <div className="flex flex-col gap-4">
                <Etiqueta>tom</Etiqueta>
                <div className="flex items-center gap-8">
                  <VintageKnob label="BASS" value={grave} onChange={setGrave} />
                  <VintageKnob label="TREBLE" value={agudo} onChange={setAgudo} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Etiqueta>filtro e cauda</Etiqueta>
                <VintageXYPad
                  size={192}
                  labelX="FILTRO"
                  labelY="CAUDA"
                  value={xy}
                  onChange={(x, y) => setXy({ x, y })}
                  color="var(--vintage-accent)"
                />
              </div>
            </div>
          </div>
        </Bloco>

        {/* ---------------------------------------------------------------- */}
        <Bloco
          titulo="04 medição"
          nota="onde se confere o que as mãos fizeram lá em cima."
          pecas={["vintage-meter", "vintage-oscilloscope", "vintage-led"]}
        >
          <div id="medicao">
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
        </Bloco>

        {/* ---------------------------------------------------------------- */}
        <Bloco
          titulo="05 saída"
          nota="o que vai ao ar, e o ⌘K que atravessa a bancada inteira."
          pecas={["vintage-tv-frame", "vintage-command-palette"]}
        >
          <div id="saida" className="flex flex-wrap items-start gap-x-10 gap-y-8">
            <Trilho>
              <VintageTvFrame
                title="VISANT TV"
                width={400}
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
                    {ligado && !mute ? "SIGNAL ACTIVE" : "NO SIGNAL"}
                  </span>
                  <span
                    className="font-vintage-mono text-micro tracking-[0.1em]"
                    style={{ color: `color-mix(in oklab, ${SCOPE_PHOSPHOR} 35%, transparent)` }}
                  >
                    CH 01 {ROTULO_DE_FONTE[fonte]} 720p
                  </span>
                </div>
              </VintageTvFrame>
            </Trilho>

            <div className="flex min-w-0 max-w-sm flex-col gap-4">
              <Etiqueta>atalho</Etiqueta>
              <button
                type="button"
                onClick={() => setPaleta(true)}
                className="alvo-toque inline-flex w-fit items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-[var(--vintage-border)] bg-[var(--vintage-surface-3)] px-5 py-2.5 font-vintage-mono text-apoio uppercase tracking-[0.14em] text-[var(--vintage-text-muted)] outline-none transition-[color,border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--vintage-label)] hover:text-[var(--vintage-label)] focus-visible:border-[var(--vintage-label)] active:scale-[0.97] active:[transition-duration:var(--dur-press)] motion-reduce:active:scale-100"
              >
                ⌘K abrir a paleta
              </button>
              <p className="text-corpo leading-relaxed text-[var(--vintage-text-muted)]">
                A paleta pula para qualquer módulo da bancada sem tirar a mão do teclado. É o
                mesmo atalho que o rig entrega instalado.
              </p>
            </div>
          </div>
        </Bloco>

        {/* O fecho listava os quatro gestos que as peças já trazem prontos, e
            a pessoa acabou de sair de uma bancada onde girou, arrastou e viu o
            ponteiro subir. Inventariar o que ela acabou de fazer é o fecho
            mais fraco possível. Fica o que ela NÃO pode ter descoberto
            mexendo: que o valor é dela, não da demo. */}
        <Fecho>
          Você liga o value de cada peça no seu áudio e a bancada passa a medir o seu sinal.
        </Fecho>
      </Atos>

      {paleta && (
        <VintageCommandPalette
          items={[
            { id: "fonte", label: "Seletor de fonte", icon: "🎛", group: "Sinal", active: true },
            { id: "pads", label: "Pads de disparo", icon: "🥁", group: "Sinal" },
            { id: "corte", label: "Power, bypass e mute", icon: "🔘", group: "Sinal" },
            { id: "ganho", label: "Estágio de ganho", icon: "🎚", group: "Cadeia", active: true },
            { id: "tratamento", label: "EQ, tom e XY", icon: "📈", group: "Cadeia" },
            { id: "medicao", label: "Ponte de medidores", icon: "📊", group: "Cadeia" },
            { id: "saida", label: "Monitor de saída", icon: "📺", group: "Saída" },
          ]}
          groups={[
            { label: "Sinal", ids: ["fonte", "pads", "corte"] },
            { label: "Cadeia", ids: ["ganho", "tratamento", "medicao"] },
            { label: "Saída", ids: ["saida"] },
          ]}
          onSelect={irPara}
          onClose={() => setPaleta(false)}
          placeholder="Buscar módulo da bancada..."
        />
      )}
    </div>
  );
}
