const _ = require('lodash');
const fs = require('fs');
const csv = require('fast-csv');
const helper = require('./helper');

class PortfolioCalculator {
    constructor() {
    }

    /*
    * @param {Class} apiManager - The API Manager
    * @param {requestCallback} fn - return the sorted withdrawal history
    */
    getWithdrawalHistory( apiManager, fn ) {
        apiManager.getWithdrawalHistory((history) => {
            history = helper.mapToDate(history, 'WITHDRAWAL');
            fn( history );
        });
    }

    /*
    * @param {Class} apiManager - The API Manager
    * @param {requestCallback} fn - return the sorted deposit history
    */
    getDepositHistory( apiManager, fn ) {
        apiManager.getDepositHistory((history) => {
            history = helper.mapToDate(history, 'DEPOSIT');
            fn( history );
        });
    }

    /*
    * @param {Class} apiManager - The API Manager
    * @param {requestCallback} fn - return the sorted order history (only recent, not full)
    */
    getOrderHistory( apiManager, fn ) {
        apiManager.getOrderHistory((history) => {
            history = helper.mapToDate(history, 'ORDER');
            fn( history );
        });
    }

    /*
    * @param {String} csvPath - The path to CSV file to be parsed
    * @param {requestCallback} fn - return the sorted order history (full)
    * @return {Object} The final balances with the buy rate
    *
    * Process the CSV data similar getSortedOrderHistory
    */
    getOrderHistoryCSV( csvPath, fn ) {
        var orderHistory = [];

        if( fs.existsSync(csvPath) ) {
            csv.fromPath(csvPath, {headers: true}).on("data", function(data) {
                // data.Opened += "+00:00";
                // data.Closed += "+00:00";
                data.TimeStamp = data.Opened + "+00:00";
                data.OrderType = data.Type;
                delete( data.Type );
                data.QuantityRemaining = 0;
                data.Commission = parseFloat(data.CommissionPaid);
                delete( data.CommissionPaid );
                data.Price = parseFloat(data.Price);
                data.Quantity = parseFloat(data.Quantity);
                data.PricePerUnit = parseFloat(data.Limit);
                orderHistory.push( data );
            }).on("end", function(){
                orderHistory = helper.mapToDate( orderHistory, "ORDER" );
                fn({
                    status: "SUCCESS",
                    val: orderHistory
                });
            });
        } else {
            fn({
                status: "CSV_NOT_FOUND",
                val: null
            });
        }
    }

    /*
    * Combining the transactions and omit the already committed transaction by checking
    * the Id for each transaction to the lastId used to sync the database.
    *
    * {
    *   status: {"NOT_SYNCED", "SUCCESS"},
    *   val: [{
    *       type: ('DEPOSIT' | 'WITHDRAWAL' | 'ORDER'),
    *       time: (datetime),
    *       info: {...}
    *   },
    *   {
    *       ...
    *   }]
    * }
    *
    * @param {String} lastId - the last transactions sync'd to the database
    * @param {requestCallback} fn - return all the transaction histories
    *
    * WITHDRAWAL info keys : ['PaymentUuid', 'Currency', 'Amount', 'TxCost'];
    * DEPOSIT info keys    : ['Id', 'Currency', 'Amount']
    * ORDER info keys      : ['OrderUuid', 'Exchange', 'OrderType', 'Quantity', * 'QuantityRemaining', 'Commission', 'Price', 'PricePerUnit']
    *
    * These (filtered) keys can be seen on helper.mapToDate method.
    */
    getTransactions( lastId, depositHistory, withdrawalHistory, orderHistory, fn ) {
        var nonOrderHistory = withdrawalHistory.concat(depositHistory);
        var combinedHistories = [];

        nonOrderHistory.sort(function compare(a,b) {
            var dateA = a.time;
            var dateB = b.time;
            return dateA - dateB;
        });

        // Bittrex Does not give second and milliseconds timeframe in datetime, some tx can get ordered wrongly
        while( nonOrderHistory.length && orderHistory.length ) {
            if( nonOrderHistory[0].time <= orderHistory[0].time ) {
                combinedHistories.push(nonOrderHistory.shift());
            } else {
                combinedHistories.push(orderHistory.shift());
            }
        }

        while( nonOrderHistory.length ) {
            combinedHistories.push(nonOrderHistory.shift());
        }

        while( orderHistory.length ) {
            combinedHistories.push(orderHistory.shift());
        }

        if( lastId != 0 ) {
            do {
                var id;

                switch(combinedHistories[0]['type']) {
                case 'ORDER':
                    id = combinedHistories[0]['info']['OrderUuid'];
                    break;

                case 'DEPOSIT':
                    id = combinedHistories[0]['info']['Id'];
                    break;

                case 'WITHDRAWAL':
                    id = combinedHistories[0]['info']['PaymentUuid'];
                    break;
                }

                if( id == lastId ) {
                    combinedHistories.splice(0, 1);
                    break;
                } else {
                    combinedHistories.splice(0, 1);
                }

                if( combinedHistories.length == 0 ) {
                    // Transactions is not in sync, ask user to do CSV sync
                    fn({
                      status: "NOT_SYNCED",
                      val: null
                    });
                }
            } while( true );
        }

        fn({
            status: "SUCCESS",
            val: combinedHistories
        });
    }

