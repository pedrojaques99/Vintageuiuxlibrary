"use client";

/**
 * O palco: canvas, câmera, luz e a malha. Carregado sob demanda pelo
 * `book-3d` — nunca importe este arquivo direto, ou os ~180 KB de WebGL entram
 * no bundle de quem só queria mostrar um card.
 *
 * ┌─ POR QUE A MALHA NÃO É UMA CAIXA COM TEXTURA ─────────────────────────────┐
 * │ Caixa com a arte colada é o render de livro que todo mundo faz e que      │
 * │ ninguém acredita. Faltam duas coisas, e são as duas que o olho procura:   │
 * │                                                                            │
 * │   PRAÇA     a capa sobra além do bloco de páginas nas três bordas livres. │
 * │             É a sombra fina em volta do corte que diz "isso abre".        │
 * │   CHARNEIRA a lombada é uma meia-cilíndrica de verdade, com o vinco onde  │
 * │             a capa dobra. Lombada pintada num plano lê como adesivo.      │
 * │                                                                            │
 * │ Por isso são quatro peças (dois cartões + lombada + miolo) e não uma:     │
 * │ nenhuma textura produz um degrau que responde à luz quando o objeto gira. │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Nenhum asset baixado: sem GLB, sem HDR de CDN. Modelo de banco público seria
 * pior em quatro frentes — UV desconhecida (refazer o unwrap é o trabalho que o
 * modelo deveria evitar), proporção travada (espessura aqui é parâmetro),
 * 300 KB–2 MB de rede, e passivo de atribuição numa superfície comercial.
 */

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

import {
  BOARD,
  CAMERA,
  REST,
  SQUARE,
  STIFFNESS,
  bookDimensions,
  damp,
  tilt,
} from "@/lib/book-geometry";
import {
  ROUGH_COVER,
  ROUGH_PAPER,
  bookPalette,
  characterColor,
  resolveRgb,
  rgbToCss,
  type BookPalette,
} from "@/lib/book-material";
import { bookFaces } from "@/lib/book-faces";

/** O que o ponteiro está pedindo. Ref e não estado: mexer nisso 60× por segundo
 *  por `setState` re-renderiza a árvore React inteira a cada quadro. */
export type PointerTarget = { px: number; py: number; active: boolean };

export interface BookStageProps {
  /** Chave ESTÁVEL: slug > id > título. Título editado mudaria o objeto. */
  seed: string;
  title: string;
  /** A capa. Sem ela, o livro sai com a capa desenhada — nunca caixa cinza. */
  art?: string | null;
  /** Manda na espessura. Sem número, usa o livro de estante médio. */
  pages?: number | null;
  /**
   * Cor curada da arte, se houver. Ganha da amostragem automática — uma pessoa
   * (ou um extrator com noção de papel) sabe que o ocre da pedra é o assunto e
   * o céu é o fundo; uma média não sabe.
   */
  artColor?: string | null;
  /** Marca d'água na contracapa. Uma linha curta, tipo o selo da editora. */
  mark?: string;
  /** Chamado no primeiro quadro em que o livro existe POR INTEIRO. */
  onReady?: () => void;
}

type Shared = Pick<BookStageProps, "seed" | "title" | "pages" | "artColor" | "mark" | "onReady"> & {
  /**
   * Tipo ESTRUTURAL, e não `React.RefObject` / `MutableRefObject`.
   *
   * Os dois nomes mudaram de significado entre os types do React 18 e do 19:
   * no 18, `useRef` com valor inicial devolve `MutableRefObject`, que não é
   * atribuível a `RefObject`; no 19, `MutableRefObject` está depreciado. Um item
   * de registry é instalado em projetos das duas versões, então amarrar-se a
   * qualquer um dos dois nomes garante erro de tipo na metade dos consumidores.
   * `{ current: T }` é o que os dois têm em comum e sempre terão.
   */
  target: { current: PointerTarget };
  reduced: boolean;
};

/* ── O objeto ───────────────────────────────────────────────────────────── */

