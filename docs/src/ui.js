import * as THREE from 'three';

export class UIManager {
    constructor() {
        this.announcer = document.getElementById('announcer');
        this.comboMeter = document.getElementById('combo-meter');
        this.comboCount = document.getElementById('combo-count');
        this.damageContainer = document.getElementById('damage-numbers');
        this.hitBursts = document.getElementById('hit-bursts');
        this.aliveCount = document.getElementById('alive-count');
        this.roundText = document.getElementById('round-text');
        this.roundTimer = document.getElementById('round-timer');
        this.playerHealthBar = document.getElementById('player-health');
        this.playerHealthText = document.getElementById('player-health-text');
        this.playerStaminaBar = document.getElementById('player-stamina');
        this.enemyContainer = document.getElementById('enemy-stats-container');
        this.mobileControls = document.getElementById('mobile-controls');
        this.lockOnEl = document.getElementById('lock-on-marker');
        this.hitFlash = document.getElementById('hit-flash');

        this._comboTimer = 0;
        this._announcerTimeout = null;
        this._hitFlashTimer = 0;
        this._impactPulseTimer = 0;
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    showMobileControls(show) {
        if (this.mobileControls) {
            this.mobileControls.classList.toggle('active', show);
        }
    }

    setupEnemyBars(characters) {
        this.enemyContainer.innerHTML = '';
        for (const char of characters) {
            if (char.isPlayer) continue;
            const div = document.createElement('div');
            div.className = 'enemy-stat';
            div.id = `enemy-${char.name}`;
            const hexColor = '#' + new THREE.Color(char.colorSet.body).getHexString();
            div.innerHTML = `
                <div class="player-name" style="color:${hexColor}">${char.name}</div>
                <div class="bar-container health-bar">
                    <div class="bar-fill" id="enemy-health-${char.name}"></div>
                </div>
            `;
            this.enemyContainer.appendChild(div);
        }
    }

    updateHUD(player, enemies, camera, dt, roundElapsed = 0) {
        if (this.playerHealthBar) {
            const hp = Math.max(0, player.health);
            this.playerHealthBar.style.width = `${hp}%`;
            this.playerHealthText.textContent = Math.ceil(hp);
            this.playerHealthBar.style.background = hp < 30
                ? 'linear-gradient(90deg, #ff1111, #ff3333)'
                : 'linear-gradient(90deg, #ff3333, #ff6644)';
        }

        if (this.playerStaminaBar) {
            const sp = Math.max(0, (player.stamina / player.maxStamina) * 100);
            this.playerStaminaBar.style.width = `${sp}%`;
        }

        document.body.classList.toggle('special-ready', !!player.buffs.throwUp && player.alive);

        if (this.roundTimer) {
            const seconds = Math.max(0, Math.floor(roundElapsed));
            const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
            const ss = String(seconds % 60).padStart(2, '0');
            this.roundTimer.textContent = `${mm}:${ss}`;
        }

        for (const e of enemies) {
            const bar = document.getElementById(`enemy-health-${e.name}`);
            if (bar) bar.style.width = `${Math.max(0, e.health)}%`;
            const stat = document.getElementById(`enemy-${e.name}`);
            if (stat) stat.style.opacity = e.alive ? '1' : '0.3';
        }

        const alive = [player, ...enemies].filter(c => c.alive).length;
        if (this.aliveCount) this.aliveCount.textContent = alive;

        if (this._hitFlashTimer > 0) {
            this._hitFlashTimer -= dt;
            if (this.hitFlash) {
                const alpha = Math.min(1, this._hitFlashTimer * 8);
                this.hitFlash.style.opacity = `${alpha}`;
            }
        } else if (this.hitFlash) {
            this.hitFlash.style.opacity = '0';
            this.hitFlash.classList.remove('strong');
        }

        if (this._impactPulseTimer > 0) {
            this._impactPulseTimer -= dt;
            document.body.classList.add('impact-pulse');
        } else {
            document.body.classList.remove('impact-pulse');
        }

        if (this._comboTimer > 0) {
            this._comboTimer -= dt;
            this.comboMeter.classList.add('visible');
        } else {
            this.comboMeter.classList.remove('visible');
        }
    }

    showAnnouncer(text, duration = 2, power = false) {
        if (!this.announcer) return;
        this.announcer.textContent = text;
        this.announcer.classList.add('visible');
        this.announcer.classList.toggle('power', power);
        if (this._announcerTimeout) clearTimeout(this._announcerTimeout);
        this._announcerTimeout = setTimeout(() => {
            this.announcer.classList.remove('visible');
            this.announcer.classList.remove('power');
        }, duration * 1000);
    }

    updateCombo(count) {
        if (count > 1) {
            this.comboCount.textContent = count;
            this._comboTimer = 2;
            if (count === 3) this.showAnnouncer('COMBO!', 0.5, true);
            if (count === 5) this.showAnnouncer('RAMPAGE!', 0.6, true);
            if (count === 8) this.showAnnouncer('DOMINATING!', 0.7, true);
        }
    }

    spawnDamageNumber(worldPos, amount, isCrit, camera) {
        const v = new THREE.Vector3(worldPos.x, worldPos.y + 1.8, worldPos.z);
        v.project(camera);
        if (v.z > 1 || v.z < 0) return;

        const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;

        const el = document.createElement('div');
        el.className = 'damage-number' + (isCrit ? ' crit' : '');
        el.textContent = Math.round(amount);
        el.style.left = `${sx}px`;
        el.style.top = `${sy}px`;
        this.damageContainer.appendChild(el);

        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
    }

    spawnHitBurst(worldPos, camera, options = {}) {
        if (!this.hitBursts) return;

        const v = new THREE.Vector3(worldPos.x, worldPos.y + 1.1, worldPos.z);
        v.project(camera);
        if (v.z > 1 || v.z < 0) return;

        const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;

        const severity = options.severity || 'light';
        const blocked = options.blocked ? ' blocked' : '';

        const burst = document.createElement('div');
        burst.className = `hit-burst ${severity}${blocked}`;
        burst.style.left = `${sx}px`;
        burst.style.top = `${sy}px`;

        for (let i = 0; i < 4; i++) {
            const spark = document.createElement('span');
            spark.className = 'spark';
            spark.style.setProperty('--a', `${(i / 4) * 360}deg`);
            burst.appendChild(spark);
        }

        this.hitBursts.appendChild(burst);

        if (severity === 'heavy') this._impactPulseTimer = Math.max(this._impactPulseTimer, 0.16);
        if (severity === 'special') this._impactPulseTimer = Math.max(this._impactPulseTimer, 0.2);
        if (severity === 'ko') this._impactPulseTimer = Math.max(this._impactPulseTimer, 0.24);

        setTimeout(() => {
            if (burst.parentNode) burst.parentNode.removeChild(burst);
        }, severity === 'ko' ? 520 : severity === 'special' ? 500 : 420);
    }

    triggerHitFlash(strong = false) {
        this._hitFlashTimer = strong ? 0.22 : 0.12;
        if (!this.hitFlash) return;
        this.hitFlash.style.opacity = '1';
        this.hitFlash.classList.toggle('strong', strong);
    }

    updateRound(round, playerWins) {
        if (this.roundText) this.roundText.textContent = `ROUND ${round}`;
        document.querySelectorAll('.pip').forEach((pip, i) => {
            pip.className = 'pip' + (i < playerWins ? ' won' : '');
        });
    }

    updateLockOn(target, camera) {
        if (!this.lockOnEl) return;
        if (!target || !target.alive) {
            this.lockOnEl.style.display = 'none';
            return;
        }
        const v = new THREE.Vector3(target.position.x, target.position.y + 2, target.position.z);
        v.project(camera);
        if (v.z > 1 || v.z < 0) {
            this.lockOnEl.style.display = 'none';
            return;
        }
        const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
        this.lockOnEl.style.display = 'block';
        this.lockOnEl.style.left = `${sx - 20}px`;
        this.lockOnEl.style.top = `${sy - 20}px`;
    }

    showResults(isVictory, stats) {
        this.showScreen('results-screen');
        const title = document.getElementById('result-title');
        title.textContent = isVictory ? 'VICTORY!' : 'DEFEATED';
        title.className = isVictory ? 'victory' : 'defeat';
        const statsEl = document.getElementById('result-stats');
        statsEl.innerHTML = `
            <p>Rounds Won: ${stats.roundWins}</p>
            <p>Damage Dealt: ${Math.round(stats.damageDealt)}</p>
            <p>KOs: ${stats.kills}</p>
        `;
    }
}
