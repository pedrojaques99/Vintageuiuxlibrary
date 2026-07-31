// Espelho do item do registry, para o app de demo importar por "@/lib/brand-theme"
// exatamente como um projeto que rodou `npx shadcn add @visant/brand-theme`.
// Sem isso, o demo importaria por caminho relativo e provaria um caminho que
// nenhum consumidor usa.
export * from "../../registry/visant/lib/brand-theme";
