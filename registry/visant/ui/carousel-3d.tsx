"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Image as DreiImage, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ChevronLeft, ChevronRight, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextLossGuard, StudioEnvironment } from "@/lib/webgl-stage";

/**
 * Carousel 3D — capas num carrossel circular em WebGL.
 *
 * Colhido da home da Visant (2026-09), onde mostrava o portfólio até ser
 * aposentado por uma faixa contínua (`marquee`). Vale a colheita porque a peça
 * é boa no lugar certo — e o lugar certo é uma vitrine com POUCAS capas onde o
 * objeto 3D é o argumento, não o meio de mostrar uma lista.
 *
 * **Quando NÃO usar** (o motivo da aposentadoria, registrado pra não se
 * repetir): numa seção de listagem ele cobra o chunk do three.js, um error
 * boundary de WebGL e um fallback 2D inteiro pra mostrar quatro imagens que um
 * marquee mostra melhor — porque no círculo só o card da frente é legível, e os
 * vizinhos aparecem numa perspectiva rasa que o olho lê como distorção.
 *
 * Decisões que sobrevivem à colheita:
 *
 * 1. **O canvas só nasce perto da dobra.** Contexto WebGL é recurso contado
 *    pelo navegador (≈16 no Chrome); criar um pra uma seção que ninguém rolou
 *    até lá gasta o teto à toa. `IntersectionObserver`, 300px de margem, uma vez.
 * 2. **Hover é a SOMA de duas fontes.** O raycast do card e o botão em DOM por
 *    cima dele. Se só o raycast mandasse, entrar no botão dispararia
 *    `pointerout` no card → `hovered = false` → o botão some → `pointerover` de
 *    novo: flicker infinito.
 * 3. **Só o botão abre o item, e só se for clique de verdade.** O `pointerup`
 *    que termina uma rotação de arrasto não pode virar navegação — daí a guarda
 *    de 6px entre o `pointerdown` e o `click`.
 * 4. **O raio é função da contagem**, `n × (largura + vão) / 2π`. Raio fixo
 *    abre buraco com poucos itens e sobrepõe com muitos.
 * 5. **Nenhuma cor mora aqui.** O hover escurece a própria textura por
 *    multiplicação, o que dispensa um retângulo de overlay por cima do card.
 *
 * Requer `three`, `@react-three/fiber`, `@react-three/drei` e `lucide-react`.
 */

export interface Carousel3DItem {
  id: string;
  title: string;
  /** Imagem ou vídeo (`.mp4|.webm|.mov|.m4v`) da capa. */
  media: string;
}

// `onSelect` do DOM é um handler de evento; o nosso recebe o id do item. Omitir
// o nativo é mais honesto que renomear o nosso — quem consome espera `onSelect`.
export interface Carousel3DProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: Carousel3DItem[];
  /** Chamado no clique do botão central. É por aqui que entra o router do app. */
  onSelect?: (id: string) => void;
  /** Texto do botão. */
  cta?: string;
  /**
   * Última chance de reescrever a URL da capa antes de virar textura.
   *
   * Existe por CORS: textura de outro domínio sem `Access-Control-Allow-Origin`
   * suja o canvas e o three recusa. Num app Next, `/_next/image?url=…` resolve
   * servindo a imagem como same-origin. Padrão: passa reto.
   */
  resolveSrc?: (url: string) => string;
  /** Velocidade do giro ocioso. 0 desliga. */
  autoRotate?: number;
}

interface Geometry {
  radius: number;
  cardWidth: number;
  fov: number;
  cameraZ: number;
}

const PLANE = new THREE.PlaneGeometry(1, 1);
const GAP = 0.15;
const CARD_WIDTH = 4;
const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)$/i.test(u);

/* ── Mídia ─────────────────────────────────────────────────────────────────── */

function PulseCard({ width, height }: { width: number; height: number }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const mat = meshRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (mat) mat.opacity = 0.15 + Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.15;
  });
  return (
    <mesh ref={meshRef} geometry={PLANE} scale={[width, height, 1]}>
      <meshStandardMaterial wireframe transparent opacity={0.2} />
    </mesh>
  );
}

/*
 * Multiplicadores de brilho sobre a mídia, não cor de marca: em repouso a capa
 * fica em 80%, no hover cai a 36% para o rótulo HTML ganhar contraste. Escritos
 * como cinza sRGB numérico (e não hex) porque são luminância, e o portão de
 * hex do registry existe para cor, não para conta de luz.
 */
