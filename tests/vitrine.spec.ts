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
 * A peça, pelo NOME do registry.
 *
 * O card mostra o título ("Logo Wall"); o nome ("logo-wall") é o que se digita
 * no `add`. Procurar pelo texto visível deixou quinze testes vermelhos no dia
 * em que o card trocou um pelo outro, sem nada ter quebrado. Âncora é atributo.
 */
const peca = (nome: string) => `article[data-name="${nome}"]`;


/**
 * A ficha de um item.
 *
 * Era um `dialog` do Radix e virou PÁGINA quando o site ganhou sidebar — duas
 * listas do mesmo acervo, uma escondendo a outra, era desenho repetido. O papel
 * mudou de `dialog` para `article`; o conteúdo, não.
 */
const ficha = (page: Page) => page.locator("[data-ficha]");

/**
 * O catálogo virou duas rotas, e os testes seguiram.
 *
 * `/catalogo` é o índice das seis categorias — sem demo montada. As peças vivas
 * moram em `/catalogo/<familia>`. Os invariantes de layout (nada rola de lado,
 * nada aparece cortado, a altura não oscila) mudaram de endereço, não de força:
 * eles valem onde há palco, e agora o palco é a fatia.
 *
 * `secoes` é a fatia usada como cobaia de propósito: é a que carrega
 * scroll-driven, pin e loop — se algum layout quebra, quebra ali.
 */
/*
 * `?nivel=alto`: estes testes provam a grade VIVA (monta perto da tela,
 * desmonta longe). O Chromium do teste não tem GPU real e cairia no nível médio
 * (`aparelho.ts`), onde a grade é foto até a intenção. Esse caso tem a própria
 * suíte, `aparelho.spec.ts`.
 */
const INDICE = "/catalogo?nivel=alto";
const FATIA = "/catalogo/secoes";
/** Peça de OUTRA família (`dados`), para provar que a fatia não vaza. */
const FORA_DA_FATIA = "kanban";
/** Peça desta fatia, para provar que ela está lá. */
const DENTRO_DA_FATIA = "pinned-scene";

async function esperarGrade(page: Page) {
  await page.waitForSelector(CARD);
  /*
   * Rede parada antes de medir.
   *
   * Os 400ms sozinhos mediam uma página no meio do carregamento: as capturas de
   * `/shots/` ainda chegando, a fonte ainda trocando. Com a máquina livre dava
   * tempo; com três workers disputando CPU, não — e o teste de rolagem
   * horizontal piscava vermelho uma rodada a cada duas, sempre com um culpado
   * diferente. Teste que pisca ensina o time a ignorar vermelho, que é pior do
   * que não ter o teste.
   *
   * `networkidle` espera o que de fato muda o layout aqui. Os 400ms continuam
   * depois dele, pro que monta em JS depois da última resposta.
   */
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
}

