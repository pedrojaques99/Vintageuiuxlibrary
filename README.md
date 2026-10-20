# @visant/ui

The component library of [Visant Labs](https://visantlabs.com): ~140 React components,
blocks and kits distributed as a [shadcn](https://ui.shadcn.com) registry. Every piece
reads your brand tokens, so it shows up in your colors, type, radius and motion.

**Browse:** [ui.visantlabs.com](https://ui.visantlabs.com)

## Install a component

```bash
npx shadcn@latest add @visant/slide-to-confirm
```

If your project doesn't know the `@visant` namespace yet, add it to `components.json`:

```json
{
  "registries": {
    "@visant": "https://ui.visantlabs.com/r/{name}.json"
  }
}
```

Or install by URL, no config: `npx shadcn@latest add https://ui.visantlabs.com/r/slide-to-confirm.json`

## Use it from your AI agent

The official shadcn MCP server reads this registry, so your agent can search, pick and
install pieces:

```bash
# Claude Code
claude mcp add shadcn -- npx shadcn@latest mcp
```

Cursor, VS Code and Codex: one-click setup at
[ui.visantlabs.com](https://ui.visantlabs.com) (button "Conectar ao seu agente").
Plain-text docs for LLMs: [`/llms.txt`](https://ui.visantlabs.com/llms.txt) and
`/r/<name>.md` per piece.

## Develop

```bash
pnpm install
pnpm dev          # vitrine at http://localhost:5173
pnpm build        # registry css, docs, vite build, prerender, llms.txt
pnpm test         # Playwright
```

## License

Code: [MIT](LICENSE). Media in `public/media` and `public/shots`: © Visant Labs, demo
use only. Third-party notices: [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
