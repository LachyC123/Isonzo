import * as THREE from 'three';
import { CharState } from './character.js';

const BUFF_TYPES = [
    { name: 'DMG+', buff: 'damageUp', color: 0xff4444, emissive: 0x661111, isMove: false },
    { name: 'STA+', buff: 'staminaUp', color: 0x44aaff, emissive: 0x112266, isMove: false },
    { name: 'HEAL', buff: 'regenUp', color: 0x44ff44, emissive: 0x116611, isMove: false },
    { name: 'THROW+', buff: 'throwUp', color: 0xffaa44, emissive: 0x664411, isMove: false },
];

const MOVE_TYPES = [
    { name: 'UPPERCUT', move: CharState.SPECIAL_UPPERCUT, color: 0xff6622, emissive: 0x662200, isMove: true,
      shape: 'arrow' },
    { name: 'DROPKICK', move: CharState.SPECIAL_DROPKICK, color: 0x22bbff, emissive: 0x004466, isMove: true,
      shape: 'star' },
    { name: 'CYCLONE', move: CharState.SPECIAL_SPIN, color: 0xaa44ff, emissive: 0x441166, isMove: true,
      shape: 'diamond' },
    { name: 'LARIAT', move: CharState.SPECIAL_LARIAT, color: 0xff3355, emissive: 0x551122, isMove: true,
      shape: 'ring' },
    { name: 'SUPLEX', move: CharState.SPECIAL_SUPLEX, color: 0x44ddff, emissive: 0x114455, isMove: true,
      shape: 'cross' },
];

const ALL_TYPES = [...BUFF_TYPES, ...MOVE_TYPES];

export class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.spawnTimer = 3;
        this.spawnInterval = 6;
        this.maxItems = 5;
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

            const bob = Math.sin(item.age * 3) * 0.22;
            item.mesh.position.y = item.baseY + bob;
            item.mesh.rotation.y += dt * 2.5;

            if (item.type.isMove) {
                item.mesh.children[0].rotation.x += dt * 1.5;
            }

            if (item.ring) {
                item.ring.rotation.z += dt * 1.5;
                const pulse = 0.2 + Math.sin(item.age * 4) * 0.08;
                item.ring.material.opacity = pulse;
            }

            for (const char of characters) {
                if (!char.alive) continue;
                const dx = char.position.x - item.x;
                const dz = char.position.z - item.z;
                if (dx * dx + dz * dz < 2.5) {
                    this._apply(char, item.type);
                    this.scene.remove(item.mesh);
                    this.items.splice(i, 1);
                    return { picked: true, type: item.type, character: char };
                }
            }

            if (item.age > 20) {
                const fade = Math.max(0, (24 - item.age) / 4);
                item.mesh.children[0].material.opacity = fade * 0.9;
                if (item.age > 24) {
                    this.scene.remove(item.mesh);
                    this.items.splice(i, 1);
                }
            }
        }

        return null;
    }

    _spawn() {
        const moveChance = 0.4;
        const pool = Math.random() < moveChance ? MOVE_TYPES : BUFF_TYPES;
        const type = pool[Math.floor(Math.random() * pool.length)];

        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * (this.arenaRadius - 4);
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        const group = new THREE.Group();

        let mainGeo;
        if (type.isMove) {
            mainGeo = new THREE.IcosahedronGeometry(0.35, 0);
        } else {
            mainGeo = new THREE.OctahedronGeometry(0.35, 0);
        }

        const mat = new THREE.MeshPhongMaterial({
            color: type.color, emissive: type.emissive, emissiveIntensity: 0.6,
            transparent: true, opacity: 0.9,
        });
        const main = new THREE.Mesh(mainGeo, mat);
        group.add(main);

        const rGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 18);
        const rMat = new THREE.MeshBasicMaterial({
            color: type.color, transparent: true, opacity: 0.25,
        });
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        if (type.isMove) {
            const outerGeo = new THREE.TorusGeometry(0.7, 0.03, 6, 18);
            const outerMat = new THREE.MeshBasicMaterial({
                color: type.color, transparent: true, opacity: 0.15,
            });
            const outer = new THREE.Mesh(outerGeo, outerMat);
            outer.rotation.x = Math.PI / 3;
            group.add(outer);

            const pillarGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4);
            const pillarMat = new THREE.MeshBasicMaterial({
                color: type.color, transparent: true, opacity: 0.15,
            });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.y = -0.2;
            group.add(pillar);
        }

        const baseY = type.isMove ? 1.0 : 0.8;
        group.position.set(x, baseY, z);
        this.scene.add(group);

        this.items.push({ mesh: group, type, age: 0, x, z, baseY, ring });
    }

    _apply(char, type) {
        if (type.isMove) {
            char.specialMove = type.move;
        } else {
            char.buffs[type.buff] = true;
            if (type.buff === 'staminaUp') {
                char.maxStamina = 130;
                char.stamina = Math.min(char.stamina + 30, char.maxStamina);
            }
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
