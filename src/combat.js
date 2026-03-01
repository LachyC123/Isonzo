import { CharState, ACTION_STATES } from './character.js';
import * as Audio from './audio.js';

const ATTACKS = {
    [CharState.LIGHT1]: {
        damage: 8, knockback: 4, range: 2.4, halfAngle: 80,
        hitStart: 0.05, hitEnd: 0.14, duration: 0.24, launch: 0,
    },
    [CharState.LIGHT2]: {
        damage: 10, knockback: 4.5, range: 2.4, halfAngle: 80,
        hitStart: 0.05, hitEnd: 0.14, duration: 0.24, launch: 0,
    },
    [CharState.LIGHT3]: {
        damage: 18, knockback: 9, range: 2.8, halfAngle: 120,
        hitStart: 0.1, hitEnd: 0.2, duration: 0.38, launch: 6,
    },
    [CharState.HEAVY_RELEASE]: {
        damage: [15, 42], knockback: [10, 26], range: 3.0, halfAngle: 130,
        hitStart: 0.06, hitEnd: 0.18, duration: 0.42, launch: [4, 15],
    },
    [CharState.ELBOW_DROP]: {
        damage: 22, knockback: 12, range: 2.5, halfAngle: 180,
        hitStart: 0.15, hitEnd: 0.32, duration: 0.5, launch: 6,
    },
    [CharState.SPECIAL_UPPERCUT]: {
        damage: 25, knockback: 14, range: 2.6, halfAngle: 90,
        hitStart: 0.12, hitEnd: 0.22, duration: 0.5, launch: 16,
    },
    [CharState.SPECIAL_DROPKICK]: {
        damage: 22, knockback: 18, range: 3.0, halfAngle: 70,
        hitStart: 0.1, hitEnd: 0.28, duration: 0.5, launch: 4,
    },
    [CharState.SPECIAL_SPIN]: {
        damage: 15, knockback: 11, range: 3.2, halfAngle: 180,
        hitStart: 0.05, hitEnd: 0.4, duration: 0.55, launch: 3,
    },
    [CharState.SPECIAL_LARIAT]: {
        damage: 20, knockback: 16, range: 3.2, halfAngle: 130,
        hitStart: 0.14, hitEnd: 0.42, duration: 0.56, launch: 6,
    },
    [CharState.SPECIAL_SUPLEX]: {
        damage: 26, knockback: 20, range: 2.2, halfAngle: 95,
        hitStart: 0.26, hitEnd: 0.4, duration: 0.52, launch: 12,
    },
    [CharState.SPECIAL_FLURRY]: {
        damage: 17, knockback: 11, range: 2.9, halfAngle: 140,
        hitStart: 0.08, hitEnd: 0.34, duration: 0.5, launch: 2,
    },
    [CharState.SPECIAL_CRATER]: {
        damage: 30, knockback: 23, range: 2.8, halfAngle: 110,
        hitStart: 0.2, hitEnd: 0.36, duration: 0.54, launch: 8,
    },
    [CharState.SPECIAL_CHAIN_GRAB]: {
        damage: 28, knockback: 20, range: 2.35, halfAngle: 80,
        hitStart: 0.12, hitEnd: 0.34, duration: 0.52, launch: 10,
    },
    [CharState.GRAB]: {
        damage: 0, knockback: 0, range: 2.1, halfAngle: 60,
        hitStart: 0.08, hitEnd: 0.2, duration: 0.42, launch: 0,
    },
    [CharState.GRAB_SLAM]: {
        damage: 24, knockback: 18, range: 99, halfAngle: 180,
        hitStart: 0, hitEnd: 0.18, duration: 0.35, launch: 12,
    },
};

export function getAttackData(state) {
    return ATTACKS[state] || null;
}

export function enterState(char, state) {
    char.prevState = char.state;
    char.blendTimer = 0.08;
    char.state = state;
    char.stateTimer = 0;
    char.attackHit = false;
    char.iFrames = (state === CharState.DODGE);
}

function exitAction(char) {
    char.prevState = char.state;
    char.blendTimer = 0.1;
    char.state = CharState.IDLE;
    char.stateTimer = 0;
    char.attackHit = false;
    char.iFrames = false;
    char.velocity.x = 0;
    char.velocity.z = 0;
}

