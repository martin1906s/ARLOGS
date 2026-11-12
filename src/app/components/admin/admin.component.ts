import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuditService } from '../../services/audit.service';
import { ToastService } from '../../services/toast.service';
import { AuditCategory, RoleUser, ScreenId, UserRole } from '../../models/shipment.model';

interface UserFormState {
  id?: string;
  nombre: string;
  email: string;
  password: string;
  cargo: string;
  role: UserRole;
  activo: boolean;
  clienteId: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-panel py-2">

      <!-- Header & Action Ribbon -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 class="fw-bold mb-0 text-dark font-heading">Administración y Seguridad</h5>

        <div class="d-flex align-items-center gap-2 flex-wrap w-100 w-lg-auto">
          <!-- Segmented Tab Navigation -->
          <div class="d-flex flex-wrap gap-1 bg-white p-1 rounded-3 border border-slate-200 shadow-xs">
            <button
              type="button"
              class="btn btn-sm rounded-2 px-3 fs-xs fw-semibold"
              [class.btn-dark]="activeSection() === 'users'"
              [class.btn-light]="activeSection() !== 'users'"
              (click)="activeSection.set('users')">
              <i class="bi bi-people-fill me-1"></i>Usuarios ({{ users().length }})
            </button>
            <button
              type="button"
              class="btn btn-sm rounded-2 px-3 fs-xs fw-semibold"
              [class.btn-dark]="activeSection() === 'clients'"
              [class.btn-light]="activeSection() !== 'clients'"
              (click)="activeSection.set('clients')">
              <i class="bi bi-key-fill me-1"></i>Credenciales Clientes ({{ clientAccounts().length }})
            </button>
            <button
              type="button"
              class="btn btn-sm rounded-2 px-3 fs-xs fw-semibold"
              [class.btn-dark]="activeSection() === 'roles'"
              [class.btn-light]="activeSection() !== 'roles'"
              (click)="activeSection.set('roles')">
              <i class="bi bi-grid-3x3-gap-fill me-1"></i>Roles y Permisos
            </button>
            <button
              type="button"
              class="btn btn-sm rounded-2 px-3 fs-xs fw-semibold"
              [class.btn-dark]="activeSection() === 'audit'"
              [class.btn-light]="activeSection() !== 'audit'"
              (click)="activeSection.set('audit')">
              <i class="bi bi-journal-check me-1"></i>Auditoría ({{ auditLogs().length }})
            </button>
          </div>

          <!-- Primary Modal Button -->
          <button
            type="button"
            class="btn btn-sm btn-brand-primary"
            (click)="activeSection() === 'clients' ? openClientCredModal() : openCreateModal()">
            <i class="bi" [class.bi-key-fill]="activeSection() === 'clients'" [class.bi-person-plus-fill]="activeSection() !== 'clients'"></i>
            <span>{{ activeSection() === 'clients' ? 'Emitir Credencial' : 'Nuevo Usuario' }}</span>
          </button>
        </div>
      </div>

