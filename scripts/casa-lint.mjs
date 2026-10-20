#!/usr/bin/env node
/**
 * Portão: a casca da vitrine não fala com a voz da marca nem grita.
 *
 * O redesign de 2026-10 (PLANO-REDESIGN-CASA.md) tirou da casca tudo o que a
 * deixava com cara de template: cor e raio vindos do preset do cliente, rótulo
 * mono em caixa-alta, pílula, contorno em card, vidro fosco, seis tamanhos de
 * texto escolhidos no olho. Nenhum desses defeitos quebra build, tsc ou teste —
 * cada linha, sozinha, é defensável. É por isso que precisam de portão: voltam
 * uma classe por vez, num commit qualquer, sem ninguém notar.
 *
 * O alvo é SÓ a casca (a lista abaixo). Demos, kits e peças do registry
 * desenham com a marca de propósito e ficam fora.
 *
 * Exceção escrita, na mesma linha ou nas 3 acima:
 *   casa-lint/<regra>: motivo de verdade
 *
 *   node scripts/casa-lint.mjs            # lista e sai 1 se houver achado
 *   node scripts/casa-lint.mjs --self-test
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A casca: o que envolve a peça, nunca a peça. */
export const CASCA = [
  "src/app/App.tsx",
  "src/app/Gallery.tsx",
  "src/app/ComponentFocus.tsx",
  "src/app/busca.tsx",
  "src/app/instalar.tsx",
  "src/app/copiar-pra-ia.tsx",
  "src/app/copy-command.tsx",
  "src/app/bug-report.tsx",
  "src/app/media.tsx",
  "src/app/MinhasMarcas.tsx",
  "src/app/dep-badges.tsx",
  "src/app/controls.tsx",
  "src/app/ItemDocs.tsx",
  "src/app/codigo.tsx",
  "src/app/KitRoom.tsx",
  "src/app/BrandStudio.tsx",
];

export const REGRAS = [
  {
    id: "marca-na-casca",
    re: /var\(--brand\b/,
    por: "a casca lê --casa-*; a cor da marca só existe no palco",
  },
  {
    id: "raio-da-marca",
    re: /var\(--r-(control|surface|pill)\b/,
    por: "raio é da casa: rounded-tile ou rounded-control",
  },
  {
    id: "rotulo-gritado",
    re: /\buppercase\b/,
    por: "caixa-alta com tracking vira textura; a casca não tem rótulo gritado",
  },
  {
    id: "pilula",
    re: /\brounded-full\b/,
    por: "pílula é o tell de chip genérico; controle usa rounded-control",
  },
  {
    id: "vidro",
    re: /\bbackdrop-blur/,
    por: "sem nada atrás não borra nada; fundo sólido do token",
  },
  {
    id: "escala-antiga",
    re: /\btext-(micro|rotulo|apoio|corpo|destaque|titulo)\b/,
    por: "a casca usa text-casa-sm/base/lg/xl",
  },
  {
    id: "peso-pesado",
    re: /\bfont-(semibold|bold|extrabold|black)\b/,
    por: "pesos da casa: 400 e 500",
  },
  {
    id: "contorno",
    re: /(?<![-\w])border border-border\b/,
    por: "a casa separa por tom e espaço, não por linha",
  },
];

const EXCECAO = (regra) => new RegExp(`casa-lint/${regra}:\\s*\\S.{6,}`);

export function lint(texto, arquivo = "<texto>") {
  const linhas = texto.split(/\r?\n/);
  const achados = [];
  linhas.forEach((linha, i) => {
    // Comentário não chega no olho de ninguém.
    const t = linha.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
    for (const r of REGRAS) {
      if (!r.re.test(linha)) continue;
      const janela = linhas.slice(Math.max(0, i - 3), i + 1).join("\n");
      if (EXCECAO(r.id).test(janela)) continue;
      achados.push({ arquivo, linha: i + 1, regra: r.id, por: r.por, trecho: t.slice(0, 90) });
    }
  });
  return achados;
}

function selfTest() {
  const casos = [
    ['<div className="text-[var(--brand)]" />', ["marca-na-casca"]],
    ['<div className="rounded-[var(--r-control,0.5rem)]" />', ["raio-da-marca"]],
    ['<p className="font-mono text-micro uppercase tracking-wider" />', ["rotulo-gritado", "escala-antiga"]],
    ['<b className="font-semibold" />', ["peso-pesado"]],
    ['<i className="rounded-md border border-border" />', ["contorno"]],
    ['<i className="border-b border-border" />', []],
    ['<i className="rounded-tile bg-casa-tile text-casa-base" />', []],
    ["// text-[var(--brand)] num comentário", []],
    ['{/* casa-lint/pilula: o ponto de cor da marca é um círculo de verdade */}\n<i className="rounded-full" />', []],
    ['{/* casa-lint/pilula: x */}\n<i className="rounded-full" />', ["pilula"]],
  ];
  let falhas = 0;
  for (const [texto, esperado] of casos) {
    const obtido = lint(texto).map((a) => a.regra).sort();
    const ok = JSON.stringify(obtido) === JSON.stringify([...esperado].sort());
    if (!ok) {
      falhas++;
      console.log(`FALHOU  ${JSON.stringify(texto)}\n  esperado ${esperado}  obtido ${obtido}`);
    }
  }
  console.log(falhas ? `${falhas} caso(s) falharam` : `self-test ok (${casos.length} casos)`);
  process.exit(falhas ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes("--self-test")) selfTest();

  const achados = CASCA.flatMap((rel) => {
    const abs = path.join(RAIZ, rel);
    if (!fs.existsSync(abs)) return [];
    return lint(fs.readFileSync(abs, "utf8"), rel);
  });

  if (!achados.length) {
    console.log(`casa-lint: casca limpa (${CASCA.length} arquivos)`);
    process.exit(0);
  }

  const porRegra = {};
  for (const a of achados) (porRegra[a.regra] ??= []).push(a);
  for (const [regra, lista] of Object.entries(porRegra)) {
    console.log(`\n[${regra}] ${lista.length}: ${lista[0].por}`);
    for (const a of lista) console.log(`  ${a.arquivo}:${a.linha}  ${a.trecho}`);
  }
  console.log(`\ncasa-lint: ${achados.length} achado(s). Conserte, ou escreva a exceção com motivo.`);
  process.exit(1);
}
