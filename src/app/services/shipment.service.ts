import { Injectable, signal, computed, inject } from '@angular/core';
import {
  ShipmentJob,
  Quotation,
  RoleUser,
  DEMO_USERS,
  UserRole,
  ServiceType,
  ServicePrefix,
  WarehouseId,
  WarehouseItem,
  WarehouseMovement
} from '../models/shipment.model';
import { INITIAL_MOCK_JOBS } from '../models/mock-data';
import { AuditService } from './audit.service';

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  private auditService = inject(AuditService);
  // Current simulated date as per requirements: 11 Nov 2026
  readonly referenceDate = new Date('2026-11-11T00:00:00');

  // Reactive state signals
  readonly jobs = signal<ShipmentJob[]>([]);
  readonly quotations = signal<Quotation[]>([]);
  readonly warehouseItems = signal<WarehouseItem[]>([]);
  readonly warehouseMovements = signal<WarehouseMovement[]>([]);
  readonly currentUser = signal<RoleUser>(DEMO_USERS[0]); // Overwritten upon login
  readonly alertThresholdDays = signal<number>(15); // Default 15 days, editable by Gerencia / Admin

  constructor() {
    this.initData();
  }

  private initData(): void {
    // Seed commercial pricing/billing metadata on mock jobs (strictly hidden from Operaciones UI)
    const computedJobs = INITIAL_MOCK_JOBS.map((rawJob, idx) => {
      const calc = this.calculateJobMetrics(rawJob, this.alertThresholdDays());
      const baseByService: Record<ServiceType, [number, number, number]> = {
        AEREO: [2450, 1980, 15],
        FCL: [4600, 3850, 30],
        LCL: [1850, 1460, 15],
        CUSTOMS: [780, 520, 15],
        COURIER: [640, 480, 15],
        INLAND: [420, 310, 15]
      };
      const [baseVenta, baseCosto, basePlazo] = baseByService[calc.servicio];
      const variance = (idx % 4) * 280;
      const isHeavyFcl = calc.servicio === 'FCL' && idx % 3 === 1;
      const valorVentaCotizado = isHeavyFcl ? 7100 : baseVenta + variance;
      const costoEstimadoCotizado = isHeavyFcl ? 6050 : baseCosto + Math.round(variance * 0.78);
      const plazoPagoDias = isHeavyFcl ? 30 : basePlazo;

      if (calc.estado === 'CERRADO') {
        const realDelta = idx % 2 === 0 ? 120 : -90;
        return {
          ...calc,
          valorVentaCotizado,
          costoEstimadoCotizado,
          plazoPagoDias,
          facturaNumero: `FAC-001-${(410 + idx).toString().padStart(5, '0')}`,
          valorFacturadoReal: valorVentaCotizado + realDelta,
          costoReal: costoEstimadoCotizado + (idx % 3 === 0 ? 60 : -40),
          estadoCobro: (idx % 3 === 0 ? 'FACTURADA' : 'COBRADA') as ShipmentJob['estadoCobro'],
          fechaFactura: calc.h10_informeSalida || calc.h6_pesoRecibido || '2026-11-05'
        };
      }

      return {
        ...calc,
        valorVentaCotizado,
        costoEstimadoCotizado,
        plazoPagoDias,
        estadoCobro: 'PENDIENTE_FACTURAR' as const
      };
    });
    this.jobs.set(computedJobs);

    // Initial mock quotations in Pricing
    const initialQuotes: Quotation[] = [
      {
        id: 'QR-022-26',
        clienteId: 'CLI-001',
        cliente: 'Industrias Andinas DEMO S.A.',
        servicio: 'AEREO',
        serviceCode: 'A',
        shipper: 'Siemens Healthineers AG',
        paisOrigen: 'ALEMANIA',
        puertoEmbarque: 'MUNICH',
        incoterm: 'FCA',
        ordenesCompra: ['OC-1008', 'OC-1009'],
        aduanaPorArlogs: 'SI',
        fechaCotizacion: '2026-11-09',
        estado: 'PENDIENTE',
        valorVentaCotizado: 2650,
        costoEstimadoCotizado: 2120,
        plazoPagoDias: 15
      },
      {
        id: 'QR-023-26',
        clienteId: 'CLI-002',
        cliente: 'Comercial Pacífico DEMO Cía. Ltda.',
        servicio: 'FCL',
        serviceCode: 'F',
        shipper: 'Sany Heavy Machinery Co.',
        paisOrigen: 'CHINA',
        puertoEmbarque: 'NINGBO',
        incoterm: 'FOB',
        ordenesCompra: ['OC-2009'],
        aduanaPorArlogs: 'SI',
        fechaCotizacion: '2026-11-10',
        estado: 'PENDIENTE',
        valorVentaCotizado: 7000,
        costoEstimadoCotizado: 5950,
        plazoPagoDias: 30
      }
    ];
    this.quotations.set(initialQuotes);

    // Initial Kardex Stock across 2 Rented Warehouses (Operaciones 3 - sin costeo de inventario)
    const initialItems: WarehouseItem[] = [
      {
        id: 'KAR-101',
        bodegaId: 'BODEGA_1',
        bodegaNombre: 'Bodega Norte (GYE)',
        clienteId: 'CLI-001',
        cliente: 'Industrias Andinas DEMO S.A.',
        refArlogs: 'A901-2026',
        ordenCompra: 'OC-1001',
        descripcion: 'Válvulas de control neumático y repuestos industriales',
        cantidadInicial: 40,
        cantidadDisponible: 24,
        unidad: 'Cajas',
        pesoKg: 121,
        fechaIngreso: '2026-10-18',
        ubicacionRack: 'RACK-A04',
        estado: 'PARCIAL',
        ultimaGuiaRemision: 'GR-001-0118'
      },
      {
        id: 'KAR-102',
        bodegaId: 'BODEGA_1',
        bodegaNombre: 'Bodega Norte (GYE)',
        clienteId: 'CLI-001',
        cliente: 'Industrias Andinas DEMO S.A.',
        refArlogs: 'L901-2026',
        ordenCompra: 'OC-1005',
        descripcion: 'Paneles eléctricos modulares IP65',
        cantidadInicial: 12,
        cantidadDisponible: 12,
        unidad: 'Pallets',
        pesoKg: 940,
        fechaIngreso: '2026-11-04',
        ubicacionRack: 'RACK-B02',
        estado: 'EN_BODEGA'
      },
      {
        id: 'KAR-103',
        bodegaId: 'BODEGA_2',
        bodegaNombre: 'Bodega Sur (Puerto Marítimo)',
        clienteId: 'CLI-002',
        cliente: 'Comercial Pacífico DEMO Cía. Ltda.',
        refArlogs: 'F902-2026',
        ordenCompra: 'OC-2003',
        descripcion: 'Compresores centrífugos embalaje exportación',
        cantidadInicial: 18,
        cantidadDisponible: 18,
        unidad: 'Bultos',
        pesoKg: 2450,
        fechaIngreso: '2026-11-07',
        ubicacionRack: 'ZONA-C11',
        estado: 'EN_BODEGA'
      },
      {
        id: 'KAR-104',
        bodegaId: 'BODEGA_2',
        bodegaNombre: 'Bodega Sur (Puerto Marítimo)',
        clienteId: 'CLI-002',
        cliente: 'Comercial Pacífico DEMO Cía. Ltda.',
        refArlogs: 'I901-2026',
        ordenCompra: 'OC-2004',
        descripcion: 'Lote tubería acero inoxidable 316L',
        cantidadInicial: 60,
        cantidadDisponible: 0,
        unidad: 'Unidades',
        pesoKg: 1320,
        fechaIngreso: '2026-10-25',
        ubicacionRack: 'PATIO-03',
        estado: 'DESPACHADO',
        ultimaGuiaRemision: 'GR-002-0094'
      }
    ];
    this.warehouseItems.set(initialItems);

    const initialMoves: WarehouseMovement[] = [
      {
        id: 'MOV-304',
        itemId: 'KAR-103',
        bodegaNombre: 'Bodega Sur (Puerto Marítimo)',
        tipo: 'INGRESO',
        cantidad: 18,
        guiaRemision: 'ING-B2-0412',
        ordenCompra: 'OC-2003',
        cliente: 'Comercial Pacífico DEMO Cía. Ltda.',
        descripcion: 'Compresores centrífugos embalaje exportación',
        responsable: 'Jorge Zambrano',
        fecha: '2026-11-07 15:10',
        observacion: 'Conteo físico conforme (18 bultos intactos)'
      },
      {
        id: 'MOV-303',
        itemId: 'KAR-104',
        bodegaNombre: 'Bodega Sur (Puerto Marítimo)',
        tipo: 'SALIDA',
        cantidad: 60,
        guiaRemision: 'GR-002-0094',
        ordenCompra: 'OC-2004',
        cliente: 'Comercial Pacífico DEMO Cía. Ltda.',
        descripcion: 'Lote tubería acero inoxidable 316L',
        transporteInland: 'I901-2026 / Placa GSY-4821',
        responsable: 'Jorge Zambrano',
        fecha: '2026-11-06 10:40',
        observacion: 'Despacho total con Guía de Remisión'
      },
      {
        id: 'MOV-302',
        itemId: 'KAR-101',
        bodegaNombre: 'Bodega Norte (GYE)',
        tipo: 'SALIDA',
        cantidad: 16,
        guiaRemision: 'GR-001-0118',
        ordenCompra: 'OC-1001',
        cliente: 'Industrias Andinas DEMO S.A.',
        descripcion: 'Válvulas de control neumático y repuestos industriales',
        transporteInland: 'Inland Local / Placa PBA-9102',
        responsable: 'Jorge Zambrano',
        fecha: '2026-11-05 09:20',
        observacion: 'Retiro parcial solicitado por planta Quito'
      }
    ];
    this.warehouseMovements.set(initialMoves);
  }

  // Set user directly (used by AuthService)
  setCurrentUser(user: RoleUser): void {
    this.currentUser.set(user);
  }

  // Set user role
  setUserRole(role: UserRole): void {
    const user = DEMO_USERS.find(u => u.role === role);
    if (user) {
      this.currentUser.set(user);
    }
  }

  // Update Gerencia Alert Threshold
  setAlertThreshold(days: number): void {
    const user = this.currentUser();
    const role = user.role;
    if (role !== 'gerencia' && role !== 'admin') {
      throw new Error('Solo el perfil de Gerencia o Administrador puede modificar el umbral de alerta.');
    }
    const prev = this.alertThresholdDays();
    this.alertThresholdDays.set(days);
    // Recalculate all jobs with new threshold
    this.jobs.update(list => list.map(job => this.calculateJobMetrics(job, days)));

    if (prev !== days) {
      this.auditService.record({
        usuario: user.nombre,
        email: user.email,
        rol: user.role,
        categoria: 'GERENCIA_SLA',
        entidad: 'SLA_UMBRAL',
        accion: 'Cambio de Umbral de Alerta',
        detalle: `Límite días abiertos: ${prev}d -> ${days}d`
      });
    }
  }

  // Applicable milestones check
  isMilestoneApplicable(service: ServiceType, aduanaPorArlogs: 'SI' | 'NO' | 'N/A', milestoneNum: number): boolean {
    if (service === 'INLAND') {
      return milestoneNum === 1;
    }
    if (service === 'CUSTOMS') {
      return [1, 5, 7, 8, 9, 10].includes(milestoneNum);
    }
    if (service === 'COURIER') {
      return [1, 5, 6, 7, 8, 9, 10].includes(milestoneNum);
    }
    // AEREO, FCL, LCL
    if (aduanaPorArlogs === 'NO') {
      return milestoneNum >= 1 && milestoneNum <= 6;
    }
    return milestoneNum >= 1 && milestoneNum <= 10;
  }

  // Final milestone that determines closure
  getFinalMilestoneNum(service: ServiceType, aduanaPorArlogs: 'SI' | 'NO' | 'N/A'): number {
    if (service === 'INLAND') return 0; // Inland has no closure / duration
    if (aduanaPorArlogs === 'NO' && ['AEREO', 'FCL', 'LCL'].includes(service)) {
      return 6; // Closed when H6 is registered
    }
    return 10; // Closed when H10 is registered
  }

  // Difference in calendar days between two ISO date strings (date2 - date1)
  calculateCalendarDays(date1Str: string | null | undefined, date2Str: string | null | undefined): number | 'N/A' {
    if (!date1Str || !date2Str) return 'N/A';
    const d1 = new Date(date1Str + 'T00:00:00');
    const d2 = new Date(date2Str + 'T00:00:00');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 'N/A';
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  // Comprehensive calculation engine according to Table of Formulas
  calculateJobMetrics(job: ShipmentJob, threshold: number): ShipmentJob {
    const updated = { ...job };
    const s = job.servicio;
    const aduana = job.aduanaPorArlogs;

    // 1. Respuesta shipper (H2 - H1)
    if (this.isMilestoneApplicable(s, aduana, 2) && job.h1_asignacion && job.h2_respuestaShipper) {
      updated.diasRespuestaShipper = this.calculateCalendarDays(job.h1_asignacion, job.h2_respuestaShipper);
    } else {
      updated.diasRespuestaShipper = 'N/A';
    }

    // 2. Alistamiento (H3 - H1)
    if (this.isMilestoneApplicable(s, aduana, 3) && job.h1_asignacion && job.h3_cargaLista) {
      updated.diasAlistamiento = this.calculateCalendarDays(job.h1_asignacion, job.h3_cargaLista);
    } else {
      updated.diasAlistamiento = 'N/A';
    }

    // 3. Coordinación real de origen (H4 - H1)
    if (this.isMilestoneApplicable(s, aduana, 4) && job.h1_asignacion && job.h4_zarpeAtd) {
      updated.diasCoordinacionOrigen = this.calculateCalendarDays(job.h1_asignacion, job.h4_zarpeAtd);
    } else {
      updated.diasCoordinacionOrigen = 'N/A';
    }

    // 4. Tránsito (H5 - H4)
    if (this.isMilestoneApplicable(s, aduana, 4) && this.isMilestoneApplicable(s, aduana, 5) && job.h4_zarpeAtd && job.h5_arriboAta) {
      updated.diasTransito = this.calculateCalendarDays(job.h4_zarpeAtd, job.h5_arriboAta);
    } else {
      updated.diasTransito = 'N/A';
    }

    // 5. Gestión sin aduana (H6 - H1)
    if (aduana === 'NO' && ['AEREO', 'FCL', 'LCL'].includes(s) && job.h1_asignacion && job.h6_pesoRecibido) {
      updated.diasGestionSinAduana = this.calculateCalendarDays(job.h1_asignacion, job.h6_pesoRecibido);
    } else {
      updated.diasGestionSinAduana = 'N/A';
    }

    // 6. Arribo a declaración (H7 - H5)
    if (this.isMilestoneApplicable(s, aduana, 7) && job.h5_arriboAta && job.h7_declaracion) {
      updated.diasArriboDeclaracion = this.calculateCalendarDays(job.h5_arriboAta, job.h7_declaracion);
    } else {
      updated.diasArriboDeclaracion = 'N/A';
    }

    // 7. Declaración a pago (H8 - H7)
    if (this.isMilestoneApplicable(s, aduana, 8) && job.h7_declaracion && job.h8_pagoLiquidacion) {
      updated.diasDeclaracionPago = this.calculateCalendarDays(job.h7_declaracion, job.h8_pagoLiquidacion);
    } else {
      updated.diasDeclaracionPago = 'N/A';
    }

    // 8. Pago a informe (H10 - H8)
    if (this.isMilestoneApplicable(s, aduana, 10) && job.h8_pagoLiquidacion && job.h10_informeSalida) {
      updated.diasPagoInforme = this.calculateCalendarDays(job.h8_pagoLiquidacion, job.h10_informeSalida);
    } else {
      updated.diasPagoInforme = 'N/A';
    }

    // 9. Días en aduana (H9 - H7)
    if (this.isMilestoneApplicable(s, aduana, 9) && job.h7_declaracion && job.h9_salidaAutorizada) {
      updated.diasEnAduana = this.calculateCalendarDays(job.h7_declaracion, job.h9_salidaAutorizada);
    } else {
      updated.diasEnAduana = 'N/A';
    }

    // 10. Ciclo total estrictamente H10 - H1 (N/A si no aplica aduana H10)
    if (this.isMilestoneApplicable(s, aduana, 10) && job.h1_asignacion && job.h10_informeSalida) {
      updated.diasCicloTotal = this.calculateCalendarDays(job.h1_asignacion, job.h10_informeSalida);
    } else {
      updated.diasCicloTotal = 'N/A';
    }

    // 11. Diferencia de peso %
    if (job.pesoOrigen && job.pesoOrigen > 0 && job.pesoRecibido !== null && job.pesoRecibido !== undefined) {
      const diffPct = ((job.pesoRecibido - job.pesoOrigen) / job.pesoOrigen) * 100;
      updated.diferenciaPesoPct = (diffPct > 0 ? '+' : '') + diffPct.toFixed(1) + '%';
    } else {
      updated.diferenciaPesoPct = 'N/A';
    }

    // 12. Estado y Días Abiertos
    if (s === 'INLAND') {
      updated.estado = 'N/A';
      updated.diasAbiertos = 'N/A';
      updated.alertaDemora = false;
      return updated;
    }

    // Closure check
    let isClosed = false;
    if (aduana === 'NO' && ['AEREO', 'FCL', 'LCL'].includes(s)) {
      isClosed = !!job.h6_pesoRecibido;
    } else {
      isClosed = !!job.h10_informeSalida;
    }

    if (isClosed) {
      updated.estado = 'CERRADO';
      updated.diasAbiertos = 'N/A';
      updated.alertaDemora = false;
    } else {
      // Calculate open days (referenceDate - H1)
      if (job.h1_asignacion) {
        const d1 = new Date(job.h1_asignacion + 'T00:00:00');
        const diffDays = Math.round((this.referenceDate.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        updated.diasAbiertos = diffDays >= 0 ? diffDays : 0;
        
        // Strict threshold check: > threshold means REVISAR
        if (updated.diasAbiertos > threshold) {
          updated.estado = 'REVISAR';
          updated.alertaDemora = true;
        } else {
          updated.estado = 'ABIERTO';
          updated.alertaDemora = false;
        }
      } else {
        updated.diasAbiertos = 'N/A';
        updated.estado = 'ABIERTO';
        updated.alertaDemora = false;
      }
    }

    return updated;
  }

  // Filtered jobs accessible by current user role (simulating backend security isolation)
  readonly authorizedJobs = computed(() => {
    const user = this.currentUser();
    const all = this.jobs();

    if (user.role === 'cliente_a' || user.role === 'cliente_b') {
      const targetClientId = user.clienteId || (user.role === 'cliente_a' ? 'CLI-001' : 'CLI-002');
      return all.filter(j => j.clienteId === targetClientId);
    }
    // Admin, Pricing, Operaciones, Gerencia see all jobs
    return all;
  });

  // Strict adversarial test check: Attempt to fetch a single job by Ref
  getJobByRef(refArlogs: string): ShipmentJob | null {
    const user = this.currentUser();
    const job = this.jobs().find(j => j.refArlogs.toLowerCase() === refArlogs.toLowerCase());
    if (!job) return null;

    // Strict client-level data isolation
    if (user.role === 'cliente_a' || user.role === 'cliente_b') {
      const targetClientId = user.clienteId || (user.role === 'cliente_a' ? 'CLI-001' : 'CLI-002');
      if (job.clienteId !== targetClientId) {
        console.warn(`[SECURITY VIOLATION BLOCKED] ${user.role} attempted access to reference ${refArlogs} belonging to ${job.cliente}`);
        return null; // Server returns 403 / 404 forbidden
      }
    }
    return job;
  }

  // Update milestone dates & weights (Operaciones / Gerencia / Admin)
  updateJobMilestones(refArlogs: string, changes: Partial<ShipmentJob>): ShipmentJob {
    const user = this.currentUser();
    if (user.role !== 'operaciones' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('Solo el perfil de Operaciones puede registrar fechas e hitos.');
    }

    let updatedJob: ShipmentJob | null = null;
    const diffs: string[] = [];

    this.jobs.update(list => {
      return list.map(item => {
        if (item.refArlogs === refArlogs) {
          (Object.keys(changes) as (keyof ShipmentJob)[]).forEach(k => {
            const oldVal = item[k] ?? 'vacío';
            const newVal = changes[k] ?? 'vacío';
            if (oldVal !== newVal) {
              diffs.push(`${String(k)}: ${oldVal} -> ${newVal}`);
            }
          });
          const merged = { ...item, ...changes };
          updatedJob = this.calculateJobMetrics(merged, this.alertThresholdDays());
          return updatedJob;
        }
        return item;
      });
    });

    if (!updatedJob) throw new Error(`Trabajo ${refArlogs} no encontrado.`);

    if (diffs.length > 0) {
      this.auditService.record({
        usuario: user.nombre,
        email: user.email,
        rol: user.role,
        categoria: 'OPERACION_HITOS',
        entidad: refArlogs,
        accion: 'Modificación Operativa / Hitos',
        detalle: diffs.slice(0, 4).join(' | ') + (diffs.length > 4 ? ` (+${diffs.length - 4} más)` : '')
      });
    }

    return updatedJob;
  }

  // Create Quotation (Pricing / Gerencia / Admin)
  createQuotation(data: Omit<Quotation, 'id' | 'estado'>): Quotation {
    const role = this.currentUser().role;
    if (role !== 'pricing' && role !== 'gerencia' && role !== 'admin') {
      throw new Error('Solo Pricing puede crear cotizaciones.');
    }

    // Collision-free sequence QR-XXX-26 (never repeats even after deletions)
    const maxSeq = this.quotations().reduce((max, q) => {
      const m = /^QR-(\d+)-\d+$/i.exec(q.id);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 23);
    const qrId = `QR-${(maxSeq + 1).toString().padStart(3, '0')}-26`;

    const newQuote: Quotation = {
      ...data,
      id: qrId,
      estado: 'PENDIENTE'
    };

    this.quotations.update(list => [newQuote, ...list]);
    const user = this.currentUser();
    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'PRICING_QR',
      entidad: qrId,
      accion: 'Nueva Cotización QR',
      detalle: `Cliente: ${data.cliente} | ${data.servicio} | Venta $${data.valorVentaCotizado ?? 0} | OC: ${data.ordenesCompra.join(', ')}`
    });
    return newQuote;
  }

  private nextRefForPrefix(prefix: ServicePrefix): string {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}(\\d+)-2026$`, 'i');
    const maxSeq = this.jobs().reduce((max, j) => {
      const m = regex.exec(j.refArlogs);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 900);
    return `${prefix}${maxSeq + 1}-2026`;
  }

  // Approve Quotation (Pricing / Gerencia / Admin) -> Automatically creates unique ARLOGS Reference
  approveQuotation(quotationId: string): ShipmentJob {
    const role = this.currentUser().role;
    if (role !== 'pricing' && role !== 'gerencia' && role !== 'admin') {
      throw new Error('Solo Pricing puede aprobar cotizaciones.');
    }

    const quote = this.quotations().find(q => q.id === quotationId);
    if (!quote) throw new Error('Cotización no encontrada.');
    if (quote.estado === 'APROBADA') {
      throw new Error('Esta cotización ya fue aprobada y tiene una referencia activa.');
    }

    const newRef = this.nextRefForPrefix(quote.serviceCode);

    // Create the operational shipment job transferring data seamlessly (without re-typing)
    const newJob: ShipmentJob = {
      refArlogs: newRef,
      qrCode: quote.id,
      cliente: quote.cliente,
      clienteId: quote.clienteId,
      servicio: quote.servicio,
      serviceCode: quote.serviceCode,
      aduanaPorArlogs: quote.aduanaPorArlogs,
      shipper: quote.shipper,
      paisOrigen: quote.paisOrigen,
      puertoEmbarque: quote.puertoEmbarque,
      incoterm: quote.incoterm,
      ordenesCompra: quote.ordenesCompra,
      guiaMaster: 'PENDIENTE',
      hawbHbl: 'PENDIENTE',
      contenedor: quote.servicio === 'FCL' ? 'PENDIENTE' : 'N/A',
      pesoOrigen: 150,
      pesoRecibido: null,
      h1_asignacion: this.referenceDate.toISOString().split('T')[0], // Started today
      h2_respuestaShipper: null,
      h3_cargaLista: null,
      h4_zarpeAtd: null,
      h5_arriboAta: null,
      h6_pesoRecibido: null,
      h7_declaracion: null,
      h8_pagoLiquidacion: null,
      h9_salidaAutorizada: null,
      h10_informeSalida: null,
      responsablePago: 'CLIENTE',
      regimenAduana: quote.aduanaPorArlogs === 'SI' ? 'Régimen 10 (Consumo)' : 'N/A',
      distritoAduana: quote.servicio === 'AEREO' ? 'Guayaquil Aéreo' : 'Guayaquil Marítimo',
      aforoAduana: 'Documental',
      valorVentaCotizado: quote.valorVentaCotizado ?? 0,
      costoEstimadoCotizado: quote.costoEstimadoCotizado ?? 0,
      plazoPagoDias: quote.plazoPagoDias ?? 15,
      estadoCobro: 'PENDIENTE_FACTURAR'
    };

    const calculatedJob = this.calculateJobMetrics(newJob, this.alertThresholdDays());

    // Update quote
    this.quotations.update(list => list.map(q => q.id === quotationId ? { ...q, estado: 'APROBADA', refArlogsGenerada: newRef } : q));
    // Add job to operations pool
    this.jobs.update(list => [calculatedJob, ...list]);

    const user = this.currentUser();
    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'PRICING_QR',
      entidad: newRef,
      accion: 'Aprobación de Cotización',
      detalle: `${quotationId} aprobada -> Referencia ${newRef} transferida a Operaciones`
    });

    return calculatedJob;
  }

  // Update Pending Quotation (Pricing / Gerencia / Admin)
  updateQuotation(
    quotationId: string,
    patch: Partial<Omit<Quotation, 'id' | 'estado' | 'refArlogsGenerada'>>
  ): Quotation {
    const user = this.currentUser();
    if (user.role !== 'pricing' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('No tiene permisos para editar cotizaciones.');
    }
    const existing = this.quotations().find(q => q.id === quotationId);
    if (!existing) throw new Error('Cotización no encontrada.');
    if (existing.estado === 'APROBADA') {
      throw new Error('Una cotización aprobada no puede editarse.');
    }

    let updated!: Quotation;
    this.quotations.update(list =>
      list.map(q => {
        if (q.id === quotationId) {
          updated = { ...q, ...patch };
          return updated;
        }
        return q;
      })
    );

    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'PRICING_QR',
      entidad: quotationId,
      accion: 'Edición de Cotización QR',
      detalle: `Cliente: ${updated.cliente} | ${updated.servicio} | Origen: ${updated.puertoEmbarque}`
    });
    return updated;
  }

  // Delete Pending Quotation (Pricing / Gerencia / Admin)
  deleteQuotation(quotationId: string): void {
    const user = this.currentUser();
    if (user.role !== 'pricing' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('No tiene permisos para eliminar cotizaciones.');
    }
    const existing = this.quotations().find(q => q.id === quotationId);
    if (!existing) throw new Error('Cotización no encontrada.');
    if (existing.estado === 'APROBADA') {
      throw new Error('No se puede eliminar una cotización ya aprobada con referencia operativa.');
    }

    this.quotations.update(list => list.filter(q => q.id !== quotationId));
    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'PRICING_QR',
      entidad: quotationId,
      accion: 'Eliminación de Cotización QR',
      detalle: `Cotización de ${existing.cliente} (${existing.servicio}) removida de bandeja`
    });
  }

  // Create Direct Operational Shipment (Operaciones / Gerencia / Admin)
  createDirectShipment(data: {
    clienteId: string;
    cliente: string;
    servicio: ServiceType;
    serviceCode: ServicePrefix;
    aduanaPorArlogs: 'SI' | 'NO' | 'N/A';
    shipper: string;
    paisOrigen: string;
    puertoEmbarque: string;
    incoterm: string;
    ordenesCompra: string[];
    guiaMaster?: string;
    contenedor?: string;
    pesoOrigen?: number;
  }): ShipmentJob {
    const user = this.currentUser();
    if (user.role !== 'operaciones' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('Solo Operaciones, Gerencia o Administración pueden crear embarques.');
    }

    const prefix = data.serviceCode;
    const newRef = this.nextRefForPrefix(prefix);

    const newJob: ShipmentJob = {
      refArlogs: newRef,
      qrCode: 'DIRECTO',
      cliente: data.cliente,
      clienteId: data.clienteId,
      servicio: data.servicio,
      serviceCode: prefix,
      aduanaPorArlogs: data.aduanaPorArlogs,
      shipper: data.shipper.trim(),
      paisOrigen: data.paisOrigen.trim().toUpperCase(),
      puertoEmbarque: data.puertoEmbarque.trim().toUpperCase(),
      incoterm: data.incoterm,
      ordenesCompra: data.ordenesCompra,
      guiaMaster: data.guiaMaster?.trim() || 'PENDIENTE',
      hawbHbl: 'PENDIENTE',
      contenedor: data.servicio === 'FCL' ? (data.contenedor?.trim() || 'PENDIENTE') : 'N/A',
      pesoOrigen: Number(data.pesoOrigen) > 0 ? Number(data.pesoOrigen) : 180,
      pesoRecibido: null,
      h1_asignacion: this.referenceDate.toISOString().split('T')[0],
      h2_respuestaShipper: null,
      h3_cargaLista: null,
      h4_zarpeAtd: null,
      h5_arriboAta: null,
      h6_pesoRecibido: null,
      h7_declaracion: null,
      h8_pagoLiquidacion: null,
      h9_salidaAutorizada: null,
      h10_informeSalida: null,
      responsablePago: 'CLIENTE',
      regimenAduana: data.aduanaPorArlogs === 'SI' ? 'Régimen 10 (Consumo)' : 'N/A',
      distritoAduana: data.servicio === 'AEREO' ? 'Guayaquil Aéreo' : 'Guayaquil Marítimo',
      aforoAduana: 'Documental'
    };

    const calculated = this.calculateJobMetrics(newJob, this.alertThresholdDays());
    this.jobs.update(list => [calculated, ...list]);

    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'OPERACION_HITOS',
      entidad: newRef,
      accion: 'Alta de Embarque Operativo',
      detalle: `Cliente: ${data.cliente} | ${data.servicio} | OC: ${data.ordenesCompra.join(', ')}`
    });
    return calculated;
  }

  // Delete Operational Shipment (Operaciones / Gerencia / Admin)
  deleteShipment(refArlogs: string): void {
    const user = this.currentUser();
    if (user.role !== 'operaciones' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('No tiene permisos para eliminar embarques.');
    }
    const existing = this.jobs().find(j => j.refArlogs === refArlogs);
    if (!existing) throw new Error(`Embarque ${refArlogs} no encontrado.`);

    this.jobs.update(list => list.filter(j => j.refArlogs !== refArlogs));
    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'OPERACION_HITOS',
      entidad: refArlogs,
      accion: 'Eliminación de Embarque',
      detalle: `Referencia ${refArlogs} (${existing.cliente}) eliminada del seguimiento`
    });
  }

  // Contabilidad / Facturación: Issue invoice or register payment without re-typing job data
  updateBilling(
    refArlogs: string,
    billing: {
      facturaNumero: string;
      valorFacturadoReal: number;
      costoReal: number;
      estadoCobro: 'FACTURADA' | 'COBRADA' | 'VENCIDA';
    }
  ): ShipmentJob {
    const user = this.currentUser();
    if (user.role !== 'contabilidad' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('Solo Contabilidad, Gerencia o Administración pueden emitir facturas o cobros.');
    }

    let updatedJob: ShipmentJob | null = null;
    const today = this.referenceDate.toISOString().split('T')[0];

    this.jobs.update(list =>
      list.map(j => {
        if (j.refArlogs !== refArlogs) return j;
        updatedJob = {
          ...j,
          facturaNumero: billing.facturaNumero.trim().toUpperCase(),
          valorFacturadoReal: Number(billing.valorFacturadoReal),
          costoReal: Number(billing.costoReal),
          estadoCobro: billing.estadoCobro,
          fechaFactura: j.fechaFactura ?? today
        };
        return updatedJob;
      })
    );

    if (!updatedJob) throw new Error(`Referencia ${refArlogs} no encontrada.`);
    const profitReal = billing.valorFacturadoReal - billing.costoReal;

    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'FACTURACION',
      entidad: refArlogs,
      accion: billing.estadoCobro === 'COBRADA' ? 'Registro de Cobro' : 'Emisión de Factura',
      detalle: `${billing.facturaNumero} | Facturado $${billing.valorFacturadoReal.toFixed(0)} | Profit $${profitReal.toFixed(0)} | Estado: ${billing.estadoCobro}`
    });

    return updatedJob;
  }

  // Operaciones 3 / Bodegas Kardex: Receipt of cargo by count (no cost valuation)
  registerWarehouseReceipt(input: {
    bodegaId: WarehouseId;
    clienteId: string;
    cliente: string;
    refArlogs: string;
    ordenCompra: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    pesoKg: number;
    ubicacionRack: string;
    observacion?: string;
  }): WarehouseItem {
    const user = this.currentUser();
    if (user.role !== 'bodegas' && user.role !== 'operaciones' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('No tiene permisos para registrar ingresos en bodega.');
    }

    const bodegaNombre = input.bodegaId === 'BODEGA_1' ? 'Bodega Norte (GYE)' : 'Bodega Sur (Puerto Marítimo)';
    const maxItemNum = this.warehouseItems().reduce((max, i) => {
      const m = /^KAR-(\d+)$/i.exec(i.id);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 104);
    const id = `KAR-${maxItemNum + 1}`;
    const today = this.referenceDate.toISOString().split('T')[0];

    const newItem: WarehouseItem = {
      id,
      bodegaId: input.bodegaId,
      bodegaNombre,
      clienteId: input.clienteId,
      cliente: input.cliente,
      refArlogs: input.refArlogs.trim().toUpperCase() || 'DIRECTO-BOD',
      ordenCompra: input.ordenCompra.trim().toUpperCase(),
      descripcion: input.descripcion.trim(),
      cantidadInicial: Number(input.cantidad),
      cantidadDisponible: Number(input.cantidad),
      unidad: input.unidad.trim() || 'Bultos',
      pesoKg: Number(input.pesoKg) || 0,
      fechaIngreso: today,
      ubicacionRack: input.ubicacionRack.trim().toUpperCase() || 'RACK-01',
      estado: 'EN_BODEGA'
    };

    this.warehouseItems.update(list => [newItem, ...list]);
    this.recordWarehouseMovement({
      itemId: id,
      bodegaNombre,
      tipo: 'INGRESO',
      cantidad: newItem.cantidadInicial,
      guiaRemision: `ING-${input.bodegaId === 'BODEGA_1' ? 'B1' : 'B2'}-${maxItemNum + 1}`,
      ordenCompra: newItem.ordenCompra,
      cliente: newItem.cliente,
      descripcion: newItem.descripcion,
      responsable: user.nombre,
      observacion: input.observacion?.trim() || 'Conteo físico e ingreso a Kardex'
    });

    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'BODEGA_KARDEX',
      entidad: `${id} (${newItem.ordenCompra})`,
      accion: 'Ingreso físico a Bodega',
      detalle: `${bodegaNombre} | ${newItem.cantidadInicial} ${newItem.unidad} | ${newItem.descripcion}`
    });

    return newItem;
  }

  // Operaciones 3 / Bodegas Kardex: Issue Guía de Remisión & deduct stock
  dispatchWarehouseItem(input: {
    itemId: string;
    cantidadSalida: number;
    guiaRemision: string;
    transporteInland: string;
    observacion?: string;
  }): WarehouseItem {
    const user = this.currentUser();
    if (user.role !== 'bodegas' && user.role !== 'operaciones' && user.role !== 'gerencia' && user.role !== 'admin') {
      throw new Error('No tiene permisos para emitir guías de remisión.');
    }

    const existing = this.warehouseItems().find(i => i.id === input.itemId);
    if (!existing) throw new Error('Ítem de Kardex no encontrado.');

    const qty = Number(input.cantidadSalida);
    if (!qty || qty <= 0 || qty > existing.cantidadDisponible) {
      throw new Error(`Cantidad inválida. Disponible actual: ${existing.cantidadDisponible} ${existing.unidad}.`);
    }

    const remision = input.guiaRemision.trim().toUpperCase();
    if (!remision) {
      throw new Error('Debe indicar el número de Guía de Remisión.');
    }

    let updatedItem!: WarehouseItem;
    this.warehouseItems.update(list =>
      list.map(i => {
        if (i.id !== input.itemId) return i;
        const remaining = i.cantidadDisponible - qty;
        updatedItem = {
          ...i,
          cantidadDisponible: remaining,
          estado: remaining === 0 ? 'DESPACHADO' : 'PARCIAL',
          ultimaGuiaRemision: remision
        };
        return updatedItem;
      })
    );

    this.recordWarehouseMovement({
      itemId: existing.id,
      bodegaNombre: existing.bodegaNombre,
      tipo: 'SALIDA',
      cantidad: qty,
      guiaRemision: remision,
      ordenCompra: existing.ordenCompra,
      cliente: existing.cliente,
      descripcion: existing.descripcion,
      transporteInland: input.transporteInland.trim() || 'Inland Local',
      responsable: user.nombre,
      observacion: input.observacion?.trim() || 'Despacho con Guía de Remisión'
    });

    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria: 'BODEGA_KARDEX',
      entidad: `${remision} (${existing.ordenCompra})`,
      accion: 'Salida Kardex / Guía de Remisión',
      detalle: `${existing.bodegaNombre} | Retiro: ${qty} ${existing.unidad} (Saldo: ${updatedItem.cantidadDisponible}) | ${input.transporteInland}`
    });

    return updatedItem;
  }

  private recordWarehouseMovement(m: Omit<WarehouseMovement, 'id' | 'fecha'>): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const maxMov = this.warehouseMovements().reduce((max, x) => {
      const match = /^MOV-(\d+)$/i.exec(x.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 304);
    this.warehouseMovements.update(list => [{ id: `MOV-${maxMov + 1}`, fecha, ...m }, ...list]);
  }

  // Excel Export (Lazy-loaded SheetJS to keep initial startup fast)
  async exportToExcel(filteredJobs: ShipmentJob[]): Promise<void> {
    const user = this.currentUser();
    const canSeeFinancials = user.role === 'gerencia' || user.role === 'admin' || user.role === 'contabilidad';
    const rows = filteredJobs.map(j => {
      const base: Record<string, any> = {
        'Ref ARLOGS': j.refArlogs,
        'QR Cotización': j.qrCode,
        'Modalidad': j.servicio,
        'Estado': j.estado,
        'Días Abiertos': j.diasAbiertos,
        'Shipper': j.shipper,
        'País Origen': j.paisOrigen,
        'Puerto': j.puertoEmbarque,
        'Incoterm': j.incoterm,
        'Órdenes de Compra': j.ordenesCompra.join(', '),
        'Guía Máster / BL': j.guiaMaster,
        'HAWB / HBL': j.hawbHbl,
        'Contenedor': j.contenedor,
        'Peso Origen (kg)': j.pesoOrigen ?? 'N/A',
        'Peso Recibido (kg)': j.pesoRecibido ?? 'N/A',
        'Dif. Peso %': j.diferenciaPesoPct,
        'H1 Asignación': j.h1_asignacion ?? 'N/A',
        'H2 Resp. Shipper': j.h2_respuestaShipper ?? 'N/A',
        'H3 Carga Lista': j.h3_cargaLista ?? 'N/A',
        'H4 Zarpe ATD': j.h4_zarpeAtd ?? 'N/A',
        'H5 Arribo ATA': j.h5_arriboAta ?? 'N/A',
        'H6 Peso Recibido': j.h6_pesoRecibido ?? 'N/A',
        'H7 Declaración': j.h7_declaracion ?? 'N/A',
        'H8 Pago': j.h8_pagoLiquidacion ?? 'N/A',
        'H9 Salida Autorizada': j.h9_salidaAutorizada ?? 'N/A',
        'H10 Informe Salida': j.h10_informeSalida ?? 'N/A',
        'Resp. Shipper (2-1)': j.diasRespuestaShipper,
        'Alistamiento (3-1)': j.diasAlistamiento,
        'Coordinación Origen (4-1)': j.diasCoordinacionOrigen,
        'Tránsito (5-4)': j.diasTransito,
        'Gestión Sin Aduana (6-1)': j.diasGestionSinAduana,
        'Arribo a Decl. (7-5)': j.diasArriboDeclaracion,
        'Decl. a Pago (8-7)': j.diasDeclaracionPago,
        'Pago a Inf. (10-8)': j.diasPagoInforme,
        'Días en Aduana (9-7)': j.diasEnAduana,
        'Ciclo Total (10-1)': j.diasCicloTotal
      };

      // Only internal profiles see client name
      if (user.role !== 'cliente_a' && user.role !== 'cliente_b') {
        base['Cliente'] = j.cliente;
      }
      // Strictly never expose pricing/billing figures to Operaciones or Clients
      if (canSeeFinancials) {
        base['Venta Cotizada (USD)'] = j.valorVentaCotizado ?? 0;
        base['Facturado Real (USD)'] = j.valorFacturadoReal ?? 'Pendiente';
        base['Costo Real (USD)'] = j.costoReal ?? 'Pendiente';
        base['Estado Cobro'] = j.estadoCobro ?? 'PENDIENTE_FACTURAR';
      }
      return base;
    });

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Embarques ARLOGS');

    const fileName = `ARLOGS_Embarques_${user.role}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}

