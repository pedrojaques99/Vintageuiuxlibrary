"use client";

import * as React from "react";
import { AlertCircle, Camera, Check, Loader2, MailWarning, Trash2, Undo2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * ProfileForm — editar o próprio perfil: foto, nome, e-mail.
 *
 * ── O que separa este form de um form genérico ──────────────────────────────
 *
 * 1. **O impedimento mora no campo.** O padrão da casa é o oposto do comum: o
 *    botão de salvar NÃO fica cinza esperando o formulário ficar bonito. Botão
 *    desabilitado é a pior mensagem de erro já inventada — ele não diz o que
 *    falta, não é focável, e no leitor de tela é uma parede muda. Aqui o botão
 *    está sempre clicável enquanto houver mudança; clicar com campo inválido
 *    NÃO salva, escreve o motivo embaixo do campo culpado e leva o foco até
 *    ele. Nada de toast: um toast some sozinho, longe do campo, e obriga a
 *    pessoa a decorar a frase para depois procurar onde ela se aplica.
 * 2. **Erro não grita antes da hora.** A validação de um campo só aparece
 *    depois que a pessoa saiu dele (`blur`) ou tentou salvar. Reclamar de
 *    "e-mail inválido" na terceira letra é o form corrigindo alguém no meio da
 *    frase. Depois que o campo já errou uma vez, aí sim ele revalida a cada
 *    tecla — porque agora a mensagem que interessa é a que some.
 * 3. **Sujo / salvando / salvo, com desfazer de verdade.** "Salvo" não é um
 *    flash decorativo: durante `undoWindowMs` ele carrega um Desfazer que
 *    regrava o valor ANTERIOR pelo mesmo `onSave`. Desfazer que só limpa o
 *    rascunho local é desfazer de mentira depois que o dado já foi.
 * 4. **Trocar de e-mail derruba o verificado.** O selo é do endereço, não da
 *    pessoa. Assim que o campo diverge do salvo, o selo sai e o campo avisa —
 *    no lugar onde a decisão está sendo tomada — que vai ser preciso confirmar.
 *
 * Recorte de foto não mora aqui de propósito: recortar é uma peça com o próprio
 * gesto (arrastar, zoom, proporção) e enfiá-la dentro do form transformaria as
 * duas em uma coisa média. Aqui a foto é escolhida, pré-visualizada e enviada.
 *
 * Nenhum backend entra: `onSave` é uma promessa que quem instala resolve como
 * quiser, e o estado do botão sai do ciclo de vida dela.
 */

export interface ProfileValue {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export type ProfileErrors = Partial<Record<"name" | "email", string>>;

export interface ProfileFormProps {
  /** O valor SALVO — a fonte de verdade. O rascunho é interno. */
  value: ProfileValue;
  /** Verificação do e-mail salvo. Muda o e-mail, o selo cai sozinho. */
  emailVerified?: boolean;
  onSave: (next: ProfileValue, extra: { avatarFile: File | null }) => Promise<void>;
  onResendVerification?: () => void | Promise<void>;
  /** Validação de negócio, somada à básica (obrigatório / formato de e-mail). */
  validate?: (draft: ProfileValue) => ProfileErrors;
  /** Janela do desfazer depois de salvar. `0` desliga. */
  undoWindowMs?: number;
  className?: string;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

const CAMPO =
  "h-9 w-full min-w-0 rounded-[var(--r-control,0.5rem)] border border-border bg-background px-3 " +
  "text-[length:var(--text-corpo,0.8125rem)] text-foreground placeholder:text-muted-foreground " +
  "transition-[border-color,box-shadow] [transition-duration:var(--dur-fast,160ms)] " +
  "focus-visible:outline-none focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--ring))] " +
  "aria-[invalid=true]:border-destructive";

function Campo({
  id,
  label,
  erro,
  nota,
  acessorio,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  nota?: React.ReactNode;
  acessorio?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <label
          htmlFor={id}
          className="text-[length:var(--text-rotulo,0.6875rem)] uppercase tracking-[0.08em] text-muted-foreground"
        >
          {label}
        </label>
        {acessorio}
      </div>
      {children}
      {/*
       * O espaço da mensagem não é reservado: reservar duas linhas em todo campo
       * afasta os rótulos e faz o form parecer arejado por acidente. Quem
       * aparece empurra — e empurrar é o movimento que chama o olho pra baixo,
       * que é justamente pra onde ele tem que ir.
       */}
      {erro ? (
        <p
          id={`${id}-erro`}
          role="alert"
          className="flex items-start gap-1.5 text-[length:var(--text-apoio,0.75rem)] text-destructive"
        >
          <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">{erro}</span>
        </p>
      ) : (
        nota
      )}
    </div>
  );
}

export function ProfileForm({
  value,
  emailVerified = false,
  onSave,
  onResendVerification,
  validate,
  undoWindowMs = 6000,
  className,
}: ProfileFormProps) {
  const id = React.useId();
  const [draft, setDraft] = React.useState<ProfileValue>(value);
  const [tocado, setTocado] = React.useState<Record<string, boolean>>({});
  const [tentou, setTentou] = React.useState(false);
  const [estado, setEstado] = React.useState<"parado" | "salvando" | "salvo" | "erro">("parado");
  const [falha, setFalha] = React.useState<string | null>(null);

  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const [previa, setPrevia] = React.useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = React.useState(false);

  const anterior = React.useRef<ProfileValue | null>(null);
  const inputFoto = React.useRef<HTMLInputElement>(null);
  const refNome = React.useRef<HTMLInputElement>(null);
  const refEmail = React.useRef<HTMLInputElement>(null);

  /*
   * Valor salvo mudou por fora (outra aba, refetch): o rascunho acompanha.
   *
   * A dependência são os CAMPOS, não o objeto. Quem consome quase sempre escreve
   * `value={{ name, email }}` inline — objeto novo a cada render — e depender da
   * identidade faria o rascunho ser apagado a cada tecla digitada. É o tipo de
   * bug que só aparece no projeto do cliente, nunca na demo.
   */
  React.useEffect(() => {
    setDraft({ name: value.name, email: value.email, avatarUrl: value.avatarUrl });
    setArquivo(null);
    setRemoverFoto(false);
  }, [value.name, value.email, value.avatarUrl]);

  // `createObjectURL` sem `revokeObjectURL` é vazamento de memória por foto
  // escolhida — e quem troca de foto costuma trocar cinco vezes.
  React.useEffect(() => {
    if (!arquivo) {
      setPrevia(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const erros: ProfileErrors = React.useMemo(() => {
    const e: ProfileErrors = {};
    if (!draft.name.trim()) e.name = "O nome não pode ficar vazio.";
    else if (draft.name.trim().length < 2) e.name = "Nome curto demais — pelo menos 2 letras.";
    if (!draft.email.trim()) e.email = "O e-mail não pode ficar vazio.";
    else if (!RE_EMAIL.test(draft.email.trim())) e.email = "Faltou o formato de e-mail (nome@dominio.com).";
    return { ...e, ...(validate?.(draft) ?? {}) };
  }, [draft, validate]);

  const mostra = (campo: "name" | "email") => (tocado[campo] || tentou ? erros[campo] : undefined);

  const sujo =
    draft.name !== value.name ||
    draft.email !== value.email ||
    arquivo !== null ||
    removerFoto;

  const emailMudou = draft.email.trim() !== value.email.trim();
  const fotoAtual = removerFoto ? null : (previa ?? value.avatarUrl ?? null);

  const gravar = React.useCallback(
    async (proximo: ProfileValue, extra: { avatarFile: File | null }, guardaAnterior: ProfileValue | null) => {
      setEstado("salvando");
      setFalha(null);
      try {
        await onSave(proximo, extra);
        anterior.current = guardaAnterior;
        setDraft(proximo);
        setArquivo(null);
        setRemoverFoto(false);
        setTentou(false);
        setTocado({});
        setEstado("salvo");
      } catch (e) {
        // Falha de rede é do formulário inteiro, não de um campo — e por isso é
        // a ÚNICA mensagem que aparece na barra de baixo em vez de num campo.
        setFalha(e instanceof Error ? e.message : String(e));
        setEstado("erro");
      }
    },
    [onSave],
  );

  // O "salvo" apaga sozinho; enquanto ele está aceso, o desfazer existe.
  React.useEffect(() => {
    if (estado !== "salvo" || undoWindowMs <= 0) return;
    const t = setTimeout(() => {
      setEstado("parado");
      anterior.current = null;
    }, undoWindowMs);
    return () => clearTimeout(t);
  }, [estado, undoWindowMs]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === "salvando") return;
    setTentou(true);
    // Impedir de salvar é obrigação do form; esconder o motivo não é. O foco
    // vai ao primeiro campo culpado porque num form de três campos a rolagem
    // pode já ter tirado ele da tela.
    if (erros.name) return refNome.current?.focus();
    if (erros.email) return refEmail.current?.focus();
    if (!sujo) return;
    void gravar(
      { ...draft, name: draft.name.trim(), email: draft.email.trim(), avatarUrl: removerFoto ? null : draft.avatarUrl },
      { avatarFile: arquivo },
      value,
    );
  };

  const desfazerRascunho = () => {
    setDraft(value);
    setArquivo(null);
    setRemoverFoto(false);
    setTocado({});
    setTentou(false);
    setEstado("parado");
  };

  const desfazerSalvo = () => {
    const alvo = anterior.current;
    if (!alvo) return;
    anterior.current = null;
    void gravar(alvo, { avatarFile: null }, null);
  };

  return (
    <form
      onSubmit={enviar}
      noValidate
      className={cn(
        "flex w-full min-w-0 flex-col gap-5 rounded-[var(--r-surface,0.875rem)] border border-border bg-card p-5",
        className,
      )}
    >
      {/* --- foto ------------------------------------------------------------ */}
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <div className="relative shrink-0">
          <Avatar className="h-16 w-16 ring-1 ring-border">
            {fotoAtual && <AvatarImage src={fotoAtual} alt="" />}
            <AvatarFallback className="bg-muted text-[length:var(--text-corpo,0.8125rem)] font-semibold text-foreground">
              {iniciais(draft.name)}
            </AvatarFallback>
          </Avatar>
          {/*
           * O gatilho é um botão de verdade sobre a foto, e não um `<label>`
           * escondido: label não recebe foco por Tab e não anuncia ação. A
           * borda de marca aparece no hover — marca em contorno, nunca no texto.
           *
           * E é o ÚNICO gatilho de troca. Havia um segundo, "Trocar foto", em
           * texto sublinhado ao lado do nome, disparando exatamente este mesmo
           * `click()` no mesmo input: dois botões, uma ação. Redundância assim
           * não é generosidade — é a pessoa perguntando se os dois fazem a mesma
           * coisa e o formulário não respondendo. Ficou o que está no lugar do
           * gesto: a câmera em cima da própria foto.
           */}
          <button
            type="button"
            onClick={() => inputFoto.current?.click()}
            // O rótulo acompanha o estado: sem foto, não há o que trocar.
            aria-label={fotoAtual ? "Trocar foto do perfil" : "Enviar foto do perfil"}
            className={cn(
              "absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-card",
              "transition-[border-color,box-shadow] [transition-duration:var(--dur-fast,160ms)]",
              "hover:border-[var(--brand,var(--foreground))] hover:[box-shadow:var(--e-raised)]",
              "focus-visible:outline-none focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--ring))]",
            )}
          >
            <Camera className="h-3.5 w-3.5 text-foreground" />
          </button>
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f) {
                setArquivo(f);
                setRemoverFoto(false);
              }
              // Zerar o input: escolher o MESMO arquivo depois de remover não
              // dispara `change` nenhum se o valor continuar lá.
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[length:var(--text-corpo,0.8125rem)] font-medium text-foreground">
            {draft.name || "Sem nome"}
          </span>
          {/* Sobra uma ação em texto, e ela é a que NÃO cabe em cima da foto:
              remover não tem lugar de gesto próprio, e é destrutiva o bastante
              pra querer estar escrita por extenso. */}
          {fotoAtual && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => {
                  setArquivo(null);
                  setRemoverFoto(true);
                }}
                className="flex items-center gap-1 text-[length:var(--text-apoio,0.75rem)] text-muted-foreground transition-colors [transition-duration:var(--dur-press,120ms)] hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Remover
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- campos ---------------------------------------------------------- */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Campo id={`${id}-nome`} label="Nome" erro={mostra("name")}>
          <input
            ref={refNome}
            id={`${id}-nome`}
            name="name"
            value={draft.name}
            autoComplete="name"
            aria-invalid={!!mostra("name")}
            aria-describedby={mostra("name") ? `${id}-nome-erro` : undefined}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onBlur={() => setTocado((t) => ({ ...t, name: true }))}
            className={CAMPO}
          />
        </Campo>

        <Campo
          id={`${id}-email`}
          label="E-mail"
          erro={mostra("email")}
          acessorio={
            emailMudou ? null : emailVerified ? (
              <span className="inline-flex items-center gap-1 text-[length:var(--text-rotulo,0.6875rem)] text-muted-foreground">
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                verificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[length:var(--text-rotulo,0.6875rem)] text-muted-foreground">
                <MailWarning className="h-3 w-3" />
                não verificado
                {onResendVerification && (
                  <button
                    type="button"
                    onClick={() => void onResendVerification()}
                    className="underline decoration-dotted underline-offset-4 transition-colors [transition-duration:var(--dur-press,120ms)] hover:text-foreground"
                  >
                    reenviar
                  </button>
                )}
              </span>
            )
          }
          nota={
            emailMudou ? (
              // O aviso mora no campo que causou a consequência. Num toast ele
              // apareceria depois de salvar, longe do endereço digitado.
              <p className="flex items-start gap-1.5 text-[length:var(--text-apoio,0.75rem)] text-muted-foreground">
                <MailWarning className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  Você vai precisar confirmar este endereço. Até lá, o acesso continua pelo atual.
                </span>
              </p>
            ) : undefined
          }
        >
          <input
            ref={refEmail}
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            value={draft.email}
            autoComplete="email"
            aria-invalid={!!mostra("email")}
            aria-describedby={mostra("email") ? `${id}-email-erro` : undefined}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            onBlur={() => setTocado((t) => ({ ...t, email: true }))}
            className={CAMPO}
          />
        </Campo>
      </div>

      {/* --- barra de estado -------------------------------------------------- */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p
          aria-live="polite"
          className="flex min-w-0 items-center gap-1.5 text-[length:var(--text-apoio,0.75rem)] text-muted-foreground"
        >
          {estado === "salvando" && (
            <>
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
              Salvando…
            </>
          )}
          {estado === "salvo" && (
            <>
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              Salvo
              {undoWindowMs > 0 && anterior.current && (
                <button
                  type="button"
                  onClick={desfazerSalvo}
                  className="ml-1 inline-flex items-center gap-1 underline decoration-dotted underline-offset-4 transition-colors [transition-duration:var(--dur-press,120ms)] hover:text-foreground"
                >
                  <Undo2 className="h-3 w-3" />
                  desfazer
                </button>
              )}
            </>
          )}
          {estado === "erro" && (
            <span className="flex min-w-0 items-start gap-1.5 text-destructive">
              <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">Não deu pra salvar{falha ? ` — ${falha}` : ""}.</span>
            </span>
          )}
          {estado === "parado" && sujo && "Alterações não salvas"}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={desfazerRascunho}
            disabled={!sujo || estado === "salvando"}
            className={cn(
              "h-9 rounded-[var(--r-pill,9999px)] border border-border bg-card px-3.5",
              "text-[length:var(--text-corpo,0.8125rem)] text-foreground",
              "transition-[opacity,border-color] [transition-duration:var(--dur-fast,160ms)]",
              "hover:border-[var(--brand,var(--foreground))] disabled:opacity-40",
              "focus-visible:outline-none focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--ring))]",
            )}
          >
            Desfazer
          </button>
          {/*
           * Habilitado mesmo com campo inválido. Ver a nota do topo: o clique é
           * o que revela o motivo, e o motivo aparece no campo. Só a ausência de
           * mudança desabilita — aí não há nada a explicar.
           */}
          <button
            type="submit"
            disabled={!sujo || estado === "salvando"}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-[var(--r-pill,9999px)] px-4",
              "bg-[var(--brand,var(--foreground))] text-[var(--brand-foreground,var(--background))]",
              "text-[length:var(--text-corpo,0.8125rem)] font-medium",
              "transition-[opacity,box-shadow,transform] [transition-duration:var(--dur-fast,160ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
              "hover:[box-shadow:var(--e-raised)] active:scale-[0.985] disabled:opacity-40",
              "focus-visible:outline-none focus-visible:[box-shadow:var(--focus,0_0_0_2px_var(--ring))]",
            )}
          >
            {estado === "salvando" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
}
