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

  // Dimensions: 1:1 square display
  const mapWidth = isMobile ? 175 : 250;
  const mapHeight = isMobile ? 175 : 250;
  const cx = mapWidth / 2;
  const cy = mapHeight / 2;
  const maxBoxDiagonal = Math.hypot(mapWidth, mapHeight);

  // Tactical view range: distance in meters visible from center to edge
  const viewRange = 54;
  const scale = cy / viewRange;
  const half = arenaSize / 2;

  // Active enemies count
  const enemyCount = useMemo(() => {
    return pings.filter((p) => p.type === 'enemy' || p.type === 'boss').length;
  }, [pings]);

  // Heading-Up dynamic rotation: aligns world with player's gaze so going direction is always UP
  const mapRotDeg = (playerYaw * 180) / Math.PI;

  // World to SVG Coordinate Conversion (centered on player position)
  const worldToSvg = (wx: number, wz: number): { x: number; y: number; isVisible: boolean } => {
    const dx = wx - playerPos.x;
    const dz = wz - playerPos.z;
    const sx = cx + dx * scale;
    const sy = cy + dz * scale;
    const distMeters = Math.hypot(dx, dz);
    const isVisible = distMeters <= maxBoxDiagonal / scale;
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
        border: '1.5px solid #334155',
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
          borderBottom: '1.5px solid #334155'
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

      {/* DYNAMIC HEADING-UP MAP VIEW (SEAMLESS ARENA GROUND, NO VOIDS) */}
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
            {/* Seamless Arena Floor Tile Pattern (Covers full viewport seamlessly) */}
            <pattern id="arenaFloorPattern" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#ecfdf5" />
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(34, 197, 94, 0.15)" strokeWidth="0.8" />
            </pattern>

            {/* Subtle radar sweep gradient */}
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

          {/* Seamless Arena Ground Fill across full minimap (Zero black void) */}
          <rect width={mapWidth} height={mapHeight} fill="#dcfce7" />
          <rect width={mapWidth} height={mapHeight} fill="url(#arenaFloorPattern)" />

          {/* DYNAMIC ROTATING WORLD LAYER (Rotates with player heading so forward is always UP) */}
          <g transform={`rotate(${mapRotDeg} ${cx} ${cy})`}>


            {/* Roads & Avenues */}
            {(() => {
              const roadW = 8;
              const rTop = worldToSvg(0, -half);
              const rBottom = worldToSvg(0, half);
              const rLeft = worldToSvg(-half, 0);
              const rRight = worldToSvg(half, 0);
              return (
                <g opacity="0.85">
                  <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#f1f5f9" strokeWidth={roadW * scale} />
                  <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#f1f5f9" strokeWidth={roadW * scale} />
                  {/* Yellow centerlines */}
                  <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,4" opacity="0.85" />
                  <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,4" opacity="0.85" />
                </g>
              );
            })()}

            {/* Enterable Buildings */}
            {buildings.map((b) => {
              const polyPts = getBuildingPolygon(b);
              const centerSvg = worldToSvg(b.x, b.z);
              const doorSvg = worldToSvg(b.doorX, b.doorZ);
              const isTreehouse = b.id.toLowerCase().includes('treehouse') || b.name.toLowerCase().includes('tree');

              return (
                <g key={b.id}>
                  {/* Building Footprint */}
                  <polygon
                    points={polyPts}
                    fill={isTreehouse ? 'rgba(220, 252, 231, 0.95)' : 'rgba(241, 245, 249, 0.95)'}
                    stroke={isTreehouse ? '#16a34a' : '#0284c7'}
                    strokeWidth={isTreehouse ? '1.8' : '1.4'}
                  />

                  {/* Building Doorway Notch */}
                  {doorSvg.isVisible && (
                    <circle
                      cx={doorSvg.x}
                      cy={doorSvg.y}
                      r={2.2}
                      fill={b.isDoorOpen ? '#16a34a' : (isTreehouse ? '#15803d' : '#0284c7')}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  )}

                  {/* Building Label (counter-rotated so text remains horizontally upright and readable) */}
                  {centerSvg.isVisible && (
                    <text
                      x={centerSvg.x}
                      y={centerSvg.y + 3}
                      transform={`rotate(${-mapRotDeg} ${centerSvg.x} ${centerSvg.y + 3})`}
                      fill={isTreehouse ? '#166534' : '#334155'}
                      fontSize={isMobile ? '6.0' : '7.0'}
                      fontWeight="900"
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {isTreehouse
                        ? 'TREEHOUSE'
                        : (b.name.replace(/Villa|Bungalow|Residence|Depot|Station/i, '').trim() || b.name)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ENEMIES & COMBATANTS */}
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
                      transform={`rotate(${-mapRotDeg} ${svg.x} ${svg.y - 8})`}
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

          {/* Radar Scanning Sweep Beam */}
          <g transform={`rotate(${sweepAngle} ${cx} ${cy})`}>
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - maxBoxDiagonal}
              stroke="url(#arenaRadarSweepLight)"
              strokeWidth="2.5"
            />
          </g>

          {/* PLAYER MARKER: Centered & always facing straight UP (Going direction is always FRONT) */}
          <g transform={`translate(${cx}, ${cy})`}>
            {/* Forward Vision Flashlight Arc */}
            <path
              d="M 0 0 L -14 -34 A 38 38 0 0 1 14 -34 Z"
              fill="url(#playerVisionConeLight)"
              stroke="rgba(2, 132, 199, 0.3)"
              strokeWidth="0.6"
            />

            {/* Player Position Pulse Ring */}
            <circle cx={0} cy={0} r={4.5} fill="rgba(2, 132, 199, 0.2)" />

            {/* Player Directional Pointer Arrow (Straight Ahead) */}
            <polygon
              points="0,-8 5,5 0,2 -5,5"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="1"
            />
          </g>

          {/* SOLID PERIMETER BOUNDARY WALLS (The 4 outer walls framing the arena map box) */}
          <rect
            x="1.5"
            y="1.5"
            width={mapWidth - 3}
            height={mapHeight - 3}
            fill="none"
            stroke="#334155"
            strokeWidth="3"
            rx="4"
            ry="4"
          />
        </svg>
      </div>
    </div>
  );
};
