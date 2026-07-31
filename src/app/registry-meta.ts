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

export const registryItemUrl = (name: string, base = REGISTRY_URL) => `${base}/${name}.json`;

/** Marca aplicada quando não há nada salvo no navegador. */
export const DEFAULT_BRAND = "visant";
