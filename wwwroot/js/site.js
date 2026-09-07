/**
 * INGEK - Minimalist, Modern, Human-Centered JavaScript Engine
 * Three.js 3D Cow Model (Spotted-cow-2021) & Ground Contact Pressure Pads
 */

// UTC Clock updater
function initClock() {
    const clockElement = document.getElementById('utc-clock');
    if (!clockElement) return;

    function updateClock() {
        const now = new Date();
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds} UTC`;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

// Hoof Telemetry Data Dictionary
const hoofData = {
    FL: { id: "FL", title: "FL - Sol Ön Ayak", status: "Dengeli", statusClass: "text-emerald-700 bg-emerald-50 border-emerald-200/60", weight: "132.5 kg", share: "%27.5", padColor: 0x10B981 },
    FR: { id: "FR", title: "FR - Sağ Ön Ayak", status: "Dengeli", statusClass: "text-emerald-700 bg-emerald-50 border-emerald-200/60", weight: "131.0 kg", share: "%27.1", padColor: 0x10B981 },
    BL: { id: "BL", title: "BL - Sol Arka Ayak", status: "Hafif Yük", statusClass: "text-amber-700 bg-amber-50 border-amber-200/60", weight: "108.2 kg", share: "%22.4", padColor: 0xF59E0B },
    BR: { id: "BR", title: "BR - Sağ Arka Ayak", status: "Dengeli", statusClass: "text-emerald-700 bg-emerald-50 border-emerald-200/60", weight: "110.7 kg", share: "%23.0", padColor: 0x10B981 }
};

// ================= THREE.JS 3D COW STUDIO ENGINE =================

function createCowWithWeighingPads() {
    const cowGroup = new THREE.Group();
    cowGroup.hoofNodes = {};
    cowGroup.pulsingGlows = [];

    // Container for authentic Spotted-cow-2021 model & physically anchored pads
    const cowModelContainer = new THREE.Group();
    cowGroup.add(cowModelContainer);
    cowGroup.cowModelContainer = cowModelContainer;

    // Load authentic Spotted-cow-2021 model (No procedural fallback placeholder)
    loadSpottedCowModel(cowGroup);

    return cowGroup;
}

// Loads Spotted-cow-2021 FBX with texture
function loadSpottedCowModel(cowGroup) {
    if (typeof THREE.FBXLoader === 'undefined') return;

    const basePath = (window.location.pathname.includes('YeniKlasor') || window.location.port) ? '' : './YeniKlasor/wwwroot';
    const fbxPath = basePath + '/models/cow.fbx';
    const texturePath = basePath + '/models/cow.png';

    const loader = new THREE.FBXLoader();
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
        texturePath,
        (cowTexture) => {
            cowTexture.encoding = THREE.sRGBEncoding;

            loader.load(
                fbxPath,
                (fbx) => {
                    fbx.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.material = new THREE.MeshStandardMaterial({
                                map: cowTexture,
                                roughness: 0.45,
                                metalness: 0.05
                            });
                        }
                    });

                    // Calculate accurate bounding box
                    const bbox = new THREE.Box3().setFromObject(fbx);
                    const size = new THREE.Vector3();
                    bbox.getSize(size);
                    const center = new THREE.Vector3();
                    bbox.getCenter(center);

                    // Scale to fit ~3.3 units
                    const targetLength = 3.3;
                    const maxDim = Math.max(size.x, size.z);
                    const scale = targetLength / maxDim;
                    fbx.scale.setScalar(scale);

                    // Re-calculate scaled bounds
                    const scaledBbox = new THREE.Box3().setFromObject(fbx);
                    fbx.position.y = -scaledBbox.min.y + 0.04;
                    fbx.position.x = -center.x * scale;
                    fbx.position.z = -center.z * scale;

                    const container = cowGroup.cowModelContainer;
                    container.clear();
                    container.add(fbx);

                    // Find exact hoof contact points in container space
                    container.updateMatrixWorld(true);
                    let bodyMesh = null;
                    fbx.traverse(c => {
                        if (c.isMesh && c.name === 'Spotted_cow-001') bodyMesh = c;
                    });

                    let groundMinY = 0;
                    const hoofPoints = [];

                    if (bodyMesh && bodyMesh.geometry && bodyMesh.geometry.attributes.position) {
                        const pos = bodyMesh.geometry.attributes.position;
                        const v = new THREE.Vector3();
                        let minPy = Infinity;

                        for (let i = 0; i < pos.count; i += 2) {
                            v.fromBufferAttribute(pos, i);
                            v.applyMatrix4(bodyMesh.matrixWorld);
                            container.worldToLocal(v);
                            if (v.y < minPy) minPy = v.y;
                        }
                        groundMinY = minPy;

                        for (let i = 0; i < pos.count; i++) {
                            v.fromBufferAttribute(pos, i);
                            v.applyMatrix4(bodyMesh.matrixWorld);
                            container.worldToLocal(v);
                            if (v.y <= minPy + 0.08) {
                                hoofPoints.push({ x: v.x, y: v.y, z: v.z });
                            }
                        }
                    }

                    // K-Means with 4 centroids to get exact hoof centers in model container
                    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                    hoofPoints.forEach(p => {
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.z < minZ) minZ = p.z;
                        if (p.z > maxZ) maxZ = p.z;
                    });

                    let centroids = [
                        { x: minX, z: minZ },
                        { x: minX, z: maxZ },
                        { x: maxX, z: minZ },
                        { x: maxX, z: maxZ }
                    ];

                    for (let iter = 0; iter < 12; iter++) {
                        const sums = centroids.map(() => ({ x: 0, z: 0, count: 0 }));
                        hoofPoints.forEach(p => {
                            let best = 0, bestDist = Infinity;
                            centroids.forEach((c, idx) => {
                                const d = (p.x - c.x) ** 2 + (p.z - c.z) ** 2;
                                if (d < bestDist) { bestDist = d; best = idx; }
                            });
                            sums[best].x += p.x;
                            sums[best].z += p.z;
                            sums[best].count++;
                        });
                        centroids = sums.map((s, idx) => s.count > 0 ? { x: +(s.x / s.count).toFixed(3), z: +(s.z / s.count).toFixed(3), count: s.count } : centroids[idx]);
                    }

                    // Sort: lowest 2 X are front hooves, highest 2 X are back hooves
                    centroids.sort((a, b) => a.x - b.x);

                    const frontHoofs = [centroids[0], centroids[1]].sort((a, b) => b.z - a.z);
                    const backHoofs = [centroids[2], centroids[3]].sort((a, b) => b.z - a.z);

                    const hoofCoords = {
                        FL: frontHoofs[0], // larger Z = left
                        FR: frontHoofs[1], // smaller Z = right
                        BL: backHoofs[0],  // larger Z = left
                        BR: backHoofs[1]   // smaller Z = right
                    };

                    const plateBezelMat = new THREE.MeshStandardMaterial({
                        color: 0xCBD5E1,
                        metalness: 0.6,
                        roughness: 0.3
                    });

                    const legsConfig = [
                        { id: 'FL', status: 'normal', color: 0x10B981 },
                        { id: 'FR', status: 'normal', color: 0x10B981 },
                        { id: 'BL', status: 'light',  color: 0xF59E0B },
                        { id: 'BR', status: 'normal', color: 0x10B981 }
                    ];

                    legsConfig.forEach(cfg => {
                        const pt = hoofCoords[cfg.id];
                        if (!pt) return;

                        // 3D Weighing Pad
                        const padGroup = new THREE.Group();
                        padGroup.position.set(pt.x, groundMinY, pt.z);

                        const bezelGeo = new THREE.CylinderGeometry(0.13, 0.145, 0.018, 32);
                        const bezel = new THREE.Mesh(bezelGeo, plateBezelMat);
                        bezel.position.y = 0.009;
                        bezel.receiveShadow = true;
                        padGroup.add(bezel);

                        const sensorGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.02, 32);
                        const sensorMat = new THREE.MeshStandardMaterial({
                            color: cfg.color,
                            roughness: 0.3,
                            metalness: 0.2,
                            emissive: cfg.color,
                            emissiveIntensity: cfg.status === 'light' ? 0.35 : 0.2
                        });
                        const sensorPlate = new THREE.Mesh(sensorGeo, sensorMat);
                        sensorPlate.position.y = 0.01;
                        sensorPlate.userData = { legId: cfg.id };
                        padGroup.add(sensorPlate);

                        const glowGeo = new THREE.RingGeometry(0.11, 0.15, 32);
                        glowGeo.rotateX(-Math.PI / 2);
                        const glowMat = new THREE.MeshBasicMaterial({
                            color: cfg.color,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.45
                        });
                        const glowRing = new THREE.Mesh(glowGeo, glowMat);
                        glowRing.position.y = 0.011;
                        padGroup.add(glowRing);

                        const hitGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.25, 16);
                        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
                        const hitBox = new THREE.Mesh(hitGeo, hitMat);
                        hitBox.position.y = 0.12;
                        hitBox.userData = { legId: cfg.id };
                        padGroup.add(hitBox);

                        // Anchoring target node for 3D-to-2D screen hotspot projection
                        const hoofMesh = new THREE.Object3D();
                        hoofMesh.position.set(pt.x, groundMinY + 0.04, pt.z);
                        hoofMesh.userData = { legId: cfg.id };

                        // Add BOTH pad and hoof pin node directly inside container so they rotate with cow
                        container.add(padGroup);
                        container.add(hoofMesh);

                        cowGroup.hoofNodes[cfg.id] = {
                            hoofMesh: hoofMesh,
                            sensorPlate: sensorPlate,
                            glowRing: glowRing,
                            padGroup: padGroup,
                            config: cfg
                        };

                        cowGroup.pulsingGlows.push({
                            mesh: glowRing,
                            material: glowMat,
                            baseColor: cfg.color,
                            isLightLeg: cfg.status === 'light'
                        });
                    });

                    const loaderEl = document.getElementById('model-loading-indicator');
                    if (loaderEl) {
                        loaderEl.style.opacity = '0';
                        setTimeout(() => { if (loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl); }, 500);
                    }
                    console.info('Spotted-cow-2021 model loaded and pads rigidly anchored to hooves.');
                },
                undefined,
                (error) => {
                    console.info('Spotted-cow FBX loader info:', error);
                }
            );
        },
        undefined,
        (err) => {
            console.info('Spotted-cow texture loader info:', err);
        }
    );
}

// Create Three.js Studio Scene with Tight Isometric Framing & Viewport Fill (75-80%)
function createStudioStage(containerId, isModal = false) {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === 'undefined') return null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);

    const aspect = container.clientWidth / container.clientHeight;
    const defaultFov = isModal ? 28 : 32;
    const camera = new THREE.PerspectiveCamera(defaultFov, aspect, 0.1, 100);

    const defaultTarget = new THREE.Vector3(0, 1.05, 0); // Cow Center of Mass
    camera.position.set(2.4, 2.1, 3.2);
    camera.lookAt(defaultTarget);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Natural Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xF1F5F9, 0.45);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    // Studio Floor & Soft Ground Shadow
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Root Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    let cow = createCowWithWeighingPads();
    modelGroup.add(cow);

    // Orbit Controls with Inertia & Zoom
    let isDragging = false;
    let prevX = 0, prevY = 0;
    const initialRotY = 2.45;
    const initialRotX = 0.08;
    let targetRotY = initialRotY;
    let currentRotY = initialRotY;
    let targetRotX = initialRotX;
    let currentRotX = initialRotX;

    // Smooth Zoom controls
    let currentFov = defaultFov;
    let targetFov = defaultFov;
    const minFov = 16;
    const maxFov = 48;

    function onPointerDown(e) {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - prevX;
        const deltaY = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        targetRotY += deltaX * 0.007;
        targetRotX = Math.max(-0.15, Math.min(0.55, targetRotX + deltaY * 0.007));
    }

    function onPointerUp() { isDragging = false; }

    function onWheel(e) {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.03;
        targetFov = Math.max(minFov, Math.min(maxFov, targetFov + zoomDelta));
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Touch pinch zoom
    let touchDist = 0;
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        }
    }, { passive: true });

    renderer.domElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            const delta = (touchDist - dist) * 0.05;
            targetFov = Math.max(minFov, Math.min(maxFov, targetFov + delta));
            touchDist = dist;
        }
    }, { passive: true });

    function resetOrbit() {
        targetRotY = initialRotY;
        targetRotX = initialRotX;
        targetFov = defaultFov;
    }

    // Raycaster for interactive 3D Hoof / Pad Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredLegId = null;

    renderer.domElement.addEventListener('mousemove', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    renderer.domElement.addEventListener('mouseleave', () => {
        mouse.set(-999, -999);
        hoveredLegId = null;
        hideTooltip();
    });

    // 3D-to-2D Screen Anchor Projector for Hotspot Pins
    const stageWrapper = container.closest('#three-stage-wrapper') || container;
    const tooltip = document.getElementById('hoof-tooltip');

    function showTooltipForLeg(key, screenX, screenY) {
        if (!tooltip || !hoofData[key]) return;
        const data = hoofData[key];
        const titleEl = document.getElementById('tooltip-title');
        const statusEl = document.getElementById('tooltip-status');
        const weightEl = document.getElementById('tooltip-weight');
        const shareEl = document.getElementById('tooltip-share');

        if (titleEl) titleEl.textContent = data.title;
        if (statusEl) {
            statusEl.textContent = data.status;
            statusEl.className = `text-[10px] font-semibold px-2 py-0.5 rounded border ${data.statusClass}`;
        }
        if (weightEl) weightEl.textContent = data.weight;
        if (shareEl) shareEl.textContent = data.share;

        tooltip.style.left = `${screenX}px`;
        tooltip.style.top = `${screenY}px`;
        tooltip.style.opacity = '1';
    }

    function hideTooltip() {
        if (tooltip) tooltip.style.opacity = '0';
    }

    function update3DAnchoredPins() {
        if (isModal || !cow.hoofNodes) return;
        const rect = stageWrapper.getBoundingClientRect();

        Object.keys(cow.hoofNodes).forEach(key => {
            const node = cow.hoofNodes[key];
            const pinAnchor = stageWrapper.querySelector(`#hotspot-${key}`);
            if (!pinAnchor || !node.hoofMesh) return;

            const worldPos = new THREE.Vector3();
            node.hoofMesh.getWorldPosition(worldPos);
            worldPos.y += 0.06;

            const projected = worldPos.clone().project(camera);

            if (projected.z > 1) {
                pinAnchor.style.opacity = '0';
                pinAnchor.style.pointerEvents = 'none';
                return;
            }

            const screenX = (projected.x * 0.5 + 0.5) * rect.width;
            const screenY = (-projected.y * 0.5 + 0.5) * rect.height;

            pinAnchor.style.left = `${screenX}px`;
            pinAnchor.style.top = `${screenY}px`;
            pinAnchor.style.opacity = '1';
            pinAnchor.style.pointerEvents = 'auto';

            pinAnchor.onmouseenter = () => {
                showTooltipForLeg(key, screenX, screenY);
            };
            pinAnchor.onmouseleave = () => {
                if (hoveredLegId !== key) hideTooltip();
            };
        });
    }

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    function animate() {
        animId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Inertial rotation dampening
        currentRotY += (targetRotY - currentRotY) * 0.08;
        currentRotX += (targetRotX - currentRotX) * 0.08;
        modelGroup.rotation.y = currentRotY;

        // Smooth zoom dampening
        currentFov += (targetFov - currentFov) * 0.1;
        if (Math.abs(camera.fov - currentFov) > 0.01) {
            camera.fov = currentFov;
            camera.updateProjectionMatrix();
        }

        camera.position.y = 2.1 + currentRotX * 2.8;
        camera.lookAt(defaultTarget);

        // Ground pressure pad pulsing glow animation
        cow.pulsingGlows.forEach(glow => {
            const pulseRate = glow.isLightLeg ? 4.5 : 2.5;
            const wave = Math.sin(elapsedTime * pulseRate);
            glow.material.opacity = 0.35 + wave * 0.25;
            const s = 1.0 + wave * 0.06;
            glow.mesh.scale.set(s, s, s);
        });

        // Raycasting for direct 3D hoof & weighing pad hover
        if (mouse.x > -2 && mouse.y > -2) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(modelGroup.children, true);
            let foundLeg = null;
            for (let i = 0; i < intersects.length; i++) {
                const id = intersects[i].object.userData?.legId;
                if (id) {
                    foundLeg = id;
                    break;
                }
            }

            if (foundLeg && foundLeg !== hoveredLegId) {
                hoveredLegId = foundLeg;
                const node = cow.hoofNodes[foundLeg];
                if (node) {
                    const worldPos = new THREE.Vector3();
                    node.hoofMesh.getWorldPosition(worldPos);
                    const projected = worldPos.clone().project(camera);
                    const rect = stageWrapper.getBoundingClientRect();
                    const screenX = (projected.x * 0.5 + 0.5) * rect.width;
                    const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
                    showTooltipForLeg(foundLeg, screenX, screenY);
                }
            } else if (!foundLeg && hoveredLegId) {
                hoveredLegId = null;
                hideTooltip();
            }
        }

        update3DAnchoredPins();

        renderer.render(scene, camera);
    }
    animate();

    function resize() {
        if (!container || !container.clientWidth || !container.clientHeight) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    return { renderer, scene, camera, resetOrbit, resize, cow, destroy: () => cancelAnimationFrame(animId) };
}

