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
    ELBOW_DROP: 'elbow_drop',
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
    GETUP: 'getup',
    KO: 'ko',
    RINGOUT: 'ringout',
};

export const ACTION_STATES = new Set([
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE,
    CharState.ELBOW_DROP,
    CharState.DODGE, CharState.GRAB, CharState.GRAB_HOLD,
    CharState.GRAB_SLAM, CharState.GRABBED, CharState.BLOCK,
    CharState.HITSTUN, CharState.KNOCKBACK, CharState.LAUNCHED,
    CharState.GROUND_BOUNCE, CharState.GETUP,
    CharState.KO, CharState.RINGOUT,
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
        damage: 0,
        health: 100, maxHealth: 100,
        stamina: 100, maxStamina: 100,
        staminaRegenDelay: 0,
        state: CharState.IDLE, stateTimer: 0,
        prevState: CharState.IDLE, blendTimer: 0,
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
        sprintAttack: false,
        landingTimer: 0,
    };

    const root = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({
        color: colorSet.body, specular: 0x444444, shininess: 35,
    });
    const accentMat = new THREE.MeshPhongMaterial({
        color: colorSet.accent, specular: 0x555555, shininess: 45,
    });
    const skinMat = new THREE.MeshPhongMaterial({
        color: 0xd4a574, specular: 0x332211, shininess: 18,
    });
    const darkMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a2a, specular: 0x111111, shininess: 20,
    });

    const torsoGeo = new THREE.CapsuleGeometry(0.38, 0.55, 5, 10);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.1;
    torso.scale.set(1.18, 1, 0.88);
    root.add(torso);

    const chestGeo = new THREE.SphereGeometry(0.44, 10, 7);
    const chest = new THREE.Mesh(chestGeo, bodyMat.clone());
    chest.position.y = 1.44;
    chest.scale.set(1.28, 0.72, 0.92);
    root.add(chest);

    const beltGeo = new THREE.TorusGeometry(0.4, 0.06, 6, 16);
    const belt = new THREE.Mesh(beltGeo, accentMat.clone());
    belt.position.y = 0.82;
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.1, 0.85, 1);
    root.add(belt);

    const buckleGeo = new THREE.BoxGeometry(0.14, 0.12, 0.08);
    const buckle = new THREE.Mesh(buckleGeo, new THREE.MeshPhongMaterial({
        color: 0xffcc00, specular: 0xffaa00, shininess: 60,
        emissive: 0x332200, emissiveIntensity: 0.2,
    }));
    buckle.position.set(0, 0.82, 0.38);
    root.add(buckle);

    const shoulderGeo = new THREE.SphereGeometry(0.18, 7, 5);
    const lShoulder = new THREE.Mesh(shoulderGeo, bodyMat.clone());
    lShoulder.position.set(-0.6, 1.54, 0);
    root.add(lShoulder);
    const rShoulder = new THREE.Mesh(shoulderGeo, bodyMat.clone());
    rShoulder.position.set(0.6, 1.54, 0);
    root.add(rShoulder);

    const upperArmGeo = new THREE.CapsuleGeometry(0.11, 0.3, 4, 7);
    const forearmGeo = new THREE.CapsuleGeometry(0.095, 0.28, 4, 7);
    const fistGeo = new THREE.SphereGeometry(0.11, 7, 5);

    const lUpperArm = makeLimb(upperArmGeo, skinMat.clone(), root);
    lUpperArm.pivot.position.set(-0.6, 1.5, 0);
    lUpperArm.mesh.position.y = -0.2;
    const lForearm = makeLimb(forearmGeo, skinMat.clone(), lUpperArm.pivot);
    lForearm.pivot.position.set(0, -0.4, 0);
    lForearm.mesh.position.y = -0.18;
    const lFist = new THREE.Mesh(fistGeo, skinMat.clone());
    lFist.position.set(0, -0.38, 0);
    lForearm.pivot.add(lFist);

    const wbGeo = new THREE.TorusGeometry(0.1, 0.025, 6, 10);
    const lWristband = new THREE.Mesh(wbGeo, accentMat.clone());
    lWristband.position.set(0, -0.28, 0);
    lWristband.rotation.x = Math.PI / 2;
    lForearm.pivot.add(lWristband);

    const rUpperArm = makeLimb(upperArmGeo, skinMat.clone(), root);
    rUpperArm.pivot.position.set(0.6, 1.5, 0);
    rUpperArm.mesh.position.y = -0.2;
    const rForearm = makeLimb(forearmGeo, skinMat.clone(), rUpperArm.pivot);
    rForearm.pivot.position.set(0, -0.4, 0);
    rForearm.mesh.position.y = -0.18;
    const rFist = new THREE.Mesh(fistGeo, skinMat.clone());
    rFist.position.set(0, -0.38, 0);
    rForearm.pivot.add(rFist);

    const rWristband = new THREE.Mesh(wbGeo, accentMat.clone());
    rWristband.position.set(0, -0.28, 0);
    rWristband.rotation.x = Math.PI / 2;
    rForearm.pivot.add(rWristband);

    const headGeo = new THREE.SphereGeometry(0.23, 10, 8);
    const head = new THREE.Mesh(headGeo, skinMat.clone());
    head.position.y = 1.8;
    head.scale.set(1, 1.06, 0.95);
    root.add(head);

    const maskGeo = new THREE.SphereGeometry(0.235, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const mask = new THREE.Mesh(maskGeo, accentMat.clone());
    mask.position.y = 1.81;
    mask.scale.set(1, 1.06, 0.95);
    root.add(mask);

    const visorGeo = new THREE.BoxGeometry(0.32, 0.06, 0.14);
    const visor = new THREE.Mesh(visorGeo, new THREE.MeshPhongMaterial({
        color: 0x111122, specular: 0x8888ff, shininess: 80,
        emissive: colorSet.accent, emissiveIntensity: 0.15,
    }));
    visor.position.set(0, 1.77, -0.16);
    root.add(visor);

    const hipsGeo = new THREE.SphereGeometry(0.34, 8, 6);
    const hips = new THREE.Mesh(hipsGeo, darkMat.clone());
    hips.position.y = 0.72;
    hips.scale.set(1.12, 0.5, 0.82);
    root.add(hips);

    const thighGeo = new THREE.CapsuleGeometry(0.14, 0.32, 4, 7);
    const shinGeo = new THREE.CapsuleGeometry(0.11, 0.3, 4, 7);
    const bootGeo = new THREE.BoxGeometry(0.2, 0.14, 0.3);

    const lThigh = makeLimb(thighGeo, darkMat.clone(), root);
    lThigh.pivot.position.set(-0.24, 0.62, 0);
    lThigh.mesh.position.y = -0.22;
    const lShin = makeLimb(shinGeo, skinMat.clone(), lThigh.pivot);
    lShin.pivot.position.set(0, -0.44, 0);
    lShin.mesh.position.y = -0.2;
    const lBoot = new THREE.Mesh(bootGeo, accentMat.clone());
    lBoot.position.set(0, -0.42, 0.04);
    lShin.pivot.add(lBoot);

    const lKnee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), accentMat.clone());
    lKnee.position.set(0, -0.44, -0.05);
    lThigh.pivot.add(lKnee);

    const rThigh = makeLimb(thighGeo, darkMat.clone(), root);
    rThigh.pivot.position.set(0.24, 0.62, 0);
    rThigh.mesh.position.y = -0.22;
    const rShin = makeLimb(shinGeo, skinMat.clone(), rThigh.pivot);
    rShin.pivot.position.set(0, -0.44, 0);
    rShin.mesh.position.y = -0.2;
    const rBoot = new THREE.Mesh(bootGeo, accentMat.clone());
    rBoot.position.set(0, -0.42, 0.04);
    rShin.pivot.add(rBoot);

    const rKnee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), accentMat.clone());
    rKnee.position.set(0, -0.44, -0.05);
    rThigh.pivot.add(rKnee);

    const shadowGeo = new THREE.CircleGeometry(0.65, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    char.bodyParts = {
        torso, chest, head, mask, visor, hips, belt, buckle,
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
    char.damage = 0;
    char.health = char.maxHealth;
    char.stamina = char.maxStamina;
    char.staminaRegenDelay = 0;
    char.state = CharState.IDLE;
    char.prevState = CharState.IDLE;
    char.blendTimer = 0;
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
    char.sprintAttack = false;
    char.landingTimer = 0;
    char.mesh.position.copy(char.position);
    char.mesh.rotation.set(0, 0, 0);
    char.mesh.visible = true;
    resetPose(char);
}

function resetPose(char) {
    const p = char.bodyParts;
    p.torso.position.set(0, 1.1, 0);
    p.torso.rotation.set(0, 0, 0);
    p.chest.position.set(0, 1.44, 0);
    p.chest.rotation.set(0, 0, 0);
    p.head.position.set(0, 1.8, 0);
    p.head.rotation.set(0, 0, 0);
    p.mask.position.set(0, 1.81, 0);
    p.visor.position.set(0, 1.77, -0.16);
    p.hips.position.set(0, 0.72, 0);
    p.hips.rotation.set(0, 0, 0);
    p.lShoulder.position.set(-0.6, 1.54, 0);
    p.rShoulder.position.set(0.6, 1.54, 0);
    p.lUpperArm.pivot.position.set(-0.6, 1.5, 0);
    p.lUpperArm.pivot.rotation.set(0, 0, 0);
    p.lForearm.pivot.rotation.set(0, 0, 0);
    p.rUpperArm.pivot.position.set(0.6, 1.5, 0);
    p.rUpperArm.pivot.rotation.set(0, 0, 0);
    p.rForearm.pivot.rotation.set(0, 0, 0);
    p.lThigh.pivot.position.set(-0.24, 0.62, 0);
    p.lThigh.pivot.rotation.set(0, 0, 0);
    p.lShin.pivot.rotation.set(0, 0, 0);
    p.rThigh.pivot.position.set(0.24, 0.62, 0);
    p.rThigh.pivot.rotation.set(0, 0, 0);
    p.rShin.pivot.rotation.set(0, 0, 0);
}

function easeOut(x) { return 1 - (1 - x) * (1 - x); }
function easeIn(x) { return x * x; }
function easePunch(t, wind, hit, recov) {
    if (t < wind) return 0;
    if (t < hit) return easeOut((t - wind) / (hit - wind));
    if (t < recov) return 1;
    return 1;
}

export function updateCharacterAnimation(char, dt) {
    if (!char.alive && char.state !== CharState.KO && char.state !== CharState.RINGOUT &&
        char.state !== CharState.GROUND_BOUNCE && char.state !== CharState.LAUNCHED) return;

    char.animTime += dt;

    if (char.landingTimer > 0) char.landingTimer -= dt;

    const t = char.animTime;
    const p = char.bodyParts;
    const st = char.state;

    resetPose(char);

    const squash = char.landingTimer > 0 ? Math.max(0, char.landingTimer / 0.12) * 0.08 : 0;
    if (squash > 0) {
        p.torso.position.y -= squash * 2;
        p.chest.position.y -= squash * 2;
        p.hips.position.y -= squash;
        p.lThigh.pivot.position.y -= squash;
        p.rThigh.pivot.position.y -= squash;
    }

    switch (st) {
        case CharState.IDLE: {
            const breathe = Math.sin(t * 2.2 + char.bobPhase) * 0.015;
            const sway = Math.sin(t * 1.6) * 0.025;
            p.chest.position.y += breathe;
            p.head.position.y += breathe * 0.5;
            p.lShoulder.position.y += breathe * 0.6;
            p.rShoulder.position.y += breathe * 0.6;
            p.lUpperArm.pivot.rotation.set(-0.15, 0, 0.2);
            p.rUpperArm.pivot.rotation.set(-0.15, 0, -0.2);
            p.lForearm.pivot.rotation.x = -0.4;
            p.rForearm.pivot.rotation.x = -0.4;
            p.torso.rotation.y = sway;
            p.lThigh.pivot.rotation.x = 0.05;
            p.rThigh.pivot.rotation.x = -0.05;
            p.lShin.pivot.rotation.x = -0.05;
            p.rShin.pivot.rotation.x = 0.05;
            break;
        }
        case CharState.WALK:
        case CharState.SPRINT: {
            const isSprint = st === CharState.SPRINT;
            const freq = isSprint ? 11 : 6.5;
            const stride = isSprint ? 0.6 : 0.38;
            const bob = Math.sin(t * freq) * (isSprint ? 0.045 : 0.02);
            const lean = isSprint ? 0.18 : 0.06;
            const phase = Math.sin(t * freq);
            const halfP = Math.sin(t * freq * 2);

            p.chest.position.y += bob;
            p.torso.rotation.x = lean;
            p.chest.rotation.x = -lean * 0.4;
            p.hips.rotation.y = phase * 0.1;

            p.lThigh.pivot.rotation.x = phase * stride;
            p.rThigh.pivot.rotation.x = -phase * stride;
            p.lShin.pivot.rotation.x = Math.max(0, -phase) * stride * 0.9 + 0.05;
            p.rShin.pivot.rotation.x = Math.max(0, phase) * stride * 0.9 + 0.05;

            const armS = isSprint ? 0.7 : 0.45;
            p.lUpperArm.pivot.rotation.x = -phase * armS;
            p.rUpperArm.pivot.rotation.x = phase * armS;
            p.lUpperArm.pivot.rotation.z = 0.08;
            p.rUpperArm.pivot.rotation.z = -0.08;
            p.lForearm.pivot.rotation.x = isSprint ? -0.9 : -0.5;
            p.rForearm.pivot.rotation.x = isSprint ? -0.9 : -0.5;

            if (isSprint) {
                p.chest.rotation.z = phase * 0.04;
                p.torso.position.y -= 0.03;
            }
            break;
        }
        case CharState.JUMP: {
            const rise = Math.min(char.stateTimer / 0.15, 1);
            p.lUpperArm.pivot.rotation.set(-0.9 * rise, 0, 0.7 * rise);
            p.rUpperArm.pivot.rotation.set(-0.9 * rise, 0, -0.7 * rise);
            p.lForearm.pivot.rotation.x = -0.7;
            p.rForearm.pivot.rotation.x = -0.7;
            p.lThigh.pivot.rotation.x = -0.4 * rise;
            p.rThigh.pivot.rotation.x = -0.35 * rise;
            p.lShin.pivot.rotation.x = 0.5 * rise;
            p.rShin.pivot.rotation.x = 0.45 * rise;
            p.torso.rotation.x = -0.05 * rise;
            break;
        }
        case CharState.FALL: {
            const fall = Math.min(char.stateTimer / 0.2, 1);
            p.lUpperArm.pivot.rotation.set(0.3, 0, 0.9 * fall);
            p.rUpperArm.pivot.rotation.set(0.3, 0, -0.9 * fall);
            p.lForearm.pivot.rotation.x = -0.2;
            p.rForearm.pivot.rotation.x = -0.2;
            p.lThigh.pivot.rotation.x = 0.35 * fall;
            p.rThigh.pivot.rotation.x = 0.15;
            p.lShin.pivot.rotation.x = -0.3 * fall;
            p.rShin.pivot.rotation.x = -0.45 * fall;
            p.torso.rotation.x = 0.05;
            break;
        }
        case CharState.LIGHT1: {
            const T = char.stateTimer;
            const wind = Math.min(T / 0.05, 1);
            const hit = T < 0.05 ? 0 : Math.min((T - 0.05) / 0.07, 1);
            const rec = T < 0.12 ? 0 : Math.min((T - 0.12) / 0.13, 1);
            const punch = hit * (1 - rec);
            const windup = wind * (1 - hit);

            p.rUpperArm.pivot.rotation.x = 0.4 * windup - 1.55 * punch;
            p.rUpperArm.pivot.rotation.z = -0.15 - 0.2 * punch;
            p.rForearm.pivot.rotation.x = -0.3 * windup - 0.8 * punch;
            p.torso.rotation.y = 0.15 * windup - 0.3 * punch;
            p.chest.rotation.y = -0.2 * punch;
            p.hips.rotation.y = -0.08 * punch;
            p.lUpperArm.pivot.rotation.set(-0.25, 0, 0.2);
            p.lForearm.pivot.rotation.x = -0.8;
            p.lThigh.pivot.rotation.x = 0.12 * punch;
            p.rThigh.pivot.rotation.x = -0.1 * punch;
            p.rShin.pivot.rotation.x = 0.06;
            break;
        }
        case CharState.LIGHT2: {
            const T = char.stateTimer;
            const wind = Math.min(T / 0.05, 1);
            const hit = T < 0.05 ? 0 : Math.min((T - 0.05) / 0.07, 1);
            const rec = T < 0.12 ? 0 : Math.min((T - 0.12) / 0.13, 1);
            const punch = hit * (1 - rec);
            const windup = wind * (1 - hit);

            p.lUpperArm.pivot.rotation.x = 0.4 * windup - 1.55 * punch;
            p.lUpperArm.pivot.rotation.z = 0.15 + 0.2 * punch;
            p.lForearm.pivot.rotation.x = -0.3 * windup - 0.8 * punch;
            p.torso.rotation.y = -0.15 * windup + 0.3 * punch;
            p.chest.rotation.y = 0.2 * punch;
            p.hips.rotation.y = 0.08 * punch;
            p.rUpperArm.pivot.rotation.set(-0.25, 0, -0.2);
            p.rForearm.pivot.rotation.x = -0.8;
            break;
        }
        case CharState.LIGHT3: {
            const T = char.stateTimer;
            const wind = Math.min(T / 0.1, 1);
            const hit = T < 0.1 ? 0 : Math.min((T - 0.1) / 0.08, 1);
            const rec = T < 0.18 ? 0 : Math.min((T - 0.18) / 0.2, 1);
            const hook = hit * (1 - rec);
            const wu = wind * (1 - hit);

            p.rUpperArm.pivot.rotation.x = -0.9 * hook;
            p.rUpperArm.pivot.rotation.z = -0.5 * wu - 2.0 * hook;
            p.rForearm.pivot.rotation.x = -0.6 * wu - 1.3 * hook;
            p.torso.rotation.y = 0.35 * wu - 0.55 * hook;
            p.chest.rotation.y = -0.35 * hook;
            p.hips.rotation.y = -0.2 * hook;
            p.lUpperArm.pivot.rotation.set(-0.35, 0, 0.35);
            p.lForearm.pivot.rotation.x = -1.0;
            p.lThigh.pivot.rotation.x = -0.2 * hook;
            p.rThigh.pivot.rotation.x = 0.25 * hook;
            p.rShin.pivot.rotation.x = -0.1 * hook;

            if (hook > 0.5) {
                const shake = Math.sin(t * 50) * 0.02 * (1 - rec);
                p.torso.position.x += shake;
            }
            break;
        }
        case CharState.HEAVY_CHARGE: {
            const charge = Math.min(char.heavyChargeTime / 1.5, 1);
            const pulse = Math.sin(t * 15) * (0.02 + charge * 0.03);
            const tremble = Math.sin(t * 30) * charge * 0.015;

            p.torso.position.y = 1.04 + pulse;
            p.chest.position.y = 1.38 + pulse;
            p.torso.rotation.x = 0.12;
            p.torso.position.x = tremble;

            p.rUpperArm.pivot.rotation.x = 1.6 + charge * 0.4;
            p.rUpperArm.pivot.rotation.z = -0.45;
            p.rForearm.pivot.rotation.x = 0.9;
            p.lUpperArm.pivot.rotation.set(-0.5, 0, 0.3);
            p.lForearm.pivot.rotation.x = -1.1;
            p.lThigh.pivot.rotation.x = 0.18;
            p.rThigh.pivot.rotation.x = -0.12;
            p.lShin.pivot.rotation.x = -0.12;

            p.rFist.material.emissive.setHex(0xff4400);
            p.rFist.material.emissiveIntensity = charge * 1.0;
            p.rUpperArm.mesh.material.emissive.setHex(0xff2200);
            p.rUpperArm.mesh.material.emissiveIntensity = charge * 0.4;
            p.rForearm.mesh.material.emissive.setHex(0xff3300);
            p.rForearm.mesh.material.emissiveIntensity = charge * 0.2;
            break;
        }
        case CharState.HEAVY_RELEASE: {
            const T = char.stateTimer;
            const strike = Math.min(T / 0.1, 1);
            const rec = T < 0.1 ? 0 : Math.min((T - 0.1) / 0.3, 1);
            const smash = easeOut(strike) * (1 - rec * 0.6);

            p.rUpperArm.pivot.rotation.x = 1.8 - 3.5 * smash;
            p.rUpperArm.pivot.rotation.z = -0.45 + 0.25 * smash;
            p.rForearm.pivot.rotation.x = 0.9 - 1.8 * smash;
            p.torso.rotation.y = -0.55 * smash;
            p.torso.rotation.x = 0.2 * smash;
            p.chest.rotation.y = -0.35 * smash;
            p.hips.rotation.y = -0.18 * smash;
            p.lThigh.pivot.rotation.x = 0.25 * smash;
            p.rThigh.pivot.rotation.x = -0.18 * smash;
            p.rShin.pivot.rotation.x = 0.1 * smash;

            p.rFist.material.emissiveIntensity *= 0.9;
            p.rUpperArm.mesh.material.emissiveIntensity *= 0.9;
            p.rForearm.mesh.material.emissiveIntensity *= 0.9;
            break;
        }
        case CharState.ELBOW_DROP: {
            const T = char.stateTimer;
            const leap = Math.min(T / 0.15, 1);
            const drop = T < 0.15 ? 0 : Math.min((T - 0.15) / 0.15, 1);
            const land = T < 0.3 ? 0 : Math.min((T - 0.3) / 0.2, 1);

            if (T < 0.15) {
                p.torso.rotation.x = -0.2 * leap;
                p.rUpperArm.pivot.rotation.x = -2.0 * leap;
                p.rUpperArm.pivot.rotation.z = -0.3;
                p.rForearm.pivot.rotation.x = -1.5 * leap;
            } else if (T < 0.3) {
                p.torso.rotation.x = 0.6 * easeIn(drop);
                p.rUpperArm.pivot.rotation.x = -2.0 + 3.5 * easeIn(drop);
                p.rForearm.pivot.rotation.x = -1.5 + 0.8 * drop;
                p.lThigh.pivot.rotation.x = 0.4 * drop;
                p.rThigh.pivot.rotation.x = 0.2 * drop;
            } else {
                p.torso.rotation.x = 0.3 * (1 - land);
                p.rUpperArm.pivot.rotation.x = 0.5 * (1 - land);
                p.rForearm.pivot.rotation.x = -0.5;
            }
            p.lUpperArm.pivot.rotation.set(-0.4, 0, 0.4);
            p.lForearm.pivot.rotation.x = -0.6;
            break;
        }
        case CharState.DODGE: {
            const roll = Math.min(char.stateTimer / 0.35, 1);
            const rollAngle = easeOut(roll) * Math.PI * 2;
            const tuck = Math.sin(roll * Math.PI);

            p.torso.position.y = 1.1 - tuck * 0.45;
            p.chest.position.y = 1.44 - tuck * 0.4;
            p.head.position.y = 1.8 - tuck * 0.5;
            p.mask.position.y = 1.81 - tuck * 0.5;
            p.visor.position.y = 1.77 - tuck * 0.5;
            p.hips.position.y = 0.72 - tuck * 0.3;
            p.torso.rotation.x = rollAngle;

            p.lUpperArm.pivot.position.y = 1.5 - tuck * 0.3;
            p.rUpperArm.pivot.position.y = 1.5 - tuck * 0.3;
            p.lUpperArm.pivot.rotation.x = -1.2;
            p.rUpperArm.pivot.rotation.x = -1.2;
            p.lForearm.pivot.rotation.x = -1.4;
            p.rForearm.pivot.rotation.x = -1.4;
            p.lThigh.pivot.position.y = 0.62 - tuck * 0.25;
            p.rThigh.pivot.position.y = 0.62 - tuck * 0.25;
            p.lThigh.pivot.rotation.x = -1.0 * tuck;
            p.rThigh.pivot.rotation.x = -0.9 * tuck;
            p.lShin.pivot.rotation.x = 1.2 * tuck;
            p.rShin.pivot.rotation.x = 1.1 * tuck;
            break;
        }
        case CharState.GRAB: {
            const T = char.stateTimer;
            const reach = Math.min(T / 0.12, 1);
            const rec = T < 0.25 ? 0 : Math.min((T - 0.25) / 0.17, 1);
            const ext = easeOut(reach) * (1 - rec);

            p.torso.rotation.x = 0.25 * ext;
            p.chest.rotation.x = 0.1 * ext;
            p.lUpperArm.pivot.rotation.x = -1.7 * ext;
            p.lUpperArm.pivot.rotation.z = 0.25 * ext;
            p.rUpperArm.pivot.rotation.x = -1.7 * ext;
            p.rUpperArm.pivot.rotation.z = -0.25 * ext;
            p.lForearm.pivot.rotation.x = -0.2 * ext;
            p.rForearm.pivot.rotation.x = -0.2 * ext;
            p.lThigh.pivot.rotation.x = 0.25 * ext;
            p.rThigh.pivot.rotation.x = -0.12 * ext;
            p.rShin.pivot.rotation.x = 0.08 * ext;
            break;
        }
        case CharState.GRAB_HOLD: {
            const lift = easeOut(Math.min(char.stateTimer / 0.35, 1));
            const strain = Math.sin(t * 10) * 0.025;

            p.lUpperArm.pivot.rotation.x = -1.7 + 2.8 * lift;
            p.rUpperArm.pivot.rotation.x = -1.7 + 2.8 * lift;
            p.lUpperArm.pivot.rotation.z = 0.2 - 0.1 * lift;
            p.rUpperArm.pivot.rotation.z = -0.2 + 0.1 * lift;
            p.lForearm.pivot.rotation.x = -0.9 + 0.4 * lift;
            p.rForearm.pivot.rotation.x = -0.9 + 0.4 * lift;
            p.torso.rotation.x = -0.12 * lift;
            p.torso.rotation.z = strain;
            p.chest.rotation.x = -0.08 * lift;
            p.lThigh.pivot.rotation.x = 0.12 * lift;
            p.rThigh.pivot.rotation.x = -0.08 * lift;
            p.lShin.pivot.rotation.x = -0.08 * lift;
            p.rShin.pivot.rotation.x = 0.06 * lift;
            break;
        }
        case CharState.GRAB_SLAM: {
            const slam = easeIn(Math.min(char.stateTimer / 0.18, 1));

            p.torso.rotation.x = 0.5 * slam;
            p.chest.rotation.x = 0.15 * slam;
            p.lUpperArm.pivot.rotation.x = 1.1 - 2.2 * slam;
            p.rUpperArm.pivot.rotation.x = 1.1 - 2.2 * slam;
            p.lForearm.pivot.rotation.x = -0.5;
            p.rForearm.pivot.rotation.x = -0.5;
            p.lThigh.pivot.rotation.x = 0.35 * slam;
            p.rThigh.pivot.rotation.x = -0.15 * slam;
            p.lShin.pivot.rotation.x = -0.2 * slam;
            p.hips.rotation.x = 0.1 * slam;
            break;
        }
        case CharState.GRABBED: {
            const lift = easeOut(Math.min(char.stateTimer / 0.4, 1));
            const flail = Math.sin(t * 14);
            const flail2 = Math.cos(t * 11);

            p.lUpperArm.pivot.rotation.set(0.6 + flail * 0.3, 0, 0.9);
            p.rUpperArm.pivot.rotation.set(0.6 - flail * 0.3, 0, -0.9);
            p.lForearm.pivot.rotation.x = -0.4 + flail2 * 0.15;
            p.rForearm.pivot.rotation.x = -0.4 - flail2 * 0.15;
            p.lThigh.pivot.rotation.x = 0.4 + flail * 0.25;
            p.rThigh.pivot.rotation.x = -0.15 - flail * 0.25;
            p.lShin.pivot.rotation.x = -0.5 + flail2 * 0.15;
            p.rShin.pivot.rotation.x = -0.3 - flail2 * 0.15;
            p.torso.rotation.z = flail * 0.06;
            p.head.rotation.x = -0.15;
            p.head.rotation.z = flail * 0.1;

            char.mesh.position.set(char.position.x, char.position.y + lift * 1.3, char.position.z);
            char.mesh.rotation.y = char.facing;
            p.shadow.position.y = -char.position.y - lift * 1.3 + 0.02;
            return;
        }
        case CharState.BLOCK: {
            const guard = Math.min(char.stateTimer / 0.08, 1);
            p.lUpperArm.pivot.rotation.set(-1.3 * guard, 0, 0.15);
            p.rUpperArm.pivot.rotation.set(-1.3 * guard, 0, -0.15);
            p.lForearm.pivot.rotation.set(-1.4 * guard, 0, 0.25 * guard);
            p.rForearm.pivot.rotation.set(-1.4 * guard, 0, -0.25 * guard);
            p.torso.rotation.x = -0.06 * guard;
            p.lThigh.pivot.rotation.x = 0.1 * guard;
            p.rThigh.pivot.rotation.x = -0.1 * guard;
            p.lShin.pivot.rotation.x = -0.12 * guard;
            p.rShin.pivot.rotation.x = 0.12 * guard;
            break;
        }
        case CharState.HITSTUN: {
            const reel = easeOut(Math.min(char.stateTimer / 0.06, 1));
            const rec = Math.max(0, (char.stateTimer - 0.15) / 0.15);
            const active = reel * (1 - rec);
            const shake = Math.sin(t * 50) * 0.05 * active;

            p.torso.rotation.x = -0.25 * active;
            p.torso.position.x = shake;
            p.chest.rotation.x = -0.18 * active;
            p.head.rotation.x = -0.35 * active;
            p.head.position.x = shake * 1.5;
            p.lUpperArm.pivot.rotation.set(0.5 * active, 0, 0.6 * active);
            p.rUpperArm.pivot.rotation.set(0.5 * active, 0, -0.6 * active);
            p.lForearm.pivot.rotation.x = -0.2;
            p.rForearm.pivot.rotation.x = -0.2;
            p.lThigh.pivot.rotation.x = 0.1 * active;
            p.rThigh.pivot.rotation.x = -0.05 * active;
            break;
        }
        case CharState.KNOCKBACK:
        case CharState.LAUNCHED: {
            const tumble = char.stateTimer * 7;
            const flop = easeOut(Math.min(char.stateTimer / 0.12, 1));
            const ts = Math.sin(tumble);
            const tc = Math.cos(tumble);

            p.torso.rotation.x = -0.55 * flop + ts * 0.18;
            p.torso.rotation.z = tc * 0.1 * flop;
            p.chest.rotation.x = -0.35 * flop;
            p.head.rotation.x = -0.45 * flop;
            p.head.rotation.z = ts * 0.15;
            p.lUpperArm.pivot.rotation.set(0.7, 0, 1.0 + ts * 0.15);
            p.rUpperArm.pivot.rotation.set(0.4, 0, -0.8 - tc * 0.15);
            p.lForearm.pivot.rotation.x = -0.5 + ts * 0.1;
            p.rForearm.pivot.rotation.x = -0.3 - tc * 0.1;
            p.lThigh.pivot.rotation.x = 0.5 + ts * 0.2;
            p.rThigh.pivot.rotation.x = -0.25 + tc * 0.2;
            p.lShin.pivot.rotation.x = -0.35 + ts * 0.1;
            p.rShin.pivot.rotation.x = -0.55 - tc * 0.1;
            break;
        }
        case CharState.GROUND_BOUNCE: {
            const T = char.stateTimer;
            const impact = Math.max(0, 1 - T / 0.12);
            const getup = T > 0.35 ? Math.min((T - 0.35) / 0.25, 1) : 0;
            const spread = impact * (1 - getup);

            p.torso.rotation.x = 1.3 * spread - 0.1 * getup;
            p.chest.rotation.x = 0.35 * spread;
            p.head.rotation.x = 0.45 * spread - 0.1 * getup;
            p.lUpperArm.pivot.rotation.set(0.9 * spread, 0, 1.3 * spread);
            p.rUpperArm.pivot.rotation.set(0.6 * spread, 0, -1.1 * spread);
            p.lForearm.pivot.rotation.x = -0.3;
            p.rForearm.pivot.rotation.x = -0.2;
            p.lThigh.pivot.rotation.x = 0.7 * spread;
            p.rThigh.pivot.rotation.x = -0.35 * spread;
            p.lShin.pivot.rotation.x = -0.9 * spread;
            p.rShin.pivot.rotation.x = -0.6 * spread;
            break;
        }
        case CharState.GETUP: {
            const rise = easeOut(Math.min(char.stateTimer / 0.4, 1));
            p.torso.rotation.x = 0.3 * (1 - rise);
            p.lThigh.pivot.rotation.x = 0.3 * (1 - rise);
            p.rThigh.pivot.rotation.x = -0.15 * (1 - rise);
            p.lUpperArm.pivot.rotation.set(0.2 * (1 - rise), 0, 0.3 * (1 - rise));
            p.rUpperArm.pivot.rotation.set(0.1 * (1 - rise), 0, -0.2 * (1 - rise));
            break;
        }
        case CharState.KO: {
            const fall = easeOut(Math.min(char.stateTimer / 0.8, 1));
            char.mesh.rotation.z = fall * (Math.PI / 2) * 0.85;
            char.mesh.position.y = char.position.y - fall * 0.5;

            p.lUpperArm.pivot.rotation.set(0.6 * fall, 0, 1.3 * fall);
            p.rUpperArm.pivot.rotation.set(0.35 * fall, 0, -0.9 * fall);
            p.lForearm.pivot.rotation.x = -0.45 * fall;
            p.rForearm.pivot.rotation.x = -0.25 * fall;
            p.lThigh.pivot.rotation.x = 0.35 * fall;
            p.rThigh.pivot.rotation.x = -0.25 * fall;
            p.lShin.pivot.rotation.x = -0.7 * fall;
            p.rShin.pivot.rotation.x = -0.5 * fall;
            p.head.rotation.set(-0.1 * fall, 0, 0.35 * fall);
            p.torso.rotation.z = 0.1 * fall;
            return;
        }
        case CharState.RINGOUT: {
            char.position.y -= 20 * dt;
            char.mesh.position.copy(char.position);
            char.mesh.rotation.x += dt * 6;
            char.mesh.rotation.z += dt * 4;

            const flail = Math.sin(t * 12);
            const flail2 = Math.cos(t * 9);
            p.lUpperArm.pivot.rotation.set(flail * 0.4, 0, 1.3 + flail2 * 0.3);
            p.rUpperArm.pivot.rotation.set(-flail * 0.4, 0, -1.3 - flail2 * 0.3);
            p.lForearm.pivot.rotation.x = -0.5 + flail * 0.2;
            p.rForearm.pivot.rotation.x = -0.5 - flail * 0.2;
            p.lThigh.pivot.rotation.x = 0.5 + flail * 0.3;
            p.rThigh.pivot.rotation.x = -0.4 - flail * 0.3;
            p.lShin.pivot.rotation.x = -0.4 + flail2 * 0.2;
            p.rShin.pivot.rotation.x = -0.3 - flail2 * 0.2;
            return;
        }
    }

    if (st !== CharState.HEAVY_CHARGE && st !== CharState.HEAVY_RELEASE) {
        p.rFist.material.emissiveIntensity = 0;
        p.rUpperArm.mesh.material.emissiveIntensity = 0;
        if (p.rForearm.mesh.material.emissiveIntensity) {
            p.rForearm.mesh.material.emissiveIntensity = 0;
        }
    }

    char.mesh.position.copy(char.position);
    char.mesh.rotation.y = char.facing;

    const groundDist = Math.max(0, char.position.y);
    p.shadow.position.y = -char.position.y + 0.02;
    const ss = Math.max(0.15, 1 - groundDist * 0.05);
    p.shadow.scale.set(ss, ss, ss);
}
