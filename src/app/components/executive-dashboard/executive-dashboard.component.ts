import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { AuditService } from '../../services/audit.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="executive-dashboard py-2">
      
      <!-- Top Section: Modality Overview & SLA Threshold Slider -->
      <div class="row g-3 mb-3">
        
        <!-- Fast Modality Distribution Card -->
        <div class="col-12 col-xl-8">
          <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 border-bottom pb-2">
              <h6 class="fw-bold mb-0 text-dark">Distribución Operativa por Modalidad</h6>
              <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font fs-xxs">
                {{ stats().total }} embarques registrados
              </span>
            </div>

            <div class="row g-2 my-auto">
              @for (item of modalitySummary(); track item.label) {
                <div class="col-6 col-sm-4">
                  <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 h-100">
                    <div class="d-flex align-items-center justify-content-between mb-1">
                      <span class="fs-xs fw-semibold text-dark d-flex align-items-center gap-1">
                        <i class="bi {{ item.icon }} text-primary"></i>{{ item.label }}
                      </span>
                      <span class="badge bg-white text-dark border border-slate-200 mono-font fs-xs">{{ item.count }}</span>
                    </div>
                    <div class="progress mb-1" style="height: 4px;">
                      <div class="progress-bar" [ngClass]="item.barClass" [style.width.%]="item.pct"></div>
                    </div>
                    <div class="fs-xxs text-muted d-flex justify-content-between">
                      <span>Participación</span>
                      <span class="mono-font fw-semibold">{{ item.pct }}%</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="pt-2 mt-3 border-top border-slate-100 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xxs text-muted">
              <span>Hub Principal: Guayaquil (GYE) &bull; Cobertura Global</span>
              <span class="mono-font fw-semibold text-dark">Ciclo promedio: {{ averages().cicloTotal }} días</span>
            </div>
          </div>
        </div>

        <!-- Operational Threshold & SLA Parameter -->
        <div class="col-12 col-xl-4">
          <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="fs-xs fw-semibold text-muted text-uppercase letter-spacing-wide">
                  Parámetro de Control SLA
                </span>
                <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font fs-xxs">
                  Gerencia
                </span>
              </div>

              <h6 class="fw-bold mb-1 text-dark">Tolerancia de Días Abiertos</h6>

              <!-- Interactive Slider -->
              <div class="bg-slate-50 p-3 rounded-3 border border-slate-200 my-2">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="fs-xs text-muted">Límite de alerta:</span>
                  <span class="badge bg-amber-100 text-amber-800 border border-amber-300 fs-6 mono-font px-2 py-1">
                    {{ currentThreshold() }} días
                  </span>
                </div>
                <input 
                  type="range" 
                  class="form-range" 
                  min="5" 
                  max="40" 
                  step="1"
                  [ngModel]="currentThreshold()"
                  (ngModelChange)="onThresholdChange($event)">
                <div class="d-flex justify-content-between text-muted fs-xxs mt-1">
                  <span>5d</span>
                  <span class="fw-semibold text-dark">15d (Base)</span>
                  <span>40d</span>
                </div>
              </div>
            </div>

            <!-- Quick Threshold Presets -->
            <div class="pt-2 border-top border-slate-100">
              <div class="d-flex align-items-center justify-content-between gap-1">
                <span class="fs-xxs text-muted fw-semibold">Presets:</span>
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2 fs-xxs" (click)="onThresholdChange(10)">10d</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2 fs-xxs fw-bold" (click)="onThresholdChange(15)">15d</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2 fs-xxs" (click)="onThresholdChange(20)">20d</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2 fs-xxs" (click)="onThresholdChange(30)">30d</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Unified KPI Stat Strip -->
      <div class="stat-ribbon bg-white border border-slate-200 rounded-3 p-3 mb-3 shadow-xs">
        <div class="row g-2 align-items-center text-center text-sm-start">
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-slate-100 text-dark rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-box-seam"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Total Embarques</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ stats().total }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-blue-50 text-primary rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-arrow-repeat"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">En Curso</span>
                <span class="fs-5 fw-bold mono-font text-primary">{{ stats().abiertos }} ({{ stats().abiertosPorcentaje }}%)</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-amber-50 text-warning rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-exclamation-triangle"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Demorados (&gt;{{ currentThreshold() }}d)</span>
                <span class="fs-5 fw-bold mono-font text-amber-600">{{ stats().demorados }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-emerald-50 text-success rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-check2-circle"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Cerrados</span>
                <span class="fs-5 fw-bold mono-font text-success">{{ stats().cerrados }} ({{ stats().cerradosPorcentaje }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tiempos Medios & Commercial Summary -->
      <div class="row g-3 mb-3">
        <!-- Financial Summary -->
        <div class="col-12 col-lg-5">
          <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
            <div class="d-flex align-items-center justify-content-between mb-2 border-bottom pb-2">
              <h6 class="fw-bold mb-0 text-dark">Rentabilidad &amp; Facturación</h6>
              <span class="badge bg-slate-100 text-dark border fs-xxs">Consolidado</span>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200">
                  <div class="fs-xxs text-muted text-uppercase fw-semibold">Cotizado Total</div>
                  <div class="fs-5 fw-bold text-dark mono-font">\${{ commercialStats().cotizado | number:'1.0-0' }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-2 px-3 rounded-3 bg-emerald-50 border border-emerald-200">
                  <div class="fs-xxs text-emerald-800 text-uppercase fw-semibold">Facturado Real</div>
                  <div class="fs-5 fw-bold text-success mono-font">\${{ commercialStats().facturado | number:'1.0-0' }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-2 px-3 rounded-3 bg-blue-50 border border-blue-200">
                  <div class="fs-xxs text-blue-800 text-uppercase fw-semibold">Profit Real</div>
                  <div class="fs-5 fw-bold text-primary mono-font">\${{ commercialStats().profitReal | number:'1.0-0' }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-2 px-3 rounded-3 bg-amber-50 border border-amber-200">
                  <div class="fs-xxs text-amber-800 text-uppercase fw-semibold">Pend. Facturar</div>
                  <div class="fs-5 fw-bold text-amber-700 mono-font">{{ commercialStats().pendientes }} emb.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shippers Comparison Table -->
        <div class="col-12 col-lg-7">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-2 border-bottom pb-2">
              <h6 class="fw-bold mb-0 text-dark">Comparativa de Tiempos por Proveedor (Shipper)</h6>
              <i class="bi bi-bar-chart-steps text-primary"></i>
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-arlogs align-middle mb-0">
                <thead>
                  <tr>
                    <th>Proveedor (Shipper)</th>
                    <th>Ruta / Mod.</th>
                    <th class="text-end">Emb.</th>
                    <th class="text-end">Resp. H2−H1</th>
                    <th class="text-end">Origen H4−H1</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sp of shipperComparison(); track sp.shipper) {
                    <tr>
                      <td class="fw-semibold text-dark fs-xs">{{ sp.shipper }}</td>
                      <td class="fs-xxs text-muted">{{ sp.origen }}</td>
                      <td class="text-end mono-font fs-xs">{{ sp.count }}</td>
                      <td class="text-end mono-font fs-xs">{{ sp.avgResp }} d</td>
                      <td class="text-end mono-font fw-bold fs-xs" [class.text-danger]="sp.avgOrigen >= 10" [class.text-success]="sp.avgOrigen > 0 && sp.avgOrigen < 7">
                        {{ sp.avgOrigen > 0 ? sp.avgOrigen + ' d' : 'N/A' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Shipments with Review Alert Table (if any) -->
      @if (delayedJobs().length > 0) {
        <div class="card-executive overflow-hidden border-amber-300 mb-3">
          <div class="p-3 bg-amber-50 border-bottom border-amber-200 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill text-amber-600 fs-5"></i>
              <strong class="text-dark fs-xs">Embarques que Requieren Atención ({{ delayedJobs().length }})</strong>
            </div>
            <span class="status-pill status-revisar">
              <span class="dot"></span>Acción Recomendada
            </span>
          </div>

          <div class="table-responsive">
            <table class="table table-arlogs align-middle mb-0">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Cliente</th>
                  <th>Modalidad</th>
                  <th>Shipper</th>
                  <th>H1 Asignación</th>
                  <th>Días Abiertos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (job of delayedJobs(); track job.refArlogs) {
                  <tr class="row-alert">
                    <td><strong class="text-primary mono-font">{{ job.refArlogs }}</strong></td>
                    <td class="fw-medium text-dark">{{ job.cliente }}</td>
                    <td><span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font">{{ job.servicio }}</span></td>
                    <td class="text-truncate" style="max-width: 200px;">{{ job.shipper }}</td>
                    <td class="mono-font">{{ job.h1_asignacion }}</td>
                    <td>
                      <span class="badge bg-amber-100 text-amber-800 mono-font fw-bold">
                        {{ job.diasAbiertos }} días
                      </span>
                    </td>
                    <td>
                      <span class="status-pill status-revisar">
                        <span class="dot"></span>REVISAR
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Executive Audit Trail with Pagination -->
      <div class="card-executive overflow-hidden">
        <div class="p-3 bg-slate-50 border-bottom border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-journal-check text-primary fs-5"></i>
            <strong class="text-dark fs-xs">Auditoría y Control de Cambios</strong>
          </div>
          <div class="d-flex align-items-center gap-2 flex-wrap flex-sm-nowrap w-100 w-md-auto justify-content-end">
            <div class="input-group input-group-sm flex-grow-1 flex-sm-grow-0" style="min-width: 180px; max-width: 240px;">
              <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control border-start-0 fs-xxs"
                     placeholder="Filtrar auditoría..."
                     [ngModel]="auditSearch()"
                     (ngModelChange)="auditSearch.set($event); auditPage.set(1)">
            </div>
            <button type="button" class="btn btn-sm btn-outline-success py-1 px-2 fs-xxs text-nowrap" (click)="exportAudit()">
              <i class="bi bi-file-earmark-excel me-1"></i>Excel
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Referencia</th>
                <th>Acción</th>
                <th>Detalle del Cambio</th>
              </tr>
            </thead>
            <tbody>
              @for (log of paginatedAudit(); track log.id) {
                <tr>
                  <td class="mono-font fs-xxs text-muted text-nowrap">{{ log.timestamp }}</td>
                  <td>
                    <span class="fw-semibold text-dark fs-xs">{{ log.usuario }}</span>
                    <span class="text-muted fs-xxs ms-1">({{ log.rol }})</span>
                  </td>
                  <td><span class="badge bg-slate-100 text-dark border border-slate-200 mono-font fs-xxs">{{ log.entidad }}</span></td>
                  <td class="fs-xs fw-medium text-dark">{{ log.accion }}</td>
                  <td class="fs-xs text-muted">{{ log.detalle }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-4 text-muted">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination for Audit Log -->
        @if (filteredAudit().length > 0) {
          <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xs">
            <div class="d-flex align-items-center gap-2 text-muted">
              <span>
                Mostrando <strong>{{ auditStartIndex() }}</strong>–<strong>{{ auditEndIndex() }}</strong> de <strong>{{ filteredAudit().length }}</strong> eventos
              </span>
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

    </div>
  `,
  styles: [`
    .letter-spacing-wide { letter-spacing: 0.05em; }
    .stat-icon { width: 32px; height: 32px; font-size: 1rem; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-200 { background-color: #E2E8F0 !important; }
    .text-slate-700 { color: #334155 !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }

    .bg-blue-50 { background-color: #EFF6FF !important; }
    .text-blue-800 { color: #1E40AF !important; }

    .bg-amber-50 { background-color: #FFFBEB !important; }
    .bg-amber-100 { background-color: #FEF3C7 !important; }
    .text-amber-600 { color: #D97706 !important; }
    .text-amber-700 { color: #B45309 !important; }
    .text-amber-800 { color: #92400E !important; }
    .border-amber-200 { border-color: #FDE68A !important; }
    .border-amber-300 { border-color: #FCD34D !important; }

    .bg-emerald-50 { background-color: #ECFDF5 !important; }
    .text-emerald-800 { color: #065F46 !important; }

    @media (min-width: 576px) {
      .border-end-sm { border-right: 1px solid #E2E8F0; }
    }
  `]
})
export class ExecutiveDashboardComponent {
  private shipmentService = inject(ShipmentService);
  private auditService = inject(AuditService);
  private toastService = inject(ToastService);

  private thresholdToastTimer: ReturnType<typeof setTimeout> | null = null;
  readonly auditSearch = signal('');
  readonly currentThreshold = this.shipmentService.alertThresholdDays;
  readonly jobs = this.shipmentService.jobs;

  // Pagination for Audit
  auditPage = signal(1);
  auditPageSize = signal(5);

  readonly filteredAudit = computed(() => {
    const q = this.auditSearch().trim().toLowerCase();
    const logs = this.auditService.logs();
    if (!q) return logs;
    return logs.filter(l =>
      l.usuario.toLowerCase().includes(q) ||
      l.entidad.toLowerCase().includes(q) ||
      l.rol.toLowerCase().includes(q) ||
      l.accion.toLowerCase().includes(q) ||
      l.detalle.toLowerCase().includes(q)
    );
  });

  readonly totalAuditPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAudit().length / this.auditPageSize()))
  );

  readonly paginatedAudit = computed(() => {
    const page = Math.min(this.auditPage(), this.totalAuditPages());
    const start = (page - 1) * this.auditPageSize();
    return this.filteredAudit().slice(start, start + this.auditPageSize());
  });

  readonly auditStartIndex = computed(() =>
    this.filteredAudit().length === 0 ? 0 : (this.auditPage() - 1) * this.auditPageSize() + 1
  );

  readonly auditEndIndex = computed(() =>
    Math.min(this.auditPage() * this.auditPageSize(), this.filteredAudit().length)
  );

  readonly auditPageNumbers = computed(() => {
    const total = this.totalAuditPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  exportAudit(): void {
    const logs = this.auditService.logs();
    this.auditService.exportAuditExcel(logs);
    this.toastService.success(
      'Correcto — Auditoría exportada',
      `Se descargó el reporte Excel con ${logs.length} eventos de control.`
    );
  }

  onThresholdChange(days: number): void {
    const val = Number(days);
    this.shipmentService.setAlertThreshold(val);
    if (this.thresholdToastTimer) {
      clearTimeout(this.thresholdToastTimer);
    }
    this.thresholdToastTimer = setTimeout(() => {
      this.toastService.info(
        'Actualizado — Umbral SLA',
        `Tolerancia operativa ajustada a ${val} días abiertos.`
      );
    }, 400);
  }

  readonly stats = computed(() => {
    const list = this.jobs();
    const total = list.length;
    const abiertos = list.filter(j => j.estado === 'ABIERTO').length;
    const demorados = list.filter(j => j.estado === 'REVISAR').length;
    const cerrados = list.filter(j => j.estado === 'CERRADO').length;

    return {
      total,
      abiertos,
      abiertosPorcentaje: total ? Math.round((abiertos / total) * 100) : 0,
      demorados,
      cerrados,
      cerradosPorcentaje: total ? Math.round((cerrados / total) * 100) : 0
    };
  });

  readonly delayedJobs = computed(() => {
    return this.jobs().filter(j => j.estado === 'REVISAR');
  });

  readonly averages = computed(() => {
    const list = this.jobs();

    const avgOf = (arr: (number | 'N/A' | undefined)[]): number => {
      const nums = arr.filter((x): x is number => typeof x === 'number');
      if (!nums.length) return 0;
      return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
    };

    const respShipper = avgOf(list.map(j => j.diasRespuestaShipper));
    const coordinacionOrigen = avgOf(list.map(j => j.diasCoordinacionOrigen));
    const transito = avgOf(list.map(j => j.diasTransito));
    const aduana = avgOf(list.map(j => j.diasEnAduana));
    const cicloTotal = avgOf(list.map(j => j.diasCicloTotal));

    return {
      respShipper,
      coordinacionOrigen,
      transito,
      aduana,
      cicloTotal
    };
  });

  readonly commercialStats = computed(() => {
    const list = this.jobs();
    let cotizado = 0;
    let facturado = 0;
    let profitReal = 0;
    let pendientes = 0;
    for (const j of list) {
      cotizado += j.valorVentaCotizado ?? 0;
      if (j.valorFacturadoReal !== undefined) {
        facturado += j.valorFacturadoReal;
        profitReal += j.valorFacturadoReal - (j.costoReal ?? j.costoEstimadoCotizado ?? 0);
      } else {
        pendientes++;
      }
    }
    return { cotizado, facturado, profitReal, pendientes };
  });

  readonly shipperComparison = computed(() => {
    const map = new Map<string, { origen: string; count: number; resp: number[]; orig: number[] }>();
    for (const j of this.jobs()) {
      if (!j.shipper || j.shipper === 'N/A') continue;
      const cur = map.get(j.shipper) ?? { origen: `${j.paisOrigen} (${j.servicio})`, count: 0, resp: [], orig: [] };
      cur.count++;
      if (typeof j.diasRespuestaShipper === 'number') cur.resp.push(j.diasRespuestaShipper);
      if (typeof j.diasCoordinacionOrigen === 'number') cur.orig.push(j.diasCoordinacionOrigen);
      map.set(j.shipper, cur);
    }
    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    return Array.from(map.entries())
      .map(([shipper, v]) => ({
        shipper,
        origen: v.origen,
        count: v.count,
        avgResp: avg(v.resp),
        avgOrigen: avg(v.orig)
      }))
      .sort((a, b) => b.avgOrigen - a.avgOrigen || b.count - a.count)
      .slice(0, 5);
  });

  readonly modalitySummary = computed(() => {
    const list = this.jobs();
    const total = Math.max(1, list.length);
    const defs: { key: string; label: string; icon: string; barClass: string }[] = [
      { key: 'AEREO', label: 'Aéreo (A)', icon: 'bi-airplane', barClass: 'bg-slate-900' },
      { key: 'FCL', label: 'FCL (F)', icon: 'bi-box-seam', barClass: 'bg-slate-800' },
      { key: 'LCL', label: 'LCL (L)', icon: 'bi-boxes', barClass: 'bg-slate-700' },
      { key: 'CUSTOMS', label: 'Customs (C)', icon: 'bi-shield-check', barClass: 'bg-slate-600' },
      { key: 'COURIER', label: 'Courier (AC)', icon: 'bi-send', barClass: 'bg-slate-500' },
      { key: 'INLAND', label: 'Inland (I)', icon: 'bi-truck', barClass: 'bg-slate-500' }
    ];
    return defs.map(d => {
      const count = list.filter(j => j.servicio === d.key).length;
      return {
        label: d.label,
        icon: d.icon,
        barClass: d.barClass,
        count,
        pct: list.length ? Math.round((count / total) * 100) : 0
      };
    });
  });
}
