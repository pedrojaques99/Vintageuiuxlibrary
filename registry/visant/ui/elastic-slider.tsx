"use client";

/*
 * Adaptado de Elastic Slider — https://uiarc.dev/components/elastic-slider — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).
 */

import * as React from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

import { playSfx } from "@/lib/sfx-bus";
import { cn } from "@/lib/utils";

/**
 * Elastic Slider, o controle de valor que avisa o limite com o corpo.
 *
 * Um slider comum para seco na ponta: o dedo continua andando, o polegar não,
 * e quem arrasta não sabe se chegou ao fim ou se o controle travou. Aqui o
 * trilho ESTICA na direção do puxão, cada vez com menos vontade, e volta com a
 * velocidade da soltura. O limite deixa de ser um muro mudo e vira resposta.
 *
 * Decisões que não se veem de primeira:
 *
 * 1. **A resistência é a do iOS, não linear.** Cada pixel além do limite rende
 *    menos que o anterior e o total nunca passa de `stretch`. Esticar linear
 *    parece bug; com resistência parece borracha.
 * 2. **Só o trilho deforma.** O polegar e os ícones das pontas andam junto com
 *    a ponta esticada, mas não mudam de forma. O trilho afina enquanto alonga,
 *    como elástico puxado, e engrossa um pouco sob o dedo.
 * 3. **Nada disso passa pelo React.** Posição, estiramento e preenchimento são
 *    motion values: arrastar não renderiza a árvore a cada quadro. O React só
 *    fica sabendo do VALOR, que é o que o consumidor precisa.
 * 4. **O teclado também bate no limite.** Seta, Page e Home/End funcionam como
 *    no range nativo, e uma seta contra a ponta dá um tranco no trilho, pra
 *    tecla visivelmente encontrar alguma coisa em vez de não fazer nada.
 * 5. **O polegar tem posição por porcentagem, sem medir.** A camada dele tem a
 *    largura do trilho e anda `(valor - 100)%` de si mesma. A única medida é a
 *    largura em px, usada pra converter estiramento, e ela vem de um único
 *    ResizeObserver.
 *
 * `prefers-reduced-motion` tira o estiramento e o inchaço: o valor muda, o
 * polegar pula pro lugar, e o limite volta a ser só o limite.
 */

/** Mola física (rigidez + amortecimento) porque mola por tempo descarta a velocidade herdada do gesto. */
const MOLA_POLEGAR = { type: "spring" as const, stiffness: 520, damping: 40 };
/** A volta do elástico tem mais vida que o resto: é a única coisa que o usuário arremessou. */
const MOLA_VOLTA = { type: "spring" as const, stiffness: 260, damping: 13, restDelta: 0.05 };
/** Velocidade (px/s) com que uma tecla contra o limite bate no trilho. */
const TRANCO = 260;
/** Dentes do anel de foco no curso inteiro: um `focus` a cada dente cruzado no arrasto. */
const DENTES = 40;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const casas = (v: number) => (String(v).split(".")[1] ?? "").length;
/** Resistência de borracha: rende cada vez menos e nunca passa de `teto`. */
const borracha = (px: number, teto: number) =>
  Math.sign(px) * (1 - 1 / ((Math.abs(px) * 0.55) / teto + 1)) * teto;

export interface ElasticSliderProps {
  /** Rótulo visível; também dá nome ao polegar pra leitor de tela. */
  label: string;
  /** Valor controlado. Sem ele, o slider guarda o próprio estado. */
  value?: number;
  /** Valor inicial quando não controlado. */
  defaultValue?: number;
  /** Dispara a cada mudança, inclusive durante o arrasto. */
  onValueChange?: (value: number) => void;
  /** Dispara uma vez: ao soltar o arrasto ou a cada tecla. */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Quanto o trilho pode esticar além da ponta, em px. */
  stretch?: number;
  /** Formata o número mostrado e falado. */
  format?: (value: number) => string;
  /** Mostra o valor ao lado do rótulo. */
  showValue?: boolean;
  /** Ícone da ponta esquerda; é empurrado junto quando o trilho estica pra lá. */
  startIcon?: React.ReactNode;
  /** Ícone da ponta direita. */
  endIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

type Arrasto = {
  ponteiro: number;
  pega: number;
  amostras: { t: number; p: number }[];
  borda: number;
  /** Último dente do anel cruzado, pra soar só quando muda. */
  dente: number;
};

export function ElasticSlider({
  label,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step: stepProp = 1,
  stretch = 26,
  format,
  showValue = true,
  startIcon,
  endIcon,
  disabled,
  className,
}: ElasticSliderProps) {
  const reduzido = useReducedMotion() ?? false;
  const labelId = React.useId();
  const step = stepProp > 0 ? stepProp : 1;
  const faixa = max - min || 1;
  const decimais = Math.max(casas(step), casas(min));

  const [interno, setInterno] = React.useState(() => limitar(defaultValue ?? min, min, max));
  const atual = value === undefined ? interno : limitar(value, min, max);
  const formatar =
    format ??
    ((v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: decimais, maximumFractionDigits: decimais }));

