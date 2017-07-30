const {app, BrowserWindow, dialog, ipcMain} = require('electron');
const path = require('path');
const await = require('await');

const appPath = path.resolve(__dirname);
const appDataPath = app.getPath('userData');
const portfolioDBPath = appDataPath + '\\portfolio';
const metadataDBPath = appDataPath + '\\metadata';

const APIManager = require( appPath + '/js/APIManager.js' );
const DBManager = require( appPath + '/js/DBManager.js' );
const PortfolioCalculator = require( appPath + '/js/PortfolioCalculator.js' );
const apikeyPath = appPath + '\\config.json';

let mainWindow;
let portfolioCalculator, apiManager, dbManager;
let dbReady = await('db');

app.on('ready', () => {
    dbManager = new DBManager( portfolioDBPath, metadataDBPath, () => {
        dbReady.keep('db', true);
    });

    dbReady.then(function(o) {
        apiManager = new APIManager( dbManager, () => {});
    });

    portfolioCalculator = new PortfolioCalculator();

    mainWindow = new BrowserWindow({
        height: 600,
        width: 900,
        backgroundColor: '#fff'
    });

    mainWindow.loadURL('file://' + __dirname + '/index.html');

    mainWindow.on('close', function (event) {
        app.quit();
    })
});

ipcMain.on('bittrex_auth_add', (event, arg) => {
    dbManager.configure( arg.api_key, arg.secret_key, () => {
        apiManager.refreshAPI(() => {
            apiManager.getTransactions( null, (transactions) => {
                var balances = portfolioCalculator.transactionsToPortfolio( null, transactions );

                dbManager.updatePortfolio( balances, () => {});

                event.sender.send('reply_balances', balances);
            });
        });
    });
});

ipcMain.on('request_stored_balances', (event, arg) => {
    dbManager.getBalances((balances) => {
        event.sender.send('reply_balances', balances);
    });
});

ipcMain.on('request_balances', (event, arg) => {
    apiManager.getBalances((result) => {
        return result;
    });
});

ipcMain.on('update_portfolio', (event, arg) => {
	dbManager.isConfigured((isConfigured) => {
		if( isConfigured ) {
			apiManager.getTransactions( null, (transactions) => {
				var balances = portfolioCalculator.transactionsToPortfolio( undefined, transactions );
				dbManager.updatePortfolio( balances, () => {});
				event.sender.send('reply_update_portfolio', balances);
			});
		} else {
			event.sender.send('reply_update_portfolio', []);
		}
	});
});

ipcMain.on('update_ticker', (event, arg) => {
    arg.forEach((entry) => {
        if( entry.coin != "BTC" ) {
            // TEMPORARY HACK, SHOULD STORE MARKET ON PROCESSING TRANSACTIONS
            var market = "BTC-" + entry.coin;

            apiManager.getTicker( market, function(result) {
                if( result != undefined ) {
                    result["Coin"] = entry.coin;
                    event.sender.send("reply_ticker", result);
                }
            });
        } else {
            var btcEntry = { Coin : "BTC", Last: 1 };
            event.sender.send("reply_ticker", btcEntry);
        }
    });

});

ipcMain.on('request_api', (event, arg) => {
    dbManager.getAPI((api, secret) => {
        var apis = { 'api_key': api, 'secret_key': secret };
        event.sender.send('reply_api', apis);
    });
});
