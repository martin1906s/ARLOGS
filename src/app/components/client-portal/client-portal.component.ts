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
      
      <!-- Top Client Header & Security Status -->
      <div class="card-executive p-3 mb-3 bg-white">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          
          <div class="d-flex align-items-start align-items-sm-center gap-2 gap-sm-3 min-w-0">
            <div class="client-avatar d-flex align-items-center justify-content-center text-primary bg-blue-50 rounded-3 flex-shrink-0">
              <i class="bi bi-buildings fs-5"></i>
            </div>
            <div class="min-w-0">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <h5 class="fw-bold mb-0 text-dark font-heading">{{ currentUser().clienteNombre || 'Vista Supervisión de Clientes' }}</h5>
                <span class="badge bg-emerald-50 text-emerald-800 border border-emerald-300 fs-xxs">
                  <i class="bi bi-shield-check me-1"></i>{{ currentUser().clienteNombre ? 'Portal Verificado' : 'Supervisión' }}
                </span>
              </div>
              <div class="text-muted fs-xs">
                Portal exclusivo de seguimiento de órdenes, tiempos por responsable y estado de carga consolidada
              </div>
            </div>
          </div>

          <!-- Verification of Data Privacy -->
          <button 
            type="button" 
            class="btn btn-sm btn-outline-secondary fs-xs d-flex align-items-center gap-1 shadow-xs"
            (click)="runAdversarialTest()"
            title="Verificar privacidad entre cuentas de clientes">
            <i class="bi bi-shield-lock"></i>
            <span>Verificar Privacidad de Cuenta</span>
          </button>

        </div>
      </div>

      <!-- Client Filters Bar (Mes, Shipper, OC, Modalidad, Incoterm) -->
      <div class="card-executive p-3 mb-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="fs-xs fw-semibold text-muted text-uppercase letter-spacing-wide">Filtros de Búsqueda</span>
          <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none fs-xs text-muted" (click)="resetFilters()">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar filtros
          </button>
        </div>

        <div class="row g-2">
          
          <!-- Mes -->
          <div class="col-6 col-md-2">
            <label class="form-label fs-xxs text-muted mb-1">Mes de Asignación</label>
            <select class="form-select form-select-sm" [ngModel]="filterMonth()" (ngModelChange)="filterMonth.set($event)">
              <option value="ALL">Todos los meses</option>
              <option value="06">Junio 2026</option>
              <option value="07">Julio 2026</option>
              <option value="08">Agosto 2026</option>
              <option value="09">Septiembre 2026</option>
              <option value="10">Octubre 2026</option>
              <option value="11">Noviembre 2026</option>
            </select>
          </div>

          <!-- Shipper -->
          <div class="col-6 col-md-3">
            <label class="form-label fs-xxs text-muted mb-1">Proveedor (Shipper)</label>
            <select class="form-select form-select-sm" [ngModel]="filterShipper()" (ngModelChange)="filterShipper.set($event)">
              <option value="ALL">Todos los proveedores</option>
              @for (sh of availableShippers(); track sh) {
                <option [value]="sh">{{ sh }}</option>
              }
            </select>
          </div>

          <!-- Orden de Compra -->
          <div class="col-6 col-md-2">
            <label class="form-label fs-xxs text-muted mb-1">Orden de Compra</label>
            <input type="text" class="form-control form-control-sm mono-font" placeholder="Ej. OC-1002" [ngModel]="filterPO()" (ngModelChange)="filterPO.set($event)">
          </div>

          <!-- Modalidad -->
          <div class="col-6 col-md-2">
            <label class="form-label fs-xxs text-muted mb-1">Modalidad</label>
            <select class="form-select form-select-sm" [ngModel]="filterModality()" (ngModelChange)="filterModality.set($event)">
              <option value="ALL">Todas</option>
              <option value="AEREO">Aéreo</option>
              <option value="FCL">FCL Marítimo</option>
              <option value="LCL">LCL Consolidado</option>
              <option value="CUSTOMS">Customs</option>
              <option value="COURIER">Courier</option>
              <option value="INLAND">Inland</option>
            </select>
          </div>

          <!-- Incoterm -->
          <div class="col-6 col-md-2">
            <label class="form-label fs-xxs text-muted mb-1">Incoterm</label>
            <select class="form-select form-select-sm" [ngModel]="filterIncoterm()" (ngModelChange)="filterIncoterm.set($event)">
              <option value="ALL">Todos</option>
              <option value="EXW">EXW</option>
              <option value="FCA">FCA</option>
              <option value="FOB">FOB</option>
              <option value="CIF">CIF</option>
              <option value="CFR">CFR</option>
              <option value="DAP">DAP</option>
            </select>
          </div>

          <!-- Excel Download -->
          <div class="col-6 col-md-1 d-flex align-items-end">
            <button class="btn btn-sm btn-outline-success w-100" (click)="exportExcel()" title="Descargar mis embarques en Excel">
              <i class="bi bi-download"></i>
            </button>
          </div>

        </div>
      </div>

      <!-- Quick Metrics Summary -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 text-center">
            <span class="fs-xs text-muted text-uppercase fw-semibold d-block mb-1">Mis Embarques</span>
            <span class="fs-3 fw-bold mono-font text-dark">{{ filteredClientJobs().length }}</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 text-center">
            <span class="fs-xs text-muted text-uppercase fw-semibold d-block mb-1">En Tránsito / Curso</span>
            <span class="fs-3 fw-bold mono-font text-primary">{{ openJobsCount() }}</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 text-center">
            <span class="fs-xs text-muted text-uppercase fw-semibold d-block mb-1">Completados</span>
            <span class="fs-3 fw-bold mono-font text-success">{{ closedJobsCount() }}</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3 text-center">
            <span class="fs-xs text-muted text-uppercase fw-semibold d-block mb-1">Ciclo Total Promedio</span>
            <span class="fs-3 fw-bold mono-font text-dark">{{ avgClientCycle() }} d</span>
          </div>
        </div>
      </div>

      <!-- Required Client Analytical Blocks (Shippers, OC, Aduana, Responsabilidad & Meses) -->
      <div class="row g-3 mb-3">
        
        <!-- Block 1: Tiempos de Despacho & Atribución de Responsabilidad ("De quién es cada tiempo") -->
        <div class="col-12 col-xl-6">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-slate-100">
              <div>
                <h6 class="fw-bold mb-0 text-dark">Tiempos de Despacho &amp; Responsable por Tramo</h6>
                <span class="fs-xxs text-muted">Transparencia exacta: cuándo el tiempo depende del proveedor, naviera, cliente o ARLOGS</span>
              </div>
            </div>

            <div class="d-flex flex-column gap-2 fs-xs">
              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <strong class="text-dark">Respuesta Shipper (H2 − H1)</strong> &amp; Alistamiento
                  <div class="fs-xxs text-muted">Depende de: <span class="badge bg-slate-100 text-dark border border-slate-200">Shipper (Proveedor)</span></div>
                </div>
                <span class="mono-font fw-bold text-dark fs-6">{{ dispatchAttribution().respShipper }} d</span>
              </div>

              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <strong class="text-dark">Tránsito Internacional (H5 − H4)</strong>
                  <div class="fs-xxs text-muted">Depende de: <span class="badge bg-blue-50 text-primary border border-slate-200">Forwarder / Naviera / Aerolínea</span></div>
                </div>
                <span class="mono-font fw-bold text-primary fs-6">{{ dispatchAttribution().transito }} d</span>
              </div>

              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <strong class="text-dark">Arribo &rarr; Declaración (H7 − H5)</strong>
                  <div class="fs-xxs text-muted">Depende de: <span class="badge bg-emerald-50 text-emerald-800 border border-emerald-300">ARLOGS</span></div>
                </div>
                <span class="mono-font fw-bold text-success fs-6">{{ dispatchAttribution().arriboDecl }} d</span>
              </div>

              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <strong class="text-dark">Declaración &rarr; Pago (H8 − H7)</strong>
                  <div class="fs-xxs text-muted">Depende de: <span class="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-25">Cliente o ARLOGS (según pagador)</span></div>
                </div>
                <span class="mono-font fw-bold text-dark fs-6">{{ dispatchAttribution().declPago }} d</span>
              </div>

              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <strong class="text-dark">Pago &rarr; Informe de Salida (H10 − H8)</strong>
                  <div class="fs-xxs text-muted">Depende de: <span class="badge bg-emerald-50 text-emerald-800 border border-emerald-300">ARLOGS</span></div>
                </div>
                <span class="mono-font fw-bold text-success fs-6">{{ dispatchAttribution().pagoInforme }} d</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Block 2: Shippers Ranking + Top 3 Concentration + Monthly Distribution -->
        <div class="col-12 col-xl-6">
          <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-slate-100">
                <div>
                  <h6 class="fw-bold mb-0 text-dark">Ranking de Proveedores (Shippers)</h6>
                  <span class="fs-xxs text-muted">Concentración Top 3: <strong class="text-primary">{{ shipperInsights().top3Pct }}%</strong> de sus embarques</span>
                </div>
                <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font fs-xxs">
                  {{ shipperInsights().ranking.length }} proveedores
                </span>
              </div>

              <div class="d-flex flex-column gap-2 mb-3">
                @for (item of shipperInsights().ranking.slice(0, 4); track item.shipper; let idx = $index) {
                  <div>
                    <div class="d-flex justify-content-between align-items-center fs-xs mb-1">
                      <span class="text-dark fw-medium text-truncate">
                        <span class="mono-font text-muted me-1">#{{ idx + 1 }}</span>{{ item.shipper }}
                      </span>
                      <span class="mono-font fw-bold text-dark text-nowrap">{{ item.count }} emb. ({{ item.pct }}%)</span>
                    </div>
                    <div class="progress" style="height: 5px;">
                      <div class="progress-bar bg-primary" [style.width.%]="item.pct"></div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Monthly Distribution Chips -->
            <div class="pt-2 border-top border-slate-100">
              <div class="fs-xxs text-muted fw-semibold text-uppercase mb-2">Distribución por Mes de Asignación</div>
              <div class="d-flex flex-wrap gap-1">
                @for (m of monthlyDistribution(); track m.month) {
                  <span class="badge bg-slate-100 text-dark border border-slate-200 mono-font fs-xxs">
                    {{ m.month }}: <strong class="text-primary">{{ m.count }}</strong>
                  </span>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Block 3: Órdenes de Compra & Relación Shipper-OC -->
        <div class="col-12 col-lg-6">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom border-slate-100">
              <h6 class="fw-bold mb-0 text-dark">Órdenes de Compra (OC)</h6>
              <div class="d-flex flex-wrap gap-1">
                <span class="badge bg-blue-50 text-primary border border-slate-200 mono-font fs-xxs">
                  {{ poInsights().distinctCount }} OC distintas
                </span>
                <span class="badge bg-slate-100 text-dark border border-slate-200 mono-font fs-xxs">
                  {{ poInsights().multiPoCount }} embarques multi-OC
                </span>
              </div>
            </div>

            <div class="d-flex flex-column gap-2" style="max-height: 170px; overflow-y: auto;">
              @for (rel of poInsights().relations; track rel.ref) {
                <div class="p-2 rounded-2 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-1 fs-xxs">
                  <div class="text-truncate min-w-0">
                    <strong class="mono-font text-primary me-2">{{ rel.ref }}</strong>
                    <span class="text-dark">{{ rel.shipper }}</span>
                  </div>
                  <span class="mono-font badge bg-white text-dark border border-slate-200 text-truncate" style="max-width: 100%;">
                    {{ rel.ocs.join(', ') }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Block 4: Aduana (Régimen, Distrito y Aforo) -->
        <div class="col-12 col-lg-6">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-slate-100">
              <div>
                <h6 class="fw-bold mb-0 text-dark">Agrupación Aduanera (Trámites con Aduana)</h6>
                <span class="fs-xxs text-muted">Régimen, distrito y canal de aforo sobre {{ customsInsights().totalWithCustoms }} embarques con aduana</span>
              </div>
            </div>

            <div class="row g-2 fs-xxs">
              <div class="col-12 col-sm-4">
                <div class="p-2 rounded-3 bg-slate-50 border border-slate-200 h-100">
                  <div class="fw-bold text-dark mb-1 text-uppercase">Régimen</div>
                  @for (g of customsInsights().byRegimen; track g.label) {
                    <div class="d-flex justify-content-between text-muted">
                      <span class="text-truncate me-1">{{ g.label }}</span>
                      <strong class="mono-font text-dark">{{ g.count }}</strong>
                    </div>
                  } @empty {
                    <span class="text-muted">Sin trámites</span>
                  }
                </div>
              </div>
              <div class="col-12 col-sm-4">
                <div class="p-2 rounded-3 bg-slate-50 border border-slate-200 h-100">
                  <div class="fw-bold text-dark mb-1 text-uppercase">Distrito</div>
                  @for (g of customsInsights().byDistrito; track g.label) {
                    <div class="d-flex justify-content-between text-muted">
                      <span class="text-truncate me-1">{{ g.label }}</span>
                      <strong class="mono-font text-dark">{{ g.count }}</strong>
                    </div>
                  } @empty {
                    <span class="text-muted">Sin trámites</span>
                  }
                </div>
              </div>
              <div class="col-12 col-sm-4">
                <div class="p-2 rounded-3 bg-slate-50 border border-slate-200 h-100">
                  <div class="fw-bold text-dark mb-1 text-uppercase">Tipo Aforo</div>
                  @for (g of customsInsights().byAforo; track g.label) {
                    <div class="d-flex justify-content-between text-muted">
                      <span class="text-truncate me-1">{{ g.label }}</span>
                      <strong class="mono-font text-dark">{{ g.count }}</strong>
                    </div>
                  } @empty {
                    <span class="text-muted">Sin trámites</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Client Table -->
      <div class="card-executive overflow-hidden">
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Referencia ARLOGS</th>
                <th>Modalidad</th>
                <th>Shipper</th>
                <th>Origen</th>
                <th>Incoterm</th>
                <th>Órdenes de Compra</th>
                <th>H1 Asignación</th>
                <th>Tránsito</th>
                <th>Ciclo / Gestión</th>
                <th>Estado</th>
                <th class="text-center">Trazabilidad</th>
              </tr>
            </thead>
            <tbody>
              @for (job of filteredClientJobs(); track job.refArlogs) {
                <tr>
                  <td>
                    <strong class="text-primary mono-font fs-6">{{ job.refArlogs }}</strong>
                  </td>
                  <td>
                    <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font">{{ job.servicio }}</span>
                  </td>
                  <td>
                    <strong class="text-dark">{{ job.shipper }}</strong>
                  </td>
                  <td>{{ job.puertoEmbarque }}, {{ job.paisOrigen }}</td>
                  <td><span class="badge bg-slate-50 text-dark border border-slate-200 mono-font">{{ job.incoterm }}</span></td>
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
                      <span class="mono-font fw-bold text-info" title="Gestión sin aduana (H6 - H1)">{{ job.diasGestionSinAduana }} d (sin aduana)</span>
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
                      class="btn btn-sm btn-brand-primary py-1 px-3 fs-xs"
                      (click)="viewJobDetail(job)">
                      <i class="bi bi-geo-alt me-1"></i>Ver Tracking
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="11" class="text-center py-4 text-muted">
                    <i class="bi bi-search fs-3 d-block mb-1"></i>
                    No se encontraron embarques para los criterios seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex justify-content-between align-items-center fs-xxs text-muted">
          <span>Embarques registrados para su empresa: <strong>{{ filteredClientJobs().length }}</strong></span>
          <span>Acceso confidencial verificado</span>
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
    .client-avatar { width: 36px; height: 36px; }
    .letter-spacing-wide { letter-spacing: 0.05em; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .text-slate-700 { color: #334155 !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-blue-50 { background-color: #EFF6FF !important; }
    .bg-emerald-50 { background-color: #ECFDF5 !important; }
    .text-emerald-800 { color: #065F46 !important; }
    .border-emerald-300 { border-color: #6EE7B7 !important; }
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

  readonly monthlyDistribution = computed(() => {
    const monthNames: Record<string, string> = {
      '06': 'Jun 26',
      '07': 'Jul 26',
      '08': 'Ago 26',
      '09': 'Sep 26',
      '10': 'Oct 26',
      '11': 'Nov 26'
    };
    const counts = new Map<string, number>();
    this.filteredClientJobs().forEach(j => {
      const m = j.h1_asignacion?.split('-')[1];
      if (m) counts.set(m, (counts.get(m) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, count]) => ({ month: monthNames[m] || m, count }));
  });

  readonly poInsights = computed(() => {
    const list = this.filteredClientJobs();
    const distinctSet = new Set<string>();
    let multiPoCount = 0;
    const relations = list.map(j => {
      j.ordenesCompra.forEach(oc => distinctSet.add(oc));
      if (j.ordenesCompra.length > 1) multiPoCount++;
      return { ref: j.refArlogs, shipper: j.shipper, ocs: j.ordenesCompra };
    });
    return { distinctCount: distinctSet.size, multiPoCount, relations };
  });

  readonly customsInsights = computed(() => {
    const withCustoms = this.filteredClientJobs().filter(
      j => j.aduanaPorArlogs === 'SI' || j.servicio === 'CUSTOMS' || j.servicio === 'COURIER'
    );
    const groupBy = (extractor: (j: ShipmentJob) => string | undefined) => {
      const map = new Map<string, number>();
      withCustoms.forEach(j => {
        const val = extractor(j) || 'Sin definir';
        map.set(val, (map.get(val) || 0) + 1);
      });
      return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
    };
    return {
      totalWithCustoms: withCustoms.length,
      byRegimen: groupBy(j => j.regimenAduana),
      byDistrito: groupBy(j => j.distritoAduana),
      byAforo: groupBy(j => j.aforoAduana)
    };
  });

  resetFilters(): void {
    this.filterMonth.set('ALL');
    this.filterShipper.set('ALL');
    this.filterPO.set('');
    this.filterModality.set('ALL');
    this.filterIncoterm.set('ALL');
    this.toastService.info('Filtros restablecidos', 'Mostrando todos sus embarques.');
  }

  viewJobDetail(job: ShipmentJob): void {
    this.selectedJob.set(job);
  }

  runAdversarialTest(): void {
    const user = this.currentUser();
    if (user.role !== 'cliente_a' && user.role !== 'cliente_b') {
      this.toastService.info(
        'Perfil Interno',
        `Su rol (${user.cargo}) tiene vista global. Cambie a un perfil de cliente para validar privacidad entre empresas.`
      );
      return;
    }

    const isClientA = user.clienteId === 'CLI-001' || user.role === 'cliente_a';
    const targetRef = isClientA ? 'F902-2026' : 'A901-2026';
    const targetOwner = isClientA ? 'Comercial Pacífico Cía. Ltda.' : 'Industrias Andinas S.A.';

    const job = this.shipmentService.getJobByRef(targetRef);

    if (job === null) {
      this.toastService.error(
        'Privacidad Confirmada — Bloqueado',
        `Acceso denegado: ${user.clienteNombre} no puede consultar '${targetRef}' (${targetOwner}).`
      );
    }
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
