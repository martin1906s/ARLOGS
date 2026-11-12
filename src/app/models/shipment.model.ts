export type ServiceType = 'AEREO' | 'FCL' | 'LCL' | 'CUSTOMS' | 'COURIER' | 'INLAND';
export type ServicePrefix = 'A' | 'F' | 'L' | 'C' | 'AC' | 'I';
export type UserRole = 'admin' | 'pricing' | 'operaciones' | 'gerencia' | 'cliente_a' | 'cliente_b';
export type ScreenId = 'gerencia' | 'operaciones' | 'pricing' | 'cliente' | 'admin';
export type JobStatus = 'ABIERTO' | 'REVISAR' | 'CERRADO' | 'N/A';

export interface Quotation {
  id: string; // e.g. QR-022-26
  clienteId: string;
  cliente: string;
  servicio: ServiceType;
  serviceCode: ServicePrefix;
  shipper: string;
  paisOrigen: string;
  puertoEmbarque: string;
  incoterm: string;
  ordenesCompra: string[];
  aduanaPorArlogs: 'SI' | 'NO' | 'N/A';
  fechaCotizacion: string;
  estado: 'PENDIENTE' | 'APROBADA';
  refArlogsGenerada?: string;
}

export interface ShipmentJob {
  refArlogs: string;
  qrCode: string;
  cliente: string;
  clienteId: string;
  servicio: ServiceType;
  serviceCode: ServicePrefix;
  aduanaPorArlogs: 'SI' | 'NO' | 'N/A';
  shipper: string;
  paisOrigen: string;
  puertoEmbarque: string;
  incoterm: string;
  ordenesCompra: string[];
  guiaMaster: string;
  hawbHbl: string;
  contenedor: string;
  pesoOrigen: number | null;
  pesoRecibido: number | null;

  // Hitos temporales 1 a 10
  h1_asignacion: string | null;
  h2_respuestaShipper: string | null;
  h3_cargaLista: string | null;
  h4_zarpeAtd: string | null;
  h5_arriboAta: string | null;
  h6_pesoRecibido: string | null;
  h7_declaracion: string | null;
  h8_pagoLiquidacion: string | null;
  h9_salidaAutorizada: string | null;
  h10_informeSalida: string | null;

  // Metadatos operativos y aduaneros
  responsablePago?: string; // 'CLIENTE' | 'ARLOGS' | 'AGENTE'
  regimenAduana?: string;
  distritoAduana?: string;
  aforoAduana?: string;

  // Métricas calculadas
  diasRespuestaShipper?: number | 'N/A';
  diasAlistamiento?: number | 'N/A';
  diasCoordinacionOrigen?: number | 'N/A';
  diasTransito?: number | 'N/A';
  diasGestionSinAduana?: number | 'N/A';
  diasArriboDeclaracion?: number | 'N/A';
  diasDeclaracionPago?: number | 'N/A';
  diasPagoInforme?: number | 'N/A';
  diasEnAduana?: number | 'N/A';
  diasCicloTotal?: number | 'N/A';
  diasAbiertos?: number | 'N/A';
  diferenciaPesoPct?: string | 'N/A';
  estado?: JobStatus;
  alertaDemora?: boolean;
}

export interface MilestoneDefinition {
  num: number;
  codigo: string;
  nombre: string;
  etapa: 'Origen' | 'Destino' | 'Aduana';
  responsableDefault: string;
  field: keyof ShipmentJob;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  { num: 1, codigo: 'H1', nombre: 'Asignación del trabajo', etapa: 'Origen', responsableDefault: 'ARLOGS Operaciones', field: 'h1_asignacion' },
  { num: 2, codigo: 'H2', nombre: 'Primera respuesta shipper', etapa: 'Origen', responsableDefault: 'Shipper (Proveedor)', field: 'h2_respuestaShipper' },
  { num: 3, codigo: 'H3', nombre: 'Carga lista / alistamiento', etapa: 'Origen', responsableDefault: 'Shipper (Proveedor)', field: 'h3_cargaLista' },
  { num: 4, codigo: 'H4', nombre: 'Zarpe / Salida real (ATD)', etapa: 'Origen', responsableDefault: 'Línea de transporte / Forwarder', field: 'h4_zarpeAtd' },
  { num: 5, codigo: 'H5', nombre: 'Arribo real (ATA)', etapa: 'Destino', responsableDefault: 'Línea de transporte', field: 'h5_arriboAta' },
  { num: 6, codigo: 'H6', nombre: 'Peso recibido en destino', etapa: 'Destino', responsableDefault: 'Terminal / Bodega', field: 'h6_pesoRecibido' },
  { num: 7, codigo: 'H7', nombre: 'Declaración (DAI / DAE)', etapa: 'Aduana', responsableDefault: 'Agente de Aduana ARLOGS', field: 'h7_declaracion' },
  { num: 8, codigo: 'H8', nombre: 'Pago liquidación', etapa: 'Aduana', responsableDefault: 'Responsable de pago', field: 'h8_pagoLiquidacion' },
  { num: 9, codigo: 'H9', nombre: 'Salida autorizada', etapa: 'Aduana', responsableDefault: 'Aduana (SENAE)', field: 'h9_salidaAutorizada' },
  { num: 10, codigo: 'H10', nombre: 'Informe de salida', etapa: 'Aduana', responsableDefault: 'ARLOGS Operaciones', field: 'h10_informeSalida' }
];