const TINTA_REPOUSO = new THREE.Color().setRGB(0.8, 0.8, 0.8, THREE.SRGBColorSpace);
const TINTA_HOVER = new THREE.Color().setRGB(0.36, 0.36, 0.36, THREE.SRGBColorSpace);

function VideoLayer({
  url,
  width,
  height,
  hovered,
}: {
  url: string;
  width: number;
  height: number;
  hovered: boolean;
}) {
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const v = document.createElement("video");
    v.src = url;
    v.crossOrigin = "Anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
    setVideo(v);
    return () => {
      v.pause();
      v.src = "";
      v.load();
    };
  }, [url]);

  // Vídeo parado fora do hover: N vídeos decodificando em paralelo num círculo
  // é o caminho mais curto pra derrubar o frame rate.
  React.useEffect(() => {
    if (!video) return;
    if (hovered) video.play().catch(() => {});
    else video.pause();
  }, [hovered, video]);

  if (!video) return null;

  return (
    <mesh geometry={PLANE} scale={[width, height, 1]}>
      <meshStandardMaterial transparent opacity={0.95} color={hovered ? TINTA_HOVER : TINTA_REPOUSO}>
        <videoTexture attach="map" args={[video]} />
      </meshStandardMaterial>
    </mesh>
  );
}

function Media(props: { url: string; width: number; height: number; hovered: boolean }) {
  const { url, width, height, hovered } = props;
  if (isVideoUrl(url)) return <VideoLayer {...props} />;
  return (
    <React.Suspense fallback={<PulseCard width={width} height={height} />}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <DreiImage
        url={url}
        scale={[width, height]}
        transparent
        opacity={0.95}
        color={hovered ? TINTA_HOVER : TINTA_REPOUSO}
      />
    </React.Suspense>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────────── */

const Card3D = React.memo(function Card3D({
  item,
  index,
  total,
  geometry,
  cta,
  onSelect,
  onHoverChange,
}: {
  item: Carousel3DItem;
  index: number;
  total: number;
  geometry: Geometry;
  cta: string;
  onSelect?: (id: string) => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const contentRef = React.useRef<THREE.Group>(null);
  const [meshHover, setMeshHover] = React.useState(false);
  const [domHover, setDomHover] = React.useState(false);
  const hovered = meshHover || domHover; // decisão 2
  const pressedAt = React.useRef<{ x: number; y: number } | null>(null);

  useFrame(() => {
    if (!contentRef.current) return;
    const s = hovered ? 1.05 : 1;
    contentRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
  });

  const theta = (index / total) * Math.PI * 2;
  const cardWidth = geometry.cardWidth;
  const cardHeight = cardWidth / (16 / 9);

  return (
    <group
      position={[geometry.radius * Math.cos(theta), 0, geometry.radius * Math.sin(theta)]}
      rotation={[0, -theta + Math.PI / 1.95, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setMeshHover(true);
        onHoverChange?.(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setMeshHover(false);
        onHoverChange?.(false);
      }}
    >
      <group ref={contentRef}>
        <Media url={item.media} width={cardWidth} height={cardHeight} hovered={hovered} />

        <Html
          position={[0, 0, 0.01]}
          center
          className={cn(
            "pointer-events-none transition-colors duration-700 ease-out",
            hovered ? "opacity-100 scale-100" : "opacity-0 scale-105",
          )}
        >
          <div
            style={{ width: cardWidth * 65 }}
            className={cn(
              "flex flex-col items-center gap-5 px-4 text-center transition-transform duration-700 will-change-transform",
              hovered ? "translate-y-0" : "translate-y-4",
            )}
          >
            <h3 className="w-full text-xl font-black leading-[1.1] tracking-tight text-white drop-shadow-xl md:text-2xl">
              {item.title}
            </h3>

            {/* Única superfície clicável. pointer-events sempre ligado: é ele
                que reporta o hover do centro (ver decisão 2). */}
            <button
              type="button"
              aria-label={`${cta}: ${item.title}`}
              onPointerEnter={() => setDomHover(true)}
              onPointerLeave={() => setDomHover(false)}
              onPointerDown={(e) => {
                pressedAt.current = { x: e.clientX, y: e.clientY };
              }}
              onClick={(e) => {
                e.stopPropagation();
                const start = pressedAt.current;
                pressedAt.current = null;
                if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return; // decisão 3
                onSelect?.(item.id);
              }}
              className={cn(
                "pointer-events-auto flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/25 px-5 py-2 transition-opacity duration-500 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                hovered ? "opacity-100 delay-150" : "opacity-0",
              )}
            >
              <MousePointer2 className="h-3 w-3 text-white/90" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">{cta}</span>
            </button>
          </div>
        </Html>
      </group>
    </group>
  );
});

/* ── Cena ──────────────────────────────────────────────────────────────────── */

function Scene({
  items,
  geometry,
  rotation,
  cta,
  onSelect,
  onHoverChange,
}: {
  items: Carousel3DItem[];
  geometry: Geometry;
  rotation: number;
  cta: string;
  onSelect?: (id: string) => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotation, 0.1);
  });

  return (
    <group ref={groupRef}>
      {items.map((item, i) => (
        <Card3D
          key={item.id}
          item={item}
          index={i}
          total={items.length}
          geometry={geometry}
          cta={cta}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
        />
      ))}
      <ambientLight intensity={15} />
      <pointLight position={[0, 10, 0]} intensity={5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
    </group>
  );
}

function CameraFov({ fov }: { fov: number }) {
  const camera = useThree((s) => s.camera);
  React.useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);
  return null;
}

/* ── Público ───────────────────────────────────────────────────────────────── */

export function Carousel3D({
  items,
  onSelect,
  cta = "Ver projeto",
  resolveSrc,
  autoRotate = 0.2,
  className,
  ...props
}: Carousel3DProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [live, setLive] = React.useState(false); // decisão 1
  const [width, setWidth] = React.useState(1200);
  const [hovering, setHovering] = React.useState(false);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setLive(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const read = () => setWidth(window.innerWidth);
    read();
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(read, 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, []);

  const geometry = React.useMemo<Geometry>(() => {
    const factor = width < 480 ? 0.68 : width < 768 ? 0.8 : width < 1024 ? 0.85 : 1;
    const cardWidth = CARD_WIDTH * factor;
    const gap = GAP * factor;
    // decisão 4 — o raio segue a contagem, com piso pra poucos itens.
    const radius = Math.max(2.2, (items.length * (cardWidth + gap)) / (2 * Math.PI));
    return {
      radius,
      cardWidth,
      fov: width < 480 ? 62 : width < 1024 ? 58 : 50,
      cameraZ: radius + (width < 480 ? 2.8 : width < 1024 ? 3.6 : 4),
    };
  }, [width, items.length]);

  const rotation = React.useMemo(
    () => (items.length ? Math.PI / 2 - (active / items.length) * Math.PI * 2 : 0),
    [active, items.length],
  );

  const resolved = React.useMemo(
    () => (resolveSrc ? items.map((i) => ({ ...i, media: resolveSrc(i.media) })) : items),
    [items, resolveSrc],
  );

  if (!items.length) return null;

  return (
    <div className="group relative w-full" {...props}>
      <div
        ref={rootRef}
        className={cn(
          "relative h-[50vh] min-h-[350px] w-full cursor-grab rounded-3xl border border-white/5 bg-black/[0.03] backdrop-blur-sm active:cursor-grabbing [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
          className,
        )}
      >
        {live && (
          <Canvas
            shadows
            camera={{ position: [0, 0, geometry.cameraZ], fov: geometry.fov }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            dpr={[1, 2]}
          >
            <ContextLossGuard />
            <React.Suspense fallback={null}>
              <CameraFov fov={geometry.fov} />
              <Scene
                items={resolved}
                geometry={geometry}
                rotation={rotation}
                cta={cta}
                onSelect={onSelect}
                onHoverChange={setHovering}
              />
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                rotateSpeed={0.05}
                minPolarAngle={Math.PI / 2}
                maxPolarAngle={Math.PI / 2}
                autoRotate={autoRotate > 0}
                // Quase parado no hover, e não parado: cena congelada faz a
                // pessoa achar que travou.
                autoRotateSpeed={hovering ? autoRotate * 0.1 : autoRotate}
                minDistance={geometry.cameraZ}
                maxDistance={geometry.cameraZ}
              />
              <StudioEnvironment />
            </React.Suspense>
          </Canvas>
        )}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setActive((p) => (p - 1 + items.length) % items.length)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-3 text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setActive((p) => (p + 1) % items.length)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-3 text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Próximo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}
