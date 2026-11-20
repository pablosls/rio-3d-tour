import './style.css';
import * as THREE from 'three';
import { LANDMARKS, OVERVIEW_VIEW } from './data/landmarks.js';
import {
  createCityscape,
  createOcean,
  createRioNiteroiBridge,
  createTerrain,
  createVegetation,
  getTerrainHeight,
} from './scene/terrain.js';
import { createLandmarks } from './scene/landmarksBuilder.js';
import { createAtmosphere } from './scene/atmosphere.js';
import { createCameraController } from './scene/cameraController.js';
import { createAmbientAudio } from './audio/ambientAudio.js';

// =========================================================================
// 1. RENDERER, SCENE & CAMERA SETUP
// =========================================================================
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.5,
  650
);
camera.position.set(...OVERVIEW_VIEW.cameraPos);

const camCtrl = createCameraController(camera, canvas);
camCtrl.controls.target.set(...OVERVIEW_VIEW.target);
camCtrl.controls.update();

// =========================================================================
// 2. BUILD RIO DE JANEIRO 3D WORLD
// =========================================================================
const atmosphere = createAtmosphere(scene, renderer);
const terrain = createTerrain();
scene.add(terrain);

const { mesh: oceanMesh, uniforms: oceanUniforms } = createOcean();
scene.add(oceanMesh);

const { group: cityGroup, buildingMat } = createCityscape();
scene.add(cityGroup);

const vegetation = createVegetation();
scene.add(vegetation);

const bridge = createRioNiteroiBridge();
scene.add(bridge.group);

const landmarksWorld = createLandmarks(scene);

// =========================================================================
// 3. UI STATE & DOM REFERENCES
// =========================================================================
const hudEl = document.getElementById('hud');
const hotspotsLayer = document.getElementById('hotspots-layer');
const infoCard = document.getElementById('info-card');
const overviewHint = document.getElementById('overview-hint');
const landmarkDock = document.getElementById('landmark-dock');
const btnTour = document.getElementById('btn-tour');
const tourIcon = document.getElementById('tour-icon');
const tourLabel = document.getElementById('tour-label');
const tourProgressBar = document.getElementById('tour-progress-bar');
const tourProgressFill = document.getElementById('tour-progress-fill');
const btnOverview = document.getElementById('btn-overview');
const btnOrbit = document.getElementById('btn-orbit');
const btnAudio = document.getElementById('btn-audio');
const btnCinema = document.getElementById('btn-cinema');
const btnRestoreHud = document.getElementById('btn-restore-hud');
const btnCloseCard = document.getElementById('btn-close-card');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const loadingScreen = document.getElementById('loading-screen');

const cardDot = document.getElementById('card-dot');
const cardCategory = document.getElementById('card-category');
const cardTitle = document.getElementById('card-title');
const cardNeighborhood = document.getElementById('card-neighborhood');
const cardStats = document.getElementById('card-stats');
const cardDescription = document.getElementById('card-description');
const cardCuriosityText = document.getElementById('card-curiosity-text');
const cardCounter = document.getElementById('card-counter');

const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');
const minimapCoords = document.getElementById('minimap-coords');

const audio = createAmbientAudio();

let activeLandmarkId = null;
let autoOrbit = false;
let cinemaMode = false;

// Guided Tour state
let tourRunning = false;
let tourIndex = 0;
let tourElapsed = 0;
const TOUR_STAY_SECONDS = 8.0;

// =========================================================================
// 4. BUILD 3D HOTSPOTS & BOTTOM LANDMARK DOCK
// =========================================================================
const hotspotEls = new Map();
const dockEls = new Map();

