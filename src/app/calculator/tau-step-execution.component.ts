// tau-calculator/src/app/calculator/tau-step-execution.component.ts
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TauEducationService, CalculationStep } from '../services/tau-education.service';
import { CalculatorType } from './calculator-mode.component';
import { DecimalMode } from '../services/tau-decimal-calculator.service';

// Custom pipe to generate a range of numbers for bit indices
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bitRange',
  standalone: true
})
export class BitRangePipe implements PipeTransform {
  transform(size: number): number[] {
    return Array(size).fill(0).map((_, i) => i);
  }
}

@Component({
  selector: 'app-tau-step-execution',
  standalone: true,
  imports: [CommonModule, BitRangePipe], // Added BitRangePipe to imports
  // Add providers array for standalone component
  providers: [TauEducationService],
  template: `
    <div class="bg-slate-900 text-slate-300 p-4 rounded-lg border border-slate-700">
      <h2 class="text-lg font-semibold text-cyan-400 mb-3">Step-by-Step Execution</h2>

      <div *ngIf="!isOperationReady" class="p-4 bg-slate-800 rounded-lg text-center">
        <p class="text-slate-400">Enter a complete calculation to see the step-by-step execution.</p>
      </div>

      <div *ngIf="isOperationReady" class="grid grid-cols-1 gap-4">
        <!-- Operation Info -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Executing:</span>
            <span class="text-cyan-400 font-semibold">
              {{ firstOperand }} {{ getOperatorSymbol(operation) }} {{ secondOperand }}
            </span>
          </div>

          <div class="mt-3">
            <div class="text-sm text-slate-400 mb-1">Current Step:</div>
            <div class="font-semibold">
              {{ currentStepIndex + 1 }} / {{ calculationSteps.length }} - {{ getCurrentStepTitle() }}
            </div>
          </div>
        </div>

        <!-- Step Controls -->
        <div class="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
          <button (click)="goToFirstStep()"
                  [disabled]="currentStepIndex === 0"
                  [ngClass]="currentStepIndex === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-600 text-white'"
                  class="px-3 py-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              <path fill-rule="evenodd" d="M7.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L3.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
          </button>

          <button (click)="previousStep()"
                  [disabled]="currentStepIndex === 0"
                  [ngClass]="currentStepIndex === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-600 text-white'"
                  class="px-3 py-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <span class="bg-slate-900 px-4 py-2 rounded text-center text-sm min-w-40">
            Step {{ currentStepIndex + 1 }} of {{ calculationSteps.length }}
          </span>

          <button (click)="nextStep()"
                  [disabled]="currentStepIndex === calculationSteps.length - 1"
                  [ngClass]="currentStepIndex === calculationSteps.length - 1 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-600 text-white'"
                  class="px-3 py-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <button (click)="goToLastStep()"
                  [disabled]="currentStepIndex === calculationSteps.length - 1"
                  [ngClass]="currentStepIndex === calculationSteps.length - 1 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-600 text-white'"
                  class="px-3 py-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              <path fill-rule="evenodd" d="M12.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L16.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Current Step Visualization -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Current Step: {{ getCurrentStepTitle() }}</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="mb-3">
                <div class="text-sm text-slate-400 mb-1">Operand A:</div>
                <div class="font-mono bg-slate-900 p-2 rounded text-green-400 flex justify-between">
                  <span>{{ getCurrentStep()?.operandA?.join('') || '' }}</span>
                  <span>{{ getDecimalValue(getCurrentStep()?.operandA) }}</span>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-sm text-slate-400 mb-1">Operand B:</div>
                <div class="font-mono bg-slate-900 p-2 rounded text-green-400 flex justify-between">
                  <span>{{ getCurrentStep()?.operandB?.join('') || '' }}</span>
                  <span>{{ getDecimalValue(getCurrentStep()?.operandB) }}</span>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-sm text-slate-400 mb-1">Current Bit Position:</div>
                <div class="font-mono bg-slate-900 p-2 rounded">
                  <span *ngIf="getCurrentStep()?.bitIndex !== null" class="text-cyan-400">
                    Bit {{ getCurrentStep()?.bitIndex }}
                  </span>
                  <span *ngIf="getCurrentStep()?.bitIndex === null" class="text-slate-500">
                    N/A
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div class="mb-3">
                <div class="text-sm text-slate-400 mb-1">Carries:</div>
                <div class="font-mono bg-slate-900 p-2 rounded text-purple-400">
                  {{ getCurrentStep()?.carries?.join('') || '' }}
                </div>
              </div>

              <div class="mb-3">
                <div class="text-sm text-slate-400 mb-1">Intermediate Result:</div>
                <div class="font-mono bg-slate-900 p-2 rounded text-cyan-400 flex justify-between">
                  <span>{{ getCurrentStep()?.intermediateResult?.join('') || '' }}</span>
                  <span>{{ getDecimalValue(getCurrentStep()?.intermediateResult) }}</span>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-sm text-slate-400 mb-1">Operation:</div>
                <div class="font-mono bg-slate-900 p-2 rounded text-yellow-400">
                  {{ operation }}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3">
            <div class="text-sm text-slate-400 mb-1">Step Explanation:</div>
            <div class="bg-slate-900 p-3 rounded">
              {{ getCurrentStep()?.explanation }}
            </div>
          </div>
        </div>

        <!-- Tau Code for Current Step -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Tau Code</h3>

          <pre class="font-mono text-xs bg-slate-900 p-3 rounded overflow-auto max-h-48 text-cyan-400">{{ getCurrentStep()?.tauCode }}</pre>

          <div class="mt-3 text-sm text-slate-400">
            <p>
              This is the Tau code that would be executed for the current step of the calculation.
              Tau uses Boolean algebra operations to perform arithmetic.
            </p>
          </div>
        </div>

        <!-- Bit Visualization -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Bit-by-Bit Execution</h3>

          <div class="bit-visualization flex flex-nowrap gap-1 overflow-x-auto py-2">
            <div *ngFor="let bit of bitSize | bitRange; let i = index" class="bit-column flex-shrink-0 w-10">
              <div class="text-center text-xs text-slate-500 mb-1">{{ bitSize - 1 - i }}</div>

              <div class="bit-a h-10 flex items-center justify-center rounded mb-1"
                   [ngClass]="getHighlightClass('A', bitSize - 1 - i)">
                {{ getBitValue(getCurrentStep()?.operandA, bitSize - 1 - i) }}
              </div>

              <div class="bit-operation h-6 flex items-center justify-center text-xs">
                {{ getOperationForBit(bitSize - 1 - i) }}
              </div>

              <div class="bit-b h-10 flex items-center justify-center rounded mb-1"
                   [ngClass]="getHighlightClass('B', bitSize - 1 - i)">
                {{ getBitValue(getCurrentStep()?.operandB, bitSize - 1 - i) }}
              </div>

              <div class="bit-carry h-6 flex items-center justify-center rounded mb-1"
                   [ngClass]="getHighlightClass('carry', bitSize - 1 - i)">
                {{ getBitValue(getCurrentStep()?.carries, bitSize - 1 - i) }}
              </div>

              <div class="bit-result h-10 flex items-center justify-center rounded"
                   [ngClass]="getHighlightClass('result', bitSize - 1 - i)">
                {{ getBitValue(getCurrentStep()?.intermediateResult, bitSize - 1 - i) }}
              </div>
            </div>
          </div>

          <div class="mt-3 text-xs text-slate-400 flex items-center">
            <div class="flex items-center mr-4">
              <div class="w-3 h-3 rounded bg-green-700 mr-1"></div>
              <span>A Bits</span>
            </div>
            <div class="flex items-center mr-4">
              <div class="w-3 h-3 rounded bg-green-700 mr-1"></div>
              <span>B Bits</span>
            </div>
            <div class="flex items-center mr-4">
              <div class="w-3 h-3 rounded bg-purple-700 mr-1"></div>
              <span>Carries</span>
            </div>
            <div class="flex items-center">
              <div class="w-3 h-3 rounded bg-cyan-700 mr-1"></div>
              <span>Result</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bit-a, .bit-b {
      background-color: #1f2937; /* bg-slate-800 */
      color: #94a3b8; /* text-slate-400 */
    }

    .bit-a.active, .bit-b.active {
      background-color: #15803d; /* bg-green-700 */
      color: white;
    }

    .bit-carry {
      background-color: #1f2937; /* bg-slate-800 */
      color: #94a3b8; /* text-slate-400 */
    }

    .bit-carry.active {
      background-color: #7e22ce; /* bg-purple-700 */
      color: white;
    }

    .bit-result {
      background-color: #1f2937; /* bg-slate-800 */
      color: #94a3b8; /* text-slate-400 */
    }

    .bit-result.active {
      background-color: #0e7490; /* bg-cyan-700 */
      color: white;
    }
  `]
})
export class TauStepExecutionComponent implements OnChanges {
  @Input() firstOperand: number | null = null;
  @Input() secondOperand: number | null = null;
  @Input() operation: string | null = null;
  @Input() bitSize: number = 8;
  @Input() calculatorType: CalculatorType = CalculatorType.INTEGER;
  @Input() decimalMode: DecimalMode = DecimalMode.FIXED_POINT;
  @Input() decimalPlaces: number = 2;

