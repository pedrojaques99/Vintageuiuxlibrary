# Plano — a vitrine no nível ReactBits Pro

> Referência: `pro.reactbits.dev` / `reactbits.dev/components/*`, inspecionado ao vivo em 21/08/2026.
> Alvo: `ui.visantlabs.com`, 81 itens no registry.

> **Status em 21/08/2026** — Ondas 1, 2, 3 e 4 entregues (menos as tools de MCP,
> que moram noutro repo). 206 testes verdes, duas rodadas seguidas. O que mudou
> de rota durante a execução está registrado em §8.

---

## 1. O que eles fazem, o que nós já fazemos

Anatomia da página de item do ReactBits, na ordem em que aparece:

| Bloco | ReactBits | @visant/ui hoje | Veredito |
|---|---|---|---|
| Título + tabs `Preview \| Code` | sim | sim (`Demo / Código / Props`) | **empatado** |
| Palco vivo | sim, largura fixa | sim, **em iframe real com preset 360/768/full** | **ganhamos** |
| `Customize` — knobs ao vivo | sim | **não existe** | **buraco nº 1** |
| `Usage` — snippet que segue os knobs | sim | não existe | **buraco nº 2** |
| Variações / presets | parcial (só knobs) | não existe | **buraco nº 3** |
| Tabela de props | sim, escrita à mão | sim, **gerada do TS** | **ganhamos** (mas ver §3.1) |
| Dependências | lista simples | `dep-badges` com resumo | **ganhamos** |
| Install `CLI \| Manual` × pnpm/npm/yarn/bun | sim | comando único | buraco menor |
| Código com realce de sintaxe | sim, JS/TS × CSS/Tailwind | `<pre>` cru, arquivo real do registry | buraco menor |
| Sidebar fixa com o acervo inteiro + `NEW` | sim | navegação fatiada por família | **buraco nº 4** |
| Busca `⌘K` | sim | não existe | **buraco nº 5** |
| `Copy for AI` (prompt / código configurado / fonte / comando) | sim | não existe | buraco |
| `llms.txt` + MCP server | sim | não existe | buraco |
| Salvos (❤️) | sim | não existe | opcional |

Duas coisas que já são melhores que as deles e não podem regredir em nenhuma onda: o
**iframe de viewport real** (media query só diz a verdade num documento com aquela largura)
e a **tabela de props gerada do TypeScript** (doc escrita à mão envelhece na primeira semana).

---

## 2. Decisões travadas

1. **Controles**: auto-derivados do `props.generated.json`, com override opcional por item.
2. **Navegação**: sidebar fixa + `⌘K`. As fatias de `/catalogo` viram âncoras, não portas.
3. **Idioma**: PT-BR, como está.
4. **Camada de agente**: `Copy for AI` + `llms.txt` / `/r/<item>.md` + tools no MCP Visant.

Três regras da casa que valem aqui e não se negociam:

- **A página que se explica.** O painel `Customize` e a sidebar **não** podem empurrar o
  palco pra baixo da dobra. O primeiro pixel abaixo do título é a peça rodando — knobs vêm
  depois dela, nunca antes.
- **Marca nunca em texto.** Item ativo na sidebar e badge `NOVO` usam borda e fundo
  `var(--brand)`, nunca `color`.
- **CSS do registry é gerado.** Nada do que a aba Código mostra pode ser espelhado à mão.

---

## 3. Arquitetura: uma fonte, três consumidores

```
registry/visant/ui/*.tsx  ──►  scripts/props-extract.mjs  ──►  props.generated.json (v2)
                                          │
                                          ├──►  scripts/controls.mjs ──┐
src/app/controls.overrides.json ──────────────────────────────────────┤
                                                                       ▼
                                                            controls.generated.json
                                                                       │
                        ┌──────────────────────────────┬───────────────┴────────────┐
                        ▼                              ▼                            ▼
                  <Customize>                    <Usage> snippet              llms.txt / MCP
                (painel de knobs)          (código que segue os knobs)     (mesma spec, em texto)
```

O ponto: **um único descritor de controle alimenta o painel humano, o snippet e o agente.**
Se as três coisas forem escritas separadas, elas divergem — e doc que mente é pior que doc
que falta.

### 3.1 O conserto que destrava tudo

