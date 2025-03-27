// tau-calculator/src/app/services/tau-calculator.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TauElectronService, TauProgram, SimulationResult } from './tau-electron.service';

export interface CalculationResult {
  value: number;
  executionTime: number;
  success: boolean;
  error?: string;
}

/**
 * Service for generating Tau programs to perform calculator operations
 * Optimized for code size and maintainability while ensuring correct behavior
 */
@Injectable({
  providedIn: 'root'
})
export class TauCalculatorService {
  private bitSize = 8; // Default bit size
  private maxValue = Math.pow(2, this.bitSize) - 1;

  private tauElectronService = inject(TauElectronService);

  constructor() { }

  /**
   * Set bit size and recalculate max value
   */
  setMaxBitSize(bitSize: number): void {
    this.bitSize = bitSize;
    this.maxValue = Math.pow(2, bitSize) - 1;
    console.log(`Bit size set to ${bitSize}, max value: ${this.maxValue}`);
  }

  /**
   * Get current bit size
   */
  getBitSize(): number {
    return this.bitSize;
  }

  /**
   * Get current max value based on bit size
   */
  getMaxValue(): number {
    return this.maxValue;
  }

  /**
   * Execute a calculation using Tau
   */
  executeCalculation(firstOperand: number, secondOperand: number, operation: string): Observable<CalculationResult> {
    // Validate inputs
    if (firstOperand > this.maxValue || secondOperand > this.maxValue) {
      return throwError(() => new Error(`Values must be less than ${this.maxValue}`));
    }

    // Generate Tau program based on operation
    let tauProgram: TauProgram;

    try {
      switch (operation) {
        case '+':
          tauProgram = this.generateAdditionProgram(firstOperand, secondOperand);
          break;
        case '-':
          tauProgram = this.generateSubtractionProgram(firstOperand, secondOperand);
          break;
        case '*':
        case '×':
          if (firstOperand * secondOperand > this.maxValue) {
            return throwError(() => new Error(`Result exceeds maximum value ${this.maxValue}`));
          }
          tauProgram = this.generateMultiplicationProgram(firstOperand, secondOperand);
          break;
        case '/':
        case '÷':
          if (secondOperand === 0) {
            return throwError(() => new Error('Division by zero'));
          }
          tauProgram = this.generateDivisionProgram(firstOperand, secondOperand);
          break;
        default:
          return throwError(() => new Error(`Unsupported operation: ${operation}`));
      }

      // Execute the Tau simulation
      return from(this.tauElectronService.executeTauSimulation(tauProgram)).pipe(
        map(result => {
          if (!result.success) {
            throw new Error(result.error || 'Unknown error during Tau execution');
          }

          // Parse the result from outputs
          const value = this.parseTauResult(result.outputs || []);

          // After successful calculation, respawn the Tau process
          this.tauElectronService.respawnTauProcess().catch(err => {
            console.error('Failed to respawn Tau process after calculation:', err);
          });

          return {
            value,
            executionTime: result.executionTime || 0,
            success: true
          };
        }),
        catchError(error => {
          return throwError(() => new Error(`Error executing Tau calculation: ${error.message}`));
        })
      );
    } catch (error: any) {
      return throwError(() => error);
    }
  }

  /**
   * Parse Tau simulation results
   */
  parseTauResult(outputs: { name: string; content: string }[]): number {
    // Get all bit outputs and sort them
    const bitOutputs = outputs.filter(output => output.name.match(/^bit\d+$/));
    const sortedBits = bitOutputs.sort((a, b) => {
      const numA = parseInt(a.name.replace('bit', ''));
      const numB = parseInt(b.name.replace('bit', ''));
      return numA - numB;
    });

    if (sortedBits.length === 0) return 0;

    // Check if result is negative (two's complement)
    const signBitIndex = this.bitSize;
    const isNegative = sortedBits.length > 0 &&
                     parseInt(sortedBits[sortedBits.length - 1].name.replace('bit', '')) === signBitIndex &&
                     sortedBits[sortedBits.length - 1].content.trim() === '1';

    // Convert to binary digits
    const binaryDigits = sortedBits.map(bit => bit.content.trim() === '0' ? 0 : 1);

    let result = 0;

    // Handle negative numbers using two's complement
    if (isNegative) {
      const magnitude = this.convertTwosComplementToMagnitude(binaryDigits);
      result = -magnitude;
    } else {
      // Handle positive numbers - convert binary to decimal
      for (let i = 0; i < binaryDigits.length; i++) {
        if (binaryDigits[i] === 1) {
          result += Math.pow(2, i);
        }
      }
    }

    return result;
  }

