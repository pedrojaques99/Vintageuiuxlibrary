/**
 * Ponte da vitrine para o item do registry — ver `src/hooks/use-debounce.ts`.
 *
 * O `filter-bar` importa `@/components/ui/chip`, que é onde o `shadcn add` deposita
 * o item na casa de quem instala. Reexport, não cópia.
 */
export { Chip, type ChipProps } from "../../../registry/visant/ui/chip";
