import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getTerrainHeight } from './terrain.js';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function createCameraController(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.rotateSpeed = 0.72;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.75;
  controls.minDistance = 8;
  controls.maxDistance = 175;
  controls.maxPolarAngle = Math.PI * 0.475; // Never dip below water horizon
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.45;

  let flight = null;
  let userInteractedCallback = null;

  controls.addEventListener('start', () => {
    // Cancel active flight immediately if the user grabs the camera
    if (flight) {
      flight = null;
    }
    if (userInteractedCallback) {
      userInteractedCallback();
    }
  });

  const flyTo = (posArray, targetArray, duration = 1.9, onComplete = null) => {
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...posArray);
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(...targetArray);

    const dist = startPos.distanceTo(endPos);
    const arcHeight = Math.min(26, dist * 0.22);

    flight = {
      startPos,
      endPos,
      startTarget,
      endTarget,
      arcHeight,
      duration: Math.max(0.8, Math.min(2.6, duration)),
      elapsed: 0,
      onComplete,
    };
  };

  const setAutoRotate = (enabled) => {
    controls.autoRotate = enabled;
  };

  const onUserInteract = (cb) => {
    userInteractedCallback = cb;
  };

  const update = (dt) => {
    if (flight) {
      flight.elapsed += dt;
      const rawT = Math.min(1, flight.elapsed / flight.duration);
      const t = easeInOutCubic(rawT);

      camera.position.lerpVectors(flight.startPos, flight.endPos, t);
      // Graceful parabolic elevation arc so camera flies smoothly over Rio's hills
      camera.position.y += Math.sin(rawT * Math.PI) * flight.arcHeight;
      controls.target.lerpVectors(flight.startTarget, flight.endTarget, t);

      if (rawT >= 1) {
        const done = flight.onComplete;
        flight = null;
        if (done) done();
      }
    }

    controls.update();

    // Prevent camera from dipping below terrain or ocean surface
    const groundY = Math.max(0, getTerrainHeight(camera.position.x, camera.position.z));
    if (camera.position.y < groundY + 2.4) {
      camera.position.y = groundY + 2.4;
    }
  };

  return {
    controls,
    flyTo,
    setAutoRotate,
    onUserInteract,
    update,
  };
}
