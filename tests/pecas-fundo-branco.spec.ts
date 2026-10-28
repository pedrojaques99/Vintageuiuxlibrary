import { expect, test } from "@playwright/test";
import registry from "../registry.json" with { type: "json" };

/**
 * Toda peça tem de sobreviver a um fundo branco puro.
 *
 * O tema da casa tem papel quente, não `#fff`. A peça vai ser instalada em site
 * de cliente com branco de verdade — e é lá que um texto claro demais, uma borda
 * de 4% de contraste ou uma sombra branca somem. "Deve funcionar no branco" é
 * exatamente o tipo de frase que ninguém verifica e todo mundo repete.
 *
 * O que se afirma: **nenhum texto visível fica abaixo de 3:1 contra o fundo que
 * de fato está pintado atrás dele**. Três, e não 4,5, de propósito: o alvo aqui
 * é caçar o que SOME, não reprovar um rótulo secundário de 4,3 que a marca
 * escolheu. Contraste de texto miúdo é assunto do tema (Leonardo garante AA por
 * construção); o que este teste protege é o componente que assume um fundo que o
 * consumidor não tem.
 *
 * A conta de fundo efetivo sobe a árvore até achar cor opaca, porque
 * `background-color: transparent` é o valor mais comum e o mais mentiroso.
 */

const BANCADA = /^vintage-/;

const ITENS = (registry.items as { name: string; type: string }[])
  .filter((i) => i.type === "registry:ui" || i.type === "registry:block")
  .map((i) => i.name)
  .filter((n) => !BANCADA.test(n));

const BRANCO = "%23ffffff";