export interface ScreenDefinition {
  id: ScreenId;
  label: string;
  icon: string;
  description: string;
}

export const SCREEN_DEFINITIONS: ScreenDefinition[] = [
  { id: 'gerencia', label: 'Gerencia', icon: 'bi-pie-chart-fill', description: 'Dashboard ejecutivo, KPIs, cuellos de botella y umbral SLA' },
  { id: 'operaciones', label: 'Operaciones', icon: 'bi-layers-fill', description: 'Control de embarques, edición de hitos H1-H10 y pesos' },
  { id: 'pricing', label: 'Pricing', icon: 'bi-tag-fill', description: 'Cotizaciones QR, aprobación comercial y activación ARLOGS' },
  { id: 'cliente', label: 'Portal Clientes', icon: 'bi-building', description: 'Seguimiento aislado por empresa cliente y órdenes de compra' },
  { id: 'admin', label: 'Administración', icon: 'bi-shield-lock-fill', description: 'CRUD de usuarios, asignación de roles y matriz de accesos' }
];

export interface RoleDefinition {
  role: UserRole;
  label: string;
  summary: string;
  tasks: string[];
  defaultScreens: ScreenId[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    role: 'admin',
    label: 'Administrador',
    summary: 'Gobierno total de accesos, cuentas de usuario y auditoría de roles del sistema.',
    tasks: [
      'Crear, editar, activar/desactivar y eliminar usuarios',
      'Emitir, rotar y controlar credenciales de acceso para clientes',
      'Asignar roles operativos o de cliente y configurar permisos por pantalla',
      'Auditar modificaciones de fechas H1-H10, umbrales SLA y sesiones'
    ],
    defaultScreens: ['admin', 'gerencia', 'operaciones', 'pricing', 'cliente']
  },
  gerencia: {
    role: 'gerencia',
    label: 'Gerencia',
    summary: 'Supervisión estratégica de tiempos, alertas SLA y atribución de demoras.',
    tasks: [
      'Configurar el umbral dinámico de alerta (días abiertos)',
      'Monitorear tiempos promedio por tramo y modalidad',
      'Identificar cuellos de botella entre Shipper, Aduana y ARLOGS',
      'Consultar operación global y exportar reportes gerenciales'
    ],
    defaultScreens: ['gerencia', 'operaciones', 'pricing']
  },
  operaciones: {
    role: 'operaciones',
    label: 'Operaciones',
    summary: 'Ejecución y trazabilidad diaria de los 10 hitos operativos por embarque.',
    tasks: [
      'Registrar y actualizar fechas de hitos H1 a H10',
      'Controlar peso de origen vs. peso recibido en destino',
      'Completar metadatos aduaneros (régimen, distrito, aforo)',
      'Gestionar alertas de embarques marcados como REVISAR'
    ],
    defaultScreens: ['operaciones', 'gerencia']
  },
  pricing: {
    role: 'pricing',
    label: 'Pricing',
    summary: 'Gestión comercial de cotizaciones QR y apertura de referencias operativas.',
    tasks: [
      'Emitir nuevas cotizaciones con código único QR',
      'Aprobar cotizaciones aceptadas por el cliente',
      'Generar automáticamente referencias únicas ARLOGS (A, F, L, C, AC, I)'
    ],
    defaultScreens: ['pricing', 'operaciones']
  },
  cliente_a: {
    role: 'cliente_a',
    label: 'Cliente A (Industrias Andinas)',
    summary: 'Consulta exclusiva y aislada de embarques pertenecientes a Industrias Andinas.',
    tasks: [
      'Visualizar avance de hitos de sus propias referencias',
      'Filtrar embarques por mes, shipper, OC, modalidad o Incoterm',
      'Exportar su propio historial de carga sin acceso a terceros'
    ],
    defaultScreens: ['cliente']
  },
  cliente_b: {
    role: 'cliente_b',
    label: 'Cliente B (Comercial Pacífico)',
    summary: 'Consulta exclusiva y aislada de embarques pertenecientes a Comercial Pacífico.',
    tasks: [
      'Visualizar avance de hitos de sus propias referencias',
      'Filtrar embarques por mes, shipper, OC, modalidad o Incoterm',
      'Exportar su propio historial de carga sin acceso a terceros'
    ],
    defaultScreens: ['cliente']
  }
};

