import * as THREE from 'three';
import { TIME_PRESETS } from '../data/landmarks.js';

export function createAtmosphere(scene, renderer) {
  // 1. Directional Sun / Moon Light with Shadows
  const sunLight = new THREE.DirectionalLight(0xfff8e7, 2.35);
  sunLight.position.set(95, 78, 55);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 320;
  const d = 115;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.00055;
  scene.add(sunLight);

  // 2. Hemisphere Sky / Ground Fill Light
  const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x3f6212, 0.95);
  scene.add(hemiLight);

  // 3. Atmospheric Exponential Fog
  const fog = new THREE.FogExp2(0x9bd6f2, 0.0024);
  scene.fog = fog;

  // 4. Custom GLSL Sky Dome with Sun Disc, Horizon Glow & Twinkling Stars
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0.1, 0.44, 0.84) },
    uHorizonColor: { value: new THREE.Color(0.64, 0.87, 0.98) },
    uSunDir: { value: new THREE.Vector3(95, 78, 55).normalize() },
    uSunGlow: { value: new THREE.Color(1.0, 0.96, 0.84) },
    uNightFactor: { value: 0.0 },
    uTime: { value: 0.0 },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = normalize(wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunGlow;
      uniform float uNightFactor;
      uniform float uTime;
      varying vec3 vDir;

      float hash3(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.52));

        // Sun / Moon atmospheric glow & crisp disc
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float halo = pow(sunDot, 12.0) * 0.48;
        float corona = pow(sunDot, 120.0) * 0.9;
        float disc = smoothstep(0.9982, 0.9994, sunDot) * 1.5;
        col += uSunGlow * (halo + corona + disc);

        // Subtle starry night sky when nightFactor increases
        if (uNightFactor > 0.25 && dir.y > 0.04) {
          vec3 grid = floor(dir * 260.0);
          float s = hash3(grid);
          if (s > 0.994) {
            float twinkle = 0.65 + 0.35 * sin(uTime * 2.8 + s * 200.0);
            float starAlpha = smoothstep(0.25, 0.85, uNightFactor) * smoothstep(0.04, 0.25, dir.y);
            col += vec3(0.92, 0.96, 1.0) * twinkle * starAlpha * 1.1;
          }
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 20), skyMat);
  scene.add(skyDome);

  // Smooth transition state between presets
  const current = {
    sunPos: new THREE.Vector3(...TIME_PRESETS.tarde.sunPos),
    sunColor: new THREE.Color(TIME_PRESETS.tarde.sunColor),
    sunIntensity: TIME_PRESETS.tarde.sunIntensity,
    hemiSky: new THREE.Color(TIME_PRESETS.tarde.hemiSky),
    hemiGround: new THREE.Color(TIME_PRESETS.tarde.hemiGround),
    hemiIntensity: TIME_PRESETS.tarde.hemiIntensity,
    skyTop: new THREE.Color(...TIME_PRESETS.tarde.skyTop),
    skyHorizon: new THREE.Color(...TIME_PRESETS.tarde.skyHorizon),
    fogColor: new THREE.Color(TIME_PRESETS.tarde.fogColor),
    fogDensity: TIME_PRESETS.tarde.fogDensity,
    waterDeep: new THREE.Color(...TIME_PRESETS.tarde.waterDeep),
    waterShallow: new THREE.Color(...TIME_PRESETS.tarde.waterShallow),
    sunGlow: new THREE.Color(...TIME_PRESETS.tarde.sunGlow),
    nightFactor: TIME_PRESETS.tarde.nightFactor,
    exposure: TIME_PRESETS.tarde.exposure,
  };

  let targetPreset = TIME_PRESETS.manha;

  // Apply initial preset immediately (Manhã Carioca for vibrant first impression!)
  const snapToPreset = (presetId) => {
    const p = TIME_PRESETS[presetId] || TIME_PRESETS.manha;
    targetPreset = p;
    current.sunPos.set(...p.sunPos);
    current.sunColor.setHex(p.sunColor);
    current.sunIntensity = p.sunIntensity;
    current.hemiSky.setHex(p.hemiSky);
    current.hemiGround.setHex(p.hemiGround);
    current.hemiIntensity = p.hemiIntensity;
    current.skyTop.setRGB(...p.skyTop);
    current.skyHorizon.setRGB(...p.skyHorizon);
    current.fogColor.setHex(p.fogColor);
    current.fogDensity = p.fogDensity;
    current.waterDeep.setRGB(...p.waterDeep);
    current.waterShallow.setRGB(...p.waterShallow);
    current.sunGlow.setRGB(...p.sunGlow);
    current.nightFactor = p.nightFactor;
    current.exposure = p.exposure;
  };

  const setPreset = (presetId) => {
    if (TIME_PRESETS[presetId]) {
      targetPreset = TIME_PRESETS[presetId];
    }
  };

  const tmpVec = new THREE.Vector3();
  const tmpCol = new THREE.Color();

  const update = (dt, oceanUniforms, buildingMat, setLandmarkNightFactor) => {
    skyUniforms.uTime.value += dt;
    const rate = 1 - Math.exp(-dt * 2.8);
    const p = targetPreset;

    tmpVec.set(...p.sunPos);
    current.sunPos.lerp(tmpVec, rate);

    tmpCol.setHex(p.sunColor);
    current.sunColor.lerp(tmpCol, rate);
    current.sunIntensity = THREE.MathUtils.lerp(current.sunIntensity, p.sunIntensity, rate);

    tmpCol.setHex(p.hemiSky);
    current.hemiSky.lerp(tmpCol, rate);
    tmpCol.setHex(p.hemiGround);
    current.hemiGround.lerp(tmpCol, rate);
    current.hemiIntensity = THREE.MathUtils.lerp(current.hemiIntensity, p.hemiIntensity, rate);

    tmpCol.setRGB(...p.skyTop);
    current.skyTop.lerp(tmpCol, rate);
    tmpCol.setRGB(...p.skyHorizon);
    current.skyHorizon.lerp(tmpCol, rate);

    tmpCol.setHex(p.fogColor);
    current.fogColor.lerp(tmpCol, rate);
    current.fogDensity = THREE.MathUtils.lerp(current.fogDensity, p.fogDensity, rate);

    tmpCol.setRGB(...p.waterDeep);
    current.waterDeep.lerp(tmpCol, rate);
    tmpCol.setRGB(...p.waterShallow);
    current.waterShallow.lerp(tmpCol, rate);
    tmpCol.setRGB(...p.sunGlow);
    current.sunGlow.lerp(tmpCol, rate);

    current.nightFactor = THREE.MathUtils.lerp(current.nightFactor, p.nightFactor, rate);
    current.exposure = THREE.MathUtils.lerp(current.exposure, p.exposure, rate);

    // Apply to lights, sky, fog, ocean & city night lights
    sunLight.position.copy(current.sunPos);
    sunLight.color.copy(current.sunColor);
    sunLight.intensity = current.sunIntensity;

    hemiLight.color.copy(current.hemiSky);
    hemiLight.groundColor.copy(current.hemiGround);
    hemiLight.intensity = current.hemiIntensity;

    fog.color.copy(current.fogColor);
    fog.density = current.fogDensity;

    skyUniforms.uTopColor.value.copy(current.skyTop);
    skyUniforms.uHorizonColor.value.copy(current.skyHorizon);
    skyUniforms.uSunDir.value.copy(current.sunPos).normalize();
    skyUniforms.uSunGlow.value.copy(current.sunGlow);
    skyUniforms.uNightFactor.value = current.nightFactor;

    if (oceanUniforms) {
      oceanUniforms.uSunDir.value.copy(current.sunPos).normalize();
      oceanUniforms.uDeepColor.value.copy(current.waterDeep);
      oceanUniforms.uShallowColor.value.copy(current.waterShallow);
      oceanUniforms.uSunColor.value.copy(current.sunGlow);
      oceanUniforms.uFogColor.value.copy(current.fogColor);
      oceanUniforms.uFogDensity.value = current.fogDensity;
    }

    if (buildingMat) {
      buildingMat.emissiveIntensity = Math.pow(current.nightFactor, 1.15) * 1.15;
    }

    if (setLandmarkNightFactor) {
      setLandmarkNightFactor(current.nightFactor);
    }

    renderer.toneMappingExposure = current.exposure;
  };

  snapToPreset('manha');

  return { setPreset, snapToPreset, update };
}
