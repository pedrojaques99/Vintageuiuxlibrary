/**
 * O que conta como "novo" na vitrine.
 *
 * A primeira regra era a óbvia — entrou nos últimos 30 dias. Aplicada ao acervo
 * real, ela marcou **65 das 79 peças**. Um selo em 80% da grade não diz "olha o
 * que cresceu": diz que o selo não significa nada, e o olho aprende a pular.
 * O problema é que o registry inteiro é recente; a data absoluta não separa
 * nada porque não há nada velho pra contrastar.
 *
 * Então o selo é **relativo ao acervo**: as N peças mais recentes, e só. A
 * pergunta que ele responde deixa de ser "isso é de agosto?" e passa a ser "o
 * que entrou por último?" — que é a pergunta que quem já conhece a library de
 * fato faz ao voltar.
 *
 * O teto acompanha o tamanho do acervo em vez de ser um número fixo: quinze
 * novidades em oitenta peças é uma faixa legível; quinze em vinte seria a mesma
 * inundação de antes com outro nome.
 */

import datas from "./novidades.generated.json";

const POR_ITEM = datas as Record<string, string>;

/** No máximo um sexto do acervo, e nunca mais que 15. */
const TETO = Math.min(15, Math.max(4, Math.round(Object.keys(POR_ITEM).length / 6)));

/**
 * Data velha demais para o selo, mesmo estando entre as mais recentes.
 *
 * Sem este corte, uma library parada por um ano continuaria anunciando as
 * últimas doze peças como novidade — e aí o selo volta a mentir, só que devagar.
 */
const VALIDADE_DIAS = 120;

const NOVOS: ReadonlySet<string> = new Set(
  Object.entries(POR_ITEM)
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, TETO)
    .filter(([, data]) => (Date.now() - new Date(data).getTime()) / 86_400_000 <= VALIDADE_DIAS)
    .map(([nome]) => nome),
);

export const ehNovo = (name: string) => NOVOS.has(name);

export const dataDeEntrada = (name: string): string | null => POR_ITEM[name] ?? null;

/** Quantas peças estão marcadas — o número que a vitrine pode anunciar. */
export const quantosNovos = NOVOS.size;
