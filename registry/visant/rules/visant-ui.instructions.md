---
applyTo: "**/*.tsx"
---

# @visant/ui

Este projeto usa a library de componentes da Visant Labs: um registry shadcn em
https://ui.visantlabs.com. Antes de escrever um componente de interface do zero,
procure no registry.

## Como escolher

1. Leia o índice: https://ui.visantlabs.com/llms.txt (uma linha por peça, com
   "quando usar").
2. Abra a ficha da candidata: https://ui.visantlabs.com/r/<nome>.md (o que é,
   quando usar, quando evitar, API e exemplo).
3. Escolha pela situação do usuário, não pelo nome. Peças parecidas existem de
   propósito (ex.: confirm-morph, hold-to-confirm e slide-to-confirm confirmam com
   pesos diferentes); a ficha diz qual cabe.
4. Pra uma tela inteira, prefira um kit montado (veja /kits no site) a juntar peças
   soltas.

## Como instalar

    npx shadcn@latest add @visant/<nome>

Se o projeto ainda não conhece o `@visant`, declare no `components.json`:

    "registries": { "@visant": "https://ui.visantlabs.com/r/{name}.json" }

Com o MCP do shadcn ligado (`npx shadcn@latest mcp`), busque e instale por ele.

## Como usar o que instalou

- As peças leem os tokens de marca do projeto (`--brand`, `--background`,
  `--foreground`, `--r-control`, `--dur-fast`...). Não escreva cor crua; ajuste o
  tema.
- `--brand` é cor de borda, fundo e traço, nunca de texto (contraste).
- O código é copiado pro projeto: pode editar. Mantenha foco visível e teclado.
- Texto de interface curto e no idioma do produto; nada de rótulo explicando o
  que a peça já mostra.
