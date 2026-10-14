import * as THREE from 'three';
import { WeaponConfig, WeaponId, UpgradeLevels, GraphicsQuality } from '../../types/game';
import { soundManager } from '../../audio/SoundManager';
import { TextureGenerator } from '../world/TextureGenerator';

export const BASE_WEAPONS: Record<WeaponId, WeaponConfig> = {
  assault_rifle: {
    id: 'assault_rifle',
    name: 'Pulse AR-4 Hyperion',
    category: 'Assault Rifle',
    damage: 26,
    fireRate: 9.5,
    magSize: 30,
    reloadTime: 1.6,
    spread: 0.022,
    range: 120,
    critMultiplier: 2.2,
    pellets: 1,
    bulletSpeed: 0,
    projectileColor: '#0ea5e9',
    recoilKick: 0.045,
    soundType: 'rifle',
    description: 'Pristine composite automatic rifle with integrated digital HUD optics and magnetic stabilization.',
    unlocked: true,
    unlockCost: 0
  },
  shotgun: {
    id: 'shotgun',
    name: 'Breaker SG-12 Aegis',
    category: 'Shotgun',
    damage: 16,
    fireRate: 1.3,
    magSize: 8,
    reloadTime: 2.2,
    spread: 0.075,
    range: 45,
    critMultiplier: 1.8,
    pellets: 8,
    bulletSpeed: 0,
    projectileColor: '#f97316',
    recoilKick: 0.12,
    soundType: 'shotgun',
    description: 'High-pressure kinetic shotgun designed for instantaneous close-quarters threat elimination.',
    unlocked: true,
    unlockCost: 0
  },
  smg: {
    id: 'smg',
    name: 'Viper SMG-9 Vector',
    category: 'Submachine Gun',
    damage: 14,
    fireRate: 16.0,
    magSize: 45,
    reloadTime: 1.2,
    spread: 0.038,
    range: 70,
    critMultiplier: 1.9,
    pellets: 1,
    bulletSpeed: 0,
    projectileColor: '#06b6d4',
    recoilKick: 0.025,
    soundType: 'smg',
    description: 'Ultra-lightweight ceramic submachine gun engineered for blisteringly fast fire cadence.',
    unlocked: true,
    unlockCost: 0
  },
  sniper: {
    id: 'sniper',
    name: 'Valkyrie Precision-50 Solar',
    category: 'Sniper Rifle',
    damage: 160,
    fireRate: 0.9,
    magSize: 5,
    reloadTime: 2.6,
    spread: 0.002,
    range: 250,
    critMultiplier: 3.5,
    pellets: 1,
    bulletSpeed: 0,
    projectileColor: '#d97706',
    recoilKick: 0.16,
    soundType: 'sniper',
    description: 'High-caliber electromagnetic rifle featuring holographic focal optics and devastating impact force.',
    unlocked: false,
    unlockCost: 250
  },
  plasma_rifle: {
    id: 'plasma_rifle',
    name: 'Helios Plasma Burner Mk II',
    category: 'Energy Weapon',
    damage: 48,
    fireRate: 5.5,
    magSize: 25,
    reloadTime: 1.8,
    spread: 0.015,
    range: 140,
    critMultiplier: 2.4,
    pellets: 1,
    bulletSpeed: 95,
    projectileColor: '#0284c7',
    recoilKick: 0.035,
    soundType: 'plasma',
    description: 'Experimental superheated ionized plasma projector with thermo-kinetic burst dispersal.',
    unlocked: false,
    unlockCost: 500
  },
  bomb: {
    id: 'bomb',
    name: 'Goliath Nova Bomb Launcher',
    category: 'Heavy Explosive',
    damage: 175,
    fireRate: 1.6,
    magSize: 6,
    reloadTime: 2.4,
    spread: 0.008,
    range: 120,
    critMultiplier: 2.0,
    pellets: 1,
    bulletSpeed: 45,
    projectileColor: '#f97316',
    recoilKick: 0.16,
    soundType: 'bomb',
    description: 'Devastating pneumatic ordnance launcher firing pressurized cluster bombs with wide area-of-effect blast damage.',
    unlocked: true,
    unlockCost: 0
  }
};

