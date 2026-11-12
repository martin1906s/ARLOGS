import * as THREE from 'three';
import {
  createContainerSideTextures,
  createContainerDoorTextures,
  createWoodFloorTextures,
  createPlaneFuselageTextures,
  createShipHullTextures,
  createBridgeFacadeTexture
} from './procedural-textures';

export interface DetailedContainerRefs {
  root: THREE.Group;
  leftDoorPivot: THREE.Group;
  rightDoorPivot: THREE.Group;
  bayLight: THREE.PointLight;
}

export interface DetailedPlaneRefs {
  root: THREE.Group;
  turbineFans: THREE.Object3D[];
  strobeLight: THREE.Mesh;
}

export interface DetailedShipRefs {
  root: THREE.Group;
  radarScanners: THREE.Object3D[];
  beaconMesh: THREE.Mesh;
  wakeMesh: THREE.Mesh;
  bowSpray: THREE.Mesh;
}

/**
 * Generates an HDR-like procedural IBL environment texture using PMREMGenerator
 * so metallic aluminum, Corten steel, brass, glass, and ocean water reflect
 * the coastal twilight sky & warm horizon sun without external HDR files.
 */
export function createCoastalEnvironmentTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();

  // Upper coastal twilight dome + deep sea bounce + horizon glow
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x3f6e99, side: THREE.BackSide })
  );
  envScene.add(skyDome);

  const seaHalf = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ color: 0x0b2036, side: THREE.DoubleSide })
  );
  seaHalf.rotation.x = -Math.PI / 2;
  seaHalf.position.y = -4;
  envScene.add(seaHalf);

  // Bright warm solar horizon card directly ahead (-Z) for glittering ocean sun path & metallic rims
  const warmPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd7a1, side: THREE.DoubleSide })
  );
  warmPanel.position.set(2, 3.2, -16);
  warmPanel.lookAt(0, 0, 0);
  envScene.add(warmPanel);

  // Soft zenith sky fill panel
  const coolPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 12),
    new THREE.MeshBasicMaterial({ color: 0xd4e9ff, side: THREE.DoubleSide })
  );
  coolPanel.position.set(-8, 12, 10);
  coolPanel.lookAt(0, 0, 0);
  envScene.add(coolPanel);

  const rt = pmrem.fromScene(envScene, 0.035);
  [skyDome, seaHalf, warmPanel, coolPanel].forEach(m => {
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  });
  pmrem.dispose();
  return rt.texture;
}

/**
 * Creates a smooth widebody freighter aircraft oriented nose-first along +Z.
 */
