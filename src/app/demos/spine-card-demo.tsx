"use client";

/**
 * Três objetos numa prateleira, com o tombo ligado: é o caso em que ele
 * significa alguma coisa (ver a nota 2 da peça). Sem interruptor nem legenda
 * em volta. Capa de foto e não capa desenhada com o título, porque o título já
 * está embaixo; repetido na capa, ele virava texto duas vezes por objeto.
 *
 * O hover endireita, sobe e devolve a cor da capa: é o gesto de pegar.
 */

import { ArrowUpRight } from "lucide-react";

import { SpineCard } from "../../../registry/visant/ui/spine-card";
import { Media } from "../media";
import type { DemoProps } from "../catalog";

const TITULOS = ["Marca em 9 etapas", "O método do lote", "Imersão de dois dias"];

export default function SpineCardDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center px-5">
      {/* `items-end` porque o tombo gira na base: é ela que fica alinhada, e
          a régua embaixo é a prateleira onde as três se apoiam. */}
      <div className="flex flex-wrap items-end justify-center gap-6 border-b border-border px-2 pt-6">
        {TITULOS.map((t, i) => (
          <SpineCard
            key={t}
            index={i}
            tilt
            href="#"
            title={t}
            action={<ArrowUpRight aria-hidden="true" className="size-4" />}
            className="w-[168px]"
            cover={<Media papel="cena" indice={[2, 3, 5][i]} ratio="2/3" className="w-full [&_img]:!h-full" />}
            {...props}
          />
        ))}
      </div>
    </div>
  );
}
