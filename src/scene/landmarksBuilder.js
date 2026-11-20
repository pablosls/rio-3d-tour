import * as THREE from 'three';
import { getTerrainHeight } from './terrain.js';
import {
  createCopacabanaTexture,
  createPitchTexture,
  createSelaronTexture,
  createSparkTexture,
} from './textures.js';

export function createLandmarks(scene) {
  const root = new THREE.Group();
  const updaters = [];
  const nightLights = []; // { light, maxIntensity } or { mat, maxEmissive }
  const clickableTargets = []; // { mesh, landmarkId }

  // Helper to tag meshes for raycasting
  const registerClickable = (obj, landmarkId) => {
    obj.traverse((child) => {
      if (child.isMesh) {
        child.userData.landmarkId = landmarkId;
        clickableTargets.push(child);
      }
    });
  };

  // =========================================================================
  // 1. CRISTO REDENTOR (Corcovado Summit at -14, 38, -6)
  // =========================================================================
  {
    const g = new THREE.Group();
    const baseY = getTerrainHeight(-14, -6);
    g.position.set(-14, baseY, -6);
    g.rotation.y = Math.PI * 0.42; // Faces East/Southeast over Guanabara Bay & Copacabana

    const stoneMat = new THREE.MeshStandardMaterial({
      color: '#ebe7de',
      roughness: 0.68,
      metalness: 0.05,
    });
    const soapstoneMat = new THREE.MeshStandardMaterial({
      color: '#f3efe6',
      roughness: 0.56,
      metalness: 0.06,
      emissive: new THREE.Color('#ffdca8'),
      emissiveIntensity: 0.0,
    });
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: '#8e8a80',
      roughness: 0.85,
    });

    // Circular observation deck & granite terrace
    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.4, 1.6, 24), darkStoneMat);
    terrace.position.y = -0.3;
    terrace.castShadow = true;
    terrace.receiveShadow = true;
    g.add(terrace);

    const railRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.45, 0.12, 8, 32),
      stoneMat
    );
    railRing.rotation.x = Math.PI / 2;
    railRing.position.y = 0.78;
    g.add(railRing);

    // Multi-tiered Art Deco Pedestal
    const ped1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 3.6), stoneMat);
    ped1.position.y = 1.0;
    ped1.castShadow = true;
    ped1.receiveShadow = true;
    g.add(ped1);

    const ped2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.5, 2.8), stoneMat);
    ped2.position.y = 2.75;
    ped2.castShadow = true;
    g.add(ped2);

    const pedCap = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.35, 3.15), stoneMat);
    pedCap.position.y = 4.15;
    g.add(pedCap);

    // Sculpted Art Deco Robe & Torso (Lathe profile for graceful folds)
    const robePts = [
      new THREE.Vector2(1.05, 0.0),
      new THREE.Vector2(0.95, 1.8),
      new THREE.Vector2(0.86, 4.2),
      new THREE.Vector2(0.96, 6.2),
      new THREE.Vector2(1.12, 7.6),
      new THREE.Vector2(0.62, 8.2),
      new THREE.Vector2(0.32, 8.5),
    ];
    const robeGeom = new THREE.LatheGeometry(robePts, 14);
    const robe = new THREE.Mesh(robeGeom, soapstoneMat);
    robe.position.y = 4.32;
    robe.scale.set(1.05, 1.0, 0.72);
    robe.castShadow = true;
    g.add(robe);

    // Vertical Art Deco robe pleats
    for (let i = -2; i <= 2; i++) {
      const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 7.2, 0.16), soapstoneMat);
      pleat.position.set(i * 0.28, 7.9, 0.68 - Math.abs(i) * 0.08);
      g.add(pleat);
    }

    // Outstretched Arms (iconic wide Art Deco cross-beam with draped sleeves)
    const armCore = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.78, 0.72), soapstoneMat);
    armCore.position.set(0, 11.45, 0);
    armCore.castShadow = true;
    g.add(armCore);

    // Draped hanging sleeves underneath the arms (characteristic Cristo silhouette!)
    const sleeveShape = new THREE.Shape();
    sleeveShape.moveTo(-4.8, 0);
    sleeveShape.lineTo(4.8, 0);
    sleeveShape.lineTo(3.9, -1.15);
    sleeveShape.quadraticCurveTo(1.8, -0.75, 0.9, -1.65);
    sleeveShape.lineTo(-0.9, -1.65);
    sleeveShape.quadraticCurveTo(-1.8, -0.75, -3.9, -1.15);
    sleeveShape.closePath();

    const sleeveGeom = new THREE.ExtrudeGeometry(sleeveShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    sleeveGeom.translate(0, 0, -0.21);
    const sleeves = new THREE.Mesh(sleeveGeom, soapstoneMat);
    sleeves.position.set(0, 11.15, 0);
    sleeves.castShadow = true;
    g.add(sleeves);

    // Hands at the ends of outstretched arms
    [-5.85, 5.85].forEach((hx) => {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.28), soapstoneMat);
      hand.position.set(hx, 11.45, 0.05);
      g.add(hand);
    });

    // Sculpted Head & Hair (gently tilted forward looking over Rio)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 13.05, 0.14);
    headGroup.rotation.x = 0.22;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 12), soapstoneMat);
    head.scale.set(0.88, 1.18, 0.92);
    head.castShadow = true;
    headGroup.add(head);

    const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.56, 0.95, 10), soapstoneMat);
    hair.position.set(0, -0.1, -0.14);
    headGroup.add(hair);
    g.add(headGroup);

    // Dramatic warm golden uplight for sunset/night
    const cristoLight = new THREE.PointLight('#ffd27d', 0, 32, 1.4);
    cristoLight.position.set(0, 11.5, 4.5);
    g.add(cristoLight);

    nightLights.push({ light: cristoLight, maxIntensity: 24 });
    nightLights.push({ mat: soapstoneMat, maxEmissive: 0.42 });

    registerClickable(g, 'cristo');
    root.add(g);
  }

  // =========================================================================
  // 2. PÃO DE AÇÚCAR & BONDINHO CABLE CAR
  // =========================================================================
  {
    const g = new THREE.Group();

    const p1 = new THREE.Vector3(25.5, getTerrainHeight(25.5, 19.5) + 0.6, 19.5); // Praia Vermelha
    const p2 = new THREE.Vector3(36.0, getTerrainHeight(36.0, 17.0) + 0.5, 17.0); // Morro da Urca
    const p3 = new THREE.Vector3(52.0, getTerrainHeight(52.0, 15.0) + 0.5, 15.0); // Pão de Açúcar

    const stationMat = new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      roughness: 0.18,
      metalness: 0.45,
      emissive: new THREE.Color('#ffda8a'),
      emissiveIntensity: 0.0,
    });
    const darkMetal = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.6 });

    // Build stations on all 3 points
    [
      { pos: p1, w: 3.4, d: 2.6 },
      { pos: p2, w: 4.0, d: 3.0 },
      { pos: p3, w: 3.6, d: 2.8 },
    ].forEach((st) => {
      const sGroup = new THREE.Group();
      sGroup.position.copy(st.pos);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(st.w, 1.1, st.d), stationMat);
      deck.castShadow = true;
      deck.receiveShadow = true;
      sGroup.add(deck);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(st.w + 0.5, 0.28, st.d + 0.4), darkMetal);
      roof.position.y = 1.45;
      roof.castShadow = true;
      sGroup.add(roof);

      const lounge = new THREE.Mesh(new THREE.BoxGeometry(st.w * 0.72, 0.9, st.d * 0.72), glassMat);
      lounge.position.y = 0.85;
      sGroup.add(lounge);

      g.add(sGroup);
    });

    // Build steel catenary cables between stations
    const makeCable = (a, b, sag) => {
      const mid = new THREE.Vector3().lerpVectors(a, b, 0.5);
      mid.y -= sag;
      return new THREE.CatmullRomCurve3([
        a.clone().add(new THREE.Vector3(0, 1.2, 0)),
        mid.add(new THREE.Vector3(0, 1.2, 0)),
        b.clone().add(new THREE.Vector3(0, 1.2, 0)),
      ]);
    };

    const span1 = makeCable(p1, p2, 1.4);
    const span2 = makeCable(p2, p3, 2.2);

    const cableMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.8 });
    [span1, span2].forEach((curve) => {
      [-0.35, 0.35].forEach((zOff) => {
        const offsetPts = curve.getPoints(24).map((pt) => pt.clone().add(new THREE.Vector3(0, 0, zOff)));
        const cCurve = new THREE.CatmullRomCurve3(offsetPts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(cCurve, 28, 0.06, 5, false), cableMat);
        g.add(tube);
      });
    });

    // Build 2 iconic glass-cabin Bondinhos!
    const cabinBodyMat = new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      roughness: 0.15,
      metalness: 0.25,
      emissive: new THREE.Color('#fde68a'),
      emissiveIntensity: 0.15,
    });
    const cabinTrimMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.4, metalness: 0.3 });

    const createBondinho = () => {
      const car = new THREE.Group();
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), darkMetal);
      hanger.position.y = -0.4;
      car.add(hanger);

      const cabin = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.65, 6, 12), cabinBodyMat);
      cabin.rotation.z = Math.PI / 2;
      cabin.position.y = -1.1;
      cabin.castShadow = true;
      car.add(cabin);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 1.14), cabinTrimMat);
      stripe.position.y = -1.25;
      car.add(stripe);
      return car;
    };

    const bondinho1 = createBondinho();
    const bondinho2 = createBondinho();
    g.add(bondinho1, bondinho2);

    // Summit night glow light on Pão de Açúcar
    const paoLight = new THREE.PointLight('#fbbf24', 0, 26, 1.5);
    paoLight.position.copy(p3).add(new THREE.Vector3(0, 3.5, 0));
    g.add(paoLight);

    nightLights.push({ light: paoLight, maxIntensity: 14 });
    nightLights.push({ mat: glassMat, maxEmissive: 0.75 });
    nightLights.push({ mat: cabinBodyMat, maxEmissive: 0.9 });

    // Smooth back-and-forth animation along cables
    let elapsed = 0;
    updaters.push((dt) => {
      elapsed += dt;
      const t1 = 0.5 - 0.45 * Math.cos(elapsed * 0.38);
      const t2 = 0.5 + 0.45 * Math.cos(elapsed * 0.32 + 0.9);
      const pos1 = span1.getPoint(t1);
      const pos2 = span2.getPoint(t2);
      bondinho1.position.set(pos1.x, pos1.y, pos1.z + 0.35);
      bondinho2.position.set(pos2.x, pos2.y, pos2.z - 0.35);
    });

    registerClickable(g, 'pao-de-acucar');
    root.add(g);
  }

  // =========================================================================
  // 3. PRAIA DE COPACABANA, CALÇADÃO & COPACABANA PALACE
  // =========================================================================
  {
    const g = new THREE.Group();

    // Curved Calçadão boardwalk ribbon with authentic wave texture
    const copaTex = createCopacabanaTexture();
    const boardwalkMat = new THREE.MeshStandardMaterial({
      map: copaTex,
      roughness: 0.82,
    });

    const segs = 44;
    const width = 3.2;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const x = -24 + u * 47;
      const zCenter = 27.6 - 0.0085 * x * x;
      const zInner = zCenter - width / 2;
      const zOuter = zCenter + width / 2;
      const yInner = Math.max(0.55, getTerrainHeight(x, zInner) + 0.14);
      const yOuter = Math.max(0.45, getTerrainHeight(x, zOuter) + 0.14);

      positions.push(x, yInner, zInner);
      positions.push(x, yOuter, zOuter);
      uvs.push(u, 0, u, 1);

      if (i < segs) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }

    const bwGeom = new THREE.BufferGeometry();
    bwGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bwGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    bwGeom.setIndex(indices);
    bwGeom.computeVertexNormals();

    const boardwalk = new THREE.Mesh(bwGeom, boardwalkMat);
    boardwalk.receiveShadow = true;
    g.add(boardwalk);

    // Grand Copacabana Palace Art Deco Hotel facing the beach at (0, y, 22.4)
    const palace = new THREE.Group();
    const pY = getTerrainHeight(0, 22.4);
    palace.position.set(0, pY, 22.4);

    const whiteFacade = new THREE.MeshStandardMaterial({ color: '#faf8f2', roughness: 0.62 });
    const warmWindow = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.3,
      emissive: new THREE.Color('#ffd37a'),
      emissiveIntensity: 0.0,
    });
    const roofTile = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.78 });
    const poolMat = new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      roughness: 0.15,
      emissive: new THREE.Color('#22d3ee'),
      emissiveIntensity: 0.15,
    });

    // Main grand block + two flanking symmetrical wings
    const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.4, 3.2), whiteFacade);
    mainBlock.position.y = 2.2;
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    palace.add(mainBlock);

    [-4.2, 4.2].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.6, 4.4), whiteFacade);
      wing.position.set(wx, 2.3, 0.55);
      wing.castShadow = true;
      palace.add(wing);
    });

    // Classical central cornice & pediment
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.35, 3.6), whiteFacade);
    cornice.position.y = 4.55;
    palace.add(cornice);

    const pediment = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.1, 4), roofTile);
    pediment.rotation.y = Math.PI / 4;
    pediment.scale.set(1.6, 1, 0.7);
    pediment.position.set(0, 5.2, 0.4);
    palace.add(pediment);

    // Glowing hotel window strips
    for (let row = 0; row < 3; row++) {
      const wStrip = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.45, 3.28), warmWindow);
      wStrip.position.set(0, 1.2 + row * 1.15, 0);
      palace.add(wStrip);
    }

    // Iconic front turquoise swimming pool
    const pool = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 1.9), poolMat);
    pool.position.set(0, 0.12, 2.4);
    palace.add(pool);

    const copaLight = new THREE.PointLight('#ffcf75', 0, 22, 1.5);
    copaLight.position.set(0, 5.5, 4.5);
    palace.add(copaLight);

    nightLights.push({ light: copaLight, maxIntensity: 14 });
    nightLights.push({ mat: warmWindow, maxEmissive: 0.95 });
    nightLights.push({ mat: poolMat, maxEmissive: 0.65 });

    g.add(palace);

    // Colorful beach umbrellas dotting Copacabana & Ipanema sands!
    const umbrellaColors = ['#ef4444', '#facc15', '#0ea5e9', '#10b981', '#f97316', '#ec4899', '#ffffff'];
    const uPoleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.85, 5);
    const uTopGeom = new THREE.ConeGeometry(0.65, 0.32, 7);
    const uPoleMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0' });

    let uSeed = 321;
    const uRand = () => {
      uSeed = (uSeed * 16807) % 2147483647;
      return (uSeed - 1) / 2147483646;
    };

    for (let i = 0; i < 42; i++) {
      const ux = -22 + uRand() * 44;
      const shore = 31.0 - 0.0085 * ux * ux;
      const uz = shore - 0.8 - uRand() * 2.2;
      const uy = getTerrainHeight(ux, uz);
      if (uy < 0.05) continue;

      const uGroup = new THREE.Group();
      uGroup.position.set(ux, uy, uz);

      const pole = new THREE.Mesh(uPoleGeom, uPoleMat);
      pole.position.y = 0.42;
      uGroup.add(pole);

      const top = new THREE.Mesh(
        uTopGeom,
        new THREE.MeshStandardMaterial({
          color: umbrellaColors[i % umbrellaColors.length],
          roughness: 0.65,
        })
      );
      top.position.y = 0.85;
      top.rotation.z = (uRand() - 0.5) * 0.25;
      uGroup.add(top);
      g.add(uGroup);
    }

    registerClickable(g, 'copacabana');
    root.add(g);
  }

  // =========================================================================
  // 4. ARCOS DA LAPA & ANIMATED BONDE DE SANTA TERESA
  // =========================================================================
  {
    const g = new THREE.Group();
    const baseY = getTerrainHeight(22, -22);
    g.position.set(22, baseY, -22);
    g.rotation.y = 0.32;

    const whiteLime = new THREE.MeshStandardMaterial({ color: '#f7f4ec', roughness: 0.72 });
    const trimStone = new THREE.MeshStandardMaterial({ color: '#dfd9cc', roughness: 0.78 });
    const plazaMat = new THREE.MeshStandardMaterial({ color: '#78716c', roughness: 0.9 });

    // Largo da Lapa cobblestone plaza
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 11.0, 0.25, 24), plazaMat);
    plaza.position.y = 0.05;
    plaza.receiveShadow = true;
    g.add(plaza);

    // Double-tier Romanesque Colonial Aqueduct (10 prominent bays)
    const bays = 10;
    const bayW = 1.9;
    const totalLen = bays * bayW;
    const startX = -totalLen / 2;

    // Lower tier pillars & arches
    for (let i = 0; i <= bays; i++) {
      const px = startX + i * bayW;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.6, 1.55), whiteLime);
      pillar.position.set(px, 2.3, 0);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      g.add(pillar);

      if (i < bays) {
        // Semicircular lower arch ring
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.26, 8, 14, Math.PI), whiteLime);
        arch.position.set(px + bayW / 2, 4.1, 0);
        arch.scale.set(1, 1, 2.7);
        g.add(arch);

        // Spandrel wall fill above lower arch
        const spandrel = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.8, 1.48), whiteLime);
        spandrel.position.set(px + bayW / 2, 4.95, 0);
        g.add(spandrel);
      }
    }

    // Middle cornice band
    const midBand = new THREE.Mesh(new THREE.BoxGeometry(totalLen + 1.0, 0.32, 1.85), trimStone);
    midBand.position.set(0, 5.42, 0);
    midBand.castShadow = true;
    g.add(midBand);

    // Upper tier pillars & smaller arches
    for (let i = 0; i <= bays; i++) {
      const px = startX + i * bayW;
      const upPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.5, 1.35), whiteLime);
      upPillar.position.set(px, 6.75, 0);
      upPillar.castShadow = true;
      g.add(upPillar);

      if (i < bays) {
        const upArch = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.2, 8, 14, Math.PI), whiteLime);
        upArch.position.set(px + bayW / 2, 7.65, 0);
        upArch.scale.set(1, 1, 2.9);
        g.add(upArch);
      }
    }

    // Top deck & parapet for the Santa Teresa Tramway
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(totalLen + 1.2, 0.55, 1.7), whiteLime);
    topDeck.position.set(0, 8.65, 0);
    topDeck.castShadow = true;
    g.add(topDeck);

    // Iconic Yellow Bonde de Santa Teresa gliding smoothly across the top!
    const bonde = new THREE.Group();
    const bondeYellow = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.45 });
    const bondeRoof = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 });
    const bondeGlow = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: new THREE.Color('#fde047'),
      emissiveIntensity: 0.45,
    });

    const bBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 1.05), bondeYellow);
    bBase.position.y = 0.4;
    bBase.castShadow = true;
    bonde.add(bBase);

    const bInterior = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.62, 0.82), bondeGlow);
    bInterior.position.y = 0.92;
    bonde.add(bInterior);

    const bTop = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.22, 1.12), bondeRoof);
    bTop.position.y = 1.32;
    bonde.add(bTop);

    bonde.position.set(0, 8.95, 0);
    g.add(bonde);

    // Warm Lapa plaza uplighting at dusk/night
    const lapaLight = new THREE.PointLight('#fbbf24', 0, 24, 1.5);
    lapaLight.position.set(0, 3.8, 3.8);
    g.add(lapaLight);

    nightLights.push({ light: lapaLight, maxIntensity: 18 });
    nightLights.push({ mat: bondeGlow, maxEmissive: 1.1 });

    let bTime = 0;
    updaters.push((dt) => {
      bTime += dt;
      bonde.position.x = Math.sin(bTime * 0.42) * (totalLen * 0.42);
    });

    registerClickable(g, 'arcos-da-lapa');
    root.add(g);
  }

  // =========================================================================
  // 5. ESTÁDIO DO MARACANÃ (-24, 1.8, -42)
  // =========================================================================
  {
    const g = new THREE.Group();
    const baseY = getTerrainHeight(-24, -42);
    g.position.set(-24, baseY, -42);
    g.rotation.y = 0.18;

    const concreteMat = new THREE.MeshStandardMaterial({ color: '#e2e5e9', roughness: 0.72 });
    const roofMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.48,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const seatsBlue = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.75 });
    const seatsYellow = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.75 });
    const floodMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: new THREE.Color('#fefce8'),
      emissiveIntensity: 0.25,
    });

    // Perimeter plaza
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(13.8, 14.2, 0.3, 36),
      new THREE.MeshStandardMaterial({ color: '#a8a29e', roughness: 0.9 })
    );
    plaza.scale.set(1.12, 1, 0.9);
    plaza.receiveShadow = true;
    g.add(plaza);

    // Outer stadium oval bowl (elliptical scale)
    const bowlGroup = new THREE.Group();
    bowlGroup.scale.set(1.15, 1, 0.9);

    const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(11.4, 10.6, 3.8, 40, 1, true), concreteMat);
    outerWall.position.y = 2.0;
    outerWall.castShadow = true;
    outerWall.receiveShadow = true;
    bowlGroup.add(outerWall);

    // Rhythmic exterior concrete buttress ribs (iconic Maracanã silhouette!)
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.1, 0.95), concreteMat);
      rib.position.set(Math.cos(a) * 11.2, 2.05, Math.sin(a) * 11.2);
      rib.rotation.y = -a + Math.PI / 2;
      rib.castShadow = true;
      bowlGroup.add(rib);
    }

    // Tiered seating rings (Brazilian blue & yellow seats!)
    const lowerStands = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 6.8, 1.8, 36, 1, true), seatsBlue);
    lowerStands.position.y = 1.1;
    bowlGroup.add(lowerStands);

    const upperStands = new THREE.Mesh(new THREE.CylinderGeometry(10.8, 9.2, 1.7, 36, 1, true), seatsYellow);
    upperStands.position.y = 2.65;
    bowlGroup.add(upperStands);

    // Iconic tensioned elliptical white roof ring overhanging the seating bowl
    const roofRing = new THREE.Mesh(new THREE.RingGeometry(6.8, 11.8, 40), roofMat);
    roofRing.rotation.x = -Math.PI / 2;
    roofRing.position.y = 4.05;
    roofRing.castShadow = true;
    bowlGroup.add(roofRing);

    // Inner glowing floodlight ring around roof opening
    const lightRing = new THREE.Mesh(new THREE.TorusGeometry(6.95, 0.16, 8, 40), floodMat);
    lightRing.rotation.x = Math.PI / 2;
    lightRing.position.y = 3.92;
    bowlGroup.add(lightRing);

    g.add(bowlGroup);

    // Lush striped soccer pitch inside the bowl!
    const pitchTex = createPitchTexture();
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(13.8, 9.6),
      new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.85 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.28;
    pitch.receiveShadow = true;
    g.add(pitch);

    // Stadium night floodlight illumination
    const pitchLight = new THREE.PointLight('#f0fdf4', 0, 32, 1.3);
    pitchLight.position.set(0, 7.5, 0);
    g.add(pitchLight);

    nightLights.push({ light: pitchLight, maxIntensity: 30 });
    nightLights.push({ mat: floodMat, maxEmissive: 1.5 });

    registerClickable(g, 'maracana');
    root.add(g);
  }

  // =========================================================================
  // 6. MUSEU DO AMANHÃ (Praça Mauá Pier at 43, 1.4, -33)
  // =========================================================================
  {
    const g = new THREE.Group();
    g.position.set(43, 1.3, -33);
    g.rotation.y = -0.15;

    const pierMat = new THREE.MeshStandardMaterial({ color: '#d6d3cd', roughness: 0.82 });
    const whiteCalatrava = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.35,
      metalness: 0.14,
      emissive: new THREE.Color('#bae6fd'),
      emissiveIntensity: 0.0,
    });
    const glassCurved = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.15,
      metalness: 0.55,
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 0.08,
    });
    const poolMat = new THREE.MeshStandardMaterial({
      color: '#0891b2',
      roughness: 0.12,
      metalness: 0.25,
      emissive: new THREE.Color('#06b6d4'),
      emissiveIntensity: 0.12,
    });

    // Long Praça Mauá concrete pier extending out into Guanabara Bay
    const pier = new THREE.Mesh(new THREE.BoxGeometry(27, 2.2, 9.6), pierMat);
    pier.position.set(-2, -1.0, 0);
    pier.receiveShadow = true;
    pier.castShadow = true;
    g.add(pier);

    // Flanking turquoise reflecting pools along both sides of the museum
    [-3.5, 3.5].forEach((pz) => {
      const pool = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.18, 1.75), poolMat);
      pool.position.set(-0.5, 0.14, pz);
      g.add(pool);
    });

    // Main futuristic lower exhibition hull (white + blue glass facade)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(15.5, 2.4, 4.4), glassCurved);
    hull.position.set(-0.5, 1.4, 0);
    hull.castShadow = true;
    g.add(hull);

    // Calatrava's dramatic cantilevered skeletal bromeliad roof spine!
    const roofSpine = new THREE.Mesh(new THREE.BoxGeometry(22.5, 0.45, 5.2), whiteCalatrava);
    roofSpine.position.set(1.2, 3.15, 0);
    roofSpine.rotation.z = 0.04;
    roofSpine.castShadow = true;
    g.add(roofSpine);

    // Tapered dramatic front & back cantilevers
    const frontProw = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5.8, 4), whiteCalatrava);
    frontProw.rotation.z = -Math.PI / 2 + 0.06;
    frontProw.rotation.x = Math.PI / 4;
    frontProw.scale.set(0.32, 1.0, 1.25);
    frontProw.position.set(14.5, 3.65, 0);
    frontProw.castShadow = true;
    g.add(frontProw);

    const backProw = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.4, 4), whiteCalatrava);
    backProw.rotation.z = Math.PI / 2;
    backProw.rotation.x = Math.PI / 4;
    backProw.scale.set(0.3, 1.0, 1.15);
    backProw.position.set(-11.4, 2.8, 0);
    g.add(backProw);

    // Articulated white organic solar-panel wing fins along the roof spine!
    const solarFins = [];
    for (let i = -5; i <= 5; i++) {
      const finLen = 4.2 - Math.abs(i) * 0.22;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, finLen), whiteCalatrava);
      fin.position.set(i * 1.65 + 0.6, 3.85 + i * 0.06, 0);
      fin.rotation.x = 0.25;
      fin.castShadow = true;
      g.add(fin);
      solarFins.push({ mesh: fin, idx: i });

      // White structural rib columns angling outward
      [-2.35, 2.35].forEach((sz) => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.1, 0.24), whiteCalatrava);
        rib.position.set(i * 1.65, 1.65, sz);
        rib.rotation.x = sz > 0 ? -0.22 : 0.22;
        g.add(rib);
      });
    }

    const museumLight = new THREE.PointLight('#38bdf8', 0, 26, 1.4);
    museumLight.position.set(3, 5.5, 4);
    g.add(museumLight);

    nightLights.push({ light: museumLight, maxIntensity: 18 });
    nightLights.push({ mat: whiteCalatrava, maxEmissive: 0.28 });
    nightLights.push({ mat: glassCurved, maxEmissive: 0.72 });
    nightLights.push({ mat: poolMat, maxEmissive: 0.5 });

    // Gentle organic solar-fin sun-tracking oscillation
    let finTime = 0;
    updaters.push((dt) => {
      finTime += dt;
      for (const f of solarFins) {
        f.mesh.rotation.x = Math.sin(finTime * 0.65 + f.idx * 0.35) * 0.28;
      }
    });

    registerClickable(g, 'museu-do-amanha');
    root.add(g);
  }

  // =========================================================================
  // 7. ESCADARIA SELARÓN & SANTA TERESA (11, 5.2, -14)
  // =========================================================================
  {
    const g = new THREE.Group();
    const baseY = getTerrainHeight(11, -14);
    g.position.set(11, baseY - 1.2, -14);
    // Ascending up the Santa Teresa hill (-X direction)

    const tileTex = createSelaronTexture();
    const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.45 });
    const redTileMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.42 });

    const steps = 18;
    const stepW = 2.8;
    const stepD = 0.45;
    const stepH = 0.26;

    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepD + 0.08, stepH + 0.14, stepW), tileMat);
      step.position.set((steps / 2 - i) * stepD, i * stepH, 0);
      step.castShadow = true;
      step.receiveShadow = true;
      g.add(step);
    }

    // Iconic crimson-red tiled stepped side walls (balustrades)
    const wallLen = steps * stepD + 1.0;
    const wallAngle = Math.atan2(steps * stepH, steps * stepD);
    [-1.62, 1.62].forEach((wz) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(wallLen, 1.55, 0.45), redTileMat);
      sideWall.position.set(0, (steps * stepH) / 2 + 0.25, wz);
      sideWall.rotation.z = -wallAngle;
      sideWall.castShadow = true;
      g.add(sideWall);
    });

    // Colorful flanking Santa Teresa colonial townhouses framing the alley!
    const alleyHouses = [
      { x: 2.2, y: 1.2, z: -3.4, w: 3.0, h: 3.4, d: 2.8, col: '#f59e0b' },
      { x: -1.4, y: 2.8, z: -3.4, w: 3.2, h: 3.8, d: 2.8, col: '#0ea5e9' },
      { x: 2.0, y: 1.2, z: 3.4, w: 2.8, h: 3.2, d: 2.8, col: '#f43f5e' },
      { x: -1.6, y: 2.9, z: 3.4, w: 3.2, h: 3.6, d: 2.8, col: '#10b981' },
    ];
    alleyHouses.forEach((h) => {
      const house = new THREE.Mesh(
        new THREE.BoxGeometry(h.w, h.h, h.d),
        new THREE.MeshStandardMaterial({ color: h.col, roughness: 0.72 })
      );
      house.position.set(h.x, h.y + h.h / 2 - 1.1, h.z);
      house.castShadow = true;
      house.receiveShadow = true;
      g.add(house);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(h.w + 0.3, 0.35, h.d + 0.3),
        new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.85 })
      );
      roof.position.set(h.x, h.y + h.h - 1.0, h.z);
      g.add(roof);
    });

    // Warm festive string lights crisscrossing above the mosaic steps
    const bulbMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: new THREE.Color('#facc15'),
      emissiveIntensity: 0.4,
    });
    for (let i = 0; i < 6; i++) {
      const bx = 3.0 - i * 1.2;
      const by = 2.6 + i * 0.55;
      for (let j = -1; j <= 1; j++) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), bulbMat);
        bulb.position.set(bx, by - (j === 0 ? 0.18 : 0), j * 0.85);
        g.add(bulb);
      }
    }

    const selaronLight = new THREE.PointLight('#fb923c', 0, 18, 1.5);
    selaronLight.position.set(0.5, 4.8, 0);
    g.add(selaronLight);

    nightLights.push({ light: selaronLight, maxIntensity: 14 });
    nightLights.push({ mat: bulbMat, maxEmissive: 1.5 });

    registerClickable(g, 'selaron');
    root.add(g);
  }

  // =========================================================================
  // 8. LIVING RIO DETAILS: Sailboats, Hang-gliders, Clouds & Night Fireworks
  // =========================================================================

  // --- Sailboats gliding across Guanabara Bay & Copacabana ---
  {
    const hullMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
    const sailMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const sailGeom = new THREE.BufferGeometry();
    sailGeom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0.3, 0, 0, 2.3, 0, 0, 0.4, 1.25], 3)
    );
    sailGeom.computeVertexNormals();

    const boats = [
      { cx: 52, cz: -8, rx: 12, rz: 10, speed: 0.14, phase: 0.0 },
      { cx: 68, cz: 4, rx: 14, rz: 12, speed: 0.11, phase: 2.1 },
      { cx: 58, cz: -24, rx: 10, rz: 8, speed: 0.16, phase: 4.2 },
      { cx: 24, cz: 44, rx: 16, rz: 7, speed: 0.12, phase: 1.3 },
      { cx: -12, cz: 46, rx: 18, rz: 6, speed: 0.10, phase: 3.5 },
      { cx: 74, cz: -38, rx: 14, rz: 12, speed: 0.13, phase: 5.0 },
    ].map((b) => {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.32, 1.9), hullMat);
      hull.position.y = 0.12;
      boat.add(hull);

      const sail = new THREE.Mesh(sailGeom, sailMat);
      sail.castShadow = true;
      boat.add(sail);

      root.add(boat);
      return { ...b, mesh: boat };
    });

    let boatTime = 0;
    updaters.push((dt) => {
      boatTime += dt;
      for (const b of boats) {
        const a = boatTime * b.speed + b.phase;
        const x = b.cx + Math.cos(a) * b.rx;
        const z = b.cz + Math.sin(a) * b.rz;
        const dx = -Math.sin(a) * b.rx;
        const dz = Math.cos(a) * b.rz;
        b.mesh.position.set(x, 0.06 + Math.sin(boatTime * 2.2 + b.phase) * 0.06, z);
        b.mesh.rotation.y = Math.atan2(dx, dz);
        b.mesh.rotation.z = Math.sin(boatTime * 1.6 + b.phase) * 0.06;
      }
    });
  }

  // --- Colorful Hang-gliders (Asa-Delta) soaring over Ipanema & Guanabara Bay ---
  {
    const gliderSpecs = [
      { col: '#f97316', cx: -46, cz: 26, y: 31, r: 12, speed: 0.32, phase: 0.2 },
      { col: '#38bdf8', cx: 56, cz: 30, y: 29, r: 14, speed: 0.28, phase: 2.4 },
    ];
    const gliders = gliderSpecs.map((spec) => {
      const g = new THREE.Group();
      const wingGeom = new THREE.BufferGeometry();
      wingGeom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            0, 0.08, 1.25, -1.65, -0.14, -0.75, 0, 0.04, -0.35,
            0, 0.08, 1.25, 0, 0.04, -0.35, 1.65, -0.14, -0.75,
          ],
          3
        )
      );
      wingGeom.computeVertexNormals();
      const wing = new THREE.Mesh(
        wingGeom,
        new THREE.MeshStandardMaterial({
          color: spec.col,
          roughness: 0.45,
          side: THREE.DoubleSide,
        })
      );
      const keel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5),
        new THREE.MeshStandardMaterial({ color: '#f8fafc' })
      );
      keel.rotation.x = Math.PI / 2;
      keel.position.set(0, -0.02, 0.25);
      g.add(wing, keel);
      root.add(g);
      return { ...spec, mesh: g };
    });

    let gTime = 0;
    updaters.push((dt) => {
      gTime += dt;
      for (const gl of gliders) {
        const a = gTime * gl.speed + gl.phase;
        const x = gl.cx + Math.cos(a) * gl.r;
        const z = gl.cz + Math.sin(a) * gl.r;
        gl.mesh.position.set(x, gl.y + Math.sin(gTime * 1.1 + gl.phase) * 1.1, z);
        gl.mesh.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        gl.mesh.rotation.z = 0.2;
      }
    });
  }

  // --- Soft Stylized Clouds Drifting Over the Bay ---
  {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      transparent: true,
      opacity: 0.84,
    });
    const clouds = [];
    const puffGeom = new THREE.SphereGeometry(1, 10, 8);

    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(puffGeom, cloudMat);
        m.position.set((p - puffs / 2) * 3.4, (p % 2) * 0.9, (p % 3 - 1) * 1.5);
        const s = 2.8 + ((i + p) % 3) * 1.4;
        m.scale.set(s * 1.4, s * 0.65, s);
        c.add(m);
      }
      c.position.set(-130 + i * 21, 68 + (i % 4) * 8, -95 + ((i * 37) % 165));
      root.add(c);
      clouds.push({ mesh: c, speed: 0.6 + (i % 4) * 0.25 });
    }

    updaters.push((dt) => {
      for (const cl of clouds) {
        cl.mesh.position.x += cl.speed * dt;
        if (cl.mesh.position.x > 155) cl.mesh.position.x = -155;
      }
    });
  }

  // --- Copacabana Night Fireworks (Only active in Night mode!) ---
  let currentNightFactor = 0;
  {
    const bursts = [];
    const fwColors = [0xfacc15, 0x38bdf8, 0xf43f5e, 0x4ade80, 0xfb923c];
    const sparkTex = createSparkTexture();

    for (let b = 0; b < 3; b++) {
      const count = 54;
      const positions = new Float32Array(count * 3);
      const dirs = [];
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 4.2 + Math.random() * 4.6;
        dirs.push(
          new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.cos(phi) * speed,
            Math.sin(phi) * Math.sin(theta) * speed
          )
        );
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: fwColors[b % fwColors.length],
        map: sparkTex,
        size: 2.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pts = new THREE.Points(geom, mat);
      root.add(pts);

      bursts.push({
        pts,
        geom,
        mat,
        dirs,
        age: b * 1.15,
        duration: 3.4,
        origin: new THREE.Vector3(-12 + b * 14, 18 + b * 3, 44),
      });
    }

    updaters.push((dt) => {
      const active = currentNightFactor > 0.72;
      for (let b = 0; b < bursts.length; b++) {
        const fw = bursts[b];
        if (!active) {
          fw.mat.opacity = 0;
          continue;
        }
        fw.age += dt;
        if (fw.age > fw.duration) {
          fw.age = 0;
          fw.origin.set(-18 + Math.random() * 38, 19 + Math.random() * 11, 40 + Math.random() * 12);
          fw.mat.color.setHex(fwColors[Math.floor(Math.random() * fwColors.length)]);
        }
        const t = fw.age / fw.duration;
        const pos = fw.geom.attributes.position;
        for (let i = 0; i < fw.dirs.length; i++) {
          const d = fw.dirs[i];
          const ease = 1 - Math.pow(1 - t, 2.2);
          pos.setXYZ(
            i,
            fw.origin.x + d.x * ease,
            fw.origin.y + d.y * ease - 3.8 * t * t,
            fw.origin.z + d.z * ease
          );
        }
        pos.needsUpdate = true;
        fw.mat.opacity = Math.sin(Math.min(1, t) * Math.PI) * (currentNightFactor - 0.65) * 2.5;
      }
    });
  }

  scene.add(root);

  const setNightFactor = (nf) => {
    currentNightFactor = nf;
    for (const item of nightLights) {
      if (item.light) {
        item.light.intensity = item.maxIntensity * nf;
      }
      if (item.mat) {
        item.mat.emissiveIntensity = item.maxEmissive * nf;
      }
    }
  };

  const update = (dt) => {
    for (const fn of updaters) fn(dt);
  };

  return { root, clickableTargets, setNightFactor, update };
}
