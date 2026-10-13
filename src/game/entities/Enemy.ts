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
  getBuildingAtPosition?: (pos: THREE.Vector3) => InteriorZone | null;
}

interface HumanTheme {
  name: string;
  highlightHex: number;
  emissiveHex: number;
  uniformHex: number;
  skinHex: number;
  hairHex: number;
  pantsHex: number;
  vestHex: number;
  gearAccentHex: number;
  headwearType: 'helmet' | 'cap' | 'beanie' | 'boonie' | 'balaclava';
  headwearHex: number;
  eyewearType: 'eyes' | 'shades' | 'goggles';
  bootHex: number;
  scale: number;
  hasWeapon: boolean;
  hasShield: boolean;
  hasExplosiveVest: boolean;
  rolledSleeves?: boolean;
}

export const HUMAN_THEMES: Record<EnemyType, HumanTheme> = {
  basic: {
    name: 'Insurgent Rifleman',
    highlightHex: 0xd97706, // Warm Amber
    emissiveHex: 0x000000,
    uniformHex: 0xc2410c,   // Desert Rust/Terracotta combat shirt
    skinHex: 0xd4a373,      // Natural warm tan skin
    hairHex: 0x5c3a21,      // Warm brown hair/stubble
    pantsHex: 0xd5bdaf,     // Sandstone Khaki cargo trousers
    vestHex: 0xa16207,      // Coyote Tan plate carrier
    gearAccentHex: 0xb45309,// Tan webbing & pouches
    headwearType: 'cap',    // Amber Tan contractor baseball cap
    headwearHex: 0xb45309,
    eyewearType: 'eyes',    // Natural human eyes
    bootHex: 0x854d0e,      // Coyote brown leather boots
    scale: 1.0,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false,
    rolledSleeves: true
  },
  fast: {
    name: 'Scout Skirmisher',
    highlightHex: 0x22c55e, // Emerald Green
    emissiveHex: 0x000000,
    uniformHex: 0x16a34a,   // Ranger Green combat hoodie
    skinHex: 0xdfb18e,      // Fair tan skin
    hairHex: 0x78350f,      // Chestnut brown hair
    pantsHex: 0xe2e8f0,     // Light sandstone athletic cargo trousers
    vestHex: 0x65a30d,      // Olive Green tactical chest rig
    gearAccentHex: 0x4d7c0f,// Olive webbing
    headwearType: 'beanie', // Green watch cap beanie
    headwearHex: 0x15803d,
    eyewearType: 'shades',  // Polarized shooting shades
    bootHex: 0x92400e,      // Tan suede tactical boots
    scale: 0.96,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false,
    rolledSleeves: true
  },
  ranged: {
    name: 'Sniper Marksman',
    highlightHex: 0x0284c7, // Sky Blue
    emissiveHex: 0x000000,
    uniformHex: 0x4d7c0f,   // Woodland Camouflage field jacket
    skinHex: 0xc99a6b,      // Weathered olive tan skin
    hairHex: 0x451a03,      // Dark auburn hair
    pantsHex: 0x65a30d,     // Forest field trousers
    vestHex: 0xca8a04,      // Khaki sniper harness
    gearAccentHex: 0xa16207,// Tan webbing
    headwearType: 'boonie', // Woodland Green boonie hat
    headwearHex: 0x3f6212,
    eyewearType: 'goggles', // Ballistic combat goggles
    bootHex: 0x713f12,      // Rich brown field boots
    scale: 1.02,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false
  },
  tank: {
    name: 'Heavy Juggernaut',
    highlightHex: 0x3b82f6, // Vibrant Cobalt Blue
    emissiveHex: 0x000000,
    uniformHex: 0x2563eb,   // Heavy Cobalt Blue assault suit
    skinHex: 0xa8744f,      // Deep tan skin
    hairHex: 0x451a03,      // Brown hair
    pantsHex: 0x3b82f6,     // Reinforced Cobalt blast cargo pants
    vestHex: 0x1d4ed8,      // Heavy Blue Steel ceramic plate carrier
    gearAccentHex: 0x60a5fa,// Titanium blue accents
    headwearType: 'helmet', // Heavy Cobalt ballistic assault helmet
    headwearHex: 0x1e40af,
    eyewearType: 'goggles', // Ballistic face goggles
    bootHex: 0x78350f,      // Heavy brown leather boots
    scale: 1.18,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false
  },
  shield: {
    name: 'SWAT Riot Breacher',
    highlightHex: 0x2563eb, // Royal Blue
    emissiveHex: 0x000000,
    uniformHex: 0x1d4ed8,   // Royal Blue SWAT tactical uniform
    skinHex: 0xcca078,      // Neutral tan skin
    hairHex: 0x3e2723,      // Dark brown hair
    pantsHex: 0x2563eb,     // Royal Blue SWAT cargo pants
    vestHex: 0x1e40af,      // Tactical Blue SWAT vest
    gearAccentHex: 0x60a5fa,// Steel webbing
    headwearType: 'helmet', // SWAT Royal Blue ballistic helmet
    headwearHex: 0x1d4ed8,
    eyewearType: 'goggles', // Protective goggles
    bootHex: 0x854d0e,      // Tan assault boots
    scale: 1.04,
    hasWeapon: true,
    hasShield: true,
    hasExplosiveVest: false
  },
  exploder: {
    name: 'Saboteur Demolitionist',
    highlightHex: 0xf97316, // Bright Orange
    emissiveHex: 0x000000,
    uniformHex: 0xea580c,   // High-Visibility Hazard Orange jacket
    skinHex: 0xe0b99c,      // Pale weathered skin
    hairHex: 0x451a03,      // Brown hair
    pantsHex: 0xd97706,     // Amber Hazard cargo trousers
    vestHex: 0xb45309,      // Demolition harness
    gearAccentHex: 0xd97706,// Demolition straps
    headwearType: 'balaclava', // Hazard Rust ski mask
    headwearHex: 0xc2410c,
    eyewearType: 'eyes',    // Human eyes looking through mask
    bootHex: 0x78350f,      // Brown demolition boots
    scale: 0.98,
    hasWeapon: false,
    hasShield: false,
    hasExplosiveVest: true
  },
  elite: {
    name: 'Spec-Ops Commander',
    highlightHex: 0xeab308, // Desert Gold
    emissiveHex: 0x000000,
    uniformHex: 0xd97706,   // Desert Multicam combat shirt
    skinHex: 0xb87a46,      // Bronzed skin
    hairHex: 0x5c3a21,      // Brown hair
    pantsHex: 0xca8a04,     // Khaki Desert cargo pants
    vestHex: 0xb45309,      // Coyote Gold plate carrier
    gearAccentHex: 0xd97706,// Coyote webbing
    headwearType: 'helmet', // Coyote Tan FAST ballistic helmet
    headwearHex: 0xca8a04,
    eyewearType: 'shades',  // Polarized ballistic shades
    bootHex: 0x854d0e,      // Coyote brown combat boots
    scale: 1.06,
    hasWeapon: true,
    hasShield: false,
    hasExplosiveVest: false,
    rolledSleeves: true
  }
};

export class Enemy {
  private static _moveDir = new THREE.Vector3();
  private static _nextPos = new THREE.Vector3();
  private static _closestPoint = new THREE.Vector3();
  private static _rightVec = new THREE.Vector3();
  private static _yUpAxis = new THREE.Vector3(0, 1, 0);
  private static _nearbyObstacles: ArenaObstacle[] = [];
  private static _losRay = new THREE.Ray();
  private static _losHit = new THREE.Vector3();
  private static _losDir = new THREE.Vector3();

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
  private weaponTuck: number = 0;
  private losCheckTimer: number = Math.random() * 0.12;
  private cachedHasLineOfSight: boolean = true;

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
      color: 0xef4444,
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

