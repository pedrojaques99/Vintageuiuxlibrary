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
        className="cursor-pointer transition-transform duration-100 hover:brightness-110 relative w-[300px] h-[300px]"
      >
        {/* Static Background Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#111] shadow-2xl border border-[#333]" />
        
        {/* Static Tick marks */}
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
                backgroundColor: isMajor ? '#ffd700' : '#444',
                transform: `rotate(${angle}deg)`,
                transformOrigin: `50% ${150 - 25}px`,
              }}
            />
          );
        })}

        {/* Rotating Dial Assembly */}
        <div 
          className="absolute inset-[35px] transition-transform duration-75"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Main knob surface */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2a2a2a] via-[#333] to-[#1a1a1a] shadow-[0_8px_16px_rgba(0,0,0,0.6)] border border-[#444]" />

          {/* Indicator marker */}
          <div className="absolute left-1/2 top-[20px] -ml-[7px] w-[14px] h-[14px] rounded-full bg-[#ffd700] shadow-[0_0_10px_rgba(255,215,0,0.3)]" />
          
          {/* Center cap piece */}
          <div className="absolute inset-[65px] rounded-full bg-gradient-to-br from-[#222] to-[#111] shadow-inner border border-[#333]" />
        </div>
      </div>

      {/* Control Labels (Static) */}
      <div className="text-center mt-10 space-y-2">
        <div className="text-[#ffd700] text-3xl font-heading font-black tracking-widest uppercase">
          {label}
        </div>
        <div className="text-[#888] text-2xl font-mono font-bold tracking-widest">
          {currentValue.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
