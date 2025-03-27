// tau-calculator/electron/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const readline = require('readline');

// Keep a global reference of the window object and Tau process
let mainWindow;
let tauProcess = null;
let tauReadline = null;
let isProcessReady = false;
let pendingCommands = [];

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Determine if we're in development mode
  const isDev = process.env.ELECTRON_START_URL || process.argv.includes('--serve');

  // Load the app from the appropriate location
  let startUrl;
  if (isDev) {
    startUrl = 'http://localhost:4200';
    console.log('Development mode: loading from Angular dev server at', startUrl);
  } else {
    startUrl = url.format({
      pathname: path.join(__dirname, '../dist/tau-calculator/browser/index.html'),
      protocol: 'file:',
      slashes: true
    });
    console.log('Production mode: loading from filesystem at', startUrl);
  }

  // Enable DevTools for debugging
  mainWindow.webContents.openDevTools();

  mainWindow.loadURL(startUrl);

  // Emitted when the window is closed
  mainWindow.on('closed', function() {
    mainWindow = null;
    stopTauProcess();
  });
}

// Initialize the Tau process
function initTauProcess() {
  if (tauProcess) return;

  try {
    // Get the path to the Tau binary based on platform
    const tauBinary = process.platform === 'win32' ? 'tau.exe' : 'tau';
    let tauPath;

    if (process.env.ELECTRON_START_URL || process.argv.includes('--serve')) {
      // Development mode
      // Use absolute path to project root
      const projectRoot = path.resolve(__dirname, '..');
      tauPath = path.join(projectRoot, 'tau-binary', tauBinary);
      console.log('Development mode detected, using path:', tauPath);

      // Check if binary exists
      const fs = require('fs');
      if (!fs.existsSync(tauPath)) {
        console.error(`Tau binary not found at: ${tauPath}`);
        throw new Error(`Tau binary not found at: ${tauPath}`);
      }
    } else {
      // Production mode (packaged app)
      tauPath = path.join(process.resourcesPath, 'tau-binary', tauBinary);
      console.log('Production mode detected, using path:', tauPath);
    }

    console.log(`Starting Tau process from: ${tauPath}`);

    // Spawn the Tau process with error handling
    tauProcess = spawn(tauPath, ['-S', 'info']);

    if (!tauProcess || !tauProcess.pid) {
      throw new Error('Failed to spawn Tau process');
    }

    console.log('Tau process started with PID:', tauProcess.pid);

    // Add error event handler
    tauProcess.on('error', (err) => {
      console.error('Failed to start Tau process:', err);
      if (mainWindow) {
        mainWindow.webContents.send('tau-error', `Failed to start Tau process: ${err.message}`);
      }
    });

    // Set up readline interface
    tauReadline = readline.createInterface({
      input: tauProcess.stdout,
      terminal: false
    });

    // Track prompt appearance to determine readiness
    tauReadline.on('line', (line) => {
      // Check for prompt to determine if process is ready
      if (line.includes('tau>') && !isProcessReady) {
        console.log('Tau process is ready, prompt detected');
        isProcessReady = true;
        processPendingCommands();
      }

      // Forward output to the renderer process (do this for all lines)
      if (mainWindow) {
        mainWindow.webContents.send('tau-output', line);
      }
    });

    // Handle errors
    tauProcess.stderr.on('data', (data) => {
      console.error(`Tau stderr: ${data}`);
      if (mainWindow) {
        mainWindow.webContents.send('tau-error', data.toString());
      }
    });

    // Handle process exit
    tauProcess.on('close', (code) => {
      console.log(`Tau process exited with code ${code}`);
      tauProcess = null;
      tauReadline = null;
      isProcessReady = false;
    });

    // Send initial command to disable colors
    tauProcess.stdin.write('set colors off\n');
  } catch (error) {
    console.error('Failed to start Tau process:', error);
  }
}

// Process any pending commands
function processPendingCommands() {
  while (pendingCommands.length > 0 && isProcessReady) {
    const { resolve } = pendingCommands.shift();
    resolve();
  }
}

// Stop the Tau process gracefully
function stopTauProcess() {
  if (!tauProcess) return;

  try {
    // Try graceful shutdown first
    tauProcess.stdin.write('quit\n');

    // Force kill after timeout
    setTimeout(() => {
      if (tauProcess && !tauProcess.killed) {
        tauProcess.kill();
        tauProcess = null;
        tauReadline = null;
        isProcessReady = false;
      }
    }, 1000);
  } catch (error) {
    console.error('Error stopping Tau process:', error);
    if (tauProcess) {
      tauProcess.kill();
      tauProcess = null;
      tauReadline = null;
      isProcessReady = false;
    }
  }
}

