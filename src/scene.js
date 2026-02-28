import * as THREE from 'three';
import { lerp } from './utils.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.camDistance = 11;
        this.camHeight = 5.5;
        this.camAngle = 0;
        this.camTargetAngle = 0;
        this.camLookAt = new THREE.Vector3(0, 1, 0);
        this.camPos = new THREE.Vector3(0, 10, 15);
        this.shakeIntensity = 0;
        this.shakeDecay = 0.82;

        this.arenaRadius = 26;
        this.dangerRadius = 21;

        this.particles = [];
        this.particlePool = [];
        this.trails = [];
    }

    init(canvas) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x06061a);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x06061a, 0.012);

        this.camera = new THREE.PerspectiveCamera(
            50, window.innerWidth / window.innerHeight, 0.1, 250
        );
        this.camera.position.set(0, 10, 20);

        const ambient = new THREE.AmbientLight(0x303050, 0.5);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0x6688cc, 0x221122, 0.4);
        this.scene.add(hemi);

        const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
        sun.position.set(12, 30, 8);
        this.scene.add(sun);

        const rim = new THREE.DirectionalLight(0x4466ff, 0.4);
        rim.position.set(-15, 8, -12);
        this.scene.add(rim);

        const warm = new THREE.DirectionalLight(0xff8844, 0.2);
        warm.position.set(5, 3, 15);
        this.scene.add(warm);

        const center = new THREE.PointLight(0xffbb55, 0.8, 40);
        center.position.set(0, 5, 0);
        this.scene.add(center);

        this._createArena();
        this._createBackground();

        window.addEventListener('resize', () => this._onResize());
    }

    _createArena() {
        const r = this.arenaRadius;

        const platGeo = new THREE.CylinderGeometry(r, r + 1, 3, 64);
        const platMat = new THREE.MeshPhongMaterial({
            color: 0x1e1e30, specular: 0x0a0a18, shininess: 12,
        });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.y = -1.5;
        this.scene.add(platform);

        const topGeo = new THREE.CylinderGeometry(r, r, 0.15, 64);
        const topMat = new THREE.MeshPhongMaterial({
            color: 0x282840, specular: 0x111125, shininess: 20,
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = -0.05;
        this.scene.add(top);

        const dangerGeo = new THREE.RingGeometry(this.dangerRadius, r, 64);
        const dangerMat = new THREE.MeshPhongMaterial({
            color: 0x661818, emissive: 0x441010,
            side: THREE.DoubleSide, transparent: true, opacity: 0.5,
        });
        const danger = new THREE.Mesh(dangerGeo, dangerMat);
        danger.rotation.x = -Math.PI / 2;
        danger.position.y = 0.01;
        this.scene.add(danger);

        for (let ring = 5; ring <= 20; ring += 5) {
            const rGeo = new THREE.RingGeometry(ring - 0.05, ring + 0.05, 64);
            const rMat = new THREE.MeshBasicMaterial({
                color: 0x3a3a50, transparent: true, opacity: 0.15,
                side: THREE.DoubleSide,
            });
            const ringMesh = new THREE.Mesh(rGeo, rMat);
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.y = 0.012;
            this.scene.add(ringMesh);
        }

        const centerGeo = new THREE.RingGeometry(4.8, 5.5, 64);
        const centerMat = new THREE.MeshPhongMaterial({
            color: 0xffaa33, emissive: 0x553300,
            side: THREE.DoubleSide, transparent: true, opacity: 0.25,
        });
        const cRing = new THREE.Mesh(centerGeo, centerMat);
        cRing.rotation.x = -Math.PI / 2;
        cRing.position.y = 0.015;
        this.scene.add(cRing);

        const crossMat = new THREE.LineBasicMaterial({
            color: 0x4a4a60, transparent: true, opacity: 0.18,
        });
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const pts = [
                new THREE.Vector3(0, 0.013, 0),
                new THREE.Vector3(Math.cos(a) * r, 0.013, Math.sin(a) * r),
            ];
            this.scene.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts), crossMat
            ));
        }

        const edgeGeo = new THREE.TorusGeometry(r, 0.22, 12, 80);
        const edgeMat = new THREE.MeshPhongMaterial({
            color: 0xff6600, emissive: 0xdd4400, emissiveIntensity: 0.6,
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 0;
        this.scene.add(edge);

        const innerEdgeGeo = new THREE.TorusGeometry(r - 0.5, 0.06, 8, 80);
        const innerEdgeMat = new THREE.MeshPhongMaterial({
            color: 0xff8833, emissive: 0xaa4400, emissiveIntensity: 0.3,
            transparent: true, opacity: 0.5,
        });
        const innerEdge = new THREE.Mesh(innerEdgeGeo, innerEdgeMat);
        innerEdge.rotation.x = Math.PI / 2;
        innerEdge.position.y = 0.01;
        this.scene.add(innerEdge);

        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const px = Math.cos(a) * (r + 1.5);
            const pz = Math.sin(a) * (r + 1.5);

            const pGeo = new THREE.CylinderGeometry(0.15, 0.2, 4, 6);
            const pMat = new THREE.MeshPhongMaterial({
                color: 0x444466, emissive: 0x151530,
            });
            const pillar = new THREE.Mesh(pGeo, pMat);
            pillar.position.set(px, 2, pz);
            this.scene.add(pillar);

            const capGeo = new THREE.SphereGeometry(0.22, 8, 6);
            const capMat = new THREE.MeshPhongMaterial({
                color: 0x333355, specular: 0x222244, shininess: 40,
            });
            const cap = new THREE.Mesh(capGeo, capMat);
            cap.position.set(px, 4.1, pz);
            this.scene.add(cap);

            const lGeo = new THREE.SphereGeometry(0.12, 6, 4);
            const lMat = new THREE.MeshPhongMaterial({
                color: 0xffcc66, emissive: 0xffaa22, emissiveIntensity: 1,
            });
            const lamp = new THREE.Mesh(lGeo, lMat);
            lamp.position.set(px, 4.35, pz);
            this.scene.add(lamp);

            const pl = new THREE.PointLight(0xffaa44, 0.15, 8);
            pl.position.set(px, 4.2, pz);
            this.scene.add(pl);
        }

        for (let i = 0; i < 6; i++) {
            const a = ((i + 0.5) / 6) * Math.PI * 2;
            const dist = 8 + Math.random() * 8;
            const geo = new THREE.BoxGeometry(
                0.8 + Math.random() * 1.2,
                0.4 + Math.random() * 0.6,
                0.8 + Math.random() * 1.2
            );
            const mat = new THREE.MeshPhongMaterial({
                color: 0x2a2a3e, specular: 0x111120, shininess: 5,
            });
            const box = new THREE.Mesh(geo, mat);
            box.position.set(Math.cos(a) * dist, 0.2, Math.sin(a) * dist);
            box.rotation.y = Math.random() * Math.PI;
            this.scene.add(box);
        }
    }

    _createBackground() {
        const skyGeo = new THREE.SphereGeometry(110, 20, 14);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x040410, side: THREE.BackSide,
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));

        for (let i = 0; i < 35; i++) {
            const a = (i / 35) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
            const dist = 50 + Math.random() * 30;
            const h = 5 + Math.random() * 25;
            const w = 2 + Math.random() * 5;
            const d = 2 + Math.random() * 5;
            const geo = new THREE.BoxGeometry(w, h, d);
            const brightness = 0x08 + Math.floor(Math.random() * 0x0a);
            const mat = new THREE.MeshPhongMaterial({
                color: (brightness << 16) | (brightness << 8) | (brightness + 0x10),
                emissive: 0x020206,
            });
            const bld = new THREE.Mesh(geo, mat);
            bld.position.set(Math.cos(a) * dist, -6 + h / 2, Math.sin(a) * dist);
            this.scene.add(bld);

            const numWindows = Math.floor(Math.random() * 5) + 1;
            for (let w2 = 0; w2 < numWindows; w2++) {
                const wGeo = new THREE.PlaneGeometry(0.35, 0.5);
                const warm = Math.random() > 0.3;
                const wColor = warm ? 0xffcc66 : 0x66aaff;
                const wMat = new THREE.MeshBasicMaterial({
                    color: wColor, transparent: true,
                    opacity: 0.15 + Math.random() * 0.35,
                });
                const win = new THREE.Mesh(wGeo, wMat);
                win.position.set(
                    Math.cos(a) * (dist - w / 2 - 0.01),
                    -6 + 1 + Math.random() * (h - 2),
                    Math.sin(a) * (dist - w / 2 - 0.01) + (Math.random() - 0.5) * d * 0.6
                );
                win.lookAt(0, win.position.y, 0);
                this.scene.add(win);
            }
        }
    }

    shake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    spawnHitParticles(pos, color, count = 8) {
        for (let i = 0; i < count; i++) {
            let p;
            if (this.particlePool.length > 0) {
                p = this.particlePool.pop();
            } else {
                const geo = new THREE.SphereGeometry(0.06, 4, 3);
                const mat = new THREE.MeshBasicMaterial({ transparent: true });
                p = { mesh: new THREE.Mesh(geo, mat), vel: new THREE.Vector3(), life: 0, maxLife: 0 };
                this.scene.add(p.mesh);
            }
            p.mesh.visible = true;
            p.mesh.material.color.setHex(color);
            p.mesh.material.opacity = 1;
            p.mesh.position.copy(pos);
            p.mesh.position.y += 1;
            const spread = 8;
            p.vel.set(
                (Math.random() - 0.5) * spread,
                Math.random() * spread * 0.7 + 2,
                (Math.random() - 0.5) * spread
            );
            p.life = 0;
            p.maxLife = 0.3 + Math.random() * 0.4;
            const s = 0.5 + Math.random() * 1.5;
            p.mesh.scale.set(s, s, s);
            this.particles.push(p);
        }
    }

    spawnDustCloud(pos) {
        for (let i = 0; i < 6; i++) {
            let p;
            if (this.particlePool.length > 0) {
                p = this.particlePool.pop();
            } else {
                const geo = new THREE.SphereGeometry(0.08, 4, 3);
                const mat = new THREE.MeshBasicMaterial({ transparent: true });
                p = { mesh: new THREE.Mesh(geo, mat), vel: new THREE.Vector3(), life: 0, maxLife: 0 };
                this.scene.add(p.mesh);
            }
            p.mesh.visible = true;
            p.mesh.material.color.setHex(0x887766);
            p.mesh.material.opacity = 0.6;
            p.mesh.position.set(pos.x, 0.1, pos.z);
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 3;
            p.vel.set(Math.cos(angle) * spd, 0.5 + Math.random() * 1.5, Math.sin(angle) * spd);
            p.life = 0;
            p.maxLife = 0.3 + Math.random() * 0.3;
            const s = 1.5 + Math.random() * 2.5;
            p.mesh.scale.set(s, s * 0.6, s);
            this.particles.push(p);
        }
    }

    spawnSpeedLines(pos, dir, color = 0xffffff) {
        for (let i = 0; i < 3; i++) {
            const geo = new THREE.PlaneGeometry(0.03, 0.4 + Math.random() * 0.3);
            const mat = new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                pos.x + (Math.random() - 0.5) * 0.8,
                pos.y + 0.5 + Math.random() * 1.2,
                pos.z + (Math.random() - 0.5) * 0.8,
            );
            mesh.lookAt(this.camera.position);
            this.scene.add(mesh);
            this.trails.push({ mesh, life: 0, maxLife: 0.15, type: 'line' });
        }
    }

    spawnGroundCrack(pos) {
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
            const len = 0.8 + Math.random() * 1.5;
            const geo = new THREE.PlaneGeometry(0.06, len);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffaa44, transparent: true, opacity: 0.7,
                side: THREE.DoubleSide,
            });
            const crack = new THREE.Mesh(geo, mat);
            crack.position.set(
                pos.x + Math.cos(angle) * len * 0.4,
                0.03,
                pos.z + Math.sin(angle) * len * 0.4,
            );
            crack.rotation.x = -Math.PI / 2;
            crack.rotation.z = angle;
            this.scene.add(crack);
            this.trails.push({ mesh: crack, life: 0, maxLife: 0.8, type: 'crack' });
        }
    }

    spawnShockwave(pos, color = 0xffffff) {
        const geo = new THREE.RingGeometry(0.2, 0.5, 24);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.6,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.set(pos.x, 0.05, pos.z);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.trails.push({ mesh: ring, life: 0, maxLife: 0.4, type: 'shockwave' });
    }

    spawnImpactRing(pos) {
        const geo = new THREE.RingGeometry(0.1, 0.3, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.8,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.set(pos.x, pos.y + 1, pos.z);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.trails.push({ mesh: ring, life: 0, maxLife: 0.3, type: 'ring' });
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                p.mesh.visible = false;
                this.particlePool.push(p);
                this.particles.splice(i, 1);
                continue;
            }
            p.vel.y -= 20 * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            p.mesh.material.opacity = 1 - (p.life / p.maxLife);
            const shrink = 1 - (p.life / p.maxLife) * 0.5;
            p.mesh.scale.multiplyScalar(0.97);
        }

        for (let i = this.trails.length - 1; i >= 0; i--) {
            const tr = this.trails[i];
            tr.life += dt;
            if (tr.life >= tr.maxLife) {
                this.scene.remove(tr.mesh);
                tr.mesh.geometry.dispose();
                tr.mesh.material.dispose();
                this.trails.splice(i, 1);
                continue;
            }
            const t = tr.life / tr.maxLife;
            if (tr.type === 'ring') {
                const scale = 1 + t * 5;
                tr.mesh.scale.set(scale, scale, scale);
                tr.mesh.material.opacity = 0.8 * (1 - t);
            } else if (tr.type === 'line') {
                tr.mesh.material.opacity = 0.5 * (1 - t);
                tr.mesh.scale.y = 1 + t * 2;
            } else if (tr.type === 'crack') {
                tr.mesh.material.opacity = 0.7 * (1 - t * t);
            } else if (tr.type === 'shockwave') {
                const scale = 1 + t * 8;
                tr.mesh.scale.set(scale, scale, scale);
                tr.mesh.material.opacity = 0.6 * (1 - t);
            }
        }
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

        this.camAngle = this._lerpAngle(this.camAngle, this.camTargetAngle, 3.5 * dt);
        this.camLookAt.lerp(targetLook, 6 * dt);

        const targetCam = new THREE.Vector3(
            this.camLookAt.x + Math.sin(this.camAngle) * this.camDistance,
            this.camLookAt.y + this.camHeight,
            this.camLookAt.z + Math.cos(this.camAngle) * this.camDistance,
        );

        this.camPos.lerp(targetCam, 4.5 * dt);
        this.camera.position.copy(this.camPos);

        if (this.shakeIntensity > 0.005) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
            const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.camera.position.x += sx;
            this.camera.position.y += sy;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeIntensity = 0;
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
