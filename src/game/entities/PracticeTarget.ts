import * as THREE from 'three';

export class PracticeTarget {
  public id: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3 = new THREE.Vector3();
  public health: number = 60;
  public maxHealth: number = 60;
  public isDead: boolean = false;

  // Bullseye meshes for critical hit calculation
  public bullseyeMesh!: THREE.Mesh;
  public headTargetMesh!: THREE.Mesh;

  // Kinetic wobble physics
  private boardGroup: THREE.Group;
  private wobbleAngle: number = 0;

  // Visual damage flash
  private hitFlashTimer: number = 0;
  private originalMaterials: Map<THREE.Mesh, THREE.Material> = new Map();
  private flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Floating Health Bar
  private healthBarMesh: THREE.Mesh;
  private healthBarBg: THREE.Mesh;

  // Moving target behavior (optional per target)
  public isMoving: boolean = false;
  private moveTimer: number = 0;
  private moveSpeed: number = 1.8;
  private moveRange: number = 4.0;
  private initialX: number = 0;

  constructor(id: string, spawnPos: THREE.Vector3, isMoving: boolean = false) {
    this.id = id;
    this.position.copy(spawnPos);
    this.initialX = spawnPos.x;
    this.isMoving = isMoving;
    this.moveSpeed = 1.2 + Math.random() * 1.5;
    this.moveRange = 3.0 + Math.random() * 3.0;
    this.moveTimer = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.boardGroup = new THREE.Group();
    this.boardGroup.position.set(0, 1.5, 0);

    // 1. Heavy Industrial Base Plate on ground
    const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.12, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.8
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.06;
    baseMesh.receiveShadow = true;
    this.mesh.add(baseMesh);

    // Hazard ring on base
    const ringGeo = new THREE.RingGeometry(0.42, 0.52, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.13;
    this.mesh.add(ringMesh);

    // 2. High-Strength Steel Support Pole
    const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.5, 12);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.9
    });
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.y = 0.75;
    poleMesh.castShadow = true;
    this.mesh.add(poleMesh);

    // 3. TARGET BOARD GROUP (Tilts and wobbles when shot)
    // Tactical Silhouette Backboard
    const backboardGeo = new THREE.BoxGeometry(0.85, 1.15, 0.07);
    const backboardMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.7
    });
    const backboard = new THREE.Mesh(backboardGeo, backboardMat);
    backboard.castShadow = true;
    this.boardGroup.add(backboard);
    this.originalMaterials.set(backboard, backboardMat);

    // Outer Target Circle (White / Silver with cyan trim)
    const outerGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.025, 32);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.3
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = Math.PI / 2;
    outerMesh.position.set(0, -0.05, 0.04);
    this.boardGroup.add(outerMesh);
    this.originalMaterials.set(outerMesh, outerMat);

    // Middle Scoring Ring (Cyan / Yellow)
    const midGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32);
    const midMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.6
    });
    const midMesh = new THREE.Mesh(midGeo, midMat);
    midMesh.rotation.x = Math.PI / 2;
    midMesh.position.set(0, -0.05, 0.055);
    this.boardGroup.add(midMesh);
    this.originalMaterials.set(midMesh, midMat);

    // Center Bullseye (Glowing Neon Red / Crimson - CRIT POINT!)
    const bullseyeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 32);
    const bullseyeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.5
    });
    this.bullseyeMesh = new THREE.Mesh(bullseyeGeo, bullseyeMat);
    this.bullseyeMesh.rotation.x = Math.PI / 2;
    this.bullseyeMesh.position.set(0, -0.05, 0.07);
    this.boardGroup.add(this.bullseyeMesh);
    this.originalMaterials.set(this.bullseyeMesh, bullseyeMat);

    // Top Head Weakpoint Target (Smaller Bullseye at top)
    const headTargetGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 24);
    const headTargetMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.4
    });
    this.headTargetMesh = new THREE.Mesh(headTargetGeo, headTargetMat);
    this.headTargetMesh.rotation.x = Math.PI / 2;
    this.headTargetMesh.position.set(0, 0.42, 0.05);
    this.boardGroup.add(this.headTargetMesh);
    this.originalMaterials.set(this.headTargetMesh, headTargetMat);

    this.mesh.add(this.boardGroup);

    // 4. Floating Mini Health Bar
    const hbBgGeo = new THREE.PlaneGeometry(0.7, 0.08);
    const hbBgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    this.healthBarBg = new THREE.Mesh(hbBgGeo, hbBgMat);
    this.healthBarBg.position.set(0, 2.3, 0);
    this.mesh.add(this.healthBarBg);

    const hbFillGeo = new THREE.PlaneGeometry(0.68, 0.06);
    const hbFillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
    this.healthBarMesh = new THREE.Mesh(hbFillGeo, hbFillMat);
    this.healthBarMesh.position.set(0, 2.3, 0.01);
    this.mesh.add(this.healthBarMesh);
  }

  public isBullseyeMesh(targetObj: THREE.Object3D): boolean {
    return (
      targetObj === this.bullseyeMesh ||
      targetObj === this.headTargetMesh ||
      targetObj.parent === this.bullseyeMesh ||
      targetObj.parent === this.headTargetMesh
    );
  }

  public takeDamage(
    amount: number,
    isBullseye: boolean
  ): { killed: boolean; finalDamage: number; isCrit: boolean } {
    if (this.isDead) return { killed: false, finalDamage: 0, isCrit: false };

    const multiplier = isBullseye ? 2.5 : 1.0;
    const finalDamage = Math.round(amount * multiplier);
    this.health = Math.max(0, this.health - finalDamage);

    // Kinetic impact wobble (tilts backwards upon hit)
    this.wobbleAngle = -0.38;

    // Visual damage flash
    this.hitFlashTimer = 0.08;
    this.applyHitFlash(true);

    // Health bar scale & color
    const ratio = Math.max(0, this.health / this.maxHealth);
    this.healthBarMesh.scale.x = ratio;
    const fillMat = this.healthBarMesh.material as THREE.MeshBasicMaterial;
    if (ratio > 0.5) {
      fillMat.color.setHex(0x22c55e);
    } else if (ratio > 0.25) {
      fillMat.color.setHex(0xf59e0b);
    } else {
      fillMat.color.setHex(0xef4444);
    }

    if (this.health <= 0) {
      this.isDead = true;
      return { killed: true, finalDamage, isCrit: isBullseye };
    }

    return { killed: false, finalDamage, isCrit: isBullseye };
  }

  private applyHitFlash(active: boolean) {
    this.originalMaterials.forEach((originalMat, mesh) => {
      mesh.material = active ? this.flashMaterial : originalMat;
    });
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    if (this.isDead) {
      // Disintegrate / shrink down on destruction
      this.mesh.scale.multiplyScalar(Math.max(0, 1 - delta * 5));
      return;
    }

    // Flash timer
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        this.applyHitFlash(false);
      }
    }

    // Spring physics on kinetic wobble
    this.wobbleAngle = THREE.MathUtils.lerp(this.wobbleAngle, 0, delta * 7.5);
    this.boardGroup.rotation.x = this.wobbleAngle;

    // Face player position (so player always has a clear bullseye angle)
    const targetAngle = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, delta * 6);

    // Face health bar directly to camera
    this.healthBarBg.lookAt(playerPos.x, this.healthBarBg.position.y + this.position.y, playerPos.z);
    this.healthBarMesh.lookAt(playerPos.x, this.healthBarMesh.position.y + this.position.y, playerPos.z);

    // Optional moving target strafe
    if (this.isMoving) {
      this.moveTimer += delta * this.moveSpeed;
      const targetX = this.initialX + Math.sin(this.moveTimer) * this.moveRange;
      this.position.x = targetX;
      this.mesh.position.x = targetX;
    }
  }

  public dispose() {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    this.originalMaterials.clear();
  }
}
