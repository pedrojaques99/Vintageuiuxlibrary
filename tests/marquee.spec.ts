import { test, expect, type Page } from "@playwright/test";

/**
 * O marquee é a única peça do catálogo cujo defeito é INVISÍVEL numa captura:
 * uma faixa parada e uma faixa andando desenham o mesmo pixel no primeiro frame.
 * Foi assim que ela viveu na vitrine sem animar — a animação morava num
 * `@keyframes` que só o projeto de quem instala recebia.
 *
 * Agora o motor é GSAP, e este arquivo mede o que os olhos não conferem sozinhos:
 * velocidade em px/s, o sinal dela, e o silêncio quando é para ficar quieto.
 *
 * O caso que custou caro e que estes testes travam: um `gsap.to(..., {overwrite:
 * true})` de acomodação matava o tween interno do `quickTo` do empurrão. A faixa
 * continuava andando — só ficava surda ao scroll. Nenhum erro, nenhum log.
 */

/** A demo mostra as três faixas: 0 = boost, 1 = drive, 2 = a solta. */
const xDoTrack = (page: Page, i = 0) =>
  page.evaluate((n) => {
    const t = document.querySelectorAll(".marquee-track")[n] as HTMLElement | undefined;
    return t ? new DOMMatrixReadOnly(getComputedStyle(t).transform).m41 : null;
  }, i);

/** A volta da faixa: metade do track mais meio vão. A conta do componente. */
const voltaDaFaixa = (page: Page, i = 0) =>
  page.evaluate((n) => {
    const t = document.querySelectorAll(".marquee-track")[n] as HTMLElement;
    return t.scrollWidth / 2 + parseFloat(getComputedStyle(t).columnGap || "0") / 2;
  }, i);

/*
 * O deslocamento CURTO entre duas leituras.
 *
 * Medir `x2 - x1` cru mente uma vez por volta: no instante em que o loop emenda,
 * o x salta de `-volta` para `0` e a conta acusa a faixa "andando 600px para a
 * direita" quando ela não mudou de sentido nenhum. Como duas leituras nunca
 * distam mais de meia volta na prática, o caminho curto é o verdadeiro.
 */
const deltaCurto = (x1: number, x2: number, volta: number) => {
  const d = ((((x2 - x1) % volta) + volta * 1.5) % volta) - volta / 2;
  return d;
};

/** Velocidade média em px/s da faixa numa janela de tempo. */
async function pxPorSegundo(page: Page, ms = 900, faixa = 0) {
  const volta = await voltaDaFaixa(page, faixa);
  const antes = await xDoTrack(page, faixa);
  const t0 = Date.now();
  await page.waitForTimeout(ms);
  const depois = await xDoTrack(page, faixa);
  return (deltaCurto(antes!, depois!, volta) / (Date.now() - t0)) * 1000;
}

/**
 * Traz a faixa para o meio da tela.
 *
 * As demos montam por interseção, então o card nem existe no DOM antes de o
 * scroll passar perto — daí o laço em vez de um `scrollIntoView` direto.
 */
async function centralizarFaixa(page: Page) {
  await page.goto("/catalogo");
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(() => !!document.querySelector(".marquee-track"))) break;
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(50);
  }
  await page.waitForSelector(".marquee-track");
  await page.evaluate(() =>
    document.querySelector(".marquee-track")!.scrollIntoView({ block: "center" }),
  );
  await page.waitForTimeout(1200);
}

/**
 * Rola em passos curtos, de propósito.
 *
 * Um `scrollBy(1000)` tira a faixa da tela no meio da medição e o que se mede
 * vira a pausa fora da dobra, não o empurrão. Passos de 45px mantêm o card
 * dentro da janela do ScrollTrigger do começo ao fim.
 */
/**
 * Devolve a média E o pico de velocidade durante a cutucada.
 *
 * O pico existe porque a média mente sob carga: com a máquina ocupada, cada
 * passo demora mais do que os 35ms pedidos, o empurrão decai entre um passo e
 * outro (o `quickTo` volta ao ritmo base em 0,4s) e a média desce até encostar
 * no ritmo normal. O teste então acusaria "o scroll não empurra" quando o que
 * faltou foi CPU. O pico é o que o olho vê no gesto real.
 */
