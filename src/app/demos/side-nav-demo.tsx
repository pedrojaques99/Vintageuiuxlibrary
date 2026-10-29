"use client";

/**
 * A barra lateral só se explica dentro de um app — e só se explica ANDANDO.
 *
 * Solta num palco, ela é uma coluna de links. O que ela vende — a largura que
 * cede, o rótulo que vira ícone, a régua da rota ativa que sobrevive ao colapso,
 * o `⌘/Ctrl + B` — só aparece quando existe conteúdo do lado que muda de
 * tamanho junto. Por isso a demo desenha a janela inteira: barra de título,
 * endereço, um cabeçalho de app e uma área de trabalho sem nada que peça
 * leitura.
 *
 * ── Por que ela abre e fecha sozinha ───────────────────────────────────────
 *
 * Parada, a peça é indistinguível de uma lista de links: o card do catálogo
 * mostrava o estado aberto e mais nada, e quem não clicasse nunca via a única
 * coisa que a diferencia de um `<ul>`. O ciclo é o retrato do gesto.
 *
 * E ele **cede na primeira interação**: quem clicou no gatilho (ou apertou
 * ⌘/Ctrl+B) tomou a barra pra si, e uma demo que continua se mexendo por cima
 * da mão de quem está mexendo é a vitrine brigando com o visitante. Relógio
 * preso ao `useStageActive` e desligado sob `prefers-reduced-motion` — uma
 * coluna de 15rem piscando de largura é movimento grande.
 *
 * `storageKey={false}`: uma vitrine que guarda o estado da barra faria a peça
 * abrir colapsada pra quem já brincou com ela ontem, e a primeira impressão do
 * item passaria a depender do histórico de quem olha. Num app de verdade a
 * persistência é o padrão — aqui ela é o que atrapalha.
 */

import * as React from "react";

import { BarChart3, Folder, LayoutDashboard, Package, Settings, Users } from "lucide-react";

import { useStageActive } from "../stage";
import type { DemoProps } from "../catalog";
import {
  SideNav,
  SideNavGroup,
  SideNavItem,
} from "../../../registry/visant/ui/side-nav";

// Ícones de biblioteca, no tamanho que a peça dá (16px).
const PAINEL = <LayoutDashboard aria-hidden="true" />;
const PASTA = <Folder aria-hidden="true" />;
const CAIXA = <Package aria-hidden="true" />;
const PESSOAS = <Users aria-hidden="true" />;
const GRAFICO = <BarChart3 aria-hidden="true" />;
const ENGRENAGEM = <Settings aria-hidden="true" />;

/** O símbolo da marca de mentira: um monograma, que cabe no trilho compacto. */
const MARCA = (
  <span
    aria-hidden="true"
    className="grid size-7 shrink-0 place-items-center rounded-[var(--r-control,0.5rem)] bg-foreground font-mono text-[13px] font-bold leading-none text-background"
  >
    V
  </span>
);

export default function SideNavDemo({ props }: DemoProps) {
  const [rota, setRota] = React.useState("visao");
  const ativo = useStageActive();

  // A barra é CONTROLADA aqui porque o relógio da demo e o gatilho da peça
  // precisam escrever no mesmo estado — dois donos da mesma largura é como o
  // ícone acaba apontando pro lado errado depois de um clique.
  const [fechada, setFechada] = React.useState(false);
  const [automatico, setAutomatico] = React.useState(true);

  React.useEffect(() => {
    if (!automatico || !ativo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Aberta por mais tempo que fechada: aberta é o estado em que dá pra ler o
    // que a peça faz; fechada é a prova de que ela cede. 2,8s e 1,8s.
    const id = setTimeout(() => setFechada((v) => !v), fechada ? 1800 : 2800);
    return () => clearTimeout(id);
  }, [automatico, ativo, fechada]);

  const ir = (id: string) => (e: React.MouseEvent) => {
    // A demo não navega: `href="#"` num palco de vitrine rolaria a página pro
    // topo a cada clique, e a peça pareceria estar quebrando a rolagem.
    e.preventDefault();
    // Clicar num item também é tomar a barra: a largura mudando embaixo do
    // dedo de quem acabou de escolher uma rota parece defeito, não demo.
    setAutomatico(false);
    setRota(id);
  };

  return (
    // Janela estreita de propósito: a barra é a peça, e a área de trabalho só
    // precisa existir pra mostrar que cede junto. Larga, ela engolia a barra.
    <div className="mx-auto flex h-full w-[640px] max-w-full flex-col overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-background">
      {/*
       * A barra da janela. Ela não é enfeite: sem uma moldura de navegador em
       * volta, uma coluna colada na borda esquerda de um card lê como parte do
       * card, e a peça perde a única pista de que aquilo é o layout de um app.
       */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-[var(--r-pill,9999px)] bg-background px-3 py-1 text-center font-mono text-micro text-muted-foreground">
          app.visant.com/{rota}
        </span>
        <span
          aria-hidden="true"
          className="hidden shrink-0 rounded-[var(--r-control,0.5rem)] border border-border px-2 py-0.5 font-mono text-micro text-muted-foreground sm:inline"
        >
          ⌘B
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <SideNav
          storageKey={false}
          collapsed={fechada}
          onCollapsedChange={(v) => {
            // A mão ganha do relógio, e ganha pra sempre nesta sessão do card.
            setAutomatico(false);
            setFechada(v);
          }}
          // Aberta, símbolo e nome; compacta, só o símbolo (`brandIcon`).
          brand={
            <span className="flex items-center gap-2">
              {MARCA}
              <span className="font-mono text-rotulo uppercase tracking-[0.16em] text-foreground">
                Visant
              </span>
            </span>
          }
          brandIcon={MARCA}
          footer={
            <div className="flex items-center gap-2 px-1 py-1">
              <span className="size-6 shrink-0 rounded-[var(--r-pill,9999px)] bg-[var(--brand)]" />
              <span className="truncate text-apoio text-muted-foreground group-data-[collapsed]/sidenav:sr-only">
                marina@visant
              </span>
            </div>
          }
          {...props}
        >
          <SideNavGroup label="Trabalho">
            <SideNavItem
              href="#"
              onClick={ir("visao")}
              active={rota === "visao"}
              icon={PAINEL}
            >
              Visão geral
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("projetos")}
              active={rota === "projetos"}
              icon={PASTA}
              meta="12"
            >
              Projetos
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("entregas")}
              active={rota === "entregas"}
              icon={CAIXA}
              meta="3"
            >
              Entregas
            </SideNavItem>
          </SideNavGroup>

          <SideNavGroup label="Time">
            <SideNavItem
              href="#"
              onClick={ir("pessoas")}
              active={rota === "pessoas"}
              icon={PESSOAS}
            >
              Pessoas
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("relatorios")}
              active={rota === "relatorios"}
              icon={GRAFICO}
            >
              Relatórios
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("ajustes")}
              active={rota === "ajustes"}
              icon={ENGRENAGEM}
            >
              Ajustes
            </SideNavItem>
          </SideNavGroup>
        </SideNav>

        {/* A área de trabalho é maquete: blocos sem texto, porque qualquer frase
            aqui competiria com a peça que está sendo mostrada. */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <span className="h-2.5 w-24 rounded-full bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <span className="h-14 rounded-[var(--r-surface,0.875rem)] bg-muted" />
            <span className="h-14 rounded-[var(--r-surface,0.875rem)] bg-muted" />
          </div>
          <div className="flex-1 rounded-[var(--r-surface,0.875rem)] bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
