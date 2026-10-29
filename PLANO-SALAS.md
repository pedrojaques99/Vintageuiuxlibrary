# Plano — salas nível Apple: uma moldura só, começo/meio/fim

Queixa: *"ui library tá confusa e com caixa dentro de caixa — não tá nível Apple"*.
Pedido seguinte: *cada kit mais completo, com começo, meio e fim, quase um
template, copiável inteiro ou peça por peça.*

## O defeito, medido

Cinco salas abertas em 1440px (`/kit/*`). O que se conta antes de chegar na peça:

| Nível | Quem desenha | Arquivo |
|---|---|---|
| 1 | `.shell` (respiro lateral) | `tailwind.css:189` |
| 2 | card da sala: `border + rounded + bg-card` | `KitRoom.tsx:207` |
| 3 | palco: `border-t` + padding próprio | `KitRoom.tsx:293` |
| 4 | a composição se embrulha de novo em `border + rounded + bg-card` | `mesa-de-trabalho.tsx:98`, `pagina-que-vende.tsx:69`, `motion-e-estado.tsx:47`, `marca-viva.tsx:54` |
| 5 | painéis internos com borda | `motion-e-estado.tsx:78`, `marca-viva.tsx:131,142,172` |
| 6 | tiles dentro dos painéis | idem |

**Quatro a seis molduras antes da peça.** O olho conta borda, não componente — e
é literalmente o defeito que o próprio `Gallery.tsx:190-196` documenta ter
consertado no catálogo e que as salas reintroduziram.

Somam-se:

- rótulo de canto (`generating-tile`, `status-ticker`, `use-media-query`) em cada
  painel: informação de catálogo colada numa peça que devia parecer produto;
- setas de navegação duplicadas — na barra fixa e no cabeçalho da sala;
- linha de dependências crua no cabeçalho (`lucide 3 motion 2 cva 1 dnd-kit 1…`),
  nove símbolos antes da promessa;
- composição sem fim: a mesa de trabalho termina em ~200px de vazio dentro do
  kanban; a sala acaba sem dizer o que se leva.

## A mudança de conceito (mata metade do trabalho de pixel)

**A sala não é um card. A sala é uma página.**

1. **Uma moldura só.** A sala vira faixa sangrada até a borda da viewport, com a
   superfície do tema pintada nela. Some o card externo e some o palco com
   `border-t`. Profundidade passa a ser **degrau de superfície + espaço**, nunca
   borda em todo nível — que é como a Apple agrupa.
2. **Contrato da composição:** nenhuma composição se embrulha. Ela recebe a
   superfície da sala e desenha o conteúdo. Borda só onde a peça É uma superfície
   de app distinta, e uma vez.
3. **Começo, meio e fim** em cada sala:
   - *começo* — abertura curta: em que tela do produto isto acontece;
   - *meio* — a coisa funcionando, com estado real (cheio, vazio, carregando, erro);
   - *fim* — o que se leva: comando do kit inteiro + saída para a peça solta.
4. **Copiável em dois níveis.** O bloco carrega o nome da peça como **botão de
   copiar aquele `add`**. O rótulo de canto vira função em vez de legenda.

## Execução

**Onda 1 (raiz, sequencial — feita antes de qualquer folha)**
- `src/app/kits/sala.tsx` — primitivas de sala: `Abertura`, `Bloco`, `Painel`,
  `PecaTag`, `Fecho`. Chrome de vitrine, nível app, **não** componente de
  registry (não mexo no design system sem autorização).
- `src/app/KitRoom.tsx` — faixa sangrada, uma moldura, setas sem duplicata,
  cabeçalho enxuto.

**Onda 2 (5 agentes em paralelo, um por sala)**
Cada um reescreve o interior da sua composição sobre as primitivas, com as skills
da casa rodadas (`visant-frontend`, `visant-motion`, `visant-copy`, `visant-refine`
quando houver gráfico/medidor). Arquivos disjuntos — sem conflito.

| Agente | Arquivo |
|---|---|
| mesa | `src/app/kits/mesa-de-trabalho.tsx` |
| landing | `src/app/kits/pagina-que-vende.tsx` |
| motion | `src/app/kits/motion-e-estado.tsx` |
| rig | `src/app/VintageRig.tsx` |
| marca | `src/app/kits/marca-viva.tsx` |

**Onda 3 (verificação, minha)**
`tsc --noEmit`, as 5 salas abertas em 1440 e 390, estouro horizontal medido no
documento, `killer-scan --report AUDIT.md`, relatório com nota.

## Regra dura para os agentes

- Não criar nem editar componente do registry. Compor o que existe.
- Nada de `hover:scale`, `transition-all`, `backdrop-blur` fora de dialog,
  `duration-300+` em interativo, hex cru, `hover:bg-accent`, `border-accent`.
- Toda peça listada no kit precisa aparecer na sala ou estar em `ausentes` com
  motivo (`kits.tsx`).
- Nada reimplementado: o componente vem do mesmo arquivo que o `shadcn add` entrega.
