"use client";

import * as React from "react";
import { Check, ChevronDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * AuthButton — o canto da conta: entrar, ou o rosto de quem já entrou.
 *
 * ── O defeito que esta peça existe pra não cometer ──────────────────────────
 *
 * O botão de conta é o primeiro lugar onde todo produto pisca. A causa é sempre
 * a mesma linha:
 *
 *     {user ? <Menu /> : <button>Entrar</button>}
 *
 * `user` é `null` ANTES da sessão responder e `null` DEPOIS de a sessão dizer
 * "não tem ninguém". Um booleano não distingue "ainda não sei" de "não". Então
 * quem já está logado vê "Entrar" por 200–600ms — o produto acusando a própria
 * pessoa de ser estranha — e o cabeçalho ainda pula quando o pill de 88px vira
 * um avatar de 36px.
 *
 * As duas decisões que consertam isso, e são o contrato da peça:
 *
 *  1. **`status` é um dos três**, `"loading" | "signed-out" | "signed-in"`, e
 *     não `user | null`. Enquanto for `loading` a peça NÃO ESCREVE PALAVRA
 *     nenhuma sobre o estado da conta. Um esqueleto não pode estar errado; a
 *     palavra "Entrar" pode. Quem consome fica obrigado a mapear o estado real
 *     do seu SDK nos três — que é justamente o trabalho que o `??` escondia.
 *  2. **Os três estados ocupam a mesma caixa.** Altura em `--ab-h` e uma
 *     largura mínima reservada em `--ab-w`, valendo para esqueleto, pill e
 *     avatar. Sem isso, não piscar o texto ainda deixaria o layout pular, que é
 *     a metade do defeito que ninguém nomeia.
 *
 * E o `hint`: quem tem um cookie/flag de "havia sessão aqui" passa
 * `hint="signed-in"` e o esqueleto já nasce com a forma redonda do avatar em
 * vez da forma do pill. O palpite muda só a FORMA, nunca o texto — se o palpite
 * errar, nada de falso terá sido dito, só um retângulo de largura diferente.
 *
 * ── Fora disso ──────────────────────────────────────────────────────────────
 *
 * Nenhum SDK entra aqui. Sessão chega por prop e as ações saem por callback, e é
 * por isso que a mesma peça serve Clerk, Supabase, Auth.js ou o OAuth da casa.
 * O menu é próprio (nada de dependência nova): um ponto de tabulação, setas
 * andando pelos itens, `Esc` fecha e devolve o foco ao gatilho, clique fora
 * fecha.
 */

export type AuthStatus = "loading" | "signed-out" | "signed-in";

export interface AuthAccount {
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface AuthProviderOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface AuthMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface AuthButtonProps {
  /** Os três estados de verdade. `loading` nunca desenha texto de conta. */
  status: AuthStatus;
  /** Só faz sentido em `signed-in`. */
  account?: AuthAccount | null;
  /** Com provedores, o clique abre a lista. Sem eles, chama `onSignIn`. */
  providers?: AuthProviderOption[];
  onSignIn?: () => void;
  onSignOut: () => void;
  /** Itens extras do menu da conta (perfil, cobrança, equipe…). */
  items?: AuthMenuItem[];
  /** Palpite de forma para o esqueleto. Não vira texto em hipótese nenhuma. */
  hint?: "signed-in" | "signed-out";
  align?: "start" | "end";
  /**
   * De que lado do gatilho o painel abre. `"bottom"` (padrão) é o canto do
   * header, que foi onde a peça nasceu.
   *
   * `"top"` existe porque o botão de conta nem sempre mora no topo: no Visant
   * Club ele é o rodapé de uma coluna de 240px, e ali o painel de ~14 linhas
   * abria PRA BAIXO, pra fora do viewport — o menu virava uma lista cortada na
   * borda da janela, ou pior, empurrava scroll na sidebar. Um `align` não
   * resolve: aquilo escolhe a borda horizontal.
   */
  side?: "top" | "bottom";
  labels?: Partial<{
    signIn: string;
    signOut: string;
    loading: string;
    providers: string;
  }>;
  className?: string;
}

const PADRAO = {
  signIn: "Entrar",
  signOut: "Sair",
  loading: "Verificando a sessão",
  providers: "Entrar com",
};

function iniciais(nome: string): string {
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/* Painel do gatilho — serve tanto à lista de provedores quanto ao menu da conta.
   É um só porque as duas caixas têm exatamente o mesmo contrato de teclado, e
   duplicar isso seria duplicar o lugar onde o foco se perde. */
function Painel({
  open,
  onClose,
  align,
  side,
  gatilho,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align: "start" | "end";
  side: "top" | "bottom";
  gatilho: React.RefObject<HTMLButtonElement>;
  className?: string;
  children: React.ReactNode;
}) {
  const caixa = React.useRef<HTMLDivElement>(null);

  const itens = React.useCallback(
    () => Array.from(caixa.current?.querySelectorAll<HTMLElement>("[data-item]") ?? []),
    [],
  );

  // Foco no primeiro item ao abrir: menu que abre sem foco dentro obriga a
  // pessoa a caçar o Tab de volta, e no leitor de tela ele simplesmente não
  // existe.
  React.useEffect(() => {
    if (open) itens()[0]?.focus();
  }, [open, itens]);

  React.useEffect(() => {
    if (!open) return;
    const foraDaCaixa = (alvo: Node) =>
      !caixa.current?.contains(alvo) && !gatilho.current?.contains(alvo);
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && foraDaCaixa(e.target)) onClose();
    };
    // `pointerdown` e não `click`: no celular o `click` chega tarde demais e a
    // caixa fica aberta durante o scroll que a pessoa já começou.
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, onClose, gatilho]);

  if (!open) return null;

  const andar = (passo: number) => {
    const lista = itens();
    if (!lista.length) return;
    const atual = lista.findIndex((el) => el === document.activeElement);
    const proximo = (atual + passo + lista.length) % lista.length;
    lista[proximo]?.focus();
  };

  return (
    <div
      ref={caixa}
      role="menu"
      onKeyDown={(e) => {
        switch (e.key) {
          case "Escape":
            e.preventDefault();
            onClose();
            gatilho.current?.focus();
            break;
          case "ArrowDown":
            e.preventDefault();
            andar(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            andar(-1);
            break;
          case "Home":
            e.preventDefault();
            itens()[0]?.focus();
            break;
          case "End":
            e.preventDefault();
            itens().slice(-1)[0]?.focus();
            break;
          case "Tab":
            // Sair da caixa com Tab fecha em vez de deixar o foco vagando por
            // trás de um menu ainda pintado na tela.
            onClose();
            break;
        }
      }}
      className={cn(
        "absolute z-50 w-[16.5rem] max-w-[calc(100vw-1.5rem)] overflow-hidden",
        "rounded-[var(--r-surface,0.875rem)] border border-border bg-popover text-popover-foreground",
        "[box-shadow:var(--e-raised,0_8px_24px_-12px_rgb(0_0_0/0.35))]",
        "animate-in fade-in-0 zoom-in-95 [animation-duration:var(--dur-fast,160ms)]",
        // A origem da escala acompanha o lado: painel que abre pra cima e cresce
        // a partir do topo parece que veio de outro lugar da tela.
        side === "top"
          ? "bottom-[calc(100%+0.375rem)] origin-bottom"
          : "top-[calc(100%+0.375rem)] origin-top",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

const ITEM =
  "flex w-full min-w-0 items-center gap-2.5 px-3 py-2 text-left text-[length:var(--text-corpo,0.8125rem)] text-foreground " +
  "transition-colors [transition-duration:var(--dur-press,120ms)] hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

export function AuthButton({
  status,
  account,
  providers,
  onSignIn,
  onSignOut,
  items,
  hint = "signed-out",
  align = "end",
  side = "bottom",
  labels,
  className,
}: AuthButtonProps) {
  const t = { ...PADRAO, ...labels };
  const [aberto, setAberto] = React.useState(false);
  const gatilho = React.useRef<HTMLButtonElement>(null);

  // Trocar de estado fecha o que estava aberto: sair pelo menu não pode deixar
  // um menu de conta pairando sobre um botão que já virou "Entrar".
  React.useEffect(() => setAberto(false), [status]);

  const fechar = React.useCallback(() => setAberto(false), []);

  return (
    <div
      className={cn(
        // A caixa comum dos três estados. Reservar largura AQUI é o que impede o
        // cabeçalho de pular quando a sessão finalmente responde.
        "relative inline-block [--ab-h:2.25rem] [--ab-w:6.5rem]",
        className,
      )}
    >
      {status === "loading" && (
        /*
         * Nem "Entrar", nem "Carregando…", nem o nome de ninguém. Só a forma.
         * `aria-live="polite"` porque quem usa leitor de tela também merece
         * saber que há algo em curso — mas em texto invisível, que não ocupa
         * espaço nem precisa ser desmentido depois.
         */
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex h-[var(--ab-h)] items-center gap-2",
            hint === "signed-in" ? "" : "w-[var(--ab-w)]",
          )}
        >
          <span className="sr-only">{t.loading}</span>
          {hint === "signed-in" ? (
            <>
              <span className="h-[var(--ab-h)] w-[var(--ab-h)] shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
              <span className="hidden h-3 w-16 animate-pulse rounded-[var(--r-pill,9999px)] bg-muted motion-reduce:animate-none sm:block" />
            </>
          ) : (
            <span className="h-[var(--ab-h)] w-full animate-pulse rounded-[var(--r-pill,9999px)] bg-muted motion-reduce:animate-none" />
          )}
        </div>
      )}

      {status === "signed-out" && (
        <button
          ref={gatilho}
          type="button"
          onClick={() => (providers?.length ? setAberto((o) => !o) : onSignIn?.())}
          aria-haspopup={providers?.length ? "menu" : undefined}
          aria-expanded={providers?.length ? aberto : undefined}
          className={cn(
            "flex h-[var(--ab-h)] min-w-[var(--ab-w)] items-center justify-center gap-1.5 px-4",
            "rounded-[var(--r-pill,9999px)] border border-border bg-card",
            "text-[length:var(--text-corpo,0.8125rem)] font-medium text-foreground",
            // A marca entra em BORDA e sombra, nunca no texto: o ciano da casa
            // dá 1,29:1 sobre branco e some no site do cliente.
            "transition-[border-color,box-shadow,transform] [transition-duration:var(--dur-fast,160ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
            "hover:border-[var(--brand,var(--foreground))] hover:[box-shadow:var(--e-raised)] active:scale-[0.985]",
            "focus-visible:outline-none focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--ring))]",
          )}
        >
          {t.signIn}
          {!!providers?.length && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform [transition-duration:var(--dur-fast,160ms)]",
                aberto && "rotate-180",
              )}
            />
          )}
        </button>
      )}

      {status === "signed-in" && account && (
        <button
          ref={gatilho}
          type="button"
          onClick={() => setAberto((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-label={`Conta de ${account.name}`}
          className={cn(
            "flex h-[var(--ab-h)] min-w-[var(--ab-h)] max-w-[13rem] items-center gap-2 rounded-[var(--r-pill,9999px)]",
            "border border-transparent bg-transparent pl-0 pr-0 sm:border-border sm:bg-card sm:pl-1 sm:pr-2.5",
            "transition-[border-color,box-shadow] [transition-duration:var(--dur-fast,160ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
            "hover:border-[var(--brand,var(--border))] hover:[box-shadow:var(--e-raised)]",
            "focus-visible:outline-none focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--ring))]",
          )}
        >
          <Avatar className="h-[calc(var(--ab-h)-0.5rem)] w-[calc(var(--ab-h)-0.5rem)] shrink-0 ring-1 ring-border">
            {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" />}
            <AvatarFallback className="bg-muted text-[length:var(--text-rotulo,0.6875rem)] font-semibold text-foreground">
              {iniciais(account.name)}
            </AvatarFallback>
          </Avatar>
          {/* O nome some no celular por largura, não por capricho — o avatar
              continua sendo o alvo de 36px que o dedo precisa. */}
          <span className="hidden min-w-0 truncate text-[length:var(--text-corpo,0.8125rem)] font-medium text-foreground sm:block">
            {account.name}
          </span>
          <ChevronDown
            className={cn(
              "hidden h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform [transition-duration:var(--dur-fast,160ms)] sm:block",
              aberto && "rotate-180",
            )}
          />
        </button>
      )}

      {status === "signed-out" && !!providers?.length && (
        <Painel open={aberto} onClose={fechar} align={align} side={side} gatilho={gatilho}>
          <p className="px-3 pb-1 pt-2.5 text-[length:var(--text-rotulo,0.6875rem)] uppercase tracking-[0.08em] text-muted-foreground">
            {t.providers}
          </p>
          {providers.map((p) => (
            <button
              key={p.id}
              data-item
              role="menuitem"
              tabIndex={-1}
              type="button"
              className={ITEM}
              onClick={() => {
                fechar();
                p.onSelect();
              }}
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center text-muted-foreground">
                {p.icon}
              </span>
              <span className="min-w-0 truncate">{p.label}</span>
            </button>
          ))}
          <div className="h-1" />
        </Painel>
      )}

      {status === "signed-in" && account && (
        <Painel open={aberto} onClose={fechar} align={align} side={side} gatilho={gatilho}>
          {/* Quem está logado, escrito por extenso. O avatar sozinho é ambíguo
              em qualquer produto com duas contas na mesma máquina. */}
          <div className="flex min-w-0 items-center gap-2.5 border-b border-border px-3 py-2.5">
            <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border">
              {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" />}
              <AvatarFallback className="bg-muted text-[length:var(--text-rotulo,0.6875rem)] font-semibold text-foreground">
                {iniciais(account.name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[length:var(--text-corpo,0.8125rem)] font-medium text-foreground">
                {account.name}
              </span>
              {account.email && (
                <span className="truncate text-[length:var(--text-apoio,0.75rem)] text-muted-foreground">
                  {account.email}
                </span>
              )}
            </span>
          </div>

          {items?.map((it) => (
            <button
              key={it.id}
              data-item
              role="menuitem"
              tabIndex={-1}
              type="button"
              className={ITEM}
              onClick={() => {
                fechar();
                it.onSelect();
              }}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center text-muted-foreground">
                {it.icon}
              </span>
              <span className="min-w-0 truncate">{it.label}</span>
            </button>
          ))}

          <div className="my-1 h-px bg-border" />
          <button
            data-item
            role="menuitem"
            tabIndex={-1}
            type="button"
            className={cn(ITEM, "mb-1")}
            onClick={() => {
              fechar();
              onSignOut();
            }}
          >
            <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{t.signOut}</span>
          </button>
        </Painel>
      )}
    </div>
  );
}

/**
 * Selo de "entrou" — opcional, para quem quer confirmar a entrada sem toast.
 * Fica aqui e não numa peça própria porque só existe em função deste botão.
 */
export function AuthBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--r-pill,9999px)] border border-border px-2 py-0.5",
        "text-[length:var(--text-rotulo,0.6875rem)] text-muted-foreground",
        className,
      )}
    >
      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      {children}
    </span>
  );
}
