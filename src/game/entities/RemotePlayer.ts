import * as THREE from 'three';
import { NetworkPlayerState, TeamId } from '../multiplayer/MultiplayerTypes';
import { WeaponId } from '../../types/game';
import { soundManager } from '../../audio/SoundManager';

export class RemotePlayer {
  public id: string;
  public name: string;
  public team: TeamId;
  public avatarId: string;

  // 3D Scene Graph
  public mesh: THREE.Group;
  public torsoGroup: THREE.Group;
  public headMesh: THREE.Mesh;
  public upperBodyGroup: THREE.Group;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;
  public leftLeg: THREE.Group;
  public static isLowGraphics: boolean = false;
  public rightLeg: THREE.Group;
  public weaponMeshGroup: THREE.Group;
  public shieldMesh: THREE.Mesh;
  public overheadSprite: THREE.Sprite;
  private overheadCanvas: HTMLCanvasElement;
  private overheadCtx: CanvasRenderingContext2D;
  private overheadTexture: THREE.CanvasTexture;

  // Materials for hit flashing
  private characterMaterials: THREE.MeshStandardMaterial[] = [];
  private originalEmissives: { mat: THREE.MeshStandardMaterial; hex: number }[] = [];
  private hitFlashTimer: number = 0;

  // State & Stats
  public health: number = 100;
  public maxHealth: number = 100;
  public armor: number = 50;
  public maxArmor: number = 50;
  public isAlive: boolean = true;
  public isSpeaking: boolean = false;
  public activeWeapon: WeaponId = 'assault_rifle';
  public stance: 'stand' | 'crouch' | 'prone' = 'stand';
  public isShieldActive: boolean = false;
  private shieldTimer: number = 0;

  // Interpolation targets
  public position: THREE.Vector3 = new THREE.Vector3();
  public targetPosition: THREE.Vector3 = new THREE.Vector3();
  public yaw: number = 0;
  public targetYaw: number = 0;
  public pitch: number = 0;
  public targetPitch: number = 0;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isMoving: boolean = false;
  private walkTime: number = 0;

  constructor(state: NetworkPlayerState) {
    this.id = state.id;
    this.name = state.name;
    this.team = state.team;
    this.avatarId = state.avatarId;
    this.health = state.health;
    this.maxHealth = state.maxHealth;
    this.armor = state.armor;
    this.maxArmor = state.maxArmor;
    this.activeWeapon = state.activeWeapon;
    this.position.set(state.position.x, state.position.y, state.position.z);
    this.targetPosition.copy(this.position);
    this.yaw = state.yaw;
    this.targetYaw = state.yaw;
    this.pitch = state.pitch;
    this.targetPitch = state.pitch;

    this.mesh = new THREE.Group();
    const initialMeshY = Math.max(0, this.position.y - 1.75);
    this.mesh.position.set(this.position.x, initialMeshY, this.position.z);

    // Build Tactical Procedural Human Model
    const colors = this.getTeamThemeColors(state.team);

    // Upper body group (rotates with pitch)
    this.upperBodyGroup = new THREE.Group();
    this.upperBodyGroup.position.set(0, 1.05, 0);

    // Torso
    this.torsoGroup = new THREE.Group();
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.32);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.castShadow = !RemotePlayer.isLowGraphics;
    torsoMesh.receiveShadow = !RemotePlayer.isLowGraphics;
    this.torsoGroup.add(torsoMesh);
    this.registerMaterial(torsoMat);

    // Tactical Vest & Armor Plate (with team color accent)
    const vestGeo = new THREE.BoxGeometry(0.58, 0.45, 0.36);
    const vestMat = new THREE.MeshStandardMaterial({
      color: colors.armor,
      emissive: colors.accent,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.5
    });
    const vestMesh = new THREE.Mesh(vestGeo, vestMat);
    vestMesh.position.set(0, 0.05, 0);
    this.torsoGroup.add(vestMesh);
    this.registerMaterial(vestMat);

    // Head & Tactical Visor (CRITICAL: used for headshot raycasts!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0);