test.describe("catálogo — índice de categorias", () => {
  /*
   * O acervo inteiro numa página, sem montar o acervo inteiro.
   *
   * Com as 81 demos vivas de uma vez o documento fechava em 26.253px e uma
   * dúzia de relógios competia pelo mesmo quadro. Agora a peça monta quando o
   * ladrilho chega a uma tela de distância e desmonta quando se afasta: viva
   * perto do viewport, e só ali.
   */
  test("o índice lista o acervo inteiro e só monta o que está perto da tela", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INDICE);
    await page.waitForTimeout(800);

    const total = await page.locator(PECA).count();
    expect(total, "o acervo não foi listado").toBeGreaterThan(60);
    const vivas = await page.locator("[data-viva]").count();
    expect(vivas, "nenhuma peça viva perto da tela").toBeGreaterThan(0);
    expect(vivas, "o acervo inteiro montou de uma vez").toBeLessThan(total / 3);
  });

  /*
   * A peça acorda ANTES de aparecer: quem rola encontra a peça viva, e o hover
   * não troca nada. A troca foto → peça no hover pulava de escala e de marca
   * bem no instante em que a pessoa olhava fixo pro card.
   */
  test("rolar monta a peça antes de ela entrar na tela, e desmonta a que ficou longe", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INDICE);
    await page.waitForTimeout(600);

    const ultima = page.locator(PECA).last();
    const nome = await page.locator("article").last().getAttribute("data-name");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    await expect(ultima).toBeVisible();
    await expect(page.locator(`article[data-name="${nome}"][data-viva]`)).toHaveCount(1);

    // A primeira peça ficou muitas telas acima: não pode continuar montada.
    const primeira = await page.locator("article").first().getAttribute("data-name");
    await expect(page.locator(`article[data-name="${primeira}"][data-viva]`)).toHaveCount(0);
  });

  /* A linha de categorias NAVEGA: cada palavra é uma rota. */
  test("a linha de categorias leva à fatia certa", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INDICE);
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /^Seções\s*\d+$/ }).click();
    await page.waitForTimeout(500);

    expect(new URL(page.url()).pathname).toBe("/catalogo/secoes");
    await expect(page.locator(peca(DENTRO_DA_FATIA))).toHaveCount(1);
  });

  /*
   * A busca é uma só, a do cabeçalho (`⌘K`, ou `/` na grade). A grade tinha um
   * campo próprio ao lado, escrevendo em outro lugar — duas portas pro mesmo
   * dado.
   */
  test("a busca acha por uso, não só por nome", async ({ page }) => {
    await page.goto(INDICE);
    await page.waitForTimeout(400);

    await page.keyboard.press("/");
    await page.getByPlaceholder("Buscar componente, tag ou pacote").fill("arrastar");
    await page.waitForTimeout(300);
    // `scrub-input` não tem "arrastar" no nome: casa pela descrição/tag. E a
    // busca atravessa as famílias — ela é do catálogo inteiro, não da fatia.
    await expect(page.getByRole("option", { name: /scrub-input/ })).toHaveCount(1);
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

    await expect(page.locator(peca(DENTRO_DA_FATIA))).toHaveCount(1);
    await expect(page.locator(peca(FORA_DA_FATIA))).toHaveCount(0);

    /* A contagem na linha de categorias é a promessa; as peças são a entrega. */
    const cabecalho = page.getByRole("button", { name: /^Seções\s*\d+$/ });
    const prometido = Number((await cabecalho.textContent())?.match(/\d+/)?.[0]);
    expect(prometido, "a fatia veio vazia").toBeGreaterThan(0);
    expect(await page.locator(PECA).count()).toBe(prometido);
  });

  test("não rola na horizontal em nenhum tamanho de tela", async ({ page }) => {
    // Quatro cargas da fatia mais pesada (27 peças vivas, algumas WebGL): isolado
    // leva 12s; com os workers da suíte disputando CPU, passa dos 30s padrão.
    test.slow();
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
            // `hidden`/`clip` também: o que passa dali é cortado, não vaza (a
            // faixa do marquee anda por fora da caixa de propósito).
            if (["auto", "scroll", "hidden", "clip"].includes(overflowX)) return true;
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
   * O gatilho é o filtro de TIPO: dentro de uma fatia o eixo de família já está
   * decidido pela rota, e a busca virou diálogo (não filtra a grade). O tipo
   * encolhe a lista e mora na barra grudada, então alcança-se com a página
   * rolada — que é o caso que o defeito precisa.
   */
  test("filtrar leva aos resultados, mesmo com a página rolada", async ({ page }) => {
    // Três filtros sobre a fatia mais pesada, cada um com scroll que monta demos.
    test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(FATIA);
    await esperarGrade(page);

    await page.getByRole("button", { name: "Filtrar por tipo e dependência" }).click();
    for (const tipo of ["Hook", "Utilitário", "Componente"]) {
      const aba = page.getByRole("button", { name: new RegExp(`^${tipo}\\s*\\d+$`) });
      if (!(await aba.count())) continue;
      await page.evaluate(() => window.scrollTo(0, 3000));
      await page.waitForTimeout(700); // o scroll monta demos; deixa a página assentar
      await aba.click();
      await page.waitForTimeout(350);

      const topo = await page.locator(CARD).first().evaluate((el) => el.getBoundingClientRect().top);
      expect(topo, `primeiro card fora da tela depois de filtrar "${tipo}"`).toBeGreaterThan(0);
      expect(topo).toBeLessThan(900);
      await aba.click(); // desliga, pra o próximo tipo partir da fatia inteira
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
    await expect(ficha(page)).toBeVisible();
    // Quem tem link salvo não pode cair numa página vazia — mas a URL se corrige.
    expect(new URL(page.url()).pathname).toBe("/c/marquee");
    expect(new URL(page.url()).hash).toBe("");
  });

  test("abre por URL, navega com as setas e volta com Esc", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/c/kanban");

    const dialog = ficha(page);
    await expect(dialog).toBeVisible();

    /*
     * O TÍTULO da ficha, pela âncora, não "qualquer texto `kanban`": o nome da
     * peça aparece também no comando de instalar.
     */
    const titulo = dialog.locator("#ficha-titulo");
    await expect(titulo).toBeVisible();
    const antes = await titulo.textContent();

    await page.keyboard.press("ArrowRight");
    await expect(titulo).not.toHaveText(antes ?? "");

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    /*
     * Sair tem de voltar para a grade: senão o botão voltar do navegador
     * mente. Com o catálogo fatiado, a grade de `/c/kanban` é a fatia da peça —
     * `kanban` é da família `dados`. É o que faz as setas terem lista para
     * percorrer e o Esc entregar vizinhança em vez de uma página de capas.
     */
    expect(new URL(page.url()).pathname).toBe("/catalogo/dados");
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
    const dialog = ficha(page);
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
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
        const alvo = document.querySelector("[data-ficha]") as HTMLElement;
        return alvo.scrollWidth > alvo.clientWidth + 1;
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

    await expect(ficha(page).getByText("Pacotes", { exact: true })).toBeVisible();
    await expect(ficha(page).getByText(/^Nenhum,/)).toBeVisible();
  });

  test("a peça com dependência mostra o pacote, e ele aponta pra fora", async ({ page }) => {
    await page.goto("/c/timeline");
    await page.waitForTimeout(400);

    // `timeline` importa framer-motion, que na tela se chama pelo nome de hoje.
    const pill = page.locator('[data-ficha] a[title*="framer-motion"]');
    await expect(pill).toHaveCount(1);
    expect(await pill.getAttribute("href")).toMatch(/^https?:\/\//);
  });

  test("filtrar por dependência encolhe a grade e a contagem não mente", async ({ page }) => {
    // Dentro da fatia, e não no catálogo inteiro: é onde a barra de filtro tem
    // grade para encolher. `gsap` é a dependência mais comum aqui (8 peças).
    await page.goto(FATIA);
    await esperarGrade(page);

    const antes = await page.locator(PECA).count();

    // Tipo e npm vivem recolhidos atrás de um ícone, que acende quando há
    // filtro ligado — nada some, mas o teste precisa abrir, como a pessoa abre.
    await page.getByRole("button", { name: "Filtrar por tipo e dependência" }).click();
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
    // `base` é a fatia que tem hook: o eixo de tipo precisa de mais de um tipo pra filtrar.
    await page.goto("/catalogo/base");
    await esperarGrade(page);

    const botao = page.getByRole("button", { name: "Filtrar por tipo e dependência" });
    await botao.click();

    const hook = page.locator("[aria-pressed]", { hasText: /^Hook\s*\d+$/ });
    const esperado = Number((await hook.textContent())?.match(/\d+/)?.[0]);
    expect(esperado, "a fatia não tem hook nenhum").toBeGreaterThan(0);

    await hook.click();
    await page.waitForTimeout(400);
    expect(await page.locator(PECA).count()).toBe(esperado);

    /*
     * O modo de falha clássico de disclosure em barra de filtro: a pessoa
     * recolhe, esquece que ligou algo, e a lista fica curta sem explicação
     * visível. O ícone fica aceso (e marcado) justamente para isso.
     */
    await botao.click();
    await expect(botao).toHaveAttribute("aria-pressed", "true");
    expect(await page.locator(PECA).count()).toBe(esperado);
  });
});

/**
 * O painel de controles.
 *
 * É o pedaço da ficha que responde "serve pro meu caso?", e o modo de falha
 * dele é silencioso: o knob aparece, a pessoa mexe, e nada muda — porque a demo
 * não espalhou `props`, porque o preset aponta pra uma prop que sumiu, ou
 * porque o valor caiu fora da faixa. Nenhum desses dá erro em lugar nenhum.
 *
 * `scripts/controls-check.mjs` guarda a parte estática (preset × TypeScript).
 * O que sobra pra cá é a parte que só a tela prova: mexer muda a peça, e o
 * código de uso descreve o que está no palco.
 */
test.describe("painel de controles", () => {
  test("o painel nasce mostrando o que está no palco, não o padrão do código", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/c/rail");

    const dialog = ficha(page);
    /*
     * `fade` e `progress` têm padrão `false` no componente e a demo passa os
     * dois ligados (o `remainder` saiu da demo na rodada de 2026-10-20). A primeira versão do painel lia o padrão do código
     * e desenhava três chaves DESLIGADAS embaixo de um trilho com as três
     * ligadas — clicar pra ligar não mudava nada, e a conclusão de quem clica é
     * que a peça está quebrada.
     */
    for (const prop of ["fade", "progress"]) {
      await expect(
        dialog.getByRole("switch", { name: prop }),
        `a chave ${prop} não reflete o palco`,
      ).toHaveAttribute("aria-checked", "true");
    }
  });

  test("o preset aplica, se marca, e o código de uso acompanha", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/c/line-reveal");

    const dialog = ficha(page);
    /*
     * O código com os ajustes mora no topo da aba de código, e só existe
     * depois de a pessoa mexer em alguma coisa: sem ajuste, ele repetiria o
     * arquivo que está logo abaixo.
     */
    const uso = dialog.locator("[data-uso] pre");
    const desfoque = dialog.getByRole("button", { name: "desfoque", exact: true });

    await desfoque.click();
    await expect(desfoque).toHaveAttribute("aria-pressed", "true");

    // "Restaurar" só existe depois de a pessoa ter mexido em alguma coisa.
    const restaurar = dialog.getByRole("button", { name: /restaurar/i });
    await expect(restaurar).toBeVisible();

    // O preset é `{ variant: "blur", split: "words", stagger: 0.04 }`.
    await dialog.getByRole("button", { name: "Código", exact: true }).click();
    await expect(uso).toContainText('variant="blur"');
    await expect(uso).toContainText('split="words"');
    await expect(uso).toContainText("stagger={0.04}");

    await dialog.getByRole("button", { name: "Peça", exact: true }).click();
    await restaurar.click();
    await dialog.getByRole("button", { name: "Código", exact: true }).click();
    await expect(uso).toHaveCount(0);
  });

  test("mexer num knob muda a peça dentro do iframe de viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/c/logo-wall");

    const dialog = ficha(page);
    await dialog.getByLabel("Largura de celular (360px)").click();

    const frame = dialog.locator("iframe");
    await expect(frame).toBeVisible();
    // O iframe abre no estado atual dos knobs; sem `p` na query ele nasce limpo.
    expect(await frame.getAttribute("src")).not.toContain("p=");

    /*
     * A partir daqui a conversa é por `postMessage`, não por recarga: mudar a
     * query a cada quadro de um slider transformaria o controle numa
     * apresentação de slides. Então o `src` NÃO pode mudar quando o knob muda —
     * é justamente isso que este teste trava.
     */
    const antes = await frame.getAttribute("src");
    await dialog.getByRole("switch", { name: "fade" }).click();
    await page.waitForTimeout(300);
    expect(await frame.getAttribute("src"), "o iframe recarregou a cada knob").toBe(antes);

    // E o snippet registrou a mudança.
    await dialog.getByRole("button", { name: "Código", exact: true }).click();
    await expect(dialog.locator("[data-uso] pre")).toContainText("fade={false}");
  });
});
