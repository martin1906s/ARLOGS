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

      <!-- Top Header & Sub-navigation -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 class="fw-bold mb-0 text-dark font-heading">Administración, Credenciales y Auditoría</h5>
          <span class="fs-xs text-muted">
            Control de usuarios, emisión de accesos a clientes, permisos por rol y bitácora de cambios
          </span>
        </div>

        <div class="d-flex align-items-center gap-2 flex-wrap">
          <div class="btn-group btn-group-sm bg-white p-1 rounded-3 border border-slate-200 shadow-xs flex-wrap">
            <button
              type="button"
              class="btn btn-sm rounded-2 px-3 fs-xs fw-semibold"
              [class.btn-dark]="activeSection() === 'users'"
              [class.btn-light]="activeSection() !== 'users'"
              (click)="activeSection.set('users')">
              <i class="bi bi-people-fill me-1"></i>Usuarios
            </button>
            <button
              type="button"
              class="btn btn-sm rounded-2 px-3 fs-xs fw-semibold"
              [class.btn-dark]="activeSection() === 'clients'"
              [class.btn-light]="activeSection() !== 'clients'"
              (click)="activeSection.set('clients')">
              <i class="bi bi-key-fill me-1"></i>Credenciales Clientes
            </button>
            <button
              type="button"
              class="btn btn-sm rounded-2 px-3 fs-xs fw-semibold"
              [class.btn-dark]="activeSection() === 'roles'"
              [class.btn-light]="activeSection() !== 'roles'"
              (click)="activeSection.set('roles')">
              <i class="bi bi-grid-3x3-gap-fill me-1"></i>Roles y Pantallas
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

          <button
            type="button"
            class="btn btn-sm btn-brand-primary"
            (click)="activeSection() === 'clients' ? openClientCredModal() : openCreateModal()">
            <i class="bi" [class.bi-key-fill]="activeSection() === 'clients'" [class.bi-person-plus-fill]="activeSection() !== 'clients'"></i>
            <span>{{ activeSection() === 'clients' ? 'Emitir Credencial' : 'Nuevo Usuario' }}</span>
          </button>
        </div>
      </div>

      <!-- Summary KPI Row -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-1">
              <span class="text-uppercase fw-semibold">Total Cuentas</span>
              <i class="bi bi-people text-primary"></i>
            </div>
            <div class="fs-3 fw-bold text-dark mono-font lh-1">{{ users().length }}</div>
            <div class="text-muted fs-xxs mt-1">{{ activeUsersCount() }} activas en plataforma</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-1">
              <span class="text-uppercase fw-semibold">Accesos Clientes</span>
              <i class="bi bi-key text-info"></i>
            </div>
            <div class="fs-3 fw-bold text-primary mono-font lh-1">{{ clientAccounts().length }}</div>
            <div class="text-muted fs-xxs mt-1">Credenciales aisladas por empresa</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-1">
              <span class="text-uppercase fw-semibold">Roles Configurados</span>
              <i class="bi bi-shield-check text-success"></i>
            </div>
            <div class="fs-3 fw-bold text-dark mono-font lh-1">{{ roleOrder.length }}</div>
            <div class="text-muted fs-xxs mt-1">{{ screens.length }} pantallas controladas</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-1">
              <span class="text-uppercase fw-semibold">Eventos Auditados</span>
              <i class="bi bi-journal-text text-warning"></i>
            </div>
            <div class="fs-3 fw-bold text-dark mono-font lh-1">{{ auditLogs().length }}</div>
            <div class="text-muted fs-xxs mt-1">Trazabilidad inmutable de cambios</div>
          </div>
        </div>
      </div>

      <!-- SECTION 1: USERS CRUD -->
      @if (activeSection() === 'users') {
        <div class="card-executive p-3 mb-3">
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
                  (ngModelChange)="searchQuery.set($event)">
              </div>
            </div>

            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="filterRole()" (ngModelChange)="filterRole.set($event)">
                <option value="ALL">Todos los roles</option>
                @for (r of roleOrder; track r) {
                  <option [value]="r">{{ getRoleLabel(r) }}</option>
                }
              </select>
            </div>

            <div class="col-6 col-md-4 text-md-end text-muted fs-xs">
              Mostrando <strong class="text-dark">{{ filteredUsers().length }}</strong> de {{ users().length }} usuarios
            </div>
          </div>
        </div>

        <div class="card-executive overflow-hidden">
          <div class="table-responsive">
            <table class="table table-arlogs align-middle mb-0">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo de Acceso</th>
                  <th>Rol Asignado</th>
                  <th>Pantallas Permitidas</th>
                  <th>Estado</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of filteredUsers(); track u.id) {
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
                      <span class="badge border fs-xxs" [ngClass]="getRoleBadgeClass(u.role)">
                        {{ getRoleLabel(u.role) }}
                      </span>
                    </td>

                    <td>
                      <div class="d-flex flex-wrap gap-1">
                        @for (scr of getAllowedScreens(u.role); track scr) {
                          <span class="badge bg-slate-100 text-slate-700 border border-slate-200 fs-xxs">
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
                          {{ u.activo ? 'Activo' : 'Suspendido' }}
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
        </div>
      }

      <!-- SECTION 2: CLIENT CREDENTIALS MANAGEMENT -->
      @if (activeSection() === 'clients') {
        <div class="card-executive p-3 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h6 class="fw-bold text-dark mb-0">Emisión y Control de Credenciales para Clientes</h6>
            <span class="text-muted fs-xs">
              Cada cliente recibe un acceso único y estrictamente aislado para consultar sus embarques en línea sin saturar su correo.
            </span>
          </div>
          <button type="button" class="btn btn-sm btn-brand-primary" (click)="openClientCredModal()">
            <i class="bi bi-plus-lg"></i>
            <span>Nueva Credencial de Cliente</span>
          </button>
        </div>

        <div class="row g-3">
          @for (cli of clientAccounts(); track cli.id) {
            <div class="col-12 col-lg-6">
              <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <div class="user-avatar-sm bg-slate-900 text-white rounded-3 d-flex align-items-center justify-content-center">
                        <i class="bi {{ cli.avatarIcon }}"></i>
                      </div>
                      <div>
                        <div class="fw-bold text-dark">{{ cli.clienteNombre }}</div>
                        <div class="text-muted fs-xxs">{{ cli.nombre }} &bull; {{ cli.cargo }}</div>
                      </div>
                    </div>

                    <span class="badge border fs-xxs" [class.bg-success]="cli.activo" [class.bg-opacity-10]="cli.activo" [class.text-success]="cli.activo" [class.border-success]="cli.activo" [class.bg-secondary]="!cli.activo" [class.text-white]="!cli.activo">
                      {{ cli.activo ? 'Acceso Habilitado' : 'Revocado' }}
                    </span>
                  </div>

                  <div class="bg-slate-50 border border-slate-200 rounded-3 p-3 mb-3">
                    <div class="row g-2 fs-xs">
                      <div class="col-12 col-sm-6">
                        <span class="text-muted fs-xxs d-block">Usuario / Correo Portal</span>
                        <strong class="mono-font text-dark">{{ cli.email }}</strong>
                      </div>
                      <div class="col-12 col-sm-6">
                        <span class="text-muted fs-xxs d-block">Contraseña Activa</span>
                        <strong class="mono-font text-primary">{{ cli.password }}</strong>
                      </div>
                      <div class="col-6">
                        <span class="text-muted fs-xxs d-block">Código de Empresa</span>
                        <span class="badge bg-white text-dark border border-slate-200 mono-font fs-xxs">{{ cli.clienteId }}</span>
                      </div>
                      <div class="col-6">
                        <span class="text-muted fs-xxs d-block">Último Acceso</span>
                        <span class="mono-font fs-xxs text-dark">{{ cli.ultimoAcceso || 'Sin ingresos aún' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top border-slate-100">
                  <span class="fs-xxs text-muted">
                    Emitido: {{ cli.credencialEmitidaEn || 'Registro inicial' }}
                    @if (cli.credencialEmitidaPor) {
                      por <strong>{{ cli.credencialEmitidaPor }}</strong>
                    }
                  </span>

                  <div class="d-flex gap-1">
                    <button type="button" class="btn btn-sm btn-outline-primary fs-xxs py-1 px-2" (click)="copyClientInvite(cli)">
                      <i class="bi bi-clipboard me-1"></i>Copiar Acceso
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-warning fs-xxs py-1 px-2" (click)="rotateClientPassword(cli)">
                      <i class="bi bi-arrow-repeat me-1"></i>Rotar Clave
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

      <!-- SECTION 3: ROLES, RESPONSIBILITIES & SCREEN ACCESS MATRIX -->
      @if (activeSection() === 'roles') {
        <div class="card-executive overflow-hidden mb-3">
          <div class="p-3 bg-slate-50 border-bottom border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <strong class="text-dark fs-xs text-uppercase letter-spacing-wide">
                Matriz de Acceso a Pantallas por Rol
              </strong>
              <div class="text-muted fs-xxs">
                Activa o revoca el acceso a cada módulo en tiempo real. La barra de navegación se actualiza al instante.
              </div>
            </div>
            <span class="badge bg-blue-50 text-blue-700 border border-blue-200 fs-xxs">
              Control de Permisos
            </span>
          </div>

          <div class="table-responsive">
            <table class="table table-arlogs align-middle mb-0">
              <thead>
                <tr>
                  <th style="min-width: 220px;">Rol del Sistema</th>
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

        <div class="mb-2 d-flex align-items-center justify-content-between">
          <h6 class="fw-bold text-dark mb-0 font-heading">Alcance Operativo: Qué debe hacer cada rol</h6>
          <span class="fs-xxs text-muted">Guía de asignación para el Administrador</span>
        </div>

        <div class="row g-3">
          @for (r of roleOrder; track r) {
            @let def = getRoleDef(r);
            <div class="col-12 col-md-6 col-xl-4">
              <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="badge border fs-xs" [ngClass]="getRoleBadgeClass(r)">
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

      <!-- SECTION 4: SYSTEM AUDIT LOG -->
      @if (activeSection() === 'audit') {
        <div class="card-executive p-3 mb-3">
          <div class="row g-2 align-items-center">
            <div class="col-12 col-md-5">
              <div class="input-group input-group-sm">
                <span class="input-group-text bg-white text-muted border-end-0">
                  <i class="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  class="form-control border-start-0"
                  placeholder="Buscar por referencia (A905), usuario o detalle..."
                  [ngModel]="auditSearch()"
                  (ngModelChange)="auditSearch.set($event)">
              </div>
            </div>

            <div class="col-6 col-md-4">
              <select class="form-select form-select-sm" [ngModel]="auditCategoryFilter()" (ngModelChange)="auditCategoryFilter.set($event)">
                <option value="ALL">Todas las categorías</option>
                <option value="OPERACION_HITOS">Cambios de Hitos / Fechas</option>
                <option value="PRICING_QR">Cotizaciones QR</option>
                <option value="GERENCIA_SLA">Umbral SLA Gerencia</option>
                <option value="CREDENCIAL_CLIENTE">Credenciales a Clientes</option>
                <option value="SEGURIDAD_ROLES">Roles y Usuarios</option>
                <option value="SESION">Inicios / Intentos de Sesión</option>
              </select>
            </div>

            <div class="col-6 col-md-3 text-end">
              <button type="button" class="btn btn-sm btn-outline-success w-100" (click)="exportAudit()">
                <i class="bi bi-file-earmark-excel me-1"></i>Exportar Auditoría
              </button>
            </div>
          </div>
        </div>

        <div class="card-executive overflow-hidden">
          <div class="table-responsive">
            <table class="table table-arlogs align-middle mb-0">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Actor</th>
                  <th>Categoría</th>
                  <th>Entidad / Ref</th>
                  <th>Acción</th>
                  <th>Detalle de Trazabilidad</th>
                </tr>
              </thead>
              <tbody>
                @for (log of filteredAuditLogs(); track log.id) {
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
        </div>
      }

      <!-- CREATE / EDIT USER MODAL -->
      @if (showUserModal) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi" [class.bi-person-plus-fill]="!isEditMode" [class.bi-pencil-square]="isEditMode"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">
                    {{ isEditMode ? 'Editar Usuario y Asignación de Rol' : 'Registrar Nuevo Usuario' }}
                  </h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="closeUserModal()"></button>
              </div>

              <form (ngSubmit)="saveUser()">
                <div class="modal-body p-4">
                  @if (modalError()) {
                    <div class="alert alert-danger py-2 px-3 fs-xs mb-3">
                      <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ modalError() }}
                    </div>
                  }

                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Nombre completo</label>
                      <input type="text" class="form-control" name="nombre" [(ngModel)]="form.nombre" required placeholder="Ej. Sofía Mendoza">
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Correo corporativo</label>
                      <input type="email" class="form-control mono-font" name="email" [(ngModel)]="form.email" required placeholder="smendoza@arlogs.com">
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Contraseña</label>
                      <input type="text" class="form-control mono-font" name="password" [(ngModel)]="form.password" required placeholder="Mínimo 6 caracteres">
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Cargo / Puesto</label>
                      <input type="text" class="form-control" name="cargo" [(ngModel)]="form.cargo" placeholder="Ej. Analista de Operaciones">
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

                    <div class="col-12">
                      @let previewDef = getRoleDef(form.role);
                      <div class="bg-slate-50 border border-slate-200 rounded-3 p-3">
                        <div class="fs-xs fw-bold text-dark mb-1">
                          <i class="bi bi-info-circle text-primary me-1"></i>Responsabilidades del rol {{ previewDef.label }}
                        </div>
                        <p class="fs-xs text-muted mb-2">{{ previewDef.summary }}</p>
                        <div class="d-flex flex-wrap align-items-center gap-1">
                          <span class="fs-xxs fw-semibold text-dark me-1">Acceso a pantallas:</span>
                          @for (scr of getAllowedScreens(form.role); track scr) {
                            <span class="badge bg-white text-dark border border-slate-200 fs-xxs">
                              {{ getScreenLabel(scr) }}
                            </span>
                          }
                        </div>
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
                      <label class="form-label fs-xs fw-semibold">Empresa Cliente (Tenant Aislado)</label>
                      <select class="form-select" name="credClientId" [(ngModel)]="clientCredForm.clienteId">
                        <option value="CLI-001">Industrias Andinas DEMO S.A. (CLI-001)</option>
                        <option value="CLI-002">Comercial Pacífico DEMO Cía. Ltda. (CLI-002)</option>
                      </select>
                    </div>
                    <div>
                      <label class="form-label fs-xs fw-semibold">Nombre del Contacto Autorizado</label>
                      <input type="text" class="form-control" name="credNombre" [(ngModel)]="clientCredForm.nombre" required placeholder="Ej. Ing. Valeria Ponce">
                    </div>
                    <div>
                      <label class="form-label fs-xs fw-semibold">Correo de Acceso al Portal</label>
                      <input type="email" class="form-control mono-font" name="credEmail" [(ngModel)]="clientCredForm.email" required placeholder="vponce@cliente.com">
                    </div>
                    <div>
                      <label class="form-label fs-xs fw-semibold">Cargo</label>
                      <input type="text" class="form-control" name="credCargo" [(ngModel)]="clientCredForm.cargo" placeholder="Ej. Analista de Comercio Exterior">
                    </div>
                    <div class="bg-blue-50 border border-blue-200 rounded-3 p-2 px-3 fs-xxs text-blue-700">
                      <i class="bi bi-shield-lock me-1"></i>Se generará automáticamente una contraseña temporal segura y quedará registrado en la Auditoría.
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
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-700 { color: #334155 !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-blue-50 { background-color: #EFF6FF !important; }
    .text-blue-700 { color: #1D4ED8 !important; }
    .border-blue-200 { border-color: #BFDBFE !important; }
    .letter-spacing-wide { letter-spacing: 0.05em; }
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
  readonly roleOrder: UserRole[] = ['admin', 'gerencia', 'operaciones', 'pricing', 'cliente_a', 'cliente_b'];

  activeSection = signal<'users' | 'clients' | 'roles' | 'audit'>('users');
  modalError = signal<string | null>(null);
  userPendingDelete = signal<RoleUser | null>(null);

  searchQuery = signal('');
  filterRole = signal<UserRole | 'ALL'>('ALL');

  auditSearch = signal('');
  auditCategoryFilter = signal<AuditCategory | 'ALL'>('ALL');

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
      case 'admin': return 'bg-dark text-white border-dark';
      case 'gerencia': return 'bg-primary bg-opacity-10 text-primary border-primary border-opacity-25';
      case 'operaciones': return 'bg-info bg-opacity-10 text-info border-info border-opacity-25';
      case 'pricing': return 'bg-warning bg-opacity-10 text-warning border-warning border-opacity-25';
      case 'cliente_a':
      case 'cliente_b':
        return 'bg-success bg-opacity-10 text-success border-success border-opacity-25';
    }
  }

  getAuditBadgeClass(cat: AuditCategory): string {
    switch (cat) {
      case 'OPERACION_HITOS': return 'bg-info bg-opacity-10 text-info border-info border-opacity-25';
      case 'PRICING_QR': return 'bg-primary bg-opacity-10 text-primary border-primary border-opacity-25';
      case 'GERENCIA_SLA': return 'bg-warning bg-opacity-10 text-warning border-warning border-opacity-25';
      case 'CREDENCIAL_CLIENTE': return 'bg-success bg-opacity-10 text-success border-success border-opacity-25';
      case 'SEGURIDAD_ROLES': return 'bg-dark text-white border-dark';
      case 'SESION': return 'bg-secondary bg-opacity-10 text-dark border-secondary border-opacity-25';
    }
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.modalError.set(null);
    this.form = this.emptyForm();
    this.showUserModal = true;
  }

  openEditModal(user: RoleUser): void {
    this.isEditMode = true;
    this.modalError.set(null);
    this.form = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      password: user.password,
      cargo: user.cargo,
      role: user.role,
      activo: user.activo,
      clienteId: user.clienteId || (user.role === 'cliente_b' ? 'CLI-002' : 'CLI-001')
    };
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.modalError.set(null);
  }

  saveUser(): void {
    this.modalError.set(null);
    const payload = {
      nombre: this.form.nombre,
      email: this.form.email,
      password: this.form.password,
      cargo: this.form.cargo,
      role: this.form.role,
      activo: this.form.activo,
      clienteId: this.form.role === 'cliente_a' || this.form.role === 'cliente_b' ? this.form.clienteId : undefined
    };

    if (this.isEditMode && this.form.id) {
      const res = this.authService.updateUser(this.form.id, payload);
      if (!res.ok) {
        const err = res.error ?? 'Error al actualizar usuario.';
        this.modalError.set(err);
        this.toastService.error('Incorrecto', err);
        return;
      }
      this.showUserModal = false;
      this.toastService.success('Actualizado', `Usuario "${payload.nombre}" actualizado correctamente.`);
    } else {
      const res = this.authService.createUser(payload);
      if (!res.ok) {
        const err = res.error ?? 'Error al crear usuario.';
        this.modalError.set(err);
        this.toastService.error('Incorrecto', err);
        return;
      }
      this.showUserModal = false;
      this.toastService.success('Correcto — Creado', `Usuario "${payload.nombre}" registrado con rol ${this.getRoleLabel(payload.role)}.`);
    }
  }

  openClientCredModal(): void {
    this.modalError.set(null);
    this.clientCredForm = { clienteId: 'CLI-001', nombre: '', email: '', cargo: '' };
    this.showClientCredModal = true;
  }

  submitClientCredential(): void {
    this.modalError.set(null);
    const res = this.authService.issueClientCredentials(this.clientCredForm);
    if (!res.ok || !res.user) {
      const err = res.error ?? 'No se pudo emitir la credencial.';
      this.modalError.set(err);
      this.toastService.error('Incorrecto', err);
      return;
    }
    this.showClientCredModal = false;
    this.toastService.success(
      'Correcto — Credencial emitida',
      `Acceso creado para ${res.user.email} (clave: ${res.user.password}).`
    );
  }

  rotateClientPassword(user: RoleUser): void {
    const res = this.authService.regenerateClientPassword(user.id);
    if (!res.ok) {
      this.toastService.error('Incorrecto', res.error ?? 'No se pudo rotar la clave.');
      return;
    }
    this.toastService.success('Actualizado — Clave rotada', `Nueva clave temporal para ${user.email}: ${res.newPassword}`);
  }

  copyClientInvite(user: RoleUser): void {
    const text = `Portal ARLOGS: ${window.location.origin} | Usuario: ${user.email} | Clave: ${user.password} | Empresa: ${user.clienteNombre}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => { });
    }
    this.toastService.success('Correcto — Copiado', `Credenciales de ${user.email} copiadas al portapapeles.`);
  }

  toggleActive(id: string): void {
    const target = this.users().find(u => u.id === id);
    const res = this.authService.toggleUserActive(id);
    if (!res.ok && res.error) {
      this.toastService.error('Incorrecto', res.error);
      return;
    }
    if (target) {
      const nextState = !target.activo ? 'habilitado' : 'suspendido';
      this.toastService.success('Actualizado', `Acceso de "${target.nombre}" ${nextState}.`);
    }
  }

  confirmDeleteUser(user: RoleUser): void {
    this.userPendingDelete.set(user);
  }

  executeDelete(): void {
    const target = this.userPendingDelete();
    if (!target) return;
    const res = this.authService.deleteUser(target.id);
    this.userPendingDelete.set(null);
    if (!res.ok) {
      this.toastService.error('Incorrecto', res.error ?? 'No se pudo eliminar el usuario.');
      return;
    }
    this.toastService.success('Eliminado', `Usuario "${target.nombre}" eliminado del sistema.`);
  }

  onToggleScreen(role: UserRole, screen: ScreenId): void {
    const res = this.authService.toggleRoleScreenAccess(role, screen);
    if (!res.ok && res.error) {
      this.toastService.error('Incorrecto', res.error);
      return;
    }
    this.toastService.success(
      'Actualizado — Permisos',
      `Acceso a ${this.getScreenLabel(screen)} actualizado para ${this.getRoleLabel(role)}.`
    );
  }

  exportAudit(): void {
    this.auditService.exportAuditExcel(this.filteredAuditLogs());
    this.toastService.success('Correcto — Exportado', 'Bitácora de auditoría descargada en Excel (.xlsx).');
  }
}