  const pct = (v: number) => ((v - min) / faixa) * 100;
  const valorEm = (p: number) => min + (p / 100) * faixa;
  const ajustar = (v: number) =>
    limitar(Number((min + Math.round((v - min) / step) * step).toFixed(decimais)), min, max);

  const trilhoRef = React.useRef<HTMLDivElement>(null);
  const polegarRef = React.useRef<HTMLDivElement>(null);
  const ultimo = React.useRef(atual);
  const alvo = React.useRef(pct(atual));
  const arrasto = React.useRef<Arrasto | null>(null);
  const largura = React.useRef(1);
  const [arrastando, setArrastando] = React.useState(false);

  // `pos` é a posição em %, `alem` o estiramento em px (sinal = lado), `aperto` 0..1 sob o dedo.
  const pos = useMotionValue(pct(atual));
  const alem = useMotionValue(0);
  const aperto = useMotionValue(0);
  const polegarX = useTransform(pos, (p) => `${limitar(p, 0, 100) - 100}%`);
  const recorte = useTransform(pos, (p) => `inset(0 ${(100 - limitar(p, 0, 100)).toFixed(3)}% 0 0 round 999px)`);
  const escalaX = useTransform(alem, (px) => 1 + Math.abs(px) / largura.current);
  const origemX = useTransform(alem, (px) => (px < 0 ? 1 : 0));
  const escalaY = useTransform(() => (1 + aperto.get() * 0.4) * (1 - (Math.abs(alem.get()) / stretch) * 0.3));
  const empurraInicio = useTransform(alem, (px) => Math.min(0, px));
  const empurraFim = useTransform(alem, (px) => Math.max(0, px));

  const emitir = (proximo: number) => {
    if (ultimo.current === proximo) return;
    ultimo.current = proximo;
    if (value === undefined) setInterno(proximo);
    onValueChange?.(proximo);
  };

  // Valor que chega de fora do arrasto (prop, tecla) leva o polegar de onde ele está até o lugar novo.
  React.useLayoutEffect(() => {
    ultimo.current = atual;
    const destino = pct(atual);
    if (arrasto.current || alvo.current === destino) return;
    alvo.current = destino;
    if (reduzido) pos.jump(destino);
    else animate(pos, destino, MOLA_POLEGAR);
  });

