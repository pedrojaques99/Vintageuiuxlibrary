/**
 * Os dados de mentira das demos — em um lugar só.
 *
 * A bancada vintage e o card do catálogo mostram os mesmos pads e o mesmo traço
 * de osciloscópio, e até agora cada arquivo tinha a sua cópia dos hex. Duas
 * cópias divergem: o pad "SNARE" era azul num lugar e o fósforo do scope tinha
 * dois verdes ligeiramente diferentes conforme a demo.
 *
 * Nota sobre os hex daqui: são *conteúdo* de demonstração — a cor que o usuário
 * do sampler escolheu para o pad dele —, não decisão de interface. Componente
 * nenhum em `registry/visant/` pode ter hex (o `npm run ship` barra); estes
 * moram na vitrine, do lado de fora, que é onde conteúdo de exemplo deve morar.
 */

/** Voz de cada pad do sampler: rótulo, ícone e a cor escolhida por quem tocou. */
// Tons quentes de borracha iluminada: o kit tem um destaque só (âmbar), e o
// azul e o rosa de antes gritavam mais que o painel inteiro.
export const PAD_VOICES = [
  { label: "KICK", icon: "🥁", color: "#e0a03a" },
  { label: "SNARE", icon: "🪘", color: "#d9822b" },
  { label: "HAT", icon: "🎩", color: "#f2c14e" },
  { label: "CLAP", icon: "👏", color: "#c8553d" },
  { label: "BASS", icon: "🎸", color: "#b5651d" },
  { label: "SYNTH", icon: "🎹", color: "#e6b85c" },
  { label: "FX", icon: "💥", color: "#d1495b" },
  { label: "VOX", icon: "🎤", color: "#c9a227" },
] as const;

/** Verde de fósforo do tubo — o traço do osciloscópio e a legenda usam o mesmo. */
export const SCOPE_PHOSPHOR = "var(--vintage-light)";

/** Quantas amostras o buffer do scope carrega. */
export const SCOPE_SAMPLES = 256;

/** Time fictício das demos de avatar e responsável. */
export const PEOPLE = [
  { id: "1", name: "Pedro Jaques" },
  { id: "2", name: "Ana Reis" },
  { id: "3", name: "Caio Duarte" },
  { id: "4", name: "Marina Alves" },
  { id: "5", name: "Rafa Lima" },
];
