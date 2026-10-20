"use client";

/**
 * Quatro cartões de uma pessoa só, e o detalhe que justifica abrir um: saldo e
 * os últimos movimentos. Os valores são da demo; quem consome passa o dele.
 */

import { ArrowDownLeft, ShoppingBasket, Users } from "lucide-react";

import { WalletStack, type WalletCard } from "../../../registry/visant/ui/wallet-stack";
import type { DemoProps } from "../catalog";

const CARTOES: WalletCard[] = [
  { id: "conta", title: "Conta Visant", kind: "Débito", last4: "4821", holder: "Marina Alves", expiry: "09/29", tone: "brand" },
  { id: "reserva", title: "Reserva", kind: "Crédito", last4: "0917", holder: "Marina Alves", expiry: "03/28", tone: "ink" },
  { id: "bilhete", title: "Bilhete único", kind: "Transporte", last4: "3306", holder: "Marina Alves", tone: "muted" },
  { id: "cafe", title: "Clube do café", kind: "Assinatura", last4: "7730", holder: "Marina Alves", expiry: "06/28", tone: "card" },
];

const SALDO: Record<string, string> = {
  conta: "R$ 3.248,60",
  reserva: "R$ 12.400,00",
  bilhete: "R$ 46,30",
  cafe: "R$ 89,90",
};

const MOVIMENTOS = [
  { icone: Users, nome: "Rafael Souza", quando: "Racha do jantar, hoje", valor: "+R$ 36,50" },
  { icone: ShoppingBasket, nome: "Hortifruti da esquina", quando: "Mercado, ontem", valor: "-R$ 84,12" },
  { icone: ArrowDownLeft, nome: "Estúdio Linha", quando: "Pagamento, 18 set", valor: "+R$ 2.860,00" },
];

function Detalhe({ card }: { card: WalletCard }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between border-b border-border pb-2">
        <span className="text-muted-foreground">Disponível</span>
        <span className="text-xl font-medium tabular-nums text-foreground">{SALDO[card.id]}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {MOVIMENTOS.map(({ icone: Icone, nome, quando, valor }) => (
          <li key={nome} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-[var(--r-pill)] bg-muted text-muted-foreground">
              <Icone aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-foreground">{nome}</span>
              <span className="block truncate text-xs text-muted-foreground">{quando}</span>
            </span>
            <span className="tabular-nums text-foreground">{valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WalletStackDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <WalletStack cards={CARTOES} label="Cartões da Marina" renderDetail={(c) => <Detalhe card={c} />} {...props} />
    </div>
  );
}
