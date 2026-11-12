import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
}

const pbrSetCache = new Map<string, PbrTextureSet>();
const singleTexCache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement, srgb = true, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates corrugated Corten steel albedo, bump, and roughness textures for ISO containers.
 */
export function createContainerSideTextures(
  baseColor = '#14365d',
  accentColor = '#e09f3e',
  brand = 'ARLOGS',
  isoCode = 'ARLU 849201 4'
): PbrTextureSet {
  const key = `side:${baseColor}:${accentColor}:${brand}:${isoCode}`;
  const cached = pbrSetCache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);
  const [roughC, rCtx] = makeCanvas(W, H);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);
  rCtx.fillStyle = '#999999';
  rCtx.fillRect(0, 0, W, H);

  const ribPitch = 14;
  for (let x = 14; x < W - 14; x += ribPitch) {
    const grad = ctx.createLinearGradient(x, 0, x + ribPitch, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.34)');
    grad.addColorStop(0.22, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.36)');
    grad.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 14, ribPitch, H - 28);

    const bGrad = bCtx.createLinearGradient(x, 0, x + ribPitch, 0);
    bGrad.addColorStop(0, '#3a3a3a');
    bGrad.addColorStop(0.22, '#e4e4e4');
    bGrad.addColorStop(0.58, '#e4e4e4');
    bGrad.addColorStop(0.82, '#3a3a3a');
    bGrad.addColorStop(1, '#585858');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(x, 14, ribPitch, H - 28);
  }

  ctx.fillStyle = 'rgba(10, 22, 38, 0.55)';
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);
  bCtx.fillStyle = '#d0d0d0';
  bCtx.fillRect(0, 0, W, 13);
  bCtx.fillRect(0, H - 13, W, 13);

  const dirt = ctx.createLinearGradient(0, H * 0.65, 0, H);
  dirt.addColorStop(0, 'rgba(15, 23, 42, 0)');
  dirt.addColorStop(1, 'rgba(15, 23, 42, 0.35)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 160; i++) {
    const sx = (i * 197) % W;
    const sy = (i * 113) % H;
    const sw = 2 + (i % 4);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(sx, sy, sw, 2);
    rCtx.fillStyle = i % 2 === 0 ? '#787878' : '#b8b8b8';
    rCtx.fillRect(sx, sy, sw * 2, 3);
  }

  ctx.fillStyle = 'rgba(12, 31, 56, 0.72)';
  ctx.fillRect(28, 62, 230, 98);
  ctx.fillStyle = accentColor;
  ctx.fillRect(28, 62, 5, 98);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 36px system-ui, -apple-system, sans-serif';
  ctx.fillText(brand, 44, 103);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('40\' HIGH CUBE • LOGÍSTICA INTEGRAL', 44, 123);

  ctx.fillStyle = accentColor;
  ctx.font = '700 16px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(isoCode, 44, 148);

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(374, 72, 104, 66);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 9px ui-monospace, monospace';
  ctx.fillText('MAX GROSS  32,500 KG', 382, 89);
  ctx.fillText('TARE        3,850 KG', 382, 103);
  ctx.fillText('NET        28,650 KG', 382, 117);
  ctx.fillText('CU. CAP     76.4 M3', 382, 131);

  const set: PbrTextureSet = {
    map: toTexture(albedoC, true),
    bumpMap: toTexture(bumpC, false),
    roughnessMap: toTexture(roughC, false)
  };
  pbrSetCache.set(key, set);
  return set;
}

/**
 * Corrugated & gasket-sealed double door texture for the front face of the container.
 */
