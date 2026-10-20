"use client";

/**
 * Só o botão, no canto onde ele mora (o painel abre pra baixo e pra esquerda,
 * por isso ele encosta à direita da caixa). A sessão percorre os estados
 * sozinha, como num app de verdade: começa verificando, chega logada; sair
 * deixa deslogado, e entrar por um provedor passa de novo pelo "verificando"
 * antes de logar. É nessa troca que se vê o que a peça promete: o botão não
 * escreve "Entrar" enquanto espera e não muda de tamanho quando a conta chega.
 */

import * as React from "react";
import { Chrome, CreditCard, Github, User } from "lucide-react";

import { AuthButton, type AuthStatus } from "../../../registry/visant/ui/auth-button";
import { midia } from "../media";
import type { DemoProps } from "../catalog";

const CONTA = {
  name: "Marina Duarte",
  email: "marina@exemplo.com",
  avatarUrl: midia("retrato", 1)?.src,
};

export default function AuthButtonDemo({ props }: DemoProps) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const timer = React.useRef(0);

  const verificar = React.useCallback((ms: number) => {
    setStatus("loading");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("signed-in"), ms);
  }, []);

  React.useEffect(() => {
    verificar(1400);
    return () => window.clearTimeout(timer.current);
  }, [verificar]);

  return (
    <div className="flex h-full w-full items-start justify-center p-6">
      <div className="flex w-[280px] max-w-full justify-end pt-8">
        <AuthButton
          status={status}
          hint="signed-in"
          account={CONTA}
          providers={[
            { id: "google", label: "Google", icon: <Chrome className="h-4 w-4" />, onSelect: () => verificar(900) },
            { id: "github", label: "GitHub", icon: <Github className="h-4 w-4" />, onSelect: () => verificar(900) },
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
  );
}
