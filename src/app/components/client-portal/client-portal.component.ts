import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { ShipmentJob } from '../../models/shipment.model';
import { JobDetailModalComponent } from '../job-detail-modal/job-detail-modal.component';

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, JobDetailModalComponent],
  template: `
    <div class="client-portal py-2">
      
      <!-- Top Client Header -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div class="d-flex align-items-center gap-2">
          <div class="client-avatar d-flex align-items-center justify-content-center text-primary bg-blue-50 rounded-2 flex-shrink-0">
            <i class="bi bi-buildings fs-5"></i>
          </div>
          <div>
            <h5 class="fw-bold mb-0 text-dark font-heading">{{ currentUser().clienteNombre || 'Portal de Clientes' }}</h5>
            <span class="fs-xxs text-muted">Seguimiento de órdenes y estado de carga en tiempo real</span>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
            (click)="exportExcel()">
            <i class="bi bi-file-earmark-excel"></i>
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      <!-- Unified KPI Stat Ribbon (Space-optimized) -->
      <div class="stat-ribbon bg-white border border-slate-200 rounded-3 p-3 mb-3 shadow-xs">
        <div class="row g-2 align-items-center text-center text-sm-start">
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-slate-100 text-dark rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-box-seam"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Mis Embarques</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ filteredClientJobs().length }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-blue-50 text-primary rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-arrow-repeat"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">En Tránsito</span>
                <span class="fs-5 fw-bold mono-font text-primary">{{ openJobsCount() }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3 border-end-sm">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-emerald-50 text-success rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-check-circle"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Completados</span>
                <span class="fs-5 fw-bold mono-font text-success">{{ closedJobsCount() }}</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
              <div class="stat-icon bg-amber-50 text-warning rounded-2 d-flex align-items-center justify-content-center">
                <i class="bi bi-clock-history"></i>
              </div>
              <div>
                <span class="fs-xxs text-muted text-uppercase fw-semibold d-block">Ciclo Promedio</span>
                <span class="fs-5 fw-bold mono-font text-dark">{{ avgClientCycle() }} d</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Unified Table Card with Integrated Filter Toolbar & Pagination -->
      <div class="card-executive overflow-hidden mb-3">
        
        <!-- Integrated Filter Bar Header -->
        <div class="p-3 bg-slate-50 border-bottom border-slate-200">
          <div class="row g-2 align-items-center">
            
            <!-- PO Search Input -->
            <div class="col-12 col-md-3">
              <div class="input-group input-group-sm">
                <span class="input-group-text bg-white text-muted border-end-0">
                  <i class="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control border-start-0" 
                  placeholder="Buscar OC o Ref..." 
                  [ngModel]="filterPO()" 
                  (ngModelChange)="filterPO.set($event); clientPage.set(1)">
                @if (filterPO()) {
                  <button class="btn btn-outline-secondary" type="button" (click)="filterPO.set(''); clientPage.set(1)">
                    <i class="bi bi-x"></i>
                  </button>
                }
              </div>
            </div>

            <!-- Mes -->
            <div class="col-6 col-md-2">
              <select class="form-select form-select-sm" [ngModel]="filterMonth()" (ngModelChange)="filterMonth.set($event); clientPage.set(1)">
                <option value="ALL">Mes: Todos</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
              </select>
            </div>

            <!-- Shipper -->
            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="filterShipper()" (ngModelChange)="filterShipper.set($event); clientPage.set(1)">
                <option value="ALL">Proveedor: Todos</option>
                @for (sh of availableShippers(); track sh) {
                  <option [value]="sh">{{ sh }}</option>
                }
              </select>
            </div>

            <!-- Modalidad -->
            <div class="col-6 col-md-2">
              <select class="form-select form-select-sm" [ngModel]="filterModality()" (ngModelChange)="filterModality.set($event); clientPage.set(1)">
                <option value="ALL">Modalidad: Todas</option>
                <option value="AEREO">Aéreo</option>
                <option value="FCL">FCL Marítimo</option>
                <option value="LCL">LCL Consolidado</option>
                <option value="CUSTOMS">Customs</option>
                <option value="COURIER">Courier</option>
                <option value="INLAND">Inland</option>
              </select>
            </div>

            <!-- Incoterm -->
            <div class="col-6 col-md-2 d-flex align-items-center gap-1">
              <select class="form-select form-select-sm flex-grow-1" [ngModel]="filterIncoterm()" (ngModelChange)="filterIncoterm.set($event); clientPage.set(1)">
                <option value="ALL">Incoterm: Todos</option>
                <option value="EXW">EXW</option>
                <option value="FCA">FCA</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="CFR">CFR</option>
                <option value="DAP">DAP</option>
              </select>

              <button type="button" class="btn btn-sm btn-outline-secondary px-2" (click)="resetFilters()" title="Restablecer filtros">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>

          </div>
        </div>

        <!-- Shipments Table -->
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Modalidad</th>
                <th>Proveedor (Shipper)</th>
                <th>Origen</th>
                <th>Incoterm</th>
                <th>Órdenes de Compra</th>
                <th>Asignación</th>
                <th>Tránsito</th>
                <th>Ciclo</th>
                <th>Estado</th>
                <th class="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (job of paginatedClientJobs(); track job.refArlogs) {
                <tr>
                  <td>
                    <strong class="text-primary mono-font">{{ job.refArlogs }}</strong>
                  </td>
                  <td>
                    <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font">{{ job.servicio }}</span>
                  </td>
                  <td>
                    <div class="text-truncate" style="max-width: 150px;" [title]="job.shipper">{{ job.shipper }}</div>
                  </td>
                  <td>
                    <div class="text-truncate" style="max-width: 140px;" [title]="job.puertoEmbarque + ', ' + job.paisOrigen">
                      {{ job.puertoEmbarque }}, {{ job.paisOrigen }}
                    </div>
                  </td>
                  <td>
                    <span class="badge bg-white text-dark border border-slate-200 mono-font">{{ job.incoterm }}</span>
                  </td>
                  <td>
                    <span class="mono-font badge bg-slate-50 text-dark border border-slate-200">{{ job.ordenesCompra.join(', ') }}</span>
                  </td>
                  <td class="mono-font fs-xs">{{ job.h1_asignacion }}</td>
                  <td>
                    <span class="mono-font fw-bold" [class.text-primary]="job.diasTransito !== 'N/A'">
                      {{ job.diasTransito !== 'N/A' ? job.diasTransito + ' d' : 'N/A' }}
                    </span>
                  </td>
                  <td>
                    @if (job.diasCicloTotal !== 'N/A') {
                      <span class="mono-font fw-bold text-success">{{ job.diasCicloTotal }} d</span>
                    } @else if (job.diasGestionSinAduana !== 'N/A') {
                      <span class="mono-font fw-bold text-info">{{ job.diasGestionSinAduana }} d</span>
                    } @else {
                      <span class="mono-font text-muted">N/A</span>
                    }
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatusPillClass(job.estado)">
                      <span class="dot"></span>{{ job.estado }}
                    </span>
                  </td>
                  <td class="text-center">
                    <button 
                      type="button" 
                      class="btn btn-sm btn-brand-primary py-1 px-2 fs-xs"
                      (click)="viewJobDetail(job)">
                      <i class="bi bi-geo-alt me-1"></i>Tracking
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="11" class="text-center py-4 text-muted">
                    No se encontraron embarques para los criterios seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Functional Pagination Footer -->
        @if (filteredClientJobs().length > 0) {
          <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xs">
            <div class="d-flex align-items-center gap-2 text-muted">
              <span>
                Mostrando <strong>{{ clientStartIndex() }}</strong>–<strong>{{ clientEndIndex() }}</strong> de <strong>{{ filteredClientJobs().length }}</strong>
              </span>
              <span class="d-none d-sm-inline">&bull;</span>
              <div class="d-flex align-items-center gap-1 d-none d-sm-flex">
                <span class="text-muted fs-xxs">Filas:</span>
                <div class="btn-group btn-group-sm pagination-size-group">
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="clientPageSize() === 5" [class.btn-outline-secondary]="clientPageSize() !== 5" (click)="clientPageSize.set(5); clientPage.set(1)">5</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="clientPageSize() === 10" [class.btn-outline-secondary]="clientPageSize() !== 10" (click)="clientPageSize.set(10); clientPage.set(1)">10</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="clientPageSize() === 20" [class.btn-outline-secondary]="clientPageSize() !== 20" (click)="clientPageSize.set(20); clientPage.set(1)">20</button>
                </div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="clientPage() === 1"
                (click)="clientPage.set(clientPage() - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
              @for (p of clientPageNumbers(); track p) {
                <button
                  type="button"
                  class="btn btn-sm py-0 px-2 fs-xs"
                  [class.btn-dark]="clientPage() === p"
                  [class.btn-outline-secondary]="clientPage() !== p"
                  (click)="clientPage.set(p)">
                  {{ p }}
                </button>
              }
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="clientPage() === totalClientPages()"
                (click)="clientPage.set(clientPage() + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Analytical Summary (Compact 2-column strip) -->
      <div class="row g-3">
        <!-- Tiempos de Despacho -->
        <div class="col-12 col-lg-6">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-slate-100">
              <h6 class="fw-bold mb-0 text-dark fs-xs text-uppercase letter-spacing-wide">Tiempos por Responsable</h6>
            </div>
            <div class="d-flex flex-column gap-2 fs-xs">
              <div class="d-flex justify-content-between align-items-center p-2 rounded-2 bg-slate-50 border border-slate-200">
                <span class="text-dark">Respuesta Shipper &amp; Carga Lista</span>
                <span class="mono-font fw-bold text-dark">{{ dispatchAttribution().respShipper }} d</span>
              </div>
              <div class="d-flex justify-content-between align-items-center p-2 rounded-2 bg-slate-50 border border-slate-200">
                <span class="text-dark">Tránsito Internacional</span>
                <span class="mono-font fw-bold text-primary">{{ dispatchAttribution().transito }} d</span>
              </div>
              <div class="d-flex justify-content-between align-items-center p-2 rounded-2 bg-slate-50 border border-slate-200">
                <span class="text-dark">Arribo a Declaración</span>
                <span class="mono-font fw-bold text-success">{{ dispatchAttribution().arriboDecl }} d</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Proveedores -->
        <div class="col-12 col-lg-6">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-slate-100">
              <h6 class="fw-bold mb-0 text-dark fs-xs text-uppercase letter-spacing-wide">Principales Proveedores</h6>
              <span class="badge bg-slate-100 text-dark border border-slate-200 fs-xxs">Top 3: {{ shipperInsights().top3Pct }}%</span>
            </div>
            <div class="d-flex flex-column gap-2">
              @for (item of shipperInsights().ranking.slice(0, 3); track item.shipper; let idx = $index) {
                <div>
                  <div class="d-flex justify-content-between align-items-center fs-xs mb-1">
                    <span class="text-dark fw-medium text-truncate">
                      <span class="mono-font text-muted me-1">#{{ idx + 1 }}</span>{{ item.shipper }}
                    </span>
                    <span class="mono-font fw-bold text-dark">{{ item.count }} emb. ({{ item.pct }}%)</span>
                  </div>
                  <div class="progress" style="height: 4px;">
                    <div class="progress-bar bg-primary" [style.width.%]="item.pct"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Job Detail View (Read-Only) -->
      @if (selectedJob()) {
        <app-job-detail-modal 
          [job]="selectedJob()"
          [isReadOnly]="true"
          (close)="selectedJob.set(null)">
        </app-job-detail-modal>
      }

    </div>
  `,
  styles: [`
    .client-avatar { width: 32px; height: 32px; }
    .stat-icon { width: 32px; height: 32px; font-size: 1rem; }
    .letter-spacing-wide { letter-spacing: 0.05em; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
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
export class ClientPortalComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly currentUser = this.shipmentService.currentUser;
  readonly clientJobs = this.shipmentService.authorizedJobs;

  filterMonth = signal('ALL');
  filterShipper = signal('ALL');
  filterPO = signal('');
  filterModality = signal('ALL');
  filterIncoterm = signal('ALL');

  selectedJob = signal<ShipmentJob | null>(null);

  // Pagination
  clientPage = signal(1);
  clientPageSize = signal(6);

  readonly availableShippers = computed(() => {
    const set = new Set<string>();
    this.clientJobs().forEach(j => set.add(j.shipper));
    return Array.from(set).sort();
  });

  readonly filteredClientJobs = computed(() => {
    let list = this.clientJobs();
    const month = this.filterMonth();
    const shipper = this.filterShipper();
    const modality = this.filterModality();
    const incoterm = this.filterIncoterm();
    const po = this.filterPO().toLowerCase().trim();

    if (month !== 'ALL') {
      list = list.filter(j => j.h1_asignacion && j.h1_asignacion.split('-')[1] === month);
    }

    if (shipper !== 'ALL') {
      list = list.filter(j => j.shipper === shipper);
    }

    if (modality !== 'ALL') {
      list = list.filter(j => j.servicio === modality);
    }

    if (incoterm !== 'ALL') {
      list = list.filter(j => j.incoterm === incoterm);
    }

    if (po) {
      list = list.filter(j => j.ordenesCompra.some(o => o.toLowerCase().includes(po)));
    }

    return list;
  });

  readonly totalClientPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredClientJobs().length / this.clientPageSize()))
  );

  readonly paginatedClientJobs = computed(() => {
    const page = Math.min(this.clientPage(), this.totalClientPages());
    const start = (page - 1) * this.clientPageSize();
    return this.filteredClientJobs().slice(start, start + this.clientPageSize());
  });

  readonly clientStartIndex = computed(() =>
    this.filteredClientJobs().length === 0 ? 0 : (this.clientPage() - 1) * this.clientPageSize() + 1
  );

  readonly clientEndIndex = computed(() =>
    Math.min(this.clientPage() * this.clientPageSize(), this.filteredClientJobs().length)
  );

  readonly clientPageNumbers = computed(() => {
    const total = this.totalClientPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly openJobsCount = computed(() => {
    return this.filteredClientJobs().filter(j => j.estado === 'ABIERTO' || j.estado === 'REVISAR').length;
  });

  readonly closedJobsCount = computed(() => {
    return this.filteredClientJobs().filter(j => j.estado === 'CERRADO').length;
  });

  readonly avgClientCycle = computed(() => {
    const cycles = this.filteredClientJobs()
      .map(j => j.diasCicloTotal)
      .filter((c): c is number => typeof c === 'number');
    if (!cycles.length) return 0;
    return Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10;
  });

  readonly dispatchAttribution = computed(() => {
    const list = this.filteredClientJobs();
    const avg = (arr: (number | 'N/A' | undefined)[]): number => {
      const nums = arr.filter((x): x is number => typeof x === 'number');
      if (!nums.length) return 0;
      return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
    };
    return {
      respShipper: avg(list.map(j => j.diasRespuestaShipper)),
      transito: avg(list.map(j => j.diasTransito)),
      arriboDecl: avg(list.map(j => j.diasArriboDeclaracion)),
      declPago: avg(list.map(j => j.diasDeclaracionPago)),
      pagoInforme: avg(list.map(j => j.diasPagoInforme))
    };
  });

  readonly shipperInsights = computed(() => {
    const list = this.filteredClientJobs();
    const total = list.length || 1;
    const map = new Map<string, number>();
    list.forEach(j => {
      if (j.shipper && j.shipper !== 'N/A') {
        map.set(j.shipper, (map.get(j.shipper) || 0) + 1);
      }
    });
    const ranking = Array.from(map.entries())
      .map(([shipper, count]) => ({ shipper, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
    const top3Count = ranking.slice(0, 3).reduce((acc, r) => acc + r.count, 0);
    return {
      ranking,
      top3Pct: list.length ? Math.round((top3Count / list.length) * 100) : 0
    };
  });

  resetFilters(): void {
    this.filterMonth.set('ALL');
    this.filterShipper.set('ALL');
    this.filterPO.set('');
    this.filterModality.set('ALL');
    this.filterIncoterm.set('ALL');
    this.clientPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando todos sus embarques.');
  }

  viewJobDetail(job: ShipmentJob): void {
    this.selectedJob.set(job);
  }

  getStatusPillClass(status: string | undefined): string {
    switch (status) {
      case 'ABIERTO': return 'status-abierto';
      case 'REVISAR': return 'status-revisar';
      case 'CERRADO': return 'status-cerrado';
      default: return 'status-na';
    }
  }

  exportExcel(): void {
    const list = this.filteredClientJobs();
    this.shipmentService.exportToExcel(list);
    this.toastService.success('Correcto — Exportado', `Se descargó el Excel con ${list.length} embarques.`);
  }
}
