"use client";

import * as React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

/**
 * Luz de estúdio assada em Lightformers — sem baixar HDR da rede.
 *
 * Material metálico sem environment não tem o que refletir e sai chapado; um
 * .hdr de 2 MB por superfície 3D resolve isso pagando um download que o
 * primeiro quadro espera. Quatro lightformers cobrem o caso de vitrine
 * (chave na frente, dois preenchimentos laterais, um rebote frio embaixo) e
 * custam zero byte de rede.
 *
 * `frames={1}` assa uma vez: a cena não muda de luz, então recalcular o cube
 * render target todo quadro seria GPU queimada à toa.
 */
/*
 * Luz de estúdio, não cor de marca: branco e um azul frio de céu nas laterais,
 * em sRGB numérico. Hex aqui derrubava o portão de "componente sem cor própria"
 * sem ser cor de componente.
 */
const BRANCO = new THREE.Color().setRGB(1, 1, 1, THREE.SRGBColorSpace);
const CEU = new THREE.Color().setRGB(0.749, 0.937, 1, THREE.SRGBColorSpace);
const CEU_FUNDO = new THREE.Color().setRGB(0.533, 0.8, 1, THREE.SRGBColorSpace);

export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer intensity={2.5} position={[0, 3, 5]} scale={[10, 10, 1]} color={BRANCO} />
      <Lightformer intensity={1.5} position={[-5, 1, 1]} scale={[5, 10, 1]} color={CEU} />
      <Lightformer intensity={1.5} position={[5, 1, 1]} scale={[5, 10, 1]} color={BRANCO} />
      <Lightformer intensity={1} position={[0, -3, 2]} scale={[10, 4, 1]} color={CEU_FUNDO} />
    </Environment>
  );
}

/**
 * Devolve o contexto WebGL no unmount, em vez de esperar o GC.
 *
 * O navegador tem um teto de contextos vivos (≈16 no Chrome). Uma SPA que
 * monta e desmonta superfícies 3D em navegação de cliente estoura esse teto
 * sem nunca ter duas cenas na tela ao mesmo tempo — e o sintoma que aparece é
 * "THREE.WebGLRenderer: Context Lost" numa cena que não fez nada de errado.
 *
 * O `setTimeout(…, 0)` não é superstição: o React e o drei ainda vão fazer o
 * dispose deles (o `<Environment>` tem um cube render target próprio) e
 * precisam de um contexto VIVO pra isso. Forçar a perda de forma síncrona aqui
 * faz o dispose deles ler de um contexto já morto e lançar.
 */
export function ContextLossGuard() {
  const gl = useThree((s) => s.gl);
  React.useEffect(() => {
    const renderer = gl;
    return () => {
      setTimeout(() => {
        try {
          renderer.forceContextLoss();
          renderer.dispose();
        } catch {
          /* noop */
        }
      }, 0);
    };
  }, [gl]);
  return null;
}
