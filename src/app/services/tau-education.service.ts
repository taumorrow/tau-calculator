// tau-calculator/src/app/services/tau-education.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CalculatorType } from '../calculator/calculator-mode.component';
import { DecimalMode } from './tau-decimal-calculator.service';

export interface CalculationStep {
  title: string;
  description: string;
  bitIndex: number | null;
  operandA: number[];
  operandB: number[];
  operation: string;
  carries: number[];
  intermediateResult: number[];
  tauCode: string;
  explanation: string;
}

export interface BinaryOperationData {
  firstOperand: number;
  secondOperand: number;
  operation: string;
  result: number;
  firstOperandBinary: string;
  secondOperandBinary: string;
  resultBinary: string;
}

export interface TauConcept {
  id: string;
  title: string;
  category: string;
  description: string;
  examples: {
    command: string;
    result: string;
    explanation: string;
  }[];
  parameters?: {
    name: string;
    description: string;
  }[];
  relatedTopics?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TauEducationService {
  private calculationSteps: CalculationStep[] = [];
  private tauConcepts: TauConcept[] = [];
  private http = inject(HttpClient);


  constructor() {
    this.loadTauConcepts();
  }

  /**
   * Load Tau concepts from the help.xml file
   */
  private loadTauConcepts(): void {
    // In a real implementation, this would parse the help.xml file
    // For now, we'll use mock data based on the help.xml structure
    this.tauConcepts = [
      {
        id: 'boolean-algebra',
        title: 'Boolean Algebra Fundamentals',
        category: 'Core Concepts',
        description: 'The Boolean operations are fundamental building blocks in Tau that follow standard Boolean algebra rules while providing specific syntax for logical relationships.',
        examples: [
          { command: 'a & (b & c)', result: 'abc', explanation: 'Associative property of AND' },
          { command: 'x\'', result: 'x\'', explanation: 'Complement/negation of x' },
          { command: 'x + y', result: 'x\'y|xy\'', explanation: 'Either x OR y, but not both' }
        ],
        relatedTopics: ['normal-forms', 'formula-basics']
      },
      {
        id: 'binary-representation',
        title: 'Binary Representation',
        category: 'Core Concepts',
        description: 'Binary representation is the foundation of all calculations in Tau. Numbers are represented as sequences of bits (0s and 1s) that correspond to powers of 2.',
        examples: [
          { command: '5 in binary', result: '00000101', explanation: '1*2^2 + 0*2^1 + 1*2^0 = 4 + 0 + 1 = 5' },
          { command: '-3 in two\'s complement', result: '11111101', explanation: 'Invert bits of 3 (00000011) to get 11111100, then add 1' }
        ],
        relatedTopics: ['binary-operations', 'formula-basics']
      },
      {
        id: 'binary-addition',
        title: 'Binary Addition',
        category: 'Binary Operations',
        description: 'Addition in binary uses XOR for the bit result and a combination of AND and OR operations for carry bits. Each bit position adds the corresponding bits from both operands plus any carry from the previous position.',
        examples: [
          { command: 'bit0(x) := a8(x) + b8(x)', result: 'XOR of LSBs', explanation: 'The + operator in Tau represents XOR for bits' },
          { command: 'c0(x) := a8(x) & b8(x)', result: 'Carry generation', explanation: 'AND of bits produces carry' }
        ],
        relatedTopics: ['binary-operations', 'boolean-algebra']
      },
      {
        id: 'binary-subtraction',
        title: 'Binary Subtraction',
        category: 'Binary Operations',
        description: 'Subtraction in binary is implemented as addition with the two\'s complement of the second operand. The two\'s complement is formed by inverting all bits and adding 1.',
        examples: [
          { command: 'nb8(x) := b8(x)\'', result: 'NOT operation', explanation: 'First step of two\'s complement - negate all bits' },
          { command: 'tc8(x) := nb8(x) + 1', result: 'Two\'s complement', explanation: 'Add 1 to complete two\'s complement' }
        ],
        relatedTopics: ['binary-addition', 'boolean-algebra']
      },
      {
        id: 'binary-multiplication',
        title: 'Binary Multiplication',
        category: 'Binary Operations',
        description: 'Multiplication is performed by calculating partial products and adding them together. Each partial product is the result of ANDing one operand with each bit of the other operand, shifted by the bit position.',
        examples: [
          { command: 'ppB8A8(x) := a8(x) & b8(x)', result: 'Partial product', explanation: 'AND of corresponding bits' },
          { command: 'bit0(x) := ppB8A8(x)', result: 'LSB result', explanation: 'LSB of result is just the AND of LSBs' }
        ],
        relatedTopics: ['binary-addition', 'boolean-algebra']
      },
      {
        id: 'fixed-point',
        title: 'Fixed-Point Representation',
        category: 'Decimal Operations',
        description: 'Fixed-point representation stores decimal numbers by scaling them to integers using a predefined scale factor (typically a power of 10). Operations are performed on these scaled integers, and results are scaled back for display.',
        examples: [
          { command: '2.5 with 2 decimal places', result: '250 (binary: 11111010)', explanation: '2.5 * 10^2 = 250' },
          { command: '3.75 with 2 decimal places', result: '375 (binary: 101110111)', explanation: '3.75 * 10^2 = 375' }
        ],
        relatedTopics: ['binary-operations', 'floating-point']
      },
      {
        id: 'floating-point',
        title: 'Floating-Point Representation',
        category: 'Decimal Operations',
        description: 'Floating-point representation stores numbers with a sign bit, exponent, and mantissa. This allows representation of a much wider range of values but requires more complex operations.',
        examples: [
          { command: '3.75 in float format', result: '0|10000|1110000000', explanation: 'Sign: 0, Exponent: 10000 (biased), Mantissa: 1110000000' },
          { command: '-0.125 in float format', result: '1|01110|0000000000', explanation: 'Sign: 1, Exponent: 01110 (biased), Mantissa: 0000000000' }
        ],
        relatedTopics: ['fixed-point', 'binary-representation']
      },
      {
        id: 'normal-forms',
        title: 'Normal Forms',
        category: 'Advanced Operations',
        description: 'Normal forms are standardized ways of representing logical expressions that make them easier to analyze and compare. Each normal form serves specific purposes in logical reasoning and verification.',
        examples: [
          { command: 'dnf x & (y | z)', result: '(x & y) | (x & z)', explanation: 'Disjunctive Normal Form (DNF)' },
          { command: 'cnf x | (y & z)', result: '(x | y) & (x | z)', explanation: 'Conjunctive Normal Form (CNF)' }
        ],
        relatedTopics: ['boolean-algebra', 'formula-basics']
      },
      {
        id: 'formula-basics',
        title: 'Formula Operations',
        category: 'Core Concepts',
        description: 'Formula operations in Tau provide the foundation for expressing logical statements and relationships using =, !=, &&, ||, and ! operators.',
        examples: [
          { command: 'x = 0', result: 'x = 0', explanation: 'Basic equality to zero' },
          { command: 'x != y', result: 'x\'y|xy\' = 0', explanation: 'Inequality between terms' }
        ],
        relatedTopics: ['boolean-algebra', 'normal-forms']
      }
    ];
  }

  /**
   * Get all Tau concepts
   */
  getTauConcepts(): Observable<TauConcept[]> {
    return of(this.tauConcepts);
  }

  /**
   * Get a specific Tau concept by ID
   */
  getTauConceptById(id: string): Observable<TauConcept | null> {
    const concept = this.tauConcepts.find(c => c.id === id);
    return of(concept || null);
  }

  /**
   * Generate calculation steps for a binary operation
   */
  generateCalculationSteps(
    firstOperand: number,
    secondOperand: number,
    operation: string,
    bitSize: number,
    calculatorType: CalculatorType,
    decimalMode: DecimalMode,
    decimalPlaces: number
  ): CalculationStep[] {
    // Generate steps based on operation type
    switch (operation) {
      case '+':
        this.calculationSteps = this.generateAdditionSteps(
          firstOperand,
          secondOperand,
          bitSize,
          calculatorType,
          decimalMode,
          decimalPlaces
        );
        break;
      case '-':
        this.calculationSteps = this.generateSubtractionSteps(
          firstOperand,
          secondOperand,
          bitSize,
          calculatorType,
          decimalMode,
          decimalPlaces
        );
        break;
      case '*':
      case '×':
        this.calculationSteps = this.generateMultiplicationSteps(
          firstOperand,
          secondOperand,
          bitSize
        );
        break;
      case '/':
      case '÷':
        this.calculationSteps = this.generateDivisionSteps(
          firstOperand,
          secondOperand,
          bitSize
        );
        break;
      default:
        this.calculationSteps = [];
    }

    return this.calculationSteps;
  }

  /**
   * Get current calculation steps
   */
  getCalculationSteps(): CalculationStep[] {
    return this.calculationSteps;
  }

  /**
   * Generate steps for addition
   */
  private generateAdditionSteps(
    a: number,
    b: number,
    bitSize: number,
    calculatorType: CalculatorType,
    decimalMode: DecimalMode,
    decimalPlaces: number
  ): CalculationStep[] {
    const steps: CalculationStep[] = [];

    // Handle decimal calculations by scaling
    if (calculatorType === CalculatorType.DECIMAL) {
      if (decimalMode === DecimalMode.FIXED_POINT) {
        const scale = Math.pow(10, decimalPlaces);
        a = Math.round(a * scale);
        b = Math.round(b * scale);
      }
      // For floating point, this is simplified
    }

    // Convert operands to binary
    const aBinary = this.decimalToBinary(a, bitSize);
    const bBinary = this.decimalToBinary(b, bitSize);

    // Initialize carries and result arrays
    const carries: number[] = new Array(bitSize).fill(0);
    let resultBinary = new Array(bitSize).fill(0);

    // Add initialization step
    steps.push({
      title: 'Initialize Binary Values',
      description: 'Convert decimal values to binary and prepare for calculation',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '+',
      carries: carries.slice(),
      intermediateResult: resultBinary.slice(),
      tauCode: `# Binary addition (${bitSize}-bit)
# A: ${a} (${aBinary.join('')})
# B: ${b} (${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, bitSize)}
${this.generateBitDefinitions('b', bBinary, bitSize)}`,
      explanation: `To perform binary addition, we first convert the decimal values to binary.
A (${a}) becomes ${aBinary.join('')}
B (${b}) becomes ${bBinary.join('')}
We'll add these values bit by bit, starting from the least significant bit (rightmost).`
    });

    // Process each bit position
    for (let i = 0; i < bitSize; i++) {
      const bitPos = bitSize - 1 - i;
      const aBit = aBinary[bitPos];
      const bBit = bBinary[bitPos];

      // Calculate result and carry for this bit
      const carryIn = i > 0 ? carries[bitPos + 1] : 0;
      const sum = aBit + bBit + carryIn;
      resultBinary[bitPos] = sum % 2;

      // Calculate carry out
      if (i < bitSize - 1) {
        carries[bitPos] = Math.floor(sum / 2);
      }

      // Generate step explanation
      let explanation = '';
      if (i === 0) {
        explanation = `For the least significant bit (position ${bitPos}):
- A bit: ${aBit}
- B bit: ${bBit}
- No carry in
- Result: ${aBit} + ${bBit} = ${resultBinary[bitPos]} (${sum} mod 2)
- Carry out: ${Math.floor(sum / 2)} (${sum} div 2)`;
      } else {
        explanation = `For bit position ${bitPos}:
- A bit: ${aBit}
- B bit: ${bBit}
- Carry in: ${carryIn}
- Result: ${aBit} + ${bBit} + ${carryIn} = ${resultBinary[bitPos]} (${sum} mod 2)
- Carry out: ${Math.floor(sum / 2)} (${sum} div 2)`;
      }

      // Generate Tau code for this step
      let tauCode = '';
      if (i === 0) {
        tauCode = `# LSB calculation (bit ${bitPos})
bit${i}(x) := a${bitSize}(x) + b${bitSize}(x)
c${i}(x) := a${bitSize}(x) & b${bitSize}(x)

# For bit ${bitPos}:
# a${bitSize} = ${aBit}, b${bitSize} = ${bBit}
# bit${i} = ${aBit} XOR ${bBit} = ${resultBinary[bitPos]}
# c${i} = ${aBit} AND ${bBit} = ${carries[bitPos]}`;
      } else {
        tauCode = `# Bit ${bitPos} calculation
bit${i}(x) := a${bitSize-i}(x) + b${bitSize-i}(x) + c${i-1}(x)
c${i}(x) := (a${bitSize-i}(x) & b${bitSize-i}(x)) | (a${bitSize-i}(x) & c${i-1}(x)) | (b${bitSize-i}(x) & c${i-1}(x))

# For bit ${bitPos}:
# a${bitSize-i} = ${aBit}, b${bitSize-i} = ${bBit}, c${i-1} = ${carryIn}
# bit${i} = ${aBit} XOR ${bBit} XOR ${carryIn} = ${resultBinary[bitPos]}
# c${i} = (${aBit} AND ${bBit}) OR (${aBit} AND ${carryIn}) OR (${bBit} AND ${carryIn}) = ${carries[bitPos]}`;
      }

      // Add step to steps array
      steps.push({
        title: `Process Bit ${bitPos}`,
        description: `Calculate result for bit position ${bitPos}`,
        bitIndex: bitPos,
        operandA: aBinary,
        operandB: bBinary,
        operation: '+',
        carries: carries.slice(),
        intermediateResult: resultBinary.slice(),
        tauCode,
        explanation
      });
    }

    // Add final result step
    const result = parseInt(resultBinary.join(''), 2);
    let finalExplanation = `The final binary result is ${resultBinary.join('')}, which is ${result} in decimal.`;

    // Add scaling explanation for fixed-point
    if (calculatorType === CalculatorType.DECIMAL && decimalMode === DecimalMode.FIXED_POINT) {
      const scale = Math.pow(10, decimalPlaces);
      const decimalResult = result / scale;
      finalExplanation += `\nSince we're using fixed-point with ${decimalPlaces} decimal places, we divide by ${scale} to get ${decimalResult}.`;
    }

    steps.push({
      title: 'Final Result',
      description: 'Combine all bits to get the final result',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '+',
      carries: carries,
      intermediateResult: resultBinary,
      tauCode: `# Display normalized results
n bit0(x)
n bit1(x)
...
n bit${bitSize-1}(x)`,
      explanation: finalExplanation
    });

    return steps;
  }

  /**
   * Generate steps for subtraction
   */
  private generateSubtractionSteps(
    a: number,
    b: number,
    bitSize: number,
    calculatorType: CalculatorType,
    decimalMode: DecimalMode,
    decimalPlaces: number
  ): CalculationStep[] {
    const steps: CalculationStep[] = [];

    // Handle decimal calculations by scaling
    if (calculatorType === CalculatorType.DECIMAL) {
      if (decimalMode === DecimalMode.FIXED_POINT) {
        const scale = Math.pow(10, decimalPlaces);
        a = Math.round(a * scale);
        b = Math.round(b * scale);
      }
    }

    // Convert operands to binary
    const aBinary = this.decimalToBinary(a, bitSize);
    const bBinary = this.decimalToBinary(b, bitSize);

    // Initial step: prepare operands
    steps.push({
      title: 'Initialize Operands',
      description: 'Convert decimal values to binary and prepare for subtraction',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '-',
      carries: new Array(bitSize).fill(0),
      intermediateResult: new Array(bitSize).fill(0),
      tauCode: `# Binary subtraction (${bitSize}-bit)
# A: ${a} (${aBinary.join('')})
# B: ${b} (${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, bitSize)}
${this.generateBitDefinitions('b', bBinary, bitSize)}`,
      explanation: `To perform binary subtraction, we'll use two's complement method:
1. We'll negate all bits of B
2. Add 1 to get the two's complement
3. Add the two's complement to A

A (${a}) is ${aBinary.join('')}
B (${b}) is ${bBinary.join('')}`
    });

    // Step 2: Negate all bits of B
    const notBBinary = bBinary.map(bit => bit === 0 ? 1 : 0);
    steps.push({
      title: 'Negate B',
      description: 'Invert all bits of the second operand (NOT operation)',
      bitIndex: null,
      operandA: aBinary,
      operandB: notBBinary,
      operation: '-',
      carries: new Array(bitSize).fill(0),
      intermediateResult: new Array(bitSize).fill(0),
      tauCode: `# NOT operation on B
${this.generateBitDefinitions('nb', notBBinary, bitSize, true)}`,
      explanation: `First step of two's complement is to negate all bits of B:
${bBinary.join('')} becomes ${notBBinary.join('')}`
    });

    // Step 3: Add 1 to get two's complement
    let twosComplement = notBBinary.slice();
    let carry = 1;
    for (let i = bitSize - 1; i >= 0; i--) {
      const sum = twosComplement[i] + carry;
      twosComplement[i] = sum % 2 === 0 ? 0 : 1;
      carry = Math.floor(sum / 2);
    }

    steps.push({
      title: 'Form Two\'s Complement',
      description: 'Add 1 to the negated value to form the two\'s complement',
      bitIndex: null,
      operandA: aBinary,
      operandB: twosComplement,
      operation: '-',
      carries: new Array(bitSize).fill(0),
      intermediateResult: new Array(bitSize).fill(0),
      tauCode: `# Add 1 to NOT(B) to form two's complement
tc${bitSize}(x) := nb${bitSize}(x) + 1
tcc0(x) := nb${bitSize}(x) & 1

tc${bitSize-1}(x) := nb${bitSize-1}(x) + tcc0(x)
tcc1(x) := nb${bitSize-1}(x) & tcc0(x)

# continuing for all bits...`,
      explanation: `Second step of two's complement is to add 1 to the negated value:
${notBBinary.join('')} + 1 = ${twosComplement.join('')}

This is -${b} in two's complement representation.`
    });

    // Step 4+: Add A and two's complement of B (similar to addition steps)
    const carries: number[] = new Array(bitSize).fill(0);
    let resultBinary = new Array(bitSize).fill(0);

    for (let i = 0; i < bitSize; i++) {
      const bitPos = bitSize - 1 - i;
      const aBit = aBinary[bitPos];
      const tcBit = twosComplement[bitPos];

      // Calculate result and carry for this bit
      const carryIn = i > 0 ? carries[bitPos + 1] : 0;
      const sum = aBit + tcBit + carryIn;
      resultBinary[bitPos] = sum % 2;

      // Calculate carry out
      if (i < bitSize - 1) {
        carries[bitPos] = Math.floor(sum / 2);
      }

      // Generate Tau code and explanation
      let tauCode, explanation;
      if (i === 0) {
        tauCode = `# LSB addition (bit ${bitPos})
bit0(x) := a${bitSize}(x) + tc${bitSize}(x)
c0(x) := a${bitSize}(x) & tc${bitSize}(x)

# For bit ${bitPos}:
# a${bitSize} = ${aBit}, tc${bitSize} = ${tcBit}
# bit0 = ${aBit} XOR ${tcBit} = ${resultBinary[bitPos]}
# c0 = ${aBit} AND ${tcBit} = ${carries[bitPos]}`;

        explanation = `Adding A and two's complement of B, starting with LSB (position ${bitPos}):
- A bit: ${aBit}
- Two's complement bit: ${tcBit}
- No carry in
- Result: ${aBit} + ${tcBit} = ${resultBinary[bitPos]} (${sum} mod 2)
- Carry out: ${Math.floor(sum / 2)}`;
      } else {
        tauCode = `# Bit ${bitPos} addition
bit${i}(x) := a${bitSize-i}(x) + tc${bitSize-i}(x) + c${i-1}(x)
c${i}(x) := (a${bitSize-i}(x) & tc${bitSize-i}(x)) | (a${bitSize-i}(x) & c${i-1}(x)) | (tc${bitSize-i}(x) & c${i-1}(x))

# For bit ${bitPos}:
# a${bitSize-i} = ${aBit}, tc${bitSize-i} = ${tcBit}, c${i-1} = ${carryIn}
# bit${i} = ${aBit} XOR ${tcBit} XOR ${carryIn} = ${resultBinary[bitPos]}
# c${i} = (${aBit} AND ${tcBit}) OR (${aBit} AND ${carryIn}) OR (${tcBit} AND ${carryIn}) = ${carries[bitPos]}`;

        explanation = `For bit position ${bitPos}:
- A bit: ${aBit}
- Two's complement bit: ${tcBit}
- Carry in: ${carryIn}
- Result: ${aBit} + ${tcBit} + ${carryIn} = ${resultBinary[bitPos]} (${sum} mod 2)
- Carry out: ${Math.floor(sum / 2)}`;
      }

      steps.push({
        title: `Add A and Two's Complement (Bit ${bitPos})`,
        description: `Process bit ${bitPos} in the addition`,
        bitIndex: bitPos,
        operandA: aBinary,
        operandB: twosComplement,
        operation: '-',
        carries: carries.slice(),
        intermediateResult: resultBinary.slice(),
        tauCode,
        explanation
      });
    }

    // Final step: Show result
    const result = parseInt(resultBinary.join(''), 2);
    let finalExplanation = `The final binary result is ${resultBinary.join('')}, which is ${result} in decimal.`;

    // Add scaling explanation for fixed-point
    if (calculatorType === CalculatorType.DECIMAL && decimalMode === DecimalMode.FIXED_POINT) {
      const scale = Math.pow(10, decimalPlaces);
      const decimalResult = result / scale;
      finalExplanation += `\nSince we're using fixed-point with ${decimalPlaces} decimal places, we divide by ${scale} to get ${decimalResult}.`;
    }

    steps.push({
      title: 'Final Result',
      description: 'The subtraction is complete',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '-',
      carries: carries,
      intermediateResult: resultBinary,
      tauCode: `# Display normalized results
n bit0(x)
n bit1(x)
...
n bit${bitSize-1}(x)`,
      explanation: finalExplanation
    });

    return steps;
  }

  /**
   * Generate steps for multiplication
   */
  private generateMultiplicationSteps(a: number, b: number, bitSize: number): CalculationStep[] {
    const steps: CalculationStep[] = [];

    // Convert operands to binary
    const aBinary = this.decimalToBinary(a, bitSize);
    const bBinary = this.decimalToBinary(b, bitSize);

    // Initialize result
    const initialResult = new Array(bitSize).fill(0);

    // Initial step
    steps.push({
      title: 'Initialize Multiplication',
      description: 'Convert decimal values to binary and prepare for multiplication',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '*',
      carries: new Array(bitSize).fill(0),
      intermediateResult: initialResult,
      tauCode: `# Binary multiplication (${bitSize}-bit)
# A: ${a} (${aBinary.join('')})
# B: ${b} (${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, bitSize)}
${this.generateBitDefinitions('b', bBinary, bitSize)}`,
      explanation: `Binary multiplication works by creating partial products for each bit of B,
shifting each partial product based on bit position, and then adding all partial products.

A (${a}) is ${aBinary.join('')}
B (${b}) is ${bBinary.join('')}`
    });

    // For simplicity, we'll use a direct approach for multiplication steps
    // In a full implementation, this would show partial products and addition

    // Generate partial products step
    steps.push({
      title: 'Generate Partial Products',
      description: 'Create partial products by ANDing each bit of B with A',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '*',
      carries: new Array(bitSize).fill(0),
      intermediateResult: initialResult,
      tauCode: `# Partial products
# First row (B8 - LSB of B)
ppB8A8(x) := a8(x) & b8(x)
ppB8A7(x) := a7(x) & b8(x)
ppB8A6(x) := a6(x) & b8(x)
# continuing for all bits...

# Second row (B7)
ppB7A8(x) := a8(x) & b7(x)
ppB7A7(x) := a7(x) & b7(x)
# continuing...`,
      explanation: `For multiplication, we create partial products:
1. For each bit in B, AND it with all bits in A
2. Shift each row based on the bit position in B
3. Add all rows together

For example:
- B's LSB (${bBinary[bitSize-1]}) ANDed with A gives ${bBinary[bitSize-1] ? aBinary.join('') : '00000000'} (shift 0)
- B's next bit (${bBinary[bitSize-2]}) ANDed with A gives ${bBinary[bitSize-2] ? aBinary.join('') : '00000000'} (shift 1)
- And so on...`
    });

    // Final step with result
    const result = a * b;
    const resultBinary = this.decimalToBinary(result, bitSize);

    steps.push({
      title: 'Add Partial Products',
      description: 'Sum all partial products to get the final result',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '*',
      carries: new Array(bitSize).fill(0),
      intermediateResult: resultBinary,
      tauCode: `# LSB directly from first partial product
bit0(x) := ppB8A8(x)

# Bit 1 uses half adder
bit1(x) := halfAdderSum(ppB8A7(x), ppB7A8(x))
carry1(x) := halfAdderCarry(ppB8A7(x), ppB7A8(x))

# Remaining bits use increasingly complex addition
# of partial products with carries`,
      explanation: `After adding all the shifted partial products together,
the final binary result is ${resultBinary.join('')}, which is ${result} in decimal.

If the result is larger than what can be represented in ${bitSize} bits,
overflow occurs and the result is truncated.`
    });

    return steps;
  }

  /**
   * Generate steps for division
   */
  private generateDivisionSteps(a: number, b: number, bitSize: number): CalculationStep[] {
    const steps: CalculationStep[] = [];

    // Basic validation
    if (b === 0) {
      steps.push({
        title: 'Error: Division by Zero',
        description: 'Cannot divide by zero',
        bitIndex: null,
        operandA: [],
        operandB: [],
        operation: '/',
        carries: [],
        intermediateResult: [],
        tauCode: '',
        explanation: 'Division by zero is undefined and cannot be performed.'
      });
      return steps;
    }

    // Convert operands to binary
    const aBinary = this.decimalToBinary(a, bitSize);
    const bBinary = this.decimalToBinary(b, bitSize);

    // Initialize result
    const initialResult = new Array(bitSize).fill(0);

    // Initial step
    steps.push({
      title: 'Initialize Division',
      description: 'Convert decimal values to binary and prepare for division',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '/',
      carries: new Array(bitSize).fill(0),
      intermediateResult: initialResult,
      tauCode: `# Binary division (${bitSize}-bit)
# A: ${a} (${aBinary.join('')})
# B: ${b} (${bBinary.join('')})

# Input definitions
${this.generateBitDefinitions('a', aBinary, bitSize)}
${this.generateBitDefinitions('b', bBinary, bitSize)}`,
      explanation: `Binary division is performed using repeated subtraction and bit shifting.
In Tau, this is a complex operation requiring multiple steps.

A (dividend, ${a}) is ${aBinary.join('')}
B (divisor, ${b}) is ${bBinary.join('')}`
    });

    // For simplicity, we'll use a direct approach for division
    // In a full implementation, this would show the long division process

    // Final step with result
    const quotient = Math.floor(a / b);
    const resultBinary = this.decimalToBinary(quotient, bitSize);

    steps.push({
      title: 'Calculate Division Result',
      description: 'Perform binary division to get the quotient',
      bitIndex: null,
      operandA: aBinary,
      operandB: bBinary,
      operation: '/',
      carries: new Array(bitSize).fill(0),
      intermediateResult: resultBinary,
      tauCode: `# Division in Tau requires multiple subtraction operations
# and bit manipulation that's implemented directly

# Results in:
${this.generateBitDefinitions('result', resultBinary, bitSize, true)}`,
      explanation: `Binary division of ${a} ÷ ${b} equals ${quotient}
with a remainder of ${a % b}.

The binary representation of the quotient is ${resultBinary.join('')}.

Note that in integer division, the remainder is discarded.`
    });

    return steps;
  }

  /**
   * Get binary operation data for visualization
   */
  getBinaryOperationData(
    firstOperand: number,
    secondOperand: number,
    operation: string,
    bitSize: number,
    calculatorType: CalculatorType,
    decimalMode: DecimalMode,
    decimalPlaces: number
  ): BinaryOperationData {
    // Handle decimal calculations by scaling
    let scaledFirst = firstOperand;
    let scaledSecond = secondOperand;

    if (calculatorType === CalculatorType.DECIMAL && decimalMode === DecimalMode.FIXED_POINT) {
      const scale = Math.pow(10, decimalPlaces);
      scaledFirst = Math.round(firstOperand * scale);
      scaledSecond = Math.round(secondOperand * scale);
    }

    // Calculate result
    let result = 0;
    switch (operation) {
      case '+':
        result = scaledFirst + scaledSecond;
        break;
      case '-':
        result = scaledFirst - scaledSecond;
        break;
      case '*':
      case '×':
        result = scaledFirst * scaledSecond;
        break;
      case '/':
      case '÷':
        result = secondOperand !== 0 ? Math.floor(scaledFirst / scaledSecond) : 0;
        break;
    }

    // Ensure result fits within bit size
    const maxValue = Math.pow(2, bitSize) - 1;
    result = Math.max(0, Math.min(result, maxValue));

    // Convert to binary
    const firstBinary = this.decimalToBinary(scaledFirst, bitSize).join('');
    const secondBinary = this.decimalToBinary(scaledSecond, bitSize).join('');
    const resultBinary = this.decimalToBinary(result, bitSize).join('');

    // If decimal fixed-point, scale back the result for display
    let displayResult = result;
    if (calculatorType === CalculatorType.DECIMAL && decimalMode === DecimalMode.FIXED_POINT) {
      const scale = Math.pow(10, decimalPlaces);
      displayResult = result / scale;
    }

    return {
      firstOperand: firstOperand,
      secondOperand: secondOperand,
      operation,
      result: displayResult,
      firstOperandBinary: firstBinary,
      secondOperandBinary: secondBinary,
      resultBinary: resultBinary
    };
  }

  /**
   * Generate circuit SVG for visualization
   */
  generateCircuitSvg(
    operationData: BinaryOperationData,
    operation: string,
    bitSize: number
  ): string {
    // Generate different circuit diagrams based on operation
    switch (operation) {
      case '+':
        return this.generateAdditionCircuit(operationData, bitSize);
      case '-':
        return this.generateSubtractionCircuit(operationData, bitSize);
      case '*':
      case '×':
        return this.generateMultiplicationCircuit(operationData, bitSize);
      case '/':
      case '÷':
        return this.generateDivisionCircuit(operationData, bitSize);
      default:
        return '';
    }
  }

  /**
   * Generate addition circuit SVG
   */
  private generateAdditionCircuit(operationData: BinaryOperationData, bitSize: number): string {
    // Start SVG with basic elements
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${Math.max(400, 150 + bitSize * 50)}" width="100%" height="100%">
    <!-- Background -->
    <rect width="800" height="${Math.max(400, 150 + bitSize * 50)}" fill="#1e293b" rx="10" ry="10"/>

    <!-- Title -->
    <text x="400" y="35" font-family="Arial" font-size="20" fill="#e2e8f0" text-anchor="middle">${bitSize}-bit Binary Addition: ${operationData.firstOperand} + ${operationData.secondOperand} = ${operationData.result}</text>

    <!-- Input A -->
    <text x="80" y="80" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Input A (${operationData.firstOperand})</text>
    <rect x="30" y="90" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="115" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.firstOperandBinary}</text>

    <!-- Input B -->
    <text x="80" y="160" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Input B (${operationData.secondOperand})</text>
    <rect x="30" y="170" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="195" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.secondOperandBinary}</text>`;

    // Add adder circuits for each bit
    svg += `
    <!-- Full Adder Circuits -->
    <g transform="translate(200, 150)">`;

    // Draw adders for each bit
    for (let i = 0; i < Math.min(8, bitSize); i++) {
      const xPos = i * 70;
      svg += `
      <!-- Bit ${bitSize - 1 - i} Adder -->
      <g transform="translate(${xPos}, 0)">
        <circle cx="30" cy="0" r="25" fill="#1e40af" stroke="#3b82f6" stroke-width="2"/>
        <text x="30" y="5" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">FA</text>
        <text x="30" y="-10" font-family="Arial" font-size="9" fill="#e2e8f0" text-anchor="middle">Bit ${bitSize - 1 - i}</text>

