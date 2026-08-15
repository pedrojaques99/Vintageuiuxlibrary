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

import { useStageActive } from "../stage";
import {
  SideNav,
  SideNavGroup,
  SideNavItem,
} from "../../../registry/visant/ui/side-nav";

/* Ícones desenhados aqui, no traço do resto do registry: 16px de caixa, 1.4 de
   espessura, cantos redondos. Um pacote de ícones inteiro pra seis glifos numa
   demo seria bundle por conveniência. */
const Icone = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PAINEL = "M2 2.5h5v4H2zM9 2.5h5v7H9zM2 9h5v4.5H2zM9 12h5v1.5H9z";
const PASTA = "M2 4.5h4l1.2 1.5H14v7.5H2z";
const PESSOAS = "M6 7.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM1.5 13.5c0-2.2 2-3.6 4.5-3.6s4.5 1.4 4.5 3.6M11 4.2a2 2 0 0 1 0 3.8m1 2.2c1.6.4 2.5 1.5 2.5 3.3";
const GRAFICO = "M2 13.5h12M4.5 11V7M8 11V3.5M11.5 11V8.5";
const ENGRENAGEM = "M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6";
const CAIXA = "M2.5 5 8 2.2 13.5 5v6L8 13.8 2.5 11zM2.5 5 8 7.8 13.5 5M8 7.8v6";

export default function SideNavDemo() {
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
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-background">
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
          brand={
            <span className="font-mono text-rotulo uppercase tracking-[0.16em] text-foreground">
              Visant
            </span>
          }
          footer={
            <div className="flex items-center gap-2 px-1 py-1">
              <span className="size-6 shrink-0 rounded-[var(--r-pill,9999px)] bg-[var(--brand)]" />
              <span className="truncate text-apoio text-muted-foreground group-data-[collapsed]/sidenav:sr-only">
                marina@visant
              </span>
            </div>
          }
        >
          <SideNavGroup label="Trabalho">
            <SideNavItem
              href="#"
              onClick={ir("visao")}
              active={rota === "visao"}
              icon={<Icone d={PAINEL} />}
            >
              Visão geral
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("projetos")}
              active={rota === "projetos"}
              icon={<Icone d={PASTA} />}
              meta="12"
            >
              Projetos
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("entregas")}
              active={rota === "entregas"}
              icon={<Icone d={CAIXA} />}
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
              icon={<Icone d={PESSOAS} />}
            >
              Pessoas
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("relatorios")}
              active={rota === "relatorios"}
              icon={<Icone d={GRAFICO} />}
            >
              Relatórios
            </SideNavItem>
            <SideNavItem
              href="#"
              onClick={ir("ajustes")}
              active={rota === "ajustes"}
              icon={<Icone d={ENGRENAGEM} />}
            >
              Ajustes
            </SideNavItem>
          </SideNavGroup>
        </SideNav>

        {/* A área de trabalho é maquete: blocos sem texto, porque qualquer frase
            aqui competiria com a peça que está sendo mostrada. */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-28 rounded-full bg-muted" />
            <span className="ml-auto h-8 w-20 rounded-[var(--r-control,0.5rem)] bg-muted" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-16 rounded-[var(--r-surface,0.875rem)] bg-muted" />
            ))}
          </div>
          <div className="flex-1 rounded-[var(--r-surface,0.875rem)] bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