for (const nome of ITENS) {
  test(`${nome} continua legível no branco`, async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(`/c/${nome}?solo=1&bg=${BRANCO}`);
    await page.waitForTimeout(500);
    /*
     * Mede o estado ASSENTADO, não o meio da entrada.
     *
     * Peça que entra por opacidade (o `line-reveal`) passa uns quadros com o
     * texto a 40% — e um tempo fixo de espera mede esse quadro ou não conforme
     * a página carrega mais rápido ou mais devagar. Foi assim que ela ficou
     * vermelha no dia em que a casa parou de puxar fonte do Google no load: a
     * peça não mudou, o relógio do teste é que caiu no meio da animação.
     * Esperam-se as animações FINITAS; as em loop (marquee) nunca terminam.
     */
    await page.evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => undefined)),
        ),
        new Promise((r) => setTimeout(r, 4000)),
      ]),
    );
    await page.waitForTimeout(150);
    /*
     * Animação por JS não aparece em `getAnimations()`. O streamgraph cresce
     * com o `animate()` do motion, e sob a carga da suíte paralela o teste
     * media os rótulos no meio do caminho (contraste ~2,5) e reprovava a peça
     * certa. O que este teste quer é o estado FINAL: espera a pintura do texto
     * parar de mudar (duas leituras iguais seguidas), com teto de 4s, e mede
     * LOGO EM SEGUIDA. Peça que anima para sempre (o countdown vira um dígito
     * por segundo) só tem janelas curtas de repouso entre uma virada e outra:
     * esperar mais um pouco antes de medir caía na virada seguinte, com o
     * dígito no meio do fade. O texto entra na leitura para enxergar a troca.
     */
    await page.evaluate(async () => {
      const foto = () =>
        [...document.querySelectorAll("body *")]
          .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()))
          .map((el) => {
            const cs = getComputedStyle(el);
            return `${el.textContent}|${cs.color}|${cs.opacity}|${cs.fill}`;
          })
          .join(";");
      const fim = performance.now() + 4000;
      let antes = foto();
      while (performance.now() < fim) {
        await new Promise((r) => setTimeout(r, 120));
        const agora = foto();
        if (agora === antes) return;
        antes = agora;
      }
    });

    /*
     * Mede, e mede de novo se reprovar (até 4x, 300 ms entre uma e outra). Peça
     * que anima para sempre (o countdown vira um dígito por segundo) só repousa
     * em janelas curtas, e sob a carga da suíte paralela a amostra às vezes caía
     * no meio da virada. Texto ilegível de verdade reprova em TODAS as amostras;
     * o que passa numa é o estado de repouso, que é o que este teste julga.
     */
    const medir = () => page.evaluate(() => {
      const canal = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const lum = ([r, g, b]: number[]) =>
        0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
      /*
       * A cor é normalizada pelo canvas, não por regex.
       *
       * O tema é compilado em `oklch()` e é isso que `getComputedStyle` devolve.
       * Ler os três números com regex e tratar como RGB dá lixo: `oklch(0.94 …)`
       * vira `rgb(0.94, …)`, quase preto, e o teste acusa 1:1 em componente
       * saudável. Foi o que aconteceu na primeira rodada — 15 reprovações, todas
       * do medidor. O canvas resolve qualquer espaço de cor porque quem converte
       * é o próprio browser.
       */
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      const cache = new Map<string, [number, number, number, number]>();
      const parse = (cor: string): [number, number, number, number] => {
        const guardado = cache.get(cor);
        if (guardado) return guardado;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = cor;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        const v: [number, number, number, number] = [d[0], d[1], d[2], d[3] / 255];
        cache.set(cor, v);
        return v;
      };
      const sobre = (frente: number[], fundo: number[]) =>
        [0, 1, 2].map((i) => frente[i] * frente[3] + fundo[i] * (1 - frente[3]));

      /** Cor realmente pintada atrás do elemento. */
      const fundoEfetivo = (el: Element): number[] => {
        let atual: Element | null = el;
        let acumulado: number[] | null = null;
        while (atual) {
          const [r, g, b, a] = parse(getComputedStyle(atual).backgroundColor);
          if (a > 0) {
            acumulado = acumulado ? sobre([r, g, b, a], acumulado) : [r, g, b];
            if (a >= 0.999) return acumulado;
          }
          atual = atual.parentElement;
        }
        return acumulado ?? [255, 255, 255];
      };

      const razao = (a: number[], b: number[]) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };

      const achados: { texto: string; contraste: number; classe: string }[] = [];
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
        const proprio = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent?.trim() ?? "")
          .join(" ")
          .trim();
        if (!proprio) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;

        // Texto sobre foto/gradiente tem o próprio véu e não dá para medir por
        // cor computada — o `figcaption` do retrato é exatamente esse caso.
        const sobreImagem = (() => {
          let p: Element | null = el;
          while (p) {
            const bg = getComputedStyle(p).backgroundImage;
            if (bg && bg !== "none") return true;
            p = p.parentElement;
          }
          return false;
        })();
        if (sobreImagem) continue;

        /*
         * O mesmo vale para texto sobre uma <img>, <video> ou <canvas> que está
         * ATRÁS dele (o card do carrossel: título branco sobre a foto). A cor
         * computada do pai é a do papel, mas o que está pintado é a foto —
         * medir contra o papel acusava 1:1 em texto perfeitamente legível.
         */
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;

        /*
         * Texto recortado pelo próprio contêiner não está na tela: a parada 3 de
         * um scroller interno (o fog-garden) existe no DOM e ninguém a vê até
         * rolar. Medir esse texto contra o papel dava 1:1 em nada visível.
         */
        const recortado = (() => {
          if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return true;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const o = getComputedStyle(p);
            if (o.overflowX === "visible" && o.overflowY === "visible") continue;
            const k = p.getBoundingClientRect();
            if (cx < k.left || cx > k.right || cy < k.top || cy > k.bottom) return true;
          }
          return false;
        })();
        if (recortado) continue;

        /*
         * Texto em `mix-blend-mode` (o negativo do fog-garden: cor do papel em
         * `difference` sobre a névoa) pinta a DIFERENÇA com o que está atrás. A
         * cor computada é o papel por desenho, e a conta daria 1:1 sempre.
         */
        let mistura = false;
        for (let p: Element | null = el; p; p = p.parentElement) {
          if (getComputedStyle(p).mixBlendMode !== "normal") {
            mistura = true;
            break;
          }
        }
        if (mistura) continue;
        const sobreMidia = document
          .elementsFromPoint(cx, cy)
          .some((m) => m !== el && /^(IMG|VIDEO|CANVAS)$/.test(m.tagName));
        if (sobreMidia) continue;

        /*
         * Controle desabilitado não entra na conta.
         *
         * Apagar é como um controle desligado diz que está desligado — e a
         * própria WCAG 1.4.3 isenta componente inativo do mínimo de contraste.
         * Sem esta linha o portão reprova exatamente o desenho correto: o
         * `profile-form` abre com "Salvar" e "Desfazer" desabilitados (não há
         * mudança a salvar), a 40% de opacidade, e virava dois falsos
         * positivos. Portão que acusa o certo é portão que o time desliga.
         */
        if (el.closest("[disabled],[aria-disabled='true']")) continue;

        const [cr, cg, cb, ca] = parse(cs.color);
        const fundo = fundoEfetivo(el);
        // A opacidade do próprio elemento entra na conta: `opacity-70` num
        // cinza claro é o que costuma cruzar a linha.
        const alfa = ca * +cs.opacity;
        const cor = sobre([cr, cg, cb, alfa], fundo);
        const c = razao(cor, fundo);
        if (c < 3) {
          achados.push({
            texto: proprio.slice(0, 40),
            contraste: Math.round(c * 100) / 100,
            classe: String(el.className).slice(0, 50),
          });
        }
      }
      return achados;
    });
    let sumidos = await medir();
    for (let tentativa = 1; sumidos.length && tentativa < 4; tentativa++) {
      await page.waitForTimeout(300);
      sumidos = await medir();
    }

    expect(
      sumidos,
      `texto abaixo de 3:1 sobre branco: ${sumidos.map((s) => `"${s.texto}" ${s.contraste}:1`).join(" · ")}`,
    ).toHaveLength(0);
  });
}
