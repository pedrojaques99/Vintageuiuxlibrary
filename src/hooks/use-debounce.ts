/**
 * Ponte da vitrine para o item do registry.
 *
 * Os arquivos de `registry/` importam pelos aliases que o consumidor terá DEPOIS
 * do `shadcn add` (`@/hooks/use-debounce`). Aqui esse alias aponta para `src/`,
 * então sem esta ponte o `search-field` e o `command-search` ficariam fora do
 * `tsc --noEmit` — e o registry publicaria código que ninguém checou.
 *
 * É reexport, não cópia: a versão canônica continua sendo uma só.
 */
export { useDebounce } from "../../registry/visant/hooks/use-debounce";
