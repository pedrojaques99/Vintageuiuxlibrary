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
/**
 * Toda peça na lista, com palco ou sem.
 *
 * `article` conta só quem tem demo. Desde que lib, hook e tema passaram a
 * entrar como LINHA na mesma coluna (em vez de numa aba "Sem interface"),
 * "quantas peças estão na tela" precisa de um seletor que enxergue as duas
 * formas — e `data-card-index` é justamente a âncora que as duas já tinham,
 * porque é por ela que a navegação por seta percorre a lista.
 */
const PECA = "[data-card-index]";

/**
 * O catálogo virou duas rotas, e os testes seguiram.
 *
 * `/catalogo` é o índice das seis categorias — sem demo montada. As peças vivas
 * moram em `/catalogo/<familia>`. Os invariantes de layout (nada rola de lado,
 * nada aparece cortado, a altura não oscila) mudaram de endereço, não de força:
 * eles valem onde há palco, e agora o palco é a fatia.
 *
 * `motion` é a fatia usada como cobaia de propósito: é a maior (22 peças) e a
 * que carrega scroll-driven, canvas e loop — se algum layout quebra, quebra ali.
 */
const INDICE = "/catalogo";
const FATIA = "/catalogo/motion";
/** Peça de OUTRA família (`trabalho`), para provar que a fatia não vaza. */
const FORA_DA_FATIA = "kanban";
/** Peça desta fatia, para provar que ela está lá. */
const DENTRO_DA_FATIA = "pinned-scene";

async function esperarGrade(page: Page) {
  await page.waitForSelector(CARD);
  // As demos montam ao entrar na tela; sem isto, medir altura pega o esqueleto.
  await page.waitForTimeout(400);
}

test.describe("catálogo — índice de categorias", () => {
  /*
   * A razão de o índice existir.
   *
   * Com as 81 entradas numa página só o documento fechava em 26.253px e montava
   * demo enquanto a pessoa ainda estava decidindo o que queria ver. O índice
   * escolhe; a fatia mostra. Palco montado aqui é o defeito voltando.
   */
  test("o índice não monta demo nenhuma", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INDICE);
    await page.waitForTimeout(600);

    expect(await page.locator(CARD).count(), "palco montado no índice").toBe(0);
    expect(await page.locator(PECA).count(), "peça listada no índice").toBe(0);
  });

  test("o card de categoria leva à fatia certa", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INDICE);
    await page.waitForTimeout(400);

    // A CAPA, não o chip: os dois carregam o mesmo rótulo (`FAMILIES`, em
    // catalog.tsx) e o chip filtra dentro da rota, enquanto a capa navega. Chip
    // tem `aria-pressed`; a capa, não — é o que separa os dois aqui.
    await page
      .locator("button:not([aria-pressed])", { hasText: "Motion e estado" })
      .first()
      .click();
    await page.waitForTimeout(500);

    expect(new URL(page.url()).pathname).toBe("/catalogo/motion");
    await expect(page.locator(CARD).filter({ hasText: DENTRO_DA_FATIA })).toHaveCount(1);
  });

  test("a busca acha por uso, não só por nome", async ({ page }) => {
    await page.goto(INDICE);
    await page.waitForTimeout(400);

    await page.getByLabel("Buscar no catálogo").fill("arrastar");
    await page.waitForTimeout(300);
    // `scrub-input` não tem "arrastar" no nome: casa pela descrição/tag. E a
    // busca atravessa as famílias — ela é do catálogo inteiro, não da fatia.
    await expect(page.locator(CARD).filter({ hasText: "scrub-input" })).toHaveCount(1);
  });

  test("o console fica limpo", async ({ page }) => {
    const erros: string[] = [];
    page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
    page.on("pageerror", (e) => erros.push(String(e)));

    await page.goto(INDICE);
    await page.waitForTimeout(600);
    /*
     * A capa de categoria pede `/shots/<peça>-{claro,escuro}.webp`, gerado
     * offline (`npm run build:shots`) e OPCIONAL por desenho: sem o arquivo, a
     * capa cai no nome da peça em mono. Enquanto o script não roda, o browser
     * registra a falha do asset — barulho de rede, não erro de aplicação. O que
     * este teste guarda é exceção de JavaScript e erro de React.
     */
    expect(erros.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
  });
});