        <!-- Input lines -->
        <line x1="0" y1="-15" x2="30" y2="-25" stroke="#3b82f6" stroke-width="2"/>
        <text x="15" y="-25" font-family="monospace" font-size="10" fill="#e2e8f0" text-anchor="middle">A${bitSize - i}</text>

        <line x1="0" y1="15" x2="30" y2="25" stroke="#3b82f6" stroke-width="2"/>
        <text x="15" y="35" font-family="monospace" font-size="10" fill="#e2e8f0" text-anchor="middle">B${bitSize - i}</text>

        ${i > 0 ? `<line x1="0" y1="0" x2="5" y2="0" stroke="#a855f7" stroke-width="2"/>
        <text x="15" y="5" font-family="monospace" font-size="10" fill="#a855f7" text-anchor="middle">Cin</text>` : ''}

        <!-- Output line -->
        <line x1="55" y1="0" x2="70" y2="0" stroke="#38bdf8" stroke-width="2"/>
        <text x="62" y="-5" font-family="monospace" font-size="10" fill="#38bdf8" text-anchor="middle">S</text>

        <!-- Carry line -->
        <line x1="30" y1="25" x2="30" y2="40" stroke="#a855f7" stroke-width="2"/>
        ${i < 7 ? `<line x1="30" y1="40" x2="${xPos + 70}" y2="40" stroke="#a855f7" stroke-width="2"/>
        <line x1="${xPos + 70}" y1="40" x2="${xPos + 70}" y2="0" stroke="#a855f7" stroke-width="2"/>` : ''}
        <text x="40" y="35" font-family="monospace" font-size="10" fill="#a855f7" text-anchor="middle">Cout</text>
      </g>`;
    }

    svg += `
    </g>

