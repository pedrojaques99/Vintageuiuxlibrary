"use client";

/**
 * Conectar o catálogo ao agente de IA de quem chegou.
 *
 * A peça é nossa, o instalador não: o MCP oficial do shadcn (`npx shadcn mcp`)
 * já busca, lê e instala de qualquer registry. O pedágio que sobrava era saber
 * disso, achar a config certa pra cada editor e lembrar de declarar o `@visant`.
 * Aqui cada agente ganha UMA ação: deeplink de um clique quando o editor aceita
 * (Cursor, VS Code), comando pra colar quando não (Claude Code, Codex), a URL
 * do nosso MCP remoto pros apps web que só aceitam conector por URL (`api/mcp.ts`),
 * e um texto pronto pra qualquer outro agente, que lê o `llms.txt` sem MCP nenhum.
 *
 * Abre pelo cabeçalho e por link: `?conectar` ou `?conectar=cursor`.
 */

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, ChevronRight, Globe, MessageSquareText, Plug, X } from "lucide-react";
import { siClaude, siCursor, siGithubcopilot, siOpenai, type SimpleIcon } from "simple-icons";
import { cn } from "@/lib/utils";
import { CopyCommand } from "./copy-command";

/**
 * O traço de um logo do `simple-icons`, na cor do texto. Local e não Iconify:
 * logo que depende de rede vira bolinha vazia quando a API falha.
 */
export function LogoAgente({ icone, className = "size-3.5" }: { icone: SimpleIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("shrink-0 fill-current", className)}>
      <path d={icone.path} />
    </svg>
  );
}

const SITE = "https://ui.visantlabs.com";
const REGISTRY_URL = `${SITE}/r/{name}.json`;

/**
 * `true` quando o `@visant` estiver no índice oficial do shadcn
 * (ui.shadcn.com/r/registries.json): aí o namespace resolve sozinho e o passo do
 * `components.json` some de todas as abas.
 */
const NO_INDICE = false;

const MCP = { command: "npx", args: ["shadcn@latest", "mcp"] };

const COMPONENTS_JSON = `"registries": { "@visant": "${REGISTRY_URL}" }`;

const PROMPT = [
  "Use a library @visant/ui (https://ui.visantlabs.com) pra montar a interface.",
  `Leia ${SITE}/llms.txt pra escolher as peças que fazem sentido aqui, e a ficha de cada uma em ${SITE}/r/<peça>.md.`,
  "Instale com: npx shadcn@latest add @visant/<peça>",
].join("\n");

const cursorLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=shadcn&config=${btoa(JSON.stringify(MCP))}`;
const vscodeLink = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "shadcn", ...MCP }))}`;

type Agente = "claude" | "cursor" | "vscode" | "codex" | "web" | "outro";

const AGENTES: {
  id: Agente;
  nome: string;
  /** O logo no seletor: traço do `simple-icons` ou ícone de interface. */
  logo: SimpleIcon | typeof Globe;
  /** A ação: link de um clique ou texto pra copiar. */
  acao: { link: string; rotulo: string } | { copiar: string };
  /** Uma linha, no máximo, sobre o que acontece depois. */
  depois: string;
  /** Este agente precisa do `@visant` no `components.json` (até o índice). */
  registry: boolean;
}[] = [
  {
    id: "claude",
    logo: siClaude,
    nome: "Claude Code",
    acao: { copiar: "claude mcp add shadcn -- npx shadcn@latest mcp" },
    depois: "No terminal do projeto. Reinicie o Claude Code; o /mcp mostra conectado.",
    registry: true,
  },
  {
    id: "cursor",
    logo: siCursor,
    nome: "Cursor",
    acao: { link: cursorLink, rotulo: "Adicionar ao Cursor" },
    depois: "Confirme no Cursor e ligue o servidor em Settings.",
    registry: true,
  },
  {
    id: "vscode",
    logo: siGithubcopilot,
    nome: "VS Code",
    acao: { link: vscodeLink, rotulo: "Adicionar ao VS Code" },
    depois: "O VS Code instala o servidor pro Copilot.",
    registry: true,
  },
  {
    id: "codex",
    logo: siOpenai,
    nome: "Codex",
    acao: { copiar: `[mcp_servers.shadcn]\ncommand = "npx"\nargs = ["shadcn@latest", "mcp"]` },
    depois: "Cole em ~/.codex/config.toml e reinicie o Codex.",
    registry: true,
  },
  {
    id: "web",
    logo: Globe,
    nome: "Apps web",
    acao: { copiar: `${SITE}/mcp` },
    depois: "No Claude.ai ou ChatGPT: Configurações → Conectores → conector personalizado, com esta URL.",
    registry: false,
  },
  {
    id: "outro",
    logo: MessageSquareText,
    nome: "Outro",
    acao: { copiar: PROMPT },
    depois: "Cole no começo da conversa. Funciona sem MCP.",
    registry: false,
  },
];

const EVENTO = "visant:conectar";

