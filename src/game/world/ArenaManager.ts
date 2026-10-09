import * as THREE from 'three';
import { ArenaId, GraphicsQuality } from '../../types/game';
import { TextureGenerator } from './TextureGenerator';
import { soundManager } from '../../audio/SoundManager';
import { DestructibleProp, DestructibleType, LootType } from '../entities/DestructibleProp';

export interface ArenaObstacle {
  mesh: THREE.Mesh | THREE.Group;
  box: THREE.Box3;
  isCover: boolean;
}

export interface InteriorZone {
  id: string;
  name: string;
  center: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  rotY: number;
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
    const halfT = 0.35;
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

  public isPositionInsideBuilding(pos: THREE.Vector3): boolean {
    for (let i = 0; i < this.interiorZones.length; i++) {
      const z = this.interiorZones[i];
      const local = new THREE.Vector3().subVectors(pos, z.center);
      if (z.rotY) {
        local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -z.rotY);
      }
      const halfW = (z.width - 0.7) / 2;
      const halfD = (z.depth - 0.7) / 2;
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
      const local = new THREE.Vector3().subVectors(pos, z.center);
      if (z.rotY) {
        local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -z.rotY);
      }
      const halfW = (z.width - 0.7) / 2;
      const halfD = (z.depth - 0.7) / 2;
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
    this.createStreetSystem(12);

    // Concrete Sidewalks bordering the streets
    this.createSidewalkBorder(12);

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
    this.addExplosiveBarrel(14, 0, -34);

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
    this.createStreetSystem(14);
    this.createSidewalkBorder(14);

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
    this.addExplosiveBarrel(-9, 0, 34);
    this.addExplosiveBarrel(9, 0, -34);

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
    this.addExplosiveBarrel(-4, 0, 32);
    this.addExplosiveBarrel(4, 0, -32);

    this.createRealBoundaryWalls(0x334155, 'fence');

