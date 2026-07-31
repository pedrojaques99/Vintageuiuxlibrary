import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `cn` da vitrine, ensinado sobre a escala tipográfica da casa.
 *
 * O `tailwind-merge` resolve conflito por grupo de classe, e só conhece os nomes
 * que vêm de fábrica. Diante de `text-apoio` — um degrau de TAMANHO que criamos
 * — ele concluiu "isso é cor de texto" e descartou, por conflito, a cor de
 * verdade declarada dentro do componente.
 *
 * O estrago era invisível no código e gritante na tela: o chip de filtro ativo
 * ficou com o texto exatamente da cor do próprio fundo. "Todos 47" estava lá, com
 * 79px de largura, e ninguém conseguia ler. Aqui os seis degraus são declarados
 * pelo que são.
 *
 * Só a vitrine usa esta versão — o `cn` que vai para o projeto de quem instala é
 * o `utils` do shadcn, intocado.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "rotulo", "apoio", "corpo", "destaque", "titulo"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
