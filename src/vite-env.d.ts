/// <reference types="vite/client" />

interface ElectronAPI {
  getApiKey: () => Promise<string>;
  saveApiKey: (apiKey: string) => Promise<boolean>;
  minimizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<boolean>;
  ping: () => string;
}

interface Window {
  electronAPI: ElectronAPI;
}