function Body({
  seed,
  title,
  pages,
  artColor,
  mark,
  onReady,
  target,
  reduced,
  cover,
  sampled,
  epoch,
}: Shared & { cover: THREE.Texture | null; sampled: string | null; epoch: number }) {
  const group = React.useRef<THREE.Group>(null);
  const announced = React.useRef(false);
  const { invalidate } = useThree();

  const d = React.useMemo(() => bookDimensions(pages), [pages]);
  /* `epoch` na lista de dependências é o que reassa tudo quando o tema troca.
     Ver `useThemeEpoch`. */
  const palette: BookPalette = React.useMemo(
    () => bookPalette(seed, artColor ?? sampled),
    [seed, artColor, sampled, epoch],
  );
  const faces = React.useMemo(
    () => bookFaces(seed, title, d, palette, mark),
    [seed, title, d, palette, mark],
  );

  /**
   * O miolo leva SEIS materiais porque o corte e a cabeça mostram o mesmo
   * empilhamento em direções diferentes: no corte as páginas correm na altura,
   * na cabeça correm na largura. Uma textura só nas duas faces deixa a cabeça
   * com listra atravessada — o tipo de erro que ninguém nomeia e todo mundo vê.
   */
  const blockMaterials = React.useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({
      map: faces.block,
      roughness: ROUGH_PAPER,
      metalness: 0,
    });
    const turned = faces.block.clone();
    turned.needsUpdate = true;
    turned.center.set(0.5, 0.5);
    turned.rotation = Math.PI / 2;
    const head = new THREE.MeshStandardMaterial({
      map: turned,
      roughness: ROUGH_PAPER,
      metalness: 0,
    });
    /**
     * Faces que ficam atrás dos cartões e dentro da lombada. Escuras, e não cor
     * de papel — é a diferença entre um vazamento que lê como sombra e um que
     * lê como DEFEITO. Qualquer fresta de um pixel nesta montagem (e sempre há
     * uma, em algum ângulo) some se o que está atrás for escuro, e vira risco
     * claro se for papel.
     */
    const hidden = new THREE.MeshStandardMaterial({
      color: palette.coverDark,
      roughness: ROUGH_PAPER,
    });
    return [edge, hidden, head, head, hidden, hidden]; // +x −x +y −y +z −z
  }, [faces.block, palette.coverDark]);

  /** Lombada: [lateral, tampa de cima, tampa de baixo]. As tampas são o vazio
   *  entre a curva e o miolo — escuras, como o crescente que um livro de capa
   *  dura mostra na cabeça. */
  const spineMaterials = React.useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      map: faces.spine,
      roughness: ROUGH_COVER,
      metalness: 0,
    });
    const hollow = new THREE.MeshStandardMaterial({
      color: palette.coverDark,
      roughness: 1,
    });
    return [side, hollow, hollow];
  }, [faces.spine, palette.coverDark]);

  /**
   * Devolver a memória de vídeo ao desmontar.
   *
   * `three` não tem coleta de lixo: textura e material vivem na GPU até alguém
   * chamar `dispose()`. Numa página só isso nunca aparece, e é por isso que é
   * perigoso — o vazamento mora no CAMINHO que ainda não existe: prateleira que
   * pagina, filtro que remonta a lista, rota que entra e sai. Cada livro carrega
   * três canvases de 1024 de altura; algumas dezenas de remontagens e o
   * navegador começa a derrubar contexto WebGL, o que na tela lê como "os livros
   * sumiram" sem nenhum erro.
   *
   * Duas coisas NÃO se descartam, e é o detalhe que separa limpar de quebrar:
   * o corte do miolo é memoizado por palheta e serve todos os livros da marca,
   * e a textura da ARTE vem do cache de loader do fiber, que a reusa entre
   * montagens. Quem descarta essas é quem as guarda.
   */
  React.useEffect(() => {
    const own = [faces.spine, faces.back, faces.cover];
    const materials = [...blockMaterials, ...spineMaterials];
    return () => {
      own.forEach((t) => t.dispose());
      materials.forEach((m) => {
        if (m.map && m.map !== faces.block) m.map.dispose();
        m.dispose();
      });
    };
  }, [faces, blockMaterials, spineMaterials]);

  /* `frameloop="demand"` não desenha só porque um material mudou: sem este
     empurrão, a palheta nova só apareceria no próximo movimento do ponteiro. */
  React.useEffect(() => invalidate(), [palette, invalidate]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    /* Primeiro quadro DESTE livro — não do canvas. Ver `onReady` em `book-3d`. */
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }

    const t = target.current;
    const goal = reduced || !t?.active ? REST : tilt(t.px, t.py);
    g.rotation.y = damp(g.rotation.y, goal.ry, STIFFNESS, dt);
    g.rotation.x = damp(g.rotation.x, goal.rx, STIFFNESS, dt);

    /**
     * `frameloop="demand"`: o quadro só acontece quando alguém pede. Enquanto o
     * livro ainda está indo pro destino, ele pede o próximo; parado, a GPU dorme
     * em 0 fps. Sem isto, uma página de catálogo queima bateria a 60 fps pra
     * desenhar um objeto que não se move.
     */
    const settled =
      Math.abs(g.rotation.y - goal.ry) < 1e-4 && Math.abs(g.rotation.x - goal.rx) < 1e-4;
    if (!settled) invalidate();
  });

  const half = d.thickness / 2;
  const lift = 0.0015; // folga da arte sobre o cartão; evita z-fighting

  return (
    <group ref={group} rotation={[REST.rx, REST.ry, 0]}>
      {/* CARTÃO DA FRENTE.
          Caixa reta, e não uma caixa com canto arredondado. O bisel parecia
          refinamento e era defeito: ele curva TODAS as arestas, inclusive a que
          encosta na lombada, e ali abria uma fresta por onde o miolo claro
          vazava — uma linha vertical entre a lombada e a capa, do topo ao pé.
          Aresta de cartão de livro é reta mesmo; o único arredondamento honesto
          neste objeto é a lombada, e essa é geometria de verdade. */}
      <mesh position={[0, 0, half - BOARD / 2]}>
        <boxGeometry args={[d.width, d.height, BOARD]} />
        <meshStandardMaterial color={palette.board} roughness={ROUGH_COVER} />
      </mesh>

      {/* A ARTE — a única coisa que o item precisa fornecer. */}
      <mesh position={[0, 0, half + lift]}>
        <planeGeometry args={[d.width, d.height]} />
        <meshStandardMaterial
          map={cover ?? faces.cover}
          roughness={ROUGH_COVER}
          metalness={0}
        />
      </mesh>

      {/* CARTÃO DE TRÁS + contracapa */}
      <mesh position={[0, 0, -half + BOARD / 2]}>
        <boxGeometry args={[d.width, d.height, BOARD]} />
        <meshStandardMaterial color={palette.board} roughness={ROUGH_COVER} />
      </mesh>
      <mesh position={[0, 0, -half - lift]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[d.width, d.height]} />
        <meshStandardMaterial map={faces.back} roughness={ROUGH_COVER} metalness={0} />
      </mesh>

      {/* LOMBADA — meia-cilíndrica de raio E/2. Esse raio não é escolha: é o
          único que faz a curva encostar exatamente nas quinas dos dois cartões
          (−L/2, ±E/2). Qualquer outro abre fresta ou cria degrau. */}
      <mesh position={[-d.width / 2, 0, 0]} material={spineMaterials}>
        <cylinderGeometry args={[half, half, d.height, 48, 1, false, Math.PI, Math.PI]} />
      </mesh>

      {/* MIOLO — recuado pela praça nas três bordas livres, e entrando meia
          espessura pra DENTRO da cavidade da lombada. Um livro rebatido faz
          isso de verdade (o bloco acompanha a curva), e aqui resolve de quebra
          o vão que sobrava entre a face reta do miolo e a casca curva: em
          ângulo raso dava pra enxergar por dentro do livro. */}
      <mesh position={[-(half / 2 + SQUARE) / 2, 0, 0]} material={blockMaterials}>
        <boxGeometry args={[d.width - SQUARE + half / 2, d.height - SQUARE * 2, d.block]} />
      </mesh>
    </group>
  );
}