    <!-- Result -->
    <text x="720" y="145" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Result (${operationData.result})</text>
    <rect x="670" y="155" width="100" height="40" rx="5" ry="5" fill="#475569" stroke="#64748b" stroke-width="2"/>
    <text x="720" y="180" font-family="monospace" font-size="14" fill="#38bdf8" text-anchor="middle">${operationData.resultBinary}</text>

    <!-- Full Adder Explanation -->
    <rect x="150" y="${Math.max(300, 150 + bitSize * 30)}" width="500" height="120" rx="10" ry="10" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="400" y="${Math.max(330, 180 + bitSize * 30)}" font-family="Arial" font-size="16" fill="#e2e8f0" text-anchor="middle">Full Adder Logic: S = A ⊕ B ⊕ Cin</text>
    <text x="400" y="${Math.max(360, 210 + bitSize * 30)}" font-family="Arial" font-size="16" fill="#e2e8f0" text-anchor="middle">Cout = (A ∧ B) ∨ (A ∧ Cin) ∨ (B ∧ Cin)</text>
    <text x="400" y="${Math.max(390, 240 + bitSize * 30)}" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">⊕ = XOR, ∧ = AND, ∨ = OR</text>
    </svg>`;

    return svg;
  }

  /**
   * Generate subtraction circuit SVG
   */
  private generateSubtractionCircuit(operationData: BinaryOperationData, bitSize: number): string {
    // Create a subtraction circuit with two's complement
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${Math.max(500, 200 + bitSize * 50)}" width="100%" height="100%">
    <!-- Background -->
    <rect width="800" height="${Math.max(500, 200 + bitSize * 50)}" fill="#1e293b" rx="10" ry="10"/>

    <!-- Title -->
    <text x="400" y="35" font-family="Arial" font-size="20" fill="#e2e8f0" text-anchor="middle">${bitSize}-bit Binary Subtraction: ${operationData.firstOperand} - ${operationData.secondOperand} = ${operationData.result}</text>

    <!-- Input A -->
    <text x="80" y="80" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Input A (${operationData.firstOperand})</text>
    <rect x="30" y="90" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="115" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.firstOperandBinary}</text>

    <!-- Input B -->
    <text x="80" y="160" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Input B (${operationData.secondOperand})</text>
    <rect x="30" y="170" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="195" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.secondOperandBinary}</text>

    <!-- Two's Complement Box -->
    <rect x="200" y="170" width="120" height="90" rx="8" ry="8" fill="#312e81" stroke="#4338ca" stroke-width="2"/>
    <text x="260" y="190" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">Two's Complement</text>
    <path d="M200,200 L320,200" stroke="#4338ca" stroke-width="1"/>
    <text x="260" y="215" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">1. Invert all bits</text>
    <text x="260" y="235" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">2. Add 1</text>
    <line x1="140" y1="190" x2="200" y2="190" stroke="#475569" stroke-width="2"/>
    <line x1="320" y1="190" x2="350" y2="190" stroke="#ec4899" stroke-width="2"/>
    <text x="335" y="185" font-family="Arial" font-size="10" fill="#ec4899" text-anchor="middle">-B</text>

    <!-- Addition Circuit -->
    <rect x="350" y="130" width="120" height="90" rx="8" ry="8" fill="#1e40af" stroke="#3b82f6" stroke-width="2"/>
    <text x="410" y="155" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">Binary Adder</text>
    <path d="M350,170 L470,170" stroke="#3b82f6" stroke-width="1"/>
    <text x="410" y="190" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">A + (-B)</text>
    <line x1="140" y1="110" x2="350" y2="110" stroke="#475569" stroke-width="2"/>
    <line x1="350" y1="110" x2="350" y2="150" stroke="#475569" stroke-width="2"/>
    <line x1="350" y1="190" x2="350" y2="150" stroke="#ec4899" stroke-width="2"/>
    <line x1="470" y1="150" x2="520" y2="150" stroke="#38bdf8" stroke-width="2"/>

    <!-- Result -->
    <text x="610" y="155" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Result (${operationData.result})</text>
    <rect x="560" y="165" width="100" height="40" rx="5" ry="5" fill="#475569" stroke="#64748b" stroke-width="2"/>
    <text x="610" y="190" font-family="monospace" font-size="14" fill="#38bdf8" text-anchor="middle">${operationData.resultBinary}</text>

    <!-- Subtraction Explanation -->
    <rect x="150" y="${Math.max(300, 150 + bitSize * 30)}" width="500" height="150" rx="10" ry="10" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="400" y="${Math.max(330, 180 + bitSize * 30)}" font-family="Arial" font-size="16" fill="#e2e8f0" text-anchor="middle">Subtraction using Two's Complement: A - B = A + (-B)</text>
    <text x="400" y="${Math.max(360, 210 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">1. Find B's two's complement: Invert all bits and add 1</text>
    <text x="400" y="${Math.max(385, 235 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">2. Add A and the two's complement of B</text>
    <text x="400" y="${Math.max(410, 260 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">3. Discard any carry from the MSB</text>
    </svg>`;

