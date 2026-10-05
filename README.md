# SHOOT ARENA

A fast-paced, high-octane 3D Arcade First-Person Shooter (FPS) built directly for modern web browsers using React, TypeScript, Three.js, and procedural Web Audio API synthesis.

---

## 🚀 Features

- **First-Person Tactical Gunplay**: Responsive pointer lock controls, smooth recoil kick with recovery damping, view bobbing, and muzzle flash point lights.
- **On-Weapon Digital HUD**: Live animated LED ammunition counter display directly mounted onto the weapon body.
- **5 Unique Weapons**:
  - **Pulse AR-4 Hyperion**: Balanced automatic rifle with holographic optic.
  - **Breaker SG-12 Aegis**: High-power 8-pellet kinetic spread shotgun.
  - **Viper SMG-9 Vector**: Rapid-fire agile submachine gun.
  - **Valkyrie Precision-50 Solar**: High-caliber sniper rifle with ADS zoom scope.
  - **Helios Plasma Burner Mk II**: Superheated ionized plasma projector with thermal splash.
- **7 Dynamic Enemy Archetypes**:
  - Basic Cyber Trooper (rush & melee)
  - Fast Stalker Drone (evasive zigzag)
  - Ranged Laser Trooper (strafe & projectile fire)
  - Tank Mech (heavy armor & ground stomp)
  - Exploder Drone (ticking fuse & AoE detonation)
  - Shield Vanguard (front energy deflection)
  - Elite Captain (gold aura, 2.5× health & rapid burst)
- **Multi-Phase Titan Boss**: Apex Cyber-Colossus Mk-IV with telegraphed targeting lasers, rocket salvos, minion summoning, and exposed chest reactor core.
- **4 Sunlit Sci-Fi Arenas**:
  - Apex Research Complex (Pristine High-Tech laboratory)
  - Solis Outpost (Sunlit desert solarium garrison)
  - Neo-Apex Skyline Plaza (Reflective marble plaza & glass barriers)
  - Orbital Solar Deck (High-orbit solar platform over Earth)
- **Advanced 3D Graphics**:
  - Real-time soft PCF shadow mapping (2048×2048)
  - Procedural high-resolution canvas textures (hexagonal ceramic tiles, panels, carbon fiber)
  - Dynamic spark fountains, bullet tracers, and explosion shrapnel
  - Luminous light sci-fi high-tech theme with frosted glassmorphism
- **Interactive Powerups**: Health packs, Armor boosts, Rapid Fire, Infinite Ammo, Damage Boost, Chrono Shift (slow motion), and Invulnerability Shields.
- **Score, Combos & Progression**: Kill-streak multiplier (up to x5), floating 3D-to-2D damage numbers, headshot critical indicator, and permanent upgrades shop saving to `localStorage`.
- **Procedural Web Audio Engine**: Zero external audio downloads required — 100% deterministic, instant synthesized SFX and dynamic synthwave battle music.

---

## 🎮 Controls

| Key / Input | Action |
| :--- | :--- |
| **W, A, S, D** | Move operative |
| **Mouse Aim** | Look around / Aim reticle |
| **Left Click** | Shoot weapon |
| **Z / Right Click** | Aim Down Sights (ADS) / Tactical Zoom Scope |
| **Left Shift / C** | High-velocity sprint |
| **R** | Reload magazine |
| **Space** | Jump / Evade |
| **1, 2, 3, 4, 5** | Switch weapons |
| **ESC** | Tactical pause menu |

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite
- **3D Graphics Engine**: Three.js (WebGLRenderer, PCFSoftShadowMap, ACESFilmicToneMapping)
- **Audio**: Web Audio API (Synthesized procedural audio engine)
- **Styling**: Vanilla CSS (Cyberpunk light theme, luminous glassmorphism, responsive HUD)
- **Icons**: Lucide React
- **Persistence**: Browser LocalStorage

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/IT22350732/shooting-game.git
cd shooting-game

# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your desktop browser. Click anywhere on the screen to engage pointer lock and enter combat!

---

## ⚖️ Ownership & License

- **Owner**: Imeth Mendis
- **Rights**: All Rights Reserved
- **Copyright**: © 2026 Imeth Mendis. All rights reserved.

