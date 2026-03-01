import { CharState } from './character.js';

export const BUILDS = [
    {
        id: 'titan',
        name: 'TITAN',
        category: 'tall',
        desc: 'Massive powerhouse. Slow but devastating hits.',
        scale: 1.25,
        stats: {
            moveSpeed: 0.8,
            sprintSpeed: 0.85,
            jumpPower: 0.9,
            damageMult: 1.3,
            knockbackMult: 1.35,
            knockbackResist: 0.7,
            staminaMax: 90,
            staminaRegen: 0.9,
            weight: 1.4,
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
            moveSpeed: 0.85,
            sprintSpeed: 0.88,
            jumpPower: 0.92,
            damageMult: 1.1,
            knockbackMult: 1.2,
            knockbackResist: 0.65,
            staminaMax: 110,
            staminaRegen: 1.1,
            weight: 1.3,
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
            moveSpeed: 0.95,
            sprintSpeed: 0.95,
            jumpPower: 0.95,
            damageMult: 1.0,
            knockbackMult: 1.0,
            knockbackResist: 0.9,
            staminaMax: 105,
            staminaRegen: 1.05,
            weight: 1.1,
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
            moveSpeed: 1.2,
            sprintSpeed: 1.15,
            jumpPower: 1.1,
            damageMult: 0.9,
            knockbackMult: 0.85,
            knockbackResist: 1.2,
            staminaMax: 110,
            staminaRegen: 1.2,
            weight: 0.7,
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
            moveSpeed: 1.15,
            sprintSpeed: 1.1,
            jumpPower: 1.25,
            damageMult: 0.85,
            knockbackMult: 0.9,
            knockbackResist: 1.25,
            staminaMax: 115,
            staminaRegen: 1.15,
            weight: 0.65,
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
