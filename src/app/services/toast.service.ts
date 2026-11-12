import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastItem[]>([]);

  show(type: ToastType, title: string, message: string, durationMs = 4200): void {
    const id = this.nextId++;
    const item: ToastItem = { id, type, title, message };

    this.toasts.update(list => [item, ...list].slice(0, 4));

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(title: string, message: string): void {
    this.show('success', title, message, 4200);
  }

  error(title: string, message: string): void {
    this.show('error', title, message, 5200);
  }

  warning(title: string, message: string): void {
    this.show('warning', title, message, 4600);
  }

  info(title: string, message: string): void {
    this.show('info', title, message, 3600);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}

