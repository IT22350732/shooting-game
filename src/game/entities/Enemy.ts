import * as THREE from 'three';
import { EnemyType } from '../../types/game';
import { soundManager } from '../../audio/SoundManager';
import { ArenaObstacle, InteriorZone } from '../world/ArenaManager';

export interface EnemyShootEvent {
  origin: THREE.Vector3;
  target: THREE.Vector3;
  damage: number;
  speed?: number;
  spread?: number;
  soundType?: 'rifle' | 'shotgun' | 'smg' | 'sniper' | 'plasma';
  isPlasma?: boolean;
}

export interface EnemyBuildingContext {
  playerBuilding: InteriorZone | null;
  arenaSize?: number;
  isInsideBuilding?: (pos: THREE.Vector3) => boolean;
}

interface HumanTheme {
  name: string;
  highlightHex: number;
  emissiveHex: number;
  uniformHex: number;
  skinHex: number;
  armorHex: number;
  visorHex: number;
  scale: number;
  hasWeapon: boolean;
  hasShield: boolean;
  hasExplosiveVest: boolean;
}

export const HUMAN_THEMES: Record<EnemyType, HumanTheme> = {
  basic: {
    name: 'Hostile Insurgent',
    highlightHex: 0xef4444, // Vibrant Crimson Red
    emissiveHex: 0xdc2626,
    uniformHex: 0x1e293b,   // Slate charcoal uniform
    skinHex: 0xd4a373,      // Warm Tan
    armorHex: 0xef4444,     // Crimson Tactical Armor Plate
    visorHex: 0xff0033,     // Glowing Crimson Optic
    scale: 1.0,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false
  },
  fast: {
    name: 'Cyber Sprinter',
    highlightHex: 0x22c55e, // Electric Lime Green
    emissiveHex: 0x4ade80,
    uniformHex: 0x0f172a,   // Midnight stealth suit
    skinHex: 0xdfb18e,      // Fair Tan
    armorHex: 0x22c55e,     // Neon Green Harness
    visorHex: 0x22c55e,     // Glowing Neon Green Scout Visor
    scale: 0.9,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false
  },
  ranged: {
    name: 'Sniper Marksman',
    highlightHex: 0x06b6d4, // High-Voltage Cyan
    emissiveHex: 0x22d3ee,
    uniformHex: 0x0f2744,   // Deep Navy Camo
    skinHex: 0xc99a6b,      // Olive Tan
    armorHex: 0x0891b2,     // Cyan ballistic plate
    visorHex: 0x00f0ff,     // Glowing Cyan Sniper HUD Visor
    scale: 1.02,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false
  },
  tank: {
    name: 'Heavy Juggernaut',
    highlightHex: 0xa855f7, // Deep Heavy Purple
    emissiveHex: 0xc084fc,
    uniformHex: 0x18181b,   // Heavy Blast Undersuit
    skinHex: 0xb27c52,      // Deep Tan
    armorHex: 0x9333ea,     // Reinforced Purple Titan Plating
    visorHex: 0xa855f7,     // Glowing Purple Slit Visor
    scale: 1.25,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false
  },
  shield: {
    name: 'Riot Vanguard',
    highlightHex: 0xf97316, // Radiant Solar Amber / Orange
    emissiveHex: 0xfb923c,
    uniformHex: 0x334155,   // Heavy Riot Uniform
    skinHex: 0xcca078,      // Neutral Tan
    armorHex: 0xea580c,     // Orange Riot Armor
    visorHex: 0xff7700,     // Glowing Orange Blast Visor
    scale: 1.05,
    hasWeapon: true,
    hasShield: true,
    hasExplosiveVest: false
  },
  exploder: {
    name: 'Demolition Infiltrator',
    highlightHex: 0xec4899, // Blazing Hot Pink / Magenta
    emissiveHex: 0xf43f5e,
    uniformHex: 0x27272a,   // Dark Hazmat Uniform
    skinHex: 0xe0b99c,      // Pale Skin
    armorHex: 0xdb2777,     // Magenta Bomb Harness
    visorHex: 0xff007f,     // Pulsing Pink Hazard Visor
    scale: 0.95,
    hasWeapon: false,
    hasShield: false,
    hasExplosiveVest: true
  },
  elite: {
    name: 'Commando Officer',
    highlightHex: 0xeab308, // Radiant Cyber Gold / Yellow
    emissiveHex: 0xfacc15,
    uniformHex: 0x111827,   // Obsidian & Carbon Uniform
    skinHex: 0xc68642,      // Bronzed Skin
    armorHex: 0xca8a04,     // Gilded Composite Armor
    visorHex: 0xffea00,     // Dual Golden HUD Glasses
    scale: 1.12,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false
  }
};

export class Enemy {
  public id: string;
  public type: EnemyType;
  public mesh: THREE.Group;
  public headMesh: THREE.Mesh | null = null;
  public shieldMesh: THREE.Mesh | null = null;

  public position: THREE.Vector3 = new THREE.Vector3();
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public scoreValue: number;
  public coinValue: number;
  public isDead: boolean = false;
  public isKillProcessed: boolean = false;

  // AI & Attack state
  private attackRange: number;
  private attackCooldown: number = 0;
  private attackInterval: number;
  private stateTimer: number = 0;
  private strafeDir: number = 1;

  // Exploder fuse
  public isFuseActive: boolean = false;
  public fuseTimer: number = 1.2;

  // Visual flash on damage
  private hitFlashTimer: number = 0;
  private originalMaterials: Map<THREE.Mesh, THREE.Material> = new Map();
  private flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Floating Health Bar & Highlight Aura
  private healthBarMesh: THREE.Mesh;
  private healthBarBg: THREE.Mesh;
  private groundHighlightRing: THREE.Mesh | null = null;

