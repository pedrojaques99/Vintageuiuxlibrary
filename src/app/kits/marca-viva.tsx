"use client";

/**
 * Marca viva — o kit que faz os outros quatro trocarem de cor.
 *
 * Este é o kit mais difícil de vender numa vitrine de peça solta, porque quase
 * nada nele TEM superfície: são um provider, um tema compilado, três hooks e
 * uma base de CSS. Card escrito "provider e hook que aplicam em runtime o tema
 * compilado" não convence ninguém de nada. O que convence é ver: troque a marca
 * no seletor e os tokens mudam na tela, sem recarregar.
 *
 * Duas coisas mudaram aqui, e as duas eram defeito de leitura, não de código.
 *
 * 1. **A sala era uma grade de janelinhas.** Cinco painéis com
 *    `rounded + border + bg-card` dentro de um card que já tinha borda, e
 *    caixinhas com borda dentro dos painéis: três molduras antes da peça, e
 *    tudo acontecendo ao mesmo tempo, sem ordem. Agora a profundidade é degrau
 *    de superfície e espaço (`Bloco`, `Faixa`), e `Painel` sobrou para o único
 *    conteúdo que É uma janela de app de verdade: a busca.
 * 2. **A ordem virou a de quem adota.** Primeiro o tema que a marca compila,
 *    depois o provider aplicando em runtime, depois os hooks respondendo ao
 *    ambiente, e por último a tela de quem ainda não conectou vault nenhum.
 *    Antes os quatro assuntos apareciam lado a lado, e nenhum era o primeiro.
 *
 * O nome da peça saiu do canto de cada painel, onde era legenda morta de
 * catálogo, e virou `PecaTag` na linha do bloco: o mesmo nome, agora copiando
 * o `add` daquela peça.
 */

import * as React from "react";

import { useBrandTheme } from "@/lib/brand-theme";
import { BrandSelector } from "../../../registry/visant/ui/brand-selector";
import { SfxToggle } from "../../../registry/visant/ui/sfx-toggle";
import { EmptyState } from "../../../registry/visant/ui/empty-state";
import { CoverArt } from "../../../registry/visant/ui/cover-art";
import { Chip } from "../../../registry/visant/ui/chip";
import { CtaSurface, CtaAction } from "../../../registry/visant/ui/cta-surface";
import { useMediaQuery } from "../../../registry/visant/hooks/use-media-query";
import { useLocalSearch } from "../../../registry/visant/hooks/use-local-search";
import { CATALOG } from "../catalog";
import { Atos, Abertura, Bloco, Painel, Faixa, Fecho } from "./sala";

/**
 * Os tokens que uma marca de fato move.
 *
 * Fundo e texto entram porque é onde o tema costuma errar sem ninguém ver:
 * contraste é o teste. O `papel` mora no `title` da amostra, não numa terceira
 * linha embaixo dela: seis amostras com três linhas cada viram um parágrafo
 * picado, e a informação que decide é a cor, que já está na tela.
 */
const TOKENS = [
  { css: "--brand", nome: "brand", papel: "a cor que a marca traz" },
  { css: "--background", nome: "background", papel: "o chão da página" },
  { css: "--foreground", nome: "foreground", papel: "o texto sobre o chão" },
  { css: "--muted", nome: "muted", papel: "o segundo plano" },
  { css: "--card", nome: "card", papel: "a superfície levantada" },
  { css: "--border", nome: "border", papel: "o filete que separa" },
];

/** O estado do vault dito em português, e não no enum do provider. */
const ESTADO: Record<string, string> = {
  idle: "esperando o índice",
  loading: "baixando o índice",
  ready: "tema aplicado",
  error: "o vault não respondeu",
};

/**
 * A meia linha que diz o que olhar no ato.
 *
 * Ela existe aqui, e não na prop `nota` do `Bloco`, por um defeito medido a
 * 390px: na barra do bloco a nota é `flex-1` entre o título e as `PecaTag`, e
 * num celular sobra uma coluna de 60px para ela. O resultado é a frase inteira
 * quebrada em uma palavra por linha, ao lado de um título de duas. Descendo
 * para dentro do bloco, a nota fica com a largura toda nas duas pontas, e a
 * barra do bloco fica com as duas coisas que cabem lá: o número do ato e as
 * peças que ele instala. O conserto do `nota` inline é no `sala.tsx`, que não
 * é meu para editar.
 */