    /*
     * @param {Object} balances - The current portfolio, empty array [] if none
     * @param {Object} transactions - The transactions to be ap plied
     * @return {Object} The final balances with the buy rate
     *
     * Return Example
     * {
     *      status: <SUCCESS|NEED_SYNC>,
     *      val: [{ 'coin': 'ANS', 'market': 'BTC-ANS', 'buy_rate': ..., 'amount': ''}]
     * }
     *
     * Transaction entries example see getTransactions
     */
    transactionsToPortfolio( balances, transactions ) {
        var retarg = {
            status: "SUCCESS",
            val: balances
        };

        for( var transaction of transactions ) {
            var tx_info = transaction['info'];
            var coinName = tx_info['Currency']; // only for Withdrawal / Deposit
            var amount = tx_info['Amount'];
            var transactionType = transaction['type'];
            var foundNotSync = false;

            // Process the transaction information
            switch( transaction['type'] ) {
            case 'WITHDRAWAL':
                var amountWithdrawn = parseFloat(amount);
                var txCost = parseFloat(tx_info['TxCost']);
                var totalWithdrawn = amountWithdrawn + txCost;

                if( coinName == "BTC" || coinName == "ETH" ) {
                    market = (coinName == "BTC") ? "USDT-BTC" : "BTC-ETH";

                    var balance = _.find( balances, {coin: coinName, market: market} );

                    if( balance == undefined ) {
                        console.log("FOUND IMBALANCED LEDGER");
                        foundNotSync = true;
                        break;
                    }

                    var b = balance.amount;

                    balance.amount -= totalWithdrawn;
                } else {
                    var balanceBTCMarket = _.find( balances, {coin: coinName, market: "BTC-" + coinName } );

                    var balanceETHMarket = _.find( balances, {coin: coinName, market: "ETH-" + coinName } );

                    if( balanceBTCMarket == undefined && balanceETHMarket == undefined ) {
                        console.log("FOUND IMBALANCED LEDGER, CHECK");
                        foundNotSync = true;
                        break;
                    }

                    var b1 = (balanceBTCMarket != undefined) ? balanceBTCMarket.amount : 0;

                    var b2 = (balanceETHMarket != undefined) ? balanceETHMarket.amount : 0;

                    if( b1 > 0 ) {
                        if( (b1 - totalWithdrawn) < 0 ) {
                            var leftover = totalWithdrawn - balanceBTCMarket.amount;
                            balanceBTCMarket.amount = 0;

                            // this could not be the case?
                            balanceETHMarket.amount -= leftover;
                        } else {
                            balanceBTCMarket.amount -= totalWithdrawn;
                        }
                    } else if( b2 > 0 ) {
                        balanceETHMarket.amount -= totalWithdrawn;
                    }
                }

                break;

            case 'DEPOSIT':
                if( coinName == "BTC" ) {
                    market = "USDT-BTC";
                } else {
                    market = "BTC-" + coinName;
                }

                var balance = _.find(balances, {coin: coinName, market: market});

                if( balance == undefined ) {
                    balance = {};
                    balance['coin'] = coinName;
                    balance['market'] = market;
                    balance['buy_rate'] = null;
                    balance['amount'] = parseFloat(amount);
                    balances.push( balance );
                } else {
                    balance['amount'] += parseFloat(amount);
                }

                break;

            case 'ORDER':
                var market = tx_info['Exchange'];
                var exchangeSource, exchangeDestination;

                helper.parseOrderExchange( market, (excs, excd) => {
                    exchangeSource = excs; // BTC or ETH
                    exchangeDestination = excd;
                });

                var quantity = tx_info['Quantity'] - tx_info['QuantityRemaining'];

                switch( tx_info['OrderType'] ) {
                case "LIMIT_SELL":
                    var dstBalance = _.find(balances, { coin : exchangeDestination, market: market });

                    if( dstBalance == undefined ) {
                        console.log("FOUND IMBALANCED LEDGER");
                        foundNotSync = true;
                        break;
                    }

                    dstBalance.amount -= quantity;

                    switch( exchangeSource ) {
                    case "BTC":
                        market = "USDT-BTC";
                        break;

                    case "ETH":
                        market = "BTC-ETH";
                        break;
                    }

                    var srcBalance = _.find(balances, { coin : exchangeSource, market: market });

                    var addedSrcBalance = (tx_info['Price'] - tx_info['Commission']);

                    if( srcBalance == undefined ) {
                        balance = {};
                        balance['coin'] = exchangeSource;
                        balance['buy_rate'] = null;
                        balance['market'] = market;
                        balance['amount'] = addedSrcBalance;
                        balances.push( balance );
                    } else {
                        srcBalance['amount'] += addedSrcBalance;
                    }

                    break;

                case "LIMIT_BUY":
                    var dstBalance = _.find(balances, { coin : exchangeDestination, market: market });

                    if( dstBalance == undefined ) {
                        balance = {};
                        balance['coin'] = exchangeDestination;
                        balance['buy_rate'] = tx_info['PricePerUnit'];
                        balance['market'] = market;
                        balance['amount'] = quantity;
                        balances.push( balance );
                    } else {
                        var initialAmt = dstBalance['amount'];
                        var initialRate = dstBalance['buy_rate'];
                        var buyRate = tx_info['PricePerUnit'];
                        dstBalance['amount'] += quantity;

                        var newRate = (initialAmt / dstBalance['amount']) * initialRate + (quantity / dstBalance['amount']) * buyRate;

                        dstBalance['buy_rate'] = newRate;
                    }

                    switch( exchangeSource ) {
                        case "BTC":
                            market = "USDT-BTC";
                            break;

                        case "ETH":
                            market = "BTC-ETH";
                            break;
                    }

                    var srcBalance = _.find(balances, { coin: exchangeSource, market: market });

                    if( srcBalance == undefined ) {
                        console.log("FOUND IMBALANCED LEDGER");
                        foundNotSync = true;
                        break;
                    }

                    srcBalance.amount -= (tx_info.Price + tx_info.Commission);

                    break;
                }
            }

            if( foundNotSync ) {
                console.log( transaction );
                console.log( balances );

                retarg = {
                    status: "NEED_SYNC",
                    val: null
                };

                break;
            }
        }

        return retarg;
    }