export type AuditCategory =
  | 'OPERACION_HITOS'
  | 'PRICING_QR'
  | 'GERENCIA_SLA'
  | 'CREDENCIAL_CLIENTE'
  | 'SEGURIDAD_ROLES'
  | 'SESION';

export interface AuditEntry {
  id: string;
  timestamp: string;
  usuario: string;
  email: string;
  rol: UserRole;
  categoria: AuditCategory;
  entidad: string;
  accion: string;
  detalle: string;
}

export interface RoleUser {
  id: string;
  role: UserRole;
  nombre: string;
  email: string;
  password: string;
  activo: boolean;
  cargo: string;
  clienteId?: string;
  clienteNombre?: string;
  avatarIcon: string;
  descripcion: string;
  ultimoAcceso?: string;
  credencialEmitidaEn?: string;
  credencialEmitidaPor?: string;
}

export const DEMO_USERS: RoleUser[] = [
  {
    id: 'user-admin',
    role: 'admin',
    nombre: 'Martín Simbaña',
    email: 'admin@arlogs.com',
    password: 'admin123',
    activo: true,
    cargo: 'Administrador de Plataforma y Seguridad',
    avatarIcon: 'bi-shield-lock-fill',
    descripcion: 'Administración de usuarios, asignación de roles y permisos de acceso a pantallas.'
  },
  {
    id: 'user-gerencia',
    role: 'gerencia',
    nombre: 'Ing. Paul Cevallos (ARLOGS)',
    email: 'gerencia@arlogs.com',
    password: 'gerencia123',
    activo: true,
    cargo: 'Gerencia General',
    avatarIcon: 'bi-speedometer2',
    descripcion: 'Monitoreo gerencial, configuración de umbral de alerta en días abiertos, cuellos de botella y auditoría.'
  },
  {
    id: 'user-operaciones',
    role: 'operaciones',
    nombre: 'Carlos Echeverría',
    email: 'operaciones@arlogs.com',
    password: 'ops123',
    activo: true,
    cargo: 'Coordinador de Operaciones Logísticas',
    avatarIcon: 'bi-gear-wide-connected',
    descripcion: 'Gestiona hitos temporales (H1-H10), pesos y documentos de los embarques en curso.'
  },
  {
    id: 'user-pricing',
    role: 'pricing',
    nombre: 'Andrea Morales',
    email: 'pricing@arlogs.com',
    password: 'pricing123',
    activo: true,
    cargo: 'Especialista de Pricing y Cotizaciones',
    avatarIcon: 'bi-tag-fill',
    descripcion: 'Genera cotizaciones QR, aprueba pedidos y activa códigos ARLOGS.'
  },
  {
    id: 'user-cliente-a',
    role: 'cliente_a',
    nombre: 'Ing. Roberto Andrade',
    email: 'andinas@arlogs.com',
    password: 'cliente123',
    activo: true,
    cargo: 'Jefe de Importaciones - Industrias Andinas S.A.',
    clienteId: 'CLI-001',
    clienteNombre: 'Industrias Andinas S.A.',
    avatarIcon: 'bi-building-fill',
    descripcion: 'Portal exclusivo: consulta embarques de Industrias Andinas, órdenes de compra y seguimiento.',
    ultimoAcceso: '2026-11-11 09:42',
    credencialEmitidaEn: '2026-11-01 08:30',
    credencialEmitidaPor: 'Martín Simbaña'
  },
  {
    id: 'user-cliente-b',
    role: 'cliente_b',
    nombre: 'Lic. Mariana Solís',
    email: 'pacifico@arlogs.com',
    password: 'cliente123',
    activo: true,
    cargo: 'Gerente de Cadena de Suministro - Comercial Pacífico Cía. Ltda.',
    clienteId: 'CLI-002',
    clienteNombre: 'Comercial Pacífico Cía. Ltda.',
    avatarIcon: 'bi-box-seam-fill',
    descripcion: 'Portal exclusivo: consulta embarques de Comercial Pacífico con total confidencialidad.',
    ultimoAcceso: '2026-11-10 17:15',
    credencialEmitidaEn: '2026-11-02 10:15',
    credencialEmitidaPor: 'Martín Simbaña'
  }
];

