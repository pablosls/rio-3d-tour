import * as THREE from 'three';
import { createBuildingWindowTextures } from './textures.js';

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function gaussian(dx, dz, rx, rz) {
  return Math.exp(-(dx * dx) / (2 * rx * rx) - (dz * dz) / (2 * rz * rz));
}

// Deterministic subtle fractal noise for natural rock & ridge detail
function hash2(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x, z) {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 3; i++) {
    v += amp * (valueNoise(x * freq, z * freq) - 0.5);
    freq *= 2.05;
    amp *= 0.5;
  }
  return v;
}

/**
 * Returns the exact height of Rio's stylized terrain at world (x, z).
 * Water level is y = 0.
 */
export function getTerrainHeight(x, z) {
  // 1. South Atlantic Coastline (Copacabana crescent + Ipanema)
  let southShoreZ = 31.5;
  if (x > -28 && x < 28) {
    // Copacabana crescent bay curving gently north at its center
    southShoreZ = 31.8 - 0.0085 * x * x;
  } else if (x <= -28) {
    // Ipanema / Leblon stretch curving smoothly west
    southShoreZ = 33.0 - Math.max(0, (-x - 52) * 0.16);
  } else {
    // Leme / Praia Vermelha tip
    southShoreZ = 25.0 - (x - 28) * 0.35;
  }

  // 2. East Guanabara Bay Coastline
  // Curves inward around Botafogo/Flamengo, opens around Centro
  const bayCoastX = 28.5 + Math.sin(z * 0.075) * 4.2 + (z < -28 ? (z + 28) * -0.15 : 0);

  // Land mask from south and east coastlines
  const southLand = 1.0 - smoothstep(southShoreZ - 5.5, southShoreZ + 3.5, z);
  const eastLand = 1.0 - smoothstep(bayCoastX - 5.5, bayCoastX + 4.5, x);
  let baseLandMask = southLand * eastLand;

  // Urca peninsula & Praia Vermelha tongue jutting into Guanabara Bay
  const urcaBridge = gaussian(x - 32, z - 18, 12, 6.2);
  baseLandMask = Math.min(1, baseLandMask + urcaBridge * 0.92);

  // Base urban elevation vs seabed
  let h = -4.2 + baseLandMask * 6.0; // ~1.8 on flat land, -4.2 in open ocean

  // Gentle shoreline slope for Copacabana & Ipanema beaches
  const beachBand = smoothstep(southShoreZ - 11, southShoreZ - 2, z) * (1 - smoothstep(southShoreZ - 1, southShoreZ + 4, z));
  if (x > -68 && x < 24) {
    h = THREE.MathUtils.lerp(h, 0.35 + (southShoreZ - z) * 0.16, beachBand * 0.72);
  }

  // Lagoa Rodrigo de Freitas (scenic inland lagoon behind Ipanema)
  const lagoaDist = Math.hypot((x + 27) / 13.5, (z - 12.5) / 8.8);
  const lagoaMask = 1.0 - smoothstep(0.68, 1.08, lagoaDist);
  h -= lagoaMask * 3.8;

  // --- ICONIC MOUNTAINS ---

  // 1. Corcovado Peak at (-14, -6) with flat summit plateau at y = 38
  const corcoDist = Math.hypot((x + 14) / 15.5, (z + 6) / 14.5);
  if (corcoDist < 2.5) {
    const ridge = Math.exp(-corcoDist * corcoDist * 1.15);
    const summitFlat = 1.0 - smoothstep(0.24, 0.42, corcoDist);
    const peakH = 37.6 * ridge + (fbm(x * 0.12, z * 0.12) * 3.2 * (1 - summitFlat));
    h = Math.max(h, 1.6 + peakH);
    // Clean summit terrace for Cristo Redentor
    if (corcoDist < 0.36) {
      h = THREE.MathUtils.lerp(h, 38.0, 1.0 - smoothstep(0.18, 0.36, corcoDist));
    }
  }

  // 2. Pão de Açúcar monolith at (52, 15) rising steeply from the bay
  const paoDist = Math.hypot((x - 52) / 11.2, (z - 15) / 10.2);
  if (paoDist < 2.2) {
    // Classic sugarloaf dome shape (steep sides, rounded top)
    const dome = Math.pow(Math.max(0, 1.0 - paoDist * 0.74), 1.35);
    const rockNoise = fbm(x * 0.16, z * 0.16) * 2.0 * smoothstep(0.18, 0.55, paoDist);
    const paoH = -3.0 + 31.2 * dome + rockNoise;
    h = Math.max(h, paoH);
    if (paoDist < 0.34) {
      h = THREE.MathUtils.lerp(h, 27.0, 1.0 - smoothstep(0.16, 0.34, paoDist));
    }
  }

  // 3. Morro da Urca at (36, 17)
  const urcaDist = Math.hypot((x - 36) / 9.2, (z - 17) / 8.5);
  if (urcaDist < 2.2) {
    const dome = Math.pow(Math.max(0, 1.0 - urcaDist * 0.78), 1.45);
    const urcaH = -1.5 + 18.5 * dome + fbm(x * 0.18, z * 0.18) * 1.3;
    h = Math.max(h, urcaH);
    if (urcaDist < 0.36) {
      h = THREE.MathUtils.lerp(h, 16.5, 1.0 - smoothstep(0.18, 0.36, urcaDist));
    }
  }

  // 4. Morro Dois Irmãos twin peaks west of Ipanema
  const irmao1 = Math.hypot((x + 74) / 11.5, (z - 22) / 10.5);
  if (irmao1 < 2.2) {
    const dome = Math.pow(Math.max(0, 1.0 - irmao1 * 0.72), 1.55);
    h = Math.max(h, -2.0 + 30.0 * dome + fbm(x * 0.15, z * 0.15) * 2.2);
  }
  const irmao2 = Math.hypot((x + 63) / 9.5, (z - 20) / 9.0);
  if (irmao2 < 2.2) {
    const dome = Math.pow(Math.max(0, 1.0 - irmao2 * 0.74), 1.5);
    h = Math.max(h, -1.5 + 23.0 * dome + fbm(x * 0.15, z * 0.15) * 1.8);
  }

  // 5. Pedra da Gávea dramatic flat-top monolith in the far west
  const gaveaDist = Math.hypot((x + 98) / 17.0, (z + 4) / 15.0);
  if (gaveaDist < 2.2) {
    const raw = Math.pow(Math.max(0, 1.0 - gaveaDist * 0.68), 1.15) * 44.0;
    const flatTop = Math.min(39.0, raw);
    h = Math.max(h, -2.0 + flatTop + fbm(x * 0.1, z * 0.1) * 2.2);
  }

  // 6. Floresta da Tijuca lush mountain range backdrop
  h += 24.0 * gaussian(x + 48, z + 12, 16, 13);
  h += 21.0 * gaussian(x + 68, z + 30, 20, 16);
  h += 17.5 * gaussian(x + 36, z - 2, 10, 9);
  h += 15.0 * gaussian(x + 56, z - 56, 22, 16);
  h += 12.0 * gaussian(x + 12, z + 64, 24, 14);

  // 7. Santa Teresa hillside ridge (gently sloping down to Escadaria Selarón & Lapa)
  const stHill = 9.2 * gaussian(x - 3, z + 15, 11.5, 9.5);
  h += stHill;

  // 8. Distant Niterói hills across the eastern Guanabara Bay (background skyline)
  const niteroiH =
    15.0 * gaussian(x - 135, z + 20, 22, 26) +
    18.0 * gaussian(x - 142, z + 58, 25, 22) +
    12.0 * gaussian(x - 128, z - 25, 18, 20);
  if (x > 96) {
    h = Math.max(h, -4.0 + niteroiH);
  }

  // Natural micro-relief on inland hills only
  if (h > 3.2) {
    h += fbm(x * 0.08, z * 0.08) * 1.6;
  }

  // --- CLEAN FLATTENED PADS FOR URBAN LANDMARKS ---
  // Maracanã Stadium flat basin
  const maraDist = Math.hypot(x + 24, z + 42);
  if (maraDist < 22) {
    h = THREE.MathUtils.lerp(h, 1.8, 1.0 - smoothstep(13.5, 22, maraDist));
  }

  // Arcos da Lapa plaza flat pad
  const lapaDist = Math.hypot(x - 22, z + 22);
  if (lapaDist < 13) {
    h = THREE.MathUtils.lerp(h, 1.8, 1.0 - smoothstep(7.5, 13, lapaDist));
  }

  // Escadaria Selarón gentle sloped pad around (11, -14)
  const selaronDist = Math.hypot(x - 11, z + 14);
  if (selaronDist < 7.5) {
    const targetSlopeY = 5.2 + (11 - x) * 0.42;
    h = THREE.MathUtils.lerp(h, targetSlopeY, 1.0 - smoothstep(3.5, 7.5, selaronDist));
  }

  // Praia Vermelha cable-car base pad
  const pvDist = Math.hypot(x - 25.5, z - 19.5);
  if (pvDist < 6.5) {
    h = THREE.MathUtils.lerp(h, 1.6, 1.0 - smoothstep(3.0, 6.5, pvDist));
  }

  return h;
}