test.describe("catálogo — fatia por família", () => {
  test("a fatia mostra as peças daquela família, e só elas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(FATIA);
    await esperarGrade(page);

    await expect(page.locator(CARD).filter({ hasText: DENTRO_DA_FATIA })).toHaveCount(1);
    await expect(page.locator(CARD).filter({ hasText: FORA_DA_FATIA })).toHaveCount(0);

    /*
     * O chip da categoria é a promessa; as peças na tela são a entrega.
     *
     * Dentro da fatia o chip de categoria navega em vez de filtrar, e o "Todos"
     * é a volta ao índice — por isso a conta é feita no chip da própria família,
     * e não no "Todos", que ali anuncia o catálogo inteiro de propósito.
     */
    const chip = page.locator("[aria-pressed]", { hasText: /^Motion e estado\s*\d+$/ });
    const prometido = Number((await chip.textContent())?.match(/\d+/)?.[0]);
    expect(prometido, "a fatia veio vazia").toBeGreaterThan(0);
    expect(await page.locator(PECA).count()).toBe(prometido);
  });

  test("não rola na horizontal em nenhum tamanho de tela", async ({ page }) => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(FATIA);
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
    await page.goto(FATIA);
    await esperarGrade(page);

    const alturas = await page.evaluate(async () => {
      const de = document.documentElement;
      const medidas: number[] = [];
      // A fatia é curta por desenho — varrer até o fim dela, não até um número
      // de pixels herdado da página que tinha o catálogo inteiro.
      const fim = de.scrollHeight;
      for (let y = 0; y < fim; y += 600) {
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
  /*
   * O bug da rolagem órfã, agora dentro da fatia.
   *
   * Filtrar corta o documento. O navegador prende a rolagem no novo fim e a
   * pessoa fica centenas de pixels abaixo do primeiro resultado, olhando um
   * vazio. Filtrar tem de levar aos resultados.
   *
   * O gatilho aqui é a BUSCA, e não mais o chip de família: dentro de uma fatia
   * o eixo de família já está decidido pela rota, então um chip de família seria
   * filtro sobre filtro. A busca encolhe a lista do mesmo jeito e existe nos
   * dois modos — é o gatilho que sobrevive à rota.
   */
  test("filtrar leva aos resultados, mesmo com a página rolada", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(FATIA);
    await esperarGrade(page);

    for (const termo of ["foto", "loader", "scroll"]) {
      await page.evaluate(() => window.scrollTo(0, 3000));
      await page.waitForTimeout(700); // o scroll monta demos; deixa a página assentar
      await page.getByLabel("Buscar no catálogo").fill(termo);
      await page.waitForTimeout(350);

      const topo = await page.locator(CARD).first().evaluate((el) => el.getBoundingClientRect().top);
      expect(topo, `primeiro card fora da tela depois de buscar "${termo}"`).toBeGreaterThan(0);
      expect(topo).toBeLessThan(900);
    }
  });

  /*
   * O defeito original: palco de altura fixa cortando as peças grandes.
   */
  test("nenhuma demo aparece cortada", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(FATIA);

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

  /*
   * Texto da cor do fundo.
   *
   * O chip de filtro ativo ficou ilegível porque o `tailwind-merge` achou que
   * `text-apoio` (um degrau de tamanho da casa) era uma cor, e descartou a cor
   * real do componente. Nada disso quebra build, typecheck ou portão: só a tela
   * mostra, e só se alguém olhar.
   */
  test("nada é escrito na cor do próprio fundo", async ({ page }) => {
    await page.goto(FATIA);
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

    await page.goto(FATIA);
    await esperarGrade(page);
    /*
     * Um grito é combinado, e está escrito nos dois lados.
     *
     * O `OctahedronLoader` chama `console.error` de propósito quando abre sem
     * `src` (`registry/visant/ui/octahedron-loader.tsx`: "a falha grita" — um
     * loader que quebra em silêncio custa horas de quem instalou), e a demo
     * mostra justamente esse estado genérico de propósito
     * (`src/app/demos/loading-gallery-demo.tsx`). Fatiar o catálogo foi o que
     * trouxe o aviso à tona: antes ele ficava a 20.000px da dobra e nunca
     * montava. Só ELE passa; qualquer outro erro continua reprovando.
     */
    expect(erros.filter((e) => !e.includes("[OctahedronLoader]"))).toEqual([]);
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
    /*
     * Fechar tem de voltar para a grade: senão o botão voltar do navegador
     * mente. Com o catálogo fatiado, a grade de `/c/kanban` é a fatia da peça —
     * `kanban` é da família `trabalho`. É o que faz as setas terem lista para
     * percorrer e o Esc entregar vizinhança em vez de uma página de capas.
     */
    expect(new URL(page.url()).pathname).toBe("/catalogo/trabalho");
  });

  /*
   * Fechar devolve à fatia de onde a peça saiu.
   *
   * Com o catálogo fatiado, mandar todo mundo de volta para o índice ao apertar
   * Esc apagaria o contexto de quem estava percorrendo uma categoria — abrir uma
   * peça custaria a navegação inteira.
   */
  test("fechar dentro de uma fatia devolve à fatia, não ao índice", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(FATIA);
    await esperarGrade(page);

    await page.locator(PECA).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(new URL(page.url()).pathname).toBe(FATIA);
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
    // `rail`, e não `marquee`: o marquee ganhou motor de GSAP e saiu da lista
    // dos que não custam nada. Quem trocar a peça de exemplo aqui, confira em
    // `deps.generated.json` que a nova continua sem `dependencies`.
    await page.goto("/c/rail");
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
    // Dentro da fatia, e não no catálogo inteiro: é onde a barra de filtro tem
    // grade para encolher. `gsap` é a dependência mais comum aqui (8 peças).
    await page.goto(FATIA);
    await esperarGrade(page);

    const antes = await page.locator(PECA).count();

    // Tipo e npm vivem recolhidos desde que a barra passou a ter uma linha
    // permanente só (a categoria). O botão diz quantos filtros estão ligados,
    // então nada some — mas o teste precisa abrir, como a pessoa abre.
    await page.locator("[aria-pressed]", { hasText: /Tipo e peso/ }).click();
    const gsap = page.locator("[aria-pressed]", { hasText: /^gsap\s*\d+$/ });
    const prometido = Number((await gsap.textContent())?.match(/\d+/)?.[0]);
    await gsap.click();
    await page.waitForTimeout(400);

    const depois = await page.locator(PECA).count();
    expect(depois, "o filtro de npm não encolheu nada").toBeLessThan(antes);
    // O número do chip é a promessa; as peças na tela são a entrega — e a
    // contagem do chip tem de estar no escopo da fatia, não do catálogo inteiro.
    expect(depois).toBe(prometido);
  });

  test("recolhido nunca esconde filtro ativo, e o eixo de tipo filtra", async ({ page }) => {
    await page.goto(FATIA);
    await esperarGrade(page);

    const botao = page.locator("[aria-pressed]", { hasText: /Tipo e peso/ });
    await botao.click();

    const hook = page.locator("[aria-pressed]", { hasText: /^hook\s*\d+$/ });
    const esperado = Number((await hook.textContent())?.match(/\d+/)?.[0]);
    expect(esperado, "a fatia não tem hook nenhum").toBeGreaterThan(0);

    await hook.click();
    await page.waitForTimeout(400);
    expect(await page.locator(PECA).count()).toBe(esperado);

    /*
     * O modo de falha clássico de disclosure em barra de filtro: a pessoa
     * recolhe, esquece que ligou algo, e a lista fica curta sem explicação
     * visível. O botão carrega a contagem justamente para isso.
     */
    await botao.click();
    await expect(botao).toHaveText(/Tipo e peso\s*1/);
    expect(await page.locator(PECA).count()).toBe(esperado);
  });
});
