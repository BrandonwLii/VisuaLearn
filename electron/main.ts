// @ts-nocheck
// Add ts-nocheck to disable TypeScript checking for this file
// since we're using CommonJS in an environment that expects ESM

// Use CommonJS require
const electron = require('electron');
const path = require('path');
const Store = require('electron-store');

// Destructure electron exports
const { app, BrowserWindow, ipcMain, screen: electronScreen, desktopCapturer } = electron;
// Rename the screen variable to avoid conflict with the global screen

console.log('Main process starting...');
console.log('__dirname:', __dirname);

// Initialize the store for saving API key and window position
const store = new Store({
  name: 'visualearn-config',
  encryptionKey: process.env.ENCRYPTION_KEY || 'visualearn-secure-key-' + Buffer.from(app.getPath('userData')).toString('hex').slice(0, 16),
  schema: {
    apiKey: {
      type: 'string',
      default: ''
    },
    windowPosition: {
      type: 'object',
      default: { x: null, y: null }
    },
    windowSize: {
      type: 'object',
      default: { width: 500, height: 700 }
    }
  }
});

// Disable GPU Acceleration for Windows
if (process.platform === 'win32') {
  app.disableHardwareAcceleration();
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Define mainWindow variable
let mainWindow = null;

// Function to create the main window
function createWindow() {
  console.log('Creating main window...');
  
  // Get display dimensions
  const primaryDisplay = electronScreen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Set default window size based on display dimensions
  let windowWidth = Math.min(1200, width * 0.8);
  let windowHeight = Math.min(800, height * 0.8);

  // Set default window position
  let windowX = (width - windowWidth) / 2;
  let windowY = (height - windowHeight) / 2;

  // Get the path to the preload script
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload script path:', preloadPath);
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    frame: false, // Frameless window for custom title bar
    transparent: true, // Keep window transparent for rounded corners
    backgroundColor: '#00000000', // Transparent background (RGBA)
    hasShadow: true, // Add window shadow
    resizable: true, // Enable resizing
    alwaysOnTop: true, // Keep window on top until minimized
    skipTaskbar: false, // Show in taskbar
    autoHideMenuBar: true,
    title: 'VisuaLearn',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for IPC to work
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // Check if the window was created successfully
  if (!mainWindow) {
    console.error('Failed to create the main window!');
    app.quit();
    return;
  }

  mainWindow.on('ready-to-show', () => {
    console.log('Window is ready to show');
    mainWindow.show();
    
    // Only open DevTools in development mode
    if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Log when preload script completes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Finished loading the web contents, preload script should be active');
  });

  // Handle preload script errors
  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error(`Preload script error in ${preloadPath}:`, error);
  });

  // Listen for restore/focus events to manage alwaysOnTop state
  mainWindow.on('restore', () => {
    console.log('Window restored, setting alwaysOnTop back to true');
    mainWindow.setAlwaysOnTop(true);
  });
  
  mainWindow.on('focus', () => {
    console.log('Window focused, ensuring alwaysOnTop is true');
    if (!mainWindow.isMinimized()) {
      mainWindow.setAlwaysOnTop(true);
    }
  });

  // Save window position when it's moved
  mainWindow.on('moved', () => {
    const position = mainWindow.getPosition();
    if (position) {
      store.set('windowPosition', { x: position[0], y: position[1] });
    }
  });

  // Save window size when it's resized
  mainWindow.on('resize', () => {
    const size = mainWindow.getSize();
    if (size) {
      store.set('windowSize', { width: size[0], height: size[1] });
    }
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('Loading dev server URL:', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(process.env.DIST || 'dist', 'index.html');
    console.log('Loading production path:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Window close handler
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  console.log('Main window created successfully');
}

// Create the window when the app is ready
app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Register IPC handlers
  registerIpcHandlers();
  
  console.log('App initialization complete');
});

// Handle window controls via IPC
function registerIpcHandlers() {
  console.log('Registering IPC handlers...');
  
  // Window controls
  ipcMain.handle('window:close', () => {
    console.log('IPC: window:close called');
    if (mainWindow) {
      mainWindow.close();
      return true;
    }
    return false;
  });

  ipcMain.handle('window:minimize', () => {
    console.log('IPC: window:minimize called');
    if (mainWindow) {
      // Set alwaysOnTop to false when minimizing
      mainWindow.setAlwaysOnTop(false);
      mainWindow.minimize();
      return true;
    }
    return false;
  });

  ipcMain.handle('window:maximize', () => {
    console.log('IPC: window:maximize called');
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
      } else {
        mainWindow.maximize();
      }
      return true;
    }
    return false;
  });

  // API key management
  ipcMain.handle('get-api-key', () => {
    console.log('Getting API key from store');
    const apiKey = store.get('apiKey');
    console.log('getApiKey result:', apiKey ? 'API key found' : 'No API key found');
    return apiKey;
  });

  ipcMain.handle('save-api-key', (_, apiKey) => {
    console.log('Saving API key to store, length:', apiKey ? apiKey.length : 0);
    store.set('apiKey', apiKey);
    console.log('saveApiKey result: true');
    return true;
  });
  
  // Screenshot functionality
  ipcMain.handle('capture-screenshot', async () => {
    try {
      console.log('Capturing screenshot...');
      
      // Create a temporary hidden window to capture the screen
      const screenshotWin = new BrowserWindow({
        width: 0,
        height: 0,
        show: false,
        webPreferences: {
          offscreen: true
        }
      });
      
      // Wait for the window to be ready
      await screenshotWin.loadURL('about:blank');
      
      // Get primary display information
      const primaryDisplay = electronScreen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      
      // Capture the screen
      console.log(`Capturing screen with dimensions: ${width}x${height}`);
      const image = await screenshotWin.webContents.capturePage({
        x: 0,
        y: 0,
        width: width,
        height: height
      });
      
      // Convert to data URL
      const dataUrl = image.toDataURL();
      console.log(`Screenshot captured successfully (${dataUrl.length} bytes)`);
      
      // Close the temporary window
      screenshotWin.destroy();
      
      return dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw error;
    }
  });
  
  // Utility function for testing the IPC connection
  ipcMain.handle('ping', () => {
    console.log('Electron API ping');
    return 'pong';
  });
  
  console.log('IPC handlers registered successfully');
}

// Log any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
}); 