export function buildDetailedCargoPlane(enableShadows = true): DetailedPlaneRefs {
  const root = new THREE.Group();
  root.name = 'plane';
  const turbineFans: THREE.Object3D[] = [];

  const fuseTex = createPlaneFuselageTextures();
  const skinMat = new THREE.MeshStandardMaterial({
    map: fuseTex.map,
    bumpMap: fuseTex.bumpMap,
    bumpScale: 0.09,
    metalness: 0.58,
    roughness: 0.24,
    envMapIntensity: 1.25
  });
  const navyMat = new THREE.MeshStandardMaterial({
    color: 0x102a49,
    metalness: 0.65,
    roughness: 0.3,
    envMapIntensity: 1.1
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xe6ecf2,
    metalness: 0.64,
    roughness: 0.26,
    envMapIntensity: 1.2
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.96,
    roughness: 0.08,
    envMapIntensity: 1.5
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.28
  });
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xe09f3e,
    metalness: 0.65,
    roughness: 0.25
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a1524,
    metalness: 0.95,
    roughness: 0.05,
    envMapIntensity: 1.8
  });

  // 1. Sculpted Lathe Fuselage (Parabolic nose -> cylindrical freight deck -> tapered tail)
  const fuseProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 8.2),
    new THREE.Vector2(0.32, 7.85),
    new THREE.Vector2(0.68, 7.2),
    new THREE.Vector2(0.95, 6.2),
    new THREE.Vector2(1.08, 4.9),
    new THREE.Vector2(1.10, 3.2),
    new THREE.Vector2(1.10, -2.5),
    new THREE.Vector2(0.96, -4.8),
    new THREE.Vector2(0.62, -6.9),
    new THREE.Vector2(0.24, -8.5),
    new THREE.Vector2(0.0, -8.8)
  ];
  const fuseGeo = new THREE.LatheGeometry(fuseProfile, 36);
  fuseGeo.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(fuseGeo, skinMat);
  fuselage.castShadow = enableShadows;
  fuselage.receiveShadow = enableShadows;
  root.add(fuselage);

  // Subtle navy belly chine fairing under wingbox
  const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 6.2), navyMat);
  bellyFairing.position.set(0, -0.96, 0.2);
  root.add(bellyFairing);

  // 2. Wrap-around Multi-Pane Cockpit Windows (shared geometry)
  const paneGeo = new THREE.BoxGeometry(0.28, 0.26, 0.08);
  [-0.48, -0.16, 0.16, 0.48].forEach((xOff, i) => {
    const absNorm = Math.abs(i - 1.5);
    const pane = new THREE.Mesh(paneGeo, glassMat);
    pane.position.set(xOff, 0.52, 6.62 - absNorm * 0.22);
    pane.rotation.y = xOff * 0.72;
    pane.rotation.x = -0.32;
    root.add(pane);
  });

  // Top VHF dorsal antenna blade
  const ant = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.48), wingMat);
  ant.position.set(0, 1.22, 2.2);
  root.add(ant);

  // 3. Aerodynamic Swept Wings with Dihedral, Flap Canoes & Blended Winglets
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.85, 2.3);
  wingShape.lineTo(9.8, -1.9);
  wingShape.lineTo(9.55, -3.15);
  wingShape.lineTo(0.85, -1.45);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.06,
    bevelThickness: 0.06
  });
  wingGeo.rotateX(-Math.PI / 2);

  const wlGeo = new THREE.BoxGeometry(0.1, 1.35, 0.85);
  const canoeGeos = [0, 1, 2].map(idx => new THREE.ConeGeometry(0.11, 1.35 - idx * 0.15, 10));
  const navLedGeo = new THREE.SphereGeometry(0.14, 10, 10);

  [-1, 1].forEach(side => {
    const wingPivot = new THREE.Group();
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    if (side === -1) wingMesh.scale.x = -1;
    wingMesh.castShadow = enableShadows;
    wingMesh.receiveShadow = enableShadows;
    wingPivot.position.y = -0.25;
    wingPivot.rotation.z = side * 0.055; // Subtle realistic wing dihedral
    wingPivot.add(wingMesh);

    // Blended swept winglet
    const wl = new THREE.Mesh(wlGeo, amberMat);
    wl.position.set(side * 9.72, 0.55, -2.55);
    wl.rotation.z = -side * 0.32;
    wl.rotation.y = side * 0.12;
    wingPivot.add(wl);

    // 3 Underwing aerodynamic flap track canoes per wing
    [2.6, 5.1, 7.3].forEach((wx, idx) => {
      const canoe = new THREE.Mesh(canoeGeos[idx], navyMat);
      canoe.rotation.x = -Math.PI / 2;
      canoe.position.set(side * wx, -0.22, -0.75 - wx * 0.25);
      wingPivot.add(canoe);
    });

    // Wingtip LED nav beacon
    const navLed = new THREE.Mesh(
      navLedGeo,
      new THREE.MeshBasicMaterial({ color: side === -1 ? 0xef4444 : 0x10b981 })
    );
    navLed.position.set(side * 9.75, 0.08, -2.25);
    wingPivot.add(navLed);

    root.add(wingPivot);
  });

  // 4. Twin High-Bypass Turbofan Nacelles (Lathe cowling + chrome lip + 14 instanced fan blades + pylon)
  const cowlProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.56, 1.55),
    new THREE.Vector2(0.68, 1.35),
    new THREE.Vector2(0.74, 0.4),
    new THREE.Vector2(0.68, -0.85),
    new THREE.Vector2(0.54, -1.45),
    new THREE.Vector2(0.42, -1.45),
    new THREE.Vector2(0.48, -0.75),
    new THREE.Vector2(0.56, 1.55)
  ];
  const cowlGeo = new THREE.LatheGeometry(cowlProfile, 24);
  cowlGeo.rotateX(Math.PI / 2);
  const intakeLipGeo = new THREE.TorusGeometry(0.61, 0.08, 10, 24);
  const intakeBackGeo = new THREE.CircleGeometry(0.56, 20);
  const exhaustGeo = new THREE.ConeGeometry(0.36, 1.15, 16);
  const pylonGeo = new THREE.BoxGeometry(0.24, 0.72, 2.3);
  const spinnerGeo = new THREE.ConeGeometry(0.18, 0.48, 14);
  const bladeGeo = new THREE.BoxGeometry(0.08, 0.52, 0.03);
  const bladeDummy = new THREE.Object3D();

  [-3.8, 3.8].forEach(xPos => {
    const engGroup = new THREE.Group();
    engGroup.position.set(xPos, -0.82, 0.85);

    const cowl = new THREE.Mesh(cowlGeo, navyMat);
    cowl.castShadow = enableShadows;
    engGroup.add(cowl);

    // Chrome intake lip
    const intakeLip = new THREE.Mesh(intakeLipGeo, chromeMat);
    intakeLip.position.z = 1.48;
    engGroup.add(intakeLip);

    // Acoustic dark intake cavity backplate
    const intakeBack = new THREE.Mesh(intakeBackGeo, darkMetal);
    intakeBack.position.z = 1.05;
    engGroup.add(intakeBack);

    // Exhaust hot cone at rear
    const exhaust = new THREE.Mesh(exhaustGeo, darkMetal);
    exhaust.rotation.x = -Math.PI / 2;
    exhaust.position.z = -1.75;
    engGroup.add(exhaust);

    // Underwing pylon mount connecting nacelle cleanly to wing
    const pylon = new THREE.Mesh(pylonGeo, wingMat);
    pylon.position.set(0, 0.56, -0.35);
    engGroup.add(pylon);

    // Multi-blade Instanced Spinning Titanium Fan + Spinner Hub
    const fanGroup = new THREE.Group();
    fanGroup.position.z = 1.24;
    const spinner = new THREE.Mesh(spinnerGeo, chromeMat);
    spinner.rotation.x = Math.PI / 2;
    spinner.position.z = 0.16;
    fanGroup.add(spinner);

    const blades = new THREE.InstancedMesh(bladeGeo, darkMetal, 14);
    for (let b = 0; b < 14; b++) {
      const ang = (b / 14) * Math.PI * 2;
      bladeDummy.rotation.set(0, 0.35, ang);
      bladeDummy.position.set(Math.cos(ang) * 0.3, Math.sin(ang) * 0.3, 0);
      bladeDummy.updateMatrix();
      blades.setMatrixAt(b, bladeDummy.matrix);
    }
    blades.instanceMatrix.needsUpdate = true;
    fanGroup.add(blades);
    engGroup.add(fanGroup);
    turbineFans.push(fanGroup);

    root.add(engGroup);
  });

  // 5. Tail Assembly (Swept Vertical Fin + Horizontal Stabilizers)
  const finShape = new THREE.Shape();
  finShape.moveTo(-4.4, 0.78);
  finShape.lineTo(-7.3, 4.35);
  finShape.lineTo(-8.55, 4.35);
  finShape.lineTo(-7.6, 0.65);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.04,
    bevelThickness: 0.04
  });
  finGeo.rotateY(Math.PI / 2);
  const fin = new THREE.Mesh(finGeo, navyMat);
  fin.position.x = -0.07;
  fin.castShadow = enableShadows;
  root.add(fin);

  // Amber ARLOGS tail stripe
  const tailBadge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 1.2), amberMat);
  tailBadge.position.set(0, 2.75, -7.2);
  tailBadge.rotation.x = -0.58;
  root.add(tailBadge);

  const stabShape = new THREE.Shape();
  stabShape.moveTo(0.35, -5.5);
  stabShape.lineTo(3.75, -7.45);
  stabShape.lineTo(3.55, -8.35);
  stabShape.lineTo(0.35, -7.4);
  stabShape.closePath();
  const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
  stabGeo.rotateX(-Math.PI / 2);
  const rStab = new THREE.Mesh(stabGeo, wingMat);
  rStab.position.y = 0.25;
  rStab.rotation.z = 0.07;
  const lStab = rStab.clone();
  lStab.scale.x = -1;
  lStab.rotation.z = -0.07;
  root.add(rStab, lStab);

  // 6. Dual Bright Nose Landing Headlights + Belly Strobe
  [-0.24, 0.24].forEach(lx => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshBasicMaterial({ color: 0xfff7dc }));
    lamp.position.set(lx, -0.52, 6.85);
    root.add(lamp);

    // Subtle volumetric forward beam cone
    const coneGeo = new THREE.ConeGeometry(0.85, 5.5, 16, 1, true);
    coneGeo.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffefc2,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(coneGeo, coneMat);
    beam.position.set(lx, -0.58, 9.5);
    root.add(beam);
  });

  const strobeLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff3b3b })
  );
  strobeLight.position.set(0, 1.15, -0.4);
  root.add(strobeLight);

  return { root, turbineFans, strobeLight };
}