export function createContainerDoorTextures(baseColor = '#173e6a'): PbrTextureSet {
  const key = `door:${baseColor}`;
  const cached = pbrSetCache.get(key);
  if (cached) return cached;

  const W = 256;
  const H = 256;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);

  for (let y = 28; y < H - 28; y += 32) {
    const grad = ctx.createLinearGradient(0, y, 0, y + 18);
    grad.addColorStop(0, 'rgba(0,0,0,0.32)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.14)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(11, y, W - 22, 18);

    const bGrad = bCtx.createLinearGradient(0, y, 0, y + 18);
    bGrad.addColorStop(0, '#444');
    bGrad.addColorStop(0.3, '#ddd');
    bGrad.addColorStop(0.8, '#444');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(11, y, W - 22, 18);
  }

  ctx.strokeStyle = '#0b1320';
  ctx.lineWidth = 9;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  ctx.fillStyle = '#e09f3e';
  ctx.fillRect(W * 0.6, 36, 68, 22);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 9px system-ui, sans-serif';
  ctx.fillText('PRECINTO ISO', W * 0.6 + 5, 50);

  const doorSet: PbrTextureSet = {
    map: toTexture(albedoC, true),
    bumpMap: toTexture(bumpC, false)
  };
  pbrSetCache.set(key, doorSet);
  return doorSet;
}

/**
 * Marine plywood / cargo container plank floor texture.
 */
export function createWoodFloorTextures(): PbrTextureSet {
  const key = 'woodFloor';
  const cached = pbrSetCache.get(key);
  if (cached) return cached;

  const W = 256;
  const H = 256;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  ctx.fillStyle = '#6c4f35';
  ctx.fillRect(0, 0, W, H);
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, W, H);

  const plankH = 32;
  for (let row = 0; row < H / plankH; row++) {
    const y = row * plankH;
    const shade = (row % 3 - 1) * 10;
    ctx.fillStyle = `rgb(${112 + shade}, ${82 + shade}, ${54 + shade})`;
    ctx.fillRect(0, y + 1, W, plankH - 2);

    for (let g = 0; g < 10; g++) {
      const gy = y + 3 + ((g * 11) % (plankH - 6));
      ctx.fillStyle = g % 2 === 0 ? 'rgba(42,26,14,0.16)' : 'rgba(210,170,120,0.08)';
      ctx.fillRect(0, gy, W, 1);
      bCtx.fillStyle = g % 2 === 0 ? '#707070' : '#a8a8a8';
      bCtx.fillRect(0, gy, W, 1);
    }

    ctx.fillStyle = '#2a1d12';
    ctx.fillRect(0, y, W, 2);
    bCtx.fillStyle = '#202020';
    bCtx.fillRect(0, y, W, 2);
  }

  const woodSet: PbrTextureSet = {
    map: toTexture(albedoC, true, 2, 1),
    bumpMap: toTexture(bumpC, false, 2, 1)
  };
  pbrSetCache.set(key, woodSet);
  return woodSet;
}

/**
 * Freighter aircraft skin with aluminum panel seams, rivets, windows, and ARLOGS stripe.
 */
export function createPlaneFuselageTextures(): PbrTextureSet {
  const key = 'planeFuselage';
  const cached = pbrSetCache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(0.55, '#eef2f6');
  bg.addColorStop(0.72, '#16355b');
  bg.addColorStop(1, '#94a3b8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#d99b38';
  ctx.fillRect(0, H * 0.56, W, 8);

  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
  ctx.lineWidth = 1;
  bCtx.strokeStyle = '#505050';
  bCtx.lineWidth = 1.5;

  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.lineTo(x, H);
    bCtx.stroke();
  }

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.strokeRect(90, 72, 68, 58);

  ctx.fillStyle = '#0f2947';
  ctx.font = '800 17px system-ui, sans-serif';
  ctx.fillText('ARLOGS CARGO', 180, 108);

  for (let wx = 390; wx < 470; wx += 12) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wx, 92, 6, 9);
  }

  const planeSet: PbrTextureSet = {
    map: toTexture(albedoC, true),
    bumpMap: toTexture(bumpC, false)
  };
  pbrSetCache.set(key, planeSet);
  return planeSet;
}

/**
 * Container vessel hull textures: steel plate welding, draft markings, waterline weathering, crest.
 */
