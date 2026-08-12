// Espelho do item do registry, para o app de demo importar por "@/lib/sfx-bus"
// exatamente como um projeto que rodou `npx shadcn add @visant/sfx-bus`.
// Sem isso, o demo importaria por caminho relativo e provaria um caminho que
// nenhum consumidor usa.
export * from "../../registry/visant/lib/sfx-bus";
