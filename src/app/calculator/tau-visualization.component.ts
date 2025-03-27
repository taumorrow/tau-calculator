// tau-calculator/src/app/calculator/tau-visualization.component.ts
import { Component, Input, OnChanges, SimpleChanges, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TauEducationService, BinaryOperationData, CalculationStep } from '../services/tau-education.service';
import { CalculatorType } from './calculator-mode.component';
import { DecimalMode, TauDecimalCalculatorService } from '../services/tau-decimal-calculator.service';
import * as d3 from 'd3';
import { TauCalculatorService } from '../services/tau-calculator.service';

@Component({
  selector: 'app-tau-visualization',
  standalone: true,
  imports: [CommonModule],
  providers: [TauEducationService, TauCalculatorService, TauDecimalCalculatorService],
  template: `
    <div class="bg-slate-900 text-slate-300 p-4 rounded-lg border border-slate-700">
      <h2 class="text-lg font-semibold text-cyan-400 mb-3">Circuit Visualization</h2>

      <div *ngIf="!isOperationReady" class="p-4 bg-slate-800 rounded-lg text-center">
        <p class="text-slate-400">Enter a complete calculation to see the circuit visualization.</p>
      </div>

      <div *ngIf="isOperationReady" class="grid grid-cols-1 gap-4">
        <!-- Operation Info -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Operation:</span>
            <span class="text-cyan-400 font-semibold">
              {{ operationData.firstOperand }} {{ getOperatorSymbol(operationData.operation) }} {{ operationData.secondOperand }} = {{ operationData.result }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div class="text-sm text-slate-400 mb-1">First Operand (Binary):</div>
              <div class="font-mono bg-slate-900 p-2 rounded text-green-400">{{ operationData.firstOperandBinary }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-400 mb-1">Second Operand (Binary):</div>
              <div class="font-mono bg-slate-900 p-2 rounded text-green-400">{{ operationData.secondOperandBinary }}</div>
            </div>
          </div>

          <div class="mt-3">
            <div class="text-sm text-slate-400 mb-1">Result (Binary):</div>
            <div class="font-mono bg-slate-900 p-2 rounded text-cyan-400">{{ operationData.resultBinary }}</div>
          </div>
        </div>

        <!-- D3 Circuit Visualization -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Circuit Diagram</h3>

          <div class="circuit-container overflow-auto bg-slate-900 p-3 rounded-lg">
            <svg #circuitSvg width="800" height="400" class="d3-circuit"></svg>
          </div>

          <div class="mt-3 text-sm text-slate-400">
            <p>{{ getOperationDescription() }}</p>
            <p class="mt-2">{{ getCircuitExplanation() }}</p>
          </div>
        </div>

        <!-- Bit-level Operation Table -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Bit-level Operations</h3>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-700">
                  <th class="p-2 text-left text-slate-400">Bit Position</th>
                  <th class="p-2 text-left text-slate-400">A Bit</th>
                  <th class="p-2 text-left text-slate-400">B Bit</th>
                  <th class="p-2 text-left text-slate-400">Operation</th>
                  <th class="p-2 text-left text-slate-400">Result Bit</th>
                  <th class="p-2 text-left text-slate-400">Carry</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of bitOperationTable; let i = index"
                    class="border-b border-slate-700 hover:bg-slate-700/50">
                  <td class="p-2 font-mono">{{ row.position }}</td>
                  <td class="p-2 font-mono text-green-400">{{ row.aBit }}</td>
                  <td class="p-2 font-mono text-green-400">{{ row.bBit }}</td>
                  <td class="p-2 font-mono">{{ row.operation }}</td>
                  <td class="p-2 font-mono text-cyan-400">{{ row.resultBit }}</td>
                  <td class="p-2 font-mono text-purple-400">{{ row.carry }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tau Code Display -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Tau Code</h3>

          <pre class="font-mono text-xs bg-slate-900 p-3 rounded overflow-auto max-h-80 text-cyan-400">{{ getTauCode() }}</pre>

          <div class="flex justify-end mt-3">
            <button
              (click)="toggleFullCode()"
              class="px-3 py-1 text-xs text-slate-400 hover:text-slate-300">
              {{ showFullCode ? 'Show Less' : 'Show Full Code' }}
            </button>
          </div>
        </div>

        <!-- Boolean Formula Representation -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Tau Boolean Formulas</h3>

          <div *ngFor="let formula of booleanFormulas" class="mb-2">
            <div class="text-sm text-slate-400 mb-1">{{ formula.description }}:</div>
            <div class="font-mono bg-slate-900 p-2 rounded text-cyan-400">{{ formula.formula }}</div>
          </div>

          <div class="mt-3 text-sm text-slate-400">
            <p>These Tau formulas define how each bit in the result is calculated using boolean operations.</p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
              <li><code class="font-mono text-xs bg-slate-900 px-1 rounded">&</code> - AND operation</li>
              <li><code class="font-mono text-xs bg-slate-900 px-1 rounded">|</code> - OR operation</li>
              <li><code class="font-mono text-xs bg-slate-900 px-1 rounded">'</code> - NOT operation</li>
              <li><code class="font-mono text-xs bg-slate-900 px-1 rounded">+</code> - XOR operation</li>
            </ul>
          </div>
        </div>

        <!-- Interactive Controls -->
        <div class="bg-slate-800 p-3 rounded-lg">
          <h3 class="text-md font-medium text-slate-300 mb-2">Try Different Bits</h3>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-900 p-3 rounded">
              <div class="text-sm text-slate-400 mb-2">Operand A Bits:</div>
              <div class="flex flex-wrap gap-2">
                <button *ngFor="let bit of interactiveOperandA; let i = index"
                        (click)="toggleBit('A', i)"
                        class="w-8 h-8 flex items-center justify-center rounded font-mono"
                        [ngClass]="bit ? 'bg-green-700 text-white' : 'bg-slate-700 text-slate-300'">
                  {{ bit ? '1' : '0' }}
                </button>
              </div>
            </div>

            <div class="bg-slate-900 p-3 rounded">
              <div class="text-sm text-slate-400 mb-2">Operand B Bits:</div>
              <div class="flex flex-wrap gap-2">
                <button *ngFor="let bit of interactiveOperandB; let i = index"
                        (click)="toggleBit('B', i)"
                        class="w-8 h-8 flex items-center justify-center rounded font-mono"
                        [ngClass]="bit ? 'bg-green-700 text-white' : 'bg-slate-700 text-slate-300'">
                  {{ bit ? '1' : '0' }}
                </button>
              </div>
            </div>
          </div>

          <div class="mt-3 bg-slate-900 p-3 rounded">
            <div class="text-sm text-slate-400 mb-2">Result Bits:</div>
            <div class="flex flex-wrap gap-2">
              <div *ngFor="let bit of interactiveResult; let i = index"
                   class="w-8 h-8 flex items-center justify-center rounded font-mono"
                   [ngClass]="bit ? 'bg-cyan-700 text-white' : 'bg-slate-700 text-slate-300'">
                {{ bit ? '1' : '0' }}
              </div>
            </div>
          </div>

          <div class="mt-3 text-right">
            <button (click)="resetInteractiveBits()"
                    class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">
              Reset Bits
            </button>
            <button (click)="calculateInteractiveResult()"
                    class="ml-2 px-3 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-sm">
              Calculate
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .circuit-container {
      min-height: 400px;
      overflow-y: auto;
    }

    .d3-circuit {
      display: block;
      margin: 0 auto;
    }
  `]
})
export class TauVisualizationComponent implements OnChanges, AfterViewInit {
  @Input() firstOperand: number | null = null;
  @Input() secondOperand: number | null = null;
  @Input() operation: string | null = null;
  @Input() bitSize: number = 8;
  @Input() calculatorType: CalculatorType = CalculatorType.INTEGER;
  @Input() decimalMode: DecimalMode = DecimalMode.FIXED_POINT;
  @Input() decimalPlaces: number = 2;
  @ViewChild('circuitSvg') circuitSvg!: ElementRef;

