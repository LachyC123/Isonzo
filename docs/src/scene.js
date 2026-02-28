import * as THREE from 'three';
import { lerp } from './utils.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.camDistance = 12;
        this.camHeight = 6;
        this.camAngle = 0;
        this.camTargetAngle = 0;
        this.camLookAt = new THREE.Vector3(0, 1, 0);
        this.camPos = new THREE.Vector3(0, 10, 15);
        this.shakeIntensity = 0;

        this.arenaRadius = 26;
        this.dangerRadius = 21;
    }

    init(canvas) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x08081a);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x08081a, 45, 90);

        this.camera = new THREE.PerspectiveCamera(
            55, window.innerWidth / window.innerHeight, 0.1, 200
        );
        this.camera.position.set(0, 10, 20);

        const ambient = new THREE.AmbientLight(0x404060, 0.7);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffeedd, 0.9);
        sun.position.set(10, 25, 10);
        this.scene.add(sun);

        const rim = new THREE.DirectionalLight(0x4466ff, 0.3);
        rim.position.set(-10, 5, -10);
        this.scene.add(rim);

        const center = new THREE.PointLight(0xffaa44, 0.6, 35);
        center.position.set(0, 6, 0);
        this.scene.add(center);

        this._createArena();
        this._createBackground();

        window.addEventListener('resize', () => this._onResize());
    }

    _createArena() {
        const r = this.arenaRadius;

        const platGeo = new THREE.CylinderGeometry(r, r + 0.5, 2, 48);
        const platMat = new THREE.MeshPhongMaterial({
            color: 0x252535, specular: 0x0a0a15, shininess: 8,
        });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.y = -1;
        this.scene.add(platform);

        const dangerGeo = new THREE.RingGeometry(this.dangerRadius, r, 48);
        const dangerMat = new THREE.MeshPhongMaterial({
            color: 0x551818, emissive: 0x331010,
            side: THREE.DoubleSide, transparent: true, opacity: 0.6,
        });
        const danger = new THREE.Mesh(dangerGeo, dangerMat);
        danger.rotation.x = -Math.PI / 2;
        danger.position.y = 0.01;
        this.scene.add(danger);

        const centerGeo = new THREE.RingGeometry(4.5, 5.2, 48);
        const centerMat = new THREE.MeshPhongMaterial({
            color: 0x334455, emissive: 0x0a1520,
            side: THREE.DoubleSide, transparent: true, opacity: 0.45,
        });
        const cRing = new THREE.Mesh(centerGeo, centerMat);
        cRing.rotation.x = -Math.PI / 2;
        cRing.position.y = 0.015;
        this.scene.add(cRing);

        const gridMat = new THREE.LineBasicMaterial({
            color: 0x3a3a4a, transparent: true, opacity: 0.2,
        });
        for (let i = -r; i <= r; i += 4) {
            const half = Math.sqrt(Math.max(0, r * r - i * i));
            const g1 = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, 0.015, -half),
                new THREE.Vector3(i, 0.015, half),
            ]);
            this.scene.add(new THREE.Line(g1, gridMat));
            const g2 = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-half, 0.015, i),
                new THREE.Vector3(half, 0.015, i),
            ]);
            this.scene.add(new THREE.Line(g2, gridMat));
        }

        const edgeGeo = new THREE.TorusGeometry(r, 0.18, 8, 64);
        const edgeMat = new THREE.MeshPhongMaterial({
            color: 0xff6600, emissive: 0xcc4400, emissiveIntensity: 0.5,
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 0;
        this.scene.add(edge);

        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = Math.cos(a) * (r + 1.2);
            const pz = Math.sin(a) * (r + 1.2);

            const pGeo = new THREE.BoxGeometry(0.5, 3.5, 0.5);
            const pMat = new THREE.MeshPhongMaterial({
                color: 0x444466, emissive: 0x151530,
            });
            const pillar = new THREE.Mesh(pGeo, pMat);
            pillar.position.set(px, 1.75, pz);
            this.scene.add(pillar);

            const lGeo = new THREE.SphereGeometry(0.18, 6, 4);
            const lMat = new THREE.MeshPhongMaterial({
                color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 1,
            });
            const lamp = new THREE.Mesh(lGeo, lMat);
            lamp.position.set(px, 3.7, pz);
            this.scene.add(lamp);
        }
    }

    _createBackground() {
        const skyGeo = new THREE.SphereGeometry(95, 16, 10);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x050510, side: THREE.BackSide,
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));

        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
            const dist = 52 + Math.random() * 22;
            const h = 4 + Math.random() * 18;
            const w = 1.5 + Math.random() * 4;
            const geo = new THREE.BoxGeometry(w, h, w);
            const mat = new THREE.MeshPhongMaterial({
                color: 0x121220, emissive: 0x030308,
            });
            const bld = new THREE.Mesh(geo, mat);
            bld.position.set(Math.cos(a) * dist, -4 + h / 2, Math.sin(a) * dist);
            this.scene.add(bld);

            if (Math.random() > 0.5) {
                const wGeo = new THREE.PlaneGeometry(0.3, 0.4);
                const wMat = new THREE.MeshBasicMaterial({
                    color: 0xffcc66, transparent: true, opacity: 0.3 + Math.random() * 0.4,
                });
                const win = new THREE.Mesh(wGeo, wMat);
                win.position.set(
                    Math.cos(a) * (dist - w / 2 - 0.01),
                    -4 + Math.random() * h,
                    Math.sin(a) * (dist - w / 2 - 0.01)
                );
                win.lookAt(0, win.position.y, 0);
                this.scene.add(win);
            }
        }
    }

    shake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    updateCamera(playerPos, lockOnPos, dt) {
        if (!playerPos) return;

        const targetLook = new THREE.Vector3(playerPos.x, playerPos.y + 1.2, playerPos.z);

        if (lockOnPos) {
            const mx = (playerPos.x + lockOnPos.x) / 2;
            const mz = (playerPos.z + lockOnPos.z) / 2;
            targetLook.x = lerp(targetLook.x, mx, 0.4);
            targetLook.z = lerp(targetLook.z, mz, 0.4);
            this.camTargetAngle = Math.atan2(
                playerPos.x - lockOnPos.x,
                playerPos.z - lockOnPos.z
            ) + Math.PI;
        }

        this.camAngle = this._lerpAngle(this.camAngle, this.camTargetAngle, 3 * dt);
        this.camLookAt.lerp(targetLook, 5 * dt);

        const targetCam = new THREE.Vector3(
            this.camLookAt.x + Math.sin(this.camAngle) * this.camDistance,
            this.camLookAt.y + this.camHeight,
            this.camLookAt.z + Math.cos(this.camAngle) * this.camDistance,
        );

        this.camPos.lerp(targetCam, 4 * dt);

        this.camera.position.copy(this.camPos);

        if (this.shakeIntensity > 0.01) {
            this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.85;
        }

        this.camera.lookAt(this.camLookAt);
    }

    setCameraAngle(angle) {
        this.camTargetAngle = angle;
    }

    _lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * Math.min(t, 1);
    }

    worldToScreen(worldPos) {
        const v = worldPos.clone().project(this.camera);
        return {
            x: (v.x * 0.5 + 0.5) * window.innerWidth,
            y: (-v.y * 0.5 + 0.5) * window.innerHeight,
            visible: v.z > 0 && v.z < 1,
        };
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
