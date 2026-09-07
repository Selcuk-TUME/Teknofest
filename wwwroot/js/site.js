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
        hoofData.BL.weight = `${currentBL.toFixed(1)} kg`;
        hoofData.BL.share = `%${pBL.toFixed(1)}`;
        hoofData.BR.weight = `${currentBR.toFixed(1)} kg`;
        hoofData.BR.share = `%${pBR.toFixed(1)}`;

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
    }
}

const simulator = new TelemetrySimulator();

// Filter tabs
function setTelemetryFilter(isFiltered) {
    const btnRaw = document.getElementById('tab-raw-data');
    const btnFiltered = document.getElementById('tab-filtered-data');
    if (!btnRaw || !btnFiltered) return;

    if (isFiltered) {
        btnFiltered.className = "px-2.5 py-1 font-medium rounded-md bg-white text-slate-900 shadow-xs cursor-pointer";
        btnRaw.className = "px-2.5 py-1 font-medium rounded-md text-slate-500 hover:text-slate-900 cursor-pointer";
    } else {
        btnRaw.className = "px-2.5 py-1 font-medium rounded-md bg-white text-slate-900 shadow-xs cursor-pointer";
        btnFiltered.className = "px-2.5 py-1 font-medium rounded-md text-slate-500 hover:text-slate-900 cursor-pointer";
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

    const btnRaw = document.getElementById('tab-raw-data');
    if (btnRaw) {
        btnRaw.addEventListener('click', () => setTelemetryFilter(false));
    }

    const btnFiltered = document.getElementById('tab-filtered-data');
    if (btnFiltered) {
        btnFiltered.addEventListener('click', () => setTelemetryFilter(true));
    }

    const btnLogs = document.getElementById('btn-system-logs');
    if (btnLogs) {
        btnLogs.addEventListener('click', openSystemLogsModal);
    }

    window.addEventListener('resize', () => {
        if (mainStage) mainStage.resize();
        if (modalStage && modal && !modal.classList.contains('hidden')) modalStage.resize();
    });
});
