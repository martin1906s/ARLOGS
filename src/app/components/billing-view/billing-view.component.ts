import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { ShipmentJob } from '../../models/shipment.model';

@Component({
  selector: 'app-billing-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="billing-view py-2">

      <!-- Header & Export Action -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 class="fw-bold mb-0 text-dark font-heading">Contabilidad y Facturación</h5>

        <button type="button" class="btn btn-sm btn-outline-success d-flex align-items-center gap-1" (click)="exportBillingExcel()">
          <i class="bi bi-file-earmark-excel"></i>
          <span>Exportar Conciliación</span>
        </button>
      </div>

      <!-- Unified KPI Stat Strip (Space-optimized) -->
      <div class="stat-ribbon bg-white border border-slate-200 rounded-3 p-3 mb-3 shadow-xs">
        <div class="row g-2 align-items-center text-center text-sm-start">
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-slate-100 text-dark rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-tag"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Total Cotizado</span>
                <span class="fs-5 fw-bold mono-font text-dark">\${{ totals().cotizado | number:'1.0-0' }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-emerald-50 text-success rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-receipt-cutoff"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Facturado Real</span>
                <span class="fs-5 fw-bold mono-font text-success">\${{ totals().facturado | number:'1.0-0' }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-blue-50 text-primary rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-graph-up-arrow"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Profit Real</span>
                <span class="fs-5 fw-bold mono-font" [class.text-primary]="totals().profitReal >= 0" [class.text-danger]="totals().profitReal < 0">
                  \${{ totals().profitReal | number:'1.0-0' }}
                </span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-amber-50 text-warning rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-hourglass-split"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Pendientes</span>
                <span class="fs-5 fw-bold mono-font text-warning">{{ totals().pendientes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Unified Table Card with Integrated Search & Filter Toolbar -->
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
                  placeholder="Buscar por Ref, Factura, Cliente o QR..."
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event); billingPage.set(1)">
                @if (searchQuery()) {
                  <button class="btn btn-outline-secondary" type="button" (click)="searchQuery.set(''); billingPage.set(1)">
                    <i class="bi bi-x"></i>
                  </button>
                }
              </div>
            </div>

            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event); billingPage.set(1)">
                <option value="ALL">Estado Cobro: Todos</option>
                <option value="PENDIENTE_FACTURAR">Pendiente de Facturar</option>
                <option value="FACTURADA">Facturada (Por Cobrar)</option>
                <option value="COBRADA">Cobrada</option>
              </select>
            </div>

            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="filterClient()" (ngModelChange)="filterClient.set($event); billingPage.set(1)">
                <option value="ALL">Cliente: Todos</option>
                <option value="CLI-001">Industrias Andinas</option>
                <option value="CLI-002">Comercial Pacífico</option>
              </select>
            </div>

            <div class="col-12 col-md-2 text-md-end d-flex align-items-center justify-content-between justify-content-md-end gap-2">
              <span class="fs-xxs text-muted mono-font">Total: <strong>{{ filteredJobs().length }}</strong></span>
              <button type="button" class="btn btn-sm btn-outline-secondary px-2" (click)="resetFilters()" title="Limpiar filtros">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Billing Table -->
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Ref / QR</th>
                <th>Cliente</th>
                <th>Modalidad</th>
                <th>Pesos (Orig / Rec)</th>
                <th class="text-end">Cotizado</th>
                <th class="text-end">Facturado Real</th>
                <th class="text-end">Costo Real</th>
                <th class="text-end">Profit Real</th>
                <th>Plazo</th>
                <th>Factura &amp; Cobro</th>
                <th class="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (job of paginatedJobs(); track job.refArlogs) {
                @let profit = getProfit(job);
                @let isBilled = !!job.facturaNumero;
                <tr>
                  <td>
                    <strong class="text-primary mono-font">{{ job.refArlogs }}</strong>
                    <div class="fs-xxs text-muted mono-font">{{ job.qrCode }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark text-truncate" style="max-width: 140px;" [title]="job.cliente">
                      {{ job.cliente }}
                    </div>
                  </td>
                  <td>
                    <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font">{{ job.servicio }}</span>
                  </td>
                  <td>
                    <div class="mono-font fs-xs text-dark">{{ job.pesoOrigen ?? '—' }} kg</div>
                    <div class="mono-font fs-xxs text-muted">Rec: {{ job.pesoRecibido ?? '—' }} kg</div>
                  </td>
                  <td class="text-end mono-font fs-xs">
                    \${{ (job.valorVentaCotizado ?? 0) | number:'1.0-0' }}
                  </td>
                  <td class="text-end mono-font fs-xs fw-bold" [class.text-success]="isBilled">
                    {{ isBilled ? ('$' + (job.valorFacturadoReal | number:'1.0-0')) : '—' }}
                  </td>
                  <td class="text-end mono-font fs-xs text-muted">
                    {{ job.costoReal !== undefined ? ('$' + (job.costoReal | number:'1.0-0')) : '—' }}
                  </td>
                  <td class="text-end mono-font fs-xs fw-bold" [class.text-success]="profit >= 0 && isBilled" [class.text-danger]="profit < 0 && isBilled">
                    {{ isBilled ? ('$' + (profit | number:'1.0-0')) : '—' }}
                  </td>
                  <td>
                    <span class="badge bg-slate-50 text-dark border border-slate-200 mono-font">
                      {{ job.plazoPagoDias ?? 15 }}d
                    </span>
                  </td>
                  <td>
                    @if (job.facturaNumero) {
                      <div class="mono-font fs-xs fw-bold text-dark">{{ job.facturaNumero }}</div>
                      <span class="status-pill" [ngClass]="getCobroClass(job.estadoCobro)">
                        <span class="dot"></span>{{ job.estadoCobro || 'FACTURADA' }}
                      </span>
                    } @else {
                      <span class="badge-subtle badge-subtle-amber fs-xxs">
                        Por Facturar
                      </span>
                    }
                  </td>
                  <td class="text-end">
                    <div class="d-inline-flex gap-1">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary py-1 px-2 fs-xs"
                        (click)="openInvoiceModal(job)"
                        title="Emitir o ajustar factura">
                        <i class="bi bi-receipt"></i>
                      </button>

                      @if (job.facturaNumero && job.estadoCobro !== 'COBRADA') {
                        <button
                          type="button"
                          class="btn btn-sm btn-success py-1 px-2 fs-xs"
                          (click)="markCollected(job)"
                          title="Registrar cobro efectivo">
                          <i class="bi bi-cash-stack"></i>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="11" class="text-center py-4 text-muted">
                    No se encontraron operaciones registradas con los filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Functional Pagination Footer -->
        @if (filteredJobs().length > 0) {
          <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xs">
            <div class="d-flex align-items-center gap-2 text-muted">
              <span>
                Mostrando <strong>{{ billingStartIndex() }}</strong>–<strong>{{ billingEndIndex() }}</strong> de <strong>{{ filteredJobs().length }}</strong> registros
              </span>
              <span class="d-none d-sm-inline">&bull;</span>
              <div class="d-flex align-items-center gap-1 d-none d-sm-flex">
                <span class="text-muted fs-xxs">Filas:</span>
                <div class="btn-group btn-group-sm pagination-size-group">
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="billingPageSize() === 5" [class.btn-outline-secondary]="billingPageSize() !== 5" (click)="billingPageSize.set(5); billingPage.set(1)">5</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="billingPageSize() === 6" [class.btn-outline-secondary]="billingPageSize() !== 6" (click)="billingPageSize.set(6); billingPage.set(1)">6</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="billingPageSize() === 12" [class.btn-outline-secondary]="billingPageSize() !== 12" (click)="billingPageSize.set(12); billingPage.set(1)">12</button>
                </div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="billingPage() === 1"
                (click)="billingPage.set(billingPage() - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
              @for (p of billingPageNumbers(); track p) {
                <button
                  type="button"
                  class="btn btn-sm py-0 px-2 fs-xs"
                  [class.btn-dark]="billingPage() === p"
                  [class.btn-outline-secondary]="billingPage() !== p"
                  (click)="billingPage.set(p)">
                  {{ p }}
                </button>
              }
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="billingPage() === totalBillingPages()"
                (click)="billingPage.set(billingPage() + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Invoice Modal -->
      @if (editingJob()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-receipt text-warning"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">
                    Facturación: {{ editingJob()?.refArlogs }}
                  </h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="editingJob.set(null)"></button>
              </div>

              <form (ngSubmit)="saveInvoice()">
                <div class="modal-body p-4">
                  <div class="d-flex flex-column gap-3">
                    <div>
                      <span class="fs-xs text-muted d-block">Cliente</span>
                      <strong class="text-dark">{{ editingJob()?.cliente }}</strong>
                    </div>

                    <div>
                      <label class="form-label fs-xs fw-semibold">Número de Factura</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="invoiceForm.facturaNumero" name="facturaNumero" required placeholder="FAC-001-00501">
                    </div>

                    <div class="row g-2">
                      <div class="col-6">
                        <label class="form-label fs-xs fw-semibold text-primary">Monto Facturado (USD)</label>
                        <div class="input-group input-group-sm">
                          <span class="input-group-text">$</span>
                          <input type="number" class="form-control mono-font fw-bold" [(ngModel)]="invoiceForm.valorFacturadoReal" name="valorFacturadoReal" min="0" step="10" required>
                        </div>
                      </div>
                      <div class="col-6">
                        <label class="form-label fs-xs fw-semibold text-secondary">Costo Real (USD)</label>
                        <div class="input-group input-group-sm">
                          <span class="input-group-text">$</span>
                          <input type="number" class="form-control mono-font" [(ngModel)]="invoiceForm.costoReal" name="costoReal" min="0" step="10" required>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label class="form-label fs-xs fw-semibold">Estado de Cobro</label>
                      <select class="form-select form-select-sm" [(ngModel)]="invoiceForm.estadoCobro" name="estadoCobro">
                        <option value="FACTURADA">Facturada (Por cobrar)</option>
                        <option value="COBRADA">Cobrada</option>
                        <option value="VENCIDA">Vencida</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="modal-footer bg-slate-50 border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-light border" (click)="editingJob.set(null)">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check-lg me-1"></i>Guardar Factura
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
export class BillingViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly jobs = this.shipmentService.authorizedJobs;

  searchQuery = signal<string>('');
  filterStatus = signal<string>('ALL');
  filterClient = signal<string>('ALL');

  editingJob = signal<ShipmentJob | null>(null);

  // Pagination
  billingPage = signal(1);
  billingPageSize = signal(6);

  invoiceForm: {
    facturaNumero: string;
    valorFacturadoReal: number;
    costoReal: number;
    estadoCobro: 'FACTURADA' | 'COBRADA' | 'VENCIDA';
  } = {
    facturaNumero: '',
    valorFacturadoReal: 0,
    costoReal: 0,
    estadoCobro: 'FACTURADA'
  };

  readonly filteredJobs = computed(() => {
    let list = this.jobs();
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.filterStatus();
    const client = this.filterClient();

    if (client !== 'ALL') {
      list = list.filter(j => j.clienteId === client);
    }
    if (status !== 'ALL') {
      if (status === 'PENDIENTE_FACTURAR') {
        list = list.filter(j => !j.facturaNumero);
      } else {
        list = list.filter(j => j.estadoCobro === status);
      }
    }
    if (q) {
      list = list.filter(j =>
        j.refArlogs.toLowerCase().includes(q) ||
        j.qrCode.toLowerCase().includes(q) ||
        j.cliente.toLowerCase().includes(q) ||
        (j.facturaNumero && j.facturaNumero.toLowerCase().includes(q)) ||
        j.ordenesCompra.some(oc => oc.toLowerCase().includes(q))
      );
    }
    return list;
  });

  readonly totalBillingPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredJobs().length / this.billingPageSize()))
  );

  readonly paginatedJobs = computed(() => {
    const page = Math.min(this.billingPage(), this.totalBillingPages());
    const start = (page - 1) * this.billingPageSize();
    return this.filteredJobs().slice(start, start + this.billingPageSize());
  });

  readonly billingStartIndex = computed(() =>
    this.filteredJobs().length === 0 ? 0 : (this.billingPage() - 1) * this.billingPageSize() + 1
  );

  readonly billingEndIndex = computed(() =>
    Math.min(this.billingPage() * this.billingPageSize(), this.filteredJobs().length)
  );

  readonly billingPageNumbers = computed(() => {
    const total = this.totalBillingPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly totals = computed(() => {
    const list = this.jobs();
    let cotizado = 0;
    let facturado = 0;
    let profitReal = 0;
    let profitCotizado = 0;
    let facturadosCount = 0;
    let pendientes = 0;
    let riesgoFlujo = 0;

    for (const j of list) {
      const vc = j.valorVentaCotizado ?? 0;
      const ce = j.costoEstimadoCotizado ?? 0;
      cotizado += vc;
      profitCotizado += vc - ce;

      if (j.valorFacturadoReal !== undefined) {
        facturado += j.valorFacturadoReal;
        profitReal += j.valorFacturadoReal - (j.costoReal ?? ce);
        facturadosCount++;
      } else {
        pendientes++;
      }
      if (this.isCashflowAlert(j)) riesgoFlujo++;
    }
    return { cotizado, facturado, profitReal, profitCotizado, facturadosCount, pendientes, riesgoFlujo };
  });

  getProfit(j: ShipmentJob): number {
    return (j.valorFacturadoReal ?? 0) - (j.costoReal ?? j.costoEstimadoCotizado ?? 0);
  }

  isCashflowAlert(j: ShipmentJob): boolean {
    const val = j.valorFacturadoReal ?? j.valorVentaCotizado ?? 0;
    return val >= 5000 && (j.plazoPagoDias ?? 15) >= 30 && j.estadoCobro !== 'COBRADA';
  }

  getCobroClass(estado?: string): string {
    switch (estado) {
      case 'COBRADA': return 'status-cerrado';
      case 'FACTURADA': return 'status-abierto';
      case 'VENCIDA': return 'status-revisar';
      default: return 'status-revisar';
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterClient.set('ALL');
    this.billingPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando todas las operaciones facturables.');
  }

  openInvoiceModal(job: ShipmentJob): void {
    this.editingJob.set(job);
    const nextNum = 500 + this.jobs().filter(j => j.facturaNumero).length + 1;
    this.invoiceForm = {
      facturaNumero: job.facturaNumero || `FAC-001-${nextNum.toString().padStart(5, '0')}`,
      valorFacturadoReal: job.valorFacturadoReal ?? job.valorVentaCotizado ?? 0,
      costoReal: job.costoReal ?? job.costoEstimadoCotizado ?? 0,
      estadoCobro: job.estadoCobro === 'COBRADA' ? 'COBRADA' : job.estadoCobro === 'VENCIDA' ? 'VENCIDA' : 'FACTURADA'
    };
  }

  saveInvoice(): void {
    const job = this.editingJob();
    if (!job) return;
    if (!this.invoiceForm.facturaNumero.trim() || this.invoiceForm.valorFacturadoReal < 0) {
      this.toastService.error('Incorrecto', 'Ingrese un número de factura y monto válido.');
      return;
    }
    try {
      const updated = this.shipmentService.updateBilling(job.refArlogs, this.invoiceForm);
      this.editingJob.set(null);
      this.toastService.success(
        'Actualizado — Facturación',
        `${updated.facturaNumero} registrada para ${updated.refArlogs} (\$${updated.valorFacturadoReal}).`
      );
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'Error al registrar factura.');
    }
  }

  markCollected(job: ShipmentJob): void {
    try {
      const updated = this.shipmentService.updateBilling(job.refArlogs, {
        facturaNumero: job.facturaNumero || `FAC-${job.refArlogs}`,
        valorFacturadoReal: job.valorFacturadoReal ?? job.valorVentaCotizado ?? 0,
        costoReal: job.costoReal ?? job.costoEstimadoCotizado ?? 0,
        estadoCobro: 'COBRADA'
      });
      this.toastService.success('Correcto — Cobrado', `Factura ${updated.facturaNumero} marcada como COBRADA.`);
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'Error al registrar cobro.');
    }
  }

  exportBillingExcel(): void {
    const list = this.filteredJobs();
    this.shipmentService.exportToExcel(list);
    this.toastService.success('Correcto — Exportado', `Conciliación financiera (${list.length} registros) descargada.`);
  }
}