  isOperationReady: boolean = false;
  operationData: BinaryOperationData = {
    firstOperand: 0,
    secondOperand: 0,
    operation: '',
    result: 0,
    firstOperandBinary: '',
    secondOperandBinary: '',
    resultBinary: ''
  };

  calculationSteps: CalculationStep[] = [];
  bitOperationTable: any[] = [];
  booleanFormulas: {description: string, formula: string}[] = [];
  fullTauCode: string = '';
  showFullCode: boolean = false;

  // Interactive bits
  interactiveOperandA: boolean[] = [];
  interactiveOperandB: boolean[] = [];
  interactiveResult: boolean[] = [];

  // Track selected bit for D3 visualization
  selectedBit: number | null = null;

  // Use inject() instead of constructor injection for standalone components
  private tauEducationService = inject(TauEducationService);
  private tauCalculatorService = inject(TauCalculatorService);
  private tauDecimalCalculatorService = inject(TauDecimalCalculatorService);
  ngOnChanges(changes: SimpleChanges): void {
    this.updateVisualization();
  }

  ngAfterViewInit(): void {
    if (this.isOperationReady) {
      this.renderD3Circuit();
    }
  }

  updateVisualization(): void {
    if (!this.firstOperand || !this.secondOperand || !this.operation) {
      this.isOperationReady = false;
      return;
    }

    this.isOperationReady = true;

    // Get operation data from education service
    this.operationData = this.tauEducationService.getBinaryOperationData(
      this.firstOperand,
      this.secondOperand,
      this.operation,
      this.bitSize,
      this.calculatorType,
      this.decimalMode,
      this.decimalPlaces
    );

    // Get calculation steps
    this.calculationSteps = this.tauEducationService.getCalculationSteps();

    // Generate bit operation table
    this.bitOperationTable = this.generateBitOperationTable();

    // Generate boolean formulas
    this.booleanFormulas = this.generateBooleanFormulas();

    // Setup interactive bits
    this.setupInteractiveBits();

    // Get Tau code
    if (this.calculatorType === CalculatorType.INTEGER) {
      switch (this.operation) {
        case '+':
          this.fullTauCode = this.tauCalculatorService.generateAdditionProgram(
            this.firstOperand, this.secondOperand
          ).tauCode;
          break;
        case '-':
          this.fullTauCode = this.tauCalculatorService.generateSubtractionProgram(
            this.firstOperand, this.secondOperand
          ).tauCode;
          break;
        case '*':
        case '×':
          this.fullTauCode = this.tauCalculatorService.generateMultiplicationProgram(
            this.firstOperand, this.secondOperand
          ).tauCode;
          break;
        case '/':
        case '÷':
          this.fullTauCode = this.tauCalculatorService.generateDivisionProgram(
            this.firstOperand, this.secondOperand
          ).tauCode;
          break;
      }
    } else {
      if (this.decimalMode === DecimalMode.FIXED_POINT) {
        switch (this.operation) {
          case '+':
            this.fullTauCode = this.tauDecimalCalculatorService.generateFixedPointAdditionProgram(
              this.firstOperand, this.secondOperand,
            ).tauCode;
            break;
          case '-':
            this.fullTauCode = this.tauDecimalCalculatorService.generateFixedPointSubtractionProgram(
              this.firstOperand, this.secondOperand,
            ).tauCode;
            break;
        }
      } else {
        switch (this.operation) {
          case '+':
            this.fullTauCode = this.tauDecimalCalculatorService.generateFloatingPointAdditionProgram(
              this.firstOperand, this.secondOperand
            ).tauCode;
            break;
          case '-':
            this.fullTauCode = this.tauDecimalCalculatorService.generateFloatingPointSubtractionProgram(
              this.firstOperand, this.secondOperand,
            ).tauCode;
            break;
        }
      }
    }

    // Render D3 circuit after a slight delay (to ensure DOM is ready)
    setTimeout(() => {
      this.renderD3Circuit();
    }, 100);
  }

