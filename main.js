const {app, remote, BrowserWindow} = require('electron');
const path = require('path');

const DBManager = require( path.resolve(__dirname, './js/DBManager.js') );

const dbm = new DBManager();

let mainWindow;

app.on('ready', () => {

    dbm.initDB();

    mainWindow = new BrowserWindow({
        height: 600,
        width: 1366,
        backgroundColor: '#2e2c29'
    });

    mainWindow.setMenu(null);
    mainWindow.loadURL('file://' + __dirname + '/index.html');
});
