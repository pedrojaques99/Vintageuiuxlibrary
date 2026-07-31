# Como colher um componente

O método completo vive na skill **`visant-registry`**, não aqui.

Isso é deliberado: colher é um workflow que precisa aparecer **no momento em que
alguém está prestes a copiar código entre projetos** — e uma skill dispara
sozinha nessa hora, enquanto um documento só ajuda quem lembra de abrir. Duas
cópias da mesma regra seria exatamente a duplicata que este registry existe para
matar.

```
C:\Users\Usuario\.claude\skills\visant-registry\SKILL.md
```

Ela cobre as quatro operações:

1. **Consumir** — `"registries": { "@visant": "https://visant-ui.vercel.app/r/{name}.json" }`
2. **Gerar** o tema de uma marca a partir da API de brand guidelines
3. **Colher** um componente e publicar como item
4. **A regra de entrada** que impede o registry virar lixão

## O resumo de bolso

> **Componente nunca tem cor própria.** Ele consome `var(--brand)`,
> `var(--muted)`, `var(--ease-out)`.

O teste que diz se a colheita funcionou: instalar um tema, depois outro, e os
componentes ficarem **byte a byte idênticos** enquanto as vars mudam.

E o teste de entrada, antes de escrever qualquer linha:

1. Já foi usado em dois lugares?
2. Vive sem cor própria?
3. Tem estado vazio, foco e caminho sem movimento?
4. Recebe o dado por prop, sem `fetch` dentro?

Falhou em uma, não colhe.

---

Plano e inventário do que falta colher: [`VISANT-REGISTRY-PLANO.md`](./VISANT-REGISTRY-PLANO.md).
