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

      <!-- Header & Action -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 class="fw-bold mb-0 text-dark font-heading">Gestión de Cotizaciones y Aprobaciones</h5>

        <button
          type="button"
          class="btn btn-sm btn-brand-primary"
          (click)="openCreateModal()">
          <i class="bi bi-plus-lg me-1"></i>
          <span>Nueva Cotización (QR)</span>
        </button>
      </div>

      <!-- Main Unified Table Card with Integrated Search & Filter Toolbar -->
      <div class="card-executive overflow-hidden mb-3">
        
        <!-- Integrated Toolbar Header -->
        <div class="p-3 bg-slate-50 border-bottom border-slate-200">
          <div class="row g-2 align-items-center">
            <div class="col-12 col-md-5">
              <div class="input-group input-group-sm">
                <span class="input-group-text bg-white text-muted border-end-0">
                  <i class="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  class="form-control border-start-0"
                  placeholder="Buscar por QR, cliente, shipper o OC..."
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event); pricingPage.set(1)">
                @if (searchQuery()) {
                  <button class="btn btn-outline-secondary" type="button" (click)="searchQuery.set(''); pricingPage.set(1)">
                    <i class="bi bi-x"></i>
                  </button>
                }
              </div>
            </div>

            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event); pricingPage.set(1)">
                <option value="ALL">Todos los estados</option>
                <option value="PENDIENTE">Pendientes de aprobación</option>
                <option value="APROBADA">Aprobadas</option>
              </select>
            </div>

            <div class="col-6 col-md-2">
              <select class="form-select form-select-sm" [ngModel]="filterModality()" (ngModelChange)="filterModality.set($event); pricingPage.set(1)">
                <option value="ALL">Todas las modalidades</option>
                <option value="AEREO">Aéreo (A)</option>
                <option value="FCL">FCL (F)</option>
                <option value="LCL">LCL (L)</option>
                <option value="CUSTOMS">Customs (C)</option>
                <option value="COURIER">Courier (AC)</option>
                <option value="INLAND">Inland (I)</option>
              </select>
            </div>

            <div class="col-12 col-md-2 text-md-end d-flex align-items-center justify-content-between justify-content-md-end gap-2">
              <span class="fs-xxs text-muted mono-font">Pendientes: <strong class="text-warning">{{ pendingCount() }}</strong></span>
              <button type="button" class="btn btn-sm btn-outline-secondary px-2" (click)="resetFilters()" title="Limpiar filtros">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Quotations Table -->
        <div class="table-responsive">
          <table class="table table-arlogs align-middle mb-0">
            <thead>
              <tr>
                <th>Código QR</th>
                <th>Cliente</th>
                <th>Modalidad</th>
                <th>Shipper</th>
                <th>Origen</th>
                <th>Incoterm</th>
                <th>Órdenes de Compra</th>
                <th>Aduana</th>
                <th class="text-end">Cotizado / Profit</th>
                <th>Estado</th>
                <th>Referencia</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (q of paginatedQuotations(); track q.id) {
                @let profitEst = (q.valorVentaCotizado ?? 0) - (q.costoEstimadoCotizado ?? 0);
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
                  <td>
                    <div class="text-truncate" style="max-width: 140px;" [title]="q.shipper">{{ q.shipper }}</div>
                  </td>
                  <td>
                    <div class="text-truncate" style="max-width: 130px;" [title]="q.puertoEmbarque + ', ' + q.paisOrigen">
                      {{ q.puertoEmbarque }}, {{ q.paisOrigen }}
                    </div>
                  </td>
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
                  <td class="text-end">
                    <div class="mono-font fw-bold text-dark fs-xs">
                      \${{ (q.valorVentaCotizado ?? 0) | number:'1.0-0' }}
                    </div>
                    <div class="fs-xxs mono-font" [class.text-success]="profitEst >= 0" [class.text-danger]="profitEst < 0">
                      Profit: \${{ profitEst | number:'1.0-0' }}
                    </div>
                  </td>
                  <td>
                    <span class="badge-subtle" [class.badge-subtle-emerald]="q.estado === 'APROBADA'" [class.badge-subtle-amber]="q.estado === 'PENDIENTE'">
                      {{ q.estado }}
                    </span>
                  </td>
                  <td>
                    @if (q.refArlogsGenerada) {
                      <strong class="text-primary mono-font fs-xs">{{ q.refArlogsGenerada }}</strong>
                    } @else {
                      <span class="text-muted fs-xxs">Pendiente</span>
                    }
                  </td>
                  <td class="text-end">
                    <div class="d-inline-flex gap-1">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary py-1 px-2 fs-xs"
                        (click)="openEditModal(q)"
                        title="Modificar cotización">
                        <i class="bi bi-pencil"></i>
                      </button>

                      @if (q.estado === 'PENDIENTE') {
                        <button
                          type="button"
                          class="btn btn-sm btn-success py-1 px-2 fs-xs"
                          (click)="approveQuotation(q)"
                          title="Aprobar y generar código ARLOGS">
                          <i class="bi bi-check-lg me-1"></i>Aprobar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="12" class="text-center py-4 text-muted">
                    No se encontraron cotizaciones con los criterios seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Functional Pagination Footer -->
        @if (filteredQuotations().length > 0) {
          <div class="p-2 px-3 bg-slate-50 border-top border-slate-200 d-flex align-items-center justify-content-between flex-wrap gap-2 fs-xs">
            <div class="d-flex align-items-center gap-2 text-muted">
              <span>
                Mostrando <strong>{{ pricingStartIndex() }}</strong>–<strong>{{ pricingEndIndex() }}</strong> de <strong>{{ filteredQuotations().length }}</strong> cotizaciones
              </span>
              <span class="d-none d-sm-inline">&bull;</span>
              <div class="d-flex align-items-center gap-1 d-none d-sm-flex">
                <span class="text-muted fs-xxs">Filas:</span>
                <div class="btn-group btn-group-sm pagination-size-group">
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="pricingPageSize() === 5" [class.btn-outline-secondary]="pricingPageSize() !== 5" (click)="pricingPageSize.set(5); pricingPage.set(1)">5</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="pricingPageSize() === 6" [class.btn-outline-secondary]="pricingPageSize() !== 6" (click)="pricingPageSize.set(6); pricingPage.set(1)">6</button>
                  <button type="button" class="btn btn-xs py-0 px-2 fs-xxs" [class.btn-dark]="pricingPageSize() === 12" [class.btn-outline-secondary]="pricingPageSize() !== 12" (click)="pricingPageSize.set(12); pricingPage.set(1)">12</button>
                </div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="pricingPage() === 1"
                (click)="pricingPage.set(pricingPage() - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
              @for (p of pricingPageNumbers(); track p) {
                <button
                  type="button"
                  class="btn btn-sm py-0 px-2 fs-xs"
                  [class.btn-dark]="pricingPage() === p"
                  [class.btn-outline-secondary]="pricingPage() !== p"
                  (click)="pricingPage.set(p)">
                  {{ p }}
                </button>
              }
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2 fs-xs"
                [disabled]="pricingPage() === totalPricingPages()"
                (click)="pricingPage.set(pricingPage() + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Create / Edit Quotation Modal -->
      @if (showQuoteModal) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header bg-slate-900 text-white border-0 py-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-tag-fill text-warning"></i>
                  <h6 class="modal-title mb-0 fw-bold font-heading">
                    {{ editingQuoteId ? 'Editar Cotización ' + editingQuoteId : 'Nueva Cotización (QR)' }}
                  </h6>
                </div>
                <button type="button" class="btn-close btn-close-white" (click)="showQuoteModal = false"></button>
              </div>

              <form (ngSubmit)="onSubmitQuote()">
                <div class="modal-body p-4">
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Cliente</label>
                      <select class="form-select" [(ngModel)]="quoteForm.clienteId" name="clienteId" (ngModelChange)="onClientSelect($event)">
                        <option value="CLI-001">Industrias Andinas S.A. (CLI-001)</option>
                        <option value="CLI-002">Comercial Pacífico Cía. Ltda. (CLI-002)</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Modalidad de Servicio</label>
                      <select class="form-select" [(ngModel)]="quoteForm.servicio" name="servicio" (ngModelChange)="onServiceSelect($event)">
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
                      <input type="text" class="form-control" [(ngModel)]="quoteForm.shipper" name="shipper" placeholder="Ej. Yiwu Supply Chain Co." required>
                    </div>

                    <div class="col-12 col-md-3">
                      <label class="form-label fs-xs fw-semibold">País de Origen</label>
                      <input type="text" class="form-control" [(ngModel)]="quoteForm.paisOrigen" name="paisOrigen" placeholder="Ej. China" required>
                    </div>

                    <div class="col-12 col-md-3">
                      <label class="form-label fs-xs fw-semibold">Puerto / Aeropuerto Embarque</label>
                      <input type="text" class="form-control" [(ngModel)]="quoteForm.puertoEmbarque" name="puertoEmbarque" placeholder="Ej. Ningbo (CNNGB)" required>
                    </div>

                    <div class="col-6 col-md-3">
                      <label class="form-label fs-xs fw-semibold">Incoterm</label>
                      <select class="form-select" [(ngModel)]="quoteForm.incoterm" name="incoterm">
                        <option value="FOB">FOB</option>
                        <option value="EXW">EXW</option>
                        <option value="FCA">FCA</option>
                        <option value="CIF">CIF</option>
                        <option value="CFR">CFR</option>
                        <option value="DAP">DAP</option>
                      </select>
                    </div>

                    <div class="col-6 col-md-3">
                      <label class="form-label fs-xs fw-semibold">Aduana por ARLOGS</label>
                      <select class="form-select" [(ngModel)]="quoteForm.aduanaPorArlogs" name="aduanaPorArlogs" [disabled]="quoteForm.servicio === 'INLAND'">
                        <option value="SI">SÍ</option>
                        <option value="NO">NO</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>

                    <div class="col-12 col-md-6">
                      <label class="form-label fs-xs fw-semibold">Órdenes de Compra (separadas por coma)</label>
                      <input type="text" class="form-control mono-font" [(ngModel)]="quoteForm.ordenesCompraStr" name="ordenesCompraStr" placeholder="OC-1001, OC-1002" required>
                    </div>

                    <!-- Commercial Pricing Breakdown -->
                    <div class="col-12 col-md-4">
                      <label class="form-label fs-xs fw-semibold text-primary">Valor Venta Cotizado (USD)</label>
                      <div class="input-group input-group-sm">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control mono-font fw-bold" [(ngModel)]="quoteForm.valorVentaCotizado" name="valorVentaCotizado" min="0" step="50" required>
                      </div>
                    </div>

                    <div class="col-12 col-md-4">
                      <label class="form-label fs-xs fw-semibold text-secondary">Costo Estimado Cotizado (USD)</label>
                      <div class="input-group input-group-sm">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control mono-font" [(ngModel)]="quoteForm.costoEstimadoCotizado" name="costoEstimadoCotizado" min="0" step="50" required>
                      </div>
                    </div>

                    <div class="col-12 col-md-4">
                      <label class="form-label fs-xs fw-semibold">Plazo de Pago (Días)</label>
                      <select class="form-select form-select-sm" [(ngModel)]="quoteForm.plazoPagoDias" name="plazoPagoDias">
                        <option [value]="0">Contado (0 días)</option>
                        <option [value]="15">15 días</option>
                        <option [value]="30">30 días crédito</option>
                        <option [value]="45">45 días crédito</option>
                        <option [value]="60">60 días crédito</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="modal-footer bg-slate-50 border-top border-slate-200 py-2 px-4">
                  <button type="button" class="btn btn-sm btn-light border" (click)="showQuoteModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-sm btn-brand-primary">
                    <i class="bi bi-check-lg me-1"></i>
                    <span>{{ editingQuoteId ? 'Guardar Cambios' : 'Emitir Cotización' }}</span>
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
export class PricingViewComponent {
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  readonly quotations = this.shipmentService.quotations;

  searchQuery = signal<string>('');
  filterStatus = signal<string>('ALL');
  filterModality = signal<string>('ALL');

  showQuoteModal = false;
  editingQuoteId: string | null = null;

  // Pagination
  pricingPage = signal(1);
  pricingPageSize = signal(6);

  quoteForm = this.emptyForm();

  readonly pendingCount = computed(() =>
    this.quotations().filter(q => q.estado === 'PENDIENTE').length
  );

  readonly filteredQuotations = computed(() => {
    let list = this.quotations();
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.filterStatus();
    const modality = this.filterModality();

    if (status !== 'ALL') {
      list = list.filter(item => item.estado === status);
    }
    if (modality !== 'ALL') {
      list = list.filter(item => item.servicio === modality);
    }
    if (q) {
      list = list.filter(item =>
        item.id.toLowerCase().includes(q) ||
        item.cliente.toLowerCase().includes(q) ||
        item.shipper.toLowerCase().includes(q) ||
        item.paisOrigen.toLowerCase().includes(q) ||
        item.puertoEmbarque.toLowerCase().includes(q) ||
        item.ordenesCompra.some(oc => oc.toLowerCase().includes(q))
      );
    }
    return list;
  });

  readonly totalPricingPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredQuotations().length / this.pricingPageSize()))
  );

  readonly paginatedQuotations = computed(() => {
    const page = Math.min(this.pricingPage(), this.totalPricingPages());
    const start = (page - 1) * this.pricingPageSize();
    return this.filteredQuotations().slice(start, start + this.pricingPageSize());
  });

  readonly pricingStartIndex = computed(() =>
    this.filteredQuotations().length === 0 ? 0 : (this.pricingPage() - 1) * this.pricingPageSize() + 1
  );

  readonly pricingEndIndex = computed(() =>
    Math.min(this.pricingPage() * this.pricingPageSize(), this.filteredQuotations().length)
  );

  readonly pricingPageNumbers = computed(() => {
    const total = this.totalPricingPages();
    return Array.from({ length: total }, (_, i) => i + 1);
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
      incoterm: 'FOB',
      ordenesCompraStr: 'OC-1005',
      aduanaPorArlogs: 'SI' as 'SI' | 'NO' | 'N/A',
      valorVentaCotizado: 2400,
      costoEstimadoCotizado: 1850,
      plazoPagoDias: 15
    };
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterModality.set('ALL');
    this.pricingPage.set(1);
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
        this.toastService.success('Correcto — Actualizado', `Cotización ${updated.id} modificada.`);
      } else {
        const created = this.shipmentService.createQuotation({
          clienteId: this.quoteForm.clienteId,
          cliente: this.quoteForm.cliente,
          fechaCotizacion: new Date().toISOString().slice(0, 10),
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
        this.toastService.success('Correcto — Creado', `Cotización ${created.id} registrada.`);
      }
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'Error al procesar la cotización.');
    }
  }

  approveQuotation(q: Quotation): void {
    try {
      const job = this.shipmentService.approveQuotation(q.id);
      this.toastService.success(
        'Correcto — Aprobado',
        `Cotización ${q.id} aprobada. Código generado: ${job.refArlogs}`
      );
    } catch (err: any) {
      this.toastService.error('Incorrecto', err?.message ?? 'No se pudo aprobar la cotización.');
    }
  }
}
