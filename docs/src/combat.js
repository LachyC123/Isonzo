import { CharState, ACTION_STATES } from './character.js';
import * as Audio from './audio.js';

const ATTACKS = {
    [CharState.LIGHT1]: {
        damage: 8, knockback: 3.5, range: 2.3, halfAngle: 75,
        hitStart: 0.06, hitEnd: 0.16, duration: 0.25,
    },
    [CharState.LIGHT2]: {
        damage: 10, knockback: 4, range: 2.3, halfAngle: 75,
        hitStart: 0.06, hitEnd: 0.16, duration: 0.25,
    },
    [CharState.LIGHT3]: {
        damage: 16, knockback: 7.5, range: 2.6, halfAngle: 100,
        hitStart: 0.08, hitEnd: 0.2, duration: 0.35,
    },
    [CharState.HEAVY_RELEASE]: {
        damage: [15, 38], knockback: [9, 22], range: 2.9, halfAngle: 110,
        hitStart: 0.08, hitEnd: 0.2, duration: 0.38,
    },
    [CharState.GRAB]: {
        damage: 13, knockback: 11, range: 1.9, halfAngle: 50,
        hitStart: 0.12, hitEnd: 0.25, duration: 0.42,
    },
};

export function getAttackData(state) {
    return ATTACKS[state] || null;
}

function enterState(char, state) {
    char.state = state;
    char.stateTimer = 0;
    char.attackHit = false;
    char.iFrames = (state === CharState.DODGE);
}

function exitAction(char) {
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
    if (char.hitstopTimer > 0) return;

    char.stateTimer += dt;
    char.comboTimer = Math.max(0, char.comboTimer - dt);

    if (ACTION_STATES.has(char.state)) {
        handleActionState(char, dt);
    } else {
        handleFreeState(char, dt);
    }
}

