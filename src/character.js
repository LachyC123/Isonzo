import * as THREE from 'three';

export const CharState = {
    IDLE: 'idle',
    WALK: 'walk',
    SPRINT: 'sprint',
    JUMP: 'jump',
    FALL: 'fall',
    LIGHT1: 'light1',
    LIGHT2: 'light2',
    LIGHT3: 'light3',
    HEAVY_CHARGE: 'heavy_charge',
    HEAVY_RELEASE: 'heavy_release',
    DODGE: 'dodge',
    GRAB: 'grab',
    GRAB_HOLD: 'grab_hold',
    GRAB_SLAM: 'grab_slam',
    GRABBED: 'grabbed',
    BLOCK: 'block',
    HITSTUN: 'hitstun',
    KNOCKBACK: 'knockback',
    LAUNCHED: 'launched',
    GROUND_BOUNCE: 'ground_bounce',
    KO: 'ko',
    RINGOUT: 'ringout',
};

export const ACTION_STATES = new Set([
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE,
    CharState.DODGE, CharState.GRAB, CharState.GRAB_HOLD,
    CharState.GRAB_SLAM, CharState.GRABBED, CharState.BLOCK,
    CharState.HITSTUN, CharState.KNOCKBACK, CharState.LAUNCHED,
    CharState.GROUND_BOUNCE, CharState.KO, CharState.RINGOUT,
]);

export function createIntent() {
    return {
        moveX: 0, moveZ: 0,
        sprint: false, jump: false,
        lightAttack: false, heavyCharge: false,
        dodge: false, grab: false, block: false,
    };
}

function makeLimb(geo, mat, parent) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(geo, mat);
    pivot.add(mesh);
    parent.add(pivot);
    return { pivot, mesh };
}