// Live Telemetry Stream Simulation Engine
class TelemetrySimulator {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.flWeight = 132.5;
        this.frWeight = 131.0;
        this.blWeight = 108.2;
        this.brWeight = 110.7;
    }

    start() {
        this.isRunning = true;
        const btn = document.getElementById('btn-simulate');
        if (btn) {
            btn.textContent = "Simülasyonu Durdur";
            btn.classList.remove('bg-slate-900', 'hover:bg-slate-800');
            btn.classList.add('bg-rose-600', 'hover:bg-rose-700');
        }

        const statusText = document.getElementById('esp32-status-text');
        if (statusText) statusText.textContent = "Canlı Simülasyon";

        this.intervalId = setInterval(() => this.tick(), 350);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        const btn = document.getElementById('btn-simulate');
        if (btn) {
            btn.textContent = "Canlı Simülasyonu Başlat";
            btn.classList.remove('bg-rose-600', 'hover:bg-rose-700');
            btn.classList.add('bg-slate-900', 'hover:bg-slate-800');
        }

        const statusText = document.getElementById('esp32-status-text');
        if (statusText) statusText.textContent = "ESP32 Aktif";
    }

    toggle() {
        if (this.isRunning) this.stop();
        else this.start();
    }

    tick() {
        const flDelta = (Math.random() - 0.5) * 0.25;
        const frDelta = (Math.random() - 0.5) * 0.25;
        const blDelta = (Math.random() - 0.5) * 0.25;
        const brDelta = (Math.random() - 0.5) * 0.25;

        const currentFL = Math.max(0, this.flWeight + flDelta);
        const currentFR = Math.max(0, this.frWeight + frDelta);
        const currentBL = Math.max(0, this.blWeight + blDelta);
        const currentBR = Math.max(0, this.brWeight + brDelta);
        const total = currentFL + currentFR + currentBL + currentBR;

        const weightEl = document.getElementById('metric-total-weight');
        if (weightEl) weightEl.textContent = total.toFixed(2);

        const pFL = (currentFL / total) * 100;
        const pFR = (currentFR / total) * 100;
        const pBL = (currentBL / total) * 100;
        const pBR = (currentBR / total) * 100;

        const frontPct = pFL + pFR;
        const backPct = pBL + pBR;
        const frontBar = document.getElementById('front-load-bar');
        const backBar = document.getElementById('back-load-bar');
        const frontText = document.getElementById('front-load-text');
        const backText = document.getElementById('back-load-text');

        if (frontBar) frontBar.style.width = `${frontPct}%`;
        if (backBar) backBar.style.width = `${backPct}%`;
        if (frontText) frontText.textContent = `${frontPct.toFixed(1)}%`;
        if (backText) backText.textContent = `${backPct.toFixed(1)}%`;

        const elFL = document.getElementById('val-fl-kg');
        const elFR = document.getElementById('val-fr-kg');
        const elBL = document.getElementById('val-bl-kg');
        const elBR = document.getElementById('val-br-kg');

        if (elFL) elFL.textContent = `${currentFL.toFixed(1)} kg`;
        if (elFR) elFR.textContent = `${currentFR.toFixed(1)} kg`;
        if (elBL) elBL.textContent = `${currentBL.toFixed(1)} kg`;
        if (elBR) elBR.textContent = `${currentBR.toFixed(1)} kg`;

        const pctFL = document.getElementById('pct-fl');
        const pctFR = document.getElementById('pct-fr');
        const pctBL = document.getElementById('pct-bl');
        const pctBR = document.getElementById('pct-br');

        if (pctFL) pctFL.textContent = `%${pFL.toFixed(1)} • Dengeli`;
        if (pctFR) pctFR.textContent = `%${pFR.toFixed(1)} • Dengeli`;
        if (pctBL) pctBL.textContent = `%${pBL.toFixed(1)} • Düşük`;
        if (pctBR) pctBR.textContent = `%${pBR.toFixed(1)} • Dengeli`;

        hoofData.FL.weight = `${currentFL.toFixed(1)} kg`;
        hoofData.FL.share = `%${pFL.toFixed(1)}`;
        hoofData.FR.weight = `${currentFR.toFixed(1)} kg`;
        hoofData.FR.share = `%${pFR.toFixed(1)}`;
        hoofData.FL.weight = `${currentFL.toFixed(1)} kg`;
        hoofData.FL.share = `%${pFL.toFixed(1)}`;
        hoofData.FR.weight = `${currentFR.toFixed(1)} kg`;
        hoofData.FR.share = `%${pFR.toFixed(1)}`;
        hoofData.BL.weight = `${currentBL.toFixed(1)} kg`;
        hoofData.BL.share = `%${pBL.toFixed(1)}`;
        hoofData.BR.weight = `${currentBR.toFixed(1)} kg`;
        hoofData.BR.share = `%${pBR.toFixed(1)}`;

        // Update systematic chart legend values
        const legValFL = document.getElementById('leg-val-fl');
        const legValFR = document.getElementById('leg-val-fr');
        const legValBL = document.getElementById('leg-val-bl');
        const legValBR = document.getElementById('leg-val-br');
        if (legValFL) legValFL.textContent = `${currentFL.toFixed(1)} kg`;
        if (legValFR) legValFR.textContent = `${currentFR.toFixed(1)} kg`;
        if (legValBL) legValBL.textContent = `${currentBL.toFixed(1)} kg`;
        if (legValBR) legValBR.textContent = `${currentBR.toFixed(1)} kg`;

        const mValFL = document.getElementById('modal-val-fl');
        const mPctFL = document.getElementById('modal-pct-fl');
        const mValFR = document.getElementById('modal-val-fr');
        const mPctFR = document.getElementById('modal-pct-fr');
        const mValBL = document.getElementById('modal-val-bl');
        const mPctBL = document.getElementById('modal-pct-bl');
        const mValBR = document.getElementById('modal-val-br');
        const mPctBR = document.getElementById('modal-pct-br');

        if (mValFL) mValFL.textContent = `${currentFL.toFixed(1)} kg`;
        if (mPctFL) mPctFL.textContent = `%${pFL.toFixed(1)} (Normal)`;
        if (mValFR) mValFR.textContent = `${currentFR.toFixed(1)} kg`;
        if (mPctFR) mPctFR.textContent = `%${pFR.toFixed(1)} (Normal)`;
        if (mValBL) mValBL.textContent = `${currentBL.toFixed(1)} kg`;
        if (mPctBL) mPctBL.textContent = `%${pBL.toFixed(1)} (Düşük)`;
        if (mValBR) mValBR.textContent = `${currentBR.toFixed(1)} kg`;
        if (mPctBR) mPctBR.textContent = `%${pBR.toFixed(1)} (Dengeli)`;

        const mFrontBar = document.getElementById('modal-front-bar');
        const mBackBar = document.getElementById('modal-back-bar');
        if (mFrontBar) mFrontBar.style.width = `${frontPct}%`;
        if (mBackBar) mBackBar.style.width = `${backPct}%`;

        const latencyEl = document.getElementById('esp32-latency');
        if (latencyEl) {
            const lat = Math.floor(40 + Math.random() * 8);
            latencyEl.textContent = `${lat}ms`;
        }

        // Stream into chart engine in real-time
        if (window.telemetryChart) {
            window.telemetryChart.pushLiveSample(currentFL, currentFR, currentBL, currentBR);
        }
    }
}