/**
 * Builds the sculpted vertex-colored terrain mesh of Rio de Janeiro.
 */
export function createTerrain() {
  const size = 340;
  const segments = 220;
  const geom = new THREE.PlaneGeometry(size, size, segments, segments);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const cSand = new THREE.Color('#e8d29c');
  const cSeabed = new THREE.Color('#1d4f63');
  const cUrban = new THREE.Color('#8e9399');
  const cGrass = new THREE.Color('#3b7a3e');
  const cJungle = new THREE.Color('#21572c');
  const cGranite = new THREE.Color('#6f6c68');
  const cGraniteLight = new THREE.Color('#8d877f');
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = getTerrainHeight(x, z);
    pos.setY(i, h);
  }

  geom.computeVertexNormals();
  const normals = geom.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = normals.getY(i); // steepness indicator (1 = flat, < 0.7 = cliff)

    if (y < -0.5) {
      tmpColor.copy(cSeabed).lerp(cSand, smoothstep(-3.0, -0.3, y));
    } else if (y < 1.35 && z > 15 && x > -72 && x < 34) {
      // Golden sandy beaches (Copacabana, Ipanema, Praia Vermelha)
      tmpColor.copy(cSand);
    } else if (y < 2.6 && ny > 0.94 && x > -46 && x < 34 && z > -58 && z < 26) {
      // Urban coastal plains (Copacabana, Botafogo, Centro, Maracanã)
      const n = valueNoise(x * 0.14, z * 0.14);
      tmpColor.copy(cUrban).lerp(cGrass, 0.25 + n * 0.25);
    } else {
      // Lush Atlantic rainforest & exposed granite cliffs
      const cliffFactor = 1.0 - smoothstep(0.55, 0.84, ny);
      const altitudeRock = smoothstep(20, 36, y) * 0.55;
      const isPaoDeAcucar = Math.hypot(x - 52, z - 15) < 13.5 ? 0.65 : 0.0;
      const rockMix = Math.min(1, cliffFactor * 0.95 + altitudeRock + isPaoDeAcucar);

      const forestNoise = valueNoise(x * 0.11, z * 0.11);
      tmpColor.copy(cJungle).lerp(cGrass, forestNoise * 0.65);

      const rockTone = cGranite.clone().lerp(cGraniteLight, smoothstep(10, 34, y) * 0.6);
      tmpColor.lerp(rockTone, rockMix);
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Animated GLSL Ocean, Guanabara Bay & Lagoa Rodrigo de Freitas shader.
 */
export function createOcean() {
  const geom = new THREE.PlaneGeometry(820, 820, 150, 150);
  geom.rotateX(-Math.PI / 2);

  // Store terrain height per vertex to compute turquoise shallows & shoreline foam!
  const pos = geom.attributes.position;
  const depths = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const th = getTerrainHeight(x, z);
    depths[i] = Math.max(0, -th);
  }
  geom.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));

  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.6, 0.5, 0.4).normalize() },
    uDeepColor: { value: new THREE.Color(0.02, 0.22, 0.44) },
    uShallowColor: { value: new THREE.Color(0.06, 0.62, 0.68) },
    uSunColor: { value: new THREE.Color(1.0, 0.95, 0.82) },
    uFogColor: { value: new THREE.Color(0x9bd6f2) },
    uFogDensity: { value: 0.0024 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aDepth;
      varying vec3 vWorldPos;
      varying float vDepth;
      varying float vWave;

      void main() {
        vec3 p = position;
        float rDist = length(p.xz);
        float farDamp = 1.0 - smoothstep(140.0, 320.0, rDist);
        float wave1 = sin(p.x * 0.14 + uTime * 1.15) * cos(p.z * 0.11 + uTime * 0.95) * 0.13;
        float wave2 = sin(p.x * 0.32 - p.z * 0.24 + uTime * 1.8) * 0.05;
        float shoreDamp = smoothstep(0.0, 1.2, aDepth);
        p.y += (wave1 + wave2) * (0.35 + 0.65 * shoreDamp) * farDamp;

        vWave = wave1 + wave2;
        vDepth = aDepth;
        vec4 worldPos = modelMatrix * vec4(p, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSunColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec3 vWorldPos;
      varying float vDepth;
      varying float vWave;

      void main() {
        float dist = length(cameraPosition - vWorldPos);
        float rippleFade = 1.0 - smoothstep(90.0, 240.0, dist);

        // Procedural ripple normals for crisp animated water glints (faded smoothly at horizon)
        float nx = (cos(vWorldPos.x * 0.35 + uTime * 1.3) * 0.08
                 + sin(vWorldPos.z * 0.55 - uTime * 1.7) * 0.045) * rippleFade;
        float nz = (sin(vWorldPos.z * 0.38 + uTime * 1.1) * 0.08
                 + cos(vWorldPos.x * 0.50 + uTime * 1.5) * 0.045) * rippleFade;
        vec3 N = normalize(vec3(nx, 1.0, nz));
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uSunDir);
        vec3 H = normalize(L + V);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);
        float shallowMix = 1.0 - smoothstep(0.1, 3.6, vDepth);
        vec3 baseCol = mix(uDeepColor, uShallowColor, shallowMix);

        // Specular sun/moon sparkle path across the bay
        float spec = pow(max(dot(N, H), 0.0), 110.0) * 1.35 * (0.25 + 0.75 * rippleFade);
        float broadSpec = pow(max(dot(N, H), 0.0), 16.0) * 0.20;

        // Animated shoreline surf foam
        float foamWave = sin(vDepth * 9.0 - uTime * 2.8 + vWorldPos.x * 0.25) * 0.5 + 0.5;
        float shoreFoam = (1.0 - smoothstep(0.05, 0.85, vDepth)) * (0.45 + 0.55 * foamWave) * rippleFade;

        vec3 col = baseCol;
        col = mix(col, uSunColor * 0.65 + uShallowColor * 0.35, fresnel * 0.42);
        col += uSunColor * (spec + broadSpec);
        col = mix(col, vec3(0.94, 0.97, 1.0), clamp(shoreFoam * 0.72, 0.0, 0.85));

        // Seamless horizon blend into sky/fog (eliminates any visible ocean edge!)
        float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        float horizonBlend = smoothstep(155.0, 340.0, length(vWorldPos.xz));
        col = mix(col, uFogColor, clamp(max(fogFactor, horizonBlend), 0.0, 1.0));

        float edgeFade = 1.0 - smoothstep(320.0, 405.0, length(vWorldPos.xz));
        float alpha = smoothstep(0.0, 0.22, vDepth + 0.16);
        gl_FragColor = vec4(col, clamp(0.88 + alpha * 0.10, 0.78, 0.98) * edgeFade);
      }
    `,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0.0;
  return { mesh, uniforms };
}

/**
 * Generates Rio's iconic urban skyline (Copacabana, Botafogo, Centro, Santa Teresa)
 * with emissive night window lights.
 */
export function createCityscape() {
  const group = new THREE.Group();
  const { map, emissiveMap } = createBuildingWindowTextures();

  const buildingMat = new THREE.MeshStandardMaterial({
    map,
    emissive: new THREE.Color('#ffcf75'),
    emissiveMap,
    emissiveIntensity: 0.0,
    roughness: 0.72,
    metalness: 0.12,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: '#c7c2b8',
    roughness: 0.85,
  });

  // Landmark exclusion zones so city buildings never collide with hero landmarks
  const exclusions = [
    { x: -14, z: -6, r: 19 }, // Corcovado
    { x: 52, z: 15, r: 16 }, // Pão de Açúcar
    { x: 36, z: 17, r: 12 }, // Morro da Urca
    { x: 0, z: 22.5, r: 8.5 }, // Copacabana Palace
    { x: 22, z: -22, r: 11.5 }, // Arcos da Lapa
    { x: -24, z: -42, r: 17.5 }, // Maracanã
    { x: 43, z: -33, r: 16 }, // Museu do Amanhã
    { x: 11, z: -14, r: 7.5 }, // Escadaria Selarón
    { x: -27, z: 12.5, r: 14.5 }, // Lagoa
  ];

  const isClear = (x, z) => {
    for (const ex of exclusions) {
      if (Math.hypot(x - ex.x, z - ex.z) < ex.r) return false;
    }
    return true;
  };

  let seed = 777;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const boxes = [];

  // 1. Copacabana beachfront skyline along Av. Atlântica (excluding Copacabana Palace)
  for (let x = -22; x <= 20; x += 3.1) {
    const zBase = 23.2 - 0.0085 * x * x;
    for (let row = 0; row < 2; row++) {
      const bx = x + (rand() - 0.5) * 0.9;
      const bz = zBase - row * 3.8 - 1.2;
      if (!isClear(bx, bz)) continue;
      const h = getTerrainHeight(bx, bz);
      if (h < 1.1 || h > 4.2) continue;
      boxes.push({
        x: bx,
        y: h,
        z: bz,
        w: 1.8 + rand() * 1.1,
        h: 4.5 + rand() * 4.2,
        d: 1.8 + rand() * 1.1,
        rot: (rand() - 0.5) * 0.15,
      });
    }
  }

  // 2. Ipanema & Leblon chic residential buildings
  for (let x = -54; x <= -28; x += 3.4) {
    const bx = x + (rand() - 0.5) * 0.9;
    const bz = 26.8 + (rand() - 0.5) * 2.2;
    if (!isClear(bx, bz)) continue;
    const h = getTerrainHeight(bx, bz);
    if (h < 1.0 || h > 4.0) continue;
    boxes.push({
      x: bx,
      y: h,
      z: bz,
      w: 1.8 + rand() * 1.0,
      h: 3.6 + rand() * 3.5,
      d: 1.8 + rand() * 1.0,
      rot: 0,
    });
  }

  // 3. Centro & Botafogo skyline (taller modern office towers!)
  for (let i = 0; i < 85; i++) {
    const bx = -8 + rand() * 36;
    const bz = -52 + rand() * 62;
    if (!isClear(bx, bz)) continue;
    const h = getTerrainHeight(bx, bz);
    if (h < 1.1 || h > 4.2) continue;
    const isCentro = bz < -20 && bx > 12;
    const bh = isCentro ? 6.0 + rand() * 8.5 : 3.2 + rand() * 4.5;
    boxes.push({
      x: bx,
      y: h,
      z: bz,
      w: 1.7 + rand() * 1.5,
      h: bh,
      d: 1.7 + rand() * 1.5,
      rot: (rand() - 0.5) * 0.2,
    });
  }

  // 4. Neighborhood blocks around Maracanã & Tijuca flatlands
  for (let i = 0; i < 55; i++) {
    const bx = -46 + rand() * 44;
    const bz = -62 + rand() * 38;
    if (!isClear(bx, bz)) continue;
    const h = getTerrainHeight(bx, bz);
    if (h < 1.2 || h > 4.0) continue;
    boxes.push({
      x: bx,
      y: h,
      z: bz,
      w: 1.8 + rand() * 1.6,
      h: 2.5 + rand() * 3.8,
      d: 1.8 + rand() * 1.6,
      rot: (rand() - 0.5) * 0.3,
    });
  }

  // Build instanced city towers for ultra-fast rendering
  const boxGeom = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(boxGeom, buildingMat, boxes.length);
  inst.castShadow = true;
  inst.receiveShadow = true;

  const capGeom = new THREE.BoxGeometry(1.04, 0.18, 1.04);
  const caps = new THREE.InstancedMesh(capGeom, roofMat, boxes.length);

  const dummy = new THREE.Object3D();
  const tintPalette = [
    new THREE.Color('#f4ede1'),
    new THREE.Color('#e6dfd5'),
    new THREE.Color('#dbe4ec'),
    new THREE.Color('#efe2cf'),
    new THREE.Color('#d2dce6'),
  ];

  boxes.forEach((b, i) => {
    dummy.position.set(b.x, b.y + b.h / 2 - 0.35, b.z);
    dummy.rotation.set(0, b.rot, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, tintPalette[i % tintPalette.length]);

    dummy.position.set(b.x, b.y + b.h - 0.35, b.z);
    dummy.scale.set(b.w, 1, b.d);
    dummy.updateMatrix();
    caps.setMatrixAt(i, dummy.matrix);
  });

  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;

  group.add(inst, caps);

  // 5. Santa Teresa colorful hillside houses
  const houseColors = ['#f59e0b', '#ef4444', '#38bdf8', '#fb7185', '#fef08a', '#34d399', '#f97316'];
  const houses = [];
  for (let i = 0; i < 42; i++) {
    const hx = -6 + rand() * 22;
    const hz = -24 + rand() * 19;
    if (!isClear(hx, hz)) continue;
    const h = getTerrainHeight(hx, hz);
    if (h < 3.0 || h > 11.5) continue;
    houses.push({
      x: hx,
      y: h,
      z: hz,
      w: 1.4 + rand() * 0.9,
      h: 1.5 + rand() * 1.2,
      d: 1.3 + rand() * 0.8,
      rot: rand() * Math.PI,
      col: houseColors[Math.floor(rand() * houseColors.length)],
    });
  }

  const houseMat = new THREE.MeshStandardMaterial({ roughness: 0.78 });
  const houseInst = new THREE.InstancedMesh(boxGeom, houseMat, houses.length);
  houseInst.castShadow = true;
  houseInst.receiveShadow = true;

  houses.forEach((b, i) => {
    dummy.position.set(b.x, b.y + b.h / 2 - 0.45, b.z);
    dummy.rotation.set(0, b.rot, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    houseInst.setMatrixAt(i, dummy.matrix);
    houseInst.setColorAt(i, new THREE.Color(b.col));
  });
  houseInst.instanceMatrix.needsUpdate = true;
  if (houseInst.instanceColor) houseInst.instanceColor.needsUpdate = true;
  group.add(houseInst);

  return { group, buildingMat };
}

/**
 * Populates Floresta da Tijuca rainforest canopy & coastal palm trees.
 */
export function createVegetation() {
  const group = new THREE.Group();
  let seed = 2026;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // --- 1. Tropical Rainforest Trees (Tijuca, Corcovado slopes, Santa Teresa, Lagoa park) ---
  const treePositions = [];
  for (let i = 0; i < 650; i++) {
    const tx = -90 + rand() * 130;
    const tz = -55 + rand() * 88;
    const y = getTerrainHeight(tx, tz);
    if (y < 2.2 || y > 32) continue;

    // Keep immediate landmark footprints & camera sightlines clear
    if (Math.hypot(tx + 14, tz + 6) < 9.5) continue; // Corcovado upper rock & Cristo summit
    if (Math.hypot(tx - 52, tz - 15) < 10.5) continue; // Pão de Açúcar rock
    if (Math.hypot(tx + 24, tz + 42) < 22) continue; // Maracanã stadium & perimeter
    if (tx > -22 && tx < 6 && tz > -42 && tz < -16) continue; // Maracanã camera sightline corridor
    if (Math.hypot(tx - 22, tz + 22) < 12) continue; // Arcos da Lapa
    if (Math.hypot(tx - 11, tz + 14) < 7.5) continue; // Selarón
    if (Math.hypot(tx - 43, tz + 33) < 15) continue; // Museu do Amanhã

    // Prefer forested slopes & parks (never on sheer cliffs)
    const slopeCheck =
      Math.abs(getTerrainHeight(tx + 1, tz) - y) +
      Math.abs(getTerrainHeight(tx, tz + 1) - y);
    if (slopeCheck > 1.75) continue;

    if (y > 4.2 || Math.hypot(tx + 27, tz - 12.5) < 17) {
      treePositions.push({ x: tx, y, z: tz, s: 0.75 + rand() * 1.15 });
    }
  }

  const canopyGeom = new THREE.IcosahedronGeometry(1.45, 1);
  const canopyMat = new THREE.MeshStandardMaterial({
    roughness: 0.86,
    metalness: 0.02,
    flatShading: true,
  });
  const canopyInst = new THREE.InstancedMesh(canopyGeom, canopyMat, treePositions.length);
  canopyInst.castShadow = true;
  canopyInst.receiveShadow = true;

  const trunkGeom = new THREE.CylinderGeometry(0.18, 0.26, 1.4, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.95 });
  const trunkInst = new THREE.InstancedMesh(trunkGeom, trunkMat, treePositions.length);

  const greens = ['#1f6e38', '#2a8042', '#17542b', '#358c44', '#226630'];
  const dummy = new THREE.Object3D();

  treePositions.forEach((t, i) => {
    dummy.position.set(t.x, t.y + 0.55 * t.s, t.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(t.x, t.y + 1.65 * t.s, t.z);
    dummy.scale.set(t.s * 1.15, t.s * 0.9, t.s * 1.15);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(i, dummy.matrix);
    canopyInst.setColorAt(i, new THREE.Color(greens[i % greens.length]));
  });

  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
  trunkInst.instanceMatrix.needsUpdate = true;
  group.add(trunkInst, canopyInst);

  // --- 2. Coastal Palm Trees along Copacabana, Ipanema & Lagoa ---
  const palmSpots = [];
  // Copacabana boardwalk palms
  for (let x = -23; x <= 21; x += 4.2) {
    const z = 27.1 - 0.0085 * x * x;
    const y = getTerrainHeight(x, z);
    if (y > 0.3) palmSpots.push({ x, y, z, s: 0.9 + rand() * 0.35 });
  }
  // Ipanema beachfront palms
  for (let x = -56; x <= -28; x += 5.0) {
    const z = 29.8;
    const y = getTerrainHeight(x, z);
    if (y > 0.3) palmSpots.push({ x, y, z, s: 0.85 + rand() * 0.35 });
  }
  // Lagoa perimeter palms
  for (let a = 0; a < Math.PI * 2; a += 0.42) {
    const x = -27 + Math.cos(a) * 14.5;
    const z = 12.5 + Math.sin(a) * 9.8;
    const y = getTerrainHeight(x, z);
    if (y > 0.5 && y < 4.0) palmSpots.push({ x, y, z, s: 0.85 + rand() * 0.3 });
  }

  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: '#7c5d41', roughness: 0.9 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: '#2ea043', roughness: 0.72, side: THREE.DoubleSide });

  const pTrunkGeom = new THREE.CylinderGeometry(0.11, 0.22, 3.8, 6);
  const frondGeom = new THREE.ConeGeometry(0.55, 2.2, 4);
  frondGeom.rotateX(Math.PI * 0.42);
  frondGeom.translate(0, 0, 1.0);

  palmSpots.forEach((p) => {
    const palm = new THREE.Group();
    palm.position.set(p.x, p.y - 0.1, p.z);
    palm.scale.setScalar(p.s);

    const tr = new THREE.Mesh(pTrunkGeom, palmTrunkMat);
    tr.position.y = 1.9;
    tr.rotation.z = (rand() - 0.5) * 0.14;
    tr.castShadow = true;
    palm.add(tr);

    const crown = new THREE.Group();
    crown.position.set(tr.rotation.z * -1.8, 3.7, 0);
    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(frondGeom, palmLeafMat);
      frond.rotation.y = (f / 6) * Math.PI * 2 + rand() * 0.3;
      frond.rotation.x = 0.2 + rand() * 0.18;
      crown.add(frond);
    }
    palm.add(crown);
    group.add(palm);
  });

  return group;
}

/**
 * Iconic Ponte Rio-Niterói spanning the northeastern Guanabara Bay horizon.
 */
export function createRioNiteroiBridge() {
  const group = new THREE.Group();
  const bridgeMat = new THREE.MeshStandardMaterial({ color: '#d8dde3', roughness: 0.75 });
  const roadMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.85 });

  // Bridge spans from Porto Maravilha (x = 34, z = -48) toward Niterói (x = 132, z = -56)
  const start = new THREE.Vector3(32, 3.2, -48);
  const end = new THREE.Vector3(134, 3.2, -56);
  const segments = 24;

  const curvePts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(start, end, t);
    // Iconic central shipping channel arch rise
    const arch = Math.exp(-Math.pow((t - 0.52) / 0.16, 2)) * 6.8;
    p.y += arch;
    curvePts.push(p);
  }

  const curve = new THREE.CatmullRomCurve3(curvePts);
  const deckPts = curve.getPoints(48);

  for (let i = 0; i < deckPts.length - 1; i++) {
    const a = deckPts[i];
    const b = deckPts[i + 1];
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const len = a.distanceTo(b);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(len + 0.15, 0.75, 2.4), bridgeMat);
    deck.position.copy(mid);
    deck.lookAt(b);
    deck.rotateY(Math.PI / 2);
    group.add(deck);

    const road = new THREE.Mesh(new THREE.BoxGeometry(len + 0.12, 0.12, 1.9), roadMat);
    road.position.copy(mid).add(new THREE.Vector3(0, 0.4, 0));
    road.lookAt(b.clone().add(new THREE.Vector3(0, 0.4, 0)));
    road.rotateY(Math.PI / 2);
    group.add(road);

    // Concrete piers down into the bay
    if (i % 4 === 0 && i > 0 && i < deckPts.length - 2) {
      const pierH = mid.y + 4.5;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.9, pierH, 1.9), bridgeMat);
      pier.position.set(mid.x, mid.y - pierH / 2 - 0.2, mid.z);
      group.add(pier);
    }
  }

  // Animated car lights cruising along Ponte Rio-Niterói
  const cars = [];
  const headMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#f87171' });
  const carGeom = new THREE.BoxGeometry(0.45, 0.22, 0.28);

  for (let i = 0; i < 14; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const mesh = new THREE.Mesh(carGeom, dir > 0 ? headMat : tailMat);
    group.add(mesh);
    cars.push({
      mesh,
      t: i / 14,
      speed: (0.018 + (i % 3) * 0.004) * dir,
      laneOffset: dir > 0 ? 0.5 : -0.5,
    });
  }

  const update = (dt) => {
    for (const c of cars) {
      c.t = (c.t + c.speed * dt + 1) % 1;
      const pt = curve.getPoint(c.t);
      c.mesh.position.set(pt.x, pt.y + 0.65, pt.z + c.laneOffset);
    }
  };

  return { group, update };
}