    /*
     * Test if the balances is synced to Bittrex data
     * @param {Class} apiManager - The API Manager
     * @param {Array} newBalances - The calculated balance
     * @param {requestCallback} fn - return True or False
     */
     isBalanceSynced( apiManager, newBalances, fn ) {

         apiManager.getBalances((balances) => {

             for( var i = 0; i < balances.length; i++ ) {
                 var balance = balances[i];

                 var bal = balance.Balance;
                 var coin = balance.Currency;

                 if( bal != 0 ) {
                     var total = 0;

                     if( coin == "BTC" || coin == "ETH" ) {
                         var b = _.find( newBalances, {coin: coin} );
                         total = b.amount;
                     } else {
                         var btcMarketBal = _.find( newBalances, {coin: coin, market: "BTC-" + coin} );

                         var ethMarketBal = _.find( newBalances, {coin: coin, market: "ETH-" + coin} );

                         total += (btcMarketBal != undefined) ? btcMarketBal.amount : 0;

                         total += (ethMarketBal != undefined) ? ethMarketBal.amount : 0;
                     }

                     total = parseFloat(total.toFixed(8));
                     bal = parseFloat(bal.toFixed(8));

                     if( total != bal ) {
                         console.log( "Imbalanced found: " + coin + " | " + total + " vs " + bal );
                         fn( false );
                         break;
                     }
                 }

                 if( i == balances.length - 1 ) {
                     fn( true );
                 }
             }
         });
     }
};

module.exports = PortfolioCalculator;
