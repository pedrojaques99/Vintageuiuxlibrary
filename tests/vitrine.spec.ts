import { expect, test, type Page } from "@playwright/test";

/**
 * O que esta suíte protege.
 *
 * Cada teste aqui corresponde a um defeito que chegou aos olhos do dono do repo
 * porque nada no projeto era capaz de vê-lo: build passava, typecheck passava,
 * os portões do registry passavam, e a página estava quebrada na tela. São
 * invariantes de layout — não comparação de pixel, que quebra a cada ajuste de
 * sombra e ensina o time a ignorar teste vermelho.
 */

const CARD = "article";
const CHIP = (nome: string) => `[aria-pressed] >> text=${nome}`;

async function esperarGrade(page: Page) {
  await page.waitForSelector(CARD);
  // As demos montam ao entrar na tela; sem isto, medir altura pega o esqueleto.
  await page.waitForTimeout(400);
}

test.describe("catálogo", () => {
  test("não rola na horizontal em nenhum tamanho de tela", async ({ page }) => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await esperarGrade(page);

      const { scrollW, clientW, culpados } = await page.evaluate(() => {
        const de = document.documentElement;

        // Sair da viewport só é defeito quando ninguém combinou isso: a faixa de
        // famílias rola na horizontal de propósito no celular, e os filhos dela
        // passam do limite por desenho. O que não pode é a PÁGINA rolar de lado.
        const dentroDeRolagem = (el: HTMLElement) => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const overflowX = getComputedStyle(p).overflowX;
            if (overflowX === "auto" || overflowX === "scroll") return true;
          }
          return false;
        };

        const culpados = [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1)
          .filter((el) => !dentroDeRolagem(el))
          .slice(0, 3)
          .map((el) => el.tagName + "." + String(el.className).slice(0, 40));

        return { scrollW: de.scrollWidth, clientW: de.clientWidth, culpados };
      });

      expect(culpados, `elementos vazando em ${width}px`).toEqual([]);
      expect(scrollW, `scroll horizontal em ${width}px`).toBeLessThanOrEqual(clientW + 1);
    }
  });

  /*
   * O bug da faixa branca.
   *
   * Os cards declaravam uma altura estimada errada (`contain-intrinsic-size` só
   * do palco, sem o rodapé nem a escala). A cada card que entrava na tela o
   * documento mudava de tamanho, o scroll era reajustado e sobravam faixas em
   * branco com o cabeçalho aparentemente solto no meio da página.
   */
  test("a altura do documento não muda durante o scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await esperarGrade(page);

    const alturas = await page.evaluate(async () => {
      const de = document.documentElement;
      const medidas: number[] = [];
      for (let y = 0; y < 14000; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
        medidas.push(de.scrollHeight);
      }
      return medidas;
    });

    const variacao = Math.max(...alturas) - Math.min(...alturas);
    expect(variacao, "altura do documento oscilando durante o scroll").toBe(0);
  });

  /*
   * O bug da rolagem órfã.
   *
   * Filtrar corta o documento (46 itens → 9). O navegador prende a rolagem no
   * novo fim e a pessoa fica centenas de pixels abaixo do primeiro resultado,
   * olhando um vazio. Filtrar tem de levar aos resultados.
   */
  test("filtrar leva aos resultados, mesmo com a página rolada", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await esperarGrade(page);

    /*
     * "Fundação" saiu desta lista de propósito, não porque quebrou.
     *
     * A vitrine passou a separar quem tem demo de quem não tem: `lib`, `hook`,
     * `theme` e `base` foram para a aba "Sem interface", e o filtro de família
     * mostra só as famílias que existem na aba aberta. Fundação é inteira sem
     * interface, então o chip não existe mais aqui — e chip que promete um
     * número e leva a nada é pior do que chip nenhum.
     */
    for (const familia of ["Superfície de trabalho", "Kit vintage", "Aquisição"]) {
      await page.evaluate(() => window.scrollTo(0, 3000));
      await page.waitForTimeout(700); // o scroll monta demos; deixa a página assentar
      await page.locator(CHIP(familia)).first().click();
      await page.waitForTimeout(350);

      const topo = await page.locator(CARD).first().evaluate((el) => el.getBoundingClientRect().top);
      expect(topo, `primeiro card fora da tela depois de filtrar por ${familia}`).toBeGreaterThan(0);
      expect(topo).toBeLessThan(900);
    }
  });

  /*
   * O defeito original: palco de altura fixa cortando as peças grandes.
   */
  test("nenhuma demo aparece cortada", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Passa por toda a página para montar todas as demos.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(600);

    const cortados = await page.evaluate(() =>
      [...document.querySelectorAll("article")]
        .map((a) => {
          const palco = a.firstElementChild as HTMLElement | null;
          const sobra = palco ? palco.scrollHeight - palco.clientHeight : 0;
          return { nome: a.querySelector("[data-card-index]")?.textContent ?? "?", sobra };
        })
        .filter((x) => x.sobra > 2),
    );

    expect(cortados, "demos transbordando o palco").toEqual([]);
  });

  test("a busca acha por uso, não só por nome", async ({ page }) => {
    await page.goto("/");
    await esperarGrade(page);

    await page.getByLabel("Buscar no catálogo").fill("arrastar");
    await page.waitForTimeout(250);
    // `scrub-input` não tem "arrastar" no nome: casa pela descrição/tag.
    await expect(page.locator(CARD).filter({ hasText: "scrub-input" })).toHaveCount(1);
  });

  /*
   * Texto da cor do fundo.
   *
   * O chip de filtro ativo ficou ilegível porque o `tailwind-merge` achou que
   * `text-apoio` (um degrau de tamanho da casa) era uma cor, e descartou a cor
   * real do componente. Nada disso quebra build, typecheck ou portão: só a tela
   * mostra, e só se alguém olhar.
   */
  test("nada é escrito na cor do próprio fundo", async ({ page }) => {
    await page.goto("/");
    await esperarGrade(page);

    const invisiveis = await page.evaluate(() => {
      const cor = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop);
      const fundoReal = (el: Element): string => {
        for (let n: Element | null = el; n; n = n.parentElement) {
          const bg = cor(n, "background-color");
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        }
        return "rgb(255, 255, 255)";
      };
      return [...document.querySelectorAll<HTMLElement>("[aria-pressed], button, a")]
        .filter((el) => el.textContent?.trim())
        .filter((el) => cor(el, "color") === fundoReal(el))
        .slice(0, 5)
        .map((el) => el.textContent!.trim().slice(0, 30));
    });

    expect(invisiveis, "texto com a mesma cor do fundo").toEqual([]);
  });

  test("o console fica limpo", async ({ page }) => {
    const erros: string[] = [];
    page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
    page.on("pageerror", (e) => erros.push(String(e)));

    await page.goto("/");
    await esperarGrade(page);
    expect(erros).toEqual([]);
  });
});

