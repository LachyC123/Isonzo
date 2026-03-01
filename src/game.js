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
    MODE_SELECT: 'mode_select',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    SLOWMO: 'slowmo',
    ROUND_END: 'round_end',
    RESULTS: 'results',
};

const TEAM_COLORS = {
    blue: { body: 0x2266dd, accent: 0x55aaff, name: 'Blue' },
    red:  { body: 0xcc2233, accent: 0xff7766, name: 'Red' },
};

export class Game {
    constructor() {
        this.scene = new SceneManager();
        this.input = new InputManager();
        this.ui = new UIManager();
        this.items = null;

        this.state = GameState.MENU;
        this.stateTimer = 0;
        this.gameMode = 'ffa';

        this.characters = [];
        this.player = null;
        this.bots = [];
        this.botAIs = [];

        this.currentRound = 1;
        this.maxRounds = 5;
        this.playerRoundWins = 0;
        this.bestBotRoundWins = 0;
        this.blueTeamWins = 0;
        this.redTeamWins = 0;

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

        this._createCharacters();
        this._bindButtons();
        this._hideAll();
        this.ui.showScreen('main-menu');
    }

    _createCharacters() {
        this.characters = [];
        this.bots = [];
        this.botAIs = [];

        for (let i = 0; i < 4; i++) {
            const isP = i === 0;
            const c = createCharacter(
                isP ? 'YOU' : CHAR_COLORS[i].name,
                CHAR_COLORS[i], isP
            );
            c.team = null;
            c.charIndex = i;
            this.characters.push(c);
            this.scene.scene.add(c.mesh);
            if (isP) {
                this.player = c;
            } else {
                this.bots.push(c);
                this.botAIs.push(new BotAI(0.3 + i * 0.12));
            }
        }
    }

    _applyTeamColors() {
        for (const c of this.characters) {
            if (!c.team) continue;
            const tc = c.team === 'blue' ? TEAM_COLORS.blue : TEAM_COLORS.red;
            const p = c.bodyParts;
            p.torso.material.color.setHex(tc.body);
            p.chest.material.color.setHex(tc.body);
            p.hips.material.color.setHex(tc.body);
            p.lShoulder.material.color.setHex(tc.body);
            p.rShoulder.material.color.setHex(tc.body);
            p.mask.material.color.setHex(tc.accent);
            p.belt.material.color.setHex(tc.accent);
            p.lBoot.material.color.setHex(tc.accent);
            p.rBoot.material.color.setHex(tc.accent);
            c.colorSet = { body: tc.body, accent: tc.accent };
        }
    }

    _resetCharColors() {
        for (let i = 0; i < this.characters.length; i++) {
            const c = this.characters[i];
            const cc = CHAR_COLORS[i];
            const p = c.bodyParts;
            p.torso.material.color.setHex(cc.body);
            p.chest.material.color.setHex(cc.body);
            p.hips.material.color.setHex(0x1a1a2a);
            p.lShoulder.material.color.setHex(cc.body);
            p.rShoulder.material.color.setHex(cc.body);
            p.mask.material.color.setHex(cc.accent);
            p.belt.material.color.setHex(cc.accent);
            p.lBoot.material.color.setHex(cc.accent);
            p.rBoot.material.color.setHex(cc.accent);
            c.colorSet = cc;
            c.team = null;
        }
    }