  React.useEffect(() => {
    const no = trilhoRef.current;
    if (!no || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(([e]) => {
      if (e) largura.current = e.contentRect.width || 1;
    });
    obs.observe(no);
    return () => obs.disconnect();
  }, []);

  function seguir(estado: Arrasto, em: number, tempo: number) {
    const cru = em - estado.pega;
    const borda = limitar(cru, 0, 100);
    alem.set(reduzido ? 0 : borracha(((cru - borda) / 100) * largura.current, stretch));
    pos.set(borda);
    estado.borda = borda;
    // Som de anel de foco girando: um dente a cada 1/40 do curso, só no arrasto.
    const dente = Math.round((borda / 100) * DENTES);
    if (dente !== estado.dente) {
      estado.dente = dente;
      playSfx("focus");
    }
    estado.amostras.push({ t: tempo, p: borda });
    if (estado.amostras.length > 6) estado.amostras.shift();
    emitir(ajustar(valorEm(borda)));
  }

  function aoApertar(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || e.button !== 0 || !e.isPrimary) return;
    const r = trilhoRef.current?.getBoundingClientRect();
    if (!r) return;
    largura.current = r.width || 1;
    const em = ((e.clientX - r.left) / largura.current) * 100;
    // Pegou o polegar: ele fica onde está sob o dedo. Apertou o trilho: o polegar vem até o dedo.
    const pegouPolegar = !!(e.target as HTMLElement).closest("[data-polegar]");
    e.currentTarget.setPointerCapture(e.pointerId);
    const estado: Arrasto = { ponteiro: e.pointerId, pega: pegouPolegar ? em - pos.get() : 0, amostras: [], borda: pos.get(), dente: Math.round((pos.get() / 100) * DENTES) };
    arrasto.current = estado;
    setArrastando(true);
    polegarRef.current?.focus({ preventScroll: true });
    if (reduzido) aperto.jump(1);
    else animate(aperto, 1, MOLA_POLEGAR);
    seguir(estado, em, e.timeStamp);
  }

  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    const estado = arrasto.current;
    if (!estado || estado.ponteiro !== e.pointerId) return;
    const r = trilhoRef.current?.getBoundingClientRect();
    if (!r) return;
    seguir(estado, ((e.clientX - r.left) / (r.width || 1)) * 100, e.timeStamp);
  }

  function aoSoltar(e: React.PointerEvent<HTMLDivElement>) {
    const estado = arrasto.current;
    if (!estado || estado.ponteiro !== e.pointerId) return;
    arrasto.current = null;
    const a = estado.amostras;
    const primeira = a[0];
    const ultima = a[a.length - 1];
    const dt = primeira && ultima ? (ultima.t - primeira.t) / 1000 : 0;
    // Só herda velocidade de arrasto vivo: dedo parado antes de soltar não arremessa nada.
    const velocidade = primeira && ultima && dt > 0.008 && e.timeStamp - ultima.t < 60 ? (ultima.p - primeira.p) / dt : 0;
    const proximo = ajustar(valorEm(estado.borda));
    alvo.current = pct(proximo);
    if (reduzido) {
      pos.jump(alvo.current);
      alem.jump(0);
      aperto.jump(0);
    } else {
      animate(pos, alvo.current, { ...MOLA_POLEGAR, velocity: velocidade });
      animate(alem, 0, { ...MOLA_VOLTA, velocity: alem.getVelocity() });
      animate(aperto, 0, MOLA_POLEGAR);
    }
    emitir(proximo);
    setArrastando(false);
    onValueCommit?.(proximo);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const agora = ultimo.current;
    const grande = Math.max(step, ajustar(min + faixa / 10) - min);
    const passos: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: grande,
      PageDown: -grande,
    };
    let desejado: number;
    if (e.key === "Home") desejado = min;
    else if (e.key === "End") desejado = max;
    else if (e.key in passos) {
      const p = passos[e.key]!;
      desejado = agora + (e.shiftKey && e.key.startsWith("Arrow") ? Math.sign(p) * grande : p);
    } else return;
    e.preventDefault();
    const proximo = ajustar(desejado);
    if (proximo === agora) {
      const lado = Math.sign(desejado - agora);
      if (lado && !reduzido) animate(alem, 0, { ...MOLA_VOLTA, velocity: lado * TRANCO });
      return;
    }
    emitir(proximo);
    onValueCommit?.(proximo);
  }

  const texto = formatar(atual);

  return (
    <div
      className={cn("grid w-full min-w-0 select-none gap-2 text-sm text-foreground", disabled && "opacity-50", className)}
      data-arrastando={arrastando || undefined}
    >
      <div className="flex min-w-0 items-baseline justify-between gap-4">
        <span id={labelId} className="min-w-0 truncate font-medium">
          {label}
        </span>
        {showValue && (
          <span className="shrink-0 tabular-nums text-muted-foreground" aria-hidden="true">
            {texto}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {startIcon && (
          <motion.span className="flex shrink-0 text-muted-foreground" style={{ x: empurraInicio }} aria-hidden="true">
            {startIcon}
          </motion.span>
        )}

        {/* A linha inteira recebe o toque; rolagem vertical continua livre no telefone. */}
        <div
          className={cn("relative h-10 flex-1 touch-pan-y", disabled ? "cursor-not-allowed" : "cursor-pointer")}
          onPointerDown={aoApertar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onLostPointerCapture={aoSoltar}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* O trilho recua meio polegar de cada lado: nas pontas o polegar cabe inteiro na caixa. */}
          <div ref={trilhoRef} className="absolute inset-x-3 top-1/2 h-2 -translate-y-1/2">
            <motion.div
              className="absolute inset-0 rounded-[var(--r-pill)] bg-muted"
              style={{ scaleX: escalaX, scaleY: escalaY, originX: origemX }}
            >
              <motion.div className="absolute inset-0 rounded-[inherit] bg-[var(--brand)]" style={{ clipPath: recorte }} />
            </motion.div>
          </div>

          <div className="pointer-events-none absolute inset-x-3 inset-y-0">
            <motion.div className="absolute inset-0" style={{ x: polegarX }}>
              <motion.div className="absolute inset-0" style={{ x: alem }}>
                <motion.div
                  ref={polegarRef}
                  role="slider"
                  data-polegar=""
                  tabIndex={disabled ? -1 : 0}
                  aria-labelledby={labelId}
                  aria-valuemin={min}
                  aria-valuemax={max}
                  aria-valuenow={atual}
                  aria-valuetext={texto}
                  aria-orientation="horizontal"
                  aria-disabled={disabled || undefined}
                  onKeyDown={aoTeclar}
                  initial={false}
                  animate={{ scale: arrastando && !reduzido ? 1.2 : 1 }}
                  transition={reduzido ? { duration: 0 } : MOLA_POLEGAR}
                  className={cn(
                    "pointer-events-auto absolute right-0 top-1/2 size-6 translate-x-1/2 -translate-y-1/2",
                    "rounded-[var(--r-pill)] border border-border bg-background [box-shadow:var(--e-raised)]",
                    "outline-none focus-visible:[box-shadow:var(--focus)]",
                    "after:absolute after:-inset-3 after:content-['']",
                    disabled ? "cursor-not-allowed" : arrastando ? "cursor-grabbing" : "cursor-grab",
                  )}
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {endIcon && (
          <motion.span className="flex shrink-0 text-muted-foreground" style={{ x: empurraFim }} aria-hidden="true">
            {endIcon}
          </motion.span>
        )}
      </div>
    </div>
  );
}

export default ElasticSlider;
