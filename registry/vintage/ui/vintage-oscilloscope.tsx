"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type DisplayMode = "wave" | "fft";

interface VintageOscilloscopeProps {
  data?: Float32Array | number[];
  mode?: DisplayMode;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function VintageOscilloscope({
  data,
  mode = "wave",
  color = "var(--vintage-meter-green)",
  width = 320,
  height = 120,
  className,
}: VintageOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Float32Array | number[] | undefined>(data);
  dataRef.current = data;

  const resolvedColor = useRef(color);
  resolvedColor.current = color;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const c = resolvedColor.current;

    ctx.fillStyle = "rgba(8,9,11,0.85)";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = (w / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const samples = dataRef.current;
    if (!samples || samples.length === 0) {
      // Flat line
      ctx.strokeStyle = c;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    if (mode === "fft") {
      const barCount = Math.min(samples.length / 2, 128);
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < barCount; i++) {
        const logI = Math.pow(i / barCount, 2) * (samples.length / 2);
        const idx = Math.min(Math.floor(logI), samples.length - 1);
        const db = samples[idx] as number;
        const norm = Math.max(0, Math.min(1, (db + 100) / 100));
        const bw = w / barCount;
        ctx.fillRect(i * bw, h - norm * h, bw - 1, norm * h);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const v = samples[i] as number;
        const x = (i / (samples.length - 1)) * w;
        const y = h / 2 - v * (h / 2) * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [mode]);

  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <div
      className={cn("relative rounded-lg overflow-hidden inline-block", className)}
      style={{
        background: "#080a07",
        border: "1px solid var(--vintage-border)",
        boxShadow:
          "inset 0 0 20px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: "block", width, height }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.4)",
        }}
      />

      {/* Mode label */}
      <div
        className="absolute top-1.5 right-2 text-[9px] font-bold uppercase tracking-wider pointer-events-none"
        style={{
          color: resolvedColor.current,
          opacity: 0.5,
          fontFamily: "var(--font-vintage-mono, monospace)",
          textShadow: `0 0 4px ${resolvedColor.current}`,
        }}
      >
        {mode === "fft" ? "FFT" : "WAVE"}
      </div>
    </div>
  );
}
