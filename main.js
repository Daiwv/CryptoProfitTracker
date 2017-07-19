const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const DBManager = require( path.resolve(__dirname, './js/DBManager.js') );

const appDataPath = app.getPath('userData');
const portfolioDBPath = appDataPath + '\\portfolio';
const metadataDBPath = appDataPath + '\\metadata';
const dbm = new DBManager( portfolioDBPath, metadataDBPath );

let mainWindow;
let portfolioCalc, apiManager, dbManager;

app.on('ready', () => {
    
    mainWindow = new BrowserWindow({
        height: 600,
        width: 900,
        backgroundColor: '#fff'
    });

    mainWindow.setMenu(null);
    mainWindow.loadURL('file://' + __dirname + '/index.html');
});

ipcMain.on('bittrex_auth_add', (event, arg) => {
    dbm.configure( arg.api_key, arg.secret_key, () => {

    });
});
