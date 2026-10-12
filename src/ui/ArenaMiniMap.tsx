import React, { useEffect, useState, useMemo } from 'react';
import { Radio, Crosshair, ZoomIn, ZoomOut, Maximize2, Minimize2, Eye } from 'lucide-react';
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
  const [zoomMode, setZoomMode] = useState<'local' | 'full'>('local');
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  // Dimensions
  const mapWidth = isMobile ? 175 : 250;
  const mapHeight = isMobile ? 140 : 175;
  const padding = 12;
  const cx = mapWidth / 2;
  const cy = mapHeight / 2;
  const radius = Math.min(mapWidth, mapHeight) / 2 - padding;

  // Range in world meters
  const viewRange = zoomMode === 'local' ? 52 : Math.max(68, arenaSize / 2 + 5);

  // Active enemies count
  const enemyCount = useMemo(() => {
    return pings.filter((p) => p.type === 'enemy' || p.type === 'boss').length;
  }, [pings]);

  // World to SVG Coordinate Conversion
  const worldToSvg = (wx: number, wz: number): { x: number; y: number; isVisible: boolean } => {
    let dx = wx;
    let dz = wz;

    if (zoomMode === 'local') {
      dx = wx - playerPos.x;
      dz = wz - playerPos.z;
    }

    const maxVisual = radius;
    const dist = Math.hypot(dx, dz);
    const scale = maxVisual / viewRange;

    const sx = cx + dx * scale;
    const sy = cy + dz * scale; // in 3D: -Z is North (up), +Z is South (down)

    const isVisible = sx >= 2 && sx <= mapWidth - 2 && sy >= 2 && sy <= mapHeight - 2;

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
      const rx = c.lx * cosR - c.lz * sinR;
      const rz = c.lx * sinR + c.lz * cosR;
      const wx = b.x + rx;
      const wz = b.z + rz;
      const svg = worldToSvg(wx, wz);
      return `${svg.x.toFixed(1)},${svg.y.toFixed(1)}`;
    });

    return pts.join(' ');
  };

  // Color helper for hostile threats
  const getHostileColor = (ping: RadarPing): string => {
    if (ping.type === 'boss') return '#eab308'; // Glowing gold
    switch (ping.subType) {
      case 'exploder':
        return '#ec4899'; // Magenta
      case 'tank':
        return '#a855f7'; // Purple
      case 'ranged':
        return '#06b6d4'; // Cyan
      case 'fast':
        return '#22c55e'; // Lime green
      case 'shield':
        return '#f97316'; // Orange
      case 'elite':
        return '#facc15'; // Yellow
      case 'target':
        return '#38bdf8'; // Sky blue practice target
      default:
        return '#ef4444'; // Crimson Red
    }
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
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75), inset 0 0 20px rgba(2, 132, 199, 0.08)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
        userSelect: 'none',
        pointerEvents: 'auto',
        fontFamily: 'var(--font-display)'
      }}
    >
      {/* HEADER BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '4px 8px' : '5px 10px',
          background: 'rgba(15, 23, 42, 0.85)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Radio size={isMobile ? 11 : 13} color="#38bdf8" className="pulse-glow" />
          <span
            style={{
              fontSize: isMobile ? '0.62rem' : '0.70rem',
              fontWeight: 900,
              letterSpacing: 0.8,
              color: '#38bdf8',
              textTransform: 'uppercase'
            }}
          >
            ARENA MAP
          </span>
        </div>

        {/* Live Enemy Counter Pill & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 5px',
              borderRadius: 3,
              background: enemyCount > 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(34, 197, 94, 0.18)',
              border: `1px solid ${enemyCount > 0 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(34, 197, 94, 0.45)'}`,
              fontSize: isMobile ? '0.54rem' : '0.60rem',
              fontWeight: 900,
              color: enemyCount > 0 ? '#ef4444' : '#22c55e',
              letterSpacing: 0.5
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: enemyCount > 0 ? '#ef4444' : '#22c55e',
                boxShadow: `0 0 6px ${enemyCount > 0 ? '#ef4444' : '#22c55e'}`
              }}
            />
            <span>{enemyCount > 0 ? `${enemyCount} HOSTILES` : 'CLEAR'}</span>
          </div>

          {/* Zoom Toggle Button */}
          <button
            onClick={() => setZoomMode((prev) => (prev === 'local' ? 'full' : 'local'))}
            title={zoomMode === 'local' ? 'Switch to Full Sector View' : 'Switch to Tactical Local View'}
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 3,
              color: '#38bdf8',
              fontSize: '0.52rem',
              fontWeight: 900,
              padding: '2px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            {zoomMode === 'local' ? (
              <>
                <Maximize2 size={9} />
                <span>50M</span>
              </>
            ) : (
              <>
                <Minimize2 size={9} />
                <span>ALL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MAP SVG DISPLAY */}
      {!isCollapsed && (
        <div
          style={{
            position: 'relative',
            width: mapWidth,
            height: mapHeight,
            background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 1) 100%)',
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
              {/* Radar beam gradient */}
              <linearGradient id="arenaRadarSweep" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
                <stop offset="100%" stopColor="rgba(56, 189, 248, 0.65)" />
              </linearGradient>

              {/* Player Vision Cone Gradient */}
              <radialGradient id="playerVisionCone" cx="0%" cy="100%" r="100%">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
                <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
              </radialGradient>

              {/* Hostile Pulse Animation Filter */}
              <filter id="enemyGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Tactical Grid Background */}
            <g opacity="0.18">
              {[-40, -20, 0, 20, 40].map((coord) => {
                const s = worldToSvg(coord, coord);
                return (
                  <React.Fragment key={coord}>
                    <line x1={s.x} y1="0" x2={s.x} y2={mapHeight} stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,4" />
                    <line x1="0" y1={s.y} x2={mapWidth} y2={s.y} stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,4" />
                  </React.Fragment>
                );
              })}
            </g>

            {/* Concentric Range Circles */}
            <circle cx={cx} cy={cy} r={radius * 0.45} fill="none" stroke="rgba(56, 189, 248, 0.16)" strokeWidth="0.8" strokeDasharray="2,3" />
            <circle cx={cx} cy={cy} r={radius * 0.9} fill="none" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" strokeDasharray="4,4" />

            {/* Arena Outer Boundary Box */}
            {(() => {
              const halfA = arenaSize / 2;
              const tl = worldToSvg(-halfA, -halfA);
              const tr = worldToSvg(halfA, -halfA);
              const br = worldToSvg(halfA, halfA);
              const bl = worldToSvg(-halfA, halfA);
              const boundaryPts = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
              return (
                <polygon
                  points={boundaryPts}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.35)"
                  strokeWidth="1.2"
                  strokeDasharray="5,4"
                />
              );
            })()}

            {/* Roads & Avenues */}
            {(() => {
              const roadW = 8;
              const rTop = worldToSvg(0, -arenaSize / 2);
              const rBottom = worldToSvg(0, arenaSize / 2);
              const rLeft = worldToSvg(-arenaSize / 2, 0);
              const rRight = worldToSvg(arenaSize / 2, 0);
              const scale = radius / viewRange;
              return (
                <g opacity="0.22">
                  <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#94a3b8" strokeWidth={roadW * scale} />
                  <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#94a3b8" strokeWidth={roadW * scale} />
                  {/* Dashed centerlines */}
                  <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#facc15" strokeWidth="1" strokeDasharray="3,4" />
                  <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#facc15" strokeWidth="1" strokeDasharray="3,4" />
                </g>
              );
            })()}

            {/* Enterable Buildings */}
            {buildings.map((b) => {
              const polyPts = getBuildingPolygon(b);
              const centerSvg = worldToSvg(b.x, b.z);
              const doorSvg = worldToSvg(b.doorX, b.doorZ);

              return (
                <g key={b.id}>
                  {/* Building Footprint */}
                  <polygon
                    points={polyPts}
                    fill="rgba(30, 41, 59, 0.88)"
                    stroke="rgba(56, 189, 248, 0.65)"
                    strokeWidth="1.2"
                  />

                  {/* Building Doorway Notch */}
                  <circle
                    cx={doorSvg.x}
                    cy={doorSvg.y}
                    r={2.5}
                    fill={b.isDoorOpen ? '#22c55e' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth="0.6"
                  />

                  {/* Building Label */}
                  {centerSvg.isVisible && (
                    <text
                      x={centerSvg.x}
                      y={centerSvg.y + 3}
                      fill="#94a3b8"
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

            {/* Radar Scanning Sweep Beam */}
            {zoomMode === 'local' && (
              <g transform={`rotate(${sweepAngle} ${cx} ${cy})`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={cy - radius}
                  stroke="url(#arenaRadarSweep)"
                  strokeWidth="2.5"
                />
              </g>
            )}

            {/* ENEMIES & BLIPS */}
            {pings.map((ping) => {
              const svg = worldToSvg(ping.x, ping.z);
              if (!svg.isVisible) return null;

              if (ping.type === 'teammate') {
                return (
                  <g key={ping.id}>
                    <circle cx={svg.x} cy={svg.y} r={4.5} fill="rgba(56, 189, 248, 0.25)" />
                    <circle cx={svg.x} cy={svg.y} r={2.5} fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
                  </g>
                );
              } else if (ping.type === 'boss') {
                return (
                  <g key={ping.id} filter="url(#enemyGlow)">
                    <circle cx={svg.x} cy={svg.y} r={7} fill="rgba(234, 179, 8, 0.3)" />
                    <polygon
                      points={`${svg.x},${svg.y - 6} ${svg.x + 6},${svg.y} ${svg.x},${svg.y + 6} ${svg.x - 6},${svg.y}`}
                      fill="#eab308"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <text
                      x={svg.x}
                      y={svg.y - 8}
                      fill="#facc15"
                      fontSize="7"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      BOSS
                    </text>
                  </g>
                );
              } else {
                // Hostile Enemy Combatant
                const color = getHostileColor(ping);
                return (
                  <g key={ping.id}>
                    {/* Glowing threat aura */}
                    <circle cx={svg.x} cy={svg.y} r={ping.subType === 'exploder' ? 6 : 4.5} fill={color} opacity="0.32" />
                    {/* Core threat ping */}
                    <circle
                      cx={svg.x}
                      cy={svg.y}
                      r={ping.subType === 'tank' ? 3.5 : 2.5}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  </g>
                );
              }
            })}

            {/* PLAYER MARKER (With Directional Vision Cone) */}
            {(() => {
              const pSvg = worldToSvg(playerPos.x, playerPos.z);
              // In our 3D setup, yaw rotates clockwise from North (-Z)
              const yawDeg = (playerYaw * 180) / Math.PI;

              return (
                <g transform={`translate(${pSvg.x}, ${pSvg.y}) rotate(${yawDeg})`}>
                  {/* Forward Vision Flashlight Arc */}
                  <path
                    d="M 0 0 L -18 -38 A 42 42 0 0 1 18 -38 Z"
                    fill="rgba(56, 189, 248, 0.18)"
                    stroke="rgba(56, 189, 248, 0.3)"
                    strokeWidth="0.5"
                  />

                  {/* Player Aura Ring */}
                  <circle cx={0} cy={0} r={5.5} fill="rgba(56, 189, 248, 0.25)" />

                  {/* Player Directional Arrow */}
                  <polygon
                    points="0,-7 5,5 0,2 -5,5"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              );
            })()}

            {/* CARDINAL COMPASS HEADINGS (N / S / E / W) */}
            <text x={cx} y={11} fill="#38bdf8" fontSize="8" fontWeight="900" textAnchor="middle">
              N
            </text>
            <text x={cx} y={mapHeight - 4} fill="#64748b" fontSize="7.5" fontWeight="900" textAnchor="middle">
              S
            </text>
            <text x={mapWidth - 8} y={cy + 3} fill="#64748b" fontSize="7.5" fontWeight="900" textAnchor="middle">
              E
            </text>
            <text x={8} y={cy + 3} fill="#64748b" fontSize="7.5" fontWeight="900" textAnchor="middle">
              W
            </text>
          </svg>
        </div>
      )}

      {/* FOOTER BAR: SECTOR COORDINATES */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '3px 8px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(56, 189, 248, 0.2)',
          fontSize: isMobile ? '0.52rem' : '0.58rem',
          color: '#64748b',
          fontWeight: 700
        }}
      >
        <span>
          LOC: <strong style={{ color: '#38bdf8' }}>{Math.round(playerPos.x)}</strong>,{' '}
          <strong style={{ color: '#38bdf8' }}>{Math.round(playerPos.z)}</strong>
        </span>
        <span style={{ color: '#94a3b8' }}>{zoomMode === 'local' ? '50M RADAR' : 'SECTOR 130M'}</span>
      </div>
    </div>
  );
};
