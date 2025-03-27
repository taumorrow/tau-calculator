// tau-calculator/src/app/calculator/calculator.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TauCalculatorService } from '../services/tau-calculator.service';
import { TauDecimalCalculatorService, DecimalMode } from '../services/tau-decimal-calculator.service';
import { TauEducationService } from '../services/tau-education.service';
import { TauProgram } from '../services/tau-electron.service';
import { CalculatorModeComponent, CalculatorType } from './calculator-mode.component';
import { TauVisualizationComponent } from './tau-visualization.component';
import { TauStepExecutionComponent } from './tau-step-execution.component';
import { TauConceptBrowserComponent } from './tau-concept-browser.component';

// Define tab enum for use in the template
export enum PreviewTab {
  TauCode = 'tauCode',
  InputFiles = 'inputFiles',
  OutputFiles = 'outputFiles'
}

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalculatorModeComponent,
    TauVisualizationComponent,
    TauStepExecutionComponent,
    TauConceptBrowserComponent
  ],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.css']
})
export class CalculatorComponent implements OnInit, OnDestroy {
  // Make enum accessible to template
  PreviewTab = PreviewTab;
  CalculatorType = CalculatorType;
  DecimalMode = DecimalMode;

  // Calculator state
  displayValue = '0';
  firstOperand: number | null = null;
  operation: string | null = null;
  waitingForSecondOperand = false;
  calculationHistory: { expression: string; result: number }[] = [];
  isProcessing = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  // Program preview state
  showPreview = false;
  generatedTauProgram: TauProgram | null = null;
  activePreviewTab: PreviewTab = PreviewTab.TauCode;
  showFullCode = false;

  // Calculator mode
  calculatorType: CalculatorType = CalculatorType.INTEGER;
  decimalMode: DecimalMode = DecimalMode.FIXED_POINT;
  decimalPlaces: number = 2;

  // Bit size configuration
  bitSize = 8; // Default bit size
  maxBitSizes = [8, 16, 24, 32, 64]; // Available bit size options

  // Educational UI state
  activeTab: string = 'calculator'; // calculator, visualization, step-execution, concepts
  currentConceptContext: string | null = null;

  // References to child components
  @ViewChild(TauConceptBrowserComponent) conceptBrowser!: TauConceptBrowserComponent;

  constructor(
    private tauCalculator: TauCalculatorService,
    public tauDecimalCalculator: TauDecimalCalculatorService,
    private tauEducationService: TauEducationService
  ) { }

