const crypto = require('crypto');
const request = require('request');

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
     * Check whether
     * @return {Bool} Return TRUE if API key and Secret key is valid
     */
    isValidAuth() {

    }

    /*
     * @param {requestCallback} fn - return the balances
     */
    getBalances( fn ) {
        var path = this.addURLParam( '/account/getbalances' );
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
                    var bittrexResult = bittrexResponse.result;
                    var balances = [];

                    bittrexResult.forEach((ele) => {
                        var currencyName = ele.Currency;
                        var balance = ele.Balance;

                        if( balance > 0 ) {
                            balances.push(ele);
                        }
                    });

                    fn( balances );
                }
            }

            fn(-1);
        });
    }

    /*
     * @param {requestCallback} fn - return the order history
     */
    getOrderHistory( fn ) {
        var path = this.addURLParam( '/account/getorderhistory' );
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
                }
            }

            fn(-1);
        });
    }
};

module.exports = APIManager;
