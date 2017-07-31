const crypto = require('crypto');
const request = require('request');
const await = require('await');
const _ = require('lodash');
const helper = require('./helper');

const BITTREX_API_URL = 'https://bittrex.com/api/v1.1';

class APIManager {

    constructor( dbm, fn ) {
        this.dbManager = dbm;
        this.refreshAPI(() => { fn(); });
    }

    refreshAPI( fn ) {
        var dbm = this.dbManager;
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
     * @param {requestCallback} Return TRUE if API key and Secret key is valid
     */
    isValidAuth( fn ) {
        this.call('/account/getbalances', (result) => {
            fn( result != undefined );
        });
    }

    /*
     * @param {String} path - The API path
     * @param {requestCallback} fn - Return the JSON result if success, undefined
     * @param {String} arg - (Optional) argument for the HTTP request otherwise
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

        if( arguments.length == 3 ) {
            var args = arguments[2];

            for( var key in args ) {
                options.url += "&" + key + "=" + args[key];
            }
        }

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
     * @param {requestCallback} fn
     */
    getBalances( fn ) {
        this.call('/account/getbalances', (result) => {
            fn( result );
        });
    }

    /*
     * @param {requestCallback}
     */
    getOrderHistory( fn ) {
         this.call('/account/getorderhistory', (result) => {
              fn( result );
         });
    }

    /*
     * @param {requestCallback} fn
     */
    getWithdrawalHistory( fn ) {
         this.call('/account/getwithdrawalhistory', (result) => {
              fn( result );
         });
    }

    /*
     * @param {requestCallback} fn
     */
    getDepositHistory( fn ) {
         this.call('/account/getdeposithistory', (result) => {
              fn( result );
         });
    }

    /*
     * @param {String} market - e.g.: "BTC-LTC"
     * @param {requestCallback} fn
     *
     * result
     * { market: "BTC-LTC", Last: xxx }
     */
     getTicker( market, fn ) {
         this.call('/public/getticker', (result) => {
             fn( result );
         }, { 'market' : market } );
     }
};

module.exports = APIManager;