  toggleFullCode(): void {
    this.showFullCode = !this.showFullCode;
  }

  getTauCode(): string {
    if (!this.fullTauCode) return '';

    if (this.showFullCode) {
      return this.fullTauCode;
    }

    const lines = this.fullTauCode.split('\n');
    if (lines.length <= 20) return this.fullTauCode;

    // Return first 10 and last 10 lines with ellipsis in between
    return [...lines.slice(0, 10), '...', ...lines.slice(-10)].join('\n');
  }

  renderD3Circuit(): void {
    if (!this.circuitSvg || !this.circuitSvg.nativeElement || !this.isOperationReady) {
      return;
    }

    const svg = this.circuitSvg.nativeElement;
    const d3Svg = d3.select(svg);
    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear any existing SVG
    d3Svg.selectAll("*").remove();

    // Create SVG
    const g = d3Svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("fill", "#d1d5db")
      .text(`${this.bitSize}-bit ${this.getOperationName()}: ${this.operationData.firstOperand} ${this.getOperatorSymbol(this.operation)} ${this.operationData.secondOperand} = ${this.operationData.result}`);

    // Create a function to get bit data
    const bitData = this.getBitLevelData();

    // Draw based on operation type
    if (this.operation === '+') {
      this.drawAdditionCircuit(g, bitData, innerWidth, innerHeight);
    } else if (this.operation === '-') {
      this.drawSubtractionCircuit(g, bitData, innerWidth, innerHeight);
    } else if (this.operation === '*' || this.operation === '×') {
      this.drawMultiplicationCircuit(g, bitData, innerWidth, innerHeight);
    } else {
      this.drawGenericCircuit(g, bitData, innerWidth, innerHeight);
    }
  }

  getBitLevelData(): any[] {
    const firstBinary = this.operationData.firstOperandBinary;
    const secondBinary = this.operationData.secondOperandBinary;
    const resultBinary = this.operationData.resultBinary;

    return Array(this.bitSize).fill(0).map((_, i) => ({
      position: this.bitSize - 1 - i,
      aBit: parseInt(firstBinary[i] || '0', 10),
      bBit: parseInt(secondBinary[i] || '0', 10),
      resultBit: parseInt(resultBinary[i] || '0', 10),
      carry: i > 0 ? (parseInt(firstBinary[i-1] || '0', 10) & parseInt(secondBinary[i-1] || '0', 10)) : 0
    }));
  }