const simulator = new TelemetrySimulator();

// ================= TELEMETRY CHART ENGINE =================
// Professional 10 Hz Telemetry Visualizer with Anatomical Palettes, Threshold Bands, Crosshair & Anomaly Detection
class TelemetryChartEngine {
    constructor() {
        this.svg = document.getElementById('telemetry-svg');
        if (!this.svg) return;

        this.container = document.getElementById('chart-svg-container');
        this.hitRect = document.getElementById('chart-hit-rect');
        this.crosshairLine = document.getElementById('crosshair-line');
        this.tooltip = document.getElementById('chart-crosshair-tooltip');
        this.anomalyCard = document.getElementById('anomaly-popover-card');

        this.curveFL = document.getElementById('curve-fl');
        this.curveFR = document.getElementById('curve-fr');
        this.curveBL = document.getElementById('curve-bl');
        this.curveBR = document.getElementById('curve-br');

        this.snapFL = document.getElementById('snap-fl');
        this.snapFR = document.getElementById('snap-fr');
        this.snapBL = document.getElementById('snap-bl');
        this.snapBR = document.getElementById('snap-br');

        this.gThreshold = document.getElementById('grid-threshold-band');
        this.gHorizGrid = document.getElementById('grid-lines-horizontal');
        this.gVertGrid = document.getElementById('grid-lines-vertical');
        this.gYLabels = document.getElementById('y-axis-labels');
        this.gXLabels = document.getElementById('x-axis-labels');
        this.gAnomaly = document.getElementById('anomaly-marker-group');

        // SVG Viewport Metrics
        this.viewWidth = 760;
        this.viewHeight = 270;
        this.padLeft = 55;
        this.padRight = 20;
        this.padTop = 25;
        this.padBottom = 40;
        this.plotWidth = this.viewWidth - this.padLeft - this.padRight; // 685
        this.plotHeight = this.viewHeight - this.padTop - this.padBottom; // 205

        // State variables
        this.mode = 'filtered'; // 'filtered' | 'raw' | 'deviation'
        this.rangeSec = 10;     // 10 | 30 | 60
        this.activeLegHighlight = null;
        this.isHovering = false;
        this.lastHoverRatio = 0;

        // Rolling 60-second telemetry buffer (600 samples at 10 Hz)
        this.buffer = [];
        this.initBuffer();

        this.bindEvents();
        this.render();
    }