      <!-- Unified KPI Stat Strip (No bulky boxed cards) -->
      <div class="stat-ribbon bg-white border border-slate-200 rounded-3 p-3 mb-3 shadow-xs">
        <div class="row g-2 align-items-center text-center text-sm-start">
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-slate-100 text-dark rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-people"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Total Cuentas</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ users().length }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-blue-50 text-primary rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-key"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Accesos Clientes</span>
                <span class="fs-5 fw-bold mono-font text-primary">{{ clientAccounts().length }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-emerald-50 text-success rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-shield-check"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Roles Configurados</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ roleOrder.length }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-amber-50 text-warning rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-journal-text"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Eventos Auditados</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ auditLogs().length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 1: USERS (Unified container with integrated filters & pagination) -->
      @if (activeSection() === 'users') {
        <div class="card-executive overflow-hidden">
          
          <!-- Integrated Search Toolbar Header -->
          <div class="p-3 bg-slate-50 border-bottom border-slate-200">
            <div class="row g-2 align-items-center">
              <div class="col-12 col-md-5">
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-white text-muted border-end-0">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control border-start-0"
                    placeholder="Buscar por nombre, correo o cargo..."
                    [ngModel]="searchQuery()"
                    (ngModelChange)="searchQuery.set($event); userPage.set(1)">
                  @if (searchQuery()) {
                    <button class="btn btn-outline-secondary" type="button" (click)="searchQuery.set(''); userPage.set(1)">
                      <i class="bi bi-x"></i>
                    </button>
                  }
                </div>
              </div>

              <div class="col-6 col-md-4">
                <select class="form-select form-select-sm" [ngModel]="filterRole()" (ngModelChange)="filterRole.set($event); userPage.set(1)">
                  <option value="ALL">Todos los roles</option>
                  @for (r of roleOrder; track r) {
                    <option [value]="r">{{ getRoleLabel(r) }}</option>
                  }
                </select>
              </div>

              <div class="col-6 col-md-3 text-end fs-xs text-muted">
                <strong>{{ filteredUsers().length }}</strong> usuarios encontrados
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="table-responsive">
            <table class="table table-arlogs align-middle mb-0">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo de Acceso</th>
                  <th>Rol</th>
                  <th>Permisos</th>
                  <th>Estado</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of paginatedUsers(); track u.id) {
                  <tr>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        <div class="user-avatar-sm bg-slate-900 text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                          <i class="bi {{ u.avatarIcon }} fs-xs"></i>
                        </div>
                        <div>
                          <div class="fw-bold text-dark d-flex align-items-center gap-1">
                            <span>{{ u.nombre }}</span>
                            @if (u.id === currentUser().id) {
                              <span class="badge bg-blue-50 text-blue-700 border border-blue-200 fs-xxs">Sesión actual</span>
                            }
                          </div>
                          <div class="text-muted fs-xxs">{{ u.cargo }}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="mono-font fs-xs text-dark">{{ u.email }}</div>
                      @if (u.clienteNombre) {
                        <div class="text-muted fs-xxs">
                          <i class="bi bi-building me-1"></i>{{ u.clienteNombre }}
                        </div>
                      }
                    </td>

                    <td>
                      <span [ngClass]="getRoleBadgeClass(u.role)">
                        {{ getRoleLabel(u.role) }}
                      </span>
                    </td>

                    <td>
                      <div class="d-flex flex-wrap gap-1">
                        @for (scr of getAllowedScreens(u.role); track scr) {
                          <span class="badge-subtle badge-subtle-slate fs-xxs py-0 px-2">
                            {{ getScreenLabel(scr) }}
                          </span>
                        }
                      </div>
                    </td>

                    <td>
                      <div class="form-check form-switch mb-0">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          [checked]="u.activo"
                          [disabled]="u.id === currentUser().id"
                          (change)="toggleActive(u.id)">
                        <label class="form-check-label fs-xxs" [class.text-success]="u.activo" [class.text-muted]="!u.activo">
                          {{ u.activo ? 'Activo' : 'Inactivo' }}
                        </label>
                      </div>
                    </td>

                    <td class="text-end">
                      <div class="d-inline-flex gap-1">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary py-1 px-2 fs-xs"
                          (click)="openEditModal(u)"
                          title="Editar usuario y rol">
                          <i class="bi bi-pencil-square"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger py-1 px-2 fs-xs"
                          [disabled]="u.id === currentUser().id"
                          (click)="confirmDeleteUser(u)"
                          title="Eliminar usuario">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                      No se encontraron usuarios con ese criterio de búsqueda.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Functional Pagination Footer -->
          @if (filteredUsers().length > 0) {
            <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xs">
              <div class="d-flex align-items-center gap-2 text-muted">
                <span>
                  Mostrando <strong>{{ userStartIndex() }}</strong>–<strong>{{ userEndIndex() }}</strong> de <strong>{{ filteredUsers().length }}</strong>
                </span>
                <span class="d-none d-sm-inline">&bull;</span>
                <div class="d-flex align-items-center gap-1 d-none d-sm-flex">
                  <span class="text-muted fs-xxs">Filas:</span>
                  <div class="btn-group btn-group-sm pagination-size-group">
                    <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="userPageSize() === 5" [class.btn-outline-secondary]="userPageSize() !== 5" (click)="userPageSize.set(5); userPage.set(1)">5</button>
                    <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="userPageSize() === 10" [class.btn-outline-secondary]="userPageSize() !== 10" (click)="userPageSize.set(10); userPage.set(1)">10</button>
                    <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="userPageSize() === 20" [class.btn-outline-secondary]="userPageSize() !== 20" (click)="userPageSize.set(20); userPage.set(1)">20</button>
                  </div>
                </div>
              </div>

              <div class="d-flex align-items-center gap-1">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                  [disabled]="userPage() === 1"
                  (click)="userPage.set(userPage() - 1)">
                  <i class="bi bi-chevron-left"></i>
                </button>
                @for (p of userPageNumbers(); track p) {
                  <button
                    type="button"
                    class="btn btn-sm py-0 px-2 fs-xs"
                    [class.btn-dark]="userPage() === p"
                    [class.btn-outline-secondary]="userPage() !== p"
                    (click)="userPage.set(p)">
                    {{ p }}
                  </button>
                }
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                  [disabled]="userPage() === totalUserPages()"
                  (click)="userPage.set(userPage() + 1)">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- SECTION 2: CLIENT CREDENTIALS (Clean, unified card presentation) -->
      @if (activeSection() === 'clients') {
        <div class="card-executive p-3 mb-3">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h6 class="fw-bold mb-0 text-dark">Credenciales de Acceso a Portales de Clientes</h6>
            <button type="button" class="btn btn-sm btn-brand-primary" (click)="openClientCredModal()">
              <i class="bi bi-key-fill me-1"></i>Emitir Credencial
            </button>
          </div>
        </div>

        <div class="row g-3">
          @for (cli of clientAccounts(); track cli.id) {
            <div class="col-12 col-md-6">
              <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <div class="user-avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                        <i class="bi {{ cli.avatarIcon }}"></i>
                      </div>
                      <div>
                        <div class="fw-bold text-dark fs-xs">{{ cli.nombre }}</div>
                        <div class="text-muted fs-xxs">{{ cli.clienteNombre }}</div>
                      </div>
                    </div>
                    <span class="badge" [class.bg-success]="cli.activo" [class.bg-secondary]="!cli.activo">
                      {{ cli.activo ? 'Habilitado' : 'Revocado' }}
                    </span>
                  </div>

                  <div class="bg-slate-50 border border-slate-200 rounded-3 p-3 mb-3">
                    <div class="row g-2 fs-xs">
                      <div class="col-12 col-sm-6">
                        <span class="text-muted fs-xxs d-block">Usuario</span>
                        <strong class="mono-font text-dark">{{ cli.email }}</strong>
                      </div>
                      <div class="col-12 col-sm-6">
                        <span class="text-muted fs-xxs d-block">Contraseña</span>
                        <strong class="mono-font text-primary">{{ cli.password }}</strong>
                      </div>
                      <div class="col-6">
                        <span class="text-muted fs-xxs d-block">Empresa</span>
                        <span class="badge bg-white text-dark border border-slate-200 mono-font fs-xxs">{{ cli.clienteId }}</span>
                      </div>
                      <div class="col-6">
                        <span class="text-muted fs-xxs d-block">Último Ingreso</span>
                        <span class="mono-font fs-xxs text-dark">{{ cli.ultimoAcceso || 'Sin ingresos' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top border-slate-100">
                  <span class="fs-xxs text-muted">
                    Emitido: {{ cli.credencialEmitidaEn || 'Registro inicial' }}
                  </span>

                  <div class="d-flex gap-1">
                    <button type="button" class="btn btn-sm btn-outline-primary fs-xxs py-1 px-2" (click)="copyClientInvite(cli)">
                      <i class="bi bi-clipboard me-1"></i>Copiar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-warning fs-xxs py-1 px-2" (click)="rotateClientPassword(cli)">
                      <i class="bi bi-arrow-repeat me-1"></i>Rotar
                    </button>
                    <button type="button" class="btn btn-sm fs-xxs py-1 px-2" [class.btn-outline-danger]="cli.activo" [class.btn-outline-success]="!cli.activo" (click)="toggleActive(cli.id)">
                      {{ cli.activo ? 'Revocar' : 'Reactivar' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- SECTION 3: ROLES & SCREEN ACCESS MATRIX -->
      @if (activeSection() === 'roles') {
        <div class="card-executive overflow-hidden mb-3">
          <div class="p-3 bg-slate-50 border-bottom border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <strong class="text-dark fs-xs text-uppercase letter-spacing-wide">
                Matriz de Permisos por Rol
              </strong>
            </div>
            <span class="badge bg-blue-50 text-blue-700 border border-blue-200 fs-xxs">
              Control en Tiempo Real
            </span>
          </div>

          <div class="table-responsive">
            <table class="table table-arlogs align-middle mb-0">
              <thead>
                <tr>
                  <th style="min-width: 220px;">Rol</th>
                  @for (scr of screens; track scr.id) {
                    <th class="text-center">
                      <i class="bi {{ scr.icon }} me-1 text-primary"></i>{{ scr.label }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (r of roleOrder; track r) {
                  <tr>
                    <td>
                      <div class="fw-bold text-dark fs-xs">{{ getRoleLabel(r) }}</div>
                      <div class="text-muted fs-xxs">{{ countUsersInRole(r) }} usuario(s)</div>
                    </td>

                    @for (scr of screens; track scr.id) {
                      <td class="text-center">
                        <div class="form-check form-switch d-inline-flex justify-content-center mb-0">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            role="switch"
                            [checked]="hasAccess(r, scr.id)"
                            [disabled]="r === 'admin' && scr.id === 'admin'"
                            (change)="onToggleScreen(r, scr.id)">
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="row g-3">
          @for (r of roleOrder; track r) {
            @let def = getRoleDef(r);
            <div class="col-12 col-md-6 col-xl-4">
              <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span [ngClass]="getRoleBadgeClass(r)">
                      {{ def.label }}
                    </span>
                    <span class="mono-font fs-xxs text-muted">
                      {{ getAllowedScreens(r).length }} pantalla(s)
                    </span>
                  </div>

                  <p class="text-dark fs-xs fw-medium mb-2">{{ def.summary }}</p>

                  <ul class="list-unstyled mb-3 d-flex flex-column gap-1">
                    @for (task of def.tasks; track task) {
                      <li class="d-flex align-items-start gap-2 fs-xxs text-muted">
                        <i class="bi bi-check2-circle text-primary mt-1 flex-shrink-0"></i>
                        <span>{{ task }}</span>
                      </li>
                    }
                  </ul>
                </div>

                <div class="pt-2 border-top border-slate-100">
                  <div class="fs-xxs text-muted mb-1 fw-semibold">Pantallas habilitadas:</div>
                  <div class="d-flex flex-wrap gap-1">
                    @for (scr of getAllowedScreens(r); track scr) {
                      <span class="badge bg-slate-100 text-slate-700 border border-slate-200 fs-xxs">
                        {{ getScreenLabel(scr) }}
                      </span>
                    } @empty {
                      <span class="text-danger fs-xxs">Sin pantallas asignadas</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- SECTION 4: SYSTEM AUDIT LOG (Integrated container with filters & pagination) -->
      @if (activeSection() === 'audit') {
        <div class="card-executive overflow-hidden">
          
          <!-- Integrated Search Toolbar Header -->
          <div class="p-3 bg-slate-50 border-bottom border-slate-200">
            <div class="row g-2 align-items-center">
              <div class="col-12 col-md-5">
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-white text-muted border-end-0">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control border-start-0"
                    placeholder="Buscar por referencia, usuario o detalle..."
                    [ngModel]="auditSearch()"
                    (ngModelChange)="auditSearch.set($event); auditPage.set(1)">
                  @if (auditSearch()) {
                    <button class="btn btn-outline-secondary" type="button" (click)="auditSearch.set(''); auditPage.set(1)">
                      <i class="bi bi-x"></i>
                    </button>
                  }
                </div>
              </div>

              <div class="col-6 col-md-4">
                <select class="form-select form-select-sm" [ngModel]="auditCategoryFilter()" (ngModelChange)="auditCategoryFilter.set($event); auditPage.set(1)">
                  <option value="ALL">Todas las categorías</option>
                  <option value="OPERACION_HITOS">Cambios de Hitos</option>
                  <option value="PRICING_QR">Cotizaciones QR</option>
                  <option value="FACTURACION">Facturación</option>
                  <option value="BODEGA_KARDEX">Bodegas Kardex</option>
                  <option value="GERENCIA_SLA">Umbral SLA</option>
                  <option value="CREDENCIAL_CLIENTE">Credenciales</option>
                  <option value="SEGURIDAD_ROLES">Roles y Usuarios</option>
                  <option value="SESION">Inicios de Sesión</option>
                </select>
              </div>

              <div class="col-6 col-md-3 text-end">
                <button type="button" class="btn btn-sm btn-outline-success w-100" (click)="exportAudit()">
                  <i class="bi bi-file-earmark-excel me-1"></i>Exportar Excel
                </button>
              </div>
            </div>
          </div>

          <!-- Audit Table -->
          <div class="table-responsive">
            <table class="table table-arlogs align-middle mb-0">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Actor</th>
                  <th>Categoría</th>
                  <th>Referencia</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (log of paginatedAuditLogs(); track log.id) {
                  <tr>
                    <td class="mono-font fs-xxs text-muted text-nowrap">{{ log.timestamp }}</td>
                    <td>
                      <div class="fw-bold text-dark fs-xs">{{ log.usuario }}</div>
                      <div class="mono-font text-muted fs-xxs">{{ log.email }} ({{ log.rol }})</div>
                    </td>
                    <td>
                      <span class="badge border fs-xxs" [ngClass]="getAuditBadgeClass(log.categoria)">
                        {{ log.categoria }}
                      </span>
                    </td>
                    <td>
                      <span class="badge bg-slate-100 text-dark border border-slate-200 mono-font fs-xxs">
                        {{ log.entidad }}
                      </span>
                    </td>
                    <td class="fw-semibold text-dark fs-xs">{{ log.accion }}</td>
                    <td class="fs-xs text-muted">{{ log.detalle }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                      No hay eventos registrados para los filtros seleccionados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Functional Audit Pagination Footer -->
          @if (filteredAuditLogs().length > 0) {
            <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xs">
              <div class="d-flex align-items-center gap-2 text-muted">
                <span>
                  Mostrando <strong>{{ auditStartIndex() }}</strong>–<strong>{{ auditEndIndex() }}</strong> de <strong>{{ filteredAuditLogs().length }}</strong> eventos
                </span>
                <span class="d-none d-sm-inline">&bull;</span>
                <div class="d-flex align-items-center gap-1 d-none d-sm-flex">
                  <span class="text-muted fs-xxs">Filas:</span>
                  <div class="btn-group btn-group-sm pagination-size-group">
                    <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="auditPageSize() === 5" [class.btn-outline-secondary]="auditPageSize() !== 5" (click)="auditPageSize.set(5); auditPage.set(1)">5</button>
                    <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="auditPageSize() === 10" [class.btn-outline-secondary]="auditPageSize() !== 10" (click)="auditPageSize.set(10); auditPage.set(1)">10</button>
                    <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="auditPageSize() === 25" [class.btn-outline-secondary]="auditPageSize() !== 25" (click)="auditPageSize.set(25); auditPage.set(1)">25</button>
                  </div>
                </div>
              </div>

              <div class="d-flex align-items-center gap-1">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                  [disabled]="auditPage() === 1"
                  (click)="auditPage.set(auditPage() - 1)">
                  <i class="bi bi-chevron-left"></i>
                </button>
                @for (p of auditPageNumbers(); track p) {
                  <button
                    type="button"
                    class="btn btn-sm py-0 px-2 fs-xs"
                    [class.btn-dark]="auditPage() === p"
                    [class.btn-outline-secondary]="auditPage() !== p"
                    (click)="auditPage.set(p)">
                    {{ p }}
                  </button>
                }
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                  [disabled]="auditPage() === totalAuditPages()"
                  (click)="auditPage.set(auditPage() + 1)">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- CREATE / EDIT USER MODAL -->
      @if (showUserModal) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-shield-lock-fill text-warning"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">
                    {{ isEditMode ? 'Editar Usuario: ' + form.nombre : 'Crear Nuevo Usuario' }}
                  </h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="closeUserModal()"></button>
              </div>

              <form (ngSubmit)="submitUserForm()">
                <div class="modal-body p-4">
                  @if (modalError()) {
                    <div class="alert alert-danger py-2 px-3 fs-xs mb-3">{{ modalError() }}</div>
                  }
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Nombre Completo</label>
                      <input type="text" class="form-control" name="nombre" [(ngModel)]="form.nombre" required placeholder="Ej. Ing. Carlos Pérez">
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Correo de Acceso</label>
                      <input type="email" class="form-control mono-font" name="email" [(ngModel)]="form.email" required placeholder="carlos@arlogs.com">
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Contraseña</label>
                      <input type="text" class="form-control mono-font" name="password" [(ngModel)]="form.password" required placeholder="••••••••">
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Cargo Operativo</label>
                      <input type="text" class="form-control" name="cargo" [(ngModel)]="form.cargo" required placeholder="Ej. Coordinador de Operaciones">
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Rol Asignado</label>
                      <select class="form-select" name="role" [(ngModel)]="form.role">
                        @for (r of roleOrder; track r) {
                          <option [value]="r">{{ getRoleLabel(r) }}</option>
                        }
                      </select>
                    </div>

                    @if (form.role === 'cliente_a' || form.role === 'cliente_b') {
                      <div class="col-12 col-md-6">
                        <label class="form-label fs-xs fw-semibold">Empresa Cliente Vinculada</label>
                        <select class="form-select" name="clienteId" [(ngModel)]="form.clienteId">
                          <option value="CLI-001">Industrias Andinas DEMO S.A. (CLI-001)</option>
                          <option value="CLI-002">Comercial Pacífico DEMO Cía. Ltda. (CLI-002)</option>
                        </select>
                      </div>
                    }

                    <div class="col-12">
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" role="switch" id="userActiveSwitch" name="activo" [(ngModel)]="form.activo">
                        <label class="form-check-label fs-xs fw-semibold" for="userActiveSwitch">
                          Cuenta activa para iniciar sesión
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="modal-footer bg-slate-50 border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-light border" (click)="closeUserModal()">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check-lg"></i>
                    <span>{{ isEditMode ? 'Guardar Cambios' : 'Crear Usuario' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- ISSUE CLIENT CREDENTIAL MODAL -->
      @if (showClientCredModal) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-key-fill text-info"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">Emitir Credenciales de Portal Cliente</h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="showClientCredModal = false"></button>
              </div>

              <form (ngSubmit)="submitClientCredential()">
                <div class="modal-body p-4">
                  @if (modalError()) {
                    <div class="alert alert-danger py-2 px-3 fs-xs mb-3">{{ modalError() }}</div>
                  }
                  <div class="d-flex flex-column gap-3">
                    <div>
                      <label class="form-label fs-xs fw-semibold">Empresa Cliente</label>
                      <select class="form-select" name="credClientId" [(ngModel)]="clientCredForm.clienteId">
                        <option value="CLI-001">Industrias Andinas DEMO S.A. (CLI-001)</option>
                        <option value="CLI-002">Comercial Pacífico DEMO Cía. Ltda. (CLI-002)</option>
                      </select>
                    </div>
                    <div>
                      <label class="form-label fs-xs fw-semibold">Nombre del Contacto</label>
                      <input type="text" class="form-control" name="credNombre" [(ngModel)]="clientCredForm.nombre" required placeholder="Ej. Ing. Valeria Ponce">
                    </div>
                    <div>
                      <label class="form-label fs-xs fw-semibold">Correo de Acceso</label>
                      <input type="email" class="form-control mono-font" name="credEmail" [(ngModel)]="clientCredForm.email" required placeholder="vponce@cliente.com">
                    </div>
                    <div>
                      <label class="form-label fs-xs fw-semibold">Cargo</label>
                      <input type="text" class="form-control" name="credCargo" [(ngModel)]="clientCredForm.cargo" placeholder="Ej. Analista de Comercio Exterior">
                    </div>
                  </div>
                </div>
                <div class="modal-footer bg-slate-50 border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-light border" (click)="showClientCredModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check-lg me-1"></i>Generar Credencial
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- DELETE CONFIRMATION MODAL -->
      @if (userPendingDelete()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-body p-4 text-center">
                <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle mb-3" style="width: 48px; height: 48px;">
                  <i class="bi bi-trash fs-4"></i>
                </div>
                <h6 class="fw-bold text-dark mb-1">Eliminar Usuario</h6>
                <p class="text-muted fs-xs mb-3">
                  ¿Confirmas eliminar la cuenta de <strong>{{ userPendingDelete()?.nombre }}</strong>? Esta acción no se puede deshacer.
                </p>
                <div class="d-flex gap-2 justify-content-center">
                  <button type="button" class="btn btn-sm btn-light border px-3" (click)="userPendingDelete.set(null)">Cancelar</button>
                  <button type="button" class="btn btn-sm btn-danger px-3" (click)="executeDelete()">Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .user-avatar-sm { width: 32px; height: 32px; }
    .stat-icon { width: 32px; height: 32px; font-size: 1rem; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-700 { color: #334155 !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-blue-50 { background-color: #EFF6FF !important; }
    .text-blue-700 { color: #1D4ED8 !important; }
    .border-blue-200 { border-color: #BFDBFE !important; }
    .bg-emerald-50 { background-color: #ECFDF5 !important; }
    .bg-amber-50 { background-color: #FFFBEB !important; }
    .letter-spacing-wide { letter-spacing: 0.05em; }

    @media (min-width: 576px) {
      .border-end-sm { border-right: 1px solid #E2E8F0; }
    }
  `]
})
export class AdminComponent {
  private authService = inject(AuthService);
  private auditService = inject(AuditService);
  private toastService = inject(ToastService);

  readonly users = this.authService.registeredUsers;
  readonly clientAccounts = this.authService.clientUsers;
  readonly auditLogs = this.auditService.logs;
  readonly currentUser = this.authService.currentUser;
  readonly screens = this.authService.screenDefinitions;
  readonly roleOrder: UserRole[] = [
    'admin',
    'gerencia',
    'operaciones',
    'pricing',
    'contabilidad',
    'bodegas',
    'cliente_a',
    'cliente_b'
  ];

  activeSection = signal<'users' | 'clients' | 'roles' | 'audit'>('users');
  modalError = signal<string | null>(null);
  userPendingDelete = signal<RoleUser | null>(null);

  searchQuery = signal('');
  filterRole = signal<UserRole | 'ALL'>('ALL');

  auditSearch = signal('');
  auditCategoryFilter = signal<AuditCategory | 'ALL'>('ALL');

  // Pagination for Users
  userPage = signal(1);
  userPageSize = signal(5);

  // Pagination for Audit
  auditPage = signal(1);
  auditPageSize = signal(6);

  showUserModal = false;
  showClientCredModal = false;
  isEditMode = false;
  form: UserFormState = this.emptyForm();

  clientCredForm: {
    clienteId: 'CLI-001' | 'CLI-002';
    nombre: string;
    email: string;
    cargo: string;
  } = {
    clienteId: 'CLI-001',
    nombre: '',
    email: '',
    cargo: ''
  };

  readonly activeUsersCount = computed(() => this.users().filter(u => u.activo).length);

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const role = this.filterRole();
    return this.users().filter(u => {
      if (role !== 'ALL' && u.role !== role) return false;
      if (!q) return true;
      return (
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.cargo.toLowerCase().includes(q)
      );
    });
  });

  readonly totalUserPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.userPageSize()))
  );

  readonly paginatedUsers = computed(() => {
    const page = Math.min(this.userPage(), this.totalUserPages());
    const start = (page - 1) * this.userPageSize();
    return this.filteredUsers().slice(start, start + this.userPageSize());
  });

  readonly userStartIndex = computed(() =>
    this.filteredUsers().length === 0 ? 0 : (this.userPage() - 1) * this.userPageSize() + 1
  );

  readonly userEndIndex = computed(() =>
    Math.min(this.userPage() * this.userPageSize(), this.filteredUsers().length)
  );

  readonly userPageNumbers = computed(() => {
    const total = this.totalUserPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly filteredAuditLogs = computed(() => {
    const q = this.auditSearch().trim().toLowerCase();
    const cat = this.auditCategoryFilter();
    return this.auditLogs().filter(l => {
      if (cat !== 'ALL' && l.categoria !== cat) return false;
      if (!q) return true;
      return (
        l.entidad.toLowerCase().includes(q) ||
        l.usuario.toLowerCase().includes(q) ||
        l.accion.toLowerCase().includes(q) ||
        l.detalle.toLowerCase().includes(q)
      );
    });
  });

  readonly totalAuditPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAuditLogs().length / this.auditPageSize()))
  );

  readonly paginatedAuditLogs = computed(() => {
    const page = Math.min(this.auditPage(), this.totalAuditPages());
    const start = (page - 1) * this.auditPageSize();
    return this.filteredAuditLogs().slice(start, start + this.auditPageSize());
  });

  readonly auditStartIndex = computed(() =>
    this.filteredAuditLogs().length === 0 ? 0 : (this.auditPage() - 1) * this.auditPageSize() + 1
  );

  readonly auditEndIndex = computed(() =>
    Math.min(this.auditPage() * this.auditPageSize(), this.filteredAuditLogs().length)
  );

  readonly auditPageNumbers = computed(() => {
    const total = this.totalAuditPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  emptyForm(): UserFormState {
    return {
      nombre: '',
      email: '',
      password: '',
      cargo: '',
      role: 'operaciones',
      activo: true,
      clienteId: 'CLI-001'
    };
  }

  getRoleLabel(role: UserRole): string {
    return this.authService.getRoleDefinition(role).label;
  }

  getRoleDef(role: UserRole) {
    return this.authService.getRoleDefinition(role);
  }

  getScreenLabel(screen: ScreenId): string {
    return this.screens.find(s => s.id === screen)?.label ?? screen;
  }

  getAllowedScreens(role: UserRole): ScreenId[] {
    return this.authService.getAllowedScreens(role);
  }

  hasAccess(role: UserRole, screen: ScreenId): boolean {
    return this.authService.hasScreenAccess(role, screen);
  }

  countUsersInRole(role: UserRole): number {
    return this.users().filter(u => u.role === role).length;
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'badge-subtle badge-subtle-dark';
      case 'gerencia':
        return 'badge-subtle badge-subtle-blue';
      case 'operaciones':
        return 'badge-subtle badge-subtle-slate';
      case 'pricing':
        return 'badge-subtle badge-subtle-amber';
      case 'contabilidad':
        return 'badge-subtle badge-subtle-slate';
      case 'bodegas':
        return 'badge-subtle badge-subtle-slate';
      case 'cliente_a':
        return 'badge-subtle badge-subtle-emerald';
      case 'cliente_b':
        return 'badge-subtle badge-subtle-emerald';
      default:
        return 'badge-subtle badge-subtle-slate';
    }
  }

  getAuditBadgeClass(cat: AuditCategory): string {
    switch (cat) {
      case 'OPERACION_HITOS':
        return 'badge-subtle badge-subtle-slate';
      case 'PRICING_QR':
        return 'badge-subtle badge-subtle-amber';
      case 'FACTURACION':
        return 'badge-subtle badge-subtle-emerald';
      case 'BODEGA_KARDEX':
        return 'badge-subtle badge-subtle-blue';
      case 'GERENCIA_SLA':
        return 'badge-subtle badge-subtle-rose';
      case 'CREDENCIAL_CLIENTE':
        return 'badge-subtle badge-subtle-slate';
      case 'SEGURIDAD_ROLES':
        return 'badge-subtle badge-subtle-dark';
      case 'SESION':
        return 'badge-subtle badge-subtle-slate';
      default:
        return 'badge-subtle badge-subtle-slate';
    }
  }

  onToggleScreen(role: UserRole, screen: ScreenId) {
    const current = this.hasAccess(role, screen);
    this.authService.toggleRoleScreenAccess(role, screen);
    this.toastService.info(
      'Permiso actualizado',
      `${this.getRoleLabel(role)} &rarr; ${this.getScreenLabel(screen)}: ${!current ? 'Permitido' : 'Revocado'}`
    );
  }

  toggleActive(userId: string) {
    const target = this.users().find(u => u.id === userId);
    if (!target) return;
    if (target.id === this.currentUser().id) {
      this.toastService.warning('Acción no permitida', 'No puedes suspender tu propia cuenta activa.');
      return;
    }
    const res = this.authService.toggleUserActive(userId);
    if (res.ok) {
      const nextState = !target.activo;
      this.toastService.info(
        nextState ? 'Cuenta activada' : 'Cuenta suspendida',
        `El usuario ${target.nombre} ahora está ${nextState ? 'Activo' : 'Suspendido'}.`
      );
    }
  }

  openCreateModal() {
    this.isEditMode = false;
    this.form = this.emptyForm();
    this.modalError.set(null);
    this.showUserModal = true;
  }

  openEditModal(user: RoleUser) {
    this.isEditMode = true;
    this.form = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      password: user.password,
      cargo: user.cargo,
      role: user.role,
      activo: user.activo,
      clienteId: user.clienteId ?? 'CLI-001'
    };
    this.modalError.set(null);
    this.showUserModal = true;
  }

  closeUserModal() {
    this.showUserModal = false;
    this.modalError.set(null);
  }

  submitUserForm() {
    if (!this.form.nombre || !this.form.email || !this.form.password) {
      this.modalError.set('Completa los campos obligatorios.');
      return;
    }

    if (this.isEditMode && this.form.id) {
      const res = this.authService.updateUser(this.form.id, {
        nombre: this.form.nombre,
        email: this.form.email,
        password: this.form.password,
        cargo: this.form.cargo,
        role: this.form.role,
        activo: this.form.activo,
        clienteId: this.form.clienteId
      });
      if (!res.ok) {
        this.modalError.set(res.error || 'Error al actualizar');
        return;
      }
      this.toastService.success('Usuario actualizado', `${this.form.nombre} guardado exitosamente.`);
    } else {
      const res = this.authService.createUser({
        nombre: this.form.nombre,
        email: this.form.email,
        password: this.form.password,
        cargo: this.form.cargo,
        role: this.form.role,
        activo: this.form.activo,
        clienteId: this.form.clienteId
      });
      if (!res.ok) {
        this.modalError.set(res.error || 'Error al crear');
        return;
      }
      this.toastService.success('Usuario creado', `Cuenta creada para ${this.form.nombre}.`);
    }

    this.closeUserModal();
  }

  confirmDeleteUser(user: RoleUser) {
    if (user.id === this.currentUser().id) {
      this.toastService.warning('Acción denegada', 'No puedes eliminar la cuenta en sesión actual.');
      return;
    }
    this.userPendingDelete.set(user);
  }

  executeDelete() {
    const user = this.userPendingDelete();
    if (!user) return;
    const res = this.authService.deleteUser(user.id);
    this.userPendingDelete.set(null);
    if (res.ok) {
      this.toastService.info('Usuario eliminado', `Se eliminó la cuenta de ${user.nombre}.`);
    } else {
      this.toastService.error('Error al eliminar', res.error || 'No se pudo eliminar el usuario.');
    }
  }

  openClientCredModal() {
    this.clientCredForm = {
      clienteId: 'CLI-001',
      nombre: '',
      email: '',
      cargo: ''
    };
    this.modalError.set(null);
    this.showClientCredModal = true;
  }

  submitClientCredential() {
    if (!this.clientCredForm.nombre || !this.clientCredForm.email) {
      this.modalError.set('Nombre y correo son obligatorios.');
      return;
    }
    const res = this.authService.issueClientCredentials({
      clienteId: this.clientCredForm.clienteId,
      nombre: this.clientCredForm.nombre,
      email: this.clientCredForm.email,
      cargo: this.clientCredForm.cargo
    });
    if (!res.ok) {
      this.modalError.set(res.error || 'Error al emitir credencial.');
      return;
    }
    this.showClientCredModal = false;
    this.toastService.success('Credencial emitida', `Acceso creado para ${this.clientCredForm.nombre}.`);
  }

  copyClientInvite(cli: RoleUser) {
    const text = `ARLOGS Portal Cliente\nUsuario: ${cli.email}\nContraseña: ${cli.password}\nEmpresa: ${cli.clienteNombre}`;
    navigator.clipboard?.writeText(text);
    this.toastService.info('Copiado al portapapeles', `Datos de acceso de ${cli.nombre} listos para enviar.`);
  }

  rotateClientPassword(cli: RoleUser) {
    const res = this.authService.regenerateClientPassword(cli.id);
    if (res.ok) {
      this.toastService.success('Clave rotada', `Nueva contraseña generada para ${cli.nombre}.`);
    } else {
      this.toastService.error('Error', res.error || 'No se pudo rotar la contraseña.');
    }
  }

  exportAudit() {
    const lines = [
      'ID,Timestamp,Usuario,Email,Rol,Categoria,Entidad,Accion,Detalle',
      ...this.filteredAuditLogs().map(l =>
        `"${l.id}","${l.timestamp}","${l.usuario}","${l.email}","${l.rol}","${l.categoria}","${l.entidad}","${l.accion}","${l.detalle.replace(/"/g, '""')}"`
      )
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arlogs_auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Exportación completa', 'Bitácora de auditoría descargada en formato CSV.');
  }
}
