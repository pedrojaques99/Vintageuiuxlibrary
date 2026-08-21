/**
 * O que a vitrine sabe sobre o registry — em um lugar só.
 *
 * O comando de instalação aparecia escrito à mão em três arquivos (card do
 * catálogo, ficha de foco, studio de marca). Três cópias da mesma string é o
 * jeito clássico de o namespace mudar em dois lugares e ninguém perceber no
 * terceiro. Aqui existe um gerador; quem precisa, chama.
 *
 * A URL pública vem do próprio item `@visant/brand-theme` — o runtime de marca
 * já tinha essa constante, e duplicá-la aqui recriaria o mesmo problema.
 */

import { VISANT_REGISTRY_URL } from "@/lib/brand-theme";

/** Namespace configurado no `components.json` de quem consome. */
export const REGISTRY_NAMESPACE = "@visant";

/**
 * Base usada em runtime pelo app. Relativa de propósito: o mesmo caminho serve
 * o `vite dev`, os previews da Vercel e a produção, sem variável de ambiente.
 */
export const REGISTRY_URL = "/r";

/** A mesma base, absoluta — é o que se escreve num README ou se mostra na tela. */
export const REGISTRY_PUBLIC_URL = VISANT_REGISTRY_URL;

/** Sem esquema, para exibir: `visant-ui.vercel.app/r`. */
export const REGISTRY_PUBLIC_LABEL = REGISTRY_PUBLIC_URL.replace(/^https?:\/\//, "");

export const installCommand = (name: string) =>
  `npx shadcn@latest add ${REGISTRY_NAMESPACE}/${name}`;

/**
 * O mesmo `add`, nos quatro jeitos de executar um pacote sem instalar.
 *
 * Mostrar só o `npx` parece inofensivo e não é: quem trabalha em pnpm copia o
 * `npx`, o npm resolve o `shadcn` no registry dele e o comando roda — mas o
 * `add` seguinte grava dependência no `package.json` de um projeto cujo
 * lockfile é de outro gerenciador. O erro aparece dias depois, no CI.
 *
 * `yarn dlx` é o Yarn moderno (Berry). Yarn 1 não tem `dlx` e cai no `npx`
 * mesmo, que é o que a maioria dos projetos em Yarn 1 já faz.
 */
export const GERENCIADORES = ["npm", "pnpm", "yarn", "bun"] as const;

export type Gerenciador = (typeof GERENCIADORES)[number];

const EXECUTOR: Record<Gerenciador, string> = {
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
  bun: "bunx --bun",
};

export const installCommandFor = (name: string, gerenciador: Gerenciador) =>
  `${EXECUTOR[gerenciador]} shadcn@latest add ${REGISTRY_NAMESPACE}/${name}`;

/**
 * O comando de um kit — as N peças em um `add` só.
 *
 * O `shadcn add` aceita vários nomes de uma vez, e é por isso que a sala do kit
 * pode prometer "um comando" sem que exista um item `@visant/mesa-de-trabalho`
 * no registry. A alternativa era publicar um item guarda-chuva agora e mostrar
 * um comando mais curto — mas ele instalaria as peças SEM a composição, que é
 * justamente o que o kit vende. Comando comprido e verdadeiro é melhor que
 * comando curto que entrega menos do que a tela mostrou.
 *
 * Quando a composição virar arquivo publicável (ela hoje importa o banco de
 * mídia da vitrine, que não vai para o consumidor), isto colapsa num nome só.
 */
export const kitInstallCommand = (names: string[]) =>
  `npx shadcn@latest add ${names.map((n) => `${REGISTRY_NAMESPACE}/${n}`).join(" ")}`;

export const registryItemUrl = (name: string, base = REGISTRY_URL) => `${base}/${name}.json`;

/** Marca aplicada quando não há nada salvo no navegador. */
export const DEFAULT_BRAND = "visant";
