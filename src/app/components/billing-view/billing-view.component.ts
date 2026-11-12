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

      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 class="fw-bold mb-0 text-dark font-heading">Contabilidad y Facturación (Cotizado vs. Facturado)</h5>
          <span class="fs-xs text-muted">
            Facturación heredada desde Pricing y Operaciones sin re-digitación, control de profit real y alertas de flujo
          </span>
        </div>

        <button type="button" class="btn btn-sm btn-outline-success d-flex align-items-center gap-1" (click)="exportBillingExcel()">
          <i class="bi bi-file-earmark-excel"></i>
          <span>Exportar Conciliación</span>
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Total Cotizado</span>
              <i class="bi bi-tag text-primary"></i>
            </div>
            <div class="fs-4 fw-bold text-dark mono-font">\${{ totals().cotizado | number:'1.0-0' }}</div>
            <div class="fs-xxs text-muted mt-1">{{ filteredJobs().length }} embarque(s) visibles</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Facturado Real</span>
              <i class="bi bi-receipt-cutoff text-success"></i>
            </div>
            <div class="fs-4 fw-bold text-success mono-font">\${{ totals().facturado | number:'1.0-0' }}</div>
            <div class="fs-xxs text-muted mt-1">{{ totals().facturadosCount }} facturas emitidas</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Profit Real Acum.</span>
              <i class="bi bi-graph-up-arrow text-info"></i>
            </div>
            <div class="fs-4 fw-bold mono-font" [class.text-primary]="totals().profitReal >= 0" [class.text-danger]="totals().profitReal < 0">
              \${{ totals().profitReal | number:'1.0-0' }}
            </div>
            <div class="fs-xxs text-muted mt-1">Cotizado est.: \${{ totals().profitCotizado | number:'1.0-0' }}</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 h-100">
            <div class="d-flex justify-content-between align-items-center text-muted fs-xs mb-1">
              <span class="fw-semibold text-uppercase">Pendientes / Flujo 30d</span>
              <i class="bi bi-exclamation-circle text-warning"></i>
            </div>
            <div class="fs-4 fw-bold text-warning mono-font">{{ totals().pendientes }}</div>
            <div class="fs-xxs text-muted mt-1">{{ totals().riesgoFlujo }} con alerta crédito alto</div>
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
                placeholder="Buscar por Ref, Factura, Cliente, QR o OC..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)">
            </div>
          </div>

          <div class="col-6 col-md-3">
            <select class="form-select form-select-sm" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
              <option value="ALL">Estado Cobro: Todos</option>
              <option value="PENDIENTE_FACTURAR">Pendiente de Facturar</option>
              <option value="FACTURADA">Facturada (Por Cobrar)</option>
              <option value="COBRADA">Cobrada</option>
            </select>
          </div>

          <div class="col-6 col-md-3">
            <select class="form-select form-select-sm" [ngModel]="filterClient()" (ngModelChange)="filterClient.set($event)">
              <option value="ALL">Todos los clientes</option>
              <option value="CLI-001">Industrias Andinas</option>
              <option value="CLI-002">Comercial Pacífico</option>
            </select>
          </div>

          <div class="col-12 col-md-2 text-md-end">
            <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none fs-xxs text-muted" (click)="resetFilters()">
              <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <!-- Billing Table -->
      <div class="card-executive overflow-hidden">
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Ref / QR</th>
                <th>Cliente &amp; Mod.</th>
                <th>Pesos (Orig/Rec)</th>
                <th class="text-end">Cotizado</th>
                <th class="text-end">Facturado Real</th>
                <th class="text-end">Costo Real</th>
                <th class="text-end">Profit Real</th>
                <th>Plazo / Flujo</th>
                <th>Factura &amp; Cobro</th>
                <th class="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (job of filteredJobs(); track job.refArlogs) {
                @let profit = getProfit(job);
                @let variance = (job.valorFacturadoReal ?? 0) - (job.valorVentaCotizado ?? 0);
                <tr [class.row-alert]="isCashflowAlert(job)">
                  <td>
                    <strong class="text-primary mono-font">{{ job.refArlogs }}</strong>
                    <div class="fs-xxs text-muted mono-font">{{ job.qrCode }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark text-truncate" style="max-width: 150px;" [title]="job.cliente">{{ job.cliente }}</div>
                    <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font fs-xxs">{{ job.servicio }}</span>
                  </td>
                  <td class="mono-font fs-xs text-nowrap">
                    {{ job.pesoOrigen ?? '-' }} / {{ job.pesoRecibido ?? '-' }} kg
                    @if (job.diferenciaPesoPct && job.diferenciaPesoPct !== 'N/A') {
                      <span class="fs-xxs ms-1 badge bg-slate-100 text-dark border">{{ job.diferenciaPesoPct }}</span>
                    }
                  </td>
                  <td class="text-end mono-font fw-semibold text-dark">
                    \${{ (job.valorVentaCotizado ?? 0) | number:'1.0-0' }}
                  </td>
                  <td class="text-end mono-font">
                    @if (job.valorFacturadoReal !== undefined) {
                      <strong class="text-dark">\${{ job.valorFacturadoReal | number:'1.0-0' }}</strong>
                      <div class="fs-xxs" [class.text-success]="variance >= 0" [class.text-danger]="variance < 0">
                        {{ variance >= 0 ? '+' : '' }}{{ variance | number:'1.0-0' }} vs cot.
                      </div>
                    } @else {
                      <span class="text-muted fs-xxs">Sin facturar</span>
                    }
                  </td>
                  <td class="text-end mono-font text-muted">
                    @if (job.costoReal !== undefined) {
                      \${{ job.costoReal | number:'1.0-0' }}
                    } @else {
                      <span>Est. \${{ (job.costoEstimadoCotizado ?? 0) | number:'1.0-0' }}</span>
                    }
                  </td>
                  <td class="text-end mono-font fw-bold" [class.text-success]="profit > 0" [class.text-danger]="profit < 0">
                    @if (job.valorFacturadoReal !== undefined) {
                      \${{ profit | number:'1.0-0' }}
                    } @else {
                      <span class="text-muted fw-normal">Est. \${{ ((job.valorVentaCotizado ?? 0) - (job.costoEstimadoCotizado ?? 0)) | number:'1.0-0' }}</span>
                    }
                  </td>
                  <td>
                    <span class="badge mono-font fs-xxs"
                          [class.bg-amber-100]="isCashflowAlert(job)"
                          [class.text-amber-800]="isCashflowAlert(job)"
                          [class.bg-slate-100]="!isCashflowAlert(job)"
                          [class.text-slate-700]="!isCashflowAlert(job)">
                      {{ job.plazoPagoDias ?? 15 }} días
                    </span>
                    @if (isCashflowAlert(job)) {
                      <div class="fs-xxs text-danger fw-semibold mt-1">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>Alerta flujo
                      </div>
                    }
                  </td>
                  <td>
                    @if (job.facturaNumero) {
                      <div class="mono-font fs-xs fw-semibold text-dark">{{ job.facturaNumero }}</div>
                    }
                    <span class="status-pill" [ngClass]="getCobroClass(job.estadoCobro)">
                      <span class="dot"></span>{{ job.estadoCobro || 'PENDIENTE_FACTURAR' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <div class="d-inline-flex gap-1">
                      <button type="button" class="btn btn-sm btn-brand-primary py-1 px-2 fs-xs" (click)="openInvoiceModal(job)">
                        <i class="bi bi-receipt me-1"></i>{{ job.facturaNumero ? 'Editar' : 'Facturar' }}
                      </button>
                      @if (job.estadoCobro === 'FACTURADA') {
                        <button type="button" class="btn btn-sm btn-outline-success py-1 px-2 fs-xs" (click)="markCollected(job)">
                          <i class="bi bi-cash-coin me-1"></i>Cobrar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="text-center py-4 text-muted">
                    No existen registros de facturación para los filtros actuales.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Issue / Edit Invoice Modal -->
      @if (editingJob()) {
        <div class="modal-backdrop fade show"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-3">
              <div class="modal-header bg-slate-900 text-white py-3 px-4">
                <h6 class="modal-title fw-bold font-heading mb-0">
                  <i class="bi bi-receipt-cutoff me-2 text-info"></i>Facturar Referencia {{ editingJob()?.refArlogs }}
                </h6>
                <button type="button" class="btn-close btn-close-white" (click)="editingJob.set(null)"></button>
              </div>
              <form (ngSubmit)="saveInvoice()">
                <div class="modal-body p-4 bg-slate-50">
                  <div class="p-2 px-3 bg-white border border-slate-200 rounded-2 mb-3 fs-xs">
                    <div><strong>Cliente:</strong> {{ editingJob()?.cliente }}</div>
                    <div class="text-muted">Cotizado: \${{ editingJob()?.valorVentaCotizado ?? 0 }} | Costo est.: \${{ editingJob()?.costoEstimadoCotizado ?? 0 }}</div>
                  </div>
                  <div class="row g-3">
                    <div class="col-12">
                      <label class="form-label fs-xs fw-bold text-dark">Número de Factura *</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="invoiceForm.facturaNumero" name="facturaNumero" required>
                    </div>
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Valor Facturado Real (USD) *</label>
                      <input type="number" step="0.01" class="form-control mono-font" [(ngModel)]="invoiceForm.valorFacturadoReal" name="valorFacturadoReal" required>
                    </div>
                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Costo Real (USD) *</label>
                      <input type="number" step="0.01" class="form-control mono-font" [(ngModel)]="invoiceForm.costoReal" name="costoReal" required>
                    </div>
                    <div class="col-12">
                      <label class="form-label fs-xs fw-bold text-dark">Estado de Cobro</label>
                      <select class="form-select" [(ngModel)]="invoiceForm.estadoCobro" name="estadoCobro">
                        <option value="FACTURADA">Facturada (Pendiente de cobro)</option>
                        <option value="COBRADA">Cobrada</option>
                        <option value="VENCIDA">Vencida</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="modal-footer bg-white border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="editingJob.set(null)">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">Guardar Factura</button>
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
    .bg-amber-100 { background-color: #FEF3C7 !important; }
    .text-amber-800 { color: #92400E !important; }
  `]
})
export class BillingViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly jobs = this.shipmentService.jobs;
  searchQuery = signal('');
  filterStatus = signal('ALL');
  filterClient = signal('ALL');
  editingJob = signal<ShipmentJob | null>(null);

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
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.filterStatus();
    const cli = this.filterClient();
    return this.jobs().filter(j => {
      if (st !== 'ALL' && (j.estadoCobro ?? 'PENDIENTE_FACTURAR') !== st) return false;
      if (cli !== 'ALL' && j.clienteId !== cli) return false;
      if (!q) return true;
      return (
        j.refArlogs.toLowerCase().includes(q) ||
        j.qrCode.toLowerCase().includes(q) ||
        j.cliente.toLowerCase().includes(q) ||
        (j.facturaNumero?.toLowerCase().includes(q) ?? false) ||
        j.ordenesCompra.some(o => o.toLowerCase().includes(q))
      );
    });
  });

  readonly totals = computed(() => {
    const list = this.filteredJobs();
    let cotizado = 0;
    let facturado = 0;
    let profitReal = 0;
    let profitCotizado = 0;
    let facturadosCount = 0;
    let pendientes = 0;
    let riesgoFlujo = 0;

    for (const j of list) {
      const c = j.valorVentaCotizado ?? 0;
      const ce = j.costoEstimadoCotizado ?? 0;
      cotizado += c;
      profitCotizado += c - ce;
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

