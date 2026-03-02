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
        this.edgeRing = null;
        this.spotlights = [];
        this.energyBands = [];
        this.floorPanels = [];
        this.holoBanners = [];
        this.crowdLights = [];
        this.centerGlyph = null;
        this.time = 0;
    }

    init(canvas) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x040412);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x06061a, 0.012);

        this.camera = new THREE.PerspectiveCamera(
            50, window.innerWidth / window.innerHeight, 0.1, 250
        );
        this.camera.position.set(0, 10, 20);

        const ambient = new THREE.AmbientLight(0x324060, 0.56);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0x7390d8, 0x1d0f1f, 0.5);
        this.scene.add(hemi);

        const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
        sun.position.set(12, 30, 8);
        this.scene.add(sun);

        const rim = new THREE.DirectionalLight(0x4c7aff, 0.55);
        rim.position.set(-15, 8, -12);
        this.scene.add(rim);

        const warm = new THREE.DirectionalLight(0xff9852, 0.32);
        warm.position.set(5, 3, 15);
        this.scene.add(warm);

        const center = new THREE.PointLight(0xffbb55, 1.1, 44);
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
            color: 0x2a2a46, specular: 0x1d1d34, shininess: 28,
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = -0.05;
        this.scene.add(top);

        const dangerGeo = new THREE.RingGeometry(this.dangerRadius, r, 64);
        const dangerMat = new THREE.MeshPhongMaterial({
            color: 0x661818, emissive: 0x441010,
            side: THREE.DoubleSide, transparent: true, opacity: 0.5,
        });
        this.dangerZone = new THREE.Mesh(dangerGeo, dangerMat);
        this.dangerZone.rotation.x = -Math.PI / 2;
        this.dangerZone.position.y = 0.01;
        this.scene.add(this.dangerZone);

        for (let ring = 5; ring <= 20; ring += 5) {
            const rGeo = new THREE.RingGeometry(ring - 0.05, ring + 0.05, 64);
            const rMat = new THREE.MeshBasicMaterial({
                color: 0x5872b2, transparent: true, opacity: 0.2,
                side: THREE.DoubleSide,
            });
            const ringMesh = new THREE.Mesh(rGeo, rMat);
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.y = 0.012;
            this.scene.add(ringMesh);
        }

        for (let i = 0; i < 36; i++) {
            const a = (i / 36) * Math.PI * 2;
            const panelGeo = new THREE.PlaneGeometry(1.8, 0.35);
            const panelMat = new THREE.MeshBasicMaterial({
                color: 0x6ea4ff, transparent: true, opacity: 0.14,
                side: THREE.DoubleSide,
            });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            const pr = 11 + (i % 2) * 4.5;
            panel.position.set(Math.cos(a) * pr, 0.03, Math.sin(a) * pr);
            panel.rotation.x = -Math.PI / 2;
            panel.rotation.z = a;
            this.scene.add(panel);
            this.floorPanels.push(panel);
        }

        const inlayMat = new THREE.MeshBasicMaterial({
            color: 0x5b78ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
        });
        for (let i = 0; i < 3; i++) {
            const radius = 7 + i * 4.6;
            const inlay = new THREE.Mesh(
                new THREE.RingGeometry(radius - 0.12, radius + 0.12, 96),
                inlayMat.clone()
            );
            inlay.rotation.x = -Math.PI / 2;
            inlay.position.y = 0.02 + i * 0.003;
            inlay.material.opacity = 0.08 + i * 0.03;
            this.scene.add(inlay);
            this.energyBands.push(inlay);
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

        const edgeGeo = new THREE.TorusGeometry(r, 0.28, 12, 80);
        const edgeMat = new THREE.MeshPhongMaterial({
            color: 0xff6600, emissive: 0xdd4400, emissiveIntensity: 0.6,
        });
        this.edgeRing = new THREE.Mesh(edgeGeo, edgeMat);
        this.edgeRing.rotation.x = Math.PI / 2;
        this.edgeRing.position.y = 0;
        this.scene.add(this.edgeRing);

        const trimGeo = new THREE.TorusGeometry(this.dangerRadius, 0.08, 10, 80);
        const trimMat = new THREE.MeshPhongMaterial({
            color: 0x44aaff, emissive: 0x2d5cbc, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.35,
        });
        const trimRing = new THREE.Mesh(trimGeo, trimMat);
        trimRing.rotation.x = Math.PI / 2;
        trimRing.position.y = 0.05;
        this.scene.add(trimRing);
        this.energyBands.push(trimRing);

        const innerEdgeGeo = new THREE.TorusGeometry(r - 0.5, 0.06, 8, 80);
        const innerEdgeMat = new THREE.MeshPhongMaterial({
            color: 0xff8833, emissive: 0xaa4400, emissiveIntensity: 0.3,
            transparent: true, opacity: 0.5,
        });
        const innerEdge = new THREE.Mesh(innerEdgeGeo, innerEdgeMat);
        innerEdge.rotation.x = Math.PI / 2;
        innerEdge.position.y = 0.01;
        this.scene.add(innerEdge);

        const logoGeo = new THREE.RingGeometry(2.0, 2.5, 5);
        const logoMat = new THREE.MeshBasicMaterial({
            color: 0xffbb44, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
        });
        const logo = new THREE.Mesh(logoGeo, logoMat);
        logo.rotation.x = -Math.PI / 2;
        logo.position.y = 0.016;
        this.scene.add(logo);

        const logoInner = new THREE.Mesh(
            new THREE.CircleGeometry(1.8, 32),
            new THREE.MeshBasicMaterial({
                color: 0xffaa33, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
            })
        );
        logoInner.rotation.x = -Math.PI / 2;
        logoInner.position.y = 0.014;
        this.scene.add(logoInner);

        this.centerGlyph = new THREE.Mesh(
            new THREE.TorusGeometry(3.15, 0.08, 8, 24),
            new THREE.MeshPhongMaterial({
                color: 0x7aa3ff, emissive: 0x2d5cff, emissiveIntensity: 0.45,
                transparent: true, opacity: 0.55,
            })
        );
        this.centerGlyph.rotation.set(Math.PI / 2, 0, 0);
        this.centerGlyph.position.y = 0.27;
        this.scene.add(this.centerGlyph);

        for (let i = 0; i < 4; i++) {
            const sl = new THREE.SpotLight(0xffeedd, 0.3, 50, Math.PI / 8, 0.5);
            const a = (i / 4) * Math.PI * 2;
            sl.position.set(Math.cos(a) * 20, 18, Math.sin(a) * 20);
            sl.target.position.set(0, 0, 0);
            this.scene.add(sl);
            this.scene.add(sl.target);
            this.spotlights.push(sl);
        }

        for (let i = 0; i < 60; i++) {
            const a = (i / 60) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
            const dist = r + 3 + Math.random() * 2;
            const h = 0.6 + Math.random() * 0.5;
            const crowdGeo = new THREE.CapsuleGeometry(0.15, h * 0.3, 3, 4);
            const shade = 0x10 + Math.floor(Math.random() * 0x0a);
            const crowdMat = new THREE.MeshPhongMaterial({
                color: (shade << 16) | (shade << 8) | (shade + 0x08),
            });
            const person = new THREE.Mesh(crowdGeo, crowdMat);
            person.position.set(Math.cos(a) * dist, h * 0.5 - 0.3, Math.sin(a) * dist);
            this.scene.add(person);

            if (i % 3 === 0) {
                const glow = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05, 5, 4),
                    new THREE.MeshBasicMaterial({
                        color: Math.random() > 0.5 ? 0x7bc4ff : 0xff8f56,
                        transparent: true,
                        opacity: 0.8,
                    })
                );
                glow.position.set(Math.cos(a) * dist, h + 0.2, Math.sin(a) * dist);
                this.scene.add(glow);
                this.crowdLights.push(glow);
            }
        }

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

            const bannerGeo = new THREE.PlaneGeometry(1.8, 0.7);
            const bannerMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x5cb2ff : 0xff9b4f,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
            });
            const banner = new THREE.Mesh(bannerGeo, bannerMat);
            banner.position.set(px * 1.03, 3.2, pz * 1.03);
            banner.lookAt(0, 3.2, 0);
            this.scene.add(banner);
            this.holoBanners.push(banner);
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
        this.time += dt;
        if (this.edgeRing) {
            this.edgeRing.material.emissiveIntensity = 0.4 + Math.sin(this.time * 2) * 0.25;
        }
        if (this.dangerZone) {
            this.dangerZone.material.opacity = 0.4 + Math.sin(this.time * 1.5) * 0.12;
            this.dangerZone.material.emissiveIntensity = 0.3 + Math.sin(this.time * 3) * 0.15;
        }
        for (let i = 0; i < this.energyBands.length; i++) {
            const band = this.energyBands[i];
            band.material.opacity = 0.08 + Math.sin(this.time * (1.2 + i * 0.35) + i) * 0.04 + i * 0.025;
        }
        for (let i = 0; i < this.floorPanels.length; i++) {
            const panel = this.floorPanels[i];
            panel.material.opacity = 0.1 + Math.sin(this.time * 3 + i * 0.4) * 0.07;
        }
        for (let i = 0; i < this.holoBanners.length; i++) {
            const banner = this.holoBanners[i];
            banner.material.opacity = 0.18 + Math.sin(this.time * 2.3 + i) * 0.12;
        }
        for (let i = 0; i < this.crowdLights.length; i++) {
            const light = this.crowdLights[i];
            light.material.opacity = 0.4 + Math.sin(this.time * 5 + i * 1.7) * 0.35;
        }
        if (this.centerGlyph) {
            this.centerGlyph.rotation.z = this.time * 0.45;
            this.centerGlyph.material.emissiveIntensity = 0.35 + Math.sin(this.time * 2.5) * 0.2;
        }
        for (let i = 0; i < this.spotlights.length; i++) {
            const sl = this.spotlights[i];
            const a = (i / 4) * Math.PI * 2 + this.time * 0.3;
            sl.target.position.set(Math.cos(a) * 8, 0, Math.sin(a) * 8);
        }
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
