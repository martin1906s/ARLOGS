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
      
      <!-- Top Hero Section: Modality Overview & Operational Threshold (Zero 3D) -->
      <div class="row g-3 mb-3">
        
        <!-- Fast Modality Distribution Card -->
        <div class="col-12 col-xl-8">
          <div class="card-executive p-3 h-100 d-flex flex-column justify-content-between">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 border-bottom pb-2">
              <div>
                <div class="d-flex align-items-center gap-2">
                  <span class="fs-xs fw-semibold text-muted text-uppercase letter-spacing-wide">
                    Panel Ejecutivo ARLOGS
                  </span>
                  <span class="badge bg-emerald-50 text-emerald-800 border border-emerald-200 fs-xxs">
                    En tiempo real
                  </span>
                </div>
                <h6 class="fw-bold mb-0 text-dark mt-1">Distribución Operativa por Modalidad</h6>
              </div>
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
              <span><i class="bi bi-geo-alt-fill text-primary me-1"></i>Hub Principal: Guayaquil (GYE) &bull; Cobertura Asia / Europa / América</span>
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
              <p class="text-muted fs-xs mb-3">
                Embarques en curso que exceden este plazo se marcan automáticamente como <strong>REVISAR</strong> para intervención operativa.
              </p>

              <!-- Interactive Slider -->
              <div class="bg-slate-50 p-3 rounded-3 border border-slate-200 mb-3">
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
                  <span>5d (Crítico)</span>
                  <span class="fw-semibold text-dark">15d (Base ARLOGS)</span>
                  <span>40d (Flexible)</span>
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

      <!-- Key Performance Indicators (KPI Cards) -->
      <div class="row g-3 mb-3">
        
        <!-- Total -->
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-2">
              <span class="text-uppercase fw-semibold">Total Embarques</span>
              <div class="icon-box bg-slate-100 text-slate-700">
                <i class="bi bi-box-seam"></i>
              </div>
            </div>
            <div class="fs-2 fw-bold text-dark mono-font lh-1 mb-1">{{ stats().total }}</div>
            <div class="text-muted fs-xxs">
              Referencias en seguimiento activo
            </div>
          </div>
        </div>

        <!-- Abiertos -->
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-2">
              <span class="text-uppercase fw-semibold">En Curso</span>
              <div class="icon-box bg-blue-50 text-blue-600">
                <i class="bi bi-arrow-repeat"></i>
              </div>
            </div>
            <div class="fs-2 fw-bold text-primary mono-font lh-1 mb-1">{{ stats().abiertos }}</div>
            <div class="text-muted fs-xxs">
              <span class="text-primary fw-bold">{{ stats().abiertosPorcentaje }}%</span> dentro de plazo normal
            </div>
          </div>
        </div>

        <!-- REVISAR / Demorados -->
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-2">
              <span class="text-uppercase fw-semibold text-amber-700">Demorados</span>
              <div class="icon-box bg-amber-50 text-amber-600">
                <i class="bi bi-exclamation-triangle"></i>
              </div>
            </div>
            <div class="fs-2 fw-bold text-amber-600 mono-font lh-1 mb-1">{{ stats().demorados }}</div>
            <div class="text-muted fs-xxs">
              Exceden {{ currentThreshold() }} días abiertos
            </div>
          </div>
        </div>

        <!-- Cerrados -->
        <div class="col-6 col-lg-3">
          <div class="card-executive p-3">
            <div class="d-flex align-items-center justify-content-between text-muted fs-xs mb-2">
              <span class="text-uppercase fw-semibold">Cerrados</span>
              <div class="icon-box bg-emerald-50 text-emerald-600">
                <i class="bi bi-check2-circle"></i>
              </div>
            </div>
            <div class="fs-2 fw-bold text-success mono-font lh-1 mb-1">{{ stats().cerrados }}</div>
            <div class="text-muted fs-xxs">
              <span class="text-success fw-bold">{{ stats().cerradosPorcentaje }}%</span> ciclo finalizado
            </div>
          </div>
        </div>

      </div>

      <!-- Tiempos Medios por Tramo & Atribución de Responsabilidad -->
      <div class="row g-3 mb-3">
        
        <!-- Tiempos Promedio de Ciclo -->
        <div class="col-12 col-lg-7">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h6 class="fw-bold mb-0 text-dark">Promedio de Días por Tramo Logístico</h6>
                <span class="text-muted fs-xs">Diferencias exactas en días calendario sobre casos aplicables</span>
              </div>
              <span class="badge bg-slate-100 text-slate-600 mono-font fs-xxs">
                Indicadores Operativos
              </span>
            </div>

            <div class="d-flex flex-column gap-3">
              
              <!-- 1. Respuesta Shipper -->
              <div>
                <div class="d-flex justify-content-between align-items-center fs-xs mb-1">
                  <span><strong class="text-dark">Respuesta Shipper (H2 − H1)</strong> &bull; Proveedor</span>
                  <span class="fw-bold mono-font text-dark">{{ averages().respShipper }} d</span>
                </div>
                <div class="progress" style="height: 5px;">
                  <div class="progress-bar bg-slate-400" [style.width.%]="averages().respShipperPct"></div>
                </div>
              </div>

              <!-- 2. Coordinación Origen -->
              <div>
                <div class="d-flex justify-content-between align-items-center fs-xs mb-1">
                  <span><strong class="text-dark">Coordinación de Origen (H4 − H1)</strong> &bull; Alistamiento y zarpe</span>
                  <span class="fw-bold mono-font text-primary">{{ averages().coordinacionOrigen }} d</span>
                </div>
                <div class="progress" style="height: 5px;">
                  <div class="progress-bar bg-primary" [style.width.%]="averages().coordinacionOrigenPct"></div>
                </div>
              </div>

              <!-- 3. Tránsito Internacional -->
              <div>
                <div class="d-flex justify-content-between align-items-center fs-xs mb-1">
                  <span><strong class="text-dark">Tránsito Internacional (H5 − H4)</strong> &bull; Aerolínea / Naviera</span>
                  <span class="fw-bold mono-font text-cyan">{{ averages().transito }} d</span>
                </div>
                <div class="progress" style="height: 5px;">
                  <div class="progress-bar bg-info" [style.width.%]="averages().transitoPct"></div>
                </div>
              </div>

              <!-- 4. Días en Aduana -->
              <div>
                <div class="d-flex justify-content-between align-items-center fs-xs mb-1">
                  <span><strong class="text-dark">Días en Aduana (H9 − H7)</strong> &bull; SENAE y liquidación</span>
                  <span class="fw-bold mono-font text-amber-600">{{ averages().aduana }} d</span>
                </div>
                <div class="progress" style="height: 5px;">
                  <div class="progress-bar bg-warning" [style.width.%]="averages().aduanaPct"></div>
                </div>
              </div>

              <!-- 5. Ciclo Total -->
              <div class="pt-2 border-top border-slate-100">
                <div class="d-flex justify-content-between align-items-center fs-xs">
                  <span class="fw-bold text-dark">Ciclo Total Promedio (H10 − H1):</span>
                  <span class="fw-bold mono-font text-success fs-6">{{ averages().cicloTotal }} días</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Atribución de Tiempos (Diferenciación ARLOGS vs Proveedor vs Naviera) -->
        <div class="col-12 col-lg-5">
          <div class="card-executive p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h6 class="fw-bold mb-0 text-dark">Atribución de Responsabilidad</h6>
                <span class="text-muted fs-xs">Diferenciación clara de cuellos de botella</span>
              </div>
              <i class="bi bi-pie-chart text-muted"></i>
            </div>

            <!-- Modern visual breakdown -->
            <div class="d-flex flex-column gap-2 fs-xs">
              
              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <span class="fw-semibold text-dark d-block">Línea de Transporte (Naviera / Aéreo)</span>
                  <span class="text-muted fs-xxs">Tránsito en altamar o vuelo internacional</span>
                </div>
                <span class="badge bg-blue-100 text-blue-800 mono-font fw-bold">~52% tiempo</span>
              </div>

              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <span class="fw-semibold text-dark d-block">Proveedor / Shipper (Origen)</span>
                  <span class="text-muted fs-xxs">Demora en alistamiento y entrega en puerto</span>
                </div>
                <span class="badge bg-slate-200 text-slate-800 mono-font fw-bold">~28% tiempo</span>
              </div>

              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <span class="fw-semibold text-dark d-block">Trámite Aduanero & Pago Tributos</span>
                  <span class="text-muted fs-xxs">Aforo, declaración y liquidación</span>
                </div>
                <span class="badge bg-amber-100 text-amber-800 mono-font fw-bold">~14% tiempo</span>
              </div>

              <div class="p-2 px-3 rounded-3 bg-slate-50 border border-slate-200 d-flex align-items-center justify-content-between">
                <div>
                  <span class="fw-semibold text-dark d-block">Gestión Operativa ARLOGS</span>
                  <span class="text-muted fs-xxs">Coordinación, recepción e informe de salida</span>
                </div>
                <span class="badge bg-emerald-100 text-emerald-800 mono-font fw-bold">~6% tiempo</span>
              </div>

            </div>
          </div>
        </div>

      </div>

      <!-- Shipments with Review Alert Table -->
      @if (delayedJobs().length > 0) {
        <div class="card-executive overflow-hidden border-amber-300 mb-3">
          <div class="p-3 bg-amber-50 border-bottom border-amber-200 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill text-amber-600 fs-5"></i>
              <div>
                <strong class="text-dark fs-xs">Embarques que Requieren Atención ({{ delayedJobs().length }})</strong>
                <span class="text-muted fs-xxs d-block">Superan {{ currentThreshold() }} días abiertos sin concluir su ciclo operativo</span>
              </div>
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

      <!-- Executive Audit Trail (Change Control Visibility) -->
      <div class="card-executive overflow-hidden">
        <div class="p-3 bg-slate-50 border-bottom border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-journal-check text-primary fs-5"></i>
            <div>
              <strong class="text-dark fs-xs">Auditoría de Control de Cambios (Últimos {{ recentAudit().length }} eventos)</strong>
              <span class="text-muted fs-xxs d-block">Registro inmutable de modificaciones de fechas H1–H10, umbrales SLA y accesos</span>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2 flex-wrap flex-sm-nowrap w-100 w-md-auto justify-content-end">
            <div class="input-group input-group-sm flex-grow-1 flex-sm-grow-0" style="min-width: 180px; max-width: 260px;">
              <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control border-start-0 fs-xxs"
                     placeholder="Filtrar auditoría..."
                     [ngModel]="auditSearch()"
                     (ngModelChange)="auditSearch.set($event)">
            </div>
            <button type="button" class="btn btn-sm btn-outline-success py-1 px-2 fs-xxs text-nowrap" (click)="exportAudit()">
              <i class="bi bi-file-earmark-excel me-1"></i>Exportar Auditoría
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Referencia / Entidad</th>
                <th>Acción</th>
                <th>Detalle del Cambio</th>
              </tr>
            </thead>
            <tbody>
              @for (log of recentAudit(); track log.id) {
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
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .letter-spacing-wide { letter-spacing: 0.05em; }
    .icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
    }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-200 { background-color: #E2E8F0 !important; }
    .bg-slate-400 { background-color: #94A3B8 !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-800 { color: #1E293B !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }

    .bg-blue-50 { background-color: #EFF6FF !important; }
    .bg-blue-100 { background-color: #DBEAFE !important; }
    .text-blue-600 { color: #2563EB !important; }
    .text-blue-800 { color: #1E40AF !important; }

    .bg-amber-50 { background-color: #FFFBEB !important; }
    .bg-amber-100 { background-color: #FEF3C7 !important; }
    .text-amber-600 { color: #D97706 !important; }
    .text-amber-700 { color: #B45309 !important; }
    .text-amber-800 { color: #92400E !important; }
    .border-amber-200 { border-color: #FDE68A !important; }
    .border-amber-300 { border-color: #FCD34D !important; }

    .bg-emerald-50 { background-color: #ECFDF5 !important; }
    .bg-emerald-100 { background-color: #D1FAE5 !important; }
    .text-emerald-600 { color: #059669 !important; }
    .text-emerald-800 { color: #065F46 !important; }
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
  readonly recentAudit = computed(() => {
    const q = this.auditSearch().trim().toLowerCase();
    const logs = this.auditService.logs();
    if (!q) return logs.slice(0, 8);
    return logs.filter(l =>
      l.usuario.toLowerCase().includes(q) ||
      l.entidad.toLowerCase().includes(q) ||
      l.rol.toLowerCase().includes(q) ||
      l.accion.toLowerCase().includes(q) ||
      l.detalle.toLowerCase().includes(q)
    ).slice(0, 12);
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

    const maxCycle = Math.max(cicloTotal, 30);

    return {
      respShipper,
      respShipperPct: Math.min(100, Math.round((respShipper / maxCycle) * 100)),
      coordinacionOrigen,
      coordinacionOrigenPct: Math.min(100, Math.round((coordinacionOrigen / maxCycle) * 100)),
      transito,
      transitoPct: Math.min(100, Math.round((transito / maxCycle) * 100)),
      aduana,
      aduanaPct: Math.min(100, Math.round((aduana / maxCycle) * 100)),
      cicloTotal
    };
  });

  readonly modalitySummary = computed(() => {
    const list = this.jobs();
    const total = Math.max(1, list.length);
    const defs: { key: string; label: string; icon: string; barClass: string }[] = [
      { key: 'AEREO', label: 'Aéreo (A)', icon: 'bi-airplane', barClass: 'bg-primary' },
      { key: 'FCL', label: 'FCL (F)', icon: 'bi-box-seam', barClass: 'bg-info' },
      { key: 'LCL', label: 'LCL (L)', icon: 'bi-boxes', barClass: 'bg-success' },
      { key: 'CUSTOMS', label: 'Customs (C)', icon: 'bi-shield-check', barClass: 'bg-warning' },
      { key: 'COURIER', label: 'Courier (AC)', icon: 'bi-send', barClass: 'bg-secondary' },
      { key: 'INLAND', label: 'Inland (I)', icon: 'bi-truck', barClass: 'bg-dark' }
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

