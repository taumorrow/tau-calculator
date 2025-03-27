// tau-calculator/electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'tauAPI',
  {
    executeCommand: async (command) => {
      try {
        console.log('Sending command to main process:', command);
        const result = await ipcRenderer.invoke('execute-tau-command', command);
        console.log('Command result received');
        return result;
      } catch (err) {
        console.error('Error in executeCommand:', err);
        throw err;
      }
    },

    respawnTauProcess: async () => {
      try {
        console.log('Requesting Tau process respawn');
        const result = await ipcRenderer.invoke('respawn-tau-process');
        console.log('Respawn result:', result);
        return result;
      } catch (err) {
        console.error('Error respawning Tau process:', err);
        throw err;
      }
    },

    executeProgram: async (tauCode) => {
      try {
        console.log('Sending program to main process');
        const result = await ipcRenderer.invoke('execute-tau-program', tauCode);
        console.log('Program result received');
        return result;
      } catch (err) {
        console.error('Error in executeProgram:', err);
        throw err;
      }
    },

    onOutput: (callback) => {
      ipcRenderer.on('tau-output', (_, data) => {
        // Only log in development mode or with debug flag
        callback(data);
      });
    },

    onError: (callback) => {
      ipcRenderer.on('tau-error', (_, data) => {
        console.error('Tau error received:', data);
        callback(data);
      });
    }
  }
);

console.log('Preload script executed, tauAPI exposed to renderer');
