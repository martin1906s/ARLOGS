import { Injectable, signal } from '@angular/core';
import { AuditCategory, AuditEntry, UserRole } from '../models/shipment.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  readonly logs = signal<AuditEntry[]>([
    {
      id: 'AUD-1005',
      timestamp: '2026-11-11 11:20:00',
      usuario: 'Carlos Echeverría',
      email: 'operaciones@arlogs.com',
      rol: 'operaciones',
      categoria: 'OPERACION_HITOS',
      entidad: 'A905-2026',
      accion: 'Actualización de Hito',
      detalle: 'H3 Carga lista: vacío -> 2026-11-08'
    },
    {
      id: 'AUD-1004',
      timestamp: '2026-11-11 09:42:15',
      usuario: 'Ing. Roberto Andrade',
      email: 'andinas@arlogs.com',
      rol: 'cliente_a',
      categoria: 'SESION',
      entidad: 'CLI-001',
      accion: 'Ingreso al Portal',
      detalle: 'Sesión iniciada con aislamiento estricto para Industrias Andinas DEMO S.A.'
    },
    {
      id: 'AUD-1003',
      timestamp: '2026-11-10 16:05:30',
      usuario: 'Ing. Paul Cevallos (ClearMinds / ARLOGS)',
      email: 'gerencia@arlogs.com',
      rol: 'gerencia',
      categoria: 'GERENCIA_SLA',
      entidad: 'SLA_UMBRAL',
      accion: 'Verificación de Umbral',
      detalle: 'Parámetro de alerta verificado en 15 días abiertos'
    },
    {
      id: 'AUD-1002',
      timestamp: '2026-11-09 14:18:10',
      usuario: 'Andrea Morales',
      email: 'pricing@arlogs.com',
      rol: 'pricing',
      categoria: 'PRICING_QR',
      entidad: 'QR-022-26',
      accion: 'Creación de Cotización',
      detalle: 'Cliente: Industrias Andinas DEMO S.A. | AEREO | OC-1008, OC-1009'
    },
    {
      id: 'AUD-1001',
      timestamp: '2026-11-02 10:15:00',
      usuario: 'Martín Simbaña',
      email: 'admin@arlogs.com',
      rol: 'admin',
      categoria: 'CREDENCIAL_CLIENTE',
      entidad: 'pacifico@arlogs.com',
      accion: 'Emisión de Credenciales',
      detalle: 'Acceso de portal emitido para Comercial Pacífico DEMO Cía. Ltda. (CLI-002)'
    }
  ]);

  record(entry: {
    usuario: string;
    email: string;
    rol: UserRole;
    categoria: AuditCategory;
    entidad: string;
    accion: string;
    detalle: string;
  }): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newEntry: AuditEntry = {
      id: `AUD-${1006 + this.logs().length}`,
      timestamp: ts,
      ...entry
    };

    this.logs.update(list => [newEntry, ...list]);
  }

  exportAuditExcel(entries: AuditEntry[]): void {
    const rows = entries.map(e => ({
      'ID Evento': e.id,
      'Fecha y Hora': e.timestamp,
      'Usuario': e.usuario,
      'Correo': e.email,
      'Rol': e.rol,
      'Categoría': e.categoria,
      'Entidad / Ref': e.entidad,
      'Acción': e.accion,
      'Detalle del Cambio': e.detalle
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria ARLOGS');
    XLSX.writeFile(wb, `ARLOGS_Auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