    const headGeo = new THREE.BoxGeometry(0.28, 0.3, 0.28);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373, // Skin tone
      roughness: 0.8
    });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.castShadow = !RemotePlayer.isLowGraphics;
    headGroup.add(this.headMesh);
    this.registerMaterial(headMat);

    // Helmet
    const helmetGeo = new THREE.BoxGeometry(0.32, 0.22, 0.32);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.6
    });
    const helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
    helmetMesh.position.set(0, 0.1, 0);
    headGroup.add(helmetMesh);
    this.registerMaterial(helmetMat);

    // Glowing Tactical Visor
    const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.08);
    const visorMat = new THREE.MeshStandardMaterial({
      color: colors.visor,
      emissive: colors.visor,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.02, 0.15);
    headGroup.add(visorMesh);
    this.registerMaterial(visorMat);

    this.upperBodyGroup.add(this.torsoGroup);
    this.upperBodyGroup.add(headGroup);

    // Arms
    this.leftArm = this.createArm(true, colors);
    this.rightArm = this.createArm(false, colors);
    this.leftArm.position.set(-0.35, 0.25, 0);
    this.rightArm.position.set(0.35, 0.25, 0);
    this.upperBodyGroup.add(this.leftArm);
    this.upperBodyGroup.add(this.rightArm);

    // 3D Weapon Model attached to right arm
    this.weaponMeshGroup = this.createWeaponMesh(this.activeWeapon, colors);
    this.weaponMeshGroup.position.set(0, -0.35, 0.25);
    this.weaponMeshGroup.rotation.set(0, 0, 0);
    this.rightArm.add(this.weaponMeshGroup);

    this.mesh.add(this.upperBodyGroup);

    // Legs
    this.leftLeg = this.createLeg(true, colors);
    this.rightLeg = this.createLeg(false, colors);
    this.leftLeg.position.set(-0.16, 0.72, 0);
    this.rightLeg.position.set(0.16, 0.72, 0);
    this.mesh.add(this.leftLeg);
    this.mesh.add(this.rightLeg);

    // Spawn Invulnerability Shield Sphere
    const shieldGeo = new THREE.SphereGeometry(1.25, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: colors.visor,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.set(0, 1.0, 0);
    this.shieldMesh.visible = false;
    this.shieldMesh.raycast = () => {};
    this.mesh.add(this.shieldMesh);

    // Overhead 3D Canvas Sprite for Name, Team, HP bar, Ping & Distance
    this.overheadCanvas = document.createElement('canvas');
    this.overheadCanvas.width = 320;
    this.overheadCanvas.height = 96;
    this.overheadCtx = this.overheadCanvas.getContext('2d')!;
    this.overheadTexture = new THREE.CanvasTexture(this.overheadCanvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: this.overheadTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.overheadSprite = new THREE.Sprite(spriteMat);
    this.overheadSprite.renderOrder = 9999; // Render above world geometry so teammates can always be located
    this.overheadSprite.scale.set(2.3, 0.7, 1);
    this.overheadSprite.position.set(0, 2.35, 0);
    this.overheadSprite.raycast = () => {};
    this.mesh.add(this.overheadSprite);

    this.updateOverheadUI();
    this.activateShield(3.5);
  }

  private registerMaterial(mat: THREE.MeshStandardMaterial) {
    this.characterMaterials.push(mat);
    this.originalEmissives.push({ mat, hex: mat.emissive.getHex() });
  }

  private getTeamThemeColors(team: TeamId) {
    if (team === 'alpha') {
      return {
        armor: 0x0369a1,
        accent: 0x0284c7,
        visor: 0x38bdf8,
        nameColor: '#38bdf8',
        tag: 'ALPHA'
      };
    }
    if (team === 'bravo') {
      return {
        armor: 0xb91c1c,
        accent: 0xef4444,
        visor: 0xf87171,
        nameColor: '#f87171',
        tag: 'BRAVO'
      };
    }
    // FFA
    return {
      armor: 0x7c3aed,
      accent: 0xa855f7,
      visor: 0xc084fc,
      nameColor: '#c084fc',
      tag: 'OPERATIVE'
    };
  }

  private createArm(_isLeft: boolean, colors: { armor: number; accent: number }) {
    const armGroup = new THREE.Group();
    const armGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7
    });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.position.set(0, -0.22, 0);
    armGroup.add(armMesh);
    this.registerMaterial(armMat);

    // Shoulder pad
    const shoulderGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: colors.armor,
      emissive: colors.accent,
      emissiveIntensity: 0.2,
      roughness: 0.5
    });
    const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderMesh.position.set(0, -0.05, 0);
    armGroup.add(shoulderMesh);
    this.registerMaterial(shoulderMat);

    return armGroup;
  }

  private createLeg(_isLeft: boolean, _colors: { armor: number; accent: number }) {
    const legGroup = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.18, 0.75, 0.2);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8
    });
    const legMesh = new THREE.Mesh(legGeo, legMat);
    legMesh.position.set(0, -0.375, 0);
    legMesh.castShadow = !RemotePlayer.isLowGraphics;
    legGroup.add(legMesh);
    this.registerMaterial(legMat);

    // Tactical Knee pad
    const kneeGeo = new THREE.BoxGeometry(0.2, 0.15, 0.08);
    const kneeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const kneeMesh = new THREE.Mesh(kneeGeo, kneeMat);
    kneeMesh.position.set(0, -0.35, 0.11);
    legGroup.add(kneeMesh);
    this.registerMaterial(kneeMat);

    return legGroup;
  }

  private createWeaponMesh(weaponId: WeaponId, colors: { visor: number; accent: number }): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.8 });
    this.registerMaterial(bodyMat);

    if (weaponId === 'sniper') {
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.1), bodyMat);
      barrel.position.set(0, 0, 0.35);
      const scope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8),
        new THREE.MeshStandardMaterial({ color: colors.visor, emissive: colors.visor, emissiveIntensity: 0.6 })
      );
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.06, 0.1);
      group.add(barrel, scope);
    } else if (weaponId === 'shotgun') {
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.75), bodyMat);
      barrel.position.set(0, 0, 0.2);
      group.add(barrel);
    } else if (weaponId === 'plasma_rifle') {
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.85), bodyMat);
      barrel.position.set(0, 0, 0.22);
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.02, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.5 })
      );
      coil.position.set(0, 0, 0.3);
      group.add(barrel, coil);
    } else {
      // Assault rifle / SMG
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.8), bodyMat);
      barrel.position.set(0, 0, 0.2);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.08), bodyMat);
      mag.position.set(0, -0.12, 0.08);
      group.add(barrel, mag);
    }

    return group;
  }

  public updateState(state: NetworkPlayerState) {
    this.targetPosition.set(state.position.x, state.position.y, state.position.z);
    this.targetYaw = state.yaw;
    this.targetPitch = state.pitch;
    this.stance = state.stance;
    this.isMoving = state.isMoving;
    this.velocity.set(state.velocity.x, state.velocity.y, state.velocity.z);
    
    // Only accept authoritative health if it's lower or if not alive to avoid snapping back over client prediction
    if (state.health < this.health || !this.isAlive) {
      this.health = state.health;
    }
    this.maxHealth = state.maxHealth;
    if (state.armor < this.armor) {
      this.armor = state.armor;
    }
    this.maxArmor = state.maxArmor;

    if (!state.isAlive && this.isAlive) {
      this.isAlive = false;
      this.triggerDeathAnimation();
    }

    if (this.activeWeapon !== state.activeWeapon) {
      this.switchWeapon(state.activeWeapon);
    }

    if (state.voiceState && state.voiceState.isSpeaking !== this.isSpeaking) {
      this.isSpeaking = state.voiceState.isSpeaking;
    }

    this.updateOverheadUI();
  }

  public setSpeaking(speaking: boolean) {
    if (this.isSpeaking !== speaking) {
      this.isSpeaking = speaking;
      this.updateOverheadUI();
    }
  }

  public switchWeapon(weaponId: WeaponId) {
    this.activeWeapon = weaponId;
    this.rightArm.remove(this.weaponMeshGroup);
    const colors = this.getTeamThemeColors(this.team);
    this.weaponMeshGroup = this.createWeaponMesh(weaponId, colors);
    this.weaponMeshGroup.position.set(0, -0.35, 0.25);
    this.rightArm.add(this.weaponMeshGroup);
  }

  public activateShield(duration: number = 3.5) {
    this.isShieldActive = true;
    this.shieldTimer = duration;
    this.shieldMesh.visible = true;
    soundManager.playRespawnShield();
  }

  public takeDamage(amount: number, isHeadshot: boolean): { killed: boolean; finalDamage: number } {
    if (this.isShieldActive) return { killed: false, finalDamage: 0 };

    let effectiveDamage = amount;
    if (isHeadshot) {
      effectiveDamage *= 2.2;
    }

    // Armor absorption
    if (this.armor > 0) {
      const absorbed = effectiveDamage * 0.65;
      const actualArmor = Math.min(this.armor, absorbed);
      this.armor -= actualArmor;
      effectiveDamage -= actualArmor;
    }

    this.health = Math.max(0, Math.round(this.health - effectiveDamage));
    this.triggerHitFlash();
    this.updateOverheadUI();

    if (this.health <= 0) {
      this.isAlive = false;
      this.triggerDeathAnimation();
      return { killed: true, finalDamage: Math.round(effectiveDamage) };
    }

    return { killed: false, finalDamage: Math.round(effectiveDamage) };
  }

  public triggerHitFlash() {
    this.hitFlashTimer = 0.15;
    for (const mat of this.characterMaterials) {
      mat.emissive.setHex(0xff3333);
      mat.emissiveIntensity = 0.8;
    }
  }

  public triggerDeathAnimation() {
    // Ragdoll tip-over and fade
    this.torsoGroup.rotation.x = -Math.PI / 2;
    this.overheadSprite.visible = false;
  }

  private lastDistanceMeters: number = 0;

  public respawn(pos: { x: number; y: number; z: number }) {
    this.isAlive = true;
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.position.set(pos.x, pos.y, pos.z);
    this.targetPosition.copy(this.position);
    const meshY = Math.max(0, this.position.y - 1.75);
    this.mesh.position.set(this.position.x, meshY, this.position.z);
    this.torsoGroup.rotation.x = 0;
    this.overheadSprite.visible = true;
    this.activateShield(3.5);
    this.updateOverheadUI();
  }

  // Smooth Hermite / Lerp Interpolation
  public update(delta: number, localPlayerPos?: THREE.Vector3) {
    // Distance tracker for overhead tag
    if (localPlayerPos) {
      const dist = this.position.distanceTo(localPlayerPos);
      if (Math.abs(dist - this.lastDistanceMeters) >= 1.5) {
        this.lastDistanceMeters = dist;
        this.updateOverheadUI(dist);
      }
    }

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        for (const item of this.originalEmissives) {
          item.mat.emissive.setHex(item.hex);
          item.mat.emissiveIntensity = 0.25;
        }
      }
    }

    // Shield timer
    if (this.isShieldActive) {
      this.shieldTimer -= delta;
      this.shieldMesh.rotation.y += delta * 1.5;
      if (this.shieldTimer <= 0) {
        this.isShieldActive = false;
        this.shieldMesh.visible = false;
      }
    }

    if (!this.isAlive) {
      this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, 0.2, delta * 8);
      return;
    }

    // Position interpolation (Lerp towards target)
    this.position.lerp(this.targetPosition, Math.min(1.0, delta * 16));
    const currentMeshY = Math.max(0, this.position.y - 1.75);
    this.mesh.position.set(this.position.x, currentMeshY, this.position.z);

    // Yaw unwrapping & spherical interpolation
    let diffYaw = this.targetYaw - this.yaw;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    this.yaw += diffYaw * Math.min(1.0, delta * 18);
    this.mesh.rotation.y = this.yaw;

    // Pitch interpolation on upper body
    this.pitch = THREE.MathUtils.lerp(this.pitch, this.targetPitch, Math.min(1.0, delta * 18));
    this.upperBodyGroup.rotation.x = this.pitch;

    // Stance height adjustment
    let targetY = 1.05;
    let targetSpriteY = 2.3;
    if (this.stance === 'crouch') {
      targetY = 0.72;
      targetSpriteY = 1.85;
    } else if (this.stance === 'prone') {
      targetY = 0.35;
      targetSpriteY = 1.35;
    }
    this.upperBodyGroup.position.y = THREE.MathUtils.lerp(this.upperBodyGroup.position.y, targetY, delta * 14);
    this.overheadSprite.position.y = THREE.MathUtils.lerp(this.overheadSprite.position.y, targetSpriteY, delta * 14);

    // Walk / Run Procedural Animation
    if (this.isMoving) {
      this.walkTime += delta * 12;
      const legSwing = Math.sin(this.walkTime) * 0.45;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;

      const armSwing = Math.cos(this.walkTime) * 0.25;
      this.leftArm.rotation.x = armSwing;
      this.rightArm.rotation.x = -0.3 + armSwing * 0.5; // Arms holding weapon up
    } else {
      // Idle breathing
      this.walkTime = 0;
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, delta * 10);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, delta * 10);
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, delta * 10);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -0.2, delta * 10);
    }
  }

  public updateOverheadUI(distanceMeters?: number) {
    const ctx = this.overheadCtx;
    const w = 320;
    const h = 96;
    ctx.clearRect(0, 0, w, h);

    const colors = this.getTeamThemeColors(this.team);
    const distText = distanceMeters !== undefined ? ` • ${Math.max(1, Math.round(distanceMeters))}m` : '';

    // Background tactical pill
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.beginPath();
    ctx.roundRect(8, 4, w - 16, h - 8, 12);
    ctx.fill();

    // Border (glowing green when speaking in live voice chat, or team color)
    ctx.strokeStyle = this.isSpeaking ? '#22c55e' : colors.nameColor;
    ctx.lineWidth = this.isSpeaking ? 3.5 : 2;
    ctx.stroke();

    // Player Name
    ctx.font = 'bold 22px Rajdhani, sans-serif';
    ctx.fillStyle = this.isSpeaking ? '#4ade80' : '#ffffff';
    ctx.textAlign = 'center';
    const nameText = this.isSpeaking ? `[MIC] ${this.name}` : `${this.name}`;
    ctx.fillText(nameText, w / 2, 32);

    // Team Badge / Role Tag & Distance
    ctx.font = 'bold 14px Rajdhani, sans-serif';
    ctx.fillStyle = colors.nameColor;
    ctx.fillText(`${colors.tag}${distText}`, w / 2, 50);

    // Health Bar Background
    const barX = 24;
    const barY = 62;
    const barW = w - 48;
    const barH = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barW, barH);

    // Health Bar Fill
    const hpRatio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    this.overheadTexture.needsUpdate = true;
  }

  public dispose() {
    this.mesh.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.overheadTexture.dispose();
  }
}
