import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';

export interface RadarPing {
  id: string;
  type: 'teammate' | 'enemy' | 'boss';
  x: number;
  z: number;
  name?: string;
  distance?: number;
}

interface TacticalRadarProps {
  pings?: RadarPing[];
  playerPos?: { x: number; y: number; z: number };
  playerYaw?: number;
  isMobile?: boolean;
}

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  pings = [],
  playerPos,
  playerYaw = 0,
  isMobile = false
}) => {
  const [sweepAngle, setSweepAngle] = useState(0);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      setSweepAngle((prev) => (prev + 3) % 360);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const size = isMobile ? 86 : 110;
  const center = size / 2;
  const radius = center - 8;
  const maxRangeMeters = 50;

  // Rotation calculation relative to player heading
  const cosYaw = Math.cos(playerYaw);
  const sinYaw = Math.sin(playerYaw);

  // Compass cardinal points
  const cardinals = [
    { label: 'N', x: 0, z: -maxRangeMeters },
    { label: 'E', x: maxRangeMeters, z: 0 },
    { label: 'S', x: 0, z: maxRangeMeters },
    { label: 'W', x: -maxRangeMeters, z: 0 }
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 3,
        userSelect: 'none'
      }}
    >
      {/* Radar Header Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          borderRadius: 4,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          fontFamily: 'var(--font-display)',
          fontSize: isMobile ? '0.52rem' : '0.62rem',
          fontWeight: 900,
          color: '#38bdf8',
          letterSpacing: 0.5
        }}
      >
        <Radio size={isMobile ? 9 : 11} className="pulse-glow" />
        <span>RADAR 50M</span>
      </div>

      {/* Radar Display Container */}
      <div
        className="glass-panel"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          position: 'relative',
          background: 'radial-gradient(circle, rgba(15, 23, 42, 0.94) 0%, rgba(2, 6, 23, 0.98) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.45)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7), inset 0 0 15px rgba(2, 132, 199, 0.15)',
          overflow: 'hidden'
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* Concentric Range Rings */}
          <circle
            cx={center}
            cy={center}
            r={radius * 0.5}
            fill="none"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="1"
            strokeDasharray="2,3"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1.2"
          />

          {/* Crosshair Axes */}
          <line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center + radius}
            stroke="rgba(56, 189, 248, 0.22)"
            strokeWidth="1"
          />
          <line
            x1={center - radius}
            y1={center}
            x2={center + radius}
            y2={center}
            stroke="rgba(56, 189, 248, 0.22)"
            strokeWidth="1"
          />

          {/* Rotating Scanning Sweep Line */}
          <g transform={`rotate(${sweepAngle} ${center} ${center})`}>
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={center - radius}
              stroke="url(#radarSweepGradient)"
              strokeWidth="2"
            />
          </g>

          <defs>
            <linearGradient id="radarSweepGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0.85)" />
            </linearGradient>
          </defs>

          {/* Compass Points around rim */}
          {cardinals.map((c) => {
            // Rotate world direction by player yaw
            const rx = c.x * cosYaw - c.z * sinYaw;
            const rz = c.x * sinYaw + c.z * cosYaw;
            const len = Math.hypot(rx, rz);
            const rDist = radius - 6;
            const cx = center + (rx / len) * rDist;
            const cy = center + (rz / len) * rDist;
            return (
              <text
                key={c.label}
                x={cx}
                y={cy + 3}
                fill={c.label === 'N' ? '#38bdf8' : '#64748b'}
                fontSize={isMobile ? '7' : '9'}
                fontWeight="900"
                fontFamily="var(--font-display)"
                textAnchor="middle"
              >
                {c.label}
              </text>
            );
          })}

          {/* Radar Blips / Pings */}
          {playerPos &&
            pings.map((p) => {
              const dx = p.x - playerPos.x;
              const dz = p.z - playerPos.z;

              // Rotate by player yaw
              const rx = dx * cosYaw - dz * sinYaw;
              const rz = dx * sinYaw + dz * cosYaw;

              const distMeters = Math.hypot(rx, rz);
              const maxVisualDist = radius - 4;
              const isOutOfBounds = distMeters > maxRangeMeters;
              const clampedRatio = isOutOfBounds ? 1.0 : distMeters / maxRangeMeters;

              const px = center + (rx / (distMeters || 1)) * (clampedRatio * maxVisualDist);
              const py = center + (rz / (distMeters || 1)) * (clampedRatio * maxVisualDist);

              if (p.type === 'teammate') {
                return (
                  <g key={p.id}>
                    {/* Glowing pulse ring */}
                    <circle cx={px} cy={py} r={isMobile ? 5 : 7} fill="rgba(56, 189, 248, 0.25)" />
                    {/* Core blue ping */}
                    <circle cx={px} cy={py} r={isMobile ? 2.5 : 3.5} fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                  </g>
                );
              } else if (p.type === 'boss') {
                return (
                  <g key={p.id}>
                    <polygon
                      points={`${px},${py - 5} ${px + 5},${py} ${px},${py + 5} ${px - 5},${py}`}
                      fill="#facc15"
                      stroke="#000000"
                      strokeWidth="1"
                    />
                  </g>
                );
              } else {
                // Enemy or opposing player
                return (
                  <g key={p.id}>
                    <circle cx={px} cy={py} r={isMobile ? 4 : 5.5} fill="rgba(239, 68, 68, 0.25)" />
                    <circle cx={px} cy={py} r={isMobile ? 2 : 3} fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" />
                  </g>
                );
              }
            })}

          {/* Local Player Icon (Center) with Forward Vision Cone */}
          <polygon
            points={`${center - 4},${center + 4} ${center},${center - 6} ${center + 4},${center + 4} ${center},${center + 2}`}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
};
