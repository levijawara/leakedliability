import React from "react";

export const ChristmasLights = () => {
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-4 md:-top-6 flex justify-center z-[5]">
      <svg
        width="100%"
        height="80"
        viewBox="0 0 800 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible max-w-4xl"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Wire */}
        <path
          d="M0 20 C200 60, 600 -20, 800 40"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="3"
          fill="none"
          opacity="0.6"
        />

        {/* Bulbs */}
        {Array.from({ length: 18 }).map((_, i) => {
          const x = 40 + i * 42;
          const y = 20 + Math.sin(i * 0.5) * 15;
          const isRed = i % 2 === 0;

          return (
            <g key={i}>
              {/* bulb glow */}
              <circle
                cx={x}
                cy={y}
                r="14"
                className={isRed ? "christmas-glow-red" : "christmas-glow-green"}
              />
              {/* bulb core */}
              <circle
                cx={x}
                cy={y}
                r="8"
                className={isRed ? "christmas-bulb-red" : "christmas-bulb-green"}
              />
              {/* bulb cap */}
              <rect
                x={x - 3}
                y={y - 12}
                width="6"
                height="5"
                fill="hsl(var(--muted-foreground))"
                opacity="0.8"
                rx="1"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
