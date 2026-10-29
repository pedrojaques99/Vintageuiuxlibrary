"use client";

/**
 * "Isso aqui quebrou" — em um clique, do card para um arquivo do repo.
 *
 * A distância entre ver o defeito e registrar o defeito é o que decide se ele
 * vira conserto ou vira nada. Abrir issue, achar o nome exato da peça e
 * descrever o ambiente é trabalho demais para o momento em que a pessoa só
 * queria olhar a vitrine — então o botão mora no card, e tudo que dá para
 * deduzir (peça, URL, viewport, tema, marca ativa) é deduzido.
 *
 * Existe **só em dev**: quem recebe é um middleware do Vite (`scripts/vite-bug-report.mjs`)
 * que escreve em `bugs/`. No site publicado não há processo para receber, e
 * campo de texto aberto em página pública é formulário de spam.
 *
 * Fica escondido até o hover porque não é uma das duas coisas que se faz aqui
 * (copiar e focar) — é a terceira, e a terceira não pode disputar a primeira
 * leitura com o nome da peça. No toque, onde hover não existe, ele volta a ser
 * permanente.
 */

import * as React from "react";
import { Bug, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandTheme } from "@/lib/brand-theme";

export const BUG_REPORT_ATIVO = import.meta.env.DEV;

const SEVERIDADES = [
  { value: "quebrado", label: "Quebrado" },
  { value: "visual", label: "Visual" },
  { value: "duvida", label: "Dúvida" },
] as const;

type Severidade = (typeof SEVERIDADES)[number]["value"];

/*
 * A contagem é buscada UMA vez para a página inteira.
 *
 * São ~65 botões na tela; cada um buscando o próprio número seriam 65 requisições
 * para o mesmo JSON. O store abaixo é um cache com assinantes: o primeiro botão
 * a montar dispara o fetch, o resto acompanha.
 */
type Counts = Record<string, number>;
let counts: Counts = {};
let carregado = false;
const inscritos = new Set<() => void>();

function avisar() {
  for (const fn of inscritos) fn();
}

async function recarregar() {
  // O endpoint é do plugin do dev server; em produção a busca era um 404 por visita.
  if (!import.meta.env.DEV) {
    carregado = true;
    return;
  }
  try {
    const r = await fetch("/__bugs");
    counts = (await r.json()).counts ?? {};
  } catch {
    // Dev server sem o plugin (ou build estático servido à mão): sem contagem,
    // e o botão segue funcionando para tudo menos o número.
    counts = {};
  }
  carregado = true;
  avisar();
}

function useCount(item: string) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    inscritos.add(fn);
    if (!carregado) {
      carregado = true;
      void recarregar();
    }
    return () => {
      inscritos.delete(fn);
    };
  }, []);
  return counts[item] ?? 0;
}

export function BugButton({
  item,
  className,
}: {
  item: string;
  className?: string;
}) {
  const [aberto, setAberto] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [feito, setFeito] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [mensagem, setMensagem] = React.useState("");
  const [severidade, setSeveridade] = React.useState<Severidade>("quebrado");
  const wrap = React.useRef<HTMLDivElement>(null);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const { active } = useBrandTheme();
  const count = useCount(item);

  React.useEffect(() => {
    if (!aberto) return;
    area.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setAberto(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setAberto(false);
    };
    // `capture` no Escape: a galeria também escuta Escape, e fechar o popover
    // não pode também limpar a busca de quem está atrás dele.
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown);
    };
  }, [aberto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!mensagem.trim() || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch("/__bugs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          item,
          mensagem: mensagem.trim(),
          severidade,
          url: location.href,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
          tema: document.documentElement.classList.contains("dark") ? "escuro" : "claro",
          marca: active?.name ?? active?.slug ?? "",
          ua: navigator.userAgent,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).erro ?? `HTTP ${r.status}`);
      setMensagem("");
      setFeito(true);
      setAberto(false);
      void recarregar();
      setTimeout(() => setFeito(false), 2000);
    } catch (err) {
      setErro(String((err as Error).message));
    } finally {
      setEnviando(false);
    }
  }

  if (!BUG_REPORT_ATIVO) return null;

  const Icon = feito ? Check : Bug;

  return (
    <div ref={wrap} className={cn("relative shrink-0", className)}>
      {/* Mora no painel da ficha, ao lado do fechar: sempre visível ali, porque
          a ficha é o lugar onde se olha a peça de perto. Com reporte aberto, o
          número fica do lado — aí ele é estado, não gesto. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        aria-expanded={aberto}
        aria-pressed={aberto}
        aria-label={`Reportar problema em ${item}`}
        title={count ? `${count} reporte(s) aberto(s)` : "Reportar problema"}
        className={cn(
          "casa-icone alvo-toque gap-1 [grid-auto-flow:column]",
          count > 0 && "w-auto px-2 text-destructive",
        )}
      >
        <Icon className="h-4 w-4" />
        {count > 0 ? <span className="text-casa-sm tabular-nums">{count}</span> : null}
      </button>

      {aberto ? (
        <form
          onSubmit={enviar}
          onClick={(e) => e.stopPropagation()}
          className="casa absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(22rem,80vw)] space-y-3 rounded-tile bg-casa-tile-2 p-3 [box-shadow:var(--casa-shadow)]"
        >
          <div className="flex items-center gap-4">
            {SEVERIDADES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSeveridade(s.value)}
                aria-pressed={severidade === s.value}
                className={cn(
                  "rounded-control text-casa-base transition-colors [transition-duration:var(--dur-fast)]",
                  severidade === s.value ? "text-casa-fg" : "text-casa-fg-2 hover:text-casa-fg",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <textarea
            ref={area}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            onKeyDown={(e) => {
              // Enter sozinho quebra linha; ⌘/Ctrl+Enter envia. Um reporte é uma
              // frase, mas às vezes são duas.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void enviar(e as never);
            }}
            rows={3}
            placeholder="O que quebrou? Ex.: o knob não gira no toque."
            className="w-full resize-none rounded-control bg-casa-tile px-3 py-2 text-casa-base text-casa-fg outline-none placeholder:text-casa-fg-3"
          />

          {erro ? <p className="text-casa-sm text-destructive">{erro}</p> : null}

          <button
            type="submit"
            disabled={!mensagem.trim() || enviando}
            className="alvo-toque flex h-9 w-full items-center justify-center gap-2 rounded-control bg-casa-cta text-casa-base text-casa-cta-fg transition-opacity [transition-duration:var(--dur-fast)] hover:opacity-90 disabled:opacity-40"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Registrar
          </button>
        </form>
      ) : null}
    </div>
  );
}