export class WeaponInstance {
  public config: WeaponConfig;
  public currentAmmo: number;
  public maxAmmo: number;
  public isReloading: boolean = false;
  public reloadProgress: number = 0;
  
  private lastFireTime: number = 0;
  public meshGroup: THREE.Group;
  private muzzleFlashMesh: THREE.Mesh | null = null;
  private muzzleFlashLight: THREE.PointLight | null = null;
  private muzzleFlashTimer: number = 0;
  private enableFlashLight: boolean = true;

  public setGraphicsQuality(quality: GraphicsQuality) {
    this.enableFlashLight = quality !== 'low' && quality !== 'normal';
    if (!this.enableFlashLight && this.muzzleFlashLight) {
      this.muzzleFlashLight.intensity = 0;
      this.muzzleFlashLight.visible = false;
    } else if (this.muzzleFlashLight) {
      this.muzzleFlashLight.visible = true;
    }
  }

  // On-weapon holographic digital ammo display
  private ammoScreenMesh: THREE.Mesh | null = null;

  // Reciprocating bolt / slide mesh for animation
  private slideMesh: THREE.Mesh | null = null;
  private slideRecoil: number = 0;

  // Animation transforms
  private basePosition = new THREE.Vector3(0.28, -0.26, -0.5);
  private adsPosition = new THREE.Vector3(0, -0.19, -0.38);
  private currentRecoil = 0;
  private currentRecoilRot = 0;
  public isAiming: boolean = false;

  constructor(id: WeaponId, upgrades?: UpgradeLevels) {
    this.config = { ...BASE_WEAPONS[id] };
    if (upgrades) {
      this.applyUpgrades(upgrades);
    }
    this.maxAmmo = this.config.magSize;
    this.currentAmmo = this.maxAmmo;
    this.meshGroup = new THREE.Group();
    this.build3DModel();
  }

  public applyUpgrades(upgrades: UpgradeLevels) {
    const base = BASE_WEAPONS[this.config.id];
    this.config.damage = Math.round(base.damage * (1 + upgrades.damage * 0.15));
    this.config.fireRate = Number((base.fireRate * (1 + upgrades.fireRate * 0.1)).toFixed(1));
    this.config.magSize = Math.round(base.magSize * (1 + upgrades.magazine * 0.2));
    this.config.reloadTime = Number((base.reloadTime * Math.max(0.4, 1 - upgrades.reload * 0.08)).toFixed(2));
    this.maxAmmo = this.config.magSize;
    this.updateAmmoDisplay();
  }