/**
 * Builds an ultra-detailed 40' High Cube Container with doors facing +Z,
 * real galvanized 4-bar cam locking hardware, hinges, wood plank floor & freight cargo.
 */
export function buildDetailedContainer(enableShadows = true): DetailedContainerRefs {
  const root = new THREE.Group();
  const W = 5.4;
  const H = 4.5;
  const L = 8.6;
  const t = 0.16;

  const sideTex = createContainerSideTextures('#153b64', '#e09f3e', 'ARLOGS', 'ARLU 849201 4');
  const doorTex = createContainerDoorTextures('#194675');
  const woodTex = createWoodFloorTextures();

  const sideMat = new THREE.MeshStandardMaterial({
    map: sideTex.map,
    bumpMap: sideTex.bumpMap,
    bumpScale: 0.25,
    roughnessMap: sideTex.roughnessMap,
    metalness: 0.62,
    roughness: 0.4,
    envMapIntensity: 1.15
  });
  const frameSteelMat = new THREE.MeshStandardMaterial({
    color: 0x0d243f,
    metalness: 0.76,
    roughness: 0.32,
    envMapIntensity: 1.2
  });
  const roofCorrugatedMat = new THREE.MeshStandardMaterial({
    color: 0x123357,
    bumpMap: sideTex.bumpMap,
    bumpScale: 0.22,
    metalness: 0.66,
    roughness: 0.36
  });
  const woodFloorMat = new THREE.MeshStandardMaterial({
    map: woodTex.map,
    bumpMap: woodTex.bumpMap,
    bumpScale: 0.12,
    roughness: 0.82,
    metalness: 0.04
  });
  const castingMat = new THREE.MeshStandardMaterial({
    color: 0xe09f3e,
    metalness: 0.82,
    roughness: 0.24
  });

  // Structural Shell Walls
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, t, L - 0.1), woodFloorMat);
  floor.position.y = -H / 2 + t / 2;
  floor.receiveShadow = enableShadows;

  const roof = new THREE.Mesh(new THREE.BoxGeometry(W, t, L), roofCorrugatedMat);
  roof.position.y = H / 2 - t / 2;
  roof.castShadow = enableShadows;
  roof.receiveShadow = enableShadows;

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), roofCorrugatedMat);
  backWall.position.z = -L / 2 + t / 2;
  backWall.castShadow = enableShadows;

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(t, H - 0.3, L - 0.3), sideMat);
  leftWall.position.x = -W / 2 + t / 2;
  leftWall.castShadow = enableShadows;
  leftWall.receiveShadow = enableShadows;

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(t, H - 0.3, L - 0.3), sideMat);
  rightWall.position.x = W / 2 - t / 2;
  rightWall.castShadow = enableShadows;
  rightWall.receiveShadow = enableShadows;

  root.add(floor, roof, backWall, leftWall, rightWall);

  // Heavy Corten Perimeter Frame Beams & Vertical Corner Posts (giving depth & silhouette!)
  const halfW = W / 2;
  const halfH = H / 2;
  const halfL = L / 2;

  [[-halfW, halfH], [halfW, halfH], [-halfW, -halfH], [halfW, -halfH]].forEach(([cx, cy]) => {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, L), frameSteelMat);
    sideRail.position.set(cx, cy, 0);
    sideRail.castShadow = enableShadows;
    root.add(sideRail);
  });

  [[-halfW, halfL], [halfW, halfL], [-halfW, -halfL], [halfW, -halfL]].forEach(([cx, cz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, H, 0.28), frameSteelMat);
    post.position.set(cx, 0, cz);
    post.castShadow = enableShadows;
    root.add(post);
  });

  [halfH, -halfH].forEach(cy => {
    const frontHeader = new THREE.Mesh(new THREE.BoxGeometry(W, 0.26, 0.26), frameSteelMat);
    frontHeader.position.set(0, cy, halfL);
    const backHeader = frontHeader.clone();
    backHeader.position.z = -halfL;
    root.add(frontHeader, backHeader);
  });

  // Real Instanced Exterior Steel Corrugation Ribs along both outer walls & roof
  const ribGeo = new THREE.BoxGeometry(0.09, H - 0.44, 0.16);
  const ribXs: number[] = [];
  for (let z = -halfL + 0.55; z <= halfL - 0.55; z += 0.42) ribXs.push(z);
  const wallRibs = new THREE.InstancedMesh(ribGeo, frameSteelMat, ribXs.length * 2);
  wallRibs.castShadow = enableShadows;
  const dummy = new THREE.Object3D();
  let rIdx = 0;
  ribXs.forEach(zPos => {
    dummy.position.set(-halfW - 0.03, 0, zPos);
    dummy.updateMatrix();
    wallRibs.setMatrixAt(rIdx++, dummy.matrix);

    dummy.position.set(halfW + 0.03, 0, zPos);
    dummy.updateMatrix();
    wallRibs.setMatrixAt(rIdx++, dummy.matrix);
  });
  wallRibs.instanceMatrix.needsUpdate = true;
  root.add(wallRibs);

  // Forklift pockets under bottom side sills
  const pocketMat = new THREE.MeshBasicMaterial({ color: 0x07101c });
  [-1.1, 1.1].forEach(pz => {
    [-halfW - 0.02, halfW + 0.02].forEach(px => {
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.55), pocketMat);
      pocket.position.set(px, -halfH + 0.04, pz);
      root.add(pocket);
    });
  });

  // 8 ISO Corner Castings
  [
    [-halfW, halfH, halfL], [-halfW, -halfH, halfL], [-halfW, halfH, -halfL], [-halfW, -halfH, -halfL],
    [halfW, halfH, halfL], [halfW, -halfH, halfL], [halfW, halfH, -halfL], [halfW, -halfH, -halfL]
  ].forEach(([cx, cy, cz]) => {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), castingMat);
    corner.position.set(cx, cy, cz);
    corner.castShadow = enableShadows;
    root.add(corner);
  });

  // Authentic Interior Freight Cargo (Oak Pallets + Corrugated Cartons + Wrapped Freight)
  const palletMat = woodFloorMat;
  const cartonMat = new THREE.MeshStandardMaterial({ color: 0xc2986b, roughness: 0.82, metalness: 0.02 });
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0x8f6239, roughness: 0.65 });
  const wrapBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4e89, roughness: 0.25, metalness: 0.15 });

  [[-1.25, -2.75], [1.25, -2.75], [-1.25, -0.95], [1.25, -0.95]].forEach(([px, pz], idx) => {
    const cargoGroup = new THREE.Group();
    cargoGroup.position.set(px, -halfH + t, pz);

    // Slatted wood pallet base
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 1.45), palletMat);
    pallet.position.y = 0.09;
    cargoGroup.add(pallet);

    // Cargo stack (boxes or shrink-wrapped crate)
    const stackH = idx % 2 === 0 ? 1.45 : 1.85;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, stackH, 1.32),
      idx === 1 ? wrapBlueMat : cartonMat
    );
    box.position.y = 0.18 + stackH / 2;
    box.castShadow = enableShadows;
    cargoGroup.add(box);

    // Carton strapping / packing tape accent
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.54, stackH + 0.02, 0.12), tapeMat);
    strap.position.y = 0.18 + stackH / 2;
    cargoGroup.add(strap);

    root.add(cargoGroup);
  });

  // Warm interior ceiling strip LED
  const bayLight = new THREE.PointLight(0xffd79e, 0, 15);
  bayLight.position.set(0, 1.45, halfL - 1.6);
  root.add(bayLight);

  // Front Hinged Twin Steel Doors at +Z facing the user!
  const doorW = W / 2 - 0.12;
  const doorH = H - 0.28;
  const doorMat = new THREE.MeshStandardMaterial({
    map: doorTex.map,
    bumpMap: doorTex.bumpMap,
    bumpScale: 0.2,
    metalness: 0.64,
    roughness: 0.34,
    envMapIntensity: 1.2
  });
  const rodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.14, envMapIntensity: 1.5 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x090f18, roughness: 0.9, metalness: 0.05 });

  const buildDoorLeaf = (pivot: THREE.Group, isLeft: boolean) => {
    const dir = isLeft ? 1 : -1;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.16), doorMat);
    leaf.position.x = dir * (doorW / 2);
    leaf.castShadow = enableShadows;
    leaf.receiveShadow = enableShadows;
    pivot.add(leaf);

    // Center rubber gasket strip
    const gasket = new THREE.Mesh(new THREE.BoxGeometry(0.06, doorH, 0.19), rubberMat);
    gasket.position.x = dir * (doorW - 0.02);
    pivot.add(gasket);

    // 4 Welded outer steel hinges
    [-1.65, -0.55, 0.55, 1.65].forEach(hy => {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.24), frameSteelMat);
      hinge.position.set(dir * 0.14, hy, 0.08);
      pivot.add(hinge);
    });

    // 2 Galvanized Vertical Cam-Lock Rods + Brackets + Pivoting Handles
    [0.42, 0.78].forEach(frac => {
      const rx = dir * (doorW * frac);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, doorH - 0.12, 12), rodMat);
      rod.position.set(rx, 0, 0.14);
      rod.castShadow = enableShadows;
      pivot.add(rod);

      // Guide brackets
      [-1.3, 0, 1.3].forEach(by => {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.14), frameSteelMat);
        bracket.position.set(rx, by, 0.11);
        pivot.add(bracket);
      });

      // Handle lever with amber grip
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.07), castingMat);
      handle.position.set(rx - dir * 0.16, -0.48, 0.21);
      pivot.add(handle);
    });
  };

  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(-halfW + 0.12, 0, halfL);
  buildDoorLeaf(leftDoorPivot, true);
  root.add(leftDoorPivot);

  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(halfW - 0.12, 0, halfL);
  buildDoorLeaf(rightDoorPivot, false);
  root.add(rightDoorPivot);

  return { root, leftDoorPivot, rightDoorPivot, bayLight };
}

