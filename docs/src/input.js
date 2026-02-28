export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseButtons = {};
        this._justPressedKeys = new Set();
        this._justPressedMouse = new Set();
        this._justTouched = new Set();

        this.isMobile = false;

        this.joystickX = 0;
        this.joystickY = 0;
        this.joystickActive = false;
        this._joystickTouchId = null;
        this._joystickCenterX = 0;
        this._joystickCenterY = 0;

        this.touchHeld = {};
        this._touchPressTime = {};
    }

    init() {
        this.isMobile = ('ontouchstart' in window) && (window.innerWidth <= 1280);

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) this._justPressedKeys.add(e.code);
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('mousedown', (e) => {
            if (!this.mouseButtons[e.button]) this._justPressedMouse.add(e.button);
            this.mouseButtons[e.button] = true;
        });
        window.addEventListener('mouseup', (e) => {
            this.mouseButtons[e.button] = false;
        });
        window.addEventListener('contextmenu', (e) => e.preventDefault());

        if (this.isMobile) this._initTouch();
    }

    _initTouch() {
        const zone = document.getElementById('joystick-zone');
        const base = document.getElementById('joystick-base');
        const thumb = document.getElementById('joystick-thumb');
        if (!zone || !base || !thumb) return;

        const maxR = 40;

        zone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            this._joystickTouchId = t.identifier;
            this.joystickActive = true;
            const r = base.getBoundingClientRect();
            this._joystickCenterX = r.left + r.width / 2;
            this._joystickCenterY = r.top + r.height / 2;
        }, { passive: false });

        zone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier !== this._joystickTouchId) continue;
                let dx = t.clientX - this._joystickCenterX;
                let dy = t.clientY - this._joystickCenterY;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > maxR) { dx *= maxR / d; dy *= maxR / d; }
                this.joystickX = dx / maxR;
                this.joystickY = dy / maxR;
                thumb.style.transform = `translate(${dx}px, ${dy}px)`;
            }
        }, { passive: false });

        const endJ = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier !== this._joystickTouchId) continue;
                this.joystickActive = false;
                this.joystickX = 0;
                this.joystickY = 0;
                this._joystickTouchId = null;
                thumb.style.transform = '';
            }
        };
        zone.addEventListener('touchend', endJ);
        zone.addEventListener('touchcancel', endJ);

        const bind = (id, name) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!this.touchHeld[name]) this._justTouched.add(name);
                this.touchHeld[name] = true;
                this._touchPressTime[name] = performance.now();
            }, { passive: false });
            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touchHeld[name] = false;
            }, { passive: false });
            el.addEventListener('touchcancel', () => { this.touchHeld[name] = false; });
        };

        bind('btn-atk', 'attack');
        bind('btn-jmp', 'jump');
        bind('btn-dge', 'dodge');
        bind('btn-grb', 'grab');
        bind('btn-blk', 'block');
    }

    justPressed(code) { return this._justPressedKeys.has(code); }
    justClicked(btn) { return this._justPressedMouse.has(btn); }
    justTouched(name) { return this._justTouched.has(name); }

    getMovement() {
        if (this.isMobile && this.joystickActive) {
            return { x: this.joystickX, z: -this.joystickY };
        }
        let x = 0, z = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) z += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) z -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
        const len = Math.sqrt(x * x + z * z);
        if (len > 1) { x /= len; z /= len; }
        return { x, z };
    }

    get wantJump() {
        return this.justPressed('Space') || this.justTouched('jump');
    }

    get wantLightAttack() {
        return this.justClicked(0) || this.justPressed('KeyJ') || this.justTouched('attack');
    }

    get wantHeavyHold() {
        if (this.isMobile) {
            return this.touchHeld.attack &&
                (performance.now() - (this._touchPressTime.attack || 0) > 350);
        }
        return this.mouseButtons[2] || this.keys['KeyK'];
    }

    get wantDodge() {
        return this.justPressed('KeyQ') || this.justTouched('dodge');
    }

    get wantGrab() {
        return this.justPressed('KeyE') || this.justTouched('grab');
    }

    get wantBlock() {
        return this.keys['KeyR'] || this.touchHeld.block;
    }

    get wantSprint() {
        if (this.isMobile) {
            return this.joystickActive &&
                (this.joystickX * this.joystickX + this.joystickY * this.joystickY) > 0.7;
        }
        return this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    }

    endFrame() {
        this._justPressedKeys.clear();
        this._justPressedMouse.clear();
        this._justTouched.clear();
    }
}