export function createShipHullTextures(): PbrTextureSet {
  const key = 'shipHull';
  const cached = pbrSetCache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  ctx.fillStyle = '#16293d';
  ctx.fillRect(0, 0, W, H * 0.58);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, H * 0.56, W, 7);
  ctx.fillStyle = '#8b2626';
  ctx.fillRect(0, H * 0.59, W, H * 0.41);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += 22) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, y, W, 1);
    bCtx.fillStyle = '#555555';
    bCtx.fillRect(0, y, W, 2);
  }
  for (let x = 0; x < W; x += 43) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x, 0, 1, H);
    bCtx.fillStyle = '#606060';
    bCtx.fillRect(x, 0, 1, H);
  }

  for (let i = 0; i < 120; i++) {
    const sx = (i * 73) % W;
    const sy = H * 0.52 + (i % 24);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(200, 150, 110, 0.14)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(sx, sy, 2, 10 + (i % 10));
  }

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 21px system-ui, sans-serif';
  ctx.fillText('ARLOGS PACIFIC', 55, 78);
  ctx.fillStyle = '#e09f3e';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('GUAYAQUIL • IMO 9841207', 55, 98);

  const shipSet: PbrTextureSet = {
    map: toTexture(albedoC, true),
    bumpMap: toTexture(bumpC, false)
  };
  pbrSetCache.set(key, shipSet);
  return shipSet;
}

/**
 * Ship bridge facade with lit navigation room glass.
 */
export function createBridgeFacadeTexture(): THREE.CanvasTexture {
  const key = 'bridgeFacade';
  const cached = singleTexCache.get(key);
  if (cached) return cached;

  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#edf2f7';
  ctx.fillRect(0, 0, 256, 256);

  for (let row = 0; row < 4; row++) {
    const y = 22 + row * 52;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, y + 33, 256, 4);

    for (let col = 0; col < 6; col++) {
      const x = 19 + col * 38;
      const lit = (row + col) % 2 === 0;
      ctx.fillStyle = lit ? '#fbbf24' : '#1e293b';
      ctx.globalAlpha = lit ? 0.85 : 1;
      ctx.fillRect(x, y, 26, 17);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 26, 17);
    }
  }
  const tex = toTexture(c, true);
  singleTexCache.set(key, tex);
  return tex;
}

/**
 * Seamless tangent-space ocean wave normal map generated from periodic directional swells.
 * Produces crisp golden-hour sun sparkles and deep surface facets at 0 runtime CPU cost.
 */
