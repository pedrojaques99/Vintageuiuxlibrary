"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// O visant-board publicava a instância num store Zustand próprio. Aqui isso é
// um callback opcional: o consumidor guarda onde quiser, e o componente não
// arrasta uma dependência de estado que só existia naquele app.

/**
 * Smooth-scroll layer for the homepage scroll narrative.
 *
 * - Lenis drives a single RAF loop (via GSAP's ticker, so Lenis + ScrollTrigger
 *   share one clock and never fight each other).
 * - `lenis.on('scroll', ScrollTrigger.update)` keeps ScrollTrigger in sync with
 *   the smoothed scroll position.
 * - `prefers-reduced-motion` → bail out entirely: native scroll, no smoothing,
 *   no plugin registration. The 3D stage independently falls back to a static
 *   render in that mode.
 *
 * Scoped to the homepage (mounted inside `app/page.tsx`), so Lenis never
 * hijacks scrolling on admin/dashboard routes.
 */
export function SmoothScrollProvider({
    children,
    onReady,
}: {
    children: React.ReactNode;
    /**
     * Recebe a instância do Lenis (e `null` na desmontagem).
     *
     * Existe para que seções que reagem ao scroll se pendurem NA MESMA
     * instância em vez de criarem uma concorrente — duas instâncias de Lenis
     * na mesma página brigam pelo wheel e o scroll fica com soluço.
     * Guarde onde o seu app guarda estado; o componente não impõe store.
     */
    onReady?: (lenis: Lenis | null) => void;
}) {
    useEffect(() => {
        const prefersReduced =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReduced) return;

        gsap.registerPlugin(ScrollTrigger);

        const lenis = new Lenis({
            duration: 1.1,
            // expo-out: fast start, soft landing — the AWWWARDS "butter" feel.
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            touchMultiplier: 1.5,
        });

        lenis.on("scroll", ScrollTrigger.update);

        // Publish the instance so scroll-aware sections (Hero3DStage snap) can
        // attach to the SAME Lenis instead of spawning a competing one.
        onReady?.(lenis);

        const raf = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        // Recompute pin/trigger positions once layout settles and on resize.
        const refresh = () => ScrollTrigger.refresh();
        const refreshTimer = window.setTimeout(refresh, 300);
        window.addEventListener("resize", refresh);

        return () => {
            window.clearTimeout(refreshTimer);
            window.removeEventListener("resize", refresh);
            gsap.ticker.remove(raf);
            onReady?.(null);
            lenis.destroy();
            ScrollTrigger.getAll().forEach((st) => st.kill());
        };
    }, [onReady]);

    return <>{children}</>;
}
