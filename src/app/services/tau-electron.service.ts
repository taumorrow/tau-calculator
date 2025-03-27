// tau-calculator/src/app/services/tau-electron.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface TauProgram {
  tauCode: string;
  inputFiles: { name: string; content: string }[];
  outputFiles: { name: string }[];
}

export interface SimulationResult {
  success: boolean;
  outputs?: { name: string; content: string }[];
  error?: string;
  executionTime?: number;
}

// Define the window interface for TypeScript
declare global {
  interface Window {
    tauAPI?: {
      executeCommand: (command: string) => Promise<string>;
      executeProgram: (tauCode: string) => Promise<any>;
      parseTauOutput: (output: string, tauCode: string) => Promise<{ name: string, content: string }[]>;
      onOutput: (callback: (data: string) => void) => void;
      onError: (callback: (data: string) => void) => void;
      testConnection: () => Promise<any>;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class TauElectronService {

  private initialized = false;
  private outputCallback: ((data: string) => void) | null = null;
  private errorCallback: ((data: string) => void) | null = null;

  constructor() {
    // Set up output and error listeners as soon as service is created
    this.setupListeners();
  }

  /**
   * Check if the Electron Tau API is available
   */
  isAvailable(): boolean {
    return !!window.tauAPI;
  }

  /**
   * Setup event listeners for Tau output and errors
   */
  private setupListeners(): void {
    if (this.isAvailable()) {
      window.tauAPI!.onOutput((data) => {
        if (this.outputCallback) {
          this.outputCallback(data);
        }
      });

      window.tauAPI!.onError((data) => {
        console.error('Tau error:', data);
        if (this.errorCallback) {
          this.errorCallback(data);
        }
      });
    }
  }

  /**
   * Initialize the Tau API and test connection
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    if (!this.isAvailable()) {
      console.error('Tau API not available');
      return false;
    }

    this.initialized = true;
    return true;
  }

  /**
   * Execute a Tau simulation
   */
  async executeTauSimulation(program: TauProgram): Promise<SimulationResult> {
    const startTime = Date.now();

    try {
      const initialized = await this.init();
      if (!initialized) {
        return {
          success: false,
          error: 'Tau API not initialized',
          executionTime: Date.now() - startTime
        };
      }

      console.log('Executing Tau simulation...');
      const result = await window.tauAPI!.executeProgram(program.tauCode);
      console.log('Program execution completed');

      return {
        success: true,
        outputs: result.outputs || [],
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      console.error('Error executing Tau simulation:', error);
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute a single Tau command (useful for debugging)
   */
  executeCommand(command: string): Observable<string> {
    if (!this.isAvailable()) {
      return throwError(() => new Error('Electron Tau API is not available'));
    }

    return from(window.tauAPI!.executeCommand(command)).pipe(
      catchError(error => {
        console.error('Error executing Tau command:', error);
        return throwError(() => new Error(`Error executing command: ${error.message}`));
      })
    );
  }

  /**
   * Register a callback for Tau output (useful for monitoring)
   */
  onTauOutput(callback: (data: string) => void): void {
    this.outputCallback = callback;
  }

  /**
   * Register a callback for Tau errors
   */
  onTauError(callback: (data: string) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Parse Tau output to extract results (helper method)
   * Note: This is now largely deprecated as results are parsed in main process
   */
  async parseTauOutput(output: string, tauCode: string): Promise<{ name: string, content: string }[]> {
    if (!this.isAvailable()) {
      throw new Error('Electron Tau API is not available');
    }

    try {
      return await window.tauAPI!.parseTauOutput(output, tauCode);
    } catch (error: any) {
      console.error('Error parsing Tau output:', error);
      throw new Error(`Error parsing output: ${error.message}`);
    }
  }

  /**
 * Respawns the Tau process to ensure a clean state for the next calculation
 * @returns A promise that resolves when the process has been respawned
 */
  respawnTauProcess(): Promise<{ success: boolean, error?: string }> {
    return new Promise<{ success: boolean, error?: string }>((resolve, reject) => {
      const tauAPI = (window as any).tauAPI;

      if (!tauAPI?.respawnTauProcess) {
        reject(new Error('Tau respawn API not available'));
        return;
      }

      tauAPI.respawnTauProcess()
        .then((result: { success: boolean, error?: string }) => {
          console.log('Tau process respawn result:', result);
          resolve(result);
        })
        .catch((error: any) => {
          console.error('Failed to respawn Tau process:', error);
          reject(error);
        });
    });
  }
}
