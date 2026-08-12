"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Erase Field — fundo que a mão RASPA pra revelar a luz por baixo.
 *
 * Colhido da dobra de CTA final do `visantismo`. O problema que ele resolve é
 * comercial, não decorativo: a dobra que pede a compra costuma ser a única sem
 * nada acontecendo — título, linha e botão sobre preto liso. O gesto que ela
 * ganha aqui é "o trabalho já está lá, você só tira a poeira de cima".
 *
 * ── Como é feito, e por que assim ──────────────────────────────────────────
 *
 * · DUAS camadas num canvas só. Primeiro pinta a LUZ (o que está por baixo),
 *   depois a POEIRA por cima; o cursor rasga a poeira com `destination-out`.
 *   Dois canvas empilhados no DOM custariam um composite a mais por quadro sem
 *   ganhar nada.
 *
 * · O acabamento é LÍQUIDO, não de borracha. Três coisas fazem isso, e nenhuma
 *   é opcional se a intenção é "orgânico":
 *     1. o pincel é um carimbo de gradiente radial com queda suave, não um
 *        traço de `lineTo` com ponta redonda — traço tem contorno, tinta não;
 *     2. os carimbos saem em cacho, com raio e desvio sorteados: sobrepostos,
 *        buracos vizinhos se FUNDEM em vez de se encostarem, que é o que dá o
 *        comportamento de gota;
 *     3. a mão tem inércia — o pincel persegue o ponteiro por interpolação.
 *        Cursor grudado no pincel lê como software; pincel que corre atrás lê
 *        como matéria.
 *
 * · A LUZ embaixo é quatro bolhas em órbitas incomensuráveis entre si (os
 *   divisores são primos entre si de propósito), então o desenho revelado nunca
 *   repete e não tem "loop" perceptível.
 *
 * · A poeira VOLTA, e volta torto: um véu radial grande em deriva, não um
 *   `fillRect` de alpha uniforme. Uniforme, o buraco fecha como um fade e
 *   denuncia o truque; em deriva, fecha por um lado antes do outro.
 *
 * · Sem ponteiro, ela se raspa sozinha devagar. Efeito que só existe sob hover
 *   é efeito que a maioria nunca vê — e no celular, ninguém.
 *
 * ── O que mudou na colheita ────────────────────────────────────────────────
 *
 * O original lia `--accent` com um parser de `#rrggbb`. O registry emite
 * **OKLCH**, então aquele parser cairia no cyan da Visant em toda marca — o
 * fallback silencioso de novo. Aqui a cor é lida de uma sonda: um nó com
 * `background-color: var(--brand)`, e `getComputedStyle` devolve `rgb(...)`
 * resolvido pelo próprio navegador, seja qual for o espaço de cor. E ela é
 * relida no resize, então trocar de tema em runtime repinta.
 *
 * Contratos de sistema: DPR com teto de 2, `ResizeObserver`,
 * `IntersectionObserver` (rAF parado fora da tela), `pointer-events: none` no
 * canvas — o botão continua sendo o botão — e `prefers-reduced-motion`
 * desenhando UM quadro: o fundo continua existindo, o movimento é que não.
 */

/* Um canvas 1×1 é o conversor: `fillStyle` engole qualquer notação de CSS Color
   4 (oklch, color(), hsl…) e `getImageData` devolve os canais já em sRGB.

   Aqui morava o defeito de "cor de fundo fora do tema". A sonda estava certa —
   ela lê a var a partir do HOST, então pega o tema de um container `.dark` —
   mas o que vinha depois não: um regex de números em cima da string. E
   `getComputedStyle().backgroundColor` só serializa em `rgb()` o que já é sRGB;
   token em OKLCH volta como `oklch(0.145 0 0)`, e o regex lia isso como
   `rgb(0.145, 0, 0)` — preto, em qualquer tema. O tema claro deste repo usa hex
   (`#717182`), que o regex acertava; o escuro usa OKLCH, que ele destruía. Daí
   "funciona no claro, some no escuro". Sem regex, isso não volta a acontecer
   quando alguém trocar o token para `color-mix()` ou `lab()`.

   O sentinela é o teste de recusa: `fillStyle` inválido é IGNORADO em silêncio
   pela spec, então se o valor continuar magenta o navegador não entendeu, e o
   fallback é honesto em vez de pintar magenta na tela. */