/**
 * Builds an authentic Multi-Station Sculpted Container Vessel with bulbous bow,
 * textured hull seams, cantilevered navigation bridge, radar scanners, and cargo stacks.
 */
export function buildDetailedContainerShip(enableShadows = true): DetailedShipRefs {
  const root = new THREE.Group();
  root.name = 'ship';
  const radarScanners: THREE.Object3D[] = [];

  const hullTex = createShipHullTextures();
  const bridgeTex = createBridgeFacadeTexture();

  // 1. Extruded Sculpted Curved Hull + Flared Bulbous Bow Section
  const hullPlan = new THREE.Shape();
  hullPlan.moveTo(-8.2, -1.95);
  hullPlan.lineTo(4.2, -2.05);
  hullPlan.quadraticCurveTo(7.8, -1.55, 10.2, 0);
  hullPlan.quadraticCurveTo(7.8, 1.55, 4.2, 2.05);
  hullPlan.lineTo(-8.2, 1.95);
  hullPlan.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullPlan, {
    depth: 2.35,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.18,
    bevelThickness: 0.16
  });
  hullGeo.rotateX(-Math.PI / 2);

  const hullMat = new THREE.MeshStandardMaterial({
    map: hullTex.map,
    bumpMap: hullTex.bumpMap,
    bumpScale: 0.22,
    metalness: 0.52,
    roughness: 0.38,
    envMapIntensity: 1.15
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = -1.3;
  hull.castShadow = enableShadows;
  hull.receiveShadow = enableShadows;
  root.add(hull);

  // Bulbous bow beneath waterline
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.82, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0x8b2626, metalness: 0.45, roughness: 0.45 })
  );
  bulb.scale.set(2.2, 0.85, 0.85);
  bulb.position.set(9.45, -1.15, 0);
  root.add(bulb);

  // Anchors & Hawsepipes at Bow
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
  [-1.12, 1.12].forEach(az => {
    const anchor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.58, 0.14), steelDark);
    anchor.position.set(7.6, 0.25, az);
    anchor.rotation.y = az > 0 ? 0.35 : -0.35;
    root.add(anchor);
  });

  // Main Deck & Hatch Coamings
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x1d2b3a, roughness: 0.72, metalness: 0.25 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.16, 3.85), deckMat);
  deck.position.set(-0.6, 1.14, 0);
  deck.receiveShadow = enableShadows;
  root.add(deck);

  // Coaming hatches
  const hatchMat = new THREE.MeshStandardMaterial({ color: 0x7c2d2d, metalness: 0.45, roughness: 0.5 });
  [-2.1, 0.8, 4.1].forEach(hx => {
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.24, 3.2), hatchMat);
    hatch.position.set(hx, 1.28, 0);
    root.add(hatch);
  });

  // Forecastle wave breakwater at bow
  const breakwater = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 2.7), steelDark);
  breakwater.position.set(6.5, 1.48, 0);
  root.add(breakwater);

  // 2. Multi-Deck Superstructure & Wheelhouse with Cantilevered Wings & VSAT Radomes
  const bridgeMat = new THREE.MeshStandardMaterial({ map: bridgeTex, roughness: 0.34, metalness: 0.22 });
  const whitePaint = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.32, metalness: 0.2 });

  const mainHouse = new THREE.Mesh(new THREE.BoxGeometry(2.45, 3.35, 3.4), bridgeMat);
  mainHouse.position.set(-5.2, 2.85, 0);
  mainHouse.castShadow = enableShadows;
  root.add(mainHouse);

  // Upper Navigation Wheelhouse & Cantilevered Bridge Wings
  const wheelhouse = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.78, 3.15), bridgeMat);
  wheelhouse.position.set(-4.85, 4.82, 0);
  root.add(wheelhouse);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 4.75), whitePaint);
  wings.position.set(-4.65, 4.75, 0);
  root.add(wings);

  // Satellite Comm Radomes (2 spheres)
  [-1.25, 1.25].forEach(rz => {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), whitePaint);
    dome.position.set(-5.1, 5.42, rz);
    root.add(dome);
  });

  // Signal Mast & Dual Rotating Radar Scanners
  const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.65, 10), whitePaint);
  mastPole.position.set(-4.85, 5.95, 0);
  root.add(mastPole);

  [5.8, 6.35].forEach((ry, idx) => {
    const scannerGroup = new THREE.Group();
    scannerGroup.position.set(-4.85, ry, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 1.65 - idx * 0.4), whitePaint);
    scannerGroup.add(bar);
    root.add(scannerGroup);
    radarScanners.push(scannerGroup);
  });

  const beaconMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xf5b041 })
  );
  beaconMesh.position.set(-4.85, 6.85, 0);
  root.add(beaconMesh);

  // Smokestack Funnel (Navy & Amber ARLOGS collar)
  const funnelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.64, 1.95, 16), new THREE.MeshStandardMaterial({ color: 0x143356, roughness: 0.4 }));
  funnelBase.position.set(-6.75, 3.1, 0);
  const funnelCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.52, 0.45, 16), new THREE.MeshStandardMaterial({ color: 0xe09f3e, roughness: 0.35 }));
  funnelCollar.position.set(-6.75, 3.85, 0);
  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 10), steelDark);
  exhaustPipe.position.set(-6.75, 4.18, 0);
  root.add(funnelBase, funnelCollar, exhaustPipe);

  // 3. Textured Container Stacks on Deck (Shared geometry & 3 shared materials!)
  const preTexA = createContainerSideTextures('#163f6b', '#f5b041', 'ARLOGS', 'ARLU 310942');
  const preTexB = createContainerSideTextures('#8b2c2c', '#f5b041', 'TRANS', 'MSCU 841209');
  const preTexC = createContainerSideTextures('#1f5140', '#f5b041', 'OCEAN', 'CMAU 774210');
  const sharedContainerGeo = new THREE.BoxGeometry(2.55, 0.88, 0.94);
  const containerMats = [preTexA, preTexB, preTexC].map(
    tex =>
      new THREE.MeshStandardMaterial({
        map: tex.map,
        bumpMap: tex.bumpMap,
        bumpScale: 0.14,
        metalness: 0.52,
        roughness: 0.38
      })
  );

  const slotCoords: [number, number, number, number][] = [
    [-2.1, 1.84, -1.0, 0],
    [-2.1, 1.84, 0.0, 1],
    [-2.1, 1.84, 1.0, 2],
    [-2.1, 2.74, -1.0, 2],
    [-2.1, 2.74, 0.0, 0],
    [0.8, 1.84, -1.0, 1],
    [0.8, 1.84, 1.0, 2],
    [4.1, 1.84, -0.55, 0],
    [4.1, 1.84, 0.55, 1],
    [4.1, 2.74, -0.55, 2]
  ];
  slotCoords.forEach(([cx, cy, cz, tIdx]) => {
    const cMesh = new THREE.Mesh(sharedContainerGeo, containerMats[tIdx]);
    cMesh.position.set(cx, cy, cz);
    cMesh.castShadow = enableShadows;
    cMesh.receiveShadow = enableShadows;
    root.add(cMesh);
  });

  // Glowing Amber Reserved Bay Guides midship (0.8, 1.8, 0) + (3.6?, no -> bay at x=2.45/0.8!)
  // Let's keep clear deck bay at x = 2.45 for the incoming ARLOGS container!
  const slotPad = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.32, 4),
    new THREE.MeshBasicMaterial({ color: 0xf5b041, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
  );
  slotPad.rotation.x = -Math.PI / 2;
  slotPad.rotation.z = Math.PI / 4;
  slotPad.position.set(2.45, 1.24, 0);
  root.add(slotPad);

  // 4. Water Wake Foam & Bow Spray planes (shown dynamically during sailing!)
  const wakeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 18),
    new THREE.MeshBasicMaterial({ color: 0xe6f1fa, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
  );
  wakeMesh.rotation.x = -Math.PI / 2;
  wakeMesh.rotation.z = -Math.PI / 2;
  wakeMesh.position.set(-16.5, -1.15, 0);
  root.add(wakeMesh);

  const bowSpray = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.6, 20, 1, -Math.PI * 0.4, Math.PI * 0.8),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
  );
  bowSpray.rotation.x = -Math.PI / 2;
  bowSpray.position.set(8.6, -1.12, 0);
  root.add(bowSpray);

  return { root, radarScanners, beaconMesh, wakeMesh, bowSpray };
}

/**
 * Safely disposes Three.js geometries and materials in a scene/group while preserving
 * shared module-cached procedural CanvasTextures.
 */
export function disposeSceneResources(root: THREE.Object3D): void {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    if (mat) {
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose());
      } else {
        mat.dispose();
      }
    }
  });
}