    initBuffer() {
        const totalSamples = 600; // 60 seconds at 10 Hz
        this.buffer = [];

        for (let i = 0; i < totalSamples; i++) {
            const t = i * 0.1;
            
            // Baseline before/after load shift
            // BL starts normal (~128.5 kg), then at t=6.2s drops to 108.2 kg (-24.1 kg drop!)
            let blBase = 108.2;
            let flBase = 132.5;
            let frBase = 131.0;
            let brBase = 110.7;

            if (t < 5.8) {
                blBase = 128.5;
                flBase = 127.2;
                frBase = 126.1;
                brBase = 106.6;
            } else if (t < 6.4) {
                const f = (t - 5.8) / 0.6;
                blBase = 128.5 - f * (128.5 - 108.2);
                flBase = 127.2 + f * (132.5 - 127.2);
                frBase = 126.1 + f * (131.0 - 126.1);
                brBase = 106.6 + f * (110.7 - 106.6);
            }

            // Natural physiological oscillation
            const wave = Math.sin(t * 1.2) * 0.4;
            const flFiltered = flBase + wave;
            const frFiltered = frBase - wave * 0.7;
            const blFiltered = blBase - wave * 0.8;
            const brFiltered = brBase + wave * 0.5;

            // Micro-vibrations for raw 10 Hz sensor signal
            const noiseFL = (Math.sin(i * 1.9) * 0.75 + Math.cos(i * 3.3) * 0.65);
            const noiseFR = (Math.sin(i * 2.1) * 0.70 + Math.cos(i * 2.9) * 0.60);
            const noiseBL = (Math.sin(i * 1.7) * 0.80 + Math.cos(i * 3.7) * 0.55);
            const noiseBR = (Math.sin(i * 2.3) * 0.65 + Math.cos(i * 3.1) * 0.65);

            const flRaw = flFiltered + noiseFL;
            const frRaw = frFiltered + noiseFR;
            const blRaw = blFiltered + noiseBL;
            const brRaw = brFiltered + noiseBR;

            const isAnomaly = Math.abs(t - 6.2) < 0.15;

            this.buffer.push({
                t: +t.toFixed(1),
                flFiltered: +flFiltered.toFixed(2),
                frFiltered: +frFiltered.toFixed(2),
                blFiltered: +blFiltered.toFixed(2),
                brFiltered: +brFiltered.toFixed(2),
                flRaw: +flRaw.toFixed(2),
                frRaw: +frRaw.toFixed(2),
                blRaw: +blRaw.toFixed(2),
                brRaw: +brRaw.toFixed(2),
                isAnomaly: isAnomaly
            });
        }
    }