  ngOnInit(): void {
    // Test direct command execution
    if (this.tauCalculator['tauElectronService'].isAvailable()) {
      console.log('Testing direct Tau command execution...');
      this.tauCalculator['tauElectronService'].executeCommand('set colors off')
        .subscribe({
          next: (result) => console.log('Command result:', result),
          error: (err) => console.error('Command error:', err)
        });
    }

    // Set the bit size in the calculator services
    this.updateBitSize(this.bitSize);

    // Set decimal calculator initial config
    this.tauDecimalCalculator.setDecimalMode(this.decimalMode);
    this.tauDecimalCalculator.setDecimalPlaces(this.decimalPlaces);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  /**
   * Show specific Tau help topic
   */
  showTauHelp(conceptId: string): void {
    this.currentConceptContext = conceptId;
    this.setActiveTab('concepts');

    // Update the concept browser to show the selected concept
    if (this.conceptBrowser) {
      this.conceptBrowser.selectConceptById(conceptId);
    }
  }

  /**
   * Handle calculator type change
   */
  onCalculatorTypeChange(type: CalculatorType): void {
    this.calculatorType = type;
    this.clearAll();
  }

  /**
   * Handle decimal mode change
   */
  onDecimalModeChange(mode: DecimalMode): void {
    this.decimalMode = mode;
    this.tauDecimalCalculator.setDecimalMode(mode);
    this.clearAll();
  }

  /**
   * Handle decimal places change
   */
  onDecimalPlacesChange(places: number): void {
    this.decimalPlaces = places;
    this.tauDecimalCalculator.setDecimalPlaces(places);
    this.clearAll();
  }

  /**
   * Update bit size and recalculate limits
   */
  updateBitSize(newSize: number): void {
    this.bitSize = newSize;

    // Update max value in calculator services
    this.tauCalculator.setMaxBitSize(this.bitSize);
    this.tauDecimalCalculator.setMaxBitSize(this.bitSize);

    // Reset calculator state when bit size changes
    this.clearAll();
  }

  /**
   * Get current max value based on bit size
   */
  getMaxValue(): number {
    return this.calculatorType === CalculatorType.INTEGER
      ? this.tauCalculator.getMaxValue()
      : this.tauDecimalCalculator.getMaxValue();
  }

  /**
   * Handle numeric input
   */
  handleDigit(digit: string): void {
    if (this.waitingForSecondOperand) {
      this.displayValue = digit;
      this.waitingForSecondOperand = false;
    } else {
      this.displayValue = this.displayValue === '0' ? digit : this.displayValue + digit;
    }

    // Clear any errors and preview when input changes
    this.error = null;
    this.generatedTauProgram = null;
    this.showPreview = false;
  }

  /**
   * Handle decimal point
   */
  handleDecimalPoint(): void {
    if (!this.displayValue.includes('.')) {
      this.displayValue += '.';
    }

    // Clear any errors and preview when input changes
    this.error = null;
    this.generatedTauProgram = null;
    this.showPreview = false;
  }

  /**
   * Handle operation selection
   */
  handleOperation(op: string): void {
    const inputValue = parseFloat(this.displayValue);

    if (this.firstOperand === null) {
      this.firstOperand = inputValue;
    } else if (this.operation) {
      // If an operation was already selected, calculate the result first
      this.calculateResult();
    }

    this.operation = op;
    this.waitingForSecondOperand = true;

    // Clear any errors and preview when operation changes
    this.error = null;
    this.generatedTauProgram = null;
    this.showPreview = false;
  }

  /**
   * Generate preview of Tau program before executing
   */
  generatePreview(): void {
    if (this.firstOperand === null || this.operation === null) {
      return;
    }

    const secondOperand = parseFloat(this.displayValue);
    const maxValue = this.getMaxValue();

    // For decimal calculator, limit operations to + and -
    if (this.calculatorType === CalculatorType.DECIMAL &&
      this.operation !== '+' && this.operation !== '-') {
      this.error = 'Only addition and subtraction are supported for decimal calculations';
      return;
    }

    try {
      // Generate the appropriate Tau program based on calculator type and operation
      if (this.calculatorType === CalculatorType.INTEGER) {
        // Integer calculator operations
        switch (this.operation) {
          case '+':
            this.generatedTauProgram = this.tauCalculator.generateAdditionProgram(this.firstOperand, secondOperand);
            break;
          case '-':
            this.generatedTauProgram = this.tauCalculator.generateSubtractionProgram(this.firstOperand, secondOperand);
            break;
          case '*':
          case '×':
            // Check if result exceeds max value
            if (this.firstOperand * secondOperand > maxValue) {
              this.error = `Result exceeds maximum for ${this.bitSize}-bit precision (${maxValue})`;
              return;
            }
            this.generatedTauProgram = this.tauCalculator.generateMultiplicationProgram(this.firstOperand, secondOperand);
            break;
          case '/':
          case '÷':
            if (secondOperand === 0) {
              this.error = 'Division by zero is not allowed';
              return;
            }
            this.generatedTauProgram = this.tauCalculator.generateDivisionProgram(this.firstOperand, secondOperand);
            break;
          default:
            this.error = `Unsupported operation: ${this.operation}`;
            return;
        }
      } else {
        // Decimal calculator operations
        switch (this.operation) {
          case '+':
            this.generatedTauProgram = this.decimalMode === DecimalMode.FIXED_POINT
              ? this.tauDecimalCalculator.generateFixedPointAdditionProgram(this.firstOperand, secondOperand)
              : this.tauDecimalCalculator.generateFloatingPointAdditionProgram(this.firstOperand, secondOperand);
            break;
          case '-':
            this.generatedTauProgram = this.decimalMode === DecimalMode.FIXED_POINT
              ? this.tauDecimalCalculator.generateFixedPointSubtractionProgram(this.firstOperand, secondOperand)
              : this.tauDecimalCalculator.generateFloatingPointSubtractionProgram(this.firstOperand, secondOperand);
            break;
          default:
            this.error = `Unsupported operation for decimal calculator: ${this.operation}`;
            return;
        }
      }

      // Show the preview
      this.showPreview = true;

      // Prepare calculation steps for educational components
      this.tauEducationService.generateCalculationSteps(
        this.firstOperand,
        secondOperand,
        this.operation,
        this.bitSize,
        this.calculatorType,
        this.decimalMode,
        this.decimalPlaces
      );

    } catch (err: any) {
      this.error = err.message;
      this.generatedTauProgram = null;
      this.showPreview = false;
    }
  }

  /**
   * Calculate the result using Tau
   */
  calculateResult(): void {
    if (this.firstOperand === null || this.operation === null) {
      return;
    }

    const secondOperand = parseFloat(this.displayValue);
    console.log('Calculating:', this.firstOperand, this.operation, secondOperand);

    // First generate preview if not already generated
    if (!this.generatedTauProgram) {
      this.generatePreview();

      // If there was an error generating the preview, stop
      if (this.error || !this.generatedTauProgram) {
        return;
      }
    }

    this.isProcessing = true;
    this.error = null;

    // Execute the calculation based on calculator type
    const calculationObservable = this.calculatorType === CalculatorType.INTEGER
      ? this.tauCalculator.executeCalculation(this.firstOperand, secondOperand, this.operation)
      : this.tauDecimalCalculator.executeCalculation(this.firstOperand, secondOperand, this.operation);

    calculationObservable
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          console.log('Calculation finalized, processing:', this.isProcessing);
          this.isProcessing = false;
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Calculation result:', result);
          // Format the expression for history
          const expression = `${this.firstOperand} ${this.getOperatorSymbol(this.operation!)} ${secondOperand}`;

          // Update display and add to history
          this.displayValue = this.formatResult(result.value);
          this.calculationHistory.unshift({ expression, result: result.value });

          // Keep only last 10 calculations
          if (this.calculationHistory.length > 10) {
            this.calculationHistory.pop();
          }

          // Reset calculator state
          this.firstOperand = null;
          this.operation = null;
          this.generatedTauProgram = null;
          this.showPreview = false;
        },
        error: (err) => {
          console.error('Calculation error:', err);
          this.error = err.message;
          // Display error and reset after delay
          this.displayValue = 'Error';
          setTimeout(() => this.clearAll(), 2000);
        }
      });
  }

  /**
   * Format the result based on calculator type
   */
  formatResult(value: number): string {
    if (this.calculatorType === CalculatorType.INTEGER) {
      return Math.floor(value).toString();
    } else {
      // For decimal calculations, format with appropriate decimal places
      return value.toFixed(this.decimalPlaces);
    }
  }

  /**
   * Clear calculator state
   */
  clearAll(): void {
    this.displayValue = '0';
    this.firstOperand = null;
    this.operation = null;
    this.waitingForSecondOperand = false;
    this.error = null;
    this.generatedTauProgram = null;
    this.showPreview = false;
  }

  /**
   * Clear entry (current display value)
   */
  clearEntry(): void {
    this.displayValue = '0';
    this.error = null;
  }

  /**
   * Delete last digit
   */
  deleteLastDigit(): void {
    if (this.displayValue.length > 1) {
      this.displayValue = this.displayValue.slice(0, -1);
    } else {
      this.displayValue = '0';
    }
    this.error = null;
  }

  /**
   * Toggle preview visibility
   */
  togglePreview(): void {
    if (this.firstOperand !== null && this.operation !== null) {
      if (!this.showPreview) {
        this.generatePreview();
      } else {
        this.showPreview = false;
      }
    }
  }

  /**
   * Set active preview tab
   */
  setPreviewTab(tab: PreviewTab): void {
    this.activePreviewTab = tab;
  }

  /**
   * Toggle showing full code vs truncated version
   */
  toggleFullCode(): void {
    this.showFullCode = !this.showFullCode;
  }

  /**
   * Get the number of input files in the current program
   */
  getInputFileCount(): number {
    return this.generatedTauProgram?.inputFiles.length || 0;
  }

  /**
   * Get the number of output files in the current program
   */
  getOutputFileCount(): number {
    return this.generatedTauProgram?.outputFiles.length || 0;
  }

  /**
   * Get Tau code to display (full or truncated)
   */
  getTauCodeDisplay(): string {
    if (!this.generatedTauProgram?.tauCode) return '';

    if (this.showFullCode) {
      return this.generatedTauProgram.tauCode;
    }

    const lines = this.generatedTauProgram.tauCode.split('\n');
    if (lines.length <= 20) return this.generatedTauProgram.tauCode;

    // Return first 10 and last 10 lines with ellipsis in between
    return [...lines.slice(0, 10), '...', ...lines.slice(-10)].join('\n');
  }

  /**
   * Get input files preview
   */
  getInputFilesDisplay(): string {
    if (!this.generatedTauProgram?.inputFiles) return 'No input files available';

    const files = this.generatedTauProgram.inputFiles;
    const fileDetails = files.map(f => `${f.name}: ${f.content}`);

    if (this.showFullCode) {
      return fileDetails.join('\n');
    }

    if (files.length <= 6) {
      return fileDetails.join('\n');
    }

    // Return first 3 and last 3 files with ellipsis in between
    return [
      ...fileDetails.slice(0, 3),
      `... (${files.length - 6} more files) ...`,
      ...fileDetails.slice(-3)
    ].join('\n');
  }

  /**
   * Get output files preview
   */
  getOutputFilesDisplay(): string {
    if (!this.generatedTauProgram?.outputFiles) return 'No output files available';

    const files = this.generatedTauProgram.outputFiles;
    const fileDetails = files.map(f => `${f.name}`);

    return fileDetails.join('\n');
  }

  /**
   * Get content based on active tab
   */
  getActiveTabContent(): string {
    switch (this.activePreviewTab) {
      case PreviewTab.TauCode:
        return this.getTauCodeDisplay();
      case PreviewTab.InputFiles:
        return this.getInputFilesDisplay();
      case PreviewTab.OutputFiles:
        return this.getOutputFilesDisplay();
      default:
        return '';
    }
  }

  /**
   * Get binary representation of current display value
   */
  getBinaryRepresentation(): string {
    const value = parseFloat(this.displayValue);
    if (isNaN(value)) return '';

    if (this.calculatorType === CalculatorType.INTEGER) {
      // For display purposes, just show the binary for positive integers
      if (value < 0 || !Number.isInteger(value)) return '(non-integer)';

      const maxValue = this.getMaxValue();
      const safeValue = Math.min(Math.max(Math.floor(value), 0), maxValue);
      return safeValue.toString(2).padStart(this.bitSize, '0');
    } else {
      // For decimal calculator, show representation based on mode
      if (this.decimalMode === DecimalMode.FIXED_POINT) {
        // Show fixed-point representation
        const scale = Math.pow(10, this.decimalPlaces);
        const scaledValue = Math.round(value * scale);
        return `${scaledValue.toString(2)} (scaled by ${scale})`;
      } else {
        // For floating point, show a simplified representation
        const sign = value < 0 ? '1' : '0';
        const absValue = Math.abs(value);

        // Special case for zero
        if (absValue === 0) return '0'.padStart(this.bitSize, '0');

        // Calculate approximate exponent and mantissa
        let exponent = Math.floor(Math.log2(absValue));
        let mantissa = absValue / Math.pow(2, exponent) - 1;

        // Format for display
        const bias = Math.pow(2, this.tauDecimalCalculator['exponentBits'] - 1) - 1;
        const biasedExponent = (exponent + bias).toString(2).padStart(this.tauDecimalCalculator['exponentBits'], '0');

        // Convert mantissa to binary (simplified)
        let mantissaBits = '';
        for (let i = 0; i < this.tauDecimalCalculator['mantissaBits']; i++) {
          mantissa *= 2;
          if (mantissa >= 1) {
            mantissaBits += '1';
            mantissa -= 1;
          } else {
            mantissaBits += '0';
          }
        }

        return `${sign}|${biasedExponent}|${mantissaBits}`;
      }
    }
  }

  /**
   * Get operator symbol for display
   */
  getOperatorSymbol(op: string | null): string {
    if (!op) return '';

    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return '';
    }
  }

  /**
     * Wrapper for global parseFloat to use in template
     */
  parseFloat(value: string): number {
    return parseFloat(value);
  }
}
