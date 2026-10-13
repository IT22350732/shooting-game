import React, { useEffect, useState, useMemo } from 'react';
import { Radio } from 'lucide-react';
import { RadarPing } from './multiplayer/TacticalRadar';

export interface ArenaBuildingInfo {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotY: number;
  doorX: number;
  doorZ: number;
  isDoorOpen?: boolean;
}

interface ArenaMiniMapProps {
  pings?: RadarPing[];
  playerPos?: { x: number; y: number; z: number };
  playerYaw?: number;
  buildings?: ArenaBuildingInfo[];
  arenaSize?: number;
  isMobile?: boolean;
}

export const ArenaMiniMap: React.FC<ArenaMiniMapProps> = ({
  pings = [],
  playerPos = { x: 0, y: 0, z: 0 },
  playerYaw = 0,
  buildings = [],
  arenaSize = 130,
  isMobile = false
}) => {
  const [sweepAngle, setSweepAngle] = useState(0);

  // Smooth radar beam sweep animation
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setSweepAngle((prev) => (prev + 2.5) % 360);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Dimensions: 1:1 square display framing strictly inside the 4 arena walls
  const mapWidth = isMobile ? 175 : 250;
  const mapHeight = isMobile ? 175 : 250;
  const cx = mapWidth / 2;
  const cy = mapHeight / 2;

  // Margin padding for perimeter wall border
  const pad = 4;
  const innerDim = mapWidth - pad * 2;
  const half = arenaSize / 2;
  const scale = innerDim / arenaSize;

  // Active enemies count
  const enemyCount = useMemo(() => {
    return pings.filter((p) => p.type === 'enemy' || p.type === 'boss').length;
  }, [pings]);

  // World to SVG Coordinate Conversion strictly inside the 4 arena walls:
  // West (-X) -> Left, East (+X) -> Right
  // Forward (+Z) -> Top, Backward (-Z) -> Bottom
  const worldToSvg = (wx: number, wz: number): { x: number; y: number; isVisible: boolean } => {
    const sx = pad + (wx + half) * scale;
    const sy = pad + (half - wz) * scale;
    const isVisible = sx >= 0 && sx <= mapWidth && sy >= 0 && sy <= mapHeight;
    return { x: sx, y: sy, isVisible };
  };

  // Convert building corners to SVG polygon points
  const getBuildingPolygon = (b: ArenaBuildingInfo): string => {
    const hw = b.width / 2;
    const hd = b.depth / 2;
    const cosR = Math.cos(b.rotY);
    const sinR = Math.sin(b.rotY);

    const corners = [
      { lx: -hw, lz: -hd },
      { lx: hw, lz: -hd },
      { lx: hw, lz: hd },
      { lx: -hw, lz: hd }
    ];

    const pts = corners.map((c) => {
      // Three.js right-handed rotation around Y:
      // x' = x*cos + z*sin, z' = -x*sin + z*cos
      const rx = c.lx * cosR + c.lz * sinR;
      const rz = -c.lx * sinR + c.lz * cosR;
      const wx = b.x + rx;
      const wz = b.z + rz;
      const svg = worldToSvg(wx, wz);
      return `${svg.x.toFixed(1)},${svg.y.toFixed(1)}`;
    });

    return pts.join(' ');
  };

  return (
    <div
      className="glass-panel"
      style={{
        width: mapWidth,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(34, 197, 94, 0.35)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.10), 0 1px 3px rgba(15, 23, 42, 0.05)',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        userSelect: 'none',
        pointerEvents: 'auto',
        fontFamily: 'var(--font-display)'
      }}
    >
      {/* HEADER BAR (LIGHT THEME) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '4px 8px' : '6px 12px',
          background: 'rgba(248, 250, 252, 0.94)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.20)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Radio size={isMobile ? 12 : 14} color="#16a34a" className="pulse-glow" />
          <span
            style={{
              fontSize: isMobile ? '0.62rem' : '0.72rem',
              fontWeight: 900,
              letterSpacing: 0.8,
              color: '#15803d',
              textTransform: 'uppercase'
            }}
          >
            ARENA MAP
          </span>
        </div>

        {/* Live Enemy Counter Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            borderRadius: 4,
            background: enemyCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${enemyCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
            fontSize: isMobile ? '0.52rem' : '0.60rem',
            fontWeight: 900,
            color: enemyCount > 0 ? '#e11d48' : '#16a34a',
            letterSpacing: 0.5
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: enemyCount > 0 ? '#e11d48' : '#16a34a',
              boxShadow: `0 0 5px ${enemyCount > 0 ? '#e11d48' : '#16a34a'}`
            }}
          />
          <span>{enemyCount > 0 ? `${enemyCount}` : 'CLEAR'}</span>
        </div>
      </div>

      {/* STRICTLY INSIDE THE 4 WALLS ONLY (NO OUTSIDE AREAS SHOWN) */}
      <div
        style={{
          position: 'relative',
          width: mapWidth,
          height: mapHeight,
          background: '#ecfdf5',
          overflow: 'hidden'
        }}
      >
        <svg
          width={mapWidth}
          height={mapHeight}
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            {/* Playable Area Clip: strictly bounded inside the 4 perimeter walls */}
            <clipPath id="arenaPlayableAreaClip">
              <rect x={pad} y={pad} width={innerDim} height={innerDim} rx={4} ry={4} />
            </clipPath>

            {/* Light Green Arena Floor Pattern */}
            <pattern id="arenaFloorPattern" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#ecfdf5" />
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(34, 197, 94, 0.15)" strokeWidth="0.8" />
            </pattern>

            {/* Subtle light radar sweep gradient */}
            <linearGradient id="arenaRadarSweepLight" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0)" />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0.28)" />
            </linearGradient>

            {/* Player Vision Cone Gradient */}
            <radialGradient id="playerVisionConeLight" cx="0%" cy="100%" r="100%">
              <stop offset="0%" stopColor="rgba(2, 132, 199, 0.35)" />
              <stop offset="100%" stopColor="rgba(2, 132, 199, 0)" />
            </radialGradient>
          </defs>

          {/* Arena Floor - Completely fills the area inside the 4 walls */}
          <rect x={pad} y={pad} width={innerDim} height={innerDim} fill="#dcfce7" rx={4} ry={4} />
          <rect x={pad} y={pad} width={innerDim} height={innerDim} fill="url(#arenaFloorPattern)" rx={4} ry={4} />

          {/* Tactical Grid Background (strictly inside the 4 walls) */}
          <g opacity="0.18" clipPath="url(#arenaPlayableAreaClip)">
            {[-45, -30, -15, 0, 15, 30, 45].map((coord) => {
              const s = worldToSvg(coord, coord);
              return (
                <React.Fragment key={coord}>
                  <line x1={s.x} y1={pad} x2={s.x} y2={pad + innerDim} stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3,4" />
                  <line x1={pad} y1={s.y} x2={pad + innerDim} y2={s.y} stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3,4" />
                </React.Fragment>
              );
            })}
          </g>

          {/* Roads & Avenues (strictly within the 4 walls) */}
          {(() => {
            const roadW = 8;
            const rTop = worldToSvg(0, half);
            const rBottom = worldToSvg(0, -half);
            const rLeft = worldToSvg(-half, 0);
            const rRight = worldToSvg(half, 0);
            return (
              <g opacity="0.85" clipPath="url(#arenaPlayableAreaClip)">
                <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#f1f5f9" strokeWidth={roadW * scale} />
                <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#f1f5f9" strokeWidth={roadW * scale} />
                {/* Yellow centerlines */}
                <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,4" opacity="0.85" />
                <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,4" opacity="0.85" />
              </g>
            );
          })()}

          {/* Enterable Buildings (strictly inside the 4 walls) */}
          <g clipPath="url(#arenaPlayableAreaClip)">
            {buildings.map((b) => {
              const polyPts = getBuildingPolygon(b);
              const centerSvg = worldToSvg(b.x, b.z);
              const doorSvg = worldToSvg(b.doorX, b.doorZ);

              return (
                <g key={b.id}>
                  {/* Building Footprint */}
                  <polygon
                    points={polyPts}
                    fill="rgba(241, 245, 249, 0.95)"
                    stroke="#0284c7"
                    strokeWidth="1.4"
                  />

                  {/* Building Doorway Notch */}
                  {doorSvg.isVisible && (
                    <circle
                      cx={doorSvg.x}
                      cy={doorSvg.y}
                      r={2.2}
                      fill={b.isDoorOpen ? '#16a34a' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  )}

                  {/* Building Label */}
                  {centerSvg.isVisible && (
                    <text
                      x={centerSvg.x}
                      y={centerSvg.y + 3}
                      fill="#334155"
                      fontSize={isMobile ? '6.5' : '7.5'}
                      fontWeight="900"
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {b.name.replace(/Villa|Bungalow|Residence|Depot|Station/i, '').trim() || b.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Radar Scanning Sweep Beam - strictly inside the 4 walls */}
          <g transform={`rotate(${sweepAngle} ${cx} ${cy})`} clipPath="url(#arenaPlayableAreaClip)">
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - Math.hypot(cx, cy)}
              stroke="url(#arenaRadarSweepLight)"
              strokeWidth="2.5"
            />
          </g>

          {/* SOLID PERIMETER BOUNDARY WALL (The 4 walls framing the arena) */}
          <rect
            x={pad}
            y={pad}
            width={innerDim}
            height={innerDim}
            fill="none"
            stroke="#334155"
            strokeWidth="2.8"
            rx={4}
            ry={4}
          />

          {/* ENEMIES & COMBATANTS (strictly inside the 4 walls) */}
          <g clipPath="url(#arenaPlayableAreaClip)">
            {pings.map((ping) => {
              const svg = worldToSvg(ping.x, ping.z);
              if (!svg.isVisible) return null;

              if (ping.type === 'teammate') {
                return (
                  <g key={ping.id}>
                    <circle cx={svg.x} cy={svg.y} r={4.5} fill="rgba(2, 132, 199, 0.22)" />
                    <circle cx={svg.x} cy={svg.y} r={2.5} fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" />
                  </g>
                );
              } else if (ping.type === 'boss') {
                return (
                  <g key={ping.id}>
                    <circle cx={svg.x} cy={svg.y} r={7} fill="rgba(217, 119, 6, 0.25)" />
                    <polygon
                      points={`${svg.x},${svg.y - 6} ${svg.x + 6},${svg.y} ${svg.x},${svg.y + 6} ${svg.x - 6},${svg.y}`}
                      fill="#d97706"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <text
                      x={svg.x}
                      y={svg.y - 8}
                      fill="#d97706"
                      fontSize="7"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      BOSS
                    </text>
                  </g>
                );
              } else {
                // Hostile Enemy Combatant - PURE RED DOT
                return (
                  <g key={ping.id}>
                    {/* Glowing red threat aura */}
                    <circle cx={svg.x} cy={svg.y} r={5.5} fill="rgba(225, 29, 72, 0.25)" />
                    {/* Core red threat ping */}
                    <circle
                      cx={svg.x}
                      cy={svg.y}
                      r={3.2}
                      fill="#e11d48"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  </g>
                );
              }
            })}
          </g>

          {/* PLAYER MARKER (Accurate Position & Direction pointer inside the arena) */}
          {(() => {
            const pSvg = worldToSvg(playerPos.x, playerPos.z);
            // Player directional angle in SVG coordinates:
            // 0 deg = Facing Front/Top (+Z, Up in SVG towards Suburban Workshop)
            // Turning right decreases playerYaw -> rotates clockwise in SVG
            const playerAngleDeg = 90 - (playerYaw * 180) / Math.PI;

            return (
              <g transform={`translate(${pSvg.x}, ${pSvg.y}) rotate(${playerAngleDeg})`}>
                {/* Forward Vision Flashlight Arc */}
                <path
                  d="M 0 0 L -14 -32 A 36 36 0 0 1 14 -32 Z"
                  fill="url(#playerVisionConeLight)"
                  stroke="rgba(2, 132, 199, 0.25)"
                  strokeWidth="0.6"
                />

                {/* Player Position Pulse Ring */}
                <circle cx={0} cy={0} r={4.5} fill="rgba(2, 132, 199, 0.2)" />

                {/* Player Directional Pointer Arrow */}
                <polygon
                  points="0,-7 5,5 0,2 -5,5"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};
