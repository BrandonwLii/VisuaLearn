// @ts-nocheck
const { contextBridge, ipcRenderer } = require('electron');

// Make sure the context bridge is established as early as possible
console.log('Preload script starting...');

// Define the structure of our electronAPI
interface ElectronAPI {
  getApiKey: () => Promise<string>;
  saveApiKey: (apiKey: string) => Promise<boolean>;
  closeWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  captureScreenshot: () => Promise<string>;
  ping: () => string;
}

// Wait for the window to be fully loaded before exposing APIs
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, exposing Electron API...');
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // API key management
  getApiKey: async () => {
    try {
      const result = await ipcRenderer.invoke('get-api-key');
      console.log('getApiKey result:', result ? 'API key found' : 'No API key found');
      return result;
    } catch (error) {
      console.error('Error in getApiKey:', error);
      throw error;
    }
  },
  
  saveApiKey: async (apiKey: string) => {
    try {
      console.log('saveApiKey called with key length:', apiKey?.length || 0);
      const result = await ipcRenderer.invoke('save-api-key', apiKey);
      console.log('saveApiKey result:', result);
      return result;
    } catch (error) {
      console.error('Error in saveApiKey:', error);
      throw error;
    }
  },
  
  // Window management
  closeWindow: async () => {
    try {
      return await ipcRenderer.invoke('window:close');
    } catch (error) {
      console.error('Error closing window:', error);
    }
  },
  
  minimizeWindow: async () => {
    try {
      return await ipcRenderer.invoke('window:minimize');
    } catch (error) {
      console.error('Error minimizing window:', error);
    }
  },
  
  maximizeWindow: async () => {
    try {
      return await ipcRenderer.invoke('window:maximize');
    } catch (error) {
      console.error('Error maximizing window:', error);
    }
  },
  
  // Screenshot functionality
  captureScreenshot: async () => {
    try {
      console.log('Preload: requesting screenshot capture');
      const result = await ipcRenderer.invoke('capture-screenshot');
      console.log('Preload: screenshot capture successful');
      return result;
    } catch (error) {
      console.error('Preload: Error capturing screenshot:', error);
      throw error;
    }
  },
  
  // Simple ping function to test if the API is available
  ping: () => {
    console.log('Electron API ping');
    return 'pong';
  }
} as ElectronAPI);

console.log('Preload script completed, electronAPI should be available'); 