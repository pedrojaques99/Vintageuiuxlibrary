"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * Marquee — faixa contínua, dirigida pelo scroll.
 *
 * Colhida do concept Hockey Direct, onde ela nasceu com API em vez de virar
 * um `@keyframes` solto. Nenhuma cor mora aqui: `band` pinta com `--brand` e o
 * texto com `--brand-foreground`, então a mesma faixa sai lime numa marca e
 * âmbar noutra sem fork.
 *
 * O motor é GSAP + ScrollTrigger porque um `@keyframes` não sabe onde a página
 * está. Cinco decisões que valem mais que o código:
 *
 * 1. **`ease: "none"`, sempre.** Qualquer easing num loop infinito cria uma
 *    pulsação que o olho lê como defeito.
 * 2. **A lista é duplicada e o track anda `metade + gap/2`.** Metade da largura
 *    seco erra por meio vão — entre as duas cópias existe um `gap` a mais que
 *    ninguém conta, e o erro aparece como um tranco por volta. A cópia vai com
 *    `aria-hidden`: ela é artefato de animação, não conteúdo, e um leitor de
 *    tela não deve ouvir tudo duas vezes.
 * 3. **A distância é função, não número.** `invalidate()` no resize e no
 *    `fonts.ready` remede sem reiniciar o loop — a faixa não pisca quando a
 *    fonte da marca troca a webfont pela real.
 * 4. **Três formas de o scroll entrar, e elas não são a mesma.** `"boost"` toca
 *    o `timeScale`: a faixa tem ritmo próprio e o scroll empurra e inverte.
 *    `"drive"` toca o playhead com sentido travado: sem scroll a faixa está
 *    parada, e rolar para cima ou para baixo faz ela avançar igual. `"scrub"`
 *    amarra a posição à barra de rolagem: rolar de volta traz a faixa de volta.
 *    Escolher entre eles é escolher o que a faixa DIZ sobre a página.
 * 5. **Fora da tela ela para.** O próprio ScrollTrigger dá o `onToggle`; sem
 *    isso o compositor fica ocupado a página inteira, e num telefone isso é
 *    bateria gasta em pixel que ninguém vê.
 *
 * `prefers-reduced-motion` desliga tudo via `gsap.matchMedia` e o CSS do item
 * reflui a faixa em linhas — o conteúdo continua legível, sem movimento.
 *
 * Requer `gsap` no projeto.
 */

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  items: React.ReactNode[];
  /** Segundos para uma volta completa no ritmo base. Mais itens pedem mais tempo. */
  speed?: number;
  /** Some nas bordas em vez de ser cortado a faca. */
  fade?: boolean;
  /** Faixa de cor sólida com a cor da marca. */
  band?: boolean;
  /** Inclina a faixa. Exige um pai com `overflow: hidden`. */
  tilt?: number;
  /** Anda para a direita. Duas faixas em sentidos opostos leem como sistema. */
  reverse?: boolean;
  gap?: number;
  /**
   * Como o scroll entra na faixa.
   *
   * - `"boost"` (padrão): ela anda sozinha; o scroll acelera e inverte o sentido.
   * - `"drive"`: só anda com o scroll, sempre para o mesmo lado. Parou de rolar,
   *   parou a faixa — esteira ligada ao movimento da página.
   * - `"scrub"`: a posição É o scroll. Rolar de volta traz a faixa de volta.
   * - `false`: loop puro, indiferente à página.
   */
  scroll?: "boost" | "drive" | "scrub" | false;
  /** Teto do empurrão em `"boost"`. 4 = até 4× o ritmo base no scroll bruto. */
  boost?: number;
  /** Voltas percorridas na travessia da dobra em `"drive"` e `"scrub"`. */
  laps?: number;
  /** Pausa no hover/foco. Desligue em faixa puramente decorativa. */
  pauseOnHover?: boolean;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function Marquee({
  items,
  speed = 46,
  fade = false,
  band = false,
  tilt = 0,
  reverse = false,
  gap = 56,
  scroll = "boost",
  boost = 4,
  laps = 1,
  pauseOnHover = true,
  className,
  style,
  ...props
}: MarqueeProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLUListElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // A emenda: metade do track mais meio vão. Ver decisão 2.
        const lap = () => track.scrollWidth / 2 + gap / 2;
        const base = reverse ? -1 : 1;

        // Remede sem reiniciar: webfont que troca, container que muda de
        // largura, item que entra depois. `invalidate` relê a função de destino
        // mantendo o playhead onde está.
        const remeasure = () => {
          gsap.getTweensOf(track).forEach((t) => t.invalidate());
        };
        const ro = new ResizeObserver(remeasure);
        ro.observe(track);
        if (typeof document !== "undefined" && "fonts" in document) {
          document.fonts.ready.then(remeasure).catch(() => {});
        }

        /*
         * ── Por que a janela do ScrollTrigger tem uma tela de folga de cada lado
         *
         * O ScrollTrigger guarda `start`/`end` em cache e só recalcula no
         * `refresh`. Numa página que MONTA conteúdo enquanto a pessoa rola — e a
         * vitrine é exatamente isso — cada card que nasce acima empurra este
         * aqui para baixo, e o cache passa a apontar para um trecho de página
         * que não é mais o nosso. O sintoma é cruel de depurar: a faixa fica
         * surda ao scroll, ou pior, continua correndo fora da tela.
         *
         * A folga de 100% da viewport nos dois lados absorve esse deslocamento.
         * E quem decide de fato se a faixa está visível NÃO é ele — é o
         * IntersectionObserver abaixo, que é sempre ao vivo e não guarda cache.
         */
        const JANELA = {
          trigger: root,
          start: "top bottom+=100%",
          end: "bottom top-=100%",
        } as const;

        // ── modo scrub: a posição É o scroll ──────────────────────────────
        if (scroll === "scrub") {
          const tween = gsap.fromTo(
            track,
            { x: 0 },
            {
              x: () => -lap() * laps * base,
              ease: "none",
              // O modificador prende o x na faixa `[-1 volta, 0)`: é o único
              // intervalo em que as duas cópias cobrem a caixa inteira. Sem ele,
              // `laps > 1` — ou qualquer volta em `reverse` — arrastaria o track
              // para fora da emenda e abriria buraco na borda.
              modifiers: {
                x: (value: string) =>
                  `${gsap.utils.wrap(-lap(), 0, parseFloat(value))}px`,
              },
              scrollTrigger: {
                trigger: root,
                start: "top bottom",
                end: "bottom top",
                // 0.6s de inércia: o scrub cru gruda a faixa no dedo e fica
                // nervoso; a inércia devolve peso sem descolar do scroll.
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            },
          );
          return () => {
            ro.disconnect();
            tween.scrollTrigger?.kill();
            tween.kill();
          };
        }

        // ── modo loop: ritmo próprio ──────────────────────────────────────
        const tl = gsap.timeline({
          repeat: -1,
          // O truque oficial do GSAP para loop infinito TAMBÉM ao contrário:
          // um `repeat: -1` reproduzido em timeScale negativo pararia no zero.
          // Empurrar o playhead 10 durações à frente mantém o caminho aberto.
          onReverseComplete() {
            this.totalTime(this.rawTime() + this.duration() * 10);
          },
        });
        tl.fromTo(
          track,
          { x: 0 },
          { x: () => -lap(), duration: speed, ease: "none" },
        );
        tl.timeScale(base);

        // ── modo drive: o scroll é o motor, o sentido é travado ───────────
        //
        // A diferença para o `scrub`: ali a faixa VOLTA quando o scroll volta,
        // porque a posição dela É a barra de rolagem. Aqui só o *quanto* do
        // scroll conta, nunca o *para onde* — a faixa sempre avança, e parar de
        // rolar é o freio. Lê como esteira ligada ao movimento da página, e é o
        // que a maioria das pessoas quer dizer quando pede "marquee no scroll".
        if (scroll === "drive") {
          tl.pause();

          // O playhead anda por tween, não por atribuição direta: `totalTime`
          // cru gruda no dedo e treme junto com o delta do wheel. O `quickTo`
          // dá 0,5s de inércia — a esteira ganha peso e para de deslizar.
          const toTime = gsap.quickTo(tl, "totalTime", {
            duration: 0.5,
            ease: "power3.out",
          });

          let alvo = 0;
          let anterior: number | null = null;

          const st = ScrollTrigger.create({
            ...JANELA,
            onUpdate: (self) => {
              // `self.scroll()` é a posição real do scroller AGORA — não passa
              // pelo `start`/`end` em cache, então nenhum deslocamento de layout
              // a desalinha. `progress` passaria, e a esteira travaria sozinha.
              const agora = self.scroll();
              if (anterior === null) {
                anterior = agora;
                return;
              }
              const passo = Math.abs(agora - anterior);
              anterior = agora;

              // `laps` voltas por TELA rolada: a unidade que a pessoa sente. Em
              // fração da viewport, e não em pixels, o efeito é o mesmo no
              // celular e no monitor de 4K.
              alvo += (passo / window.innerHeight) * laps * speed;
              toTime(alvo);
            },
          });

          return () => {
            ro.disconnect();
            st.kill();
            tl.kill();
          };
        }

        let hovering = false;
        let onscreen = true;
        const sync = () => tl.paused(hovering || !onscreen);

        /*
         * Quem manda no "está na tela?" é o IntersectionObserver.
         *
         * O `onToggle` do ScrollTrigger responderia a mesma pergunta, e responde
         * errado numa página que cresce embaixo dele (ver a nota da JANELA).
         * O IO não guarda geometria: o navegador recalcula, e uma faixa que
         * saiu de vista para de queimar compositor no mesmo quadro.
         */
        const io = new IntersectionObserver(([e]) => {
          onscreen = e.isIntersecting;
          sync();
        });
        io.observe(root);

        const enter = () => {
          if (!pauseOnHover) return;
          hovering = true;
          sync();
        };
        const leave = () => {
          if (!pauseOnHover) return;
          hovering = false;
          sync();
        };
        track.addEventListener("pointerenter", enter);
        track.addEventListener("pointerleave", leave);
        track.addEventListener("focusin", enter);
        track.addEventListener("focusout", leave);

        // O sinal do timeScale carrega o sentido; o módulo carrega o ritmo.
        // Guardamos os dois separados para o scroll poder inverter um sem
        // perder o outro.
        let sign = base;
        let settle = 0;

        // UM `quickTo` para empurrar E para acomodar — nunca dois tweens na
        // mesma propriedade. Um `gsap.to(..., {overwrite: true})` de acomodação
        // MATA o tween interno que o `quickTo` reaproveita, e a partir daí o
        // empurrão morre em silêncio: a faixa continua andando, só que surda ao
        // scroll. Custou uma sessão de debug — fica registrado.
        const toScale = gsap.quickTo(tl, "timeScale", {
          duration: 0.4,
          ease: "power2.out",
        });

        const st = ScrollTrigger.create({
          ...JANELA,
          onUpdate: (self) => {
            if (scroll !== "boost" || !onscreen || hovering) return;

            const v = self.getVelocity();
            if (!v) return;

            // Rolar para baixo mantém o sentido natural da faixa; para cima
            // inverte. A faixa vira um instrumento do scroll, não um enfeite
            // que acontece de estar ali.
            sign = v > 0 ? base : -base;

            // 1400 px/s ≈ um flick forte de trackpad. Acima disso o teto de
            // `boost` segura: faixa a 10× vira borrão ilegível, e o texto da
            // promoção existe para ser lido.
            const factor = gsap.utils.clamp(1, boost, 1 + Math.abs(v) / 1400);
            toScale(sign * factor);

            // Parou de rolar → volta ao ritmo base, no sentido em que ficou.
            clearTimeout(settle);
            settle = window.setTimeout(() => toScale(sign), 180);
          },
        });

        return () => {
          clearTimeout(settle);
          ro.disconnect();
          io.disconnect();
          track.removeEventListener("pointerenter", enter);
          track.removeEventListener("pointerleave", leave);
          track.removeEventListener("focusin", enter);
          track.removeEventListener("focusout", leave);
          st.kill();
          tl.kill();
        };
      });

      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, [speed, reverse, gap, scroll, boost, laps, pauseOnHover, items.length]);

  const render = (hidden: boolean) =>
    items.map((item, i) => (
      <li
        key={`${hidden ? "b" : "a"}-${i}`}
        className="whitespace-nowrap"
        {...(hidden ? { "aria-hidden": true } : {})}
      >
        {item}
      </li>
    ));

  return (
    <div
      ref={rootRef}
      className={cn(
        "overflow-hidden",
        band && "bg-[var(--brand)] py-3.5 text-[var(--brand-foreground)]",
        className,
      )}
      style={{
        ...(fade
          ? {
              maskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
            }
          : null),
        ...(tilt
          ? { rotate: `${tilt}deg`, width: "108%", marginLeft: "-4%" }
          : null),
        ...style,
      }}
      {...props}
    >
      <ul
        ref={trackRef}
        className="marquee-track flex w-max items-center will-change-transform"
        style={{ gap: `${gap}px` }}
      >
        {render(false)}
        {render(true)}
      </ul>
    </div>
  );
}
