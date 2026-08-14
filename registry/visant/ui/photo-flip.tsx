"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Flip } from "gsap/Flip";

import { cn } from "@/lib/utils";

/**
 * Photo Flip — a foto que ATRAVESSA da grade para a tela cheia.
 *
 * Não é um lightbox que abre por cima: é a mesma foto, o mesmo nó do DOM,
 * mudando de lugar e de tamanho. A diferença não é sutil — um lightbox faz a
 * pessoa perder o fio de qual das doze fotos ela abriu, e o percurso responde
 * essa pergunta sem legenda nenhuma.
 *
 * ── Aqui `ease-in-out` é o certo, e é o único lugar onde é ────────────────
 *
 * A regra da casa: `out` para o que chega ou sai, `in-out` para o que se MOVE
 * na tela. A foto não está chegando — ela já estava lá, visível, e vai para
 * outro ponto conhecido. As duas pontas são conhecidas, então frear nas duas é
 * o que faz o objeto ler como sólido em vez de teletransportado. `power2.inOut`,
 * 0.55s: passa dos 300ms de propósito, porque o teto de 300ms governa um
 * CONTROLE respondendo a clique, e isto é uma passagem — a mesma licença que
 * uma transição de rota tem.
 *
 * ── Por que GSAP Flip e não `layoutId` do framer-motion ───────────────────
 *
 * As duas fazem FLIP de verdade (medem, invertem, animam em `transform`). O
 * `layoutId` exige que as duas pontas estejam montadas no MESMO
 * `AnimatePresence`, e degrada silenciosamente para crossfade quando não estão
 * — o pior tipo de defeito, porque nada quebra. Aqui a foto é literalmente
 * reparentada, então não existe "as duas pontas": existe uma ponta só, e o
 * morph não tem como degradar. Se o projeto já roda framer-motion e a grade é
 * simples, `layoutId` é resposta legítima; a partir do momento em que a foto
 * muda de container, o Flip é a ferramenta.
 *
 * ── As armadilhas, todas pagas ────────────────────────────────────────────
 *
 * 1. **A grade DESABA quando a foto sai.** O nó é movido para o overlay, e o
 *    buraco que ele deixa reflui as outras fotos — que é o efeito colateral
 *    mais feio possível, porque acontece atrás do overlay e aparece só no
 *    fechamento. A casca do tile tem proporção própria e segura a vaga.
 * 2. **`absolute: true` não é opcional.** Sem ele, o Flip anima o nó já
 *    reparentado sem tirá-lo do fluxo, e os irmãos dançam junto durante a
 *    passagem.
 * 3. **Travar a rolagem empurra a página.** `overflow: hidden` no `body` some
 *    com a barra de rolagem e a página inteira salta ~15px para a direita no
 *    exato quadro em que a foto está viajando. A compensação em `padding-right`
 *    é a diferença entre uma passagem limpa e um solavanco.
 * 4. **O foco tem que voltar para a foto que abriu**, não para o topo do
 *    documento — senão quem navega por teclado recomeça a grade do zero a cada
 *    foto vista.
 * 5. **`prefers-reduced-motion` não desliga o recurso, desliga o percurso.**
 *    A foto ainda vai para a tela cheia; ela só não viaja. Movimento é o que se
 *    corta, o desfecho não.
 * 6. **Uma passagem por vez.** Clicar outra foto durante a viagem produziria
 *    dois nós no overlay. O gesto é ignorado enquanto `viajando` está de pé.
 * 7. **`position: fixed` não é fixo dentro de um ancestral transformado.**
 *    Qualquer `transform`, `filter` ou `backdrop-filter` num pai vira bloco
 *    contentor, e o overlay passa a ser recortado por ele em vez de cobrir a
 *    tela. Pego na vitrine, que escala o palco da demo — e não é caso de
 *    laboratório: transição de página, carrossel e container com `will-change`
 *    fazem o mesmo. Por isso o overlay sai por `createPortal` direto no `body`.
 *    Sem o portal, o componente funciona em metade dos projetos e ninguém sabe
 *    dizer qual metade.
 * 8. **O Escape do modal não pode vazar.** Enquanto a foto está aberta, o
 *    Escape é dela. Sem `stopPropagation` em fase de captura, ele também chega
 *    a quem ouve no documento — e a pessoa fecha a foto e navega junto, num
 *    gesto só. Não é caso raro: atalho global de Escape existe em quase todo
 *    app com paleta de comandos, gaveta ou rota que "volta".
 * 9. **Mover um nó por baixo do React exige que o React não re-renderize a
 *    grade.** Este é o risco real da técnica, e ele não aparece no primeiro
 *    teste: enquanto nada muda nos filhos, o React não encosta num nó que ele
 *    julga já estar no lugar — mas basta uma re-renderização que altere
 *    qualquer coisa nos tiles para a foto ser recolocada na grade no meio da
 *    viagem. Por isso a grade é memoizada e NÃO depende do estado de abertura:
 *    abrir e fechar não re-renderiza um único tile. É também por isso que a
 *    guarda de reentrância vive em `ref`, e não em estado — estado dentro do
 *    `onClick` memoizado envelheceria na primeira abertura.
 */

gsap.registerPlugin(Flip);

