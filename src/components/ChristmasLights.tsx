import React, { useState, useEffect, useRef } from "react";

interface Bulb {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: 'red' | 'green' | 'tungsten';
  layer: 'front' | 'back';
  isTail: boolean;
}

// Generate candy-cane spiral bulb positions - wrapping around the text
const generateBulbs = (): Bulb[] => {
  const bulbs: Bulb[] = [];
  let id = 0;
  const colors: ('red' | 'green' | 'tungsten')[] = ['red', 'green', 'tungsten'];

  // Create THREE HORIZONTAL BANDS of diagonal spiral paths to cover entire header
  // Each band alternates between front and back to create wrapping illusion
  const spiralPaths = [
    // UPPER BAND - crossing through top of letters (Y: ~25-45 → Y: ~-40 to -20)
    { startX: -30, startY: 30, endX: 180, endY: -35, layer: 'back' as const },
    { startX: 90, startY: 40, endX: 300, endY: -25, layer: 'front' as const },
    { startX: 210, startY: 35, endX: 440, endY: -30, layer: 'back' as const },
    { startX: 350, startY: 45, endX: 560, endY: -20, layer: 'front' as const },
    { startX: 470, startY: 30, endX: 680, endY: -35, layer: 'back' as const },
    { startX: 590, startY: 40, endX: 820, endY: -25, layer: 'front' as const },
    
    // MIDDLE BAND - crossing through center of letters (Y: ~65-85 → Y: ~15-35)
    { startX: -20, startY: 70, endX: 190, endY: 20, layer: 'front' as const },
    { startX: 100, startY: 80, endX: 320, endY: 30, layer: 'back' as const },
    { startX: 230, startY: 75, endX: 460, endY: 25, layer: 'front' as const },
    { startX: 370, startY: 85, endX: 580, endY: 35, layer: 'back' as const },
    { startX: 490, startY: 70, endX: 700, endY: 20, layer: 'front' as const },
    { startX: 610, startY: 80, endX: 830, endY: 30, layer: 'back' as const },
    
    // LOWER BAND - crossing through bottom of letters (Y: ~105-125 → Y: ~55-75)
    { startX: -10, startY: 110, endX: 200, endY: 60, layer: 'back' as const },
    { startX: 110, startY: 120, endX: 330, endY: 70, layer: 'front' as const },
    { startX: 250, startY: 115, endX: 480, endY: 65, layer: 'back' as const },
    { startX: 390, startY: 125, endX: 600, endY: 75, layer: 'front' as const },
    { startX: 510, startY: 110, endX: 720, endY: 60, layer: 'back' as const },
    { startX: 630, startY: 120, endX: 850, endY: 70, layer: 'front' as const },
  ];

  spiralPaths.forEach((path, pathIndex) => {
    const bulbsPerPath = 5 + Math.floor(Math.random() * 3); // 5-7 bulbs per path
    
    for (let i = 0; i < bulbsPerPath; i++) {
      const progress = i / (bulbsPerPath - 1);
      const baseX = path.startX + (path.endX - path.startX) * progress;
      const baseY = path.startY + (path.endY - path.startY) * progress;
      
      bulbs.push({
        id: id++,
        x: baseX + (Math.random() - 0.5) * 30,
        y: baseY + (Math.random() - 0.5) * 20,
        rotation: (Math.random() - 0.5) * 40,
        color: colors[(id + pathIndex) % 3],
        layer: path.layer,
        isTail: false,
      });
    }
  });

  // Left dangling tail (3 bulbs - shorter)
  for (let i = 0; i < 3; i++) {
    bulbs.push({
      id: id++,
      x: -10 + (Math.random() - 0.5) * 15,
      y: 60 + i * 25 + Math.random() * 12,
      rotation: -20 + Math.random() * 25,
      color: colors[i % 3],
      layer: 'front',
      isTail: true,
    });
  }

  // Right dangling tail (5 bulbs - longer)
  for (let i = 0; i < 5; i++) {
    bulbs.push({
      id: id++,
      x: 820 + (Math.random() - 0.5) * 20,
      y: 45 + i * 22 + Math.random() * 10,
      rotation: 15 + Math.random() * 30,
      color: colors[(i + 1) % 3],
      layer: 'front',
      isTail: true,
    });
  }

  return bulbs;
};

