// tau-calculator/src/app/calculator-mode/calculator-mode.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DecimalMode } from '../services/tau-decimal-calculator.service';

export enum CalculatorType {
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL'
}

@Component({
  selector: 'app-calculator-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900/60 border border-slate-700 p-2 rounded-md mb-3 text-xs">
      <div class="flex justify-between items-center">
        <span class="text-slate-500">Calculator Mode:</span>
        <div class="flex gap-1">
          <button
            *ngFor="let type of calculatorTypes"
            (click)="onCalculatorTypeChange(type)"
            class="px-2 py-1 rounded text-xs"
            [ngClass]="selectedCalculatorType === type ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
            {{ type }}
          </button>
        </div>
      </div>

      <!-- Decimal-specific options -->
      <div *ngIf="selectedCalculatorType === 'DECIMAL'" class="mt-2">
        <div class="flex justify-between items-center mb-1">
          <span class="text-slate-500">Decimal Mode:</span>
          <div class="flex gap-1">
            <button
              *ngFor="let mode of decimalModes"
              (click)="onDecimalModeChange(mode)"
              class="px-2 py-1 rounded text-xs"
              [ngClass]="selectedDecimalMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
              {{ mode }}
            </button>
          </div>
        </div>

        <!-- Fixed point specific options -->
        <div *ngIf="selectedDecimalMode === 'FIXED_POINT'" class="flex justify-between items-center">
          <span class="text-slate-500">Decimal Places:</span>
          <select
            [(ngModel)]="decimalPlaces"
            (change)="onDecimalPlacesChange()"
            class="bg-slate-700 text-slate-300 rounded px-2 py-1 text-xs">
            <option [value]="1">1</option>
            <option [value]="2">2</option>
            <option [value]="3">3</option>
            <option [value]="4">4</option>
          </select>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CalculatorModeComponent {
  @Input() selectedCalculatorType: CalculatorType = CalculatorType.INTEGER;
  @Input() selectedDecimalMode: DecimalMode = DecimalMode.FIXED_POINT;
  @Input() decimalPlaces: number = 2;

  @Output() calculatorTypeChange = new EventEmitter<CalculatorType>();
  @Output() decimalModeChange = new EventEmitter<DecimalMode>();
  @Output() decimalPlacesChange = new EventEmitter<number>();

  calculatorTypes = Object.values(CalculatorType);
  decimalModes = Object.values(DecimalMode);

  onCalculatorTypeChange(type: CalculatorType): void {
    this.selectedCalculatorType = type;
    this.calculatorTypeChange.emit(type);
  }

  onDecimalModeChange(mode: DecimalMode): void {
    this.selectedDecimalMode = mode;
    this.decimalModeChange.emit(mode);
  }

  onDecimalPlacesChange(): void {
    this.decimalPlacesChange.emit(this.decimalPlaces);
  }
}
