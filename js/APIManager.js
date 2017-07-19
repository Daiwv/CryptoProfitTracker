const crypto = require('crypto');
const request = require('request');
const await = require('await');
const _ = require('lodash');

const BITTREX_API_URL = 'https://bittrex.com/api/v1.1';

class APIManager {

    constructor( dbm, fn ) {
        dbm.getAPI((api_key, secret_key) => {
            this.API_KEY = api_key;
            this.API_SECRET = secret_key;
            fn();
        });
    }

    /*
     * @return {String} Return the url with the added apikey and nonce param
     */
    addURLParam( url ) {
        var apikey = this.API_KEY;
        var nonce = (new Date()).getTime();
        var uri = url + "?apikey=" + apikey + "&nonce=" + nonce;
        return uri;
    }

    generateSign( uri ) {
        var hash = crypto.createHmac('sha512', this.API_SECRET);
        hash.update(uri);
        return hash.digest('hex');
    }

    /*
     * @return {Bool} Return TRUE if API key and Secret key is valid
     */
    isValidAuth() {

    }

    /*
     * @param {String} path - The API path
     * @param {requestCallback} fn - Return the JSON result if success, undefined otherwise
     */
    call( path, fn ) {
        var path = this.addURLParam( path );
        var sign = this.generateSign( BITTREX_API_URL + path );
        var options = {
            url: BITTREX_API_URL + path,
            headers: {
                apisign: sign
            }
        };

        request(options, (err, res, body) => {
            if( !err && res.statusCode == 200 ) {
                var bittrexResponse = JSON.parse( body );
                if( bittrexResponse.success ) {
                    fn( bittrexResponse.result );
                    return;
                }
            }

            fn(undefined);
        });
    }

    /*
     * Filter the keys & values of an object, such that the filteredObjs
     * will only contain have the keys from the sent 'keys' argument.
     * @param {Object} obj - The object to be filtered
     * @param {Object} keys - List of keys to be kept
     * @return {Object} filteredObjs - The filtered object
     */
    filterKeys( obj, keys ) {
        var filteredObj = {};

        keys.forEach((key) => {
            filteredObj[key] = obj[key];
        });

        return filteredObj;
    }

    /*
     * Move the date as the key, such that each of the tx will
     * have date as its key and the details of the tx for its value.
     * @param {Object} objs - The response from bittrex API call
     * @param {String} type - {ORDER | WITHDRAWAL | DEPOSIT}, the history type
     * @return {Object} mappedObjs - The object with 'date' as its key
     */
    mapToDate( objs, type ) {
        var mappedObjs = [];
        var timeKey;
        var filteredKeys;

        switch( type ) {
            case 'ORDER':
            timeKey = "Closed";
            filteredKeys = ['OrderUuid', 'Exchange', 'OrderType', 'Quantity', 'QuantityRemaining', 'Commission', 'Price', 'PricePerUnit'];
            break;

            case 'WITHDRAWAL':
            timeKey = "Opened";
            filteredKeys = ['PaymentUuid', 'Currency', 'Amount'];
            break;

            case 'DEPOSIT':
            timeKey = "LastUpdated";
            filteredKeys = ['Id', 'Currency', 'Amount'];
            break;
        }

        objs.forEach((obj) => {
            var time = obj[timeKey];
            var filteredObj = this.filterKeys( obj, filteredKeys );
            var mappedObj = {}
            mappedObj['info'] = filteredObj;
            mappedObj['type'] = type;
            mappedObj['time'] = new Date(time);
            mappedObjs.push( mappedObj );
        });

        return mappedObjs;
    }

    /*
     * @param {requestCallback} fn - return the balances
     */
    getBalances( fn ) {
        this.call('/account/getbalances', (result) => {
            fn( result );
        });
    }

    /*
     * @param {requestCallback} fn - return the order history
     */
    getOrderHistory( fn ) {
         this.call('/account/getorderhistory', (result) => {
              fn( result );
         });
    }

    /*
     * @param {requestCallback} fn - return the withdrawal history
     */
    getWithdrawalHistory( fn ) {
         this.call('/account/getwithdrawalhistory', (result) => {
              fn( result );
         });
    }

    /*
     * @param {requestCallback} fn - return the deposit history
     */
    getDepositHistory( fn ) {
         this.call('/account/getdeposithistory', (result) => {
              fn( result );
         });
    }

    /*
     * First time fetching without specifying lastId
     * {
     *   type: ('DEPOSIT' | 'WITHDRAWAL' | 'ORDER'),
     *   time: (datetime),
     *   info: {...}
     *  }
     * @param {requestCallback} fn - return all the transaction histories
     */
    getTransactions( fn ) {
        this.getTransactions( null, (combinedHistories) => {
            fn(combinedHistories);
        });
    }

    /*
     * This is the main function to get all the sorted tx with this structure:
     * {
     *   type: ('DEPOSIT' | 'WITHDRAWAL' | 'ORDER'),
     *   time: (datetime),
     *   info: {...}
     *  }
     * @param {String} lastId - the last transactions sync'd to the database
     * @param {requestCallback} fn - return all the transaction histories
     */
     getTransactions( lastId, fn ) {
        var histories = await('order', 'withdrawal', 'deposit');

        this.getOrderHistory((history) => {
            history = this.mapToDate(history, 'ORDER');
            histories.keep( 'order', history );
        });

        this.getWithdrawalHistory((history) => {
            history = this.mapToDate(history, 'WITHDRAWAL');
            histories.keep( 'withdrawal', history );
        });

        this.getDepositHistory((history) => {
            history = this.mapToDate(history, 'DEPOSIT');
            histories.keep( 'deposit', history );
        });

        histories.then(function(history) {
            var orderHistory = history.order;
            var withdrawalHistory = history.withdrawal;
            var depositHistory = history.deposit;

            var combinedHistories = orderHistory.concat(withdrawalHistory).concat(depositHistory);

            combinedHistories.sort(function compare(a,b) {
                var dateA = a.time;
                var dateB = b.time;
                return dateA - dateB;
            });

            if( lastId != null ) {
                for(var i = 0; i < combinedHistories.length; i++) {
                    var id;

                    switch(combinedHistories[i]['type']) {
                    case 'ORDER':
                        id = combinedHistories[i]['info']['OrderUuid'];
                        break;

                    case 'DEPOSIT':
                        id = combinedHistories[i]['info']['Id'];
                        break;

                    case 'WITHDRAWAL':
                        id = combinedHistories[i]['info']['PaymentUuid'];
                        break;
                    }

                    if( id != lastId ) {
                        combinedHistories.splice(i--, 1);
                    } else {
                        combinedHistories.splice(i--, 1);
                        break;
                    }
                }
            }

            fn( combinedHistories );
        });
     }
};

module.exports = APIManager;
