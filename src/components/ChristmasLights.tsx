import React, { useState, useEffect, useRef } from "react";

interface Bulb {
  id: number;
  x: number;
  y: number;
  rotation: number;
  isRed: boolean;
  isTail: boolean;
}

// Generate chaotic bulb positions
const generateBulbs = (): Bulb[] => {
  const bulbs: Bulb[] = [];
  let id = 0;

  // Main wrap bulbs - diagonal chaos across the header
  // Wire 1: top-left to bottom-right diagonal
  for (let i = 0; i < 12; i++) {
    const progress = i / 11;
    bulbs.push({
      id: id++,
      x: 50 + progress * 700 + (Math.random() - 0.5) * 40,
      y: 15 + progress * 50 + (Math.random() - 0.5) * 20,
      rotation: (Math.random() - 0.5) * 30,
      isRed: i % 2 === 0,
      isTail: false,
    });
  }

  // Wire 2: bottom-left to top-right diagonal (crossing)
  for (let i = 0; i < 10; i++) {
    const progress = i / 9;
    bulbs.push({
      id: id++,
      x: 80 + progress * 640 + (Math.random() - 0.5) * 35,
      y: 65 - progress * 45 + (Math.random() - 0.5) * 15,
      rotation: (Math.random() - 0.5) * 25,
      isRed: i % 2 === 1,
      isTail: false,
    });
  }

  // Wire 3: another sloppy diagonal
  for (let i = 0; i < 8; i++) {
    const progress = i / 7;
    bulbs.push({
      id: id++,
      x: 120 + progress * 560 + (Math.random() - 0.5) * 50,
      y: 40 + Math.sin(progress * Math.PI) * 25 + (Math.random() - 0.5) * 18,
      rotation: (Math.random() - 0.5) * 35,
      isRed: i % 2 === 0,
      isTail: false,
    });
  }

  // Left tail (shorter - 3 bulbs dangling off the "L")
  for (let i = 0; i < 3; i++) {
    bulbs.push({
      id: id++,
      x: 25 + (Math.random() - 0.5) * 15,
      y: 45 + i * 22 + Math.random() * 10,
      rotation: -15 + Math.random() * 20,
      isRed: i % 2 === 0,
      isTail: true,
    });
  }

  // Right tail (longer - 5 bulbs dangling off the "™")
  for (let i = 0; i < 5; i++) {
    bulbs.push({
      id: id++,
      x: 775 + (Math.random() - 0.5) * 20,
      y: 35 + i * 18 + Math.random() * 8,
      rotation: 10 + Math.random() * 25,
      isRed: i % 2 === 1,
      isTail: true,
    });
  }

  return bulbs;
};

export const ChristmasLights = () => {
  const [bulbs] = useState<Bulb[]>(() => generateBulbs());
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
    <div className="pointer-events-none absolute inset-x-0 -top-6 md:-top-8 flex justify-center z-[5]">
      <svg
        width="100%"
        height="140"
        viewBox="0 0 800 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible max-w-4xl"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Wire 1: diagonal top-left to bottom-right */}
        <path
          d="M20 20 Q200 35, 400 45 T780 70"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2.5"
          fill="none"
          opacity="0.5"
        />
        
        {/* Wire 2: diagonal bottom-left to top-right */}
        <path
          d="M60 70 Q300 50, 500 30 T750 25"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2.5"
          fill="none"
          opacity="0.5"
        />
        
        {/* Wire 3: messy middle wrap */}
        <path
          d="M100 45 Q250 60, 400 35 Q550 15, 720 50"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2.5"
          fill="none"
          opacity="0.5"
        />

        {/* Left dangling tail wire */}
        <path
          d="M50 25 Q30 50, 35 110"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />

        {/* Right dangling tail wire (longer) */}
        <path
          d="M760 30 Q785 60, 775 130"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />

        {/* Bulbs */}
        {bulbs.map((bulb, index) => {
          const isOn = bulbStates[index];
          
          return (
            <g 
              key={bulb.id} 
              transform={`translate(${bulb.x}, ${bulb.y}) rotate(${bulb.rotation})`}
            >
              {/* Glow (only when ON) */}
              {isOn && (
                <circle
                  cx="0"
                  cy="0"
                  r="12"
                  className={bulb.isRed ? "christmas-glow-red-on" : "christmas-glow-green-on"}
                />
              )}
              
              {/* Bulb cap */}
              <rect
                x="-3"
                y="-14"
                width="6"
                height="6"
                fill="hsl(var(--muted-foreground))"
                opacity="0.7"
                rx="1"
              />
              
              {/* Bulb body */}
              <ellipse
                cx="0"
                cy="0"
                rx="6"
                ry="8"
                className={
                  isOn 
                    ? (bulb.isRed ? "christmas-bulb-red-on" : "christmas-bulb-green-on")
                    : "christmas-bulb-off"
                }
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