async function cutucarScroll(page: Page, sentido: 1 | -1, passos = 8, px = 45, faixa = 0) {
  const volta = await voltaDaFaixa(page, faixa);
  let anterior = (await xDoTrack(page, faixa))!;
  const t0 = Date.now();
  let andado = 0;
  let pico = 0;
  let marco = Date.now();
  // Soma passo a passo: numa janela longa o modo `drive` anda mais de meia
  // volta e o "caminho curto" passaria a apontar para o lado errado. Amostrar
  // a cada cutucada mantém cada trecho bem abaixo desse limite.
  for (let i = 0; i < passos; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), sentido * px);
    await page.waitForTimeout(35);
    const agora = (await xDoTrack(page, faixa))!;
    const passo = deltaCurto(anterior, agora, volta);
    const taxa = (passo / Math.max(1, Date.now() - marco)) * 1000;
    if (Math.abs(taxa) > Math.abs(pico)) pico = taxa;
    andado += passo;
    anterior = agora;
    marco = Date.now();
  }
  return { media: (andado / (Date.now() - t0)) * 1000, pico };
}

test("a faixa anda sozinha, e o scroll acelera e inverte o sentido", async ({ page }) => {
  await centralizarFaixa(page);

  const base = await pxPorSegundo(page);
  expect(base, "parada é o defeito histórico: tem que andar para a esquerda").toBeLessThan(-8);

  const descendo = await cutucarScroll(page, 1);
  expect(Math.abs(descendo.pico), "scroll para baixo empurra").toBeGreaterThan(Math.abs(base) * 1.3);
  expect(descendo.media, "e mantém o sentido").toBeLessThan(0);

  await page.waitForTimeout(700);
  const subindo = await cutucarScroll(page, -1);
  expect(subindo.media, "scroll para cima inverte").toBeGreaterThan(0);

  // Parou de rolar: volta ao ritmo base, no sentido em que ficou.
  await page.waitForTimeout(900);
  const acomodada = await pxPorSegundo(page);
  expect(Math.abs(Math.abs(acomodada) - Math.abs(base))).toBeLessThan(4);
});

test("o x nunca sai da emenda", async ({ page }) => {
  await centralizarFaixa(page);
  await cutucarScroll(page, 1, 10);
  await page.waitForTimeout(600);

  const x = (await xDoTrack(page))!;
  const volta = await voltaDaFaixa(page);

  expect(x).toBeLessThanOrEqual(1);
  expect(x, "fora de [-volta, 0] a emenda abre buraco na borda").toBeGreaterThanOrEqual(-volta - 1);
});

test("fora da tela ela para", async ({ page }) => {
  await centralizarFaixa(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  expect(Math.abs(await pxPorSegundo(page, 700))).toBeLessThan(0.5);
});

test("o ponteiro pausa e devolve", async ({ page }) => {
  await centralizarFaixa(page);
  const centro = await page.evaluate(() => {
    const r = document.querySelector(".marquee-track")!.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  await page.mouse.move(centro.x, centro.y);
  await page.waitForTimeout(300);
  expect(Math.abs(await pxPorSegundo(page, 700))).toBeLessThan(0.5);

  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  expect(Math.abs(await pxPorSegundo(page, 700))).toBeGreaterThan(8);
});

test("prefers-reduced-motion desliga o movimento", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await centralizarFaixa(page);
  expect(Math.abs(await pxPorSegundo(page, 800))).toBeLessThan(0.5);
  await ctx.close();
});

/*
 * O modo `drive` é o que a maioria pede quando fala "marquee no scroll", e é
 * também o mais fácil de implementar errado: quem amarra a posição à barra de
 * rolagem entrega uma faixa que ANDA DE RÉ quando a pessoa sobe a página. Aqui
 * o sentido é travado — subir e descer empurram para o mesmo lado.
 */
test("drive: parada sem scroll, e o sentido não depende de para onde se rola", async ({ page }) => {
  await centralizarFaixa(page);

  expect(Math.abs(await pxPorSegundo(page, 900, 1)), "sem scroll, parada").toBeLessThan(0.5);

  const descendo = await cutucarScroll(page, 1, 8, 45, 1);
  expect(descendo.media, "descer empurra a faixa").toBeLessThan(-3);

  await page.waitForTimeout(900);
  expect(Math.abs(await pxPorSegundo(page, 700, 1)), "parou de rolar, parou").toBeLessThan(1);

  const subindo = await cutucarScroll(page, -1, 8, 45, 1);
  expect(subindo.media, "subir empurra para o MESMO lado").toBeLessThan(-3);
});
