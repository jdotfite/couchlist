'use client';

import { useId, useMemo } from 'react';

type FilmReelSpinnerProps = {
  fullScreen?: boolean;
  size?: number;
  className?: string;
};

export default function FilmReelSpinner({
  fullScreen = false,
  size = 115,
  className = '',
}: FilmReelSpinnerProps) {
  const maskId = useId();

  const round = (value: number) => Number(value.toFixed(3));

  const generateSpiralPath = () => {
    const turns = 15;
    const rOuter = 38;
    const rInner = 3;
    const totalPoints = 2000;
    const points: string[] = [];

    for (let i = 0; i <= totalPoints; i += 1) {
      const u = i / totalPoints;
      const angle = u * turns * Math.PI * 2 - Math.PI / 2;
      const radius = rOuter - (rOuter - rInner) * u;
      const x = round(50 + Math.cos(angle) * radius);
      const y = round(50 + Math.sin(angle) * radius);
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return points.join(' ');
  };

  const spiralPath = useMemo(() => generateSpiralPath(), []);
  const wrapperClass = fullScreen
    ? `min-h-screen bg-black flex items-center justify-center ${className}`
    : `flex items-center justify-center ${className}`;

  return (
    <div className={wrapperClass}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <mask id={maskId}>
              <rect width="100" height="100" fill="white" />
              {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x = round(50 + 28 * Math.cos(rad));
                const y = round(50 + 28 * Math.sin(rad));
                return <circle key={i} cx={x} cy={y} r="11" fill="black" />;
              })}
              <circle cx="50" cy="50" r="7" fill="black" />
            </mask>
          </defs>

          <path
            d={spiralPath}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="film-reel-spiral"
            pathLength="1000"
          />

          <circle cx="50" cy="50" r="45" fill="white" mask={`url(#${maskId})`} />
          <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="5" />
          <circle cx="50" cy="50" r="4" fill="white" />
        </svg>
      </div>
    </div>
  );
}
