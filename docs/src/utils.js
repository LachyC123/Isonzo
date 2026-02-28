export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function distance2D(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
}

export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

export function angleBetween(x1, z1, x2, z2) {
    return Math.atan2(x2 - x1, z2 - z1);
}

export function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

export const CHAR_COLORS = [
    { body: 0x3388ff, accent: 0x66bbff, name: 'Azure' },
    { body: 0xff3344, accent: 0xff7788, name: 'Crimson' },
    { body: 0x33cc55, accent: 0x77ee88, name: 'Jade' },
    { body: 0xff8822, accent: 0xffbb66, name: 'Blaze' },
];

export class ObjectPool {
    constructor(factory, resetFn, max = 64) {
        this.factory = factory;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        this.max = max;
    }

    acquire() {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else if (this.active.length < this.max) {
            obj = this.factory();
        } else {
            return null;
        }
        this.resetFn(obj);
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const idx = this.active.indexOf(obj);
        if (idx >= 0) {
            this.active.splice(idx, 1);
            this.pool.push(obj);
        }
    }

    forEach(fn) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            fn(this.active[i], i);
        }
    }

    releaseAll() {
        this.pool.push(...this.active);
        this.active.length = 0;
    }
}