// Hex cru de propósito: não é cor de UI, é o valor-marcador do teste de recusa
// do `fillStyle`. Nunca chega à tela.
const SENTINELA = "#ff00ff";
let pipeta: CanvasRenderingContext2D | null | undefined;

function paraRGB(valor: string, fallback: [number, number, number]): [number, number, number] {
  if (pipeta === undefined) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    pipeta = cv.getContext("2d", { willReadFrequently: true });
  }
  if (!pipeta || !valor) return fallback;
  pipeta.fillStyle = SENTINELA;
  pipeta.fillStyle = valor;
  if (pipeta.fillStyle === SENTINELA) return fallback;
  pipeta.fillRect(0, 0, 1, 1);
  const d = pipeta.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

/** Resolve a var a partir do HOST — o tema pode estar num container, não no `<html>`. */
function sonda(host: HTMLElement, custom: string, fallback: [number, number, number]) {
  const el = document.createElement("span");
  el.style.cssText = `position:absolute;width:0;height:0;background-color:var(${custom})`;
  host.appendChild(el);
  const lido = getComputedStyle(el).backgroundColor;
  host.removeChild(el);
  return paraRGB(lido, fallback);
}

export interface EraseFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Var de cor da luz revelada. Default `--brand`. */
  lightVar?: string;
  /** Var de cor da poeira que cobre. Default `--background`. */
  dustVar?: string;
  /** Intensidade da luz, 0–1. Acima de ~0.7 o texto por cima começa a sofrer. */
  intensity?: number;
  children?: React.ReactNode;
}