  // Articulated Human Skeletal Hierarchy
  private humanGroup: THREE.Group = new THREE.Group();
  private pelvis: THREE.Group = new THREE.Group();
  private torsoGroup: THREE.Group = new THREE.Group();
  private headGroup: THREE.Group = new THREE.Group();
  private leftArmGroup: THREE.Group = new THREE.Group();
  private rightArmGroup: THREE.Group = new THREE.Group();
  private leftForearmGroup: THREE.Group = new THREE.Group();
  private rightForearmGroup: THREE.Group = new THREE.Group();
  private leftLegGroup: THREE.Group = new THREE.Group();
  private rightLegGroup: THREE.Group = new THREE.Group();
  private leftKneeGroup: THREE.Group = new THREE.Group();
  private rightKneeGroup: THREE.Group = new THREE.Group();
  private weaponMesh: THREE.Group | null = null;
  private coreMesh: THREE.Mesh | null = null;

  // Animation Tracking
  private walkCycle: number = Math.random() * Math.PI * 2;
  private basePelvisY: number = 0.92;
  private baseTorsoY: number = 0.12;
  private deathTimer: number = 0;
  private scaleFactor: number = 1.0;
  private theme: HumanTheme;

  constructor(
    id: string,
    type: EnemyType,
    spawnPos: THREE.Vector3,
    waveMultiplier: number = 1,
    difficultyMultiplier: { hp: number; dmg: number; speed: number } = { hp: 1, dmg: 1, speed: 1 }
  ) {
    this.id = id;
    this.type = type;
    this.position.copy(spawnPos);
    this.position.y = 0; // Firmly lock to ground level
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.theme = HUMAN_THEMES[type] || HUMAN_THEMES.basic;
    this.scaleFactor = this.theme.scale;

    // Configure stats based on type
    switch (type) {
      case 'fast':
        this.maxHealth = Math.round(45 * waveMultiplier);
        this.speed = 8.5;
        this.damage = 7;
        this.attackRange = 18.0;
        this.attackInterval = 0.9;
        this.scoreValue = 120;
        this.coinValue = 2;
        break;

      case 'ranged':
        this.maxHealth = Math.round(70 * waveMultiplier);
        this.speed = 4.2;
        this.damage = 22;
        this.attackRange = 28.0;
        this.attackInterval = 2.2;
        this.scoreValue = 180;
        this.coinValue = 3;
        break;

      case 'tank':
        this.maxHealth = Math.round(360 * waveMultiplier);
        this.speed = 3.2;
        this.damage = 25;
        this.attackRange = 24.0;
        this.attackInterval = 1.9;
        this.scoreValue = 400;
        this.coinValue = 6;
        break;

      case 'exploder':
        this.maxHealth = Math.round(55 * waveMultiplier);
        this.speed = 7.5;
        this.damage = 65;
        this.attackRange = 3.5;
        this.attackInterval = 0.1;
        this.scoreValue = 220;
        this.coinValue = 3;
        break;

      case 'shield':
        this.maxHealth = Math.round(110 * waveMultiplier);
        this.speed = 4.5;
        this.damage = 13;
        this.attackRange = 20.0;
        this.attackInterval = 1.5;
        this.scoreValue = 260;
        this.coinValue = 4;
        break;

      case 'elite':
        this.maxHealth = Math.round(280 * waveMultiplier);
        this.speed = 6.0;
        this.damage = 16;
        this.attackRange = 26.0;
        this.attackInterval = 1.3;
        this.scoreValue = 600;
        this.coinValue = 12;
        break;

      case 'basic':
      default:
        this.maxHealth = Math.round(80 * waveMultiplier);
        this.speed = 5.4;
        this.damage = 12;
        this.attackRange = 22.0;
        this.attackInterval = 1.7;
        this.scoreValue = 100;
        this.coinValue = 2;
        break;
    }

    // Apply difficulty scaling
    this.maxHealth = Math.max(1, Math.round(this.maxHealth * difficultyMultiplier.hp));
    this.health = this.maxHealth;
    this.damage = Math.max(1, Math.round(this.damage * difficultyMultiplier.dmg));
    this.speed = this.speed * difficultyMultiplier.speed;

    // Build Articulated Human Model with Highlight Colors
    this.buildHumanModel();

    // Create Floating Health Bar billboard
    const bgGeo = new THREE.PlaneGeometry(1.0, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    this.healthBarBg = new THREE.Mesh(bgGeo, bgMat);
    this.healthBarBg.position.y = this.getHeight() + 0.35;
    this.healthBarBg.raycast = () => {};
    this.mesh.add(this.healthBarBg);

    const barGeo = new THREE.PlaneGeometry(0.96, 0.08);
    const barMat = new THREE.MeshBasicMaterial({
      color: this.theme.highlightHex,
      side: THREE.DoubleSide
    });
    this.healthBarMesh = new THREE.Mesh(barGeo, barMat);
    this.healthBarMesh.position.y = this.getHeight() + 0.35;
    this.healthBarMesh.position.z = 0.01;
    this.healthBarMesh.raycast = () => {};
    this.mesh.add(this.healthBarMesh);
  }

  public getHeight(): number {
    switch (this.type) {
      case 'tank': return 2.45;
      case 'fast': return 1.68;
      case 'exploder': return 1.82;
      case 'elite': return 2.15;
      default: return 1.95;
    }
  }

  public static isLowGraphics: boolean = false;

  private registerMesh(mesh: THREE.Mesh, mat: THREE.Material) {
    this.originalMaterials.set(mesh, mat);
    mesh.castShadow = !Enemy.isLowGraphics;
    mesh.receiveShadow = !Enemy.isLowGraphics;
  }

  private buildHumanModel() {
    const s = this.scaleFactor;
    const theme = this.theme;

    // Tactical Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: theme.skinHex,
      roughness: 0.7,
      metalness: 0.05
    });

