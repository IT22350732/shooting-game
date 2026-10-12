import React, { useEffect, useState, useMemo } from 'react';
import { Radio, Maximize2, Minimize2, Compass } from 'lucide-react';
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
  const [mapOrientation, setMapOrientation] = useState<'north' | 'heading'>('north');
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

  // Orientation settings
  // In Heading-Up mode (local zoom only), rotate world clockwise by playerYaw so forward view is always Top (SVG -Y)
  const isHeadingUp = mapOrientation === 'heading' && zoomMode === 'local';
  const mapRotDeg = (playerYaw * 180) / Math.PI;
  // In North-Up mode, Three.js player yaw decreases when turning right (East) and increases when turning left (West).
  // In SVG, positive rotate() is clockwise. Thus -playerYaw accurately maps: 0=N (Up), +90=E (Right), -90=W (Left), 180=S (Down).
  const playerYawDeg = (-playerYaw * 180) / Math.PI;

  // World to SVG Coordinate Conversion
  const worldToSvg = (wx: number, wz: number): { x: number; y: number; isVisible: boolean } => {
    let dx = wx;
    let dz = wz;

    if (zoomMode === 'local') {
      dx = wx - playerPos.x;
      dz = wz - playerPos.z;
    }

    const maxVisual = radius;
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
      // Three.js right-handed rotation around Y: x' = x*cos + z*sin, z' = -x*sin + z*cos
      const rx = c.lx * cosR + c.lz * sinR;
      const rz = -c.lx * sinR + c.lz * cosR;
      const wx = b.x + rx;
      const wz = b.z + rz;
      const svg = worldToSvg(wx, wz);
      return `${svg.x.toFixed(1)},${svg.y.toFixed(1)}`;
    });

    return pts.join(' ');
  };

  // Cardinal compass directions
  const cardinals = [
    { label: 'N', baseAngle: 0, color: '#0284c7' },
    { label: 'E', baseAngle: 90, color: '#64748b' },
    { label: 'S', baseAngle: 180, color: '#64748b' },
    { label: 'W', baseAngle: 270, color: '#64748b' }
  ];

  return (
    <div
      className="glass-panel"
      style={{
        width: mapWidth,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(2, 132, 199, 0.28)',
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
          borderBottom: '1px solid rgba(2, 132, 199, 0.18)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Radio size={isMobile ? 12 : 14} color="#0284c7" className="pulse-glow" />
          <span
            style={{
              fontSize: isMobile ? '0.62rem' : '0.72rem',
              fontWeight: 900,
              letterSpacing: 0.8,
              color: '#0284c7',
              textTransform: 'uppercase'
            }}
          >
            ARENA MAP
          </span>
        </div>

        {/* Live Enemy Counter Pill & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 5px',
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

          {/* Orientation Mode Toggle (North-Up vs Heading-Up) */}
          <button
            onClick={() => setMapOrientation((prev) => (prev === 'north' ? 'heading' : 'north'))}
            title={mapOrientation === 'north' ? 'North-Up: Fixed map, rotating player marker' : 'Heading-Up: Rotating map aligned to player direction'}
            style={{
              background: mapOrientation === 'heading' ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.08)',
              border: `1px solid ${mapOrientation === 'heading' ? 'rgba(2, 132, 199, 0.5)' : 'rgba(2, 132, 199, 0.25)'}`,
              borderRadius: 4,
              color: '#0284c7',
              fontSize: '0.52rem',
              fontWeight: 900,
              padding: '2px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            <Compass size={9} />
            <span>{mapOrientation === 'north' ? 'N-UP' : 'HEAD'}</span>
          </button>

          {/* Zoom Toggle Button */}
          <button
            onClick={() => setZoomMode((prev) => (prev === 'local' ? 'full' : 'local'))}
            title={zoomMode === 'local' ? 'Switch to Full Sector View' : 'Switch to Tactical Local View'}
            style={{
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              borderRadius: 4,
              color: '#0284c7',
              fontSize: '0.52rem',
              fontWeight: 900,
              padding: '2px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3
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

      {/* MAP SVG DISPLAY (CLEAN LIGHT CANVAS) */}
      <div
        style={{
          position: 'relative',
          width: mapWidth,
          height: mapHeight,
          background: 'radial-gradient(ellipse at center, #ffffff 0%, #f1f5f9 100%)',
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
            {/* Subtle light radar sweep gradient */}
            <linearGradient id="arenaRadarSweepLight" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(2, 132, 199, 0)" />
              <stop offset="100%" stopColor="rgba(2, 132, 199, 0.3)" />
            </linearGradient>

            {/* Player Vision Cone Gradient */}
            <radialGradient id="playerVisionConeLight" cx="0%" cy="100%" r="100%">
              <stop offset="0%" stopColor="rgba(2, 132, 199, 0.35)" />
              <stop offset="100%" stopColor="rgba(2, 132, 199, 0)" />
            </radialGradient>
          </defs>

          {/* ROTATING WORLD CONTAINER (Rotates in Heading-Up mode) */}
          <g transform={isHeadingUp ? `rotate(${mapRotDeg} ${cx} ${cy})` : undefined}>
            {/* Tactical Grid Background (Light cyan) */}
            <g opacity="0.12">
              {[-40, -20, 0, 20, 40].map((coord) => {
                const s = worldToSvg(coord, coord);
                return (
                  <React.Fragment key={coord}>
                    <line x1={s.x} y1="0" x2={s.x} y2={mapHeight} stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3,4" />
                    <line x1="0" y1={s.y} x2={mapWidth} y2={s.y} stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3,4" />
                  </React.Fragment>
                );
              })}
            </g>

            {/* Concentric Range Rings */}
            <circle cx={cx} cy={cy} r={radius * 0.45} fill="none" stroke="rgba(2, 132, 199, 0.16)" strokeWidth="0.8" strokeDasharray="2,3" />
            <circle cx={cx} cy={cy} r={radius * 0.9} fill="none" stroke="rgba(2, 132, 199, 0.22)" strokeWidth="1" strokeDasharray="4,4" />

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
                  stroke="rgba(2, 132, 199, 0.35)"
                  strokeWidth="1.2"
                  strokeDasharray="5,4"
                />
              );
            })()}

            {/* Roads & Avenues (Light gray with subtle yellow dash) */}
            {(() => {
              const roadW = 8;
              const rTop = worldToSvg(0, -arenaSize / 2);
              const rBottom = worldToSvg(0, arenaSize / 2);
              const rLeft = worldToSvg(-arenaSize / 2, 0);
              const rRight = worldToSvg(arenaSize / 2, 0);
              const scale = radius / viewRange;
              return (
                <g opacity="0.6">
                  <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#e2e8f0" strokeWidth={roadW * scale} />
                  <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#e2e8f0" strokeWidth={roadW * scale} />
                  {/* Yellow centerlines */}
                  <line x1={rTop.x} y1={rTop.y} x2={rBottom.x} y2={rBottom.y} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,4" opacity="0.75" />
                  <line x1={rLeft.x} y1={rLeft.y} x2={rRight.x} y2={rRight.y} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,4" opacity="0.75" />
                </g>
              );
            })()}

            {/* Enterable Buildings (Clean light fill with crisp cyan outline) */}
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

                  {/* Building Label (counter-rotated in Heading-Up mode so text stays horizontal) */}
                  {centerSvg.isVisible && (
                    <text
                      x={centerSvg.x}
                      y={centerSvg.y + 3}
                      transform={isHeadingUp ? `rotate(${-mapRotDeg} ${centerSvg.x} ${centerSvg.y + 3})` : undefined}
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
                      transform={isHeadingUp ? `rotate(${-mapRotDeg} ${svg.x} ${svg.y - 8})` : undefined}
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
          {zoomMode === 'local' && (
            <g transform={`rotate(${sweepAngle} ${cx} ${cy})`}>
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - radius}
                stroke="url(#arenaRadarSweepLight)"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* PLAYER MARKER (Accurate Directional Vision Cone & Pointer Arrow) */}
          {(() => {
            const pSvg = worldToSvg(playerPos.x, playerPos.z);
            // In Heading-Up mode, player is in center looking straight UP (0 deg) because world rotates underneath.
            // In North-Up mode, marker translates to player position and rotates accurately by playerYawDeg (-playerYaw).
            const posX = isHeadingUp ? cx : pSvg.x;
            const posY = isHeadingUp ? cy : pSvg.y;
            const rotDeg = isHeadingUp ? 0 : playerYawDeg;

            return (
              <g transform={`translate(${posX}, ${posY}) rotate(${rotDeg})`}>
                {/* Forward Vision Flashlight Arc */}
                <path
                  d="M 0 0 L -18 -38 A 42 42 0 0 1 18 -38 Z"
                  fill="url(#playerVisionConeLight)"
                  stroke="rgba(2, 132, 199, 0.25)"
                  strokeWidth="0.6"
                />

                {/* Player Aura Ring */}
                <circle cx={0} cy={0} r={5.5} fill="rgba(2, 132, 199, 0.25)" />

                {/* Player Directional Arrow */}
                <polygon
                  points="0,-7 5,5 0,2 -5,5"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>
            );
          })()}

          {/* DYNAMIC CARDINAL COMPASS HEADINGS (N / S / E / W) */}
          {cardinals.map((c) => {
            const angleDeg = isHeadingUp ? (c.baseAngle + mapRotDeg) % 360 : c.baseAngle;
            const angleRad = (angleDeg * Math.PI) / 180;
            const labelRadius = radius + 3;
            const tx = cx + Math.sin(angleRad) * labelRadius;
            const ty = cy - Math.cos(angleRad) * labelRadius;

            // Keep within visible SVG bounds
            const clampedX = Math.max(7, Math.min(mapWidth - 7, tx));
            const clampedY = Math.max(10, Math.min(mapHeight - 4, ty + 3));

            return (
              <text
                key={c.label}
                x={clampedX}
                y={clampedY}
                fill={c.color}
                fontSize={c.label === 'N' ? '8' : '7.5'}
                fontWeight="900"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {c.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* FOOTER BAR: SECTOR COORDINATES (LIGHT THEME) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 10px',
          background: 'rgba(248, 250, 252, 0.94)',
          borderTop: '1px solid rgba(2, 132, 199, 0.15)',
          fontSize: isMobile ? '0.52rem' : '0.60rem',
          color: '#64748b',
          fontWeight: 700
        }}
      >
        <span>
          LOC: <strong style={{ color: '#0284c7' }}>{Math.round(playerPos.x)}</strong>,{' '}
          <strong style={{ color: '#0284c7' }}>{Math.round(playerPos.z)}</strong>
        </span>
        <span style={{ color: '#64748b', fontWeight: 800 }}>
          {zoomMode === 'local' ? (isHeadingUp ? '50M HEADING' : '50M RADAR') : 'SECTOR 130M'}
        </span>
      </div>
    </div>
  );
};

