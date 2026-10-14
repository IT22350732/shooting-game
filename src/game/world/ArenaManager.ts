import * as THREE from 'three';
import { ArenaId, GraphicsQuality } from '../../types/game';
import { TextureGenerator } from './TextureGenerator';
import { soundManager } from '../../audio/SoundManager';
import { DestructibleProp, DestructibleType, LootType } from '../entities/DestructibleProp';

export interface StairRamp {
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  width: number;
  bottomY: number;
  topY: number;
}

export interface FloorPlane {
  center: THREE.Vector3;
  halfW: number;
  halfD: number;
  rotY: number;
  topY: number;
  pitchHeight?: number;
}

export interface ArenaObstacle {
  mesh: THREE.Mesh | THREE.Group;
  box: THREE.Box3;
  isCover: boolean;
  isFloor?: boolean;
  ceilingY?: number;
  stairRamp?: StairRamp;
  floorPlane?: FloorPlane;
  isGlass?: boolean;
}

export interface InteriorZone {
  id: string;
  name: string;
  center: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  rotY: number;
  door: InteractiveDoor;
  doorWorldPos: THREE.Vector3;
  doorApproachPos: THREE.Vector3;
  doorInsidePos: THREE.Vector3;
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

export class InteractiveDoor {
  public id: string;
  public name: string;
  public position: THREE.Vector3; // world interaction point
  public pivot: THREE.Group;
  public doorMesh: THREE.Mesh;
  public isOpen: boolean = false;
  public targetAngle: number = 0;
  public openAngle: number;
  public obstacle: ArenaObstacle;
  public closedBox: THREE.Box3;

  constructor(
    id: string,
    name: string,
    worldPos: THREE.Vector3,
    doorWidth: number,
    doorHeight: number,
    rotY: number,
    doorMat: THREE.Material,
    openInward: boolean = true,
    parent?: THREE.Object3D
  ) {
    this.id = id;
    this.name = name;
    this.position = worldPos.clone();
    this.openAngle = openInward ? -Math.PI / 2 : Math.PI / 2;

    this.pivot = new THREE.Group();
    // Offset pivot to hinge at left side of doorway in local space
    const hingeOffset = new THREE.Vector3(-doorWidth / 2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    this.pivot.position.copy(worldPos).add(hingeOffset);
    this.pivot.rotation.y = rotY;

    // Door leaf mesh
    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 0.12);
    doorGeo.translate(doorWidth / 2, doorHeight / 2, 0); // origin at hinge
    this.doorMesh = new THREE.Mesh(doorGeo, doorMat);
    this.doorMesh.castShadow = true;
    this.doorMesh.receiveShadow = true;
    this.pivot.add(this.doorMesh);

    // Brass / metallic lever handles attached to door leaf so they swing together
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.2 });
    const handleGeo = new THREE.BoxGeometry(0.18, 0.04, 0.08);

    const handleFront = new THREE.Mesh(handleGeo, handleMat);
    handleFront.position.set(doorWidth - 0.22, doorHeight * 0.48, 0.08);
    this.doorMesh.add(handleFront);

    const handleBack = new THREE.Mesh(handleGeo, handleMat);
    handleBack.position.set(doorWidth - 0.22, doorHeight * 0.48, -0.08);
    this.doorMesh.add(handleBack);

    if (parent) {
      parent.add(this.pivot);
    }

    // Closed doorway obstacle Box3
    const halfW = doorWidth / 2;
    const halfT = 0.40;
    this.closedBox = new THREE.Box3();
    const corners = [
      new THREE.Vector3(-halfW, 0, -halfT),
      new THREE.Vector3(halfW, 0, -halfT),
      new THREE.Vector3(-halfW, doorHeight, -halfT),
      new THREE.Vector3(halfW, doorHeight, -halfT),
      new THREE.Vector3(-halfW, 0, halfT),
      new THREE.Vector3(halfW, 0, halfT),
      new THREE.Vector3(-halfW, doorHeight, halfT),
      new THREE.Vector3(halfW, doorHeight, halfT)
    ];
    corners.forEach(c => {
      c.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
      this.closedBox.expandByPoint(c);
    });

    this.obstacle = {
      mesh: this.pivot,
      box: this.closedBox.clone(),
      isCover: false
    };
  }

  public update(delta: number) {
    if (Math.abs(this.doorMesh.rotation.y - this.targetAngle) > 0.001) {
      this.doorMesh.rotation.y = THREE.MathUtils.lerp(this.doorMesh.rotation.y, this.targetAngle, Math.min(1.0, delta * 8));
    }
  }

  public toggle(playSound: boolean = true): boolean {
    this.isOpen = !this.isOpen;
    this.targetAngle = this.isOpen ? this.openAngle : 0;
    if (this.isOpen) {
      this.obstacle.box.makeEmpty();
      if (playSound) soundManager.playDoorOpen();
    } else {
      this.obstacle.box.copy(this.closedBox);
      if (playSound) soundManager.playDoorClose();
    }
    return this.isOpen;
  }

  public setOpen(open: boolean, playSound: boolean = true) {
    if (this.isOpen !== open) {
      this.toggle(playSound);
    }
  }

  public getWorldInteractionPoint(): THREE.Vector3 {
    return this.position;
  }
}

export class ArenaManager {
  private scene: THREE.Scene;
  public obstacles: ArenaObstacle[] = [];
  public spawnPoints: SpawnPoint[] = [];
  public explosiveBarrels: ExplosiveBarrel[] = [];
  public doors: InteractiveDoor[] = [];
  public interiorZones: InteriorZone[] = [];
  public destructibles: DestructibleProp[] = [];
  public arenaSize = 130; // Expanded 130x130m realistic neighborhood / city block
  public graphicsQuality: GraphicsQuality = 'high';