    const uniformMat = new THREE.MeshStandardMaterial({
      color: theme.uniformHex,
      roughness: 0.8,
      metalness: 0.15
    });

    const highlightMat = new THREE.MeshStandardMaterial({
      color: theme.highlightHex,
      roughness: 0.25,
      metalness: 0.6,
      emissive: theme.emissiveHex,
      emissiveIntensity: 0.65
    });

    const visorMat = new THREE.MeshBasicMaterial({
      color: theme.visorHex
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8
    });

    // Root of Human Body
    this.mesh.add(this.humanGroup);

    // 0. Ground Tactical Aura Ring (Distinct high-visibility glow under human enemy feet)
    const ringGeo = new THREE.RingGeometry(0.55 * s, 0.68 * s, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: theme.highlightHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    this.groundHighlightRing = new THREE.Mesh(ringGeo, ringMat);
    this.groundHighlightRing.rotation.x = -Math.PI / 2;
    this.groundHighlightRing.position.y = 0.02;
    this.groundHighlightRing.raycast = () => {};
    this.mesh.add(this.groundHighlightRing);

    // 1. Pelvis / Hips (Root of body motion)
    this.basePelvisY = 0.92 * s;
    this.pelvis.position.set(0, this.basePelvisY, 0);
    this.humanGroup.add(this.pelvis);

    const hipGeo = new THREE.BoxGeometry(0.42 * s, 0.22 * s, 0.26 * s);
    const hipMesh = new THREE.Mesh(hipGeo, uniformMat);
    this.pelvis.add(hipMesh);
    this.registerMesh(hipMesh, uniformMat);

    // Tactical Belt with Highlighted Buckle & Holsters
    const beltGeo = new THREE.BoxGeometry(0.44 * s, 0.08 * s, 0.28 * s);
    const beltMesh = new THREE.Mesh(beltGeo, highlightMat);
    beltMesh.position.y = 0.08 * s;
    this.pelvis.add(beltMesh);
    this.registerMesh(beltMesh, highlightMat);

    // 2. Spine & Torso Group (Pivots at waist above pelvis)
    this.baseTorsoY = 0.12 * s;
    this.torsoGroup.position.set(0, this.baseTorsoY, 0);
    this.pelvis.add(this.torsoGroup);

    // Waist / Abdomen
    const abdomenGeo = new THREE.BoxGeometry(0.38 * s, 0.24 * s, 0.24 * s);
    const abdomenMesh = new THREE.Mesh(abdomenGeo, uniformMat);
    abdomenMesh.position.y = 0.12 * s;
    this.torsoGroup.add(abdomenMesh);
    this.registerMesh(abdomenMesh, uniformMat);

    // Upper Chest
    const chestGeo = new THREE.BoxGeometry(0.46 * s, 0.36 * s, 0.28 * s);
    const chestMesh = new THREE.Mesh(chestGeo, uniformMat);
    chestMesh.position.y = 0.38 * s;
    this.torsoGroup.add(chestMesh);
    this.registerMesh(chestMesh, uniformMat);

    // Tactical Armored Vest (Highlighted Enemy Armor Plating)
    const vestGeo = new THREE.BoxGeometry(0.48 * s, 0.38 * s, 0.32 * s);
    const vestMesh = new THREE.Mesh(vestGeo, highlightMat);
    vestMesh.position.y = 0.38 * s;
    this.torsoGroup.add(vestMesh);
    this.registerMesh(vestMesh, highlightMat);

    // Shoulder Pauldrons (Left & Right Armor Pads)
    const pauldronGeo = new THREE.BoxGeometry(0.18 * s, 0.14 * s, 0.22 * s);
    const leftPad = new THREE.Mesh(pauldronGeo, highlightMat);
    leftPad.position.set(-0.31 * s, 0.54 * s, 0);
    this.torsoGroup.add(leftPad);
    this.registerMesh(leftPad, highlightMat);

    const rightPad = new THREE.Mesh(pauldronGeo, highlightMat);
    rightPad.position.set(0.31 * s, 0.54 * s, 0);
    this.torsoGroup.add(rightPad);
    this.registerMesh(rightPad, highlightMat);

    // Exploder Demolition Core in Chest
    if (theme.hasExplosiveVest) {
      const coreGeo = new THREE.SphereGeometry(0.14 * s, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: theme.highlightHex,
        emissiveIntensity: 1.5,
        roughness: 0.1
      });
      this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
      this.coreMesh.position.set(0, 0.38 * s, 0.18 * s);
      this.torsoGroup.add(this.coreMesh);
      this.registerMesh(this.coreMesh, coreMat);
    }

