"use client";

/**
 * Conectar o catálogo ao agente de IA de quem chegou.
 *
 * A peça é nossa, o instalador não: o MCP oficial do shadcn (`npx shadcn mcp`)
 * já busca, lê e instala de qualquer registry. O pedágio que sobrava era saber
 * disso, achar a config certa pra cada editor e lembrar de declarar o `@visant`.
 * Aqui cada agente ganha UMA ação: deeplink de um clique quando o editor aceita
 * (Cursor, VS Code), comando pra colar quando não (Claude Code, Codex), e um
 * texto pronto pra qualquer outro agente, que lê o `llms.txt` sem MCP nenhum.
 *
 * Abre pelo cabeçalho e por link: `?conectar` ou `?conectar=cursor`.
 */

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Plug, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Aba } from "./casa-ui";
import { CopyCommand } from "./copy-command";

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

type Agente = "claude" | "cursor" | "vscode" | "codex" | "outro";

const AGENTES: {
  id: Agente;
  nome: string;
  /** A ação: link de um clique ou texto pra copiar. */
  acao: { link: string; rotulo: string } | { copiar: string };
  /** Uma linha, no máximo, sobre o que acontece depois. */
  depois: string;
  /** Este agente precisa do `@visant` no `components.json` (até o índice). */
  registry: boolean;
}[] = [
  {
    id: "claude",
    nome: "Claude Code",
    acao: { copiar: "claude mcp add shadcn -- npx shadcn@latest mcp" },
    depois: "Rode no terminal do projeto e reinicie o Claude Code. O /mcp mostra conectado.",
    registry: true,
  },
  {
    id: "cursor",
    nome: "Cursor",
    acao: { link: cursorLink, rotulo: "Adicionar ao Cursor" },
    depois: "O Cursor abre e pede pra confirmar. Depois é só ligar o servidor em Settings.",
    registry: true,
  },
  {
    id: "vscode",
    nome: "VS Code",
    acao: { link: vscodeLink, rotulo: "Adicionar ao VS Code" },
    depois: "O VS Code abre a instalação do servidor pro Copilot.",
    registry: true,
  },
  {
    id: "codex",
    nome: "Codex",
    acao: { copiar: `[mcp_servers.shadcn]\ncommand = "npx"\nargs = ["shadcn@latest", "mcp"]` },
    depois: "Cole em ~/.codex/config.toml e reinicie o Codex.",
    registry: true,
  },
  {
    id: "outro",
    nome: "Outro agente",
    acao: { copiar: PROMPT },
    depois: "Cole no começo da conversa. Serve pra qualquer agente que lê a web, sem MCP.",
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
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-casa-lg font-medium">Conectar ao seu agente</Dialog.Title>
            <Dialog.Close className="casa-icone alvo-toque -mr-2 -mt-1" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-casa-base text-casa-fg-2">
            Seu agente busca, escolhe e instala as peças sozinho.
          </Dialog.Description>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1" role="group" aria-label="Agente">
            {AGENTES.map((a) => (
              <Aba key={a.id} ativa={a.id === agente} onClick={() => setAgente(a.id)}>
                {a.nome}
              </Aba>
            ))}
          </div>

          <div className="mt-5 space-y-3">
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

          {atual.registry ? (
            <div className="mt-6 space-y-4 border-t border-casa-line pt-5">
              {!NO_INDICE ? (
                <div className="space-y-2">
                  <p className="text-casa-sm text-casa-fg-2">
                    No <code>components.json</code> do projeto, pro agente achar o <code>@visant</code>:
                  </p>
                  <Bloco texto={COMPONENTS_JSON} />
                </div>
              ) : null}
              <div className="space-y-2">
                <p className="text-casa-sm text-casa-fg-2">Pro agente escolher a peça certa sem você pedir:</p>
                <Bloco texto="npx shadcn@latest add @visant/agent-rules" />
              </div>
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
