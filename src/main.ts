// tau-calculator/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { TauElectronService } from './app/services/tau-electron.service';
import { TauCalculatorService } from './app/services/tau-calculator.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    TauElectronService,
    TauCalculatorService
  ]
})
.catch(err => console.error(err));
