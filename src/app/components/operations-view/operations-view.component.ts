import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { ServicePrefix, ServiceType, ShipmentJob } from '../../models/shipment.model';
import { JobDetailModalComponent } from '../job-detail-modal/job-detail-modal.component';

@Component({
  selector: 'app-operations-view',
  standalone: true,
  imports: [CommonModule, FormsModule, JobDetailModalComponent],
  template: `
    <div class="operations-view py-2">

      <!-- Top Header & Direct Create Action -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 class="fw-bold mb-0 text-dark font-heading">Control Operativo de Embarques (H1–H10)</h5>
          <span class="fs-xs text-muted">
            Seguimiento de hitos, documentos de transporte, pesos y gestión aduanera en tiempo real
          </span>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-success"
            (click)="exportExcel()">
            <i class="bi bi-file-earmark-excel me-1"></i>Excel ({{ filteredJobs().length }})
          </button>
          <button
            type="button"
            class="btn btn-sm btn-brand-primary"
            (click)="openNewShipmentModal()">
            <i class="bi bi-plus-lg me-1"></i>Nuevo Embarque
          </button>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="card-executive p-3 mb-3">
        <div class="row g-2 align-items-center">

          <!-- Search Input -->
          <div class="col-12 col-md-4">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-white text-muted border-end-0">
                <i class="bi bi-search"></i>
              </span>
              <input
                type="text"
                class="form-control border-start-0"
                placeholder="Buscar por Ref, QR, OC, Guía, Contenedor o Shipper..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)">
              @if (searchQuery()) {
                <button class="btn btn-outline-secondary" type="button" (click)="searchQuery.set('')">
                  <i class="bi bi-x"></i>
                </button>
              }
            </div>
          </div>

          <!-- Modality Filter -->
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [ngModel]="selectedModality()" (ngModelChange)="selectedModality.set($event)">
              <option value="ALL">Todas modalidades</option>
              <option value="AEREO">Aéreo (A)</option>
              <option value="FCL">FCL Contenedor (F)</option>
              <option value="LCL">LCL Consolidado (L)</option>
              <option value="CUSTOMS">Customs (C)</option>
              <option value="COURIER">Courier (AC)</option>
              <option value="INLAND">Inland (I)</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [ngModel]="selectedStatus()" (ngModelChange)="selectedStatus.set($event)">
              <option value="ALL">Todos los estados</option>
              <option value="ABIERTO">Abierto (En plazo)</option>
              <option value="REVISAR">Revisar (Demorado)</option>
              <option value="CERRADO">Cerrado (Completado)</option>
              <option value="N/A">N/A (Inland)</option>
            </select>
          </div>

          <!-- Client Filter -->
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [ngModel]="selectedClient()" (ngModelChange)="selectedClient.set($event)">
              <option value="ALL">Todos los clientes</option>
              <option value="CLI-001">Industrias Andinas</option>
              <option value="CLI-002">Comercial Pacífico</option>
            </select>
          </div>

          <!-- Customs Filter -->
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [ngModel]="selectedCustoms()" (ngModelChange)="selectedCustoms.set($event)">
              <option value="ALL">Aduana: Todas</option>
              <option value="SI">Aduana ARLOGS: SÍ</option>
              <option value="NO">Solo Flete: NO</option>
            </select>
          </div>

        </div>

        <!-- Quick Status Tabs & Reset -->
        <div class="d-flex align-items-center justify-content-between gap-2 mt-2 pt-2 border-top border-slate-100 fs-xs flex-wrap">
          <div class="d-flex align-items-center gap-1 flex-wrap">
            <span class="text-muted fw-semibold me-1">Filtro rápido:</span>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-dark]="selectedStatus() === 'ALL'"
              [class.btn-light]="selectedStatus() !== 'ALL'"
              (click)="selectedStatus.set('ALL')">
              Todos ({{ jobs().length }})
            </button>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-primary]="selectedStatus() === 'ABIERTO'"
              [class.btn-light]="selectedStatus() !== 'ABIERTO'"
              (click)="selectedStatus.set('ABIERTO')">
              Abiertos ({{ countByStatus('ABIERTO') }})
            </button>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-warning]="selectedStatus() === 'REVISAR'"
              [class.btn-light]="selectedStatus() !== 'REVISAR'"
              (click)="selectedStatus.set('REVISAR')">
              <i class="bi bi-exclamation-triangle-fill me-1"></i>Revisar ({{ countByStatus('REVISAR') }})
            </button>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-success]="selectedStatus() === 'CERRADO'"
              [class.btn-light]="selectedStatus() !== 'CERRADO'"
              (click)="selectedStatus.set('CERRADO')">
              Cerrados ({{ countByStatus('CERRADO') }})
            </button>
          </div>

          <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none fs-xxs text-muted" (click)="resetFilters()">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar filtros
          </button>
        </div>
      </div>

      <!-- Operations Data Table -->
      <div class="card-executive overflow-hidden">
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Cliente</th>
                <th>Modalidad</th>
                <th>Aduana</th>
                <th>Shipper</th>
                <th>Órdenes de Compra</th>
                <th>Guía / BL</th>
                <th>Contenedor</th>
                <th>H1 Asignación</th>
                <th>Días Abiertos</th>
                <th>Tránsito</th>
                <th>Ciclo Total</th>
                <th>Estado</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (job of filteredJobs(); track job.refArlogs) {
                <tr [class.row-alert]="job.estado === 'REVISAR'">
                  <td>
                    <strong class="text-primary mono-font">{{ job.refArlogs }}</strong>
                    <div class="fs-xxs text-muted mono-font">{{ job.qrCode }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark text-truncate" style="max-width: 150px;" [title]="job.cliente">
                      {{ job.cliente }}
                    </div>
                  </td>
                  <td>
                    <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font">{{ job.servicio }}</span>
                  </td>
                  <td>
                    <span class="badge"
                          [class.bg-blue-50]="job.aduanaPorArlogs === 'SI'"
                          [class.text-blue-700]="job.aduanaPorArlogs === 'SI'"
                          [class.bg-slate-50]="job.aduanaPorArlogs !== 'SI'"
                          [class.text-slate-500]="job.aduanaPorArlogs !== 'SI'">
                      {{ job.aduanaPorArlogs }}
                    </span>
                  </td>
                  <td>
                    <div class="text-truncate" style="max-width: 140px;" [title]="job.shipper">
                      {{ job.shipper }}
                    </div>
                    <div class="fs-xxs text-muted">{{ job.paisOrigen }}</div>
                  </td>
                  <td>
                    <span class="mono-font fs-xs badge bg-slate-50 text-dark border border-slate-200">
                      {{ job.ordenesCompra.join(', ') }}
                    </span>
                  </td>
                  <td class="mono-font fs-xs text-muted">{{ job.guiaMaster }}</td>
                  <td class="mono-font fs-xs text-muted">{{ job.contenedor }}</td>
                  <td class="mono-font fs-xs">{{ job.h1_asignacion }}</td>
                  <td>
                    <span class="mono-font fw-bold" [class.text-amber-700]="job.estado === 'REVISAR'">
                      {{ job.diasAbiertos !== 'N/A' ? job.diasAbiertos + ' d' : 'N/A' }}
                    </span>
                  </td>
                  <td>
                    <span class="mono-font" [class.text-primary]="job.diasTransito !== 'N/A'">
                      {{ job.diasTransito !== 'N/A' ? job.diasTransito + ' d' : 'N/A' }}
                    </span>
                  </td>
                  <td>
                    <span class="mono-font fw-bold" [class.text-success]="job.diasCicloTotal !== 'N/A'">
                      {{ job.diasCicloTotal !== 'N/A' ? job.diasCicloTotal + ' d' : 'N/A' }}
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatusPillClass(job.estado)">
                      <span class="dot"></span>{{ job.estado }}
                    </span>
                  </td>
                  <td class="text-end">
                    <div class="d-inline-flex gap-1">
                      <button
                        type="button"
                        class="btn btn-sm btn-brand-outline py-1 px-2"
                        (click)="openDetail(job)"
                        title="Registrar hitos y documentos">
                        <i class="bi bi-sliders me-1"></i>Hitos
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger py-1 px-2"
                        (click)="jobPendingDelete.set(job)"
                        title="Eliminar embarque">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="14" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-3 d-block mb-1"></i>
                    No se encontraron embarques con los filtros activos.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex justify-content-between align-items-center fs-xxs text-muted">
          <span>Mostrando <strong>{{ filteredJobs().length }}</strong> de <strong>{{ jobs().length }}</strong> referencias</span>
          <span>Cálculo de hitos en tiempo real</span>
        </div>
      </div>

      <!-- Detail Modal (Hitos, Docs, Pesos, Aduana) -->
      @if (selectedJob()) {
        <app-job-detail-modal
          [job]="selectedJob()"
          [isReadOnly]="false"
          (close)="selectedJob.set(null)"
          (save)="onSaveMilestones($event)">
        </app-job-detail-modal>
      }

      <!-- New Direct Shipment Modal -->
      @if (showCreateModal) {
        <div class="modal-backdrop fade show"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-3">
              <div class="modal-header bg-slate-900 text-white py-3 px-4">
                <h6 class="modal-title fw-bold font-heading mb-0">
                  <i class="bi bi-box-seam me-2 text-info"></i>Registrar Nuevo Embarque Operativo
                </h6>
                <button type="button" class="btn-close btn-close-white" (click)="showCreateModal = false"></button>
              </div>

              <form (ngSubmit)="submitNewShipment()">
                <div class="modal-body p-4 bg-slate-50">
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Cliente *</label>
                      <select class="form-select" [(ngModel)]="newJobForm.clienteId" name="clienteId" (ngModelChange)="onNewClientChange($event)" required>
                        <option value="CLI-001">Industrias Andinas S.A.</option>
                        <option value="CLI-002">Comercial Pacífico Cía. Ltda.</option>
                      </select>
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Modalidad *</label>
                      <select class="form-select" [(ngModel)]="newJobForm.servicio" name="servicio" (ngModelChange)="onNewServiceChange($event)" required>
                        <option value="AEREO">Aéreo (A)</option>
                        <option value="FCL">FCL Contenedor (F)</option>
                        <option value="LCL">LCL Consolidado (L)</option>
                        <option value="CUSTOMS">Customs Aduana (C)</option>
                        <option value="COURIER">Courier (AC)</option>
                        <option value="INLAND">Inland (I)</option>
                      </select>
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Shipper / Proveedor *</label>
                      <input type="text" class="form-control" [(ngModel)]="newJobForm.shipper" name="shipper" placeholder="Ej. Siemens Logistics GmbH" required>
                    </div>
                    <div class="col-12 col-md-3">
                      <label class="form-label fs-xs fw-bold text-dark">Incoterm *</label>
                      <select class="form-select" [(ngModel)]="newJobForm.incoterm" name="incoterm" required>
                        <option value="FOB">FOB</option>
                        <option value="EXW">EXW</option>
                        <option value="FCA">FCA</option>
                        <option value="CIF">CIF</option>
                        <option value="CFR">CFR</option>
                        <option value="DAP">DAP</option>
                      </select>
                    </div>
                    <div class="col-12 col-md-3">
                      <label class="form-label fs-xs fw-bold text-dark">Aduana ARLOGS *</label>
                      <select class="form-select" [(ngModel)]="newJobForm.aduanaPorArlogs" name="aduanaPorArlogs" required>
                        <option value="SI">SÍ</option>
                        <option value="NO">NO</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-bold text-dark">País Origen *</label>
                      <input type="text" class="form-control" [(ngModel)]="newJobForm.paisOrigen" name="paisOrigen" placeholder="ALEMANIA" required>
                    </div>
                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-bold text-dark">Puerto / Aeropuerto *</label>
                      <input type="text" class="form-control" [(ngModel)]="newJobForm.puertoEmbarque" name="puertoEmbarque" placeholder="HAMBURGO" required>
                    </div>
                    <div class="col-12 col-md-4">
                      <label class="form-label fs-xs fw-bold text-dark">Peso Origen (kg)</label>
                      <input type="number" class="form-control mono-font" [(ngModel)]="newJobForm.pesoOrigen" name="pesoOrigen" min="1">
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Órdenes de Compra (OC) *</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="newJobForm.ordenesCompraStr" name="ordenesCompraStr" placeholder="OC-6001, OC-6002" required>
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Guía Master / BL</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="newJobForm.guiaMaster" name="guiaMaster" placeholder="Opcional (PENDIENTE si vacío)">
                    </div>
                  </div>
                </div>
                <div class="modal-footer bg-white border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="showCreateModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check2 me-1"></i>Crear Embarque
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Delete Shipment Confirmation -->
      @if (jobPendingDelete()) {
        <div class="modal-backdrop fade show"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-sm modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-3">
              <div class="modal-body p-4 text-center">
                <i class="bi bi-trash3 text-danger fs-2 d-block mb-2"></i>
                <h6 class="fw-bold text-dark">¿Eliminar embarque?</h6>
                <p class="text-muted fs-xs mb-3">
                  Se eliminará la referencia <strong>{{ jobPendingDelete()?.refArlogs }}</strong> ({{ jobPendingDelete()?.cliente }}).
                </p>
                <div class="d-flex gap-2 justify-content-center">
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="jobPendingDelete.set(null)">Cancelar</button>
                  <button type="button" class="btn btn-sm btn-danger" (click)="executeDeleteShipment()">Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-500 { color: #64748B !important; }
    .text-slate-700 { color: #334155 !important; }
    .bg-blue-50 { background-color: #EFF6FF !important; }
    .text-blue-700 { color: #1D4ED8 !important; }
    .text-amber-700 { color: #B45309 !important; }
  `]
})
export class OperationsViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly jobs = this.shipmentService.jobs;

  searchQuery = signal('');
  selectedModality = signal('ALL');
  selectedStatus = signal('ALL');
  selectedClient = signal('ALL');
  selectedCustoms = signal('ALL');

  selectedJob = signal<ShipmentJob | null>(null);
  jobPendingDelete = signal<ShipmentJob | null>(null);
  showCreateModal = false;

  newJobForm = this.emptyNewJobForm();

  readonly filteredJobs = computed(() => {
    let list = this.jobs();
    const mod = this.selectedModality();
    const status = this.selectedStatus();
    const cli = this.selectedClient();
    const customs = this.selectedCustoms();
    const q = this.searchQuery().toLowerCase().trim();

    if (mod !== 'ALL') list = list.filter(j => j.servicio === mod);
    if (status !== 'ALL') list = list.filter(j => j.estado === status);
    if (cli !== 'ALL') list = list.filter(j => j.clienteId === cli);
    if (customs !== 'ALL') list = list.filter(j => j.aduanaPorArlogs === customs);

    if (q) {
      list = list.filter(j =>
        j.refArlogs.toLowerCase().includes(q) ||
        j.qrCode.toLowerCase().includes(q) ||
        j.cliente.toLowerCase().includes(q) ||
        j.shipper.toLowerCase().includes(q) ||
        j.guiaMaster.toLowerCase().includes(q) ||
        j.hawbHbl.toLowerCase().includes(q) ||
        j.contenedor.toLowerCase().includes(q) ||
        j.ordenesCompra.some(oc => oc.toLowerCase().includes(q))
      );
    }
    return list;
  });

  private emptyNewJobForm() {
    return {
      clienteId: 'CLI-001',
      cliente: 'Industrias Andinas S.A.',
      servicio: 'AEREO' as ServiceType,
      serviceCode: 'A' as ServicePrefix,
      aduanaPorArlogs: 'SI' as 'SI' | 'NO' | 'N/A',
      shipper: '',
      paisOrigen: '',
      puertoEmbarque: '',
      incoterm: 'FOB',
      ordenesCompraStr: 'OC-6001',
      guiaMaster: '',
      pesoOrigen: 250
    };
  }

  countByStatus(status: string): number {
    return this.jobs().filter(j => j.estado === status).length;
  }

  getStatusPillClass(status: string | undefined): string {
    switch (status) {
      case 'ABIERTO': return 'status-abierto';
      case 'REVISAR': return 'status-revisar';
      case 'CERRADO': return 'status-cerrado';
      default: return 'status-na';
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedModality.set('ALL');
    this.selectedStatus.set('ALL');
    this.selectedClient.set('ALL');
    this.selectedCustoms.set('ALL');
    this.toastService.info('Filtros restablecidos', 'Mostrando todos los embarques.');
  }

  openNewShipmentModal(): void {
    this.newJobForm = this.emptyNewJobForm();
    this.showCreateModal = true;
  }

  onNewClientChange(clienteId: string): void {
    this.newJobForm.cliente = clienteId === 'CLI-001' ? 'Industrias Andinas S.A.' : 'Comercial Pacífico Cía. Ltda.';
  }

  onNewServiceChange(serv: ServiceType): void {
    const map: Record<ServiceType, ServicePrefix> = {
      AEREO: 'A',
      FCL: 'F',
      LCL: 'L',
      CUSTOMS: 'C',
      COURIER: 'AC',
      INLAND: 'I'
    };
    this.newJobForm.serviceCode = map[serv];
    if (serv === 'INLAND') {
      this.newJobForm.aduanaPorArlogs = 'N/A';
    }
  }

  submitNewShipment(): void {
    if (!this.newJobForm.shipper.trim() || !this.newJobForm.paisOrigen.trim() || !this.newJobForm.puertoEmbarque.trim()) {
      this.toastService.error('Incorrecto', 'Complete los campos obligatorios de shipper, país y puerto.');
      return;
    }
    const ocs = this.newJobForm.ordenesCompraStr.split(',').map(s => s.trim()).filter(Boolean);
    if (ocs.length === 0) {
      this.toastService.error('Incorrecto', 'Debe ingresar al menos una orden de compra.');
      return;
    }

    try {
      const created = this.shipmentService.createDirectShipment({
        clienteId: this.newJobForm.clienteId,
        cliente: this.newJobForm.cliente,
        servicio: this.newJobForm.servicio,
        serviceCode: this.newJobForm.serviceCode,
        aduanaPorArlogs: this.newJobForm.aduanaPorArlogs,
        shipper: this.newJobForm.shipper,
        paisOrigen: this.newJobForm.paisOrigen,
        puertoEmbarque: this.newJobForm.puertoEmbarque,
        incoterm: this.newJobForm.incoterm,
        ordenesCompra: ocs,
        guiaMaster: this.newJobForm.guiaMaster,
        pesoOrigen: this.newJobForm.pesoOrigen
      });
      this.showCreateModal = false;
      this.toastService.success(
        'Correcto — Creado',
        `Embarque ${created.refArlogs} creado para ${created.cliente}.`
      );
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo crear el embarque.');
    }
  }

  openDetail(job: ShipmentJob): void {
    this.selectedJob.set(job);
  }

  onSaveMilestones(event: { refArlogs: string; changes: Partial<ShipmentJob> }): void {
    try {
      const updated = this.shipmentService.updateJobMilestones(event.refArlogs, event.changes);
      this.selectedJob.set(null);
      this.toastService.success(
        'Actualizado',
        `Embarque ${updated.refArlogs} actualizado (${updated.estado}). Tiempos recalculados.`
      );
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo actualizar el embarque.');
    }
  }

  executeDeleteShipment(): void {
    const job = this.jobPendingDelete();
    if (!job) return;
    try {
      this.shipmentService.deleteShipment(job.refArlogs);
      this.jobPendingDelete.set(null);
      this.toastService.success('Eliminado', `Embarque ${job.refArlogs} eliminado del seguimiento.`);
    } catch (err: any) {
      this.jobPendingDelete.set(null);
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo eliminar el embarque.');
    }
  }

  exportExcel(): void {
    const list = this.filteredJobs();
    this.shipmentService.exportToExcel(list);
    this.toastService.success('Correcto — Exportado', `Se descargó el Excel con ${list.length} embarques.`);
  }
}
