/**
 * Tipos da anatomia: o contrato entre o núcleo (`anatomia.ts`) e cada figura.
 * A figura nasce de `anatomia/figuras/<id>/geometria.mjs` (Node, na hora do
 * build) e ganha vida no `anatomia-<id>-controlador.ts` (navegador).
 */

export type Ponto3 = [number, number, number];

export interface Projecao {
  origin: [number, number];
  scale: number;
  azimuth?: number;
  elevation?: number;
}

export interface Peca {
  n: number;
  nome: string;
  texto: string;
  ancora: Ponto3;
  /** Rótulo do botão de ação, quando a peça faz alguma coisa. */
  acao?: string;
}

export interface Passo {
  titulo: string;
  texto: string;
  /** Peças que acendem neste passo. */
  foco: number[];
  /** O que o controlador precisa pra montar a cena do passo. */
  pose?: unknown;
}

export interface DadosDaFigura {
  id: string;
  fig: string;
  titulo: string;
  resumo: string;
  width: number;
  height: number;
  svg: string;
  P: Projecao;
  modelo: Record<string, unknown>;
  pecas: Peca[];
  passos: Passo[];
  leitura: string;
  /** CSS só desta figura (estado de lâmpada, peça apagada...). Sem hex: tons do kit ou var() do site. */
  css?: string;
}

export interface AnatomiaApi {
  /** O runtime do kit isométrico (iso, translateAlong, holdStill, axisVector...). */
  kit: typeof import("./anatomia-kit");
  P: Projecao;
  /** Escreve no canto de leitura (e no anúncio pra leitor de tela). */
  dizer(texto: string): void;
  /** Leva o pino da peça `n` pra um ponto do mundo (peça que se move). */
  moverPino(n: number, ponto: Ponto3): void;
  /** Movimento reduzido: mostre a pose final, parada. */
  reduzido(): boolean;
  /** Laço de quadros. Só roda com a figura visível e sem pausa. `tick` devolve true pra continuar. */
  loop(tick: (dt: number) => boolean): { iniciar(): void; parar(): void };
}

export interface AcaoDaPeca {
  rotulo(): string;
  rodar(): void;
}

export interface Controle {
  acoes?: Record<number, AcaoDaPeca>;
  irParaPasso?(i: number): void;
  tocar(): void;
  pausar(): void;
  reiniciar(): void;
  destruir(): void;
}

export type Controlador = (raiz: ParentNode, modelo: Record<string, unknown>, api: AnatomiaApi) => Controle;

export interface FiguraDef {
  dados: DadosDaFigura;
  controlador: Controlador;
}