// Generate wire paths for candy-cane spiral effect - THREE BANDS
const generateWirePaths = () => [
  // UPPER BAND wires
  { d: "M-40 35 Q75 0, 190 -30", layer: 'back' as const },
  { d: "M80 45 Q195 5, 310 -20", layer: 'front' as const },
  { d: "M200 40 Q325 0, 450 -25", layer: 'back' as const },
  { d: "M340 50 Q455 10, 570 -15", layer: 'front' as const },
  { d: "M460 35 Q575 -5, 690 -30", layer: 'back' as const },
  { d: "M580 45 Q705 5, 830 -20", layer: 'front' as const },
  
  // MIDDLE BAND wires
  { d: "M-30 75 Q85 45, 200 25", layer: 'front' as const },
  { d: "M90 85 Q215 50, 330 35", layer: 'back' as const },
  { d: "M220 80 Q355 45, 470 30", layer: 'front' as const },
  { d: "M360 90 Q485 55, 590 40", layer: 'back' as const },
  { d: "M480 75 Q605 40, 710 25", layer: 'front' as const },
  { d: "M600 85 Q725 50, 840 35", layer: 'back' as const },
  
  // LOWER BAND wires
  { d: "M-20 115 Q95 85, 210 65", layer: 'back' as const },
  { d: "M100 125 Q225 90, 340 75", layer: 'front' as const },
  { d: "M240 120 Q375 85, 490 70", layer: 'back' as const },
  { d: "M380 130 Q505 95, 610 80", layer: 'front' as const },
  { d: "M500 115 Q625 80, 730 65", layer: 'back' as const },
  { d: "M620 125 Q755 90, 860 75", layer: 'front' as const },
  
  // Left tail wire
  { d: "M30 50 Q-5 90, 0 165", layer: 'front' as const },
  // Right tail wire  
  { d: "M800 40 Q830 80, 825 185", layer: 'front' as const },
];

const BulbSVG = ({ 
  bulb, 
  isOn 
}: { 
  bulb: Bulb; 
  isOn: boolean;
}) => {
  const colorClass = bulb.color === 'red' 
    ? 'christmas-bulb-red-on' 
    : bulb.color === 'green' 
      ? 'christmas-bulb-green-on' 
      : 'christmas-bulb-tungsten-on';
  
  const glowClass = bulb.color === 'red'
    ? 'christmas-glow-red-on'
    : bulb.color === 'green'
      ? 'christmas-glow-green-on'
      : 'christmas-glow-tungsten-on';

  return (
    <g transform={`translate(${bulb.x}, ${bulb.y}) rotate(${bulb.rotation})`}>
      {/* Glow (only when ON) - 20% smaller: was r=12, now r=9.6 */}
      {isOn && (
        <circle
          cx="0"
          cy="0"
          r="9.6"
          className={glowClass}
        />
      )}
      
      {/* Bulb cap - 20% smaller: was 6x6, now 4.8x4.8 */}
      <rect
        x="-2.4"
        y="-11.2"
        width="4.8"
        height="4.8"
        fill="hsl(var(--muted-foreground))"
        opacity="0.7"
        rx="0.8"
      />
      
      {/* Bulb body - 20% smaller: was rx=6,ry=8, now rx=4.8,ry=6.4 */}
      <ellipse
        cx="0"
        cy="0"
        rx="4.8"
        ry="6.4"
        className={isOn ? colorClass : "christmas-bulb-off"}
      />
    </g>
  );
};

interface ChristmasLightsLayerProps {
  bulbs: Bulb[];
  bulbStates: boolean[];
  layer: 'front' | 'back';
  wirePaths: { d: string; layer: 'front' | 'back' }[];
}