    pushLiveSample(fl, fr, bl, br) {
        if (!this.buffer.length) return;
        const lastT = this.buffer[this.buffer.length - 1].t + 0.1;
        
        const noiseFL = (Math.random() - 0.5) * 1.2;
        const noiseFR = (Math.random() - 0.5) * 1.2;
        const noiseBL = (Math.random() - 0.5) * 1.2;
        const noiseBR = (Math.random() - 0.5) * 1.2;

        this.buffer.push({
            t: +lastT.toFixed(1),
            flFiltered: +fl.toFixed(2),
            frFiltered: +fr.toFixed(2),
            blFiltered: +bl.toFixed(2),
            brFiltered: +br.toFixed(2),
            flRaw: +(fl + noiseFL).toFixed(2),
            frRaw: +(fr + noiseFR).toFixed(2),
            blRaw: +(bl + noiseBL).toFixed(2),
            brRaw: +(br + noiseBR).toFixed(2),
            isAnomaly: false
        });

        if (this.buffer.length > 600) {
            this.buffer.shift();
        }

        this.renderCurves();
        if (this.isHovering) {
            this.updateCrosshairByRatio(this.lastHoverRatio);
        }
    }

    setMode(mode) {
        this.mode = mode;

        // Update button states
        const btnFiltered = document.getElementById('tab-filtered-data');
        const btnRaw = document.getElementById('tab-raw-data');
        const btnDev = document.getElementById('tab-deviation-data');
        const activeClass = "px-2.5 py-1 font-medium rounded-md bg-white text-slate-900 shadow-xs cursor-pointer transition";
        const inactiveClass = "px-2.5 py-1 font-medium rounded-md text-slate-500 hover:text-slate-900 cursor-pointer transition";

        if (btnFiltered) btnFiltered.className = (mode === 'filtered') ? activeClass : inactiveClass;
        if (btnRaw) btnRaw.className = (mode === 'raw') ? activeClass : inactiveClass;
        if (btnDev) btnDev.className = (mode === 'deviation') ? activeClass : inactiveClass;

        // Update threshold badge label
        const bandLabel = document.getElementById('band-label');
        if (bandLabel) {
            if (mode === 'deviation') {
                bandLabel.textContent = "Dengeli Dağılım Toleransı (±8 kg)";
            } else {
                bandLabel.textContent = "Normal Tolerans Aralığı (115 - 140 kg)";
            }
        }

        this.render();
    }

    setRange(rangeSec) {
        this.rangeSec = rangeSec;

        const btn10 = document.getElementById('btn-range-10s');
        const btn30 = document.getElementById('btn-range-30s');
        const btn60 = document.getElementById('btn-range-60s');
        const activeClass = "px-2 py-1 font-medium rounded-md bg-white text-slate-900 shadow-xs cursor-pointer transition";
        const inactiveClass = "px-2 py-1 font-medium rounded-md text-slate-500 hover:text-slate-900 cursor-pointer transition";

        if (btn10) btn10.className = (rangeSec === 10) ? activeClass : inactiveClass;
        if (btn30) btn30.className = (rangeSec === 30) ? activeClass : inactiveClass;
        if (btn60) btn60.className = (rangeSec === 60) ? activeClass : inactiveClass;

        this.render();
    }

