import * as THREE from 'three';

export function createCopacabanaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, 512, 512);

  // Classic wavy black-and-white Portuguese pavement pattern of Copacabana
  const bands = 6;
  const bandHeight = canvas.height / bands;

  for (let b = -1; b <= bands + 1; b++) {
    if (b % 2 !== 0) continue;
    ctx.beginPath();
    const baseY = b * bandHeight;
    for (let x = 0; x <= 512; x += 4) {
      const y = baseY + Math.sin((x / 512) * Math.PI * 4) * (bandHeight * 0.48);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = 512; x >= 0; x -= 4) {
      const y = baseY + bandHeight * 0.85 + Math.sin((x / 512) * Math.PI * 4) * (bandHeight * 0.48);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#1f2329';
    ctx.fill();
  }

  // Subtle cobblestone grain
  ctx.fillStyle = 'rgba(120, 115, 105, 0.08)';
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 1.3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createSelaronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d9d4c7';
  ctx.fillRect(0, 0, 512, 512);

  const palette = [
    '#e11d48', // vibrant red (Selaron signature)
    '#facc15', // Brazil yellow
    '#16a34a', // Brazil green
    '#2563eb', // cobalt blue
    '#f97316', // tropical orange
    '#ffffff', // ceramic white
    '#0ea5e9', // azure
    '#b91c1c', // deep crimson
  ];

  const cols = 16;
  const rows = 16;
  const w = 512 / cols;
  const h = 512 / rows;

  // Deterministic pseudo-random so pattern looks crafted & balanced
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Slight band emphasis of yellow/green/blue/red like the real staircase
      let color = palette[Math.floor(rand() * palette.length)];
      if (r % 5 === 0 && rand() > 0.35) color = '#facc15';
      if (r % 5 === 1 && rand() > 0.4) color = '#16a34a';
      if (r % 5 === 2 && rand() > 0.4) color = '#e11d48';

      ctx.fillStyle = color;
      ctx.fillRect(c * w + 2, r * h + 2, w - 4, h - 4);

      // Little hand-painted ceramic motif on some tiles
      if (rand() > 0.65) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(c * w + w / 2, r * h + h / 2, w * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createPitchTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  // Mowed grass stripes
  const stripes = 12;
  const sw = canvas.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#228b3b' : '#2a9d46';
    ctx.fillRect(i * sw, 0, sw + 1, canvas.height);
  }

  // Crisp white pitch lines
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 4;

  const pad = 28;
  const fw = canvas.width - pad * 2;
  const fh = canvas.height - pad * 2;

  ctx.strokeRect(pad, pad, fw, fh);

  // Center line
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, pad);
  ctx.lineTo(canvas.width / 2, canvas.height - pad);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 42, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Left & Right penalty areas
  const boxW = 68;
  const boxH = 150;
  ctx.strokeRect(pad, (canvas.height - boxH) / 2, boxW, boxH);
  ctx.strokeRect(canvas.width - pad - boxW, (canvas.height - boxH) / 2, boxW, boxH);

  // Goal areas
  const gW = 24;
  const gH = 74;
  ctx.strokeRect(pad, (canvas.height - gH) / 2, gW, gH);
  ctx.strokeRect(canvas.width - pad - gW, (canvas.height - gH) / 2, gW, gH);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createBuildingWindowTextures() {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 256;
  diffCanvas.height = 512;
  const dCtx = diffCanvas.getContext('2d');

  const emitCanvas = document.createElement('canvas');
  emitCanvas.width = 256;
  emitCanvas.height = 512;
  const eCtx = emitCanvas.getContext('2d');

  dCtx.fillStyle = '#dcd9d0';
  dCtx.fillRect(0, 0, 256, 512);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 256, 512);

  const cols = 6;
  const rows = 14;
  const cw = 256 / cols;
  const ch = 512 / rows;

  let seed = 109;
  const rand = () => {
    seed = (seed * 48271) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 6;
      const y = r * ch + 7;
      const w = cw - 12;
      const h = ch - 13;

      dCtx.fillStyle = rand() > 0.25 ? '#485b6e' : '#657a8f';
      dCtx.fillRect(x, y, w, h);

      if (rand() > 0.36) {
        eCtx.fillStyle = rand() > 0.35 ? '#ffd68a' : '#fff2cc';
        eCtx.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
    }
  }

  const map = new THREE.CanvasTexture(diffCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const emissiveMap = new THREE.CanvasTexture(emitCanvas);
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  return { map, emissiveMap };
}

export function createSparkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.28, 'rgba(255, 245, 210, 0.92)');
  grad.addColorStop(0.65, 'rgba(255, 200, 100, 0.32)');
  grad.addColorStop(1.0, 'rgba(255, 180, 50, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

