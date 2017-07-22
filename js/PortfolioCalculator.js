const _ = require('lodash');

class PortfolioCalculator {
    constructor() {

    }

    /*
     * @param {String} exchange - The exchange String (e.g.: BTC-STRAT)
     * @param {requestCallback} fn - To return the source and destination exchange
     */
    parseOrderExchange( exchange, fn ) {
        var exchanges = _.split(exchange, "-");
        if( exchanges.length == 2 ) {
            fn( exchanges[0], exchanges[1], true );
        } else {
            fn( null, null, false );
        }
    }

    /*
     * @param {Object} balances - The current portfolio, undefined if none;
     * @param {Object} transactions - The new transactions to be applied
     * @return {Object} The final balances with the buy rate
     */
    transactionsToPortfolio( balances, transactions ) {
        // Example: [{ 'coin': 'ANS', 'buy_rate': ..., 'amount': '' }];
        if( balances == undefined ) {
            balances = [];
        }

        transactions.forEach((transaction) => {
            var tx_info = transaction['info'];

            switch(transaction['type']) {
            case 'WITHDRAWAL':
                var balance = _.find(balances, { coin : tx_info['Currency'] });
                balance['amount'] -= parseFloat(tx_info['Amount']);
                balance['amount'] -= parseFloat(tx_info['TxCost']);
                break;

            case 'DEPOSIT':
                var balance = _.find(balances, { coin : tx_info['Currency'] });
                if( balance == undefined ) {
                    balance = {};
                    balance['coin'] = tx_info['Currency'];
                    balance['buy_rate'] = null;
                    balance['amount'] = parseFloat(tx_info['Amount']);
                    balances.push( balance );
                } else {
                    balance['amount'] += parseFloat(tx_info['Amount']);
                }
                break;

            case 'ORDER':
                var exchangeSource, exchangeDestination;

                this.parseOrderExchange( tx_info['Exchange'], (excs, excd) => {
                    exchangeSource = excs; // BTC default
                    exchangeDestination = excd;
                });

                switch( tx_info['OrderType'] ) {
                case "LIMIT_SELL":
                    var qt = tx_info['Quantity'] - tx_info['QuantityRemaining'];
                    var dstBalance = _.find(balances, { coin : exchangeDestination });

                    dstBalance['amount'] -= qt;

                    var srcBalance = _.find(balances, { coin : exchangeSource });
                    var addedSrcBalance = (tx_info['Price'] - tx_info['Commission']);
                    if( srcBalance == undefined ) {
                        balance = {};
                        balance['coin'] = exchangeSource;
                        balance['buy_rate'] = null;
                        balance['amount'] = parseFloat(addedSrcBalance);
                        balances.push( balance );
                    } else {
                        srcBalance['amount'] += addedSrcBalance;
                    }
                    break;

                case "LIMIT_BUY":
                    var dstBalance = _.find(balances, { coin : exchangeDestination });
                    var buyAmt = tx_info['Quantity'] - tx_info['QuantityRemaining'];

                    if( dstBalance == undefined ) {
                        balance = {};
                        balance['coin'] = exchangeDestination;
                        balance['buy_rate'] = tx_info['PricePerUnit'];
                        balance['amount'] = buyAmt;
                        balances.push( balance );
                    } else {
                        var initialAmt = dstBalance['amount'];
                        var initialRate = dstBalance['buy_rate'];
                        var buyRate = tx_info['PricePerUnit'];
                        dstBalance['amount'] += buyAmt;

                        var newRate = (initialAmt / dstBalance['amount']) * initialRate + (buyAmt / dstBalance['amount']) * buyRate;

                        dstBalance['buy_rate'] = newRate;
                    }

                    var srcBalance = _.find(balances, { coin : exchangeSource });
                    srcBalance['amount'] -= (tx_info['Price'] + tx_info['Commission']);
                    break;
                }
                break;
            }
        });

        var btcEntry = _.find(balances, { coin : "BTC" });
        if( btcEntry != undefined ) {
            btcEntry['buy_rate'] = 1;
        }

        return balances;
    }
};

module.exports = PortfolioCalculator;
