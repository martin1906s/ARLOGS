import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentJob, MILESTONE_DEFINITIONS } from '../../models/shipment.model';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-job-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (job) {
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-xl modal-fullscreen-md-down modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg rounded-3">
            
            <!-- Modal Header -->
            <div class="modal-header bg-slate-900 text-white py-3 px-4">
              <div class="d-flex align-items-center gap-3">
                <div class="service-tag px-2 py-1 rounded bg-blue-600 text-white fw-bold mono-font fs-xs">
                  {{ job.servicio }}
                </div>
                <div>
                  <div class="d-flex align-items-center gap-2">
                    <h5 class="modal-title fw-bold mono-font text-white mb-0">{{ job.refArlogs }}</h5>
                    <span class="badge bg-slate-800 text-slate-300 mono-font fs-xs border border-slate-700">{{ job.qrCode }}</span>
                    <span class="status-pill" [ngClass]="getStatusPillClass(job.estado)">
                      <span class="dot"></span>{{ job.estado }}
                    </span>
                  </div>
                  <div class="fs-xs text-white-50 mt-1">
                    {{ job.cliente }} &bull; Shipper: <strong>{{ job.shipper }}</strong> ({{ job.paisOrigen }})
                  </div>
                </div>
              </div>

              <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body p-4 bg-slate-50">
              
              <!-- 10-Milestone Stepper -->
              <div class="card-executive p-3 mb-3 bg-white">
                <div class="d-flex align-items-center justify-content-between mb-3 border-bottom border-slate-100 pb-2">
                  <span class="fs-xs fw-bold text-dark text-uppercase letter-spacing-wide">
                    Línea de Tiempo de Hitos (H1 - H10)
                  </span>
                  <span class="fs-xs text-muted">
                    Modalidad: <strong>{{ job.servicio }}</strong> | Aduana: <strong>{{ job.aduanaPorArlogs }}</strong>
                  </span>
                </div>

                <div class="stepper-grid d-flex flex-wrap gap-2 justify-content-between">
                  @for (m of milestoneDefs; track m.num) {
                    @let applicable = isApplicable(m.num);
                    @let dateVal = getMilestoneDate(m.num);
                    <div 
                      class="stepper-item flex-grow-1 p-2 rounded-2 border text-center transition-all"
                      [class.bg-white]="applicable && !dateVal"
                      [class.node-done]="applicable && dateVal"
                      [class.node-na]="!applicable">
                      <div class="d-flex align-items-center justify-content-center gap-1 mb-1">
                        <span class="badge rounded-pill mono-font fs-xxs" 
                              [class.bg-emerald-600]="applicable && dateVal"
                              [class.bg-slate-700]="applicable && !dateVal"
                              [class.bg-slate-300]="!applicable">
                          {{ m.codigo }}
                        </span>
                        @if (applicable && dateVal) {
                          <i class="bi bi-check-circle-fill text-success fs-xs"></i>
                        }
                      </div>
                      <div class="node-title fw-bold fs-xxs text-truncate" [title]="m.nombre">
                        {{ m.nombre }}
                      </div>
                      <div class="fs-xxs mt-1">
                        @if (!applicable) {
                          <span class="text-muted">N/A</span>
                        } @else if (dateVal) {
                          <span class="text-emerald-700 fw-bold mono-font">{{ dateVal }}</span>
                        } @else {
                          <span class="text-amber-700">Pendiente</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Main Grid: Dates & Form vs Calculations -->
              <div class="row g-3">
                
                <!-- Left: Dates Form -->
                <div class="col-12 col-lg-7">
                  <div class="card-executive p-3 h-100 bg-white">
                    <div class="d-flex align-items-center justify-content-between mb-3 border-bottom border-slate-100 pb-2">
                      <h6 class="fw-bold mb-0 text-dark">Registro de Fechas de Hitos</h6>
                      @if (!isReadOnly) {
                        <span class="badge bg-blue-50 text-blue-700 border border-blue-200 fs-xxs">
                          Registro Habilitado
                        </span>
                      } @else {
                        <span class="badge bg-slate-100 text-slate-600 border border-slate-200 fs-xxs">
                          Solo Lectura
                        </span>
                      }
                    </div>

                    <form (ngSubmit)="saveChanges()">
                      <div class="row g-2">
                        @for (m of milestoneDefs; track m.num) {
                          @let applicable = isApplicable(m.num);
                          <div class="col-12 col-sm-6">
                            <div class="p-2 rounded-2 border border-slate-200" [class.bg-slate-50]="!applicable" [class.bg-white]="applicable">
                              <label class="form-label fs-xxs fw-semibold mb-1 d-flex justify-content-between text-dark">
                                <span><span class="badge bg-slate-200 text-slate-800 mono-font me-1">{{ m.codigo }}</span>{{ m.nombre }}</span>
                                @if (!applicable) {
                                  <span class="text-muted">No Aplica</span>
                                }
                              </label>

                              @if (applicable) {
                                <input 
                                  type="date" 
                                  class="form-control form-control-sm mono-font"
                                  [disabled]="isReadOnly"
                                  [ngModel]="getMilestoneDate(m.num)"
                                  (ngModelChange)="setMilestoneDate(m.num, $event)"
                                  [name]="'milestone_' + m.num">
                              } @else {
                                <input type="text" class="form-control form-control-sm text-muted bg-slate-50 border-0" value="N/A" disabled>
                              }
                            </div>
                          </div>
                        }
                      </div>

                      <!-- Documentos de Transporte (Guía / BL / Contenedor) -->
                      <div class="mt-3 p-3 bg-slate-50 rounded-3 border border-slate-200">
                        <div class="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                          <span class="fs-xxs fw-bold text-uppercase text-muted">Documentos de Embarque &amp; Transporte</span>
                          <button type="button" class="btn btn-outline-primary btn-sm py-0 px-2 fs-xxs" (click)="checkCarrierTracking()">
                            <i class="bi bi-radar me-1"></i>Rastrear Guía / BL / Contenedor
                          </button>
                        </div>
                        <div class="row g-2">
                          <div class="col-12 col-sm-4">
                            <label class="form-label fs-xxs text-muted mb-1">Guía Máster / MBL</label>
                            <input type="text" class="form-control form-control-sm mono-font" [disabled]="isReadOnly" [(ngModel)]="editForm.guiaMaster" name="guiaMaster">
                          </div>
                          <div class="col-12 col-sm-4">
                            <label class="form-label fs-xxs text-muted mb-1">HAWB / HBL</label>
                            <input type="text" class="form-control form-control-sm mono-font" [disabled]="isReadOnly" [(ngModel)]="editForm.hawbHbl" name="hawbHbl">
                          </div>
                          <div class="col-12 col-sm-4">
                            <label class="form-label fs-xxs text-muted mb-1">Contenedor</label>
                            <input type="text" class="form-control form-control-sm mono-font" [disabled]="isReadOnly" [(ngModel)]="editForm.contenedor" name="contenedor">
                          </div>
                        </div>
                        @if (carrierTrackingStatus) {
                          <div class="mt-2 p-2 rounded-2 bg-white border border-blue-200 fs-xxs text-dark d-flex align-items-center gap-2">
                            <i class="bi bi-broadcast text-primary"></i>
                            <span>{{ carrierTrackingStatus }}</span>
                          </div>
                        }
                      </div>

                      <!-- Control de Pesos -->
                      <div class="mt-3 p-3 bg-slate-50 rounded-3 border border-slate-200">
                        <span class="fs-xxs fw-bold text-uppercase text-muted d-block mb-2">Control de Pesos & Variación</span>
                        <div class="row g-2 align-items-center">
                          <div class="col-6 col-sm-4">
                            <label class="form-label fs-xxs text-muted mb-1">Peso Origen (kg)</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              class="form-control form-control-sm mono-font" 
                              [disabled]="isReadOnly"
                              [(ngModel)]="editForm.pesoOrigen" 
                              name="pesoOrigen"
                              (ngModelChange)="onWeightChange()">
                          </div>
                          <div class="col-6 col-sm-4">
                            <label class="form-label fs-xxs text-muted mb-1">Peso Recibido Destino (kg)</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              class="form-control form-control-sm mono-font" 
                              [disabled]="isReadOnly"
                              [(ngModel)]="editForm.pesoRecibido" 
                              name="pesoRecibido"
                              (ngModelChange)="onWeightChange()">
                          </div>
                          <div class="col-12 col-sm-4">
                            <label class="form-label fs-xxs text-muted mb-1">Variación Calculada</label>
                            <div class="p-1 px-2 rounded-2 border border-slate-200 bg-white fw-bold mono-font fs-xs text-center"
                                 [class.text-danger]="isWeightDiscrepancy"
                                 [class.text-success]="!isWeightDiscrepancy">
                              {{ liveWeightPct }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Customs & Responsable -->
                      @if (job.aduanaPorArlogs === 'SI' || job.servicio === 'CUSTOMS' || job.servicio === 'COURIER') {
                        <div class="mt-3 p-3 bg-slate-50 rounded-3 border border-slate-200">
                          <span class="fs-xxs fw-bold text-uppercase text-muted d-block mb-2">Gestión Aduanera</span>
                          <div class="row g-2">
                            <div class="col-6">
                              <label class="form-label fs-xxs text-muted mb-1">Responsable del Pago (H8)</label>
                              <select class="form-select form-select-sm" [(ngModel)]="editForm.responsablePago" name="responsablePago" [disabled]="isReadOnly">
                                <option value="CLIENTE">CLIENTE (Importador)</option>
                                <option value="ARLOGS">ARLOGS (Agente Aduanal)</option>
                                <option value="AGENTE">AGENTE EXTERNO</option>
                              </select>
                            </div>
                            <div class="col-6">
                              <label class="form-label fs-xxs text-muted mb-1">Canal de Aforo</label>
                              <input type="text" class="form-control form-control-sm" [(ngModel)]="editForm.aforoAduana" name="aforoAduana" [disabled]="isReadOnly">
                            </div>
                            <div class="col-6">
                              <label class="form-label fs-xxs text-muted mb-1">Régimen Aduanero</label>
                              <input type="text" class="form-control form-control-sm" [(ngModel)]="editForm.regimenAduana" name="regimenAduana" [disabled]="isReadOnly">
                            </div>
                            <div class="col-6">
                              <label class="form-label fs-xxs text-muted mb-1">Distrito Aduanero</label>
                              <input type="text" class="form-control form-control-sm" [(ngModel)]="editForm.distritoAduana" name="distritoAduana" [disabled]="isReadOnly">
                            </div>
                          </div>
                        </div>
                      }

                      @if (chronologicalWarning) {
                        <div class="alert alert-warning py-2 px-3 fs-xxs mt-3 mb-0">
                          <i class="bi bi-exclamation-triangle-fill me-1"></i>{{ chronologicalWarning }}
                        </div>
                      }

                      @if (!isReadOnly) {
                        <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top border-slate-200">
                          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="closeModal()">Cancelar</button>
                          <button type="submit" class="btn btn-sm btn-brand-primary">
                            <i class="bi bi-save me-1"></i>Guardar & Recalcular
                          </button>
                        </div>
                      }
                    </form>
                  </div>
                </div>

                <!-- Right: Live Recalculations -->
                <div class="col-12 col-lg-5">
                  <div class="card-executive p-3 h-100 bg-white">
                    <div class="d-flex align-items-center justify-content-between mb-3 border-bottom border-slate-100 pb-2">
                      <h6 class="fw-bold mb-0 text-dark">Tiempos Calculados en Días</h6>
                      <span class="badge bg-slate-100 text-slate-700 mono-font fs-xxs">
                        Cálculo Automático
                      </span>
                    </div>

                    <div class="table-responsive">
                      <table class="table table-sm table-arlogs align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th>Fórmula</th>
                            <th class="text-end">Días</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <strong class="text-dark">Respuesta Shipper</strong>
                              <div class="fs-xxs text-muted">Depende: Shipper (Proveedor)</div>
                            </td>
                            <td class="mono-font fs-xxs text-muted">H2 − H1</td>
                            <td class="text-end mono-font fw-bold" [class.text-muted]="previewJob.diasRespuestaShipper === 'N/A'">
                              {{ previewJob.diasRespuestaShipper }}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong class="text-dark">Alistamiento Carga</strong>
                              <div class="fs-xxs text-muted">Depende: Shipper (Proveedor)</div>
                            </td>
                            <td class="mono-font fs-xxs text-muted">H3 − H1</td>
                            <td class="text-end mono-font fw-bold" [class.text-muted]="previewJob.diasAlistamiento === 'N/A'">
                              {{ previewJob.diasAlistamiento }}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong class="text-dark">Coordinación Origen</strong>
                              <div class="fs-xxs text-muted">Depende: Shipper / Forwarder</div>
                            </td>
                            <td class="mono-font fs-xxs text-muted">H4 − H1</td>
                            <td class="text-end mono-font fw-bold text-primary" [class.text-muted]="previewJob.diasCoordinacionOrigen === 'N/A'">
                              {{ previewJob.diasCoordinacionOrigen }}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong class="text-dark">Tránsito Internacional</strong>
                              <div class="fs-xxs text-muted">Depende: Forwarder / Línea</div>
                            </td>
                            <td class="mono-font fs-xxs text-muted">H5 − H4</td>
                            <td class="text-end mono-font fw-bold text-primary" [class.text-muted]="previewJob.diasTransito === 'N/A'">
                              {{ previewJob.diasTransito }}
                            </td>
                          </tr>
                          @if (job.aduanaPorArlogs === 'NO') {
                            <tr class="bg-blue-50">
                              <td><strong class="text-dark">Gestión Sin Aduana</strong></td>
                              <td class="mono-font fs-xxs text-muted">H6 − H1</td>
                              <td class="text-end mono-font fw-bold text-success">
                                {{ previewJob.diasGestionSinAduana }}
                              </td>
                            </tr>
                          }
                          <tr>
                            <td>
                              <strong class="text-dark">Arribo a Declaración</strong>
                              <div class="fs-xxs text-muted">Depende: ARLOGS</div>
                            </td>
                            <td class="mono-font fs-xxs text-muted">H7 − H5</td>
                            <td class="text-end mono-font fw-bold" [class.text-muted]="previewJob.diasArriboDeclaracion === 'N/A'">
                              {{ previewJob.diasArriboDeclaracion }}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong class="text-dark">Declaración a Pago</strong>
                              <div class="fs-xxs text-muted">Depende: {{ editForm.responsablePago || 'CLIENTE' }}</div>
                            </td>
                            <td class="mono-font fs-xxs text-muted">H8 − H7</td>
                            <td class="text-end mono-font fw-bold" [class.text-muted]="previewJob.diasDeclaracionPago === 'N/A'">
                              {{ previewJob.diasDeclaracionPago }}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong class="text-dark">Pago a Informe</strong>
                              <div class="fs-xxs text-muted">Depende: ARLOGS</div>
                            </td>
                            <td class="mono-font fs-xxs text-muted">H10 − H8</td>
                            <td class="text-end mono-font fw-bold" [class.text-muted]="previewJob.diasPagoInforme === 'N/A'">
                              {{ previewJob.diasPagoInforme }}
                            </td>
                          </tr>
                          <tr>
                            <td><strong class="text-dark">Días en Aduana</strong></td>
                            <td class="mono-font fs-xxs text-muted">H9 − H7</td>
                            <td class="text-end mono-font fw-bold text-amber-700" [class.text-muted]="previewJob.diasEnAduana === 'N/A'">
                              {{ previewJob.diasEnAduana }}
                            </td>
                          </tr>
                          <tr class="bg-emerald-50 border-top border-2 border-emerald-300">
                            <td><strong class="text-dark">Ciclo Total</strong></td>
                            <td class="mono-font fs-xxs text-muted">H10 − H1</td>
                            <td class="text-end mono-font fw-bold text-success fs-6">
                              {{ previewJob.diasCicloTotal }}
                            </td>
                          </tr>
                          <tr>
                            <td><strong class="text-dark">Días Abiertos</strong></td>
                            <td class="mono-font fs-xxs text-muted">Hoy − H1</td>
                            <td class="text-end mono-font fw-bold">
                              {{ previewJob.diasAbiertos }}
                            </td>
                          </tr>
                          <tr>
                            <td><strong class="text-dark">Estado Resultante</strong></td>
                            <td class="mono-font fs-xxs text-muted">Cierre</td>
                            <td class="text-end">
                              <span class="status-pill" [ngClass]="getStatusPillClass(previewJob.estado)">
                                <span class="dot"></span>{{ previewJob.estado }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Metadata -->
                    <div class="mt-3 p-3 bg-slate-50 rounded-3 border border-slate-200 fs-xs">
                      <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Órdenes de Compra:</span>
                        <strong class="mono-font text-dark">{{ job.ordenesCompra.join(', ') }}</strong>
                      </div>
                      <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Guía / Máster BL:</span>
                        <strong class="mono-font text-dark">{{ job.guiaMaster }}</strong>
                      </div>
                      <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">HAWB / HBL:</span>
                        <strong class="mono-font text-dark">{{ job.hawbHbl }}</strong>
                      </div>
                      @if (job.contenedor !== 'N/A') {
                        <div class="d-flex justify-content-between">
                          <span class="text-muted">Contenedor:</span>
                          <strong class="mono-font text-dark">{{ job.contenedor }}</strong>
                        </div>
                      }
                    </div>

                  </div>
                </div>

              </div>

            </div>

            <div class="modal-footer bg-white border-top border-slate-200 py-2 px-4">
              <button type="button" class="btn btn-sm btn-outline-secondary" (click)="closeModal()">Cerrar</button>
            </div>

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .letter-spacing-wide { letter-spacing: 0.05em; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-200 { background-color: #E2E8F0 !important; }
    .bg-slate-300 { background-color: #CBD5E1 !important; }
    .bg-slate-700 { background-color: #334155 !important; }
    .bg-slate-800 { background-color: #1E293B !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-300 { color: #CBD5E1 !important; }
    .text-slate-600 { color: #475569 !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-800 { color: #1E293B !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .border-slate-700 { border-color: #334155 !important; }

    .bg-blue-50 { background-color: #EFF6FF !important; }
    .bg-blue-600 { background-color: #2563EB !important; }
    .text-blue-700 { color: #1D4ED8 !important; }
    .border-blue-200 { border-color: #BFDBFE !important; }

    .bg-emerald-50 { background-color: #ECFDF5 !important; }
    .bg-emerald-600 { background-color: #059669 !important; }
    .text-emerald-700 { color: #047857 !important; }
    .border-emerald-300 { border-color: #6EE7B7 !important; }

    .text-amber-700 { color: #B45309 !important; }

    .stepper-item {
      min-width: 85px;
      transition: all 0.2s ease;
      border-color: #E2E8F0 !important;
    }
    .node-done {
      background-color: #ECFDF5 !important;
      border-color: #A7F3D0 !important;
    }
    .node-na {
      background-color: #F8FAFC !important;
      opacity: 0.55;
    }
  `]
})
export class JobDetailModalComponent implements OnChanges {
  @Input() job: ShipmentJob | null = null;
  @Input() isReadOnly = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ refArlogs: string; changes: Partial<ShipmentJob> }>();

  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);
  readonly milestoneDefs = MILESTONE_DEFINITIONS;

  editForm: any = {};
  previewJob: any = {};
  liveWeightPct = 'N/A';
  isWeightDiscrepancy = false;
  chronologicalWarning: string | null = null;
  carrierTrackingStatus: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['job'] && this.job) {
      this.carrierTrackingStatus = null;
      this.initForm();
    }
  }

  private initForm(): void {
    if (!this.job) return;
    this.editForm = {
      guiaMaster: this.job.guiaMaster,
      hawbHbl: this.job.hawbHbl,
      contenedor: this.job.contenedor,
      h1_asignacion: this.job.h1_asignacion,
      h2_respuestaShipper: this.job.h2_respuestaShipper,
      h3_cargaLista: this.job.h3_cargaLista,
      h4_zarpeAtd: this.job.h4_zarpeAtd,
      h5_arriboAta: this.job.h5_arriboAta,
      h6_pesoRecibido: this.job.h6_pesoRecibido,
      h7_declaracion: this.job.h7_declaracion,
      h8_pagoLiquidacion: this.job.h8_pagoLiquidacion,
      h9_salidaAutorizada: this.job.h9_salidaAutorizada,
      h10_informeSalida: this.job.h10_informeSalida,
      pesoOrigen: this.job.pesoOrigen,
      pesoRecibido: this.job.pesoRecibido,
      responsablePago: this.job.responsablePago || 'CLIENTE',
      aforoAduana: this.job.aforoAduana || 'Documental',
      regimenAduana: this.job.regimenAduana || 'Régimen 10 (Consumo)',
      distritoAduana: this.job.distritoAduana || 'Guayaquil Marítimo'
    };
    this.recalculatePreview();
  }

  isApplicable(milestoneNum: number): boolean {
    if (!this.job) return false;
    return this.shipmentService.isMilestoneApplicable(this.job.servicio, this.job.aduanaPorArlogs, milestoneNum);
  }

  getMilestoneDate(milestoneNum: number): string | null {
    const key = `h${milestoneNum}_` as string;
    const foundKey = Object.keys(this.editForm).find(k => k.startsWith(key));
    return foundKey ? this.editForm[foundKey] : null;
  }

  setMilestoneDate(milestoneNum: number, value: string): void {
    const key = `h${milestoneNum}_` as string;
    const foundKey = Object.keys(this.editForm).find(k => k.startsWith(key));
    if (foundKey) {
      this.editForm[foundKey] = value || null;
      this.recalculatePreview();
    }
  }

  onWeightChange(): void {
    this.recalculatePreview();
  }

  private recalculatePreview(): void {
    if (!this.job) return;
    this.chronologicalWarning = null;
    if (this.editForm.h1_asignacion) {
      for (let i = 2; i <= 10; i++) {
        const d = this.getMilestoneDate(i);
        if (d && d < this.editForm.h1_asignacion) {
          this.chronologicalWarning = `Advertencia cronológica: H${i} (${d}) es anterior a H1 Asignación (${this.editForm.h1_asignacion}).`;
          break;
        }
      }
    }
    const merged = { ...this.job, ...this.editForm };
    this.previewJob = this.shipmentService.calculateJobMetrics(merged, this.shipmentService.alertThresholdDays());
    this.liveWeightPct = this.previewJob.diferenciaPesoPct || 'N/A';
    this.isWeightDiscrepancy = this.liveWeightPct !== 'N/A' && (this.liveWeightPct.startsWith('+') || this.liveWeightPct.startsWith('-'));
  }

  getStatusPillClass(status: string | undefined): string {
    switch (status) {
      case 'ABIERTO': return 'status-abierto';
      case 'REVISAR': return 'status-revisar';
      case 'CERRADO': return 'status-cerrado';
      default: return 'status-na';
    }
  }

  saveChanges(): void {
    if (!this.job) return;
    if (this.isReadOnly) {
      this.toastService.warning('Modo solo lectura', 'Tu perfil actual no puede modificar hitos operativos.');
      return;
    }
    if (this.chronologicalWarning) {
      this.toastService.error('Incorrecto — Validación de fechas', this.chronologicalWarning);
      return;
    }
    this.save.emit({
      refArlogs: this.job.refArlogs,
      changes: this.editForm
    });
  }

  checkCarrierTracking(): void {
    if (!this.job) return;
    const guide = (this.editForm.guiaMaster || '').trim();
    const container = (this.editForm.contenedor || '').trim();
    const docRef = container && container !== 'N/A' && container !== 'PENDIENTE' ? container : guide;

    if (!docRef || docRef === 'PENDIENTE' || docRef === 'N/A') {
      this.carrierTrackingStatus = 'Asigne una Guía Máster / BL o N° Contenedor válido para sincronizar el rastreo.';
      this.toastService.warning('Tracking pendiente', 'Ingrese primero la Guía Máster / BL o Contenedor.');
      return;
    }

    let step = 'Pre-alerta registrada en origen';
    if (this.previewJob?.h10_informeSalida) {
      step = `Carga nacionalizada y entregada (${this.previewJob.h10_informeSalida})`;
    } else if (this.previewJob?.h5_arriboAta) {
      step = `Arribo confirmado en destino GYE (${this.previewJob.h5_arriboAta}) — en gestión portuaria/aduana`;
    } else if (this.previewJob?.h4_zarpeAtd) {
      step = `En tránsito internacional desde ${this.job.puertoEmbarque} (ATD ${this.previewJob.h4_zarpeAtd})`;
    }

    this.carrierTrackingStatus = `Sincronizado (${docRef}): ${step}.`;
    this.toastService.info('Tracking Carrier Actualizado', `${docRef}: ${step}`);
  }

  closeModal(): void {
    this.close.emit();
  }
}

