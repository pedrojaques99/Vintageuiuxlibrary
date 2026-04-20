import { useState, useEffect } from 'react';
import { InteractiveKnob } from './components/InteractiveKnob';
import { VintageMeter } from './components/VintageMeter';
import { VintageButton } from './components/VintageButton';
import { VintageSlider } from './components/VintageSlider';
import { SimpleToggle } from './components/SimpleToggle';
import { SimpleLargeKnob } from './components/SimpleLargeKnob';
import { InteractiveSliders } from './components/InteractiveSliders';

export default function App() {
  const [bassValue, setBassValue] = useState(5);
  const [trebleValue, setTrebleValue] = useState(5);
  const [gainValue, setGainValue] = useState(5);
  const [meterValue, setMeterValue] = useState(5);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [volumeValue, setVolumeValue] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setMeterValue(prev => {
        const random = Math.random() * 2 - 1;
        return Math.max(0, Math.min(10, prev + random));
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-['Orbitron',sans-serif] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#f0e68c] via-[#ffd700] to-[#f0e68c] mb-2 tracking-wider">
            VINTAGE UI
          </h1>
          <p className="text-[#888] font-['Red_Hat_Mono',monospace] text-sm tracking-widest">
            RETRO AUDIO CONTROL LIBRARY
          </p>
          <div className="mt-4 flex justify-center gap-1">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-[#333] rounded-full" />
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <section className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#333] shadow-2xl">
            <h2 className="text-xl font-['Orbitron',sans-serif] text-[#f0e68c] mb-6 tracking-wider">
              ROTARY CONTROLS
            </h2>
            <div className="flex justify-around items-center gap-8">
              <div className="text-center">
                <InteractiveKnob
                  label="BASS"
                  value={bassValue}
                  onChange={setBassValue}
                />
                <p className="text-[#666] text-xs mt-2 font-['Red_Hat_Mono',monospace]">-10dB to +10dB</p>
              </div>
              <div className="text-center">
                <InteractiveKnob
                  label="TREBLE"
                  value={trebleValue}
                  onChange={setTrebleValue}
                />
                <p className="text-[#666] text-xs mt-2 font-['Red_Hat_Mono',monospace]">-10dB to +10dB</p>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#333] shadow-2xl">
            <h2 className="text-xl font-['Orbitron',sans-serif] text-[#f0e68c] mb-6 tracking-wider">
              VU METER
            </h2>
            <div className="flex justify-center">
              <VintageMeter label="SIGNAL" value={meterValue} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#333] shadow-2xl">
            <h2 className="text-xl font-['Orbitron',sans-serif] text-[#f0e68c] mb-6 tracking-wider">
              PUSH BUTTONS
            </h2>
            <div className="flex justify-around items-center">
              <VintageButton
                label="POWER"
                active={activeButton === 'power'}
                onClick={() => setActiveButton(activeButton === 'power' ? null : 'power')}
              />
              <VintageButton
                label="BYPASS"
                active={activeButton === 'bypass'}
                onClick={() => setActiveButton(activeButton === 'bypass' ? null : 'bypass')}
              />
              <VintageButton
                label="MUTE"
                active={activeButton === 'mute'}
                onClick={() => setActiveButton(activeButton === 'mute' ? null : 'mute')}
              />
            </div>
          </section>

          <section className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#333] shadow-2xl">
            <h2 className="text-xl font-['Orbitron',sans-serif] text-[#f0e68c] mb-6 tracking-wider">
              FADER CONTROL
            </h2>
            <div className="flex justify-center">
              <VintageSlider
                label="GAIN"
                value={gainValue}
                onChange={setGainValue}
              />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          <section className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#333] shadow-2xl">
            <h2 className="text-xl font-['Orbitron',sans-serif] text-[#f0e68c] mb-6 tracking-wider">
              LARGE KNOB
            </h2>
            <div className="flex justify-center">
              <SimpleLargeKnob
                label="VOLUME"
                value={volumeValue}
                onChange={setVolumeValue}
              />
            </div>
          </section>

          <section className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#333] shadow-2xl">
            <h2 className="text-xl font-['Orbitron',sans-serif] text-[#f0e68c] mb-6 tracking-wider">
              3-WAY TOGGLE
            </h2>
            <div className="flex justify-center items-center h-full">
              <SimpleToggle />
            </div>
          </section>
        </div>

        <div className="mt-12">
          <section className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#333] shadow-2xl">
            <div className="flex justify-center">
              <InteractiveSliders />
            </div>
          </section>
        </div>

        <footer className="mt-16 text-center">
          <div className="inline-block bg-[#1a1a1a] border border-[#333] rounded-lg px-8 py-4">
            <p className="text-[#666] font-['Red_Hat_Mono',monospace] text-xs tracking-widest">
              EST. 2026 | INTERACTIVE COMPONENTS | DRAG KNOBS & SLIDERS TO ADJUST | CLICK TOGGLE & BUTTONS
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}