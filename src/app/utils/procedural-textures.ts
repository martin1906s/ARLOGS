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
  tex.anisotropy = 4;
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

  const W = 1024;
  const H = 512;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);
  const [roughC, rCtx] = makeCanvas(W, H);

  // Base steel paint
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);

  rCtx.fillStyle = '#999999';
  rCtx.fillRect(0, 0, W, H);

  // Corrugation ribs (trapezoidal ridges)
  const ribPitch = 28;
  for (let x = 28; x < W - 28; x += ribPitch) {
    const grad = ctx.createLinearGradient(x, 0, x + ribPitch, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.34)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.36)');
    grad.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 28, ribPitch, H - 56);

    const bGrad = bCtx.createLinearGradient(x, 0, x + ribPitch, 0);
    bGrad.addColorStop(0, '#3a3a3a');
    bGrad.addColorStop(0.22, '#e4e4e4');
    bGrad.addColorStop(0.58, '#e4e4e4');
    bGrad.addColorStop(0.82, '#3a3a3a');
    bGrad.addColorStop(1, '#585858');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(x, 28, ribPitch, H - 56);
  }

  // Top and bottom structural steel header rails + rivets
  ctx.fillStyle = 'rgba(10, 22, 38, 0.55)';
  ctx.fillRect(0, 0, W, 28);
  ctx.fillRect(0, H - 28, W, 28);
  bCtx.fillStyle = '#d0d0d0';
  bCtx.fillRect(0, 0, W, 26);
  bCtx.fillRect(0, H - 26, W, 26);

  for (let rx = 18; rx < W; rx += 32) {
    [14, H - 14].forEach(ry => {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
      bCtx.fillStyle = '#ffffff';
      bCtx.beginPath();
      bCtx.arc(rx, ry, 3, 0, Math.PI * 2);
      bCtx.fill();
    });
  }

  // Vertical corner posts & subtle grime gradient near bottom
  const dirt = ctx.createLinearGradient(0, H * 0.65, 0, H);
  dirt.addColorStop(0, 'rgba(15, 23, 42, 0)');
  dirt.addColorStop(1, 'rgba(15, 23, 42, 0.35)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, W, H);

  // Subtle surface patina speckles
  for (let i = 0; i < 650; i++) {
    const sx = (i * 197) % W;
    const sy = (i * 113) % H;
    const sw = 2 + (i % 6);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(sx, sy, sw, 2);
    rCtx.fillStyle = i % 2 === 0 ? '#787878' : '#b8b8b8';
    rCtx.fillRect(sx, sy, sw * 2, 4);
  }

  // Stenciled flat graphic plate
  ctx.fillStyle = 'rgba(12, 31, 56, 0.72)';
  ctx.fillRect(58, 125, 455, 195);
  ctx.fillStyle = accentColor;
  ctx.fillRect(58, 125, 10, 195);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 72px system-ui, -apple-system, sans-serif';
  ctx.fillText(brand, 88, 206);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('40\' HIGH CUBE • LOGÍSTICA INTEGRAL', 88, 246);

  ctx.fillStyle = accentColor;
  ctx.font = '700 32px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(isoCode, 88, 296);

  // Spec placard on right side
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(750, 145, 205, 130);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 18px ui-monospace, monospace';
  ctx.fillText('MAX GROSS  32,500 KG', 766, 178);
  ctx.fillText('TARE        3,850 KG', 766, 206);
  ctx.fillText('NET        28,650 KG', 766, 234);
  ctx.fillText('CU. CAP     76.4 M3', 766, 262);

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

  const W = 512;
  const H = 512;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);

  // Horizontal structural ribs on doors
  for (let y = 55; y < H - 55; y += 64) {
    const grad = ctx.createLinearGradient(0, y, 0, y + 36);
    grad.addColorStop(0, 'rgba(0,0,0,0.32)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.14)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(22, y, W - 44, 36);

    const bGrad = bCtx.createLinearGradient(0, y, 0, y + 36);
    bGrad.addColorStop(0, '#444');
    bGrad.addColorStop(0.3, '#ddd');
    bGrad.addColorStop(0.8, '#444');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(22, y, W - 44, 36);
  }

  // Rubber gasket frame
  ctx.strokeStyle = '#0b1320';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, W - 18, H - 18);

  // Hazard/Security seal badge
  ctx.fillStyle = '#e09f3e';
  ctx.fillRect(W * 0.62, 74, 128, 42);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 17px system-ui, sans-serif';
  ctx.fillText('PRECINTO ISO', W * 0.62 + 12, 101);

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

  const W = 512;
  const H = 512;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  ctx.fillStyle = '#6c4f35';
  ctx.fillRect(0, 0, W, H);
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, W, H);

  const plankH = 64;
  for (let row = 0; row < H / plankH; row++) {
    const y = row * plankH;
    const shade = (row % 3 - 1) * 10;
    ctx.fillStyle = `rgb(${112 + shade}, ${82 + shade}, ${54 + shade})`;
    ctx.fillRect(0, y + 2, W, plankH - 3);

    // Wood grain streaks
    for (let g = 0; g < 18; g++) {
      const gy = y + 4 + ((g * 19) % (plankH - 8));
      ctx.fillStyle = g % 2 === 0 ? 'rgba(42,26,14,0.16)' : 'rgba(210,170,120,0.08)';
      ctx.fillRect(0, gy, W, 2);
      bCtx.fillStyle = g % 2 === 0 ? '#707070' : '#a8a8a8';
      bCtx.fillRect(0, gy, W, 2);
    }

    // Seam line
    ctx.fillStyle = '#2a1d12';
    ctx.fillRect(0, y, W, 3);
    bCtx.fillStyle = '#202020';
    bCtx.fillRect(0, y, W, 3);
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

  const W = 1024;
  const H = 512;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(0.55, '#eef2f6');
  bg.addColorStop(0.72, '#16355b');
  bg.addColorStop(1, '#94a3b8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Gold accent cheatline
  ctx.fillStyle = '#d99b38';
  ctx.fillRect(0, H * 0.56, W, 16);

  // Panel grid & rivets
  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
  ctx.lineWidth = 1.5;
  bCtx.strokeStyle = '#505050';
  bCtx.lineWidth = 2;

  for (let x = 0; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.lineTo(x, H);
    bCtx.stroke();
  }
  for (let y = 0; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Forward cargo bay hatch & fuselage lettering
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 145, 135, 115);

  ctx.fillStyle = '#0f2947';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText('ARLOGS CARGO', 360, 215);

  // Subtle porthole windows near cockpit section
  for (let wx = 780; wx < 940; wx += 24) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(wx, 185, 12, 18, 5);
    ctx.fill();
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

  const W = 1024;
  const H = 512;
  const [albedoC, ctx] = makeCanvas(W, H);
  const [bumpC, bCtx] = makeCanvas(W, H);

  // Upper hull slate navy + red anti-fouling lower hull
  ctx.fillStyle = '#16293d';
  ctx.fillRect(0, 0, W, H * 0.58);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, H * 0.56, W, 14);
  ctx.fillStyle = '#8b2626';
  ctx.fillRect(0, H * 0.59, W, H * 0.41);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);

  // Welded steel hull plates
  for (let y = 0; y < H; y += 44) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, y, W, 2);
    bCtx.fillStyle = '#555555';
    bCtx.fillRect(0, y, W, 3);
  }
  for (let x = 0; x < W; x += 86) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x, 0, 2, H);
    bCtx.fillStyle = '#606060';
    bCtx.fillRect(x, 0, 2, H);
  }

  // Salt/rust streaking near waterline
  for (let i = 0; i < 420; i++) {
    const sx = (i * 73) % W;
    const sy = H * 0.52 + (i % 45);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(200, 150, 110, 0.14)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(sx, sy, 3, 18 + (i % 20));
  }

  // Ship Name & Draft Numbers
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 42px system-ui, sans-serif';
  ctx.fillText('ARLOGS PACIFIC', 110, 155);
  ctx.fillStyle = '#e09f3e';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('GUAYAQUIL • IMO 9841207', 110, 195);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 18px ui-monospace, monospace';
  ['12M', '10M', '8M'].forEach((label, i) => {
    ctx.fillText(label, W - 120, 240 + i * 52);
  });

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

  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#edf2f7';
  ctx.fillRect(0, 0, 512, 512);

  // Deck levels & cabin windows
  for (let row = 0; row < 4; row++) {
    const y = 45 + row * 105;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, y + 66, 512, 8);

    for (let col = 0; col < 6; col++) {
      const x = 38 + col * 76;
      const lit = (row + col) % 2 === 0;
      ctx.fillStyle = lit ? '#fbbf24' : '#1e293b';
      ctx.globalAlpha = lit ? 0.85 : 1;
      ctx.fillRect(x, y, 52, 34);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 52, 34);
    }
  }
  const tex = toTexture(c, true);
  singleTexCache.set(key, tex);
  return tex;
}