    highlightLeg(legId) {
        this.activeLegHighlight = legId;
        const curves = [
            { id: 'fl', el: this.curveFL },
            { id: 'fr', el: this.curveFR },
            { id: 'bl', el: this.curveBL },
            { id: 'br', el: this.curveBR }
        ];

        curves.forEach(item => {
            if (!item.el) return;
            if (!legId) {
                item.el.style.opacity = '1';
                item.el.setAttribute('stroke-width', '2.3');
            } else if (item.id === legId) {
                item.el.style.opacity = '1';
                item.el.setAttribute('stroke-width', '3.2');
            } else {
                item.el.style.opacity = '0.15';
                item.el.setAttribute('stroke-width', '2.0');
            }
        });
    }

    getActiveSamples() {
        const count = Math.min(this.buffer.length, this.rangeSec * 10);
        return this.buffer.slice(0, count);
    }

    getY(val, minY, maxY) {
        const clamped = Math.max(minY, Math.min(maxY, val));
        return this.padTop + this.plotHeight - ((clamped - minY) / (maxY - minY)) * this.plotHeight;
    }

    getX(index, totalCount) {
        if (totalCount <= 1) return this.padLeft;
        return this.padLeft + (index / (totalCount - 1)) * this.plotWidth;
    }

    render() {
        this.renderGridAndAxes();
        this.renderThresholdBand();
        this.renderAnomalyMarker();
        this.renderCurves();
    }

    renderGridAndAxes() {
        const isDev = (this.mode === 'deviation');
        const minY = isDev ? -25 : 80;
        const maxY = isDev ? 25 : 160;
        const yVals = isDev ? [-20, -10, 0, 10, 20] : [80, 100, 120, 140, 160];

        // 1. Horizontal grid lines & Y-Axis Labels
        let horizHtml = '';
        let yLabelsHtml = `<text x="12" y="16" font-size="10" font-weight="600" fill="#64748B" font-family="Inter, sans-serif">${isDev ? 'Δ Yük (kg)' : 'Yük (kg)'}</text>`;

        yVals.forEach(v => {
            const y = this.getY(v, minY, maxY);
            const isZero = isDev && (v === 0);
            
            horizHtml += `<line x1="${this.padLeft}" y1="${y}" x2="${this.padLeft + this.plotWidth}" y2="${y}" stroke="${isZero ? '#94A3B8' : '#E2E8F0'}" stroke-width="${isZero ? '1.5' : '1'}" stroke-dasharray="${isZero ? '4,4' : '3,3'}" />`;
            
            const labelStr = isDev ? (v > 0 ? `+${v}` : `${v}`) : `${v}`;
            yLabelsHtml += `<text x="${this.padLeft - 8}" y="${y + 3.5}" text-anchor="end" font-size="10" font-family="JetBrains Mono, monospace" fill="${isZero ? '#334155' : '#94A3B8'}">${labelStr}</text>`;
        });

        if (this.gHorizGrid) this.gHorizGrid.innerHTML = horizHtml;
        if (this.gYLabels) this.gYLabels.innerHTML = yLabelsHtml;

        // 2. Vertical grid lines & X-Axis Timestamps
        let vertHtml = '';
        let xLabelsHtml = '';
        const numTicks = 6;
        const stepSec = this.rangeSec / (numTicks - 1);

        // Baseline line
        vertHtml += `<line x1="${this.padLeft}" y1="${this.padTop + this.plotHeight}" x2="${this.padLeft + this.plotWidth}" y2="${this.padTop + this.plotHeight}" stroke="#CBD5E1" stroke-width="1.2" />`;

        for (let i = 0; i < numTicks; i++) {
            const sec = i * stepSec;
            const x = this.padLeft + (i / (numTicks - 1)) * this.plotWidth;

            vertHtml += `<line x1="${x}" y1="${this.padTop}" x2="${x}" y2="${this.padTop + this.plotHeight}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3" />`;
            vertHtml += `<line x1="${x}" y1="${this.padTop + this.plotHeight}" x2="${x}" y2="${this.padTop + this.plotHeight + 4}" stroke="#94A3B8" stroke-width="1" />`;

            const m = String(Math.floor(sec / 60)).padStart(2, '0');
            const s = String(Math.floor(sec % 60)).padStart(2, '0');
            xLabelsHtml += `<text x="${x}" y="${this.padTop + this.plotHeight + 17}" text-anchor="middle" font-size="10" font-family="JetBrains Mono, monospace" fill="#64748B">${m}:${s}</text>`;
        }

        xLabelsHtml += `<text x="${this.viewWidth - 10}" y="${this.padTop + this.plotHeight + 17}" text-anchor="end" font-size="10" font-weight="600" fill="#64748B" font-family="Inter, sans-serif">t (sn)</text>`;

        if (this.gVertGrid) this.gVertGrid.innerHTML = vertHtml;
        if (this.gXLabels) this.gXLabels.innerHTML = xLabelsHtml;
    }

    renderThresholdBand() {
        if (!this.gThreshold) return;
        const isDev = (this.mode === 'deviation');
        const minY = isDev ? -25 : 80;
        const maxY = isDev ? 25 : 160;

        const valTop = isDev ? 8 : 140;
        const valBottom = isDev ? -8 : 115;

        const yTop = this.getY(valTop, minY, maxY);
        const yBottom = this.getY(valBottom, minY, maxY);
        const height = Math.abs(yBottom - yTop);

        const title = isDev ? "Dengeli Dağılım Toleransı (±8 kg)" : "Normal Dağılım Bandı (115 - 140 kg)";

        this.gThreshold.innerHTML = `
            <rect x="${this.padLeft}" y="${yTop}" width="${this.plotWidth}" height="${height}" fill="url(#bandGrad)" stroke="#10B981" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.35" rx="3" />
            <text x="${this.padLeft + 10}" y="${yTop + 14}" font-size="9.5" font-weight="600" fill="#059669" font-family="Inter, sans-serif" opacity="0.9">${title}</text>
        `;
    }