export function createCharacter(name, colorSet, isPlayer) {
    const char = {
        name, isPlayer,
        mesh: null, bodyParts: {},
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        facing: 0,
        health: 100, maxHealth: 100,
        stamina: 100, maxStamina: 100,
        staminaRegenDelay: 0,
        state: CharState.IDLE, stateTimer: 0,
        grounded: true, alive: true,
        combo: 0, comboTimer: 0,
        heavyChargeTime: 0, attackHit: false,
        iFrames: false, hitstopTimer: 0,
        knockbackVel: new THREE.Vector3(),
        buffs: { damageUp: false, staminaUp: false, regenUp: false, throwUp: false },
        kills: 0, damageDealt: 0, roundWins: 0,
        intent: createIntent(),
        animTime: 0, bobPhase: Math.random() * Math.PI * 2,
        colorSet,
        grabTarget: null, grabbedBy: null,
        ragdollVel: new THREE.Vector3(),
        bounceCount: 0,
    };

    const root = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({
        color: colorSet.body, specular: 0x333333, shininess: 30,
    });
    const accentMat = new THREE.MeshPhongMaterial({
        color: colorSet.accent, specular: 0x444444, shininess: 40,
    });
    const skinMat = new THREE.MeshPhongMaterial({
        color: 0xd4a574, specular: 0x222222, shininess: 15,
    });

    const torsoGeo = new THREE.CapsuleGeometry(0.38, 0.55, 5, 10);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.1;
    torso.scale.set(1.15, 1, 0.85);
    root.add(torso);

    const chestGeo = new THREE.SphereGeometry(0.42, 8, 6);
    const chest = new THREE.Mesh(chestGeo, bodyMat.clone());
    chest.position.y = 1.42;
    chest.scale.set(1.25, 0.7, 0.9);
    root.add(chest);

    const shoulderGeo = new THREE.SphereGeometry(0.16, 6, 5);
    const lShoulder = new THREE.Mesh(shoulderGeo, bodyMat.clone());
    lShoulder.position.set(-0.58, 1.52, 0);
    root.add(lShoulder);
    const rShoulder = new THREE.Mesh(shoulderGeo, bodyMat.clone());
    rShoulder.position.set(0.58, 1.52, 0);
    root.add(rShoulder);

    const upperArmGeo = new THREE.CapsuleGeometry(0.1, 0.3, 4, 6);
    const forearmGeo = new THREE.CapsuleGeometry(0.09, 0.28, 4, 6);
    const fistGeo = new THREE.SphereGeometry(0.1, 6, 5);

    const lUpperArm = makeLimb(upperArmGeo, skinMat.clone(), root);
    lUpperArm.pivot.position.set(-0.58, 1.48, 0);
    lUpperArm.mesh.position.y = -0.2;
    const lForearm = makeLimb(forearmGeo, skinMat.clone(), lUpperArm.pivot);
    lForearm.pivot.position.set(0, -0.4, 0);
    lForearm.mesh.position.y = -0.18;
    const lFist = new THREE.Mesh(fistGeo, skinMat.clone());
    lFist.position.set(0, -0.38, 0);
    lForearm.pivot.add(lFist);

    const rUpperArm = makeLimb(upperArmGeo, skinMat.clone(), root);
    rUpperArm.pivot.position.set(0.58, 1.48, 0);
    rUpperArm.mesh.position.y = -0.2;
    const rForearm = makeLimb(forearmGeo, skinMat.clone(), rUpperArm.pivot);
    rForearm.pivot.position.set(0, -0.4, 0);
    rForearm.mesh.position.y = -0.18;
    const rFist = new THREE.Mesh(fistGeo, skinMat.clone());
    rFist.position.set(0, -0.38, 0);
    rForearm.pivot.add(rFist);

    const headGeo = new THREE.SphereGeometry(0.22, 8, 7);
    const head = new THREE.Mesh(headGeo, skinMat.clone());
    head.position.y = 1.78;
    head.scale.set(1, 1.05, 1);
    root.add(head);

    const maskGeo = new THREE.SphereGeometry(0.225, 8, 7, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const mask = new THREE.Mesh(maskGeo, accentMat.clone());
    mask.position.y = 1.79;
    mask.scale.set(1, 1.05, 1);
    root.add(mask);

    const hipsGeo = new THREE.SphereGeometry(0.32, 8, 5);
    const hips = new THREE.Mesh(hipsGeo, bodyMat.clone());
    hips.position.y = 0.72;
    hips.scale.set(1.1, 0.5, 0.8);
    root.add(hips);

    const thighGeo = new THREE.CapsuleGeometry(0.13, 0.32, 4, 6);
    const shinGeo = new THREE.CapsuleGeometry(0.1, 0.3, 4, 6);
    const bootGeo = new THREE.BoxGeometry(0.18, 0.12, 0.28);

    const lThigh = makeLimb(thighGeo, bodyMat.clone(), root);
    lThigh.pivot.position.set(-0.22, 0.62, 0);
    lThigh.mesh.position.y = -0.22;
    const lShin = makeLimb(shinGeo, skinMat.clone(), lThigh.pivot);
    lShin.pivot.position.set(0, -0.44, 0);
    lShin.mesh.position.y = -0.2;
    const lBoot = new THREE.Mesh(bootGeo, accentMat.clone());
    lBoot.position.set(0, -0.42, 0.04);
    lShin.pivot.add(lBoot);

    const rThigh = makeLimb(thighGeo, bodyMat.clone(), root);
    rThigh.pivot.position.set(0.22, 0.62, 0);
    rThigh.mesh.position.y = -0.22;
    const rShin = makeLimb(shinGeo, skinMat.clone(), rThigh.pivot);
    rShin.pivot.position.set(0, -0.44, 0);
    rShin.mesh.position.y = -0.2;
    const rBoot = new THREE.Mesh(bootGeo, accentMat.clone());
    rBoot.position.set(0, -0.42, 0.04);
    rShin.pivot.add(rBoot);

    const shadowGeo = new THREE.CircleGeometry(0.6, 14);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    char.bodyParts = {
        torso, chest, head, mask, hips,
        lShoulder, rShoulder,
        lUpperArm, lForearm, lFist,
        rUpperArm, rForearm, rFist,
        lThigh, lShin, lBoot,
        rThigh, rShin, rBoot,
        shadow,
    };
    char.mesh = root;
    return char;
}

export function resetCharacter(char, x, z) {
    char.position.set(x, 0, z);
    char.velocity.set(0, 0, 0);
    char.knockbackVel.set(0, 0, 0);
    char.ragdollVel.set(0, 0, 0);
    char.health = char.maxHealth;
    char.stamina = char.maxStamina;
    char.staminaRegenDelay = 0;
    char.state = CharState.IDLE;
    char.stateTimer = 0;
    char.grounded = true;
    char.alive = true;
    char.combo = 0;
    char.comboTimer = 0;
    char.heavyChargeTime = 0;
    char.attackHit = false;
    char.iFrames = false;
    char.hitstopTimer = 0;
    char.animTime = 0;
    char.intent = createIntent();
    char.grabTarget = null;
    char.grabbedBy = null;
    char.bounceCount = 0;
    char.mesh.position.copy(char.position);
    char.mesh.rotation.set(0, 0, 0);
    char.mesh.visible = true;
    resetPose(char);
}

function resetPose(char) {
    const p = char.bodyParts;
    p.torso.position.set(0, 1.1, 0);
    p.torso.rotation.set(0, 0, 0);
    p.chest.position.set(0, 1.42, 0);
    p.chest.rotation.set(0, 0, 0);
    p.head.position.set(0, 1.78, 0);
    p.head.rotation.set(0, 0, 0);
    p.mask.position.set(0, 1.79, 0);
    p.hips.position.set(0, 0.72, 0);
    p.hips.rotation.set(0, 0, 0);
    p.lShoulder.position.set(-0.58, 1.52, 0);
    p.rShoulder.position.set(0.58, 1.52, 0);

    p.lUpperArm.pivot.position.set(-0.58, 1.48, 0);
    p.lUpperArm.pivot.rotation.set(0, 0, 0);
    p.lForearm.pivot.rotation.set(0, 0, 0);
    p.rUpperArm.pivot.position.set(0.58, 1.48, 0);
    p.rUpperArm.pivot.rotation.set(0, 0, 0);
    p.rForearm.pivot.rotation.set(0, 0, 0);

    p.lThigh.pivot.position.set(-0.22, 0.62, 0);
    p.lThigh.pivot.rotation.set(0, 0, 0);
    p.lShin.pivot.rotation.set(0, 0, 0);
    p.rThigh.pivot.position.set(0.22, 0.62, 0);
    p.rThigh.pivot.rotation.set(0, 0, 0);
    p.rShin.pivot.rotation.set(0, 0, 0);
}

function lerpTo(current, target, speed, dt) {
    return current + (target - speed) * 0 + (target - current) * Math.min(speed * dt, 1);
}

const _ea = (cur, tgt, spd, dt) => cur + (tgt - cur) * Math.min(spd * dt, 1);

export function updateCharacterAnimation(char, dt) {
    if (!char.alive && char.state !== CharState.KO && char.state !== CharState.RINGOUT &&
        char.state !== CharState.GROUND_BOUNCE && char.state !== CharState.LAUNCHED) return;

    char.animTime += dt;
    const t = char.animTime;
    const p = char.bodyParts;
    const st = char.state;
    const spd = 12;

    resetPose(char);

    switch (st) {
        case CharState.IDLE: {
            const breathe = Math.sin(t * 2 + char.bobPhase) * 0.012;
            p.chest.position.y += breathe;
            p.head.position.y += breathe * 0.5;
            p.lShoulder.position.y += breathe * 0.7;
            p.rShoulder.position.y += breathe * 0.7;
            p.lUpperArm.pivot.rotation.z = 0.15;
            p.rUpperArm.pivot.rotation.z = -0.15;
            p.lForearm.pivot.rotation.x = -0.3;
            p.rForearm.pivot.rotation.x = -0.3;
            p.lThigh.pivot.rotation.x = 0;
            p.rThigh.pivot.rotation.x = 0;
            const sway = Math.sin(t * 1.8) * 0.02;
            p.torso.rotation.y = sway;
            break;
        }
        case CharState.WALK:
        case CharState.SPRINT: {
            const freq = st === CharState.SPRINT ? 10 : 6;
            const stride = st === CharState.SPRINT ? 0.55 : 0.35;
            const bob = Math.sin(t * freq) * (st === CharState.SPRINT ? 0.04 : 0.02);
            const lean = st === CharState.SPRINT ? 0.15 : 0.05;

            p.chest.position.y += bob;
            p.torso.rotation.x = lean;
            p.chest.rotation.x = -lean * 0.5;

            const legPhase = Math.sin(t * freq);
            p.lThigh.pivot.rotation.x = legPhase * stride;
            p.rThigh.pivot.rotation.x = -legPhase * stride;
            p.lShin.pivot.rotation.x = Math.max(0, -legPhase) * stride * 0.8;
            p.rShin.pivot.rotation.x = Math.max(0, legPhase) * stride * 0.8;

            const armSwing = Math.sin(t * freq) * 0.5;
            p.lUpperArm.pivot.rotation.x = -armSwing;
            p.rUpperArm.pivot.rotation.x = armSwing;
            p.lUpperArm.pivot.rotation.z = 0.1;
            p.rUpperArm.pivot.rotation.z = -0.1;
            p.lForearm.pivot.rotation.x = -0.5;
            p.rForearm.pivot.rotation.x = -0.5;

            p.hips.rotation.y = Math.sin(t * freq) * 0.08;
            break;
        }
        case CharState.JUMP: {
            p.lUpperArm.pivot.rotation.x = -0.8;
            p.lUpperArm.pivot.rotation.z = 0.6;
            p.rUpperArm.pivot.rotation.x = -0.8;
            p.rUpperArm.pivot.rotation.z = -0.6;
            p.lForearm.pivot.rotation.x = -0.6;
            p.rForearm.pivot.rotation.x = -0.6;
            p.lThigh.pivot.rotation.x = -0.3;
            p.rThigh.pivot.rotation.x = -0.3;
            p.lShin.pivot.rotation.x = 0.4;
            p.rShin.pivot.rotation.x = 0.4;
            break;
        }
        case CharState.FALL: {
            p.lUpperArm.pivot.rotation.x = 0.2;
            p.lUpperArm.pivot.rotation.z = 0.8;
            p.rUpperArm.pivot.rotation.x = 0.2;
            p.rUpperArm.pivot.rotation.z = -0.8;
            p.lForearm.pivot.rotation.x = -0.3;
            p.rForearm.pivot.rotation.x = -0.3;
            p.lThigh.pivot.rotation.x = 0.3;
            p.rThigh.pivot.rotation.x = 0.1;
            p.lShin.pivot.rotation.x = -0.2;
            p.rShin.pivot.rotation.x = -0.4;
            break;
        }
        case CharState.LIGHT1: {
            const wind = Math.min(char.stateTimer / 0.06, 1);
            const strike = Math.max(0, Math.min((char.stateTimer - 0.06) / 0.08, 1));
            const recov = Math.max(0, Math.min((char.stateTimer - 0.14) / 0.11, 1));
            const ext = wind * (1 - recov);
            const punch = strike * (1 - recov);

            p.rUpperArm.pivot.rotation.x = -1.5 * punch + 0.3 * (1 - wind);
            p.rUpperArm.pivot.rotation.z = -0.3 * ext;
            p.rForearm.pivot.rotation.x = -1.0 * punch;
            p.torso.rotation.y = -0.25 * punch;
            p.chest.rotation.y = -0.15 * punch;
            p.lUpperArm.pivot.rotation.x = -0.3;
            p.lUpperArm.pivot.rotation.z = 0.2;
            p.lForearm.pivot.rotation.x = -0.8;
            p.lThigh.pivot.rotation.x = 0.1 * punch;
            p.rThigh.pivot.rotation.x = -0.1 * punch;
            break;
        }
        case CharState.LIGHT2: {
            const wind = Math.min(char.stateTimer / 0.06, 1);
            const strike = Math.max(0, Math.min((char.stateTimer - 0.06) / 0.08, 1));
            const recov = Math.max(0, Math.min((char.stateTimer - 0.14) / 0.11, 1));
            const punch = strike * (1 - recov);

            p.lUpperArm.pivot.rotation.x = -1.5 * punch + 0.3 * (1 - wind);
            p.lUpperArm.pivot.rotation.z = 0.3 * punch;
            p.lForearm.pivot.rotation.x = -1.0 * punch;
            p.torso.rotation.y = 0.25 * punch;
            p.chest.rotation.y = 0.15 * punch;
            p.rUpperArm.pivot.rotation.x = -0.3;
            p.rUpperArm.pivot.rotation.z = -0.2;
            p.rForearm.pivot.rotation.x = -0.8;
            break;
        }
        case CharState.LIGHT3: {
            const wind = Math.min(char.stateTimer / 0.1, 1);
            const strike = Math.max(0, Math.min((char.stateTimer - 0.1) / 0.1, 1));
            const recov = Math.max(0, Math.min((char.stateTimer - 0.2) / 0.15, 1));

            const hook = strike * (1 - recov);
            const windUp = wind * (1 - strike);

            p.rUpperArm.pivot.rotation.x = -0.8 * hook;
            p.rUpperArm.pivot.rotation.z = (-0.6 * windUp + -1.8 * hook);
            p.rForearm.pivot.rotation.x = -1.2 * hook - 0.5 * windUp;
            p.torso.rotation.y = 0.3 * windUp - 0.5 * hook;
            p.chest.rotation.y = -0.3 * hook;
            p.hips.rotation.y = -0.2 * hook;
            p.lUpperArm.pivot.rotation.x = -0.3;
            p.lUpperArm.pivot.rotation.z = 0.3;
            p.lForearm.pivot.rotation.x = -0.9;
            p.lThigh.pivot.rotation.x = -0.15 * hook;
            p.rThigh.pivot.rotation.x = 0.2 * hook;
            break;
        }
        case CharState.HEAVY_CHARGE: {
            const pulse = Math.sin(t * 14) * 0.03;
            const charge = Math.min(char.heavyChargeTime / 1.5, 1);

            p.torso.position.y = 1.05 + pulse;
            p.chest.position.y = 1.37 + pulse;
            p.torso.rotation.x = 0.1;
            p.rUpperArm.pivot.rotation.x = 1.5 + charge * 0.3;
            p.rUpperArm.pivot.rotation.z = -0.5;
            p.rForearm.pivot.rotation.x = 0.8;
            p.lUpperArm.pivot.rotation.x = -0.5;
            p.lUpperArm.pivot.rotation.z = 0.3;
            p.lForearm.pivot.rotation.x = -1.0;
            p.lThigh.pivot.rotation.x = 0.15;
            p.rThigh.pivot.rotation.x = -0.1;
            p.lShin.pivot.rotation.x = -0.1;

            p.rFist.material.emissive.setHex(0xff4400);
            p.rFist.material.emissiveIntensity = charge * 0.8;
            p.rUpperArm.mesh.material.emissive.setHex(0xff2200);
            p.rUpperArm.mesh.material.emissiveIntensity = charge * 0.3;
            break;
        }
        case CharState.HEAVY_RELEASE: {
            const strike = Math.min(char.stateTimer / 0.12, 1);
            const recov = Math.max(0, Math.min((char.stateTimer - 0.12) / 0.26, 1));
            const smash = strike * (1 - recov);

            p.rUpperArm.pivot.rotation.x = 1.5 - 3.2 * smash;
            p.rUpperArm.pivot.rotation.z = -0.5 + 0.3 * smash;
            p.rForearm.pivot.rotation.x = 0.8 - 1.6 * smash;
            p.torso.rotation.y = -0.5 * smash;
            p.torso.rotation.x = 0.15 * smash;
            p.chest.rotation.y = -0.3 * smash;
            p.hips.rotation.y = -0.15 * smash;
            p.lThigh.pivot.rotation.x = 0.2 * smash;
            p.rThigh.pivot.rotation.x = -0.15 * smash;

            p.rFist.material.emissiveIntensity *= 0.92;
            p.rUpperArm.mesh.material.emissiveIntensity *= 0.92;
            break;
        }
        case CharState.DODGE: {
            const roll = Math.min(char.stateTimer / 0.35, 1);
            const rollAngle = roll * Math.PI * 2;

            p.torso.position.y = 0.7;
            p.chest.position.y = 1.05;
            p.head.position.y = 1.35;
            p.mask.position.y = 1.36;
            p.hips.position.y = 0.45;
            p.torso.rotation.x = rollAngle;

            p.lUpperArm.pivot.position.y = 1.1;
            p.rUpperArm.pivot.position.y = 1.1;
            p.lUpperArm.pivot.rotation.x = -1;
            p.rUpperArm.pivot.rotation.x = -1;
            p.lForearm.pivot.rotation.x = -1.2;
            p.rForearm.pivot.rotation.x = -1.2;
            p.lThigh.pivot.position.y = 0.35;
            p.rThigh.pivot.position.y = 0.35;
            p.lThigh.pivot.rotation.x = -0.8;
            p.rThigh.pivot.rotation.x = -0.8;
            p.lShin.pivot.rotation.x = 1.0;
            p.rShin.pivot.rotation.x = 1.0;
            break;
        }
        case CharState.GRAB: {
            const reach = Math.min(char.stateTimer / 0.15, 1);
            const recov = Math.max(0, Math.min((char.stateTimer - 0.25) / 0.17, 1));
            const ext = reach * (1 - recov);

            p.torso.rotation.x = 0.2 * ext;
            p.lUpperArm.pivot.rotation.x = -1.6 * ext;
            p.lUpperArm.pivot.rotation.z = 0.2 * ext;
            p.rUpperArm.pivot.rotation.x = -1.6 * ext;
            p.rUpperArm.pivot.rotation.z = -0.2 * ext;
            p.lForearm.pivot.rotation.x = -0.3 * ext;
            p.rForearm.pivot.rotation.x = -0.3 * ext;
            p.lThigh.pivot.rotation.x = 0.2 * ext;
            p.rThigh.pivot.rotation.x = -0.1 * ext;
            break;
        }
        case CharState.GRAB_HOLD: {
            const lift = Math.min(char.stateTimer / 0.4, 1);

            p.lUpperArm.pivot.rotation.x = -1.6 + 0.5 * lift;
            p.rUpperArm.pivot.rotation.x = -1.6 + 0.5 * lift;
            p.lUpperArm.pivot.rotation.z = 0.15;
            p.rUpperArm.pivot.rotation.z = -0.15;
            p.lForearm.pivot.rotation.x = -0.8 * (1 - lift * 0.3);
            p.rForearm.pivot.rotation.x = -0.8 * (1 - lift * 0.3);
            p.torso.rotation.x = -0.1 * lift;
            p.lThigh.pivot.rotation.x = 0.05;
            p.rThigh.pivot.rotation.x = -0.05;

            const strain = Math.sin(t * 8) * 0.02;
            p.torso.rotation.z = strain;
            break;
        }
        case CharState.GRAB_SLAM: {
            const slam = Math.min(char.stateTimer / 0.2, 1);
            const ease = slam * slam;

            p.torso.rotation.x = 0.4 * ease;
            p.lUpperArm.pivot.rotation.x = -1.1 + 2.0 * ease;
            p.rUpperArm.pivot.rotation.x = -1.1 + 2.0 * ease;
            p.lForearm.pivot.rotation.x = -0.5;
            p.rForearm.pivot.rotation.x = -0.5;
            p.lThigh.pivot.rotation.x = 0.3 * ease;
            p.rThigh.pivot.rotation.x = -0.1;
            p.lShin.pivot.rotation.x = -0.2 * ease;
            break;
        }
        case CharState.GRABBED: {
            const lift = Math.min(char.stateTimer / 0.5, 1);
            const flail = Math.sin(t * 12) * 0.15;

            p.lUpperArm.pivot.rotation.x = 0.5 + flail;
            p.rUpperArm.pivot.rotation.x = 0.5 - flail;
            p.lUpperArm.pivot.rotation.z = 0.8;
            p.rUpperArm.pivot.rotation.z = -0.8;
            p.lForearm.pivot.rotation.x = -0.3;
            p.rForearm.pivot.rotation.x = -0.3;
            p.lThigh.pivot.rotation.x = 0.3 + flail * 0.5;
            p.rThigh.pivot.rotation.x = -0.1 - flail * 0.5;
            p.lShin.pivot.rotation.x = -0.4;
            p.rShin.pivot.rotation.x = -0.2;

            char.mesh.position.y = char.position.y + lift * 1.2;
            char.mesh.rotation.y = char.facing;
            p.shadow.position.y = -char.position.y - lift * 1.2 + 0.02;
            return;
        }
        case CharState.BLOCK: {
            p.lUpperArm.pivot.rotation.x = -1.2;
            p.lUpperArm.pivot.rotation.z = 0.15;
            p.rUpperArm.pivot.rotation.x = -1.2;
            p.rUpperArm.pivot.rotation.z = -0.15;
            p.lForearm.pivot.rotation.x = -1.3;
            p.lForearm.pivot.rotation.z = 0.2;
            p.rForearm.pivot.rotation.x = -1.3;
            p.rForearm.pivot.rotation.z = -0.2;
            p.torso.rotation.x = -0.05;
            p.lThigh.pivot.rotation.x = 0.08;
            p.rThigh.pivot.rotation.x = -0.08;
            p.lShin.pivot.rotation.x = -0.1;
            p.rShin.pivot.rotation.x = 0.1;
            break;
        }
        case CharState.HITSTUN: {
            const shake = Math.sin(t * 45) * 0.05;
            const reel = Math.min(char.stateTimer / 0.08, 1);
            const recov = Math.max(0, (char.stateTimer - 0.15) / 0.15);

            p.torso.rotation.x = -0.2 * reel * (1 - recov);
            p.torso.position.x = shake * (1 - recov);
            p.chest.rotation.x = -0.15 * reel * (1 - recov);
            p.head.rotation.x = -0.3 * reel * (1 - recov);
            p.lUpperArm.pivot.rotation.x = 0.4 * reel;
            p.lUpperArm.pivot.rotation.z = 0.5 * reel;
            p.rUpperArm.pivot.rotation.x = 0.4 * reel;
            p.rUpperArm.pivot.rotation.z = -0.5 * reel;
            break;
        }
        case CharState.KNOCKBACK:
        case CharState.LAUNCHED: {
            const tumble = char.stateTimer * 6;
            const flop = Math.min(char.stateTimer / 0.15, 1);

            p.torso.rotation.x = -0.5 * flop + Math.sin(tumble) * 0.15;
            p.chest.rotation.x = -0.3 * flop;
            p.head.rotation.x = -0.4 * flop;
            p.lUpperArm.pivot.rotation.x = 0.6;
            p.lUpperArm.pivot.rotation.z = 0.9;
            p.rUpperArm.pivot.rotation.x = 0.3;
            p.rUpperArm.pivot.rotation.z = -0.7;
            p.lForearm.pivot.rotation.x = -0.5;
            p.rForearm.pivot.rotation.x = -0.3;
            p.lThigh.pivot.rotation.x = 0.4 + Math.sin(tumble * 0.7) * 0.2;
            p.rThigh.pivot.rotation.x = -0.2 + Math.cos(tumble * 0.7) * 0.2;
            p.lShin.pivot.rotation.x = -0.3;
            p.rShin.pivot.rotation.x = -0.5;
            break;
        }
        case CharState.GROUND_BOUNCE: {
            const bounce = Math.min(char.stateTimer / 0.15, 1);
            const spread = 1 - bounce;

            p.torso.rotation.x = 1.2 * spread;
            p.chest.rotation.x = 0.3;
            p.head.rotation.x = 0.4;
            p.lUpperArm.pivot.rotation.x = 0.8;
            p.lUpperArm.pivot.rotation.z = 1.2 * spread;
            p.rUpperArm.pivot.rotation.x = 0.5;
            p.rUpperArm.pivot.rotation.z = -1.0 * spread;
            p.lThigh.pivot.rotation.x = 0.6 * spread;
            p.rThigh.pivot.rotation.x = -0.3 * spread;
            p.lShin.pivot.rotation.x = -0.8 * spread;
            p.rShin.pivot.rotation.x = -0.5 * spread;
            break;
        }
        case CharState.KO: {
            const fall = Math.min(char.stateTimer / 0.7, 1);
            const eased = 1 - (1 - fall) * (1 - fall);

            char.mesh.rotation.z = eased * (Math.PI / 2) * 0.9;
            char.mesh.position.y = char.position.y - eased * 0.5;

            p.lUpperArm.pivot.rotation.x = 0.5 * eased;
            p.lUpperArm.pivot.rotation.z = 1.2 * eased;
            p.rUpperArm.pivot.rotation.x = 0.3 * eased;
            p.rUpperArm.pivot.rotation.z = -0.8 * eased;
            p.lForearm.pivot.rotation.x = -0.4 * eased;
            p.rForearm.pivot.rotation.x = -0.2 * eased;
            p.lThigh.pivot.rotation.x = 0.3 * eased;
            p.rThigh.pivot.rotation.x = -0.2 * eased;
            p.lShin.pivot.rotation.x = -0.6 * eased;
            p.rShin.pivot.rotation.x = -0.4 * eased;
            p.head.rotation.z = 0.3 * eased;
            return;
        }
        case CharState.RINGOUT: {
            char.position.y -= 18 * dt;
            char.mesh.position.copy(char.position);
            char.mesh.rotation.x += dt * 5;
            char.mesh.rotation.z += dt * 3.5;

            const flail = Math.sin(t * 10);
            p.lUpperArm.pivot.rotation.z = 1.2 + flail * 0.3;
            p.rUpperArm.pivot.rotation.z = -1.2 - flail * 0.3;
            p.lThigh.pivot.rotation.x = 0.4 + flail * 0.2;
            p.rThigh.pivot.rotation.x = -0.3 - flail * 0.2;
            return;
        }
    }

    if (st !== CharState.HEAVY_CHARGE && st !== CharState.HEAVY_RELEASE) {
        p.rFist.material.emissiveIntensity = 0;
        p.rUpperArm.mesh.material.emissiveIntensity = 0;
    }

    char.mesh.position.copy(char.position);
    char.mesh.rotation.y = char.facing;

    const groundDist = Math.max(0, char.position.y);
    p.shadow.position.y = -char.position.y + 0.02;
    const ss = Math.max(0.15, 1 - groundDist * 0.06);
    p.shadow.scale.set(ss, ss, ss);
}
