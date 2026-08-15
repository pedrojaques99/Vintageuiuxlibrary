"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  VintageOscilloscope,
  type VintageScopeMode,
} from "@/components/ui/vintage-oscilloscope";

/**
 * VintageTvFrame — o chassi de tubo, e o motivo de ele ser proporcional.
 *
 * O defeito relatado ("responsividade quebrada e botão saindo fora") tinha duas
 * causas, e as duas eram a mesma ideia errada: **medida fixa dentro de uma peça
 * de largura variável**.
 *
 * 1. `width` era uma largura CRAVADA em px no corpo, no console, na aresta e nos
 *    pés. Uma TV de 480px num viewport de 390 não encolhe: ela sai pela direita
 *    da página. Agora `width` é a largura NATURAL (um teto), e a peça ocupa
 *    100% do que o pai der até esse teto.
 * 2. O console era `space-between` com filhos de tamanho fixo — botão de 44px,
 *    dois LEDs, dois dials de 28px, mais 32px de respiro. Isso pede ~190px só de
 *    cromo: numa TV de 190px o segundo dial ficava literalmente do lado de fora
 *    da barra. Agora o console é um container e todo o cromo sai de `cqi` (1% da
 *    largura da TV) preso entre piso e teto, do mesmo jeito que o tubo já era
 *    proporcional pelo `padding-bottom: 80%`. O cromo encolhe junto com o móvel,
 *    que é o que um móvel faz.
 *
 * O rótulo da marca é o único que pode sumir: ele tem `min-width: 0` e corta com
 * reticências, porque letra espremida em duas linhas dentro do console é pior do
 * que letra cortada.
 */
interface VintageTvFrameProps {
  children?: React.ReactNode;
  title?: string;
  /** Largura natural em px — vira teto, não trava: a peça encolhe abaixo dela. */
  width?: number;
  isOn?: boolean;
  onPowerToggle?: (on: boolean) => void;
  showScanlines?: boolean;
  showTimecode?: string;
  signalActive?: boolean;
  /**
   * O programa que entra quando não há `children`.
   *
   * A tela vazia dizia "NO SIGNAL" e ficava lá, parada — uma moldura de TV cuja
   * única função é emoldurar não prova nada. Agora o padrão é o tubo tocando um
   * dos visualizadores do `vintage-oscilloscope`. `null` traz de volta o cartão
   * de sem-sinal, pra quem quer o objeto desligado de propósito.
   */
  program?: VintageScopeMode | null;
  /** Fonte ao vivo pro programa. Sem ela o visualizador gera o próprio sinal. */
  programAnalyser?: AnalyserNode | null;
  /** Relógio do programa. `false` congela — use com o card fora da tela. */
  programActive?: boolean;
  className?: string;
}

// Hex cru aqui é exceção declarada: isto não é superfície de tema, é a pintura
// de um objeto — plástico bege queimado, alumínio do dial, fósforo do LED. Ligar
// esses valores ao token da marca faria a TV mudar de material a cada cliente.
const RETRO = {
  bodyGradient:
    "linear-gradient(180deg, rgba(230,219,209,0.75) 0%, rgba(153,146,140,0.75) 100%), #676665",
  consoleSurface: "#CDC4BB",
  consoleBottomEdge: "linear-gradient(180deg, #CDC4BB 0%, #4D4946 100%)",
  footGradient:
    "linear-gradient(90deg, #9A938D 0%, #C1B8B1 40%, #CCC3BB 51%, #BDB4AD 65%, #9A938D 100%)",
  bezelOuter:
    "linear-gradient(0deg, rgba(81,76,73,0.5), rgba(81,76,73,0.5)), linear-gradient(135deg, rgba(70,70,70,0.45) -1%, rgba(13,13,13,0.27) 42%, rgba(0,0,0,0.45) 49%, rgba(13,13,13,0.32) 56%, rgba(49,49,49,0.45) 92%)",
  bezelInner:
    "linear-gradient(178deg, rgba(0,0,0,0) -21%, rgba(0,0,0,0.25) -10%, rgba(0,0,0,0.5) -6%, rgba(0,0,0,0.25) 8%, rgba(0,0,0,0) 75%), linear-gradient(183deg, rgba(70,70,70,0.45) 7%, rgba(13,13,13,0.27) 93%, rgba(0,0,0,0.45) 114%), #BFB7AB",
  screenOn: "#1E201D",
  screenOff:
    "radial-gradient(ellipse at 50% 50%, #1a1c18 0%, #111310 40%, #080a07 100%)",
  screenInsetShadow: "inset 0 0 28px rgba(0,0,0,0.8)",
  screenVignette: "inset 0 0 60px rgba(0,0,0,0.5)",
  scanlines:
    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
  dialGradient:
    "linear-gradient(143deg, #CCC4B7 20%, #BAB4AB 40%, #ABA49C 50%, #736D68 86%)",
  dialShadow:
    "0 1.5px 1.5px rgba(0,0,0,0.25), 0 3px 3px rgba(0,0,0,0.15)",
  dialRed: "#EA5959",
  dialGreen: "#39AE5A",
  powerOn: "#CEC5BC",
  powerOff: "#706B66",
  powerShadowOn:
    "inset 0 -1.5px 3px rgba(0,0,0,0.25), inset 0 1.5px 3px rgba(255,255,255,0.25)",
  powerShadowOff: "inset 0 1.5px 3px rgba(0,0,0,0.4)",
  ledPowerOn: "#72956F",
  ledPowerOff: "#4a5248",
  ledSignalOn: "#CD8A8A",
  ledSignalOff: "#6e5050",
  textOnChassis: "#4a4540",
  radiusBody: 6,
  radiusBezelOuter: 4,
  radiusBezelInner: 20,
  radiusScreen: 14,
} as const;

