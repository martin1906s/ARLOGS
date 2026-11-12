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

      <!-- Header & Actions -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 class="fw-bold mb-0 text-dark font-heading">Control Operativo de Embarques (H1–H10)</h5>

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

      <!-- Main Unified Container with Integrated Filter Toolbar & Pagination -->
      <div class="card-executive overflow-hidden mb-3">
        
        <!-- Integrated Filter Bar Header -->
        <div class="p-3 bg-slate-50 border-bottom border-slate-200">
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
                  placeholder="Buscar Ref, QR, OC, Guía, Contenedor..."
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event); opsPage.set(1)">
                @if (searchQuery()) {
                  <button class="btn btn-outline-secondary" type="button" (click)="searchQuery.set(''); opsPage.set(1)">
                    <i class="bi bi-x"></i>
                  </button>
                }
              </div>
            </div>

            <!-- Modality Filter -->
            <div class="col-6 col-md-2">
              <select class="form-select form-select-sm" [ngModel]="selectedModality()" (ngModelChange)="selectedModality.set($event); opsPage.set(1)">
                <option value="ALL">Modalidad: Todas</option>
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
              <select class="form-select form-select-sm" [ngModel]="selectedStatus()" (ngModelChange)="selectedStatus.set($event); opsPage.set(1)">
                <option value="ALL">Estado: Todos</option>
                <option value="ABIERTO">Abierto (En plazo)</option>
                <option value="REVISAR">Revisar (Demorado)</option>
                <option value="CERRADO">Cerrado (Completado)</option>
                <option value="N/A">N/A (Inland)</option>
              </select>
            </div>

            <!-- Client Filter -->
            <div class="col-6 col-md-2">
              <select class="form-select form-select-sm" [ngModel]="selectedClient()" (ngModelChange)="selectedClient.set($event); opsPage.set(1)">
                <option value="ALL">Cliente: Todos</option>
                <option value="CLI-001">Industrias Andinas</option>
                <option value="CLI-002">Comercial Pacífico</option>
              </select>
            </div>

            <!-- Customs Filter -->
            <div class="col-6 col-md-2 d-flex align-items-center gap-1">
              <select class="form-select form-select-sm flex-grow-1" [ngModel]="selectedCustoms()" (ngModelChange)="selectedCustoms.set($event); opsPage.set(1)">
                <option value="ALL">Aduana: Todas</option>
                <option value="SI">Aduana: SÍ</option>
                <option value="NO">Solo Flete: NO</option>
              </select>
              <button type="button" class="btn btn-sm btn-outline-secondary px-2" (click)="resetFilters()" title="Restablecer filtros">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>

          </div>

          <!-- Quick Status Tabs -->
          <div class="d-flex align-items-center gap-1 mt-2 pt-2 border-top border-slate-100 fs-xs flex-wrap">
            <span class="text-muted fw-semibold me-1">Filtro rápido:</span>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-dark]="selectedStatus() === 'ALL'"
              [class.btn-light]="selectedStatus() !== 'ALL'"
              (click)="selectedStatus.set('ALL'); opsPage.set(1)">
              Todos ({{ jobs().length }})
            </button>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-primary]="selectedStatus() === 'ABIERTO'"
              [class.btn-light]="selectedStatus() !== 'ABIERTO'"
              (click)="selectedStatus.set('ABIERTO'); opsPage.set(1)">
              Abiertos ({{ countByStatus('ABIERTO') }})
            </button>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-warning]="selectedStatus() === 'REVISAR'"
              [class.btn-light]="selectedStatus() !== 'REVISAR'"
              (click)="selectedStatus.set('REVISAR'); opsPage.set(1)">
              <i class="bi bi-exclamation-triangle-fill me-1"></i>Revisar ({{ countByStatus('REVISAR') }})
            </button>
            <button
              type="button"
              class="btn btn-sm py-0 px-2 rounded-2 fs-xxs"
              [class.btn-success]="selectedStatus() === 'CERRADO'"
              [class.btn-light]="selectedStatus() !== 'CERRADO'"
              (click)="selectedStatus.set('CERRADO'); opsPage.set(1)">
              Cerrados ({{ countByStatus('CERRADO') }})
            </button>
          </div>
        </div>

        <!-- Operations Data Table -->
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
              @for (job of paginatedJobs(); track job.refArlogs) {
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
                  </td>
                  <td>
                    <span class="mono-font badge bg-slate-50 text-dark border border-slate-200">{{ job.ordenesCompra.join(', ') }}</span>
                  </td>
                  <td>
                    <span class="mono-font fs-xs">{{ job.guiaMaster || '—' }}</span>
                  </td>
                  <td>
                    <span class="mono-font fs-xs">{{ job.contenedor || '—' }}</span>
                  </td>
                  <td class="mono-font fs-xs">{{ job.h1_asignacion }}</td>
                  <td>
                    <span class="mono-font fw-bold" [class.text-danger]="job.estado === 'REVISAR'">
                      {{ job.diasAbiertos }} d
                    </span>
                  </td>
                  <td>
                    <span class="mono-font fw-bold" [class.text-primary]="job.diasTransito !== 'N/A'">
                      {{ job.diasTransito !== 'N/A' ? job.diasTransito + ' d' : 'N/A' }}
                    </span>
                  </td>
                  <td>
                    @if (job.diasCicloTotal !== 'N/A') {
                      <span class="mono-font fw-bold text-success">{{ job.diasCicloTotal }} d</span>
                    } @else if (job.diasGestionSinAduana !== 'N/A') {
                      <span class="mono-font fw-bold text-info" title="Gestión sin aduana (H6 - H1)">{{ job.diasGestionSinAduana }} d</span>
                    } @else {
                      <span class="mono-font text-muted">N/A</span>
                    }
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatusPillClass(job.estado)">
                      <span class="dot"></span>{{ job.estado }}
                    </span>
                  </td>
                  <td class="text-end">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary py-1 px-2 fs-xs"
                      (click)="openDetail(job)"
                      title="Gestionar hitos H1-H10">
                      <i class="bi bi-pencil-square me-1"></i>Hitos
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="14" class="text-center py-4 text-muted">
                    No se encontraron embarques con los filtros aplicados.
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
                Mostrando <strong>{{ opsStartIndex() }}</strong>–<strong>{{ opsEndIndex() }}</strong> de <strong>{{ filteredJobs().length }}</strong> embarques
              </span>
              <span class="d-none d-sm-inline">&bull;</span>
              <div class="d-flex align-items-center gap-1 d-none d-sm-flex">
                <span class="text-muted fs-xxs">Filas:</span>
                <div class="btn-group btn-group-sm pagination-size-group">
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="opsPageSize() === 5" [class.btn-outline-secondary]="opsPageSize() !== 5" (click)="opsPageSize.set(5); opsPage.set(1)">5</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="opsPageSize() === 8" [class.btn-outline-secondary]="opsPageSize() !== 8" (click)="opsPageSize.set(8); opsPage.set(1)">8</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="opsPageSize() === 15" [class.btn-outline-secondary]="opsPageSize() !== 15" (click)="opsPageSize.set(15); opsPage.set(1)">15</button>
                </div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="opsPage() === 1"
                (click)="opsPage.set(opsPage() - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
              @for (p of opsPageNumbers(); track p) {
                <button
                  type="button"
                  class="btn btn-sm py-0 px-2 fs-xs"
                  [class.btn-dark]="opsPage() === p"
                  [class.btn-outline-secondary]="opsPage() !== p"
                  (click)="opsPage.set(p)">
                  {{ p }}
                </button>
              }
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="opsPage() === totalOpsPages()"
                (click)="opsPage.set(opsPage() + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Detail Modal -->
      @if (selectedJob()) {
        <app-job-detail-modal
          [job]="selectedJob()"
          (close)="closeDetail()"
          (save)="onJobSaved($event)">
        </app-job-detail-modal>
      }

      <!-- New Shipment Modal -->
      @if (showCreateModal) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-plus-circle-fill text-warning"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">Crear Nuevo Embarque Operativo</h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="showCreateModal = false"></button>
              </div>

              <form (ngSubmit)="submitNewShipment()">
                <div class="modal-body p-4">
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Cliente</label>
                      <select class="form-select" [(ngModel)]="newJobForm.clienteId" name="clienteId" (ngModelChange)="onNewClientChange($event)">
                        <option value="CLI-001">Industrias Andinas S.A. (CLI-001)</option>
                        <option value="CLI-002">Comercial Pacífico Cía. Ltda. (CLI-002)</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Modalidad de Servicio</label>
                      <select class="form-select" [(ngModel)]="newJobForm.servicio" name="servicio" (ngModelChange)="onNewServiceChange($event)">
                        <option value="AEREO">Aéreo (A)</option>
                        <option value="FCL">FCL Contenedor (F)</option>
                        <option value="LCL">LCL Consolidado (L)</option>
                        <option value="CUSTOMS">Customs (C)</option>
                        <option value="COURIER">Courier (AC)</option>
                        <option value="INLAND">Inland Transporte (I)</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Proveedor (Shipper)</label>
                      <input type="text" class="form-control" [(ngModel)]="newJobForm.shipper" name="shipper" placeholder="Ej. Ningbo Pioneer Industrial" required>
                    </div>

                    <div class="col-12 col-md-3">
                      <label class="form-label fs-xs fw-semibold">País Origen</label>
                      <input type="text" class="form-control" [(ngModel)]="newJobForm.paisOrigen" name="paisOrigen" placeholder="Ej. China" required>
                    </div>

                    <div class="col-12 col-md-3">
                      <label class="form-label fs-xs fw-semibold">Puerto / Aeropuerto</label>
                      <input type="text" class="form-control" [(ngModel)]="newJobForm.puertoEmbarque" name="puertoEmbarque" placeholder="Ej. Ningbo (CNNGB)" required>
                    </div>

                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Incoterm</label>
                      <select class="form-select" [(ngModel)]="newJobForm.incoterm" name="incoterm">
                        <option value="FOB">FOB</option>
                        <option value="EXW">EXW</option>
                        <option value="FCA">FCA</option>
                        <option value="CIF">CIF</option>
                        <option value="CFR">CFR</option>
                        <option value="DAP">DAP</option>
                      </select>
                    </div>

                    <div class="col-6 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Aduana por ARLOGS</label>
                      <select class="form-select" [(ngModel)]="newJobForm.aduanaPorArlogs" name="aduanaPorArlogs" [disabled]="newJobForm.servicio === 'INLAND'">
                        <option value="SI">SÍ</option>
                        <option value="NO">NO</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Peso Origen (kg)</label>
                      <input type="number" class="form-control mono-font" [(ngModel)]="newJobForm.pesoOrigen" name="pesoOrigen" min="1" step="1">
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Órdenes de Compra (separadas por coma)</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="newJobForm.ordenesCompraStr" name="ordenesCompraStr" placeholder="OC-6001, OC-6002" required>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Guía Máster / BL</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="newJobForm.guiaMaster" name="guiaMaster" placeholder="Ej. MSK-9841207">
                    </div>
                  </div>
                </div>

                <div class="modal-footer bg-slate-50 border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-light border" (click)="showCreateModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check-lg me-1"></i>Crear Embarque
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
    .row-alert {
      background-color: #FFFBEB !important;
    }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-500 { color: #64748B !important; }
    .text-slate-700 { color: #334155 !important; }
    .border-slate-100 { border-color: #F1F5F9 !important; }
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-blue-50 { background-color: #EFF6FF !important; }
    .text-blue-700 { color: #1D4ED8 !important; }
  `]
})
export class OperationsViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly jobs = this.shipmentService.authorizedJobs;

  searchQuery = signal<string>('');
  selectedModality = signal<string>('ALL');
  selectedStatus = signal<string>('ALL');
  selectedClient = signal<string>('ALL');
  selectedCustoms = signal<string>('ALL');

  selectedJob = signal<ShipmentJob | null>(null);
  showCreateModal = false;

  // Pagination
  opsPage = signal(1);
  opsPageSize = signal(8);

  newJobForm = this.emptyNewJobForm();

  readonly filteredJobs = computed(() => {
    let list = this.jobs();
    const q = this.searchQuery().trim().toLowerCase();
    const mod = this.selectedModality();
    const stat = this.selectedStatus();
    const client = this.selectedClient();
    const customs = this.selectedCustoms();

    if (mod !== 'ALL') {
      list = list.filter(j => j.servicio === mod);
    }
    if (stat !== 'ALL') {
      list = list.filter(j => j.estado === stat);
    }
    if (client !== 'ALL') {
      list = list.filter(j => j.clienteId === client);
    }
    if (customs !== 'ALL') {
      list = list.filter(j => j.aduanaPorArlogs === customs);
    }

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

  readonly totalOpsPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredJobs().length / this.opsPageSize()))
  );

  readonly paginatedJobs = computed(() => {
    const page = Math.min(this.opsPage(), this.totalOpsPages());
    const start = (page - 1) * this.opsPageSize();
    return this.filteredJobs().slice(start, start + this.opsPageSize());
  });

  readonly opsStartIndex = computed(() =>
    this.filteredJobs().length === 0 ? 0 : (this.opsPage() - 1) * this.opsPageSize() + 1
  );

  readonly opsEndIndex = computed(() =>
    Math.min(this.opsPage() * this.opsPageSize(), this.filteredJobs().length)
  );

  readonly opsPageNumbers = computed(() => {
    const total = this.totalOpsPages();
    return Array.from({ length: total }, (_, i) => i + 1);
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
    this.opsPage.set(1);
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

  closeDetail(): void {
    this.selectedJob.set(null);
  }

  onJobSaved(event: { refArlogs: string; changes: Partial<ShipmentJob> }): void {
    const updated = this.shipmentService.updateJobMilestones(event.refArlogs, event.changes);
    this.toastService.success(
      'Correcto — Actualizado',
      `Embarque ${updated.refArlogs} guardado correctamente.`
    );
    this.selectedJob.set(null);
  }

  exportExcel(): void {
    const list = this.filteredJobs();
    this.shipmentService.exportToExcel(list);
    this.toastService.success('Correcto — Exportado', `Se descargó el reporte con ${list.length} embarques.`);
  }
}
