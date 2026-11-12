import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack position-fixed top-0 end-0 p-2 p-sm-3 d-flex flex-column gap-2" aria-live="polite" aria-atomic="true">
      @for (toast of toasts(); track toast.id) {
        <div class="arlogs-toast d-flex align-items-start gap-2 p-3 rounded-3 shadow-lg"
             [ngClass]="getVariantClass(toast.type)"
             role="alert">
          <div class="toast-icon-wrap d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 mt-1">
            <i class="bi" [ngClass]="getIconClass(toast.type)"></i>
          </div>

          <div class="flex-grow-1 overflow-hidden">
            <div class="fw-bold fs-xs toast-title text-truncate">{{ toast.title }}</div>
            <div class="fs-xxs toast-msg">{{ toast.message }}</div>
          </div>

          <button type="button"
                  class="btn-close btn-close-sm ms-1 flex-shrink-0"
                  aria-label="Cerrar"
                  (click)="dismiss(toast.id)">
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      z-index: 2050;
      width: min(390px, calc(100vw - 1rem));
      pointer-events: none;
    }

    .arlogs-toast {
      pointer-events: auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      animation: toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes toastSlideIn {
      from {
        opacity: 0;
        transform: translateX(28px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    .toast-icon-wrap {
      width: 24px;
      height: 24px;
      font-size: 0.85rem;
    }

    .toast-title { color: #0f172a; }
    .toast-msg { color: #475569; line-height: 1.35; }

    .toast-success { border-left-color: #10b981; }
    .toast-success .toast-icon-wrap { background: #ecfdf5; color: #059669; }

    .toast-error { border-left-color: #ef4444; }
    .toast-error .toast-icon-wrap { background: #fef2f2; color: #dc2626; }

    .toast-warning { border-left-color: #f59e0b; }
    .toast-warning .toast-icon-wrap { background: #fffbeb; color: #d97706; }

    .toast-info { border-left-color: #0284c7; }
    .toast-info .toast-icon-wrap { background: #eff6ff; color: #0284c7; }

    .btn-close-sm {
      font-size: 0.65rem;
      opacity: 0.55;
    }
    .btn-close-sm:hover { opacity: 0.95; }
  `]
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  getVariantClass(type: ToastType): string {
    return `toast-${type}`;
  }

  getIconClass(type: ToastType): string {
    switch (type) {
      case 'success': return 'bi-check-lg';
      case 'error': return 'bi-x-lg';
      case 'warning': return 'bi-exclamation-lg';
      case 'info': return 'bi-info-lg';
    }
  }
}

