import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { InputManager } from './input.js';
import { UIManager } from './ui.js';
import { ItemManager } from './items.js';
import { BotAI } from './ai.js';
import {
    createCharacter, resetCharacter, updateCharacterAnimation,
    CharState, createIntent,
} from './character.js';
import { processCharacterState, checkCombatHits } from './combat.js';
import { updatePhysics, checkRingOut, checkCharacterCollisions } from './physics.js';
import { CHAR_COLORS } from './utils.js';
import * as Audio from './audio.js';

const GameState = {
    MENU: 'menu',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    SLOWMO: 'slowmo',
    ROUND_END: 'round_end',
    RESULTS: 'results',
};

export class Game {
    constructor() {
        this.scene = new SceneManager();
        this.input = new InputManager();
        this.ui = new UIManager();
        this.items = null;

        this.state = GameState.MENU;
        this.stateTimer = 0;

        this.characters = [];
        this.player = null;
        this.bots = [];
        this.botAIs = [];

        this.currentRound = 1;
        this.maxRounds = 3;
        this.playerRoundWins = 0;
        this.bestBotRoundWins = 0;

        this.lockOnTarget = null;
        this.comboCount = 0;
        this.comboTimer = 0;

        this.slowMoTarget = null;
        this.slowMoScale = 1;
    }

    init(canvas) {
        this.scene.init(canvas);
        this.input.init();

        this.items = new ItemManager(this.scene.scene);

        this.player = createCharacter('YOU', CHAR_COLORS[0], true);
        this.characters.push(this.player);
        this.scene.scene.add(this.player.mesh);

        for (let i = 1; i <= 3; i++) {
            const bot = createCharacter(CHAR_COLORS[i].name, CHAR_COLORS[i], false);
            this.characters.push(bot);
            this.scene.scene.add(bot.mesh);
            this.bots.push(bot);
            this.botAIs.push(new BotAI(0.25 + i * 0.15));
        }

        this._bindButtons();
        this._hideAll();
        this.ui.showScreen('main-menu');
    }