export function processCharacterState(char, dt) {
    if (!char.alive) {
        if (char.state === CharState.KO || char.state === CharState.RINGOUT) {
            char.stateTimer += dt;
        }
        return;
    }
    if (char.state === CharState.GRABBED) {
        char.stateTimer += dt;
        char.velocity.set(0, 0, 0);
        return;
    }
    if (char.hitstopTimer > 0) return;

    char.stateTimer += dt;
    if (char.blendTimer > 0) char.blendTimer -= dt;
    char.comboTimer = Math.max(0, char.comboTimer - dt);

    if (ACTION_STATES.has(char.state)) {
        handleActionState(char, dt);
    } else {
        handleFreeState(char, dt);
    }
}

function handleFreeState(char, dt) {
    const intent = char.intent;

    if (intent.heavyCharge && char.specialMove) {
        enterState(char, char.specialMove);
        char.specialMove = null;
        return;
    }

    if (!char.grounded) {
        const moveLen = Math.sqrt(intent.moveX * intent.moveX + intent.moveZ * intent.moveZ);
        if (moveLen > 0.1) {
            char.velocity.x += intent.moveX * 0.6 * dt * 60;
            char.velocity.z += intent.moveZ * 0.6 * dt * 60;
            const maxAir = 8;
            const hSpd = Math.sqrt(char.velocity.x ** 2 + char.velocity.z ** 2);
            if (hSpd > maxAir) {
                char.velocity.x *= maxAir / hSpd;
                char.velocity.z *= maxAir / hSpd;
            }
        }

        if (intent.lightAttack && char.velocity.y < 0) {
            enterState(char, CharState.ELBOW_DROP);
            char.velocity.y = -15;
            return;
        }

        char.state = char.velocity.y > 0 ? CharState.JUMP : CharState.FALL;
        return;
    }

    if (intent.jump) {
        char.velocity.y = 13;
        char.grounded = false;
        char.state = CharState.JUMP;
        return;
    }

    const wasSprinting = char.state === CharState.SPRINT;

    if (intent.lightAttack) {
        if (wasSprinting) {
            enterState(char, CharState.LIGHT3);
            char.sprintAttack = true;
            char.combo = 3;
        } else {
            enterState(char, CharState.LIGHT1);
            char.combo = 1;
        }
        char.comboTimer = 0;
        return;
    }
    if (intent.heavyCharge) {
        enterState(char, CharState.HEAVY_CHARGE);
        char.heavyChargeTime = 0;
        return;
    }
    if (intent.dodge && char.stamina >= 20) {
        enterState(char, CharState.DODGE);
        char.stamina -= 20;
        char.staminaRegenDelay = 0.5;
        Audio.playDodge();
        return;
    }
    const grabCost = char.buffs.throwUp ? 18 : 25;
    if (intent.grab && char.stamina >= grabCost) {
        enterState(char, CharState.GRAB);
        char.stamina -= grabCost;
        char.staminaRegenDelay = 0.5;
        return;
    }
    if (intent.block) {
        enterState(char, CharState.BLOCK);
        char.velocity.x = 0;
        char.velocity.z = 0;
        return;
    }

    const moveLen = Math.sqrt(intent.moveX * intent.moveX + intent.moveZ * intent.moveZ);
    if (moveLen > 0.1) {
        const sprint = intent.sprint && char.stamina > 0;
        const speed = sprint ? 10.5 : 6.5;
        char.velocity.x = (intent.moveX / moveLen) * speed;
        char.velocity.z = (intent.moveZ / moveLen) * speed;
        char.facing = Math.atan2(intent.moveX, intent.moveZ);
        char.state = sprint ? CharState.SPRINT : CharState.WALK;
        if (sprint) {
            char.stamina -= 15 * dt;
            char.staminaRegenDelay = 0.4;
        }
    } else {
        char.velocity.x *= 0.8;
        char.velocity.z *= 0.8;
        char.state = CharState.IDLE;
    }
}

