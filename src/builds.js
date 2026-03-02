import { CharState } from './character.js';

export const BUILDS = [
    {
        id: 'titan',
        name: 'TITAN',
        category: 'tall',
        desc: 'Massive powerhouse. Slow but devastating hits.',
        scale: 1.25,
        stats: {
            moveSpeed: 0.74,
            sprintSpeed: 0.8,
            jumpPower: 0.85,
            damageMult: 1.4,
            knockbackMult: 1.45,
            knockbackResist: 0.62,
            staminaMax: 90,
            staminaRegen: 0.8,
            weight: 1.55,
            dodgeCost: 28,
            grabCost: 28,
            sprintDrain: 17,
            hitstunTaken: 0.85,
            airControl: 0.72,
            grabRange: 1,
            heavyChargeRate: 1.12,
        },
        passive: 'Super Armor: light attacks cannot stagger',
        passiveId: 'superArmor',
        signatureMove: CharState.SPECIAL_CRATER,
        color: 0xcc4422,
    },
    {
        id: 'guardian',
        name: 'GUARDIAN',
        category: 'tall',
        desc: 'Armored tank. Great grabs and block recovery.',
        scale: 1.18,
        stats: {
            moveSpeed: 0.82,
            sprintSpeed: 0.86,
            jumpPower: 0.92,
            damageMult: 1.05,
            knockbackMult: 1.15,
            knockbackResist: 0.58,
            staminaMax: 120,
            staminaRegen: 1.2,
            weight: 1.38,
            dodgeCost: 24,
            grabCost: 22,
            sprintDrain: 13,
            hitstunTaken: 0.78,
            airControl: 0.8,
            grabRange: 1.1,
            heavyChargeRate: 0.9,
        },
        passive: 'Iron Guard: blocking costs no stamina',
        passiveId: 'ironGuard',
        signatureMove: CharState.SPECIAL_CHAIN_GRAB,
        color: 0x3355aa,
    },
    {
        id: 'brawler',
        name: 'BRAWLER',
        category: 'medium',
        desc: 'Balanced fighter. Good at everything.',
        scale: 1.0,
        stats: {
            moveSpeed: 1.0,
            sprintSpeed: 1.0,
            jumpPower: 1.0,
            damageMult: 1.0,
            knockbackMult: 1.0,
            knockbackResist: 1.0,
            staminaMax: 100,
            staminaRegen: 1.0,
            weight: 1.0,
            dodgeCost: 20,
            grabCost: 24,
            sprintDrain: 15,
            hitstunTaken: 1.0,
            airControl: 1.0,
            grabRange: 1,
            heavyChargeRate: 1,
        },
        passive: 'Combo King: light combo does bonus damage',
        passiveId: 'comboKing',
        signatureMove: CharState.SPECIAL_FLURRY,
        color: 0xdd8822,
    },
    {
        id: 'grappler',
        name: 'GRAPPLER',
        category: 'medium',
        desc: 'Throw specialist. Grabs hit harder and further.',
        scale: 1.05,
        stats: {
            moveSpeed: 0.9,
            sprintSpeed: 0.92,
            jumpPower: 0.9,
            damageMult: 1.05,
            knockbackMult: 1.08,
            knockbackResist: 0.86,
            staminaMax: 105,
            staminaRegen: 1.1,
            weight: 1.2,
            dodgeCost: 21,
            grabCost: 17,
            sprintDrain: 14,
            hitstunTaken: 0.9,
            airControl: 0.9,
            grabRange: 1.28,
            heavyChargeRate: 1.05,
        },
        passive: 'Power Throw: grabs deal 40% more damage and knockback',
        passiveId: 'powerThrow',
        signatureMove: CharState.SPECIAL_SUPLEX,
        color: 0x44aa44,
    },
    {
        id: 'striker',
        name: 'STRIKER',
        category: 'short',
        desc: 'Fast and fierce. Rapid combos, quick dodge.',
        scale: 0.85,
        stats: {
            moveSpeed: 1.24,
            sprintSpeed: 1.22,
            jumpPower: 1.08,
            damageMult: 0.88,
            knockbackMult: 0.85,
            knockbackResist: 1.24,
            staminaMax: 112,
            staminaRegen: 1.26,
            weight: 0.7,
            dodgeCost: 14,
            grabCost: 23,
            sprintDrain: 11,
            hitstunTaken: 1.18,
            airControl: 1.25,
            grabRange: 0.92,
            heavyChargeRate: 0.95,
        },
        passive: 'Quick Recovery: getup 50% faster',
        passiveId: 'quickRecovery',
        signatureMove: CharState.SPECIAL_UPPERCUT,
        color: 0xaa44cc,
    },
    {
        id: 'acrobat',
        name: 'ACROBAT',
        category: 'short',
        desc: 'Aerial master. Extra jumps and dropkick power.',
        scale: 0.82,
        stats: {
            moveSpeed: 1.18,
            sprintSpeed: 1.13,
            jumpPower: 1.3,
            damageMult: 0.85,
            knockbackMult: 0.9,
            knockbackResist: 1.3,
            staminaMax: 118,
            staminaRegen: 1.18,
            weight: 0.65,
            dodgeCost: 16,
            grabCost: 21,
            sprintDrain: 12,
            hitstunTaken: 1.22,
            airControl: 1.45,
            grabRange: 0.95,
            heavyChargeRate: 0.9,
        },
        passive: 'Air Superiority: dropkick does 50% more damage',
        passiveId: 'airSuperiority',
        signatureMove: CharState.SPECIAL_DROPKICK,
        color: 0x22bbcc,
    },
];

