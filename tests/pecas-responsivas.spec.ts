import { expect, test } from "@playwright/test";
import registry from "../registry.json" with { type: "json" };

/**
 * Cada peça do registry, sozinha, num viewport de celular de verdade.
 *
 * Por que sozinha e por que num viewport próprio: a vitrine desenha a peça no
 * tamanho declarado e escala para caber. Escala muda o tamanho na tela e não
 * muda NADA para o CSS — media query lê o viewport, não o container. Rodando a
 * suíte contra a grade, um componente que nunca empilha passa sorrindo, porque
 * o `sm:` dele continua valendo dentro do "celular" de mentira.
 *
 * O caso que motivou: no preset de 360 da vitrine, a barra do `cta-surface` não
 * empilhava e o título espremia em cinco linhas. A peça estava certa — o palco é
 * que testava errado.
 *
 * A rota `?solo=1` existe para isto: a mesma aplicação, o mesmo CSS, a mesma
 * peça, sem casca. Com o viewport do Playwright em 360, o breakpoint vale.
 *
 * O que se afirma aqui é **invariante**, não pixel: nada escapa da largura da
 * tela. Comparação de imagem quebraria a cada ajuste de sombra e ensinaria o
 * time a ignorar teste vermelho.
 */

/*
 * O kit vintage fica de fora, e não por conveniência.
 *
 * São instrumentos skeuomórficos de bancada: um banco de faders tem oito trilhos
 * de 300px de altura, um knob grande tem escala gravada em volta. A largura
 * mínima deles é física — encolher para 360px não é responsividade, é outro
 * componente. Eles são desktop por desenho, e o `vintage-base` diz isso.
 *
 * A regra é por FAMÍLIA e está escrita aqui, não uma lista de nomes que cresce
 * toda vez que alguém quer o verde de volta. Peça nova que não caiba no celular
 * reprova — como tem de ser.
 */
const BANCADA = /^vintage-/;

const ITENS = (registry.items as { name: string; type: string }[])
  .filter((i) => i.type === "registry:ui" || i.type === "registry:block")
  .map((i) => i.name)
  .filter((n) => !BANCADA.test(n));

for (const largura of [360, 768]) {
  test.describe(`peças a ${largura}px`, () => {
    for (const nome of ITENS) {
      test(`${nome} não estoura`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 900 });
        await page.goto(`/c/${nome}?solo=1`);
        // A peça monta e a fonte assenta; medir antes pega o texto na métrica
        // errada e a largura muda depois do assert.
        await page.waitForTimeout(500);

        const { scrollW, clientW, culpados } = await page.evaluate(() => {
          const de = document.documentElement;
          const culpados: string[] = [];
          for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
            const r = el.getBoundingClientRect();
            if (!r.width) continue;
            if (r.right > de.clientWidth + 1) {
              /*
               * Estar mais largo que a tela só é defeito se ESCAPAR dela.
               *
               * Um marquee é `w-max` por definição — a faixa é mais larga que o
               * viewport de propósito, e quem segura é o `overflow-hidden` do
               * pai. Contar isso como vazamento reprovaria o componente por
               * fazer exatamente o que ele existe para fazer, e um teste que
               * acusa o correto é um teste que o time aprende a ignorar.
               */
              let p: HTMLElement | null = el.parentElement;
              let contido = false;
              while (p && p !== document.body) {
                const o = getComputedStyle(p).overflowX;
                if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") {
                  contido = true;
                  break;
                }
                p = p.parentElement;
              }
              if (!contido) {
                culpados.push(
                  `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} (+${Math.round(r.right - de.clientWidth)}px)`,
                );
              }
            }
          }
          return { scrollW: de.scrollWidth, clientW: de.clientWidth, culpados: culpados.slice(0, 5) };
        });

        expect(culpados, `vazam para fora da tela: ${culpados.join(" · ")}`).toHaveLength(0);
        expect(scrollW, "o documento rola na horizontal").toBeLessThanOrEqual(clientW + 1);
      });
    }
  });
}
