import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { WarehouseId, WarehouseItem } from '../../models/shipment.model';

@Component({
  selector: 'app-warehouse-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="warehouse-view py-2">

      <!-- Header & Action -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 class="fw-bold mb-0 text-dark font-heading">Bodegas &amp; Control Kardex</h5>

        <button type="button" class="btn btn-sm btn-brand-primary d-flex align-items-center gap-1" (click)="openReceiptModal()">
          <i class="bi bi-box-arrow-in-down"></i>
          <span>Registrar Ingreso a Bodega</span>
        </button>
      </div>

      <!-- Unified KPI Stat Strip (Space-optimized) -->
      <div class="stat-ribbon bg-white border border-slate-200 rounded-3 p-3 mb-3 shadow-xs">
        <div class="row g-2 align-items-center text-center text-sm-start">
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-slate-100 text-dark rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-building"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Bodega Norte (GYE)</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ summary().b1Units }} u.</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-blue-50 text-primary rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-building-check"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Bodega Sur (Puerto)</span>
                <span class="fs-5 fw-bold mono-font text-primary">{{ summary().b2Units }} u.</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-emerald-50 text-success rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-boxes"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Saldo Disponible</span>
                <span class="fs-5 fw-bold mono-font text-success">{{ summary().totalAvailable }} u.</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-amber-50 text-warning rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-file-earmark-text"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Movimientos</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ movements().length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Unified Table Card with Integrated Toolbar & Pagination -->
      <div class="card-executive overflow-hidden mb-3">
        
        <!-- Integrated Toolbar Header -->
        <div class="p-3 bg-slate-50 border-bottom border-slate-200">
          <div class="row g-2 align-items-center">
            <div class="col-12 col-md-4">
              <div class="input-group input-group-sm">
                <span class="input-group-text bg-white text-muted border-end-0">
                  <i class="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  class="form-control border-start-0"
                  placeholder="Buscar por OC, Descripción, Rack o Guía..."
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event); whPage.set(1)">
                @if (searchQuery()) {
                  <button class="btn btn-outline-secondary" type="button" (click)="searchQuery.set(''); whPage.set(1)">
                    <i class="bi bi-x"></i>
                  </button>
                }
              </div>
            </div>

            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="filterWarehouse()" (ngModelChange)="filterWarehouse.set($event); whPage.set(1)">
                <option value="ALL">Todas las bodegas (2)</option>
                <option value="BODEGA_1">Bodega Norte (GYE)</option>
                <option value="BODEGA_2">Bodega Sur (Puerto)</option>
              </select>
            </div>

            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="filterState()" (ngModelChange)="filterState.set($event); whPage.set(1)">
                <option value="ALL">Todos los estados</option>
                <option value="EN_BODEGA">En Bodega (Completo)</option>
                <option value="PARCIAL">Despacho Parcial</option>
                <option value="DESPACHADO">Despachado (Saldo 0)</option>
              </select>
            </div>

            <div class="col-12 col-md-2 text-md-end d-flex align-items-center justify-content-between justify-content-md-end gap-2">
              <span class="fs-xxs text-muted mono-font">Lotes: <strong>{{ filteredItems().length }}</strong></span>
              <button type="button" class="btn btn-sm btn-outline-secondary px-2" (click)="resetFilters()" title="Limpiar filtros">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Stock Table -->
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>ID Kardex</th>
                <th>Bodega &amp; Rack</th>
                <th>Cliente / OC</th>
                <th>Descripción de Carga</th>
                <th class="text-end">Ingresado</th>
                <th class="text-end">Disponible</th>
                <th>Peso (kg)</th>
                <th>Estado / Guía</th>
                <th class="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (item of paginatedItems(); track item.id) {
                <tr>
                  <td>
                    <span class="badge bg-slate-900 text-info mono-font fs-xs">{{ item.id }}</span>
                    <div class="fs-xxs text-muted mono-font">{{ item.fechaIngreso }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark fs-xs">{{ item.bodegaNombre }}</div>
                    <span class="badge bg-white text-dark border border-slate-200 mono-font fs-xxs">
                      <i class="bi bi-geo-alt me-1 text-primary"></i>{{ item.ubicacionRack }}
                    </span>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark fs-xs text-truncate" style="max-width: 150px;">{{ item.cliente }}</div>
                    <span class="mono-font badge bg-slate-100 text-dark border border-slate-200 fs-xxs">{{ item.ordenCompra }}</span>
                  </td>
                  <td>
                    <div class="text-dark fs-xs text-truncate" style="max-width: 200px;" [title]="item.descripcion">{{ item.descripcion }}</div>
                  </td>
                  <td class="text-end mono-font fs-xs">{{ item.cantidadInicial }} {{ item.unidad }}</td>
                  <td class="text-end mono-font fs-xs fw-bold" [class.text-success]="item.cantidadDisponible > 0" [class.text-muted]="item.cantidadDisponible === 0">
                    {{ item.cantidadDisponible }} {{ item.unidad }}
                  </td>
                  <td class="mono-font fs-xs">{{ item.pesoKg }} kg</td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatePill(item.estado)">
                      <span class="dot"></span>{{ item.estado }}
                    </span>
                    @if (item.ultimaGuiaRemision) {
                      <div class="mono-font fs-xxs text-muted mt-1">Guía: {{ item.ultimaGuiaRemision }}</div>
                    }
                  </td>
                  <td class="text-end">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary py-1 px-2 fs-xs"
                      [disabled]="item.cantidadDisponible <= 0"
                      (click)="openDispatchModal(item)"
                      title="Emitir Guía de Remisión">
                      <i class="bi bi-truck me-1"></i>Despacho
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="text-center py-4 text-muted">
                    No se encontraron registros de Kardex con los filtros aplicados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Functional Pagination Footer -->
        @if (filteredItems().length > 0) {
          <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xs">
            <div class="d-flex align-items-center gap-2 text-muted">
              <span>
                Mostrando <strong>{{ whStartIndex() }}</strong>–<strong>{{ whEndIndex() }}</strong> de <strong>{{ filteredItems().length }}</strong> lotes
              </span>
              <span class="d-none d-sm-inline">&bull;</span>
              <div class="d-flex align-items-center gap-1 d-none d-sm-flex">
                <span class="text-muted fs-xxs">Filas:</span>
                <div class="btn-group btn-group-sm pagination-size-group">
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="whPageSize() === 5" [class.btn-outline-secondary]="whPageSize() !== 5" (click)="whPageSize.set(5); whPage.set(1)">5</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="whPageSize() === 6" [class.btn-outline-secondary]="whPageSize() !== 6" (click)="whPageSize.set(6); whPage.set(1)">6</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="whPageSize() === 12" [class.btn-outline-secondary]="whPageSize() !== 12" (click)="whPageSize.set(12); whPage.set(1)">12</button>
                </div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="whPage() === 1"
                (click)="whPage.set(whPage() - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
              @for (p of whPageNumbers(); track p) {
                <button
                  type="button"
                  class="btn btn-sm py-0 px-2 fs-xs"
                  [class.btn-dark]="whPage() === p"
                  [class.btn-outline-secondary]="whPage() !== p"
                  (click)="whPage.set(p)">
                  {{ p }}
                </button>
              }
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="whPage() === totalWhPages()"
                (click)="whPage.set(whPage() + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Receipt Modal -->
      @if (showReceiptModal) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-box-arrow-in-down text-warning"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">Registrar Ingreso a Bodega (Kardex Físico)</h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="showReceiptModal = false"></button>
              </div>

              <form (ngSubmit)="submitReceipt()">
                <div class="modal-body p-4">
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Bodega de Destino</label>
                      <select class="form-select" [(ngModel)]="receiptForm.bodegaId" name="bodegaId">
                        <option value="BODEGA_1">Bodega Norte (Av. Juan Tanca Marengo, GYE)</option>
                        <option value="BODEGA_2">Bodega Sur — Puerto Marítimo (GYE)</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Empresa Cliente</label>
                      <select class="form-select" [(ngModel)]="receiptForm.clienteId" name="clienteId">
                        <option value="CLI-001">Industrias Andinas S.A. (CLI-001)</option>
                        <option value="CLI-002">Comercial Pacífico Cía. Ltda. (CLI-002)</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Orden de Compra</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="receiptForm.ordenCompra" name="ordenCompra" placeholder="OC-7001" required>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Referencia Embarque (Opcional)</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="receiptForm.refArlogs" name="refArlogs" placeholder="I901-2026">
                    </div>

                    <div class="col-12">
                      <label class="form-label fs-xs fw-semibold">Descripción del Producto / Lote</label>
                      <input type="text" class="form-control" [(ngModel)]="receiptForm.descripcion" name="descripcion" placeholder="Ej. Filtros hidráulicos de alta presión" required>
                    </div>

                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Cantidad Ingresada</label>
                      <input type="number" class="form-control mono-font" [(ngModel)]="receiptForm.cantidad" name="cantidad" min="1" required>
                    </div>

                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Unidad de Medida</label>
                      <select class="form-select" [(ngModel)]="receiptForm.unidad" name="unidad">
                        <option value="Cajas">Cajas</option>
                        <option value="Pallets">Pallets</option>
                        <option value="Bultos">Bultos</option>
                        <option value="Tambores">Tambores</option>
                        <option value="Piezas">Piezas</option>
                      </select>
                    </div>

                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Peso Total (kg)</label>
                      <input type="number" class="form-control mono-font" [(ngModel)]="receiptForm.pesoKg" name="pesoKg" min="1">
                    </div>

                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Ubicación Rack / Pasillo</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="receiptForm.ubicacionRack" name="ubicacionRack" placeholder="RACK-B02">
                    </div>
                  </div>
                </div>

                <div class="modal-footer bg-slate-50 border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-light border" (click)="showReceiptModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check-lg me-1"></i>Registrar Ingreso
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Dispatch Modal -->
      @if (dispatchTarget()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-truck text-warning"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">
                    Emitir Guía de Remisión — {{ dispatchTarget()?.id }}
                  </h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="dispatchTarget.set(null)"></button>
              </div>

              <form (ngSubmit)="submitDispatch()">
                <div class="modal-body p-4">
                  <div class="d-flex flex-column gap-3">
                    <div class="bg-slate-50 border border-slate-200 rounded-3 p-3 fs-xs">
                      <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Producto</span>
                        <strong class="text-dark">{{ dispatchTarget()?.descripcion }}</strong>
                      </div>
                      <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Disponible en Rack</span>
                        <strong class="mono-font text-success">{{ dispatchTarget()?.cantidadDisponible }} {{ dispatchTarget()?.unidad }}</strong>
                      </div>
                      <div class="d-flex justify-content-between">
                        <span class="text-muted">Cliente</span>
                        <span class="text-dark">{{ dispatchTarget()?.cliente }}</span>
                      </div>
                    </div>

                    <div>
                      <label class="form-label fs-xs fw-semibold">Número de Guía de Remisión (SRI / ARLOGS)</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="dispatchForm.guiaRemision" name="guiaRemision" required>
                    </div>

                    <div>
                      <label class="form-label fs-xs fw-semibold">Cantidad a Despachar ({{ dispatchTarget()?.unidad }})</label>
                      <input
                        type="number"
                        class="form-control mono-font fw-bold"
                        [(ngModel)]="dispatchForm.cantidadSalida"
                        name="cantidadSalida"
                        min="1"
                        [max]="dispatchTarget()?.cantidadDisponible ?? 1"
                        required>
                    </div>

                    <div>
                      <label class="form-label fs-xs fw-semibold">Transportista / Placa / Inland</label>
                      <input type="text" class="form-control" [(ngModel)]="dispatchForm.transporteInland" name="transporteInland" placeholder="Ej. Camión Hino GBD-4512">
                    </div>

                    <div>
                      <label class="form-label fs-xs fw-semibold">Observación</label>
                      <input type="text" class="form-control" [(ngModel)]="dispatchForm.observacion" name="observacion" placeholder="Entrega en planta matriz">
                    </div>
                  </div>
                </div>

                <div class="modal-footer bg-slate-50 border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-light border" (click)="dispatchTarget.set(null)">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check-lg me-1"></i>Generar Guía y Despachar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .stat-icon { width: 32px; height: 32px; font-size: 1rem; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-500 { color: #64748B !important; }
    .text-slate-700 { color: #334155 !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-blue-50 { background-color: #EFF6FF !important; }
    .bg-emerald-50 { background-color: #ECFDF5 !important; }
    .bg-amber-50 { background-color: #FFFBEB !important; }

    @media (min-width: 576px) {
      .border-end-sm { border-right: 1px solid #E2E8F0; }
    }
  `]
})
export class WarehouseViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly items = this.shipmentService.warehouseItems;
  readonly movements = this.shipmentService.warehouseMovements;

  searchQuery = signal<string>('');
  filterWarehouse = signal<WarehouseId | 'ALL'>('ALL');
  filterState = signal<string>('ALL');

  showReceiptModal = false;
  dispatchTarget = signal<WarehouseItem | null>(null);

  // Pagination
  whPage = signal(1);
  whPageSize = signal(6);

  receiptForm: {
    bodegaId: WarehouseId;
    clienteId: string;
    refArlogs?: string;
    ordenCompra: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    pesoKg: number;
    ubicacionRack: string;
  } = {
    bodegaId: 'BODEGA_1',
    clienteId: 'CLI-001',
    refArlogs: '',
    ordenCompra: '',
    descripcion: '',
    cantidad: 10,
    unidad: 'Cajas',
    pesoKg: 100,
    ubicacionRack: 'RACK-A01'
  };

  dispatchForm = {
    guiaRemision: '',
    cantidadSalida: 0,
    transporteInland: '',
    observacion: ''
  };

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const wh = this.filterWarehouse();
    const st = this.filterState();
    return this.items().filter(i => {
      if (wh !== 'ALL' && i.bodegaId !== wh) return false;
      if (st !== 'ALL' && i.estado !== st) return false;
      if (!q) return true;
      return (
        i.id.toLowerCase().includes(q) ||
        i.ordenCompra.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q) ||
        i.cliente.toLowerCase().includes(q) ||
        i.ubicacionRack.toLowerCase().includes(q) ||
        (i.ultimaGuiaRemision?.toLowerCase().includes(q) ?? false)
      );
    });
  });

  readonly totalWhPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.whPageSize()))
  );

  readonly paginatedItems = computed(() => {
    const page = Math.min(this.whPage(), this.totalWhPages());
    const start = (page - 1) * this.whPageSize();
    return this.filteredItems().slice(start, start + this.whPageSize());
  });

  readonly whStartIndex = computed(() =>
    this.filteredItems().length === 0 ? 0 : (this.whPage() - 1) * this.whPageSize() + 1
  );

  readonly whEndIndex = computed(() =>
    Math.min(this.whPage() * this.whPageSize(), this.filteredItems().length)
  );

  readonly whPageNumbers = computed(() => {
    const total = this.totalWhPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly summary = computed(() => {
    const list = this.items();
    const b1 = list.filter(i => i.bodegaId === 'BODEGA_1');
    const b2 = list.filter(i => i.bodegaId === 'BODEGA_2');
    const b1Units = b1.reduce((acc, i) => acc + i.cantidadDisponible, 0);
    const b2Units = b2.reduce((acc, i) => acc + i.cantidadDisponible, 0);
    return {
      b1Units,
      b2Units,
      b1Lots: b1.filter(i => i.cantidadDisponible > 0).length,
      b2Lots: b2.filter(i => i.cantidadDisponible > 0).length,
      totalAvailable: b1Units + b2Units
    };
  });

  getStatePill(state: string): string {
    switch (state) {
      case 'EN_BODEGA': return 'status-cerrado';
      case 'PARCIAL': return 'status-abierto';
      default: return 'status-na';
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterWarehouse.set('ALL');
    this.filterState.set('ALL');
    this.whPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando las 2 bodegas y todo el Kardex.');
  }

  openReceiptModal(): void {
    this.receiptForm = {
      bodegaId: 'BODEGA_1',
      clienteId: 'CLI-001',
      refArlogs: 'I902-2026',
      ordenCompra: '',
      descripcion: '',
      cantidad: 12,
      unidad: 'Cajas',
      pesoKg: 180,
      ubicacionRack: 'RACK-A06'
    };
    this.showReceiptModal = true;
  }

  submitReceipt(): void {
    if (!this.receiptForm.ordenCompra.trim() || !this.receiptForm.descripcion.trim()) {
      this.toastService.error('Incorrecto', 'Orden de compra y descripción son obligatorias.');
      return;
    }
    const cliente = this.receiptForm.clienteId === 'CLI-001'
      ? 'Industrias Andinas DEMO S.A.'
      : 'Comercial Pacífico DEMO Cía. Ltda.';
    try {
      const created = this.shipmentService.registerWarehouseReceipt({
        ...this.receiptForm,
        refArlogs: this.receiptForm.refArlogs || '',
        cliente
      });
      this.showReceiptModal = false;
      this.toastService.success(
        'Correcto — Ingreso Kardex',
        `${created.id} (${created.cantidadDisponible} ${created.unidad}) ingresado en ${created.bodegaNombre}.`
      );
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo registrar el ingreso.');
    }
  }

  openDispatchModal(item: WarehouseItem): void {
    this.dispatchTarget.set(item);
    const seq = 120 + this.movements().length + 1;
    this.dispatchForm = {
      guiaRemision: `GR-${item.bodegaId === 'BODEGA_1' ? '001' : '002'}-0${seq}`,
      cantidadSalida: item.cantidadDisponible,
      transporteInland: `Inland / ${item.ordenCompra}`,
      observacion: 'Retiro autorizado por cliente'
    };
  }

  submitDispatch(): void {
    const target = this.dispatchTarget();
    if (!target) return;
    try {
      const updated = this.shipmentService.dispatchWarehouseItem({
        itemId: target.id,
        ...this.dispatchForm
      });
      this.dispatchTarget.set(null);
      this.toastService.success(
        'Correcto — Guía de Remisión',
        `Guía ${updated.ultimaGuiaRemision} emitida. Saldo restante: ${updated.cantidadDisponible} ${updated.unidad}.`
      );
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo emitir la guía de remisión.');
    }
  }
}
