import { CharState } from './character.js';
import * as Audio from './audio.js';

const GRAVITY = -35;
const ARENA_RADIUS = 26;
const RINGOUT_RADIUS = 30;
const RINGOUT_Y = -12;
const GROUND_Y = 0;

export { ARENA_RADIUS, RINGOUT_RADIUS };

export function updatePhysics(char, dt) {
    if (!char.alive) return;
    if (char.state === CharState.GRABBED) return;
    if (char.hitstopTimer > 0) {
        char.hitstopTimer -= dt;
        return;
    }

    if (!char.grounded) {
        char.velocity.y += GRAVITY * dt;
        if (char.velocity.y < -30) char.velocity.y = -30;
    }

    char.knockbackVel.x *= Math.max(0, 1 - 3.5 * dt);
    char.knockbackVel.y *= Math.max(0, 1 - 1.5 * dt);
    char.knockbackVel.z *= Math.max(0, 1 - 3.5 * dt);

    char.position.x += (char.velocity.x + char.knockbackVel.x) * dt;
    char.position.y += (char.velocity.y + char.knockbackVel.y) * dt;
    char.position.z += (char.velocity.z + char.knockbackVel.z) * dt;

    if (char.position.y <= GROUND_Y) {
        const distXZ = Math.sqrt(char.position.x * char.position.x + char.position.z * char.position.z);
        if (distXZ <= ARENA_RADIUS) {
            const impactSpeed = -(char.velocity.y + char.knockbackVel.y);

            if ((char.state === CharState.LAUNCHED || char.state === CharState.GROUND_BOUNCE)
                && impactSpeed > 5 && char.bounceCount < 3) {
                char.position.y = GROUND_Y;
                char.velocity.y = impactSpeed * 0.3;
                char.knockbackVel.y = 0;
                char.knockbackVel.x *= 0.45;
                char.knockbackVel.z *= 0.45;
                char.grounded = false;
                char.bounceCount++;
                char.state = CharState.GROUND_BOUNCE;
                char.stateTimer = 0;
                char.landingTimer = 0.12;
                Audio.playBounce();
            } else {
                char.position.y = GROUND_Y;
                char.velocity.y = 0;
                char.knockbackVel.y = 0;
                char.grounded = true;
            }
        } else {
            char.grounded = false;
        }
    } else {
        char.grounded = false;
    }

    if (char.staminaRegenDelay > 0) {
        char.staminaRegenDelay -= dt;
    } else {
        char.stamina = Math.min(char.maxStamina, char.stamina + 22 * dt);
    }

    if (char.buffs.regenUp) {
        char.health = Math.min(char.maxHealth, char.health + 3 * dt);
    }
}

export function checkRingOut(char) {
    if (!char.alive) return false;
    const distXZ = Math.sqrt(char.position.x * char.position.x + char.position.z * char.position.z);
    return char.position.y < RINGOUT_Y || distXZ > RINGOUT_RADIUS;
}

export function checkCharacterCollisions(characters) {
    const minDist = 0.9;
    for (let i = 0; i < characters.length; i++) {
        for (let j = i + 1; j < characters.length; j++) {
            const a = characters[i];
            const b = characters[j];
            if (!a.alive || !b.alive) continue;
            if (a.state === CharState.GRABBED || b.state === CharState.GRABBED) continue;
            const dx = b.position.x - a.position.x;
            const dz = b.position.z - a.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist && dist > 0.01) {
                const push = (minDist - dist) * 0.5;
                const nx = dx / dist;
                const nz = dz / dist;
                a.position.x -= nx * push;
                a.position.z -= nz * push;
                b.position.x += nx * push;
                b.position.z += nz * push;
            }
        }
    }
}