    this.addSpawnPoints();
  }

  // =========================================================================
  // REAL ARCHITECTURAL BUILDERS: HOUSES, BUILDINGS & STREET COVER
  // =========================================================================

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
    const wallThick = 0.35;
    const doorW = 2.0;
    const doorH = 2.7;

    // 1. Interior Floor
    let floorTex: THREE.Texture;
    if (options.interiorFloorType === 'wood') {
      floorTex = TextureGenerator.createWoodParquetFloorTexture();
    } else if (options.interiorFloorType === 'tile') {
      floorTex = TextureGenerator.createFloorTileTexture('#e2e8f0', '#94a3b8');
    } else {
      floorTex = TextureGenerator.createSidewalkTexture();
    }
    const floorGeo = new THREE.BoxGeometry(w - 0.2, 0.15, d - 0.2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.5,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0.08, 0);
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
      metalness: options.wallType === 'metal' ? 0.45 : 0.1
    });

    // 3. Perimeter Walls with Doorway Cutout on Front (+Z face)
    const wallMeshes: THREE.Mesh[] = [];

    // Back Wall (-Z)
    const backGeo = new THREE.BoxGeometry(w, wallH, wallThick);
    const backMesh = new THREE.Mesh(backGeo, wallMat);
    backMesh.position.set(0, wallH / 2, -d / 2 + wallThick / 2);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    group.add(backMesh);
    wallMeshes.push(backMesh);

    // Left Wall (-X)
    const leftGeo = new THREE.BoxGeometry(wallThick, wallH, d - wallThick * 2);
    const leftMesh = new THREE.Mesh(leftGeo, wallMat);
    leftMesh.position.set(-w / 2 + wallThick / 2, wallH / 2, 0);
    leftMesh.castShadow = true;
    leftMesh.receiveShadow = true;
    group.add(leftMesh);
    wallMeshes.push(leftMesh);

    // Right Wall (+X)
    const rightGeo = new THREE.BoxGeometry(wallThick, wallH, d - wallThick * 2);
    const rightMesh = new THREE.Mesh(rightGeo, wallMat);
    rightMesh.position.set(w / 2 - wallThick / 2, wallH / 2, 0);
    rightMesh.castShadow = true;
    rightMesh.receiveShadow = true;
    group.add(rightMesh);
    wallMeshes.push(rightMesh);

    // Front Left Wall Panel (+Z, left of doorway)
    const panelW = (w - doorW) / 2;
    const frontLGeo = new THREE.BoxGeometry(panelW, wallH, wallThick);
    const frontLMesh = new THREE.Mesh(frontLGeo, wallMat);
    frontLMesh.position.set(-w / 2 + panelW / 2, wallH / 2, d / 2 - wallThick / 2);
    frontLMesh.castShadow = true;
    frontLMesh.receiveShadow = true;
    group.add(frontLMesh);
    wallMeshes.push(frontLMesh);

    // Front Right Wall Panel (+Z, right of doorway)
    const frontRGeo = new THREE.BoxGeometry(panelW, wallH, wallThick);
    const frontRMesh = new THREE.Mesh(frontRGeo, wallMat);
    frontRMesh.position.set(w / 2 - panelW / 2, wallH / 2, d / 2 - wallThick / 2);
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

    // 4. Door Frame
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

    // 5. Interactive Door (with hinge pivot, Box3 obstacle, smooth swing & audio)
    const localDoorPos = new THREE.Vector3(0, 0, d / 2 - wallThick / 2);
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

    // 6. Ceiling Slab
    const ceilingGeo = new THREE.BoxGeometry(w + 0.3, 0.2, d + 0.3);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.set(0, wallH + 0.1, 0);
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    // 7. Roof Styling
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

      // Red brick chimney
      const chimneyGeo = new THREE.BoxGeometry(1.0, roofH + 1.2, 1.0);
      const chimneyMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator.createBrickTexture('#7f1d1d', '#94a3b8'),
        roughness: 0.8
      });
      const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
      chimney.position.set(w * 0.28, wallH + roofH * 0.65, 0);
      chimney.castShadow = true;
      group.add(chimney);
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
      // Flat roof with parapet railing + AC unit
      const parapetGeo = new THREE.BoxGeometry(w + 0.3, 0.6, 0.2);
      const parapetMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
      const pFront = new THREE.Mesh(parapetGeo, parapetMat);
      pFront.position.set(0, wallH + 0.5, d / 2);
      group.add(pFront);
      const pBack = new THREE.Mesh(parapetGeo, parapetMat);
      pBack.position.set(0, wallH + 0.5, -d / 2);
      group.add(pBack);

      // Rooftop AC unit
      const acGeo = new THREE.BoxGeometry(2.0, 1.2, 1.8);
      const acMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 });
      const ac = new THREE.Mesh(acGeo, acMat);
      ac.position.set(w * 0.2, wallH + 0.8, -d * 0.15);
      group.add(ac);
    }

    // 8. Interior Illumination
    const fixtureGeo = new THREE.BoxGeometry(1.6, 0.08, 0.8);
    const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(0, wallH - 0.04, 0);
    group.add(fixture);

    const lightColor = options.wallType === 'adobe' ? 0xfef08a : options.doorTheme === 'glass' ? 0xbae6fd : 0xffedd5;
    const interiorLight = new THREE.PointLight(lightColor, 1.35, 14);
    interiorLight.position.set(0, wallH - 0.35, 0);
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
    // Executive desk / dispatch terminal table against back interior wall
    const deskGeo = new THREE.BoxGeometry(2.4, 0.9, 1.1);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.6 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0.45, -d / 2 + 1.3);
    desk.castShadow = true;
    desk.receiveShadow = true;
    group.add(desk);

    group.updateMatrixWorld(true);
    const deskBox = new THREE.Box3().setFromObject(desk);
    this.obstacles.push({ mesh: desk, box: deskBox, isCover: true });

    // Register Interior Sanctuary Zone for immunity & safe room detection
    this.interiorZones.push({
      id: options.id,
      name: options.name,
      center: new THREE.Vector3(options.x, 0, options.z),
      width: w,
      depth: d,
      height: wallH,
      rotY: options.rotY || 0
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
    spawnBuildingProp('clay_pot', 0.5, 0.9, -d / 2 + 1.3, 0, 'coin_pack', 'pot-1');

    // Prop 2: Wooden Loot Crate in back-left corner (drops medkit health pack)
    spawnBuildingProp('loot_crate', -w / 2 + 1.25, 0, -d / 2 + 1.25, 0.1, 'health_pack', 'crate-1');

    // Prop 3: Tactical Ammo Crate along side wall (drops ammo pack)
    spawnBuildingProp('loot_crate', -w / 2 + 1.25, 0, -d / 2 + 2.5, -0.15, 'ammo_pack', 'crate-2');

    // Prop 4: Armored Tech Safe in back-right corner (drops body armor pack)
    spawnBuildingProp('tech_safe', w / 2 - 1.25, 0, -d / 2 + 1.25, -Math.PI / 4, 'armor_pack', 'safe-1');

    // Prop 5: Extra Clay Pot near front corner (drops coins)
    spawnBuildingProp('clay_pot', w / 2 - 1.25, 0, d / 2 - 1.6, 0.4, 'coin_pack', 'pot-2');

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
   * Zero overlapping geometry (no Z-fighting) and realistic road markings
   */
  private createStreetSystem(streetWidth: number = 12) {
    const half = this.arenaSize / 2;
    const iHalf = streetWidth / 2;
    const armLength = half - iHalf;

    const roadTex = TextureGenerator.createAsphaltRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.72,
      metalness: 0.08
    });

    // 1. North-South Continuous Street (covers center intersection [-iHalf, iHalf])
    const roadZGeo = new THREE.PlaneGeometry(streetWidth, this.arenaSize);
    roadZGeo.rotateX(-Math.PI / 2);
    const roadZ = new THREE.Mesh(roadZGeo, roadMat);
    roadZ.position.set(0, 0.02, 0);
    roadZ.receiveShadow = true;
    this.arenaGroup.add(roadZ);

    // 2. West Street Arm (runs from -half to -iHalf, no overlap with center)
    const roadWestGeo = new THREE.PlaneGeometry(armLength, streetWidth);
    roadWestGeo.rotateX(-Math.PI / 2);
    const roadWest = new THREE.Mesh(roadWestGeo, roadMat);
    roadWest.position.set(-(iHalf + armLength / 2), 0.02, 0);
    roadWest.receiveShadow = true;
    this.arenaGroup.add(roadWest);

    // 3. East Street Arm (runs from iHalf to half, no overlap with center)
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

    // A. Yellow Double Center Lines along each street segment (stops before crosswalks)
    const crosswalkClearance = 3.6;
    const stripeDist = half - (iHalf + crosswalkClearance);
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
   * Concrete Sidewalk Borders lining the streets
   */
  private createSidewalkBorder(streetWidth: number = 12) {
    const sidewalkTex = TextureGenerator.createSidewalkTexture();
    const mat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.6 });
    const offset = streetWidth / 2 + 0.8;
    const half = this.arenaSize / 2;
    const armLen = half - streetWidth / 2;
    const centerArm = (streetWidth / 2 + half) / 2;

    // 4 Corner Sidewalk Strips
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
