const {app} = require('electron');
const Datastore = require('nedb');
const fs = require('fs');

class DBManager {
    constructor( portfolioDBPath, metadataDBPath ) {
        this.portfolioDB = new Datastore({filename: portfolioDBPath, autoload: true});
        this.metadataDB = new Datastore( metadataDBPath );

        if( fs.existsSync(metadataDBPath) ) {
            this.metadataDB.loadDatabase();
        } else {
            this.metadataDB.loadDatabase();
            this.metadataDB.insert([
                { 'meta': 'api_key', 'value': '' },
                { 'meta': 'secret_key', 'value': '' },
                { 'meta': 'last_sync', 'value': '' },
                { 'meta': 'last_tx_id', 'value': '' }
            ], function(err) {
            });
        }
    }

    /*
     * Get the amount of coin of certain name inside the portfolio
     * @param {String} coinName - The name of coin, e.g.: 'BTC', 'ETH', 'ANS'
     * @param {requestCallback} fn - The callback function to return the amount
     */
    getCoinValue( coinName, fn ) {
        this.portfolioDB.find({ 'coin': coinName }, function(err, docs) {
            var amt = -1;

            if( docs.length == 1 ) {
                amt = docs[0].amount;
            }

            fn(amt);
        });
    }

    /*
     * Get all the coins list in the portfolio
     * @param {requestCallback} fn - The callback function to return the coins list
     */
    getCoins( fn ) {
        this.portfolioDB.find({}, function(err, docs) {
            var coins = [];

            docs.forEach(function(element) {
                coins.push(element.coin);
            });

            fn(coins);
        });
    }

    /*
     * Check if this is the first time user running the app by checking
     * if the api_key is already set.
     * @param {requestCallback} fn - The callback function to return the state
     */
     isConfigured( fn ) {
         this.metadataDB.find({'meta': 'api_key'}, function(err, docs) {
             if( docs.length == 1 ) {
                 fn(docs[0].value != '');
             } else {
                 fn(false);
             }
         });
     }

    /*
     * Set up the keys to get bittrex access.
     * @param {String} api_key
     * @param {String} secret_key
     * @param {requestCallback} fn - Called when done
     */
     configure( api_key, secret_key, fn ) {
         this.metadataDB.update({'meta': 'api_key'},
            {'meta': 'api_key', 'value': api_key},{});

         this.metadataDB.update({'meta': 'secret_key'},
            {'meta': 'secret_key', 'value': secret_key},{},
            () => {
                fn();
            });
     }

     /*
      * @param {requestCallback} fn - return the api_key and secret_key
      */
      getAPI( fn ) {
          var api_key;
          var secret_key;

          this.metadataDB.find( {$or: [{'meta': 'api_key'},
              {'meta': 'secret_key'}]}, (err, docs) => {

              docs.forEach((ele) => {
                  switch( ele.meta ) {
                      case 'api_key':
                      api_key = ele.value;
                      break;

                      case 'secret_key':
                      secret_key = ele.value;
                      break;
                  }
              });

              fn( api_key, secret_key );
          });
      }
};

module.exports = DBManager;
