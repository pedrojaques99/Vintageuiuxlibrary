/**
 * O catálogo @visant/ui como servidor MCP remoto: ui.visantlabs.com/mcp
 *
 * O MCP oficial do shadcn (`npx shadcn mcp`) já busca e instala de qualquer
 * registry, mas pede terminal e `components.json`. Apps web (Claude.ai,
 * ChatGPT e afins) só aceitam conector por URL. Este servidor é esse conector,
 * e acrescenta o que o shadcn não tem: RECOMENDAR peças e kits pra um projeto,
 * lendo o "quando usar / evite" de cada peça (scripts/registry-meta.mjs).
 * Instalar continua sendo do shadcn: aqui só sai o comando.
 *
 * Sem estado, sem banco, sem chave: lê o `registry.json` do próprio deploy.
 * `mcp-handler` (Vercel) cuida do transporte; isto é só o catálogo.
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import registry from "../registry.json" with { type: "json" };
import kitsPecas from "../src/app/kits.generated.json" with { type: "json" };
import notas from "../curadoria/notas.json" with { type: "json" };

const SITE = "https://ui.visantlabs.com";

type Item = {
  name: string;
  title?: string;
  type: string;
  description?: string;
  categories?: string[];
  meta?: { uso?: { quando?: string; evite?: string } };
};

const KITS: { slug: string; titulo: string; para: string }[] = [
  { slug: "mesa-de-trabalho", titulo: "Mesa de trabalho", para: "app de gestão, dashboard, board de tarefas, SaaS, admin" },
  { slug: "pagina-que-vende", titulo: "Página que vende", para: "landing page, site institucional, estúdio, agência, produto, marketing" },
  { slug: "motion-e-estado", titulo: "Motion e estado", para: "fila, espera, carregamento, geração por IA, exportação, upload" },
  { slug: "rig-vintage", titulo: "Rig vintage", para: "áudio, música, sintetizador, painel analógico, skeuomorfismo" },
  { slug: "brand-system", titulo: "Brand system", para: "guideline de marca, design tokens, portal de marca, tema" },
];

/* Arquivadas pela curadoria (nota ≤ 2 ou marcadas pra sair) não são recomendadas. */
const arquivada = (n: string) => {
  const v = (notas as Record<string, { nota?: number; excluir?: boolean }>)[n];
  return Boolean(v && (v.excluir || (v.nota ?? 5) <= 2));
};

const ITENS = (registry.items as Item[]).filter((i) => !arquivada(i.name));

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2);
/* Radical curto: "botões" e "botao", "confirmação" e "confirmar" se encontram. */
const raiz = (t: string) => t.slice(0, 5);

/* Assunto do projeto → categorias que costumam servir. */
const ASSUNTOS: [RegExp, string[]][] = [
  [/landing|site|institucional|marketing|venda|estudio|agencia|portfolio|evento|lancamento/, ["secoes", "midia", "texto", "efeitos"]],
  [/dashboard|admin|painel|saas|crm|gestao|tarefa|board|interno|backoffice/, ["dados", "controles", "navegacao", "cards", "feedback"]],
  [/loja|ecommerce|e-commerce|produto|catalogo|checkout|carrinho/, ["midia", "controles", "cards", "secoes"]],
  [/fintech|banco|pagamento|carteira|financeiro|cobranca/, ["cards", "controles", "dados"]],
  [/formulario|cadastro|onboarding|configuracao|perfil|conta/, ["controles", "feedback"]],
  [/chat|mensagem|social|comunidade|comentario/, ["cards", "feedback", "controles"]],
  [/ia|gerador|geracao|upload|export|fila|carregando/, ["feedback", "efeitos"]],
  [/3d|webgl|imersivo|interativo|experiencia/, ["3d", "shaders", "texturas", "efeitos"]],
  [/audio|musica|som|sintetizador|podcast|radio/, ["vintage", "controles"]],
  [/marca|branding|guideline|tokens|tema/, ["base", "texto"]],
  [/aula|curso|didatico|explicacao|tutorial/, ["anatomia"]],
];

function pontuar(item: Item, termos: string[], bonusCategorias: string[] = []) {
  const campos: [string, number][] = [
    [item.name.replace(/-/g, " "), 3],
    [(item.categories ?? []).join(" "), 2],
    [item.meta?.uso?.quando ?? "", 2],
    [item.title ?? "", 2],
    [item.description ?? "", 1],
  ];
  let p = 0;
  for (const [texto, peso] of campos) {
    const ts = tokens(texto).map(raiz);
    for (const t of termos) if (ts.includes(raiz(t))) p += peso;
  }
  const fam = item.categories?.[0];
  if (fam && bonusCategorias.includes(fam)) p += 1.5;
  // Hook, lib e tema só sobem se a pessoa pediu por eles.
  if (["registry:lib", "registry:hook", "registry:theme", "registry:base", "registry:item"].includes(item.type)) p *= 0.6;
  return p;
}