    // 3. Head & Neck (Weakpoint Headshot Mesh)
    this.headGroup.position.set(0, 0.60 * s, 0);
    this.torsoGroup.add(this.headGroup);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.08 * s, 0.09 * s, 0.12 * s, 12);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = 0.06 * s;
    this.headGroup.add(neckMesh);
    this.registerMesh(neckMesh, skinMat);

    // Human Head (Face / Cranium)
    const headGeo = new THREE.BoxGeometry(0.28 * s, 0.30 * s, 0.28 * s);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.set(0, 0.24 * s, 0);
    this.headGroup.add(this.headMesh);
    this.registerMesh(this.headMesh, skinMat);

    // Tactical Combat Helmet
    const helmetGeo = new THREE.BoxGeometry(0.32 * s, 0.16 * s, 0.32 * s);
    const helmetMesh = new THREE.Mesh(helmetGeo, uniformMat);
    helmetMesh.position.set(0, 0.32 * s, 0.01 * s);
    this.headGroup.add(helmetMesh);
    this.registerMesh(helmetMesh, uniformMat);

    // Helmet Highlight Stripe
    const helmetStripeGeo = new THREE.BoxGeometry(0.12 * s, 0.18 * s, 0.33 * s);
    const helmetStripe = new THREE.Mesh(helmetStripeGeo, highlightMat);
    helmetStripe.position.set(0, 0.32 * s, 0.01 * s);
    this.headGroup.add(helmetStripe);
    this.registerMesh(helmetStripe, highlightMat);

    // Glowing Optical Tactical Visor / Eyes
    const visorGeo = new THREE.BoxGeometry(0.26 * s, 0.09 * s, 0.08 * s);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.23 * s, 0.15 * s);
    this.headGroup.add(visorMesh);

    // 4. Left Arm Group (Shoulder pivot at left side of chest)
    this.leftArmGroup.position.set(-0.31 * s, 0.48 * s, 0);
    this.torsoGroup.add(this.leftArmGroup);

    // Upper Arm (Bicep)
    const upperArmGeo = new THREE.BoxGeometry(0.13 * s, 0.32 * s, 0.13 * s);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, uniformMat);
    leftUpperArm.position.y = -0.16 * s;
    this.leftArmGroup.add(leftUpperArm);
    this.registerMesh(leftUpperArm, uniformMat);

    // Left Forearm Group (Elbow pivot)
    this.leftForearmGroup.position.set(0, -0.32 * s, 0);
    this.leftArmGroup.add(this.leftForearmGroup);

    const forearmGeo = new THREE.BoxGeometry(0.12 * s, 0.28 * s, 0.12 * s);
    const leftForearm = new THREE.Mesh(forearmGeo, uniformMat);
    leftForearm.position.y = -0.14 * s;
    this.leftForearmGroup.add(leftForearm);
    this.registerMesh(leftForearm, uniformMat);

    // Tactical Glove
    const gloveGeo = new THREE.BoxGeometry(0.13 * s, 0.11 * s, 0.13 * s);
    const leftGlove = new THREE.Mesh(gloveGeo, jointMat);
    leftGlove.position.y = -0.27 * s;
    this.leftForearmGroup.add(leftGlove);
    this.registerMesh(leftGlove, jointMat);

    // Riot Shield for Shield Vanguard (Mounted on Left Forearm)
    if (theme.hasShield) {
      const shieldGeo = new THREE.BoxGeometry(0.85 * s, 1.45 * s, 0.05 * s);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: theme.highlightHex,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        metalness: 0.9,
        side: THREE.DoubleSide,
        emissive: theme.emissiveHex,
        emissiveIntensity: 0.8
      });
      this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      this.shieldMesh.position.set(0, -0.15 * s, 0.35 * s);
      this.leftForearmGroup.add(this.shieldMesh);
      this.registerMesh(this.shieldMesh, shieldMat);
    }

    // 5. Right Arm Group (Shoulder pivot at right side of chest)
    this.rightArmGroup.position.set(0.31 * s, 0.48 * s, 0);
    this.torsoGroup.add(this.rightArmGroup);

    // Upper Arm (Bicep)
    const rightUpperArm = new THREE.Mesh(upperArmGeo, uniformMat);
    rightUpperArm.position.y = -0.16 * s;
    this.rightArmGroup.add(rightUpperArm);
    this.registerMesh(rightUpperArm, uniformMat);

    // Right Forearm Group (Elbow pivot)
    this.rightForearmGroup.position.set(0, -0.32 * s, 0);
    this.rightArmGroup.add(this.rightForearmGroup);

    const rightForearm = new THREE.Mesh(forearmGeo, uniformMat);
    rightForearm.position.y = -0.14 * s;
    this.rightForearmGroup.add(rightForearm);
    this.registerMesh(rightForearm, uniformMat);

    // Tactical Glove
    const rightGlove = new THREE.Mesh(gloveGeo, jointMat);
    rightGlove.position.y = -0.27 * s;
    this.rightForearmGroup.add(rightGlove);
    this.registerMesh(rightGlove, jointMat);

    // Firearm attached to Right Hand
    if (theme.hasWeapon) {
      this.weaponMesh = new THREE.Group();
      this.rightForearmGroup.add(this.weaponMesh);
      this.weaponMesh.position.set(0, -0.28 * s, 0.22 * s);

      if (this.type === 'shield') {
        // Compact Sidearm Pistol (used alongside riot shield)
        const pistolGeo = new THREE.BoxGeometry(0.09 * s, 0.13 * s, 0.34 * s);
        const pistol = new THREE.Mesh(pistolGeo, jointMat);
        this.weaponMesh.add(pistol);
        this.registerMesh(pistol, jointMat);

        const slideGeo = new THREE.BoxGeometry(0.10 * s, 0.04 * s, 0.32 * s);
        const slide = new THREE.Mesh(slideGeo, highlightMat);
        slide.position.y = 0.07 * s;
        this.weaponMesh.add(slide);
        this.registerMesh(slide, highlightMat);
      } else if (this.type === 'fast') {
        // Compact Machine Pistol / SMG
        const smgGeo = new THREE.BoxGeometry(0.10 * s, 0.15 * s, 0.44 * s);
        const smg = new THREE.Mesh(smgGeo, jointMat);
        this.weaponMesh.add(smg);
        this.registerMesh(smg, jointMat);

        const trimGeo = new THREE.BoxGeometry(0.11 * s, 0.04 * s, 0.36 * s);
        const trim = new THREE.Mesh(trimGeo, highlightMat);
        trim.position.y = 0.07 * s;
        this.weaponMesh.add(trim);
        this.registerMesh(trim, highlightMat);
      } else if (this.type === 'tank') {
        // Heavy Minigun / Cannon
        const cannonGeo = new THREE.BoxGeometry(0.18 * s, 0.22 * s, 0.82 * s);
        const cannon = new THREE.Mesh(cannonGeo, jointMat);
        this.weaponMesh.add(cannon);
        this.registerMesh(cannon, jointMat);

        const muzzleGeo = new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.22 * s, 8);
        muzzleGeo.rotateX(Math.PI / 2);
        const muzzle = new THREE.Mesh(muzzleGeo, highlightMat);
        muzzle.position.z = 0.45 * s;
        this.weaponMesh.add(muzzle);
        this.registerMesh(muzzle, highlightMat);
      } else if (this.type === 'ranged') {
        // Long Marksman Sniper Rifle with Scope
        const rifleGeo = new THREE.BoxGeometry(0.10 * s, 0.14 * s, 0.92 * s);
        const rifle = new THREE.Mesh(rifleGeo, jointMat);
        this.weaponMesh.add(rifle);
        this.registerMesh(rifle, jointMat);

        const scopeGeo = new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.25 * s, 8);
        scopeGeo.rotateX(Math.PI / 2);
        const scope = new THREE.Mesh(scopeGeo, highlightMat);
        scope.position.set(0, 0.10 * s, 0);
        this.weaponMesh.add(scope);
        this.registerMesh(scope, highlightMat);
      } else {
        // Standard Insurgent / Commando Assault Rifle
        const receiverGeo = new THREE.BoxGeometry(0.12 * s, 0.16 * s, 0.65 * s);
        const rifleMesh = new THREE.Mesh(receiverGeo, jointMat);
        this.weaponMesh.add(rifleMesh);
        this.registerMesh(rifleMesh, jointMat);

        const trimGeo = new THREE.BoxGeometry(0.13 * s, 0.04 * s, 0.50 * s);
        const trimMesh = new THREE.Mesh(trimGeo, highlightMat);
        trimMesh.position.y = 0.08 * s;
        this.weaponMesh.add(trimMesh);
        this.registerMesh(trimMesh, highlightMat);

        const magGeo = new THREE.BoxGeometry(0.08 * s, 0.18 * s, 0.14 * s);
        const magMesh = new THREE.Mesh(magGeo, jointMat);
        magMesh.position.set(0, -0.14 * s, -0.05 * s);
        this.weaponMesh.add(magMesh);
        this.registerMesh(magMesh, jointMat);
      }

      // Default Weapon Hold Pose
      this.rightArmGroup.rotation.x = -Math.PI / 2.3;
      this.rightForearmGroup.rotation.x = -Math.PI / 12;
    }

    // 6. Left Leg Group (Hip pivot at left bottom of pelvis)
    this.leftLegGroup.position.set(-0.16 * s, 0, 0);
    this.pelvis.add(this.leftLegGroup);

    // Thigh (Upper Leg)
    const thighGeo = new THREE.BoxGeometry(0.17 * s, 0.42 * s, 0.19 * s);
    const leftThigh = new THREE.Mesh(thighGeo, uniformMat);
    leftThigh.position.y = -0.21 * s;
    this.leftLegGroup.add(leftThigh);
    this.registerMesh(leftThigh, uniformMat);

    // Left Knee Group (Knee pivot)
    this.leftKneeGroup.position.set(0, -0.42 * s, 0);
    this.leftLegGroup.add(this.leftKneeGroup);

    // Knee Armor Pad (Highlighted color)
    const kneePadGeo = new THREE.BoxGeometry(0.16 * s, 0.12 * s, 0.08 * s);
    const leftKneePad = new THREE.Mesh(kneePadGeo, highlightMat);
    leftKneePad.position.set(0, 0, 0.10 * s);
    this.leftKneeGroup.add(leftKneePad);
    this.registerMesh(leftKneePad, highlightMat);

    // Shin / Calf (Lower Leg)
    const shinGeo = new THREE.BoxGeometry(0.15 * s, 0.38 * s, 0.17 * s);
    const leftShin = new THREE.Mesh(shinGeo, uniformMat);
    leftShin.position.y = -0.19 * s;
    this.leftKneeGroup.add(leftShin);
    this.registerMesh(leftShin, uniformMat);

    // Combat Boot
    const bootGeo = new THREE.BoxGeometry(0.17 * s, 0.14 * s, 0.28 * s);
    const leftBoot = new THREE.Mesh(bootGeo, jointMat);
    leftBoot.position.set(0, -0.40 * s, 0.04 * s);
    this.leftKneeGroup.add(leftBoot);
    this.registerMesh(leftBoot, jointMat);

    // 7. Right Leg Group (Hip pivot at right bottom of pelvis)
    this.rightLegGroup.position.set(0.16 * s, 0, 0);
    this.pelvis.add(this.rightLegGroup);

    // Thigh (Upper Leg)
    const rightThigh = new THREE.Mesh(thighGeo, uniformMat);
    rightThigh.position.y = -0.21 * s;
    this.rightLegGroup.add(rightThigh);
    this.registerMesh(rightThigh, uniformMat);

    // Right Knee Group (Knee pivot)
    this.rightKneeGroup.position.set(0, -0.42 * s, 0);
    this.rightLegGroup.add(this.rightKneeGroup);

    // Knee Armor Pad (Highlighted color)
    const rightKneePad = new THREE.Mesh(kneePadGeo, highlightMat);
    rightKneePad.position.set(0, 0, 0.10 * s);
    this.rightKneeGroup.add(rightKneePad);
    this.registerMesh(rightKneePad, highlightMat);

    // Shin / Calf (Lower Leg)
    const rightShin = new THREE.Mesh(shinGeo, uniformMat);
    rightShin.position.y = -0.19 * s;
    this.rightKneeGroup.add(rightShin);
    this.registerMesh(rightShin, uniformMat);

    // Combat Boot
    const rightBoot = new THREE.Mesh(bootGeo, jointMat);
    rightBoot.position.set(0, -0.40 * s, 0.04 * s);
    this.rightKneeGroup.add(rightBoot);
    this.registerMesh(rightBoot, jointMat);
  }

  public updateHealthBar() {
    if (!this.healthBarMesh) return;
    const healthRatio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    this.healthBarMesh.scale.x = healthRatio;
    this.healthBarMesh.position.x = -(1 - healthRatio) * 0.48;
  }

  public setHealth(health: number, maxHealth?: number) {
    if (maxHealth !== undefined) this.maxHealth = maxHealth;
    this.health = Math.max(0, health);
    this.updateHealthBar();
    if (this.health <= 0 && !this.isDead) {
      this.die();
    }
  }

  public die() {
    if (this.isDead) return;
    this.isDead = true;
    this.health = 0;
    this.updateHealthBar();
    soundManager.playEnemyDeath(this.type);
  }

  public takeDamage(
    amount: number,
    isHeadshot: boolean,
    hitNormal?: THREE.Vector3
  ): { killed: boolean; finalDamage: number; blocked: boolean } {
    if (this.isDead) return { killed: false, finalDamage: 0, blocked: false };

    // Shield Enemy front deflection check
    if (this.type === 'shield' && hitNormal) {
      const enemyForward = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
      const dot = hitNormal.dot(enemyForward);
      if (dot < -0.3) {
        soundManager.playHitmark(false);
        return { killed: false, finalDamage: 0, blocked: true };
      }
    }

    const finalDamage = Math.round(amount * (isHeadshot ? 2.5 : 1.0));
    this.health = Math.max(0, this.health - finalDamage);

    // Trigger visual hit flash
    this.hitFlashTimer = 0.08;
    this.applyHitFlash(true);

    soundManager.playEnemyHit();

    // Update health bar scale
    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
      return { killed: true, finalDamage, blocked: false };
    }

    return { killed: false, finalDamage, blocked: false };
  }

  private applyHitFlash(flash: boolean) {
    this.originalMaterials.forEach((origMat, mesh) => {
      mesh.material = flash ? this.flashMaterial : origMat;
    });
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    obstacles: ArenaObstacle[],
    onShoot?: (event: EnemyShootEvent) => void,
    onPlayerHit?: (damage: number) => void,
    onExplode?: (enemy: Enemy) => void,
    buildingContext?: EnemyBuildingContext
  ) {
    // 1. Human Death Animation (ragdoll collapse backward onto the floor, then sinks away)
    if (this.isDead) {
      this.deathTimer += delta;
      // Stagger and fall backward onto ground
      this.humanGroup.rotation.x = THREE.MathUtils.lerp(this.humanGroup.rotation.x, -Math.PI / 2.1, delta * 7);
      this.humanGroup.position.y = THREE.MathUtils.lerp(this.humanGroup.position.y, 0.15 * this.scaleFactor, delta * 6);
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0.4, delta * 5);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, -0.3, delta * 5);
      this.leftArmGroup.rotation.z = THREE.MathUtils.lerp(this.leftArmGroup.rotation.z, -0.8, delta * 5);
      this.rightArmGroup.rotation.z = THREE.MathUtils.lerp(this.rightArmGroup.rotation.z, 0.8, delta * 5);

      if (this.groundHighlightRing) {
        this.groundHighlightRing.scale.multiplyScalar(Math.max(0, 1 - delta * 4));
      }

      // Sinks into ground and shrinks to trigger cleanup
      if (this.deathTimer > 0.45) {
        this.mesh.scale.multiplyScalar(Math.max(0, 1 - delta * 3.5));
      }
      return;
    }

    // 2. Hit Flash Decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        this.applyHitFlash(false);
      }
    }

    // Billboards face player camera
    this.healthBarBg.lookAt(playerPos.x, this.healthBarBg.position.y + this.position.y, playerPos.z);
    this.healthBarMesh.lookAt(playerPos.x, this.healthBarMesh.position.y + this.position.y, playerPos.z);

    const playerBuilding = buildingContext?.playerBuilding || null;
    const isPlayerInBuilding = playerBuilding !== null;
    const isDoorOpen = playerBuilding ? playerBuilding.door.isOpen : false;
    const isEnemyInPlayerBuilding = playerBuilding
      ? (buildingContext?.isInsideBuilding ? buildingContext.isInsideBuilding(this.position) : false)
      : false;

    // Tactical Target Acquisition: doorway waypoints or direct player tracking
    let aimTarget = playerPos;
    let moveTarget = playerPos;

    if (isPlayerInBuilding) {
      if (isEnemyInPlayerBuilding) {
        // Both enemy and player are inside the building: direct close-quarters indoor combat!
        aimTarget = playerPos;
        moveTarget = playerPos;
      } else if (isDoorOpen) {
        // Player is inside and door is OPEN: enemies actively enter through the doorway!
        const distToApproach = this.position.distanceTo(playerBuilding.doorApproachPos);
        if (distToApproach > 2.0) {
          // Approach front entrance outside
          moveTarget = playerBuilding.doorApproachPos;
          aimTarget = playerBuilding.doorApproachPos;
        } else {
          // Cross open threshold into building interior
          moveTarget = playerBuilding.doorInsidePos;
          aimTarget = playerPos;
        }
      } else {
        // Player is inside and door is CLOSED: enemies CANNOT enter!
        const distToApproach = this.position.distanceTo(playerBuilding.doorApproachPos);
        if (distToApproach > 4.5) {
          moveTarget = playerBuilding.doorApproachPos;
        } else {
          moveTarget = this.position;
        }
        aimTarget = playerBuilding.doorWorldPos;
      }
    }

    const distToPlayer = this.position.distanceTo(playerPos);
    const distToMoveTarget = this.position.distanceTo(moveTarget);
    this.stateTimer += delta;

    // Turn toward target
    const targetAngle = Math.atan2(aimTarget.x - this.position.x, aimTarget.z - this.position.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, delta * 8);

    // 3. Exploder Fuse Logic & Blinking Chest Core
    if (this.type === 'exploder') {
      if (distToPlayer < 4.8) {
        this.isFuseActive = true;
      }
      if (this.isFuseActive) {
        this.fuseTimer -= delta;
        const pulse = Math.sin(this.stateTimer * 28) * 0.5 + 0.5;
        if (this.coreMesh) {
          this.coreMesh.scale.setScalar(1 + pulse * 0.6);
        }

        if (this.fuseTimer <= 0) {
          this.isDead = true;
          soundManager.playExplosion();
          if (distToPlayer < 6.5 && onPlayerHit) {
            const factor = 1 - (distToPlayer / 6.5);
            onPlayerHit(Math.round(this.damage * factor));
          }
          if (onExplode) {
            onExplode(this);
          }
          return;
        }
      }
    }

    // Attack Cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // 4. Movement & Combat AI
    let moveDir = new THREE.Vector3();

    if (isPlayerInBuilding && !isEnemyInPlayerBuilding && !isDoorOpen) {
      // Door is closed: enemy outside holds position and paces/patrols outside, CANNOT enter!
      if (distToMoveTarget > 0.5) {
        moveDir.subVectors(moveTarget, this.position).normalize();
      } else {
        // Gentle strafe outside the entrance
        if (this.stateTimer > 2.5) {
          this.strafeDir *= -1;
          this.stateTimer = 0;
        }
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        moveDir.copy(right).multiplyScalar(this.strafeDir * 0.45);
      }
    } else if (this.type === 'exploder') {
      // Suicide bomber charges directly to moveTarget (enters doorway if open, or charges player)
      moveDir.subVectors(moveTarget, this.position).normalize();
    } else if (isPlayerInBuilding && !isEnemyInPlayerBuilding && isDoorOpen) {
      // Infiltrating into the building through the open door!
      moveDir.subVectors(moveTarget, this.position).normalize();
    } else {
      // ARMED HUMAN COMBATANT (SHOOTING & TACTICAL ENGAGEMENT)
      const minDistance = this.type === 'ranged' ? 12 : (this.type === 'basic' ? 8 : (this.type === 'tank' ? 6 : 5));
      const maxDistance = this.type === 'ranged' ? 24 : (this.type === 'basic' ? 15 : 13);

      if (distToMoveTarget > maxDistance) {
        // Advance into optimal combat firing range
        moveDir.subVectors(moveTarget, this.position).normalize();
      } else if (distToMoveTarget < minDistance) {
        // Backpedal to maintain tactical shooting distance
        moveDir.subVectors(this.position, moveTarget).normalize();
      } else {
        // In sweet-spot: strafe left & right while aiming and firing
        if (this.stateTimer > 2.2) {
          this.strafeDir *= -1;
          this.stateTimer = 0;
        }
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        moveDir.copy(right).multiplyScalar(this.strafeDir * 0.75);
      }
    }

    // Close-range emergency melee strike if player is within 1.8m
    const canMelee = !isPlayerInBuilding || isEnemyInPlayerBuilding || isDoorOpen;
    if (distToPlayer < 1.8 && this.attackCooldown <= 0 && canMelee) {
      this.attackCooldown = 0.8;
      if (onPlayerHit) {
        onPlayerHit(this.damage + 4);
      }
    }

    // Ranged Fire Attack (Shooting at player)
    const canShoot = !isPlayerInBuilding || isEnemyInPlayerBuilding || isDoorOpen;
    if (canShoot && this.attackCooldown <= 0 && distToPlayer <= this.attackRange) {
      this.attackCooldown = this.attackInterval + (Math.random() * 0.3 - 0.15);

        if (onShoot) {
          const shootOrigin = this.position.clone();
          shootOrigin.y += this.getHeight() * 0.62;

          let soundType: 'rifle' | 'shotgun' | 'smg' | 'sniper' | 'plasma' = 'rifle';
          let speed = 28;
          let spread = 0.05;
          let isPlasma = false;

          switch (this.type) {
            case 'ranged':
              soundType = 'sniper';
              speed = 38;
              spread = 0.02;
              break;
            case 'fast':
              soundType = 'smg';
              speed = 30;
              spread = 0.07;
              break;
            case 'shield':
              soundType = 'smg';
              speed = 26;
              spread = 0.05;
              break;
            case 'tank':
              soundType = 'shotgun';
              speed = 22;
              spread = 0.04;
              isPlasma = true;
              break;
            case 'elite':
              soundType = 'rifle';
              speed = 34;
              spread = 0.03;
              break;
            case 'basic':
            default:
              soundType = 'rifle';
              speed = 28;
              spread = 0.05;
              break;
          }

          onShoot({
            origin: shootOrigin,
            target: playerPos.clone().add(new THREE.Vector3(0, 0.35, 0)),
            damage: this.damage,
            speed,
            spread,
            soundType,
            isPlasma
          });
        }
      }

    const isMoving = moveDir.lengthSq() > 0.01;

    // 5. Natural Human Walk, Run & Combat Animations
    const animRate = this.type === 'fast' ? 14 : (this.type === 'tank' ? 6 : 9);

    if (isMoving) {
      this.walkCycle += delta * animRate;

      // Leg stride oscillation
      const strideAmp = this.type === 'fast' ? 0.85 : 0.72;
      this.leftLegGroup.rotation.x = Math.sin(this.walkCycle) * strideAmp;
      this.rightLegGroup.rotation.x = -Math.sin(this.walkCycle) * strideAmp;

      // Knee flexing during back-swing
      this.leftKneeGroup.rotation.x = Math.max(0, -Math.sin(this.walkCycle)) * 0.85;
      this.rightKneeGroup.rotation.x = Math.max(0, Math.sin(this.walkCycle)) * 0.85;

      // Vertical body bounce & hip sway as footsteps land
      this.pelvis.position.y = this.basePelvisY + Math.abs(Math.sin(this.walkCycle)) * (0.05 * this.scaleFactor);
      this.torsoGroup.rotation.z = Math.sin(this.walkCycle * 0.5) * 0.04;

      // Forward lean during run
      const forwardLean = this.type === 'fast' ? 0.32 : (this.type === 'exploder' ? 0.26 : 0.12);
      this.torsoGroup.rotation.x = forwardLean;

      // Arm swing dynamics
      if (this.type === 'shield') {
        // Shield bearer holds riot shield firmly in front
        this.leftArmGroup.rotation.x = -Math.PI / 3.4;
        this.leftForearmGroup.rotation.x = -Math.PI / 10;
        this.rightArmGroup.rotation.x = Math.sin(this.walkCycle) * 0.45;
      } else if (this.theme.hasWeapon) {
        // Weapon bearer keeps gun raised aiming forward, subtle recoil/bob
        this.rightArmGroup.rotation.x = -Math.PI / 2.3 + Math.sin(this.walkCycle * 2) * 0.04;
        this.leftArmGroup.rotation.x = -Math.sin(this.walkCycle) * 0.55;
      } else if (this.type === 'fast') {
        // Sprinter pumps both arms vigorously
        this.leftArmGroup.rotation.x = -Math.sin(this.walkCycle) * 0.95;
        this.rightArmGroup.rotation.x = Math.sin(this.walkCycle) * 0.95;
      } else if (this.type === 'exploder') {
        // Bomb infiltrator runs frantically with arms waving
        this.leftArmGroup.rotation.x = -Math.PI / 1.9 + Math.sin(this.walkCycle * 2) * 0.3;
        this.rightArmGroup.rotation.x = -Math.PI / 1.9 - Math.sin(this.walkCycle * 2) * 0.3;
      } else {
        // Standard opposite arm swing
        this.leftArmGroup.rotation.x = -Math.sin(this.walkCycle) * 0.65;
        this.rightArmGroup.rotation.x = Math.sin(this.walkCycle) * 0.65;
      }
    } else {
      // Idle Human Breathing & Stance Recovery
      this.walkCycle = 0;
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, delta * 6);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, delta * 6);
      this.leftKneeGroup.rotation.x = THREE.MathUtils.lerp(this.leftKneeGroup.rotation.x, 0, delta * 6);
      this.rightKneeGroup.rotation.x = THREE.MathUtils.lerp(this.rightKneeGroup.rotation.x, 0, delta * 6);
      this.torsoGroup.rotation.x = THREE.MathUtils.lerp(this.torsoGroup.rotation.x, 0, delta * 6);
      this.torsoGroup.rotation.z = THREE.MathUtils.lerp(this.torsoGroup.rotation.z, 0, delta * 6);

      // Subtle breathing expansion
      this.torsoGroup.position.y = this.baseTorsoY + Math.sin(this.stateTimer * 2.4) * 0.012;
      this.headGroup.rotation.x = Math.sin(this.stateTimer * 2.0) * 0.015;

      if (this.theme.hasWeapon) {
        this.rightArmGroup.rotation.x = -Math.PI / 2.3;
      }
    }

    // 6. Attack Gun Recoil & Punch Animation
    const isAttacking = this.attackCooldown > (this.attackInterval - 0.22);
    if (isAttacking && this.theme.hasWeapon) {
      // Gun recoil kickback
      this.rightArmGroup.rotation.x = -Math.PI / 2.05;
      if (this.weaponMesh) {
        this.weaponMesh.position.z = 0.16 * this.scaleFactor;
      }
    } else if (this.weaponMesh) {
      this.weaponMesh.position.z = THREE.MathUtils.lerp(this.weaponMesh.position.z, 0.22 * this.scaleFactor, delta * 12);
    }

    if (isAttacking && !this.theme.hasWeapon && this.type !== 'shield') {
      // Melee punch thrust
      this.rightArmGroup.rotation.x = -Math.PI / 1.8;
      this.torsoGroup.rotation.y = 0.25;
    } else {
      this.torsoGroup.rotation.y = THREE.MathUtils.lerp(this.torsoGroup.rotation.y, 0, delta * 6);
    }

    // 7. Move enemy and avoid obstacles
    if (isMoving) {
      moveDir.y = 0;
      moveDir.normalize();

      const nextPos = this.position.clone().addScaledVector(moveDir, this.speed * delta);
      const collisionDist = 0.45 * this.scaleFactor;

      for (const obs of obstacles) {
        // Skip obstacles high above (roofs, lintels) or below ground
        if (obs.box.min.y > 1.8 || obs.box.max.y < 0.05) continue;
        // Skip empty boxes (e.g. open door obstacles)
        if (obs.box.isEmpty()) continue;

        if (obs.box.distanceToPoint(nextPos) < collisionDist) {
          const obsCenter = obs.box.getCenter(new THREE.Vector3());
          const toObs = new THREE.Vector3().subVectors(nextPos, obsCenter);
          toObs.y = 0;
          if (toObs.lengthSq() > 0.001) {
            toObs.normalize();
            const tangent = new THREE.Vector3(-toObs.z, 0, toObs.x);
            const dot = tangent.dot(moveDir);
            moveDir.copy(tangent).multiplyScalar(dot >= 0 ? 1 : -1).normalize();
            nextPos.copy(this.position).addScaledVector(moveDir, this.speed * 0.7 * delta);
          }
          break;
        }
      }

      const maxCoord = (buildingContext?.arenaSize ? buildingContext.arenaSize / 2 : 62) - 2.5;
      this.position.x = THREE.MathUtils.clamp(nextPos.x, -maxCoord, maxCoord);
      this.position.y = 0; // Firmly lock to ground level
      this.position.z = THREE.MathUtils.clamp(nextPos.z, -maxCoord, maxCoord);
      this.mesh.position.copy(this.position);
    }
  }

  public dispose() {
    this.originalMaterials.clear();
    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    });
  }
}
