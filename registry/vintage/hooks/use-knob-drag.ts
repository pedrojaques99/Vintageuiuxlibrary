import { useState, useRef, useEffect, useCallback } from "react";
import { playSfx } from "@/lib/sfx-bus";

interface UseKnobDragOptions {
  min?: number;
  max?: number;
  value?: number;
  sensitivity?: number;
  log?: boolean;
  /**
   * Detente, na escala normalizada (0…1). O arraste "cai" nele e precisa de um
   * empurrão a mais pra sair, como o clique do meio de um pot de EQ. `null`
   * desliga. Teclado e roda passam reto: são passos exatos, não mão.
   */
  detent?: number | null;
  onChange?: (value: number) => void;
}

/** Passos de som no curso inteiro: um estalo a cada 1/20 da volta. */
const PASSOS_SOM = 20;

/** Meia largura da zona do detente, em fração do curso. */
const ZONA_DETENTE = 0.035;

export function useKnobDrag({
  min = 0,
  max = 10,
  value = 5,
  sensitivity = 0.022,
  log = false,
  detent = 0.5,
  onChange,
}: UseKnobDragOptions = {}) {
  const [currentValue, setCurrentValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const lastY = useRef(0);
  /** Posição "da mão", sem o ímã do detente. É ela que anda no arraste. */
  const brutoRef = useRef(0);
  const detentRef = useRef(detent);
  detentRef.current = detent;
  /**
   * Último passo que estalou. O som sai SÓ da mão (arrasto, roda, teclado):
   * valor chegando por prop muda o eixo calado, senão um knob controlado por
   * automação viraria matraca.
   */
  const passoRef = useRef<number | null>(null);

  const valRef = useRef(currentValue);
  valRef.current = currentValue;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const minRef = useRef(min);
  minRef.current = min;
  const maxRef = useRef(max);
  maxRef.current = max;
  const logRef = useRef(log);
  logRef.current = log;

  const toNorm = useCallback((v: number) => {
    const mn = minRef.current, mx = maxRef.current;
    return logRef.current
      ? Math.log(v / mn) / Math.log(mx / mn)
      : (v - mn) / (mx - mn);
  }, []);

  const fromNorm = useCallback((n: number) => {
    const mn = minRef.current, mx = maxRef.current;
    return logRef.current ? mn * Math.pow(mx / mn, n) : mn + n * (mx - mn);
  }, []);

  const estalar = useCallback((v: number) => {
    const passo = Math.round(toNorm(v) * PASSOS_SOM);
    if (passoRef.current !== null && passo !== passoRef.current) playSfx("detent");
    passoRef.current = passo;
  }, [toNorm]);

  const clamp = useCallback(
    (v: number) => Math.max(minRef.current, Math.min(maxRef.current, v)),
    []
  );

  const rotation = -135 + toNorm(currentValue) * 270;

  useEffect(() => {
    if (value !== valRef.current) {
      setCurrentValue(value);
    }
  }, [value]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    lastY.current = e.clientY;
    brutoRef.current = toNorm(valRef.current);
    passoRef.current = Math.round(toNorm(valRef.current) * PASSOS_SOM);
    e.preventDefault();
  }, [toNorm]);

  const handleDoubleClick = useCallback(() => {
    const mid = fromNorm(0.5);
    setCurrentValue(mid);
    onChangeRef.current?.(mid);
  }, [fromNorm]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      const fine = e.shiftKey ? 0.002 : 0.012;
      const dir = e.deltaY < 0 ? 1 : -1;
      const norm = toNorm(valRef.current) + dir * fine;
      const next = clamp(fromNorm(Math.max(0, Math.min(1, norm))));
      if (passoRef.current === null) passoRef.current = Math.round(toNorm(valRef.current) * PASSOS_SOM);
      estalar(next);
      setCurrentValue(next);
      onChangeRef.current?.(next);
    },
    [toNorm, fromNorm, clamp, estalar]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      const dy = lastY.current - e.clientY;
      lastY.current = e.clientY;
      const fine = e.shiftKey ? 0.004 : sensitivity;
      const bruto = Math.max(0, Math.min(1, brutoRef.current + dy * fine));
      brutoRef.current = bruto;
      const d = detentRef.current;
      // Shift é o modo fino: quem pediu precisão não quer ímã.
      const norm =
        d !== null && !e.shiftKey && Math.abs(bruto - d) < ZONA_DETENTE ? d : bruto;
      const next = clamp(fromNorm(norm));
      if (next === valRef.current) return;
      estalar(next);
      valRef.current = next;
      setCurrentValue(next);
      onChangeRef.current?.(next);
    };

    const onUp = () => setIsDragging(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, sensitivity, toNorm, fromNorm, clamp, estalar]);

  /*
   * Teclado: o knob era só do mouse — sem foco, sem seta, invisível pra quem
   * navega por teclado ou leitor de tela. Os passos andam na escala NORMALIZADA
   * (a mesma do arrasto), então um knob logarítmico anda igual em toda a volta.
   * Seta = 1% (Shift = 0,2%, o "fino" do arrasto), Page = 10%, Home/End = limites.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const passo = e.shiftKey ? 0.002 : 0.01;
      const atual = toNorm(valRef.current);
      let norm: number | null = null;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") norm = atual + passo;
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") norm = atual - passo;
      else if (e.key === "PageUp") norm = atual + 0.1;
      else if (e.key === "PageDown") norm = atual - 0.1;
      else if (e.key === "Home") norm = 0;
      else if (e.key === "End") norm = 1;
      if (norm === null) return;
      e.preventDefault();
      // A seta é do knob: a página (atalhos da vitrine, scroll) não deve recebê-la junto.
      e.stopPropagation();
      const next = clamp(fromNorm(Math.max(0, Math.min(1, norm))));
      if (passoRef.current === null) passoRef.current = Math.round(atual * PASSOS_SOM);
      estalar(next);
      valRef.current = next;
      setCurrentValue(next);
      onChangeRef.current?.(next);
    },
    [toNorm, fromNorm, clamp, estalar]
  );

  return {
    currentValue,
    rotation,
    isDragging,
    handleMouseDown,
    handleDoubleClick,
    handleWheel,
    handleKeyDown,
  };
}