const linha = (i: Item) => {
  const u = i.meta?.uso;
  return [
    `- ${i.name} (${i.categories?.[0] ?? i.type}): ${i.description ?? ""}`,
    u?.quando ? `  Use quando: ${u.quando}` : null,
    u?.evite ? `  Evite quando: ${u.evite}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const texto = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

const COMO_INSTALAR = [
  "Instalar (no projeto do usuário):",
  "  npx shadcn@latest add @visant/<nome> [@visant/<outro> ...]",
  "Se o projeto ainda não conhece o @visant, no components.json:",
  `  "registries": { "@visant": "${SITE}/r/{name}.json" }`,
  `Sem config: npx shadcn@latest add ${SITE}/r/<nome>.json`,
].join("\n");

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "recomendar_para_projeto",
      {
        title: "Recomendar componentes pra um projeto",
        description:
          "Recebe a descrição do projeto (e, se tiver, as dependências do package.json) e devolve um kit montado e as peças @visant que fazem sentido, com quando usar e quando evitar cada uma. Use antes de escrever interface do zero.",
        inputSchema: z.object({
          descricao: z.string().min(3).describe("O que o projeto é e o que a tela precisa fazer."),
          dependencias: z.array(z.string()).optional().describe("Pacotes do package.json, ex. ['next','three']."),
          limite: z.number().int().min(3).max(20).optional(),
        }),
      },
      async ({ descricao, dependencias, limite }) => {
        const d = fold(descricao);
        const categorias = [...new Set(ASSUNTOS.filter(([re]) => re.test(d)).flatMap(([, c]) => c))];
        const deps = (dependencias ?? []).join(" ");
        if (/three|@react-three/.test(deps)) categorias.push("3d", "shaders");
        const termos = tokens(descricao);
        const ranking = ITENS.map((i) => ({ i, p: pontuar(i, termos, categorias) }))
          .filter((r) => r.p > 0)
          .sort((a, b) => b.p - a.p)
          .slice(0, limite ?? 10);
        const kits = KITS.filter((k) => tokens(k.para).some((t) => termos.map(raiz).includes(raiz(t))));
        const partes = [
          kits.length
            ? `Kit montado que cabe (uma tela inteira de exemplo, peças listadas):\n${kits
                .map((k) => `- ${k.titulo}: ${SITE}/kit/${k.slug} · peças: ${(kitsPecas as Record<string, string[]>)[k.slug]?.join(", ")}`)
                .join("\n")}`
            : null,
          ranking.length
            ? `Peças recomendadas (da mais pra menos aderente):\n${ranking.map((r) => linha(r.i)).join("\n")}`
            : "Nenhuma peça bateu com a descrição. Tente buscar_componentes com palavras do que a tela faz (ex.: confirmar, slider, galeria, gráfico).",
          `Ficha completa de cada peça: ${SITE}/r/<nome>.md`,
          COMO_INSTALAR,
        ];
        return texto(partes.filter(Boolean).join("\n\n"));
      },
    );

    server.registerTool(
      "buscar_componentes",
      {
        title: "Buscar componentes",
        description:
          "Busca peças do @visant por intenção ou assunto (ex.: 'confirmar ação destrutiva', 'gráfico de série temporal', 'hero com 3D'). Devolve nome, categoria, descrição e quando usar.",
        inputSchema: z.object({
          consulta: z.string().min(2),
          categoria: z
            .string()
            .optional()
            .describe("controles, dados, navegacao, cards, feedback, secoes, midia, texto, efeitos, 3d, shaders, texturas, vintage, anatomia, base"),
          limite: z.number().int().min(1).max(30).optional(),
        }),
      },
      async ({ consulta, categoria, limite }) => {
        const termos = tokens(consulta);
        const lista = ITENS.filter((i) => !categoria || i.categories?.[0] === fold(categoria))
          .map((i) => ({ i, p: pontuar(i, termos) }))
          .filter((r) => r.p > 0 || (categoria && !termos.length))
          .sort((a, b) => b.p - a.p)
          .slice(0, limite ?? 10);
        return texto(lista.length ? lista.map((r) => linha(r.i)).join("\n") : "Nada encontrado. Tente outras palavras ou recomendar_para_projeto.");
      },
    );

    server.registerTool(
      "ler_componente",
      {
        title: "Ler a ficha de um componente",
        description: "A ficha completa da peça: o que é, quando usar e evitar, como instalar, exemplo de uso e API (props).",
        inputSchema: z.object({ nome: z.string().min(2).describe("Nome no registry, ex. slide-to-confirm") }),
      },
      async ({ nome }) => {
        const n = fold(nome).replace(/^@visant\//, "").trim();
        const item = ITENS.find((i) => i.name === n);
        if (!item) return texto(`Não existe @visant/${n}. Use buscar_componentes.`);
        try {
          const r = await fetch(`${SITE}/r/${n}.md`);
          if (r.ok) return texto(await r.text());
        } catch {
          /* sem rede: devolve o que o registry sabe */
        }
        return texto(`${linha(item)}\n\n${COMO_INSTALAR.replace(/<nome>/g, n)}`);
      },
    );

    server.registerTool(
      "comando_de_instalar",
      {
        title: "Comando de instalar",
        description: "Monta o comando shadcn pra instalar uma ou mais peças @visant, e a config do components.json se o projeto ainda não tiver o namespace.",
        inputSchema: z.object({ nomes: z.array(z.string()).min(1) }),
      },
      async ({ nomes }) => {
        const validos = nomes.map((n) => fold(n).replace(/^@visant\//, "").trim()).filter((n) => ITENS.some((i) => i.name === n));
        const faltam = nomes.length - validos.length;
        return texto(
          [
            `npx shadcn@latest add ${validos.map((n) => `@visant/${n}`).join(" ")}`,
            `Se o projeto não conhece o @visant, no components.json: "registries": { "@visant": "${SITE}/r/{name}.json" }`,
            "Pra o agente escolher sozinho nas próximas vezes: npx shadcn@latest add @visant/agent-rules",
            faltam ? `(${faltam} nome(s) não existem no registry e ficaram de fora)` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      },
    );
  },
  {
    serverInfo: { name: "visant-ui", version: "1.0.0" },
    instructions:
      "Catálogo @visant/ui (Visant Labs): ~140 componentes React/Tailwind distribuídos como registry shadcn, que leem os tokens de marca do projeto. Antes de escrever interface do zero, chame recomendar_para_projeto ou buscar_componentes, leia a ficha com ler_componente e instale com o comando de comando_de_instalar.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