  private updateAmmoDisplay() {
    if (this.ammoScreenMesh) {
      const newTex = TextureGenerator.createAmmoDisplayTexture(this.currentAmmo, this.maxAmmo);
      (this.ammoScreenMesh.material as THREE.MeshBasicMaterial).map = newTex;
      (this.ammoScreenMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
  }

  private build3DModel() {
    // Clear old children
    while (this.meshGroup.children.length > 0) {
      this.meshGroup.remove(this.meshGroup.children[0]);
    }

    // High-tech sleek materials: Pristine Ceramic White + Brushed Titanium + Cyan Glow
    const whiteCeramic = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.35
    });

    const brushedTitanium = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.85
    });

    const carbonFiberMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.2
    });

    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85
    });

    if (this.config.id === 'shotgun') {
      // Shotgun: Heavy white chassis, dual titanium barrels, pump grip
      const barrelGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.58, 16);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, brushedTitanium);
      barrel.position.set(0, 0.03, -0.26);
      barrel.castShadow = true;
      this.meshGroup.add(barrel);

      const receiverGeo = new THREE.BoxGeometry(0.065, 0.085, 0.3);
      const receiver = new THREE.Mesh(receiverGeo, whiteCeramic);
      receiver.position.set(0, 0.015, 0.08);
      receiver.castShadow = true;
      this.meshGroup.add(receiver);

      const pumpGeo = new THREE.BoxGeometry(0.07, 0.055, 0.18);
      const pump = new THREE.Mesh(pumpGeo, cyanGlowMat);
      pump.position.set(0, 0.01, -0.16);
      pump.castShadow = true;
      this.meshGroup.add(pump);

      const stockGeo = new THREE.BoxGeometry(0.045, 0.095, 0.24);
      const stock = new THREE.Mesh(stockGeo, carbonFiberMat);
      stock.position.set(0, -0.04, 0.29);
      stock.castShadow = true;
      this.meshGroup.add(stock);

    } else if (this.config.id === 'sniper') {
      // Sniper: Sleek elongated chassis, high-tech scope, glowing cyan rail
      const barrelGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.85, 16);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, brushedTitanium);
      barrel.position.set(0, 0.03, -0.42);
      barrel.castShadow = true;
      this.meshGroup.add(barrel);

      const brakeGeo = new THREE.BoxGeometry(0.045, 0.045, 0.09);
      const brake = new THREE.Mesh(brakeGeo, cyanGlowMat);
      brake.position.set(0, 0.03, -0.84);
      this.meshGroup.add(brake);

      const receiverGeo = new THREE.BoxGeometry(0.06, 0.085, 0.36);
      const receiver = new THREE.Mesh(receiverGeo, whiteCeramic);
      receiver.position.set(0, 0.02, 0.06);
      receiver.castShadow = true;
      this.meshGroup.add(receiver);

      // Scope
      const scopeTubeGeo = new THREE.CylinderGeometry(0.028, 0.025, 0.32, 16);
      scopeTubeGeo.rotateX(Math.PI / 2);
      const scopeTube = new THREE.Mesh(scopeTubeGeo, cyanGlowMat);
      scopeTube.position.set(0, 0.11, -0.03);
      this.meshGroup.add(scopeTube);

      const stockGeo = new THREE.BoxGeometry(0.045, 0.09, 0.26);
      const stock = new THREE.Mesh(stockGeo, carbonFiberMat);
      stock.position.set(0, -0.03, 0.33);
      this.meshGroup.add(stock);

    } else if (this.config.id === 'plasma_rifle') {
      // Plasma rifle: Futuristic glowing core, dual magnetic accelerator rails
      const bodyGeo = new THREE.BoxGeometry(0.075, 0.095, 0.48);
      const body = new THREE.Mesh(bodyGeo, whiteCeramic);
      body.position.set(0, 0.02, -0.05);
      body.castShadow = true;
      this.meshGroup.add(body);

      // Glowing plasma core
      const coreGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.26, 16);
      coreGeo.rotateX(Math.PI / 2);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(0, 0.02, -0.08);
      this.meshGroup.add(core);

      // Top rail
      const railGeo = new THREE.BoxGeometry(0.035, 0.02, 0.42);
      const topRail = new THREE.Mesh(railGeo, cyanGlowMat);
      topRail.position.set(0, 0.08, -0.15);
      this.meshGroup.add(topRail);

      const gripGeo = new THREE.BoxGeometry(0.042, 0.13, 0.065);
      gripGeo.rotateX(-0.3);
      const grip = new THREE.Mesh(gripGeo, carbonFiberMat);
      grip.position.set(0, -0.08, 0.12);
      this.meshGroup.add(grip);

    } else if (this.config.id === 'smg') {
      // SMG: Compact, agile white frame, vertical mag, high-tech optic
      const bodyGeo = new THREE.BoxGeometry(0.052, 0.08, 0.34);
      const body = new THREE.Mesh(bodyGeo, whiteCeramic);
      body.position.set(0, 0.02, -0.06);
      body.castShadow = true;
      this.meshGroup.add(body);

      const barrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.24, 16);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, brushedTitanium);
      barrel.position.set(0, 0.025, -0.29);
      this.meshGroup.add(barrel);

      const magGeo = new THREE.BoxGeometry(0.036, 0.15, 0.058);
      const mag = new THREE.Mesh(magGeo, cyanGlowMat);
      mag.position.set(0, -0.09, -0.04);
      this.meshGroup.add(mag);

      const gripGeo = new THREE.BoxGeometry(0.04, 0.12, 0.055);
      gripGeo.rotateX(-0.25);
      const grip = new THREE.Mesh(gripGeo, carbonFiberMat);
      grip.position.set(0, -0.07, 0.09);
      this.meshGroup.add(grip);

    } else if (this.config.id === 'bomb') {
      // Goliath Nova Bomb Launcher: Heavy-duty pneumatic ordnance projector
      const amberGlowMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.15,
        metalness: 0.85,
        emissive: 0xea580c,
        emissiveIntensity: 0.95
      });

      const darkGunmetal = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.9
      });

      const hazardYellow = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.35,
        metalness: 0.4
      });

      // 1. Heavy cylindrical cannon barrel (wide bore 0.048m)
      const barrelGeo = new THREE.CylinderGeometry(0.046, 0.048, 0.52, 16);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, darkGunmetal);
      barrel.position.set(0, 0.035, -0.28);
      barrel.castShadow = true;
      this.meshGroup.add(barrel);

      // Barrel reinforcement sleeve with amber heat sink vents
      const sleeveGeo = new THREE.CylinderGeometry(0.054, 0.054, 0.22, 16);
      sleeveGeo.rotateX(Math.PI / 2);
      const sleeve = new THREE.Mesh(sleeveGeo, hazardYellow);
      sleeve.position.set(0, 0.035, -0.24);
      this.meshGroup.add(sleeve);

      // Heavy ported muzzle brake at the front
      const muzzleBrakeGeo = new THREE.BoxGeometry(0.105, 0.105, 0.08);
      const muzzleBrake = new THREE.Mesh(muzzleBrakeGeo, darkGunmetal);
      muzzleBrake.position.set(0, 0.035, -0.54);
      this.meshGroup.add(muzzleBrake);

      const brakePortGeo = new THREE.BoxGeometry(0.115, 0.04, 0.04);
      const brakePort = new THREE.Mesh(brakePortGeo, amberGlowMat);
      brakePort.position.set(0, 0.035, -0.54);
      this.meshGroup.add(brakePort);

      // 2. Revolving 6-Chamber Bomb Cylinder
      const cylinderGeo = new THREE.CylinderGeometry(0.076, 0.076, 0.22, 18);
      cylinderGeo.rotateX(Math.PI / 2);
      const cylinder = new THREE.Mesh(cylinderGeo, brushedTitanium);
      cylinder.position.set(0, 0.02, 0.04);
      cylinder.castShadow = true;
      this.meshGroup.add(cylinder);

      // Cylinder outer cage / frame
      const cageGeo = new THREE.BoxGeometry(0.165, 0.165, 0.24);
      const cage = new THREE.Mesh(cageGeo, darkGunmetal);
      cage.position.set(0, 0.02, 0.04);
      this.meshGroup.add(cage);

      // 6 Mini Bomb Warheads loaded in cylinder
      const miniBombGeo = new THREE.SphereGeometry(0.022, 10, 10);
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const bx = Math.cos(angle) * 0.05;
        const by = Math.sin(angle) * 0.05;
        const miniBomb = new THREE.Mesh(miniBombGeo, amberGlowMat);
        miniBomb.position.set(bx, 0.02 + by, 0.14);
        this.meshGroup.add(miniBomb);
      }

      // 3. Underbarrel Pneumatic Pressure Canister
      const canisterGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 16);
      canisterGeo.rotateX(Math.PI / 2);
      const canister = new THREE.Mesh(canisterGeo, brushedTitanium);
      canister.position.set(0, -0.055, -0.22);
      this.meshGroup.add(canister);

      // Glowing pressure conduit tube
      const conduitGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8);
      conduitGeo.rotateX(Math.PI / 2);
      const conduit = new THREE.Mesh(conduitGeo, amberGlowMat);
      conduit.position.set(0.036, -0.045, -0.22);
      this.meshGroup.add(conduit);

      // 4. Heavy Angled Grip & Tactical Stock
      const gripGeo = new THREE.BoxGeometry(0.048, 0.15, 0.07);
      gripGeo.rotateX(-0.25);
      const grip = new THREE.Mesh(gripGeo, carbonFiberMat);
      grip.position.set(0, -0.11, 0.14);
      this.meshGroup.add(grip);

      const foregripGeo = new THREE.BoxGeometry(0.044, 0.12, 0.05);
      foregripGeo.rotateX(0.15);
      const foregrip = new THREE.Mesh(foregripGeo, carbonFiberMat);
      foregrip.position.set(0, -0.12, -0.16);
      this.meshGroup.add(foregrip);

      const stockGeo = new THREE.BoxGeometry(0.055, 0.13, 0.26);
      const stock = new THREE.Mesh(stockGeo, darkGunmetal);
      stock.position.set(0, -0.03, 0.28);
      stock.castShadow = true;
      this.meshGroup.add(stock);

      // 5. Top Sighting Rail & Holographic Optic Lens
      const railGeo = new THREE.BoxGeometry(0.045, 0.025, 0.44);
      const topRail = new THREE.Mesh(railGeo, darkGunmetal);
      topRail.position.set(0, 0.115, -0.08);
      this.meshGroup.add(topRail);

      const holoSightGeo = new THREE.BoxGeometry(0.05, 0.065, 0.1);
      const holoSight = new THREE.Mesh(holoSightGeo, hazardYellow);
      holoSight.position.set(0, 0.15, -0.04);
      this.meshGroup.add(holoSight);

      const reticleGeo = new THREE.PlaneGeometry(0.032, 0.032);
      const reticleMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0.15, -0.04);
      this.meshGroup.add(reticle);

    } else {
      // Assault Rifle: Sleek Hyperion style
      const bodyGeo = new THREE.BoxGeometry(0.06, 0.085, 0.44);
      const body = new THREE.Mesh(bodyGeo, whiteCeramic);
      body.position.set(0, 0.02, -0.04);
      body.castShadow = true;
      this.meshGroup.add(body);

      // Reciprocating Slide/Bolt
      const slideGeo = new THREE.BoxGeometry(0.04, 0.03, 0.16);
      this.slideMesh = new THREE.Mesh(slideGeo, brushedTitanium);
      this.slideMesh.position.set(0, 0.075, 0.02);
      this.meshGroup.add(this.slideMesh);

      const barrelGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.42, 16);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, brushedTitanium);
      barrel.position.set(0, 0.03, -0.38);
      this.meshGroup.add(barrel);

      const curvedMagGeo = new THREE.BoxGeometry(0.038, 0.15, 0.075);
      curvedMagGeo.rotateX(0.2);
      const mag = new THREE.Mesh(curvedMagGeo, cyanGlowMat);
      mag.position.set(0, -0.09, -0.02);
      this.meshGroup.add(mag);

      const gripGeo = new THREE.BoxGeometry(0.042, 0.13, 0.06);
      gripGeo.rotateX(-0.28);
      const grip = new THREE.Mesh(gripGeo, carbonFiberMat);
      grip.position.set(0, -0.08, 0.12);
      this.meshGroup.add(grip);

      // Holo-Sight optic
      const sightGeo = new THREE.BoxGeometry(0.035, 0.045, 0.09);
      const sight = new THREE.Mesh(sightGeo, whiteCeramic);
      sight.position.set(0, 0.08, 0.04);
      this.meshGroup.add(sight);
    }

    // ON-WEAPON HOLOGRAPHIC AMMO DISPLAY (Mounted on top-rear of gun body)
    const ammoTex = TextureGenerator.createAmmoDisplayTexture(this.currentAmmo, this.maxAmmo);
    const ammoScreenGeo = new THREE.PlaneGeometry(0.05, 0.025);
    const ammoScreenMat = new THREE.MeshBasicMaterial({
      map: ammoTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.ammoScreenMesh = new THREE.Mesh(ammoScreenGeo, ammoScreenMat);
    this.ammoScreenMesh.position.set(0, 0.075, 0.14);
    this.ammoScreenMesh.rotation.x = -Math.PI / 5; // Tilted toward player eye
    this.meshGroup.add(this.ammoScreenMesh);

    // Dynamic Muzzle Flash Effect & Point Light
    const isBomb = this.config.id === 'bomb';
    const flashGeo = new THREE.OctahedronGeometry(isBomb ? 0.12 : 0.07, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: isBomb ? 0xf97316 : 0x38bdf8,
      transparent: true,
      opacity: 0
    });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.position.set(0, 0.03, this.getMuzzleOffsetZ());
    this.meshGroup.add(this.muzzleFlashMesh);

    this.muzzleFlashLight = new THREE.PointLight(isBomb ? 0xf97316 : 0x0ea5e9, 0, isBomb ? 9 : 7);
    this.muzzleFlashLight.position.set(0, 0.03, this.getMuzzleOffsetZ());
    this.meshGroup.add(this.muzzleFlashLight);

    this.meshGroup.position.copy(this.basePosition);
  }

  private getMuzzleOffsetZ(): number {
    switch (this.config.id) {
      case 'sniper': return -0.88;
      case 'shotgun': return -0.58;
      case 'plasma_rifle': return -0.52;
      case 'smg': return -0.45;
      case 'bomb': return -0.58;
      default: return -0.62;
    }
  }

  public canShoot(currentTime: number, hasInfiniteAmmo: boolean = false): boolean {
    if (this.isReloading) return false;
    if (this.currentAmmo <= 0 && !hasInfiniteAmmo) return false;
    const interval = 1 / this.config.fireRate;
    return (currentTime - this.lastFireTime) >= interval;
  }

  public shoot(currentTime: number, hasInfiniteAmmo: boolean = false): boolean {
    if (!this.canShoot(currentTime, hasInfiniteAmmo)) {
      if (this.currentAmmo <= 0 && !this.isReloading && !hasInfiniteAmmo) {
        soundManager.playEmptyClick();
        this.startReload();
      }
      return false;
    }

    this.lastFireTime = currentTime;
    if (!hasInfiniteAmmo) {
      this.currentAmmo--;
    }

    // Update on-gun ammo display
    this.updateAmmoDisplay();

    // Recoil kick & Bolt slide cycle
    this.currentRecoil = this.config.recoilKick;
    this.currentRecoilRot = this.config.recoilKick * 1.6;
    this.slideRecoil = 0.04;

    // Trigger bright muzzle flash
    this.muzzleFlashTimer = 0.05;
    if (this.muzzleFlashMesh) (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
    if (this.muzzleFlashLight && this.enableFlashLight) this.muzzleFlashLight.intensity = 3.5;

    // Play procedural sound
    soundManager.playGunshot(this.config.soundType);

    if (this.currentAmmo <= 0 && !hasInfiniteAmmo) {
      this.startReload();
    }

    return true;
  }

  public startReload() {
    if (this.isReloading || this.currentAmmo >= this.maxAmmo) return;
    this.isReloading = true;
    this.reloadProgress = 0;
    soundManager.playReload();
  }

  public update(delta: number, _walkTime?: number, _isMoving?: boolean) {
    // Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) {
        if (this.muzzleFlashMesh) (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        if (this.muzzleFlashLight) this.muzzleFlashLight.intensity = 0;
      }
    }

    // Bolt slide recovery
    if (this.slideMesh) {
      this.slideRecoil = THREE.MathUtils.lerp(this.slideRecoil, 0, delta * 25);
      this.slideMesh.position.z = 0.02 + this.slideRecoil;
    }

    // Handle Reloading Animation
    if (this.isReloading) {
      this.reloadProgress += delta / this.config.reloadTime;
      if (this.reloadProgress >= 1) {
        this.isReloading = false;
        this.currentAmmo = this.maxAmmo;
        this.reloadProgress = 0;
        this.updateAmmoDisplay();
      }
    }

    // Recoil Recovery
    this.currentRecoil = THREE.MathUtils.lerp(this.currentRecoil, 0, delta * 18);
    this.currentRecoilRot = THREE.MathUtils.lerp(this.currentRecoilRot, 0, delta * 18);

    // Target position based on ADS and recoil (steady & stabilized during movement)
    const targetPos = this.isAiming ? this.adsPosition.clone() : this.basePosition.clone();

    // Apply recoil translation
    targetPos.z += this.currentRecoil;

    // Reload animation dip
    if (this.isReloading) {
      const dip = Math.sin(this.reloadProgress * Math.PI) * 0.22;
      targetPos.y -= dip;
      this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, -0.4, delta * 10);
      this.meshGroup.rotation.z = THREE.MathUtils.lerp(this.meshGroup.rotation.z, 0.25, delta * 10);
    } else {
      this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, this.currentRecoilRot, delta * 20);
      this.meshGroup.rotation.z = THREE.MathUtils.lerp(this.meshGroup.rotation.z, 0, delta * 15);
    }

    this.meshGroup.position.lerp(targetPos, delta * 22);
  }
}