  drawAdditionCircuit(g: any, bitData: any[], width: number, height: number): void {
    const bitWidth = Math.min(80, width / this.bitSize);
    const xOffset = (width - (bitWidth * Math.min(this.bitSize, 8))) / 2;

    // Draw input labels
    g.append("text")
      .attr("x", 10)
      .attr("y", 30)
      .attr("fill", "#9ca3af")
      .text(`A: ${this.operationData.firstOperandBinary}`);

    g.append("text")
      .attr("x", 10)
      .attr("y", 60)
      .attr("fill", "#9ca3af")
      .text(`B: ${this.operationData.secondOperandBinary}`);

    // Draw adders
    bitData.slice(0, Math.min(this.bitSize, 8)).forEach((bit: any, i: number) => {
      const x = xOffset + i * bitWidth;
      const y = 120;

      // Adder circle with click handler
      const circle = g.append("circle")
        .attr("cx", x + bitWidth/2)
        .attr("cy", y)
        .attr("r", 25)
        .attr("fill", this.selectedBit === bit.position ? "#3b82f6" : "#1e40af")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("click", () => {
          this.selectedBit = this.selectedBit === bit.position ? null : bit.position;
          this.renderD3Circuit(); // Re-render to update
        });

      // Adder label
      g.append("text")
        .attr("x", x + bitWidth/2)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .attr("fill", "white")
        .text("FA");

      g.append("text")
        .attr("x", x + bitWidth/2)
        .attr("y", y - 12)
        .attr("text-anchor", "middle")
        .attr("font-size", 9)
        .attr("fill", "white")
        .text(`Bit ${bit.position}`);

      // Input lines
      const aColor = bit.aBit ? "#10b981" : "#9ca3af";
      g.append("line")
        .attr("x1", x + bitWidth/2)
        .attr("y1", y - 25)
        .attr("x2", x + bitWidth/2)
        .attr("y2", 40)
        .attr("stroke", aColor)
        .attr("stroke-width", 2);

      g.append("text")
        .attr("x", x + bitWidth/2 + 10)
        .attr("y", 45)
        .attr("font-size", 10)
        .attr("fill", aColor)
        .text(`A${bit.position}`);

      const bColor = bit.bBit ? "#10b981" : "#9ca3af";
      g.append("line")
        .attr("x1", x + bitWidth/2)
        .attr("y1", y - 25)
        .attr("x2", x + bitWidth/2)
        .attr("y2", 70)
        .attr("stroke", bColor)
        .attr("stroke-width", 2);

      g.append("text")
        .attr("x", x + bitWidth/2 + 10)
        .attr("y", 75)
        .attr("font-size", 10)
        .attr("fill", bColor)
        .text(`B${bit.position}`);

      // Carry lines
      if (i > 0) {
        const carryColor = bit.carry ? "#a855f7" : "#9ca3af";
        g.append("line")
          .attr("x1", x)
          .attr("y1", y)
          .attr("x2", x - bitWidth/2)
          .attr("y2", y)
          .attr("stroke", carryColor)
          .attr("stroke-width", 2);

        g.append("line")
          .attr("x1", x - bitWidth/2)
          .attr("y1", y)
          .attr("x2", x - bitWidth/2)
          .attr("y2", y + 30)
          .attr("stroke", carryColor)
          .attr("stroke-width", 2);

        g.append("line")
          .attr("x1", x - bitWidth/2)
          .attr("y1", y + 30)
          .attr("x2", x - bitWidth + bitWidth/2)
          .attr("y2", y + 30)
          .attr("stroke", carryColor)
          .attr("stroke-width", 2);
      }

      // Output line
      const resultColor = bit.resultBit ? "#0ea5e9" : "#9ca3af";
      g.append("line")
        .attr("x1", x + bitWidth/2)
        .attr("y1", y + 25)
        .attr("x2", x + bitWidth/2)
        .attr("y2", y + 50)
        .attr("stroke", resultColor)
        .attr("stroke-width", 2);

      g.append("text")
        .attr("x", x + bitWidth/2 + 10)
        .attr("y", y + 45)
        .attr("font-size", 10)
        .attr("fill", resultColor)
        .text(`S${bit.position}`);
    });

    // Draw result
    g.append("text")
      .attr("x", 10)
      .attr("y", height - 30)
      .attr("fill", "#9ca3af")
      .text(`Result: ${this.operationData.resultBinary}`);

    // Draw explanation box
    const explanationX = 20;
    const explanationY = height - 100;
    const explanationWidth = width - 40;
    const explanationHeight = 80;

    g.append("rect")
      .attr("x", explanationX)
      .attr("y", explanationY)
      .attr("width", explanationWidth)
      .attr("height", explanationHeight)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Full Adder Logic: S = A ⊕ B ⊕ Cin");

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Cout = (A ∧ B) ∨ (A ∧ Cin) ∨ (B ∧ Cin)");

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 60)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#9ca3af")
      .text("⊕ = XOR, ∧ = AND, ∨ = OR");

