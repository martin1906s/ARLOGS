import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  inject,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShipmentService } from '../../services/shipment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ScreenId, UserRole } from '../../models/shipment.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white border-bottom border-slate-200 sticky-top z-3">
      <div class="container-fluid px-3 px-lg-4 py-2">
        <div class="d-flex align-items-center justify-content-between gap-2">

          <!-- Left: Hamburger Trigger + Brand + Active Screen Pill -->
          <div class="d-flex align-items-center gap-2 gap-sm-3 min-w-0">
            <button
              type="button"
              class="btn btn-hamburger d-flex align-items-center justify-content-center rounded-3 border flex-shrink-0"
              [attr.aria-expanded]="menuOpen()"
              aria-label="Abrir menú de navegación"
              (click)="toggleMenu()">
              <i class="bi" [class.bi-list]="!menuOpen()" [class.bi-x-lg]="menuOpen()"></i>
            </button>

            <div class="d-flex align-items-center gap-2 min-w-0">
              <div class="brand-icon d-flex align-items-center justify-content-center text-white rounded-3 shadow-xs flex-shrink-0">
                <i class="bi bi-box-seam fs-6 fs-sm-5"></i>
              </div>
              <div class="min-w-0">
                <div class="d-flex align-items-center gap-2">
                  <span class="brand-title fw-bold text-dark fs-6 fs-sm-5 font-heading lh-1">ARLOGS</span>
                  <span class="badge bg-slate-200 text-slate-700 border border-slate-300 fw-semibold fs-xxs d-none d-md-inline-block">
                    Freight Forwarding
                  </span>
                </div>
                <div class="text-muted fs-xxs d-none d-lg-block text-truncate">
                  Seguimiento Operativo &amp; Consolidación
                </div>
              </div>
            </div>

            <!-- Active Screen Indicator -->
            @if (activeTabDef(); as tab) {
              <div class="active-screen-chip d-none d-md-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill fs-xs fw-semibold ms-1 flex-shrink-0">
                <i class="bi {{ tab.icon }}"></i>
                <span>{{ tab.label }}</span>
              </div>
            }
          </div>

          <!-- Right: Profile Switcher, Export & Logout -->
          <div class="d-flex align-items-center gap-1 gap-sm-2 flex-shrink-0">

            <!-- Pure Angular Profile Switcher Dropdown (no Bootstrap JS required) -->
            <div class="position-relative">
              <button
                type="button"
                class="btn btn-sm btn-brand-outline d-flex align-items-center gap-2 py-1 px-2"
                [attr.aria-expanded]="userMenuOpen()"
                (click)="toggleUserMenu($event)">
                <span class="user-avatar-circle bg-slate-900 text-white fs-xs flex-shrink-0">
                  <i class="bi {{ currentUser().avatarIcon }}"></i>
                </span>
                <div class="text-start d-none d-lg-block lh-1">
                  <div class="fw-bold fs-xs text-dark">{{ currentUser().nombre }}</div>
                  <div class="text-muted fs-xxs">{{ currentUser().cargo }}</div>
                </div>
                <i class="bi bi-chevron-down fs-xxs text-muted"></i>
              </button>

              @if (userMenuOpen()) {
                <ul class="dropdown-menu dropdown-menu-end show shadow-lg border border-slate-200 p-2 fs-xs user-dropdown-menu"
                    (click)="$event.stopPropagation()">
                  <li class="dropdown-header text-uppercase fs-xxs fw-bold text-muted px-2 py-1">
                    Cambiar Perfil / Rol Activo
                  </li>
                  @for (user of activeUsers(); track user.id) {
                    <li>
                      <button
                        type="button"
                        class="dropdown-item rounded-2 d-flex align-items-start gap-2 p-2 mb-1"
                        [class.bg-slate-100]="currentUser().id === user.id"
                        [class.fw-bold]="currentUser().id === user.id"
                        (click)="switchToUser(user.id)">
                        <i class="bi {{ user.avatarIcon }} mt-1 text-primary"></i>
                        <div class="overflow-hidden">
                          <div class="text-dark text-truncate">{{ user.nombre }}</div>
                          <div class="text-muted fs-xxs fw-normal text-truncate">{{ user.cargo }}</div>
                        </div>
                      </button>
                    </li>
                  }
                  <li><hr class="dropdown-divider my-1"></li>
                  <li>
                    <button
                      type="button"
                      class="dropdown-item rounded-2 d-flex align-items-center gap-2 p-2 text-danger fw-semibold"
                      (click)="onLogout()">
                      <i class="bi bi-box-arrow-right"></i>
                      <span>Cerrar Sesión</span>
                    </button>
                  </li>
                </ul>
              }
            </div>

            <!-- Export Excel Button (shown in top bar on sm+; always inside Hamburger drawer on mobile) -->
            <button
              type="button"
              class="btn btn-sm btn-outline-success d-none d-sm-flex align-items-center gap-1 shadow-xs"
              (click)="exportExcel()"
              title="Descargar reporte en Excel (.xlsx)">
              <i class="bi bi-file-earmark-excel"></i>
              <span class="d-none d-xl-inline">Exportar Excel</span>
            </button>

            <!-- Direct Sign Out Button -->
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-xs"
              (click)="onLogout()"
              title="Cerrar sesión">
              <i class="bi bi-box-arrow-right"></i>
            </button>

          </div>
        </div>
      </div>
    </header>

    <!-- Hamburger Slide-Over Navigation Drawer & Backdrop -->
    @if (menuOpen()) {
      <div class="drawer-backdrop" (click)="closeMenu()"></div>
      <aside class="nav-drawer shadow-lg d-flex flex-column justify-content-between" role="navigation" aria-label="Menú principal ARLOGS">
        <div>
          <!-- Drawer Brand Header -->
          <div class="d-flex align-items-center justify-content-between p-3 border-bottom border-slate-200 bg-slate-900 text-white">
            <div class="d-flex align-items-center gap-2">
              <div class="brand-icon-sm d-flex align-items-center justify-content-center rounded-2">
                <i class="bi bi-compass fs-5 text-amber"></i>
              </div>
              <div>
                <div class="fw-bold font-heading lh-1">ARLOGS</div>
                <div class="fs-xxs text-slate-300">Menú de Navegación</div>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-light border-0" aria-label="Cerrar menú" (click)="closeMenu()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Active Profile Summary -->
          <div class="p-3 bg-slate-50 border-bottom border-slate-200 d-flex align-items-center gap-2">
            <span class="user-avatar-circle bg-slate-900 text-white fs-xs flex-shrink-0">
              <i class="bi {{ currentUser().avatarIcon }}"></i>
            </span>
            <div class="overflow-hidden">
              <div class="fw-bold fs-xs text-dark text-truncate">{{ currentUser().nombre }}</div>
              <div class="text-muted fs-xxs text-truncate">{{ currentUser().cargo }}</div>
            </div>
          </div>

          <!-- Screen Links -->
          <div class="p-3">
            <div class="fs-xxs fw-bold text-uppercase text-muted mb-2 px-2" style="letter-spacing: 0.06em;">
              Pantallas Autorizadas
            </div>
            <div class="d-flex flex-column gap-1">
              @for (tab of visibleTabs(); track tab.id) {
                <button
                  type="button"
                  class="drawer-nav-item btn w-100 text-start d-flex align-items-center justify-content-between gap-2 px-3 py-2 rounded-3"
                  [class.active]="activeTab === tab.id"
                  (click)="onSelectTab(tab.id)">
                  <span class="d-flex align-items-center gap-2">
                    <i class="bi {{ tab.icon }} fs-6"></i>
                    <span class="fw-semibold fs-xs">{{ tab.label }}</span>
                  </span>
                  @if (activeTab === tab.id) {
                    <i class="bi bi-check-circle-fill fs-xs"></i>
                  } @else {
                    <i class="bi bi-chevron-right fs-xxs opacity-50"></i>
                  }
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Drawer Bottom Quick Actions -->
        <div class="p-3 border-top border-slate-200 bg-slate-50 d-flex flex-column gap-2">
          <button type="button" class="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2" (click)="exportExcel()">
            <i class="bi bi-file-earmark-excel"></i>
            <span>Exportar Reporte Excel</span>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2" (click)="onLogout()">
            <i class="bi bi-box-arrow-right"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    }
  `,
  styles: [`
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .border-slate-300 { border-color: #CBD5E1 !important; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-200 { background-color: #E2E8F0 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-300 { color: #CBD5E1 !important; }
    .text-amber { color: #F5B041; }

    .btn-hamburger {
      width: 38px;
      height: 38px;
      background-color: #F8FAFC;
      border-color: #CBD5E1 !important;
      color: #0F172A;
      font-size: 1.25rem;
      transition: background-color 0.15s ease, transform 0.15s ease;
    }
    .btn-hamburger:hover {
      background-color: #E2E8F0;
      color: #1D4ED8;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%);
    }
    @media (max-width: 575.98px) {
      .btn-hamburger {
        width: 34px;
        height: 34px;
        font-size: 1.15rem;
      }
      .brand-icon {
        width: 30px;
        height: 30px;
      }
    }
    .brand-icon-sm {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.35);
    }
    .brand-title { letter-spacing: -0.03em; }

    .active-screen-chip {
      background-color: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
    }

    .user-avatar-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .user-dropdown-menu {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      min-width: min(295px, calc(100vw - 1.5rem));
      max-width: calc(100vw - 1.5rem);
      z-index: 1050;
    }

    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(3px);
      z-index: 1080;
      animation: fadeInBackdrop 0.18s ease-out;
    }

    .nav-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: min(310px, 86vw);
      background: #FFFFFF;
      z-index: 1090;
      border-right: 1px solid #E2E8F0;
      animation: slideInDrawer 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .drawer-nav-item {
      color: #334155;
      background: transparent;
      border: 1px solid transparent;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .drawer-nav-item:hover {
      background-color: #F1F5F9;
      color: #0F172A;
    }
    .drawer-nav-item.active {
      background-color: #0F172A;
      color: #FFFFFF;
      border-color: #0F172A;
    }

    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInDrawer {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class HeaderComponent {
  @Input() activeTab: ScreenId = 'gerencia';
  @Output() tabChange = new EventEmitter<ScreenId>();
  @Output() logoutRequested = new EventEmitter<void>();

  private shipmentService = inject(ShipmentService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  menuOpen = signal(false);
  userMenuOpen = signal(false);

  readonly currentUser = this.shipmentService.currentUser;
  readonly activeUsers = computed(() =>
    this.authService.registeredUsers().filter(u => u.activo)
  );

  readonly visibleTabs = computed(() => {
    const allowed = this.authService.allowedScreensForCurrentUser();
    return this.authService.screenDefinitions.filter(s => allowed.includes(s.id));
  });

  readonly activeTabDef = computed(() =>
    this.visibleTabs().find(t => t.id === this.activeTab) ?? this.visibleTabs()[0] ?? null
  );

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  toggleMenu(): void {
    this.userMenuOpen.set(false);
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.userMenuOpen.update(v => !v);
  }

  onSelectTab(tab: ScreenId): void {
    this.tabChange.emit(tab);
    this.menuOpen.set(false);
  }

  switchToUser(userId: string): void {
    const user = this.authService.registeredUsers().find(u => u.id === userId);
    if (!user) return;
    this.shipmentService.setCurrentUser(user);
    const defaultTab = this.authService.getDefaultScreen(user.role);
    this.tabChange.emit(defaultTab);
    this.userMenuOpen.set(false);
    this.menuOpen.set(false);
    this.toastService.info(
      'Actualizado — Perfil activo',
      `Operando como ${user.nombre} (${user.role}).`
    );
  }

  switchRole(role: UserRole): void {
    const defaultTab = this.authService.switchActiveRole(role);
    this.tabChange.emit(defaultTab);
    this.userMenuOpen.set(false);
    this.toastService.info(
      'Actualizado — Rol activo',
      `Permisos cambiados a vista ${role}.`
    );
  }

  exportExcel(): void {
    const jobs = this.shipmentService.authorizedJobs();
    if (!jobs.length) {
      this.toastService.warning(
        'Sin datos para exportar',
        'No hay embarques autorizados en tu perfil actual.'
      );
      return;
    }
    this.shipmentService.exportToExcel(jobs);
    this.menuOpen.set(false);
    this.toastService.success(
      'Correcto — Excel generado',
      `Se exportaron ${jobs.length} embarques autorizados.`
    );
  }

  onLogout(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
    this.toastService.info('Sesión cerrada', 'Has salido de ARLOGS de forma segura.');
    this.logoutRequested.emit();
  }
}
