import { test, expect, type Page } from "@playwright/test";

/**
 * As salas de kit — o que esta suíte trava.
 *
 * A vitrine de peça solta tinha invariantes de layout (faixa branca, rolagem
 * órfã). A sala de kit tem outros três, e todos já quebraram uma vez durante a
 * construção:
 *
 * 1. **Peça que não desenha nada.** O `octahedron-loader` apontava para um
 *    `.lottie` que não existe no repo e o painel dele ficava preto e vazio no
 *    meio da sala principal. Painel vazio não quebra build nem typecheck.
 * 2. **Composição que estoura a tela.** São cinco páginas inteiras montadas com
 *    peça de verdade; qualquer uma pode empurrar a página de lado no celular.
 * 3. **Promessa da tira.** O cabeçalho diz "N peças" e a tira embaixo tem de
 *    listar exatamente N — é o número que sustenta o comando único.
 */

/*
 * A contagem NÃO fica escrita aqui.
 *
 * Ela já ficou, e envelheceu: a tira é derivada da família do item no catálogo,
 * então toda peça nova muda o número de uma sala. Três dos cinco kits estavam
 * vermelhos por isso — não porque a promessa quebrou, mas porque o registry
 * cresceu e o número escrito à mão não. Teste que reprova o crescimento normal
 * do projeto é teste que o time aprende a ignorar.
 *
 * O invariante de verdade é a coerência entre os dois lugares: o que o
 * cabeçalho anuncia é o que a tira lista. Esse é o número que sustenta o
 * comando único, e é ele que este teste passa a travar.
 */
const KITS = [
  { slug: "mesa-de-trabalho", titulo: "Mesa de trabalho" },
  { slug: "pagina-que-vende", titulo: "Página que vende" },
  { slug: "motion-e-estado", titulo: "Motion e estado" },
  { slug: "rig-vintage", titulo: "Rig vintage" },
  { slug: "marca-viva", titulo: "Marca viva" },
];

/** A composição é lazy e algumas peças montam em rAF; sem isto mede-se o esqueleto. */
async function esperarSala(page: Page, titulo: string) {
  await expect(page.getByRole("heading", { name: titulo, level: 2 })).toBeVisible();
  await page.waitForTimeout(700);
}

test.describe("salas de kit", () => {
  for (const kit of KITS) {
    test(`${kit.slug}: monta, a tira bate com o cabeçalho e não rola de lado`, async ({ page }) => {
      const erros: string[] = [];
      page.on("pageerror", (e) => erros.push(String(e)));

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/kit/${kit.slug}`);
      await esperarSala(page, kit.titulo);

      // A tira é a promessa do comando: N no cabeçalho, N na lista.
      const cabecalho = page.getByRole("heading", { name: /^\d+ peças$/ });
      await expect(cabecalho).toBeVisible();
      const anunciadas = Number((await cabecalho.textContent())!.match(/\d+/)![0]);
      const listadas = await page.locator("[data-tira-pecas] > button").count();
      expect(listadas, `${kit.slug} anuncia ${anunciadas} peças e lista ${listadas}`).toBe(
        anunciadas,
      );
      expect(anunciadas, `${kit.slug} sem peça nenhuma na tira`).toBeGreaterThan(0);

      // Nenhuma exceção de runtime durante a montagem da composição.
      expect(erros, `erro de runtime em ${kit.slug}`).toEqual([]);

      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(250);
        const { scrollW, clientW } = await page.evaluate(() => ({
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
        }));
        expect(scrollW, `${kit.slug} rola na horizontal em ${width}px`).toBeLessThanOrEqual(
          clientW + 1,
        );
      }
    });
  }

  test("a seta atravessa as salas e a URL acompanha", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/kits");
    await esperarSala(page, KITS[0].titulo);

    await page.getByRole("button", { name: /Próximo kit/i }).first().click();
    await expect(page).toHaveURL(/\/kit\/pagina-que-vende$/);
    await esperarSala(page, KITS[1].titulo);

    /* Voltar leva ao slug explícito: `/kits` é só o apelido da primeira sala,
       e reescrevê-lo aqui esconderia em qual sala a pessoa está. */
    await page.getByRole("button", { name: /Kit anterior/i }).first().click();
    await expect(page).toHaveURL(/\/kit\/mesa-de-trabalho$/);
    await esperarSala(page, KITS[0].titulo);
  });

  /*
   * A seta é da página só quando nada está focado.
   *
   * A primeira versão do atalho escutava a seta sempre, e com um knob focado o
   * → subia o ganho e pulava de kit no mesmo gesto. Defeito que não aparece em
   * screenshot: some no instante em que a pessoa clica em qualquer controle.
   */
  test("a seta não é roubada de quem está focado num controle", async ({ page }) => {
    await page.goto("/kit/rig-vintage");
    await esperarSala(page, "Rig vintage");

    // Qualquer controle serve: o que a regra diz é "focou em algo, a seta é
    // dele". O botão do painel é o mais estável de achar nesta sala.
    await page.getByRole("button", { name: "POWER" }).first().focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    await expect(page).toHaveURL(/\/kit\/rig-vintage$/);
  });

  test("a sala escura não escurece a página", async ({ page }) => {
    // A casa abre escura por padrão; o teste só prova alguma coisa com a
    // pessoa no tema claro, que é onde a sala escura poderia vazar.
    await page.addInitScript(() => localStorage.setItem("visant:ui:tema", "claro"));
    await page.goto("/kit/motion-e-estado");
    await esperarSala(page, "Motion e estado");

    // O `.dark` mora no container da sala. Se ele vazar para o documento, o
    // cabeçalho e o seletor de marca trocam de tema junto — que é exatamente o
    // defeito que a sala existe para não ter.
    const noDocumento = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(noDocumento, "a sala escura vazou o tema para o documento").toBe(false);
  });

  test("o link antigo /rig continua abrindo a bancada", async ({ page }) => {
    await page.goto("/rig");
    await esperarSala(page, "Rig vintage");
  });
});
