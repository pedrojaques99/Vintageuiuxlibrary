import { useState, useEffect, useRef } from "react";
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

export default function App() {
  const [bassValue, setBassValue] = useState(5);
  const [trebleValue, setTrebleValue] = useState(5);
  const [gainValue, setGainValue] = useState(5);
  const [meterValue, setMeterValue] = useState(5);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [volumeValue, setVolumeValue] = useState(5);
  const [showPalette, setShowPalette] = useState(false);
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const waveDataRef = useRef<Float32Array>(new Float32Array(256));

  useEffect(() => {
    const interval = setInterval(() => {
      setMeterValue((prev) => {
        const random = Math.random() * 2 - 1;
        return Math.max(0, Math.min(10, prev + random));
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Generate fake waveform data for the oscilloscope demo
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      const data = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        data[i] =
          Math.sin((i / 256) * Math.PI * 4 + t) * 0.4 +
          Math.sin((i / 256) * Math.PI * 7 + t * 1.3) * 0.2 +
          Math.sin((i / 256) * Math.PI * 11 + t * 0.7) * 0.1;
      }
      waveDataRef.current = data;
    }, 33);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--vintage-surface-1)] via-[var(--vintage-surface-2)] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-vintage-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--vintage-label)] via-[var(--vintage-value)] to-[var(--vintage-label)] mb-2 tracking-wider">
            VINTAGE UI
          </h1>
          <p className="text-[var(--vintage-text-muted)] font-vintage-mono text-sm tracking-widest">
            @VISANT/UI — RETRO AUDIO CONTROL REGISTRY
          </p>
          <div className="mt-2 flex justify-center gap-3">
            <VintageLed color="green" active label="PWR" />
            <VintageLed color="yellow" active={activeButton === "bypass"} label="BYP" />
            <VintageLed color="red" active={meterValue > 8} label="CLIP" />
            <VintageLed color="orange" active={activeButton === "mute"} label="MUTE" />
          </div>
          <div className="mt-4 flex justify-center gap-1">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-[var(--vintage-border)] rounded-full" />
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              ROTARY CONTROLS
            </h2>
            <div className="flex justify-around items-center gap-8">
              <div className="text-center">
                <VintageKnob label="BASS" value={bassValue} onChange={setBassValue} />
                <p className="text-[var(--vintage-text-dim)] text-xs mt-2 font-vintage-mono">
                  -10dB to +10dB
                </p>
              </div>
              <div className="text-center">
                <VintageKnob label="TREBLE" value={trebleValue} onChange={setTrebleValue} />
                <p className="text-[var(--vintage-text-dim)] text-xs mt-2 font-vintage-mono">
                  -10dB to +10dB
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              VU METER
            </h2>
            <div className="flex justify-center">
              <VintageMeter label="SIGNAL" value={meterValue} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              PUSH BUTTONS
            </h2>
            <div className="flex justify-around items-center">
              <VintageButton
                label="POWER"
                active={activeButton === "power"}
                onClick={() => setActiveButton(activeButton === "power" ? null : "power")}
              />
              <VintageButton
                label="BYPASS"
                active={activeButton === "bypass"}
                onClick={() => setActiveButton(activeButton === "bypass" ? null : "bypass")}
              />
              <VintageButton
                label="MUTE"
                active={activeButton === "mute"}
                onClick={() => setActiveButton(activeButton === "mute" ? null : "mute")}
              />
            </div>
          </section>

          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              FADER CONTROL
            </h2>
            <div className="flex justify-center">
              <VintageSlider label="GAIN" value={gainValue} onChange={setGainValue} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              LARGE KNOB
            </h2>
            <div className="flex justify-center">
              <VintageLargeKnob label="VOLUME" value={volumeValue} onChange={setVolumeValue} />
            </div>
          </section>

          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              3-WAY TOGGLE
            </h2>
            <div className="flex justify-center items-center h-full">
              <VintageToggle />
            </div>
          </section>
        </div>

        <div className="mt-12">
          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <div className="flex justify-center">
              <VintageEQ />
            </div>
          </section>
        </div>

        {/* ─── NEW: 7panel_studio Components ─── */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              RETRO TV FRAME
            </h2>
            <div className="flex justify-center">
              <VintageTvFrame
                title="VISANT TV"
                width={420}
                showTimecode="00:12:34"
                signalActive
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "radial-gradient(ellipse at 50% 40%, rgba(51,255,102,0.05), transparent 70%)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-vintage-mono, monospace)",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      color: "#33ff66",
                      textShadow: "0 0 8px rgba(51,255,102,0.6)",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    SIGNAL ACTIVE
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      color: "rgba(51,255,102,0.35)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    CH 01 — 720p — CLICK POWER TO TEST CRT ANIMATION
                  </div>
                </div>
              </VintageTvFrame>
            </div>
          </section>

          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              OSCILLOSCOPE
            </h2>
            <div className="flex justify-center">
              <VintageOscilloscope
                data={waveDataRef.current}
                color="#33ff66"
                width={320}
                height={160}
              />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              SOUNDBOARD PADS
            </h2>
            <div className="grid grid-cols-4 gap-2.5 justify-items-center">
              {[
                { label: "KICK", icon: "🥁", color: "#00b860" },
                { label: "SNARE", icon: "🪘", color: "#3b82f6" },
                { label: "HAT", icon: "🎩", color: "#f59e0b" },
                { label: "CLAP", icon: "👏", color: "#ec4899" },
                { label: "BASS", icon: "🎸", color: "#8b5cf6" },
                { label: "SYNTH", icon: "🎹", color: "#06b6d4" },
                { label: "FX", icon: "💥", color: "#f97316" },
                { label: "VOX", icon: "🎤", color: "#84cc16" },
              ].map((pad, i) => (
                <VintageSoundboardPad
                  key={i}
                  label={pad.label}
                  icon={pad.icon}
                  color={pad.color}
                  size={80}
                  active={activePads.has(i)}
                  onTrigger={() => setActivePads((s) => new Set(s).add(i))}
                  onRelease={() => {
                    setActivePads((s) => {
                      const next = new Set(s);
                      next.delete(i);
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-b from-[var(--vintage-surface-2)] to-[var(--vintage-surface-1)] rounded-2xl p-8 border border-[var(--vintage-border)] shadow-2xl">
            <h2 className="text-xl font-vintage-display text-[var(--vintage-label)] mb-6 tracking-wider">
              XY PAD
            </h2>
            <div className="flex justify-center">
              <VintageXYPad
                size={200}
                labelX="FILTER"
                labelY="REVERB"
                color="var(--vintage-accent)"
              />
            </div>
          </section>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => setShowPalette(true)}
            className="bg-[var(--vintage-surface-3)] border border-[var(--vintage-border)] rounded-lg px-6 py-3 text-[var(--vintage-text-muted)] font-vintage-mono text-sm tracking-wider hover:bg-[var(--vintage-surface-3a)] transition-colors cursor-pointer"
          >
            PRESS CTRL+K — COMMAND PALETTE
          </button>
        </div>

        {showPalette && (
          <VintageCommandPalette
            items={[
              { id: "knobs", label: "Rotary Controls", icon: "🎛", group: "Controls", active: true },
              { id: "meter", label: "VU Meter", icon: "📊", group: "Controls", active: true },
              { id: "buttons", label: "Push Buttons", icon: "🔘", group: "Controls" },
              { id: "slider", label: "Fader Control", icon: "🎚", group: "Controls" },
              { id: "eq", label: "Graphic EQ", icon: "📈", group: "Audio" },
              { id: "tv", label: "Retro TV", icon: "📺", group: "Visuals" },
              { id: "scope", label: "Oscilloscope", icon: "〰️", group: "Visuals" },
              { id: "pads", label: "Soundboard", icon: "🥁", group: "Audio" },
              { id: "xy", label: "XY Pad", icon: "✛", group: "Controls" },
            ]}
            groups={[
              { label: "Controls", ids: ["knobs", "meter", "buttons", "slider", "xy"] },
              { label: "Audio", ids: ["eq", "pads"] },
              { label: "Visuals", ids: ["tv", "scope"] },
            ]}
            onSelect={(id) => {
              const el = document.getElementById(id);
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            onClose={() => setShowPalette(false)}
            placeholder="Search components..."
          />
        )}

        <footer className="mt-16 text-center">
          <div className="inline-block bg-[var(--vintage-surface-2)] border border-[var(--vintage-border)] rounded-lg px-8 py-4">
            <p className="text-[var(--vintage-text-dim)] font-vintage-mono text-xs tracking-widest">
              @VISANT/UI REGISTRY | npx shadcn add @visant/vintage-knob | DRAG KNOBS & SLIDERS TO ADJUST
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