export function createWaterNormalTexture(): THREE.CanvasTexture {
  const key = 'waterNormal';
  const cached = singleTexCache.get(key);
  if (cached) {
    const clone = cached.clone();
    clone.needsUpdate = true;
    return clone;
  }

  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const data = img.data;
  const tau = Math.PI * 2;

  const sampleHeight = (u: number, v: number): number => {
    const a = u * tau;
    const b = v * tau;
    return (
      Math.sin(a * 2 + b * 1) * 0.45 +
      Math.sin(a * -3 + b * 2 + 0.8) * 0.32 +
      Math.cos(a * 5 + b * 4 + 1.7) * 0.18 +
      Math.sin(a * 7 - b * 6 + 2.4) * 0.11 +
      Math.cos(a * 11 + b * 9 + 0.5) * 0.06
    );
  };

  const eps = 1 / S;
  const strength = 2.6;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const hL = sampleHeight(u - eps, v);
      const hR = sampleHeight(u + eps, v);
      const hD = sampleHeight(u, v - eps);
      const hU = sampleHeight(u, v + eps);

      const dx = (hL - hR) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const p = (y * S + x) * 4;
      data[p] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      data[p + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      data[p + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const normalTex = toTexture(c, false, 14, 14);
  singleTexCache.set(key, normalTex);
  const clone = normalTex.clone();
  clone.needsUpdate = true;
  return clone;
}

/**
 * Soft multi-layered volumetric cumulus cloud puff texture (cached once).
 */
export function createCloudLayerTexture(): THREE.CanvasTexture {
  const key = 'cloudPuff';
  const cached = singleTexCache.get(key);
  if (cached) return cached;

  const W = 256;
  const H = 128;
  const [c, ctx] = makeCanvas(W, H);
  ctx.clearRect(0, 0, W, H);

  const puffs: [number, number, number, number, string][] = [
    [128, 72, 74, 28, 'rgba(248, 226, 198, 0.36)'],
    [76, 74, 48, 22, 'rgba(241, 212, 179, 0.32)'],
    [180, 74, 50, 22, 'rgba(241, 212, 179, 0.30)'],
    [110, 56, 44, 26, 'rgba(255, 248, 240, 0.48)'],
    [152, 58, 42, 24, 'rgba(255, 246, 236, 0.44)'],
    [82, 62, 32, 18, 'rgba(232, 241, 250, 0.38)'],
    [176, 62, 34, 18, 'rgba(232, 241, 250, 0.36)']
  ];

  for (const [cx, cy, rx, ry, color] of puffs) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    g.addColorStop(0, color);
    g.addColorStop(0.65, color.replace(/[\d.]+\)$/, '0.14)'));
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = toTexture(c, true);
  singleTexCache.set(key, tex);
  return tex;
}

/**
 * Soft seafoam collar texture around pier / shoreline.
 */
export function createWaterFoamTexture(): THREE.CanvasTexture {
  const key = 'waterFoam';
  const cached = singleTexCache.get(key);
  if (cached) return cached;

  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  ctx.clearRect(0, 0, S, S);

  const grad = ctx.createRadialGradient(S / 2, S / 2, S * 0.25, S / 2, S / 2, S * 0.5);
  grad.addColorStop(0, 'rgba(226, 243, 255, 0)');
  grad.addColorStop(0.55, 'rgba(226, 243, 255, 0.32)');
  grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.16)');
  grad.addColorStop(1, 'rgba(226, 243, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  const tex = toTexture(c, true);
  singleTexCache.set(key, tex);
  return tex;
}

/**
 * Seamless tiled water bump map using a single cached gradient stamp for instant startup.
 */
export function createWaterBumpTexture(): THREE.CanvasTexture {
  const key = 'waterBump';
  const cached = singleTexCache.get(key);
  if (cached) {
    const clone = cached.clone();
    clone.needsUpdate = true;
    return clone;
  }

  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);

  const [lightStamp, lCtx] = makeCanvas(32, 32);
  const lGrad = lCtx.createRadialGradient(16, 16, 1, 16, 16, 16);
  lGrad.addColorStop(0, 'rgba(235,235,235,0.24)');
  lGrad.addColorStop(1, 'rgba(128,128,128,0)');
  lCtx.fillStyle = lGrad;
  lCtx.fillRect(0, 0, 32, 32);

  const [darkStamp, dCtx] = makeCanvas(32, 32);
  const dGrad = dCtx.createRadialGradient(16, 16, 1, 16, 16, 16);
  dGrad.addColorStop(0, 'rgba(35,35,35,0.24)');
  dGrad.addColorStop(1, 'rgba(128,128,128,0)');
  dCtx.fillStyle = dGrad;
  dCtx.fillRect(0, 0, 32, 32);

  for (let i = 0; i < 140; i++) {
    const x = (i * 97) % S;
    const y = (i * 59) % S;
    const w = 22 + (i % 24);
    const h = 7 + (i % 8);
    ctx.drawImage(i % 2 === 0 ? lightStamp : darkStamp, x - w / 2, y - h / 2, w, h);
  }

  const bumpTex = toTexture(c, false, 10, 10);
  singleTexCache.set(key, bumpTex);
  const clone = bumpTex.clone();
  clone.needsUpdate = true;
  return clone;
}

/**
 * Weathered port pier concrete texture with safety striping.
 */
