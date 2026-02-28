import * as THREE from 'three';

export class UIManager {
    constructor() {
        this.announcer = document.getElementById('announcer');
        this.comboMeter = document.getElementById('combo-meter');
        this.comboCount = document.getElementById('combo-count');
        this.damageContainer = document.getElementById('damage-numbers');
        this.aliveCount = document.getElementById('alive-count');
        this.roundText = document.getElementById('round-text');
        this.playerDmg = document.getElementById('player-dmg');
        this.playerStaminaBar = document.getElementById('player-stamina');
        this.enemyContainer = document.getElementById('enemy-stats-container');
        this.mobileControls = document.getElementById('mobile-controls');
        this.lockOnEl = document.getElementById('lock-on-marker');
        this.hitFlash = document.getElementById('hit-flash');
        this.hitConfirm = document.getElementById('hit-confirm');
        this.playerStats = document.getElementById('player-stats');

        this._comboTimer = 0;
        this._announcerTimeout = null;
        this._flashTimeout = null;
        this._slowMoTimer = 0;
        this._slowMoCallback = null;
        this._hitConfirmTimeout = null;
        this._damagePulseTimeout = null;
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
                <div class="dmg-pct" id="enemy-dmg-${char.name}">0%</div>
            `;
            this.enemyContainer.appendChild(div);
        }
    }

    _getDmgClass(pct) {
        if (pct >= 150) return 'dmg-pct danger';
        if (pct >= 80) return 'dmg-pct hot';
        return 'dmg-pct';
    }

    updateHUD(player, enemies, camera, dt) {
        if (this.playerDmg) {
            const pct = Math.floor(player.damage);
            this.playerDmg.textContent = `${pct}%`;
            this.playerDmg.className = this._getDmgClass(pct);
        }

        if (this.playerStaminaBar) {
            const sp = Math.max(0, (player.stamina / player.maxStamina) * 100);
            this.playerStaminaBar.style.width = `${sp}%`;
        }

        for (const e of enemies) {
            const el = document.getElementById(`enemy-dmg-${e.name}`);
            if (el) {
                const pct = Math.floor(e.damage);
                el.textContent = `${pct}%`;
                el.className = this._getDmgClass(pct);
            }
            const stat = document.getElementById(`enemy-${e.name}`);
            if (stat) stat.style.opacity = e.alive ? '1' : '0.3';
        }

        const alive = [player, ...enemies].filter(c => c.alive).length;
        if (this.aliveCount) this.aliveCount.textContent = alive;

        if (this._comboTimer > 0) {
            this._comboTimer -= dt;
            this.comboMeter.classList.add('visible');
        } else {
            this.comboMeter.classList.remove('visible');
        }
    }

    flashScreen(type = 'red') {
        if (!this.hitFlash) return;
        this.hitFlash.className = `active ${type}`;
        if (this._flashTimeout) clearTimeout(this._flashTimeout);
        this._flashTimeout = setTimeout(() => {
            this.hitFlash.className = '';
        }, type === 'white' ? 120 : 90);
    }

    showHitConfirm(isHeavy = false) {
        if (!this.hitConfirm) return;
        this.hitConfirm.className = isHeavy ? 'active heavy' : 'active';
        if (this._hitConfirmTimeout) clearTimeout(this._hitConfirmTimeout);
        this._hitConfirmTimeout = setTimeout(() => {
            this.hitConfirm.className = '';
        }, isHeavy ? 180 : 130);
    }

    pulsePlayerDamage() {
        if (!this.playerDmg || !this.playerStats) return;
        this.playerDmg.classList.add('hit-pulse');
        this.playerStats.classList.add('hit-pulse');
        if (this._damagePulseTimeout) clearTimeout(this._damagePulseTimeout);
        this._damagePulseTimeout = setTimeout(() => {
            this.playerDmg.classList.remove('hit-pulse');
            this.playerStats.classList.remove('hit-pulse');
        }, 180);
    }

    showAnnouncer(text, duration = 2) {
        if (!this.announcer) return;
        this.announcer.textContent = text;
        this.announcer.classList.add('visible');
        if (this._announcerTimeout) clearTimeout(this._announcerTimeout);
        this._announcerTimeout = setTimeout(() => {
            this.announcer.classList.remove('visible');
        }, duration * 1000);
    }

    updateCombo(count) {
        if (count > 1) {
            this.comboCount.textContent = count;
            this._comboTimer = 2;
            this.comboMeter.classList.remove('pop');
            this.comboCount.offsetWidth;
            this.comboMeter.classList.add('pop');
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
        el.style.setProperty('--drift-x', `${(Math.random() * 36 - 18).toFixed(1)}px`);
        el.style.setProperty('--tilt', `${(Math.random() * 16 - 8).toFixed(1)}deg`);
        el.style.left = `${sx}px`;
        el.style.top = `${sy}px`;
        this.damageContainer.appendChild(el);

        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
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
            <p>Ring Outs: ${stats.kills}</p>
        `;
    }
}
