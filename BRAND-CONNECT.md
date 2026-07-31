# Brand Connect — vault do Visant Labs → design da library

**Estado: no ar em dev, verificado no browser (30/07/2026).**
21 marcas do vault viram tema; trocar a marca no seletor repinta catálogo,
studio e bancada vintage sem recarregar.

---

## O caminho do dado

```
api.visantlabs.com/api/brand-guidelines        (24 guidelines, chave server-side)
        │  scripts/brands-sync.mjs   ← normaliza papéis, escolhe cor de identidade
        ▼
@visant/brand-tokens (visantlabs-os)           Leonardo: contraste AA por construção
        │  compileBrandTokens + craft.json
        ▼
public/r/theme-<slug>.json   ·   public/r/brands.json
        │                              │
        │  npx shadcn add               │  fetch no browser
        ▼                              ▼
globals.css do cliente          <BrandThemeProvider> + <BrandSelector>
```

Os dois caminhos consomem **o mesmo JSON**. Quem tem um cliente só instala o
tema e esquece; quem precisa trocar de marca com o app no ar usa o runtime.

## Rodar

```bash
pnpm sync:brands        # lê o vault e regenera os 21 temas + o índice
pnpm build:registry     # empacota os itens do registry
pnpm dev                # http://localhost:5173  →  Catálogo · Marca · Rig vintage
```

`VISANT_LABS_API_KEY` mora no `.env.local` (escopo read, mesma chave que o
visant-board usa no brand-sync). Ela **nunca** vai para o browser: o sync roda no
build, o cliente só lê JSON público.

## Decisões que não são óbvias

**O índice existe para o seletor não pagar 21 requisições.** `brands.json` traz
nome, logo, paleta crua, par tipográfico, vault% e uma amostra de 8 tokens por
modo. O tema completo só desce quando alguém escolhe (ou espia) a marca.

**Papéis compostos são expandidos.** A guideline da Kastrup® publica
`background/text` e `accent/cta`. O motor casa papel por igualdade exata, então
`background/text` não resolvia o slot `background` e o fallback pintava o tema
claro com o preto da marca — sem erro nenhum no build. O sync quebra cada papel
em segmentos antes de compilar.

**Empate de papel decide por saturação (ou por claridade, se for fundo).**
Kastrup® tem duas cores no papel `accent`: um creme e o vermelho da marca. Sem
desempate, `--brand` saía creme. Regra: papel de identidade → mais saturada;
papel de fundo → mais clara.

**Duas formas de tipografia convivem na API.** A atual (`family/role/size`) e uma
legada (`fontFamily/name/fontSize`, em Padoo® e Build + Partners®). Ler só a
atual descartava a tipografia dessas marcas e o motor recusava a marca inteira.

**A folha do runtime usa `:root:root`.** Empatar especificidade com o
`globals.css` do projeto deixaria a decisão para a ordem das folhas — e o HMR
reinjeta a folha do projeto depois. A marca aplicava e desaplicava ao salvar um
arquivo qualquer.

**Prévia ao percorrer, com desfazer.** Mouse ou teclado sobre uma linha já pinta
a interface; fechar sem escolher volta ao estado anterior. Escolher marca é
decisão visual — confirmar no escuro é o pior dos dois mundos.

## O que ficou de fora, e por quê

| Item | Situação |
|---|---|
| **3 marcas sem tema** | BOXY Std e as duas "Construir Aí Group" publicam **zero cores**. A guideline é que está vazia, não o build — aparecem no relatório do sync. |
| **Fontes fora do Google** | Termina, Clash Grotesk, Helvetica Now são licenciadas. O `<link>` 404 e a pilha de fallback do token assume: muda o desenho da letra, não a hierarquia. |
| **`@visant/data-table`** | O item importa `next-auth/react` e `next/navigation` mas declara só `@tanstack/react-table`. **Só monta dentro de um app Next autenticado** — por isso ficou como card de spec na vitrine. Desacoplar (`isAdmin` por prop, estado de URL por callback) é trabalho separado. |
| **`fetch-brand.js` do motor** | Aponta para `/v1/brand-guidelines/:id`, que responde **404**. O caminho vivo é `/api/brand-guidelines/:id`. O sync daqui não usa essa função (busca pela lista), mas quem chamar `brand-theme-item.mjs --brand <id>` bate no 404. Correção mora no `visantlabs-os`. |
| **Regeneração automática** | Hoje é manual (`pnpm sync:brands`). Um cron da Vercel chamando o sync + redeploy fecharia o ciclo. |

## A vitrine

A home era a bancada de áudio vintage — 13 dos 45 itens. Quem chegava concluía
que a library era um kit de knobs. Agora:

- **Catálogo** — os 45 itens com busca (nome, uso, tag), filtro por família e
  demo viva importada do mesmo arquivo que o `shadcn add` entrega.
- **Marca** — tokens lidos com `getComputedStyle` (o que o browser resolveu, não
  o que o JSON prometeu), par tipográfico e comandos de instalação.
- **Rig vintage** — a bancada, agora como uma aba.