/** Abre o painel de onde estiver (um só por página, montado no cabeçalho). */
export const abrirConectar = () => window.dispatchEvent(new Event(EVENTO));

const ehAgente = (v: string | null): v is Agente => AGENTES.some((a) => a.id === v);

/** Abre por `?conectar` (e escolhe a aba por `?conectar=cursor`). */
function lerUrl(): { aberto: boolean; agente: Agente } {
  if (typeof window === "undefined") return { aberto: false, agente: "claude" };
  const p = new URLSearchParams(window.location.search);
  const v = p.get("conectar");
  return { aberto: p.has("conectar"), agente: ehAgente(v) ? v : "claude" };
}

export function Conectar({ className }: { className?: string }) {
  const inicial = React.useMemo(lerUrl, []);
  const [aberto, setAberto] = React.useState(inicial.aberto);
  const [agente, setAgente] = React.useState<Agente>(inicial.agente);
  const atual = AGENTES.find((a) => a.id === agente)!;

  // Outros lugares da casa (a abertura do catálogo) abrem o mesmo painel.
  React.useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  // Fechar tira o `?conectar` do endereço, pra recarregar não reabrir.
  const mudar = (v: boolean) => {
    setAberto(v);
    if (!v && new URLSearchParams(window.location.search).has("conectar")) {
      const u = new URL(window.location.href);
      u.searchParams.delete("conectar");
      window.history.replaceState(window.history.state, "", u);
    }
  };

  return (
    <Dialog.Root open={aberto} onOpenChange={mudar}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          title="Conectar ao seu agente"
          aria-label="Conectar ao seu agente de IA"
          className={cn("casa-icone alvo-toque", className)}
        >
          <Plug className="h-4 w-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[oklch(0_0_0/0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "casa fixed left-1/2 top-[12vh] z-[60] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2",
            "rounded-tile bg-casa-tile p-6 outline-none [box-shadow:var(--casa-shadow)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]",
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-casa-lg font-medium">Conectar seu agente</Dialog.Title>
            <Dialog.Close className="casa-icone alvo-toque -mr-2" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Seu agente busca, escolhe e instala as peças sozinho.
          </Dialog.Description>

          {/* Seis agentes numa grade de logos: o nome cabe sem quebrar em duas
              linhas de abas, e o logo é o que se reconhece primeiro. */}
          <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="group" aria-label="Agente">
            {AGENTES.map((a) => {
              const ativa = a.id === agente;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAgente(a.id)}
                  aria-pressed={ativa}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-control px-2.5 py-2 text-left text-casa-sm transition-colors [transition-duration:var(--dur-fast)]",
                    "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
                    ativa ? "bg-casa-tile-2 text-casa-fg" : "text-casa-fg-2 hover:bg-casa-tile-2/50 hover:text-casa-fg",
                  )}
                >
                  {"path" in a.logo ? <LogoAgente icone={a.logo} /> : <a.logo className="size-3.5 shrink-0" aria-hidden />}
                  <span className="truncate">{a.nome}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2">
            {"link" in atual.acao ? (
              <a
                href={atual.acao.link}
                className="alvo-toque inline-flex h-10 items-center gap-2 rounded-control bg-casa-cta px-4 text-casa-base text-casa-cta-fg transition-opacity [transition-duration:var(--dur-fast)] hover:opacity-90 focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]"
              >
                {atual.acao.rotulo}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : (
              <Bloco texto={atual.acao.copiar} />
            )}
            <p className="text-casa-sm text-casa-fg-3">{atual.depois}</p>
          </div>

          {/* O passo do `components.json` é obrigatório até o índice; as regras
              do agente são opcionais, então ficam fechadas. */}
          {atual.registry ? (
            <div className="mt-5 space-y-3 border-t border-casa-line pt-4">
              {!NO_INDICE ? (
                <div className="space-y-2">
                  <p className="text-casa-sm text-casa-fg-2">
                    E no <code>components.json</code> do projeto:
                  </p>
                  <Bloco texto={COMPONENTS_JSON} />
                </div>
              ) : null}
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-control text-casa-sm text-casa-fg-3 hover:text-casa-fg-2 focus-visible:outline-none focus-visible:[box-shadow:var(--focus)] [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-3.5 transition-transform [transition-duration:var(--dur-fast)] group-open:rotate-90" aria-hidden />
                  Opcional: o agente escolhe a peça sem você pedir
                </summary>
                <div className="mt-2">
                  <Bloco texto="npx shadcn@latest add @visant/agent-rules" />
                </div>
              </details>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Texto pra copiar: o próprio bloco é o botão, e o ícone confirma. */
function Bloco({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-2 rounded-control bg-casa-tile-2 py-2.5 pl-3 pr-1.5">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-casa-mono text-casa-sm text-casa-fg [scrollbar-width:none]">
        {texto}
      </pre>
      <CopyCommand text={texto} variant="chip" className="shrink-0" />
    </div>
  );
}
