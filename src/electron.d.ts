interface ElectronAPI {
  getApiKey: () => Promise<string>;
  saveApiKey: (apiKey: string) => Promise<boolean>;
  
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 