"use client";

/**
 * A demo mostra o botão DENTRO da barra que ele habita, e com o interruptor dos
 * três estados à mão.
 *
 * Fora de um cabeçalho o defeito que a peça conserta some: a piscada de "Entrar"
 * e o pulo de layout só existem quando há uma barra em volta para pular junto.
 * Aqui a navegação falsa fica à esquerda, o botão à direita, e o seletor embaixo
 * troca a sessão simulada — pisando de "carregando" para "logado" dá pra ver que
 * nada anda de lugar, que é exatamente o que a peça promete.
 */

import * as React from "react";
import { Chrome, CreditCard, Github, KeyRound, User } from "lucide-react";

import { AuthButton, type AuthStatus } from "../../../registry/visant/ui/auth-button";
import { SegmentedControl } from "../../../registry/visant/ui/segmented-control";
import { midia } from "../media";
import type { DemoProps } from "../catalog";

const CONTA = {
  name: "Marina Duarte",
  email: "marina@estudioarco.com.br",
  avatarUrl: midia("retrato", 1)?.src,
};

export default function AuthButtonDemo({ props }: DemoProps) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");

  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 p-5">
      <div className="flex min-w-0 items-center gap-3 rounded-[var(--r-surface,0.875rem)] border border-border bg-card px-3 py-2.5">
        <span className="h-6 w-6 shrink-0 rounded-[var(--r-control,0.5rem)] border border-border bg-[var(--brand)]" />
        <nav className="hidden min-w-0 gap-4 text-apoio text-muted-foreground sm:flex">
          <span className="truncate">Projetos</span>
          <span className="truncate">Marcas</span>
          <span className="truncate">Entregas</span>
        </nav>
        <div className="ml-auto shrink-0">
          <AuthButton
            status={status}
            hint="signed-in"
            account={CONTA}
            providers={[
              { id: "google", label: "Google", icon: <Chrome className="h-4 w-4" />, onSelect: () => setStatus("signed-in") },
              { id: "github", label: "GitHub", icon: <Github className="h-4 w-4" />, onSelect: () => setStatus("signed-in") },
              { id: "sso", label: "SSO da empresa", icon: <KeyRound className="h-4 w-4" />, onSelect: () => setStatus("signed-in") },
            ]}
            items={[
              { id: "perfil", label: "Perfil", icon: <User className="h-4 w-4" />, onSelect: () => {} },
              { id: "plano", label: "Plano e cobrança", icon: <CreditCard className="h-4 w-4" />, onSelect: () => {} },
            ]}
            onSignOut={() => setStatus("signed-out")}
            {...props}
          />
        </div>
      </div>

      <SegmentedControl
        aria-label="Sessão simulada"
        value={status}
        onChange={setStatus}
        options={[
          { value: "loading", label: "carregando" },
          { value: "signed-out", label: "deslogado" },
          { value: "signed-in", label: "logado" },
        ]}
      />
    </div>
  );
}
