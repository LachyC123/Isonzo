import { CharState } from './character.js';
import { distance2D, angleBetween } from './utils.js';

const ATTACKING_STATES = new Set([
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_RELEASE, CharState.GRAB, CharState.GRAB_SLAM,
    CharState.ELBOW_DROP,
]);

const BUSY_STATES = new Set([
    CharState.HITSTUN, CharState.KNOCKBACK, CharState.LAUNCHED,
    CharState.GROUND_BOUNCE, CharState.GETUP, CharState.KO,
    CharState.RINGOUT, CharState.DODGE, CharState.GRAB,
    CharState.GRAB_HOLD, CharState.GRAB_SLAM, CharState.GRABBED,
    CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
    CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE,
    CharState.ELBOW_DROP, CharState.BLOCK,
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
        this.aggression = 0.4 + Math.random() * 0.4;
        this.preferGrab = Math.random() > 0.5;
        this.patience = 0.5 + Math.random() * 1.0;
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
            if (char.state === CharState.LIGHT1 || char.state === CharState.LIGHT2) {
                intent.lightAttack = true;
            }
            return;
        }

        this.stateTimer += dt;
        this.decisionTimer -= dt;

        const enemies = allChars.filter(c => c !== char && c.alive);
        if (enemies.length === 0) return;

        if (!this.target || !this.target.alive || this.decisionTimer <= 0) {
            this.target = this._pickTarget(char, enemies);
            this.decisionTimer = 0.25 + Math.random() * 0.35;
        }

        const target = this.target;
        const dist = distance2D(char.position.x, char.position.z, target.position.x, target.position.z);
        const angle = angleBetween(char.position.x, char.position.z, target.position.x, target.position.z);

        char.facing = angle;

        if (this._reactiveActions(char, allChars, target, dist, angle, dt)) return;

        switch (this.state) {
            case 'idle': this._idle(char, dist, dt); break;
            case 'approach': this._approach(char, target, dist, angle, dt); break;
            case 'circle': this._circle(char, target, dist, angle, dt); break;
            case 'attack': this._attack(char, target, dist, angle, dt); break;
            case 'retreat': this._retreat(char, target, dist, angle, dt); break;
            case 'rushdown': this._rushdown(char, target, dist, angle, dt); break;
        }

        this._avoidEdge(char);
    }

    _pickTarget(char, enemies) {
        const dmgWeight = 0.3;
        const distWeight = 0.7;

        let best = enemies[0];
        let bestScore = Infinity;

        for (const e of enemies) {
            const d = distance2D(char.position.x, char.position.z, e.position.x, e.position.z);
            const score = d * distWeight - (e.damage / 100) * 10 * dmgWeight;
            if (score < bestScore) { bestScore = score; best = e; }
        }
        return best;
    }

    _reactiveActions(char, allChars, target, dist, angle, dt) {
        if (char.stamina < 20) return false;

        for (const other of allChars) {
            if (other === char || !other.alive) continue;
            if (!ATTACKING_STATES.has(other.state)) continue;
            const d = distance2D(char.position.x, char.position.z, other.position.x, other.position.z);
            if (d > 3.5) continue;

            const reaction = this.difficulty * 0.5 * dt;

            if (other.state === CharState.GRAB && Math.random() < reaction * 2) {
                char.intent.lightAttack = true;
                char.facing = angleBetween(char.position.x, char.position.z, other.position.x, other.position.z);
                return true;
            }

            if (Math.random() < reaction) {
                if (Math.random() < 0.7) {
                    char.intent.dodge = true;
                    const away = angleBetween(other.position.x, other.position.z, char.position.x, char.position.z);
                    char.facing = away;
                } else if (!this.blocking) {
                    this.blocking = true;
                    this.blockTimer = 0.3 + Math.random() * 0.5;
                    char.intent.block = true;
                }
                this._setState('circle');
                return true;
            }
        }

        if (target.state === CharState.BLOCK && dist < 2.5 && Math.random() < 0.6 * dt) {
            char.intent.grab = true;
            return true;
        }

        return false;
    }

    _setState(state) {
        this.state = state;
        this.stateTimer = 0;
        this.stateThreshold = 0.3 + Math.random() * 0.6;
    }

    _idle(char, dist, dt) {
        if (this.stateTimer > this.stateThreshold * 0.6) {
            if (char.stamina < 30) {
                this._setState('retreat');
            } else if (char.damage > 120 && dist < 4) {
                this._setState('retreat');
            } else if (dist > 6) {
                this._setState(Math.random() < this.aggression ? 'rushdown' : 'approach');
            } else if (dist > 3) {
                this._setState('approach');
            } else {
                this._setState('circle');
            }
        }
    }

    _approach(char, target, dist, angle, dt) {
        const intent = char.intent;
        intent.moveX = Math.sin(angle);
        intent.moveZ = Math.cos(angle);
        intent.sprint = dist > 7;

        if (dist < 3) {
            const roll = Math.random();
            if (roll < this.aggression * 0.8) {
                this._setState('attack');
                this.comboCount = 0;
            } else {
                this._setState('circle');
            }
        }
        if (this.stateTimer > 3) this._setState('circle');
    }

    _rushdown(char, target, dist, angle, dt) {
        const intent = char.intent;
        intent.moveX = Math.sin(angle);
        intent.moveZ = Math.cos(angle);
        intent.sprint = true;

        if (dist < 3) {
            if (Math.random() < 0.5) {
                intent.lightAttack = true;
            } else {
                intent.grab = true;
            }
            this._setState('circle');
        }
        if (this.stateTimer > 3) this._setState('approach');
    }

    _circle(char, target, dist, angle, dt) {
        const intent = char.intent;
        const sAngle = angle + (Math.PI / 2) * this.circleDir;
        const approach = dist > 4 ? 0.5 : (dist < 2 ? -0.45 : 0);

        intent.moveX = Math.sin(sAngle) * 0.6 + Math.sin(angle) * approach;
        intent.moveZ = Math.cos(sAngle) * 0.6 + Math.cos(angle) * approach;

        if (this.stateTimer > this.stateThreshold + this.patience * 0.5) {
            const roll = Math.random();
            const inRange = dist < 3;

            if (roll < 0.3 && inRange) {
                this._setState('attack');
                this.comboCount = 0;
            } else if (roll < 0.45 && inRange && this.preferGrab && char.stamina >= 25) {
                intent.grab = true;
                this._setState('idle');
            } else if (roll < 0.55 && inRange && char.stamina >= 25) {
                this.doingHeavy = true;
                this.heavyTimer = 0.4 + Math.random() * 0.9;
                intent.heavyCharge = true;
                this._setState('idle');
            } else if (roll < 0.65) {
                this.circleDir *= -1;
                this._setState('circle');
            } else if (char.stamina < 40) {
                this._setState('retreat');
            } else if (roll < 0.8 && dist > 5) {
                this._setState('rushdown');
            } else {
                this._setState('approach');
            }
        }
    }

    _attack(char, target, dist, angle, dt) {
        const intent = char.intent;

        if (dist > 2.8) {
            intent.moveX = Math.sin(angle) * 0.6;
            intent.moveZ = Math.cos(angle) * 0.6;
        }

        if (char.state === CharState.IDLE || char.state === CharState.WALK) {
            if (this.comboCount < 3 && dist < 3.2) {
                const roll = Math.random();

                if (this.comboCount === 0 && roll < 0.25 && dist < 2.5) {
                    this.doingHeavy = true;
                    this.heavyTimer = 0.3 + Math.random() * 1.0;
                    intent.heavyCharge = true;
                    this._setState('idle');
                } else if (this.comboCount === 0 && roll < 0.4 && dist < 2.2 && char.stamina >= 25) {
                    intent.grab = true;
                    this._setState('circle');
                } else {
                    intent.lightAttack = true;
                    this.comboCount++;
                }
            } else {
                this._setState('circle');
            }
        }

        if (this.stateTimer > 2.2) this._setState('circle');
    }

    _retreat(char, target, dist, angle, dt) {
        const intent = char.intent;
        intent.moveX = -Math.sin(angle);
        intent.moveZ = -Math.cos(angle);
        intent.sprint = dist < 4;

        if (dist < 2.8 && Math.random() < 0.6 * dt && !this.blocking) {
            this.blocking = true;
            this.blockTimer = 0.3 + Math.random() * 0.6;
            intent.block = true;
        }

        if (dist < 2 && Math.random() < 0.4 * dt) {
            intent.dodge = true;
            const away = angleBetween(target.position.x, target.position.z, char.position.x, char.position.z);
            char.facing = away;
        }

        if (char.stamina > 65 || this.stateTimer > 2) {
            this._setState(Math.random() < this.aggression ? 'rushdown' : 'approach');
        }
    }

    _avoidEdge(char) {
        const dCenter = Math.sqrt(char.position.x ** 2 + char.position.z ** 2);
        if (dCenter > 18) {
            const panic = Math.min((dCenter - 18) / 8, 1) * 1.8;
            const toC = Math.atan2(-char.position.x, -char.position.z);
            char.intent.moveX += Math.sin(toC) * panic;
            char.intent.moveZ += Math.cos(toC) * panic;

            if (dCenter > 22 && char.stamina >= 20 && Math.random() < 0.02) {
                char.intent.dodge = true;
                char.facing = toC;
            }
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
