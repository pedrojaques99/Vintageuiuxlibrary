import { useState, useRef, useEffect } from 'react';
import Knob from '../../imports/Knob';

export function InteractiveLargeKnob({
  label = "VOLUME",
  min = 0,
  max = 10,
  value = 5,
  onChange
}: {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  onChange?: (value: number) => void;
}) {
  const [currentValue, setCurrentValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);

  const rotation = -135 + ((currentValue - min) / (max - min)) * 270;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = lastY.current - e.clientY;
      lastY.current = e.clientY;

      const sensitivity = 0.015;
      const delta = deltaY * sensitivity * (max - min);

      setCurrentValue(prev => {
        const newValue = Math.max(min, Math.min(max, prev + delta));
        onChange?.(newValue);
        return newValue;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastY.current = e.clientY;
  };

  return (
    <div className="relative inline-block select-none">
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className="cursor-pointer transition-transform duration-100 hover:brightness-110"
      >
        <div className="w-[318px] h-[318px]">
          <Knob rotation={rotation} />
        </div>
      </div>
      <div className="text-center mt-6 space-y-2">
        <div className="text-[#ffd700] text-3xl font-heading font-black tracking-widest uppercase">
          {label}
        </div>
        <div className="text-[#888] text-xl font-mono font-bold tracking-widest">
          {currentValue.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