    return svg;
  }

  /**
   * Generate multiplication circuit SVG
   */
  private generateMultiplicationCircuit(operationData: BinaryOperationData, bitSize: number): string {
    // Create a simplified multiplication circuit diagram
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${Math.max(500, 200 + bitSize * 50)}" width="100%" height="100%">
    <!-- Background -->
    <rect width="800" height="${Math.max(500, 200 + bitSize * 50)}" fill="#1e293b" rx="10" ry="10"/>

    <!-- Title -->
    <text x="400" y="35" font-family="Arial" font-size="20" fill="#e2e8f0" text-anchor="middle">${bitSize}-bit Binary Multiplication: ${operationData.firstOperand} × ${operationData.secondOperand} = ${operationData.result}</text>

    <!-- Input A -->
    <text x="80" y="80" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Multiplicand A (${operationData.firstOperand})</text>
    <rect x="30" y="90" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="115" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.firstOperandBinary}</text>

    <!-- Input B -->
    <text x="80" y="160" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Multiplier B (${operationData.secondOperand})</text>
    <rect x="30" y="170" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="195" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.secondOperandBinary}</text>

    <!-- AND Gates for Partial Products -->
    <g transform="translate(200, 100)">
      <rect x="0" y="0" width="150" height="120" rx="8" ry="8" fill="#312e81" stroke="#4338ca" stroke-width="2"/>
      <text x="75" y="25" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">Partial Products</text>
      <path d="M0,40 L150,40" stroke="#4338ca" stroke-width="1"/>

      <!-- Illustration of partial products -->
      <text x="25" y="60" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="middle">A & B[0]</text>
      <text x="25" y="80" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="middle">A & B[1]</text>
      <text x="25" y="100" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="middle">A & B[2]</text>
      <text x="125" y="60" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="middle">→</text>
      <text x="125" y="80" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="middle">→</text>
      <text x="125" y="100" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="middle">→</text>

      <!-- Inputs -->
      <line x1="-70" y1="20" x2="0" y2="20" stroke="#475569" stroke-width="2"/>
      <line x1="-70" y1="100" x2="0" y2="100" stroke="#475569" stroke-width="2"/>
    </g>

    <!-- Adder Block -->
    <g transform="translate(400, 100)">
      <rect x="0" y="0" width="150" height="120" rx="8" ry="8" fill="#1e40af" stroke="#3b82f6" stroke-width="2"/>
      <text x="75" y="25" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">Binary Adder Array</text>
      <path d="M0,40 L150,40" stroke="#3b82f6" stroke-width="1"/>

      <!-- Illustration of adder array -->
      <text x="75" y="70" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">Add shifted</text>
      <text x="75" y="90" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">partial products</text>

      <!-- Inputs from partial products -->
      <line x1="-50" y1="60" x2="0" y2="60" stroke="#4338ca" stroke-width="2"/>
      <line x1="-50" y1="80" x2="0" y2="80" stroke="#4338ca" stroke-width="2"/>
      <line x1="-50" y1="100" x2="0" y2="100" stroke="#4338ca" stroke-width="2"/>

      <!-- Output to result -->
      <line x1="150" y1="60" x2="200" y2="60" stroke="#38bdf8" stroke-width="2"/>
    </g>

    <!-- Result -->
    <text x="610" y="155" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Product (${operationData.result})</text>
    <rect x="560" y="165" width="100" height="40" rx="5" ry="5" fill="#475569" stroke="#64748b" stroke-width="2"/>
    <text x="610" y="190" font-family="monospace" font-size="14" fill="#38bdf8" text-anchor="middle">${operationData.resultBinary}</text>

    <!-- Multiplication Explanation -->
    <rect x="150" y="${Math.max(300, 150 + bitSize * 30)}" width="500" height="150" rx="10" ry="10" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="400" y="${Math.max(330, 180 + bitSize * 30)}" font-family="Arial" font-size="16" fill="#e2e8f0" text-anchor="middle">Binary Multiplication Process</text>
    <text x="400" y="${Math.max(360, 210 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">1. Generate partial products (A AND each bit of B)</text>
    <text x="400" y="${Math.max(385, 235 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">2. Shift each partial product based on bit position</text>
    <text x="400" y="${Math.max(410, 260 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">3. Add all partial products together</text>
    </svg>`;

    return svg;
  }

  /**
   * Generate division circuit SVG
   */
  private generateDivisionCircuit(operationData: BinaryOperationData, bitSize: number): string {
    // Create a simplified division circuit diagram
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${Math.max(500, 200 + bitSize * 50)}" width="100%" height="100%">
    <!-- Background -->
    <rect width="800" height="${Math.max(500, 200 + bitSize * 50)}" fill="#1e293b" rx="10" ry="10"/>

    <!-- Title -->
    <text x="400" y="35" font-family="Arial" font-size="20" fill="#e2e8f0" text-anchor="middle">${bitSize}-bit Binary Division: ${operationData.firstOperand} ÷ ${operationData.secondOperand} = ${operationData.result}</text>

    <!-- Input A -->
    <text x="80" y="80" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Dividend A (${operationData.firstOperand})</text>
    <rect x="30" y="90" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="115" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.firstOperandBinary}</text>

    <!-- Input B -->
    <text x="80" y="160" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Divisor B (${operationData.secondOperand})</text>
    <rect x="30" y="170" width="100" height="40" rx="5" ry="5" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="80" y="195" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle">${operationData.secondOperandBinary}</text>

    <!-- Division Circuit -->
    <g transform="translate(250, 100)">
      <rect x="0" y="0" width="250" height="150" rx="8" ry="8" fill="#0f172a" stroke="#475569" stroke-width="2"/>
      <text x="125" y="25" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">Binary Division Circuit</text>
      <path d="M0,40 L250,40" stroke="#475569" stroke-width="1"/>

      <!-- Division Components -->
      <rect x="20" y="60" width="100" height="40" rx="5" ry="5" fill="#312e81" stroke="#4338ca" stroke-width="2"/>
      <text x="70" y="85" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">Shift Register</text>

      <rect x="140" y="60" width="90" height="40" rx="5" ry="5" fill="#1e40af" stroke="#3b82f6" stroke-width="2"/>
      <text x="185" y="85" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">Comparator</text>

      <rect x="70" y="110" width="110" height="30" rx="5" ry="5" fill="#701a75" stroke="#be185d" stroke-width="2"/>
      <text x="125" y="130" font-family="Arial" font-size="12" fill="#e2e8f0" text-anchor="middle">Subtractor Unit</text>

      <!-- Connections -->
      <line x1="-120" y1="20" x2="0" y2="20" stroke="#475569" stroke-width="2"/>
      <line x1="-120" y1="80" x2="20" y2="80" stroke="#475569" stroke-width="2"/>
      <line x1="120" y1="80" x2="140" y2="80" stroke="#3b82f6" stroke-width="2"/>
      <line x1="70" y1="125" x2="0" y2="125" stroke="#be185d" stroke-width="2"/>
      <line x1="0" y1="125" x2="0" y2="20" stroke="#be185d" stroke-width="2"/>
      <line x1="250" y1="80" x2="280" y2="80" stroke="#38bdf8" stroke-width="2"/>
    </g>

    <!-- Result -->
    <text x="610" y="155" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Quotient (${operationData.result})</text>
    <rect x="560" y="165" width="100" height="40" rx="5" ry="5" fill="#475569" stroke="#64748b" stroke-width="2"/>
    <text x="610" y="190" font-family="monospace" font-size="14" fill="#38bdf8" text-anchor="middle">${operationData.resultBinary}</text>

    <!-- Division Explanation -->
    <rect x="150" y="${Math.max(300, 150 + bitSize * 30)}" width="500" height="150" rx="10" ry="10" fill="#334155" stroke="#475569" stroke-width="2"/>
    <text x="400" y="${Math.max(330, 180 + bitSize * 30)}" font-family="Arial" font-size="16" fill="#e2e8f0" text-anchor="middle">Binary Division Process</text>
    <text x="400" y="${Math.max(360, 210 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">1. Initialize remainder to the dividend</text>
    <text x="400" y="${Math.max(385, 235 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">2. For each bit position, try to subtract the divisor</text>
    <text x="400" y="${Math.max(410, 260 + bitSize * 30)}" font-family="Arial" font-size="14" fill="#e2e8f0" text-anchor="middle">3. If subtraction possible, set quotient bit to 1 and update remainder</text>
    </svg>`;

    return svg;
  }

  /**
   * Helper: Convert decimal to binary array
   */
  private decimalToBinary(decimal: number, bits: number): number[] {
    const safeDecimal = Math.max(0, Math.min(decimal, Math.pow(2, bits) - 1));
    const binaryString = safeDecimal.toString(2).padStart(bits, '0');
    return binaryString.split('').map(bit => parseInt(bit));
  }

  /**
   * Helper: Generate bit definitions for Tau code
   */
  private generateBitDefinitions(prefix: string, bits: number[], count: number, inline: boolean = false): string {
    let definitions = '';
    const reversedBits = [...bits].reverse();

    for (let i = 0; i < count; i++) {
      const bitIndex = count - i;
      const bitDefinition = `${prefix}${bitIndex}(x) := ${reversedBits[i] || 0}`;
      definitions += inline ? bitDefinition + (i < count - 1 ? ', ' : '') : bitDefinition + '\n';
    }
    return definitions;
  }
}