function handleActionState(char, dt) {
    const intent = char.intent;

    switch (char.state) {
        case CharState.LIGHT1:
        case CharState.LIGHT2:
        case CharState.LIGHT3: {
            const data = ATTACKS[char.state];
            const lungeSpd = char.sprintAttack ? 10 : 5;
            if (char.stateTimer < 0.08) {
                char.velocity.x = Math.sin(char.facing) * lungeSpd;
                char.velocity.z = Math.cos(char.facing) * lungeSpd;
            } else {
                char.velocity.x *= 0.8;
                char.velocity.z *= 0.8;
            }
            if (intent.lightAttack) char.comboTimer = 0.45;
            if (char.stateTimer >= data.duration) {
                char.sprintAttack = false;
                if (char.comboTimer > 0 && char.state === CharState.LIGHT1) {
                    enterState(char, CharState.LIGHT2);
                    char.combo = 2;
                    char.comboTimer = 0.45;
                } else if (char.comboTimer > 0 && char.state === CharState.LIGHT2) {
                    enterState(char, CharState.LIGHT3);
                    char.combo = 3;
                    char.comboTimer = 0.45;
                } else {
                    exitAction(char);
                }
            }
            break;
        }
        case CharState.HEAVY_CHARGE:
            char.heavyChargeTime += dt;
            char.velocity.x = 0;
            char.velocity.z = 0;
            if (!intent.heavyCharge) {
                enterState(char, CharState.HEAVY_RELEASE);
            }
            break;
        case CharState.HEAVY_RELEASE: {
            if (char.stateTimer < 0.08) {
                char.velocity.x = Math.sin(char.facing) * 9;
                char.velocity.z = Math.cos(char.facing) * 9;
            } else {
                char.velocity.x *= 0.78;
                char.velocity.z *= 0.78;
            }
            const data = ATTACKS[CharState.HEAVY_RELEASE];
            if (char.stateTimer >= data.duration) exitAction(char);
            break;
        }
        case CharState.ELBOW_DROP: {
            if (char.grounded && char.stateTimer > 0.15) {
                char.velocity.x = 0;
                char.velocity.z = 0;
            }
            const data = ATTACKS[CharState.ELBOW_DROP];
            if (char.stateTimer >= data.duration) exitAction(char);
            break;
        }
        case CharState.DODGE:
            if (char.stateTimer < 0.22) {
                char.velocity.x = Math.sin(char.facing) * 14;
                char.velocity.z = Math.cos(char.facing) * 14;
                char.iFrames = true;
            } else {
                char.iFrames = false;
                char.velocity.x *= 0.83;
                char.velocity.z *= 0.83;
            }
            if (char.stateTimer >= 0.35) exitAction(char);
            break;
        case CharState.GRAB: {
            if (char.stateTimer < 0.16) {
                char.velocity.x = Math.sin(char.facing) * 8;
                char.velocity.z = Math.cos(char.facing) * 8;
            } else {
                char.velocity.x *= 0.83;
                char.velocity.z *= 0.83;
            }
            const data = ATTACKS[CharState.GRAB];
            if (char.stateTimer >= data.duration) exitAction(char);
            break;
        }
        case CharState.GRAB_HOLD: {
            char.velocity.x = 0;
            char.velocity.z = 0;
            if (!char.grabTarget || !char.grabTarget.alive) {
                char.grabTarget = null;
                exitAction(char);
                break;
            }
            if (char.stateTimer >= 0.5) {
                enterState(char, CharState.GRAB_SLAM);
            }
            if (char.grabTarget) {
                const tgt = char.grabTarget;
                const fx = char.position.x + Math.sin(char.facing) * 0.75;
                const fz = char.position.z + Math.cos(char.facing) * 0.75;
                tgt.position.x += (fx - tgt.position.x) * 0.18;
                tgt.position.z += (fz - tgt.position.z) * 0.18;
                tgt.facing = char.facing + Math.PI;
            }
            break;
        }
        case CharState.GRAB_SLAM: {
            char.velocity.x = 0;
            char.velocity.z = 0;
            if (char.stateTimer >= 0.3) {
                if (char.grabTarget) {
                    const tgt = char.grabTarget;
                    tgt.state = CharState.GROUND_BOUNCE;
                    tgt.stateTimer = 0;
                    tgt.grabbedBy = null;

                    const dir = char.facing;
                    let basekb = 16;
                    let dmg = 20;
                    if (char.buffs.damageUp) dmg *= 1.3;
                    if (char.buffs.throwUp) { basekb *= 1.5; }

                    tgt.damage += dmg;
                    const pctMult = 1 + (tgt.damage / 100) * 0.85;
                    const finalKb = basekb * pctMult;

                    tgt.knockbackVel.set(Math.sin(dir) * finalKb, 11 * pctMult, Math.cos(dir) * finalKb);
                    tgt.grounded = false;
                    tgt.bounceCount = 0;
                    char.damageDealt += dmg;
                    char.grabTarget = null;
                    Audio.playHeavyHit();
                }
                exitAction(char);
            }
            break;
        }
        case CharState.SPECIAL_UPPERCUT: {
            if (char.stateTimer < 0.12) {
                char.velocity.x *= 0.9;
                char.velocity.z *= 0.9;
            } else if (char.stateTimer < 0.2) {
                char.velocity.x = Math.sin(char.facing) * 6;
                char.velocity.z = Math.cos(char.facing) * 6;
                char.velocity.y = 8;
                char.grounded = false;
            } else {
                char.velocity.x *= 0.85;
                char.velocity.z *= 0.85;
            }
            if (char.stateTimer >= 0.5) exitAction(char);
            break;
        }
        case CharState.SPECIAL_DROPKICK: {
            if (char.stateTimer < 0.1) {
                char.velocity.y = 6;
                char.grounded = false;
            }
            if (char.stateTimer < 0.3) {
                char.velocity.x = Math.sin(char.facing) * 14;
                char.velocity.z = Math.cos(char.facing) * 14;
            } else {
                char.velocity.x *= 0.8;
                char.velocity.z *= 0.8;
            }
            if (char.stateTimer >= 0.5) exitAction(char);
            break;
        }
        case CharState.SPECIAL_SPIN: {
            char.velocity.x *= 0.95;
            char.velocity.z *= 0.95;
            if (char.stateTimer >= 0.55) exitAction(char);
            break;
        }
        case CharState.SPECIAL_LARIAT: {
            if (char.stateTimer < 0.12) {
                char.velocity.x *= 0.85;
                char.velocity.z *= 0.85;
            } else if (char.stateTimer < 0.42) {
                char.velocity.x = Math.sin(char.facing) * 12;
                char.velocity.z = Math.cos(char.facing) * 12;
            } else {
                char.velocity.x *= 0.78;
                char.velocity.z *= 0.78;
            }
            if (char.stateTimer >= 0.56) exitAction(char);
            break;
        }
        case CharState.SPECIAL_SUPLEX: {
            if (char.stateTimer < 0.15) {
                char.velocity.x *= 0.7;
                char.velocity.z *= 0.7;
            } else if (char.stateTimer < 0.28) {
                char.velocity.x = Math.sin(char.facing) * 5;
                char.velocity.z = Math.cos(char.facing) * 5;
            } else {
                char.velocity.x *= 0.82;
                char.velocity.z *= 0.82;
            }
            if (char.stateTimer >= 0.52) exitAction(char);
            break;
        }
        case CharState.SPECIAL_FLURRY: {
            if (char.stateTimer < 0.08) {
                char.velocity.x = Math.sin(char.facing) * 7;
                char.velocity.z = Math.cos(char.facing) * 7;
            } else if (char.stateTimer < 0.34) {
                char.velocity.x = Math.sin(char.facing) * 8.5;
                char.velocity.z = Math.cos(char.facing) * 8.5;
            } else {
                char.velocity.x *= 0.82;
                char.velocity.z *= 0.82;
            }
            if (char.stateTimer >= 0.5) exitAction(char);
            break;
        }
        case CharState.SPECIAL_CRATER: {
            if (char.stateTimer < 0.16) {
                char.velocity.x *= 0.65;
                char.velocity.z *= 0.65;
            } else if (char.stateTimer < 0.32) {
                char.velocity.x = Math.sin(char.facing) * 5.5;
                char.velocity.z = Math.cos(char.facing) * 5.5;
            } else {
                char.velocity.x *= 0.75;
                char.velocity.z *= 0.75;
            }
            if (char.stateTimer >= 0.54) exitAction(char);
            break;
        }
        case CharState.SPECIAL_CHAIN_GRAB: {
            if (char.stateTimer < 0.1) {
                char.velocity.x = Math.sin(char.facing) * 7.5;
                char.velocity.z = Math.cos(char.facing) * 7.5;
            } else if (char.stateTimer < 0.28) {
                char.velocity.x = Math.sin(char.facing) * 4.5;
                char.velocity.z = Math.cos(char.facing) * 4.5;
            } else {
                char.velocity.x *= 0.82;
                char.velocity.z *= 0.82;
            }
            if (char.stateTimer >= 0.52) exitAction(char);
            break;
        }
        case CharState.BLOCK:
            char.velocity.x = 0;
            char.velocity.z = 0;
            if (!intent.block) exitAction(char);
            break;
        case CharState.BLOCK_STAGGER:
            char.velocity.x *= 0.85;
            char.velocity.z *= 0.85;
            if (char.stateTimer >= 0.35) exitAction(char);
            break;
        case CharState.HITSTUN:
            char.velocity.x *= 0.88;
            char.velocity.z *= 0.88;
            if (char.stateTimer >= 0.28) exitAction(char);
            break;
        case CharState.KNOCKBACK:
            if (char.stateTimer >= 0.5 && char.grounded) exitAction(char);
            break;
        case CharState.LAUNCHED:
            if (char.grounded && char.stateTimer > 0.2) {
                enterState(char, CharState.GROUND_BOUNCE);
                char.bounceCount++;
            }
            break;
        case CharState.GROUND_BOUNCE:
            if (char.stateTimer >= 0.6 && char.grounded) {
                enterState(char, CharState.GETUP);
            }
            break;
        case CharState.GETUP:
            char.velocity.x = 0;
            char.velocity.z = 0;
            if (char.stateTimer >= 0.4) exitAction(char);
            break;
        case CharState.KO:
        case CharState.RINGOUT:
            break;
    }
}

