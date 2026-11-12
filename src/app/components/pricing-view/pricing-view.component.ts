import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { Quotation, ServiceType, ServicePrefix } from '../../models/shipment.model';

@Component({
  selector: 'app-pricing-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pricing-view py-2">

      <!-- Top Header & Action -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 class="fw-bold mb-0 text-dark font-heading">Gestión de Cotizaciones y Aprobaciones</h5>
          <span class="fs-xs text-muted">
            Emisión de cotizaciones QR, ajustes comerciales y activación automática en Operaciones
          </span>
        </div>

        <button
          type="button"
          class="btn btn-sm btn-brand-primary"
          (click)="openCreateModal()">
          <i class="bi bi-plus-lg me-1"></i>
          <span>Nueva Cotización (QR)</span>
        </button>
      </div>

      <!-- Search & Filter Toolbar -->
      <div class="card-executive p-3 mb-3">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-5">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-white text-muted border-end-0">
                <i class="bi bi-search"></i>
              </span>
              <input
                type="text"
                class="form-control border-start-0"
                placeholder="Buscar por QR, cliente, shipper, origen o OC..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)">
              @if (searchQuery()) {
                <button class="btn btn-outline-secondary" type="button" (click)="searchQuery.set('')">
                  <i class="bi bi-x"></i>
                </button>
              }
            </div>
          </div>

          <div class="col-6 col-md-3">
            <select class="form-select form-select-sm" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
              <option value="ALL">Todos los estados</option>
              <option value="PENDIENTE">Pendientes de aprobación</option>
              <option value="APROBADA">Aprobadas</option>
            </select>
          </div>

          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [ngModel]="filterModality()" (ngModelChange)="filterModality.set($event)">
              <option value="ALL">Todas las modalidades</option>
              <option value="AEREO">Aéreo (A)</option>
              <option value="FCL">FCL (F)</option>
              <option value="LCL">LCL (L)</option>
              <option value="CUSTOMS">Customs (C)</option>
              <option value="COURIER">Courier (AC)</option>
              <option value="INLAND">Inland (I)</option>
            </select>
          </div>

          <div class="col-12 col-md-2 text-md-end">
            <button type="button" class="btn btn-sm btn-outline-secondary w-100" (click)="resetFilters()">
              <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- Quotations Table -->
      <div class="card-executive overflow-hidden">
        <div class="p-3 bg-slate-50 border-bottom border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-receipt text-primary"></i>
            <strong class="text-dark fs-xs">
              Mostrando {{ filteredQuotations().length }} de {{ quotations().length }} cotizaciones
            </strong>
          </div>
          <span class="badge bg-slate-200 text-slate-700 mono-font fs-xxs">
            Pendientes: {{ pendingCount() }}
          </span>
        </div>

        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Código QR</th>
                <th>Cliente</th>
                <th>Modalidad</th>
                <th>Shipper</th>
                <th>Origen / Puerto</th>
                <th>Incoterm</th>
                <th>Órdenes de Compra</th>
                <th>Aduana ARLOGS</th>
                <th class="text-end">Cotizado / Profit</th>
                <th>Estado</th>
                <th>Referencia</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (q of filteredQuotations(); track q.id) {
                @let profitEst = (q.valorVentaCotizado ?? 0) - (q.costoEstimadoCotizado ?? 0);
                @let riskFlow = (q.valorVentaCotizado ?? 0) >= 5000 && (q.plazoPagoDias ?? 15) >= 30;
                <tr>
                  <td>
                    <span class="badge bg-slate-900 text-info mono-font fs-xs">{{ q.id }}</span>
                  </td>
                  <td>
                    <strong class="text-dark">{{ q.cliente }}</strong>
                  </td>
                  <td>
                    <span class="badge bg-slate-100 text-slate-700 border border-slate-200 mono-font">{{ q.servicio }}</span>
                  </td>
                  <td>{{ q.shipper }}</td>
                  <td>{{ q.puertoEmbarque }}, {{ q.paisOrigen }}</td>
                  <td><span class="badge bg-slate-50 text-dark border border-slate-200 mono-font">{{ q.incoterm }}</span></td>
                  <td>
                    <span class="mono-font fs-xs">{{ q.ordenesCompra.join(', ') }}</span>
                  </td>
                  <td>
                    <span class="badge"
                          [class.bg-blue-50]="q.aduanaPorArlogs === 'SI'"
                          [class.text-blue-700]="q.aduanaPorArlogs === 'SI'"
                          [class.bg-slate-50]="q.aduanaPorArlogs !== 'SI'"
                          [class.text-slate-500]="q.aduanaPorArlogs !== 'SI'">
                      {{ q.aduanaPorArlogs }}
                    </span>
                  </td>
                  <td class="text-end mono-font text-nowrap">
                    <div class="fw-bold text-dark fs-xs">\${{ (q.valorVentaCotizado ?? 0) | number:'1.0-0' }}</div>
                    <div class="fs-xxs" [class.text-success]="profitEst > 0" [class.text-muted]="profitEst <= 0">
                      Profit: \${{ profitEst | number:'1.0-0' }} &bull; {{ q.plazoPagoDias ?? 15 }}d
                    </div>
                    @if (riskFlow) {
                      <span class="badge bg-warning text-dark fs-xxs mt-1" title="Flete alto a crédito 30+ días afecta flujo de caja">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>Alerta Flujo
                      </span>
                    }
                  </td>
                  <td>
                    @if (q.estado === 'APROBADA') {
                      <span class="status-pill status-cerrado">
                        <span class="dot"></span>APROBADA
                      </span>
                    } @else {
                      <span class="status-pill status-revisar">
                        <span class="dot"></span>PENDIENTE
                      </span>
                    }
                  </td>
                  <td>
                    @if (q.refArlogsGenerada) {
                      <strong class="text-primary mono-font fs-xs">
                        <i class="bi bi-check2 me-1 text-success"></i>{{ q.refArlogsGenerada }}
                      </strong>
                    } @else {
                      <span class="text-muted fs-xs">En espera</span>
                    }
                  </td>
                  <td class="text-end">
                    @if (q.estado === 'PENDIENTE') {
                      <div class="d-inline-flex gap-1">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary py-1 px-2 fs-xs"
                          title="Editar cotización"
                          (click)="openEditModal(q)">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-success py-1 px-2 fs-xs fw-semibold"
                          (click)="approveQuote(q.id)">
                          <i class="bi bi-check-lg me-1"></i>Aprobar
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger py-1 px-2 fs-xs"
                          title="Eliminar cotización"
                          (click)="quotePendingDelete.set(q)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    } @else {
                      <span class="badge bg-slate-100 text-muted border border-slate-200 fs-xxs">En Operaciones</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="12" class="text-center py-4 text-muted">
                    <i class="bi bi-search fs-3 d-block mb-1"></i>
                    No se encontraron cotizaciones con los filtros aplicados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create / Edit Quote Modal -->
      @if (showQuoteModal) {
        <div class="modal-backdrop fade show"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-3">

              <div class="modal-header bg-slate-900 text-white py-3 px-4">
                <h6 class="modal-title fw-bold font-heading mb-0">
                  <i class="bi me-2 text-info" [class.bi-file-earmark-plus]="!editingQuoteId" [class.bi-pencil-square]="editingQuoteId"></i>
                  {{ editingQuoteId ? 'Editar Cotización ' + editingQuoteId : 'Crear Nueva Cotización Comercial' }}
                </h6>
                <button type="button" class="btn-close btn-close-white" (click)="showQuoteModal = false"></button>
              </div>

              <form (ngSubmit)="onSubmitQuote()">
                <div class="modal-body p-4 bg-slate-50">
                  <div class="row g-3">

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Cliente *</label>
                      <select class="form-select" [(ngModel)]="quoteForm.clienteId" name="clienteId" (ngModelChange)="onClientSelect($event)" required>
                        <option value="CLI-001">Industrias Andinas S.A.</option>
                        <option value="CLI-002">Comercial Pacífico Cía. Ltda.</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Modalidad de Servicio *</label>
                      <select class="form-select" [(ngModel)]="quoteForm.servicio" name="servicio" (ngModelChange)="onServiceSelect($event)" required>
                        <option value="AEREO">Aéreo (A)</option>
                        <option value="FCL">FCL Contenedor Completo (F)</option>
                        <option value="LCL">LCL Carga Consolidada (L)</option>
                        <option value="CUSTOMS">Customs / Trámite Aduanero (C)</option>
                        <option value="COURIER">Courier Acelerado (AC)</option>
                        <option value="INLAND">Inland Transporte Terrestre (I)</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Shipper (Proveedor) *</label>
                      <input type="text" class="form-control" [(ngModel)]="quoteForm.shipper" name="shipper" placeholder="Ej. Schneider Electric SE" required>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-bold text-dark">Incoterm *</label>
                      <select class="form-select" [(ngModel)]="quoteForm.incoterm" name="incoterm" required>
                        <option value="FOB">FOB (Free On Board)</option>
                        <option value="EXW">EXW (Ex Works)</option>
                        <option value="FCA">FCA (Free Carrier)</option>
                        <option value="CIF">CIF (Cost, Insurance &amp; Freight)</option>
                        <option value="CFR">CFR (Cost &amp; Freight)</option>
                        <option value="DAP">DAP (Delivered At Place)</option>
                      </select>
                    </div>

                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">País de Origen *</label>
                      <input type="text" class="form-control" [(ngModel)]="quoteForm.paisOrigen" name="paisOrigen" placeholder="Ej. FRANCIA" required>
                    </div>

                    <div class="col-6">
                      <label class="form-label fs-xs fw-bold text-dark">Puerto o Ciudad de Embarque *</label>
                      <input type="text" class="form-control" [(ngModel)]="quoteForm.puertoEmbarque" name="puertoEmbarque" placeholder="Ej. LE HAVRE" required>
                    </div>

                    <div class="col-12 col-md-8">
                      <label class="form-label fs-xs fw-bold text-dark">Órdenes de Compra (OC) *</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="quoteForm.ordenesCompraStr" name="ordenesCompraStr" placeholder="Ej. OC-5001, OC-5002" required>
                      <span class="fs-xxs text-muted">Separadas por coma si son varias órdenes</span>
                    </div>

                    <div class="col-12 col-md-4">
                      <label class="form-label fs-xs fw-bold text-dark">Despacho Aduanero ARLOGS *</label>
                      <select class="form-select" [(ngModel)]="quoteForm.aduanaPorArlogs" name="aduanaPorArlogs" required>
                        <option value="SI">SÍ (Aduana coordinada)</option>
                        <option value="NO">NO (Solo flete)</option>
                        <option value="N/A">N/A (Inland)</option>
                      </select>
                    </div>

                    <div class="col-4">
                      <label class="form-label fs-xs fw-bold text-dark">Tarifa Venta (USD) *</label>
                      <input type="number" min="0" step="10" class="form-control mono-font" [(ngModel)]="quoteForm.valorVentaCotizado" name="valorVentaCotizado" required>
                    </div>

                    <div class="col-4">
                      <label class="form-label fs-xs fw-bold text-dark">Costo Estimado (USD) *</label>
                      <input type="number" min="0" step="10" class="form-control mono-font" [(ngModel)]="quoteForm.costoEstimadoCotizado" name="costoEstimadoCotizado" required>
                    </div>

                    <div class="col-4">
                      <label class="form-label fs-xs fw-bold text-dark">Plazo Crédito (días)</label>
                      <select class="form-select mono-font" [(ngModel)]="quoteForm.plazoPagoDias" name="plazoPagoDias">
                        <option [ngValue]="0">Contado (0d)</option>
                        <option [ngValue]="15">15 días</option>
                        <option [ngValue]="30">30 días</option>
                        <option [ngValue]="45">45 días</option>
                      </select>
                    </div>

                    @if (quoteForm.valorVentaCotizado >= 5000 && quoteForm.plazoPagoDias >= 30) {
                      <div class="col-12">
                        <div class="alert alert-warning py-2 px-3 fs-xs mb-0">
                          <i class="bi bi-exclamation-triangle-fill me-1"></i>
                          <strong>Alerta de flujo de caja:</strong> Flete elevado (\${{ quoteForm.valorVentaCotizado }}) con crédito a {{ quoteForm.plazoPagoDias }} días puede comprometer liquidez operativa; revise tarifa antes de aprobar.
                        </div>
                      </div>
                    }

                  </div>
                </div>

                <div class="modal-footer bg-white border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="showQuoteModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check2 me-1"></i>{{ editingQuoteId ? 'Guardar Cambios' : 'Generar Código QR' }}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (quotePendingDelete()) {
        <div class="modal-backdrop fade show"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-sm modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-3">
              <div class="modal-body p-4 text-center">
                <i class="bi bi-trash3 text-danger fs-2 d-block mb-2"></i>
                <h6 class="fw-bold text-dark">¿Eliminar cotización?</h6>
                <p class="text-muted fs-xs mb-3">
                  Se eliminará <strong>{{ quotePendingDelete()?.id }}</strong> ({{ quotePendingDelete()?.cliente }}).
                </p>
                <div class="d-flex gap-2 justify-content-center">
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="quotePendingDelete.set(null)">Cancelar</button>
                  <button type="button" class="btn btn-sm btn-danger" (click)="executeDeleteQuote()">Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .border-slate-200 { border-color: #E2E8F0 !important; }
    .bg-slate-50 { background-color: #F8FAFC !important; }
    .bg-slate-100 { background-color: #F1F5F9 !important; }
    .bg-slate-200 { background-color: #E2E8F0 !important; }
    .bg-slate-900 { background-color: #0F172A !important; }
    .text-slate-500 { color: #64748B !important; }
    .text-slate-700 { color: #334155 !important; }
    .bg-blue-50 { background-color: #EFF6FF !important; }
    .text-blue-700 { color: #1D4ED8 !important; }
  `]
})
export class PricingViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly quotations = this.shipmentService.quotations;

  searchQuery = signal('');
  filterStatus = signal<'ALL' | 'PENDIENTE' | 'APROBADA'>('ALL');
  filterModality = signal<ServiceType | 'ALL'>('ALL');

  showQuoteModal = false;
  editingQuoteId: string | null = null;
  quotePendingDelete = signal<Quotation | null>(null);

  quoteForm = this.emptyForm();

  readonly pendingCount = computed(() =>
    this.quotations().filter(q => q.estado === 'PENDIENTE').length
  );

  readonly filteredQuotations = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.filterStatus();
    const mod = this.filterModality();

    return this.quotations().filter(item => {
      if (status !== 'ALL' && item.estado !== status) return false;
      if (mod !== 'ALL' && item.servicio !== mod) return false;
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.cliente.toLowerCase().includes(q) ||
        item.shipper.toLowerCase().includes(q) ||
        item.paisOrigen.toLowerCase().includes(q) ||
        item.puertoEmbarque.toLowerCase().includes(q) ||
        item.ordenesCompra.some(oc => oc.toLowerCase().includes(q)) ||
        (item.refArlogsGenerada?.toLowerCase().includes(q) ?? false)
      );
    });
  });

  private emptyForm() {
    return {
      clienteId: 'CLI-001',
      cliente: 'Industrias Andinas S.A.',
      servicio: 'AEREO' as ServiceType,
      serviceCode: 'A' as ServicePrefix,
      shipper: '',
      paisOrigen: '',
      puertoEmbarque: '',
      incoterm: 'FCA',
      ordenesCompraStr: 'OC-5001',
      aduanaPorArlogs: 'SI' as 'SI' | 'NO' | 'N/A',
      valorVentaCotizado: 2200,
      costoEstimadoCotizado: 1750,
      plazoPagoDias: 15
    };
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterModality.set('ALL');
    this.toastService.info('Filtros restablecidos', 'Mostrando todas las cotizaciones.');
  }

  openCreateModal(): void {
    this.editingQuoteId = null;
    this.quoteForm = this.emptyForm();
    this.showQuoteModal = true;
  }

  openEditModal(q: Quotation): void {
    this.editingQuoteId = q.id;
    this.quoteForm = {
      clienteId: q.clienteId,
      cliente: q.cliente,
      servicio: q.servicio,
      serviceCode: q.serviceCode,
      shipper: q.shipper,
      paisOrigen: q.paisOrigen,
      puertoEmbarque: q.puertoEmbarque,
      incoterm: q.incoterm,
      ordenesCompraStr: q.ordenesCompra.join(', '),
      aduanaPorArlogs: q.aduanaPorArlogs,
      valorVentaCotizado: q.valorVentaCotizado ?? 2200,
      costoEstimadoCotizado: q.costoEstimadoCotizado ?? 1750,
      plazoPagoDias: q.plazoPagoDias ?? 15
    };
    this.showQuoteModal = true;
  }

  onClientSelect(clienteId: string): void {
    this.quoteForm.cliente = clienteId === 'CLI-001' ? 'Industrias Andinas S.A.' : 'Comercial Pacífico Cía. Ltda.';
  }

  onServiceSelect(serv: ServiceType): void {
    const map: Record<ServiceType, ServicePrefix> = {
      AEREO: 'A',
      FCL: 'F',
      LCL: 'L',
      CUSTOMS: 'C',
      COURIER: 'AC',
      INLAND: 'I'
    };
    this.quoteForm.serviceCode = map[serv];
    if (serv === 'INLAND') {
      this.quoteForm.aduanaPorArlogs = 'N/A';
    }
  }

  onSubmitQuote(): void {
    if (!this.quoteForm.shipper.trim() || !this.quoteForm.paisOrigen.trim() || !this.quoteForm.puertoEmbarque.trim()) {
      this.toastService.error('Incorrecto', 'Complete todos los campos obligatorios de shipper, país y puerto.');
      return;
    }

    const ocs = this.quoteForm.ordenesCompraStr.split(',').map(s => s.trim()).filter(Boolean);
    if (ocs.length === 0) {
      this.toastService.error('Incorrecto', 'Debe ingresar al menos una orden de compra.');
      return;
    }

    try {
      if (this.editingQuoteId) {
        const updated = this.shipmentService.updateQuotation(this.editingQuoteId, {
          clienteId: this.quoteForm.clienteId,
          cliente: this.quoteForm.cliente,
          servicio: this.quoteForm.servicio,
          serviceCode: this.quoteForm.serviceCode,
          shipper: this.quoteForm.shipper.trim(),
          paisOrigen: this.quoteForm.paisOrigen.trim().toUpperCase(),
          puertoEmbarque: this.quoteForm.puertoEmbarque.trim().toUpperCase(),
          incoterm: this.quoteForm.incoterm,
          ordenesCompra: ocs,
          aduanaPorArlogs: this.quoteForm.aduanaPorArlogs,
          valorVentaCotizado: Number(this.quoteForm.valorVentaCotizado) || 0,
          costoEstimadoCotizado: Number(this.quoteForm.costoEstimadoCotizado) || 0,
          plazoPagoDias: Number(this.quoteForm.plazoPagoDias) || 0
        });
        this.showQuoteModal = false;
        this.toastService.success('Actualizado', `Cotización ${updated.id} modificada correctamente.`);
      } else {
        const created = this.shipmentService.createQuotation({
          clienteId: this.quoteForm.clienteId,
          cliente: this.quoteForm.cliente,
          servicio: this.quoteForm.servicio,
          serviceCode: this.quoteForm.serviceCode,
          shipper: this.quoteForm.shipper.trim(),
          paisOrigen: this.quoteForm.paisOrigen.trim().toUpperCase(),
          puertoEmbarque: this.quoteForm.puertoEmbarque.trim().toUpperCase(),
          incoterm: this.quoteForm.incoterm,
          ordenesCompra: ocs,
          aduanaPorArlogs: this.quoteForm.aduanaPorArlogs,
          fechaCotizacion: new Date().toISOString().split('T')[0],
          valorVentaCotizado: Number(this.quoteForm.valorVentaCotizado) || 0,
          costoEstimadoCotizado: Number(this.quoteForm.costoEstimadoCotizado) || 0,
          plazoPagoDias: Number(this.quoteForm.plazoPagoDias) || 0
        });
        this.showQuoteModal = false;
        this.toastService.success('Correcto — Creado', `Cotización ${created.id} emitida para ${created.cliente}.`);
      }
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo guardar la cotización.');
    }
  }

  approveQuote(quoteId: string): void {
    try {
      const job = this.shipmentService.approveQuotation(quoteId);
      this.toastService.success(
        'Correcto — Aprobado',
        `Cotización ${quoteId} aprobada y activada en Operaciones como ${job.refArlogs}.`
      );
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo aprobar la cotización.');
    }
  }

  executeDeleteQuote(): void {
    const q = this.quotePendingDelete();
    if (!q) return;
    try {
      this.shipmentService.deleteQuotation(q.id);
      this.quotePendingDelete.set(null);
      this.toastService.success('Eliminado', `Cotización ${q.id} eliminada correctamente.`);
    } catch (err: any) {
      this.quotePendingDelete.set(null);
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo eliminar la cotización.');
    }
  }
}
