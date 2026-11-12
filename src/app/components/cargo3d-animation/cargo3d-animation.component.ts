import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { createWaterBumpTexture } from '../../utils/procedural-textures';
import {
  createCoastalEnvironmentTexture,
  buildDetailedCargoPlane,
  buildDetailedContainer,
  buildDetailedContainerShip,
  disposeSceneResources
} from '../../utils/realistic-cargo-models';

export type Model3dMode = 'container' | 'plane' | 'ship' | 'globe';

@Component({
  selector: 'app-cargo3d-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #boxRoot class="canvas-3d-box position-relative">

      <!-- Clean Overlay -->
      <div class="position-absolute top-0 start-0 m-2 m-sm-3 z-2 pointer-events-none text-white pe-3">
        <div class="d-flex align-items-center gap-2">
          <span class="pulsing-indicator flex-shrink-0"></span>
          <span class="fw-bold fs-xs letter-spacing-wide text-uppercase text-white">
            {{ activeTitle() }}
          </span>
        </div>
        <div class="fs-xxs text-white-50 mt-1 d-none d-sm-block">
          {{ activeDescription() }}
        </div>
      </div>

      <!-- Responsive Mode Selector Controls -->
      <div class="mode-controls-wrap position-absolute bottom-0 end-0 m-2 m-sm-3 z-2">
        <div class="btn-group btn-group-sm bg-slate-900 bg-opacity-80 p-1 rounded-3 backdrop-blur border border-white border-opacity-10 shadow-sm mode-pill-scroll">
          <button
            type="button"
            class="btn btn-sm py-1 px-2 fs-xxs rounded-2 text-nowrap"
            [class.btn-light]="activeMode() === 'container'"
            [class.text-dark]="activeMode() === 'container'"
            [class.fw-bold]="activeMode() === 'container'"
            [class.btn-transparent]="activeMode() !== 'container'"
            [class.text-white-50]="activeMode() !== 'container'"
            (click)="setMode('container')">
            <i class="bi bi-box-seam me-1"></i><span>Contenedor</span><span class="d-none d-sm-inline"> 40'</span>
          </button>

          <button
            type="button"
            class="btn btn-sm py-1 px-2 fs-xxs rounded-2 text-nowrap"
            [class.btn-light]="activeMode() === 'plane'"
            [class.text-dark]="activeMode() === 'plane'"
            [class.fw-bold]="activeMode() === 'plane'"
            [class.btn-transparent]="activeMode() !== 'plane'"
            [class.text-white-50]="activeMode() !== 'plane'"
            (click)="setMode('plane')">
            <i class="bi bi-airplane me-1"></i><span>Avión</span><span class="d-none d-sm-inline"> Carga</span>
          </button>

          <button
            type="button"
            class="btn btn-sm py-1 px-2 fs-xxs rounded-2 text-nowrap"
            [class.btn-light]="activeMode() === 'ship'"
            [class.text-dark]="activeMode() === 'ship'"
            [class.fw-bold]="activeMode() === 'ship'"
            [class.btn-transparent]="activeMode() !== 'ship'"
            [class.text-white-50]="activeMode() !== 'ship'"
            (click)="setMode('ship')">
            <i class="bi bi-water me-1"></i><span>Buque</span>
          </button>

          <button
            type="button"
            class="btn btn-sm py-1 px-2 fs-xxs rounded-2 text-nowrap"
            [class.btn-light]="activeMode() === 'globe'"
            [class.text-dark]="activeMode() === 'globe'"
            [class.fw-bold]="activeMode() === 'globe'"
            [class.btn-transparent]="activeMode() !== 'globe'"
            [class.text-white-50]="activeMode() !== 'globe'"
            (click)="setMode('globe')">
            <i class="bi bi-globe-americas me-1"></i><span>Rutas</span>
          </button>
        </div>
      </div>

      <div #canvasContainer class="canvas-host w-100 h-100 cursor-grab"></div>
    </div>
  `,
  styles: [`
    .canvas-3d-box {
      height: clamp(210px, 34vw, 270px);
      border-radius: 12px;
      overflow: hidden;
      background: radial-gradient(circle at 65% 30%, #20456e 0%, #0d1f36 100%);
      box-shadow: inset 0 0 50px rgba(4, 12, 24, 0.55);
      contain: layout paint;
    }
    .canvas-host {
      touch-action: none;
    }
    :host ::ng-deep canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .mode-controls-wrap {
      max-width: calc(100% - 1rem);
    }
    .mode-pill-scroll {
      max-width: 100%;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .mode-pill-scroll::-webkit-scrollbar { display: none; }
    .backdrop-blur { backdrop-filter: blur(8px); }
    .bg-slate-900 { background-color: #0f172a; }
    .btn-transparent { background: transparent; border: none; }
    .letter-spacing-wide { letter-spacing: 0.05em; }
    .cursor-grab { cursor: grab; }
    .cursor-grab:active { cursor: grabbing; }
    .pointer-events-none { pointer-events: none; }

    .pulsing-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #f5b041;
      box-shadow: 0 0 0 0 rgba(245, 176, 65, 0.7);
      animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot {
      0% { box-shadow: 0 0 0 0 rgba(245, 176, 65, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(245, 176, 65, 0); }
      100% { box-shadow: 0 0 0 0 rgba(245, 176, 65, 0); }
    }
  `]
})
export class Cargo3dAnimationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('boxRoot', { static: true }) boxRootRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private ngZone = inject(NgZone);

  activeMode = signal<Model3dMode>('container');

  readonly activeTitle = computed(() => {
    switch (this.activeMode()) {
      case 'container': return 'Contenedor 40\' High Cube • ARLOGS';
      case 'plane': return 'Flete Aéreo Consolidado';
      case 'ship': return 'Tránsito Marítimo FCL / LCL';
      case 'globe': return 'Red Logística Internacional';
    }
  });

  readonly activeDescription = computed(() => {
    switch (this.activeMode()) {
      case 'container': return 'Unidad estándar de consolidación con precinto de control';
      case 'plane': return 'Operación aérea prioritaria hacia destino Guayaquil';
      case 'ship': return 'Embarque marítimo directo y consolidado en ruta';
      case 'globe': return 'Cobertura operativa conectando Asia, Europa y América';
    }
  });

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;

  private isVisibleInViewport = true;
  private lastFrameTime = 0;

  private containerGroup = new THREE.Group();
  private planeGroup = new THREE.Group();
  private shipGroup = new THREE.Group();
  private globeGroup = new THREE.Group();

  private turbineFans: THREE.Object3D[] = [];
  private radarScanners: THREE.Object3D[] = [];
  private cargoBeacons: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; progress: number }[] = [];
  private tempCurvePos = new THREE.Vector3();
  private oceanWater!: THREE.Mesh;

  private isPointerDown = false;
  private activePointerId: number | null = null;
  private previousPointer = { x: 0, y: 0 };

  private onPointerDownBound = (e: PointerEvent): void => {
    this.isPointerDown = true;
    this.activePointerId = e.pointerId;
    this.previousPointer = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };

  private onPointerUpBound = (e: PointerEvent): void => {
    if (this.activePointerId === e.pointerId) {
      this.isPointerDown = false;
      this.activePointerId = null;
    }
  };

  private onPointerMoveBound = (e: PointerEvent): void => {
    if (!this.isPointerDown || this.activePointerId !== e.pointerId) return;
    const deltaX = e.clientX - this.previousPointer.x;
    const deltaY = e.clientY - this.previousPointer.y;

    let activeGroup: THREE.Group = this.containerGroup;
    const mode = this.activeMode();
    if (mode === 'plane') activeGroup = this.planeGroup;
    else if (mode === 'ship') activeGroup = this.shipGroup;
    else if (mode === 'globe') activeGroup = this.globeGroup;

    activeGroup.rotation.y += deltaX * 0.009;
    activeGroup.rotation.x = THREE.MathUtils.clamp(activeGroup.rotation.x + deltaY * 0.007, -0.55, 0.75);

    this.previousPointer = { x: e.clientX, y: e.clientY };
  };

  private onVisibilityChangeBound = (): void => {
    this.syncPlaybackState();
  };

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initThree();

      const containerRefs = buildDetailedContainer(false);
      containerRefs.root.rotation.y = Math.PI / 2;
      this.containerGroup.add(containerRefs.root);

      const planeRefs = buildDetailedCargoPlane(false);
      planeRefs.root.rotation.y = Math.PI / 2;
      this.turbineFans = planeRefs.turbineFans;
      this.planeGroup.add(planeRefs.root);

      const shipRefs = buildDetailedContainerShip(false);
      this.radarScanners = shipRefs.radarScanners;
      this.shipGroup.add(shipRefs.root);

      const waterBump = createWaterBumpTexture();
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x123857,
        bumpMap: waterBump,
        bumpScale: 0.3,
        transparent: true,
        opacity: 0.85,
        roughness: 0.18,
        metalness: 0.72
      });
      this.oceanWater = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 0.1, 32), waterMat);
      this.oceanWater.position.y = -1.6;
      this.shipGroup.add(this.oceanWater);

      this.buildGlobeModel();
      this.applyModeVisualState('container');
      this.applyCameraFraming();
      this.setupObservers();
      this.lastFrameTime = performance.now();
      this.syncPlaybackState();
    });
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);

    if (this.renderer) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointerdown', this.onPointerDownBound);
      dom.removeEventListener('pointermove', this.onPointerMoveBound);
      window.removeEventListener('pointerup', this.onPointerUpBound);
      window.removeEventListener('pointercancel', this.onPointerUpBound);
    }

    if (this.scene) {
      disposeSceneResources(this.scene);
      this.scene.environment?.dispose();
    }
    this.renderer?.dispose();
  }

  setMode(mode: Model3dMode): void {
    this.activeMode.set(mode);
    this.ngZone.runOutsideAngular(() => {
      this.applyModeVisualState(mode);
      this.applyCameraFraming();
    });
  }

  private applyModeVisualState(mode: Model3dMode): void {
    this.containerGroup.visible = mode === 'container';
    this.planeGroup.visible = mode === 'plane';
    this.shipGroup.visible = mode === 'ship';
    this.globeGroup.visible = mode === 'globe';

    if (mode === 'container') {
      this.containerGroup.rotation.set(0.18, -0.55, 0);
    } else if (mode === 'plane') {
      this.planeGroup.rotation.set(0.15, 0.8, 0);
    } else if (mode === 'ship') {
      this.shipGroup.rotation.set(0.18, 0.72, 0);
    } else if (mode === 'globe') {
      this.globeGroup.rotation.set(0, 0, 0);
    }
  }

  private applyCameraFraming(): void {
    if (!this.containerRef || !this.camera || !this.renderer) return;
    const el = this.containerRef.nativeElement;
    const width = Math.max(1, el.clientWidth);
    const height = Math.max(1, el.clientHeight);
    const aspect = width / height;

    // Preserve full model wingspan & ship length on narrow mobile or tablet tiles
    const narrowFactor = aspect < 1.38 ? Math.min(1.9, 1.42 / Math.max(0.56, aspect)) : 1.0;
    const mode = this.activeMode();

    this.camera.fov = aspect < 1.05 ? Math.min(54, 42 + (1.05 - aspect) * 14) : 42;
    this.camera.aspect = aspect;

    let baseZ = 16;
    let baseY = 3.2;
    if (mode === 'plane') {
      baseZ = 22;
      baseY = 4.2;
    } else if (mode === 'ship') {
      baseZ = 24;
      baseY = 4.8;
    } else if (mode === 'globe') {
      baseZ = 25;
      baseY = 4.0;
    }

    this.camera.position.set(0, baseY * (0.9 + narrowFactor * 0.1), baseZ * narrowFactor);
    this.camera.lookAt(0, mode === 'ship' ? 0.4 : 0, 0);
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 2));
    this.renderer.setSize(width, height, false);
  }

  private initThree(): void {
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 240;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: width >= 480,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene.environment = createCoastalEnvironmentTexture(this.renderer);

    this.scene.add(new THREE.HemisphereLight(0xcbe2f7, 0x162a40, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffdfb8, 2.2);
    keyLight.position.set(15, 25, 20);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.4);
    fillLight.position.set(-20, -10, -15);
    this.scene.add(fillLight);

    this.scene.add(this.containerGroup, this.planeGroup, this.shipGroup, this.globeGroup);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDownBound);
    dom.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    window.addEventListener('pointercancel', this.onPointerUpBound);
  }

  private setupObservers(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.applyCameraFraming());
      this.resizeObserver.observe(this.containerRef.nativeElement);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        entries => {
          this.isVisibleInViewport = entries.some(e => e.isIntersecting);
          this.syncPlaybackState();
        },
        { threshold: 0.05 }
      );
      this.intersectionObserver.observe(this.boxRootRef.nativeElement);
    }

    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
  }

  private syncPlaybackState(): void {
    const shouldRun = this.isVisibleInViewport && !document.hidden;
    if (shouldRun && this.animationFrameId === null) {
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else if (!shouldRun) {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private buildGlobeModel(): void {
    const radius = 7.5;
    const globeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 28, 28),
      new THREE.MeshPhongMaterial({
        color: 0x1e3a5f,
        emissive: 0x0f172a,
        wireframe: true,
        transparent: true,
        opacity: 0.32
      })
    );
    this.globeGroup.add(globeSphere);

    const innerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.98, 22, 22),
      new THREE.MeshBasicMaterial({ color: 0x0f253d, transparent: true, opacity: 0.85 })
    );
    this.globeGroup.add(innerSphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.12, radius * 1.15, 56),
      new THREE.MeshBasicMaterial({ color: 0xf5b041, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2.2;
    this.globeGroup.add(ring);

    const hubs = [
      { lat: -2.189, lon: -79.889, color: 0x10b981, isHub: true },
      { lat: 25.761, lon: -80.191, color: 0xf5b041, isHub: false },
      { lat: 50.110, lon: 8.682, color: 0x93c5fd, isHub: false },
      { lat: 45.464, lon: 9.189, color: 0x93c5fd, isHub: false },
      { lat: 29.760, lon: -95.369, color: 0x93c5fd, isHub: false },
      { lat: 29.868, lon: 121.544, color: 0xf5b041, isHub: false }
    ];

    const gyePos = this.latLonToVector3(-2.189, -79.889, radius);
    const hubPinGeo = new THREE.SphereGeometry(0.35, 10, 10);
    const nodePinGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const particleGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xf5b041 });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.65 });

    hubs.forEach(h => {
      const pos = this.latLonToVector3(h.lat, h.lon, radius);
      const pin = new THREE.Mesh(
        h.isHub ? hubPinGeo : nodePinGeo,
        new THREE.MeshBasicMaterial({ color: h.color })
      );
      pin.position.copy(pos);
      this.globeGroup.add(pin);

      if (!h.isHub) {
        const mid = pos.clone().add(gyePos).multiplyScalar(0.5);
        mid.setLength(radius + pos.distanceTo(gyePos) * 0.26);
        const curve = new THREE.QuadraticBezierCurve3(pos, mid, gyePos);
        this.globeGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),
            lineMat
          )
        );
        const particle = new THREE.Mesh(particleGeo, particleMat);
        this.globeGroup.add(particle);
        this.cargoBeacons.push({ mesh: particle, curve, progress: Math.random() });
      }
    });
  }

  private latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  private animate = (now: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    const mode = this.activeMode();

    if (mode === 'container') {
      this.containerGroup.rotation.y += dt * 0.2;
    } else if (mode === 'plane') {
      this.planeGroup.rotation.y += dt * 0.2;
      this.turbineFans.forEach(f => (f.rotation.z += dt * 21));
    } else if (mode === 'ship') {
      this.shipGroup.rotation.y += dt * 0.16;
      this.radarScanners.forEach(r => (r.rotation.y += dt * 2.4));
      if (this.oceanWater) {
        this.oceanWater.rotation.y += dt * 0.06;
      }
    } else if (mode === 'globe') {
      this.globeGroup.rotation.y += dt * 0.12;
      for (const b of this.cargoBeacons) {
        b.progress += dt * 0.22;
        if (b.progress > 1) b.progress -= 1;
        b.curve.getPoint(b.progress, this.tempCurvePos);
        b.mesh.position.copy(this.tempCurvePos);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}