`scripts/props-extract.mjs` hoje colapsa `"a" | "b" | "c"` em `tipo: "enum"` e joga os
valores fora. São **48 props** nessa situação. Isso quebra duas coisas de uma vez: a tabela
de props atual mostra a palavra inútil `enum`, e não dá pra montar um `<select>`.

Saída v2 por prop:

```json
{ "nome": "finish", "tipo": "enum", "valores": ["grayscale", "mono", "none"],
  "padrao": "grayscale", "obrigatoria": false, "descricao": "..." }
```

Para `number`, tentar `@min` / `@max` / `@step` no JSDoc; sem eles, faixa heurística a
partir do padrão.

### 3.2 Cobertura do auto

| tipo | props | vira controle |
|---|---|---|
| `string` | 136 | campo de texto |
| `number` | 127 | slider |
| `boolean` | 97 | toggle |
| `enum` | 48 | select |
| **subtotal** | **408 / 612 (67%)** | **de graça** |
| `any`, funções, genéricos | 204 | ignorados no painel |

### 3.3 O override

`src/app/controls.overrides.json` — só o que o auto errou:

```json
{
  "logo-wall": {
    "esconder": ["className", "onSelect"],
    "ajustes": { "gap": { "min": 0, "max": 64, "step": 4 } },
    "presets": [
      { "nome": "parede fria", "props": { "finish": "grayscale", "gap": 24 } },
      { "nome": "mono escuro", "props": { "finish": "mono", "gap": 8 } }
    ]
  }
}
```

`presets` é a resposta ao "ver as variações": chips acima dos knobs que aplicam um conjunto
de uma vez. Barato (JSON), e é o que faz a peça parecer valorizada.

### 3.4 O contrato das demos — o custo real escondido

Hoje as ~40 demos em `src/app/demos/*.tsx` são componentes fechados: não aceitam props de
fora. Sem isso, knob não move nada. Contrato mínimo, uma linha por demo:

```tsx
export const alvo = "LogoWall";              // qual componente os knobs controlam
export default function LogoWallDemo({ props }: DemoProps) {
  return <LogoWall {...FIXTURE} {...props} />;
}
```

Demo sem `alvo` continua funcionando — só não ganha painel. **Isso permite entregar o
Customize em fatias**, começando pelas 15-20 peças que aparecem na home, sem travar as
outras 60.

---

## 4. Ondas, na ordem de custo/benefício

### Onda 1 — o palco que se mexe  ★ maior salto percebido

| # | tarefa | onde |
|---|---|---|
| 1.1 | `props-extract` v2: valores de enum + faixa numérica | `scripts/props-extract.mjs` |
| 1.2 | `scripts/controls.mjs` → `controls.generated.json`, lendo o override | novo |
| 1.3 | Contrato `alvo` + `props` nas demos (fatiado: home primeiro) | `src/app/demos/*` |
| 1.4 | `<Customize>` — chips de preset, toggles, sliders, selects | novo `src/app/Customize.tsx` |
| 1.5 | Estado dos knobs atravessa o iframe (`postMessage`, mesmo canal do `MSG_ALTURA`) | `stage.tsx`, `Solo.tsx` |
| 1.6 | `<Usage>` — snippet gerado do estado, só props ≠ padrão | novo |
| 1.7 | Tabela de props mostra os valores do enum (cai de graça de 1.1) | `ItemDocs.tsx` |

**Pronto quando**: mexer um slider muda a peça no iframe e a linha no snippet, sem recarregar.

### Onda 2 — a navegação que mostra o tamanho do acervo

| # | tarefa |
|---|---|
| 2.1 | Sidebar fixa: famílias, contagem por família, item ativo, `prev/next` mantidos |
| 2.2 | Badge `NOVO` — campo `desde` no `registry.json`, item com menos de 30 dias |
| 2.3 | `⌘K` / `/` com `cmdk` — **já está nas dependências, nada novo entra** |
| 2.4 | `/catalogo` vira índice com âncora por família; sidebar é a porta principal |

**Pronto quando**: dá pra ver que a library tem 81 itens sem clicar em nada.

### Onda 3 — install e código de documentação de verdade

| # | tarefa |
|---|---|
| 3.1 | `Install`: `CLI \| Manual` × `pnpm / npm / yarn / bun` |
| 3.2 | Realce de sintaxe na aba Código |
| 3.3 | Seção `Dependências` explícita abaixo de Props (hoje só badge no topo) |

**Decisão pendente em 3.2** — o código é buscado do registry em runtime (é o que garante que
não mente). Duas saídas:

- `prism-react-renderer` (~30 kB, runtime) — pragmático, recomendado;
- `shiki` no build gerando HTML pré-realçado — mais bonito, mas exige um segundo artefato ao
  lado do registry e um caminho pra quando os dois divergirem. Só vale se a aba Código virar
  vitrine de verdade.

### Onda 4 — a camada de agente

| # | tarefa |
|---|---|
| 4.1 | `Copy for AI ▾`: copiar prompt / copiar código configurado (com os knobs) / copiar fonte / copiar comando |
| 4.2 | `scripts/llms.mjs` → `dist/llms.txt` + `dist/r/<item>.md` (props + deps + install + usage) |
| 4.3 | Tools no MCP Visant: `ui-search`, `ui-get`, `ui-install-command` |

4.1 é quase de graça: tudo já está em memória na página. 4.2 é um script. 4.3 é o único com
custo médio, e reaproveita o servidor MCP que já existe.

### Onda 5 — polimento (opcional)

Salvos (❤️, `localStorage`), contagem de uso, roadmap público.

---

## 5. Scripts novos no `package.json`

```
"build:controls": "node scripts/controls.mjs",
"build:llms":     "node scripts/llms.mjs",
"check:controls": "node scripts/controls-check.mjs"   // demo com alvo mas sem props espalhadas
```

`build` passa a encadear: `registry-css → props-extract → controls → vite build → prerender → llms`.

---

## 6. Riscos

| risco | mitigação |
|---|---|
| Knob quebra a demo (valor fora de faixa, prop obrigatória zerada) | override esconde a prop; `controls-check` roda no `verify` |
| Painel empurra o palco pra baixo da dobra | `Customize` colapsado por padrão abaixo de 900px; palco sempre primeiro |
| 40 demos pra adaptar vira trabalho eterno | contrato opcional — demo sem `alvo` segue viva sem painel |
| Sidebar com 81 itens pesa o primeiro paint | lista é dado estático do `registry.json`, sem import de componente |
| Divergência entre snippet e código real | ambos saem do mesmo `controls.generated.json` e do JSON do registry |

---

## 7. Critério de pronto (a pergunta que a página tem que responder)

1. **Isso existe?** → sidebar, sem clique.
2. **Como é?** → palco vivo, primeiro pixel abaixo do título.
3. **Serve pro meu caso?** → knobs + presets + os três viewports.
4. **Como escrevo?** → snippet que reflete o que a pessoa acabou de configurar.
5. **O que aceita?** → tabela de props gerada, com os valores do enum.
6. **Como instalo?** → CLI ou manual, no gerenciador dela.
7. **Como meu agente pega isso?** → `Copy for AI`, `llms.txt`, MCP.


---

## 8. O que mudou de rota durante a execução

Três decisões do plano não sobreviveram ao contato com a tela, e as substitutas
estão explicadas no código:

**A grade uniforme substituiu o mosaico** (não estava no plano). O card de
altura livre — cada peça no tamanho natural — produzia uma página em que nada é
comparável e que precisa de `gridRow: span` medido por card pra fechar. Agora
toda peça recebe a mesma moldura de 16/10 (`PalcoFixo`) e a grade é um `grid` de
três colunas, sem medição. Saíram `useRowSpan`, `alturaEmDegraus` e o `RowTile`.

**O índice voltou a listar o acervo inteiro** — em foto, com a peça viva
montando no hover. As capas de categoria resolviam o custo das 81 demos
escondendo a library atrás de um clique. A foto (`build:shots`, mesma rota
`?solo=1` da ficha) resolve o custo sem esconder nada, e o hover monta UMA peça
por vez, que é o que a página aguenta — e é interativo, o que vídeo gravado não
seria.

**O selo `novo` não é uma data, é uma posição.** A regra óbvia (últimos 30 dias)
marcou 65 das 79 peças, porque o registry inteiro é recente. Selo em 80% da
grade não sinaliza nada. Agora são as N mais recentes, com N = um sexto do
acervo, e um corte de validade pra library parada não anunciar novidade velha.

### Entregue