export function applyBuild(char, build) {
    char.build = build;
    char.specialMove = build.signatureMove;

    char.maxStamina = build.stats.staminaMax;
    char.stamina = char.maxStamina;

    char.mesh.scale.set(build.scale, build.scale, build.scale);

    const shadow = char.bodyParts.shadow;
    if (shadow) {
        shadow.scale.set(1 / build.scale, 1 / build.scale, 1 / build.scale);
    }

    const p = char.bodyParts;
    p.lShoulder.scale.set(1, 1, 1);
    p.rShoulder.scale.set(1, 1, 1);
    p.head.scale.set(1, 1.06, 0.95);
    p.hips.scale.set(1.12, 0.5, 0.82);
    p.lBoot.scale.set(1, 1, 1);
    p.rBoot.scale.set(1, 1, 1);

    if (build.category === 'tall') {
        p.lShoulder.scale.set(1.2, 1.2, 1.2);
        p.rShoulder.scale.set(1.2, 1.2, 1.2);
        p.hips.scale.set(1.2, 0.55, 0.9);
    } else if (build.category === 'short') {
        p.head.scale.set(1.12, 1.18, 1.06);
        p.lBoot.scale.set(1.12, 1.05, 1.2);
        p.rBoot.scale.set(1.12, 1.05, 1.2);
    }

    const accentColor = build.color;
    char.bodyParts.mask.material.color.setHex(accentColor);
    char.bodyParts.visor.material.emissive.setHex(accentColor);
    char.bodyParts.visor.material.emissiveIntensity = 0.28;
    char.bodyParts.belt.material.emissive.setHex(accentColor);
    char.bodyParts.belt.material.emissiveIntensity = 0.14;
}

export function getBuildDamageMult(char) {
    if (!char.build) return 1;
    let mult = char.build.stats.damageMult;
    if (char.build.passiveId === 'comboKing' && char.combo >= 3) mult *= 1.25;
    return mult;
}

export function getBuildKBMult(char) {
    if (!char.build) return 1;
    let mult = char.build.stats.knockbackMult;
    if (char.build.passiveId === 'powerThrow') mult *= 1.0;
    return mult;
}

export function getBuildKBResist(char) {
    if (!char.build) return 1;
    return char.build.stats.knockbackResist;
}

export function getBuildMoveSpeed(char) {
    if (!char.build) return 1;
    return char.build.stats.moveSpeed;
}

export function getBuildSprintSpeed(char) {
    if (!char.build) return 1;
    return char.build.stats.sprintSpeed;
}

export function getBuildJumpPower(char) {
    if (!char.build) return 1;
    return char.build.stats.jumpPower;
}

export function getBuildDodgeCost(char) {
    if (!char.build) return 20;
    return char.build.stats.dodgeCost;
}

export function getBuildGrabCost(char) {
    if (!char.build) return 25;
    return char.build.stats.grabCost;
}

export function getBuildSprintDrain(char) {
    if (!char.build) return 15;
    return char.build.stats.sprintDrain;
}

export function getBuildStaminaRegen(char) {
    if (!char.build) return 1;
    return char.build.stats.staminaRegen;
}

export function getBuildHitstunTaken(char) {
    if (!char.build) return 1;
    return char.build.stats.hitstunTaken;
}

export function getBuildAirControl(char) {
    if (!char.build) return 1;
    return char.build.stats.airControl;
}

export function getBuildGrabRange(char) {
    if (!char.build) return 1;
    return char.build.stats.grabRange;
}

export function getBuildHeavyChargeRate(char) {
    if (!char.build) return 1;
    return char.build.stats.heavyChargeRate;
}

export function getBuildWeight(char) {
    if (!char.build) return 1;
    return char.build.stats.weight;
}

export function hasSuperArmor(char) {
    return char.build && char.build.passiveId === 'superArmor';
}

export function hasIronGuard(char) {
    return char.build && char.build.passiveId === 'ironGuard';
}

export function hasQuickRecovery(char) {
    return char.build && char.build.passiveId === 'quickRecovery';
}

export function hasAirSuperiority(char) {
    return char.build && char.build.passiveId === 'airSuperiority';
}

export function hasPowerThrow(char) {
    return char.build && char.build.passiveId === 'powerThrow';
}
