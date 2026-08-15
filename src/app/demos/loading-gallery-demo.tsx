"use client";

/**
 * A galeria de estados de espera — seis peças rodando ao mesmo tempo.
 *
 * ── Por que isto é UM card e não seis ───────────────────────────────────────
 *
 * Os seis loaders continuam publicados um a um no registry (quem instalou
 * `status-ticker` não pode ter a peça sumindo do índice). O que estava errado
 * era a vitrine: seis cards seguidos, cada um com um pontinho tremendo no meio
 * de 1350px, todos parecidos o bastante para o olho tratar o conjunto como
 * "um loader qualquer" e passar direto. Espera é uma família — e família se
 * julga lado a lado, porque a pergunta real não é "esse loader é bonito", é
 * "qual deles serve pro que eu tenho na mão".
 *
 * Por isso cada célula traz o **nome do item do registry** e a frase de quando
 * usar. O nome vem precedido de `add` em mono: é o mesmo texto que a pessoa vai
 * digitar. Seis nomes, seis comandos, seis peças instaláveis — a leitura de
 * "uma peça só" é justamente o que a grade precisa negar.
 *
 * ── Por que o relógio é do palco ────────────────────────────────────────────
 *
 * Seis animações em laço no mesmo card é exatamente onde a página vira
 * ventilador. `useStageActive()` derruba as cenas quando o card sai da tela ou
 * a aba é escondida; a caixa de cada célula fica, com a altura que já tinha,
 * então nada pula quando elas voltam. Remontar zera o cronômetro do ticker e o
 * progresso do shuttle, e isso é aceitável: são laços, não estado do usuário.
 */

import * as React from "react";

import { Media } from "../media";
import { useStageActive } from "../stage";

import { GlitchChars } from "../../../registry/visant/ui/glitch-chars";
import { WorkingGlyph } from "../../../registry/visant/ui/working-glyph";
import { StatusTicker } from "../../../registry/visant/ui/status-ticker";
import { PaperShuttle } from "../../../registry/visant/ui/paper-shuttle";
import { GeneratingTile } from "../../../registry/visant/ui/generating-tile";
import { OctahedronLoader } from "../../../registry/visant/ui/octahedron-loader";

/** Preferência do sistema, com evento — quem liga no meio da espera é atendido. */
function useMovimentoReduzido() {
  const [reduzido, setReduzido] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ao = () => setReduzido(mq.matches);
    ao();
    mq.addEventListener?.("change", ao);
    return () => mq.removeEventListener?.("change", ao);
  }, []);
  return reduzido;
}

/** Relógio único da galeria: um `setInterval` para as duas cenas com estado. */
function usePulso(ms: number, ativo: boolean) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setN((v) => v + 1), ms);
    return () => clearInterval(id);
  }, [ms, ativo]);
  return n;
}

function Celula({
  nome,
  uso,
  children,
}: {
  /** O nome do item no registry — é isto que se instala. */
  nome: string;
  /** Uma linha: em que espera esta peça é a certa. */
  uso: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card">
      <div className="grid h-[172px] place-items-center overflow-hidden px-3">
        {children}
      </div>
      <div className="border-t border-border px-3 py-2">
        <p className="font-mono text-micro text-foreground">
          <span className="text-muted-foreground">add </span>
          {nome}
        </p>
        <p className="mt-0.5 text-micro text-muted-foreground">{uso}</p>
      </div>
    </div>
  );
}

export default function LoadingGalleryDemo() {
  const ativo = useStageActive();
  const reduzido = useMovimentoReduzido();

  // O shuttle precisa de um progresso que ande; o tile precisa alternar entre
  // esperar e ter resultado — sem isso ele é um quadrado bonito sem tese.
  const pulso = usePulso(120, ativo && !reduzido);
  const progresso = reduzido ? 62 : ((pulso * 2) % 101);
  const gerando = reduzido ? true : Math.floor(pulso / 34) % 2 === 0;

  return (
    <div className="grid h-full w-full grid-cols-3 gap-3.5 p-1">
      <Celula nome="glitch-chars" uso="ruído de máquina ao lado de qualquer texto">
        {ativo && (
          <span className="font-mono text-[2rem] leading-none text-foreground">
            <GlitchChars length={4} />
          </span>
        )}
      </Celula>

      <Celula nome="working-glyph" uso="o sistema mostrando esforço, não pedindo paciência">
        {ativo && <WorkingGlyph size={30} />}
      </Celula>

      <Celula nome="status-ticker" uso="espera longa: verbo que gira e cronômetro">
        {ativo && (
          <div className="w-full max-w-[250px]">
            <StatusTicker />
          </div>
        )}
      </Celula>

      <Celula nome="paper-shuttle" uso="quando algo é movido: importar, converter, sincronizar">
        {ativo && <PaperShuttle progress={progresso} />}
      </Celula>

      <Celula nome="generating-tile" uso="o quadro que ocupa o lugar do resultado">
        {ativo && (
          <div className="w-[132px]">
            <GeneratingTile isLoading={gerando} aspectRatio="1/1">
              {/* O resultado é foto de verdade: um retângulo cinza no fim da
                  espera não deixa julgar a troca, que é o que a peça faz. */}
              <Media
                papel="cena"
                indice={2}
                ratio="1/1"
                className="w-full rounded-[var(--r-surface,0.875rem)] border border-border"
              />
            </GeneratingTile>
          </div>
        )}
      </Celula>

      <Celula nome="octahedron-loader" uso="a rota inteira carregando, com o símbolo da marca">
        {/* `min-h-0` desfaz o `min-h-screen` do contrato: aqui ele é célula, não
            rota. E sem `src` a vitrine mostra de propósito o estado genérico —
            o `.lottie` é ativo de marca e não mora neste repo. */}
        {ativo && <OctahedronLoader size={76} className="min-h-0" />}
      </Celula>
    </div>
  );
}