/**
 * Seamless tiled water bump map for realistic animated surface specular highlights.
 */
export function createWaterBumpTexture(): THREE.CanvasTexture {
  const key = 'waterBump';
  const cached = singleTexCache.get(key);
  if (cached) {
    const clone = cached.clone();
    clone.needsUpdate = true;
    return clone;
  }

  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 520; i++) {
    const x = (i * 97) % S;
    const y = (i * 59) % S;
    const rx = 24 + (i % 34);
    const ry = 7 + (i % 10);
    const grad = ctx.createRadialGradient(x, y, 1, x, y, rx);
    const bright = i % 2 === 0 ? 'rgba(235,235,235,0.22)' : 'rgba(35,35,35,0.22)';
    grad.addColorStop(0, bright);
    grad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = grad;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const [bC, bCtx] = makeCanvas(S, S);

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, S, S);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, S, S);

  for (let i = 0; i < 1600; i++) {
    const x = (i * 173) % S;
    const y = (i * 131) % S;
    const v = 45 + (i % 40);
    ctx.fillStyle = `rgb(${v}, ${v + 8}, ${v + 18})`;
    ctx.fillRect(x, y, 3, 3);
    bCtx.fillStyle = i % 2 === 0 ? '#a0a0a0' : '#656565';
    bCtx.fillRect(x, y, 2, 2);
  }

  // Expansion slabs
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, S - 16, S - 16);

  // Amber port apron safety stripe border
  ctx.strokeStyle = 'rgba(224, 159, 62, 0.8)';
  ctx.lineWidth = 10;
  ctx.setLineDash([28, 14]);
  ctx.strokeRect(24, 24, S - 48, S - 48);

  const pierSet: PbrTextureSet = {
    map: toTexture(c, true),
    bumpMap: toTexture(bC, false)
  };
  pbrSetCache.set(key, pierSet);
  return pierSet;
}