LANDMARKS.forEach((lm) => {
  // Floating 3D-projected pin
  const pin = document.createElement('button');
  pin.className = 'hotspot';
  pin.style.setProperty('--hotspot-accent', lm.accent);
  pin.innerHTML = `<span class="hotspot-num">${lm.index}</span><span>${lm.name}</span>`;
  pin.addEventListener('click', (e) => {
    e.stopPropagation();
    stopGuidedTour();
    selectLandmark(lm.id);
  });
  hotspotsLayer.appendChild(pin);
  hotspotEls.set(lm.id, { el: pin, lm });

  // Bottom dock pill
  const dockBtn = document.createElement('button');
  dockBtn.className = 'dock-item';
  dockBtn.style.setProperty('--dock-accent', lm.accent);
  dockBtn.innerHTML = `<span class="dock-num">${lm.index}</span><span>${lm.name.split('&')[0].trim()}</span>`;
  dockBtn.addEventListener('click', () => {
    stopGuidedTour();
    selectLandmark(lm.id);
  });
  landmarkDock.appendChild(dockBtn);
  dockEls.set(lm.id, dockBtn);
});

// =========================================================================
// 5. NAVIGATION & GUIDED TOUR LOGIC
// =========================================================================
function updateCard(lm) {
  cardDot.style.background = lm.accent;
  cardDot.style.boxShadow = `0 0 12px ${lm.accent}`;
  cardCategory.textContent = lm.category;
  cardTitle.textContent = lm.name;
  cardNeighborhood.textContent = lm.neighborhood;
  cardDescription.textContent = lm.description;
  cardCuriosityText.textContent = lm.curiosity;
  cardCounter.textContent = `${lm.index} / ${LANDMARKS.length}`;

  cardStats.innerHTML = lm.stats
    .map(
      (s) => `
      <div class="stat-box">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
    )
    .join('');

  infoCard.classList.remove('hidden');
  overviewHint.classList.add('hidden');
}

function selectLandmark(id, flightDuration = 1.95) {
  const lm = LANDMARKS.find((l) => l.id === id);
  if (!lm) return;

  activeLandmarkId = id;
  minimapCoords.textContent = lm.name.split('&')[0].trim();

  hotspotEls.forEach(({ el }, key) => el.classList.toggle('active', key === id));
  dockEls.forEach((el, key) => {
    el.classList.toggle('active', key === id);
    if (key === id) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
  btnOverview.classList.remove('active');

  updateCard(lm);
  camCtrl.flyTo(lm.cameraPos, lm.target, flightDuration);
}

function goToOverview() {
  stopGuidedTour();
  activeLandmarkId = null;
  minimapCoords.textContent = 'Baía de Guanabara';

  hotspotEls.forEach(({ el }) => el.classList.remove('active'));
  dockEls.forEach((el) => el.classList.remove('active'));
  infoCard.classList.add('hidden');
  overviewHint.classList.remove('hidden');
  btnOverview.classList.add('active');

  camCtrl.flyTo(OVERVIEW_VIEW.cameraPos, OVERVIEW_VIEW.target, 2.0);
}

function stepLandmark(delta) {
  stopGuidedTour();
  const currentIdx = LANDMARKS.findIndex((l) => l.id === activeLandmarkId);
  const nextIdx =
    currentIdx === -1
      ? delta > 0
        ? 0
        : LANDMARKS.length - 1
      : (currentIdx + delta + LANDMARKS.length) % LANDMARKS.length;
  selectLandmark(LANDMARKS[nextIdx].id);
}

function startGuidedTour() {
  tourRunning = true;
  tourElapsed = 0;
  const currentIdx = LANDMARKS.findIndex((l) => l.id === activeLandmarkId);
  tourIndex = currentIdx >= 0 ? currentIdx : 0;

  btnTour.classList.add('running');
  tourIcon.textContent = '⏸';
  tourLabel.textContent = 'Pausar Tour';
  tourProgressBar.classList.remove('hidden');

  setAutoOrbitState(true);
  selectLandmark(LANDMARKS[tourIndex].id, 2.2);
}

function stopGuidedTour() {
  if (!tourRunning) return;
  tourRunning = false;
  btnTour.classList.remove('running');
  tourIcon.textContent = '▶';
  tourLabel.textContent = 'Tour Guiado';
  tourProgressBar.classList.add('hidden');
  tourProgressFill.style.width = '0%';
}

function setAutoOrbitState(enabled) {
  autoOrbit = enabled;
  camCtrl.setAutoRotate(enabled);
  btnOrbit.classList.toggle('active', enabled);
}

function setCinemaMode(enabled) {
  cinemaMode = enabled;
  hudEl.classList.toggle('hud-hidden', enabled);
  hotspotsLayer.classList.toggle('hud-hidden', enabled);
  btnRestoreHud.classList.toggle('hidden', !enabled);
}

// =========================================================================
// 6. EVENT LISTENERS (UI, RAYCASTING & KEYBOARD SHORTCUTS)
// =========================================================================
document.querySelectorAll('.time-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.time-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    atmosphere.setPreset(btn.dataset.time);
  });
});

btnTour.addEventListener('click', () => {
  if (tourRunning) stopGuidedTour();
  else startGuidedTour();
});

btnOverview.addEventListener('click', goToOverview);
btnOverview.classList.add('active');

btnOrbit.addEventListener('click', () => {
  setAutoOrbitState(!autoOrbit);
});

btnAudio.addEventListener('click', async () => {
  const playing = await audio.toggle();
  btnAudio.textContent = playing ? '🔊' : '🔇';
  btnAudio.classList.toggle('active', playing);
});

btnCinema.addEventListener('click', () => setCinemaMode(true));
btnRestoreHud.addEventListener('click', () => setCinemaMode(false));

btnCloseCard.addEventListener('click', () => {
  infoCard.classList.add('hidden');
});

btnPrev.addEventListener('click', () => stepLandmark(-1));
btnNext.addEventListener('click', () => stepLandmark(1));

// Pause guided tour if the user manually takes control of the camera
camCtrl.onUserInteract(() => {
  if (tourRunning) stopGuidedTour();
});

// Raycasting: click directly on any 3D monument to fly there!
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };

canvas.addEventListener('pointerdown', (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (dist > 6) return; // Ignore camera orbit drags

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(landmarksWorld.clickableTargets, false);
  if (hits.length > 0) {
    const lmId = hits[0].object.userData.landmarkId;
    if (lmId) {
      stopGuidedTour();
      selectLandmark(lmId);
    }
  }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key >= '1' && e.key <= '7') {
    const idx = parseInt(e.key, 10) - 1;
    if (LANDMARKS[idx]) {
      stopGuidedTour();
      selectLandmark(LANDMARKS[idx].id);
    }
  } else if (e.key === 'ArrowRight') {
    stepLandmark(1);
  } else if (e.key === 'ArrowLeft') {
    stepLandmark(-1);
  } else if (e.key === 'o' || e.key === 'O' || e.key === 'Escape') {
    if (cinemaMode) setCinemaMode(false);
    else goToOverview();
  } else if (e.key === ' ') {
    e.preventDefault();
    if (tourRunning) stopGuidedTour();
    else startGuidedTour();
  } else if (e.key === 'h' || e.key === 'H') {
    setCinemaMode(!cinemaMode);
  }
});

// =========================================================================
// 7. INTERACTIVE MINI-MAP RADAR (Pre-rendered Coastline + Live Camera Cone)
// =========================================================================
const MAP_BOUNDS = { minX: -95, maxX: 95, minZ: -70, maxZ: 60 };
const mapToCanvas = (wx, wz) => ({
  x: ((wx - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX)) * minimapCanvas.width,
  y: ((wz - MAP_BOUNDS.minZ) / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)) * minimapCanvas.height,
});

// Pre-render stylized coastline topography once to an offscreen canvas
const mapBg = document.createElement('canvas');
mapBg.width = minimapCanvas.width;
mapBg.height = minimapCanvas.height;
{
  const mctx = mapBg.getContext('2d');
  const img = mctx.createImageData(mapBg.width, mapBg.height);
  for (let py = 0; py < mapBg.height; py++) {
    for (let px = 0; px < mapBg.width; px++) {
      const wx = MAP_BOUNDS.minX + (px / mapBg.width) * (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
      const wz = MAP_BOUNDS.minZ + (py / mapBg.height) * (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ);
      const h = getTerrainHeight(wx, wz);
      const idx = (py * mapBg.width + px) * 4;
      if (h <= 0) {
        img.data[idx] = 10;
        img.data[idx + 1] = 36;
        img.data[idx + 2] = 66;
        img.data[idx + 3] = 255;
      } else if (h < 2.2) {
        img.data[idx] = 44;
        img.data[idx + 1] = 68;
        img.data[idx + 2] = 86;
        img.data[idx + 3] = 255;
      } else {
        const lift = Math.min(1, h / 34);
        img.data[idx] = Math.round(32 + lift * 52);
        img.data[idx + 1] = Math.round(92 + lift * 62);
        img.data[idx + 2] = Math.round(64 + lift * 38);
        img.data[idx + 3] = 255;
      }
    }
  }
  mctx.putImageData(img, 0, 0);
}

// Click on mini-map to jump to nearest landmark
minimapCanvas.addEventListener('click', (e) => {
  const rect = minimapCanvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  let nearest = null;
  let bestDist = 26;
  for (const lm of LANDMARKS) {
    const pt = mapToCanvas(lm.position[0], lm.position[2]);
    const d = Math.hypot(cx - pt.x, cy - pt.y);
    if (d < bestDist) {
      bestDist = d;
      nearest = lm;
    }
  }
  if (nearest) {
    stopGuidedTour();
    selectLandmark(nearest.id);
  }
});

const camForward = new THREE.Vector3();
function drawMinimap() {
  minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  minimapCtx.drawImage(mapBg, 0, 0);

  // Draw landmarks
  for (const lm of LANDMARKS) {
    const pt = mapToCanvas(lm.position[0], lm.position[2]);
    const isActive = lm.id === activeLandmarkId;
    minimapCtx.beginPath();
    minimapCtx.arc(pt.x, pt.y, isActive ? 5.2 : 3.4, 0, Math.PI * 2);
    minimapCtx.fillStyle = lm.accent;
    minimapCtx.fill();
    if (isActive) {
      minimapCtx.strokeStyle = '#ffffff';
      minimapCtx.lineWidth = 1.6;
      minimapCtx.stroke();
    }
  }

  // Draw live camera position & viewing direction cone
  const camPt = mapToCanvas(camera.position.x, camera.position.z);
  camera.getWorldDirection(camForward);
  const angle = Math.atan2(camForward.z, camForward.x);

  minimapCtx.save();
  minimapCtx.translate(
    THREE.MathUtils.clamp(camPt.x, 4, minimapCanvas.width - 4),
    THREE.MathUtils.clamp(camPt.y, 4, minimapCanvas.height - 4)
  );
  minimapCtx.rotate(angle);

  minimapCtx.beginPath();
  minimapCtx.moveTo(0, 0);
  minimapCtx.arc(0, 0, 18, -0.45, 0.45);
  minimapCtx.closePath();
  minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  minimapCtx.fill();

  minimapCtx.beginPath();
  minimapCtx.arc(0, 0, 3.2, 0, Math.PI * 2);
  minimapCtx.fillStyle = '#ffffff';
  minimapCtx.fill();
  minimapCtx.restore();
}

// =========================================================================
// 8. 3D -> 2D SMART HOTSPOT PROJECTION (Occlusion + De-Overlap + HUD Safe)
// =========================================================================
const projVec = new THREE.Vector3();
const anchorVec = new THREE.Vector3();
const sampleVec = new THREE.Vector3();

function isOccludedByTerrain(camPos, targetPos) {
  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    sampleVec.lerpVectors(camPos, targetPos, t);
    const th = getTerrainHeight(sampleVec.x, sampleVec.z);
    if (th > sampleVec.y + 1.8) return true;
  }
  return false;
}

function updateHotspots() {
  if (cinemaMode) return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  const cardOpen = !infoCard.classList.contains('hidden');
  const cardRect = cardOpen ? infoCard.getBoundingClientRect() : null;
  const minimapEl = document.getElementById('minimap-wrap');
  const mapRect = minimapEl && minimapEl.offsetWidth > 0 ? minimapEl.getBoundingClientRect() : null;

  const visibleList = [];

  hotspotEls.forEach(({ el, lm }) => {
    anchorVec.set(
      lm.position[0] + lm.markerOffset[0],
      lm.position[1] + lm.markerOffset[1],
      lm.position[2] + lm.markerOffset[2]
    );
    const camDist = camera.position.distanceTo(anchorVec);
    projVec.copy(anchorVec).project(camera);

    const isActive = lm.id === activeLandmarkId;
    const isInFront = projVec.z < 1.0 && projVec.z > -1.0;
    const x = (projVec.x * 0.5 + 0.5) * w;
    const y = (-projVec.y * 0.5 + 0.5) * h;

    // Hide offscreen, behind camera, or clipped by top/bottom HUD bars
    if (!isInFront || x < 48 || x > w - 48 || y < 86 || y > h - 88) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    // Hide distant background pins occluded behind mountains (e.g., Maracanã behind Corcovado)
    if (!isActive && isOccludedByTerrain(camera.position, anchorVec)) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    // Hide pins colliding with open left Info Card
    const halfPillW = 86;
    if (
      cardRect &&
      x + halfPillW > cardRect.left - 12 &&
      x - halfPillW < cardRect.right + 14 &&
      y > cardRect.top - 14 &&
      y - 34 < cardRect.bottom + 14
    ) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    // Hide pins colliding with bottom-right Mini-Map
    if (
      mapRect &&
      x + halfPillW > mapRect.left - 8 &&
      x - halfPillW < mapRect.right + 8 &&
      y > mapRect.top - 8 &&
      y - 34 < mapRect.bottom + 8
    ) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    visibleList.push({ el, lm, x, y, isActive, camDist });
  });

  // Sort top-to-bottom and gently spread overlapping pills so every label is legible
  visibleList.sort((a, b) => a.y - b.y);
  for (let i = 0; i < visibleList.length; i++) {
    const curr = visibleList[i];
    for (let j = 0; j < i; j++) {
      const prev = visibleList[j];
      if (Math.abs(curr.x - prev.x) < 146 && Math.abs(curr.y - prev.y) < 34) {
        curr.y = prev.y + 36;
      }
    }
    curr.y = Math.min(h - 92, Math.max(92, curr.y));
  }

  for (const item of visibleList) {
    const opacity = item.isActive && item.camDist < 24 ? 0.9 : 1.0;
    item.el.style.opacity = String(opacity);
    item.el.style.pointerEvents = 'auto';
    item.el.style.transform = `translate(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px) translate(-50%, -100%)`;
  }
}

// =========================================================================
// 9. RESIZE & MAIN ANIMATION LOOP
// =========================================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  oceanUniforms.uTime.value += dt;
  atmosphere.update(dt, oceanUniforms, buildingMat, landmarksWorld.setNightFactor);
  landmarksWorld.update(dt);
  bridge.update(dt);
  camCtrl.update(dt);

  // Guided Tour progression
  if (tourRunning) {
    tourElapsed += dt;
    const pct = Math.min(100, (tourElapsed / TOUR_STAY_SECONDS) * 100);
    tourProgressFill.style.width = `${pct}%`;

    if (tourElapsed >= TOUR_STAY_SECONDS) {
      tourElapsed = 0;
      tourIndex = (tourIndex + 1) % LANDMARKS.length;
      selectLandmark(LANDMARKS[tourIndex].id, 2.25);
    }
  }

  renderer.render(scene, camera);
  updateHotspots();
  drawMinimap();
}

animate();

// Fade out splash screen cleanly after first frame renders
requestAnimationFrame(() => {
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
  }, 420);
});
