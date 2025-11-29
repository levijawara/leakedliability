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

// Generate bulb positions along 5 full-width sagging curves
const generateBulbs = (): Bulb[] => {
  const bulbs: Bulb[] = [];
  let id = 0;
  const colors: ('red' | 'green' | 'tungsten')[] = ['red', 'green', 'tungsten'];

  // 5 full-width sagging wire paths - like real draped Christmas lights
  const sagPaths = [
    { startX: -30, startY: 15, controlY: 55, endX: 830, endY: 20, layer: 'back' as const },
    { startX: -25, startY: 35, controlY: 85, endX: 825, endY: 40, layer: 'front' as const },
    { startX: -20, startY: 55, controlY: 110, endX: 820, endY: 60, layer: 'back' as const },
    { startX: -15, startY: 75, controlY: 135, endX: 815, endY: 80, layer: 'front' as const },
    { startX: -10, startY: 95, controlY: 155, endX: 810, endY: 100, layer: 'back' as const },
  ];

  // Helper to get Y position on a quadratic bezier curve
  const getQuadraticY = (t: number, startY: number, controlY: number, endY: number) => {
    return (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
  };

  sagPaths.forEach((path, pathIndex) => {
    const bulbsPerPath = 9 + Math.floor(Math.random() * 3); // 9-11 bulbs per wire
    
    for (let i = 0; i < bulbsPerPath; i++) {
      const t = i / (bulbsPerPath - 1);
      const baseX = path.startX + (path.endX - path.startX) * t;
      const baseY = getQuadraticY(t, path.startY, path.controlY, path.endY);
      
      bulbs.push({
        id: id++,
        x: baseX + (Math.random() - 0.5) * 20,
        y: baseY + (Math.random() - 0.5) * 12,
        rotation: (Math.random() - 0.5) * 35,
        color: colors[(id + pathIndex) % 3],
        layer: path.layer,
        isTail: false,
      });
    }
  });

  // Left dangling tail (4 bulbs)
  for (let i = 0; i < 4; i++) {
    bulbs.push({
      id: id++,
      x: -15 + (Math.random() - 0.5) * 12,
      y: 50 + i * 28 + Math.random() * 10,
      rotation: -15 + Math.random() * 20,
      color: colors[i % 3],
      layer: 'front',
      isTail: true,
    });
  }

  // Right dangling tail (5 bulbs)
  for (let i = 0; i < 5; i++) {
    bulbs.push({
      id: id++,
      x: 815 + (Math.random() - 0.5) * 15,
      y: 45 + i * 25 + Math.random() * 10,
      rotation: 12 + Math.random() * 25,
      color: colors[(i + 1) % 3],
      layer: 'front',
      isTail: true,
    });
  }

  return bulbs;
};

// Generate wire paths - 5 full-width sagging curves like real draped lights
const generateWirePaths = () => [
  // 5 sagging wires spanning full width - each sags in the middle
  { d: "M-30 15 Q400 55, 830 20", layer: 'back' as const },
  { d: "M-25 35 Q400 85, 825 40", layer: 'front' as const },
  { d: "M-20 55 Q400 110, 820 60", layer: 'back' as const },
  { d: "M-15 75 Q400 135, 815 80", layer: 'front' as const },
  { d: "M-10 95 Q400 155, 810 100", layer: 'back' as const },
  
  // Left tail wire
  { d: "M-20 50 Q-30 100, -15 170", layer: 'front' as const },
  // Right tail wire  
  { d: "M815 45 Q835 100, 820 180", layer: 'front' as const },
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
