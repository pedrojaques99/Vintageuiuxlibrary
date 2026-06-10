import svgPaths from "./svg-3qj1ipvk3n";

function Labels() {
  return (
    <div className="absolute inset-0 font-['Red_Hat_Mono',monospace] font-bold text-[#ffd700] uppercase pt-1" data-name="Labels">
      <p className="-translate-x-1/2 absolute left-[40.5px] top-[-15px] text-[12px] whitespace-nowrap">0</p>
      <p className="-translate-x-1/2 absolute left-[68px] top-[-2px] text-[12px]">1</p>
      <p className="-translate-x-1/2 absolute left-[13px] top-[-2px] text-[12px]">1</p>
      <p className="-translate-x-1/2 absolute left-[82px] top-[26px] text-[12px]">2</p>
      <p className="-translate-x-1/2 absolute left-[-1px] top-[26px] text-[12px]">2</p>
      <p className="-translate-x-1/2 absolute left-[88px] top-[58px] text-[12px] whitespace-nowrap">3</p>
      <p className="-translate-x-1/2 absolute left-[-7px] top-[58px] text-[12px] whitespace-nowrap">3</p>
    </div>
  );
}

function Marks() {
  return (
    <div className="absolute inset-0" data-name="Marks">
      <div className="absolute inset-0" data-name="Marks">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.6488 44.1417">
          <path d={svgPaths.p31917400} fill="#333" id="Marks" />
        </svg>
      </div>
      <Labels />
    </div>
  );
}

function Dial({ rotation = 0 }: { rotation?: number }) {
  return (
    <div 
      className="absolute h-[42px] w-[42px] left-[19.5px] top-[18.2px] transition-transform duration-75" 
      style={{ transform: `rotate(${rotation}deg)` }}
      data-name="Dial"
    >
      <div className="absolute inset-[-9.31%_-20.96%_-38.24%_-20.73%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.5859 50.1592">
          <g id="Dial">
            <circle cx="23.2541" cy="19.6056" fill="url(#paint0_dial_r)" id="Base" r="16.2343" stroke="url(#paint1_dial_l)" strokeWidth="0.410341" />
            <circle cx="22.2931" cy="22.8663" fill="url(#paint3_dial_r)" id="Front" r="14.1931" stroke="url(#paint4_dial_l)" strokeWidth="0.2" />
            <g id="Mark">
                <rect fill="#ffd700" height="6.10427" width="1.21356" x="21.6702" y="8.54028" />
            </g>
          </g>
          <defs>
            <radialGradient cx="0" cy="0" gradientTransform="translate(18.8631 27.2155) rotate(-62.354) scale(21.4641 24.2694)" gradientUnits="userSpaceOnUse" id="paint0_dial_r" r="1">
              <stop offset="0.279912" stopColor="#424344" />
              <stop offset="0.845073" stopColor="#16171B" />
            </radialGradient>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint1_dial_l" x1="23.2541" x2="23.2541" y1="3.1662" y2="36.045">
              <stop />
              <stop offset="1" stopColor="#909090" />
            </linearGradient>
            <radialGradient cx="0" cy="0" gradientTransform="translate(19.1824 14.4709) rotate(82.1932) scale(22.9008)" gradientUnits="userSpaceOnUse" id="paint3_dial_r" r="1">
              <stop offset="0.0390484" stopColor="#878584" />
              <stop offset="1" stopColor="#33322F" />
            </radialGradient>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint4_dial_l" x1="14.7551" x2="24.8845" y1="10.9653" y2="38.2839">
              <stop stopColor="#EFEFEF" />
              <stop offset="0.569707" stopColor="#343333" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export default function Knob({ rotation = 0 }: { rotation?: number }) {
  return (
    <div className="relative w-[81px] h-[75px] mx-auto" data-name="KNOB 1">
      <Marks />
      <Dial rotation={rotation} />
    </div>
  );
}