    renderAnomalyMarker() {
        if (!this.gAnomaly) return;
        // The load shift is around t = 6.2s
        const tAnomaly = 6.2;
        if (tAnomaly > this.rangeSec) {
            this.gAnomaly.innerHTML = '';
            return;
        }

        const x = this.padLeft + (tAnomaly / this.rangeSec) * this.plotWidth;

        this.gAnomaly.innerHTML = `
            <!-- Halo Glow -->
            <rect x="${x - 14}" y="${this.padTop}" width="28" height="${this.plotHeight}" fill="url(#anomalyGlow)" pointer-events="none" />
            
            <!-- Red Dashed Vertical Line -->
            <line x1="${x}" y1="${this.padTop}" x2="${x}" y2="${this.padTop + this.plotHeight}" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.9" />
            
            <!-- Warning Badge Pill -->
            <g id="svg-anomaly-badge" transform="translate(${x}, ${this.padTop + 4})">
                <rect x="-64" y="0" width="128" height="20" rx="10" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.2" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))" />
                <circle cx="-52" cy="10" r="3.5" fill="#EF4444" />
                <text x="-43" y="13.5" font-size="9" font-weight="600" fill="#991B1B" font-family="Inter, sans-serif">⚠️ Yük Kayması (24.1 kg)</text>
            </g>
        `;

        const badge = document.getElementById('svg-anomaly-badge');
        if (badge && this.anomalyCard) {
            badge.addEventListener('mouseenter', () => {
                const containerRect = this.container.getBoundingClientRect();
                const pixelX = (x / this.viewWidth) * containerRect.width;
                this.anomalyCard.style.left = `${Math.min(containerRect.width - 270, Math.max(10, pixelX - 130))}px`;
                this.anomalyCard.style.top = `35px`;
                this.anomalyCard.classList.remove('opacity-0');
                this.anomalyCard.classList.add('opacity-100');
            });

            badge.addEventListener('mouseleave', () => {
                this.anomalyCard.classList.remove('opacity-100');
                this.anomalyCard.classList.add('opacity-0');
            });
        }
    }

    renderCurves() {
        const samples = this.getActiveSamples();
        if (samples.length < 2) return;

        const isDev = (this.mode === 'deviation');
        const minY = isDev ? -25 : 80;
        const maxY = isDev ? 25 : 160;

        let pathFL = "";
        let pathFR = "";
        let pathBL = "";
        let pathBR = "";

        samples.forEach((s, idx) => {
            const x = this.getX(idx, samples.length);
            
            let valFL = (this.mode === 'raw') ? s.flRaw : s.flFiltered;
            let valFR = (this.mode === 'raw') ? s.frRaw : s.frFiltered;
            let valBL = (this.mode === 'raw') ? s.blRaw : s.blFiltered;
            let valBR = (this.mode === 'raw') ? s.brRaw : s.brFiltered;

            if (isDev) {
                const mean = (valFL + valFR + valBL + valBR) / 4;
                valFL = valFL - mean;
                valFR = valFR - mean;
                valBL = valBL - mean;
                valBR = valBR - mean;
            }

            const yFL = this.getY(valFL, minY, maxY);
            const yFR = this.getY(valFR, minY, maxY);
            const yBL = this.getY(valBL, minY, maxY);
            const yBR = this.getY(valBR, minY, maxY);

            const prefix = (idx === 0) ? "M" : "L";
            pathFL += `${prefix}${x.toFixed(1)},${yFL.toFixed(1)} `;
            pathFR += `${prefix}${x.toFixed(1)},${yFR.toFixed(1)} `;
            pathBL += `${prefix}${x.toFixed(1)},${yBL.toFixed(1)} `;
            pathBR += `${prefix}${x.toFixed(1)},${yBR.toFixed(1)} `;
        });

        if (this.curveFL) this.curveFL.setAttribute('d', pathFL);
        if (this.curveFR) this.curveFR.setAttribute('d', pathFR);
        if (this.curveBL) this.curveBL.setAttribute('d', pathBL);
        if (this.curveBR) this.curveBR.setAttribute('d', pathBR);
    }

    updateCrosshairByRatio(ratio) {
        const samples = this.getActiveSamples();
        if (!samples.length) return;

        const idx = Math.min(samples.length - 1, Math.max(0, Math.round(ratio * (samples.length - 1))));
        const s = samples[idx];
        const svgX = this.getX(idx, samples.length);

        const isDev = (this.mode === 'deviation');
        const minY = isDev ? -25 : 80;
        const maxY = isDev ? 25 : 160;

        let valFL = (this.mode === 'raw') ? s.flRaw : s.flFiltered;
        let valFR = (this.mode === 'raw') ? s.frRaw : s.frFiltered;
        let valBL = (this.mode === 'raw') ? s.blRaw : s.blFiltered;
        let valBR = (this.mode === 'raw') ? s.brRaw : s.brFiltered;

        const totalWeight = valFL + valFR + valBL + valBR;

        let displayFL = valFL;
        let displayFR = valFR;
        let displayBL = valBL;
        let displayBR = valBR;

        if (isDev) {
            const mean = totalWeight / 4;
            displayFL = valFL - mean;
            displayFR = valFR - mean;
            displayBL = valBL - mean;
            displayBR = valBR - mean;
        }

        const yFL = this.getY(displayFL, minY, maxY);
        const yFR = this.getY(displayFR, minY, maxY);
        const yBL = this.getY(displayBL, minY, maxY);
        const yBR = this.getY(displayBR, minY, maxY);

        // Position crosshair vertical line
        if (this.crosshairLine) {
            this.crosshairLine.setAttribute('x1', svgX);
            this.crosshairLine.setAttribute('x2', svgX);
            this.crosshairLine.setAttribute('opacity', '1');
        }

        // Position 4 snap dots
        if (this.snapFL) { this.snapFL.setAttribute('cx', svgX); this.snapFL.setAttribute('cy', yFL); this.snapFL.setAttribute('opacity', '1'); }
        if (this.snapFR) { this.snapFR.setAttribute('cx', svgX); this.snapFR.setAttribute('cy', yFR); this.snapFR.setAttribute('opacity', '1'); }
        if (this.snapBL) { this.snapBL.setAttribute('cx', svgX); this.snapBL.setAttribute('cy', yBL); this.snapBL.setAttribute('opacity', '1'); }
        if (this.snapBR) { this.snapBR.setAttribute('cx', svgX); this.snapBR.setAttribute('cy', yBR); this.snapBR.setAttribute('opacity', '1'); }

        // Populate tooltip card
        const m = String(Math.floor(s.t / 60)).padStart(2, '0');
        const secPart = String(Math.floor(s.t % 60)).padStart(2, '0');
        const subsec = Math.floor((s.t % 1) * 10);
        const timeStr = `${m}:${secPart}.${subsec}`;

        const ttTime = document.getElementById('tooltip-time-text');
        const ttSec = document.getElementById('tooltip-sec-text');
        const ttFL = document.getElementById('tt-val-fl');
        const ttFR = document.getElementById('tt-val-fr');
        const ttBL = document.getElementById('tt-val-bl');
        const ttBR = document.getElementById('tt-val-br');
        const ttTotal = document.getElementById('tt-total-weight');
        const ttRatio = document.getElementById('tt-balance-ratio');

        if (ttTime) ttTime.textContent = timeStr;
        if (ttSec) ttSec.textContent = `t = ${s.t.toFixed(1)} sn`;

        const unit = isDev ? 'Δ kg' : 'kg';
        const formatVal = (v) => isDev ? (v > 0 ? `+${v.toFixed(1)} ${unit}` : `${v.toFixed(1)} ${unit}`) : `${v.toFixed(1)} ${unit}`;

        if (ttFL) ttFL.textContent = formatVal(displayFL);
        if (ttFR) ttFR.textContent = formatVal(displayFR);
        if (ttBL) ttBL.textContent = formatVal(displayBL);
        if (ttBR) ttBR.textContent = formatVal(displayBR);
        if (ttTotal) ttTotal.textContent = `${totalWeight.toFixed(1)} kg`;
        
        const frontPct = ((valFL + valFR) / totalWeight) * 100;
        if (ttRatio) ttRatio.textContent = `Ön: %${frontPct.toFixed(1)}`;

        // Position tooltip popover
        if (this.tooltip && this.container) {
            const containerRect = this.container.getBoundingClientRect();
            const pixelX = (svgX / this.viewWidth) * containerRect.width;
            
            // Avoid overflow
            const tooltipWidth = 230;
            let targetLeft = pixelX;
            if (targetLeft + tooltipWidth / 2 > containerRect.width - 15) {
                targetLeft = containerRect.width - tooltipWidth / 2 - 15;
            } else if (targetLeft - tooltipWidth / 2 < 15) {
                targetLeft = tooltipWidth / 2 + 15;
            }

            this.tooltip.style.left = `${targetLeft}px`;
            this.tooltip.style.top = `15px`;
            this.tooltip.classList.remove('opacity-0');
            this.tooltip.classList.add('opacity-100');
        }
    }