  private arenaGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);
  }

  public setQuality(quality: GraphicsQuality) {
    this.graphicsQuality = quality;
  }

  public update(delta: number) {
    for (let i = 0; i < this.doors.length; i++) {
      this.doors[i].update(delta);
    }
    for (let i = 0; i < this.destructibles.length; i++) {
      this.destructibles[i].update(delta);
    }
  }

  private static _zoneLocalVec = new THREE.Vector3();
  private static _yAxis = new THREE.Vector3(0, 1, 0);

  public isPositionInsideBuilding(pos: THREE.Vector3): boolean {
    for (let i = 0; i < this.interiorZones.length; i++) {
      const z = this.interiorZones[i];
      const local = ArenaManager._zoneLocalVec.subVectors(pos, z.center);
      if (z.rotY) {
        local.applyAxisAngle(ArenaManager._yAxis, -z.rotY);
      }
      const halfW = (z.width - 1.0) / 2;
      const halfD = (z.depth - 1.0) / 2;
      if (
        local.x >= -halfW &&
        local.x <= halfW &&
        local.z >= -halfD &&
        local.z <= halfD &&
        pos.y >= -0.5 &&
        pos.y <= z.height + 1.2
      ) {
        return true;
      }
    }
    return false;
  }

  public getBuildingAtPosition(pos: THREE.Vector3): InteriorZone | null {
    for (let i = 0; i < this.interiorZones.length; i++) {
      const z = this.interiorZones[i];
      const local = ArenaManager._zoneLocalVec.subVectors(pos, z.center);
      if (z.rotY) {
        local.applyAxisAngle(ArenaManager._yAxis, -z.rotY);
      }
      const halfW = (z.width - 1.0) / 2;
      const halfD = (z.depth - 1.0) / 2;
      if (
        local.x >= -halfW &&
        local.x <= halfW &&
        local.z >= -halfD &&
        local.z <= halfD &&
        pos.y >= -0.5 &&
        pos.y <= z.height + 1.2
      ) {
        return z;
      }
    }
    return null;
  }

  public loadArena(arenaId: ArenaId, quality?: GraphicsQuality) {
    if (quality) this.graphicsQuality = quality;
    // Clear existing arena objects
    while (this.arenaGroup.children.length > 0) {
      const obj = this.arenaGroup.children[0];
      this.arenaGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }
    this.obstacles = [];
    this.spawnPoints = [];
    this.explosiveBarrels = [];
    this.doors = [];
    this.destructibles.forEach(d => d.dispose());
    this.destructibles = [];
    this.interiorZones = [];

    switch (arenaId) {
      case 'desert':
        this.buildDesertArena();
        break;
      case 'neon_city':
        this.buildDowntownCityArena();
        break;
      case 'space_station':
        this.buildIndustrialWarehouseArena();
        break;
      case 'industrial':
      default:
        this.buildSuburbanTownArena();
        break;
    }
  }

  // =========================================================================
  // LOCATION 1: SUBURBAN RESIDENTIAL TOWN (Real Houses, Streets & Lawns)
  // =========================================================================
  private buildSuburbanTownArena() {
    // Natural clear daylight sky with gentle atmospheric haze
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0xcfe9f7, 0.005);

    // Warm Sun Directional Light + Sky Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0xdcfce7, 0.85);
    this.arenaGroup.add(hemiLight);

    const isLow = this.graphicsQuality === 'low' || this.graphicsQuality === 'normal';
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.75);
    sun.position.set(38, 55, 28);
    sun.castShadow = !isLow;
    if (!isLow) {
      const mapSize = this.graphicsQuality === 'ultra' ? 2048 : 1024;
      sun.shadow.mapSize.width = mapSize;
      sun.shadow.mapSize.height = mapSize;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 140;
      const d = 48;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.00008;
      sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 1.5;
    }
    this.arenaGroup.add(sun);

    // Green Grass Lawn Ground Base
    const grassTex = TextureGenerator.createGrassTexture();
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.85,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.arenaGroup.add(ground);

    // Seamless Intersecting Asphalt Streets with Vector-Sharp Markings (Zero Z-Fighting)
    this.createStreetSystem(12, 40.5);

    // Concrete Sidewalks bordering the streets
    this.createSidewalkBorder(12, 40.5);

    // REAL ENTERABLE HOUSES WITH WALKABLE INTERIORS & INTERACTIVE DOORS
    // House 1 (North-West): Red Brick Family Manor
    this.createEnterableBuilding({
      id: 'suburb-nw',
      name: 'West Manor',
      x: -24,
      z: -24,
      width: 14,
      depth: 12,
      height: 4.2,
      wallType: 'brick',
      wallColor: '#8b3a2b',
      roofType: 'gable',
      roofColor: '#334155',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: 0
    });

    // House 2 (North-East): White Wood Siding Villa with Terracotta Shingles
    this.createEnterableBuilding({
      id: 'suburb-ne',
      name: 'White Villa',
      x: 24,
      z: -24,
      width: 14,
      depth: 12,
      height: 4.2,
      wallType: 'siding',
      wallColor: '#f8fafc',
      roofType: 'gable',
      roofColor: '#9a3412',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: 0
    });

    // House 3 (South-West): Navy Blue Bungalow
    this.createEnterableBuilding({
      id: 'suburb-sw',
      name: 'South Bungalow',
      x: -24,
      z: 24,
      width: 14,
      depth: 12,
      height: 4.2,
      wallType: 'siding',
      wallColor: '#1e293b',
      roofType: 'gable',
      roofColor: '#475569',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: Math.PI
    });

    // House 4 (South-East): Cream Colonial Residence
    this.createEnterableBuilding({
      id: 'suburb-se',
      name: 'East Colonial',
      x: 24,
      z: 24,
      width: 14,
      depth: 12,
      height: 4.2,
      wallType: 'siding',
      wallColor: '#fef3c7',
      roofType: 'gable',
      roofColor: '#334155',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: Math.PI
    });

    // EXPANDED 130M OUTER SECTOR BUILDINGS
    // Far North: Lakeside Ranger Station & Cabin
    this.createEnterableBuilding({
      id: 'suburb-n',
      name: 'Ranger Station',
      x: 0,
      z: -46,
      width: 13,
      depth: 10,
      height: 4.2,
      wallType: 'brick',
      wallColor: '#78350f',
      roofType: 'gable',
      roofColor: '#1e293b',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      signText: 'RANGER CABIN',
      rotY: 0
    });

    // Far South: Security Workshop & Tool Depot
    this.createEnterableBuilding({
      id: 'suburb-s',
      name: 'Suburban Workshop',
      x: 0,
      z: 46,
      width: 13,
      depth: 10,
      height: 4.2,
      wallType: 'siding',
      wallColor: '#475569',
      roofType: 'gable',
      roofColor: '#0f172a',
      interiorFloorType: 'concrete',
      doorTheme: 'steel',
      signText: 'WORKSHOP',
      rotY: Math.PI
    });

    // Far West: Hillside Residence
    this.createEnterableBuilding({
      id: 'suburb-w',
      name: 'Hillside House',
      x: -46,
      z: 0,
      width: 10,
      depth: 13,
      height: 4.2,
      wallType: 'siding',
      wallColor: '#334155',
      roofType: 'gable',
      roofColor: '#b45309',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: -Math.PI / 2
    });

    // Far East: Garden Estate House
    this.createEnterableBuilding({
      id: 'suburb-e',
      name: 'Garden Estate',
      x: 46,
      z: 0,
      width: 10,
      depth: 13,
      height: 4.2,
      wallType: 'brick',
      wallColor: '#991b1b',
      roofType: 'gable',
      roofColor: '#334155',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: Math.PI / 2
    });

    // Low Garden Picket & Stone Fences (Waist-high tactical cover)
    this.createGardenFence(-10, -12, 14, 0);
    this.createGardenFence(10, -12, 14, 0);
    this.createGardenFence(-10, 12, 14, 0);
    this.createGardenFence(10, 12, 14, 0);
    this.createGardenFence(-36, -20, 14, 0);
    this.createGardenFence(36, -20, 14, 0);
    this.createGardenFence(-36, 20, 14, 0);
    this.createGardenFence(36, 20, 14, 0);

    // Real Parked Vehicles on the Street (Full 3D Cars for waist-high cover)
    this.createParkedCar(-14, -3.5, 0, 0x1d4ed8); // Blue Sedan
    this.createParkedCar(14, 3.5, Math.PI, 0xd97706); // Amber SUV
    this.createParkedCar(3.5, -15, Math.PI / 2, 0xe2e8f0); // White Coupe
    this.createParkedCar(-32, -3.5, 0, 0xdc2626); // Red Sedan
    this.createParkedCar(32, 3.5, Math.PI, 0x0f172a); // Black SUV
    this.createParkedCar(3.5, 32, Math.PI / 2, 0x15803d); // Green Pickup

    // Street furniture: Streetlights, Mailboxes, Hydrants, Dumpsters
    this.createStreetlight(-8, -7);
    this.createStreetlight(8, 7);
    this.createStreetlight(-8, 7);
    this.createStreetlight(8, -7);
    this.createStreetlight(-30, -7);
    this.createStreetlight(30, 7);
    this.createStreetlight(-7, -30);
    this.createStreetlight(7, 30);

    this.createFireHydrant(-7, -5.5);
    this.createFireHydrant(7, 5.5);
    this.createFireHydrant(-28, -5.5);
    this.createFireHydrant(28, 5.5);

    this.createDumpster(-16, -10, 0.2);
    this.createDumpster(16, 10, -0.3);
    this.createDumpster(-36, -10, 0);
    this.createDumpster(36, 10, Math.PI);

    // Explosive barrels in driveways/alleys
    this.addExplosiveBarrel(-13, 0, -8);
    this.addExplosiveBarrel(13, 0, 8);
    this.addExplosiveBarrel(-14, 0, 14);
    this.addExplosiveBarrel(14, 0, -14);
    this.addExplosiveBarrel(-34, 0, -14);
    this.addExplosiveBarrel(34, 0, 14);
    this.addExplosiveBarrel(-14, 0, 34);
    // OUTDOOR ELEVATED PLATFORMS ("UPSTAIRS" & "UPFLOOR" OBSERVATION GANTRIES)
    // North Observation Deck (adjacent to West Manor: jump directly over railing to Manor roof)
    this.createOutdoorElevatedPlatform({
      id: 'suburb-platform-north',
      name: 'North Observation Deck',
      x: -12.3,
      z: -24,
      rotY: 0,
      width: 7.0,
      depth: 5.0,
      height: 4.2,
      stairRun: 4.5,
      theme: 'suburban'
    });

    // South Observation Deck (adjacent to East Colonial: jump directly over railing to Colonial roof)
    this.createOutdoorElevatedPlatform({
      id: 'suburb-platform-south',
      name: 'South Observation Deck',
      x: 12.3,
      z: 24,
      rotY: Math.PI,
      width: 7.0,
      depth: 5.0,
      height: 4.2,
      stairRun: 4.5,
      theme: 'suburban'
    });

    // =========================================================================
    // NATURAL TREES & GRAND CANOPY SANCTUARY TREEHOUSE
    // =========================================================================
    // North-West Grand Canopy Sanctuary Treehouse (The sole, iconic 3-story sanctuary treehouse with panoramic transparent glass walls, calming lounge, rich loot crates, and open 3rd-floor rooftop)
    this.createEnterableTreehouse({
      id: 'suburb-grand-treehouse',
      name: 'Grand Canopy Sanctuary Treehouse',
      x: -36.5,
      z: -24,
      rotY: 0,
      height: 4.6,
      deckWidth: 14.8,
      deckDepth: 13.6,
      stairRun: 6.4,
      isGrandThreeStory: true
    });

    // South-East Botanical Orchard Garden & Pergola Pavilion
    // (Replaces duplicate treehouse so the Grand Canopy Sanctuary is the sole iconic treehouse in the arena)
    this.createOrchardGarden(36.5, 24);

    // Suburban Landscape Trees across front lawns, yards, and parkways
    const suburbTrees: [number, number, number, 'oak' | 'pine'][] = [
      [-46, -24, 1.1, 'oak'],
      [-48, -44, 1.25, 'pine'],
      [-28, -46, 1.05, 'oak'],
      [-36, -14, 0.95, 'oak'],
      [46, -24, 1.1, 'oak'],
      [46, -44, 1.2, 'pine'],
      [28, -46, 1.0, 'oak'],
      [36, -14, 1.05, 'oak'],
      [-46, 24, 1.05, 'oak'],
      [-46, 44, 1.2, 'pine'],
      [-28, 46, 1.0, 'oak'],
      [-36, 14, 0.95, 'oak'],
      [46, 24, 1.15, 'oak'],
      [48, 46, 1.25, 'pine'],
      [28, 46, 1.05, 'oak'],
      [36, 14, 1.0, 'oak'],
      [-16, -16, 0.9, 'oak'],
      [16, -16, 0.95, 'oak'],
      [-16, 16, 0.9, 'oak'],
      [16, 16, 0.95, 'oak'],
      [-10, -50, 1.1, 'pine'],
      [10, -50, 1.1, 'pine'],
      [-10, 50, 1.1, 'pine'],
      [10, 50, 1.1, 'pine']
    ];
    suburbTrees.forEach(([tx, tz, sc, tt]) => this.createTree(tx, tz, sc, tt));

    // Neighborhood Perimeter Boundary Wall
    this.createRealBoundaryWalls(0x475569, 'stone');

    this.addSpawnPoints();
  }

  // =========================================================================
  // LOCATION 2: DOWNTOWN METROPOLIS (Multi-Story Buildings & Storefronts)
  // =========================================================================
  private buildDowntownCityArena() {
    this.scene.background = new THREE.Color(0x93c5fd); // Urban daylight sky
    this.scene.fog = new THREE.FogExp2(0xbfdbfe, 0.005);

    const hemi = new THREE.HemisphereLight(0x60a5fa, 0xf1f5f9, 0.85);
    this.arenaGroup.add(hemi);

    const isLowCity = this.graphicsQuality === 'low' || this.graphicsQuality === 'normal';
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(-32, 58, 25);
    sun.castShadow = !isLowCity;
    if (!isLowCity) {
      const mapSize = this.graphicsQuality === 'ultra' ? 2048 : 1024;
      sun.shadow.mapSize.width = mapSize;
      sun.shadow.mapSize.height = mapSize;
      const d = 48;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.00008;
      sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 1.5;
    }
    this.arenaGroup.add(sun);

    // Urban Concrete Plaza & Sidewalk Ground
    const sidewalkTex = TextureGenerator.createSidewalkTexture();
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.6,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.arenaGroup.add(ground);

    // Wide 4-Lane City Avenue & Intersecting Street with Vector-Sharp Markings (Zero Z-Fighting)
    this.createStreetSystem(14, 42.0);
    this.createSidewalkBorder(14, 42.0);

    // REAL ENTERABLE DOWNTOWN BUILDINGS WITH SKYSCRAPER TOWERS & INTERACTIVE DOORS
    // Building 1 (NW): Metro Lounge & Cafe
    this.createEnterableBuilding({
      id: 'city-nw',
      name: 'Metro Lounge',
      x: -25,
      z: -25,
      width: 15,
      depth: 14,
      height: 4.4,
      towerHeight: 24,
      wallType: 'concrete',
      wallColor: '#1e293b',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'glass',
      signText: 'METRO LOUNGE',
      rotY: 0
    });

    // Building 2 (NE): Apex Armory & Tactical Depot
    this.createEnterableBuilding({
      id: 'city-ne',
      name: 'Apex Armory',
      x: 25,
      z: -25,
      width: 15,
      depth: 14,
      height: 4.4,
      towerHeight: 28,
      wallType: 'concrete',
      wallColor: '#334155',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'steel',
      signText: 'APEX ARMORY',
      rotY: 0
    });

    // Building 3 (SW): First Metro Bank & Vault
    this.createEnterableBuilding({
      id: 'city-sw',
      name: 'Metro Bank',
      x: -25,
      z: 25,
      width: 15,
      depth: 14,
      height: 4.4,
      towerHeight: 22,
      wallType: 'concrete',
      wallColor: '#0f172a',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'steel',
      signText: 'METRO BANK',
      rotY: Math.PI
    });

    // Building 4 (SE): Cyber Clinic & Trauma Center
    this.createEnterableBuilding({
      id: 'city-se',
      name: 'Cyber Clinic',
      x: 25,
      z: 25,
      width: 15,
      depth: 14,
      height: 4.4,
      towerHeight: 26,
      wallType: 'concrete',
      wallColor: '#0284c7',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'glass',
      signText: 'CYBER CLINIC',
      rotY: Math.PI
    });

    // EXPANDED 130M OUTER SECTOR URBAN STRUCTURES
    // Far North Avenue: Police Substation Precinct
    this.createEnterableBuilding({
      id: 'city-n',
      name: 'Police Precinct',
      x: 0,
      z: -48,
      width: 14,
      depth: 11,
      height: 4.4,
      towerHeight: 16,
      wallType: 'concrete',
      wallColor: '#1e293b',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'steel',
      signText: 'POLICE PRECINCT',
      rotY: 0
    });

    // Far South Avenue: Neon Diner & Rest Stop
    this.createEnterableBuilding({
      id: 'city-s',
      name: 'Neon Diner',
      x: 0,
      z: 48,
      width: 14,
      depth: 11,
      height: 4.4,
      towerHeight: 14,
      wallType: 'concrete',
      wallColor: '#0f172a',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'glass',
      signText: 'NEON DINER',
      rotY: Math.PI
    });

    // Far West Avenue: Cargo Logistics & Dispatch Hub
    this.createEnterableBuilding({
      id: 'city-w',
      name: 'Cargo Dispatch',
      x: -48,
      z: 0,
      width: 11,
      depth: 14,
      height: 4.4,
      towerHeight: 16,
      wallType: 'concrete',
      wallColor: '#334155',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'steel',
      signText: 'CARGO DISPATCH',
      rotY: -Math.PI / 2
    });

    // Far East Avenue: Financial Data Vault & Server Center
    this.createEnterableBuilding({
      id: 'city-e',
      name: 'Data Center',
      x: 48,
      z: 0,
      width: 11,
      depth: 14,
      height: 4.4,
      towerHeight: 18,
      wallType: 'concrete',
      wallColor: '#1e293b',
      roofType: 'cyber_tower',
      interiorFloorType: 'tile',
      doorTheme: 'steel',
      signText: 'DATA CENTER',
      rotY: Math.PI / 2
    });

    // Parked Vehicles on Avenue (Yellow Taxi, Police Cruiser, Black SUV, Red Coupe)
    this.createParkedCar(-16, -4.5, 0, 0xeab308); // Yellow Taxi
    this.createParkedCar(16, 4.5, Math.PI, 0x0f172a); // Police / Black Sedan
    this.createParkedCar(4.5, -16, Math.PI / 2, 0xdc2626); // Red Car
    this.createParkedCar(-4.5, 16, -Math.PI / 2, 0x475569); // Grey Van
    this.createParkedCar(-36, -4.5, 0, 0x1d4ed8); // Blue Cruiser
    this.createParkedCar(36, 4.5, Math.PI, 0xeab308); // Outer Taxi
    this.createParkedCar(4.5, 36, Math.PI / 2, 0xdc2626); // Red Sedan

    // Street Details: Traffic Lights, Streetlamps, Concrete Barriers
    this.createStreetlight(-9, -8);
    this.createStreetlight(9, 8);
    this.createStreetlight(-9, 8);
    this.createStreetlight(9, -8);
    this.createStreetlight(-32, -8);
    this.createStreetlight(32, 8);
    this.createStreetlight(-8, -32);
    this.createStreetlight(8, 32);

    this.createConcreteBarrier(-10, 0, 8, 0);
    this.createConcreteBarrier(10, 0, 8, 0);
    this.createConcreteBarrier(-30, 0, 8, 0);
    this.createConcreteBarrier(30, 0, 8, 0);

    this.createDumpster(-16, -11, 0);
    this.createDumpster(16, 11, Math.PI);
    this.createDumpster(-36, -11, 0);
    this.createDumpster(36, 11, Math.PI);

    this.addExplosiveBarrel(-12, 0, -6);
    this.addExplosiveBarrel(12, 0, 6);
    this.addExplosiveBarrel(-7, 0, 12);
    this.addExplosiveBarrel(7, 0, -12);
    this.addExplosiveBarrel(-32, 0, -6);
    this.addExplosiveBarrel(32, 0, 6);
    this.addExplosiveBarrel(-6, 0, 32);
    this.addExplosiveBarrel(6, 0, -32);

    // OUTDOOR ELEVATED PLATFORMS ("UPSTAIRS" & "UPFLOOR" URBAN SKYWALK GANTRIES)
    // North Skywalk Gantry (adjacent to Metro Lounge: jump directly over railing to Metro Lounge roof terrace)
    this.createOutdoorElevatedPlatform({
      id: 'city-platform-north',
      name: 'North Skywalk Gantry',
      x: -13.0,
      z: -25,
      rotY: 0,
      width: 6.5,
      depth: 5.0,
      height: 4.4,
      stairRun: 4.5,
      theme: 'city'
    });

    // South Skywalk Gantry (adjacent to Cyber Clinic: jump directly over railing to Cyber Clinic roof terrace)
    this.createOutdoorElevatedPlatform({
      id: 'city-platform-south',
      name: 'South Skywalk Gantry',
      x: 13.0,
      z: 25,
      rotY: Math.PI,
      width: 6.5,
      depth: 5.0,
      height: 4.4,
      stairRun: 4.5,
      theme: 'city'
    });

    // =========================================================================
    // DOWNTOWN PARK TREES & ENTERABLE ECO-TREEHOUSE
    // =========================================================================
    // Central Plaza Park Treehouse (adjacent to Metro Lounge: jump directly from treehouse deck to Metro Lounge roof terrace)
    this.createEnterableTreehouse({
      id: 'city-treehouse-nw',
      name: 'Park Eco-Treehouse',
      x: -38.0,
      z: -25,
      rotY: 0,
      height: 4.4
    });

    const cityTrees: [number, number, number, 'oak' | 'pine'][] = [
      [-46, -28, 1.1, 'oak'],
      [-45, -45, 1.2, 'oak'],
      [-28, -45, 1.0, 'oak'],
      [42, -42, 1.1, 'pine'],
      [45, -28, 1.0, 'oak'],
      [-42, 42, 1.15, 'pine'],
      [-28, 45, 1.0, 'oak'],
      [45, 42, 1.1, 'oak'],
      [42, 28, 0.95, 'oak'],
      [-18, -18, 0.9, 'oak'],
      [18, -18, 0.9, 'oak'],
      [-18, 18, 0.9, 'oak'],
      [18, 18, 0.9, 'oak']
    ];
    cityTrees.forEach(([tx, tz, sc, tt]) => this.createTree(tx, tz, sc, tt));

    this.createRealBoundaryWalls(0x1e293b, 'concrete');

    this.addSpawnPoints();
  }

  // =========================================================================
  // LOCATION 3: DESERT OASIS SETTLEMENT (Adobe Houses & Rooftop Terraces)
  // =========================================================================
  private buildDesertArena() {
    this.scene.background = new THREE.Color(0xfef3c7);
    this.scene.fog = new THREE.FogExp2(0xfef3c7, 0.007);

    const hemi = new THREE.HemisphereLight(0xfef08a, 0xfde68a, 0.9);
    this.arenaGroup.add(hemi);

    const isLowDesert = this.graphicsQuality === 'low' || this.graphicsQuality === 'normal';
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.85);
    sun.position.set(42, 60, 22);
    sun.castShadow = !isLowDesert;
    if (!isLowDesert) {
      const mapSize = this.graphicsQuality === 'ultra' ? 2048 : 1024;
      sun.shadow.mapSize.width = mapSize;
      sun.shadow.mapSize.height = mapSize;
      const d = 48;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.00008;
      sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 1.5;
    }
    this.arenaGroup.add(sun);

    // Warm Desert Sandstone Ground
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xead3a8,
      roughness: 0.8,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.arenaGroup.add(ground);

    // REAL ENTERABLE DESERT DWELLINGS WITH INTERACTIVE DOORS
    // House 1 (NW): Desert Compound
    this.createEnterableBuilding({
      id: 'desert-nw',
      name: 'Desert Residence',
      x: -25,
      z: -25,
      width: 14,
      depth: 12,
      height: 4.0,
      wallType: 'adobe',
      wallColor: '#d97706',
      roofType: 'flat',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: 0
    });

    // House 2 (NE): Oasis Bazaar Dwelling
    this.createEnterableBuilding({
      id: 'desert-ne',
      name: 'Oasis Bazaar',
      x: 25,
      z: -25,
      width: 14,
      depth: 12,
      height: 4.0,
      wallType: 'adobe',
      wallColor: '#d97706',
      roofType: 'flat',
      interiorFloorType: 'tile',
      doorTheme: 'wood',
      signText: 'OASIS BAZAAR',
      rotY: 0
    });

    // House 3 (SW): Caravan Quarters
    this.createEnterableBuilding({
      id: 'desert-sw',
      name: 'Caravan Quarters',
      x: -25,
      z: 25,
      width: 14,
      depth: 12,
      height: 4.0,
      wallType: 'adobe',
      wallColor: '#d97706',
      roofType: 'flat',
      interiorFloorType: 'wood',
      doorTheme: 'wood',
      rotY: Math.PI
    });

    // House 4 (SE): Desert Tavern
    this.createEnterableBuilding({
      id: 'desert-se',
      name: 'Desert Tavern',
      x: 25,
      z: 25,
      width: 14,
      depth: 12,
      height: 4.0,
      wallType: 'adobe',
      wallColor: '#d97706',
      roofType: 'flat',
      interiorFloorType: 'tile',
      doorTheme: 'wood',
      signText: 'DESERT TAVERN',
      rotY: Math.PI
    });

    // EXPANDED 130M OUTER SECTOR FORTRESSES & BUNKERS
    // Far North: Watchtower Outpost
    this.createEnterableBuilding({
      id: 'desert-n',
      name: 'North Watchtower',
      x: 0,
      z: -48,
      width: 12,
      depth: 10,
      height: 4.4,
      wallType: 'adobe',
      wallColor: '#b45309',
      roofType: 'flat',
      doorTheme: 'bunker',
      signText: 'WATCHTOWER',
      rotY: 0
    });

    // Far South: Desert Fortress Barracks
    this.createEnterableBuilding({
      id: 'desert-s',
      name: 'South Barracks',
      x: 0,
      z: 48,
      width: 12,
      depth: 10,
      height: 4.4,
      wallType: 'adobe',
      wallColor: '#b45309',
      roofType: 'flat',
      doorTheme: 'bunker',
      signText: 'BARRACKS',
      rotY: Math.PI
    });

    // Far West: Munitions Depot Bunker
    this.createEnterableBuilding({
      id: 'desert-w',
      name: 'Munitions Depot',
      x: -48,
      z: 0,
      width: 10,
      depth: 12,
      height: 4.2,
      wallType: 'adobe',
      wallColor: '#b45309',
      roofType: 'flat',
      doorTheme: 'bunker',
      signText: 'MUNITIONS DEPOT',
      rotY: -Math.PI / 2
    });

    // Far East: Oasis Water Pump Station
    this.createEnterableBuilding({
      id: 'desert-e',
      name: 'Water Pump Station',
      x: 48,
      z: 0,
      width: 10,
      depth: 12,
      height: 4.2,
      wallType: 'adobe',
      wallColor: '#b45309',
      roofType: 'flat',
      doorTheme: 'wood',
      signText: 'PUMP STATION',
      rotY: Math.PI / 2
    });

    // Central Stone Water Cistern & Fountain Well
    this.createDesertWell(0, 0);

    // Low Stone & Clay Courtyard Walls (waist-high cover)
    this.createGardenFence(-11, -10, 12, 0, 0xb45309);
    this.createGardenFence(11, -10, 12, 0, 0xb45309);
    this.createGardenFence(-11, 10, 12, 0, 0xb45309);
    this.createGardenFence(11, 10, 12, 0, 0xb45309);
    this.createGardenFence(-32, -10, 12, 0, 0xb45309);
    this.createGardenFence(32, -10, 12, 0, 0xb45309);
    this.createGardenFence(-32, 10, 12, 0, 0xb45309);
    this.createGardenFence(32, 10, 12, 0, 0xb45309);

    // Market Wooden Crates & Canvas Stalls
    this.createWoodenCrateStack(-6, -6, 2);
    this.createWoodenCrateStack(6, 6, 2);
    this.createWoodenCrateStack(-7, 7, 3);
    this.createWoodenCrateStack(7, -7, 3);
    this.createWoodenCrateStack(-30, 0, 2);
    this.createWoodenCrateStack(30, 0, 2);

    // Explosive Oil Barrels
    this.addExplosiveBarrel(-11, 0, -9);
    this.addExplosiveBarrel(11, 0, 9);
    this.addExplosiveBarrel(-6, 0, 6);
    this.addExplosiveBarrel(6, 0, -6);
    this.addExplosiveBarrel(-34, 0, -9);
    this.addExplosiveBarrel(34, 0, 9);
    this.addExplosiveBarrel(9, 0, -34);

    // OUTDOOR ELEVATED PLATFORMS ("UPSTAIRS" & "UPFLOOR" DESERT OBSERVATION OUTPOSTS)
    // North Desert Outpost (adjacent to Desert Residence: jump directly over railing to Desert Residence roof)
    this.createOutdoorElevatedPlatform({
      id: 'desert-platform-north',
      name: 'North Desert Outpost',
      x: -13.5,
      z: -25,
      rotY: 0,
      width: 6.5,
      depth: 5.0,
      height: 4.0,
      stairRun: 4.5,
      theme: 'desert'
    });

    // South Desert Outpost (adjacent to Desert Tavern: jump directly over railing to Desert Tavern roof)
    this.createOutdoorElevatedPlatform({
      id: 'desert-platform-south',
      name: 'South Desert Outpost',
      x: 13.5,
      z: 25,
      rotY: Math.PI,
      width: 6.5,
      depth: 5.0,
      height: 4.0,
      stairRun: 4.5,
      theme: 'desert'
    });

    // =========================================================================
    // DESERT OASIS DATE PALMS & ENTERABLE OASIS TREEHOUSE
    // =========================================================================
    // Desert Canyon Oasis Treehouse (adjacent to Caravan Quarters: jump directly from treehouse deck to Caravan Quarters roof)
    this.createEnterableTreehouse({
      id: 'desert-treehouse-sw',
      name: 'Oasis Treehouse Lookout',
      x: -37.5,
      z: 25,
      rotY: 0,
      height: 4.0
    });

    const desertTrees: [number, number, number, 'palm'][] = [
      [-45, 45, 1.2, 'palm'],
      [-45, 26, 1.1, 'palm'],
      [-28, 46, 1.05, 'palm'],
      [45, -45, 1.2, 'palm'],
      [46, -28, 1.1, 'palm'],
      [28, -46, 1.0, 'palm'],
      [-46, -44, 1.15, 'palm'],
      [45, 45, 1.2, 'palm'],
      [-16, -16, 0.95, 'palm'],
      [16, 16, 0.95, 'palm'],
      [-16, 16, 0.95, 'palm'],
      [16, -16, 0.95, 'palm']
    ];
    desertTrees.forEach(([tx, tz, sc, tt]) => this.createTree(tx, tz, sc, tt));

    this.createRealBoundaryWalls(0xd97706, 'adobe');

    this.addSpawnPoints();
  }

  // =========================================================================
  // LOCATION 4: FREIGHT DEPOT & INDUSTRIAL WAREHOUSES
  // =========================================================================
  private buildIndustrialWarehouseArena() {
    this.scene.background = new THREE.Color(0xe2e8f0);
    this.scene.fog = new THREE.FogExp2(0xe2e8f0, 0.006);

    const hemi = new THREE.HemisphereLight(0x94a3b8, 0xffffff, 0.85);
    this.arenaGroup.add(hemi);

    const isLowIndustrial = this.graphicsQuality === 'low' || this.graphicsQuality === 'normal';
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(-30, 55, 30);
    sun.castShadow = !isLowIndustrial;
    if (!isLowIndustrial) {
      const mapSize = this.graphicsQuality === 'ultra' ? 2048 : 1024;
      sun.shadow.mapSize.width = mapSize;
      sun.shadow.mapSize.height = mapSize;
      const d = 48;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.00008;
      sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 1.5;
    }
    this.arenaGroup.add(sun);

    // Paved Concrete Industrial Depot Floor
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.65,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    // REAL ENTERABLE INDUSTRIAL DEPOTS & WAREHOUSES WITH INTERACTIVE DOORS
    // Warehouse 1 (NW): Freight Logistics Depot Alpha
    this.createEnterableBuilding({
      id: 'ind-nw',
      name: 'Depot Alpha',
      x: -25,
      z: -25,
      width: 16,
      depth: 14,
      height: 4.8,
      wallType: 'metal',
      wallColor: '#475569',
      roofType: 'flat',
      interiorFloorType: 'concrete',
      doorTheme: 'steel',
      signText: 'DEPOT ALPHA',
      rotY: 0
    });

    // Warehouse 2 (NE): Tooling & Maintenance Workshop Bravo
    this.createEnterableBuilding({
      id: 'ind-ne',
      name: 'Workshop Bravo',
      x: 25,
      z: -25,
      width: 16,
      depth: 14,
      height: 4.8,
      wallType: 'metal',
      wallColor: '#334155',
      roofType: 'flat',
      interiorFloorType: 'concrete',
      doorTheme: 'steel',
      signText: 'WORKSHOP BRAVO',
      rotY: 0
    });

    // Warehouse 3 (SW): Hazardous Storage Charlie
    this.createEnterableBuilding({
      id: 'ind-sw',
      name: 'HazMat Charlie',
      x: -25,
      z: 25,
      width: 16,
      depth: 14,
      height: 4.8,
      wallType: 'metal',
      wallColor: '#1e293b',
      roofType: 'flat',
      interiorFloorType: 'concrete',
      doorTheme: 'bunker',
      signText: 'HAZMAT CHARLIE',
      rotY: Math.PI
    });

    // Warehouse 4 (SE): Distribution Center Delta
    this.createEnterableBuilding({
      id: 'ind-se',
      name: 'Distribution Delta',
      x: 25,
      z: 25,
      width: 16,
      depth: 14,
      height: 4.8,
      wallType: 'metal',
      wallColor: '#475569',
      roofType: 'flat',
      interiorFloorType: 'concrete',
      doorTheme: 'steel',
      signText: 'DISTRIBUTION',
      rotY: Math.PI
    });

    // EXPANDED 130M OUTER INDUSTRIAL FACILITIES
    // Far North Gate: Security Guardhouse
    this.createEnterableBuilding({
      id: 'ind-n',
      name: 'Security Guardhouse',
      x: 0,
      z: -48,
      width: 12,
      depth: 10,
      height: 4.2,
      wallType: 'concrete',
      wallColor: '#334155',
      roofType: 'flat',
      interiorFloorType: 'concrete',
      doorTheme: 'steel',
      signText: 'SECURITY GATE',
      rotY: 0
    });

    // Far South Yard: Main Power Generator Vault
    this.createEnterableBuilding({
      id: 'ind-s',
      name: 'Main Power Vault',
      x: 0,
      z: 48,
      width: 14,
      depth: 11,
      height: 4.6,
      wallType: 'concrete',
      wallColor: '#1e293b',
      roofType: 'flat',
      interiorFloorType: 'concrete',
      doorTheme: 'bunker',
      signText: 'MAIN POWER',
      rotY: Math.PI
    });

    // Far West Railhead: Freight Control Station
    this.createEnterableBuilding({
      id: 'ind-w',
      name: 'Freight Control',
      x: -48,
      z: 0,
      width: 10,
      depth: 13,
      height: 4.4,
      wallType: 'metal',
      wallColor: '#475569',
      roofType: 'flat',
      interiorFloorType: 'concrete',
      doorTheme: 'steel',
      signText: 'RAIL CONTROL',
      rotY: -Math.PI / 2
    });

    // Far East Yard: Research & Bio-Lab Station
    this.createEnterableBuilding({
      id: 'ind-e',
      name: 'Research Bio-Lab',
      x: 48,
      z: 0,
      width: 11,
      depth: 13,
      height: 4.4,
      wallType: 'concrete',
      wallColor: '#0284c7',
      roofType: 'flat',
      interiorFloorType: 'tile',
      doorTheme: 'glass',
      signText: 'BIO-LAB RESEARCH',
      rotY: Math.PI / 2
    });

    // Real Intermodal Shipping Containers Stacked in Yard (Red, Blue, Green, Yellow)
    this.createShippingContainer(-8, 0, -10, 0x1d4ed8, 0); // Blue container
    this.createShippingContainer(-8, 2.6, -10, 0xdc2626, 0); // Red container stacked on top
    this.createShippingContainer(8, 0, 10, 0x15803d, 0); // Green container
    this.createShippingContainer(8, 2.6, 10, 0xeab308, 0); // Yellow container
    this.createShippingContainer(12, 0, -12, 0xdc2626, Math.PI / 2);
    this.createShippingContainer(-12, 0, 12, 0x1d4ed8, Math.PI / 2);
    this.createShippingContainer(-34, 0, -10, 0xdc2626, 0);
    this.createShippingContainer(34, 0, 10, 0x1d4ed8, 0);

    // Industrial Storage Silo Tanks
    this.createStorageSilo(0, -18, 3.2, 9);
    this.createStorageSilo(0, 18, 3.2, 9);
    this.createStorageSilo(-18, -36, 3.2, 9);
    this.createStorageSilo(18, 36, 3.2, 9);

    // Wooden Pallets and Crates
    this.createWoodenCrateStack(-4, 0, 2);
    this.createWoodenCrateStack(4, 0, 2);
    this.createWoodenCrateStack(-30, 0, 2);
    this.createWoodenCrateStack(30, 0, 2);

    // Hazard Explosive Barrels
    this.addExplosiveBarrel(-10, 0, -4);
    this.addExplosiveBarrel(10, 0, 4);
    this.addExplosiveBarrel(-5, 0, 8);
    this.addExplosiveBarrel(5, 0, -8);
    this.addExplosiveBarrel(-32, 0, -4);
    this.addExplosiveBarrel(32, 0, 4);
    this.addExplosiveBarrel(4, 0, -32);

    // OUTDOOR ELEVATED PLATFORMS ("UPSTAIRS" & "UPFLOOR" INDUSTRIAL CATWALK GANTRIES)
    // North Yard Catwalk Gantry (adjacent to Depot Alpha: jump directly over railing to Depot Alpha roof)
    this.createOutdoorElevatedPlatform({
      id: 'ind-platform-north',
      name: 'North Catwalk Gantry',
      x: -12.3,
      z: -25,
      rotY: 0,
      width: 7.0,
      depth: 5.0,
      height: 4.8,
      stairRun: 4.5,
      theme: 'industrial'
    });

    // South Yard Catwalk Gantry (adjacent to Distribution Delta: jump directly over railing to Distribution Delta roof)
    this.createOutdoorElevatedPlatform({
      id: 'ind-platform-south',
      name: 'South Catwalk Gantry',
      x: 12.3,
      z: 25,
      rotY: Math.PI,
      width: 7.0,
      depth: 5.0,
      height: 4.8,
      stairRun: 4.5,
      theme: 'industrial'
    });

    // =========================================================================
    // INDUSTRIAL ARBORETUM & OVERLOOK TREEHOUSE
    // =========================================================================
    // Arboretum Treehouse Lookout (adjacent to Workshop Bravo: jump directly from treehouse deck to Workshop Bravo roof)
    this.createEnterableTreehouse({
      id: 'ind-treehouse-ne',
      name: 'Arboretum Treehouse Lookout',
      x: 38.5,
      z: -25,
      rotY: 0,
      height: 4.8
    });

    const indTrees: [number, number, number, 'pine' | 'oak'][] = [
      [45, -45, 1.25, 'pine'],
      [45, -28, 1.1, 'pine'],
      [28, -46, 1.15, 'pine'],
      [-44, 44, 1.2, 'oak'],
      [-45, 28, 1.05, 'oak'],
      [-28, 45, 1.1, 'pine'],
      [-45, -45, 1.2, 'pine'],
      [-42, -26, 1.0, 'pine'],
      [44, 44, 1.15, 'pine'],
      [42, 26, 1.0, 'oak'],
      [-20, 0, 0.95, 'pine'],
      [20, 0, 0.95, 'oak']
    ];
    indTrees.forEach(([tx, tz, sc, tt]) => this.createTree(tx, tz, sc, tt));

    this.createRealBoundaryWalls(0x334155, 'fence');

    this.addSpawnPoints();
  }

  // =========================================================================
  // REAL ARCHITECTURAL BUILDERS: HOUSES, BUILDINGS & STREET COVER
  // =========================================================================

  /**
   * Builds a tactical outdoor elevated observation platform & sniper gantry:
   * 1. 4 heavy-duty industrial support pillars with ground footings, structural I-beams, and diagonal X-bracing.
   * 2. An elevated small upfloor platform deck (y = 3.4m) with diamond-plate steel / non-slip decking.
   * 3. An outdoor steel staircase ("upstairs") with 16 anti-slip treads, safety nosing, dual stringers,
   *    and continuous safety handrails.
   * 4. A smooth physical StairRamp collider allowing 100% fluid, zero-jitter ascent and descent.
   * 5. Perimeter ballistic safety guardrails providing waist-high tactical cover with open sniper sightlines.
   * 6. Upfloor tactical perks: fortified sandbag sniper nest, high-intensity swiveling floodlight,
   *    destructible military ammo crate and tech safe, and a tactical comms antenna mast.
   * 7. Open ground-level clearance underneath allowing players to run, take cover behind pillars, or flank.
   */
  public createOutdoorElevatedPlatform(options: {
    id: string;
    name?: string;
    x: number;
    z: number;
    rotY?: number;
    width?: number; // default 7.0
    depth?: number; // default 5.0
    height?: number; // default 3.4
    theme?: 'suburban' | 'city' | 'desert' | 'industrial';
    stairRun?: number; // default 4.5
  }): THREE.Group {
    const group = new THREE.Group();
    group.position.set(options.x, 0, options.z);
    const rotY = options.rotY || 0;
    if (rotY) group.rotation.y = rotY;
    this.arenaGroup.add(group);

    const w = options.width || 7.0;
    const d = options.depth || 5.0;
    const h = options.height || 3.4;
    const slabThick = 0.20;
    const stairW = 2.0;
    const theme = options.theme || 'suburban';

    // Theme color palettes
    let deckColor = 0x334155;
    let steelColor = 0x1e293b;
    let accentColor = 0xeab308;
    let glassColor = 0x38bdf8;

    if (theme === 'suburban') {
      deckColor = 0x475569;
      steelColor = 0x1e293b;
      accentColor = 0xd97706;
      glassColor = 0x93c5fd;
    } else if (theme === 'city') {
      deckColor = 0x1e293b;
      steelColor = 0x0f172a;
      accentColor = 0x0284c7;
      glassColor = 0x38bdf8;
    } else if (theme === 'desert') {
      deckColor = 0xb45309;
      steelColor = 0x78350f;
      accentColor = 0xf59e0b;
      glassColor = 0xfde68a;
    } else if (theme === 'industrial') {
      deckColor = 0x3f3f46;
      steelColor = 0x18181b;
      accentColor = 0xfacc15;
      glassColor = 0xa1a1aa;
    }

    const steelMat = new THREE.MeshStandardMaterial({
      color: steelColor,
      roughness: 0.5,
      metalness: 0.8,
      side: THREE.DoubleSide
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
      metalness: 0.7,
      side: THREE.DoubleSide
    });

    // 1. ELEVATED DECK SLAB (THE "UPFLOOR")
    const deckGeo = new THREE.BoxGeometry(w, slabThick, d);
    const deckTex = TextureGenerator.createPanelTexture();
    const deckMat = new THREE.MeshStandardMaterial({
      map: deckTex,
      color: deckColor,
      roughness: 0.5,
      metalness: 0.4
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(0, h - slabThick / 2, 0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    group.add(deckMesh);

    // Hazard warning nosing trim along deck edges (perimeter only, strictly clear of stair opening)
    const trimThick = 0.04;
    const trimH = 0.06;

    // Rear deck edge fascia trim
    const trimBackGeo = new THREE.BoxGeometry(w, trimH, trimThick);
    const trimBack = new THREE.Mesh(trimBackGeo, accentMat);
    trimBack.position.set(0, h - trimH / 2, -d / 2 - trimThick / 2);
    group.add(trimBack);

    // Front deck edge fascia trim (ONLY along guardrail section, stopping cleanly before stair opening)
    const frontRailSpan = w - stairW - 0.15;
    if (frontRailSpan > 0.4) {
      const trimFrontGeo = new THREE.BoxGeometry(frontRailSpan, trimH, trimThick);
      const trimFront = new THREE.Mesh(trimFrontGeo, accentMat);
      trimFront.position.set(-w / 2 + frontRailSpan / 2, h - trimH / 2, d / 2 + trimThick / 2);
      group.add(trimFront);
    }

    // Structural perimeter I-beams
    const beamGeoX = new THREE.BoxGeometry(w, 0.22, 0.12);
    const beamFront = new THREE.Mesh(beamGeoX, steelMat);
    beamFront.position.set(0, h - slabThick - 0.11, d / 2 - 0.06);
    group.add(beamFront);

    const beamBack = new THREE.Mesh(beamGeoX, steelMat);
    beamBack.position.set(0, h - slabThick - 0.11, -d / 2 + 0.06);
    group.add(beamBack);

    const beamGeoZ = new THREE.BoxGeometry(0.12, 0.22, d - 0.24);
    const beamLeft = new THREE.Mesh(beamGeoZ, steelMat);
    beamLeft.position.set(-w / 2 + 0.06, h - slabThick - 0.11, 0);
    group.add(beamLeft);

    const beamRight = new THREE.Mesh(beamGeoZ, steelMat);
    beamRight.position.set(w / 2 - 0.06, h - slabThick - 0.11, 0);
    group.add(beamRight);

    // 2. SUPPORT PILLARS (WITH OPEN 3.2M GROUND CLEARANCE UNDERNEATH)
    const pillarPositions = [
      [-w / 2 + 0.35, -d / 2 + 0.35],
      [w / 2 - 0.35, -d / 2 + 0.35],
      [-w / 2 + 0.35, d / 2 - 0.35],
      [w / 2 - stairW - 0.35, d / 2 - 0.35]
    ];
    const pillarH = h - slabThick;
    const pillarGeo = new THREE.BoxGeometry(0.30, pillarH, 0.30);
    const basePlateGeo = new THREE.BoxGeometry(0.50, 0.06, 0.50);

    pillarPositions.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, steelMat);
      pillar.position.set(px, pillarH / 2, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);

      const plate = new THREE.Mesh(basePlateGeo, steelMat);
      plate.position.set(px, 0.03, pz);
      plate.receiveShadow = true;
      group.add(plate);

      group.updateMatrixWorld(true);
      const pillarBox = new THREE.Box3().setFromObject(pillar);
      this.obstacles.push({ mesh: pillar, box: pillarBox, isCover: false });
    });

    // 3. OUTDOOR STAIRCASE ("UPSTAIRS")
    // Stair attaches to the front-right of the platform and descends towards +Z
    const stairRun = options.stairRun || 4.5;
    const stairStartX = w / 2 - stairW / 2;
    const zTop = d / 2;
    const zBottom = zTop + stairRun;

    const stairGroup = new THREE.Group();
    // Authentic architectural stair design: an N-riser flight has (N - 1) intermediate treads,
    // with the upper deck floor slab acting as the final landing and top riser.
    const numRisers = 15;
    const numTreads = numRisers - 1; // 14 intermediate steps
    const stepRise = h / numRisers;
    const stepRun = stairRun / numRisers;

    // Steps
    const treadMat = new THREE.MeshStandardMaterial({
      color: steelColor,
      roughness: 0.5,
      metalness: 0.8
    });

    for (let i = 0; i < numTreads; i++) {
      const stepY = (i + 1) * stepRise;
      const stepZ = zBottom - (i + 0.5) * stepRun;

      const tGeo = new THREE.BoxGeometry(stairW - 0.04, 0.06, stepRun + 0.02);
      const tMesh = new THREE.Mesh(tGeo, treadMat);
      tMesh.position.set(stairStartX, stepY - 0.03, stepZ);
      tMesh.castShadow = true;
      tMesh.receiveShadow = true;
      stairGroup.add(tMesh);

      // Hazard nosing
      const nGeo = new THREE.BoxGeometry(stairW - 0.03, 0.02, 0.04);
      const nMesh = new THREE.Mesh(nGeo, accentMat);
      nMesh.position.set(stairStartX, stepY - 0.01, stepZ + (stepRun + 0.02) / 2);
      stairGroup.add(nMesh);
    }

    // Top riser vertical backplate (seamlessly closes the riser gap below the platform lip)
    const topRiserGeo = new THREE.BoxGeometry(stairW - 0.04, stepRise, 0.03);
    const topRiser = new THREE.Mesh(topRiserGeo, steelMat);
    topRiser.position.set(stairStartX, h - stepRise / 2, d / 2 + 0.015);
    topRiser.castShadow = true;
    topRiser.receiveShadow = true;
    stairGroup.add(topRiser);

    // Architectural anti-slip landing threshold sill plate (crisp elevation, zero z-fighting)
    const sillThick = 0.014;
    const sillDepth = 0.14;
    const sillGeo = new THREE.BoxGeometry(stairW - 0.04, sillThick, sillDepth);
    const sillMesh = new THREE.Mesh(sillGeo, steelMat);
    sillMesh.position.set(stairStartX, h + sillThick / 2, d / 2 - 0.02);
    sillMesh.castShadow = true;
    sillMesh.receiveShadow = true;
    stairGroup.add(sillMesh);

    // High-visibility safety warning nosing strip on the threshold sill edge
    const nosingLipGeo = new THREE.BoxGeometry(stairW - 0.03, sillThick + 0.01, 0.04);
    const nosingLipMesh = new THREE.Mesh(nosingLipGeo, accentMat);
    nosingLipMesh.position.set(stairStartX, h + sillThick / 2, d / 2 + sillDepth / 2 - 0.04);
    nosingLipMesh.castShadow = true;
    stairGroup.add(nosingLipMesh);

    // Heavy channel stringers
    const stairHypot = Math.hypot(stairRun, h);
    const stairAngle = Math.atan2(h, stairRun);
    const stringerGeo = new THREE.BoxGeometry(0.10, 0.24, stairHypot);

    const leftStringer = new THREE.Mesh(stringerGeo, steelMat);
    leftStringer.rotation.x = stairAngle;
    leftStringer.position.set(stairStartX - stairW / 2 + 0.04, h / 2, (zBottom + zTop) / 2);
    stairGroup.add(leftStringer);

    const rightStringer = new THREE.Mesh(stringerGeo, steelMat);
    rightStringer.rotation.x = stairAngle;
    rightStringer.position.set(stairStartX + stairW / 2 - 0.04, h / 2, (zBottom + zTop) / 2);
    stairGroup.add(rightStringer);

    // Continuous handrails on stairs
    const handrailGeo = new THREE.BoxGeometry(0.06, 0.06, stairHypot);
    const handrailL = new THREE.Mesh(handrailGeo, steelMat);
    handrailL.rotation.x = stairAngle;
    handrailL.position.set(stairStartX - stairW / 2 + 0.04, h / 2 + 1.0, (zBottom + zTop) / 2);
    stairGroup.add(handrailL);

    const handrailR = new THREE.Mesh(handrailGeo, steelMat);
    handrailR.rotation.x = stairAngle;
    handrailR.position.set(stairStartX + stairW / 2 - 0.04, h / 2 + 1.0, (zBottom + zTop) / 2);
    stairGroup.add(handrailR);

    // Handrail stanchions (only 4 stanchions total for pristine performance)
    const stanchionGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8);
    [0.15, 0.5, 0.85].forEach((ratio) => {
      const stY = ratio * h + 0.5;
      const stZ = zBottom - ratio * stairRun;

      const stL = new THREE.Mesh(stanchionGeo, steelMat);
      stL.position.set(stairStartX - stairW / 2 + 0.04, stY, stZ);
      stairGroup.add(stL);

      const stR = new THREE.Mesh(stanchionGeo, steelMat);
      stR.position.set(stairStartX + stairW / 2 - 0.04, stY, stZ);
      stairGroup.add(stR);
    });

    group.add(stairGroup);

    // 4. PERIMETER BALLISTIC SAFETY WALLS (WITH 100% UNBLOCKABLE STAIRWAY ENTRANCE)
    // Fortified architectural perimeter walls: stops player from clipping or passing through while walking, allows vaulting/jumping outside.
    const railH = 1.15;
    const postGeo = new THREE.BoxGeometry(0.12, railH, 0.12);
    const railMeshGroup = new THREE.Group();
    group.add(railMeshGroup); // Attached immediately to group hierarchy so all matrix transforms are preserved!

    const glassMat = new THREE.MeshStandardMaterial({
      color: glassColor,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.85,
      side: THREE.DoubleSide
    });

    const createSingleRailing = (
      length: number,
      posX: number,
      posZ: number,
      rotAngle: number = 0
    ) => {
      const seg = new THREE.Group();
      seg.position.set(posX, h, posZ);
      if (rotAngle) seg.rotation.y = rotAngle;

      // Heavy industrial kickplate & base curb (height 0.28m, thickness 0.10m)
      const kickH = 0.28;
      const kickThick = 0.10;
      const kickGeo = new THREE.BoxGeometry(length, kickH, kickThick);
      const kick = new THREE.Mesh(kickGeo, steelMat);
      kick.position.y = kickH / 2;
      kick.castShadow = true;
      kick.receiveShadow = true;
      seg.add(kick);

      // Warning hazard nosing trim above base curb
      const kickTrimGeo = new THREE.BoxGeometry(length, 0.03, kickThick + 0.02);
      const kickTrim = new THREE.Mesh(kickTrimGeo, accentMat);
      kickTrim.position.y = kickH + 0.015;
      seg.add(kickTrim);

      // High-strength ballistic glass panel (double-sided, clear tactical sightlines)
      const glassH = railH - kickH - 0.12;
      const glassThick = 0.04;
      const glassGeo = new THREE.BoxGeometry(length - 0.08, glassH, glassThick);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.y = kickH + 0.03 + glassH / 2;
      seg.add(glass);

      // Mid-height structural reinforcement crossbar
      const midBarGeo = new THREE.BoxGeometry(length, 0.05, 0.08);
      const midBar = new THREE.Mesh(midBarGeo, steelMat);
      midBar.position.y = kickH + glassH * 0.5;
      seg.add(midBar);

      // Heavy structural top coping rail with safety chamfer
      const topBarGeo = new THREE.BoxGeometry(length, 0.08, 0.12);
      const topBar = new THREE.Mesh(topBarGeo, steelMat);
      topBar.position.y = railH - 0.04;
      topBar.castShadow = true;
      seg.add(topBar);

      // Hazard safety strip on top rail surface
      const topAccentGeo = new THREE.BoxGeometry(length, 0.02, 0.06);
      const topAccent = new THREE.Mesh(topAccentGeo, accentMat);
      topAccent.position.y = railH + 0.01;
      seg.add(topAccent);

      // Vertical structural support posts (at ends and intermediate stanchions every ~1.6m)
      const numSegments = Math.max(1, Math.round(length / 1.6));
      for (let s = 0; s <= numSegments; s++) {
        const px = -length / 2 + (s / numSegments) * length;
        const post = new THREE.Mesh(postGeo, steelMat);
        post.position.set(px, railH / 2, 0);
        post.castShadow = true;
        post.receiveShadow = true;
        seg.add(post);
      }

      // Solid physical barrier collider mesh:
      // Depth = 0.28m (prevents tunneling through the wall while walking/running)
      // Height = railH (allows clean vaulting/jumping outside when player presses jump)
      const barrierGeo = new THREE.BoxGeometry(length, railH, 0.28);
      const barrierMat = new THREE.MeshBasicMaterial({ visible: false });
      const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
      barrierMesh.position.set(0, railH / 2, 0);
      seg.add(barrierMesh);

      railMeshGroup.add(seg);

      // Compute precise world-space AABB obstacle with active arena transforms
      this.arenaGroup.updateMatrixWorld(true);
      const segBox = new THREE.Box3().setFromObject(seg);
      this.obstacles.push({
        mesh: seg,
        box: segBox,
        isCover: false,
        isGlass: true
      });
    };

    // A. Back Wall (full width -Z)
    createSingleRailing(w, 0, -d / 2);

    // B. Left Wall (full depth -X)
    createSingleRailing(d, -w / 2, 0, Math.PI / 2);

    // C. Right Wall (stops cleanly before stair landing opening)
    createSingleRailing(d - 0.20, w / 2, -0.10, Math.PI / 2);

    // D. Front Wall (covers left section, leaving stair doorway open on right!)
    if (frontRailSpan > 0.4) {
      createSingleRailing(frontRailSpan, -w / 2 + frontRailSpan / 2, d / 2);
    }

    // Corner junction posts (heavy reinforced square columns at outer corners)
    const cornerPillarGeo = new THREE.BoxGeometry(0.18, railH + 0.08, 0.18);
    const cornerCapGeo = new THREE.BoxGeometry(0.22, 0.04, 0.22);
    const addCornerColumn = (cx: number, cz: number) => {
      const col = new THREE.Mesh(cornerPillarGeo, steelMat);
      col.position.set(cx, h + (railH + 0.08) / 2, cz);
      col.castShadow = true;
      col.receiveShadow = true;
      group.add(col);

      const cap = new THREE.Mesh(cornerCapGeo, accentMat);
      cap.position.set(cx, h + railH + 0.08 + 0.02, cz);
      group.add(cap);
    };

    addCornerColumn(-w / 2, -d / 2);
    addCornerColumn(w / 2, -d / 2);
    addCornerColumn(-w / 2, d / 2);
    addCornerColumn(w / 2 - stairW, d / 2); // Left entrance post of stairs
    addCornerColumn(w / 2, d / 2); // Right entrance post of stairs
    // NOTICE: Front-Right (+Z from w/2 - stairW to w/2) HAS ZERO OBSTACLES! Player walks straight in!

    // 5. UPFLOOR TACTICAL PERKS: SNIPER COVER, FLOODLIGHT, COMMS MAST
    // A. Fortified sandbag sniper cover in front-left corner
    const sandbagMat = new THREE.MeshStandardMaterial({
      color: theme === 'desert' ? 0xd97706 : 0x78716c,
      roughness: 0.85
    });
    const sandbagGeo = new THREE.BoxGeometry(0.80, 0.35, 0.35);
    const sbMesh = new THREE.Mesh(sandbagGeo, sandbagMat);
    sbMesh.position.set(-w / 2 + 0.6, h + 0.18, d / 2 - 0.35);
    sbMesh.castShadow = true;
    group.add(sbMesh);

    group.updateMatrixWorld(true);
    const sbBox = new THREE.Box3().setFromObject(sbMesh);
    this.obstacles.push({ mesh: sbMesh, box: sbBox, isCover: true });

    // B. High-intensity floodlight (optimized: emissive lens + soft lightweight PointLight)
    const lampHousingGeo = new THREE.CylinderGeometry(0.20, 0.15, 0.30, 10);
    lampHousingGeo.rotateX(Math.PI / 2);
    const lampHousing = new THREE.Mesh(lampHousingGeo, steelMat);
    lampHousing.position.set(-w / 2 + 0.2, h + railH + 0.4, d / 2 - 0.2);
    lampHousing.rotation.y = -Math.PI / 4;
    lampHousing.rotation.x = 0.3;
    group.add(lampHousing);

    const lampLensGeo = new THREE.CircleGeometry(0.18, 10);
    const lampLensMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const lampLens = new THREE.Mesh(lampLensGeo, lampLensMat);
    lampLens.position.set(0, 0, 0.16);
    lampHousing.add(lampLens);

    const floodPointLight = new THREE.PointLight(0xfffbeb, 1.2, 16);
    floodPointLight.position.set(-w / 2 + 0.2, h + railH + 0.4, d / 2 - 0.2);
    floodPointLight.castShadow = false;
    group.add(floodPointLight);

    // C. Comms antenna mast on rear corner
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.06, 3.8, 8);
    const mast = new THREE.Mesh(mastGeo, steelMat);
    mast.position.set(w / 2 - 0.2, h + 1.9, -d / 2 + 0.2);
    group.add(mast);

    const beaconGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(w / 2 - 0.2, h + 3.85, -d / 2 + 0.2);
    group.add(beacon);

    // 6. REGISTER DECK & STAIR PHYSICS
    group.updateMatrixWorld(true);

    const yAxis = new THREE.Vector3(0, 1, 0);
    const deckLocalCenter = new THREE.Vector3(0, h, 0);
    const deckWorldCenter = deckLocalCenter.clone().applyAxisAngle(yAxis, rotY).add(group.position);
    const deckBox = new THREE.Box3().setFromObject(deckMesh);

    // Walkable elevated deck slab
    this.obstacles.push({
      mesh: deckMesh,
      box: deckBox,
      isFloor: true,
      isCover: false,
      ceilingY: h - slabThick,
      floorPlane: {
        center: deckWorldCenter,
        halfW: w / 2,
        halfD: d / 2,
        rotY,
        topY: h
      }
    });

    // 100% butter-smooth mathematical stair ramp collider
    const p1Local = new THREE.Vector3(stairStartX, 0.0, zBottom);
    const p2Local = new THREE.Vector3(stairStartX, h, zTop);
    const p1World = p1Local.clone().applyAxisAngle(yAxis, rotY).add(group.position);
    const p2World = p2Local.clone().applyAxisAngle(yAxis, rotY).add(group.position);

    const stairRamp: StairRamp = {
      p1: p1World,
      p2: p2World,
      width: stairW + 0.3,
      bottomY: 0.0,
      topY: h
    };
    const stairBox = new THREE.Box3().setFromObject(stairGroup);

    this.obstacles.push({
      mesh: stairGroup,
      box: stairBox,
      isCover: false,
      stairRamp
    });

    // 7. EXCLUSIVE UPFLOOR TACTICAL SUPPLY CRATES
    const spawnPlatformProp = (
      type: DestructibleType,
      lx: number,
      ly: number,
      lz: number,
      lrot: number,
      loot: LootType,
      suffix: string
    ) => {
      const v = new THREE.Vector3(lx, ly, lz);
      v.applyAxisAngle(yAxis, rotY);
      v.add(group.position);
      const prop = new DestructibleProp(
        `${options.id}-prop-${suffix}`,
        type,
        v,
        rotY + lrot,
        loot,
        options.id
      );
      this.arenaGroup.add(prop.mesh);
      this.destructibles.push(prop);
      this.obstacles.push(prop.obstacle);
    };

    // Prop 1: Tactical Ammo Crate on the platform
    spawnPlatformProp('loot_crate', -w / 2 + 1.2, h, -d / 2 + 1.1, 0.2, 'ammo_pack', 'deck-ammo');

    // Prop 2: Armored Tech Safe on the platform
    spawnPlatformProp('tech_safe', 0.2, h, -d / 2 + 1.1, -0.3, 'armor_pack', 'deck-safe');

    // Prop 3: Ordnance Bomb Crate on the platform
    spawnPlatformProp('loot_crate', w / 2 - 1.2, h, -d / 2 + 1.1, -0.2, 'bomb_pack', 'deck-bomb');

    return group;
  }

  /**
   * Builds an authentic, fully hollow, enterable building with interior floor,
   * walkable room interior, perimeter Box3 wall obstacles, decorative interior lighting,
   * tactical interior cover (desks, crate stacks), transparent windows, and an interactive swinging door.
   */
  public createEnterableBuilding(options: {
    id: string;
    name: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    height?: number;
    rotY?: number;
    wallType: 'brick' | 'siding' | 'concrete' | 'adobe' | 'metal';
    wallColor: string;
    trimColor?: string;
    roofType: 'gable' | 'flat' | 'cyber_tower';
    roofColor?: string;
    towerHeight?: number;
    interiorFloorType?: 'wood' | 'tile' | 'concrete';
    signText?: string;
    doorTheme?: 'wood' | 'glass' | 'steel' | 'bunker';
  }): THREE.Group {
    const group = new THREE.Group();
    group.position.set(options.x, 0, options.z);
    if (options.rotY) group.rotation.y = options.rotY;
    this.arenaGroup.add(group);

    const w = options.width;
    const d = options.depth;
    const wallH = options.height || 4.2;
    const wallThick = 0.50;
    const doorW = 2.0;
    const doorH = 2.7;

    // 0. Sub-Foundation Slab (Isolates indoor floor from outdoor terrain, grass & sidewalks)
    const foundationGeo = new THREE.BoxGeometry(w + 0.4, 0.30, d + 0.4);
    const foundationMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1
    });
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.set(0, -0.09, 0);
    foundationMesh.receiveShadow = true;
    group.add(foundationMesh);

    // 1. Interior Floor (Solid elevated floor at y = 0.04 with top surface at y = 0.08)
    let floorTex: THREE.Texture;
    if (options.interiorFloorType === 'wood') {
      floorTex = TextureGenerator.createWoodParquetFloorTexture();
    } else if (options.interiorFloorType === 'tile') {
      floorTex = TextureGenerator.createFloorTileTexture('#e2e8f0', '#94a3b8');
    } else {
      floorTex = TextureGenerator.createSidewalkTexture();
    }
    const floorGeo = new THREE.BoxGeometry(w - 0.1, 0.08, d - 0.1);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0.04, 0);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 2. Wall Material
    let wallTex: THREE.Texture;
    if (options.wallType === 'brick') {
      wallTex = TextureGenerator.createBrickTexture(options.wallColor, '#cbd5e1');
    } else if (options.wallType === 'siding') {
      wallTex = TextureGenerator.createWoodSidingTexture(options.wallColor);
    } else if (options.wallType === 'adobe') {
      wallTex = TextureGenerator.createAdobeTexture();
    } else if (options.wallType === 'concrete') {
      wallTex = TextureGenerator.createBrickTexture(options.wallColor, '#64748b');
    } else {
      wallTex = TextureGenerator.createCorrugatedMetalTexture();
    }
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.65,
      metalness: options.wallType === 'metal' ? 0.45 : 0.1,
      side: THREE.DoubleSide
    });

    // 3. Perimeter Walls with Doorway Cutout on Front (+Z face)
    // Wall height extends 0.25m underground to guarantee zero light bleeding or floor seam tears
    const wallMeshes: THREE.Mesh[] = [];
    const wallTotalH = wallH + 0.25;
    const wallY = wallTotalH / 2 - 0.25;

    // Back Wall (-Z)
    const backGeo = new THREE.BoxGeometry(w, wallTotalH, wallThick);
    const backMesh = new THREE.Mesh(backGeo, wallMat);
    backMesh.position.set(0, wallY, -d / 2 + wallThick / 2);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    group.add(backMesh);
    wallMeshes.push(backMesh);

    // Left Wall (-X)
    const leftGeo = new THREE.BoxGeometry(wallThick, wallTotalH, d - wallThick * 2);
    const leftMesh = new THREE.Mesh(leftGeo, wallMat);
    leftMesh.position.set(-w / 2 + wallThick / 2, wallY, 0);
    leftMesh.castShadow = true;
    leftMesh.receiveShadow = true;
    group.add(leftMesh);
    wallMeshes.push(leftMesh);

    // Right Wall (+X)
    const rightGeo = new THREE.BoxGeometry(wallThick, wallTotalH, d - wallThick * 2);
    const rightMesh = new THREE.Mesh(rightGeo, wallMat);
    rightMesh.position.set(w / 2 - wallThick / 2, wallY, 0);
    rightMesh.castShadow = true;
    rightMesh.receiveShadow = true;
    group.add(rightMesh);
    wallMeshes.push(rightMesh);

    // Front Left Wall Panel (+Z, left of doorway)
    const panelW = (w - doorW) / 2;
    const frontLGeo = new THREE.BoxGeometry(panelW, wallTotalH, wallThick);
    const frontLMesh = new THREE.Mesh(frontLGeo, wallMat);
    frontLMesh.position.set(-w / 2 + panelW / 2, wallY, d / 2 - wallThick / 2);
    frontLMesh.castShadow = true;
    frontLMesh.receiveShadow = true;
    group.add(frontLMesh);
    wallMeshes.push(frontLMesh);

    // Front Right Wall Panel (+Z, right of doorway)
    const frontRGeo = new THREE.BoxGeometry(panelW, wallTotalH, wallThick);
    const frontRMesh = new THREE.Mesh(frontRGeo, wallMat);
    frontRMesh.position.set(w / 2 - panelW / 2, wallY, d / 2 - wallThick / 2);
    frontRMesh.castShadow = true;
    frontRMesh.receiveShadow = true;
    group.add(frontRMesh);
    wallMeshes.push(frontRMesh);

    // Front Lintel above doorway (+Z, spans doorway top)
    const lintelH = wallH - doorH;
    if (lintelH > 0.05) {
      const lintelGeo = new THREE.BoxGeometry(doorW, lintelH, wallThick);
      const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
      lintelMesh.position.set(0, doorH + lintelH / 2, d / 2 - wallThick / 2);
      lintelMesh.castShadow = true;
      lintelMesh.receiveShadow = true;
      group.add(lintelMesh);
      wallMeshes.push(lintelMesh);
    }

    // Register individual perimeter wall Box3 obstacles (leaving hollow center 100% walkable!)
    group.updateMatrixWorld(true);
    for (const mesh of wallMeshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, box, isCover: false });
    }

    // 4. Door Frame & Entrance Sill Plate
    const trimColor = options.trimColor ? new THREE.Color(options.trimColor) : 0x1e293b;
    const frameMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.5 });
    const postGeo = new THREE.BoxGeometry(0.12, doorH, wallThick + 0.08);

    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-doorW / 2, doorH / 2, d / 2 - wallThick / 2);
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(doorW / 2, doorH / 2, d / 2 - wallThick / 2);
    group.add(rightPost);

    const topPostGeo = new THREE.BoxGeometry(doorW + 0.24, 0.12, wallThick + 0.08);
    const topPost = new THREE.Mesh(topPostGeo, frameMat);
    topPost.position.set(0, doorH, d / 2 - wallThick / 2);
    group.add(topPost);

    // Doorway threshold plate
    const sillGeo = new THREE.BoxGeometry(doorW + 0.1, 0.05, wallThick + 0.08);
    const sillMesh = new THREE.Mesh(sillGeo, frameMat);
    sillMesh.position.set(0, 0.04, d / 2 - wallThick / 2);
    sillMesh.receiveShadow = true;
    group.add(sillMesh);

    // 5. Interior Perimeter Baseboards (Skirting Boards)
    // Eliminates all floor-to-wall intersection seams, shadow aliasing & z-fighting
    const baseboardH = 0.14;
    const baseboardThick = 0.04;
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      roughness: 0.45,
      metalness: 0.1
    });
    const baseboardY = 0.08 + baseboardH / 2;

    // Back wall baseboard
    const backBaseGeo = new THREE.BoxGeometry(w - wallThick * 2, baseboardH, baseboardThick);
    const backBaseMesh = new THREE.Mesh(backBaseGeo, baseboardMat);
    backBaseMesh.position.set(0, baseboardY, -d / 2 + wallThick + baseboardThick / 2);
    group.add(backBaseMesh);

    // Left wall baseboard
    const sideBaseGeo = new THREE.BoxGeometry(baseboardThick, baseboardH, d - wallThick * 2);
    const leftBaseMesh = new THREE.Mesh(sideBaseGeo, baseboardMat);
    leftBaseMesh.position.set(-w / 2 + wallThick + baseboardThick / 2, baseboardY, 0);
    group.add(leftBaseMesh);

    // Right wall baseboard
    const rightBaseMesh = new THREE.Mesh(sideBaseGeo, baseboardMat);
    rightBaseMesh.position.set(w / 2 - wallThick - baseboardThick / 2, baseboardY, 0);
    group.add(rightBaseMesh);

    // Front wall baseboards (left & right of door frame)
    const frontBaseW = panelW - wallThick;
    if (frontBaseW > 0.1) {
      const frontBaseGeo = new THREE.BoxGeometry(frontBaseW, baseboardH, baseboardThick);
      const frontLBaseMesh = new THREE.Mesh(frontBaseGeo, baseboardMat);
      frontLBaseMesh.position.set(-w / 2 + wallThick + frontBaseW / 2, baseboardY, d / 2 - wallThick - baseboardThick / 2);
      group.add(frontLBaseMesh);

      const frontRBaseMesh = new THREE.Mesh(frontBaseGeo, baseboardMat);
      frontRBaseMesh.position.set(w / 2 - wallThick - frontBaseW / 2, baseboardY, d / 2 - wallThick - baseboardThick / 2);
      group.add(frontRBaseMesh);
    }

    // 6. Interactive Door (with hinge pivot, Box3 obstacle, smooth swing & audio)
    const localDoorPos = new THREE.Vector3(0, 0.08, d / 2 - wallThick / 2);
    const worldDoorPos = localDoorPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), options.rotY || 0).add(group.position);

    let doorMat: THREE.Material;
    if (options.doorTheme === 'glass') {
      doorMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.15,
        metalness: 0.85,
        opacity: 0.85,
        transparent: true
      });
    } else if (options.doorTheme === 'steel' || options.doorTheme === 'bunker') {
      doorMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.8
      });
    } else {
      doorMat = new THREE.MeshStandardMaterial({
        color: 0x451a03,
        roughness: 0.65,
        metalness: 0.1
      });
    }

    const door = new InteractiveDoor(
      options.id + '-door',
      options.name,
      worldDoorPos,
      doorW - 0.06,
      doorH - 0.04,
      options.rotY || 0,
      doorMat,
      true,
      this.arenaGroup
    );
    this.doors.push(door);
    this.obstacles.push(door.obstacle);

    // 6. Ceiling Slab & Rooftop Base Floor
    const ceilingGeo = new THREE.BoxGeometry(w + 0.3, 0.2, d + 0.3);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, side: THREE.DoubleSide });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.set(0, wallH + 0.1, 0);
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    const bRotY = options.rotY || 0;
    const roofBaseY = wallH + 0.2;
    const roofCenterWorld = new THREE.Vector3(0, roofBaseY, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), bRotY)
      .add(group.position);

    // 7. Roof Styling & Walkable Rooftop Physics (allows jumping onto roof from elevated platforms)
    const roofColor = options.roofColor || '#334155';
    if (options.roofType === 'gable') {
      const roofH = 3.6;
      const roofShingleTex = TextureGenerator.createRoofShingleTexture(roofColor);
      const roofMat = new THREE.MeshStandardMaterial({
        map: roofShingleTex,
        roughness: 0.6,
        metalness: 0.2
      });
      const roofShape = new THREE.Shape();
      const halfW = (w + 0.8) / 2;
      roofShape.moveTo(-halfW, 0);
      roofShape.lineTo(0, roofH);
      roofShape.lineTo(halfW, 0);
      roofShape.closePath();

      const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.8, bevelEnabled: false });
      roofGeo.translate(0, 0, -(d + 0.8) / 2);
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.y = wallH + 0.2;
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      group.add(roofMesh);

      // Red brick chimney (tactical rooftop sniper cover)
      const chimneyGeo = new THREE.BoxGeometry(1.0, roofH + 1.2, 1.0);
      const chimneyMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createBrickTexture('#7f1d1d', '#94a3b8'),
        roughness: 0.8
      });
      const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
      chimney.position.set(w * 0.28, wallH + roofH * 0.65, 0);
      chimney.castShadow = true;
      group.add(chimney);

      group.updateMatrixWorld(true);
      const chimneyBox = new THREE.Box3().setFromObject(chimney);
      this.obstacles.push({ mesh: chimney, box: chimneyBox, isCover: true });

      // Register Walkable Pitched Gable Roof Obstacle
      const roofBox = new THREE.Box3().setFromObject(roofMesh);
      this.obstacles.push({
        mesh: roofMesh,
        box: roofBox,
        isFloor: true,
        isCover: false,
        ceilingY: wallH,
        floorPlane: {
          center: roofCenterWorld,
          halfW: (w + 0.8) / 2,
          halfD: (d + 0.8) / 2,
          rotY: bRotY,
          topY: roofBaseY,
          pitchHeight: roofH
        }
      });
    } else if (options.roofType === 'cyber_tower') {
      // Skyscraper tower rising above enterable lobby
      const towerH = options.towerHeight || 24;
      const towerGeo = new THREE.BoxGeometry(w * 0.88, towerH, d * 0.88);
      const facadeTex = TextureGenerator.createWindowFacadeTexture(options.wallColor);
      facadeTex.repeat.set(1, Math.round(towerH / 4));
      const towerMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.4, metalness: 0.2 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(0, wallH + 0.2 + towerH / 2, 0);
      tower.castShadow = true;
      tower.receiveShadow = true;
      group.add(tower);

      group.updateMatrixWorld(true);
      const towerBox = new THREE.Box3().setFromObject(tower);
      this.obstacles.push({ mesh: tower, box: towerBox, isCover: false });

      // Register Walkable Rooftop Terrace Floor Obstacle (around skyscraper tower base)
      const ceilingBox = new THREE.Box3().setFromObject(ceiling);
      this.obstacles.push({
        mesh: ceiling,
        box: ceilingBox,
        isFloor: true,
        isCover: false,
        ceilingY: wallH,
        floorPlane: {
          center: roofCenterWorld,
          halfW: (w + 0.3) / 2,
          halfD: (d + 0.3) / 2,
          rotY: bRotY,
          topY: roofBaseY
        }
      });

      // Rooftop antenna mast with aircraft beacon
      const mastGeo = new THREE.CylinderGeometry(0.08, 0.15, 6, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(0, wallH + 0.2 + towerH + 3, 0);
      group.add(mast);

      const beaconGeo = new THREE.SphereGeometry(0.25, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, wallH + 0.2 + towerH + 6.1, 0);
      group.add(beacon);
    } else {
      // Flat roof with complete perimeter parapet railing walls + AC unit
      const parapetGeo = new THREE.BoxGeometry(w + 0.3, 0.7, 0.25);
      const parapetMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, side: THREE.DoubleSide });
      const pFront = new THREE.Mesh(parapetGeo, parapetMat);
      pFront.position.set(0, wallH + 0.55, d / 2);
      group.add(pFront);
      const pBack = new THREE.Mesh(parapetGeo, parapetMat);
      pBack.position.set(0, wallH + 0.55, -d / 2);
      group.add(pBack);

      const pSideGeo = new THREE.BoxGeometry(0.25, 0.7, d + 0.3);
      const pLeft = new THREE.Mesh(pSideGeo, parapetMat);
      pLeft.position.set(-w / 2, wallH + 0.55, 0);
      group.add(pLeft);
      const pRight = new THREE.Mesh(pSideGeo, parapetMat);
      pRight.position.set(w / 2, wallH + 0.55, 0);
      group.add(pRight);

      // Rooftop AC unit
      const acGeo = new THREE.BoxGeometry(2.0, 1.2, 1.8);
      const acMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 });
      const ac = new THREE.Mesh(acGeo, acMat);
      ac.position.set(w * 0.2, wallH + 0.8, -d * 0.15);
      group.add(ac);

      group.updateMatrixWorld(true);
      const ceilingBox = new THREE.Box3().setFromObject(ceiling);
      this.obstacles.push({
        mesh: ceiling,
        box: ceilingBox,
        isFloor: true,
        isCover: false,
        ceilingY: wallH,
        floorPlane: {
          center: roofCenterWorld,
          halfW: (w + 0.3) / 2,
          halfD: (d + 0.3) / 2,
          rotY: bRotY,
          topY: roofBaseY
        }
      });

      // Register perimeter parapet wall obstacles
      for (const pMesh of [pFront, pBack, pLeft, pRight]) {
        const pBox = new THREE.Box3().setFromObject(pMesh);
        this.obstacles.push({ mesh: pMesh, box: pBox, isCover: true });
      }

      const acBox = new THREE.Box3().setFromObject(ac);
      this.obstacles.push({ mesh: ac, box: acBox, isCover: true });
    }

    // 8. Interior Illumination
    const fixtureGeo = new THREE.BoxGeometry(1.6, 0.08, 0.8);
    const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(0, wallH - 0.04, 0);
    group.add(fixture);

    const lightColor = options.wallType === 'adobe' ? 0xfef08a : options.doorTheme === 'glass' ? 0xbae6fd : 0xffedd5;
    const interiorLight = new THREE.PointLight(lightColor, 1.45, 18);
    interiorLight.position.set(0, wallH * 0.6, 0);
    interiorLight.castShadow = false;
    group.add(interiorLight);

    // 9. Windows with Transparent Glass (Side Walls)
    const winGeo = new THREE.BoxGeometry(1.6, 1.8, 0.08);
    const winGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.8,
      opacity: 0.4,
      transparent: true
    });
    const winFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const winFrameGeo = new THREE.BoxGeometry(1.8, 2.0, 0.12);

    [-d * 0.25, d * 0.25].forEach(wz => {
      // Left window
      const frameL = new THREE.Mesh(winFrameGeo, winFrameMat);
      frameL.rotation.y = Math.PI / 2;
      frameL.position.set(-w / 2, 2.0, wz);
      group.add(frameL);

      const glassL = new THREE.Mesh(winGeo, winGlassMat);
      glassL.rotation.y = Math.PI / 2;
      glassL.position.set(-w / 2, 2.0, wz);
      group.add(glassL);

      // Right window
      const frameR = new THREE.Mesh(winFrameGeo, winFrameMat);
      frameR.rotation.y = Math.PI / 2;
      frameR.position.set(w / 2, 2.0, wz);
      group.add(frameR);

      const glassR = new THREE.Mesh(winGeo, winGlassMat);
      glassR.rotation.y = Math.PI / 2;
      glassR.position.set(w / 2, 2.0, wz);
      group.add(glassR);
    });

    // 10. Interior Tactical Furniture & Cover (Tactical gameplay inside!)
    // Executive desk / dispatch terminal table
    const deskGeo = new THREE.BoxGeometry(2.4, 0.9, 1.1);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.6 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0.08 + 0.45, -d / 2 + 1.3);
    desk.castShadow = true;
    desk.receiveShadow = true;
    group.add(desk);

    group.updateMatrixWorld(true);
    const deskBox = new THREE.Box3().setFromObject(desk);
    this.obstacles.push({ mesh: desk, box: deskBox, isCover: true });

    // Register Interior Sanctuary Zone for immunity & safe room detection
    const bRot = options.rotY || 0;
    const doorApproachLocal = new THREE.Vector3(0, 0, d / 2 + 2.5);
    const doorInsideLocal = new THREE.Vector3(0, 0, d / 2 - 1.8);
    const doorApproachPos = doorApproachLocal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bRot).add(group.position);
    const doorInsidePos = doorInsideLocal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bRot).add(group.position);

    this.interiorZones.push({
      id: options.id,
      name: options.name,
      center: new THREE.Vector3(options.x, 0, options.z),
      width: w,
      depth: d,
      height: wallH,
      rotY: bRot,
      door,
      doorWorldPos: worldDoorPos,
      doorApproachPos,
      doorInsidePos
    });

    // 10. Interactive Shootable Props & Loot Containers
    const buildingRot = options.rotY || 0;
    const yAxis = new THREE.Vector3(0, 1, 0);

    const spawnBuildingProp = (
      type: DestructibleType,
      localX: number,
      localY: number,
      localZ: number,
      localRot: number,
      loot: LootType,
      suffix: string
    ) => {
      const v = new THREE.Vector3(localX, localY, localZ);
      v.applyAxisAngle(yAxis, buildingRot);
      v.add(group.position);
      const prop = new DestructibleProp(
        `${options.id}-prop-${suffix}`,
        type,
        v,
        buildingRot + localRot,
        loot,
        options.id
      );
      this.arenaGroup.add(prop.mesh);
      this.destructibles.push(prop);
      this.obstacles.push(prop.obstacle);
    };

    // Prop 1: Terracotta Pot on top of the desk (drops gold coin pack)
    spawnBuildingProp('clay_pot', 0.5, 0.08 + 0.9, -d / 2 + 1.3, 0, 'coin_pack', 'pot-1');

    // Prop 2: Wooden Loot Crate in back-left corner (drops medkit health pack)
    spawnBuildingProp('loot_crate', -w / 2 + 1.25, 0.08, -d / 2 + 1.25, 0.1, 'health_pack', 'crate-1');

    // Prop 3: Tactical Ammo Crate along side wall (drops ammo pack)
    spawnBuildingProp('loot_crate', -w / 2 + 1.25, 0.08, -d / 2 + 2.5, -0.15, 'ammo_pack', 'crate-2');

    // Prop 4: Armored Tech Safe in back-right corner (drops body armor pack)
    spawnBuildingProp('tech_safe', w / 2 - 1.25, 0.08, -d / 2 + 1.25, -Math.PI / 4, 'armor_pack', 'safe-1');

    // Prop 5: Extra Clay Pot near front corner (drops coins)
    spawnBuildingProp('clay_pot', w / 2 - 1.25, 0.08, d / 2 - 1.6, 0.4, 'coin_pack', 'pot-2');

    // Prop 6: Heavy Ordnance Munitions Crate (drops bomb pack)
    spawnBuildingProp('loot_crate', w / 2 - 1.25, 0.08, -d / 2 + 2.5, 0.2, 'bomb_pack', 'bomb-crate');

    // Tactical Screen / Whiteboard on back interior wall
    const screenGeo = new THREE.BoxGeometry(2.2, 1.2, 0.06);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      roughness: 0.3
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 2.2, -d / 2 + wallThick + 0.04);
    group.add(screenMesh);

    // 11. Entrance Signboard & Canopy
    if (options.signText) {
      const signBoardGeo = new THREE.BoxGeometry(doorW + 1.2, 0.5, 0.15);
      const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
      const signBoard = new THREE.Mesh(signBoardGeo, signBoardMat);
      signBoard.position.set(0, doorH + 0.35, d / 2 + 0.1);
      group.add(signBoard);

      const signGlowGeo = new THREE.BoxGeometry(doorW + 0.9, 0.32, 0.06);
      const signGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const signGlow = new THREE.Mesh(signGlowGeo, signGlowMat);
      signGlow.position.set(0, doorH + 0.35, d / 2 + 0.18);
      group.add(signGlow);
    }

    // Porch Entrance Step
    const stepGeo = new THREE.BoxGeometry(doorW + 0.6, 0.16, 1.0);
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const step = new THREE.Mesh(stepGeo, stepMat);
    step.position.set(0, 0.08, d / 2 + 0.5);
    step.receiveShadow = true;
    group.add(step);

    return group;
  }

  /**
   * Builds an authentic 3D natural tree with bark trunk, root flares, and lush leafy foliage.
   * Registers a solid Box3 obstacle on the trunk base for bullet collision and tactical cover.
   */
  public createTree(
    x: number,
    z: number,
    scale: number = 1.0,
    type: 'oak' | 'pine' | 'palm' = 'oak'
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    this.arenaGroup.add(group);

    const s = scale;

    if (type === 'pine') {
      // Tall Evergreen Conifer / Pine Tree
      const trunkH = 8.5 * s;
      const trunkGeo = new THREE.CylinderGeometry(0.24 * s, 0.44 * s, trunkH, 8);
      const barkMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createBarkTexture('#451a03', '#1c0d02'),
        roughness: 0.9,
        metalness: 0.05
      });
      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      // Conical needle tiers
      const needleMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createFoliageTexture('#14532d', '#166534'),
        roughness: 0.85,
        metalness: 0.05
      });

      const tiers = [
        { y: 3.8 * s, r: 2.8 * s, h: 3.2 * s },
        { y: 5.8 * s, r: 2.3 * s, h: 3.0 * s },
        { y: 7.6 * s, r: 1.7 * s, h: 2.6 * s },
        { y: 9.2 * s, r: 1.1 * s, h: 2.2 * s }
      ];

      tiers.forEach(t => {
        const coneGeo = new THREE.ConeGeometry(t.r, t.h, 8);
        const cone = new THREE.Mesh(coneGeo, needleMat);
        cone.position.y = t.y + t.h / 2;
        cone.castShadow = true;
        cone.receiveShadow = true;
        group.add(cone);
      });

      // Solid tactical cover trunk obstacle
      group.updateMatrixWorld(true);
      const trunkBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, trunkH * 0.35, z),
        new THREE.Vector3(0.9 * s, trunkH * 0.7, 0.9 * s)
      );
      this.obstacles.push({ mesh: trunk, box: trunkBox, isCover: true });
    } else if (type === 'palm') {
      // Tropical / Desert Oasis Date Palm Tree
      const trunkH = 7.5 * s;
      const trunkGeo = new THREE.CylinderGeometry(0.28 * s, 0.42 * s, trunkH, 8);
      const barkMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createBarkTexture('#78350f', '#451a03'),
        roughness: 0.85
      });
      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      trunk.position.y = trunkH / 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.08;
      trunk.castShadow = true;
      group.add(trunk);

      // Drooping Palm Fronds
      const frondMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.8,
        side: THREE.DoubleSide
      });
      const numFronds = 9;
      for (let i = 0; i < numFronds; i++) {
        const angle = (i / numFronds) * Math.PI * 2;
        const frondGroup = new THREE.Group();
        frondGroup.position.set(0, trunkH - 0.2 * s, 0);
        frondGroup.rotation.y = angle;

        const frondGeo = new THREE.BoxGeometry(0.4 * s, 0.04 * s, 3.2 * s);
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.position.set(0, -0.4 * s, 1.6 * s);
        frond.rotation.x = -0.38;
        frond.castShadow = true;
        frondGroup.add(frond);
        group.add(frondGroup);
      }

      group.updateMatrixWorld(true);
      const trunkBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, trunkH * 0.35, z),
        new THREE.Vector3(0.85 * s, trunkH * 0.7, 0.85 * s)
      );
      this.obstacles.push({ mesh: trunk, box: trunkBox, isCover: true });
    } else {
      // Spreading Majestic Oak / Deciduous Shade Tree
      const trunkH = 5.8 * s;
      const trunkGeo = new THREE.CylinderGeometry(0.42 * s, 0.68 * s, trunkH, 8);
      const barkMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createBarkTexture('#5c3a21', '#2e1b0f'),
        roughness: 0.88,
        metalness: 0.05
      });
      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      // 4 Ground Root Wedges
      for (let r = 0; r < 4; r++) {
        const rAngle = (r / 4) * Math.PI * 2;
        const rootGeo = new THREE.BoxGeometry(0.35 * s, 0.45 * s, 0.9 * s);
        const root = new THREE.Mesh(rootGeo, barkMat);
        root.position.set(
          Math.sin(rAngle) * 0.55 * s,
          0.22 * s,
          Math.cos(rAngle) * 0.55 * s
        );
        root.rotation.y = rAngle;
        root.castShadow = true;
        root.receiveShadow = true;
        group.add(root);
      }

      // Spreading Boughs / Major Branches
      const branchGeo = new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 2.8 * s, 6);
      const bAngles = [0.3, 2.4, 4.5];
      bAngles.forEach(ang => {
        const branch = new THREE.Mesh(branchGeo, barkMat);
        branch.position.set(
          Math.sin(ang) * 0.8 * s,
          trunkH * 0.82,
          Math.cos(ang) * 0.8 * s
        );
        branch.rotation.y = ang;
        branch.rotation.z = 0.55;
        branch.castShadow = true;
        group.add(branch);
      });

      // Lush Layered Foliage Clusters
      const foliageMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createFoliageTexture('#15803d', '#22c55e'),
        roughness: 0.82,
        metalness: 0.05
      });

      const clusters = [
        { x: 0, y: trunkH + 1.2 * s, z: 0, r: 2.6 * s },
        { x: 1.5 * s, y: trunkH + 0.6 * s, z: 0.8 * s, r: 2.0 * s },
        { x: -1.6 * s, y: trunkH + 0.7 * s, z: -0.6 * s, r: 2.1 * s },
        { x: 0.4 * s, y: trunkH + 0.4 * s, z: -1.7 * s, r: 1.9 * s },
        { x: -0.8 * s, y: trunkH + 0.5 * s, z: 1.5 * s, r: 2.0 * s }
      ];

      clusters.forEach(c => {
        const foliageGeo = new THREE.DodecahedronGeometry(c.r, 1);
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.set(c.x, c.y, c.z);
        foliage.scale.set(1.0, 0.85, 1.0);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        group.add(foliage);
      });

      // Trunk Solid Cover Obstacle
      group.updateMatrixWorld(true);
      const trunkBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, trunkH * 0.4, z),
        new THREE.Vector3(1.3 * s, trunkH * 0.8, 1.3 * s)
      );
      this.obstacles.push({ mesh: trunk, box: trunkBox, isCover: true });
    }

    return group;
  }

  /**
   * Builds an authentic, elevated, enterable Treehouse with a massive supporting ancient tree,
   * walkable wooden access stairway, elevated timber lookout deck, hollow wooden cabin room,
   * sniper windows, interactive door, warm interior lantern, sniper vantage points, and interior sanctuary registration.
   */
  /**
   * Builds the Grand Canopy Sanctuary Treehouse:
   * 1. Ground Nature Sanctuary Grounds (fencing, flagstone path, stone fountain basin, benches, lantern posts, root buttresses)
   * 2. Grand timber access stairway from ground to elevated 2nd floor deck (with StairRamp)
   * 3. Elevated Balcony Deck (11.2m x 9.6m at Y=4.6m) with floorPlane & perimeter balustrades
   * 4. 2nd Floor Calming Panoramic Transparent Glass House (crystal-clear glass walls on all 4 sides with walnut framing, French glass doors, calming lounge furniture, and rich loot crates)
   * 5. 2nd -> 3rd Floor Timber Staircase (with StairRamp)
   * 6. 3rd Floor Open Rooftop Observation Deck (solid walkable timber deck at Y=8.0m with floorPlane, balustrades, brass telescope, observation bench, fairy lanterns, and high-ground loot)
   * 7. Overarching ancient cathedral tree canopy framing the open sky
   */
  public createEnterableTreehouse(options: {
    id: string;
    name: string;
    x: number;
    z: number;
    rotY?: number;
    height?: number;
    deckWidth?: number;
    deckDepth?: number;
    stairRun?: number;
    isGrandThreeStory?: boolean;
  }): THREE.Group {
    const group = new THREE.Group();
    group.position.set(options.x, 0, options.z);
    if (options.rotY) group.rotation.y = options.rotY;
    this.arenaGroup.add(group);

    const bRot = options.rotY || 0;
    const yAxis = new THREE.Vector3(0, 1, 0);

    // Architectural Dimensions - Expanded & Elongated for Grand Spatial Presence
    const deckH = options.height || 4.6;
    const deckW = options.deckWidth || 14.8; // Expanded width
    const deckD = options.deckDepth || 13.6; // Elongated depth
    const slabThick = 0.24;
    const stairW = 2.0; // Wide grand entrance stair
    const stairRun = options.stairRun || 6.4;

    const cabinW = 7.0;
    const cabinD = 5.6;
    const cabinH = 3.2;
    const roomCenterX = 0.6; // Shifted slightly East to give generous West walkway for rooftop stairs
    const roomCenterZ = -0.8; // Centered to provide generous 4.8m front observation deck
    const doorW = 1.8;
    const doorH = 2.5;

    // Level 3 Open Rooftop Deck Dimensions - Expanded & Elongated
    const roofDeckH = deckH + cabinH + 0.2; // Y = 8.0m
    const roofDeckW = 12.8; // Expansive observation deck
    const roofDeckD = 11.0; // Elongated observation deck
    const roofCenterX = 0.0;
    const roofCenterZ = -0.3;

    // Curated Harmonious Materials
    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.82,
      metalness: 0.05
    });

    const walnutFrameMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodSidingTexture('#522b10'),
      roughness: 0.72,
      metalness: 0.08
    });

    const deckFloorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodParquetFloorTexture(),
      roughness: 0.75,
      metalness: 0.05
    });

    const barkMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createBarkTexture('#3b1a04', '#150801'),
      roughness: 0.92,
      metalness: 0.04
    });

    const foliageMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createFoliageTexture('#14532d', '#22c55e'),
      roughness: 0.82
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createSidewalkTexture(),
      roughness: 0.88,
      metalness: 0.02
    });

    // High-clarity architectural crystal glass: 100% visible sightlines to the outside arena
    const treehouseGlassMat = new THREE.MeshStandardMaterial({
      color: 0xd6f0ff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.02,
      metalness: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // =========================================================================
    // 1. NATURE SANCTUARY GROUNDS (Large Dedicated Area with Open Entrance)
    // =========================================================================
    const groundsW = 32.0;
    const groundsD = 32.0;
    const halfGW = groundsW / 2; // 16.0m
    const halfGD = groundsD / 2; // 16.0m
    const gateW = 6.0; // Wide open sanctuary gateway directly aligned with stairs

    // Rustic Timber Post-and-Rail Fence Bounding Sanctuary
    const fenceH = 1.15;
    const fencePostGeo = new THREE.BoxGeometry(0.16, fenceH, 0.16);
    const fenceRailGeo = (len: number) => new THREE.BoxGeometry(len, 0.08, 0.12);

    const addFenceSegment = (x1: number, z1: number, x2: number, z2: number) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) return;
      const ang = Math.atan2(dx, dz);
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;

      const fGroup = new THREE.Group();
      fGroup.position.set(midX, 0, midZ);
      fGroup.rotation.y = ang;

      // Posts
      const postCount = Math.max(2, Math.round(len / 3.2));
      for (let p = 0; p <= postCount; p++) {
        const post = new THREE.Mesh(fencePostGeo, timberMat);
        const pz = -len / 2 + (p / postCount) * len;
        post.position.set(0, fenceH / 2, pz);
        post.castShadow = true;
        fGroup.add(post);
      }

      // Upper & Lower Rails
      const rUpper = new THREE.Mesh(fenceRailGeo(len), timberMat);
      rUpper.rotation.y = Math.PI / 2;
      rUpper.position.set(0, fenceH * 0.8, 0);
      fGroup.add(rUpper);

      const rLower = new THREE.Mesh(fenceRailGeo(len), timberMat);
      rLower.rotation.y = Math.PI / 2;
      rLower.position.set(0, fenceH * 0.42, 0);
      fGroup.add(rLower);

      group.add(fGroup);

      // Obstacle barrier
      const bGeo = new THREE.BoxGeometry(0.24, fenceH, len);
      const bMat = new THREE.MeshBasicMaterial({ visible: false });
      const barrier = new THREE.Mesh(bGeo, bMat);
      barrier.position.set(midX, fenceH / 2, midZ);
      barrier.rotation.y = ang;
      group.add(barrier);

      group.updateMatrixWorld(true);
      const bBox = new THREE.Box3().setFromObject(barrier);
      this.obstacles.push({ mesh: barrier, box: bBox, isCover: true });
    };

    // North, West, East perimeter boundary fences
    addFenceSegment(-halfGW, -halfGD, halfGW, -halfGD); // Back (North)
    addFenceSegment(-halfGW, -halfGD, -halfGW, halfGD); // West
    addFenceSegment(halfGW, -halfGD, halfGW, halfGD); // East

    // South Fence: Clean 6.0m Open Gateway directly in front of ground entrance stairs (at X=0)
    addFenceSegment(-halfGW, halfGD, -gateW / 2, halfGD);
    addFenceSegment(gateW / 2, halfGD, halfGW, halfGD);

    // Stone Entrance Lantern Pillars at the Gateway
    const pillarGeo = new THREE.BoxGeometry(0.65, 1.8, 0.65);
    const pillarMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createBrickTexture('#64748b', '#cbd5e1'),
      roughness: 0.85
    });

    [-gateW / 2, gateW / 2].forEach(px => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 0.9, halfGD);
      pillar.castShadow = true;
      group.add(pillar);

      const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 4), timberMat);
      lanternCap.position.set(px, 1.8 + 0.38, halfGD);
      lanternCap.rotation.y = Math.PI / 4;
      group.add(lanternCap);

      const lanternCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.85 })
      );
      lanternCore.position.set(px, 1.8 + 0.18, halfGD);
      group.add(lanternCore);

      const gateLight = new THREE.PointLight(0xfef08a, 1.2, 10);
      gateLight.position.set(px, 1.8 + 0.22, halfGD);
      group.add(gateLight);

      group.updateMatrixWorld(true);
      const pBox = new THREE.Box3().setFromObject(pillar);
      this.obstacles.push({ mesh: pillar, box: pBox, isCover: true });
    });

    // Meandering Stone Flagstone Pathway from Gateway directly into the Foot of the Stairs
    const pathSegments = 10;
    const stairFootX = 0.0; // Aligned with the ground entrance stairs
    const stairFootZ = deckD / 2 + stairRun; // 6.8 + 6.4 = 13.2m
    for (let i = 0; i < pathSegments; i++) {
      const t = i / (pathSegments - 1);
      const px = (1 - t) * 0.0 + t * stairFootX;
      const pz = (1 - t) * (halfGD + 1.2) + t * (stairFootZ + 0.3);

      const stoneGeo = new THREE.CylinderGeometry(0.75, 0.82, 0.08, 8);
      const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
      stoneMesh.position.set(px, 0.04, pz);
      stoneMesh.receiveShadow = true;
      stoneMesh.rotation.y = i * 0.6;
      group.add(stoneMesh);
    }

    // Calming Sanctuary Water Basin / Birdbath Fountain (positioned safely in the east courtyard)
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(6.8, 0, 7.5);
    group.add(fountainGroup);

    const fBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.4, 0.65, 12), stoneMat);
    fBasin.position.y = 0.65 / 2;
    fBasin.castShadow = true;
    fBasin.receiveShadow = true;
    fountainGroup.add(fBasin);

    const fWater = new THREE.Mesh(
      new THREE.CircleGeometry(1.65, 16),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.75
      })
    );
    fWater.rotation.x = -Math.PI / 2;
    fWater.position.y = 0.58;
    fountainGroup.add(fWater);

    const fPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.1, 8), stoneMat);
    fPedestal.position.y = 0.55;
    fountainGroup.add(fPedestal);

    const fUpperBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.55, 0.25, 10), stoneMat);
    fUpperBowl.position.y = 1.1;
    fountainGroup.add(fUpperBowl);

    group.updateMatrixWorld(true);
    const fBox = new THREE.Box3().setFromObject(fBasin);
    this.obstacles.push({ mesh: fBasin, box: fBox, isCover: true });

    // Weathered Garden Park Benches (placed along perimeter walkways, away from stair path)
    const addGroundBench = (bx: number, bz: number, brot: number) => {
      const benchGroup = new THREE.Group();
      benchGroup.position.set(bx, 0, bz);
      benchGroup.rotation.y = brot;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.55), timberMat);
      seat.position.y = 0.48;
      seat.castShadow = true;
      benchGroup.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.06), timberMat);
      back.position.set(0, 0.82, -0.24);
      back.castShadow = true;
      benchGroup.add(back);

      [-0.75, 0.75].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.52), timberMat);
        leg.position.set(lx, 0.24, 0);
        benchGroup.add(leg);
      });

      group.add(benchGroup);

      group.updateMatrixWorld(true);
      const benchBox = new THREE.Box3().setFromObject(seat);
      this.obstacles.push({ mesh: seat, box: benchBox, isCover: true });
    };

    addGroundBench(6.5, 3.2, -Math.PI / 2); // East garden bench
    addGroundBench(-7.2, 7.5, Math.PI / 3); // West garden bench

    // Rustic Planter Barrels flanking the perimeter fence line safely
    const addPlanterBarrel = (px: number, pz: number, bloomColor: number) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.65, 8), timberMat);
      barrel.position.set(px, 0.65 / 2, pz);
      barrel.castShadow = true;
      group.add(barrel);

      const soil = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x27170a, roughness: 0.95 })
      );
      soil.rotation.x = -Math.PI / 2;
      soil.position.set(px, 0.63, pz);
      group.add(soil);

      const bloomGeo = new THREE.DodecahedronGeometry(0.38, 1);
      const bloomMat = new THREE.MeshStandardMaterial({ color: bloomColor, roughness: 0.65 });
      const flowers = new THREE.Mesh(bloomGeo, bloomMat);
      flowers.position.set(px, 0.85, pz);
      group.add(flowers);

      group.updateMatrixWorld(true);
      const bBox = new THREE.Box3().setFromObject(barrel);
      this.obstacles.push({ mesh: barrel, box: bBox, isCover: true });
    };

    addPlanterBarrel(-gateW / 2 - 1.2, halfGD - 0.5, 0xf43f5e);
    addPlanterBarrel(gateW / 2 + 1.2, halfGD - 0.5, 0x38bdf8);

    // =========================================================================
    // 2. MASSIVE ANCIENT SUPPORTING TREE TRUNK & BOUGHS (Positioned on East Side)
    // =========================================================================
    // Positioned at +3.6m East so that West side is 100% clear for the rooftop staircase!
    const trunkH = deckH + 14.5; // reaches through deck and up to Y=19.1m
    const trunkGeo = new THREE.CylinderGeometry(1.15, 1.75, trunkH, 12);
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    const trunkLocalX = 3.6; // East side
    const trunkLocalZ = -1.2;
    trunk.position.set(trunkLocalX, trunkH / 2, trunkLocalZ);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Colossal Mossy Root Buttresses Flaring into Soil (spreading East, North, South)
    const rootAngles = [0.2, 1.4, 2.7, 4.2];
    rootAngles.forEach(ang => {
      const rootLength = 4.2;
      const rootGeo = new THREE.CylinderGeometry(0.24, 0.7, rootLength, 8);
      const rootMesh = new THREE.Mesh(rootGeo, barkMat);
      rootMesh.position.set(
        trunkLocalX + Math.sin(ang) * (rootLength * 0.45),
        0.35,
        trunkLocalZ + Math.cos(ang) * (rootLength * 0.45)
      );
      rootMesh.rotation.y = ang;
      rootMesh.rotation.z = 1.15;
      rootMesh.castShadow = true;
      group.add(rootMesh);
    });

    // Solid tree trunk cover obstacle at ground level
    group.updateMatrixWorld(true);
    const trunkWorldPos = new THREE.Vector3(trunkLocalX, deckH / 2, trunkLocalZ).applyAxisAngle(yAxis, bRot).add(group.position);
    const trunkBox = new THREE.Box3().setFromCenterAndSize(
      trunkWorldPos,
      new THREE.Vector3(3.4, deckH, 3.4)
    );
    this.obstacles.push({ mesh: trunk, box: trunkBox, isCover: true });

    // Giant Supporting Tree Boughs - Bracing East and North Deck (Zero limbs crossing the West stairs)
    const boughAngles = [0.4, 1.8, 3.2];
    boughAngles.forEach(ang => {
      // Lower boughs bracing Level 2 deck
      const boughGeo = new THREE.CylinderGeometry(0.38, 0.54, 5.8, 8);
      const bough = new THREE.Mesh(boughGeo, barkMat);
      bough.position.set(
        trunkLocalX + Math.sin(ang) * 2.0,
        deckH * 0.85,
        trunkLocalZ + Math.cos(ang) * 2.0
      );
      bough.rotation.y = ang;
      bough.rotation.z = 0.58;
      bough.castShadow = true;
      group.add(bough);

      // Upper boughs cradling 3rd Floor Rooftop high overhead (Y > 9.5m)
      const upperBough = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.44, 6.8, 8), barkMat);
      upperBough.position.set(
        trunkLocalX + Math.sin(ang + 0.2) * 2.6,
        roofDeckH + 1.8,
        trunkLocalZ + Math.cos(ang + 0.2) * 2.6
      );
      upperBough.rotation.y = ang + 0.2;
      upperBough.rotation.z = 0.52;
      upperBough.castShadow = true;
      group.add(upperBough);
    });

    // =========================================================================
    // 3. HEAVY TIMBER STILTS & DIAGONAL BRACES
    // =========================================================================
    const stiltGeo = new THREE.BoxGeometry(0.3, deckH, 0.3);
    const stiltOffsets = [
      { x: -deckW / 2 + 0.5, z: -deckD / 2 + 0.5 },
      { x: deckW / 2 - 0.5, z: -deckD / 2 + 0.5 },
      { x: -deckW / 2 + 0.5, z: deckD / 2 - 0.5 },
      { x: deckW / 2 - 0.5, z: deckD / 2 - 0.5 },
      { x: -deckW / 2 + 0.5, z: 0 },
      { x: deckW / 2 - 0.5, z: 0 },
      { x: 0, z: -deckD / 2 + 0.5 },
      { x: 0, z: deckD / 2 - 0.5 }
    ];
    stiltOffsets.forEach(so => {
      const stilt = new THREE.Mesh(stiltGeo, timberMat);
      stilt.position.set(so.x, deckH / 2, so.z);
      stilt.castShadow = true;
      stilt.receiveShadow = true;
      group.add(stilt);

      const braceGeo = new THREE.BoxGeometry(0.14, 0.18, 2.8);
      const brace = new THREE.Mesh(braceGeo, timberMat);
      brace.position.set(so.x * 0.85, deckH - 0.95, so.z * 0.85);
      brace.rotation.y = Math.atan2(so.z, so.x);
      brace.rotation.z = 0.52;
      group.add(brace);
    });

    // =========================================================================
    // 4. LEVEL 2 ELEVATED TIMBER BALCONY DECK SLAB (Walkable Floor at Y=deckH)
    // =========================================================================
    const deckGeo = new THREE.BoxGeometry(deckW, slabThick, deckD);
    const deckMesh = new THREE.Mesh(deckGeo, deckFloorMat);
    deckMesh.position.set(0, deckH - slabThick / 2, 0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    group.add(deckMesh);

    group.updateMatrixWorld(true);
    const deckLocalCenter = new THREE.Vector3(0, deckH, 0);
    const deckWorldCenter = deckLocalCenter.clone().applyAxisAngle(yAxis, bRot).add(group.position);
    const deckBox = new THREE.Box3().setFromObject(deckMesh);

    this.obstacles.push({
      mesh: deckMesh,
      box: deckBox,
      isFloor: true,
      isCover: false,
      ceilingY: deckH - slabThick,
      floorPlane: {
        center: deckWorldCenter,
        halfW: deckW / 2,
        halfD: deckD / 2,
        rotY: bRot,
        topY: deckH
      }
    });

    // =========================================================================
    // 5. LEVEL 1 -> LEVEL 2 GRAND ENTRANCE STAIRWAY (From Y=0 to Y=deckH)
    // =========================================================================
    // Centered at X=0, arriving directly onto the front promenade deck with zero obstructions!
    const stairStartX = 0.0;
    const zTop = deckD / 2; // 6.8m
    const zBottom = zTop + stairRun; // 6.8 + 6.4 = 13.2m

    const stairGroup = new THREE.Group();
    const numSteps = 18;
    const stepDepth = stairRun / numSteps;
    const stepHeight = deckH / numSteps;
    const stepPlankGeo = new THREE.BoxGeometry(stairW, 0.09, stepDepth + 0.08);

    for (let i = 0; i < numSteps; i++) {
      const stepY = i * stepHeight + stepHeight / 2;
      const stepZ = zBottom - i * stepDepth - stepDepth / 2;
      const stepMesh = new THREE.Mesh(stepPlankGeo, timberMat);
      stepMesh.position.set(stairStartX, stepY, stepZ);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      stairGroup.add(stepMesh);
    }

    const stairHypot = Math.hypot(stairRun, deckH);
    const stairAngle = Math.atan2(deckH, stairRun);
    const stringerGeo = new THREE.BoxGeometry(0.14, 0.26, stairHypot);

    const leftStringer = new THREE.Mesh(stringerGeo, timberMat);
    leftStringer.rotation.x = stairAngle;
    leftStringer.position.set(stairStartX - stairW / 2 + 0.05, deckH / 2, (zBottom + zTop) / 2);
    stairGroup.add(leftStringer);

    const rightStringer = new THREE.Mesh(stringerGeo, timberMat);
    rightStringer.rotation.x = stairAngle;
    rightStringer.position.set(stairStartX + stairW / 2 - 0.05, deckH / 2, (zBottom + zTop) / 2);
    stairGroup.add(rightStringer);

    // Handrails on entrance stairs
    const handrailGeo = new THREE.BoxGeometry(0.09, 0.09, stairHypot);
    const handrailL = new THREE.Mesh(handrailGeo, timberMat);
    handrailL.rotation.x = stairAngle;
    handrailL.position.set(stairStartX - stairW / 2 + 0.05, deckH / 2 + 1.0, (zBottom + zTop) / 2);
    stairGroup.add(handrailL);

    const handrailR = new THREE.Mesh(handrailGeo, timberMat);
    handrailR.rotation.x = stairAngle;
    handrailR.position.set(stairStartX + stairW / 2 - 0.05, deckH / 2 + 1.0, (zBottom + zTop) / 2);
    stairGroup.add(handrailR);

    group.add(stairGroup);

    // Register Level 1 -> Level 2 StairRamp Physics
    const p1Local = new THREE.Vector3(stairStartX, 0.0, zBottom);
    const p2Local = new THREE.Vector3(stairStartX, deckH, zTop);
    const p1World = p1Local.clone().applyAxisAngle(yAxis, bRot).add(group.position);
    const p2World = p2Local.clone().applyAxisAngle(yAxis, bRot).add(group.position);

    const mainStairRamp: StairRamp = {
      p1: p1World,
      p2: p2World,
      width: stairW + 0.35,
      bottomY: 0.0,
      topY: deckH
    };
    stairGroup.updateMatrixWorld(true);
    const mainStairBox = new THREE.Box3().setFromObject(stairGroup);
    this.obstacles.push({
      mesh: stairGroup,
      box: mainStairBox,
      isCover: false,
      stairRamp: mainStairRamp
    });

    // =========================================================================
    // 6. PERIMETER RUSTIC BALUSTRADES AROUND LEVEL 2 BALCONY DECK
    // =========================================================================
    const railH = 1.05;
    const addRailing = (
      parentGroup: THREE.Group,
      len: number,
      rx: number,
      ry: number,
      rz: number,
      angleY: number = 0
    ) => {
      if (len < 0.25) return;
      const railSeg = new THREE.Group();
      railSeg.position.set(rx, ry, rz);
      if (angleY) railSeg.rotation.y = angleY;

      const topRailGeo = new THREE.BoxGeometry(len, 0.08, 0.12);
      const topRail = new THREE.Mesh(topRailGeo, timberMat);
      topRail.position.y = railH - 0.04;
      topRail.castShadow = true;
      railSeg.add(topRail);

      const midRailGeo = new THREE.BoxGeometry(len, 0.06, 0.08);
      const midRail = new THREE.Mesh(midRailGeo, timberMat);
      midRail.position.y = railH * 0.48;
      railSeg.add(midRail);

      const bottomRail = new THREE.Mesh(midRailGeo, timberMat);
      bottomRail.position.y = 0.12;
      railSeg.add(bottomRail);

      const balusterGeo = new THREE.BoxGeometry(0.06, railH, 0.06);
      const count = Math.max(1, Math.round(len / 0.65));
      for (let b = 0; b <= count; b++) {
        const bx = -len / 2 + (b / count) * len;
        const baluster = new THREE.Mesh(balusterGeo, timberMat);
        baluster.position.set(bx, railH / 2, 0);
        baluster.castShadow = true;
        railSeg.add(baluster);
      }

      const barrierGeo = new THREE.BoxGeometry(len, railH, 0.24);
      const barrierMat = new THREE.MeshBasicMaterial({ visible: false });
      const barrier = new THREE.Mesh(barrierGeo, barrierMat);
      barrier.position.set(0, railH / 2, 0);
      railSeg.add(barrier);

      parentGroup.add(railSeg);

      group.updateMatrixWorld(true);
      const rBox = new THREE.Box3().setFromObject(barrier);
      this.obstacles.push({ mesh: barrier, box: rBox, isCover: false });
    };

    // Level 2 Balustrades
    addRailing(group, deckD, -deckW / 2, deckH, 0, Math.PI / 2); // West
    addRailing(group, deckW, 0, deckH, -deckD / 2, 0); // North
    addRailing(group, deckD, deckW / 2, deckH, 0, Math.PI / 2); // East

    // South Railings with a clean 2.4m central opening for the stairs landing at X=0
    const southRailSpan = (deckW - stairW - 0.4) / 2;
    addRailing(group, southRailSpan, -deckW / 2 + southRailSpan / 2, deckH, deckD / 2, 0);
    addRailing(group, southRailSpan, deckW / 2 - southRailSpan / 2, deckH, deckD / 2, 0);

    // =========================================================================
    // 7. LEVEL 2 CALMING PANORAMIC TRANSPARENT GLASS CABIN
    // =========================================================================
    const cabinGroup = new THREE.Group();
    cabinGroup.position.set(roomCenterX, deckH, roomCenterZ);
    group.add(cabinGroup);

    const roomWallThick = 0.16;
    const baseSillH = 0.32; // Rich walnut floor sill
    const headerH = 0.22; // Walnut header beam
    const glassPaneH = cabinH - baseSillH - headerH;

    const cabinWallMeshes: THREE.Mesh[] = [];

    // Architectural Glass Wall Section with Walnut Framing, Sills & Mullions
    const createPanoramicGlassWall = (
      width: number,
      px: number,
      pz: number,
      rotY: number
    ) => {
      const wallSection = new THREE.Group();
      wallSection.position.set(px, 0, pz);
      wallSection.rotation.y = rotY;
      cabinGroup.add(wallSection);

      // Bottom Walnut Sill
      const sill = new THREE.Mesh(new THREE.BoxGeometry(width, baseSillH, roomWallThick), walnutFrameMat);
      sill.position.set(0, baseSillH / 2, 0);
      sill.castShadow = true;
      sill.receiveShadow = true;
      wallSection.add(sill);

      // Top Walnut Header
      const header = new THREE.Mesh(new THREE.BoxGeometry(width, headerH, roomWallThick), walnutFrameMat);
      header.position.set(0, cabinH - headerH / 2, 0);
      header.castShadow = true;
      wallSection.add(header);

      // Crystal Transparent Architectural Glass (100% visibility to outside)
      const glass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.05, glassPaneH, 0.05), treehouseGlassMat);
      glass.position.set(0, baseSillH + glassPaneH / 2, 0);
      glass.renderOrder = 10;
      wallSection.add(glass);

      // Vertical Structural Walnut Mullions
      const numMullions = Math.max(1, Math.round(width / 1.5));
      for (let m = 1; m < numMullions; m++) {
        const mx = -width / 2 + (m / numMullions) * width;
        const mul = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, glassPaneH, roomWallThick + 0.02),
          walnutFrameMat
        );
        mul.position.set(mx, baseSillH + glassPaneH / 2, 0);
        wallSection.add(mul);
      }

      // Invisible Collision Barrier (with isGlass: true so bullets & optics interact cleanly)
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(width, cabinH, roomWallThick),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      barrier.position.set(0, cabinH / 2, 0);
      wallSection.add(barrier);
      cabinWallMeshes.push(barrier);
    };

    // Back Panoramic Glass Wall (-Z)
    createPanoramicGlassWall(cabinW, 0, -cabinD / 2 + roomWallThick / 2, 0);

    // Left Panoramic Glass Wall (-X)
    createPanoramicGlassWall(cabinD, -cabinW / 2 + roomWallThick / 2, 0, Math.PI / 2);

    // Right Panoramic Glass Wall (+X)
    createPanoramicGlassWall(cabinD, cabinW / 2 - roomWallThick / 2, 0, Math.PI / 2);

    // Front Panoramic Glass Wall (+Z): Glass panels flanking French double door
    const frontSideW = (cabinW - doorW) / 2;

    // Front Left Glass Panel
    const flSection = new THREE.Group();
    flSection.position.set(-cabinW / 2 + frontSideW / 2, 0, cabinD / 2 - roomWallThick / 2);
    cabinGroup.add(flSection);

    const flSill = new THREE.Mesh(new THREE.BoxGeometry(frontSideW, baseSillH, roomWallThick), walnutFrameMat);
    flSill.position.set(0, baseSillH / 2, 0);
    flSection.add(flSill);

    const flHeader = new THREE.Mesh(new THREE.BoxGeometry(frontSideW, headerH, roomWallThick), walnutFrameMat);
    flHeader.position.set(0, cabinH - headerH / 2, 0);
    flSection.add(flHeader);

    const flGlass = new THREE.Mesh(new THREE.BoxGeometry(frontSideW - 0.05, glassPaneH, 0.05), treehouseGlassMat);
    flGlass.position.set(0, baseSillH + glassPaneH / 2, 0);
    flGlass.renderOrder = 10;
    flSection.add(flGlass);

    const flBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(frontSideW, cabinH, roomWallThick),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    flBarrier.position.set(0, cabinH / 2, 0);
    flSection.add(flBarrier);
    cabinWallMeshes.push(flBarrier);

    // Front Right Glass Panel
    const frSection = new THREE.Group();
    frSection.position.set(cabinW / 2 - frontSideW / 2, 0, cabinD / 2 - roomWallThick / 2);
    cabinGroup.add(frSection);

    const frSill = new THREE.Mesh(new THREE.BoxGeometry(frontSideW, baseSillH, roomWallThick), walnutFrameMat);
    frSill.position.set(0, baseSillH / 2, 0);
    frSection.add(frSill);

    const frHeader = new THREE.Mesh(new THREE.BoxGeometry(frontSideW, headerH, roomWallThick), walnutFrameMat);
    frHeader.position.set(0, cabinH - headerH / 2, 0);
    frSection.add(frHeader);

    const frGlass = new THREE.Mesh(new THREE.BoxGeometry(frontSideW - 0.05, glassPaneH, 0.05), treehouseGlassMat);
    frGlass.position.set(0, baseSillH + glassPaneH / 2, 0);
    frGlass.renderOrder = 10;
    frSection.add(frGlass);

    const frBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(frontSideW, cabinH, roomWallThick),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    frBarrier.position.set(0, cabinH / 2, 0);
    frSection.add(frBarrier);
    cabinWallMeshes.push(frBarrier);

    // Doorway Lintel Header
    const lintelH = cabinH - doorH;
    if (lintelH > 0.05) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, roomWallThick), walnutFrameMat);
      lintel.position.set(0, doorH + lintelH / 2, cabinD / 2 - roomWallThick / 2);
      cabinGroup.add(lintel);
    }

    // 4 Corner Timber Structural Posts
    const colGeo = new THREE.BoxGeometry(0.2, cabinH, 0.2);
    [
      [-cabinW / 2 + 0.1, -cabinD / 2 + 0.1],
      [cabinW / 2 - 0.1, -cabinD / 2 + 0.1],
      [-cabinW / 2 + 0.1, cabinD / 2 - 0.1],
      [cabinW / 2 - 0.1, cabinD / 2 - 0.1]
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, walnutFrameMat);
      col.position.set(cx, cabinH / 2, cz);
      col.castShadow = true;
      cabinGroup.add(col);
    });

    // Register Glass Wall Obstacles (with isGlass: true)
    group.updateMatrixWorld(true);
    cabinWallMeshes.forEach(mesh => {
      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, box, isCover: false, isGlass: true });
    });

    // Interactive French Double Balcony Glass Door
    const worldDoorPos = new THREE.Vector3(roomCenterX, deckH, roomCenterZ + cabinD / 2)
      .applyAxisAngle(yAxis, bRot)
      .add(group.position);

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.2,
      depthWrite: false
    });

    const door = new InteractiveDoor(
      `${options.id}-door`,
      `${options.name} French Door`,
      worldDoorPos,
      doorW - 0.08,
      doorH - 0.04,
      bRot,
      doorMat,
      true,
      this.arenaGroup
    );
    this.doors.push(door);
    this.obstacles.push(door.obstacle);

    // =========================================================================
    // 8. CALMING INTERIOR LOUNGE FURNISHINGS & WARM AMBIANCE
    // =========================================================================
    // Plush L-Shaped Sectional Sofa (Forest-Green Velvet with Ivory Throw Pillows)
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(-cabinW / 2 + 1.5, 0, -cabinD / 2 + 1.4);
    cabinGroup.add(sofaGroup);

    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.75 });

    const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.85), sofaMat);
    sofaMain.position.set(0, 0.45 / 2, 0);
    sofaMain.castShadow = true;
    sofaGroup.add(sofaMain);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.2), sofaMat);
    sofaBack.position.set(0, 0.45 + 0.45 / 2, -0.32);
    sofaBack.castShadow = true;
    sofaGroup.add(sofaBack);

    // Pillows
    [-0.7, 0.7].forEach(px => {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.12), pillowMat);
      pillow.position.set(px, 0.55, -0.2);
      pillow.rotation.x = -0.15;
      sofaGroup.add(pillow);
    });

    group.updateMatrixWorld(true);
    const sofaBox = new THREE.Box3().setFromObject(sofaMain);
    this.obstacles.push({ mesh: sofaMain, box: sofaBox, isCover: true });

    // Low Walnut Tea / Coffee Table
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 0.7), walnutFrameMat);
    coffeeTable.position.set(-cabinW / 2 + 1.5, 0.38 / 2, -cabinD / 2 + 2.3);
    coffeeTable.castShadow = true;
    cabinGroup.add(coffeeTable);

    // Ceramic Teapot & Cups on Coffee Table
    const teapot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
    );
    teapot.position.set(-cabinW / 2 + 1.5, 0.38 + 0.07, -cabinD / 2 + 2.3);
    cabinGroup.add(teapot);

    // Artisan Indoor Potted Bonsai Tree on Wood Pedestal
    const bonsaiGroup = new THREE.Group();
    bonsaiGroup.position.set(cabinW / 2 - 1.2, 0, -cabinD / 2 + 1.2);
    cabinGroup.add(bonsaiGroup);

    const bonsaiPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.24, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 })
    );
    bonsaiPot.position.y = 0.2;
    bonsaiGroup.add(bonsaiPot);

    const bonsaiTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.6, 6), barkMat);
    bonsaiTrunk.position.y = 0.65;
    bonsaiTrunk.rotation.z = 0.2;
    bonsaiGroup.add(bonsaiTrunk);

    const bonsaiFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 1), foliageMat);
    bonsaiFoliage.position.set(-0.08, 1.0, 0);
    bonsaiGroup.add(bonsaiFoliage);

    // Tall Walnut Bookshelf with Antique Volumes & Field Scrolls
    const bookshelf = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.2, 1.6), walnutFrameMat);
    bookshelf.position.set(cabinW / 2 - 0.22, 1.1, 0);
    bookshelf.castShadow = true;
    cabinGroup.add(bookshelf);

    group.updateMatrixWorld(true);
    const bookBox = new THREE.Box3().setFromObject(bookshelf);
    this.obstacles.push({ mesh: bookshelf, box: bookBox, isCover: true });

    // Panoramic Observation Counter Overlooking Arena
    const deskGeo = new THREE.BoxGeometry(2.4, 0.85, 0.85);
    const desk = new THREE.Mesh(deskGeo, walnutFrameMat);
    desk.position.set(0, 0.85 / 2, -cabinD / 2 + 1.15);
    desk.castShadow = true;
    cabinGroup.add(desk);

    group.updateMatrixWorld(true);
    const deskBox = new THREE.Box3().setFromObject(desk);
    this.obstacles.push({ mesh: desk, box: deskBox, isCover: true });

    // Brass Spotting Binoculars on Observation Desk
    const bino = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.1, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.85 })
    );
    bino.position.set(0, 0.85 + 0.06, -cabinD / 2 + 1.15);
    cabinGroup.add(bino);

    // Warm Ambient Hanging Pendant Chandelier Lantern
    const lanternGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.32, 8);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.4,
      metalness: 0.8
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0, cabinH - 0.35, 0);
    cabinGroup.add(lantern);

    const lanternLight = new THREE.PointLight(0xfef08a, 1.5, 14);
    lanternLight.position.set(0, cabinH - 0.4, 0);
    cabinGroup.add(lanternLight);

    // Solid Interior Ceiling Slab Under Level 3 Rooftop
    const ceilingGeo = new THREE.BoxGeometry(cabinW + 0.4, slabThick, cabinD + 0.4);
    const ceiling = new THREE.Mesh(ceilingGeo, deckFloorMat);
    ceiling.position.set(0, cabinH + slabThick / 2, 0);
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    cabinGroup.add(ceiling);

    // =========================================================================
    // 9. LEVEL 2 RICH TACTICAL LOOT BOXES & NOVA BOMB PACKS
    // =========================================================================
    const spawnTreehouseProp = (
      type: DestructibleType,
      lx: number,
      ly: number,
      lz: number,
      lrot: number,
      loot: LootType,
      suffix: string
    ) => {
      const v = new THREE.Vector3(lx, ly, lz);
      v.applyAxisAngle(yAxis, bRot);
      v.add(group.position);
      const prop = new DestructibleProp(
        `${options.id}-prop-${suffix}`,
        type,
        v,
        bRot + lrot,
        loot,
        options.id
      );
      this.arenaGroup.add(prop.mesh);
      this.destructibles.push(prop);
      this.obstacles.push(prop.obstacle);
    };

    // Level 2 Interior Loot Containers: Ammo, Medkit, Armor, Bombs, Coins
    spawnTreehouseProp('loot_crate', roomCenterX - 2.2, deckH, roomCenterZ - 1.4, 0.25, 'ammo_pack', 'tree-ammo');
    spawnTreehouseProp('tech_safe', roomCenterX - 2.4, deckH, roomCenterZ + 1.0, -0.3, 'health_pack', 'tree-medkit');
    spawnTreehouseProp('tech_safe', roomCenterX + 2.2, deckH, roomCenterZ - 1.4, 0.15, 'armor_pack', 'tree-armor');
    spawnTreehouseProp('loot_crate', roomCenterX + 2.4, deckH, roomCenterZ + 1.0, -0.2, 'bomb_pack', 'tree-bomb');
    spawnTreehouseProp('tech_safe', roomCenterX + 0.8, deckH, roomCenterZ - 1.4, 0, 'coin_pack', 'tree-coins');

    // =========================================================================
    // 10. LEVEL 2 -> LEVEL 3 TIMBER STAIRWAY (RELOCATED TO WEST / OTHER SIDE)
    // =========================================================================
    // Relocated to the West (-X) side where there are ZERO tree trunks or branches!
    // The staircase ascends smoothly from Level 2 deck to Level 3 rooftop.
    const stair2W = 1.6;
    const stair2Run = 5.6;
    const stair2Rise = roofDeckH - deckH; // 3.4m rise
    const stair2X = -5.0; // Positioned cleanly on the West deck terrace
    const stair2ZBottom = 2.4; // Starts comfortably on the front-west terrace
    const stair2ZTop = stair2ZBottom - stair2Run; // Arrives flush onto Level 3 rooftop at Z = -3.2m

    const stair2Group = new THREE.Group();
    const numSteps2 = 16;
    const stepDepth2 = stair2Run / numSteps2;
    const stepHeight2 = stair2Rise / numSteps2;
    const step2PlankGeo = new THREE.BoxGeometry(stair2W, 0.08, stepDepth2 + 0.06);

    for (let i = 0; i < numSteps2; i++) {
      const stepY = deckH + i * stepHeight2 + stepHeight2 / 2;
      const stepZ = stair2ZBottom - i * stepDepth2 - stepDepth2 / 2;
      const stepMesh = new THREE.Mesh(step2PlankGeo, timberMat);
      stepMesh.position.set(stair2X, stepY, stepZ);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      stair2Group.add(stepMesh);
    }

    const stair2Hypot = Math.hypot(stair2Run, stair2Rise);
    const stair2Angle = Math.atan2(stair2Rise, stair2Run);
    const stringer2Geo = new THREE.BoxGeometry(0.12, 0.24, stair2Hypot);

    const s2LeftStringer = new THREE.Mesh(stringer2Geo, timberMat);
    s2LeftStringer.rotation.x = -stair2Angle;
    s2LeftStringer.position.set(stair2X - stair2W / 2 + 0.04, deckH + stair2Rise / 2, (stair2ZBottom + stair2ZTop) / 2);
    stair2Group.add(s2LeftStringer);

    const s2RightStringer = new THREE.Mesh(stringer2Geo, timberMat);
    s2RightStringer.rotation.x = -stair2Angle;
    s2RightStringer.position.set(stair2X + stair2W / 2 - 0.04, deckH + stair2Rise / 2, (stair2ZBottom + stair2ZTop) / 2);
    stair2Group.add(s2RightStringer);

    // Handrails on Level 2 -> Level 3 stairs
    const s2HandrailGeo = new THREE.BoxGeometry(0.08, 0.08, stair2Hypot);
    const s2HandrailL = new THREE.Mesh(s2HandrailGeo, timberMat);
    s2HandrailL.rotation.x = -stair2Angle;
    s2HandrailL.position.set(stair2X - stair2W / 2 + 0.04, deckH + stair2Rise / 2 + 1.0, (stair2ZBottom + stair2ZTop) / 2);
    stair2Group.add(s2HandrailL);

    const s2HandrailR = new THREE.Mesh(s2HandrailGeo, timberMat);
    s2HandrailR.rotation.x = -stair2Angle;
    s2HandrailR.position.set(stair2X + stair2W / 2 - 0.04, deckH + stair2Rise / 2 + 1.0, (stair2ZBottom + stair2ZTop) / 2);
    stair2Group.add(s2HandrailR);

    group.add(stair2Group);

    // Register Level 2 -> Level 3 StairRamp Physics
    const s2p1Local = new THREE.Vector3(stair2X, deckH, stair2ZBottom);
    const s2p2Local = new THREE.Vector3(stair2X, roofDeckH, stair2ZTop);
    const s2p1World = s2p1Local.clone().applyAxisAngle(yAxis, bRot).add(group.position);
    const s2p2World = s2p2Local.clone().applyAxisAngle(yAxis, bRot).add(group.position);

    const roofStairRamp: StairRamp = {
      p1: s2p1World,
      p2: s2p2World,
      width: stair2W + 0.35,
      bottomY: deckH,
      topY: roofDeckH
    };
    stair2Group.updateMatrixWorld(true);
    const s2Box = new THREE.Box3().setFromObject(stair2Group);
    this.obstacles.push({
      mesh: stair2Group,
      box: s2Box,
      isCover: false,
      stairRamp: roofStairRamp
    });

    // =========================================================================
    // 11. LEVEL 3 OPEN ROOFTOP OBSERVATION DECK (MORE BIG & LONG, CLEAN OPEN STAIRWELL)
    // =========================================================================
    // The rooftop is expanded and elongated.
    // The stairwell on the West side (from Z = -3.2m forward) is completely OPEN to the sky,
    // so the floor does NOT clip through the stairs or player head!
    const roofGroup = new THREE.Group();
    roofGroup.position.set(roofCenterX, roofDeckH, roofCenterZ);
    group.add(roofGroup);

    // Main Rooftop Timber Floor Slab (East, Center, and North)
    const mainRoofW = roofDeckW - 2.8; // spans from X = -3.6 to +6.4
    const mainRoofFloor = new THREE.Mesh(new THREE.BoxGeometry(mainRoofW, slabThick, roofDeckD), deckFloorMat);
    mainRoofFloor.position.set(roofDeckW / 2 - mainRoofW / 2, -slabThick / 2, 0);
    mainRoofFloor.castShadow = true;
    mainRoofFloor.receiveShadow = true;
    roofGroup.add(mainRoofFloor);

    // West Landing Platform behind the stairs (from Z = -3.2m to North edge)
    const westLandingD = (roofDeckD / 2 - Math.abs(roofCenterZ - stair2ZTop));
    if (westLandingD > 0.4) {
      const westFloor = new THREE.Mesh(new THREE.BoxGeometry(2.8, slabThick, westLandingD), deckFloorMat);
      westFloor.position.set(-roofDeckW / 2 + 1.4, -slabThick / 2, -roofDeckD / 2 + westLandingD / 2);
      westFloor.castShadow = true;
      westFloor.receiveShadow = true;
      roofGroup.add(westFloor);
    }

    // Register 3rd Floor Walkable Rooftop FloorPlane
    group.updateMatrixWorld(true);
    const roofFloorCenterLocal = new THREE.Vector3(roofCenterX, roofDeckH, roofCenterZ);
    const roofFloorCenterWorld = roofFloorCenterLocal.clone().applyAxisAngle(yAxis, bRot).add(group.position);
    const roofFloorBox = new THREE.Box3().setFromObject(roofGroup);

    this.obstacles.push({
      mesh: roofGroup,
      box: roofFloorBox,
      isFloor: true,
      isCover: false,
      ceilingY: roofDeckH - slabThick,
      floorPlane: {
        center: roofFloorCenterWorld,
        halfW: roofDeckW / 2,
        halfD: roofDeckD / 2,
        rotY: bRot,
        topY: roofDeckH
      }
    });

    // Rustic Perimeter Railings on Open Rooftop with 1.8m Open Entryway for the West Stairs
    addRailing(group, roofDeckW, roofCenterX, roofDeckH, roofCenterZ - roofDeckD / 2, 0); // North edge
    addRailing(group, roofDeckD, roofCenterX + roofDeckW / 2, roofDeckH, roofCenterZ, Math.PI / 2); // East edge
    addRailing(group, roofDeckW, roofCenterX, roofDeckH, roofCenterZ + roofDeckD / 2, 0); // South edge

    // West Railings: Leaves a clean 1.8m open gap at the stair arrival (Z = -3.2m)
    const westNorthRailLen = Math.max(0.4, (roofDeckD / 2 - Math.abs(roofCenterZ - stair2ZTop) - 0.4));
    addRailing(
      group,
      westNorthRailLen,
      roofCenterX - roofDeckW / 2,
      roofDeckH,
      roofCenterZ - roofDeckD / 2 + westNorthRailLen / 2,
      Math.PI / 2
    );

    const westSouthRailLen = Math.max(0.4, (roofDeckD - westNorthRailLen - 1.8));
    addRailing(
      group,
      westSouthRailLen,
      roofCenterX - roofDeckW / 2,
      roofDeckH,
      roofCenterZ + roofDeckD / 2 - westSouthRailLen / 2,
      Math.PI / 2
    );

    // Heavy Brass Long-Range Astronomical / Spotting Telescope on Tripod
    const telescopeGroup = new THREE.Group();
    telescopeGroup.position.set(roofCenterX + 2.4, roofDeckH, roofCenterZ + roofDeckD / 2 - 1.2);
    telescopeGroup.rotation.y = -Math.PI / 6;
    group.add(telescopeGroup);

    // Wooden Tripod Legs
    const tripodLegGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.25, 6);
    [-0.35, 0.35].forEach(tx => {
      const leg = new THREE.Mesh(tripodLegGeo, timberMat);
      leg.position.set(tx, 0.6, 0.15);
      leg.rotation.z = tx > 0 ? -0.25 : 0.25;
      leg.rotation.x = -0.15;
      telescopeGroup.add(leg);
    });
    const legRear = new THREE.Mesh(tripodLegGeo, timberMat);
    legRear.position.set(0, 0.6, -0.35);
    legRear.rotation.x = 0.28;
    telescopeGroup.add(legRear);

    // Brass Barrel & Eyepiece
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.9 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 1.4, 10), brassMat);
    barrel.rotation.x = Math.PI / 2 - 0.2;
    barrel.position.set(0, 1.25, 0);
    telescopeGroup.add(barrel);

    group.updateMatrixWorld(true);
    const teleBox = new THREE.Box3().setFromObject(barrel);
    this.obstacles.push({ mesh: barrel, box: teleBox, isCover: true });

    // Weathered Timber Rooftop Observation Bench
    const roofBenchGroup = new THREE.Group();
    roofBenchGroup.position.set(roofCenterX + 3.2, roofDeckH, roofCenterZ - 2.2);
    roofBenchGroup.rotation.y = -Math.PI / 2;
    group.add(roofBenchGroup);

    const rbSeat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.55), timberMat);
    rbSeat.position.y = 0.48;
    roofBenchGroup.add(rbSeat);

    const rbBack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.06), timberMat);
    rbBack.position.set(0, 0.78, -0.24);
    roofBenchGroup.add(rbBack);

    [-0.85, 0.85].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.5), timberMat);
      leg.position.set(lx, 0.24, 0);
      roofBenchGroup.add(leg);
    });

    group.updateMatrixWorld(true);
    const rbBox = new THREE.Box3().setFromObject(rbSeat);
    this.obstacles.push({ mesh: rbSeat, box: rbBox, isCover: true });

    // 4 Corner Cedar Posts with Warm Glowing Fairy Lanterns on Rooftop
    [
      [-roofDeckW / 2 + 0.12, -roofDeckD / 2 + 0.12],
      [roofDeckW / 2 - 0.12, -roofDeckD / 2 + 0.12],
      [-roofDeckW / 2 + 0.12, roofDeckD / 2 - 0.12],
      [roofDeckW / 2 - 0.12, roofDeckD / 2 - 0.12]
    ].forEach(([cx, cz]) => {
      const rPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), timberMat);
      rPost.position.set(roofCenterX + cx, roofDeckH + 0.9, roofCenterZ + cz);
      group.add(rPost);

      const fairyLightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
      );
      fairyLightMesh.position.set(roofCenterX + cx, roofDeckH + 1.8, roofCenterZ + cz);
      group.add(fairyLightMesh);

      const fLight = new THREE.PointLight(0xfef08a, 0.9, 9);
      fLight.position.set(roofCenterX + cx, roofDeckH + 1.8, roofCenterZ + cz);
      group.add(fLight);
    });

    // 3rd Floor Rooftop Loot Crates: High-Ground Sniper Crate, Bombs & Medkit
    spawnTreehouseProp('loot_crate', roofCenterX - 1.2, roofDeckH, roofCenterZ - 2.8, 0.3, 'ammo_pack', 'roof-sniper');
    spawnTreehouseProp('loot_crate', roofCenterX + 1.2, roofDeckH, roofCenterZ - 2.8, -0.2, 'bomb_pack', 'roof-bomb');
    spawnTreehouseProp('tech_safe', roofCenterX + 2.8, roofDeckH, roofCenterZ + 1.6, 0.1, 'health_pack', 'roof-medkit');

    // =========================================================================
    // 12. OVERARCHING ANCIENT CATHEDRAL TREE CANOPY (High Overhead Vault)
    // =========================================================================
    // Soaring high above 3rd floor rooftop (Y=12.5m to 17m) to frame the open sky
    const canopyClusters = [
      { x: trunkLocalX, y: roofDeckH + 6.5, z: trunkLocalZ, r: 5.6 },
      { x: trunkLocalX - 3.8, y: roofDeckH + 5.8, z: trunkLocalZ + 3.8, r: 4.6 },
      { x: trunkLocalX + 4.2, y: roofDeckH + 6.0, z: trunkLocalZ - 3.4, r: 4.4 },
      { x: trunkLocalX - 2.8, y: roofDeckH + 5.2, z: trunkLocalZ - 4.5, r: 4.0 },
      { x: trunkLocalX + 4.8, y: roofDeckH + 4.8, z: trunkLocalZ + 4.0, r: 4.2 },
      { x: trunkLocalX - 5.8, y: roofDeckH + 6.2, z: trunkLocalZ - 1.0, r: 4.4 },
      { x: trunkLocalX + 5.5, y: roofDeckH + 5.8, z: trunkLocalZ + 1.8, r: 4.2 }
    ];
    canopyClusters.forEach(cc => {
      const cGeo = new THREE.DodecahedronGeometry(cc.r, 1);
      const foliage = new THREE.Mesh(cGeo, foliageMat);
      foliage.position.set(cc.x, cc.y, cc.z);
      foliage.scale.set(1.0, 0.75, 1.0);
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      group.add(foliage);
    });

    // =========================================================================
    // 13. REGISTER INTERIOR SANCTUARY ZONE
    // =========================================================================
    const cabinWorldCenter = new THREE.Vector3(roomCenterX, deckH, roomCenterZ).applyAxisAngle(yAxis, bRot).add(group.position);
    const doorApproachLocal = new THREE.Vector3(roomCenterX, deckH, roomCenterZ + cabinD / 2 + 1.4);
    const doorInsideLocal = new THREE.Vector3(roomCenterX, deckH, roomCenterZ + cabinD / 2 - 1.2);
    const doorApproachPos = doorApproachLocal.applyAxisAngle(yAxis, bRot).add(group.position);
    const doorInsidePos = doorInsideLocal.applyAxisAngle(yAxis, bRot).add(group.position);

    this.interiorZones.push({
      id: options.id,
      name: options.name,
      center: cabinWorldCenter,
      width: cabinW,
      depth: cabinD,
      height: cabinH,
      rotY: bRot,
      door,
      doorWorldPos: worldDoorPos,
      doorApproachPos,
      doorInsidePos
    });

    return group;
  }

  /**
   * Builds a picturesque botanical orchard garden & wooden pergola pavilion
   * Replaces duplicate treehouse so the Grand Canopy Sanctuary is the sole iconic treehouse in the arena.
   */
  public createOrchardGarden(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    this.arenaGroup.add(group);

    const stoneMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createSidewalkTexture(),
      roughness: 0.88,
      metalness: 0.02
    });

    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.82,
      metalness: 0.05
    });

    const foliageMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createFoliageTexture('#15803d', '#4ade80'),
      roughness: 0.85
    });

    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6, // Blossoming sakura / apple blossom pink
      roughness: 0.7
    });

    // Circular Flagstone Courtyard Terrace
    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.5, 0.08, 16), stoneMat);
    terrace.position.y = 0.04;
    terrace.receiveShadow = true;
    group.add(terrace);

    // Central Timber Pergola Gazebo
    const pergH = 3.2;
    const pergW = 4.4;
    const pergD = 4.4;
    const postGeo = new THREE.BoxGeometry(0.2, pergH, 0.2);

    [
      [-pergW / 2, -pergD / 2],
      [pergW / 2, -pergD / 2],
      [-pergW / 2, pergD / 2],
      [pergW / 2, pergD / 2]
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, timberMat);
      post.position.set(px, pergH / 2, pz);
      post.castShadow = true;
      group.add(post);

      group.updateMatrixWorld(true);
      const postBox = new THREE.Box3().setFromObject(post);
      this.obstacles.push({ mesh: post, box: postBox, isCover: true });
    });

    // Overhead Pergola Trellis Beams
    const beamGeo = new THREE.BoxGeometry(pergW + 0.8, 0.14, 0.12);
    for (let i = 0; i < 5; i++) {
      const bz = -pergD / 2 + (i / 4) * pergD;
      const beam = new THREE.Mesh(beamGeo, timberMat);
      beam.position.set(0, pergH + 0.07, bz);
      beam.castShadow = true;
      group.add(beam);
    }

    // Climbing Ivy / Vines on Pergola Roof
    const vineGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const vines = new THREE.Mesh(vineGeo, foliageMat);
    vines.position.set(0, pergH + 0.4, 0);
    vines.scale.set(1.4, 0.4, 1.4);
    group.add(vines);

    // Carved Stone Sundial / Birdbath in Courtyard Center
    const dialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.9, 8), stoneMat);
    dialBase.position.y = 0.45;
    dialBase.castShadow = true;
    group.add(dialBase);

    const dialTop = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 0.12, 12), stoneMat);
    dialTop.position.y = 0.96;
    group.add(dialTop);

    group.updateMatrixWorld(true);
    const dialBox = new THREE.Box3().setFromObject(dialBase);
    this.obstacles.push({ mesh: dialBase, box: dialBox, isCover: true });

    // Weathered Wooden Garden Benches
    const addOrchardBench = (bx: number, bz: number, brot: number) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, 0, bz);
      bGroup.rotation.y = brot;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.55), timberMat);
      seat.position.y = 0.48;
      seat.castShadow = true;
      bGroup.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.06), timberMat);
      back.position.set(0, 0.82, -0.24);
      back.castShadow = true;
      bGroup.add(back);

      [-0.75, 0.75].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.52), timberMat);
        leg.position.set(lx, 0.24, 0);
        bGroup.add(leg);
      });

      group.add(bGroup);

      group.updateMatrixWorld(true);
      const bBox = new THREE.Box3().setFromObject(seat);
      this.obstacles.push({ mesh: seat, box: bBox, isCover: true });
    };

    addOrchardBench(0, -pergD / 2 + 0.6, 0);
    addOrchardBench(0, pergD / 2 - 0.6, Math.PI);

    // Flowering Apple & Cherry Trees Around the Courtyard
    const orchardTrees: [number, number, number][] = [
      [-5.5, -4.5, 0.95],
      [5.5, -4.5, 1.05],
      [-5.5, 4.5, 1.0],
      [5.5, 4.5, 0.95]
    ];
    orchardTrees.forEach(([tx, tz, sc]) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);

      const tTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * sc, 0.38 * sc, 3.8 * sc, 8),
        new THREE.MeshStandardMaterial({
          map: TextureGenerator.createBarkTexture('#451a03', '#1c0d02'),
          roughness: 0.9
        })
      );
      tTrunk.position.y = (3.8 * sc) / 2;
      tTrunk.castShadow = true;
      treeGroup.add(tTrunk);

      const tFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 * sc, 1), foliageMat);
      tFoliage.position.y = 3.8 * sc + 0.6;
      tFoliage.scale.set(1.0, 0.8, 1.0);
      treeGroup.add(tFoliage);

      const blossoms = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6 * sc, 1), flowerMat);
      blossoms.position.set(0.4, 3.8 * sc + 1.2, 0.3);
      treeGroup.add(blossoms);

      group.add(treeGroup);

      group.updateMatrixWorld(true);
      const tBox = new THREE.Box3().setFromObject(tTrunk);
      this.obstacles.push({ mesh: tTrunk, box: tBox, isCover: true });
    });

    // Garden Pathway Lanterns
    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8), timberMat);
    lanternPost.position.set(0, 1.1, pergD / 2 + 1.6);
    group.add(lanternPost);

    const lLight = new THREE.PointLight(0xfef08a, 1.0, 10);
    lLight.position.set(0, 2.3, pergD / 2 + 1.6);
    group.add(lLight);

    return group;
  }

  /**
   * Builds an authentic residential house with walls, pitched shingle roof, windows, door, porch & chimney
   */
  private createResidentialHouse(
    x: number,
    z: number,
    w: number,
    d: number,
    stories: number,
    wallType: 'brick' | 'siding',
    wallColor: string,
    roofColor: string,
    rotY: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (rotY) group.rotation.y = rotY;

    const wallHeight = stories === 2 ? 6.8 : 4.0;

    // 1. House Body Walls
    const wallTex = wallType === 'brick'
      ? TextureGenerator.createBrickTexture(wallColor, '#cbd5e1')
      : TextureGenerator.createWoodSidingTexture(wallColor);

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.7,
      metalness: 0.1
    });

    const bodyGeo = new THREE.BoxGeometry(w, wallHeight, d);
    const bodyMesh = new THREE.Mesh(bodyGeo, wallMat);
    bodyMesh.position.y = wallHeight / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 2. Realistic Pitched Roof (Triangular Gable Prism)
    const roofHeight = 3.6;
    const roofShingleTex = TextureGenerator.createRoofShingleTexture(roofColor);
    const roofMat = new THREE.MeshStandardMaterial({
      map: roofShingleTex,
      roughness: 0.6,
      metalness: 0.2
    });

    // We build the triangular pitched roof using a 3-sided cylinder or extrusion
    const roofShape = new THREE.Shape();
    const halfW = (w + 0.8) / 2;
    roofShape.moveTo(-halfW, 0);
    roofShape.lineTo(0, roofHeight);
    roofShape.lineTo(halfW, 0);
    roofShape.closePath();

    const extrudeSettings = {
      depth: d + 0.8,
      bevelEnabled: false
    };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    // Center extrusion on Z
    roofGeo.translate(0, 0, -(d + 0.8) / 2);

    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.y = wallHeight;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    group.add(roofMesh);

    // 3. Red Brick Chimney on the roof
    const chimneyGeo = new THREE.BoxGeometry(1.0, roofHeight + 1.2, 1.0);
    const chimneyMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createBrickTexture('#7f1d1d', '#94a3b8'),
      roughness: 0.8
    });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(w * 0.28, wallHeight + roofHeight * 0.65, 0);
    chimney.castShadow = true;
    group.add(chimney);

    // 4. Windows with white frames and reflective glass
    const winGeo = new THREE.PlaneGeometry(1.6, 1.8);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9
    });
    const frameGeo = new THREE.BoxGeometry(1.8, 2.0, 0.1);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    // Front ground floor windows
    [-w * 0.26, w * 0.26].forEach(wx => {
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(wx, 2.0, d / 2 + 0.05);
      group.add(frame);

      const glass = new THREE.Mesh(winGeo, winMat);
      glass.position.set(wx, 2.0, d / 2 + 0.11);
      group.add(glass);

      // Upper floor windows if 2 stories
      if (stories === 2) {
        const frameTop = new THREE.Mesh(frameGeo, frameMat);
        frameTop.position.set(wx, 5.2, d / 2 + 0.05);
        group.add(frameTop);

        const glassTop = new THREE.Mesh(winGeo, winMat);
        glassTop.position.set(wx, 5.2, d / 2 + 0.11);
        group.add(glassTop);
      }
    });

    // 5. Front Entrance Door with Porch Canopy & Steps
    const doorGeo = new THREE.BoxGeometry(1.5, 2.4, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.2, d / 2 + 0.06);
    group.add(door);

    // Porch Overhang Canopy
    const porchCanopyGeo = new THREE.BoxGeometry(2.4, 0.25, 1.4);
    const porchCanopy = new THREE.Mesh(porchCanopyGeo, roofMat);
    porchCanopy.position.set(0, 2.6, d / 2 + 0.7);
    porchCanopy.castShadow = true;
    group.add(porchCanopy);

    // Porch Step
    const porchStepGeo = new THREE.BoxGeometry(2.6, 0.25, 1.2);
    const porchStep = new THREE.Mesh(porchStepGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    porchStep.position.set(0, 0.12, d / 2 + 0.6);
    porchStep.receiveShadow = true;
    group.add(porchStep);

    this.arenaGroup.add(group);

    // Register full house bounding box as impassable obstacle
    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({ mesh: group, box, isCover: false });
  }

  /**
   * Builds an urban multi-story commercial / apartment building with storefront, awning & rooftop water tower
   */
  private createUrbanBuilding(
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    _style: string,
    signText: string,
    awningColor: string,
    rotY: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (rotY) group.rotation.y = rotY;

    // 1. Building Body with Window Grid Facade
    const facadeTex = TextureGenerator.createWindowFacadeTexture('#1e293b');
    facadeTex.repeat.set(1, Math.round(h / 4));
    const buildingMat = new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.45,
      metalness: 0.2
    });

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMesh = new THREE.Mesh(bodyGeo, buildingMat);
    bodyMesh.position.y = h / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 2. Ground Floor Commercial Storefront with Display Glass
    const storeGeo = new THREE.BoxGeometry(w * 0.92, 3.6, 0.3);
    const storeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9
    });
    const storeFront = new THREE.Mesh(storeGeo, storeMat);
    storeFront.position.set(0, 1.8, d / 2 + 0.1);
    group.add(storeFront);

    // Storefront Colorful Fabric Awning
    const awningGeo = new THREE.BoxGeometry(w * 0.94, 0.4, 2.0);
    const awningMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(awningColor),
      roughness: 0.8
    });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 3.8, d / 2 + 1.0);
    awning.rotation.x = 0.2;
    awning.castShadow = true;
    group.add(awning);

    // Storefront Signboard
    const signGeo = new THREE.BoxGeometry(w * 0.65, 0.9, 0.2);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 4.6, d / 2 + 0.15);
    group.add(sign);

    // 3. Rooftop Details: Parapet Wall, Water Tower & HVAC Unit
    // Parapet safety wall around roof
    const parapetGeo = new THREE.BoxGeometry(w, 0.9, d);
    const parapetMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const parapet = new THREE.Mesh(parapetGeo, parapetMat);
    parapet.position.y = h + 0.45;
    group.add(parapet);

    // Classic Cylindrical Rooftop Water Tower on 4 stilted steel legs
    const waterTowerGroup = new THREE.Group();
    waterTowerGroup.position.set(w * 0.25, h, d * 0.25);

    const tankGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.8, 16);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 }); // Weathered wood
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 3.6;
    tank.castShadow = true;
    waterTowerGroup.add(tank);

    // Conical tank roof
    const coneGeo = new THREE.ConeGeometry(1.8, 1.2, 16);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 5.6;
    waterTowerGroup.add(cone);

    // 4 Steel Legs
    [-1.2, 1.2].forEach(lx => {
      [-1.2, 1.2].forEach(lz => {
        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8);
        const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
        leg.position.set(lx, 1.2, lz);
        waterTowerGroup.add(leg);
      });
    });
    group.add(waterTowerGroup);

    // Rooftop HVAC Condenser Air Unit
    const hvacGeo = new THREE.BoxGeometry(2.4, 1.4, 2.0);
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 });
    const hvac = new THREE.Mesh(hvacGeo, hvacMat);
    hvac.position.set(-w * 0.25, h + 0.7, -d * 0.2);
    hvac.castShadow = true;
    group.add(hvac);

    this.arenaGroup.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({ mesh: group, box, isCover: false });
  }

  /**
   * Builds traditional desert adobe village houses with rooftop terraces, wooden vigas & archways
   */
  private createDesertAdobeHouse(
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    hasTerrace: boolean,
    rotY: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (rotY) group.rotation.y = rotY;

    // Adobe textured walls
    const adobeTex = TextureGenerator.createAdobeTexture();
    const adobeMat = new THREE.MeshStandardMaterial({
      map: adobeTex,
      roughness: 0.9,
      metalness: 0.05
    });

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, adobeMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Rooftop parapet with battlements
    const parapetGeo = new THREE.BoxGeometry(w + 0.2, 0.7, d + 0.2);
    const parapet = new THREE.Mesh(parapetGeo, adobeMat);
    parapet.position.y = h + 0.35;
    group.add(parapet);

    // Exposed Wooden Vigas (Ceiling support logs protruding from walls)
    const logMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    for (let lx = -w / 2 + 1.2; lx <= w / 2 - 1.2; lx += 1.8) {
      const logGeo = new THREE.CylinderGeometry(0.12, 0.12, d + 1.2, 8);
      logGeo.rotateX(Math.PI / 2);
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.set(lx, h - 0.5, 0);
      log.castShadow = true;
      group.add(log);
    }

    // Arched Entrance Doorway
    const doorGeo = new THREE.BoxGeometry(1.6, 2.4, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.2, d / 2 + 0.05);
    group.add(door);

    // Small Shuttered Desert Windows
    [-w * 0.28, w * 0.28].forEach(wx => {
      const winGeo = new THREE.BoxGeometry(1.2, 1.2, 0.2);
      const win = new THREE.Mesh(winGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      win.position.set(wx, 2.2, d / 2 + 0.05);
      group.add(win);
    });

    // Rooftop Sun Shade Fabric Canopy if terrace enabled
    if (hasTerrace) {
      const canopyGeo = new THREE.BoxGeometry(w * 0.6, 0.15, d * 0.5);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, h + 2.5, 0);
      canopy.castShadow = true;
      group.add(canopy);

      // 4 wooden poles supporting canopy
      [-w * 0.28, w * 0.28].forEach(px => {
        [-d * 0.22, d * 0.22].forEach(pz => {
          const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8);
          const pole = new THREE.Mesh(poleGeo, logMat);
          pole.position.set(px, h + 1.25, pz);
          group.add(pole);
        });
      });
    }

    this.arenaGroup.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({ mesh: group, box, isCover: false });
  }

  /**
   * Builds an authentic corrugated metal industrial warehouse
   */
  private createWarehouse(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    metalColor: string,
    rotY: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (rotY) group.rotation.y = rotY;

    // Corrugated metal walls
    const metalTex = TextureGenerator.createCorrugatedMetalTexture(metalColor);
    const metalMat = new THREE.MeshStandardMaterial({
      map: metalTex,
      roughness: 0.5,
      metalness: 0.7
    });

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, metalMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Pitched metal roof
    const roofH = 2.8;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-(w + 0.6) / 2, 0);
    roofShape.lineTo(0, roofH);
    roofShape.lineTo((w + 0.6) / 2, 0);
    roofShape.closePath();

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.6, bevelEnabled: false });
    roofGeo.translate(0, 0, -(d + 0.6) / 2);
    const roof = new THREE.Mesh(roofGeo, metalMat);
    roof.position.y = h;
    roof.castShadow = true;
    group.add(roof);

    // Roll-up industrial garage bay doors
    const bayGeo = new THREE.BoxGeometry(4.8, 4.2, 0.2);
    const bayMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.8 });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(0, 2.1, d / 2 + 0.05);
    group.add(bay);

    this.arenaGroup.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({ mesh: group, box, isCover: false });
  }

  /**
   * Builds a real parked car (sedan/SUV) for authentic street tactical cover
   */
  private createParkedCar(x: number, z: number, rotY: number, bodyColor: number) {
    const carGroup = new THREE.Group();
    carGroup.position.set(x, 0, z);
    if (rotY) carGroup.rotation.y = rotY;

    const paintMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.2,
      metalness: 0.7
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.95
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
      metalness: 0.1
    });

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(2.0, 0.65, 4.5);
    const chassis = new THREE.Mesh(chassisGeo, paintMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // 2. Cabin & Windshield
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.65, 2.5);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Cabin roof
    const carRoofGeo = new THREE.BoxGeometry(1.82, 0.08, 2.3);
    const carRoof = new THREE.Mesh(carRoofGeo, paintMat);
    carRoof.position.set(0, 1.5, -0.2);
    carGroup.add(carRoof);

    // 3. Four Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    [
      { x: -1.0, z: 1.4 },
      { x: 1.0, z: 1.4 },
      { x: -1.0, z: -1.4 },
      { x: 1.0, z: -1.4 }
    ].forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, rubberMat);
      wheel.position.set(pos.x, 0.35, pos.z);
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    // Headlights and Taillights
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headMat);
    hl1.position.set(-0.65, 0.65, 2.26);
    carGroup.add(hl1);

    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headMat);
    hl2.position.set(0.65, 0.65, 2.26);
    carGroup.add(hl2);

    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), tailMat);
    tl1.position.set(-0.65, 0.65, -2.26);
    carGroup.add(tl1);

    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), tailMat);
    tl2.position.set(0.65, 0.65, -2.26);
    carGroup.add(tl2);

    this.arenaGroup.add(carGroup);

    const box = new THREE.Box3().setFromObject(carGroup);
    this.obstacles.push({ mesh: carGroup, box, isCover: true });
  }

  /**
   * Builds an intermodal cargo shipping container
   */
  private createShippingContainer(x: number, y: number, z: number, color: number, rotY: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    if (rotY) group.rotation.y = rotY;

    const contGeo = new THREE.BoxGeometry(2.4, 2.6, 6.0);
    const contMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.45,
      metalness: 0.65
    });
    const cont = new THREE.Mesh(contGeo, contMat);
    cont.position.y = 1.3;
    cont.castShadow = true;
    cont.receiveShadow = true;
    group.add(cont);

    this.arenaGroup.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({ mesh: group, box, isCover: true });
  }

  /**
   * Builds waist-high garden fence / stone wall cover
   */
  private createGardenFence(x: number, z: number, length: number, rotY: number, fenceColor: number = 0xf8fafc) {
    const geo = new THREE.BoxGeometry(length, 1.15, 0.25);
    const mat = new THREE.MeshStandardMaterial({ color: fenceColor, roughness: 0.7 });
    const fence = new THREE.Mesh(geo, mat);
    fence.position.set(x, 1.15 / 2, z);
    if (rotY) fence.rotation.y = rotY;
    fence.castShadow = true;
    fence.receiveShadow = true;
    this.arenaGroup.add(fence);

    const box = new THREE.Box3().setFromObject(fence);
    this.obstacles.push({ mesh: fence, box, isCover: true });
  }

  /**
   * Street Concrete Barrier
   */
  private createConcreteBarrier(x: number, z: number, length: number, rotY: number) {
    const geo = new THREE.BoxGeometry(length, 1.1, 0.6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.8 });
    const barrier = new THREE.Mesh(geo, mat);
    barrier.position.set(x, 0.55, z);
    if (rotY) barrier.rotation.y = rotY;
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    this.arenaGroup.add(barrier);

    const box = new THREE.Box3().setFromObject(barrier);
    this.obstacles.push({ mesh: barrier, box, isCover: true });
  }

  /**
   * Industrial storage silo tank
   */
  private createStorageSilo(x: number, z: number, radius: number, height: number) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 24);
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 });
    const silo = new THREE.Mesh(geo, mat);
    silo.position.set(x, height / 2, z);
    silo.castShadow = true;
    silo.receiveShadow = true;
    this.arenaGroup.add(silo);

    const box = new THREE.Box3().setFromObject(silo);
    this.obstacles.push({ mesh: silo, box, isCover: false });
  }

  /**
   * Desert Stone Water Well
   */
  private createDesertWell(x: number, z: number) {
    const wellGeo = new THREE.CylinderGeometry(2.0, 2.0, 1.2, 16);
    const wellMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
    const well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set(x, 0.6, z);
    well.castShadow = true;
    this.arenaGroup.add(well);

    const box = new THREE.Box3().setFromObject(well);
    this.obstacles.push({ mesh: well, box, isCover: true });
  }

  /**
   * Stack of Wooden Cargo Crates
   */
  private createWoodenCrateStack(x: number, z: number, count: number) {
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 });
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
      const crate = new THREE.Mesh(geo, crateMat);
      crate.position.set(x + (i > 1 ? 0.8 : 0), 0.7 + (i === 1 ? 1.4 : 0), z + (i > 1 ? 0.8 : 0));
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.arenaGroup.add(crate);

      const box = new THREE.Box3().setFromObject(crate);
      this.obstacles.push({ mesh: crate, box, isCover: true });
    }
  }

  /**
   * Real Urban Streetlight Pole with Lamp Fixture
   */
  private createStreetlight(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 5.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.75;
    group.add(pole);

    // Lamp Arm
    const armGeo = new THREE.BoxGeometry(1.4, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0.6, 5.4, 0);
    group.add(arm);

    // Lamp Fixture
    const lampGeo = new THREE.BoxGeometry(0.5, 0.2, 0.35);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(1.2, 5.3, 0);
    group.add(lamp);

    this.arenaGroup.add(group);
  }

  /**
   * Fire Hydrant
   */
  private createFireHydrant(x: number, z: number) {
    const geo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const hydrant = new THREE.Mesh(geo, mat);
    hydrant.position.set(x, 0.4, z);
    hydrant.castShadow = true;
    this.arenaGroup.add(hydrant);

    const box = new THREE.Box3().setFromObject(hydrant);
    this.obstacles.push({ mesh: hydrant, box, isCover: true });
  }

  /**
   * Green Trash Dumpster with Lift Lid
   */
  private createDumpster(x: number, z: number, rotY: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (rotY) group.rotation.y = rotY;

    const geo = new THREE.BoxGeometry(2.2, 1.4, 1.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    const lidGeo = new THREE.BoxGeometry(2.3, 0.1, 1.5);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x14532d });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 1.45;
    group.add(lid);

    this.arenaGroup.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({ mesh: group, box, isCover: true });
  }

  /**
   * Seamless 4-way asphalt street system with vector-sharp procedural markings
   * Zero overlapping geometry (no Z-fighting), stops cleanly before outer buildings
   */
  private createStreetSystem(streetWidth: number = 12, avenueReach?: number) {
    const half = this.arenaSize / 2;
    const reach = avenueReach ?? (half - 0.5);
    const iHalf = streetWidth / 2;
    const armLength = Math.max(2, reach - iHalf);

    const roadTex = TextureGenerator.createAsphaltRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.72,
      metalness: 0.08
    });

    // 1. Center Intersection [-iHalf, iHalf] (covers the 4-way intersection without double drawing)
    const centerGeo = new THREE.PlaneGeometry(streetWidth, streetWidth);
    centerGeo.rotateX(-Math.PI / 2);
    const centerMesh = new THREE.Mesh(centerGeo, roadMat);
    centerMesh.position.set(0, 0.02, 0);
    centerMesh.receiveShadow = true;
    this.arenaGroup.add(centerMesh);

    // 2. North Street Arm (runs from -reach to -iHalf, stopping cleanly before North building)
    const roadNorthGeo = new THREE.PlaneGeometry(streetWidth, armLength);
    roadNorthGeo.rotateX(-Math.PI / 2);
    const roadNorth = new THREE.Mesh(roadNorthGeo, roadMat);
    roadNorth.position.set(0, 0.02, -(iHalf + armLength / 2));
    roadNorth.receiveShadow = true;
    this.arenaGroup.add(roadNorth);

    // 3. South Street Arm (runs from iHalf to reach, stopping cleanly before South building)
    const roadSouthGeo = new THREE.PlaneGeometry(streetWidth, armLength);
    roadSouthGeo.rotateX(-Math.PI / 2);
    const roadSouth = new THREE.Mesh(roadSouthGeo, roadMat);
    roadSouth.position.set(0, 0.02, iHalf + armLength / 2);
    roadSouth.receiveShadow = true;
    this.arenaGroup.add(roadSouth);

    // 4. West Street Arm (runs from -reach to -iHalf, stopping cleanly before West building)
    const roadWestGeo = new THREE.PlaneGeometry(armLength, streetWidth);
    roadWestGeo.rotateX(-Math.PI / 2);
    const roadWest = new THREE.Mesh(roadWestGeo, roadMat);
    roadWest.position.set(-(iHalf + armLength / 2), 0.02, 0);
    roadWest.receiveShadow = true;
    this.arenaGroup.add(roadWest);

    // 5. East Street Arm (runs from iHalf to reach, stopping cleanly before East building)
    const roadEastGeo = new THREE.PlaneGeometry(armLength, streetWidth);
    roadEastGeo.rotateX(-Math.PI / 2);
    const roadEast = new THREE.Mesh(roadEastGeo, roadMat);
    roadEast.position.set(iHalf + armLength / 2, 0.02, 0);
    roadEast.receiveShadow = true;
    this.arenaGroup.add(roadEast);

    // --- CRISP PROCEDURAL ROAD MARKINGS (at y = 0.026, slightly above asphalt) ---
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.45,
      metalness: 0.02
    });

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.02
    });

    const markGroup = new THREE.Group();
    markGroup.position.y = 0.026;

    // Helper: add stripe
    const addStripe = (w: number, d: number, x: number, z: number, mat: THREE.Material) => {
      const geo = new THREE.PlaneGeometry(w, d);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0, z);
      mesh.receiveShadow = false;
      markGroup.add(mesh);
    };

    // A. Yellow Double Center Lines along each street segment (stops before crosswalks and terminates before reach)
    const crosswalkClearance = 3.6;
    const stripeDist = Math.max(1, (reach - 1.2) - (iHalf + crosswalkClearance));
    const centerDist = iHalf + crosswalkClearance + stripeDist / 2;
    const lineWidth = 0.14;
    const lineGap = 0.14;

    // North & South yellow double lines
    [-lineGap, lineGap].forEach(offsetX => {
      addStripe(lineWidth, stripeDist, offsetX, -centerDist, yellowMat);
      addStripe(lineWidth, stripeDist, offsetX, centerDist, yellowMat);
    });

    // West & East yellow double lines
    [-lineGap, lineGap].forEach(offsetZ => {
      addStripe(stripeDist, lineWidth, -centerDist, offsetZ, yellowMat);
      addStripe(stripeDist, lineWidth, centerDist, offsetZ, yellowMat);
    });

    // B. Stop Lines right before entering the intersection
    const stopLineWidth = 0.45;
    const stopLineLength = streetWidth - 1.2;
    addStripe(stopLineLength, stopLineWidth, 0, -(iHalf + 0.5), whiteMat);
    addStripe(stopLineLength, stopLineWidth, 0, iHalf + 0.5, whiteMat);
    addStripe(stopLineWidth, stopLineLength, -(iHalf + 0.5), 0, whiteMat);
    addStripe(stopLineWidth, stopLineLength, iHalf + 0.5, 0, whiteMat);

    // C. Pedestrian Zebra Crosswalks (4 crosswalks at each intersection mouth)
    const zebraNum = 7;
    const zebraW = 0.55;
    const zebraL = 2.4;
    const zebraSpacing = 0.45;
    const zebraStart = -((zebraNum - 1) * (zebraW + zebraSpacing)) / 2;

    for (let i = 0; i < zebraNum; i++) {
      const offset = zebraStart + i * (zebraW + zebraSpacing);
      // North Crosswalk
      addStripe(zebraW, zebraL, offset, -(iHalf + 2.0), whiteMat);
      // South Crosswalk
      addStripe(zebraW, zebraL, offset, iHalf + 2.0, whiteMat);
      // West Crosswalk
      addStripe(zebraL, zebraW, -(iHalf + 2.0), offset, whiteMat);
      // East Crosswalk
      addStripe(zebraL, zebraW, iHalf + 2.0, offset, whiteMat);
    }

    this.arenaGroup.add(markGroup);
  }

  /**
   * Concrete Sidewalk Borders lining the streets, strictly terminating outside outer buildings
   */
  private createSidewalkBorder(streetWidth: number = 12, avenueReach?: number) {
    const sidewalkTex = TextureGenerator.createSidewalkTexture();
    const mat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.6 });
    const offset = streetWidth / 2 + 0.8;
    const half = this.arenaSize / 2;
    const reach = avenueReach ?? (half - 0.5);
    const armLen = Math.max(2, reach - streetWidth / 2);
    const centerArm = (streetWidth / 2 + reach) / 2;

    // 4 Corner Sidewalk Strips terminating outside building entrances
    [
      { x: -centerArm, z: -offset, w: armLen, d: 1.6 },
      { x: centerArm, z: -offset, w: armLen, d: 1.6 },
      { x: -centerArm, z: offset, w: armLen, d: 1.6 },
      { x: centerArm, z: offset, w: armLen, d: 1.6 },
      { x: -offset, z: -centerArm, w: 1.6, d: armLen },
      { x: offset, z: -centerArm, w: 1.6, d: armLen },
      { x: -offset, z: centerArm, w: 1.6, d: armLen },
      { x: offset, z: centerArm, w: 1.6, d: armLen }
    ].forEach(s => {
      const geo = new THREE.BoxGeometry(s.w, 0.16, s.d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(s.x, 0.08, s.z);
      mesh.receiveShadow = true;
      this.arenaGroup.add(mesh);
    });
  }

  /**
   * Realistic Perimeter Boundary Walls
   */
  private createRealBoundaryWalls(color: number, wallStyle: 'stone' | 'concrete' | 'adobe' | 'fence') {
    const half = this.arenaSize / 2;
    const height = wallStyle === 'fence' ? 4.5 : 6.0;
    const thickness = 1.8;

    let mat: THREE.Material;
    if (wallStyle === 'adobe') {
      mat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createAdobeTexture(),
        roughness: 0.9
      });
    } else if (wallStyle === 'concrete') {
      mat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createBrickTexture('#475569', '#94a3b8'),
        roughness: 0.7
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.75,
        metalness: 0.1
      });
    }

    const walls = [
      { x: 0, z: -half, w: this.arenaSize, d: thickness },
      { x: 0, z: half, w: this.arenaSize, d: thickness },
      { x: -half, z: 0, w: thickness, d: this.arenaSize },
      { x: half, z: 0, w: thickness, d: this.arenaSize }
    ];

    walls.forEach(w => {
      const geo = new THREE.BoxGeometry(w.w, height, w.d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(w.x, height / 2, w.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.arenaGroup.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, box, isCover: false });
    });
  }

  /**
   * Red Hazard Explosive Barrel
   */
  private addExplosiveBarrel(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Warning Red Steel Drum
    const drumGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.35, 20);
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.6
    });
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.y = 0.68;
    drum.castShadow = true;
    drum.receiveShadow = true;
    group.add(drum);

    // Yellow Hazard Stripe
    const stripeGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.32, 20);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.68;
    group.add(stripe);

    this.arenaGroup.add(group);

    this.explosiveBarrels.push({
      mesh: group,
      position: new THREE.Vector3(x, y + 0.68, z),
      radius: 8.5,
      damage: 195,
      exploded: false
    });
  }

  /**
   * Tactical Enemy & Player Spawn Points situated safely on open streets, avenues, and clear ground (Y = 0)
   */
  private addSpawnPoints() {
    this.spawnPoints = [
      // Central crossroads
      { position: new THREE.Vector3(0, 0, 18), name: 'South Boulevard' },
      { position: new THREE.Vector3(0, 0, -18), name: 'North Boulevard' },
      { position: new THREE.Vector3(-18, 0, 0), name: 'West Avenue' },
      { position: new THREE.Vector3(18, 0, 0), name: 'East Avenue' },
      // Mid streets
      { position: new THREE.Vector3(-12, 0, 12), name: 'South-West Crossing' },
      { position: new THREE.Vector3(12, 0, -12), name: 'North-East Crossing' },
      { position: new THREE.Vector3(12, 0, 12), name: 'South-East Crossing' },
      { position: new THREE.Vector3(-12, 0, -12), name: 'North-West Crossing' },
      // Expanded outer sector spawn points (130m perimeter coverage)
      { position: new THREE.Vector3(0, 0, 36), name: 'Far South Gate' },
      { position: new THREE.Vector3(0, 0, -36), name: 'Far North Gate' },
      { position: new THREE.Vector3(-36, 0, 0), name: 'Far West District' },
      { position: new THREE.Vector3(36, 0, 0), name: 'Far East District' },
      { position: new THREE.Vector3(-35, 0, 35), name: 'Outer South-West Sector' },
      { position: new THREE.Vector3(35, 0, -35), name: 'Outer North-East Sector' },
      { position: new THREE.Vector3(35, 0, 35), name: 'Outer South-East Sector' },
      { position: new THREE.Vector3(-35, 0, -35), name: 'Outer North-West Sector' }
    ];
  }

  public getValidSpawnPoint(playerPos: THREE.Vector3): THREE.Vector3 {
    const valid = this.spawnPoints.filter(p => p.position.distanceTo(playerPos) > 10);
    const pool = valid.length > 0 ? valid : this.spawnPoints;

    const boxSize = new THREE.Vector3(1.0, 1.8, 1.0);
    const testBox = new THREE.Box3();

    // Verify candidate position against obstacle collision boxes
    for (let attempts = 0; attempts < 15; attempts++) {
      const choice = pool[Math.floor(Math.random() * pool.length)].position.clone();
      choice.x += (Math.random() - 0.5) * 2;
      choice.z += (Math.random() - 0.5) * 2;
      choice.y = 0; // Ground floor elevation

      testBox.setFromCenterAndSize(
        new THREE.Vector3(choice.x, 0.9, choice.z),
        boxSize
      );

      let collides = false;
      for (const obs of this.obstacles) {
        if (obs.box.intersectsBox(testBox)) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        return choice;
      }
    }

    // Guaranteed safe default on open asphalt street
    return new THREE.Vector3(0, 0, 12);
  }
}
