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

      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 class="fw-bold mb-0 text-dark font-heading">Bodegas &amp; Control Kardex (Operaciones 3)</h5>
          <span class="fs-xs text-muted">
            Inventario físico por conteo (sin costeo contable) en 2 bodegas arrendadas y emisión de Guías de Remisión
          </span>
        </div>

        <button type="button" class="btn btn-sm btn-brand-primary d-flex align-items-center gap-1" (click)="openReceiptModal()">
          <i class="bi bi-box-arrow-in-down"></i>
          <span>Registrar Ingreso a Bodega</span>
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Bodega Norte</span>
              <i class="bi bi-building text-primary"></i>
            </div>
            <div class="fs-4 fw-bold text-dark mono-font">{{ summary().b1Units }}</div>
            <div class="fs-xxs text-muted mt-1">{{ summary().b1Lots }} lote(s) con saldo</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Bodega Sur (Puerto)</span>
              <i class="bi bi-building-check text-info"></i>
            </div>
            <div class="fs-4 fw-bold text-info mono-font">{{ summary().b2Units }}</div>
            <div class="fs-xxs text-muted mt-1">{{ summary().b2Lots }} lote(s) con saldo</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Saldo Total Kardex</span>
              <i class="bi bi-boxes text-success"></i>
            </div>
            <div class="fs-4 fw-bold text-success mono-font">{{ summary().totalAvailable }}</div>
            <div class="fs-xxs text-muted mt-1">Unidades/bultos físicos disponibles</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Movimientos Kardex</span>
              <i class="bi bi-file-earmark-text text-warning"></i>
            </div>
            <div class="fs-4 fw-bold text-dark mono-font">{{ movements().length }}</div>
            <div class="fs-xxs text-muted mt-1">Entradas y Guías de Remisión</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card-executive p-3 mb-3">
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
                (ngModelChange)="searchQuery.set($event)">
            </div>
          </div>

          <div class="col-6 col-md-3">
            <select class="form-select form-select-sm" [ngModel]="filterWarehouse()" (ngModelChange)="filterWarehouse.set($event)">
              <option value="ALL">Todas las bodegas (2)</option>
              <option value="BODEGA_1">Bodega Norte (GYE)</option>
              <option value="BODEGA_2">Bodega Sur (Puerto)</option>
            </select>
          </div>

          <div class="col-6 col-md-3">
            <select class="form-select form-select-sm" [ngModel]="filterState()" (ngModelChange)="filterState.set($event)">
              <option value="ALL">Todos los estados</option>
              <option value="EN_BODEGA">En Bodega (Completo)</option>
              <option value="PARCIAL">Despacho Parcial</option>
              <option value="DESPACHADO">Despachado (Saldo 0)</option>
            </select>
          </div>

          <div class="col-12 col-md-2 text-md-end">
            <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none fs-xxs text-muted" (click)="resetFilters()">
              <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <!-- Stock Table -->
      <div class="card-executive overflow-hidden mb-3">
        <div class="p-3 border-bottom border-slate-200 d-flex align-items-center justify-content-between">
          <h6 class="fw-bold mb-0 text-dark">Existencias Actuales en Kardex</h6>
          <span class="badge bg-slate-100 text-slate-700 border fs-xxs">Control Físico Entrada/Salida</span>
        </div>

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
                <th class="text-end">Despacho</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredItems(); track item.id) {
                <tr>
                  <td>
                    <strong class="text-primary mono-font">{{ item.id }}</strong>
                    <div class="fs-xxs text-muted mono-font">{{ item.refArlogs }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark fs-xs">{{ item.bodegaNombre }}</div>
                    <span class="badge bg-slate-50 text-dark border mono-font fs-xxs">{{ item.ubicacionRack }}</span>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark text-truncate" style="max-width: 150px;" [title]="item.cliente">{{ item.cliente }}</div>
                    <span class="badge bg-slate-100 text-dark border mono-font fs-xxs">{{ item.ordenCompra }}</span>
                  </td>
                  <td>
                    <div class="text-dark fs-xs">{{ item.descripcion }}</div>
                    <div class="fs-xxs text-muted">Ingreso: {{ item.fechaIngreso }}</div>
                  </td>
                  <td class="text-end mono-font text-muted">
                    {{ item.cantidadInicial }} {{ item.unidad }}
                  </td>
                  <td class="text-end mono-font fw-bold" [class.text-success]="item.cantidadDisponible > 0" [class.text-muted]="item.cantidadDisponible === 0">
                    {{ item.cantidadDisponible }} {{ item.unidad }}
                  </td>
                  <td class="mono-font fs-xs">{{ item.pesoKg }} kg</td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatePill(item.estado)">
                      <span class="dot"></span>{{ item.estado }}
                    </span>
                    @if (item.ultimaGuiaRemision) {
                      <div class="fs-xxs text-muted mono-font mt-1">Últ. {{ item.ultimaGuiaRemision }}</div>
                    }
                  </td>
                  <td class="text-end">
                    @if (item.cantidadDisponible > 0) {
                      <button type="button" class="btn btn-sm btn-outline-primary py-1 px-2 fs-xs" (click)="openDispatchModal(item)">
                        <i class="bi bi-truck me-1"></i>Guía Remisión
                      </button>
                    } @else {
                      <span class="badge bg-slate-100 text-muted border fs-xxs">Sin saldo</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="text-center py-4 text-muted">No hay inventario que coincida con los filtros.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Kardex Movements -->
      <div class="card-executive overflow-hidden">
        <div class="p-3 border-bottom border-slate-200 d-flex align-items-center justify-content-between">
          <h6 class="fw-bold mb-0 text-dark">Bitácora de Entradas y Salidas (Guías de Remisión)</h6>
          <span class="fs-xxs text-muted">{{ movements().length }} movimientos</span>
        </div>
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Guía / Documento</th>
                <th>Bodega</th>
                <th>OC / Cliente</th>
                <th class="text-end">Cantidad</th>
                <th>Transporte / Obs.</th>
              </tr>
            </thead>
            <tbody>
              @for (m of movements(); track m.id) {
                <tr>
                  <td class="mono-font fs-xxs text-muted text-nowrap">{{ m.fecha }}</td>
                  <td>
                    <span class="badge mono-font fs-xxs"
                          [class.bg-success]="m.tipo === 'INGRESO'"
                          [class.bg-primary]="m.tipo === 'SALIDA'">
                      {{ m.tipo }}
                    </span>
                  </td>
                  <td class="mono-font fs-xs fw-bold text-dark">{{ m.guiaRemision }}</td>
                  <td class="fs-xs">{{ m.bodegaNombre }}</td>
                  <td>
                    <span class="badge bg-slate-100 text-dark border mono-font fs-xxs me-1">{{ m.ordenCompra }}</span>
                    <span class="fs-xxs text-muted">{{ m.cliente }}</span>
                  </td>
                  <td class="text-end mono-font fw-bold" [class.text-success]="m.tipo === 'INGRESO'" [class.text-primary]="m.tipo === 'SALIDA'">
                    {{ m.tipo === 'INGRESO' ? '+' : '-' }}{{ m.cantidad }}
                  </td>
                  <td class="fs-xs text-muted">
                    @if (m.transporteInland) {
                      <strong class="text-dark">{{ m.transporteInland }}</strong> &bull;
                    }
                    {{ m.observacion }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Receipt Modal -->
      @if (showReceiptModal) {
        <div class="modal-backdrop fade show"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-3">
              <div class="modal-header bg-slate-900 text-white py-3 px-4">
                <h6 class="modal-title fw-bold font-heading mb-0">
                  <i class="bi bi-box-arrow-in-down me-2 text-info"></i>Registrar Conteo e Ingreso Kardex
                </h6>
                <button type="button" class="btn-close btn-close-white" (click)="showReceiptModal = false"></button>
              </div>
              <form (ngSubmit)="submitReceipt()">
                <div class="modal-body p-4 bg-slate-50">
                  <div class="row g-3">
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Almacén / Bodega *</label>
                      <select class="form-select" [(ngModel)]="receiptForm.bodegaId" name="bodegaId">
                        <option value="BODEGA_1">Bodega Norte (GYE)</option>
                        <option value="BODEGA_2">Bodega Sur (Puerto)</option>
                      </select>
                    </div>
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Cliente *</label>
                      <select class="form-select" [(ngModel)]="receiptForm.clienteId" name="clienteId">
                        <option value="CLI-001">Industrias Andinas</option>
                        <option value="CLI-002">Comercial Pacífico</option>
                      </select>
                    </div>
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Orden de Compra (OC) *</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="receiptForm.ordenCompra" name="ordenCompra" placeholder="OC-1015" required>
                    </div>
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Ref ARLOGS / Inland</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="receiptForm.refArlogs" name="refArlogs" placeholder="I901-2026">
                    </div>
                    <div class="col-12">
                      <label class="form-label fs-xs fw-bold text-dark">Descripción de Mercadería *</label>
                      <input type="text" class="form-control" [(ngModel)]="receiptForm.descripcion" name="descripcion" placeholder="Ej. Motores trifásicos embalados" required>
                    </div>
                    <div class="col-4">
                      <label class="form-label fs-xs fw-bold text-dark">Cantidad *</label>
                      <input type="number" class="form-control mono-font" [(ngModel)]="receiptForm.cantidad" name="cantidad" min="1" required>
                    </div>
                    <div class="col-4">
                      <label class="form-label fs-xs fw-bold text-dark">Unidad *</label>
                      <select class="form-select" [(ngModel)]="receiptForm.unidad" name="unidad">
                        <option value="Cajas">Cajas</option>
                        <option value="Pallets">Pallets</option>
                        <option value="Bultos">Bultos</option>
                        <option value="Unidades">Unidades</option>
                      </select>
                    </div>
                    <div class="col-4">
                      <label class="form-label fs-xs fw-bold text-dark">Ubicación Rack</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="receiptForm.ubicacionRack" name="ubicacionRack" placeholder="RACK-A01">
                    </div>
                  </div>
                </div>
                <div class="modal-footer bg-white border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="showReceiptModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">Guardar Ingreso</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Dispatch / Guía de Remisión Modal -->
      @if (dispatchTarget()) {
        <div class="modal-backdrop fade show"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-3">
              <div class="modal-header bg-slate-900 text-white py-3 px-4">
                <h6 class="modal-title fw-bold font-heading mb-0">
                  <i class="bi bi-truck me-2 text-info"></i>Emitir Guía de Remisión — {{ dispatchTarget()?.ordenCompra }}
                </h6>
                <button type="button" class="btn-close btn-close-white" (click)="dispatchTarget.set(null)"></button>
              </div>
              <form (ngSubmit)="submitDispatch()">
                <div class="modal-body p-4 bg-slate-50">
                  <div class="p-2 px-3 bg-white border border-slate-200 rounded-2 mb-3 fs-xs">
                    <div><strong>{{ dispatchTarget()?.descripcion }}</strong></div>
                    <div class="text-muted">Disponible: {{ dispatchTarget()?.cantidadDisponible }} {{ dispatchTarget()?.unidad }} en {{ dispatchTarget()?.bodegaNombre }}</div>
                  </div>
                  <div class="row g-3">
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">N° Guía de Remisión *</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="dispatchForm.guiaRemision" name="guiaRemision" required>
                    </div>
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Cantidad a Retirar *</label>
                      <input type="number" class="form-control mono-font" [(ngModel)]="dispatchForm.cantidadSalida" name="cantidadSalida" min="1" [max]="dispatchTarget()?.cantidadDisponible || 1" required>
                    </div>
                    <div class="col-12">
                      <label class="form-label fs-xs fw-bold text-dark">Transporte Interno (Inland) / Placa *</label>
                      <input type="text" class="form-control" [(ngModel)]="dispatchForm.transporteInland" name="transporteInland" placeholder="Ej. Inland I902-2026 / Placa GSY-5120" required>
                    </div>
                    <div class="col-12">
                      <label class="form-label fs-xs fw-bold text-dark">Observación de Entrega</label>
                      <input type="text" class="form-control" [(ngModel)]="dispatchForm.observacion" name="observacion" placeholder="Ej. Despacho autorizado a planta destino">
                    </div>
                  </div>
                </div>
                <div class="modal-footer bg-white border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="dispatchTarget.set(null)">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">Emitir Guía &amp; Descontar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-700 { color: #334155 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
  `]
})
export class WarehouseViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly items = this.shipmentService.warehouseItems;
  readonly movements = this.shipmentService.warehouseMovements;

  searchQuery = signal('');
  filterWarehouse = signal<'ALL' | WarehouseId>('ALL');
  filterState = signal('ALL');

  showReceiptModal = false;
  dispatchTarget = signal<WarehouseItem | null>(null);

  receiptForm: {
    bodegaId: WarehouseId;
    clienteId: string;
    refArlogs: string;
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
    pesoKg: 120,
    ubicacionRack: 'RACK-A05'
  };

  dispatchForm = {
    guiaRemision: '',
    cantidadSalida: 1,
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