/**
 * Atmospheric coastal dusk sky gradient dome texture (twilight slate blue melting into silver-amber horizon).
 */
export function createSkyDomeTexture(): THREE.CanvasTexture {
  const key = 'skyDome';
  const cached = singleTexCache.get(key);
  if (cached) return cached;

  const [c, ctx] = makeCanvas(1024, 1024);
  const sky = ctx.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0.0, '#0c1b2e');
  sky.addColorStop(0.28, '#163252');
  sky.addColorStop(0.46, '#275077');
  sky.addColorStop(0.56, '#4f7c9e');
  sky.addColorStop(0.63, '#b8946e');
  sky.addColorStop(0.68, '#23425f');
  sky.addColorStop(1.0, '#0a1829');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 1024);

  // Soft horizon glow behind landing corridor
  const glow = ctx.createRadialGradient(512, 625, 20, 512, 625, 420);
  glow.addColorStop(0, 'rgba(245, 194, 128, 0.42)');
  glow.addColorStop(0.45, 'rgba(125, 168, 204, 0.18)');
  glow.addColorStop(1, 'rgba(12, 27, 46, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 200, 1024, 650);

  // Wispy backlit cirrus clouds
  for (let i = 0; i < 28; i++) {
    const cx = (i * 157) % 1024;
    const cy = 360 + (i % 7) * 28;
    const cw = 180 + (i % 5) * 45;
    const ch = 16 + (i % 4) * 6;
    const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, cw);
    cg.addColorStop(0, 'rgba(255, 232, 205, 0.08)');
    cg.addColorStop(1, 'rgba(255, 232, 205, 0)');
    ctx.fillStyle = cg;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ch / cw);
    ctx.beginPath();
    ctx.arc(0, 0, cw, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const skyTex = toTexture(c, true);
  singleTexCache.set(key, skyTex);
  return skyTex;
}

