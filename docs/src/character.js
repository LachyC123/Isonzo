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
    BLOCK: 'block',
    HITSTUN: 'hitstun',
    KNOCKBACK: 'knockback',
    KO: 'ko',
    RINGOUT: 'ringout',
};

export const ACTION_STATES = new Set([
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE,
    CharState.DODGE, CharState.GRAB, CharState.BLOCK,
    CharState.HITSTUN, CharState.KNOCKBACK,
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

export function createCharacter(name, colorSet, isPlayer) {
    const char = {
        name,
        isPlayer,
        mesh: null,
        bodyParts: {},

        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        facing: 0,

        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        staminaRegenDelay: 0,

        state: CharState.IDLE,
        stateTimer: 0,
        grounded: true,
        alive: true,

        combo: 0,
        comboTimer: 0,
        heavyChargeTime: 0,
        attackHit: false,
        iFrames: false,
        hitstopTimer: 0,

        knockbackVel: new THREE.Vector3(),

        buffs: { damageUp: false, staminaUp: false, regenUp: false, throwUp: false },

        kills: 0,
        damageDealt: 0,
        roundWins: 0,

        intent: createIntent(),
        animTime: 0,
        bobPhase: Math.random() * Math.PI * 2,
        colorSet,
    };

    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.32, 0.7, 4, 8);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: colorSet.body,
        specular: 0x222222,
        shininess: 25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.87;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.26, 8, 6);
    const headMat = new THREE.MeshPhongMaterial({
        color: colorSet.accent,
        specular: 0x333333,
        shininess: 35,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.58;
    group.add(head);

    const armGeo = new THREE.BoxGeometry(0.14, 0.48, 0.14);
    const leftArm = new THREE.Mesh(armGeo, bodyMat.clone());
    leftArm.position.set(-0.46, 0.9, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat.clone());
    rightArm.position.set(0.46, 0.9, 0);
    group.add(rightArm);

    const shadowGeo = new THREE.CircleGeometry(0.45, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    char.bodyParts = { body, head, leftArm, rightArm, shadow };
    char.mesh = group;
    return char;
}

export function resetCharacter(char, x, z) {
    char.position.set(x, 0, z);
    char.velocity.set(0, 0, 0);
    char.knockbackVel.set(0, 0, 0);
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
    char.mesh.position.copy(char.position);
    char.mesh.rotation.set(0, 0, 0);
    char.mesh.visible = true;

    const p = char.bodyParts;
    p.body.position.set(0, 0.87, 0);
    p.body.scale.set(1, 1, 1);
    p.body.rotation.set(0, 0, 0);
    p.head.position.set(0, 1.58, 0);
    p.leftArm.position.set(-0.46, 0.9, 0);
    p.leftArm.rotation.set(0, 0, 0);
    p.rightArm.position.set(0.46, 0.9, 0);
    p.rightArm.rotation.set(0, 0, 0);
}

export function updateCharacterAnimation(char, dt) {
    if (!char.alive && char.state !== CharState.KO && char.state !== CharState.RINGOUT) return;

    char.animTime += dt;
    const t = char.animTime;
    const p = char.bodyParts;
    const st = char.state;

    p.body.position.x = 0;
    p.head.position.x = 0;
    p.body.scale.set(1, 1, 1);
    p.body.rotation.set(0, 0, 0);

    switch (st) {
        case CharState.IDLE: {
            const bob = Math.sin(t * 2.5 + char.bobPhase) * 0.015;
            p.body.position.y = 0.87 + bob;
            p.head.position.y = 1.58 + bob;
            p.leftArm.rotation.set(0, 0, 0);
            p.rightArm.rotation.set(0, 0, 0);
            p.leftArm.position.set(-0.46, 0.9, 0);
            p.rightArm.position.set(0.46, 0.9, 0);
            break;
        }
        case CharState.WALK:
        case CharState.SPRINT: {
            const spd = st === CharState.SPRINT ? 9 : 5;
            const amp = st === CharState.SPRINT ? 0.05 : 0.025;
            const bob = Math.sin(t * spd) * amp;
            p.body.position.y = 0.87 + bob;
            p.head.position.y = 1.58 + bob;
            const armSwing = Math.sin(t * spd) * 0.6;
            p.leftArm.rotation.x = armSwing;
            p.rightArm.rotation.x = -armSwing;
            p.leftArm.position.set(-0.46, 0.9, 0);
            p.rightArm.position.set(0.46, 0.9, 0);
            break;
        }
        case CharState.JUMP:
        case CharState.FALL: {
            p.body.position.y = 0.87;
            p.head.position.y = 1.58;
            p.leftArm.rotation.x = st === CharState.JUMP ? -0.7 : 0.3;
            p.rightArm.rotation.x = st === CharState.JUMP ? -0.7 : 0.3;
            p.leftArm.position.set(-0.46, 0.9, 0);
            p.rightArm.position.set(0.46, 0.9, 0);
            break;
        }
        case CharState.LIGHT1: {
            const prog = Math.sin(Math.min(char.stateTimer / 0.15, 1) * Math.PI);
            p.rightArm.rotation.x = -1.4 * prog;
            p.rightArm.position.set(0.46, 0.9, -0.3 * prog);
            p.leftArm.rotation.set(0, 0, 0);
            p.leftArm.position.set(-0.46, 0.9, 0);
            break;
        }
        case CharState.LIGHT2: {
            const prog = Math.sin(Math.min(char.stateTimer / 0.15, 1) * Math.PI);
            p.leftArm.rotation.x = -1.4 * prog;
            p.leftArm.position.set(-0.46, 0.9, -0.3 * prog);
            p.rightArm.rotation.set(0, 0, 0);
            p.rightArm.position.set(0.46, 0.9, 0);
            break;
        }
        case CharState.LIGHT3: {
            const prog = Math.sin(Math.min(char.stateTimer / 0.2, 1) * Math.PI);
            p.rightArm.rotation.x = -0.4;
            p.rightArm.rotation.z = -1.6 * prog;
            p.rightArm.position.set(0.46, 0.9, -0.15 * prog);
            p.leftArm.rotation.x = -0.3;
            p.leftArm.position.set(-0.46, 0.9, 0);
            break;
        }
        case CharState.HEAVY_CHARGE: {
            const pulse = Math.sin(t * 12) * 0.04;
            p.body.position.y = 0.82 + pulse;
            p.head.position.y = 1.53 + pulse;
            p.rightArm.rotation.x = 1.2;
            p.rightArm.position.set(0.46, 0.9, 0.25);
            p.leftArm.rotation.x = -0.4;
            p.leftArm.position.set(-0.46, 0.9, -0.1);
            const glow = Math.min(char.heavyChargeTime / 1.5, 1);
            p.rightArm.material.emissive.setHex(0xff4400);
            p.rightArm.material.emissiveIntensity = glow * 0.6;
            break;
        }
        case CharState.HEAVY_RELEASE: {
            const prog = Math.sin(Math.min(char.stateTimer / 0.2, 1) * Math.PI);
            p.rightArm.rotation.x = 1.2 - 2.8 * prog;
            p.rightArm.position.set(0.46, 0.9, 0.25 - 0.6 * prog);
            p.body.rotation.y = -0.4 * prog;
            p.rightArm.material.emissiveIntensity *= 0.9;
            break;
        }
        case CharState.DODGE: {
            p.body.position.y = 0.55;
            p.body.scale.set(1.1, 0.65, 1.1);
            p.head.position.y = 1.15;
            p.leftArm.position.set(-0.46, 0.7, 0);
            p.rightArm.position.set(0.46, 0.7, 0);
            p.leftArm.rotation.set(0, 0, 0);
            p.rightArm.rotation.set(0, 0, 0);
            break;
        }
        case CharState.GRAB: {
            const prog = Math.min(char.stateTimer / 0.2, 1);
            p.leftArm.rotation.x = -1.1 * prog;
            p.rightArm.rotation.x = -1.1 * prog;
            p.leftArm.position.set(-0.34, 0.9, -0.3 * prog);
            p.rightArm.position.set(0.34, 0.9, -0.3 * prog);
            break;
        }
        case CharState.BLOCK: {
            p.leftArm.rotation.x = -0.9;
            p.rightArm.rotation.x = -0.9;
            p.leftArm.position.set(-0.28, 1.0, -0.2);
            p.rightArm.position.set(0.28, 1.0, -0.2);
            break;
        }
        case CharState.HITSTUN: {
            const shake = Math.sin(t * 40) * 0.06;
            p.body.position.x = shake;
            p.head.position.x = shake;
            p.body.position.y = 0.87;
            p.head.position.y = 1.58;
            p.leftArm.rotation.set(0.3, 0, 0.3);
            p.rightArm.rotation.set(0.3, 0, -0.3);
            p.leftArm.position.set(-0.46, 0.9, 0);
            p.rightArm.position.set(0.46, 0.9, 0);
            break;
        }
        case CharState.KNOCKBACK: {
            const lean = Math.min(char.stateTimer / 0.2, 1) * 0.4;
            p.body.rotation.x = lean;
            p.body.position.y = 0.87;
            p.head.position.y = 1.58;
            p.leftArm.rotation.set(0.5, 0, 0.4);
            p.rightArm.rotation.set(0.5, 0, -0.4);
            p.leftArm.position.set(-0.46, 0.9, 0);
            p.rightArm.position.set(0.46, 0.9, 0);
            break;
        }
        case CharState.KO: {
            const fall = Math.min(char.stateTimer / 0.6, 1);
            char.mesh.rotation.z = fall * (Math.PI / 2);
            char.mesh.position.y = char.position.y - fall * 0.4;
            return;
        }
        case CharState.RINGOUT: {
            char.position.y -= 18 * dt;
            char.mesh.position.copy(char.position);
            char.mesh.rotation.x += dt * 5;
            char.mesh.rotation.z += dt * 3;
            return;
        }
    }

    if (st !== CharState.HEAVY_CHARGE && st !== CharState.HEAVY_RELEASE) {
        p.rightArm.material.emissiveIntensity = 0;
    }

    char.mesh.position.copy(char.position);
    char.mesh.rotation.y = char.facing;

    const groundDist = Math.max(0, char.position.y);
    p.shadow.position.y = -char.position.y + 0.02;
    const ss = Math.max(0.1, 1 - groundDist * 0.08);
    p.shadow.scale.set(ss, ss, ss);
}