/* ── As duas naturezas de capa ──────────────────────────────────────────── */

/**
 * Livro COM arte. Suspende no `useLoader` até o byte chegar — por isso o
 * `<Suspense>` abaixo tem o livro SEM arte como reserva, e não um vazio.
 *
 * É aqui que a cor do objeto nasce quando ninguém curou uma: a imagem já está
 * decodificada na memória, então medir o matiz custa um `drawImage` de 32×48 e
 * nenhuma requisição.
 */
function WithArt({ art, ...shared }: Shared & { art: string; epoch: number }) {
  const tex = useLoader(THREE.TextureLoader, art);
  const sampled = React.useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return characterColor(tex.image as CanvasImageSource);
  }, [tex]);
  return <Body {...shared} cover={tex} sampled={sampled} />;
}

function WithoutArt(shared: Shared & { epoch: number }) {
  return <Body {...shared} cover={null} sampled={null} />;
}

/* ── O estúdio ──────────────────────────────────────────────────────────── */

/**
 * Luz sem baixar nada.
 *
 * `<Environment preset="studio" />` é o caminho óbvio e está errado aqui: o
 * preset busca um HDR num CDN de terceiro. Numa página de produto, quando o CDN
 * pisca o objeto fica preto. Com `<Lightformer>` o ambiente é RENDERIZADO na
 * hora, num cubo de 256, e o custo é uma vez na montagem.
 *
 * ┌─ O AMBIENTE NÃO SUBSTITUI A LUZ DIRETA ───────────────────────────────────┐
 * │ A primeira versão tinha só os lightformers, e na bancada o livro saiu     │
 * │ quase invisível: ambiente escuro sobre matéria escura não produz FORMA    │
 * │ nenhuma.                                                                  │
 * │                                                                            │
 * │ Ambiente dá o brilho da superfície — o pano da capa, o reflexo fraco na   │
 * │ curva da lombada. Quem desenha o volume é luz direcional, porque só ela   │
 * │ produz gradiente na face e sombra na quina. As duas coisas, não uma.      │
 * │                                                                            │
 * │ A chave vem de cima e da ESQUERDA: é o lado da lombada, e é o contraste   │
 * │ entre a curva iluminada e a capa em meia-luz que diz "isso tem lado".     │
 * │ Chave frontal achataria o objeto de volta ao retângulo.                   │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * NÃO HÁ SOMBRA DE CONTATO, e isso foi medido, não esquecido. O
 * `<ContactShadows>` esteve aqui: sobre uma superfície escura, uma sombra preta
 * a 75% de opacidade move o pixel em menos de 15/255 — invisível. Custava um
 * alvo de render de 512 por quadro pra não aparecer em foto nenhuma. Numa marca
 * clara ela voltaria a valer, e por isso o comentário fica.
 */