    // 1. Realistic Human & Tactical Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: theme.skinHex,
      roughness: 0.78,
      metalness: 0.04
    });

    const uniformMat = new THREE.MeshStandardMaterial({
      color: theme.uniformHex,
      roughness: 0.85,
      metalness: 0.06
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: theme.pantsHex,
      roughness: 0.88,
      metalness: 0.05
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: theme.vestHex,
      roughness: 0.72,
      metalness: 0.1
    });

    const gearMat = new THREE.MeshStandardMaterial({
      color: theme.gearAccentHex,
      roughness: 0.7,
      metalness: 0.12
    });

    const headwearMat = new THREE.MeshStandardMaterial({
      color: theme.headwearHex,
      roughness: 0.76,
      metalness: 0.1
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: theme.hairHex,
      roughness: 0.95,
      metalness: 0.0
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: theme.bootHex,
      roughness: 0.82,
      metalness: 0.1
    });

    const soleMat = new THREE.MeshStandardMaterial({
      color: 0x78716c, // Stone/tan rubber sole
      roughness: 0.88,
      metalness: 0.05
    });

    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Warm brown/tan leather shooting gloves
      roughness: 0.75,
      metalness: 0.08
    });

    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x52525b, // Polished gunmetal steel (not black)
      roughness: 0.38,
      metalness: 0.78
    });

    const gunDetailMat = new THREE.MeshStandardMaterial({
      color: 0x78716c, // Tactical polymer tan furniture
      roughness: 0.55,
      metalness: 0.25
    });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xf1f5f9
    });

    const eyePupilMat = new THREE.MeshBasicMaterial({
      color: 0x3f3f46
    });

    const shadesMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Polarized cobalt blue lenses
      roughness: 0.15,
      metalness: 0.85
    });

    const gogglesFrameMat = new THREE.MeshStandardMaterial({
      color: 0x78716c, // Tan tactical goggles frame
      roughness: 0.65,
      metalness: 0.15
    });

    const gogglesLensMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa, // Tinted anti-fragmentation blue lens
      roughness: 0.18,
      metalness: 0.8
    });

    // Root of Human Body
    this.mesh.add(this.humanGroup);

    // 0. Soft Ground Contact Shadow (Natural human ground contact - replaces neon sci-fi circle)
    const shadowGeo = new THREE.CircleGeometry(0.42 * s, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.groundHighlightRing = new THREE.Mesh(shadowGeo, shadowMat);
    this.groundHighlightRing.rotation.x = -Math.PI / 2;
    this.groundHighlightRing.position.y = 0.015;
    this.groundHighlightRing.raycast = () => {};
    this.mesh.add(this.groundHighlightRing);

    // 1. Pelvis / Hips (Root of body motion)
    this.basePelvisY = 0.92 * s;
    this.pelvis.position.set(0, this.basePelvisY, 0);
    this.humanGroup.add(this.pelvis);

    // Tactical cargo pants waistband and hips
    const hipGeo = new THREE.BoxGeometry(0.40 * s, 0.22 * s, 0.26 * s);
    const hipMesh = new THREE.Mesh(hipGeo, pantsMat);
    this.pelvis.add(hipMesh);
    this.registerMesh(hipMesh, pantsMat);

    // Tactical Duty Belt with metal buckle
    const beltGeo = new THREE.BoxGeometry(0.42 * s, 0.07 * s, 0.28 * s);
    const beltMesh = new THREE.Mesh(beltGeo, gearMat);
    beltMesh.position.y = 0.08 * s;
    this.pelvis.add(beltMesh);
    this.registerMesh(beltMesh, gearMat);

    const buckleGeo = new THREE.BoxGeometry(0.08 * s, 0.06 * s, 0.02 * s);
    const buckleMesh = new THREE.Mesh(buckleGeo, gunDetailMat);
    buckleMesh.position.set(0, 0.08 * s, 0.145 * s);
    this.pelvis.add(buckleMesh);
    this.registerMesh(buckleMesh, gunDetailMat);

    // Tactical sidearm holster on right hip
    const holsterGeo = new THREE.BoxGeometry(0.08 * s, 0.16 * s, 0.10 * s);
    const holsterMesh = new THREE.Mesh(holsterGeo, gearMat);
    holsterMesh.position.set(0.22 * s, -0.04 * s, 0);
    this.pelvis.add(holsterMesh);
    this.registerMesh(holsterMesh, gearMat);

    // 2. Spine & Torso Group (Pivots at waist above pelvis)
    this.baseTorsoY = 0.12 * s;
    this.torsoGroup.position.set(0, this.baseTorsoY, 0);
    this.pelvis.add(this.torsoGroup);

    // Waist / Abdomen (Combat shirt tuck)
    const abdomenGeo = new THREE.BoxGeometry(0.38 * s, 0.24 * s, 0.24 * s);
    const abdomenMesh = new THREE.Mesh(abdomenGeo, uniformMat);
    abdomenMesh.position.y = 0.12 * s;
    this.torsoGroup.add(abdomenMesh);
    this.registerMesh(abdomenMesh, uniformMat);

    // Upper Torso / Chest (Combat shirt base)
    const chestGeo = new THREE.BoxGeometry(0.44 * s, 0.36 * s, 0.26 * s);
    const chestMesh = new THREE.Mesh(chestGeo, uniformMat);
    chestMesh.position.y = 0.38 * s;
    this.torsoGroup.add(chestMesh);
    this.registerMesh(chestMesh, uniformMat);

    // Tactical Plate Carrier Vest (Front & Back Ballistic Armor)
    const vestFrontGeo = new THREE.BoxGeometry(0.42 * s, 0.34 * s, 0.10 * s);
    const vestFrontMesh = new THREE.Mesh(vestFrontGeo, vestMat);
    vestFrontMesh.position.set(0, 0.38 * s, 0.10 * s);
    this.torsoGroup.add(vestFrontMesh);
    this.registerMesh(vestFrontMesh, vestMat);

    const vestBackGeo = new THREE.BoxGeometry(0.42 * s, 0.34 * s, 0.08 * s);
    const vestBackMesh = new THREE.Mesh(vestBackGeo, vestMat);
    vestBackMesh.position.set(0, 0.38 * s, -0.10 * s);
    this.torsoGroup.add(vestBackMesh);
    this.registerMesh(vestBackMesh, vestMat);

    // Plate carrier shoulder straps
    const strapGeo = new THREE.BoxGeometry(0.09 * s, 0.06 * s, 0.28 * s);
    const leftStrap = new THREE.Mesh(strapGeo, vestMat);
    leftStrap.position.set(-0.14 * s, 0.54 * s, 0);
    this.torsoGroup.add(leftStrap);
    this.registerMesh(leftStrap, vestMat);

    const rightStrap = new THREE.Mesh(strapGeo, vestMat);
    rightStrap.position.set(0.14 * s, 0.54 * s, 0);
    this.torsoGroup.add(rightStrap);
    this.registerMesh(rightStrap, vestMat);

    // MOLLE Magazine Pouches across chest/stomach
    for (let i = -1; i <= 1; i++) {
      const magPouchGeo = new THREE.BoxGeometry(0.08 * s, 0.13 * s, 0.05 * s);
      const magPouch = new THREE.Mesh(magPouchGeo, gearMat);
      magPouch.position.set(i * 0.11 * s, 0.32 * s, 0.17 * s);
      this.torsoGroup.add(magPouch);
      this.registerMesh(magPouch, gearMat);
    }

    // Tactical Shoulder Radio with Antenna
    const radioGeo = new THREE.BoxGeometry(0.06 * s, 0.10 * s, 0.06 * s);
    const radioMesh = new THREE.Mesh(radioGeo, gunDetailMat);
    radioMesh.position.set(-0.16 * s, 0.53 * s, 0.10 * s);
    this.torsoGroup.add(radioMesh);
    this.registerMesh(radioMesh, gunDetailMat);

    const antennaGeo = new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.16 * s, 6);
    const antennaMesh = new THREE.Mesh(antennaGeo, gunMat);
    antennaMesh.position.set(-0.16 * s, 0.63 * s, 0.10 * s);
    this.torsoGroup.add(antennaMesh);
    this.registerMesh(antennaMesh, gunMat);

    // Heavy Pauldrons only for Heavy Juggernaut
    if (this.type === 'tank') {
      const pauldronGeo = new THREE.BoxGeometry(0.18 * s, 0.16 * s, 0.24 * s);
      const leftPad = new THREE.Mesh(pauldronGeo, vestMat);
      leftPad.position.set(-0.31 * s, 0.54 * s, 0);
      this.torsoGroup.add(leftPad);
      this.registerMesh(leftPad, vestMat);

      const rightPad = new THREE.Mesh(pauldronGeo, vestMat);
      rightPad.position.set(0.31 * s, 0.54 * s, 0);
      this.torsoGroup.add(rightPad);
      this.registerMesh(rightPad, vestMat);

      // Heavy throat / collar protection
      const collarGeo = new THREE.BoxGeometry(0.32 * s, 0.10 * s, 0.24 * s);
      const collarMesh = new THREE.Mesh(collarGeo, vestMat);
      collarMesh.position.set(0, 0.57 * s, 0.03 * s);
      this.torsoGroup.add(collarMesh);
      this.registerMesh(collarMesh, vestMat);
    }

    // Saboteur Demolitionist C4 Demolition Rig
    if (theme.hasExplosiveVest) {
      // 2x Strapped C4 demolition blocks wrapped in olive military tape
      const c4Geo = new THREE.BoxGeometry(0.13 * s, 0.08 * s, 0.06 * s);
      const c4Mat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.85 });

      const c4Top = new THREE.Mesh(c4Geo, c4Mat);
      c4Top.position.set(0, 0.44 * s, 0.18 * s);
      this.torsoGroup.add(c4Top);
      this.registerMesh(c4Top, c4Mat);

      const c4Bottom = new THREE.Mesh(c4Geo, c4Mat);
      c4Bottom.position.set(0, 0.34 * s, 0.18 * s);
      this.torsoGroup.add(c4Bottom);
      this.registerMesh(c4Bottom, c4Mat);

      // Digital detonator timer box with LED indicator (serves as this.coreMesh for fuse countdown pulse)
      const detonatorGeo = new THREE.BoxGeometry(0.09 * s, 0.07 * s, 0.05 * s);
      const detonatorMat = new THREE.MeshStandardMaterial({
        color: 0x78716c,
        roughness: 0.5,
        metalness: 0.25
      });
      this.coreMesh = new THREE.Mesh(detonatorGeo, detonatorMat);
      this.coreMesh.position.set(0, 0.24 * s, 0.18 * s);
      this.torsoGroup.add(this.coreMesh);
      this.registerMesh(this.coreMesh, detonatorMat);

      const timerLedGeo = new THREE.BoxGeometry(0.05 * s, 0.02 * s, 0.01 * s);
      const timerLedMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
      const timerLed = new THREE.Mesh(timerLedGeo, timerLedMat);
      timerLed.position.set(0, 0.01 * s, 0.026 * s);
      this.coreMesh.add(timerLed);
    }

    // 3. Head & Neck (Weakpoint Headshot Detection Mesh)
    this.headGroup.position.set(0, 0.60 * s, 0);
    this.torsoGroup.add(this.headGroup);

    // Natural Neck
    const neckGeo = new THREE.CylinderGeometry(0.075 * s, 0.085 * s, 0.12 * s, 10);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = 0.06 * s;
    this.headGroup.add(neckMesh);
    this.registerMesh(neckMesh, skinMat);

    // Human Head (Cranium weakpoint mesh)
    const isBalaclava = theme.headwearType === 'balaclava';
    const headBaseMat = isBalaclava ? headwearMat : skinMat;
    const headGeo = new THREE.BoxGeometry(0.26 * s, 0.28 * s, 0.26 * s);
    this.headMesh = new THREE.Mesh(headGeo, headBaseMat);
    this.headMesh.position.set(0, 0.24 * s, 0);
    this.headGroup.add(this.headMesh);
    this.registerMesh(this.headMesh, headBaseMat);

    // 3D Human Nose
    const noseGeo = new THREE.BoxGeometry(0.046 * s, 0.08 * s, 0.055 * s);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.position.set(0, -0.01 * s, 0.155 * s);
    this.headMesh.add(noseMesh);
    this.registerMesh(noseMesh, skinMat);

    // Left and Right Human Ears
    if (!isBalaclava) {
      const earGeo = new THREE.BoxGeometry(0.035 * s, 0.075 * s, 0.045 * s);
      const leftEar = new THREE.Mesh(earGeo, skinMat);
      leftEar.position.set(-0.145 * s, 0.01 * s, 0);
      this.headMesh.add(leftEar);
      this.registerMesh(leftEar, skinMat);

      const rightEar = new THREE.Mesh(earGeo, skinMat);
      rightEar.position.set(0.145 * s, 0.01 * s, 0);
      this.headMesh.add(rightEar);
      this.registerMesh(rightEar, skinMat);

      // Facial Stubble / Jawline contour
      const jawGeo = new THREE.BoxGeometry(0.25 * s, 0.09 * s, 0.25 * s);
      const jawMesh = new THREE.Mesh(jawGeo, hairMat);
      jawMesh.position.set(0, -0.10 * s, 0.01 * s);
      this.headMesh.add(jawMesh);
      this.registerMesh(jawMesh, hairMat);
    }

    // Human Eyes / Eyewear Configuration (No glowing robot visors)
    if (theme.eyewearType === 'eyes') {
      // Natural human eye sockets with white sclera and dark pupils
      const eyeGeo = new THREE.BoxGeometry(0.045 * s, 0.03 * s, 0.015 * s);
      const pupilGeo = new THREE.BoxGeometry(0.022 * s, 0.022 * s, 0.018 * s);

      // Left Eye
      const leftEyeWhite = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      leftEyeWhite.position.set(-0.065 * s, 0.045 * s, 0.133 * s);
      this.headMesh.add(leftEyeWhite);

      const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
      leftPupil.position.set(-0.065 * s, 0.045 * s, 0.135 * s);
      this.headMesh.add(leftPupil);

      // Right Eye
      const rightEyeWhite = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      rightEyeWhite.position.set(0.065 * s, 0.045 * s, 0.133 * s);
      this.headMesh.add(rightEyeWhite);

      const rightPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
      rightPupil.position.set(0.065 * s, 0.045 * s, 0.135 * s);
      this.headMesh.add(rightPupil);

      // Brow Ridge
      const browGeo = new THREE.BoxGeometry(0.24 * s, 0.035 * s, 0.04 * s);
      const browMesh = new THREE.Mesh(browGeo, hairMat);
      browMesh.position.set(0, 0.075 * s, 0.14 * s);
      this.headMesh.add(browMesh);
      this.registerMesh(browMesh, hairMat);
    } else if (theme.eyewearType === 'shades') {
      // Sleek tactical polarized shooting sunglasses
      const frameGeo = new THREE.BoxGeometry(0.26 * s, 0.04 * s, 0.03 * s);
      const frameMesh = new THREE.Mesh(frameGeo, gunDetailMat);
      frameMesh.position.set(0, 0.055 * s, 0.145 * s);
      this.headMesh.add(frameMesh);
      this.registerMesh(frameMesh, gunDetailMat);

      const lensGeo = new THREE.BoxGeometry(0.10 * s, 0.045 * s, 0.025 * s);
      const leftLens = new THREE.Mesh(lensGeo, shadesMat);
      leftLens.position.set(-0.065 * s, 0.045 * s, 0.145 * s);
      this.headMesh.add(leftLens);
      this.registerMesh(leftLens, shadesMat);

      const rightLens = new THREE.Mesh(lensGeo, shadesMat);
      rightLens.position.set(0.065 * s, 0.045 * s, 0.145 * s);
      this.headMesh.add(rightLens);
      this.registerMesh(rightLens, shadesMat);
    } else if (theme.eyewearType === 'goggles') {
      // Ballistic combat goggles with rubber frame and dark anti-fragmentation lens
      const goggleFrameGeo = new THREE.BoxGeometry(0.25 * s, 0.065 * s, 0.05 * s);
      const goggleFrame = new THREE.Mesh(goggleFrameGeo, gogglesFrameMat);
      goggleFrame.position.set(0, 0.045 * s, 0.14 * s);
      this.headMesh.add(goggleFrame);
      this.registerMesh(goggleFrame, gogglesFrameMat);

      const goggleLensGeo = new THREE.BoxGeometry(0.22 * s, 0.048 * s, 0.02 * s);
      const goggleLens = new THREE.Mesh(goggleLensGeo, gogglesLensMat);
      goggleLens.position.set(0, 0.045 * s, 0.16 * s);
      this.headMesh.add(goggleLens);
      this.registerMesh(goggleLens, gogglesLensMat);

      // Goggle elastic strap around head
      const strapGeo = new THREE.BoxGeometry(0.28 * s, 0.035 * s, 0.28 * s);
      const goggleStrap = new THREE.Mesh(strapGeo, gogglesFrameMat);
      goggleStrap.position.set(0, 0.045 * s, 0);
      this.headMesh.add(goggleStrap);
      this.registerMesh(goggleStrap, gogglesFrameMat);
    }

    // Authentic Tactical Headwear
    if (theme.headwearType === 'helmet') {
      // FAST High-cut tactical ballistic helmet shell
      const helmetDomeGeo = new THREE.BoxGeometry(0.31 * s, 0.18 * s, 0.31 * s);
      const helmetDome = new THREE.Mesh(helmetDomeGeo, headwearMat);
      helmetDome.position.set(0, 0.12 * s, 0);
      this.headMesh.add(helmetDome);
      this.registerMesh(helmetDome, headwearMat);

      // NVG Night-Vision Mounting Bracket on forehead
      const nvgGeo = new THREE.BoxGeometry(0.08 * s, 0.08 * s, 0.03 * s);
      const nvgMount = new THREE.Mesh(nvgGeo, gunDetailMat);
      nvgMount.position.set(0, 0.14 * s, 0.165 * s);
      this.headMesh.add(nvgMount);
      this.registerMesh(nvgMount, gunDetailMat);

      // Left & Right ARC Accessory Rails
      const railGeo = new THREE.BoxGeometry(0.02 * s, 0.04 * s, 0.16 * s);
      const leftRail = new THREE.Mesh(railGeo, gunDetailMat);
      leftRail.position.set(-0.165 * s, 0.12 * s, 0);
      this.headMesh.add(leftRail);
      this.registerMesh(leftRail, gunDetailMat);

      const rightRail = new THREE.Mesh(railGeo, gunDetailMat);
      rightRail.position.set(0.165 * s, 0.12 * s, 0);
      this.headMesh.add(rightRail);
      this.registerMesh(rightRail, gunDetailMat);

      // Tactical Comms Headset ear cups
      const earCupGeo = new THREE.BoxGeometry(0.04 * s, 0.08 * s, 0.06 * s);
      const leftCup = new THREE.Mesh(earCupGeo, gunDetailMat);
      leftCup.position.set(-0.155 * s, 0.01 * s, 0);
      this.headMesh.add(leftCup);
      this.registerMesh(leftCup, gunDetailMat);

      const rightCup = new THREE.Mesh(earCupGeo, gunDetailMat);
      rightCup.position.set(0.155 * s, 0.01 * s, 0);
      this.headMesh.add(rightCup);
      this.registerMesh(rightCup, gunDetailMat);
    } else if (theme.headwearType === 'cap') {
      // Contractor Baseball Cap Crown
      const capCrownGeo = new THREE.BoxGeometry(0.29 * s, 0.12 * s, 0.29 * s);
      const capCrown = new THREE.Mesh(capCrownGeo, headwearMat);
      capCrown.position.set(0, 0.12 * s, -0.01 * s);
      this.headMesh.add(capCrown);
      this.registerMesh(capCrown, headwearMat);

      // Forward curved cap visor / bill
      const capVisorGeo = new THREE.BoxGeometry(0.26 * s, 0.025 * s, 0.14 * s);
      const capVisor = new THREE.Mesh(capVisorGeo, headwearMat);
      capVisor.position.set(0, 0.09 * s, 0.18 * s);
      capVisor.rotation.x = 0.12;
      this.headMesh.add(capVisor);
      this.registerMesh(capVisor, headwearMat);

      // Velcro morale patch on front
      const patchGeo = new THREE.BoxGeometry(0.09 * s, 0.05 * s, 0.01 * s);
      const patchMesh = new THREE.Mesh(patchGeo, gearMat);
      patchMesh.position.set(0, 0.13 * s, 0.145 * s);
      this.headMesh.add(patchMesh);
      this.registerMesh(patchMesh, gearMat);
    } else if (theme.headwearType === 'beanie') {
      // Knitted Watch Cap / Tactical Beanie
      const beanieGeo = new THREE.BoxGeometry(0.30 * s, 0.18 * s, 0.30 * s);
      const beanieMesh = new THREE.Mesh(beanieGeo, headwearMat);
      beanieMesh.position.set(0, 0.12 * s, 0);
      this.headMesh.add(beanieMesh);
      this.registerMesh(beanieMesh, headwearMat);

      // Folded beanie brim cuff
      const cuffGeo = new THREE.BoxGeometry(0.31 * s, 0.06 * s, 0.31 * s);
      const cuffMesh = new THREE.Mesh(cuffGeo, headwearMat);
      cuffMesh.position.set(0, 0.06 * s, 0);
      this.headMesh.add(cuffMesh);
      this.registerMesh(cuffMesh, headwearMat);
    } else if (theme.headwearType === 'boonie') {
      // Tactical Boonie Hat Crown
      const boonieCrownGeo = new THREE.BoxGeometry(0.28 * s, 0.12 * s, 0.28 * s);
      const boonieCrown = new THREE.Mesh(boonieCrownGeo, headwearMat);
      boonieCrown.position.set(0, 0.12 * s, 0);
      this.headMesh.add(boonieCrown);
      this.registerMesh(boonieCrown, headwearMat);

      // Wide 360-degree fabric brim sloping downwards
      const brimGeo = new THREE.CylinderGeometry(0.26 * s, 0.28 * s, 0.02 * s, 16);
      const brimMesh = new THREE.Mesh(brimGeo, headwearMat);
      brimMesh.position.set(0, 0.07 * s, 0);
      this.headMesh.add(brimMesh);
      this.registerMesh(brimMesh, headwearMat);
    }

    // 4. Left Arm Group (Shoulder pivot at left side of chest)
    this.leftArmGroup.position.set(-0.29 * s, 0.48 * s, 0);
    this.torsoGroup.add(this.leftArmGroup);

    // Left Upper Arm (Bicep - Combat shirt sleeve)
    const upperArmGeo = new THREE.BoxGeometry(0.13 * s, 0.30 * s, 0.13 * s);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, uniformMat);
    leftUpperArm.position.y = -0.15 * s;
    this.leftArmGroup.add(leftUpperArm);
    this.registerMesh(leftUpperArm, uniformMat);

    // Rolled sleeve cuff if rolled sleeves enabled
    if (theme.rolledSleeves) {
      const cuffGeo = new THREE.BoxGeometry(0.145 * s, 0.05 * s, 0.145 * s);
      const leftCuff = new THREE.Mesh(cuffGeo, uniformMat);
      leftCuff.position.y = -0.28 * s;
      this.leftArmGroup.add(leftCuff);
      this.registerMesh(leftCuff, uniformMat);
    }

    // Left Forearm Group (Elbow pivot)
    this.leftForearmGroup.position.set(0, -0.30 * s, 0);
    this.leftArmGroup.add(this.leftForearmGroup);

    // Forearm material: exposed skin for rolled sleeves, or uniform fabric
    const forearmMat = theme.rolledSleeves ? skinMat : uniformMat;
    const forearmGeo = new THREE.BoxGeometry(0.115 * s, 0.26 * s, 0.115 * s);
    const leftForearm = new THREE.Mesh(forearmGeo, forearmMat);
    leftForearm.position.y = -0.13 * s;
    this.leftForearmGroup.add(leftForearm);
    this.registerMesh(leftForearm, forearmMat);

    // Tactical Watch on left wrist
    const watchBandGeo = new THREE.BoxGeometry(0.125 * s, 0.04 * s, 0.125 * s);
    const watchBand = new THREE.Mesh(watchBandGeo, gearMat);
    watchBand.position.y = -0.21 * s;
    this.leftForearmGroup.add(watchBand);
    this.registerMesh(watchBand, gearMat);

    const watchFaceGeo = new THREE.BoxGeometry(0.05 * s, 0.02 * s, 0.03 * s);
    const watchFace = new THREE.Mesh(watchFaceGeo, gunDetailMat);
    watchFace.position.set(0, -0.21 * s, 0.065 * s);
    this.leftForearmGroup.add(watchFace);
    this.registerMesh(watchFace, gunDetailMat);

    // Tactical Combat Glove
    const gloveGeo = new THREE.BoxGeometry(0.12 * s, 0.11 * s, 0.12 * s);
    const leftGlove = new THREE.Mesh(gloveGeo, gloveMat);
    leftGlove.position.y = -0.27 * s;
    this.leftForearmGroup.add(leftGlove);
    this.registerMesh(leftGlove, gloveMat);

    // Police SWAT Tactical Ballistic Riot Shield
    if (theme.hasShield) {
      // Main heavy-duty ballistic alloy shield body
      const shieldGeo = new THREE.BoxGeometry(0.76 * s, 1.38 * s, 0.04 * s);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8, // SWAT vibrant royal blue ballistic shield
        roughness: 0.5,
        metalness: 0.4
      });
      this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      this.shieldMesh.position.set(0, -0.15 * s, 0.35 * s);
      this.leftForearmGroup.add(this.shieldMesh);
      this.registerMesh(this.shieldMesh, shieldMat);

      // Outer heavy protective rim
      const rimTopGeo = new THREE.BoxGeometry(0.80 * s, 0.04 * s, 0.05 * s);
      const rimTop = new THREE.Mesh(rimTopGeo, gunDetailMat);
      rimTop.position.set(0, 0.69 * s, 0);
      this.shieldMesh.add(rimTop);

      const rimBottomGeo = new THREE.BoxGeometry(0.80 * s, 0.04 * s, 0.05 * s);
      const rimBottom = new THREE.Mesh(rimBottomGeo, gunDetailMat);
      rimBottom.position.set(0, -0.69 * s, 0);
      this.shieldMesh.add(rimBottom);

      // Laminated ballistic polycarbonate observation window
      const windowCutoutGeo = new THREE.BoxGeometry(0.36 * s, 0.18 * s, 0.05 * s);
      const windowGlassMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.7
      });
      const shieldWindow = new THREE.Mesh(windowCutoutGeo, windowGlassMat);
      shieldWindow.position.set(0, 0.32 * s, 0.005 * s);
      this.shieldMesh.add(shieldWindow);

      // Tactical POLICE / SWAT Identification Bar
      const idBarGeo = new THREE.BoxGeometry(0.48 * s, 0.09 * s, 0.02 * s);
      const idBarMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const idBar = new THREE.Mesh(idBarGeo, idBarMat);
      idBar.position.set(0, 0.05 * s, 0.025 * s);
      this.shieldMesh.add(idBar);

      // Heavy rear carry handle attached to forearm
      const handleGeo = new THREE.BoxGeometry(0.12 * s, 0.28 * s, 0.08 * s);
      const shieldHandle = new THREE.Mesh(handleGeo, gunDetailMat);
      shieldHandle.position.set(0, 0, -0.06 * s);
      this.shieldMesh.add(shieldHandle);
    }

    // 5. Right Arm Group (Shoulder pivot at right side of chest)
    this.rightArmGroup.position.set(0.29 * s, 0.48 * s, 0);
    this.torsoGroup.add(this.rightArmGroup);

    // Right Upper Arm (Bicep - Combat shirt sleeve)
    const rightUpperArm = new THREE.Mesh(upperArmGeo, uniformMat);
    rightUpperArm.position.y = -0.15 * s;
    this.rightArmGroup.add(rightUpperArm);
    this.registerMesh(rightUpperArm, uniformMat);

    if (theme.rolledSleeves) {
      const cuffGeo = new THREE.BoxGeometry(0.145 * s, 0.05 * s, 0.145 * s);
      const rightCuff = new THREE.Mesh(cuffGeo, uniformMat);
      rightCuff.position.y = -0.28 * s;
      this.rightArmGroup.add(rightCuff);
      this.registerMesh(rightCuff, uniformMat);
    }

    // Right Forearm Group (Elbow pivot)
    this.rightForearmGroup.position.set(0, -0.30 * s, 0);
    this.rightArmGroup.add(this.rightForearmGroup);

    const rightForearm = new THREE.Mesh(forearmGeo, forearmMat);
    rightForearm.position.y = -0.13 * s;
    this.rightForearmGroup.add(rightForearm);
    this.registerMesh(rightForearm, forearmMat);

    // Tactical Combat Glove
    const rightGlove = new THREE.Mesh(gloveGeo, gloveMat);
    rightGlove.position.y = -0.27 * s;
    this.rightForearmGroup.add(rightGlove);
    this.registerMesh(rightGlove, gloveMat);

    // Military Firearms attached to Right Hand
    if (theme.hasWeapon) {
      this.weaponMesh = new THREE.Group();
      this.rightForearmGroup.add(this.weaponMesh);
      this.weaponMesh.position.set(0, -0.28 * s, 0.22 * s);

      if (this.type === 'shield') {
        // Tactical 9mm Duty Pistol with under-barrel light
        const frameGeo = new THREE.BoxGeometry(0.08 * s, 0.14 * s, 0.26 * s);
        const pistolFrame = new THREE.Mesh(frameGeo, gunDetailMat);
        this.weaponMesh.add(pistolFrame);
        this.registerMesh(pistolFrame, gunDetailMat);

        const slideGeo = new THREE.BoxGeometry(0.075 * s, 0.06 * s, 0.28 * s);
        const pistolSlide = new THREE.Mesh(slideGeo, gunMat);
        pistolSlide.position.y = 0.06 * s;
        this.weaponMesh.add(pistolSlide);
        this.registerMesh(pistolSlide, gunMat);

        const lightGeo = new THREE.BoxGeometry(0.06 * s, 0.04 * s, 0.10 * s);
        const tacLight = new THREE.Mesh(lightGeo, gunMat);
        tacLight.position.set(0, -0.01 * s, 0.10 * s);
        this.weaponMesh.add(tacLight);
        this.registerMesh(tacLight, gunMat);
      } else if (this.type === 'fast') {
        // Tactical Submachine Gun (SMG)
        const receiverGeo = new THREE.BoxGeometry(0.10 * s, 0.14 * s, 0.44 * s);
        const smgReceiver = new THREE.Mesh(receiverGeo, gunMat);
        this.weaponMesh.add(smgReceiver);
        this.registerMesh(smgReceiver, gunMat);

        // Stick magazine
        const magGeo = new THREE.BoxGeometry(0.06 * s, 0.18 * s, 0.08 * s);
        const smgMag = new THREE.Mesh(magGeo, gunDetailMat);
        smgMag.position.set(0, -0.12 * s, 0.04 * s);
        this.weaponMesh.add(smgMag);
        this.registerMesh(smgMag, gunDetailMat);

        // Top optic red dot sight
        const opticGeo = new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.12 * s);
        const opticMesh = new THREE.Mesh(opticGeo, gunDetailMat);
        opticMesh.position.set(0, 0.09 * s, -0.02 * s);
        this.weaponMesh.add(opticMesh);
        this.registerMesh(opticMesh, gunDetailMat);
      } else if (this.type === 'tank') {
        // Heavy Squad Automatic Weapon / LMG
        const receiverGeo = new THREE.BoxGeometry(0.16 * s, 0.20 * s, 0.78 * s);
        const lmgReceiver = new THREE.Mesh(receiverGeo, gunMat);
        this.weaponMesh.add(lmgReceiver);
        this.registerMesh(lmgReceiver, gunMat);

        // Heavy fluted barrel with heat shroud
        const barrelGeo = new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.35 * s, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const lmgBarrel = new THREE.Mesh(barrelGeo, gunMat);
        lmgBarrel.position.z = 0.52 * s;
        this.weaponMesh.add(lmgBarrel);
        this.registerMesh(lmgBarrel, gunMat);

        // High-capacity drum magazine
        const drumGeo = new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.14 * s, 12);
        drumGeo.rotateZ(Math.PI / 2);
        const lmgDrum = new THREE.Mesh(drumGeo, gunDetailMat);
        lmgDrum.position.set(0, -0.16 * s, 0.05 * s);
        this.weaponMesh.add(lmgDrum);
        this.registerMesh(lmgDrum, gunDetailMat);
      } else if (this.type === 'ranged') {
        // Precision Bolt-Action / DMR Sniper Rifle
        const receiverGeo = new THREE.BoxGeometry(0.10 * s, 0.13 * s, 0.65 * s);
        const sniperReceiver = new THREE.Mesh(receiverGeo, gunMat);
        this.weaponMesh.add(sniperReceiver);
        this.registerMesh(sniperReceiver, gunMat);

        // Extended long precision barrel & muzzle brake
        const barrelGeo = new THREE.CylinderGeometry(0.028 * s, 0.028 * s, 0.48 * s, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const sniperBarrel = new THREE.Mesh(barrelGeo, gunMat);
        sniperBarrel.position.z = 0.52 * s;
        this.weaponMesh.add(sniperBarrel);
        this.registerMesh(sniperBarrel, gunMat);

        // High-power telescopic optical scope
        const scopeGeo = new THREE.CylinderGeometry(0.042 * s, 0.042 * s, 0.32 * s, 8);
        scopeGeo.rotateX(Math.PI / 2);
        const sniperScope = new THREE.Mesh(scopeGeo, gunDetailMat);
        sniperScope.position.set(0, 0.11 * s, 0.04 * s);
        this.weaponMesh.add(sniperScope);
        this.registerMesh(sniperScope, gunDetailMat);

        // Cheek rest stock
        const stockGeo = new THREE.BoxGeometry(0.09 * s, 0.14 * s, 0.28 * s);
        const sniperStock = new THREE.Mesh(stockGeo, gunDetailMat);
        sniperStock.position.set(0, -0.02 * s, -0.42 * s);
        this.weaponMesh.add(sniperStock);
        this.registerMesh(sniperStock, gunDetailMat);
      } else {
        // Tactical Assault Rifle (Insurgent / Spec-Ops rifle)
        const receiverGeo = new THREE.BoxGeometry(0.10 * s, 0.15 * s, 0.58 * s);
        const rifleReceiver = new THREE.Mesh(receiverGeo, gunMat);
        this.weaponMesh.add(rifleReceiver);
        this.registerMesh(rifleReceiver, gunMat);

        // Barrel & Flash Hider
        const barrelGeo = new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.28 * s, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const rifleBarrel = new THREE.Mesh(barrelGeo, gunMat);
        rifleBarrel.position.z = 0.42 * s;
        this.weaponMesh.add(rifleBarrel);
        this.registerMesh(rifleBarrel, gunMat);

        // Curved 30-round STANAG magazine
        const magGeo = new THREE.BoxGeometry(0.07 * s, 0.19 * s, 0.13 * s);
        const rifleMag = new THREE.Mesh(magGeo, gunDetailMat);
        rifleMag.position.set(0, -0.15 * s, 0.04 * s);
        rifleMag.rotation.x = -0.15;
        this.weaponMesh.add(rifleMag);
        this.registerMesh(rifleMag, gunDetailMat);

        // Buffer tube stock
        const stockGeo = new THREE.BoxGeometry(0.08 * s, 0.12 * s, 0.22 * s);
        const rifleStock = new THREE.Mesh(stockGeo, gunDetailMat);
        rifleStock.position.set(0, 0, -0.36 * s);
        this.weaponMesh.add(rifleStock);
        this.registerMesh(rifleStock, gunDetailMat);

        // Top picatinny optic sight
        const opticGeo = new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.14 * s);
        const rifleOptic = new THREE.Mesh(opticGeo, gunDetailMat);
        rifleOptic.position.set(0, 0.10 * s, 0.02 * s);
        this.weaponMesh.add(rifleOptic);
        this.registerMesh(rifleOptic, gunDetailMat);
      }

      // Default Weapon Hold Pose
      this.rightArmGroup.rotation.x = -Math.PI / 2.3;
      this.rightForearmGroup.rotation.x = -Math.PI / 12;
    }

    // 6. Left Leg Group (Hip pivot at left bottom of pelvis)
    this.leftLegGroup.position.set(-0.16 * s, 0, 0);
    this.pelvis.add(this.leftLegGroup);

    // Thigh (Tactical cargo pants)
    const thighGeo = new THREE.BoxGeometry(0.17 * s, 0.42 * s, 0.19 * s);
    const leftThigh = new THREE.Mesh(thighGeo, pantsMat);
    leftThigh.position.y = -0.21 * s;
    this.leftLegGroup.add(leftThigh);
    this.registerMesh(leftThigh, pantsMat);

    // Outer cargo pocket
    const pocketGeo = new THREE.BoxGeometry(0.04 * s, 0.13 * s, 0.12 * s);
    const leftPocket = new THREE.Mesh(pocketGeo, pantsMat);
    leftPocket.position.set(-0.095 * s, -0.18 * s, 0);
    this.leftLegGroup.add(leftPocket);
    this.registerMesh(leftPocket, pantsMat);

    // Left Knee Group (Knee pivot)
    this.leftKneeGroup.position.set(0, -0.42 * s, 0);
    this.leftLegGroup.add(this.leftKneeGroup);

    // Tactical Strapped Knee Pad
    const kneePadGeo = new THREE.BoxGeometry(0.16 * s, 0.12 * s, 0.06 * s);
    const leftKneePad = new THREE.Mesh(kneePadGeo, gearMat);
    leftKneePad.position.set(0, 0, 0.10 * s);
    this.leftKneeGroup.add(leftKneePad);
    this.registerMesh(leftKneePad, gearMat);

    // Shin / Calf (Cargo pant leg tucked into combat boot)
    const shinGeo = new THREE.BoxGeometry(0.15 * s, 0.38 * s, 0.17 * s);
    const leftShin = new THREE.Mesh(shinGeo, pantsMat);
    leftShin.position.y = -0.19 * s;
    this.leftKneeGroup.add(leftShin);
    this.registerMesh(leftShin, pantsMat);

    // Combat Boot Ankle Collar & Foot Box
    const bootUpperGeo = new THREE.BoxGeometry(0.16 * s, 0.16 * s, 0.20 * s);
    const leftBootUpper = new THREE.Mesh(bootUpperGeo, bootMat);
    leftBootUpper.position.set(0, -0.34 * s, 0.01 * s);
    this.leftKneeGroup.add(leftBootUpper);
    this.registerMesh(leftBootUpper, bootMat);

    const bootToeGeo = new THREE.BoxGeometry(0.16 * s, 0.10 * s, 0.16 * s);
    const leftBootToe = new THREE.Mesh(bootToeGeo, bootMat);
    leftBootToe.position.set(0, -0.39 * s, 0.13 * s);
    this.leftKneeGroup.add(leftBootToe);
    this.registerMesh(leftBootToe, bootMat);

    // Lugged Rubber Boot Sole
    const soleGeo = new THREE.BoxGeometry(0.17 * s, 0.04 * s, 0.30 * s);
    const leftSole = new THREE.Mesh(soleGeo, soleMat);
    leftSole.position.set(0, -0.43 * s, 0.06 * s);
    this.leftKneeGroup.add(leftSole);
    this.registerMesh(leftSole, soleMat);

    // 7. Right Leg Group (Hip pivot at right bottom of pelvis)
    this.rightLegGroup.position.set(0.16 * s, 0, 0);
    this.pelvis.add(this.rightLegGroup);

    // Thigh (Tactical cargo pants)
    const rightThigh = new THREE.Mesh(thighGeo, pantsMat);
    rightThigh.position.y = -0.21 * s;
    this.rightLegGroup.add(rightThigh);
    this.registerMesh(rightThigh, pantsMat);

    // Outer cargo pocket
    const rightPocket = new THREE.Mesh(pocketGeo, pantsMat);
    rightPocket.position.set(0.095 * s, -0.18 * s, 0);
    this.rightLegGroup.add(rightPocket);
    this.registerMesh(rightPocket, pantsMat);

    // Right Knee Group (Knee pivot)
    this.rightKneeGroup.position.set(0, -0.42 * s, 0);
    this.rightLegGroup.add(this.rightKneeGroup);

    // Tactical Strapped Knee Pad
    const rightKneePad = new THREE.Mesh(kneePadGeo, gearMat);
    rightKneePad.position.set(0, 0, 0.10 * s);
    this.rightKneeGroup.add(rightKneePad);
    this.registerMesh(rightKneePad, gearMat);

    // Shin / Calf
    const rightShin = new THREE.Mesh(shinGeo, pantsMat);
    rightShin.position.y = -0.19 * s;
    this.rightKneeGroup.add(rightShin);
    this.registerMesh(rightShin, pantsMat);

    // Combat Boot Ankle Collar & Foot Box
    const rightBootUpper = new THREE.Mesh(bootUpperGeo, bootMat);
    rightBootUpper.position.set(0, -0.34 * s, 0.01 * s);
    this.rightKneeGroup.add(rightBootUpper);
    this.registerMesh(rightBootUpper, bootMat);

    const rightBootToe = new THREE.Mesh(bootToeGeo, bootMat);
    rightBootToe.position.set(0, -0.39 * s, 0.13 * s);
    this.rightKneeGroup.add(rightBootToe);
    this.registerMesh(rightBootToe, bootMat);

    // Lugged Rubber Boot Sole
    const rightSole = new THREE.Mesh(soleGeo, soleMat);
    rightSole.position.set(0, -0.43 * s, 0.06 * s);
    this.rightKneeGroup.add(rightSole);
    this.registerMesh(rightSole, soleMat);
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
    this.applyHitFlash(false);
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
    const currentEnemyBuilding = buildingContext?.getBuildingAtPosition ? buildingContext.getBuildingAtPosition(this.position) : null;
    const isEnemyIndoors = currentEnemyBuilding !== null;

    // Throttled Line of sight calculation: tests if solid building walls or tall obstacles block view to player
    this.losCheckTimer -= delta;
    if (this.losCheckTimer <= 0) {
      this.losCheckTimer = 0.12;
      const eyeHeight = this.getHeight() * 0.82;
      const enemyEyePos = new THREE.Vector3(this.position.x, this.position.y + eyeHeight, this.position.z);
      const playerEyePos = playerPos.clone();
      this.cachedHasLineOfSight = this.checkLineOfSight(enemyEyePos, playerEyePos, obstacles);
    }
    const hasLineOfSight = this.cachedHasLineOfSight;

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
        const distToDoor = this.position.distanceTo(playerBuilding.doorWorldPos);
        const distToApproach = this.position.distanceTo(playerBuilding.doorApproachPos);
        const distToInside = this.position.distanceTo(playerBuilding.doorInsidePos);

        // Commit forward toward doorInsidePos once safely on the entrance approach / porch
        // Prevents any diagonal cutting into exterior walls!
        const isAtDoorApproach = distToApproach < 2.4 || (distToDoor < 2.2 && distToInside < distToApproach);
        if (isAtDoorApproach) {
          moveTarget = playerBuilding.doorInsidePos;
          aimTarget = hasLineOfSight ? playerPos : playerBuilding.doorInsidePos;
        } else {
          moveTarget = playerBuilding.doorApproachPos;
          aimTarget = hasLineOfSight ? playerPos : playerBuilding.doorApproachPos;
        }
      } else {
        // Player is inside and door is CLOSED: enemies outside CANNOT enter!
        const distToApproach = this.position.distanceTo(playerBuilding.doorApproachPos);
        if (distToApproach > 4.5) {
          moveTarget = playerBuilding.doorApproachPos;
          aimTarget = playerBuilding.doorApproachPos;
        } else {
          moveTarget = this.position;
          aimTarget = hasLineOfSight ? playerBuilding.doorWorldPos : playerBuilding.doorApproachPos;
        }
      }
    } else if (isEnemyIndoors && currentEnemyBuilding) {
      // Enemy is inside building, but player is OUTSIDE!
      const doorOpen = currentEnemyBuilding.door.isOpen;
      if (doorOpen) {
        // Path through doorway to pursue player outside
        const distToDoor = this.position.distanceTo(currentEnemyBuilding.doorWorldPos);
        const distToInside = this.position.distanceTo(currentEnemyBuilding.doorInsidePos);
        const distToApproach = this.position.distanceTo(currentEnemyBuilding.doorApproachPos);

        if (distToApproach < distToInside || distToDoor < 2.2) {
          moveTarget = currentEnemyBuilding.doorApproachPos;
          aimTarget = hasLineOfSight ? playerPos : currentEnemyBuilding.doorApproachPos;
        } else {
          moveTarget = currentEnemyBuilding.doorInsidePos;
          aimTarget = currentEnemyBuilding.doorInsidePos;
        }
      } else {
        // Door is closed: enemy is locked inside and cannot escape through walls
        moveTarget = this.position;
        aimTarget = currentEnemyBuilding.doorWorldPos;
      }
    } else {
      aimTarget = hasLineOfSight ? playerPos : moveTarget;
    }

    const distToPlayer = this.position.distanceTo(playerPos);
    const distToMoveTarget = this.position.distanceTo(moveTarget);
    this.stateTimer += delta;

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
    const moveDir = Enemy._moveDir.set(0, 0, 0);

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
        const right = Enemy._rightVec.set(1, 0, 0).applyAxisAngle(Enemy._yUpAxis, this.mesh.rotation.y);
        moveDir.copy(right).multiplyScalar(this.strafeDir * 0.45);
      }
    } else if (isEnemyIndoors && !isPlayerInBuilding && currentEnemyBuilding && !currentEnemyBuilding.door.isOpen) {
      // Enemy is inside closed building: hold position inside
      if (distToMoveTarget > 0.5) {
        moveDir.subVectors(moveTarget, this.position).normalize();
      }
    } else if (this.type === 'exploder') {
      // Suicide bomber charges directly to moveTarget (enters doorway if open, or charges player)
      moveDir.subVectors(moveTarget, this.position).normalize();
    } else if (isPlayerInBuilding && !isEnemyInPlayerBuilding && isDoorOpen) {
      // Infiltrating into the building through the open door!
      moveDir.subVectors(moveTarget, this.position).normalize();
    } else if (isEnemyIndoors && !isPlayerInBuilding && currentEnemyBuilding && currentEnemyBuilding.door.isOpen) {
      // Exiting the building through the open door to pursue player outside!
      moveDir.subVectors(moveTarget, this.position).normalize();
    } else {
      // ARMED HUMAN COMBATANT (SHOOTING & TACTICAL ENGAGEMENT)
      let minDistance = this.type === 'ranged' ? 12 : (this.type === 'basic' ? 8 : (this.type === 'tank' ? 6 : 5));
      let maxDistance = this.type === 'ranged' ? 24 : (this.type === 'basic' ? 15 : 13);

      if (isEnemyInPlayerBuilding) {
        // Tight tactical CQB spacing inside rooms: avoid backing into perimeter walls
        minDistance = this.type === 'ranged' ? 4.5 : (this.type === 'tank' ? 3.0 : 2.2);
        maxDistance = this.type === 'ranged' ? 9.5 : 6.5;
      }

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
        const right = Enemy._rightVec.set(1, 0, 0).applyAxisAngle(Enemy._yUpAxis, this.mesh.rotation.y);
        moveDir.copy(right).multiplyScalar(this.strafeDir * (isEnemyInPlayerBuilding ? 0.45 : 0.75));
      }
    }

    const isMoving = moveDir.lengthSq() > 0.01;

    // Turn toward target (if navigating around walls without line of sight, face movement direction to avoid staring into walls)
    if (!hasLineOfSight && isMoving) {
      aimTarget = this.position.clone().add(moveDir);
    }
    const targetAngle = Math.atan2(aimTarget.x - this.position.x, aimTarget.z - this.position.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, delta * 8);

    // Spatial pre-filter nearby obstacles for collision and forward weapon clearance
    const searchDist = 3.2;
    const curX = this.position.x;
    const curZ = this.position.z;
    const nearby = Enemy._nearbyObstacles;
    nearby.length = 0;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.box.isEmpty()) continue;
      if (obs.box.min.y > 1.85 || obs.box.max.y < 0.08) continue;
      if (
        curX < obs.box.min.x - searchDist ||
        curX > obs.box.max.x + searchDist ||
        curZ < obs.box.min.z - searchDist ||
        curZ > obs.box.max.z + searchDist
      ) {
        continue;
      }
      nearby.push(obs);
    }

    // Dynamic forward weapon clearance / Low-Ready posture: detect obstacles directly ahead
    let forwardObstacleDist = 999;
    const forwardX = Math.sin(this.mesh.rotation.y);
    const forwardZ = Math.cos(this.mesh.rotation.y);
    const checkY = this.position.y + this.getHeight() * 0.6;

    for (let i = 0; i < nearby.length; i++) {
      const b = nearby[i].box;
      if (checkY < b.min.y || checkY > b.max.y) continue;
      for (const d of [0.45 * this.scaleFactor, 0.80 * this.scaleFactor, 1.15 * this.scaleFactor]) {
        const px = this.position.x + forwardX * d;
        const pz = this.position.z + forwardZ * d;
        if (px >= b.min.x - 0.04 && px <= b.max.x + 0.04 && pz >= b.min.z - 0.04 && pz <= b.max.z + 0.04) {
          forwardObstacleDist = Math.min(forwardObstacleDist, d);
          break;
        }
      }
    }

    const maxTuckDist = 1.15 * this.scaleFactor;
    const targetTuck = forwardObstacleDist < maxTuckDist
      ? THREE.MathUtils.clamp((maxTuckDist - forwardObstacleDist) / (0.70 * this.scaleFactor), 0, 1)
      : 0;
    this.weaponTuck = THREE.MathUtils.lerp(this.weaponTuck, targetTuck, Math.min(1.0, delta * 14));

    // Close-range emergency melee strike if player is within 1.8m and line of sight is clear
    const canMelee = (!isPlayerInBuilding || isEnemyInPlayerBuilding || isDoorOpen) && hasLineOfSight;
    if (distToPlayer < 1.8 && this.attackCooldown <= 0 && canMelee) {
      this.attackCooldown = 0.8;
      if (onPlayerHit) {
        onPlayerHit(this.damage + 4);
      }
    }

    // Ranged Fire Attack (Shooting at player only with clear line of sight and non-obstructed barrel)
    const canShoot = (!isPlayerInBuilding || isEnemyInPlayerBuilding || isDoorOpen) && hasLineOfSight && this.weaponTuck < 0.45;
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

    // 5. Natural Human Walk, Run & Combat Animations with Weapon Obstacle Clearance
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

      // Arm swing & weapon carry dynamics (safely tucks down when near obstacle)
      if (this.type === 'shield') {
        // Shield bearer holds riot shield firmly in front, tucks inward near obstacles
        this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(-Math.PI / 3.4, -Math.PI / 6, this.weaponTuck);
        this.leftForearmGroup.rotation.x = THREE.MathUtils.lerp(-Math.PI / 10, -Math.PI / 4, this.weaponTuck);
        this.rightArmGroup.rotation.x = Math.sin(this.walkCycle) * 0.45 * (1 - this.weaponTuck * 0.7);
        if (this.shieldMesh) {
          this.shieldMesh.position.z = THREE.MathUtils.lerp(0.35 * this.scaleFactor, 0.16 * this.scaleFactor, this.weaponTuck);
        }
      } else if (this.theme.hasWeapon) {
        // Weapon bearer: aim forward, or lower into low-ready when near obstacle to prevent clipping
        const baseAimAngle = -Math.PI / 2.3;
        const lowReadyAngle = -0.32;
        const weaponAngle = THREE.MathUtils.lerp(baseAimAngle, lowReadyAngle, this.weaponTuck);
        const bob = Math.sin(this.walkCycle * 2) * 0.04 * (1 - this.weaponTuck);
        this.rightArmGroup.rotation.x = weaponAngle + bob;
        this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(-Math.sin(this.walkCycle) * 0.55, -0.2, this.weaponTuck);
        if (this.weaponMesh) {
          const normalZ = 0.22 * this.scaleFactor;
          const tuckedZ = 0.06 * this.scaleFactor;
          const targetZ = THREE.MathUtils.lerp(normalZ, tuckedZ, this.weaponTuck);
          this.weaponMesh.position.z = THREE.MathUtils.lerp(this.weaponMesh.position.z, targetZ, delta * 14);
        }
      } else {
        const swingMult = 1 - this.weaponTuck * 0.65;
        if (this.type === 'fast') {
          this.leftArmGroup.rotation.x = -Math.sin(this.walkCycle) * 0.95 * swingMult;
          this.rightArmGroup.rotation.x = Math.sin(this.walkCycle) * 0.95 * swingMult;
        } else if (this.type === 'exploder') {
          this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(-Math.PI / 1.9 + Math.sin(this.walkCycle * 2) * 0.3, -0.2, this.weaponTuck);
          this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(-Math.PI / 1.9 - Math.sin(this.walkCycle * 2) * 0.3, -0.2, this.weaponTuck);
        } else {
          this.leftArmGroup.rotation.x = -Math.sin(this.walkCycle) * 0.65 * swingMult;
          this.rightArmGroup.rotation.x = Math.sin(this.walkCycle) * 0.65 * swingMult;
        }
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
        const baseAimAngle = -Math.PI / 2.3;
        const lowReadyAngle = -0.32;
        this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(baseAimAngle, lowReadyAngle, this.weaponTuck);
        if (this.weaponMesh) {
          const normalZ = 0.22 * this.scaleFactor;
          const tuckedZ = 0.06 * this.scaleFactor;
          this.weaponMesh.position.z = THREE.MathUtils.lerp(this.weaponMesh.position.z, THREE.MathUtils.lerp(normalZ, tuckedZ, this.weaponTuck), delta * 14);
        }
      }
    }

    // 6. Attack Gun Recoil & Punch Animation
    const isAttacking = this.attackCooldown > (this.attackInterval - 0.22);
    if (isAttacking && this.theme.hasWeapon && this.weaponTuck < 0.3) {
      // Gun recoil kickback
      this.rightArmGroup.rotation.x = -Math.PI / 2.05;
      if (this.weaponMesh) {
        this.weaponMesh.position.z = 0.16 * this.scaleFactor;
      }
    }

    if (isAttacking && !this.theme.hasWeapon && this.type !== 'shield') {
      // Melee punch thrust
      this.rightArmGroup.rotation.x = -Math.PI / 1.8;
      this.torsoGroup.rotation.y = 0.25;
    } else {
      this.torsoGroup.rotation.y = THREE.MathUtils.lerp(this.torsoGroup.rotation.y, 0, delta * 6);
    }

    // 7. Move enemy, resolve obstacle collisions with spatial pre-filtering and smooth sliding
    const nextPos = Enemy._nextPos.copy(this.position);
    if (isMoving) {
      moveDir.y = 0;
      if (moveDir.lengthSq() > 0.001) moveDir.normalize();
      nextPos.addScaledVector(moveDir, this.speed * delta);
    }

    // Robust collision radius keeping body, shoulders, and gear safely outside walls
    const enemyRadius = 0.50 * this.scaleFactor;

    if (nearby.length > 0) {
      const closestPoint = Enemy._closestPoint;
      const collisionPasses = 3;

      for (let pass = 0; pass < collisionPasses; pass++) {
        let collided = false;
        for (let i = 0; i < nearby.length; i++) {
          const obs = nearby[i];

          // Clamp nextPos to the obstacle box in X/Z to get the closest surface point
          closestPoint.set(
            THREE.MathUtils.clamp(nextPos.x, obs.box.min.x, obs.box.max.x),
            nextPos.y,
            THREE.MathUtils.clamp(nextPos.z, obs.box.min.z, obs.box.max.z)
          );

          const dx = nextPos.x - closestPoint.x;
          const dz = nextPos.z - closestPoint.z;
          const distSq = dx * dx + dz * dz;

          if (distSq < enemyRadius * enemyRadius) {
            collided = true;
            if (distSq > 0.000001) {
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const nz = dz / dist;
              const penetration = enemyRadius - dist;

              // Push outward along surface normal
              nextPos.x += nx * penetration;
              nextPos.z += nz * penetration;

              // Slide moveDir along wall tangent
              if (isMoving) {
                const dot = moveDir.x * nx + moveDir.z * nz;
                if (dot < 0) {
                  moveDir.x -= dot * nx;
                  moveDir.z -= dot * nz;
                }
              }
            } else {
              // Center is inside box: push out along the shallowest axis
              const dLeft = nextPos.x - obs.box.min.x;
              const dRight = obs.box.max.x - nextPos.x;
              const dBack = nextPos.z - obs.box.min.z;
              const dFront = obs.box.max.z - nextPos.z;
              const minPen = Math.min(dLeft, dRight, dBack, dFront);

              if (minPen === dLeft) nextPos.x = obs.box.min.x - enemyRadius - 0.01;
              else if (minPen === dRight) nextPos.x = obs.box.max.x + enemyRadius + 0.01;
              else if (minPen === dBack) nextPos.z = obs.box.min.z - enemyRadius - 0.01;
              else nextPos.z = obs.box.max.z + enemyRadius + 0.01;
            }
          }
        }
        if (!collided) break;
      }
    }

    const maxCoord = (buildingContext?.arenaSize ? buildingContext.arenaSize / 2 : 62) - 2.5;
    this.position.x = THREE.MathUtils.clamp(nextPos.x, -maxCoord, maxCoord);
    this.position.z = THREE.MathUtils.clamp(nextPos.z, -maxCoord, maxCoord);

    // Floor elevation interpolation: smoothly step onto building interior floor (y = 0.05)
    const isIndoors = buildingContext?.isInsideBuilding ? buildingContext.isInsideBuilding(this.position) : false;
    const targetY = isIndoors ? 0.05 : 0.0;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, delta * 14);

    this.mesh.position.copy(this.position);
  }

  /**
   * Fast AABB raycast check to determine if solid building walls or tall obstacles block view to target
   */
  private checkLineOfSight(eyePos: THREE.Vector3, targetPos: THREE.Vector3, obstacles: ArenaObstacle[]): boolean {
    const dist = eyePos.distanceTo(targetPos);
    if (dist < 0.8) return true;
    Enemy._losDir.subVectors(targetPos, eyePos).normalize();
    Enemy._losRay.set(eyePos, Enemy._losDir);

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      // Skip stair ramps and floor slabs: they should never block line of sight!
      if (obs.stairRamp || obs.isFloor) continue;
      // Skip transparent ballistic glass walls so enemies have clear visual tracking through glass
      if (obs.isGlass) continue;
      // Skip waist-high cover obstacles so enemies can shoot over low crates, fences and car hoods
      if (obs.isCover && obs.box.max.y < 1.35) continue;

      const hit = Enemy._losRay.intersectBox(obs.box, Enemy._losHit);
      if (hit && eyePos.distanceTo(hit) < dist - 0.35) {
        return false;
      }
    }
    return true;
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