  isOperationReady: boolean = false;
  calculationSteps: CalculationStep[] = [];
  currentStepIndex: number = 0;

  // Use inject() instead of constructor injection for standalone components
  private tauEducationService = inject(TauEducationService);

  ngOnChanges(changes: SimpleChanges): void {
    this.updateExecution();
  }

  updateExecution(): void {
    if (!this.firstOperand || !this.secondOperand || !this.operation) {
      this.isOperationReady = false;
      return;
    }

    this.isOperationReady = true;

    // Get calculation steps from education service
    this.calculationSteps = this.tauEducationService.generateCalculationSteps(
      this.firstOperand,
      this.secondOperand,
      this.operation,
      this.bitSize,
      this.calculatorType,
      this.decimalMode,
      this.decimalPlaces
    );

    // Reset to first step
    this.currentStepIndex = 0;
  }

  getOperatorSymbol(op: string | null): string {
    if (!op) return '';

    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return op;
    }
  }

  getCurrentStep(): CalculationStep | null {
    if (!this.calculationSteps.length) return null;
    return this.calculationSteps[this.currentStepIndex];
  }

  getCurrentStepTitle(): string {
    const step = this.getCurrentStep();
    if (!step) return '';
    return step.title;
  }

  nextStep(): void {
    if (this.currentStepIndex < this.calculationSteps.length - 1) {
      this.currentStepIndex++;
    }
  }

  previousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
  }

  goToFirstStep(): void {
    this.currentStepIndex = 0;
  }

  goToLastStep(): void {
    this.currentStepIndex = this.calculationSteps.length - 1;
  }

  getDecimalValue(binaryArray: number[] | undefined): string {
    if (!binaryArray) return '';

    const binaryString = binaryArray.join('');
    const decimal = parseInt(binaryString, 2);

    return decimal.toString();
  }

  getBitValue(bits: number[] | undefined, index: number): string {
    if (!bits || index < 0 || index >= bits.length) return '';
    return bits[index].toString();
  }

  getHighlightClass(type: string, bitIndex: number): string {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return '';

    // Added null check for bitIndex
    if (currentStep.bitIndex === null) return '';

    // Highlight current bit being processed
    if (currentStep.bitIndex === bitIndex) {
      return 'active';
    }

    // For result bits, highlight all bits that have been calculated
    if (type === 'result') {
      return bitIndex <= currentStep.bitIndex ? 'active' : '';
    }

    // For carry bits, highlight carries that have been calculated
    if (type === 'carry') {
      return bitIndex < currentStep.bitIndex ? 'active' : '';
    }

    return '';
  }

  getOperationForBit(bitIndex: number): string {
    if (!this.operation) return '';

    const currentStep = this.getCurrentStep();
    if (!currentStep) return '';

    // Added null check for bitIndex
    if (currentStep.bitIndex === null) return '';

    // Show operation only for the current bit being processed
    if (currentStep.bitIndex === bitIndex) {
      switch (this.operation) {
        case '+':
          return bitIndex === 0 ? 'XOR' : '+';
        case '-':
          return bitIndex === 0 ? '−' : '−';
        case '*':
        case '×':
          return '×';
        case '/':
        case '÷':
          return '÷';
        default:
          return this.operation;
      }
    }

    return '';
  }
}
