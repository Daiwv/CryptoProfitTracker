const {app, BrowserWindow, ipcMain} = require('electron');
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

app.on('ready', () => {
    var dbReady = await('db');

    dbManager = new DBManager( portfolioDBPath, metadataDBPath, () => {
        dbReady.keep('db', true);
    });

    dbReady.then(function(o) {
        apiManager = new APIManager( dbManager, () => {
            mainWindow = new BrowserWindow({
                height: 600,
                width: 900,
                backgroundColor: '#fff'
            });

            mainWindow.loadURL('file://' + __dirname + '/index.html');

            mainWindow.on('close', function (event) {
                app.quit();
            });
        });
    });

    portfolioCalculator = new PortfolioCalculator();
});

ipcMain.on('bittrex_auth_add', (event, arg) => {
    dbManager.configure( arg.api_key, arg.secret_key, () => {
        apiManager.refreshAPI(() => {
            apiManager.isValidAuth((isValidAuth) => {
                if(!isValidAuth) {
                    console.log("IS INVALID AUTH, PLEASE CONFIGURE CORRECT ONE");
                }
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

ipcMain.on('initial_csv_sync', (event, arg) => {
    apiManager.isValidAuth((isValidAuth) => {
		if( !isValidAuth ) {
            console.log("AUTH IS NOT VALID, NOT FETCHING");
            return;
        }

        var histories = await('withdrawal', 'deposit', 'order');

        portfolioCalculator.getWithdrawalHistory( apiManager, (history) => {
            histories.keep('withdrawal', history);
        });

        portfolioCalculator.getDepositHistory( apiManager, (history) => {
            histories.keep('deposit', history);
        });

        portfolioCalculator.getOrderHistoryCSV( arg, (history) => {
            histories.keep('order', history.val);
        });

        histories.then((histories) => {
            portfolioCalculator.getTransactions( 0, histories.deposit, histories.withdrawal, histories.order, (retarg) => {
                if( retarg.status == "SUCCESS" ) {
                    var transactions = retarg.val;
                    var balances = [];

                    var newBalancesInfo = portfolioCalculator.transactionsToPortfolio( balances, transactions );

                    var newBalances = newBalancesInfo.val;

                     dbSync( newBalances, transactions );

                     event.sender.send('reply_update_portfolio', {status: "SUCCESS", val: newBalances});
                } else if( retarg.status == "NOT_SYNCED" ) {
                    event.sender.send('reply_update_portfolio', {status: "NOT_SYNCED", val: []});
                }
            });
        });
    });
});

ipcMain.on('update_portfolio', (event, arg) => {
    apiManager.isValidAuth((isValidAuth) => {
		if( !isValidAuth ) {
            console.log("AUTH IS NOT VALID, NOT FETCHING");
            return;
        }

        var fetches = await('deposit', 'withdrawal', 'order', 'tx_id');

        portfolioCalculator.getWithdrawalHistory( apiManager, (history) => {
            fetches.keep('withdrawal', history);
        });

        portfolioCalculator.getDepositHistory( apiManager, (history) => {
            fetches.keep('deposit', history);
        });

        portfolioCalculator.getOrderHistory( apiManager, (history) => {
            fetches.keep('order', history);
        });

        dbManager.getLastTxID((last_tx_id) => {
            fetches.keep('tx_id', last_tx_id);
        });

        fetches.then((fetches) => {
            var info = await('transactions', 'balances');

            portfolioCalculator.getTransactions( fetches.tx_id, fetches.deposit, fetches.withdrawal, fetches.order, (transactions) => {
                info.keep('transactions', transactions);
            });

            dbManager.getBalances((balances) => {
                info.keep('balances', balances);
            });

            info.then((info) => {
                var transactions = info.transactions;
                var balances = info.balances;

                var newBalancesInfo = portfolioCalculator.transactionsToPortfolio( balances, transactions.val );

                var newBalances = newBalancesInfo.val;

                switch( newBalancesInfo.status ) {
                    case "SUCCESS":
                    portfolioCalculator.isBalanceSynced( apiManager, newBalances, (isSynced) => {
                        if( isSynced ) {
                            dbSync( newBalances, transactions );
            				event.sender.send('reply_update_portfolio', newBalancesInfo);
                        } else {
                            console.log("NEED SYNC UPDATE PORTFOLIO AFTER CHECKING WITH BITTREX WALLET");
                            event.sender.send('reply_update_portfolio', {
                                status: "NEED_SYNC",
                                val: null
                            });
                        }
                    });

                    break;

                    case "NEED_SYNC":
                        console.log("NEED SYNC UPDATE PORTFOLIO");
                        event.sender.send('reply_update_portfolio', {
                            status: "NEED_SYNC",
                            val: null
                        });

                    break;
                }
            });
        });
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

/*
 * @param {Array} newBalances - The array of balance (coin) information
 * @param {Array} transactions - The array of list of whole transactions that was
 * applied to the portfolio.
 */
function dbSync( newBalances, transactions ) {
	dbManager.updatePortfolio(newBalances, () => {});

    if( transactions.length > 0 ) {
        var lastTransaction = transactions[transactions.length - 1];
        var lastId;

        switch( lastTransaction.type ) {
            case 'ORDER':
                lastId = lastTransaction.info.OrderUuid;
                break;

            case 'WITHDRAWAL':
                lastId = lastTransaction.info.PaymentUuid;
                break;

            case 'DEPOSIT':
                lastId = lastTransaction.info.Id;
                break;
        }

        dbManager.synchronize( (new Date()).getTime(), lastId );
    }
}
