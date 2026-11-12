import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { ExecutiveDashboardComponent } from './components/executive-dashboard/executive-dashboard.component';
import { OperationsViewComponent } from './components/operations-view/operations-view.component';
import { PricingViewComponent } from './components/pricing-view/pricing-view.component';
import { BillingViewComponent } from './components/billing-view/billing-view.component';
import { WarehouseViewComponent } from './components/warehouse-view/warehouse-view.component';
import { ClientPortalComponent } from './components/client-portal/client-portal.component';
import { AdminComponent } from './components/admin/admin.component';
import { LoginComponent } from './components/login/login.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { ShipmentService } from './services/shipment.service';
import { AuthService } from './services/auth.service';
import { ScreenId } from './models/shipment.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ExecutiveDashboardComponent,
    OperationsViewComponent,
    PricingViewComponent,
    BillingViewComponent,
    WarehouseViewComponent,
    ClientPortalComponent,
    AdminComponent,
    LoginComponent,
    ToastContainerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private shipmentService = inject(ShipmentService);
  private authService = inject(AuthService);

  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly currentUser = this.shipmentService.currentUser;
  readonly allowedScreens = this.authService.allowedScreensForCurrentUser;
  activeTab = signal<ScreenId>('gerencia');

  constructor() {
    // Keep activeTab always valid when role permissions change dynamically
    effect(() => {
      const allowed = this.allowedScreens();
      const current = this.activeTab();
      if (this.isLoggedIn() && allowed.length > 0 && !allowed.includes(current)) {
        this.activeTab.set(allowed[0]);
      }
    });
  }

  onLoginSuccess(defaultScreen: ScreenId): void {
    this.activeTab.set(defaultScreen);
  }

  onTabChange(tab: ScreenId): void {
    if (this.allowedScreens().includes(tab)) {
      this.activeTab.set(tab);
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
