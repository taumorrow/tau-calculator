// tau-calculator/src/app/services/tau-decimal-calculator.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TauElectronService, TauProgram, SimulationResult } from './tau-electron.service';

export enum DecimalMode {
  FIXED_POINT = 'FIXED_POINT',
  FLOATING_POINT = 'FLOATING_POINT'
}

export interface DecimalCalculationResult {
  value: number;
  executionTime: number;
  success: boolean;
  error?: string;
}

/**
 * Service for generating Tau programs to perform calculator operations on decimal numbers
 * Provides both fixed-point and floating-point calculation modes
 */
@Injectable({
  providedIn: 'root'
})
export class TauDecimalCalculatorService {
  private bitSize = 8; // Default bit size
  private maxValue = Math.pow(2, this.bitSize) - 1;

  // Decimal-specific parameters
  private decimalMode: DecimalMode = DecimalMode.FIXED_POINT;
  private decimalPlaces = 2; // Default decimal places for fixed-point

  // Floating point parameters
  private mantissaBits = 10; // Default mantissa bits
  private exponentBits = 4;  // Default exponent bits

  private tauElectronService = inject(TauElectronService);

  constructor() { }

  /**
   * Set bit size and recalculate max value
   */
  setMaxBitSize(bitSize: number): void {
    this.bitSize = bitSize;
    this.maxValue = Math.pow(2, bitSize) - 1;

    // Recalculate available bits for mantissa and exponent in floating-point mode
    if (this.decimalMode === DecimalMode.FLOATING_POINT) {
      // Reserve 1 bit for sign
      const availableBits = this.bitSize - 1;
      this.exponentBits = Math.min(4, Math.floor(availableBits / 4));
      this.mantissaBits = availableBits - this.exponentBits;
    }

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
   * Set decimal calculation mode (fixed-point or floating-point)
   */
  setDecimalMode(mode: DecimalMode): void {
    this.decimalMode = mode;
    console.log(`Decimal mode set to: ${mode}`);

    // Reconfigure bit allocation for floating point if needed
    if (mode === DecimalMode.FLOATING_POINT) {
      // Reserve 1 bit for sign
      const availableBits = this.bitSize - 1;
      this.exponentBits = Math.min(4, Math.floor(availableBits / 4));
      this.mantissaBits = availableBits - this.exponentBits;
      console.log(`Floating point config: sign=1, exponent=${this.exponentBits}, mantissa=${this.mantissaBits}`);
    }
  }

  /**
   * Get current decimal mode
   */
  getDecimalMode(): DecimalMode {
    return this.decimalMode;
  }

  /**
   * Set decimal places for fixed-point mode
   */
  setDecimalPlaces(places: number): void {
    this.decimalPlaces = places;
    console.log(`Decimal places set to: ${places}`);
  }

  /**
   * Get current decimal places
   */
  getDecimalPlaces(): number {
    return this.decimalPlaces;
  }

  /**
   * Execute a decimal calculation using Tau
   */
  executeCalculation(firstOperand: number, secondOperand: number, operation: string): Observable<DecimalCalculationResult> {
    // We can only do addition and subtraction with decimal numbers
    if (operation !== '+' && operation !== '-') {
      return throwError(() => new Error('Only addition and subtraction are supported for decimal calculations'));
    }

    // Generate Tau program based on operation and decimal mode
    let tauProgram: TauProgram;

    try {
      if (this.decimalMode === DecimalMode.FIXED_POINT) {
        // Handle fixed-point operations
        switch (operation) {
          case '+':
            tauProgram = this.generateFixedPointAdditionProgram(firstOperand, secondOperand);
            break;
          case '-':
            tauProgram = this.generateFixedPointSubtractionProgram(firstOperand, secondOperand);
            break;
          default:
            return throwError(() => new Error(`Unsupported operation: ${operation}`));
        }
      } else {
        // Handle floating-point operations
        switch (operation) {
          case '+':
            tauProgram = this.generateFloatingPointAdditionProgram(firstOperand, secondOperand);
            break;
          case '-':
            tauProgram = this.generateFloatingPointSubtractionProgram(firstOperand, secondOperand);
            break;
          default:
            return throwError(() => new Error(`Unsupported operation: ${operation}`));
        }
      }

      // Execute the Tau simulation
      return from(this.tauElectronService.executeTauSimulation(tauProgram)).pipe(
        map(result => {
          if (!result.success) {
            throw new Error(result.error || 'Unknown error during Tau execution');
          }

          // Parse the result from outputs based on the decimal mode
          const value = this.decimalMode === DecimalMode.FIXED_POINT
            ? this.parseFixedPointResult(result.outputs || [])
            : this.parseFloatingPointResult(result.outputs || []);

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
   * Generate a Tau program for fixed-point addition
   */
  generateFixedPointAdditionProgram(a: number, b: number): TauProgram {
    // Scale the fixed-point values to integers by multiplying by 10^decimalPlaces
    const scale = Math.pow(10, this.decimalPlaces);
    const scaledA = Math.round(a * scale);
    const scaledB = Math.round(b * scale);

    const aBinary = this.decimalToBinary(scaledA, this.bitSize);
    const bBinary = this.decimalToBinary(scaledB, this.bitSize);

    // Generate the bitwise addition program (similar to integer addition)
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

    // Include metadata about the fixed-point calculation
    const tauCode = `
# Fixed-point binary addition (${this.bitSize}-bit)
# Scale factor: 10^${this.decimalPlaces}
# A: ${a} (scaled to ${scaledA}, binary: ${aBinary.join('')})
# B: ${b} (scaled to ${scaledB}, binary: ${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, this.bitSize)}
${this.generateBitDefinitions('b', bBinary, this.bitSize)}

# Bit operations
${bitOperations}

# Display results
${normalizeCommands}

# Result should be divided by ${scale} to get decimal value
`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Generate a Tau program for fixed-point subtraction
   */
  generateFixedPointSubtractionProgram(a: number, b: number): TauProgram {
    // Scale the fixed-point values to integers
    const scale = Math.pow(10, this.decimalPlaces);
    const scaledA = Math.round(a * scale);
    const scaledB = Math.round(b * scale);

    const aBinary = this.decimalToBinary(scaledA, this.bitSize);
    const bBinary = this.decimalToBinary(scaledB, this.bitSize);

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

    // Include metadata about the fixed-point calculation
    const tauCode = `
# Fixed-point binary subtraction (${this.bitSize}-bit)
# Scale factor: 10^${this.decimalPlaces}
# A: ${a} (scaled to ${scaledA}, binary: ${aBinary.join('')})
# B: ${b} (scaled to ${scaledB}, binary: ${bBinary.join('')})

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
${normalizeCommands}

# Result should be divided by ${scale} to get decimal value
`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Generate a Tau program for floating-point addition
   */
  generateFloatingPointAdditionProgram(a: number, b: number): TauProgram {
    // Convert to IEEE-754 like format with our custom bit allocation
    const aEncoded = this.encodeFloatingPoint(a);
    const bEncoded = this.encodeFloatingPoint(b);

    // For simplicity in this implementation, we'll use a direct result approach
    // In a full implementation, we would perform the actual floating-point algorithm in Tau
    const result = a + b;
    const resultEncoded = this.encodeFloatingPoint(result);

    // Create bit definitions for the result
    let bitDefinitions = '';
    let normalizeCommands = '';

    // Generate bit definitions based on our floating-point format
    for (let i = 0; i < this.bitSize; i++) {
      const bitValue = resultEncoded[i] || 0;
      bitDefinitions += `bit${i}(x) := ${bitValue}\n`;
      normalizeCommands += `n bit${i}(x)\n`;
    }

    // Include a comprehensive explanation of the floating-point format for debugging
    const tauCode = `
# Floating-point binary addition (${this.bitSize}-bit)
# Format: Sign(1) + Exponent(${this.exponentBits}) + Mantissa(${this.mantissaBits})
# A: ${a} (encoded: ${aEncoded.join('')})
# B: ${b} (encoded: ${bEncoded.join('')})
# Result: ${result} (encoded: ${resultEncoded.join('')})

# Result bit definitions (direct encoding of the result)
${bitDefinitions}

# Display results
${normalizeCommands}
`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Generate a Tau program for floating-point subtraction
   */
  generateFloatingPointSubtractionProgram(a: number, b: number): TauProgram {
    // Very similar approach to addition, but we calculate a - b
    const aEncoded = this.encodeFloatingPoint(a);
    const bEncoded = this.encodeFloatingPoint(b);

    const result = a - b;
    const resultEncoded = this.encodeFloatingPoint(result);

    let bitDefinitions = '';
    let normalizeCommands = '';

    for (let i = 0; i < this.bitSize; i++) {
      const bitValue = resultEncoded[i] || 0;
      bitDefinitions += `bit${i}(x) := ${bitValue}\n`;
      normalizeCommands += `n bit${i}(x)\n`;
    }

    const tauCode = `
# Floating-point binary subtraction (${this.bitSize}-bit)
# Format: Sign(1) + Exponent(${this.exponentBits}) + Mantissa(${this.mantissaBits})
# A: ${a} (encoded: ${aEncoded.join('')})
# B: ${b} (encoded: ${bEncoded.join('')})
# Result: ${result} (encoded: ${resultEncoded.join('')})

# Result bit definitions (direct encoding of the result)
${bitDefinitions}

# Display results
${normalizeCommands}
`;

    return {
      tauCode,
      inputFiles: [],
      outputFiles: []
    };
  }

  /**
   * Parse Tau simulation results for fixed-point calculations
   */
  parseFixedPointResult(outputs: { name: string; content: string }[]): number {
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

    // Convert from fixed-point to decimal by dividing by the scale factor
    const scale = Math.pow(10, this.decimalPlaces);
    return result / scale;
  }

  /**
   * Parse Tau simulation results for floating-point calculations
   */
  parseFloatingPointResult(outputs: { name: string; content: string }[]): number {
    // Get all bit outputs and sort them
    const bitOutputs = outputs.filter(output => output.name.match(/^bit\d+$/));
    const sortedBits = bitOutputs.sort((a, b) => {
      const numA = parseInt(a.name.replace('bit', ''));
      const numB = parseInt(b.name.replace('bit', ''));
      return numA - numB;
    });

    if (sortedBits.length === 0) return 0;

    // Convert to binary digits array
    const binaryDigits = sortedBits.map(bit => bit.content.trim() === '0' ? 0 : 1);

    // Decode the floating-point value from binary
    return this.decodeFloatingPoint(binaryDigits);
  }

  /**
   * Helper: Convert two's complement binary to magnitude
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
    // Handle negative numbers
    let isNegative = decimal < 0;
    let absValue = Math.abs(decimal);

    // Ensure the value doesn't exceed max representable value
    absValue = Math.min(absValue, this.maxValue);

    // Convert to binary
    let binaryString = absValue.toString(2).padStart(bits, '0');
    let result = binaryString.split('').map(bit => parseInt(bit));

    // If negative, convert to two's complement
    if (isNegative) {
      // Invert all bits
      result = result.map(bit => bit === 0 ? 1 : 0);

      // Add 1
      let carry = 1;
      for (let i = result.length - 1; i >= 0; i--) {
        let sum = result[i] + carry;
        result[i] = sum % 2;
        carry = Math.floor(sum / 2);
        if (carry === 0) break;
      }
    }

    return result;
  }

  /**
   * Encode a number into our custom floating-point format
   * Format: 1 bit sign, exponentBits for exponent, mantissaBits for mantissa
   */
  private encodeFloatingPoint(value: number): number[] {
    // Handle special cases
    if (value === 0) {
      return Array(this.bitSize).fill(0);
    }

    // Determine sign bit
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // Find exponent and mantissa
    let exponent = Math.floor(Math.log2(absValue));
    let mantissa = absValue / Math.pow(2, exponent) - 1; // Subtract 1 because of implied 1

    // Calculate bias for exponent
    const bias = Math.pow(2, this.exponentBits - 1) - 1;
    const biasedExponent = exponent + bias;

    // Result array
    const result: number[] = [];

    // Add sign bit (most significant bit)
    result.push(isNegative ? 1 : 0);

    // Add exponent bits
    const exponentBinary = biasedExponent.toString(2).padStart(this.exponentBits, '0');
    for (let i = 0; i < this.exponentBits; i++) {
      result.push(parseInt(exponentBinary[i]));
    }

    // Add mantissa bits
    for (let i = 0; i < this.mantissaBits; i++) {
      mantissa *= 2;
      if (mantissa >= 1) {
        result.push(1);
        mantissa -= 1;
      } else {
        result.push(0);
      }
    }

    return result;
  }

  /**
   * Decode a binary array from our custom floating-point format to a number
   */
  private decodeFloatingPoint(bits: number[]): number {
    // Handle all zeros - zero value
    if (bits.every(bit => bit === 0)) {
      return 0;
    }

    // Extract sign bit (most significant bit)
    const sign = bits[0] === 1 ? -1 : 1;

    // Extract exponent bits
    const exponentBits = bits.slice(1, 1 + this.exponentBits);
    let biasedExponent = 0;
    for (let i = 0; i < exponentBits.length; i++) {
      biasedExponent = (biasedExponent * 2) + exponentBits[i];
    }

    // Calculate bias for exponent
    const bias = Math.pow(2, this.exponentBits - 1) - 1;
    const exponent = biasedExponent - bias;

    // Extract mantissa bits
    const mantissaBits = bits.slice(1 + this.exponentBits, 1 + this.exponentBits + this.mantissaBits);
    let mantissa = 1; // Implied 1

    for (let i = 0; i < mantissaBits.length; i++) {
      mantissa += mantissaBits[i] * Math.pow(2, -(i + 1));
    }

    // Calculate final value
    return sign * mantissa * Math.pow(2, exponent);
  }
}