    _bindButtons() {
        const click = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => { Audio.resumeAudio(); Audio.playUIClick(); fn(); });
        };
        click('btn-play', () => this.startMatch());
        click('btn-controls', () => this.ui.showScreen('controls-screen'));
        click('btn-back', () => this.ui.showScreen('main-menu'));
        click('btn-play-again', () => this.startMatch());
        click('btn-menu', () => {
            this.state = GameState.MENU;
            this.ui.showScreen('main-menu');
            this.ui.showMobileControls(false);
            this._hideAll();
        });
    }

    startMatch() {
        this.currentRound = 1;
        this.playerRoundWins = 0;
        this.bestBotRoundWins = 0;

        for (const c of this.characters) {
            c.roundWins = 0;
            c.kills = 0;
            c.damageDealt = 0;
            c.buffs = { damageUp: false, staminaUp: false, regenUp: false, throwUp: false };
            c.maxStamina = 100;
        }

        this._startRound();
    }

    _startRound() {
        const spots = [
            { x: 0, z: -8 }, { x: 8, z: 0 },
            { x: 0, z: 8 },  { x: -8, z: 0 },
        ];

        for (let i = 0; i < this.characters.length; i++) {
            const c = this.characters[i];
            resetCharacter(c, spots[i].x, spots[i].z);
            c.facing = Math.atan2(-spots[i].x, -spots[i].z);
            c.buffs = { damageUp: false, staminaUp: false, regenUp: false, throwUp: false };
            c.maxStamina = 100;
        }

        for (const ai of this.botAIs) ai.reset();
        this.items.reset();
        this.lockOnTarget = null;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.slowMoTarget = null;
        this.slowMoScale = 1;

        this.state = GameState.COUNTDOWN;
        this.stateTimer = 0;

        this.ui.showScreen('hud');
        this.ui.showMobileControls(this.input.isMobile);
        this.ui.setupEnemyBars(this.characters);
        this.ui.updateRound(this.currentRound, this.playerRoundWins);
        this.ui.showAnnouncer(`ROUND ${this.currentRound}`, 1.5);

        this.scene.camAngle = Math.atan2(this.player.position.x, this.player.position.z) + Math.PI;
        this.scene.camTargetAngle = this.scene.camAngle;
        this.scene.camLookAt.set(this.player.position.x, 1.2, this.player.position.z);
        this.scene.camPos.set(
            this.player.position.x + Math.sin(this.scene.camAngle) * this.scene.camDistance,
            this.scene.camHeight + 1,
            this.player.position.z + Math.cos(this.scene.camAngle) * this.scene.camDistance
        );

        Audio.playCountdown();
    }

    update(dt) {
        dt = Math.min(dt, 0.05);

        switch (this.state) {
            case GameState.MENU: this._updateMenu(dt); break;
            case GameState.COUNTDOWN: this._updateCountdown(dt); break;
            case GameState.PLAYING: this._updatePlaying(dt); break;
            case GameState.SLOWMO: this._updateSlowMo(dt); break;
            case GameState.ROUND_END: this._updateRoundEnd(dt); break;
            case GameState.RESULTS: break;
        }

        this.scene.updateParticles(dt * this.slowMoScale);
        this.scene.render();
        this.input.endFrame();
    }

    _updateMenu(dt) {
        const t = performance.now() * 0.0003;
        this.scene.camera.position.set(Math.sin(t) * 18, 14, Math.cos(t) * 18);
        this.scene.camera.lookAt(0, 0, 0);
    }

    _updateCountdown(dt) {
        this.stateTimer += dt;

        const prev = Math.ceil(2.5 - (this.stateTimer - dt));
        const curr = Math.ceil(2.5 - this.stateTimer);
        if (curr !== prev && curr > 0 && curr <= 3) {
            this.ui.showAnnouncer(`${curr}`, 0.8);
            Audio.playCountdown();
        }

        if (this.stateTimer >= 2.5) {
            this.state = GameState.PLAYING;
            this.stateTimer = 0;
            this.ui.showAnnouncer('FIGHT!', 1);
            Audio.playRoundStart();
        }

        this.scene.updateCamera(this.player.position, null, dt);
        for (const c of this.characters) updateCharacterAnimation(c, dt);
    }

    _updatePlaying(dt) {
        this.slowMoScale = 1;
        this._processPlayerInput();

        for (let i = 0; i < this.bots.length; i++) {
            if (this.bots[i].alive) {
                this.botAIs[i].update(dt, this.bots[i], this.characters);
            }
        }

        for (const c of this.characters) processCharacterState(c, dt);
        for (const c of this.characters) updatePhysics(c, dt);
        checkCharacterCollisions(this.characters);

        const hits = checkCombatHits(this.characters, this.ui, this.scene.camera, this.scene);
        for (const hit of hits) {
            if (hit.attacker === this.player || hit.attacker.isPlayer) {
                this.comboCount++;
                this.comboTimer = 2;
                this.ui.updateCombo(this.comboCount);
            }

            if (hit.damage > 0) {
                const isBig = hit.damage >= 16;
                const isHuge = hit.damage >= 22;
                const color = isHuge ? 0xffaa00 : (isBig ? 0xffcc44 : 0xffffff);
                const count = isHuge ? 22 : (isBig ? 12 : 6);
                this.scene.spawnHitParticles(hit.target.position, color, count);
                this.scene.spawnSpeedLines(hit.target.position, 0, color);
                if (isBig) {
                    this.scene.spawnImpactRing(hit.target.position);
                }
                if (isHuge) {
                    this.scene.spawnDustCloud(hit.target.position);
                    this.scene.spawnImpactRing(hit.target.position);
                    this.scene.spawnGroundCrack(hit.target.position);
                }

                if (hit.target === this.player) {
                    this.ui.flashScreen(isHuge ? 'white' : 'red');
                }

                if (hit.blocked) {
                    this.scene.spawnHitParticles(hit.target.position, 0x4488ff, 8);
                    this.scene.shake(0.15);
                }
            }
            if (hit.isGrab) {
                this.scene.spawnHitParticles(hit.target.position, 0xffdd44, 12);
                this.scene.shake(0.2);
            }
        }

        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.comboCount = 0;

        const alive = this.characters.filter(c => c.alive);
        for (const c of this.characters) {
            if (c.alive && checkRingOut(c)) {
                this._handleRingOut(c, alive.length);
            }
        }

        for (const c of this.characters) {
            if (c.state === CharState.GROUND_BOUNCE && c.stateTimer < 0.05) {
                this.scene.spawnHitParticles(c.position, 0x998877, 8);
                this.scene.spawnDustCloud(c.position);
                this.scene.spawnShockwave(c.position, 0xddaa66);
                this.scene.shake(0.25);
                if (c.bounceCount <= 1) {
                    this.scene.spawnGroundCrack(c.position);
                }
            }
            if (c.landingTimer > 0 && c.landingTimer < 0.02 + dt) {
                this.scene.spawnDustCloud(c.position);
            }
        }

        const pickup = this.items.update(dt, this.characters);
        if (pickup && pickup.picked) {
            Audio.playPickup();
            const isMove = pickup.type.isMove;
            const msg = isMove
                ? `${pickup.character.name} got ${pickup.type.name}!`
                : `${pickup.character.name}: ${pickup.type.name}`;
            this.ui.showAnnouncer(msg, isMove ? 1.5 : 1);
            const pColor = isMove ? pickup.type.color : 0x44ff44;
            this.scene.spawnHitParticles(pickup.character.position, pColor, isMove ? 14 : 8);
            if (isMove) {
                this.scene.spawnImpactRing(pickup.character.position);
            }
        }

        this._updateLockOn();

        const camTarget = this.player.alive
            ? this.player
            : (this.characters.find(c => c.alive) || this.player);
        this.scene.updateCamera(
            camTarget.position,
            this.lockOnTarget ? this.lockOnTarget.position : null,
            dt
        );

        if (!this.lockOnTarget && this.player.alive) {
            const vx = this.player.velocity.x;
            const vz = this.player.velocity.z;
            if (vx * vx + vz * vz > 1) {
                this.scene.setCameraAngle(Math.atan2(vx, vz) + Math.PI);
            }
        }

        for (const c of this.characters) updateCharacterAnimation(c, dt);
        this.ui.updateHUD(this.player, this.bots, this.scene.camera, dt);
        this.ui.updateLockOn(this.lockOnTarget, this.scene.camera);

        this._checkRoundEnd();
    }

    _updateSlowMo(dt) {
        this.stateTimer += dt;
        this.slowMoScale = 0.2;
        const gameDt = dt * this.slowMoScale;

        for (const c of this.characters) processCharacterState(c, gameDt);
        for (const c of this.characters) updatePhysics(c, gameDt);
        for (const c of this.characters) updateCharacterAnimation(c, gameDt);

        if (this.slowMoTarget) {
            this.scene.updateCamera(this.slowMoTarget.position, null, dt);
        }

        if (this.stateTimer >= 1.2) {
            this.slowMoScale = 1;
            this.slowMoTarget = null;
            this._checkRoundEnd();
            if (this.state === GameState.SLOWMO) {
                this.state = GameState.PLAYING;
            }
        }
    }

    _processPlayerInput() {
        if (!this.player.alive) return;

        const intent = this.player.intent;
        const move = this.input.getMovement();

        const ca = this.scene.camAngle;
        const fwdX = -Math.sin(ca);
        const fwdZ = -Math.cos(ca);
        const rgtX = Math.cos(ca);
        const rgtZ = -Math.sin(ca);

        intent.moveX = move.x * rgtX + move.z * fwdX;
        intent.moveZ = move.x * rgtZ + move.z * fwdZ;
        intent.sprint = this.input.wantSprint;
        intent.jump = this.input.wantJump;
        intent.lightAttack = this.input.wantLightAttack;
        intent.heavyCharge = this.input.wantHeavyHold;
        intent.dodge = this.input.wantDodge;
        intent.grab = this.input.wantGrab;
        intent.block = this.input.wantBlock;
    }

    _updateLockOn() {
        let nearest = null;
        let nearestDist = 18;

        if (this.player.alive) {
            for (const bot of this.bots) {
                if (!bot.alive) continue;
                const d = this.player.position.distanceTo(bot.position);
                if (d < nearestDist) { nearestDist = d; nearest = bot; }
            }
        }

        this.lockOnTarget = nearest;

        if (nearest && this.player.alive) {
            const atkStates = [
                CharState.LIGHT1, CharState.LIGHT2, CharState.LIGHT3,
                CharState.HEAVY_CHARGE, CharState.HEAVY_RELEASE, CharState.GRAB,
            ];
            if (atkStates.includes(this.player.state)) {
                this.player.facing = Math.atan2(
                    nearest.position.x - this.player.position.x,
                    nearest.position.z - this.player.position.z
                );
            }
        }
    }

    _handleRingOut(char, aliveBeforeThis) {
        if (!char.alive) return;
        char.alive = false;
        char.state = CharState.RINGOUT;
        char.stateTimer = 0;
        if (char.grabTarget) {
            char.grabTarget.grabbedBy = null;
            char.grabTarget.state = CharState.IDLE;
            char.grabTarget.stateTimer = 0;
            char.grabTarget = null;
        }
        if (char.grabbedBy) {
            char.grabbedBy.grabTarget = null;
            char.grabbedBy.kills++;
            char.grabbedBy = null;
        }

        const remaining = this.characters.filter(c => c.alive);
        const lastNearEdge = remaining.length > 0 && remaining.some(c => {
            const d = Math.sqrt(c.position.x ** 2 + c.position.z ** 2);
            return d > 20 || c.state === CharState.LAUNCHED || c.state === CharState.KNOCKBACK;
        });

        Audio.playRingOut();
        this.scene.shake(0.5);
        this.scene.spawnHitParticles(char.position, 0xff6644, 16);

        if (aliveBeforeThis <= 2) {
            this.ui.showAnnouncer(`${char.name} ELIMINATED!`, 2);
            this.state = GameState.SLOWMO;
            this.stateTimer = 0;
            this.slowMoTarget = char;
        } else {
            this.ui.showAnnouncer(`${char.name} OUT!`, 1.2);
        }
    }

    _checkRoundEnd() {
        const alive = this.characters.filter(c => c.alive);
        if (alive.length > 1) return;

        const winner = alive[0] || null;
        if (winner) {
            winner.roundWins++;
            if (winner.isPlayer) this.playerRoundWins++;
        }

        this.bestBotRoundWins = Math.max(...this.bots.map(b => b.roundWins), 0);

        this.state = GameState.ROUND_END;
        this.stateTimer = 0;

        const name = winner ? winner.name : 'NOBODY';
        this.ui.showAnnouncer(`${name} WINS!`, 2);
        if (winner && winner.isPlayer) Audio.playVictory();
    }

    _updateRoundEnd(dt) {
        this.stateTimer += dt;
        this.slowMoScale = 1;

        const camTarget = this.characters.find(c => c.alive) || this.player;
        this.scene.updateCamera(camTarget.position, null, dt);
        for (const c of this.characters) updateCharacterAnimation(c, dt);

        if (this.stateTimer >= 3) {
            if (this.playerRoundWins >= 2 || this.bestBotRoundWins >= 2 || this.currentRound >= this.maxRounds) {
                this._endMatch();
            } else {
                this.currentRound++;
                this._startRound();
            }
        }
    }

    _endMatch() {
        const isVictory = this.playerRoundWins > this.bestBotRoundWins;
        this.state = GameState.RESULTS;

        if (isVictory) Audio.playVictory(); else Audio.playDefeat();

        this.ui.showResults(isVictory, {
            roundWins: this.playerRoundWins,
            damageDealt: this.player.damageDealt,
            kills: this.player.kills,
        });

        this.ui.showMobileControls(false);
    }

    _hideAll() {
        for (const c of this.characters) c.mesh.visible = false;
    }
}
