'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface RepulsiveHoverProps {
    children: React.ReactNode;
    strength?: number; // How far it moves (max distance)
    radius?: number;   // Interaction radius
    className?: string;
}

export function RepulsiveHover({
    children,
    strength = 5,
    radius = 2,
    className = ""
}: RepulsiveHoverProps) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useSpring(0, { stiffness: 15, damping: 1 });
    const y = useSpring(0, { stiffness: 15, damping: 1 });

    // Use state to track if we should be listening to mouse events
    // (optimization: only listen when element is visible/relevant?)
    // For now, simpler to just listen on window or document when mounted

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!ref.current) return;

            const rect = ref.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const dist = Math.sqrt(
                Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
            );

            if (dist < radius) {
                // Calculate repulsion
                // The closer the mouse, the stronger the push
                const force = (radius - dist) / radius; // 0 to 1

                const dx = mouseX - centerX;
                const dy = mouseY - centerY;

                // Push away (negative direction of delta)
                // Normalize direction and multiply by strength * force
                const moveX = -(dx / dist) * force * strength;
                const moveY = -(dy / dist) * force * strength;

                x.set(moveX);
                y.set(moveY);
            } else {
                // Reset if out of radius
                x.set(0);
                y.set(0);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [radius, strength, x, y]);

    return (
        <motion.div
            ref={ref}
            style={{ x, y }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