const STYLE_ID = "vintage-tv-frame-keyframes";

function injectKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
@keyframes vtv-crt-off {
  0%   { transform: scale(1, 1); opacity: 1; filter: brightness(1); }
  40%  { transform: scale(1, 0.005); opacity: 1; filter: brightness(3); }
  70%  { transform: scale(0.08, 0.005); opacity: 1; filter: brightness(5); }
  90%  { transform: scale(0, 0); opacity: 0.6; filter: brightness(8); }
  100% { transform: scale(0, 0); opacity: 0; filter: brightness(0); }
}
@keyframes vtv-crt-on {
  0%   { transform: scale(0, 0.005); opacity: 0.5; filter: brightness(5); }
  30%  { transform: scale(1, 0.005); opacity: 1; filter: brightness(3); }
  60%  { transform: scale(1, 0.8); opacity: 1; filter: brightness(1.3); }
  100% { transform: scale(1, 1); opacity: 1; filter: brightness(1); }
}
@keyframes vtv-scanline-scroll {
  0%   { background-position: 0 0; }
  100% { background-position: 0 60px; }
}
@keyframes vtv-rec-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
.vtv-crt-off {
  animation: vtv-crt-off 0.45s ease-in forwards;
  will-change: transform, opacity, filter;
}
.vtv-crt-on {
  animation: vtv-crt-on 0.35s ease-out forwards;
  will-change: transform, opacity, filter;
}
.vtv-scanline-scroll {
  animation: vtv-scanline-scroll 4s linear infinite;
}
`;
  document.head.appendChild(style);
}

export function VintageTvFrame({
  children,
  title = "VISANT",
  width = 480,
  isOn: controlledOn,
  onPowerToggle,
  showScanlines = true,
  showTimecode,
  signalActive,
  program = "scope",
  programAnalyser,
  programActive = true,
  className,
}: VintageTvFrameProps) {
  const [internalOn, setInternalOn] = useState(true);
  const [crtAnim, setCrtAnim] = useState<"on" | "off" | null>(null);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const isOn = controlledOn !== undefined ? controlledOn : internalOn;
  // O LED de sinal acende com o programa interno também: com ele aceso e o
  // visualizador rodando, o chassi para de mentir sobre o próprio estado.
  const hasSignal = signalActive ?? (!!children || !!program);

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const togglePower = () => {
    if (isOn) {
      setCrtAnim("off");
      timerRef.current = setTimeout(() => {
        if (controlledOn === undefined) setInternalOn(false);
        onPowerToggle?.(false);
        setCrtAnim(null);
      }, 500);
    } else {
      if (controlledOn === undefined) setInternalOn(true);
      onPowerToggle?.(true);
      setCrtAnim("on");
      timerRef.current = setTimeout(() => {
        setCrtAnim(null);
      }, 400);
    }
  };

  /*
   * O cromo do console, em função da largura da TV.
   *
   * `cqi` = 1% da largura do container (o console). Os pisos são o menor
   * desenho que ainda lê como o objeto; os tetos são o desenho original de
   * 480px, então uma TV em tamanho natural continua idêntica ao que era.
   */
  const CROMO = {
    pad: "clamp(6px, 3.4cqi, 16px)",
    gap: "clamp(3px, 1.3cqi, 6px)",
    powerW: "clamp(30px, 9.2cqi, 44px)",
    powerH: "clamp(18px, 5cqi, 24px)",
    ledW: "clamp(6px, 2.1cqi, 10px)",
    ledH: "clamp(5px, 1.7cqi, 8px)",
    dial: "clamp(16px, 5.8cqi, 28px)",
    rotulo: "clamp(6px, 2.1cqi, 10px)",
    pe: "clamp(26px, 13cqi, 52px)",
  } as const;

  const dialStyle = (size: string): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: "50%",
    background: RETRO.dialGradient,
    boxShadow: RETRO.dialShadow,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.12s ease, box-shadow 0.15s ease",
  });

  const dialInnerStyle = (color: string): React.CSSProperties => ({
    width: "67%",
    height: "67%",
    borderRadius: "50%",
    background: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // A letra do dial acompanha o dial: em px fixo ela estourava o botão assim
    // que a TV encolhia.
    fontSize: "clamp(5px, 2cqi, 8px)",
    color: "#000",
    fontWeight: 900,
    lineHeight: 1,
    transition: "background 0.25s ease",
  });

  return (
    <div
      className={cn("flex flex-col items-center select-none", className)}
      // `width: 100%` com teto em `width`: a TV ocupa o que o pai der e nunca
      // passa da largura natural. Era `inline-flex` com px cravado — num
      // viewport de 390 uma TV de 480 saía pela direita da página.
      style={{ width: "100%", maxWidth: width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── TV Body ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "80%",
          background: RETRO.bodyGradient,
          borderRadius: RETRO.radiusBody,
          userSelect: "none",
        }}
      >
        {/* ── Bezel Outer ── */}
        <div
          style={{
            position: "absolute",
            inset: "2.9% 2.2%",
            bottom: "3%",
            background: RETRO.bezelOuter,
            borderRadius: RETRO.radiusBezelOuter,
          }}
        >
          {/* ── Bezel Inner ── */}
          <div
            style={{
              position: "absolute",
              inset: "3.8%",
              background: RETRO.bezelInner,
              borderRadius: RETRO.radiusBezelInner,
            }}
          >
            {/* ── Screen ── */}
            <div
              style={{
                position: "absolute",
                inset: "5% 4%",
                background:
                  isOn || crtAnim === "off"
                    ? RETRO.screenOn
                    : RETRO.screenOff,
                borderRadius: RETRO.radiusScreen,
                boxShadow: RETRO.screenInsetShadow,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* ── CRT Content Wrapper (animates on power) ── */}
              <div
                className={
                  crtAnim === "off"
                    ? "vtv-crt-off"
                    : crtAnim === "on"
                      ? "vtv-crt-on"
                      : undefined
                }
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Children content */}
                {isOn && children}

                {/* Programa padrão: o tubo tocando, e não um recado dizendo
                    que não toca. `chrome={false}` porque a moldura, o vinheta
                    e as scanlines já são da TV — dois chassis aninhados leem
                    como componente encaixado errado. */}
                {isOn && !children && program && (
                  <VintageOscilloscope
                    fill
                    chrome={false}
                    mode={program}
                    analyser={programAnalyser}
                    active={programActive}
                    color="var(--vintage-meter-green)"
                  />
                )}

                {/* Sem-sinal explícito: só quando o dono pede `program={null}`. */}
                {isOn && !children && !program && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily:
                          "var(--font-vintage-mono, 'Red Hat Mono', monospace)",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        // Era `rgba(255,255,255,0.15)` sobre tubo escuro: 1,2:1,
                        // texto que só existe pra quem já sabe que está lá.
                        color: "rgba(255,255,255,0.45)",
                        textTransform: "uppercase",
                      }}
                    >
                      NO SIGNAL
                    </span>
                  </div>
                )}
              </div>

              {/* ── Scanline overlay (animated scroll) ── */}
              {showScanlines && (isOn || crtAnim === "off") && (
                <div
                  className="vtv-scanline-scroll"
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: RETRO.scanlines,
                    borderRadius: RETRO.radiusScreen,
                    zIndex: 2,
                    opacity: 0.6,
                  }}
                />
              )}

              {/* ── Vignette overlay ── */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  boxShadow: RETRO.screenVignette,
                  borderRadius: RETRO.radiusScreen,
                  zIndex: 2,
                }}
              />

              {/* ── Timecode (bottom-left) ── */}
              {showTimecode && isOn && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 8,
                    zIndex: 3,
                    fontFamily: "monospace",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.5)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    pointerEvents: "none",
                    opacity: hovered ? 1 : 0.4,
                    transition: "opacity 0.3s",
                  }}
                >
                  {showTimecode}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Console Bar ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          // O console é o container que todo o cromo mede. Sem isto, `cqi` cairia
          // na largura da janela e a TV pequena voltaria a estourar.
          containerType: "inline-size",
          background: RETRO.consoleSurface,
          borderRadius: "0 0 4px 4px",
          padding: `clamp(6px, 2.2cqi, 10px) ${CROMO.pad}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: CROMO.gap,
        }}
      >
        {/* Left: Power + LEDs */}
        <div style={{ display: "flex", alignItems: "center", gap: CROMO.gap, flexShrink: 0 }}>
          {/* Power button */}
          <button
            type="button"
            onClick={togglePower}
            aria-pressed={isOn}
            aria-label={isOn ? "Desligar a TV" : "Ligar a TV"}
            // `alvo-toque` estende só a região clicável: o botão desenhado tem
            // 24px de altura (é o desenho do móvel), o dedo recebe 44.
            className="alvo-toque"
            style={{
              width: CROMO.powerW,
              height: CROMO.powerH,
              flexShrink: 0,
              borderRadius: 3,
              background: isOn ? RETRO.powerOn : RETRO.powerOff,
              boxShadow: isOn
                ? RETRO.powerShadowOn
                : RETRO.powerShadowOff,
              border: "none",
              cursor: "pointer",
              fontSize: "clamp(7px, 2.2cqi, 10px)",
              color: RETRO.textOnChassis,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            ⏻
          </button>

          {/* Power LED */}
          <div
            style={{
              width: CROMO.ledW,
              height: CROMO.ledH,
              flexShrink: 0,
              borderRadius: 1,
              background: isOn ? RETRO.ledPowerOn : RETRO.ledPowerOff,
              boxShadow: isOn
                ? `0 0 6px ${RETRO.ledPowerOn}, 0 0 2px ${RETRO.ledPowerOn}`
                : "none",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          />

          {/* Signal LED */}
          <div
            style={{
              width: CROMO.ledW,
              height: CROMO.ledH,
              flexShrink: 0,
              borderRadius: 1,
              background: hasSignal
                ? RETRO.ledSignalOn
                : RETRO.ledSignalOff,
              boxShadow: hasSignal
                ? `0 0 6px ${RETRO.ledSignalOn}, 0 0 2px ${RETRO.ledSignalOn}`
                : "none",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          />
        </div>

        {/* Center: Brand label — o único que pode encolher e cortar. */}
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "center",
            fontSize: CROMO.rotulo,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: RETRO.textOnChassis,
            fontFamily:
              "var(--font-vintage-display, 'Orbitron', sans-serif)",
          }}
        >
          {title}
        </span>

        {/* Right: Dials */}
        <div style={{ display: "flex", alignItems: "center", gap: CROMO.gap, flexShrink: 0 }}>
          {/* Channel dial (decorative) */}
          <div style={dialStyle(CROMO.dial)}>
            <div style={dialInnerStyle(RETRO.dialGreen)}>
              <span style={{ fontWeight: 900 }}>CH</span>
            </div>
          </div>

          {/* Volume dial (decorative) */}
          <div style={dialStyle(CROMO.dial)}>
            <div style={dialInnerStyle(RETRO.dialRed)}>
              <span style={{ fontWeight: 900 }}>V</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom edge ── */}
      <div
        style={{
          width: "100%",
          height: 4,
          background: RETRO.consoleBottomEdge,
          borderRadius: "0 0 4px 4px",
        }}
      />

      {/* ── Feet ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "85%",
          containerType: "inline-size",
        }}
      >
        {/* Dois pés iguais, e o pé também encolhe: em 52px fixo, numa TV de
            190px eles se encostavam no meio e viravam uma barra só. */}
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: CROMO.pe,
              height: 6,
              borderRadius: "0 0 3px 3px",
              background: RETRO.footGradient,
            }}
          />
        ))}
      </div>
    </div>
  );
}
