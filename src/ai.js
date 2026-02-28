import { CharState } from './character.js';
import { distance2D, angleBetween } from './utils.js';

const ATTACKING_STATES = new Set([
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_RELEASE, CharState.GRAB, CharState.GRAB_SLAM,
]);

const BUSY_STATES = new Set([
    CharState.HITSTUN, CharState.KNOCKBACK, CharState.LAUNCHED,
    CharState.GROUND_BOUNCE, CharState.KO,
    CharState.RINGOUT, CharState.DODGE, CharState.GRAB,
    CharState.GRAB_HOLD, CharState.GRAB_SLAM, CharState.GRABBED,
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE,
    CharState.BLOCK,
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
        this.blocking = false;
        this.blockTimer = 0;
        this.stateThreshold = 0.5;
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
            if (this.blocking && char.state === CharState.BLOCK) {
                this.blockTimer -= dt;
                if (this.blockTimer <= 0) {
                    this.blocking = false;
                } else {
                    intent.block = true;
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

        if (this._shouldDodge(char, allChars, dt)) {
            intent.dodge = true;
            this._setState('circle');
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

    _shouldDodge(char, allChars, dt) {
        if (char.stamina < 20) return false;
        for (const other of allChars) {
            if (other === char || !other.alive) continue;
            if (!ATTACKING_STATES.has(other.state)) continue;
            const dist = distance2D(char.position.x, char.position.z, other.position.x, other.position.z);
            if (dist > 3.5) continue;
            if (Math.random() < this.difficulty * 0.4 * dt) return true;
        }
        return false;
    }

    _setState(state) {
        this.state = state;
        this.stateTimer = 0;
        this.stateThreshold = 0.3 + Math.random() * 0.6;
    }

    _idle(char, dist, dt) {
        if (this.stateTimer > this.stateThreshold) {
            if (char.stamina < 30) {
                this._setState('retreat');
            } else if (dist > 5) {
                this._setState('approach');
            } else {
                this._setState('circle');
            }
        }
    }

    _approach(char, dist, angle, dt) {
        const intent = char.intent;
        intent.moveX = Math.sin(angle);
        intent.moveZ = Math.cos(angle);
        intent.sprint = dist > 8;

        if (dist < 3.2) {
            this._setState(Math.random() < 0.6 ? 'attack' : 'circle');
            this.comboCount = 0;
        }
        if (this.stateTimer > 3.5) {
            this._setState('circle');
        }
    }

    _circle(char, target, dist, angle, dt) {
        const intent = char.intent;
        const strafeAngle = angle + (Math.PI / 2) * this.circleDir;
        const approachF = dist > 4 ? 0.5 : (dist < 2.2 ? -0.4 : 0);

        intent.moveX = Math.sin(strafeAngle) * 0.65 + Math.sin(angle) * approachF;
        intent.moveZ = Math.cos(strafeAngle) * 0.65 + Math.cos(angle) * approachF;

        if (this.stateTimer > this.stateThreshold + 0.6) {
            const roll = Math.random();
            if (roll < 0.35 && dist < 3) {
                this._setState('attack');
                this.comboCount = 0;
            } else if (roll < 0.50 && dist < 2.2) {
                intent.grab = true;
                this._setState('idle');
            } else if (roll < 0.6) {
                this.circleDir *= -1;
                this._setState('circle');
            } else if (char.stamina < 35) {
                this._setState('retreat');
            } else {
                this._setState('approach');
            }
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
                    this._setState('idle');
                } else {
                    intent.lightAttack = true;
                    this.comboCount++;
                }
            } else {
                this._setState('circle');
            }
        }

        if (this.stateTimer > 2.5) {
            this._setState('circle');
        }
    }

    _retreat(char, dist, angle, dt) {
        const intent = char.intent;
        intent.moveX = -Math.sin(angle);
        intent.moveZ = -Math.cos(angle);

        if (dist < 2.5 && Math.random() < 0.5 * dt && !this.blocking) {
            this.blocking = true;
            this.blockTimer = 0.4 + Math.random() * 0.8;
            intent.block = true;
        }

        if (char.stamina > 60 || this.stateTimer > 2.5) {
            this._setState('approach');
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
        this.stateThreshold = 0.5;
        this.decisionTimer = 0;
        this.target = null;
        this.comboCount = 0;
        this.doingHeavy = false;
        this.heavyTimer = 0;
        this.blocking = false;
        this.blockTimer = 0;
    }
}
