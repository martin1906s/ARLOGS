import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
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
        <div class="d-flex align-items-center justify-content-between gap-3">
          
          <!-- Logo & Brand -->
          <div class="d-flex align-items-center gap-3">
            <div class="brand-icon d-flex align-items-center justify-content-center text-white rounded-3 shadow-xs">
              <i class="bi bi-box-seam fs-5"></i>
            </div>
            <div>
              <div class="d-flex align-items-center gap-2">
                <span class="brand-title fw-bold text-dark fs-5 font-heading">ARLOGS</span>
                <span class="badge bg-slate-100 text-slate-700 border border-slate-200 fw-medium fs-xxs">
                  Freight Forwarding
                </span>
              </div>
              <div class="text-muted fs-xs d-none d-sm-block">
                Seguimiento Operativo &amp; Consolidación
              </div>
            </div>
          </div>

          <!-- Dynamic Role-Based Navigation Tabs -->
          <nav class="d-none d-md-flex align-items-center bg-slate-100 p-1 rounded-3 border border-slate-200">
            @for (tab of visibleTabs(); track tab.id) {
              <button 
                type="button" 
                class="nav-tab btn btn-sm rounded-2 py-1 px-3 fs-xs fw-semibold transition-all"
                [class.active]="activeTab === tab.id"
                (click)="onSelectTab(tab.id)">
                <i class="bi {{ tab.icon }} me-1"></i>{{ tab.label }}
              </button>
            }
          </nav>

          <!-- User Menu, Role Switcher, Export & Logout -->
          <div class="d-flex align-items-center gap-2">
            
            <!-- User Dropdown -->
            <div class="dropdown">
              <button 
                class="btn btn-sm btn-brand-outline dropdown-toggle d-flex align-items-center gap-2 py-1 px-2" 
                type="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false">
                <span class="user-avatar-circle bg-slate-900 text-white fs-xs">
                  <i class="bi {{ currentUser().avatarIcon }}"></i>
                </span>
                <div class="text-start d-none d-lg-block lh-1">
                  <div class="fw-bold fs-xs text-dark">{{ currentUser().nombre }}</div>
                  <div class="text-muted fs-xxs">{{ currentUser().cargo }}</div>
                </div>
              </button>

              <ul class="dropdown-menu dropdown-menu-end shadow-sm border border-slate-200 p-2 fs-xs user-dropdown-menu">
                <li class="dropdown-header text-uppercase fs-xxs fw-bold text-muted px-2 py-1">
                  Cambiar Perfil / Rol Activo
                </li>
                @for (user of activeUsers(); track user.id) {
                  <li>
                    <button 
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
            </div>

            <!-- Export Excel Button -->
            <button 
              type="button" 
              class="btn btn-sm btn-outline-success d-flex align-items-center gap-1 shadow-xs"
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

        <!-- Mobile Navigation Tabs -->
        <div class="d-flex d-md-none mt-2 pt-2 border-top border-slate-200 gap-1 overflow-x-auto pb-1 mobile-tab-rail">
          @for (tab of visibleTabs(); track tab.id) {
            <button 
              type="button" 
              class="btn btn-sm py-1 px-2 fs-xs rounded-2 flex-shrink-0"
              [class.btn-dark]="activeTab === tab.id"
              [class.btn-light]="activeTab !== tab.id"
              (click)="onSelectTab(tab.id)">
              <i class="bi {{ tab.icon }} me-1"></i>{{ tab.label }}
            </button>
          }
        </div>

      </div>
    </header>
  `,
  styles: [`
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%);
    }
    .brand-title { letter-spacing: -0.03em; }
    .user-avatar-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .nav-tab {
      color: #64748B;
      border: none;
      background: transparent;
    }
    .nav-tab:hover {
      color: #0F172A;
      background: rgba(255, 255, 255, 0.6);
    }
    .nav-tab.active {
      color: #0F172A;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }
    .user-dropdown-menu {
      min-width: min(290px, calc(100vw - 1.5rem));
      max-width: calc(100vw - 1.5rem);
    }
    .mobile-tab-rail {
      scrollbar-width: none;
    }
    .mobile-tab-rail::-webkit-scrollbar { display: none; }
  `]
})
export class HeaderComponent {
  @Input() activeTab: ScreenId = 'gerencia';
  @Output() tabChange = new EventEmitter<ScreenId>();
  @Output() logoutRequested = new EventEmitter<void>();

  private shipmentService = inject(ShipmentService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  readonly currentUser = this.shipmentService.currentUser;
  readonly activeUsers = computed(() =>
    this.authService.registeredUsers().filter(u => u.activo)
  );

  readonly visibleTabs = computed(() => {
    const allowed = this.authService.allowedScreensForCurrentUser();
    return this.authService.screenDefinitions.filter(s => allowed.includes(s.id));
  });

  onSelectTab(tab: ScreenId): void {
    this.tabChange.emit(tab);
  }

  switchToUser(userId: string): void {
    const user = this.authService.registeredUsers().find(u => u.id === userId);
    if (!user) return;
    this.shipmentService.setCurrentUser(user);
    const defaultTab = this.authService.getDefaultScreen(user.role);
    this.tabChange.emit(defaultTab);
    this.toastService.info(
      'Actualizado — Perfil activo',
      `Operando como ${user.nombre} (${user.role}).`
    );
  }

  switchRole(role: UserRole): void {
    const defaultTab = this.authService.switchActiveRole(role);
    this.tabChange.emit(defaultTab);
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
    this.toastService.success(
      'Correcto — Excel generado',
      `Se exportaron ${jobs.length} embarques autorizados.`
    );
  }

  onLogout(): void {
    this.toastService.info('Sesión cerrada', 'Has salido de ARLOGS de forma segura.');
    this.logoutRequested.emit();
  }
}
