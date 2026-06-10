"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VintageTvFrameProps {
  children?: React.ReactNode;
  title?: string;
  width?: number;
  isOn?: boolean;
  onPowerToggle?: (on: boolean) => void;
  showScanlines?: boolean;
  showTimecode?: string;
  signalActive?: boolean;
  className?: string;
}

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
  className,
}: VintageTvFrameProps) {
  const [internalOn, setInternalOn] = useState(true);
  const [crtAnim, setCrtAnim] = useState<"on" | "off" | null>(null);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const isOn = controlledOn !== undefined ? controlledOn : internalOn;
  const hasSignal = signalActive ?? !!children;

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

  const dialStyle = (size: number): React.CSSProperties => ({
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

  const dialInnerStyle = (
    color: string,
    size: number
  ): React.CSSProperties => ({
    width: "67%",
    height: "67%",
    borderRadius: "50%",
    background: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.round(size * 0.36),
    color: "#000",
    fontWeight: 900,
    transition: "background 0.25s ease",
  });

  return (
    <div
      className={cn("inline-flex flex-col items-center select-none", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── TV Body ── */}
      <div
        style={{
          position: "relative",
          width,
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

                {/* No-signal static when on but no content */}
                {isOn && !children && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily:
                          "var(--font-vintage-mono, 'Red Hat Mono', monospace)",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        color: "rgba(255,255,255,0.15)",
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
          width,
          background: RETRO.consoleSurface,
          borderRadius: "0 0 4px 4px",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Power + LEDs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Power button */}
          <button
            onClick={togglePower}
            style={{
              width: 44,
              height: 24,
              borderRadius: 3,
              background: isOn ? RETRO.powerOn : RETRO.powerOff,
              boxShadow: isOn
                ? RETRO.powerShadowOn
                : RETRO.powerShadowOff,
              border: "none",
              cursor: "pointer",
              fontSize: 10,
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
              width: 10,
              height: 8,
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
              width: 10,
              height: 8,
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

        {/* Center: Brand label */}
        <span
          style={{
            fontSize: 10,
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Channel dial (decorative) */}
          <div style={dialStyle(28)}>
            <div style={dialInnerStyle(RETRO.dialGreen, 28)}>
              <span style={{ fontSize: 8, color: "#000", fontWeight: 900 }}>
                CH
              </span>
            </div>
          </div>

          {/* Volume dial (decorative) */}
          <div style={dialStyle(28)}>
            <div style={dialInnerStyle(RETRO.dialRed, 28)}>
              <span style={{ fontSize: 8, color: "#000", fontWeight: 900 }}>
                V
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom edge ── */}
      <div
        style={{
          width,
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
          width: width * 0.85,
        }}
      >
        <div
          style={{
            width: 52,
            height: 6,
            borderRadius: "0 0 3px 3px",
            background: RETRO.footGradient,
          }}
        />
        <div
          style={{
            width: 52,
            height: 6,
            borderRadius: "0 0 3px 3px",
            background: RETRO.footGradient,
          }}
        />
      </div>
    </div>
  );
}