export function createPortPierTextures(): PbrTextureSet {
  const key = 'portPier';
  const cached = pbrSetCache.get(key);
  if (cached) return cached;

  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const [bC, bCtx] = makeCanvas(S, S);

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, S, S);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, S, S);

  for (let i = 0; i < 320; i++) {
    const x = (i * 173) % S;
    const y = (i * 131) % S;
    const v = 45 + (i % 40);
    ctx.fillStyle = `rgb(${v}, ${v + 8}, ${v + 18})`;
    ctx.fillRect(x, y, 2, 2);
    bCtx.fillStyle = i % 2 === 0 ? '#a0a0a0' : '#656565';
    bCtx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, S - 8, S - 8);

  ctx.strokeStyle = 'rgba(224, 159, 62, 0.8)';
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 7]);
  ctx.strokeRect(12, 12, S - 24, S - 24);

  const pierSet: PbrTextureSet = {
    map: toTexture(c, true),
    bumpMap: toTexture(bC, false)
  };
  pbrSetCache.set(key, pierSet);
  return pierSet;
}

/**
 * Rich coastal twilight & golden-hour equirectangular sky dome texture.
 * Horizon band aligns at v = 0.50 with solar bloom at u = 0.74 (-Z forward sea horizon).
 */
export function createSkyDomeTexture(): THREE.CanvasTexture {
  const key = 'skyDomeV2';
  const cached = singleTexCache.get(key);
  if (cached) return cached;

  const W = 1024;
  const H = 512;
  const [c, ctx] = makeCanvas(W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0.0, '#071324');
  sky.addColorStop(0.18, '#0f2847');
  sky.addColorStop(0.32, '#1d4975');
  sky.addColorStop(0.42, '#3a729e');
  sky.addColorStop(0.475, '#89a7bd');
  sky.addColorStop(0.505, '#ebb273');
  sky.addColorStop(0.54, '#c77d56');
  sky.addColorStop(0.59, '#244769');
  sky.addColorStop(0.75, '#0e253e');
  sky.addColorStop(1.0, '#071422');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Warm solar horizon bloom centered ahead (-Z => u ~ 0.74)
  const sunX = W * 0.74;
  const sunY = H * 0.478;
  const corona = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 320);
  corona.addColorStop(0.0, 'rgba(255, 247, 224, 0.92)');
  corona.addColorStop(0.08, 'rgba(255, 214, 150, 0.68)');
  corona.addColorStop(0.28, 'rgba(235, 146, 84, 0.34)');
  corona.addColorStop(0.65, 'rgba(110, 145, 185, 0.10)');
  corona.addColorStop(1.0, 'rgba(15, 40, 71, 0)');
  ctx.fillStyle = corona;
  ctx.fillRect(0, 0, W, H);

  // Subtle high-altitude twilight stars near upper zenith
  for (let i = 0; i < 65; i++) {
    const sx = (i * 157 + 43) % W;
    const sy = 12 + ((i * 71) % 115);
    const alpha = 0.18 + (i % 4) * 0.12;
    const r = i % 5 === 0 ? 1.3 : 0.85;
    ctx.fillStyle = `rgba(226, 240, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Painted sunlit cirrus & cumulus cloud streaks across mid-horizon sky
  for (let i = 0; i < 24; i++) {
    const cx = ((i * 139 + 620) % (W - 120)) + 60;
    const cy = 120 + ((i * 37) % 118);
    const rw = 55 + (i % 5) * 26;
    const rh = 10 + (i % 4) * 5;
    const distFromSun = Math.abs(cx - sunX) / W;
    const warmMix = Math.max(0, 1 - distFromSun * 3.2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, rh / rw);
    const cg = ctx.createRadialGradient(0, 0, rw * 0.08, 0, 0, rw);
    const rCol = Math.round(180 + warmMix * 75);
    const gCol = Math.round(196 + warmMix * 32);
    const bCol = Math.round(220 - warmMix * 38);
    cg.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, ${0.22 + warmMix * 0.18})`);
    cg.addColorStop(0.55, `rgba(${rCol - 28}, ${gCol - 20}, ${bCol - 8}, 0.11)`);
    cg.addColorStop(1, 'rgba(29, 73, 117, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, rw, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const skyTex = toTexture(c, true);
  skyTex.wrapS = THREE.RepeatWrapping;
  singleTexCache.set(key, skyTex);
  return skyTex;
}
