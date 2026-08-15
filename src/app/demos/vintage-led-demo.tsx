"use client";

/**
 * O LED no papel dele: bancada, não card próprio.
 *
 * Sozinho o item é uma bolinha que acende — e foi assim que ele chegou ao
 * relatório, "componente separado morto". Um LED não é um controle, é a
 * resposta de outro controle; ele só existe quando alguém liga a chave e o
 * sinal sobe. Então a cena é a bancada inteira: a chave POWER manda na
 * alimentação, o equalizador manda no nível de cada banda, e a fileira de LEDs
 * embaixo dos faders diz o que está passando.
 *
 * O item continua publicado sozinho no registry — quem instalou não quebra.
 * Isto aqui é a vitrine mostrando o LED em uso, que é como ele se vende.
 */

import * as React from "react";

import { VintageLed } from "../../../registry/vintage/ui/vintage-led";
import {
  VintageParametricEQ,
  type EqBand,
} from "../../../registry/vintage/ui/vintage-parametric-eq";
import { VintageToggle } from "../../../registry/vintage/ui/vintage-toggle";

const BANDAS: EqBand[] = [
  { id: "b63", label: "63", freq: 63, gain: 0, q: 0.9 },
  { id: "b250", label: "250", freq: 250, gain: 0, q: 1.1 },
  { id: "b1k", label: "1k", freq: 1000, gain: 0, q: 1.2 },
  { id: "b4k", label: "4k", freq: 4000, gain: 0, q: 1 },
];

export default function VintageLedDemo() {
  const [posicao, setPosicao] = React.useState<"up" | "middle" | "down">("up");
  const [valores, setValores] = React.useState(BANDAS.map(() => 5));

  const ligado = posicao === "up";
  const standby = posicao === "middle";
  const clip = ligado && valores.some((v) => v > 9);

  return (
    <div className="flex h-full w-full items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-6">
        <VintageToggle
          title="POWER"
          labels={["ON", "STB", "OFF"]}
          position={posicao}
          onChange={setPosicao}
        />
        <div className="flex gap-4">
          <VintageLed
            color="green"
            size="lg"
            label="PWR"
            active={ligado || standby}
            intensity={ligado ? 1 : 0.35}
          />
          <VintageLed
            color="red"
            size="lg"
            label="CLIP"
            active={clip}
            pulse
          />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <VintageParametricEQ
          width={420}
          height={190}
          bands={BANDAS}
          // O EQ deixou de ser banco de faders e virou curva: `onChange` entrega
          // ganho em dB (−12…+12). Aqui vira a régua 0…10 que os LEDs já liam.
          onChange={(bs) => setValores(bs.map((b) => 5 + (b.gain / 12) * 5))}
        />
        {/*
          Um LED por banda, distribuídos na mesma largura do painel da curva.
          Antes a fileira repetia as medidas internas dos faders; sem faders, o
          que resta é a régua de frequência, e ela é contínua — então a fileira
          é só igualmente espaçada, sem fingir alinhamento que não existe mais.
        */}
        <div className="mt-2 flex w-[420px] justify-around">
          {valores.map((v, i) => (
            <VintageLed
              key={BANDAS[i].id}
              color={v > 8.5 ? "orange" : "green"}
              size="lg"
              active={ligado && v > 5.2}
              pulse={ligado && v > 8.5}
              intensity={Math.max(0, Math.min(1, (v - 5) / 5))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