function handleFreeState(char, dt) {
    const intent = char.intent;

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
        char.state = char.velocity.y > 0 ? CharState.JUMP : CharState.FALL;
        return;
    }

    if (intent.jump) {
        char.velocity.y = 13;
        char.grounded = false;
        char.state = CharState.JUMP;
        return;
    }

    if (intent.lightAttack) {
        enterState(char, CharState.LIGHT1);
        char.combo = 1;
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
    if (intent.grab && char.stamina >= 25) {
        enterState(char, CharState.GRAB);
        char.stamina -= 25;
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
        const speed = sprint ? 10 : 6.5;
        char.velocity.x = (intent.moveX / moveLen) * speed;
        char.velocity.z = (intent.moveZ / moveLen) * speed;
        char.facing = Math.atan2(intent.moveX, intent.moveZ);
        char.state = sprint ? CharState.SPRINT : CharState.WALK;
        if (sprint) {
            char.stamina -= 15 * dt;
            char.staminaRegenDelay = 0.4;
        }
    } else {
        char.velocity.x *= 0.82;
        char.velocity.z *= 0.82;
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
            if (char.stateTimer < 0.1) {
                char.velocity.x = Math.sin(char.facing) * 5;
                char.velocity.z = Math.cos(char.facing) * 5;
            } else {
                char.velocity.x *= 0.82;
                char.velocity.z *= 0.82;
            }
            if (intent.lightAttack) char.comboTimer = 0.45;
            if (char.stateTimer >= data.duration) {
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
            if (char.stateTimer < 0.1) {
                char.velocity.x = Math.sin(char.facing) * 7;
                char.velocity.z = Math.cos(char.facing) * 7;
            } else {
                char.velocity.x *= 0.82;
                char.velocity.z *= 0.82;
            }
            const data = ATTACKS[CharState.HEAVY_RELEASE];
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
                char.velocity.x *= 0.85;
                char.velocity.z *= 0.85;
            }
            if (char.stateTimer >= 0.35) exitAction(char);
            break;
        case CharState.GRAB: {
            if (char.stateTimer < 0.18) {
                char.velocity.x = Math.sin(char.facing) * 6;
                char.velocity.z = Math.cos(char.facing) * 6;
            } else {
                char.velocity.x *= 0.88;
                char.velocity.z *= 0.88;
            }
            const data = ATTACKS[CharState.GRAB];
            if (char.stateTimer >= data.duration) exitAction(char);
            break;
        }
        case CharState.BLOCK:
            char.velocity.x = 0;
            char.velocity.z = 0;
            if (!intent.block) exitAction(char);
            break;
        case CharState.HITSTUN:
            char.velocity.x *= 0.9;
            char.velocity.z *= 0.9;
            if (char.stateTimer >= 0.3) exitAction(char);
            break;
        case CharState.KNOCKBACK:
            if (char.stateTimer >= 0.55 && char.grounded) exitAction(char);
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

            const angleToTarget = Math.atan2(dx, dz);
            let angleDiff = angleToTarget - attacker.facing;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            const halfRad = (attackData.halfAngle * Math.PI) / 180;
            if (Math.abs(angleDiff) > halfRad) continue;

            attacker.attackHit = true;

            const isGrab = attacker.state === CharState.GRAB;
            const isHeavy = attacker.state === CharState.HEAVY_RELEASE;

            let damage, knockback;
            if (isHeavy) {
                const ct = Math.min(attacker.heavyChargeTime / 1.5, 1);
                damage = attackData.damage[0] + (attackData.damage[1] - attackData.damage[0]) * ct;
                knockback = attackData.knockback[0] + (attackData.knockback[1] - attackData.knockback[0]) * ct;
            } else {
                damage = attackData.damage;
                knockback = attackData.knockback;
            }

            if (attacker.buffs.damageUp) damage *= 1.3;
            if (attacker.buffs.throwUp) knockback *= 1.5;

            let blocked = false;
            if (target.state === CharState.BLOCK && !isGrab) {
                damage *= 0.25;
                knockback *= 0.3;
                blocked = true;
                Audio.playBlock();
            } else if (target.state === CharState.BLOCK && isGrab) {
                damage *= 1.5;
                knockback *= 1.3;
                Audio.playGrab();
            } else if (isHeavy) {
                Audio.playHeavyHit();
            } else if (isGrab) {
                Audio.playGrab();
            } else {
                Audio.playHit();
            }

            target.health -= damage;
            attacker.damageDealt += damage;

            const kbDirX = dist > 0.01 ? dx / dist : Math.sin(attacker.facing);
            const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(attacker.facing);
            const damageMult = 1 + ((100 - Math.max(0, target.health)) / 100) * 0.6;
            const finalKB = knockback * damageMult;

            target.knockbackVel.x = kbDirX * finalKB;
            target.knockbackVel.z = kbDirZ * finalKB;

            if (isHeavy || isGrab || damage >= 20) {
                target.knockbackVel.y = finalKB * 0.25;
                enterState(target, CharState.KNOCKBACK);
            } else if (!blocked) {
                enterState(target, CharState.HITSTUN);
            }

            const hitstopTime = isHeavy ? 0.09 : 0.04;
            attacker.hitstopTimer = hitstopTime;
            target.hitstopTimer = hitstopTime;

            if (sceneManager) {
                const severityShake = isHeavy ? 0.42 : blocked ? 0.08 : 0.16;
                sceneManager.shake(target.health <= 0 ? 0.55 : severityShake);
            }

            if (uiManager && camera) {
                uiManager.spawnDamageNumber(
                    target.position, damage,
                    isHeavy || damage >= 20, camera
                );
            }

            const isKO = target.health <= 0;
            results.push({
                attacker,
                target,
                damage,
                isHeavy,
                blocked,
                isKO,
                impactPosition: { x: target.position.x, y: target.position.y, z: target.position.z },
            });
            break;
        }
    }

    return results;
}