test.describe("vista de foco", () => {
  test("o link antigo com hash continua abrindo, e a URL fica limpa", async ({ page }) => {
    await page.goto("/#/c/marquee");
    await expect(page.getByRole("dialog")).toBeVisible();
    // Quem tem link salvo não pode cair numa página vazia — mas a URL se corrige.
    expect(new URL(page.url()).pathname).toBe("/c/marquee");
    expect(new URL(page.url()).hash).toBe("");
  });

  test("abre por URL, navega com as setas e volta com Esc", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/c/kanban");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("kanban", { exact: true }).first()).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText("kanban", { exact: true })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Fechar tem de voltar para a grade: senão o botão voltar do navegador mente.
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("a peça cabe inteira em cada preset de viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/c/vintage-eq");
    await page.waitForTimeout(500);

    for (const preset of ["Largura de celular (360px)", "Largura de tablet (768px)", "Largura cheia"]) {
      await page.getByLabel(preset).click();
      await page.waitForTimeout(250);
      const vazando = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
        return dialog.scrollWidth > dialog.clientWidth + 1;
      });
      expect(vazando, `peça vazando no preset ${preset}`).toBe(false);
    }
  });
});

/*
 * A conta do que a peça custa.
 *
 * O dado sai do `registry.json` por um script (`deps-extract.mjs`), e um JSON
 * gerado é exatamente o tipo de coisa que envelhece em silêncio: ninguém regera,
 * a vitrine passa a anunciar dependência de uma versão anterior do item, e tudo
 * — build, tipos, portões — continua verde. Estes testes olham a tela.
 */
test.describe("dependências npm", () => {
  test("a peça sem dependência diz isso em voz alta", async ({ page }) => {
    await page.goto("/c/marquee");
    await page.waitForTimeout(400);

    const ficha = page.locator('[role="dialog"]');
    await expect(ficha.getByText("Dependências npm")).toBeVisible();
    await expect(ficha.getByText(/^Nenhuma\./)).toBeVisible();
  });

  test("a peça com dependência mostra o pacote, e ele aponta pra fora", async ({ page }) => {
    await page.goto("/c/timeline");
    await page.waitForTimeout(400);

    // `timeline` importa framer-motion, que na tela se chama pelo nome de hoje.
    const pill = page.locator('[role="dialog"] a[title*="framer-motion"]');
    await expect(pill).toHaveCount(1);
    expect(await pill.getAttribute("href")).toMatch(/^https?:\/\//);
  });

  test("filtrar por dependência encolhe a grade e a contagem não mente", async ({ page }) => {
    await page.goto("/");
    await esperarGrade(page);

    const todos = page.locator("[aria-pressed]", { hasText: /^Todos\s*\d+$/ });
    const antes = Number((await todos.textContent())?.match(/\d+/)?.[0]);

    await page.locator("[aria-pressed]", { hasText: /^motion\s*\d+$/ }).click();
    await page.waitForTimeout(400);

    const depois = Number((await todos.textContent())?.match(/\d+/)?.[0]);
    expect(depois, "o filtro de npm não encolheu nada").toBeLessThan(antes);
    // O número do chip é a promessa; os cards na tela são a entrega.
    expect(await page.locator(CARD).count()).toBe(depois);
  });
});
