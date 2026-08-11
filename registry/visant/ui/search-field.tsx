"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * SearchField — campo de busca controlado, com debounce e botão de limpar.
 *
 * Parece um `<input>` com ícone. O que justifica ser um componente é a
 * **negociação entre o texto local e o valor de fora**, que é onde essa peça
 * quebra em toda base de código, sempre do mesmo jeito.
 *
 * ── O bug que este arquivo existe para não repetir ──────────────────────────
 * O campo precisa de estado local (para responder à tecla no mesmo quadro) e de
 * `value` externo (para o botão "Limpar" e os presets de filtro funcionarem). A
 * versão ingênua sincroniza comparando `value` com o estado local:
 *
 *     if (value !== searchValue) setSearchValue(value);   // ← não faça isto
 *
 * No commit em que o debounce fecha, o pai **ainda tem o valor antigo** (`""`) e o
 * local já tem "arbolt". A condição dá verdadeira e o campo se limpa no mesmo
 * instante em que manda a busca para cima. Aí o `value` novo chega, é readotado,
 * debounça, limpa de novo: a tabela filtra e desfiltra em loop, e o texto pisca
 * fora do campo. Foi exatamente isso que quebrou uma tela de demandas em produção.
 *
 * A saída é `agreedValue`: o último valor em que campo e pai **concordaram** — o
 * que este emitiu para cima, ou o que ele adotou de lá. É a única referência que
 * decide quem manda, e a ordem dos dois efeitos importa:
 *
 * 1. **adotar de fora** vem primeiro. No commit em que o debounce fecha, ele vê o
 *    par acordado e não faz nada;
 * 2. **emitir para cima** vem depois e move a referência.
 *
 * Inverta os dois e o loop volta.
 *
 * ── Fora isso ───────────────────────────────────────────────────────────────
 * - `onChange` entra por ref: trocar a identidade da função (o caso comum, com
 *   uma arrow inline no consumidor) não pode reprogramar o debounce.
 * - O botão de limpar só existe quando há texto — e tem nome acessível, porque
 *   um `×` sozinho se anuncia como "botão".
 * - Sem `fetch`, sem i18n: o `placeholder` é prop.
 */

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Milissegundos até o valor "fechar" e subir. `0` emite a cada tecla. */
  delay?: number;
  clearLabel?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar...",
  delay = 300,
  clearLabel = "Limpar busca",
  className,
  ...props
}: SearchFieldProps) {
  const [text, setText] = React.useState(value);
  const debounced = useDebounce(text, delay);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  /** O último valor em que este campo e o pai concordaram. Ver o bloco acima. */
  const agreedValue = React.useRef(value);

  // 1. Adotar o que veio de FORA (botão "Limpar", preset, URL). Precisa vir antes.
  React.useEffect(() => {
    if (value === agreedValue.current) return;
    agreedValue.current = value;
    setText(value);
  }, [value]);

  // 2. Emitir o que fechou aqui. É este que move a referência.
  React.useEffect(() => {
    if (debounced === agreedValue.current) return;
    agreedValue.current = debounced;
    onChangeRef.current(debounced);
  }, [debounced]);

  return (
    <div className={cn("relative min-w-[200px] flex-1", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      </svg>

      <input
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        className={cn(
          "h-[var(--control-h,2.25rem)] w-full",
          "rounded-[var(--r-control,0.5rem)] border border-[var(--input,var(--border))]",
          "bg-[var(--background)] pl-9 pr-9 text-sm text-[var(--foreground)]",
          "placeholder:text-[var(--muted-foreground)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "transition-[border-color,box-shadow]",
          "[transition-duration:var(--dur-fast,160ms)]",
          "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
          // O × nativo do type=search duplicaria o nosso, e não é estilizável.
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
        {...props}
      />

      {text ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => setText("")}
          className={cn(
            "absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center",
            "rounded-[var(--r-control,0.375rem)] text-[var(--muted-foreground)]",
            "hover:text-[var(--foreground)]",
            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-3 w-3"
          >
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
