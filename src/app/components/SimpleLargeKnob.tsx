import { useState, useRef, useEffect } from 'react';

export function SimpleLargeKnob({
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
        className="cursor-pointer transition-transform duration-100 hover:scale-105 relative"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="w-[300px] h-[300px] relative">
          {/* Outer ring with gradient */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6a6a6a] via-[#9a9a9a] to-[#5a5a5a] shadow-2xl" />

          {/* Inner groove */}
          <div className="absolute inset-[20px] rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#3a3a3a] shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]" />

          {/* Main knob surface */}
          <div className="absolute inset-[35px] rounded-full bg-gradient-to-br from-[#d0d0d0] via-[#f0f0f0] to-[#b0b0b0] shadow-[0_8px_16px_rgba(0,0,0,0.4)]" />

          {/* Center circle */}
          <div className="absolute inset-[100px] rounded-full bg-gradient-to-br from-[#e0e0e0] to-[#c0c0c0] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />

          {/* Tick marks */}
          {[...Array(13)].map((_, i) => {
            const angle = -135 + (i / 12) * 270;
            const isMajor = i % 3 === 0;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-[25px] -ml-px"
                style={{
                  width: isMajor ? '4px' : '2px',
                  height: isMajor ? '20px' : '12px',
                  backgroundColor: '#5c5c5c',
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: `50% ${150 - 25}px`,
                  opacity: isMajor ? 1 : 0.6
                }}
              />
            );
          })}

          {/* Indicator marker */}
          <div className="absolute left-1/2 top-[45px] -ml-[7px] w-[14px] h-[14px] rounded-full bg-[#5c5c5c] shadow-md" />
        </div>
      </div>
      <div className="text-center mt-6 space-y-1">
        <div className="text-[#5c5c5c] text-2xl font-['Helvetica',sans-serif] font-bold">
          {label}
        </div>
        <div className="text-[#888] text-lg font-['Red_Hat_Mono',monospace]">
          {currentValue.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
