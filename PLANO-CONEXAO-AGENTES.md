# Plano: conectar o `@visant/ui` a qualquer agente com o mínimo de pedágio

Data: 2026-10-20. Pedido do dono: "fazer todos os passos pra diminuir a fricção ao
máximo e deixar na UI da library um componente pra facilitar essa conexão do nosso
registry com qualquer app", com permissão pro PR no índice do shadcn "se estiver 100%".
Licença decidida: **MIT, repo público**.

## O que já existe (não reconstruir)

| Peça | Onde | Faz |
|---|---|---|
| Registry shadcn | `ui.visantlabs.com/r/{name}.json` | instala qualquer peça com `npx shadcn add` |
| MCP do shadcn | `npx shadcn@latest mcp` (oficial) | o agente busca, lê e instala de qualquer registry configurado |
| `mcp init` | `shadcn mcp init --client claude` | escreve o `.mcp.json` do Claude Code |
| Índice oficial | `ui.shadcn.com/r/registries.json` | registry listado dispensa `components.json`: `@visant/x` funciona em qualquer projeto |
| Fichas pra LLM | `/r/{name}.md` + `/llms.txt` | o agente lê a peça em texto |
| MCP do Visant | `api.visantlabs.com/api/mcp` | marca, tokens, guideline |

## Os degraus (do menor pedágio pro maior poder)

### 1. Índice oficial do shadcn (pedágio zero)
Requisitos (ui.shadcn.com/docs/registry/registry-index): open source e público; schema
válido; registry plano; `files` sem `content`. Entrada em `apps/v4/registry/directory.json`:
`{ name, homepage, url, description, logo, author }`; `pnpm validate:registries`; PR em
shadcn-ui/ui. O índice também monitora saúde e instalabilidade.

Estado: schema ✓, plano ✓, sem `content` ✓, público ✓, `@visant` livre ✓.
Falta: **licença e repo público** (abaixo).

### 2. Licença MIT e repo público — sem expor o que é interno
O repo de trabalho (`pedrojaques99/Vintageuiuxlibrary`) tem 93 commits com `bugs/`,
`curadoria/`, planos internos, `keyboard-ui/` (outro projeto) e nomes de cliente em
comentários. Virar ele público expõe o histórico inteiro pra sempre.

Caminho: **um repo público novo, espelho limpo**, gerado por script a cada ship.
- `LICENSE` MIT (Copyright Visant Labs) cobre o código; `ATTRIBUTIONS.md` mantém os
  avisos de terceiros (Arc MIT, kit anatomy MIT, Simple Icons CC0, fotos).
- Mídia (`public/media`, fotos da equipe) fica fora do MIT: "todos os direitos reservados",
  dito no README.
- `scripts/espelho-publico.mjs`: copia só o que é público (registry, vitrine, scripts de
  build, testes, configs), roda uma varredura que reprova nome de cliente e arquivo interno,
  e faz commit no espelho. O repo de trabalho continua privado.
- Antes: tirar nomes de cliente dos comentários das peças (eles já saem em público dentro
  dos `/r/*.json` hoje).

### 3. Componente "Conectar ao seu agente" na vitrine
Um botão no cabeçalho abre um painel com abas por cliente, cada uma com UMA ação:
- **Claude Code**: comando `claude mcp add shadcn -- npx shadcn@latest mcp` + o
  `components.json` com `@visant` (até entrar no índice).
- **Cursor**: deeplink de um clique `cursor://anysphere.cursor-deeplink/mcp/install?...`.
- **VS Code**: deeplink `vscode:mcp/install?...`.
- **Codex** e **outros**: o trecho de config pra colar.
- **Sem MCP**: `llms.txt` e o `npx shadcn add` direto.
Depois do índice, a aba perde o passo do `components.json` sozinha.

### 4. O agente escolhe sozinho: "quando usar" e regra instalável
- **Quando usar / evite quando** em cada peça, no `registry.json` (`description` +
  `categories`) e nas fichas `/r/{name}.md`. É o que o MCP do shadcn devolve na busca e o
  que o agente lê pra escolher.
- **Regra instalável** como item do próprio registry: `npx shadcn add @visant/agent-rules`
  grava `AGENTS.md`, `.cursor/rules/visant-ui.mdc` e a skill do Claude. Ela diz: antes de
  escrever UI, consulte `@visant`; prefira kit inteiro; respeite a marca; um por vez.

### 5. MCP remoto da Visant (só a ferramenta que o shadcn não tem)
`ui.visantlabs.com/mcp` (Vercel, `mcp-handler`), conectado por URL, sem instalar nada:
- `recomendar(projeto)`: lê a descrição e o `package.json` e devolve peças e kits
  ranqueados, com o motivo.
- `buscar(intenção)` com o "quando usar" de cada peça.
Instalar continua sendo do shadcn. Este degrau entra depois do 4, e só se o 4 não bastar.

## Ordem de execução
1. Varrer e limpar nomes de cliente das peças; `LICENSE`; README público. 
2. `espelho-publico.mjs` + criar o repo público + primeiro espelho.
3. Componente Conectar na vitrine (+ teste).
4. "Quando usar" nas 136 peças + `categories` + item `agent-rules`.
5. Validar contra o validador do shadcn; abrir o PR do índice.
6. MCP remoto (degrau 5).
