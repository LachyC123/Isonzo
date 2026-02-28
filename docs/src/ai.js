import { CharState } from './character.js';
import { distance2D, angleBetween } from './utils.js';

const ATTACKING_STATES = new Set([
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_RELEASE, CharState.GRAB,
]);

const BUSY_STATES = new Set([
    CharState.HITSTUN, CharState.KNOCKBACK, CharState.KO,
    CharState.RINGOUT, CharState.DODGE, CharState.GRAB,
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE,
]);

export class BotAI {
    constructor(difficulty = 0.5) {
        this.difficulty = difficulty;
        this.state = 'idle';
        this.target = null;
        this.stateTimer = 0;
        this.decisionTimer = 0;
        this.circleDir = Math.random() < 0.5 ? 1 : -1;
        this.comboCount = 0;
        this.doingHeavy = false;
        this.heavyTimer = 0;
    }

    update(dt, char, allChars) {
        if (!char.alive) return;

        const intent = char.intent;
        intent.moveX = 0;
        intent.moveZ = 0;
        intent.sprint = false;
        intent.jump = false;
        intent.lightAttack = false;
        intent.heavyCharge = false;
        intent.dodge = false;
        intent.grab = false;
        intent.block = false;

        if (BUSY_STATES.has(char.state)) {
            if (this.doingHeavy && char.state === CharState.HEAVY_CHARGE) {
                this.heavyTimer -= dt;
                if (this.heavyTimer <= 0) {
                    this.doingHeavy = false;
                } else {
                    intent.heavyCharge = true;
                }
            }
            return;
        }

        this.stateTimer += dt;
        this.decisionTimer -= dt;

        const enemies = allChars.filter(c => c !== char && c.alive);
        if (enemies.length === 0) return;

        if (!this.target || !this.target.alive || this.decisionTimer <= 0) {
            this.target = this._pickTarget(char, enemies);
            this.decisionTimer = 0.3 + Math.random() * 0.4;
        }

        const target = this.target;
        const dist = distance2D(char.position.x, char.position.z, target.position.x, target.position.z);
        const angle = angleBetween(char.position.x, char.position.z, target.position.x, target.position.z);

        char.facing = angle;

        if (this._shouldDodge(char, allChars)) {
            intent.dodge = true;
            this.state = 'circle';
            this.stateTimer = 0;
            return;
        }

        switch (this.state) {
            case 'idle': this._idle(char, dist, dt); break;
            case 'approach': this._approach(char, dist, angle, dt); break;
            case 'circle': this._circle(char, target, dist, angle, dt); break;
            case 'attack': this._attack(char, target, dist, angle, dt); break;
            case 'retreat': this._retreat(char, dist, angle, dt); break;
        }

        this._avoidEdge(char);
    }

    _pickTarget(char, enemies) {
        if (Math.random() < 0.25) {
            return enemies.reduce((a, b) => a.health < b.health ? a : b);
        }
        return enemies.reduce((a, b) => {
            const dA = distance2D(char.position.x, char.position.z, a.position.x, a.position.z);
            const dB = distance2D(char.position.x, char.position.z, b.position.x, b.position.z);
            return dA < dB ? a : b;
        });
    }

    _shouldDodge(char, allChars) {
        if (char.stamina < 20) return false;
        for (const other of allChars) {
            if (other === char || !other.alive) continue;
            if (!ATTACKING_STATES.has(other.state)) continue;
            const dist = distance2D(char.position.x, char.position.z, other.position.x, other.position.z);
            if (dist > 3.5) continue;
            if (Math.random() < this.difficulty * 0.4 * (1 / 60)) return true;
        }
        return false;
    }

    _idle(char, dist, dt) {
        if (this.stateTimer > 0.2 + Math.random() * 0.4) {
            if (char.stamina < 30) {
                this.state = 'retreat';
            } else if (dist > 5) {
                this.state = 'approach';
            } else {
                this.state = 'circle';
            }
            this.stateTimer = 0;
        }
    }

    _approach(char, dist, angle, dt) {
        const intent = char.intent;
        intent.moveX = Math.sin(angle);
        intent.moveZ = Math.cos(angle);
        intent.sprint = dist > 8;

        if (dist < 3.2) {
            this.state = Math.random() < 0.6 ? 'attack' : 'circle';
            this.stateTimer = 0;
            this.comboCount = 0;
        }
        if (this.stateTimer > 3.5) {
            this.state = 'circle';
            this.stateTimer = 0;
        }
    }

    _circle(char, target, dist, angle, dt) {
        const intent = char.intent;
        const strafeAngle = angle + (Math.PI / 2) * this.circleDir;
        const approachF = dist > 4 ? 0.5 : (dist < 2.2 ? -0.4 : 0);

        intent.moveX = Math.sin(strafeAngle) * 0.65 + Math.sin(angle) * approachF;
        intent.moveZ = Math.cos(strafeAngle) * 0.65 + Math.cos(angle) * approachF;

        if (this.stateTimer > 0.8 + Math.random() * 1.8) {
            const roll = Math.random();
            if (roll < 0.35 && dist < 3) {
                this.state = 'attack';
                this.comboCount = 0;
            } else if (roll < 0.50 && dist < 2.2) {
                intent.grab = true;
                this.state = 'idle';
            } else if (roll < 0.6) {
                this.circleDir *= -1;
            } else if (char.stamina < 35) {
                this.state = 'retreat';
            } else {
                this.state = 'approach';
            }
            this.stateTimer = 0;
        }
    }

    _attack(char, target, dist, angle, dt) {
        const intent = char.intent;

        if (dist > 2.5) {
            intent.moveX = Math.sin(angle) * 0.5;
            intent.moveZ = Math.cos(angle) * 0.5;
        }

        if (char.state === CharState.IDLE || char.state === CharState.WALK) {
            if (this.comboCount < 3 && dist < 3) {
                if (Math.random() < 0.2 && this.comboCount === 0 && dist < 2.8) {
                    this.doingHeavy = true;
                    this.heavyTimer = 0.3 + Math.random() * 0.8;
                    intent.heavyCharge = true;
                    this.state = 'idle';
                    this.stateTimer = 0;
                } else {
                    intent.lightAttack = true;
                    this.comboCount++;
                }
            } else {
                this.state = 'circle';
                this.stateTimer = 0;
            }
        }

        if (this.stateTimer > 2.5) {
            this.state = 'circle';
            this.stateTimer = 0;
        }
    }

    _retreat(char, dist, angle, dt) {
        const intent = char.intent;
        intent.moveX = -Math.sin(angle);
        intent.moveZ = -Math.cos(angle);

        if (dist < 2.5 && Math.random() < 0.3 * dt) {
            intent.block = true;
        }

        if (char.stamina > 60 || this.stateTimer > 2.5) {
            this.state = 'approach';
            this.stateTimer = 0;
        }
    }

    _avoidEdge(char) {
        const distCenter = Math.sqrt(char.position.x ** 2 + char.position.z ** 2);
        if (distCenter > 19) {
            const panic = Math.min((distCenter - 19) / 7, 1) * 1.5;
            const toCenter = Math.atan2(-char.position.x, -char.position.z);
            char.intent.moveX += Math.sin(toCenter) * panic;
            char.intent.moveZ += Math.cos(toCenter) * panic;
        }
    }

    reset() {
        this.state = 'idle';
        this.stateTimer = 0;
        this.decisionTimer = 0;
        this.target = null;
        this.comboCount = 0;
        this.doingHeavy = false;
        this.heavyTimer = 0;
    }
}
