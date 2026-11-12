import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Output,
  EventEmitter,
  NgZone,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ScreenId, UserRole } from '../../models/shipment.model';
import {
  createWaterBumpTexture,
  createPortPierTextures,
  createSkyDomeTexture
} from '../../utils/procedural-textures';
import {
  createCoastalEnvironmentTexture,
  buildDetailedCargoPlane,
  buildDetailedContainer,
  buildDetailedContainerShip,
  disposeSceneResources,
  DetailedContainerRefs,
  DetailedPlaneRefs,
  DetailedShipRefs
} from '../../utils/realistic-cargo-models';

type LoginAnimPhase =
  | 'fly_in'
  | 'drop_and_land'
  | 'open_container'
  | 'ready'
  | 'error_shake'
  | 'lock_and_depart';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-viewport position-relative w-100 d-flex flex-column justify-content-between p-3 p-lg-4"
         [class.fade-out-exit]="exitingToApp()">

      <!-- Fullscreen 3D Scene -->
      <div #canvasHost class="login-3d-canvas" [class.pointer-cursor]="shipHovered()"></div>

      <!-- Top Brand Row (never overlaps card on small screens) -->
      <div class="position-relative z-2 d-flex align-items-center justify-content-between gap-2 pointer-none mb-2">
        <div class="d-flex align-items-center gap-2">
          <div class="brand-crest d-flex align-items-center justify-content-center rounded-3 text-white flex-shrink-0">
            <i class="bi bi-compass fs-5"></i>
          </div>
          <div>
            <div class="text-white fw-bold font-heading lh-1" style="letter-spacing: -0.02em;">ARLOGS</div>
            <div class="text-white-50 fs-xxs">Logística y Seguimiento Internacional</div>
          </div>
        </div>
      </div>

      <!-- Centered Glass Login Card -->
      <div class="my-auto d-flex justify-content-center w-100 py-2">
        <div class="login-glass-card position-relative z-3 w-100 p-3 p-sm-4"
             [class.card-hidden]="!cardVisible()"
             [class.card-visible]="cardVisible()"
             [class.card-shake]="phase() === 'error_shake'"
             [class.card-locked-exit]="phase() === 'lock_and_depart'">

          <div class="text-center mb-3">
            <div class="d-inline-flex align-items-center justify-content-center login-logo-badge mb-2">
              <i class="bi bi-box-seam fs-4 text-amber"></i>
            </div>
            <h4 class="text-white fw-bold font-heading mb-1 fs-5 fs-sm-4">Bienvenido a ARLOGS</h4>
            <p class="text-slate-200 fs-xs mb-0">
              Ingresa tus credenciales para acceder a tu panel
            </p>
          </div>

          @if (errorMessage()) {
            <div class="alert-glass-error d-flex align-items-center gap-2 p-2 px-3 rounded-3 mb-3 fs-xs">
              <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="d-flex flex-column gap-2 gap-sm-3">
            <div>
              <label class="form-label text-slate-200 fs-xs fw-medium mb-1">Correo electrónico</label>
              <div class="input-group input-group-glass">
                <span class="input-group-text">
                  <i class="bi bi-envelope"></i>
                </span>
                <input
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  class="form-control"
                  placeholder="correo@arlogs.com"
                  autocomplete="username"
                  [disabled]="isAuthenticating()"
                  required>
              </div>
            </div>

            <div>
              <label class="form-label text-slate-200 fs-xs fw-medium mb-1">Contraseña</label>
              <div class="input-group input-group-glass">
                <span class="input-group-text">
                  <i class="bi bi-lock"></i>
                </span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  name="password"
                  [(ngModel)]="password"
                  class="form-control"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  [disabled]="isAuthenticating()"
                  required>
                <button
                  type="button"
                  class="btn btn-eye"
                  (click)="showPassword.set(!showPassword())"
                  tabindex="-1">
                  <i class="bi" [class.bi-eye]="!showPassword()" [class.bi-eye-slash]="showPassword()"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-login-primary w-100 py-2 fw-semibold mt-1" [disabled]="isAuthenticating()">
              <span>{{ isAuthenticating() ? 'Verificando acceso...' : 'Ingresar' }}</span>
              <i class="bi bi-arrow-right ms-2"></i>
            </button>
          </form>

          <div class="mt-3 pt-3 border-top border-white border-opacity-10">
            <div class="text-slate-300 fs-xxs text-uppercase fw-semibold mb-2" style="letter-spacing: 0.06em;">
              Ingreso directo por perfil
            </div>

            <div class="row g-1 g-sm-2">
              @for (profile of quickProfiles; track profile.role) {
                <div class="col-6">
                  <button
                    type="button"
                    class="btn btn-profile-chip w-100 text-start d-flex align-items-center gap-2 py-1 px-2"
                    [disabled]="isAuthenticating()"
                    (click)="quickSignIn(profile.role)">
                    <i class="bi {{ profile.icon }} text-amber fs-xs flex-shrink-0"></i>
                    <div class="overflow-hidden lh-sm">
                      <div class="text-white fs-xxs fw-semibold text-truncate">{{ profile.label }}</div>
                      <div class="text-slate-300 text-truncate d-none d-sm-block" style="font-size: 0.64rem; opacity: 0.78;">{{ profile.email }}</div>
                    </div>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Animation Controls (responsive flow, never collides with card) -->
      <div class="position-relative z-3 d-flex align-items-center justify-content-between gap-2 mt-2" style="min-height: 32px;">
        <div>
          @if (phase() === 'ready' && !isAuthenticating()) {
            <button type="button"
                    class="btn btn-skip-intro px-3 py-1 rounded-pill fs-xxs fw-medium d-inline-flex align-items-center gap-1"
                    (click)="replayIntro()">
              <i class="bi bi-arrow-clockwise"></i> Ver animación
            </button>
          }
        </div>
        <div>
          @if (phase() === 'fly_in' || phase() === 'drop_and_land' || phase() === 'open_container') {
            <button type="button"
                    class="btn btn-skip-intro px-3 py-1 rounded-pill fs-xxs fw-semibold"
                    (click)="skipIntro()">
              Saltar animación <i class="bi bi-chevron-double-right ms-1"></i>
            </button>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    .login-viewport {
      min-height: 100dvh;
      overflow-x: hidden;
      overflow-y: auto;
      background: linear-gradient(180deg, #10253f 0%, #1d4065 48%, #5e748b 68%, #10263b 100%);
      transition: opacity 0.55s ease, transform 0.65s ease;
    }

    .fade-out-exit {
      opacity: 0;
      transform: scale(1.03);
    }

    .login-3d-canvas {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: auto;
      touch-action: pan-y;
    }

    :host ::ng-deep canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }

    .pointer-cursor { cursor: pointer; }
    .pointer-none { pointer-events: none; }

    .brand-crest {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, rgba(224, 159, 62, 0.92), rgba(180, 108, 28, 0.92));
      border: 1px solid rgba(251, 191, 36, 0.45);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.32);
    }

    .btn-skip-intro {
      background: rgba(15, 34, 58, 0.66);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e2e8f0;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .btn-skip-intro:hover {
      background: rgba(24, 53, 88, 0.88);
      color: #ffffff;
    }

    .login-glass-card {
      max-width: min(408px, 100%);
      background: rgba(14, 30, 52, 0.76);
      backdrop-filter: blur(22px) saturate(140%);
      -webkit-backdrop-filter: blur(22px) saturate(140%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 18px;
      box-shadow:
        0 28px 65px -12px rgba(4, 12, 24, 0.75),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.48s ease, border-color 0.25s ease;
    }

    .card-hidden {
      opacity: 0;
      transform: scale(0.62) translateY(24px);
      pointer-events: none;
    }

    .card-visible {
      opacity: 1;
      transform: scale(1) translateY(0);
      pointer-events: auto;
    }

    .card-locked-exit {
      opacity: 0;
      transform: scale(0.5) translateY(8px);
      pointer-events: none;
    }

    .card-shake {
      border-color: rgba(239, 68, 68, 0.85) !important;
      animation: card-vibrate 0.55s cubic-bezier(.36,.07,.19,.97) both;
    }

    @keyframes card-vibrate {
      10%, 90% { transform: translate3d(-4px, 0, 0); }
      20%, 80% { transform: translate3d(6px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
      40%, 60% { transform: translate3d(8px, 0, 0); }
    }

    .login-logo-badge {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(224, 159, 62, 0.22), rgba(29, 78, 137, 0.3));
      border: 1px solid rgba(224, 159, 62, 0.45);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
    }

    .text-amber { color: #f5b041; }
    .text-slate-200 { color: #e2e8f0; }
    .text-slate-300 { color: #cbd5e1; }

    .input-group-glass .input-group-text {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-right: none;
      color: #cbd5e1;
      border-radius: 10px 0 0 10px;
    }

    .input-group-glass .form-control {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-left: none;
      color: #ffffff;
      font-size: 0.86rem;
      padding: 8px 12px;
    }

    .input-group-glass .form-control::placeholder {
      color: rgba(203, 213, 225, 0.62);
    }

    .input-group-glass .form-control:focus {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(245, 176, 65, 0.72);
      box-shadow: none;
      color: #ffffff;
    }

    .input-group-glass .btn-eye {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-left: none;
      color: #cbd5e1;
      border-radius: 0 10px 10px 0;
    }

    .input-group-glass .btn-eye:hover { color: #ffffff; }

    .btn-login-primary {
      background: linear-gradient(135deg, #d98a2b 0%, #b86718 100%);
      border: 1px solid rgba(251, 191, 36, 0.45);
      color: #ffffff;
      border-radius: 10px;
      font-size: 0.88rem;
      box-shadow: 0 10px 24px -4px rgba(184, 103, 24, 0.48);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .btn-login-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #e59939 0%, #c9731e 100%);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .btn-profile-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      min-height: 36px;
      transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    }

    .btn-profile-chip:hover:not(:disabled) {
      background: rgba(224, 159, 62, 0.18);
      border-color: rgba(245, 176, 65, 0.55);
      transform: translateY(-1px);
    }

    .alert-glass-error {
      background: rgba(220, 38, 38, 0.24);
      border: 1px solid rgba(248, 113, 113, 0.52);
      color: #fecaca;
    }

    @media (max-width: 575.98px) {
      .login-glass-card {
        border-radius: 14px;
      }
      .login-logo-badge {
        width: 40px;
        height: 40px;
        border-radius: 12px;
      }
    }
  `]
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;
  @Output() loginSuccess = new EventEmitter<ScreenId>();

  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);

  email = 'admin@arlogs.com';
  password = '';
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  shipHovered = signal<boolean>(false);

  phase = signal<LoginAnimPhase>('fly_in');
  cardVisible = signal<boolean>(false);
  isAuthenticating = signal<boolean>(false);
  exitingToApp = signal<boolean>(false);

  readonly quickProfiles: { role: UserRole; label: string; email: string; icon: string }[] = [
    { role: 'admin', label: 'Administrador', email: 'admin@arlogs.com', icon: 'bi-shield-lock-fill' },
    { role: 'gerencia', label: 'Gerencia', email: 'gerencia@arlogs.com', icon: 'bi-speedometer2' },
    { role: 'operaciones', label: 'Operaciones', email: 'operaciones@arlogs.com', icon: 'bi-gear-wide-connected' },
    { role: 'pricing', label: 'Pricing', email: 'pricing@arlogs.com', icon: 'bi-tag-fill' },
    { role: 'cliente_a', label: 'Industrias Andinas', email: 'andinas@arlogs.com', icon: 'bi-building-fill' },
    { role: 'cliente_b', label: 'Comercial Pacífico', email: 'pacifico@arlogs.com', icon: 'bi-box-seam-fill' }
  ];

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(0, 0);

  private planeRefs!: DetailedPlaneRefs;
  private containerRefs!: DetailedContainerRefs;
  private shipRefs!: DetailedShipRefs;

  private padlockGroup = new THREE.Group();
  private shackleMesh!: THREE.Mesh;

  private oceanMesh!: THREE.Mesh;
  private oceanArray!: Float32Array;
  private oceanVertexCount = 0;
  private oceanFrameSkip = false;
  private waterBumpTex!: THREE.CanvasTexture;
  private rippleRings: { mesh: THREE.Mesh; age: number }[] = [];

  private lastTimestamp = 0;
  private lastRaycastTime = 0;
  private phaseElapsed = 0;
  private doorAngle = 0;
  private shipSurgeTime = 0;
  private mouseNormX = 0;
  private mouseNormY = 0;
  private pendingDefaultScreen: ScreenId = 'gerencia';
  private containerAttachedToShip = false;
  private cachedShipBayWorld = new THREE.Vector3();

  // Responsive 3D Scene Metrics (updated dynamically on resize/orientation change)
  private camBaseY = 3.2;
  private camBaseZ = 25;
  private planePeakScale = 0.98;
  private containerRestScale = 1.0;
  private containerRestY = -0.55;
  private shipRestX = 11.4;
  private shipRestZ = -2.5;
  private shipRestScale = 0.96;
  private isCompactViewport = false;

  private onPointerMoveBound = (e: PointerEvent): void => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.mouseNormX = (e.clientX / w) * 2 - 1;
    this.mouseNormY = -(e.clientY / h) * 2 + 1;
    this.pointer.set(this.mouseNormX, this.mouseNormY);

    if (e.pointerType === 'touch' || this.phase() !== 'ready') {
      if (this.shipHovered()) {
        this.ngZone.run(() => this.shipHovered.set(false));
      }
      return;
    }

    const now = performance.now();
    if (now - this.lastRaycastTime < 75) return;
    this.lastRaycastTime = now;

    const target = e.target as HTMLElement | null;
    if (target && target.closest('.login-glass-card')) {
      if (this.shipHovered()) {
        this.ngZone.run(() => this.shipHovered.set(false));
      }
      return;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.shipRefs.root, true);
    const isHit = hits.length > 0;
    if (isHit !== this.shipHovered()) {
      this.ngZone.run(() => this.shipHovered.set(isHit));
    }
  };

  private onWindowClickBound = (e: MouseEvent): void => {
    if (this.phase() !== 'ready') return;
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('.login-glass-card') || target.closest('button'))) {
      return;
    }
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.pointer.set((e.clientX / w) * 2 - 1, -(e.clientY / h) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.shipRefs.root, true);
    if (hits.length > 0) {
      this.shipSurgeTime = 1.0;
      this.spawnWaveRipple(this.shipRefs.root.position.x, -5.5, this.shipRefs.root.position.z, 0xf5b041);
      return;
    }
    this.spawnWaveRipple(this.mouseNormX * 10, -5.5, -2, 0x93c5fd);
  };

  private onVisibilityChangeBound = (): void => {
    if (document.hidden) {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    } else if (this.animationFrameId === null) {
      this.lastTimestamp = performance.now();
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  };

  onSubmit(): void {
    if (this.isAuthenticating()) return;
    this.errorMessage.set(null);

    const res = this.authService.authenticateCredentials(this.email, this.password);
    if (!res.ok) {
      const msg = res.error ?? 'Credenciales incorrectas.';
      this.errorMessage.set(msg);
      this.toastService.error('Incorrecto — Acceso denegado', msg);
      this.triggerErrorShake();
      return;
    }
    this.toastService.success('Correcto — Acceso concedido', 'Validando embarque y cargando panel asignado...');
    this.triggerSuccessDeparture(res.defaultScreen ?? 'gerencia');
  }

  quickSignIn(role: UserRole): void {
    if (this.isAuthenticating()) return;
    this.errorMessage.set(null);

    const res = this.authService.quickDemoLogin(role);
    if (!res.ok) {
      const msg = res.error ?? 'No se pudo iniciar sesión.';
      this.errorMessage.set(msg);
      this.toastService.error('Incorrecto — Acceso denegado', msg);
      this.triggerErrorShake();
      return;
    }
    this.toastService.success('Correcto — Acceso concedido', `Ingresando con perfil ${role}...`);
    this.triggerSuccessDeparture(res.defaultScreen ?? 'gerencia');
  }

  skipIntro(): void {
    this.ngZone.runOutsideAngular(() => {
      this.planeRefs.root.visible = false;

      this.doorAngle = Math.PI * 0.66;
      this.containerRefs.leftDoorPivot.rotation.y = -this.doorAngle;
      this.containerRefs.rightDoorPivot.rotation.y = this.doorAngle;
      this.containerRefs.bayLight.color.setHex(0xffd79e);
      this.containerRefs.bayLight.intensity = 4.5;

      this.containerRefs.root.position.set(0, this.containerRestY, 3.2);
      this.containerRefs.root.rotation.set(0.05, 0, 0);
      this.containerRefs.root.scale.setScalar(this.containerRestScale);
      this.phaseElapsed = 0;
    });

    this.phase.set('ready');
    this.cardVisible.set(true);
  }

  replayIntro(): void {
    if (this.isAuthenticating()) return;
    this.cardVisible.set(false);
    this.phase.set('fly_in');

    this.ngZone.runOutsideAngular(() => {
      this.doorAngle = 0;
      this.containerRefs.leftDoorPivot.rotation.y = 0;
      this.containerRefs.rightDoorPivot.rotation.y = 0;
      this.containerRefs.bayLight.intensity = 0;
      this.padlockGroup.visible = false;
      this.containerAttachedToShip = false;
      if (this.containerRefs.root.parent !== this.scene) {
        this.scene.add(this.containerRefs.root);
      }

      this.planeRefs.root.visible = true;
      this.shipRefs.root.visible = true;
      this.shipRefs.root.position.set(this.shipRestX, -4.3, this.shipRestZ);
      this.shipRefs.root.rotation.set(0.04, -0.52, 0);
      this.shipRefs.root.scale.setScalar(this.shipRestScale);
      (this.shipRefs.wakeMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      (this.shipRefs.bowSpray.material as THREE.MeshBasicMaterial).opacity = 0;

      this.phaseElapsed = 0;
    });
  }

  private triggerErrorShake(): void {
    this.phase.set('error_shake');
    this.ngZone.runOutsideAngular(() => {
      this.phaseElapsed = 0;
      this.spawnWaveRipple(0, -3.15, 3.2, 0xef4444);
    });
  }

  private triggerSuccessDeparture(defaultScreen: ScreenId): void {
    this.pendingDefaultScreen = defaultScreen;
    this.isAuthenticating.set(true);
    this.cardVisible.set(false);
    this.phase.set('lock_and_depart');

    this.ngZone.runOutsideAngular(() => {
      this.phaseElapsed = 0;
      this.containerAttachedToShip = false;

      // Exact world coordinates for reserved midship container slot at current responsive ship scale
      this.cachedShipBayWorld.set(2.45, 2.25, 0);
      this.shipRefs.root.updateMatrixWorld(true);
      this.shipRefs.root.localToWorld(this.cachedShipBayWorld);
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const host = this.canvasHost.nativeElement;
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      const enableShadows = w >= 640;

      this.initScene(w, h, enableShadows);
      this.buildSkyAndOcean(w);
      this.buildTexturedPier();

      this.containerRefs = buildDetailedContainer(enableShadows);
      this.containerRefs.root.scale.setScalar(0.35);
      this.scene.add(this.containerRefs.root);

      this.buildPadlock3D(enableShadows);

      this.planeRefs = buildDetailedCargoPlane(enableShadows);
      this.scene.add(this.planeRefs.root);

      this.shipRefs = buildDetailedContainerShip(enableShadows);
      this.scene.add(this.shipRefs.root);

      this.applyResponsiveLayout(w, h, true);
      this.bindEvents();

      this.lastTimestamp = performance.now();
      this.animationFrameId = requestAnimationFrame(this.animate);
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.resizeObserver?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('click', this.onWindowClickBound);
    document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);

    if (this.scene) {
      disposeSceneResources(this.scene);
      this.scene.environment?.dispose();
    }
    this.renderer?.dispose();
  }

  private bindEvents(): void {
    window.addEventListener('pointermove', this.onPointerMoveBound, { passive: true });
    window.addEventListener('click', this.onWindowClickBound);
    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        const host = this.canvasHost?.nativeElement;
        if (!host) return;
        const w = Math.max(1, host.clientWidth || window.innerWidth);
        const h = Math.max(1, host.clientHeight || window.innerHeight);
        this.applyResponsiveLayout(w, h, false);
      });
      this.resizeObserver.observe(this.canvasHost.nativeElement);
    }
  }

  private applyResponsiveLayout(w: number, h: number, initialPlacement: boolean): void {
    if (!this.renderer || !this.camera) return;
    const aspect = w / Math.max(1, h);
    this.isCompactViewport = w < 768;

    // Preserve widebody wings, 40' container, and cargo vessel across portrait phones, tablets, and desktops
    if (aspect < 0.65) {
      this.camera.fov = 56;
      this.camBaseZ = 36;
      this.camBaseY = 4.3;
      this.planePeakScale = 0.72;
      this.containerRestScale = 0.78;
      this.containerRestY = -0.35;
      this.shipRestX = 4.5;
      this.shipRestZ = -7.0;
      this.shipRestScale = 0.68;
    } else if (aspect < 0.98) {
      this.camera.fov = 49;
      this.camBaseZ = 31;
      this.camBaseY = 3.7;
      this.planePeakScale = 0.84;
      this.containerRestScale = 0.88;
      this.containerRestY = -0.45;
      this.shipRestX = 6.9;
      this.shipRestZ = -4.6;
      this.shipRestScale = 0.82;
    } else if (aspect < 1.32) {
      this.camera.fov = 44;
      this.camBaseZ = 27.5;
      this.camBaseY = 3.4;
      this.planePeakScale = 0.92;
      this.containerRestScale = 0.95;
      this.containerRestY = -0.5;
      this.shipRestX = 9.4;
      this.shipRestZ = -3.2;
      this.shipRestScale = 0.9;
    } else {
      this.camera.fov = 42;
      this.camBaseZ = 25;
      this.camBaseY = 3.2;
      this.planePeakScale = 0.98;
      this.containerRestScale = 1.0;
      this.containerRestY = -0.55;
      this.shipRestX = 11.4;
      this.shipRestZ = -2.5;
      this.shipRestScale = 0.96;
    }

    this.camera.aspect = aspect;
    this.camera.position.set(this.camera.position.x, this.camBaseY, this.camBaseZ);
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isCompactViewport ? 1.5 : 2));
    this.renderer.setSize(w, h, false);

    if (this.shipRefs?.root && (initialPlacement || this.phase() === 'ready')) {
      this.shipRefs.root.position.set(this.shipRestX, -4.3, this.shipRestZ);
      this.shipRefs.root.rotation.set(0.04, -0.52, 0);
      this.shipRefs.root.scale.setScalar(this.shipRestScale);
    }
    if (!initialPlacement && this.containerRefs?.root && this.phase() === 'ready') {
      this.containerRefs.root.scale.setScalar(this.containerRestScale);
      this.containerRefs.root.position.y = this.containerRestY;
    }
  }

  private initScene(w: number, h: number, enableShadows: boolean): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x284b6b, 0.008);

    this.camera = new THREE.PerspectiveCamera(42, w / Math.max(1, h), 0.2, 260);
    this.camera.position.set(0, 3.2, 25);
    this.camera.lookAt(0, 0.4, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: w >= 480,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = enableShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvasHost.nativeElement.appendChild(this.renderer.domElement);

    // Coastal dusk PBR environment map for real metal & glass reflections
    this.scene.environment = createCoastalEnvironmentTexture(this.renderer);

    const hemi = new THREE.HemisphereLight(0xcbe2f7, 0x162a40, 1.15);
    this.scene.add(hemi);

    const sunKey = new THREE.DirectionalLight(0xffdfb8, 2.35);
    sunKey.position.set(16, 24, 18);
    if (enableShadows) {
      sunKey.castShadow = true;
      const mapDim = w >= 1024 ? 1024 : 512;
      sunKey.shadow.mapSize.set(mapDim, mapDim);
      sunKey.shadow.camera.near = 2;
      sunKey.shadow.camera.far = 75;
      sunKey.shadow.camera.left = -22;
      sunKey.shadow.camera.right = 22;
      sunKey.shadow.camera.top = 18;
      sunKey.shadow.camera.bottom = -18;
      sunKey.shadow.bias = -0.0005;
    }
    this.scene.add(sunKey);

    const rimWarm = new THREE.DirectionalLight(0xffbe7b, 1.4);
    rimWarm.position.set(-18, 12, -24);
    this.scene.add(rimWarm);
  }

  private buildSkyAndOcean(w: number): void {
    const skyTex = createSkyDomeTexture();
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(165, 32, 22),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(skyDome);

    this.waterBumpTex = createWaterBumpTexture();
    // Adaptive mesh density cuts CPU wave overhead by 2x-4.5x while preserving fluid water look
    const segX = w < 768 ? 44 : 72;
    const segZ = w < 768 ? 32 : 48;
    const oceanGeo = new THREE.PlaneGeometry(260, 190, segX, segZ);
    oceanGeo.rotateX(-Math.PI / 2);

    const posAttr = oceanGeo.attributes['position'] as THREE.BufferAttribute;
    this.oceanArray = posAttr.array as Float32Array;
    this.oceanVertexCount = posAttr.count;

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x123857,
      metalness: 0.78,
      roughness: 0.18,
      bumpMap: this.waterBumpTex,
      bumpScale: 0.45,
      envMapIntensity: 1.4
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.set(0, -5.8, -28);
    this.oceanMesh.receiveShadow = w >= 640;
    this.scene.add(this.oceanMesh);
  }

  private buildTexturedPier(): void {
    const pierTex = createPortPierTextures();
    const pierMat = new THREE.MeshStandardMaterial({
      map: pierTex.map,
      bumpMap: pierTex.bumpMap,
      bumpScale: 0.14,
      roughness: 0.78,
      metalness: 0.12
    });

    const platform = new THREE.Mesh(new THREE.BoxGeometry(11.8, 1.8, 12.6), pierMat);
    platform.position.set(0, -4.1, 3.2);
    platform.receiveShadow = true;
    this.scene.add(platform);

    const bollardGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.56, 12);
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xe09f3e, metalness: 0.7, roughness: 0.28 });
    [[-5.0, 7.8], [5.0, 7.8], [-5.0, -1.6], [5.0, -1.6]].forEach(([bx, bz]) => {
      const b = new THREE.Mesh(bollardGeo, bollardMat);
      b.position.set(bx, -2.95, bz);
      this.scene.add(b);
    });
  }

  private buildPadlock3D(enableShadows: boolean): void {
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf0b243,
      metalness: 0.92,
      roughness: 0.16,
      envMapIntensity: 1.6
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.95,
      roughness: 0.1,
      envMapIntensity: 1.6
    });
    const keyholeMat = new THREE.MeshBasicMaterial({ color: 0x090f18 });

    const bodyShape = new THREE.Shape();
    const bw = 0.58;
    const bh = 0.68;
    const r = 0.12;
    bodyShape.moveTo(-bw + r, -bh);
    bodyShape.lineTo(bw - r, -bh);
    bodyShape.quadraticCurveTo(bw, -bh, bw, -bh + r);
    bodyShape.lineTo(bw, bh - r);
    bodyShape.quadraticCurveTo(bw, bh, bw - r, bh);
    bodyShape.lineTo(-bw + r, bh);
    bodyShape.quadraticCurveTo(-bw, bh, -bw, bh - r);
    bodyShape.lineTo(-bw, -bh + r);
    bodyShape.quadraticCurveTo(-bw, -bh, -bw + r, -bh);

    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.04,
      bevelThickness: 0.04
    });
    bodyGeo.center();
    const body = new THREE.Mesh(bodyGeo, brassMat);
    body.castShadow = enableShadows;

    const shackleGeo = new THREE.TorusGeometry(0.42, 0.11, 12, 24, Math.PI);
    this.shackleMesh = new THREE.Mesh(shackleGeo, steelMat);
    this.shackleMesh.position.set(0, 0.72, 0);

    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.44, 12), keyholeMat);
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(0, -0.05, 0.02);

    this.padlockGroup.add(body, this.shackleMesh, keyhole);
    this.padlockGroup.position.set(0, 0.05, 4.62);
    this.padlockGroup.visible = false;
    this.containerRefs.root.add(this.padlockGroup);
  }

  private spawnWaveRipple(x: number, y: number, z: number, color: number): void {
    const geo = new THREE.RingGeometry(0.65, 0.98, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, y, z);
    this.scene.add(ring);
    this.rippleRings.push({ mesh: ring, age: 0 });
  }

  private easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  }

  private easeOutBounce(x: number): number {
    const t = Math.min(1, Math.max(0, x));
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
      const u = t - 1.5 / d1;
      return n1 * u * u + 0.75;
    }
    if (t < 2.5 / d1) {
      const u = t - 2.25 / d1;
      return n1 * u * u + 0.9375;
    }
    const u = t - 2.625 / d1;
    return n1 * u * u + 0.984375;
  }

  private animate = (now: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
    this.lastTimestamp = now;
    this.phaseElapsed += dt;
    const t = now * 0.001;
    const curPhase = this.phase();

    // Responsive cursor camera parallax
    const targetCamX = this.mouseNormX * (this.isCompactViewport ? 0.75 : 1.65);
    const targetCamY = this.camBaseY + this.mouseNormY * (this.isCompactViewport ? 0.45 : 0.85);
    this.camera.position.x += (targetCamX - this.camera.position.x) * 0.05;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.05;
    this.camera.lookAt(0, 0.35, 0);

    // Specular water drift & zero-overhead Float32Array ocean swells
    if (this.waterBumpTex) {
      this.waterBumpTex.offset.x += dt * 0.028;
      this.waterBumpTex.offset.y += dt * 0.018;
    }
    if (this.oceanArray) {
      this.oceanFrameSkip = !this.oceanFrameSkip;
      if (!this.isCompactViewport || this.oceanFrameSkip) {
        const arr = this.oceanArray;
        const count = this.oceanVertexCount;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          const vx = arr[idx];
          const vz = arr[idx + 2];
          arr[idx + 1] =
            Math.sin(vx * 0.14 + t * 1.25) * 0.28 +
            Math.cos(vz * 0.16 + t * 1.05) * 0.24 +
            Math.sin((vx + vz) * 0.08 + t * 0.8) * 0.18;
        }
        (this.oceanMesh.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // Dual ship radars & plane turbofans + strobe
    this.shipRefs.radarScanners.forEach((sc, i) => (sc.rotation.y += dt * (2.2 + i * 0.9)));
    if (this.planeRefs.root.visible) {
      const fanSpeed = dt * 24;
      this.planeRefs.turbineFans.forEach(fan => (fan.rotation.z += fanSpeed));
      const blink = Math.sin(t * 9) > 0.78;
      (this.planeRefs.strobeLight.material as THREE.MeshBasicMaterial).color.setHex(blink ? 0xff4d4d : 0x550000);
    }

    // PHASE 1: Plane starts SMALL at top-center far horizon & flies straight FRONT getting LARGER
    if (curPhase === 'fly_in') {
      const dur = 2.15;
      const p = Math.min(1, this.phaseElapsed / dur);
      const ease = Math.pow(p, 1.38);

      const px = Math.sin(p * Math.PI) * 0.25;
      const py = THREE.MathUtils.lerp(14.5, 4.7, ease);
      const pz = THREE.MathUtils.lerp(-92, 2.2, ease);

      this.planeRefs.root.position.set(px, py, pz);
      this.planeRefs.root.rotation.set(0.08 * (1 - p), 0, Math.sin(p * Math.PI * 2) * 0.07);
      this.planeRefs.root.scale.setScalar(THREE.MathUtils.lerp(0.28, this.planePeakScale, ease));

      this.containerRefs.root.position.set(px, py - 1.65 * this.planeRefs.root.scale.y, pz + 0.5);
      this.containerRefs.root.rotation.set(0.05, 0, 0);
      this.containerRefs.root.scale.setScalar(THREE.MathUtils.lerp(0.22, this.containerRestScale * 0.65, ease));

      if (p >= 1) {
        this.phaseElapsed = 0;
        this.ngZone.run(() => this.phase.set('drop_and_land'));
      }
    }

    // PHASE 2: Container drops front-facing onto Pier -> Plane continues straight FORWARD & OUT OF FRAME!
    else if (curPhase === 'drop_and_land') {
      const dur = 1.15;
      const p = Math.min(1, this.phaseElapsed / dur);
      const bp = this.easeOutBounce(p);
      const ep = this.easeOutCubic(p);

      const exitP = Math.min(1, p * 1.12);
      const planeZ = THREE.MathUtils.lerp(2.2, this.camBaseZ + 12, Math.pow(exitP, 1.15));
      const planeY = THREE.MathUtils.lerp(4.7, 14.5, Math.pow(exitP, 1.2));
      this.planeRefs.root.position.set(0, planeY, planeZ);
      this.planeRefs.root.rotation.set(-0.22 * exitP, 0, 0);
      this.planeRefs.root.scale.setScalar(THREE.MathUtils.lerp(this.planePeakScale, this.planePeakScale * 1.24, exitP));

      if (planeZ >= this.camBaseZ + 6) {
        this.planeRefs.root.visible = false;
      }

      this.containerRefs.root.position.set(
        0,
        THREE.MathUtils.lerp(3.15, this.containerRestY, bp),
        THREE.MathUtils.lerp(2.7, 3.2, ep)
      );
      this.containerRefs.root.rotation.set(0.05, 0, 0);
      this.containerRefs.root.scale.setScalar(
        THREE.MathUtils.lerp(this.containerRestScale * 0.65, this.containerRestScale, ep)
      );

      if (p >= 1) {
        this.planeRefs.root.visible = false;
        this.spawnWaveRipple(0, -3.15, 3.2, 0xf5b041);
        this.phaseElapsed = 0;
        this.ngZone.run(() => this.phase.set('open_container'));
      }
    }

    // PHASE 3: Front Container doors swing wide open -> Login card appears
    else if (curPhase === 'open_container') {
      const dur = 0.9;
      const p = Math.min(1, this.phaseElapsed / dur);
      const ep = this.easeOutCubic(p);

      this.doorAngle = ep * (Math.PI * 0.66);
      this.containerRefs.leftDoorPivot.rotation.y = -this.doorAngle;
      this.containerRefs.rightDoorPivot.rotation.y = this.doorAngle;
      this.containerRefs.bayLight.color.setHex(0xffd79e);
      this.containerRefs.bayLight.intensity = ep * 4.6;

      if (p > 0.35 && !this.cardVisible()) {
        this.ngZone.run(() => this.cardVisible.set(true));
      }

      if (p >= 1) {
        this.phaseElapsed = 0;
        this.ngZone.run(() => this.phase.set('ready'));
      }
    }

    // PHASE 4: Interactive Ready State
    else if (curPhase === 'ready') {
      this.containerRefs.root.rotation.y += (this.mouseNormX * 0.1 - this.containerRefs.root.rotation.y) * 0.06;
      this.containerRefs.root.rotation.x += (0.05 - this.mouseNormY * 0.07 - this.containerRefs.root.rotation.x) * 0.06;
      this.containerRefs.root.position.y = this.containerRestY + Math.sin(t * 1.1) * 0.05;

      this.shipSurgeTime = Math.max(0, this.shipSurgeTime - dt * 0.75);
      this.shipRefs.root.position.y = -4.3 + Math.sin(t * 1.05 + 1.4) * 0.15 + Math.sin(this.shipSurgeTime * Math.PI) * 0.45;
      this.shipRefs.root.rotation.z = Math.sin(t * 0.8) * 0.025 + Math.sin(this.shipSurgeTime * Math.PI * 3) * 0.07;
      this.shipRefs.root.rotation.y += (-0.52 + this.mouseNormX * 0.12 - this.shipRefs.root.rotation.y) * 0.05;
    }

    // PHASE 5A: Wrong password shake
    else if (curPhase === 'error_shake') {
      const dur = 0.75;
      const p = Math.min(1, this.phaseElapsed / dur);
      const decay = 1 - p;
      const vib = Math.sin(this.phaseElapsed * 56) * decay;

      this.containerRefs.root.position.x = vib * 0.48;
      this.containerRefs.root.rotation.z = vib * 0.09;
      this.containerRefs.bayLight.color.setHex(0xef4444);
      this.containerRefs.bayLight.intensity = 6.5 * decay + 1.4;

      if (p >= 1) {
        this.containerRefs.root.position.x = 0;
        this.containerRefs.root.rotation.z = 0;
        this.containerRefs.bayLight.color.setHex(0xffd79e);
        this.containerRefs.bayLight.intensity = 4.6;
        this.phaseElapsed = 0;
        this.ngZone.run(() => this.phase.set('ready'));
      }
    }

    // PHASE 5B: Valid Login -> Close Doors -> Snap Padlock -> Board Ship -> Ship Sails Completely Out of Frame!
    else if (curPhase === 'lock_and_depart') {
      const e = this.phaseElapsed;

      if (e < 0.65) {
        const dp = this.easeOutCubic(e / 0.65);
        this.doorAngle = (1 - dp) * (Math.PI * 0.66);
        this.containerRefs.leftDoorPivot.rotation.y = -this.doorAngle;
        this.containerRefs.rightDoorPivot.rotation.y = this.doorAngle;
        this.containerRefs.bayLight.intensity = (1 - dp) * 4.6;
      } else if (e < 1.28) {
        this.doorAngle = 0;
        this.containerRefs.leftDoorPivot.rotation.y = 0;
        this.containerRefs.rightDoorPivot.rotation.y = 0;

        const lp = this.easeOutCubic((e - 0.65) / 0.38);
        this.padlockGroup.visible = true;
        this.padlockGroup.position.y = THREE.MathUtils.lerp(2.1, 0.05, lp);

        const snapP = Math.max(0, (e - 0.96) / 0.22);
        this.shackleMesh.position.y = THREE.MathUtils.lerp(1.04, 0.72, Math.min(1, snapP));

        if (e > 1.04 && e < 1.09) {
          this.spawnWaveRipple(0, -3.15, 3.2, 0x10b981);
        }
      } else if (e < 2.04) {
        const bp = this.easeOutCubic((e - 1.28) / 0.74);
        const arcLift = Math.sin(bp * Math.PI) * 4.2;
        const dockedScale = 0.36 * (this.shipRestScale / 0.96);

        this.containerRefs.root.position.set(
          THREE.MathUtils.lerp(0, this.cachedShipBayWorld.x, bp),
          THREE.MathUtils.lerp(this.containerRestY, this.cachedShipBayWorld.y, bp) + arcLift,
          THREE.MathUtils.lerp(3.2, this.cachedShipBayWorld.z, bp)
        );
        this.containerRefs.root.rotation.set(
          THREE.MathUtils.lerp(0.05, 0.04, bp),
          THREE.MathUtils.lerp(0, -Math.PI / 2 - 0.52, bp),
          0
        );
        this.containerRefs.root.scale.setScalar(THREE.MathUtils.lerp(this.containerRestScale, dockedScale, bp));
      } else {
        if (!this.containerAttachedToShip) {
          this.containerAttachedToShip = true;
          this.shipRefs.root.attach(this.containerRefs.root);
          this.spawnWaveRipple(this.shipRefs.root.position.x, -5.5, this.shipRefs.root.position.z, 0xf5b041);
        }

        const sp = Math.min(1, (e - 2.04) / 1.85);
        const sailSpeed = dt * (9 + 36 * Math.pow(sp, 1.15));
        this.shipRefs.root.position.x += Math.cos(0.52) * sailSpeed;
        this.shipRefs.root.position.z -= Math.sin(0.52) * sailSpeed;
        this.shipRefs.root.rotation.z = -0.045 * Math.sin(sp * Math.PI);

        (this.shipRefs.wakeMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.45, sp * 0.75);
        (this.shipRefs.bowSpray.material as THREE.MeshBasicMaterial).opacity = Math.min(0.35, sp * 0.6);
        (this.shipRefs.beaconMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);

        if (this.shipRefs.root.position.x > this.shipRestX + 27) {
          this.shipRefs.root.visible = false;
        }

        if (sp > 0.78 && !this.exitingToApp()) {
          this.ngZone.run(() => this.exitingToApp.set(true));
        }

        if (sp >= 1.0) {
          this.shipRefs.root.visible = false;
          this.ngZone.run(() => {
            this.authService.commitSession();
            this.loginSuccess.emit(this.pendingDefaultScreen);
          });
          return;
        }
      }
    }

    // Surface water ripples
    for (let i = this.rippleRings.length - 1; i >= 0; i--) {
      const r = this.rippleRings[i];
      r.age += dt * 1.35;
      const s = 1 + r.age * 8;
      r.mesh.scale.set(s, s, s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - r.age));
      if (r.age >= 1) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        this.rippleRings.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}