// Helper function to wait for Tau process to be ready
async function waitForTauReady() {
  if (isProcessReady) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Tau init timeout')), 5000);
    pendingCommands.push({
      resolve: () => {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

// Helper function to clean ANSI codes from text
function cleanAnsiCodes(text) {
  return text.replace(/\u001b\[\d+(?:;\d+)*m|\x1b\[\d+(?:;\d+)*m/g, '');
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  initTauProcess();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});

// Clean up on app quit
app.on('will-quit', () => {
  stopTauProcess();
});

// IPC handlers for Tau communication
ipcMain.handle('execute-tau-command', async (event, command) => {
  return executeCommand(command);
});

// Execute a complete Tau program
ipcMain.handle('execute-tau-program', async (event, tauCode) => {
  console.log('Main process received execute-tau-program request');
  try {
    // Split commands more efficiently
    const commands = tauCode.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    // Pre-process commands to identify bit operations
    const normalizeCommands = commands.filter(cmd => cmd.startsWith('n '));
    const setupCommands = commands.filter(cmd => !cmd.startsWith('n '));

    // Pre-extract bit names from normalization commands for faster lookup
    const bitNames = new Map();
    normalizeCommands.forEach(cmd => {
      const match = cmd.match(/n\s+(\w+)\(x\)/);
      if (match) bitNames.set(cmd, match[1]);
    });

    // Execute setup commands in one go when possible
    for (const cmd of setupCommands) {
      await executeCommand(cmd);
    }

    // Execute normalization commands with optimized result extraction
    const bitResults = new Map();
    for (const cmd of normalizeCommands) {
      const bitName = bitNames.get(cmd);
      if (!bitName) continue;

      const output = await executeCommand(cmd);
      // Simplified parsing - more direct pattern matching with less logging
      const cleanOutput = cleanAnsiCodes(output);
      const valueMatch = cleanOutput.match(/%\d+:\s*(\d+|T|F)/i);

      if (valueMatch) {
        let value = valueMatch[1].toUpperCase() === 'T' ? '1' :
                   valueMatch[1].toUpperCase() === 'F' ? '0' : valueMatch[1];
        bitResults.set(bitName, value);
      } else {
        bitResults.set(bitName, '0');
      }
    }

    return {
      outputs: Array.from(bitResults.entries()).map(([name, content]) => ({ name, content }))
    };
  } catch (error) {
    console.error('Program execution error:', error);
    throw error;
  }
});

// Parse-tau-output handler (kept for backwards compatibility)
ipcMain.handle('parse-tau-output', (event, output, tauCode) => {
  console.log('parse-tau-output called (deprecated)');
  return []; // Return empty array for compatibility
});

// Execute a single command in the Tau process
async function executeCommand(command) {
  // Ensure Tau process is running
  if (!tauProcess || !isProcessReady) {
    if (!tauProcess) initTauProcess();
    await waitForTauReady();
  }

  return new Promise((resolve, reject) => {
    const outputLines = [];
    let commandEchoed = false;
    let commandCompleted = false;

    // Single cleanup function to prevent duplicate listener removal
    const cleanup = () => {
      if (commandCompleted) return;
      commandCompleted = true;
      tauReadline.removeListener('line', lineHandler);
      tauProcess.stderr.removeListener('data', errorHandler);
    };

    const errorHandler = (data) => {
      console.error('Command error received:', data.toString());
      cleanup();
      reject(new Error(data.toString()));
    };

    const lineHandler = (line) => {
      // Echo detection
      if (!commandEchoed) {
        if (line.includes(`tau> ${command}`)) {
          commandEchoed = true;
          return;
        }
      } else {
        // Prompt detection - definitive completion signal
        if (line.includes('tau>')) {
          cleanup();
          resolve(outputLines.join('\n'));
          return;
        }

        // Add to output collection
        outputLines.push(line);

        // Special case for empty line after content (might indicate command completion)
        if (line.trim() === '' && outputLines.length > 0) {
          setTimeout(() => {
            if (!commandCompleted) {
              cleanup();
              resolve(outputLines.join('\n'));
            }
          }, 2);
        }

        // Automatically continue execution steps
        if (line.includes('Execution step:') && tauProcess?.stdin?.writable) {
          tauProcess.stdin.write('\n');
        }
      }
    };

    // Set up listeners
    tauReadline.on('line', lineHandler);
    tauProcess.stderr.on('data', errorHandler);

    // Set timeout
    setTimeout(() => {
      if (!commandCompleted) {
        if (commandEchoed && outputLines.length > 0) {
          cleanup();
          resolve(outputLines.join('\n'));
        } else {
          cleanup();
          reject(new Error('Command execution timeout'));
        }
      }
    }, 5000);

    // Send command with error handling
    try {
      if (!tauProcess?.stdin?.writable) {
        cleanup();
        reject(new Error('Tau process stdin not writable'));
        return;
      }

      tauProcess.stdin.write(command + '\n');
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

// Function to respawn the Tau process
async function respawnTauProcess() {
  console.log('Respawning Tau process...');

  // Stop the current process if it exists
  stopTauProcess();

  // Wait a moment to ensure clean shutdown
  await new Promise(resolve => setTimeout(resolve, 500));

  // Reinitialize the process
  initTauProcess();

  // Wait for it to be ready
  return waitForTauReady().then(() => {
    console.log('Tau process successfully respawned');
    return { success: true };
  }).catch(error => {
    console.error('Failed to respawn Tau process:', error);
    return { success: false, error: error.message };
  });
}

// IPC handler for respawning
ipcMain.handle('respawn-tau-process', async () => {
  return respawnTauProcess();
});
