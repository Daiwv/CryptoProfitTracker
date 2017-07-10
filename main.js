const {app, BrowserWindow} = require('electron');
const path = require('path');
const DBManager = require( path.resolve(__dirname, './js/DBManager.js') );

const appDataPath = app.getPath('userData');
const portfolioDBPath = appDataPath + '\\portfolio';
const metadataDBPath = appDataPath + '\\metadata';
const dbm = new DBManager( portfolioDBPath, metadataDBPath );

let mainWindow;

app.on('ready', () => {

    mainWindow = new BrowserWindow({
        height: 600,
        width: 1366,
        backgroundColor: '#2e2c29'
    });

    mainWindow.setMenu(null);
    mainWindow.loadURL('file://' + __dirname + '/index.html');
});