    hideCrosshair() {
        this.isHovering = false;
        if (this.crosshairLine) this.crosshairLine.setAttribute('opacity', '0');
        if (this.snapFL) this.snapFL.setAttribute('opacity', '0');
        if (this.snapFR) this.snapFR.setAttribute('opacity', '0');
        if (this.snapBL) this.snapBL.setAttribute('opacity', '0');
        if (this.snapBR) this.snapBR.setAttribute('opacity', '0');
        if (this.tooltip) {
            this.tooltip.classList.remove('opacity-100');
            this.tooltip.classList.add('opacity-0');
        }
    }

    bindEvents() {
        if (!this.hitRect) return;

        // Hover & Mousemove interaction on hit rect
        const handleMove = (e) => {
            const rect = this.hitRect.getBoundingClientRect();
            const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
            const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
            const ratio = (clampedX - rect.left) / rect.width;
            
            this.isHovering = true;
            this.lastHoverRatio = ratio;
            this.updateCrosshairByRatio(ratio);
        };

        this.hitRect.addEventListener('mousemove', handleMove);
        this.hitRect.addEventListener('touchmove', handleMove, { passive: true });
        this.hitRect.addEventListener('mouseleave', () => this.hideCrosshair());
        this.hitRect.addEventListener('touchend', () => this.hideCrosshair());

        // Mode buttons
        const btnFiltered = document.getElementById('tab-filtered-data');
        const btnRaw = document.getElementById('tab-raw-data');
        const btnDev = document.getElementById('tab-deviation-data');
        if (btnFiltered) btnFiltered.addEventListener('click', () => this.setMode('filtered'));
        if (btnRaw) btnRaw.addEventListener('click', () => this.setMode('raw'));
        if (btnDev) btnDev.addEventListener('click', () => this.setMode('deviation'));

        // Range buttons
        const btn10 = document.getElementById('btn-range-10s');
        const btn30 = document.getElementById('btn-range-30s');
        const btn60 = document.getElementById('btn-range-60s');
        if (btn10) btn10.addEventListener('click', () => this.setRange(10));
        if (btn30) btn30.addEventListener('click', () => this.setRange(30));
        if (btn60) btn60.addEventListener('click', () => this.setRange(60));

        // Legend hover chips
        document.querySelectorAll('.legend-chip').forEach(chip => {
            const leg = chip.dataset.leg;
            chip.addEventListener('mouseenter', () => this.highlightLeg(leg));
            chip.addEventListener('mouseleave', () => this.highlightLeg(null));
        });
    }
}

// System Logs Modal
function openSystemLogsModal() {
    const modal = document.getElementById('system-logs-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeSystemLogsModal() {
    const modal = document.getElementById('system-logs-modal');
    if (modal) modal.classList.add('hidden');
}

// DOM Ready initialization
let mainStage = null;
let modalStage = null;

document.addEventListener('DOMContentLoaded', () => {
    initClock();

    mainStage = createStudioStage('three-canvas-container');

    // Initialize Telemetry Chart Visualizer
    window.telemetryChart = new TelemetryChartEngine();

    const resetBtn = document.getElementById('orbit-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (mainStage) mainStage.resetOrbit();
        });
    }

    const modal = document.getElementById('expand-modal');
    const openModalBtn = document.getElementById('expand-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalResetOrbitBtn = document.getElementById('modal-reset-orbit');

    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            if (!modalStage) {
                setTimeout(() => {
                    modalStage = createStudioStage('modal-three-container', true);
                }, 50);
            } else {
                setTimeout(() => modalStage.resize(), 50);
            }
        });
    }

    function closeModal() {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (modalResetOrbitBtn) {
        modalResetOrbitBtn.addEventListener('click', () => {
            if (modalStage) modalStage.resetOrbit();
        });
    }

    const btnSimulate = document.getElementById('btn-simulate');
    if (btnSimulate) {
        btnSimulate.addEventListener('click', () => simulator.toggle());
    }

    const btnLogs = document.getElementById('btn-system-logs');
    if (btnLogs) {
        btnLogs.addEventListener('click', openSystemLogsModal);
    }

    window.addEventListener('resize', () => {
        if (mainStage) mainStage.resize();
        if (modalStage && modal && !modal.classList.contains('hidden')) modalStage.resize();
        if (window.telemetryChart) window.telemetryChart.render();
    });
});
