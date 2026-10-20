"use client";

/**
 * O campo no fim de um aceite de proposta.
 *
 * O botão de aceitar só acorda quando há tinta no campo: é o uso real do
 * `onChange`, e mostra que limpar devolve o botão ao estado de espera.
 */

import * as React from "react";
import { Check } from "lucide-react";

import { SignaturePad } from "../../../registry/visant/ui/signature-pad";
import type { DemoProps } from "../catalog";

export default function SignaturePadDemo({ props }: DemoProps) {
  const [tracos, setTracos] = React.useState(0);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[420px] max-w-full flex-col gap-3">
        <p className="text-corpo text-muted-foreground">Li a proposta e aceito os termos.</p>
        <SignaturePad signer="Marina Duarte, Estúdio Orla" onChange={(s) => setTracos(s.length)} {...props} />
        <button
          type="button"
          disabled={tracos === 0}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-[var(--brand)] bg-[var(--brand)] px-4 text-corpo font-medium text-[var(--brand-foreground)] [transition:opacity_var(--dur-fast)_var(--ease-out)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus)] disabled:opacity-40"
        >
          <Check className="size-4" aria-hidden="true" />
          Aceitar proposta
        </button>
      </div>
    </div>
  );
}