export function EraseField({
  lightVar = "--brand",
  dustVar = "--background",
  intensity = 0.5,
  className,
  children,
  ...props
}: EraseFieldProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d");
    const poeira = document.createElement("canvas");
    const pctx = poeira.getContext("2d");
    if (!ctx || !pctx) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let luzRGB: [number, number, number] = [82, 221, 235];
    let dustRGB: [number, number, number] = [10, 10, 11];
    let w = 0;
    let h = 0;
    let t = 0;
    let rodando = false;
    // px/py = onde o pincel está (com inércia); tx/ty = pra onde ele vai.
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    let temPonteiro = false;
    let ociosoDesde = 0;
    let raf = 0;

    const rgba = (c: [number, number, number], a: number) =>
      `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    /* A luz, num buffer de METADE da resolução e esticada na hora de compor.
       São cinco preenchimentos de tela cheia por quadro; em meia escala custam
       um quarto dos pixels, e como não existe uma única borda dura aqui — é
       tudo gradiente — a interpolação da esticada é literalmente invisível. */
    const luzCv = document.createElement("canvas");
    const lctx = luzCv.getContext("2d")!;
    const ESCALA = 0.5;

    function luz(ms: number) {
      const lw = luzCv.width;
      const lh = luzCv.height;
      const g = lctx.createLinearGradient(0, 0, 0, lh);
      g.addColorStop(0, rgba(dustRGB, 1));
      g.addColorStop(1, rgba(dustRGB, 1));
      lctx.globalCompositeOperation = "source-over";
      lctx.fillStyle = g;
      lctx.fillRect(0, 0, lw, lh);

      // Duas grandes e frias dão a massa; duas menores dão o brilho. Os
      // divisores são primos entre si: órbitas que não fecham juntas não batem.
      const bolhas: Array<[number, number, number, number]> = [
        [0.5 + Math.sin(ms / 7900) * 0.16, 0.46 + Math.cos(ms / 11300) * 0.14, 0.72, 1],
        [0.34 + Math.cos(ms / 6100) * 0.2, 0.6 + Math.sin(ms / 8700) * 0.18, 0.5, 0.64],
        [0.68 + Math.sin(ms / 9700) * 0.18, 0.38 + Math.cos(ms / 5300) * 0.2, 0.42, 0.56],
        [0.5 + Math.cos(ms / 4300) * 0.26, 0.55 + Math.sin(ms / 6700) * 0.22, 0.26, 0.44],
      ];
      const r0 = Math.max(lw, lh);
      lctx.globalCompositeOperation = "lighter";
      for (const b of bolhas) {
        const x = b[0] * lw;
        const y = b[1] * lh;
        const r = b[2] * r0 * 0.5;
        const a = b[3] * intensity;
        const rg = lctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, rgba(luzRGB, a));
        rg.addColorStop(0.45, rgba(luzRGB, a * 0.22));
        rg.addColorStop(1, rgba(luzRGB, 0));
        lctx.fillStyle = rg;
        lctx.fillRect(0, 0, lw, lh);
      }
      lctx.globalCompositeOperation = "source-over";
      ctx!.drawImage(luzCv, 0, 0, lw, lh, 0, 0, w, h);
    }

    /* O pincel é um SPRITE, desenhado uma vez. A versão anterior montava um
       `createRadialGradient` por carimbo e passava `filter: blur(14px)` no
       contexto — com até nove carimbos por quadro isso é uma passada de filtro
       em tela cheia nove vezes a 60fps, e travava o renderer num gesto rápido.
       Um `drawImage` de sprite dá a MESMA borda, porque quem faz a borda morrer
       devagar é a queda do gradiente, não o blur. */
    const pincel = document.createElement("canvas");
    {
      const S = 128;
      pincel.width = pincel.height = S;
      const g2 = pincel.getContext("2d")!;
      const g = g2.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.4, "rgba(0,0,0,0.82)");
      g.addColorStop(0.75, "rgba(0,0,0,0.3)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      g2.fillStyle = g;
      g2.fillRect(0, 0, S, S);
    }

    /* Raspa do ponto anterior até o atual. Interpola pra o rastro não sair
       pontilhado num gesto rápido, e sorteia raio e desvio a cada carimbo: é o
       sorteio que tira a cara de tubo e devolve a de gota. O teto de 10 existe
       porque um salto grande (troca de aba, scroll brusco) não pode virar um
       pico de centenas de draws num quadro só. */
    function raspar(x0: number, y0: number, x1: number, y1: number, forca: number) {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const base = 46 + Math.min(34, d * 0.7); // gesto rápido, pincel mais largo
      const n = Math.min(10, Math.max(1, Math.ceil(d / 14)));
      pctx!.globalCompositeOperation = "destination-out";
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const jx = (Math.random() - 0.5) * base * 0.5;
        const jy = (Math.random() - 0.5) * base * 0.5;
        const r = base * (0.62 + Math.random() * 0.6);
        // 0.62, não 0.4: com 0.4 cada carimbo mal marcava, o rasgo dependia de
        // sobreposição e o gesto lia como "quase não aconteceu nada". A borda
        // continua morrendo devagar — quem faz a maciez é a queda do gradiente
        // do sprite, não este alpha.
        pctx!.globalAlpha = 0.62 * forca;
        pctx!.drawImage(pincel, x0 + (x1 - x0) * u + jx - r, y0 + (y1 - y0) * u + jy - r, r * 2, r * 2);
      }
      pctx!.globalAlpha = 1;
      pctx!.globalCompositeOperation = "source-over";
    }

    /** A poeira volta. Véu radial gigante e fora de centro, em deriva. */
    function repor(ms: number, a: number) {
      const x = w * (0.5 + Math.sin(ms / 12100) * 0.4);
      const y = h * (0.5 + Math.cos(ms / 9100) * 0.4);
      const g = pctx!.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 1.1);
      g.addColorStop(0, rgba(dustRGB, a));
      g.addColorStop(1, rgba(dustRGB, a * 0.35));
      pctx!.fillStyle = g;
      pctx!.fillRect(0, 0, w, h);
    }

    /* Passeio ocioso: uma Lissajous lenta, curva sem repetição visível e sem
       nenhum canto. Só entra depois de 1.2s sem ponteiro, pra não brigar com a
       mão de quem está de fato mexendo. */
    const ocioso = (ms: number): [number, number] => [
      w * (0.5 + Math.sin(ms / 5200) * 0.3 + Math.sin(ms / 2300) * 0.06),
      h * (0.5 + Math.cos(ms / 3900) * 0.26 + Math.cos(ms / 1700) * 0.05),
    ];

    /* Reduced motion: a luz e a poeira ficam, com um rasgo já aberto no meio
       pra a dobra não parecer um retângulo chapado. Um quadro, sem loop. */
    function quadroEstatico() {
      raspar(w * 0.3, h * 0.62, w * 0.72, h * 0.42, 1);
      luz(0);
      ctx!.drawImage(poeira, 0, 0, w, h);
    }

    function medir() {
      const r = host!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      // Relido a cada medida: trocar de tema em runtime tem que repintar.
      luzRGB = sonda(host!, lightVar, luzRGB);
      dustRGB = sonda(host!, dustVar, dustRGB);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      poeira.width = w;
      poeira.height = h;
      pctx!.setTransform(1, 0, 0, 1, 0, 0);
      luzCv.width = Math.max(1, Math.round(w * ESCALA));
      luzCv.height = Math.max(1, Math.round(h * ESCALA));
      repor(0, 1); // nasce fechada
      px = tx = w * 0.5;
      py = ty = h * 0.5;
      if (reduzido) quadroEstatico();
    }

    function quadro(now: number) {
      if (!rodando) return;
      t = now;
      let x = tx;
      let y = ty;
      if (!temPonteiro || now - ociosoDesde > 1200) {
        [x, y] = ocioso(now);
      }
      const ax = px;
      const ay = py;
      px += (x - px) * 0.12; // inércia: persegue, não teletransporta
      py += (y - py) * 0.12;
      // 0.62 no passeio ocioso (era 0.45): quem nunca leva o ponteiro até aqui
      // — celular inteiro — só vê o passeio, e ele não pode ser o irmão fraco.
      if (Math.hypot(px - ax, py - ay) > 0.4) raspar(ax, ay, px, py, temPonteiro ? 1 : 0.62);
      repor(now, 0.008); // a poeira volta mais devagar, senão ela come o rasgo

      ctx!.clearRect(0, 0, w, h);
      luz(now);
      ctx!.drawImage(poeira, 0, 0, w, h);
      raf = requestAnimationFrame(quadro);
    }

    const aoMover = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      temPonteiro = true;
      ociosoDesde = t;
    };
    const aoSair = () => {
      temPonteiro = false;
    };
    host.addEventListener("pointermove", aoMover, { passive: true });
    host.addEventListener("pointerleave", aoSair);

    const ro = new ResizeObserver(medir);
    ro.observe(host);
    medir();

    /* Trocar de tema não muda tamanho nenhum, então o ResizeObserver não acorda
       e o campo ficaria com a cor do tema anterior até alguém redimensionar a
       janela — o "relido no resize" acima só valia por acidente. Vigiar a classe
       do `<html>` (é lá que o botão de tema escreve) custa um observer. */
    const mo = new MutationObserver(() => {
      luzRGB = sonda(host, lightVar, luzRGB);
      dustRGB = sonda(host, dustVar, dustRGB);
      // A poeira é um BUFFER: os pixels dela já estão pintados na cor do tema
      // anterior, e `repor` só sobrepõe 0.011 de alpha por quadro. Sem apagar,
      // o campo ficava com o fundo claro de antes por segundos dentro do tema
      // escuro — que é literalmente a queixa de "cor de fundo fora do tema".
      pctx!.clearRect(0, 0, w, h);
      repor(0, 1);
      if (reduzido) quadroEstatico(); // sem laço, o repinte tem que ser pedido
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let io: IntersectionObserver | undefined;
    if (!reduzido) {
      io = new IntersectionObserver(
        (es) => {
          if (es[0].isIntersecting) {
            if (!rodando) {
              rodando = true;
              raf = requestAnimationFrame(quadro);
            }
          } else {
            rodando = false;
          }
        },
        { threshold: 0.02 },
      );
      io.observe(host);
    }

    return () => {
      rodando = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io?.disconnect();
      host.removeEventListener("pointermove", aoMover);
      host.removeEventListener("pointerleave", aoSair);
    };
  }, [lightVar, dustVar, intensity]);

  return (
    <div ref={hostRef} className={cn("relative isolate overflow-hidden", className)} {...props}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      />
      {children}
    </div>
  );
}
