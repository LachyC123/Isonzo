import * as THREE from 'three';

const ITEM_TYPES = [
    { name: 'DMG+', buff: 'damageUp', color: 0xff4444, emissive: 0x661111 },
    { name: 'STA+', buff: 'staminaUp', color: 0x44aaff, emissive: 0x112266 },
    { name: 'REGEN', buff: 'regenUp', color: 0x44ff44, emissive: 0x116611 },
    { name: 'THROW+', buff: 'throwUp', color: 0xffaa44, emissive: 0x664411 },
];

export class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.spawnTimer = 3;
        this.spawnInterval = 8;
        this.maxItems = 4;
        this.arenaRadius = 20;
    }

    update(dt, characters) {
        this.spawnTimer -= dt;

        if (this.spawnTimer <= 0 && this.items.length < this.maxItems) {
            this.spawnTimer = this.spawnInterval;
            this._spawn();
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.age += dt;
            item.mesh.position.y = 0.8 + Math.sin(item.age * 2.5) * 0.2;
            item.mesh.rotation.y += dt * 2.2;

            for (const char of characters) {
                if (!char.alive) continue;
                const dx = char.position.x - item.x;
                const dz = char.position.z - item.z;
                if (dx * dx + dz * dz < 2.5) {
                    this._applyBuff(char, item.type);
                    this.scene.remove(item.mesh);
                    this.items.splice(i, 1);
                    return { picked: true, type: item.type, character: char };
                }
            }

            if (item.age > 22) {
                const fade = Math.max(0, (25 - item.age) / 3);
                item.mesh.children[0].material.opacity = fade * 0.9;
                if (item.age > 25) {
                    this.scene.remove(item.mesh);
                    this.items.splice(i, 1);
                }
            }
        }

        return null;
    }

    _spawn() {
        const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * (this.arenaRadius - 4);
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        const group = new THREE.Group();

        const geo = new THREE.OctahedronGeometry(0.38, 0);
        const mat = new THREE.MeshPhongMaterial({
            color: type.color, emissive: type.emissive, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.9,
        });
        group.add(new THREE.Mesh(geo, mat));

        const rGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 16);
        const rMat = new THREE.MeshBasicMaterial({
            color: type.color, transparent: true, opacity: 0.25,
        });
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        group.position.set(x, 0.8, z);
        this.scene.add(group);

        this.items.push({ mesh: group, type, age: 0, x, z });
    }

    _applyBuff(char, type) {
        char.buffs[type.buff] = true;
        if (type.buff === 'staminaUp') {
            char.maxStamina = 130;
            char.stamina = Math.min(char.stamina + 30, char.maxStamina);
        }
    }

    reset() {
        for (const item of this.items) {
            this.scene.remove(item.mesh);
        }
        this.items = [];
        this.spawnTimer = 3;
    }
}
