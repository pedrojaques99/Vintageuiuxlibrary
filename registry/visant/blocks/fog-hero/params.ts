/**
 * O preset da hero de névoa, como foi aprovado num projeto de cliente (19/10/2026).
 *
 * Os valores de cena (fumaça, grão, clareira, logo) são os aprovados; os três de
 * enquadramento de vídeo foram neutralizados (ver abaixo).
 *
 * As cores NÃO moram aqui. No original havia quatro hex (papel e fumaça, claro e
 * escuro); na colheita viraram duas props do componente, `paper` e `ink`, que
 * por padrão leem `--background` e `--foreground`. O tema escuro deixa de ser um
 * segundo par de hex e passa a ser só o tema da marca virando.
 *
 * Mexa no preset por `params` (parcial) em vez de editar este arquivo: assim a
 * atualização do registry não pisa no ajuste do projeto.
 */
export const FOG_HERO_PRESET = {
  /** Escurece as bordas para a tinta. 0 = sem vinheta. */
  vignette: 0,
  // Os três próximos são do MATERIAL, não da cena: o cliente aprovou com
  // `flipY: true`, `videoZoom: 0.8` e `videoY: -0.07`, ajustados aos vídeos
  // dela. Como padrão genérico eles viravam o vídeo de cabeça para baixo (o
  // `VideoTexture` já chega na orientação certa) e afastavam o quadro além da
  // borda. Para reproduzir o preset aprovado, passe os três por `params`.
  /** Inverte a luminância do vídeo: use com filmagem escura (vinheta em fundo preto), que senão pinta tinta chapada. */
  invertVideo: false,
  /** Inverte o vídeo no eixo Y. Só para fonte gravada invertida. */
  flipY: false,
  /** < 1 afasta o vídeo (a sobra vira papel), > 1 aproxima. */
  videoZoom: 1,
  /** Desloca o enquadramento do vídeo na vertical (fração da altura). */
  videoY: 0,
  /** Largura do logo como fração da largura da tela (desktop). */
  logoSize: 0.23,
  /** Sangria de tinta no contorno do logo enquanto ele surge. */
  logoBleed: 0,
  /** Quanto o rastro do cursor empurra a fumaça. */
  cursor: 0.15,
  /** Quanto o rastro desbota por quadro (0..1). Maior = rastro mais curto. */
  trailFade: 0.07,
  /** Segundos da abertura da clareira. */
  introDur: 2.5,
  /** A fumaça fecha de novo conforme a hero sai pelo topo. */
  scrollClose: false,
  /** Intensidade do grão. */
  grain: 0.025,
  /** Tamanho da célula de grão em px do buffer. */
  grainSize: 2.5,
  /** Quadros por segundo do grão. 24–30 lê como película; 60 lê como chiado. */
  grainFps: 30,
  /** Pontilhado na borda da fumaça (spray). 0 = degradê liso. */
  spray: 0.25,
  /** Largura da borda da fumaça. */
  soft: 0.8,
  /** Opacidade da fumaça com a clareira aberta. */
  fogOpacity: 1,
  /** Clareia o miolo da fumaça para o papel. */
  smokeLift: 0.4,
  /** Contraste final (1 = neutro). */
  contrast: 0.81,
  /** Véu de papel por cima de tudo. */
  haze: 0.25,
  /** Raio da clareira aberta. */
  clear: 0.65,
  /** Quanto o centro empurra a fumaça para fora. */
  center: 0.75,
  /** Escala do ruído. Menor = manchas maiores. */
  scale: 0.52,
  /** Velocidade da deriva. */
  speed: 0.7,
  /** Domain warp: o quanto a fumaça se enrola. */
  warp: 0.71,
  /** Detalhe fino por cima do fbm. */
  detail: 0.15,
  /** Quanto do vídeo aparece na faixa perto da fumaça. */
  photo: 0.7,
};

export type FogHeroParams = typeof FOG_HERO_PRESET;
