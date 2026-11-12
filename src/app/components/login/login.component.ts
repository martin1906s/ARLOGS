import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { DEMO_USERS, ROLE_DEFINITIONS, ScreenId, UserRole } from '../../models/shipment.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-viewport d-flex flex-column flex-lg-row">
      
      <!-- LEFT COLUMN: Clean corporate authentication panel -->
      <section class="auth-panel d-flex flex-column justify-content-center">
        
        <div class="auth-content-wrap">
          
          <!-- Brand Header -->
          <header class="brand-header">
            <div class="d-flex align-items-center gap-2">
              <div class="brand-icon-box">
                <i class="bi bi-box-seam-fill"></i>
              </div>
              <div class="d-flex flex-column">
                <span class="brand-title">ARLOGS</span>
                <span class="brand-caption">Global Freight &amp; Forwarding</span>
              </div>
            </div>
          </header>

          <!-- Main Auth Title (No unnecessary subtitles) -->
          <div class="auth-heading-group">
            <h1 class="auth-title">Iniciar Sesión</h1>
          </div>

          <!-- Error Alert Banner (if any) -->
          @if (errorMessage()) {
            <div class="auth-error-banner d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-circle-fill flex-shrink-0"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Authentication Form -->
          <form (ngSubmit)="onSubmit()" class="auth-form">
            <!-- Email Input -->
            <div class="form-group">
              <label for="corporate-email" class="form-label-custom">Correo corporativo</label>
              <div class="input-wrapper">
                <i class="bi bi-envelope input-leading-icon"></i>
                <input
                  id="corporate-email"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  class="input-field"
                  placeholder="admin@arlogs.com"
                  autocomplete="username"
                  [disabled]="isAuthenticating()"
                  required>
              </div>
            </div>

            <!-- Password Input -->
            <div class="form-group">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label for="corporate-password" class="form-label-custom mb-0">Contraseña</label>
                <span class="security-hint">Protegido por RBAC</span>
              </div>
              <div class="input-wrapper">
                <i class="bi bi-shield-lock input-leading-icon"></i>
                <input
                  id="corporate-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  name="password"
                  [(ngModel)]="password"
                  class="input-field"
                  placeholder="••••••••••••"
                  autocomplete="current-password"
                  [disabled]="isAuthenticating()"
                  required>
                <button
                  type="button"
                  class="input-trailing-action"
                  (click)="showPassword.set(!showPassword())"
                  tabindex="-1"
                  aria-label="Mostrar u ocultar contraseña">
                  <i class="bi" [class.bi-eye]="!showPassword()" [class.bi-eye-slash]="showPassword()"></i>
                </button>
              </div>
            </div>

            <!-- Primary Action Button -->
            <button
              type="submit"
              class="btn-auth-submit d-flex align-items-center justify-content-center gap-2"
              [disabled]="isAuthenticating()">
              <span>{{ isAuthenticating() ? 'Autenticando...' : 'Entrar a la Plataforma' }}</span>
              <i class="bi bi-arrow-right"></i>
            </button>
          </form>

          <!-- Acceso Rápido por Perfil -->
          <div class="profiles-section">
            <div class="profiles-header d-flex align-items-center justify-content-between">
              <span class="profiles-title">Acceso rápido por perfil</span>
              <span class="profiles-count">8 roles disponibles</span>
            </div>

            <div class="profiles-tag-cloud d-flex flex-wrap gap-2">
              @for (profile of quickProfiles; track profile.role) {
                <button
                  type="button"
                  class="role-tag-btn"
                  [disabled]="isAuthenticating()"
                  (click)="quickSignIn(profile.role)">
                  <span class="role-status-dot" [ngClass]="profile.badgeBg"></span>
                  <span class="role-name">{{ profile.label }}</span>
                </button>
              }
            </div>
          </div>
        </div>

      </section>

      <!-- RIGHT COLUMN: Cinematic visual covering 100% of the section with imposing typography -->
      <section class="visual-panel position-relative d-flex flex-column justify-content-center">
        
        <!-- Clean High-End Aerial Vessel Image (Spans 100% of Section, Full Bleed) -->
        <img
          src="assets/logistics-hero.jpg"
          alt="ARLOGS Vessel Logistics"
          class="visual-bg-image">

        <!-- Smooth gradient scrim ensuring 100% typography legibility -->
        <div class="visual-scrim"></div>

        <!-- Center: Striking, unhurried typography in calm negative space -->
        <div class="visual-typography-layout position-relative z-1">
          
          <!-- Category Eyebrow -->
          <div class="type-eyebrow">
            SISTEMA INTEGRAL DE LOGÍSTICA MULTIMODAL
          </div>

          <!-- Type 1: Imposing Extended Bold Sans -->
          <h2 class="type-display-primary">
            CONECTIVIDAD
          </h2>
          <h2 class="type-display-primary text-gold">
            SIN FRONTERAS
          </h2>

          <!-- Type 2: Imposing Editorial Serif Italic -->
          <p class="type-display-serif">
            Trazabilidad de alta precisión en cada milla marítima y aérea.
          </p>

        </div>

      </section>

    </div>
  `,
  styles: [`
    /* ========================================================
       FULLSCREEN VIEWPORT ARCHITECTURE
       ======================================================== */
    .login-viewport {
      width: 100vw;
      min-height: 100vh;
      min-height: 100dvh;
      background: #090e17;
      overflow-x: hidden;
    }

    /* ========================================================
       LEFT PANEL: AUTHENTICATION (Human-Crafted, Breathable)
       ======================================================== */
    .auth-panel {
      width: 100%;
      background: #ffffff;
      padding: clamp(2rem, 5vw, 4rem);
      z-index: 2;
      overflow-y: auto;
    }

    @media (min-width: 992px) {
      .auth-panel {
        width: 42%;
        min-width: 440px;
        max-width: 540px;
        min-height: 100vh;
      }
      .visual-panel {
        width: 58%;
        min-height: 100vh;
      }
    }

    /* Brand Header */
    .brand-header {
      margin-bottom: 2rem;
    }
    .brand-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #0f172a;
      color: #fed64d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .brand-title {
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: 0.05em;
      color: #0f172a;
      line-height: 1.1;
    }
    .brand-caption {
      font-size: 0.72rem;
      color: #64748b;
      letter-spacing: 0.02em;
    }

    /* Headings */
    .auth-heading-group {
      margin-bottom: 2rem;
    }
    .auth-title {
      font-family: var(--font-heading);
      font-size: clamp(1.75rem, 2.5vw, 2.2rem);
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 0;
    }

    /* Error Banner */
    .auth-error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.82rem;
      margin-bottom: 1.5rem;
    }

    /* Form Fields */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-bottom: 2.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
    }
    .form-label-custom {
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.35rem;
      letter-spacing: 0.01em;
    }
    .security-hint {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-leading-icon {
      position: absolute;
      left: 14px;
      color: #94a3b8;
      font-size: 0.95rem;
      pointer-events: none;
    }
    .input-trailing-action {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.95rem;
      cursor: pointer;
      padding: 4px;
    }
    .input-trailing-action:hover {
      color: #334155;
    }

    .input-field {
      width: 100%;
      height: 44px;
      padding: 0 40px 0 40px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.88rem;
      color: #0f172a;
      transition: all 0.15s ease;
    }
    .input-field:focus {
      outline: none;
      background: #ffffff;
      border-color: #0f172a;
      box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
    }
    .input-field::placeholder {
      color: #cbd5e1;
    }

    /* Submit Button */
    .btn-auth-submit {
      width: 100%;
      height: 46px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.92rem;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-top: 0.5rem;
    }
    .btn-auth-submit:hover:not(:disabled) {
      background: #1e293b;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }
    .btn-auth-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Profiles Tag Cloud */
    .profiles-section {
      padding-top: 1.5rem;
      border-top: 1px solid #f1f5f9;
    }
    .profiles-header {
      margin-bottom: 0.85rem;
    }
    .profiles-title {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .profiles-count {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .profiles-tag-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .role-tag-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.75rem;
      font-weight: 500;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .role-tag-btn:hover:not(:disabled) {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
      transform: translateY(-1px);
    }
    .role-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ========================================================
       RIGHT PANEL: CINEMATIC HERO (100% Full Bleed Coverage)
       ======================================================== */
    .visual-panel {
      flex: 1;
      position: relative;
      min-height: 520px;
      padding: clamp(2.5rem, 6vw, 5rem);
      background: #08101e;
      overflow: hidden;
    }

    .visual-bg-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
      filter: brightness(0.88) contrast(1.05);
      z-index: 0;
    }

    /* Scrim gradient: 100% full cover to guarantee high-contrast legibility */
    .visual-scrim {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        140deg,
        rgba(8, 16, 30, 0.85) 0%,
        rgba(9, 21, 38, 0.62) 45%,
        rgba(6, 12, 24, 0.78) 100%
      );
      z-index: 1;
    }

    /* Typography Box: positioned in calm negative space */
    .visual-typography-layout {
      max-width: 620px;
    }

    .type-eyebrow {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #fed64d;
      margin-bottom: 0.8rem;
    }

    /* Type 1: Extended Bold Display */
    .type-display-primary {
      font-family: 'Syncopate', sans-serif;
      font-size: clamp(2rem, 3.8vw, 3.5rem);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: 0.02em;
      color: #ffffff;
      margin: 0;
      text-transform: uppercase;
    }
    .text-gold {
      color: #fed64d;
    }

    /* Type 2: Imposing Editorial Serif Italic */
    .type-display-serif {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-weight: 600;
      font-size: clamp(1.5rem, 2.6vw, 2.3rem);
      line-height: 1.25;
      color: #e2e8f0;
      margin-top: 1.25rem;
      margin-bottom: 0;
    }
  `]
})
export class LoginComponent {
  @Output() loginSuccess = new EventEmitter<ScreenId>();

  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  email = 'admin@arlogs.com';
  password = '••••••••••••';
  showPassword = signal(false);
  isAuthenticating = signal(false);
  errorMessage = signal<string | null>(null);

  // 8 Quick Access Roles
  readonly quickProfiles: Array<{
    role: UserRole;
    label: string;
    badgeBg: string;
    scope: string;
  }> = [
    { role: 'admin', label: 'Admin', badgeBg: 'bg-slate-900', scope: 'Control total' },
    { role: 'gerencia', label: 'Gerencia', badgeBg: 'bg-slate-800', scope: 'SLA y Profit' },
    { role: 'operaciones', label: 'Operaciones', badgeBg: 'bg-slate-700', scope: 'Hitos H1-H10' },
    { role: 'pricing', label: 'Pricing', badgeBg: 'bg-slate-600', scope: 'Cotizaciones' },
    { role: 'contabilidad', label: 'Contabilidad', badgeBg: 'bg-slate-600', scope: 'Facturación' },
    { role: 'bodegas', label: 'Bodegas', badgeBg: 'bg-slate-600', scope: 'Kardex y Guías' },
    { role: 'cliente_a', label: 'Ind. Andinas', badgeBg: 'bg-slate-700', scope: 'Portal Cliente' },
    { role: 'cliente_b', label: 'Com. Pacífico', badgeBg: 'bg-slate-700', scope: 'Portal Cliente' }
  ];

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor ingresa usuario y contraseña.');
      this.toastService.warning('Campos incompletos', 'Ingresa usuario y contraseña para continuar.');
      return;
    }

    this.isAuthenticating.set(true);
    this.errorMessage.set(null);

    const res = this.authService.login(this.email, this.password);
    this.isAuthenticating.set(false);

    if (res.ok && res.user && res.defaultScreen) {
      this.toastService.success(
        'Sesión iniciada',
        `Bienvenido, ${res.user.nombre} (${ROLE_DEFINITIONS[res.user.role].label})`
      );
      this.loginSuccess.emit(res.defaultScreen);
    } else {
      this.errorMessage.set(res.error || 'Credenciales no válidas.');
      this.toastService.error(
        'Error de autenticación',
        res.error || 'El correo o contraseña no coinciden con ninguna cuenta activa.'
      );
    }
  }

  quickSignIn(role: UserRole) {
    const demoUser = DEMO_USERS.find(u => u.role === role);
    if (demoUser) {
      this.email = demoUser.email;
      this.password = demoUser.password;
      this.onSubmit();
    }
  }
}