| # | o quê | onde |
|---|---|---|
| 1.1 | `props-extract` v2 — 49 uniões com valores, tags `@min/@max/@step` | `scripts/props-extract.mjs` |
| 1.2 | `controls.mjs` — 362 knobs derivados em 72 itens | `scripts/controls.mjs` |
| — | `demo-props.mjs` — o que a demo põe no palco, pro painel não mentir | `scripts/demo-props.mjs` |
| 1.3 | contrato `knobs` + `{...props}` em 36 demos, por codemod | `scripts/demos-knobs.mjs` |
| 1.4 | painel `Customize` com presets e knobs secundários | `src/app/controls.tsx` |
| 1.5 | knobs atravessam o iframe por `postMessage` (query no 1º paint) | `Solo.tsx`, `ComponentFocus.tsx` |
| 1.6 | snippet de uso que reproduz o palco | `controls.tsx` |
| 1.7 | tabela de props mostra os valores da união | `ItemDocs.tsx` |
| 2.1 | sidebar do site + sidebar da ficha | `sidebar.tsx`, `ComponentFocus.tsx` |
| 2.2 | selo `novo` derivado do git | `scripts/novidades.mjs`, `novidades.ts` |
| 2.3 | `⌘K` sobre o `haystack` da casa | `busca.tsx` |
| 3.1 | install `CLI \| manual` × pnpm/npm/yarn/bun | `instalar.tsx` |
| 4.1 | `Copiar pra IA`: prompt / configurado / fonte / comando | `copiar-pra-ia.tsx` |
| 4.2 | `llms.txt` + `/r/<item>.md` (81 fichas) | `scripts/llms.mjs` |
| 3.2 | realce de sintaxe, com paleta que segue o fundo real e Prism sob demanda | `codigo.tsx`, `codigo-realce.tsx` |
| — | **64 presets em 21 itens** — as "variações" | `controls.overrides.json` |
| — | `controls-check` — portão que confere preset × TypeScript | `scripts/controls-check.mjs` |

### O portão dos controles

Preset é o único pedaço desta documentação escrito à mão, e o modo de falha dele
é mudo: o chip aparece, a pessoa clica, nada acontece. `npm run check:controls`
confere cada preset contra os controles derivados (prop existe? valor está na
união? cabe na faixa? é booleano?) e, do outro lado, que todo item que declara
`knobs` tenha a demo espalhando `props`.

Ele achou dois defeitos no dia em que entrou:

- `vintage-soundboard-pad` declarava `knobs` e a demo que o catálogo de fato
  monta (`PadDemo`, local) não espalhava nada — painel morto em produção;
- um preset com `gap` fora da faixa do slider.

Ele tem duas regras. A primeira é de coerência (prop existe, valor cabe). A
segunda é de desenho: **preset que muda uma prop só é erro** — se aquela prop já
está na tela como trilho segmentado, o chip é um segundo botão pro mesmo clique
dois centímetros acima. A primeira leva tinha seis assim. A exceção é a união
grande, que vira `<select>`: ali o chip é atalho de verdade.

Roda no `build` e no `ship`.

### O corte do bundle

O chunk principal foi de **963 kB para 630 kB** (300 → 189 gzip).

O que destravou foi a própria grade: enquanto o índice montava demo viva, as 44
demos precisavam estar no chunk inicial e fatiar só somaria requisição. Com a
grade em foto, quem abre a home não monta demo nenhuma — e mesmo assim baixava
todas. Agora cada uma é um `React.lazy`, com `<Suspense>` nos três lugares que
renderizam `item.demo` (ladrilho, ficha, `?solo=1`).

No ladrilho a espera é a **foto**, não um esqueleto: a captura já está na tela e
é a mesma peça, então a troca lê como a peça ganhando vida em vez de a página
recarregando.

O Prism do realce ficou fora do caminho crítico pelo mesmo motivo (87 kB sob
demanda). O que sobra no chunk principal é a vitrine e os ~28 componentes do
registry que as demos inline do `catalog.tsx` usam — cortá-lo mais exige mover
essas demos inline pra arquivos.

### Falta

- **4.3 tools de MCP** (`ui-search`, `ui-get`, `ui-install-command`) — moram no
  servidor MCP da Visant, que é outro repo.
- **Salvos (❤️)** — Onda 5, opcional.
- **A ficha ainda é um diálogo modal**, e agora tem sidebar própria por dentro,
  ao lado da sidebar do site que fica atrás do overlay. Funciona e é coerente,
  mas é a mesma informação desenhada duas vezes. Virar rota de verdade
  (`/c/<item>` como página, com a sidebar do site) é o desenho do ReactBits —
  custa perder `Esc` e `←`/`→` como estão hoje. Decisão em aberto.