    // If a bit is selected, show detailed explanation
    if (this.selectedBit !== null) {
      const bit = bitData.find((b: any) => b.position === this.selectedBit);
      if (bit) {
        const detailX = width - 200;
        const detailY = 20;

        g.append("rect")
          .attr("x", detailX)
          .attr("y", detailY)
          .attr("width", 180)
          .attr("height", 110)
          .attr("rx", 5)
          .attr("ry", 5)
          .attr("fill", "#374151")
          .attr("stroke", "#4b5563")
          .attr("stroke-width", 1);

        g.append("text")
          .attr("x", detailX + 10)
          .attr("y", detailY + 20)
          .attr("font-size", 12)
          .attr("fill", "#d1d5db")
          .text(`Bit ${bit.position} details:`);

        g.append("text")
          .attr("x", detailX + 10)
          .attr("y", detailY + 40)
          .attr("font-size", 12)
          .attr("fill", "#10b981")
          .text(`A = ${bit.aBit}`);

        g.append("text")
          .attr("x", detailX + 10)
          .attr("y", detailY + 60)
          .attr("font-size", 12)
          .attr("fill", "#10b981")
          .text(`B = ${bit.bBit}`);

        g.append("text")
          .attr("x", detailX + 10)
          .attr("y", detailY + 80)
          .attr("font-size", 12)
          .attr("fill", "#a855f7")
          .text(`Carry in = ${bit.position < this.bitSize-1 ? bitData[bitData.findIndex((b: any) => b.position === bit.position) + 1].carry : 0}`);

        g.append("text")
          .attr("x", detailX + 10)
          .attr("y", detailY + 100)
          .attr("font-size", 12)
          .attr("fill", "#0ea5e9")
          .text(`Result = ${bit.resultBit}`);
      }
    }
  }

  drawSubtractionCircuit(g: any, bitData: any[], width: number, height: number): void {
    // Draw a subtraction circuit using two's complement
    const boxWidth = 120;
    const boxHeight = 80;
    const xGap = 50;

    // Draw main components
    // First box - Input A
    g.append("rect")
      .attr("x", 10)
      .attr("y", 50)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 50 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("A");

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 50 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#10b981")
      .text(this.operationData.firstOperandBinary);

    // Second box - Input B
    g.append("rect")
      .attr("x", 10)
      .attr("y", 150)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 150 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("B");

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 150 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#10b981")
      .text(this.operationData.secondOperandBinary);

    // Third box - Two's Complement
    g.append("rect")
      .attr("x", 10 + boxWidth + xGap)
      .attr("y", 150)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#312e81")
      .attr("stroke", "#4338ca")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth/2)
      .attr("y", 150 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Two's Complement");

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth/2)
      .attr("y", 150 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#ec4899")
      .text("B' + 1");

    // Fourth box - Adder
    g.append("rect")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap)
      .attr("y", 100)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1e40af")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Binary Adder");

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#d1d5db")
      .text("A + (-B)");

    // Fifth box - Result
    g.append("rect")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap)
      .attr("y", 100)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#0e7490")
      .attr("stroke", "#0ea5e9")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Result");

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#0ea5e9")
      .text(this.operationData.resultBinary);

    // Draw connections
    // A to Adder
    g.append("line")
      .attr("x1", 10 + boxWidth)
      .attr("y1", 50 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap + boxWidth + xGap)
      .attr("y2", 100 + boxHeight/2)
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    // B to Two's Complement
    g.append("line")
      .attr("x1", 10 + boxWidth)
      .attr("y1", 150 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap)
      .attr("y2", 150 + boxHeight/2)
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    // Two's Complement to Adder
    g.append("line")
      .attr("x1", 10 + boxWidth + xGap + boxWidth)
      .attr("y1", 150 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap + boxWidth + xGap)
      .attr("y2", 100 + boxHeight/2)
      .attr("stroke", "#ec4899")
      .attr("stroke-width", 2);

    // Adder to Result
    g.append("line")
      .attr("x1", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth)
      .attr("y1", 100 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap)
      .attr("y2", 100 + boxHeight/2)
      .attr("stroke", "#0ea5e9")
      .attr("stroke-width", 2);

    // Draw explanation box
    const explanationX = 20;
    const explanationY = height - 100;
    const explanationWidth = width - 40;
    const explanationHeight = 80;

    g.append("rect")
      .attr("x", explanationX)
      .attr("y", explanationY)
      .attr("width", explanationWidth)
      .attr("height", explanationHeight)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`Subtraction using Two's Complement: A - B = A + (-B)`);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 45)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`Two's complement of ${this.operationData.secondOperand} = Invert all bits and add 1`);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 70)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`Result: ${this.operationData.firstOperand} - ${this.operationData.secondOperand} = ${this.operationData.result}`);
  }

  drawMultiplicationCircuit(g: any, bitData: any[], width: number, height: number): void {
    // Similar to the React implementation...
    // Draw a multiplication circuit
    const boxWidth = 120;
    const boxHeight = 80;
    const xGap = 50;

    // Draw main components
    // First box - Input A
    g.append("rect")
      .attr("x", 10)
      .attr("y", 50)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 50 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Multiplicand A");

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 50 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#10b981")
      .text(this.operationData.firstOperandBinary);

    // Second box - Input B
    g.append("rect")
      .attr("x", 10)
      .attr("y", 150)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 150 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Multiplier B");

    g.append("text")
      .attr("x", 10 + boxWidth/2)
      .attr("y", 150 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#10b981")
      .text(this.operationData.secondOperandBinary);

    // Third box - Partial Products
    g.append("rect")
      .attr("x", 10 + boxWidth + xGap)
      .attr("y", 100)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#312e81")
      .attr("stroke", "#4338ca")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Partial Products");

    // Draw AND gates inside
    const andSize = 10;
    const andSpacing = 15;
    for (let i = 0; i < 4; i++) {
      g.append("rect")
        .attr("x", 10 + boxWidth + xGap + 20)
        .attr("y", 100 + 40 + i * andSpacing)
        .attr("width", andSize)
        .attr("height", andSize)
        .attr("rx", 2)
        .attr("fill", "#4338ca");

      g.append("text")
        .attr("x", 10 + boxWidth + xGap + 40)
        .attr("y", 100 + 49 + i * andSpacing)
        .attr("font-size", 9)
        .attr("fill", "#d1d5db")
        .text(`A & B[${i}]`);

      g.append("text")
        .attr("x", 10 + boxWidth + xGap + 90)
        .attr("y", 100 + 49 + i * andSpacing)
        .attr("font-size", 9)
        .attr("fill", "#d1d5db")
        .text(`→`);
    }

    // Fourth box - Adder Array
    g.append("rect")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap)
      .attr("y", 100)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1e40af")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Binary Adder Array");

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#d1d5db")
      .text("Sum shifted products");

    // Fifth box - Result
    g.append("rect")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap)
      .attr("y", 100)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#0e7490")
      .attr("stroke", "#0ea5e9")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Product");

    g.append("text")
      .attr("x", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 100 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#0ea5e9")
      .text(this.operationData.resultBinary);

    // Draw connections
    // A to Partial Products
    g.append("line")
      .attr("x1", 10 + boxWidth)
      .attr("y1", 50 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap)
      .attr("y2", 100 + boxHeight/2)
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    // B to Partial Products
    g.append("line")
      .attr("x1", 10 + boxWidth)
      .attr("y1", 150 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap)
      .attr("y2", 100 + boxHeight/2)
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    // Partial Products to Adder
    g.append("line")
      .attr("x1", 10 + boxWidth + xGap + boxWidth)
      .attr("y1", 100 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap + boxWidth + xGap)
      .attr("y2", 100 + boxHeight/2)
      .attr("stroke", "#4338ca")
      .attr("stroke-width", 2);

    // Adder to Result
    g.append("line")
      .attr("x1", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth)
      .attr("y1", 100 + boxHeight/2)
      .attr("x2", 10 + boxWidth + xGap + boxWidth + xGap + boxWidth + xGap)
      .attr("y2", 100 + boxHeight/2)
      .attr("stroke", "#0ea5e9")
      .attr("stroke-width", 2);

    // Draw explanation box
    const explanationX = 20;
    const explanationY = height - 100;
    const explanationWidth = width - 40;
    const explanationHeight = 80;

    g.append("rect")
      .attr("x", explanationX)
      .attr("y", explanationY)
      .attr("width", explanationWidth)
      .attr("height", explanationHeight)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`Binary Multiplication Process`);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 45)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`1. Create partial products (A AND each bit of B)`);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 70)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`2. Shift based on bit position and add together`);
  }

  drawGenericCircuit(g: any, bitData: any[], width: number, height: number): void {
    // Generic circuit for other operations
    const boxWidth = 150;
    const boxHeight = 100;
    const xGap = 50;

    // First box - Inputs
    g.append("rect")
      .attr("x", 100)
      .attr("y", 50)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 100 + boxWidth/2)
      .attr("y", 50 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Inputs");

    g.append("text")
      .attr("x", 100 + boxWidth/2)
      .attr("y", 50 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#10b981")
      .text(`A: ${this.operationData.firstOperandBinary}`);

    g.append("text")
      .attr("x", 100 + boxWidth/2)
      .attr("y", 50 + 70)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#10b981")
      .text(`B: ${this.operationData.secondOperandBinary}`);

    // Second box - Operation
    g.append("rect")
      .attr("x", 100 + boxWidth + xGap)
      .attr("y", 50)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#1e40af")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 100 + boxWidth + xGap + boxWidth/2)
      .attr("y", 50 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`${this.getOperationName()}`);

    g.append("text")
      .attr("x", 100 + boxWidth + xGap + boxWidth/2)
      .attr("y", 50 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#d1d5db")
      .text(`${this.operationData.firstOperand} ${this.getOperatorSymbol(this.operation)} ${this.operationData.secondOperand}`);

    // Third box - Result
    g.append("rect")
      .attr("x", 100 + boxWidth + xGap + boxWidth + xGap)
      .attr("y", 50)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#0e7490")
      .attr("stroke", "#0ea5e9")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("x", 100 + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 50 + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text("Result");

    g.append("text")
      .attr("x", 100 + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 50 + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#0ea5e9")
      .text(this.operationData.resultBinary);

    g.append("text")
      .attr("x", 100 + boxWidth + xGap + boxWidth + xGap + boxWidth/2)
      .attr("y", 50 + 70)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#d1d5db")
      .text(`= ${this.operationData.result}`);

    // Draw connections
    // Inputs to Operation
    g.append("line")
      .attr("x1", 100 + boxWidth)
      .attr("y1", 50 + boxHeight/2)
      .attr("x2", 100 + boxWidth + xGap)
      .attr("y2", 50 + boxHeight/2)
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2);

    // Operation to Result
    g.append("line")
      .attr("x1", 100 + boxWidth + xGap + boxWidth)
      .attr("y1", 50 + boxHeight/2)
      .attr("x2", 100 + boxWidth + xGap + boxWidth + xGap)
      .attr("y2", 50 + boxHeight/2)
      .attr("stroke", "#0ea5e9")
      .attr("stroke-width", 2);

    // Draw explanation box
    const explanationX = 50;
    const explanationY = height - 150;
    const explanationWidth = width - 100;
    const explanationHeight = 120;

    g.append("rect")
      .attr("x", explanationX)
      .attr("y", explanationY)
      .attr("width", explanationWidth)
      .attr("height", explanationHeight)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#1f2937")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", explanationX + explanationWidth/2)
      .attr("y", explanationY + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("fill", "#d1d5db")
      .text(`${this.getOperationName()} Operation`);

    let explanation = '';
    if (this.operation === '/' || this.operation === '÷') {
      explanation = `Division is implemented as repeated subtraction with proper shifting.
The process requires comparing, shifting, and conditional subtraction operations.`;
    } else {
      explanation = `This operation converts the values to binary, performs bit-level operations,
and then converts the result back to decimal.`;
    }

    const lines = explanation.split('\n');
    lines.forEach((line, i) => {
      g.append("text")
        .attr("x", explanationX + explanationWidth/2)
        .attr("y", explanationY + 60 + i * 25)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .attr("fill", "#d1d5db")
        .text(line.trim());
    });
  }

  setupInteractiveBits(): void {
    // Convert binary strings to boolean arrays
    this.interactiveOperandA = this.operationData.firstOperandBinary
      .split('')
      .map(bit => bit === '1');

    this.interactiveOperandB = this.operationData.secondOperandBinary
      .split('')
      .map(bit => bit === '1');

    this.interactiveResult = this.operationData.resultBinary
      .split('')
      .map(bit => bit === '1');
  }

  toggleBit(operand: 'A' | 'B', index: number): void {
    if (operand === 'A') {
      this.interactiveOperandA[index] = !this.interactiveOperandA[index];
    } else {
      this.interactiveOperandB[index] = !this.interactiveOperandB[index];
    }
  }

  resetInteractiveBits(): void {
    this.setupInteractiveBits();
  }

  calculateInteractiveResult(): void {
    // Convert boolean arrays to decimal
    const aDecimal = this.binaryToDecimal(this.interactiveOperandA);
    const bDecimal = this.binaryToDecimal(this.interactiveOperandB);

    // Calculate result based on operation
    let result = 0;
    switch (this.operation) {
      case '+':
        result = aDecimal + bDecimal;
        break;
      case '-':
        result = aDecimal - bDecimal;
        break;
      case '*':
      case '×':
        result = aDecimal * bDecimal;
        break;
      case '/':
      case '÷':
        result = bDecimal !== 0 ? Math.floor(aDecimal / bDecimal) : 0;
        break;
      default:
        if (this.operation) {
          result = eval(`${aDecimal} ${this.operation} ${bDecimal}`);
        }
    }

    // Ensure result fits within bit size
    const maxValue = Math.pow(2, this.bitSize) - 1;
    result = Math.max(0, Math.min(result, maxValue));

    // Convert result to binary and update interactive result
    const resultBinary = result.toString(2).padStart(this.bitSize, '0');
    this.interactiveResult = resultBinary.split('').map(bit => bit === '1');
  }

  binaryToDecimal(bits: boolean[]): number {
    return bits.reduce((acc, bit, index) => {
      return acc + (bit ? Math.pow(2, bits.length - 1 - index) : 0);
    }, 0);
  }

  generateBitOperationTable(): any[] {
    const table = [];
    const steps = this.calculationSteps;

    if (!steps || steps.length === 0) {
      return [];
    }

    // Create a row for each bit position
    for (let i = 0; i < this.bitSize; i++) {
      // Find the step that deals with this bit
      const relevantStep = steps.find(step => step.bitIndex === i);

      if (relevantStep) {
        table.push({
          position: i,
          aBit: relevantStep.operandA[this.bitSize - 1 - i],
          bBit: relevantStep.operandB[this.bitSize - 1 - i],
          operation: this.getOperationForBit(this.operation!, i),
          resultBit: relevantStep.intermediateResult[this.bitSize - 1 - i],
          carry: relevantStep.carries[this.bitSize - 1 - i] || '0'
        });
      }
    }

    return table;
  }

  generateBooleanFormulas(): {description: string, formula: string}[] {
    const formulas = [];

    if (this.operation === '+') {
      formulas.push({
        description: 'LSB Addition (no carry in)',
        formula: 'bit0(x) := a8(x) + b8(x)'
      });

      formulas.push({
        description: 'Initial Carry',
        formula: 'c0(x) := a8(x) & b8(x)'
      });

      formulas.push({
        description: 'Bit with Carry',
        formula: 'bit1(x) := a7(x) + b7(x) + c0(x)'
      });

      formulas.push({
        description: 'Next Carry',
        formula: 'c1(x) := (a7(x) & b7(x)) | (a7(x) & c0(x)) | (b7(x) & c0(x))'
      });
    } else if (this.operation === '-') {
      formulas.push({
        description: 'Negate B',
        formula: 'nb8(x) := b8(x)\''
      });

      formulas.push({
        description: 'Two\'s Complement LSB',
        formula: 'tc8(x) := nb8(x) + 1'
      });

      formulas.push({
        description: 'Initial Carry for Two\'s Complement',
        formula: 'tcc0(x) := nb8(x) & 1'
      });

      formulas.push({
        description: 'Addition with Two\'s Complement',
        formula: 'bit0(x) := a8(x) + tc8(x)'
      });
    } else if (this.operation === '*' || this.operation === '×') {
      formulas.push({
        description: 'Partial Product',
        formula: 'ppB8A8(x) := a8(x) & b8(x)'
      });

      formulas.push({
        description: 'LSB (no addition required)',
        formula: 'bit0(x) := ppB8A8(x)'
      });

      formulas.push({
        description: 'Next Bit (with half adder)',
        formula: 'bit1(x) := halfAdderSum(ppB8A7(x), ppB7A8(x))'
      });

      formulas.push({
        description: 'Carry for Next Bit',
        formula: 'carry1(x) := halfAdderCarry(ppB8A7(x), ppB7A8(x))'
      });
    }

    return formulas;
  }

  getOperationForBit(operation: string, bitIndex: number): string {
    switch (operation) {
      case '+':
        return bitIndex === 0 ? 'XOR' : 'XOR with carry';
      case '-':
        return bitIndex === 0 ? 'A XOR ~B XOR 1' : 'A XOR ~B XOR carry';
      case '*':
      case '×':
        return bitIndex === 0 ? 'AND' : 'Sum of partial products';
      case '/':
      case '÷':
        return 'Division logic';
      default:
        return '';
    }
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

  getOperationName(): string {
    if (!this.operation) return 'Binary Operation';

    switch (this.operation) {
      case '+': return 'Binary Addition';
      case '-': return 'Binary Subtraction';
      case '*':
      case '×': return 'Binary Multiplication';
      case '/':
      case '÷': return 'Binary Division';
      default: return 'Binary Operation';
    }
  }

  getOperationDescription(): string {
    switch (this.operation) {
      case '+':
        return 'Addition uses XOR for the result bit and a combination of AND and OR for the carry bit. Each bit adds the corresponding bits from both operands plus any carry from the previous bit position.';
      case '-':
        return 'Subtraction is implemented as addition with the two\'s complement of the second operand (A - B = A + (-B)). Two\'s complement is formed by inverting all bits and adding 1.';
      case '*':
      case '×':
        return 'Multiplication creates partial products for each bit pair, then adds them with the appropriate shifts. Each partial product is the AND of the corresponding bits.';
      case '/':
      case '÷':
        return 'Division is implemented using a repeated subtraction approach, tracking how many times the divisor can be subtracted from the dividend.';
      default:
        return '';
    }
  }

  getCircuitExplanation(): string {
    switch (this.operation) {
      case '+':
        return 'The circuit shows full adders chained together, with carry bits propagating from right to left. Each full adder uses XOR gates for bit calculation and AND/OR gates for carry generation.';
      case '-':
        return 'The circuit first creates the two\'s complement of the second operand using NOT gates and a +1 addition, then adds this to the first operand using full adders.';
      case '*':
      case '×':
        return 'The circuit generates partial products using AND gates, then combines them using a series of adders. Each row corresponds to one bit of the second operand.';
      case '/':
      case '÷':
        return 'The division circuit uses a restoring division algorithm, with a series of subtractors and shift registers to calculate the quotient.';
      default:
        return '';
    }
  }

}