function Nota({ children }: { children: React.ReactNode }) {
  return <p className="pb-3 text-apoio text-muted-foreground">{children}</p>;
}

const CONSULTAS: [string, string][] = [
  ["(max-width: 640px)", "estreito"],
  ["(pointer: fine)", "mouse na mão"],
  ["(prefers-reduced-motion: reduce)", "menos movimento"],
];

export default function MarcaViva() {
  const { active, brands, status, error } = useBrandTheme();
  const [valores, setValores] = React.useState<Record<string, string>>({});
  const [busca, setBusca] = React.useState("");

  const estreito = useMediaQuery("(max-width: 640px)");
  const finoPointer = useMediaQuery("(pointer: fine)");
  const menosMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const respostas = [estreito, finoPointer, menosMotion];

  /*
   * Os valores são LIDOS da folha aplicada, não escritos aqui.
   *
   * Uma lista de cores digitada à mão nesta sala seria uma mentira confortável:
   * ela continuaria bonita no dia em que o tema parasse de ser aplicado. Lendo
   * do `getComputedStyle`, a amostra é o que a página tem — e se o provider
   * quebrar, a sala quebra junto, que é o comportamento honesto.
   */
  const ler = React.useCallback(() => {
    const cs = getComputedStyle(document.documentElement);
    const lidos: Record<string, string> = {};
    for (const t of TOKENS) lidos[t.css] = cs.getPropertyValue(t.css).trim();
    lidos["--font-sans"] = cs.getPropertyValue("--font-sans").trim();
    lidos["--font-display"] = cs.getPropertyValue("--font-display").trim();
    // Só troca o estado quando algum valor mudou de verdade. Sem esta guarda o
    // observador abaixo remonta a lista a cada folha que o HMR reinjeta.
    setValores((antes) =>
      Object.keys(lidos).every((k) => antes[k] === lidos[k]) ? antes : lidos,
    );
  }, []);

  /*
   * Observar, não fotografar.
   *
   * A versão anterior lia uma vez por mudança de `active`/`status`, e estava
   * errada de dois jeitos, os dois visíveis na tela: o efeito roda no mesmo
   * commit da troca, ANTES de o provider escrever a folha da marca, então a
   * primeira leitura pegava os tokens do projeto (a sala abria com a paleta em
   * branco e `--brand` vazio); e o botão de claro/escuro do topo não passa por
   * `active` nenhum, então trocar de tema deixava os valores mentindo para
   * sempre.
   *
   * Agora quem dispara a leitura é a própria página mudando: o `data-brand` e a
   * classe de tema no `<html>`, mais a folha injetada no `<head>`. Dois `rAF`
   * porque o valor computado só é confiável depois do estilo ter sido aplicado.
   */
  React.useEffect(() => {
    let raf = 0;
    const agendar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(ler);
      });
    };
    agendar();
    const obs = new MutationObserver(agendar);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-brand", "style"],
    });
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ler]);

  const achados = useLocalSearch(CATALOG, {
    fields: (i) => [i.name, i.title, i.description, ...i.tags],
    query: busca,
  });

  // Token de fonte vazio quer dizer que a marca não trouxe face própria e a
  // pilha do projeto assume. "herdada" diz isso; um traço seco parecia bug.
  const fonte = (v?: string) => (v ? v.split(",")[0].replace(/['"]/g, "") : "herdada");

  return (
    <Atos>
      {/*
        A tese da sala, e o controle que a prova, na mesma linha. Ler "nenhuma
        peça sabe a cor do cliente" e ter o seletor a um palmo é o que separa
        afirmação de demonstração — e é o mesmo seletor da barra do topo, então
        a prova continua valendo depois que a pessoa sair daqui.
      */}
      <Abertura
        contexto="qualquer tela do produto, em qualquer marca"
        acao={
          /* `shortcut={null}`: o ⌘B já é do seletor da barra do topo. Dois
             ouvintes no mesmo atalho abrem e fecham no mesmo gesto. */
          <BrandSelector shortcut={null} />
        }
      >
        {/* A segunda frase ensinava a usar o seletor que está do lado dela.
            Trocar a marca e ver a sala repintar é a prova; contar antes tira a
            graça e ocupa linha. */}
        Nenhuma peça desta library tem uma cor escrita dentro.
      </Abertura>

      <Bloco titulo="o tema que a marca compila" pecas={["theme-visant"]}>
        <Nota>Os valores saem da folha aplicada, não desta página.</Nota>
        {/* Grade intrínseca: a amostra declara a largura mínima em que ainda se
            lê o nome do token, e a contagem de colunas cai do tamanho da tela.
            Com `sm:grid-cols-6` escrito à mão, 390px entregava seis amostras de
            50px com o rótulo cortado no meio. */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(7rem,100%),1fr))] gap-x-3 gap-y-4">
          {TOKENS.map((t) => (
            <div key={t.css} className="min-w-0" title={t.papel}>
              {/*
                A amostra é a evidência, e o filete nela não é moldura de
                agrupamento: sem ele, `--background` e `--card` desenham um
                retângulo invisível contra o chão da sala, que é exatamente o
                caso em que o tema erra e ninguém vê.
              */}
              <div
                className="h-12 w-full rounded-[var(--r-control,0.5rem)] border border-border"
                style={{ background: `var(${t.css})` }}
              />
              <p className="mt-1.5 truncate font-mono text-micro">{t.nome}</p>
              {/* Nome sem valor é rótulo; com o valor lido do lado, a amostra
                  vira prova. É o que se copia para conferir um contraste. */}
              <p className="truncate font-mono text-micro text-muted-foreground">
                {valores[t.css] || "não lido"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
              display
            </p>
            <p
              className="mt-1 truncate text-[1.5rem] leading-tight"
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              {fonte(valores["--font-display"])}
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
              texto
            </p>
            <p className="mt-1 truncate text-[1.5rem] leading-tight">
              {fonte(valores["--font-sans"])}
            </p>
          </div>
        </div>
      </Bloco>

      <Bloco titulo="o provider aplica em runtime" pecas={["brand-selector", "brand-theme"]}>
        <Nota>Uma folha de estilo só, trocada com a página no ar.</Nota>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-apoio text-muted-foreground">
          <span className="truncate text-corpo font-medium text-foreground">
            {active?.name ?? "Visant®"}
          </span>
          <span className="font-mono tabular-nums">
            {brands.length} {brands.length === 1 ? "marca" : "marcas"} no vault,
          </span>
          {/* O motivo do erro fica no `title` em vez de virar um parágrafo
              vermelho: a sala continua utilizável com o vault fora do ar, e quem
              está depurando alcança a mensagem inteira. */}
          <span className="font-mono" title={error ?? undefined}>
            {ESTADO[status] ?? status}
          </span>
        </div>

        {/* A prova, com peças de OUTROS kits: o chip é do kit de trabalho, a
            chamada é da página que vende, e nenhum dos dois sabe que a marca
            mudou. Se a demonstração usasse só peças deste kit, ela provaria
            apenas que o kit conversa consigo mesmo. */}
        <div className="mt-4 flex flex-wrap gap-2">
          {["Estratégia", "Identidade", "Site"].map((t, i) => (
            <Chip key={t} pressed={i === 0} count={[12, 7, 4][i]}>
              {t}
            </Chip>
          ))}
        </div>
        <div className="mt-4">
          <CtaSurface
            variant="bar"
            tone="brand"
            title="Tudo isso em um plano só."
            actions={<CtaAction>Agendar</CtaAction>}
          />
        </div>
      </Bloco>

      <Bloco titulo="os hooks respondem ao ambiente" pecas={["use-media-query", "sfx-toggle"]}>
        {/* EXCEÇÃO ao `ruido-scan/ensina-a-usar`, com motivo: redimensionar a
            janela é o único gesto desta página que não tem afordância nenhuma
            na tela. Ninguém arrasta a borda do navegador por acaso, e sem essa
            frase o bloco fica sendo três valores parados que não provam nada. */}
        <Nota>Redimensiona a janela e a linha muda enquanto você arrasta.</Nota>
        {/* Hook não tem superfície, então o que se mostra é o valor que ele está
            devolvendo AGORA. Uma linha por consulta, sem caixa: o que separa as
            linhas é o respiro, e a única cor da lista é a que responde `true`. */}
        <ul className="max-w-xl">
          {CONSULTAS.map(([q, papel], i) => (
            <li
              key={q}
              className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-apoio">{q}</span>
                <span className="block truncate text-micro text-muted-foreground">{papel}</span>
              </span>
              <span
                className={
                  "shrink-0 rounded-[var(--r-pill,9999px)] border px-2 py-0.5 font-mono text-micro " +
                  "transition-[color,border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] " +
                  (respostas[i]
                    ? "border-[var(--brand)] text-[var(--brand)]"
                    : "border-border text-muted-foreground")
                }
              >
                {respostas[i] ? "true" : "false"}
              </span>
            </li>
          ))}
        </ul>

        {/* O botão de som mora aqui, e não num painel próprio, porque ele é o
            terceiro consumidor da mesma consulta de mídia: sob
            `prefers-reduced-motion` o barramento fica mudo sozinho. Solto num
            painel ao lado, era uma peça órfã com legenda no canto. */}
        <div className="mt-5 flex items-center gap-3">
          <SfxToggle />
          <p className="min-w-0 text-apoio text-muted-foreground">
            O som da casa: dois tons em WebAudio, mudo quando a linha de cima diz{" "}
            <code className="font-mono text-micro">true</code>.
          </p>
        </div>
      </Bloco>

      <Bloco titulo="a busca ignora acento" pecas={["use-local-search"]}>
        <Nota>As {CATALOG.length} peças do catálogo, filtradas no cliente.</Nota>
        {/*
          O ÚNICO contorno da sala. Uma busca com campo, contagem e resultado é
          uma janela de app de verdade, então ela ganha a moldura que as outras
          quatro perderam. `barra` põe campo e contagem na mesma linha, que é
          onde eles ficam num app, em vez de empilhados com respiro de seção.
        */}
        <Painel
          barra={
            <>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="tenta “animacao”, “vintage”, “arrastar”"
                aria-label="Buscar no catálogo"
                className="min-w-0 flex-1 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-2.5 py-1.5 text-apoio outline-none transition-[border-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] placeholder:text-muted-foreground focus:border-[var(--brand)]"
              />
              <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                {achados.length} de {CATALOG.length}
              </span>
            </>
          }
        >
          {/* Zero resultado é um estado, não uma lista vazia. Sem esta linha o
              painel encolhe para a barra e parece que a busca travou. */}
          {achados.length === 0 ? (
            <p className="px-4 py-6 text-apoio text-muted-foreground sm:px-5">
              Nada com esse nome. Tenta uma palavra do que a peça faz.
            </p>
          ) : (
            <ul className="max-h-[9.5rem] overflow-y-auto px-4 py-3 sm:px-5">
              {achados.slice(0, 8).map((i) => (
                <li key={i.name} className="flex min-w-0 items-baseline gap-2 py-0.5">
                  <span className="truncate font-mono text-apoio">{i.name}</span>
                  <span className="truncate text-micro text-muted-foreground">{i.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </Bloco>

      {/* O último ato afunda meio degrau. É a mesma coisa que a landing faz para
          trocar de dobra: muda o chão, não desenha caixa. Aqui ele também diz o
          que o assunto é — a tela de antes de existir marca nenhuma. */}
      <Faixa tom="recuo" className="py-8 sm:py-10">
        <Bloco titulo="e quando ainda não há marca" pecas={["empty-state"]}>
          <Nota>A primeira tela de todo cliente novo.</Nota>
          <div className="max-w-md">
            <EmptyState
              eyebrow="Vault"
              title="Nenhuma marca ainda."
              action={<Chip pressed>Conectar vault</Chip>}
              art={
                <div className="relative h-[92px] w-full">
                  <CoverArt title="Vault" seed="vault-vazio" family="plate" titleless />
                </div>
              }
            >
              As marcas da sua conta aparecem aqui e repintam o app inteiro.
            </EmptyState>
          </div>
        </Bloco>
      </Faixa>

      <Fecho>
        Instalado, este kit tira a cor de dentro dos componentes. O tema chega compilado do
        vault, o provider aplica com o app no ar, os hooks leem o ambiente sozinhos, e a tela
        de quem ainda não conectou nada já vem desenhada.
      </Fecho>
    </Atos>
  );
}