function Studio({ backdrop }: { backdrop: string }) {
  return (
    <>
      {/* Piso de luz. Sem ele a contracapa e a sombra da praça viram buraco
          preto, e buraco preto lê como falha de textura. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[-2.6, 3.2, 3.4]} intensity={2.6} />
      {/* CONTRA — de trás e da direita, rasante. Acende a quina do corte e
          separa o livro do fundo, que costuma ser quase da mesma cor. */}
      <directionalLight position={[3.4, 1.2, -2.4]} intensity={1.5} />
      <directionalLight position={[1.2, -2.2, 1.6]} intensity={0.35} />

      <Environment resolution={256}>
        <color attach="background" args={[backdrop]} />
        <Lightformer form="rect" intensity={6} position={[0, 4, 2]} scale={[8, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4} position={[4, 1, -3]} scale={[5, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2} position={[-4, 0, 2]} scale={[5, 5, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

/* ── Tema ───────────────────────────────────────────────────────────────── */

/**
 * Um contador que muda quando o TEMA muda.
 *
 * A palheta e as três faces de canvas são assadas uma vez, na montagem, porque
 * `getComputedStyle` força layout e não pode rodar por quadro. O preço disso é
 * que um livro montado no claro continua claro depois de a pessoa clicar no
 * botão de tema — e num app que tem esse botão, isso aparece no primeiro
 * clique: a página inteira vira escura e o objeto fica de outra marca.
 *
 * Observar o `documentElement` cobre os dois jeitos de trocar tema no mundo
 * real (classe `dark` e atributo `data-theme`) e o `matchMedia` cobre quem
 * segue o sistema. Não há laço: cada troca de tema paga uma reassagem, e
 * trocar de tema não é coisa que se faz sessenta vezes por segundo.
 */
function useThemeEpoch(): number {
  const [epoch, setEpoch] = React.useState(0);
  React.useEffect(() => {
    const bump = () => setEpoch((n) => n + 1);
    const obs = new MutationObserver(bump);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", bump);
    };
  }, []);
  return epoch;
}

/* ── Movimento reduzido ─────────────────────────────────────────────────── */

/** Seis linhas em vez de uma dependência: o item já pesa three + fiber + drei,
 *  e puxar uma lib de animação inteira por um `matchMedia` seria caro. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/* ── O palco ────────────────────────────────────────────────────────────── */

export default function BookStage({ art, onReady, ...rest }: BookStageProps) {
  const target = React.useRef<PointerTarget>({ px: 0, py: 0, active: false });
  const nudge = React.useRef<(() => void) | null>(null);
  const reduced = usePrefersReducedMotion();
  const epoch = useThemeEpoch();

  /**
   * O ponteiro é lido no DIV, não na malha.
   *
   * Raycast no objeto só dispara com o cursor EM CIMA do livro, e o livro ocupa
   * menos de um terço da área. Na bancada isso lia como peça quebrada: o cursor
   * entrava na região, nada acontecia, e só perto do centro o objeto acordava.
   * A caixa inteira é a superfície de hover.
   */
  const move = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    target.current = {
      px: ((e.clientX - r.left) / r.width) * 2 - 1,
      py: ((e.clientY - r.top) / r.height) * 2 - 1,
      active: true,
    };
    nudge.current?.();
  }, []);

  const release = React.useCallback(() => {
    target.current = { ...target.current, active: false };
    nudge.current?.();
  }, []);

  const shared = { ...rest, target, reduced, onReady, epoch };

  /**
   * O que o ambiente reflete na capa é a SUPERFÍCIE DA MARCA, não um cinza
   * escolhido aqui. Numa marca clara o reflexo tem que ser claro, senão o livro
   * parece recortado de outra foto. Resolvido uma vez: `getComputedStyle` força
   * layout e não pode entrar num laço de quadro.
   */
  const backdrop = React.useMemo(() => {
    const bg = resolveRgb("var(--background)");
    return bg ? rgbToCss(bg) : "rgb(16, 16, 20)";
  }, [epoch]);

  return (
    <div
      className="h-full w-full"
      onPointerMove={move}
      onPointerLeave={release}
      onPointerCancel={release}
      /* Toque não tem hover: o dedo arrasta e o livro segue, e ao soltar volta
         ao repouso. Sai de graça do Pointer Events — não há ramo de touch aqui. */
      onPointerUp={release}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [...CAMERA.position], fov: CAMERA.fov }}
        onCreated={({ invalidate }) => {
          nudge.current = invalidate;
        }}
        style={{ touchAction: "pan-y" }}
      >
        <Studio backdrop={backdrop} />
        {/* A reserva do Suspense é o LIVRO INTEIRO com a capa desenhada, não um
            vazio nem um esqueleto. Enquanto a arte desce já há um objeto com
            lombada e espessura na tela, e a troca é só a face da frente. */}
        <React.Suspense fallback={<WithoutArt {...shared} />}>
          {art ? <WithArt art={art} {...shared} /> : <WithoutArt {...shared} />}
        </React.Suspense>
      </Canvas>
    </div>
  );
}