    _bindButtons() {
        const click = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => { Audio.resumeAudio(); Audio.playUIClick(); fn(); });
        };
        click('btn-play', () => {
            this.state = GameState.MODE_SELECT;
            this.ui.showScreen('mode-select');
        });
        click('btn-ffa', () => {
            this.gameMode = 'ffa';
            this._resetCharColors();
            this.maxRounds = 3;
            this.startMatch();
        });
        click('btn-teams', () => {
            this.gameMode = 'teams';
            this.characters[0].team = 'blue';
            this.characters[0].name = 'YOU';
            this.characters[1].team = 'blue';
            this.characters[1].name = 'ALLY';
            this.characters[2].team = 'red';
            this.characters[2].name = 'FOE 1';
            this.characters[3].team = 'red';
            this.characters[3].name = 'FOE 2';
            this._applyTeamColors();
            this.maxRounds = 5;
            this.startMatch();
        });
        click('btn-mode-back', () => this.ui.showScreen('main-menu'));
        click('btn-controls', () => this.ui.showScreen('controls-screen'));
        click('btn-back', () => this.ui.showScreen('main-menu'));
        click('btn-play-again', () => {
            if (this.gameMode === 'teams') {
                this._applyTeamColors();
            }
            this.startMatch();
        });
        click('btn-menu', () => {
            this.state = GameState.MENU;
            this.ui.showScreen('main-menu');
            this.ui.showMobileControls(false);
            this._resetCharColors();
            this._hideAll();
        });
    }

    startMatch() {
        this.currentRound = 1;
        this.playerRoundWins = 0;
        this.bestBotRoundWins = 0;
        this.blueTeamWins = 0;
        this.redTeamWins = 0;

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
        const spots = this.gameMode === 'teams'
            ? [{ x: -4, z: -6 }, { x: 4, z: -6 }, { x: -4, z: 6 }, { x: 4, z: 6 }]
            : [{ x: 0, z: -8 }, { x: 8, z: 0 }, { x: 0, z: 8 }, { x: -8, z: 0 }];

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
        this.ui.setupEnemyBars(this.characters, this.gameMode);
        this.ui.updateRound(this.currentRound, this.gameMode === 'teams' ? this.blueTeamWins : this.playerRoundWins);
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
            case GameState.MENU:
            case GameState.MODE_SELECT:
                this._updateMenu(dt); break;
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
                const enemies = this._getEnemiesFor(this.bots[i]);
                this.botAIs[i].update(dt, this.bots[i], enemies);
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
                if (isBig) this.scene.spawnImpactRing(hit.target.position);
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

        const aliveNow = this.characters.filter(c => c.alive);
        for (const c of this.characters) {
            if (c.alive && checkRingOut(c)) this._handleRingOut(c, aliveNow.length);
        }

        for (const c of this.characters) {
            if (c.state === CharState.GROUND_BOUNCE && c.stateTimer < 0.05) {
                this.scene.spawnHitParticles(c.position, 0x998877, 8);
                this.scene.spawnDustCloud(c.position);
                this.scene.spawnShockwave(c.position, 0xddaa66);
                this.scene.shake(0.25);
                if (c.bounceCount <= 1) this.scene.spawnGroundCrack(c.position);
            }
            if (c.state === CharState.KNOCKDOWN && c.stateTimer < 0.05) {
                this.scene.spawnDustCloud(c.position);
                this.scene.shake(0.15);
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
            if (isMove) this.scene.spawnImpactRing(pickup.character.position);
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
        this.ui.updateNameplates(this.characters, this.scene.camera, this.gameMode);

        this._checkRoundEnd();
    }

    _getEnemiesFor(char) {
        if (this.gameMode === 'teams') {
            return this.characters.filter(c => c !== char && c.alive && c.team !== char.team);
        }
        return this.characters.filter(c => c !== char && c.alive);
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
        intent.special = this.input.wantSpecial;
    }

    _updateLockOn() {
        let nearest = null;
        let nearestDist = 18;

        if (this.player.alive) {
            for (const c of this.characters) {
                if (c === this.player || !c.alive) continue;
                if (this.gameMode === 'teams' && c.team === this.player.team) continue;
                const d = this.player.position.distanceTo(c.position);
                if (d < nearestDist) { nearestDist = d; nearest = c; }
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

        Audio.playRingOut();
        this.scene.shake(0.5);
        this.scene.spawnHitParticles(char.position, 0xff6644, 16);

        const isFinal = this._isRoundOver();
        if (isFinal) {
            this.ui.showAnnouncer(`${char.name} ELIMINATED!`, 2);
            this.state = GameState.SLOWMO;
            this.stateTimer = 0;
            this.slowMoTarget = char;
        } else {
            this.ui.showAnnouncer(`${char.name} OUT!`, 1.2);
        }
    }

    _isRoundOver() {
        if (this.gameMode === 'teams') {
            const blueAlive = this.characters.filter(c => c.alive && c.team === 'blue').length;
            const redAlive = this.characters.filter(c => c.alive && c.team === 'red').length;
            return blueAlive === 0 || redAlive === 0;
        }
        return this.characters.filter(c => c.alive).length <= 1;
    }

    _checkRoundEnd() {
        if (!this._isRoundOver()) return;

        if (this.gameMode === 'teams') {
            const blueAlive = this.characters.filter(c => c.alive && c.team === 'blue').length;
            const redAlive = this.characters.filter(c => c.alive && c.team === 'red').length;
            if (blueAlive > 0) {
                this.blueTeamWins++;
                this.ui.showAnnouncer('BLUE TEAM WINS!', 2);
                if (this.player.alive) Audio.playVictory();
            } else if (redAlive > 0) {
                this.redTeamWins++;
                this.ui.showAnnouncer('RED TEAM WINS!', 2);
            } else {
                this.ui.showAnnouncer('DRAW!', 2);
            }
        } else {
            const alive = this.characters.filter(c => c.alive);
            const winner = alive[0] || null;
            if (winner) {
                winner.roundWins++;
                if (winner.isPlayer) this.playerRoundWins++;
            }
            this.bestBotRoundWins = Math.max(...this.bots.map(b => b.roundWins), 0);
            const name = winner ? winner.name : 'NOBODY';
            this.ui.showAnnouncer(`${name} WINS!`, 2);
            if (winner && winner.isPlayer) Audio.playVictory();
        }

        this.state = GameState.ROUND_END;
        this.stateTimer = 0;
    }

    _updateRoundEnd(dt) {
        this.stateTimer += dt;
        this.slowMoScale = 1;

        const camTarget = this.characters.find(c => c.alive) || this.player;
        this.scene.updateCamera(camTarget.position, null, dt);
        for (const c of this.characters) updateCharacterAnimation(c, dt);

        if (this.stateTimer >= 3) {
            const matchOver = this.gameMode === 'teams'
                ? (this.blueTeamWins >= 3 || this.redTeamWins >= 3 || this.currentRound >= this.maxRounds)
                : (this.playerRoundWins >= 2 || this.bestBotRoundWins >= 2 || this.currentRound >= this.maxRounds);

            if (matchOver) {
                this._endMatch();
            } else {
                this.currentRound++;
                this._startRound();
            }
        }
    }

    _endMatch() {
        let isVictory;
        if (this.gameMode === 'teams') {
            isVictory = this.blueTeamWins > this.redTeamWins;
        } else {
            isVictory = this.playerRoundWins > this.bestBotRoundWins;
        }
        this.state = GameState.RESULTS;

        if (isVictory) Audio.playVictory(); else Audio.playDefeat();

        const rw = this.gameMode === 'teams' ? this.blueTeamWins : this.playerRoundWins;
        this.ui.showResults(isVictory, {
            roundWins: rw,
            damageDealt: this.player.damageDealt,
            kills: this.player.kills,
        });

        this.ui.showMobileControls(false);
    }

    _hideAll() {
        for (const c of this.characters) c.mesh.visible = false;
    }
}
