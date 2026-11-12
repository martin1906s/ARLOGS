import { Injectable, inject, signal, computed } from '@angular/core';
import {
  DEMO_USERS,
  ROLE_DEFINITIONS,
  RoleDefinition,
  RoleUser,
  SCREEN_DEFINITIONS,
  ScreenId,
  UserRole
} from '../models/shipment.model';
import { ShipmentService } from './shipment.service';
import { AuditService } from './audit.service';

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: RoleUser;
  defaultScreen?: ScreenId;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private shipmentService = inject(ShipmentService);
  private auditService = inject(AuditService);

  readonly isLoggedIn = signal<boolean>(false);
  readonly registeredUsers = signal<RoleUser[]>(DEMO_USERS.map(u => ({ ...u })));
  readonly currentUser = this.shipmentService.currentUser;

  // Editable screen permissions per role
  readonly roleScreenMatrix = signal<Record<UserRole, ScreenId[]>>({
    admin: [...ROLE_DEFINITIONS.admin.defaultScreens],
    gerencia: [...ROLE_DEFINITIONS.gerencia.defaultScreens],
    operaciones: [...ROLE_DEFINITIONS.operaciones.defaultScreens],
    pricing: [...ROLE_DEFINITIONS.pricing.defaultScreens],
    contabilidad: [...ROLE_DEFINITIONS.contabilidad.defaultScreens],
    bodegas: [...ROLE_DEFINITIONS.bodegas.defaultScreens],
    cliente_a: [...ROLE_DEFINITIONS.cliente_a.defaultScreens],
    cliente_b: [...ROLE_DEFINITIONS.cliente_b.defaultScreens]
  });

  readonly screenDefinitions = SCREEN_DEFINITIONS;
  readonly roleDefinitions = ROLE_DEFINITIONS;

  readonly allowedScreensForCurrentUser = computed<ScreenId[]>(() => {
    const role = this.currentUser().role;
    return this.roleScreenMatrix()[role] ?? ['cliente'];
  });

  readonly clientUsers = computed<RoleUser[]>(() =>
    this.registeredUsers().filter(u => u.role === 'cliente_a' || u.role === 'cliente_b')
  );

  // Validates credentials and prepares session without unmounting Login until 3D animation completes
  authenticateCredentials(email: string, password: string): LoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.registeredUsers().find(
      u => u.email.toLowerCase() === normalizedEmail
    );

    if (!user || user.password !== password) {
      this.auditService.record({
        usuario: user?.nombre ?? 'Desconocido',
        email: normalizedEmail || 'vacío',
        rol: user?.role ?? 'cliente_a',
        categoria: 'SESION',
        entidad: normalizedEmail || 'LOGIN',
        accion: 'Intento Fallido de Ingreso',
        detalle: 'Contraseña incorrecta o correo no registrado'
      });
      return { ok: false, error: 'Credenciales incorrectas. Verifica tu correo y contraseña.' };
    }

    if (!user.activo) {
      this.auditService.record({
        usuario: user.nombre,
        email: user.email,
        rol: user.role,
        categoria: 'SESION',
        entidad: user.email,
        accion: 'Acceso Bloqueado (Cuenta Suspendida)',
        detalle: 'Intento de inicio de sesión con cuenta desactivada'
      });
      return { ok: false, error: 'Esta cuenta está desactivada. Contacta al Administrador.' };
    }

    const allowed = this.getAllowedScreens(user.role);
    if (allowed.length === 0) {
      return { ok: false, error: 'Este rol no tiene pantallas asignadas actualmente.' };
    }

    const nowTs = this.formatNow();
    const updatedUser: RoleUser = { ...user, ultimoAcceso: nowTs };
    this.registeredUsers.update(list =>
      list.map(u => (u.id === user.id ? updatedUser : u))
    );

    this.shipmentService.setCurrentUser(updatedUser);

    this.auditService.record({
      usuario: updatedUser.nombre,
      email: updatedUser.email,
      rol: updatedUser.role,
      categoria: 'SESION',
      entidad: updatedUser.clienteId ?? updatedUser.email,
      accion: 'Inicio de Sesión Exitoso',
      detalle: `Acceso concedido como ${ROLE_DEFINITIONS[updatedUser.role].label}`
    });

    return {
      ok: true,
      user: updatedUser,
      defaultScreen: this.getDefaultScreen(updatedUser.role)
    };
  }

  commitSession(): void {
    this.isLoggedIn.set(true);
  }

  login(email: string, password: string): LoginResult {
    const res = this.authenticateCredentials(email, password);
    if (res.ok) {
      this.commitSession();
    }
    return res;
  }

  quickDemoLogin(role: UserRole): LoginResult {
    const user = this.registeredUsers().find(u => u.role === role && u.activo)
      ?? this.registeredUsers().find(u => u.role === role);
    if (!user) {
      return { ok: false, error: 'No existe un usuario activo para ese rol.' };
    }
    return this.authenticateCredentials(user.email, user.password);
  }

  switchActiveRole(role: UserRole): ScreenId {
    const user = this.registeredUsers().find(u => u.role === role && u.activo)
      ?? this.registeredUsers().find(u => u.role === role);
    if (user) {
      this.shipmentService.setCurrentUser(user);
    } else {
      this.shipmentService.setUserRole(role);
    }
    return this.getDefaultScreen(role);
  }

  logout(): void {
    const actor = this.currentUser();
    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: 'SESION',
      entidad: actor.email,
      accion: 'Cierre de Sesión',
      detalle: 'Sesión finalizada manualmente por el usuario'
    });
    this.isLoggedIn.set(false);
  }

  hasScreenAccess(role: UserRole, screen: ScreenId): boolean {
    const allowed = this.roleScreenMatrix()[role] ?? [];
    return allowed.includes(screen);
  }

  getAllowedScreens(role: UserRole): ScreenId[] {
    return this.roleScreenMatrix()[role] ?? [];
  }

  getDefaultScreen(role: UserRole): ScreenId {
    const allowed = this.getAllowedScreens(role);
    if (allowed.length === 0) return 'cliente';
    if (role === 'admin' && allowed.includes('admin')) return 'admin';
    if (role === 'gerencia' && allowed.includes('gerencia')) return 'gerencia';
    if (role === 'operaciones' && allowed.includes('operaciones')) return 'operaciones';
    if (role === 'pricing' && allowed.includes('pricing')) return 'pricing';
    if (role === 'contabilidad' && allowed.includes('facturacion')) return 'facturacion';
    if (role === 'bodegas' && allowed.includes('bodegas')) return 'bodegas';
    if ((role === 'cliente_a' || role === 'cliente_b') && allowed.includes('cliente')) return 'cliente';
    return allowed[0];
  }

  getRoleDefinition(role: UserRole): RoleDefinition {
    return ROLE_DEFINITIONS[role];
  }

  toggleRoleScreenAccess(role: UserRole, screen: ScreenId): { ok: boolean; error?: string } {
    if (role === 'admin' && screen === 'admin') {
      return { ok: false, error: 'El rol Administrador debe conservar acceso al módulo de Administración.' };
    }

    let enabled = false;
    this.roleScreenMatrix.update(matrix => {
      const current = matrix[role] ?? [];
      const exists = current.includes(screen);
      enabled = !exists;
      const next = exists
        ? current.filter(s => s !== screen)
        : [...current, screen];
      return { ...matrix, [role]: next };
    });

    const actor = this.currentUser();
    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: 'SEGURIDAD_ROLES',
      entidad: `${role} -> ${screen}`,
      accion: 'Actualización Matriz RBAC',
      detalle: `Pantalla '${screen}' ${enabled ? 'HABILITADA' : 'REVOCADA'} para rol ${ROLE_DEFINITIONS[role].label}`
    });

    return { ok: true };
  }

  // Client Credential Issuance & Password Rotation
  issueClientCredentials(input: {
    nombre: string;
    email: string;
    cargo: string;
    clienteId: 'CLI-001' | 'CLI-002';
  }): { ok: boolean; error?: string; user?: RoleUser } {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!input.nombre.trim() || !cleanEmail) {
      return { ok: false, error: 'Nombre del contacto y correo corporativo son obligatorios.' };
    }
    if (this.registeredUsers().some(u => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, error: `Ya existe una credencial para el correo ${cleanEmail}.` };
    }

    const generatedPassword = this.generateTempPassword(input.clienteId);
    const role: UserRole = input.clienteId === 'CLI-001' ? 'cliente_a' : 'cliente_b';
    const clienteNombre =
      input.clienteId === 'CLI-001'
        ? 'Industrias Andinas DEMO S.A.'
        : 'Comercial Pacífico DEMO Cía. Ltda.';
    const actor = this.currentUser();
    const nowTs = this.formatNow();

    const newClientUser: RoleUser = {
      id: `user-cli-${Date.now()}`,
      role,
      nombre: input.nombre.trim(),
      email: cleanEmail,
      password: generatedPassword,
      activo: true,
      cargo: input.cargo.trim() || `Portal Cliente - ${clienteNombre}`,
      clienteId: input.clienteId,
      clienteNombre,
      avatarIcon: input.clienteId === 'CLI-001' ? 'bi-building-fill' : 'bi-box-seam-fill',
      descripcion: ROLE_DEFINITIONS[role].summary,
      credencialEmitidaEn: nowTs,
      credencialEmitidaPor: actor.nombre
    };

    this.registeredUsers.update(list => [newClientUser, ...list]);

    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: 'CREDENCIAL_CLIENTE',
      entidad: cleanEmail,
      accion: 'Emisión de Credencial Cliente',
      detalle: `Acceso emitido para ${clienteNombre} (${input.clienteId}) | Contacto: ${newClientUser.nombre}`
    });

    return { ok: true, user: newClientUser };
  }

  regenerateClientPassword(userId: string): { ok: boolean; error?: string; newPassword?: string } {
    const target = this.registeredUsers().find(u => u.id === userId);
    if (!target) return { ok: false, error: 'Cuenta de cliente no encontrada.' };

    const newPassword = this.generateTempPassword(target.clienteId || 'CLI');
    const actor = this.currentUser();
    const nowTs = this.formatNow();

    this.registeredUsers.update(list =>
      list.map(u =>
        u.id === userId
          ? {
              ...u,
              password: newPassword,
              credencialEmitidaEn: nowTs,
              credencialEmitidaPor: actor.nombre
            }
          : u
      )
    );

    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: 'CREDENCIAL_CLIENTE',
      entidad: target.email,
      accion: 'Rotación de Clave Cliente',
      detalle: `Nueva clave temporal generada para ${target.clienteNombre || target.nombre}`
    });

    return { ok: true, newPassword };
  }

  // User CRUD operations
  createUser(input: {
    nombre: string;
    email: string;
    password: string;
    cargo: string;
    role: UserRole;
    activo: boolean;
    clienteId?: string;
  }): { ok: boolean; error?: string; user?: RoleUser } {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!input.nombre.trim() || !cleanEmail || !input.password.trim()) {
      return { ok: false, error: 'Nombre, correo y contraseña son obligatorios.' };
    }

    const exists = this.registeredUsers().some(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { ok: false, error: `Ya existe un usuario registrado con el correo ${cleanEmail}.` };
    }

    const roleMeta = this.getDefaultMetaForRole(input.role, input.clienteId);
    const actor = this.currentUser();
    const newUser: RoleUser = {
      id: `user-${Date.now()}`,
      role: input.role,
      nombre: input.nombre.trim(),
      email: cleanEmail,
      password: input.password,
      activo: input.activo,
      cargo: input.cargo.trim() || ROLE_DEFINITIONS[input.role].label,
      avatarIcon: roleMeta.avatarIcon,
      descripcion: ROLE_DEFINITIONS[input.role].summary,
      ...(roleMeta.clienteId
        ? {
            clienteId: roleMeta.clienteId,
            clienteNombre: roleMeta.clienteNombre,
            credencialEmitidaEn: this.formatNow(),
            credencialEmitidaPor: actor.nombre
          }
        : {})
    };

    this.registeredUsers.update(list => [newUser, ...list]);

    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: roleMeta.clienteId ? 'CREDENCIAL_CLIENTE' : 'SEGURIDAD_ROLES',
      entidad: cleanEmail,
      accion: 'Creación de Usuario',
      detalle: `Usuario ${newUser.nombre} creado con rol ${ROLE_DEFINITIONS[input.role].label}`
    });

    return { ok: true, user: newUser };
  }

  updateUser(
    id: string,
    changes: {
      nombre: string;
      email: string;
      password: string;
      cargo: string;
      role: UserRole;
      activo: boolean;
      clienteId?: string;
    }
  ): { ok: boolean; error?: string } {
    const cleanEmail = changes.email.trim().toLowerCase();
    if (!changes.nombre.trim() || !cleanEmail || !changes.password.trim()) {
      return { ok: false, error: 'Nombre, correo y contraseña son obligatorios.' };
    }

    const duplicate = this.registeredUsers().some(
      u => u.id !== id && u.email.toLowerCase() === cleanEmail
    );
    if (duplicate) {
      return { ok: false, error: `El correo ${cleanEmail} ya pertenece a otro usuario.` };
    }

    const currentActiveId = this.currentUser().id;
    if (id === currentActiveId && !changes.activo) {
      return { ok: false, error: 'No puedes desactivar tu propia sesión activa.' };
    }

    const previous = this.registeredUsers().find(u => u.id === id);
    const roleMeta = this.getDefaultMetaForRole(changes.role, changes.clienteId);
    let updatedRef: RoleUser | null = null;

    this.registeredUsers.update(list =>
      list.map(u => {
        if (u.id !== id) return u;
        const merged: RoleUser = {
          ...u,
          nombre: changes.nombre.trim(),
          email: cleanEmail,
          password: changes.password,
          cargo: changes.cargo.trim() || ROLE_DEFINITIONS[changes.role].label,
          role: changes.role,
          activo: changes.activo,
          avatarIcon: roleMeta.avatarIcon,
          descripcion: ROLE_DEFINITIONS[changes.role].summary,
          clienteId: roleMeta.clienteId,
          clienteNombre: roleMeta.clienteNombre
        };
        updatedRef = merged;
        return merged;
      })
    );

    if (updatedRef && id === currentActiveId) {
      this.shipmentService.setCurrentUser(updatedRef);
    }

    const actor = this.currentUser();
    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: 'SEGURIDAD_ROLES',
      entidad: cleanEmail,
      accion: 'Edición de Usuario / Rol',
      detalle: `Rol: ${previous?.role ?? '?'} -> ${changes.role} | Estado: ${changes.activo ? 'Activo' : 'Suspendido'}`
    });

    return { ok: true };
  }

  toggleUserActive(id: string): { ok: boolean; error?: string } {
    const target = this.registeredUsers().find(u => u.id === id);
    if (!target) return { ok: false, error: 'Usuario no encontrado.' };
    if (target.id === this.currentUser().id) {
      return { ok: false, error: 'No puedes desactivar tu propia cuenta mientras está en uso.' };
    }

    const nextActive = !target.activo;
    this.registeredUsers.update(list =>
      list.map(u => (u.id === id ? { ...u, activo: nextActive } : u))
    );

    const actor = this.currentUser();
    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: target.clienteId ? 'CREDENCIAL_CLIENTE' : 'SEGURIDAD_ROLES',
      entidad: target.email,
      accion: nextActive ? 'Activación de Cuenta' : 'Suspensión de Cuenta',
      detalle: `Estado actualizado a ${nextActive ? 'ACTIVO' : 'SUSPENDIDO'}`
    });

    return { ok: true };
  }

  deleteUser(id: string): { ok: boolean; error?: string } {
    if (id === this.currentUser().id) {
      return { ok: false, error: 'No puedes eliminar el usuario con sesión activa.' };
    }
    const target = this.registeredUsers().find(u => u.id === id);
    if (!target) return { ok: false, error: 'Usuario no encontrado.' };

    if (target.role === 'admin') {
      const adminCount = this.registeredUsers().filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { ok: false, error: 'Debe existir al menos un Administrador en el sistema.' };
      }
    }

    this.registeredUsers.update(list => list.filter(u => u.id !== id));

    const actor = this.currentUser();
    this.auditService.record({
      usuario: actor.nombre,
      email: actor.email,
      rol: actor.role,
      categoria: 'SEGURIDAD_ROLES',
      entidad: target.email,
      accion: 'Eliminación de Usuario',
      detalle: `Cuenta ${target.nombre} (${ROLE_DEFINITIONS[target.role].label}) eliminada`
    });

    return { ok: true };
  }

  private generateTempPassword(prefix: string): string {
    const clean = prefix.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase() || 'ARLG';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${clean}-${rand}*26`;
  }

  private formatNow(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  private getDefaultMetaForRole(
    role: UserRole,
    explicitClientId?: string
  ): { avatarIcon: string; clienteId?: string; clienteNombre?: string } {
    switch (role) {
      case 'admin':
        return { avatarIcon: 'bi-shield-lock-fill' };
      case 'gerencia':
        return { avatarIcon: 'bi-speedometer2' };
      case 'operaciones':
        return { avatarIcon: 'bi-gear-wide-connected' };
      case 'pricing':
        return { avatarIcon: 'bi-tag-fill' };
      case 'contabilidad':
        return { avatarIcon: 'bi-receipt-cutoff' };
      case 'bodegas':
        return { avatarIcon: 'bi-building-fill-gear' };
      case 'cliente_a': {
        const cid = explicitClientId || 'CLI-001';
        return {
          avatarIcon: 'bi-building-fill',
          clienteId: cid,
          clienteNombre: cid === 'CLI-002' ? 'Comercial Pacífico DEMO Cía. Ltda.' : 'Industrias Andinas DEMO S.A.'
        };
      }
      case 'cliente_b': {
        const cid = explicitClientId || 'CLI-002';
        return {
          avatarIcon: 'bi-box-seam-fill',
          clienteId: cid,
          clienteNombre: cid === 'CLI-001' ? 'Industrias Andinas DEMO S.A.' : 'Comercial Pacífico DEMO Cía. Ltda.'
        };
      }
    }
  }
}
