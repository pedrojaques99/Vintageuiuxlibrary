"use client";

/**
 * A conta começa dobrada: o cabeçalho com o total já é o resumo, e puxar para
 * baixo (ou tocar) abre o resto. Nenhuma legenda explicando o gesto; a
 * serrilha e o cursor de agarrar fazem esse trabalho.
 */

import { FoldingBill } from "../../../registry/visant/ui/folding-bill";
import type { DemoProps } from "../catalog";

export default function FoldingBillDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      {/* Abre ABERTO: dobrado, o recibo era uma tira no topo de uma caixa vazia.
          Aberto ele ocupa o palco, e dobrar é o gesto que a pessoa descobre. O
          topo fica ancorado (`pt-4`) pra dobra subir sem empurrar o cabeçalho. */}
      <div className="h-[290px] pt-4">
        <FoldingBill defaultFolded={false} {...props} />
      </div>
    </div>
  );
}
