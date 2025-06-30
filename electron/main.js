const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let nextProcess;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'AV Deals',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  if (process.env.NODE_ENV !== 'development') {
    // Start Next.js server in production
    nextProcess = exec('npx next start', { cwd: path.join(__dirname, '..') });
    // Wait for server to be ready (simple delay, can be improved)
    setTimeout(createWindow, 5000);
  } else {
    createWindow();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle API requests from renderer process
ipcMain.handle('fetch-api', async (event, endpoint, query) => {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Error from ${endpoint}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}); 