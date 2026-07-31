/**
 * Tipos para `@visant/brand-tokens`.
 *
 * O motor é JavaScript puro e não publica tipos — declarar aqui é o preço de
 * consumi-lo com `strict` ligado. Só o que a vitrine usa está descrito; o dia em
 * que o pacote ganhar os seus próprios, este arquivo sai.
 *
 * A forma da marca é a mesma que a API do Visant devolve em
 * `GET /api/brand-guidelines`: cor com papel, tipografia com papel e tamanho.
 */

declare module "@visant/brand-tokens/registry-item" {
  export interface BrandParaCompilar {
    id?: string;
    name?: string;
    colors: { hex: string; role?: string | null; name?: string | null }[];
    typography: { family: string; role?: string | null; size?: number }[];
    currentVersion?: number | null;
    extraction?: { completeness?: number | null } | null;
  }

  export interface ItemDeTema {
    name: string;
    type: "registry:theme";
    title: string;
    description: string;
    cssVars: {
      theme?: Record<string, string>;
      light?: Record<string, string>;
      dark?: Record<string, string>;
    };
    css?: Record<string, Record<string, string>>;
    meta?: Record<string, unknown>;
  }

  /** Lança `BrandTokenError` quando a guideline não tem cor ou tipografia suficiente. */
  export function buildBrandThemeItem(brand: BrandParaCompilar): ItemDeTema;
}
