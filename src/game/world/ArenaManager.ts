import * as THREE from 'three';
import { ArenaId } from '../../types/game';
import { TextureGenerator } from './TextureGenerator';

export interface ArenaObstacle {
  mesh: THREE.Mesh | THREE.Group;
  box: THREE.Box3;
  isCover: boolean;
}

export interface SpawnPoint {
  position: THREE.Vector3;
  name: string;
}

export interface ExplosiveBarrel {
  mesh: THREE.Group;
  position: THREE.Vector3;
  radius: number;
  damage: number;
  exploded: boolean;
}

export class ArenaManager {
  private scene: THREE.Scene;
  public obstacles: ArenaObstacle[] = [];
  public spawnPoints: SpawnPoint[] = [];
  public explosiveBarrels: ExplosiveBarrel[] = [];
  public arenaSize = 75; // 75x75m arena

  private arenaGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);
  }

  public loadArena(arenaId: ArenaId) {
    // Clear existing arena objects
    while (this.arenaGroup.children.length > 0) {
      const obj = this.arenaGroup.children[0];
      this.arenaGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }
    this.obstacles = [];
    this.spawnPoints = [];
    this.explosiveBarrels = [];

    switch (arenaId) {
      case 'desert':
        this.buildDesertArena();
        break;
      case 'neon_city':
        this.buildNeonCityArena();
        break;
      case 'space_station':
        this.buildSpaceStationArena();
        break;
      case 'industrial':
      default:
        this.buildIndustrialArena();
        break;
    }
  }

  // --- ARENA 1: APEX RESEARCH COMPLEX (LIGHT & ADVANCED GRAPHICS) ---
  private buildIndustrialArena() {
    // Bright daylight sky & clean atmosphere
    this.scene.background = new THREE.Color(0xf1f5f9);
    this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.008);

    // Advanced Lighting: Bright Hemisphere + Sun Directional with Soft Shadows
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xf8fafc, 0.85);
    this.arenaGroup.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    sunLight.position.set(35, 55, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 140;
    const d = 45;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.radius = 2.5; // Soft PCF shadows
    this.arenaGroup.add(sunLight);

    // Fill bounce light
    const bounceLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    bounceLight.position.set(-25, 30, -25);
    this.arenaGroup.add(bounceLight);

    // High-tech White Hexagonal Ceramic Floor
    const floorTexture = TextureGenerator.createHexTileTexture();
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, 32, 32);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.25,
      metalness: 0.15,
      color: 0xffffff
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    // Recessed Glowing Blue Power Conduits in Floor
    const conduitGeo = new THREE.PlaneGeometry(4, this.arenaSize - 4);
    conduitGeo.rotateX(-Math.PI / 2);
    const conduitMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.4
    });
    const conduitX = new THREE.Mesh(conduitGeo, conduitMat);
    conduitX.position.y = 0.01;
    this.arenaGroup.add(conduitX);

    const conduitZ = new THREE.Mesh(conduitGeo, conduitMat);
    conduitZ.rotation.y = Math.PI / 2;
    conduitZ.position.y = 0.01;
    this.arenaGroup.add(conduitZ);

    // Perimeter Architectural Walls
    this.createPerimeterWalls(0xffffff, 0x0284c7);

    // High-Tech Laboratory Server Racks & Composite Modules
    this.createTechModule(-16, 2.5, -12, 5, 5, 10, 0x0ea5e9);
    this.createTechModule(18, 2.5, -14, 5, 5, 10, 0x0284c7);
    this.createTechModule(16, 2.5, 14, 5, 5, 10, 0x38bdf8);
    this.createTechModule(-15, 2.5, 16, 10, 5, 5, 0x0ea5e9);

    // Central Elevated Observation Deck
    this.createElevatedDeck(0, 2.8, 0, 16, 8);

    // High-tech cover pillars with glowing power lines
    this.createTechPillar(-8, 8);
    this.createTechPillar(8, 8);
    this.createTechPillar(-8, -8);
    this.createTechPillar(8, -8);

    // Hazard Explosive Barrels
    this.addExplosiveBarrel(-11, 0, -5);
    this.addExplosiveBarrel(12, 0, -6);
    this.addExplosiveBarrel(12, 0, 15);
    this.addExplosiveBarrel(-10, 0, 11);
    this.addExplosiveBarrel(0, 0, -18);

    this.addSpawnPoints();
  }

  // --- ARENA 2: SUNLIT SOLIS OUTPOST ---
  private buildDesertArena() {
    this.scene.background = new THREE.Color(0xfef3c7);
    this.scene.fog = new THREE.FogExp2(0xfef3c7, 0.009);

    const hemi = new THREE.HemisphereLight(0xfef08a, 0xfde68a, 0.9);
    this.arenaGroup.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sun.position.set(40, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const d = 45;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.arenaGroup.add(sun);

    // Polished warm sandstone floor
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf5deb3,
      roughness: 0.6,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    this.createPerimeterWalls(0xfafaf9, 0xf59e0b);

    // Advanced Solarium Bunkers
    this.createTechModule(-15, 2.5, -15, 9, 5, 9, 0xf59e0b);
    this.createTechModule(16, 2.5, 14, 9, 5, 9, 0xf59e0b);
    this.createBoxObstacle(-14, 1.8, 10, 10, 3.6, 3, 0xffffff, 0.2);
    this.createBoxObstacle(12, 1.8, -10, 3, 3.6, 10, 0xffffff, -0.2);

    // High Watchtower Platform
    this.createElevatedDeck(0, 4.0, -12, 8, 8);

    // Barrels
    this.addExplosiveBarrel(-10, 0, -10);
    this.addExplosiveBarrel(11, 0, 9);
    this.addExplosiveBarrel(-5, 0, 7);
    this.addExplosiveBarrel(6, 0, -7);

    this.addSpawnPoints();
  }

  // --- ARENA 3: NEO-APEX SKYLINE PLAZA ---
  private buildNeonCityArena() {
    this.scene.background = new THREE.Color(0xe0f2fe);
    this.scene.fog = new THREE.FogExp2(0xe0f2fe, 0.007);

    const hemi = new THREE.HemisphereLight(0x38bdf8, 0xffffff, 0.85);
    this.arenaGroup.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(-30, 50, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const d = 45;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.arenaGroup.add(sun);

    // Polished white marble floor with reflections
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.12,
      metalness: 0.35
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    this.createPerimeterWalls(0xffffff, 0x0284c7);

    // Glass & White Composite Skyline Towers
    this.createCyberBuilding(-16, -16, 9, 22, 9, 0x0ea5e9);
    this.createCyberBuilding(16, 16, 9, 25, 9, 0xf43f5e);
    this.createCyberBuilding(16, -16, 9, 20, 9, 0x06b6d4);
    this.createCyberBuilding(-16, 16, 9, 21, 9, 0x38bdf8);

    // Center Plaza Glass & White Barrier Art
    this.createBoxObstacle(0, 1.4, 6, 9, 2.8, 1.2, 0xffffff, 0, 0x0284c7);
    this.createBoxObstacle(0, 1.4, -6, 9, 2.8, 1.2, 0xffffff, 0, 0xf43f5e);
    this.createBoxObstacle(6, 1.4, 0, 1.2, 2.8, 7, 0xffffff, 0, 0x0ea5e9);
    this.createBoxObstacle(-6, 1.4, 0, 1.2, 2.8, 7, 0xffffff, 0, 0x38bdf8);

    // Barrels
    this.addExplosiveBarrel(-7, 0, -7);
    this.addExplosiveBarrel(7, 0, 7);
    this.addExplosiveBarrel(-7, 0, 7);
    this.addExplosiveBarrel(7, 0, -7);

    this.addSpawnPoints();
  }

  // --- ARENA 4: ORBITAL SOLAR STATION ---
  private buildSpaceStationArena() {
    this.scene.background = new THREE.Color(0xf0f9ff);
    this.scene.fog = new THREE.FogExp2(0xf0f9ff, 0.008);

    const hemi = new THREE.HemisphereLight(0xbae6fd, 0xffffff, 0.9);
    this.arenaGroup.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.0); // Intense orbital solar light
    sun.position.set(-25, 50, 35);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const d = 45;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.arenaGroup.add(sun);

    // Solar Hull Panels
    const floorTexture = TextureGenerator.createPanelTexture();
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.2,
      metalness: 0.6,
      color: 0xffffff
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    this.createPerimeterWalls(0xffffff, 0x0284c7);

    // Solar Energy Pillars
    const pillarPositions = [
      { x: -14, z: -14 }, { x: 14, z: -14 },
      { x: -14, z: 14 }, { x: 14, z: 14 },
      { x: 0, z: -18 }, { x: 0, z: 18 }
    ];

    pillarPositions.forEach(p => {
      const geo = new THREE.CylinderGeometry(1.3, 1.3, 10, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.15
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, 5, p.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.arenaGroup.add(mesh);

      // Glowing Cyan Rings
      for (let r = 2; r <= 8; r += 3) {
        const ringGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.4, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(p.x, r, p.z);
        this.arenaGroup.add(ring);
      }

      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, box, isCover: true });
    });

    // Central Teleporter Ring Platform
    this.createBoxObstacle(0, 0.5, 0, 12, 1.0, 12, 0xffffff, 0, 0x0284c7);

    // Barrels
    this.addExplosiveBarrel(-9, 0, 0);
    this.addExplosiveBarrel(9, 0, 0);
    this.addExplosiveBarrel(0, 0, -9);
    this.addExplosiveBarrel(0, 0, 9);

    this.addSpawnPoints();
  }

  // --- ARCHITECTURAL HELPERS ---
  private createPerimeterWalls(wallColor: number, trimColor: number) {
    const half = this.arenaSize / 2;
    const height = 8;
    const thickness = 2;

    const wallTexture = TextureGenerator.createPanelTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      color: wallColor,
      roughness: 0.35,
      metalness: 0.2
    });

    const trimMat = new THREE.MeshBasicMaterial({ color: trimColor });

    const walls = [
      { x: 0, z: -half, w: this.arenaSize, h: height, d: thickness },
      { x: 0, z: half, w: this.arenaSize, h: height, d: thickness },
      { x: -half, z: 0, w: thickness, h: height, d: this.arenaSize },
      { x: half, z: 0, w: thickness, h: height, d: this.arenaSize }
    ];

    walls.forEach(w => {
      const geo = new THREE.BoxGeometry(w.w, w.h, w.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(w.x, w.h / 2, w.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.arenaGroup.add(mesh);

      // Top glowing neon trim strip
      const trimGeo = new THREE.BoxGeometry(w.w, 0.25, w.d);
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(w.x, w.h, w.z);
      this.arenaGroup.add(trim);

      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, box, isCover: false });
    });
  }

  private createTechModule(x: number, y: number, z: number, w: number, h: number, d: number, glowColor: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Clean white composite body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Glowing Neon Accent Linework
    const lineGeo = new THREE.BoxGeometry(w + 0.05, 0.15, d + 0.05);
    const lineMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const line1 = new THREE.Mesh(lineGeo, lineMat);
    line1.position.y = h * 0.25;
    group.add(line1);

    const line2 = new THREE.Mesh(lineGeo, lineMat);
    line2.position.y = -h * 0.25;
    group.add(line2);

    this.arenaGroup.add(group);

    const box = new THREE.Box3().setFromObject(body);
    this.obstacles.push({ mesh: body, box, isCover: true });
  }

  private createElevatedDeck(x: number, y: number, z: number, w: number, d: number) {
    // Deck Platform
    const deckGeo = new THREE.BoxGeometry(w, 0.5, d);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.5
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(x, y, z);
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.arenaGroup.add(deck);

    // Glass safety railings
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.45,
      roughness: 0.05,
      metalness: 0.9
    });

    const railGeoX = new THREE.BoxGeometry(w, 1.1, 0.1);
    const rail1 = new THREE.Mesh(railGeoX, railMat);
    rail1.position.set(x, y + 0.8, z - d / 2);
    this.arenaGroup.add(rail1);

    const rail2 = new THREE.Mesh(railGeoX, railMat);
    rail2.position.set(x, y + 0.8, z + d / 2);
    this.arenaGroup.add(rail2);

    // Ramp connecting ground to deck
    const rampLength = 8;
    const rampGeo = new THREE.BoxGeometry(4, 0.3, rampLength);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(x, y / 2, z + d / 2 + rampLength / 2 - 0.5);
    ramp.rotation.x = Math.atan2(y, rampLength);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.arenaGroup.add(ramp);

    const deckBox = new THREE.Box3().setFromObject(deck);
    this.obstacles.push({ mesh: deck, box: deckBox, isCover: true });

    const rampBox = new THREE.Box3().setFromObject(ramp);
    this.obstacles.push({ mesh: ramp, box: rampBox, isCover: false });
  }

  private createTechPillar(x: number, z: number) {
    const geo = new THREE.CylinderGeometry(0.8, 0.8, 6, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.7
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 3, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.arenaGroup.add(mesh);

    // Glowing core
    const ringGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.4, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, 3, z);
    this.arenaGroup.add(ring);

    const box = new THREE.Box3().setFromObject(mesh);
    this.obstacles.push({ mesh, box, isCover: true });
  }

  private createBoxObstacle(x: number, y: number, z: number, w: number, h: number, d: number, color: number, rotY: number = 0, emissiveColor?: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.25,
      metalness: 0.3,
      emissive: emissiveColor ?? 0x000000,
      emissiveIntensity: emissiveColor ? 0.4 : 0
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (rotY) mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.arenaGroup.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    this.obstacles.push({ mesh, box, isCover: true });
    return mesh;
  }

  private createCyberBuilding(x: number, z: number, w: number, h: number, d: number, neonColor: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.85
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.arenaGroup.add(mesh);

    // Holographic Cyan / Magenta Billboard
    const signGeo = new THREE.PlaneGeometry(w * 0.85, 2.2);
    const signMat = new THREE.MeshBasicMaterial({
      color: neonColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, h * 0.65, z + d / 2 + 0.05);
    this.arenaGroup.add(sign);

    const box = new THREE.Box3().setFromObject(mesh);
    this.obstacles.push({ mesh, box, isCover: true });
  }

  private addExplosiveBarrel(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // High-tech white / warning orange canister
    const drumGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 24);
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.8
    });
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.y = 0.7;
    drum.castShadow = true;
    drum.receiveShadow = true;
    group.add(drum);

    // Bright warning orange band
    const stripeGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.35, 24);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.7;
    group.add(stripe);

    this.arenaGroup.add(group);

    this.explosiveBarrels.push({
      mesh: group,
      position: new THREE.Vector3(x, y + 0.7, z),
      radius: 8.0,
      damage: 190,
      exploded: false
    });
  }

  private addSpawnPoints() {
    const half = (this.arenaSize / 2) - 6;
    this.spawnPoints = [
      { position: new THREE.Vector3(-half, 0, -half), name: 'NW Bay' },
      { position: new THREE.Vector3(half, 0, -half), name: 'NE Bay' },
      { position: new THREE.Vector3(-half, 0, half), name: 'SW Bay' },
      { position: new THREE.Vector3(half, 0, half), name: 'SE Bay' },
      { position: new THREE.Vector3(0, 0, -half), name: 'North Airlock' },
      { position: new THREE.Vector3(0, 0, half), name: 'South Airlock' },
      { position: new THREE.Vector3(-half, 0, 0), name: 'West Portal' },
      { position: new THREE.Vector3(half, 0, 0), name: 'East Portal' }
    ];
  }

  public getValidSpawnPoint(playerPos: THREE.Vector3): THREE.Vector3 {
    const valid = this.spawnPoints.filter(p => p.position.distanceTo(playerPos) > 15);
    if (valid.length > 0) {
      const choice = valid[Math.floor(Math.random() * valid.length)].position.clone();
      choice.x += (Math.random() - 0.5) * 4;
      choice.z += (Math.random() - 0.5) * 4;
      return choice;
    }
    return new THREE.Vector3(22, 0, 22);
  }
}