export interface PhotoFlipEntry {
  id: string;
  /** A mídia. `<img>`, `next/image` — por slot, como no `@visant/photo-frame`. */
  media: React.ReactNode;
  caption?: React.ReactNode;
}

export interface PhotoFlipProps extends React.HTMLAttributes<HTMLDivElement> {
  items: PhotoFlipEntry[];
  /** Proporção do tile na grade. A tela cheia usa a proporção real da foto. */
  ratio?: string;
  /** Rótulo do overlay para leitor de tela. */
  dialogLabel?: string;
}

const DUR = 0.55;

export function PhotoFlip({
  items,
  ratio = "1",
  dialogLabel = "Foto ampliada",
  className,
  ...props
}: PhotoFlipProps) {
  const [aberta, setAberta] = React.useState<string | null>(null);
  /** Espelho em ref: é o que os handlers memoizados leem sem envelhecer. */
  const abertaRef = React.useRef<string | null>(null);
  const viajando = React.useRef(false);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const palcoRef = React.useRef<HTMLDivElement>(null);
  const fecharRef = React.useRef<HTMLButtonElement>(null);
  const origemRef = React.useRef<HTMLButtonElement | null>(null);
  const [montado, setMontado] = React.useState(false);
  React.useEffect(() => setMontado(true), []);

  const reduzido = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const abrir = React.useCallback((id: string, botao: HTMLButtonElement) => {
    if (viajando.current || abertaRef.current) return;
    const no = botao.querySelector<HTMLElement>(".photo-flip-media");
    const palco = palcoRef.current;
    if (!no || !palco) return;

    viajando.current = true;
    origemRef.current = botao;

    // A barra de rolagem some com o `overflow: hidden`; o padding devolve a
    // largura que ela ocupava, e a página não anda de lado no meio da passagem.
    const barra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${barra}px`;

    const estado = Flip.getState(no);
    palco.appendChild(no);
    abertaRef.current = id;
    setAberta(id);

    const terminar = () => {
      viajando.current = false;
      fecharRef.current?.focus();
    };

    if (reduzido()) {
      terminar();
      return;
    }

    Flip.from(estado, { duration: DUR, ease: "power2.inOut", absolute: true, onComplete: terminar });
  }, []);

  const fechar = React.useCallback(() => {
    const id = abertaRef.current;
    if (viajando.current || !id) return;
    const palco = palcoRef.current;
    const no = palco?.querySelector<HTMLElement>(".photo-flip-media");
    const vaga = document.querySelector<HTMLElement>(`[data-flip-slot="${id}"]`);
    if (!no || !vaga) return;

    viajando.current = true;
    const estado = Flip.getState(no);
    vaga.appendChild(no);

    const terminar = () => {
      viajando.current = false;
      abertaRef.current = null;
      setAberta(null);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      origemRef.current?.focus();
    };

    if (reduzido()) {
      terminar();
      return;
    }

    Flip.from(estado, { duration: DUR, ease: "power2.inOut", absolute: true, onComplete: terminar });
  }, []);

  React.useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Captura + `stopPropagation`: o Escape é do modal aberto e de mais
      // ninguém. Sem isso ele vaza para quem estiver ouvindo no documento e a
      // pessoa fecha a foto e navega junto — foi o que aconteceu na vitrine,
      // que usa Escape para voltar à grade. Quase todo app tem um desses.
      e.stopPropagation();
      fechar();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [aberta, fechar]);

  // Desmontar com o overlay aberto deixaria o `body` travado para sempre — e o
  // sintoma (a página não rola mais) aparece longe daqui, numa outra rota.
  React.useEffect(
    () => () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    },
    [],
  );

  // A grade não conhece o estado de abertura — de propósito. Ver armadilha 7.
  const grade = React.useMemo(
    () => (
      <div className={cn("photo-flip-grid", className)} {...props}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="photo-flip-tile"
            style={{ "--ratio": ratio } as React.CSSProperties}
            aria-label={typeof item.caption === "string" ? item.caption : undefined}
            onClick={(e) => abrir(item.id, e.currentTarget)}
          >
            {/* A vaga: fica aqui segurando a proporção mesmo com a foto viajando.
                É ela que impede a grade de refluir por trás do overlay. */}
            <span className="photo-flip-slot" data-flip-slot={item.id}>
              <span className="photo-flip-media">{item.media}</span>
            </span>
          </button>
        ))}
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, ratio, className, abrir],
  );

  return (
    <>
      {grade}

      {/* Portal no `body`: ver armadilha 7. `montado` existe porque no primeiro
          render do servidor não há `document` — sem a guarda, SSR quebra. */}
      {montado
        ? createPortal(
            <div
              ref={overlayRef}
              className="photo-flip-overlay"
              data-open={aberta ? "1" : undefined}
              role="dialog"
              aria-modal="true"
              aria-label={dialogLabel}
              // `hidden` de verdade quando fechado: um overlay só invisível
              // continua sendo lido por leitor de tela e capturando Tab.
              hidden={!aberta}
              onClick={(e) => {
                if (e.target === e.currentTarget) fechar();
              }}
            >
              <div ref={palcoRef} className="photo-flip-stage" />
              <button ref={fecharRef} type="button" className="photo-flip-close" onClick={fechar}>
                Fechar
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