export function checkCombatHits(characters, uiManager, camera, sceneManager) {
    const results = [];

    for (const attacker of characters) {
        if (!attacker.alive) continue;

        if (attacker.state === CharState.GRAB && !attacker.attackHit) {
            const data = ATTACKS[CharState.GRAB];
            const grabRange = attacker.buffs.throwUp ? data.range + 0.8 : data.range;
            if (attacker.stateTimer >= data.hitStart && attacker.stateTimer <= data.hitEnd) {
                for (const target of characters) {
                    if (target === attacker || !target.alive || target.iFrames) continue;
                    const dx = target.position.x - attacker.position.x;
                    const dz = target.position.z - attacker.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist > grabRange) continue;

                    const aToT = Math.atan2(dx, dz);
                    let aDiff = aToT - attacker.facing;
                    while (aDiff > Math.PI) aDiff -= Math.PI * 2;
                    while (aDiff < -Math.PI) aDiff += Math.PI * 2;
                    if (Math.abs(aDiff) > (data.halfAngle * Math.PI / 180)) continue;

                    attacker.attackHit = true;

                    const isAttacking = [CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
                        CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE].includes(target.state);

                    if (isAttacking) {
                        enterState(attacker, CharState.HITSTUN);
                        attacker.damage += 5;
                        Audio.playBlock();
                    } else {
                        Audio.playGrab();
                        enterState(attacker, CharState.GRAB_HOLD);
                        attacker.grabTarget = target;
                        target.state = CharState.GRABBED;
                        target.stateTimer = 0;
                        target.grabbedBy = attacker;
                        target.velocity.set(0, 0, 0);
                        results.push({ attacker, target, damage: 0, isKO: false, isGrab: true });
                    }
                    break;
                }
            }
            continue;
        }

        const attackData = ATTACKS[attacker.state];
        if (!attackData) continue;
        if (attacker.attackHit) continue;
        if (attacker.stateTimer < attackData.hitStart || attacker.stateTimer > attackData.hitEnd) continue;

        for (const target of characters) {
            if (target === attacker || !target.alive || target.iFrames) continue;

            const dx = target.position.x - attacker.position.x;
            const dz = target.position.z - attacker.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > attackData.range) continue;

            const aToT = Math.atan2(dx, dz);
            let aDiff = aToT - attacker.facing;
            while (aDiff > Math.PI) aDiff -= Math.PI * 2;
            while (aDiff < -Math.PI) aDiff += Math.PI * 2;
            if (Math.abs(aDiff) > (attackData.halfAngle * Math.PI / 180)) continue;

            attacker.attackHit = true;
            const isHeavy = attacker.state === CharState.HEAVY_RELEASE;
            const isFinisher = attacker.state === CharState.LIGHT3;
            const isElbow = attacker.state === CharState.ELBOW_DROP;

            let damage, knockback, launchPow;
            if (isHeavy) {
                const ct = Math.min(attacker.heavyChargeTime / 1.5, 1);
                damage = attackData.damage[0] + (attackData.damage[1] - attackData.damage[0]) * ct;
                knockback = attackData.knockback[0] + (attackData.knockback[1] - attackData.knockback[0]) * ct;
                launchPow = attackData.launch[0] + (attackData.launch[1] - attackData.launch[0]) * ct;
            } else {
                damage = attackData.damage;
                knockback = attackData.knockback;
                launchPow = attackData.launch || 0;
            }

            if (attacker.buffs.damageUp) damage *= 1.3;
            if (attacker.buffs.throwUp) knockback *= 1.5;

            let blocked = false;
            const isSpecial = [
                CharState.SPECIAL_UPPERCUT, CharState.SPECIAL_DROPKICK, CharState.SPECIAL_SPIN,
                CharState.SPECIAL_LARIAT, CharState.SPECIAL_SUPLEX,
                CharState.SPECIAL_FLURRY, CharState.SPECIAL_CRATER, CharState.SPECIAL_CHAIN_GRAB,
            ].includes(attacker.state);
            if (target.state === CharState.BLOCK) {
                damage *= 0.15;
                knockback *= 0.15;
                launchPow = 0;
                blocked = true;
                Audio.playBlock();
                enterState(attacker, CharState.BLOCK_STAGGER);
                const pushDir = Math.atan2(
                    attacker.position.x - target.position.x,
                    attacker.position.z - target.position.z
                );
                attacker.knockbackVel.x = Math.sin(pushDir) * 4;
                attacker.knockbackVel.z = Math.cos(pushDir) * 4;
            } else if (isHeavy || isElbow || isSpecial) {
                Audio.playHeavyHit();
            } else if (isFinisher) {
                Audio.playHeavyHit();
            } else {
                Audio.playHit();
            }

            target.damage += damage;
            attacker.damageDealt += damage;

            const kbX = dist > 0.01 ? dx / dist : Math.sin(attacker.facing);
            const kbZ = dist > 0.01 ? dz / dist : Math.cos(attacker.facing);
            const pctMult = 1 + (target.damage / 100) * 0.8;
            const fKB = knockback * pctMult;

            target.knockbackVel.x = kbX * fKB;
            target.knockbackVel.z = kbZ * fKB;

            if (launchPow > 0 && !blocked) {
                target.knockbackVel.y = launchPow * pctMult;
                target.grounded = false;
                enterState(target, CharState.LAUNCHED);
                target.bounceCount = 0;
            } else if ((isHeavy || isElbow || damage >= 16) && !blocked) {
                target.knockbackVel.y = fKB * 0.35;
                enterState(target, CharState.KNOCKBACK);
            } else if (!blocked) {
                enterState(target, CharState.HITSTUN);
            }

            const isBig = isHeavy || isElbow || isSpecial;
            const hsTime = isBig ? 0.13 : (isFinisher ? 0.08 : 0.04);
            attacker.hitstopTimer = hsTime;
            target.hitstopTimer = hsTime;

            if ((isBig || isFinisher) && sceneManager) {
                sceneManager.shake(isHeavy ? 0.6 : (isSpecial ? 0.55 : (isElbow ? 0.5 : 0.35)));
            }

            if (uiManager && camera) {
                uiManager.spawnDamageNumber(
                    target.position, damage,
                    isBig || isFinisher || damage >= 16, camera
                );
            }

            results.push({ attacker, target, damage, isKO: false, blocked });
            break;
        }
    }

    return results;
}