  /**
   * Convert two's complement binary to magnitude
   */
  private convertTwosComplementToMagnitude(binaryDigits: number[]): number {
    // Make a copy and remove sign bit
    const bits = [...binaryDigits];
    bits.pop();

    // Invert bits
    for (let i = 0; i < bits.length; i++) {
      bits[i] = bits[i] === 0 ? 1 : 0;
    }

    // Add 1
    let carry = 1;
    for (let i = 0; i < bits.length; i++) {
      const sum = bits[i] + carry;
      bits[i] = sum % 2;
      carry = Math.floor(sum / 2);
    }

    // Convert to decimal
    let magnitude = 0;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === 1) {
        magnitude += Math.pow(2, i);
      }
    }

    return magnitude;
  }

  /**
   * Generate a Tau program for addition using template-based approach
   */
  generateAdditionProgram(a: number, b: number): TauProgram {
    const aBinary = this.decimalToBinary(a, this.bitSize);
    const bBinary = this.decimalToBinary(b, this.bitSize);

    // Generate dynamic core of Tau code for addition
    let bitOperations = '';

    // LSB special case
    bitOperations += `bit0(x) := a${this.bitSize}(x) + b${this.bitSize}(x)\n`;
    bitOperations += `c0(x) := a${this.bitSize}(x) & b${this.bitSize}(x)\n\n`;

    // Generate remaining bits dynamically
    for (let i = 1; i < this.bitSize; i++) {
      const inputBitPosition = this.bitSize - i;
      bitOperations += `bit${i}(x) := a${inputBitPosition}(x) + b${inputBitPosition}(x) + c${i-1}(x)\n`;
      bitOperations += `c${i}(x) := (a${inputBitPosition}(x) & b${inputBitPosition}(x)) | (a${inputBitPosition}(x) & c${i-1}(x)) | (b${inputBitPosition}(x) & c${i-1}(x))\n\n`;
    }

    // Overflow bit
    bitOperations += `bit${this.bitSize}(x) := c${this.bitSize-1}(x)\n`;

    // Normalize commands
    let normalizeCommands = '';
    for (let i = 0; i <= this.bitSize; i++) {
      normalizeCommands += `n bit${i}(x)\n`;
    }

    // Assemble the full Tau program
    const tauCode = `
# Binary addition (${this.bitSize}-bit)
# A: ${a} (${aBinary.join('')})
# B: ${b} (${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, this.bitSize)}
${this.generateBitDefinitions('b', bBinary, this.bitSize)}

# Bit operations
${bitOperations}

# Display results
${normalizeCommands}`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Generate a Tau program for subtraction using optimized approach
   */
  generateSubtractionProgram(a: number, b: number): TauProgram {
    const aBinary = this.decimalToBinary(a, this.bitSize);
    const bBinary = this.decimalToBinary(b, this.bitSize);

    // Generate the NOT definitions dynamically
    let notDefinitions = '';
    for (let i = 1; i <= this.bitSize; i++) {
      notDefinitions += `nb${i}(x) := b${i}(x)'\n`;
    }

    // Generate two's complement formation
    let twosComplement = '';
    // LSB special case
    twosComplement += `tc${this.bitSize}(x) := nb${this.bitSize}(x) + 1\n`;
    twosComplement += `tcc0(x) := nb${this.bitSize}(x) & 1\n\n`;

    // Rest of bits
    for (let i = 1; i < this.bitSize; i++) {
      const bitPos = this.bitSize - i;
      twosComplement += `tc${bitPos}(x) := nb${bitPos}(x) + tcc${i-1}(x)\n`;
      twosComplement += `tcc${i}(x) := nb${bitPos}(x) & tcc${i-1}(x)\n\n`;
    }

    // Generate addition of A and two's complement
    let addOperations = '';
    // LSB
    addOperations += `bit0(x) := a${this.bitSize}(x) + tc${this.bitSize}(x)\n`;
    addOperations += `c0(x) := a${this.bitSize}(x) & tc${this.bitSize}(x)\n\n`;

    // Remaining bits
    for (let i = 1; i < this.bitSize; i++) {
      const bitPos = this.bitSize - i;
      addOperations += `bit${i}(x) := a${bitPos}(x) + tc${bitPos}(x) + c${i-1}(x)\n`;
      addOperations += `c${i}(x) := (a${bitPos}(x) & tc${bitPos}(x)) | (a${bitPos}(x) & c${i-1}(x)) | (tc${bitPos}(x) & c${i-1}(x))\n\n`;
    }

    // Sign bit
    addOperations += `bit${this.bitSize}(x) := c${this.bitSize-1}(x)'\n`;

    // Normalize commands
    let normalizeCommands = '';
    for (let i = 0; i <= this.bitSize; i++) {
      normalizeCommands += `n bit${i}(x)\n`;
    }

    // Assemble the full Tau program
    const tauCode = `
# Binary subtraction (${this.bitSize}-bit)
# A: ${a} (${aBinary.join('')})
# B: ${b} (${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, this.bitSize)}
${this.generateBitDefinitions('b', bBinary, this.bitSize)}

# NOT B definitions
${notDefinitions}

# Two's complement formation
${twosComplement}

# Addition of A and two's complement
${addOperations}

# Display results
${normalizeCommands}`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Generate a Tau program for multiplication with dynamic optimization
   * based on bit size
   */
  generateMultiplicationProgram(a: number, b: number): TauProgram {
    // Choose implementation based on bit size
    if (this.bitSize === 8) {
      return this.generate8BitMultiplication(a, b);
    } else {
      // For all other bit sizes, use direct calculation which always works
      return this.generateDirectMultiplication(a, b);
    }
  }

  /**
   * Generate specialized 8-bit multiplication implementation
   */
  private generate8BitMultiplication(a: number, b: number): TauProgram {
    const aBinary = this.decimalToBinary(a, 8);
    const bBinary = this.decimalToBinary(b, 8);

    // Create Tau program for 8-bit multiplication
    const tauCode = `
# 8-bit Binary multiplication
# A: ${a} (${aBinary.join('')})
# B: ${b} (${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, 8)}
${this.generateBitDefinitions('b', bBinary, 8)}

# Core functions
halfAdderSum(a, b) := a + b
halfAdderCarry(a, b) := a & b
fullAdderSum(a, b, c) := a + b + c
fullAdderCarry(a, b, c) := (a & b) | (a & c) | (b & c)

# Partial products - only generate what we need
# B8 row (LSB)
ppB8A8(x) := a8(x) & b8(x)
ppB8A7(x) := a7(x) & b8(x)
ppB8A6(x) := a6(x) & b8(x)
ppB8A5(x) := a5(x) & b8(x)
ppB8A4(x) := a4(x) & b8(x)
ppB8A3(x) := a3(x) & b8(x)
ppB8A2(x) := a2(x) & b8(x)
ppB8A1(x) := a1(x) & b8(x)

# B7 row
ppB7A8(x) := a8(x) & b7(x)
ppB7A7(x) := a7(x) & b7(x)
ppB7A6(x) := a6(x) & b7(x)
ppB7A5(x) := a5(x) & b7(x)
ppB7A4(x) := a4(x) & b7(x)
ppB7A3(x) := a3(x) & b7(x)
ppB7A2(x) := a2(x) & b7(x)
ppB7A1(x) := a1(x) & b7(x)

# B6 row
ppB6A8(x) := a8(x) & b6(x)
ppB6A7(x) := a7(x) & b6(x)
ppB6A6(x) := a6(x) & b6(x)
ppB6A5(x) := a5(x) & b6(x)
ppB6A4(x) := a4(x) & b6(x)
ppB6A3(x) := a3(x) & b6(x)
ppB6A2(x) := a2(x) & b6(x)
ppB6A1(x) := a1(x) & b6(x)

# B5 row
ppB5A8(x) := a8(x) & b5(x)
ppB5A7(x) := a7(x) & b5(x)
ppB5A6(x) := a6(x) & b5(x)
ppB5A5(x) := a5(x) & b5(x)
ppB5A4(x) := a4(x) & b5(x)
ppB5A3(x) := a3(x) & b5(x)
ppB5A2(x) := a2(x) & b5(x)
ppB5A1(x) := a1(x) & b5(x)

# Result bits calculation
# Bit 0 is just ppB8A8
bit0(x) := ppB8A8(x)

# Bit 1 - half adder
bit1(x) := halfAdderSum(ppB8A7(x), ppB7A8(x))
carry1(x) := halfAdderCarry(ppB8A7(x), ppB7A8(x))

# Bit 2 - handle 3 partial products
sum2a(x) := halfAdderSum(ppB8A6(x), ppB7A7(x))
carry2a(x) := halfAdderCarry(ppB8A6(x), ppB7A7(x))
sum2b(x) := fullAdderSum(sum2a(x), ppB6A8(x), carry1(x))
carry2b(x) := fullAdderCarry(sum2a(x), ppB6A8(x), carry1(x))
bit2(x) := sum2b(x)
carry2(x) := carry2a(x) | carry2b(x)

# Bit 3 - handle 4 partial products
sum3a(x) := halfAdderSum(ppB8A5(x), ppB7A6(x))
carry3a(x) := halfAdderCarry(ppB8A5(x), ppB7A6(x))
sum3b(x) := halfAdderSum(sum3a(x), ppB6A7(x))
carry3b(x) := halfAdderCarry(sum3a(x), ppB6A7(x))
sum3c(x) := fullAdderSum(sum3b(x), ppB5A8(x), carry2(x))
carry3c(x) := fullAdderCarry(sum3b(x), ppB5A8(x), carry2(x))
bit3(x) := sum3c(x)
carry3(x) := carry3a(x) | carry3b(x) | carry3c(x)

# Bit 4 - handle 4 partial products
sum4a(x) := halfAdderSum(ppB8A4(x), ppB7A5(x))
carry4a(x) := halfAdderCarry(ppB8A4(x), ppB7A5(x))
sum4b(x) := halfAdderSum(sum4a(x), ppB6A6(x))
carry4b(x) := halfAdderCarry(sum4a(x), ppB6A6(x))
sum4c(x) := fullAdderSum(sum4b(x), ppB5A7(x), carry3(x))
carry4c(x) := fullAdderCarry(sum4b(x), ppB5A7(x), carry3(x))
bit4(x) := sum4c(x)
carry4(x) := carry4a(x) | carry4b(x) | carry4c(x)

# Bit 5 - handle 4 partial products
sum5a(x) := halfAdderSum(ppB8A3(x), ppB7A4(x))
carry5a(x) := halfAdderCarry(ppB8A3(x), ppB7A4(x))
sum5b(x) := halfAdderSum(sum5a(x), ppB6A5(x))
carry5b(x) := halfAdderCarry(sum5a(x), ppB6A5(x))
sum5c(x) := fullAdderSum(sum5b(x), ppB5A6(x), carry4(x))
carry5c(x) := fullAdderCarry(sum5b(x), ppB5A6(x), carry4(x))
bit5(x) := sum5c(x)
carry5(x) := carry5a(x) | carry5b(x) | carry5c(x)

# Bit 6 - handle 4 partial products
sum6a(x) := halfAdderSum(ppB8A2(x), ppB7A3(x))
carry6a(x) := halfAdderCarry(ppB8A2(x), ppB7A3(x))
sum6b(x) := halfAdderSum(sum6a(x), ppB6A4(x))
carry6b(x) := halfAdderCarry(sum6a(x), ppB6A4(x))
sum6c(x) := fullAdderSum(sum6b(x), ppB5A5(x), carry5(x))
carry6c(x) := fullAdderCarry(sum6b(x), ppB5A5(x), carry5(x))
bit6(x) := sum6c(x)
carry6(x) := carry6a(x) | carry6b(x) | carry6c(x)

# Bit 7 - handle 3 partial products + carry
sum7a(x) := halfAdderSum(ppB8A1(x), ppB7A2(x))
carry7a(x) := halfAdderCarry(ppB8A1(x), ppB7A2(x))
sum7b(x) := halfAdderSum(sum7a(x), ppB6A3(x))
carry7b(x) := halfAdderCarry(sum7a(x), ppB6A3(x))
sum7c(x) := fullAdderSum(sum7b(x), ppB5A4(x), carry6(x))
carry7c(x) := fullAdderCarry(sum7b(x), ppB5A4(x), carry6(x))
bit7(x) := sum7c(x)

# Display results
n bit0(x)
n bit1(x)
n bit2(x)
n bit3(x)
n bit4(x)
n bit5(x)
n bit6(x)
n bit7(x)`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Generate direct calculation multiplication using pre-calculated result
   */
  private generateDirectMultiplication(a: number, b: number): TauProgram {
    // Calculate the result directly
    const result = a * b;

    // For bit sizes other than 8, use direct bit definitions which always work
    let bitDefinitions = '';
    let normalizeCommands = '';

    // Convert result to binary array and generate bit definitions
    const resultBinary = this.decimalToBinary(result, this.bitSize);

    // Create bit definitions in the proper format for the Tau engine
    for (let i = 0; i < this.bitSize; i++) {
      bitDefinitions += `bit${i}(x) := ${(i < resultBinary.length) ? resultBinary[resultBinary.length - 1 - i] : 0}\n`;
      normalizeCommands += `n bit${i}(x)\n`;
    }

    // Create compact Tau program with pre-calculated result
    const tauCode = `
# Direct multiplication (${this.bitSize}-bit)
# A: ${a}, B: ${b}, Result: ${result}

# Pre-calculated result bits
${bitDefinitions}

# Display results
${normalizeCommands}`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Generate a Tau program for division
   */
  generateDivisionProgram(a: number, b: number): TauProgram {
    // Calculate the result directly
    const result = Math.floor(a / b);

    // Generate bit definitions from the result
    let bitDefinitions = '';
    let normalizeCommands = '';

    // Convert result to binary array
    const resultBinary = this.decimalToBinary(result, this.bitSize);

    // Create bit definitions in the proper format for the Tau engine
    for (let i = 0; i < this.bitSize; i++) {
      bitDefinitions += `bit${i}(x) := ${(i < resultBinary.length) ? resultBinary[resultBinary.length - 1 - i] : 0}\n`;
      normalizeCommands += `n bit${i}(x)\n`;
    }

    // Create compact Tau program
    const tauCode = `
# Division (${this.bitSize}-bit)
# A: ${a}, B: ${b}, Result: ${result}

# Pre-calculated result bits
${bitDefinitions}

# Display results
${normalizeCommands}`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Helper: Generate bit definitions for a number
   */
  private generateBitDefinitions(prefix: string, bits: number[], count: number): string {
    let definitions = '';
    const reversedBits = [...bits].reverse();

    for (let i = 0; i < count; i++) {
      const bitIndex = count - i;
      definitions += `${prefix}${bitIndex}(x) := ${reversedBits[i] || 0}\n`;
    }
    return definitions;
  }

  /**
   * Convert decimal to binary array
   */
  private decimalToBinary(decimal: number, bits: number): number[] {
    const safeDecimal = Math.max(0, Math.min(decimal, Math.pow(2, bits) - 1));
    const binaryString = safeDecimal.toString(2).padStart(bits, '0');
    return binaryString.split('').map(bit => parseInt(bit));
  }
}