const ChristmasLightsLayer = ({ bulbs, bulbStates, layer, wirePaths }: ChristmasLightsLayerProps) => {
  const layerBulbs = bulbs.filter(b => b.layer === layer);
  const layerWires = wirePaths.filter(w => w.layer === layer);

  return (
    <svg
      width="100%"
      height="180"
      viewBox="0 0 800 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible absolute inset-0"
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: 'none' }}
    >
      {/* Wire paths for this layer */}
      {layerWires.map((wire, i) => (
        <path
          key={i}
          d={wire.d}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />
      ))}

      {/* Bulbs for this layer */}
      {layerBulbs.map((bulb) => {
        const originalIndex = bulbs.findIndex(b => b.id === bulb.id);
        return (
          <BulbSVG 
            key={bulb.id} 
            bulb={bulb} 
            isOn={bulbStates[originalIndex]} 
          />
        );
      })}
    </svg>
  );
};

export const ChristmasLightsBack = ({ bulbs, bulbStates, wirePaths }: { 
  bulbs: Bulb[]; 
  bulbStates: boolean[];
  wirePaths: { d: string; layer: 'front' | 'back' }[];
}) => (
  <div className="absolute inset-0 z-[5]">
    <ChristmasLightsLayer bulbs={bulbs} bulbStates={bulbStates} layer="back" wirePaths={wirePaths} />
  </div>
);

export const ChristmasLightsFront = ({ bulbs, bulbStates, wirePaths }: { 
  bulbs: Bulb[]; 
  bulbStates: boolean[];
  wirePaths: { d: string; layer: 'front' | 'back' }[];
}) => (
  <div className="absolute inset-0 z-[15]">
    <ChristmasLightsLayer bulbs={bulbs} bulbStates={bulbStates} layer="front" wirePaths={wirePaths} />
  </div>
);

export const ChristmasLights = () => {
  const [bulbs] = useState<Bulb[]>(() => generateBulbs());
  const [wirePaths] = useState(() => generateWirePaths());
  const [bulbStates, setBulbStates] = useState<boolean[]>(() => 
    new Array(bulbs.length).fill(false)
  );
  const [phase, setPhase] = useState<'dark' | 'flickering' | 'hold' | 'dance'>('dark');
  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Phase 1: Darkness for 1 second
    const darkTimeout = setTimeout(() => {
      setPhase('flickering');
    }, 1000);

    return () => {
      clearTimeout(darkTimeout);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Phase 2: Chaotic flicker-on
  useEffect(() => {
    if (phase !== 'flickering') return;

    const flickerDuration = 1500 + Math.random() * 500; // 1.5-2s
    const startTime = Date.now();

    const flicker = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed < flickerDuration) {
        setBulbStates(prev => 
          prev.map((_, i) => {
            // Gradually increase chance of being ON as time progresses
            const onChance = 0.1 + (elapsed / flickerDuration) * 0.6;
            if (Math.random() < 0.3) {
              return Math.random() < onChance;
            }
            return prev[i];
          })
        );
        animationRef.current = requestAnimationFrame(flicker);
      } else {
        // All ON
        setBulbStates(new Array(bulbs.length).fill(true));
        setPhase('hold');
      }
    };

    flicker();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, bulbs.length]);

  // Phase 3: Hold for 1 second then dance
  useEffect(() => {
    if (phase !== 'hold') return;

    const holdTimeout = setTimeout(() => {
      setPhase('dance');
    }, 1000);

    return () => clearTimeout(holdTimeout);
  }, [phase]);

  // Phase 4: Dance mode forever
  useEffect(() => {
    if (phase !== 'dance') return;

    intervalRef.current = setInterval(() => {
      setBulbStates(prev => 
        prev.map(isOn => {
          // ~18% chance to toggle each bulb
          if (Math.random() < 0.18) {
            return !isOn;
          }
          return isOn;
        })
      );
    }, 160 + Math.random() * 40); // 160-200ms

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  return (
    <>
      <ChristmasLightsBack bulbs={bulbs} bulbStates={bulbStates} wirePaths={wirePaths} />
      <ChristmasLightsFront bulbs={bulbs} bulbStates={bulbStates} wirePaths={wirePaths} />
    </>
  );
};
