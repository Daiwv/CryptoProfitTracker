const {app} = require('electron');
const Datastore = require('nedb');
const fs = require('fs');
const await = require('await');

class DBManager {

    constructor( portfolioDBPath, metadataDBPath, fn ) {
        this.portfolioDB = new Datastore({filename: portfolioDBPath, autoload: true});
        this.metadataDB = new Datastore( metadataDBPath );

        if( fs.existsSync(metadataDBPath) ) {
            this.metadataDB.loadDatabase();
            fn();
        } else {
            this.metadataDB.loadDatabase();
            this.metadataDB.insert([
                { 'meta': 'api_key', 'value': '' },
                { 'meta': 'secret_key', 'value': '' },
                { 'meta': 'last_sync', 'value': '' },
                { 'meta': 'last_tx_id', 'value': '' }
            ], function(err, newDoc) {
                if( err != null ) {
                    console.log("There is an error : ");
                    console.log( err );
                }

                fn();
            });
        }
    }

    /*
     * Get the amount of coin of certain name inside the portfolio
     * @param {String} coinName - The name of coin, e.g.: 'BTC', 'ETH', 'ANS'
     * @param {requestCallback} fn
     */
    getCoinAmount( coinName, fn ) {
        this.portfolioDB.find({ 'coin': coinName }, function(err, docs) {
            var amt = null;

            if( docs.length == 1 ) {
                amt = docs[0].amount;
            }

            fn(amt);
        });
    }

    /*
     * Get all the coins list in the portfolio
     * @param {requestCallback} fn
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
     * Get all the entry in the portfolio
     * @param {requestCallback} fn
     */
    getBalances( fn ) {
        this.portfolioDB.find({}, function(err, docs) {
            var balances = [];

            docs.forEach(function(element) {
                balances.push(element);
            });

            fn(balances);
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
        var updates = await('api', 'secret', 'clear_last_tx');

        this.portfolioDB.remove({}, { multi: true }, (err, numRemoved) => {
            this.metadataDB.update({'meta': 'api_key'}, {'meta': 'api_key', 'value': api_key},{},() => {
                updates.keep( 'api', true );
            });;

            this.metadataDB.update({'meta': 'secret_key'}, {'meta': 'secret_key', 'value': secret_key},{},() => {
                updates.keep( 'secret', true );
            });

            this.metadataDB.update({'meta': 'last_tx_id'}, {'meta': 'last_tx_id', 'value': 0},{},() => {
                updates.keep( 'clear_last_tx', true );
            });
        });

        updates.then(function(updates) {
            fn();
        });
     }

     /*
      * Update the balances inside the db
      * @param {Object} balances
      * @param {requestCallback} fn - Called when done
      */
     updatePortfolio( balances, fn ) {
         this.portfolioDB.remove({}, { multi: true }, (err, numRemoved) => {
             balances.forEach((balance) => {
                 var portDB = this.portfolioDB;
                 this.portfolioDB.find({'coin': balance.coin}, function(err, docs) {
                     if( docs.length == 1 ) {
                         portDB.update({'coin': balance.coin}, balance);
                     } else {
                         portDB.insert( balance );
                     }
                 });

                 if( balance == balances[balances.length - 1]) {
                     return fn();
                 }
            });
         });
    }

     /*
      * @param {Date} last_sync - The latest time of synchronization to Bittrex API
      * @param {String} last_tx_id - The last transaction ID sync'd
      * @param {requestCallback} fn - Call if done
      */
     synchronize( last_sync, last_tx_id, fn ) {
        var updates = await('sync', 'tx');

        this.metadataDB.update({'meta': 'last_sync'}, {'meta': 'last_sync', 'value': last_sync},{},() => {
            updates.keep( 'sync', true );
        });;

        this.metadataDB.update({'meta': 'last_tx_id'}, {'meta': 'last_tx_id', 'value': last_tx_id},{},() => {
            updates.keep( 'tx', true );
        });

        updates.then(function(updates) {
            fn();
        });
     }

     /*
      * @param{requestCallback} fn - Return the Last TX ID
      */
      getLastTxID( fn ) {
          this.metadataDB.find({'meta': 'last_tx_id'}, function(err,docs) {
              if( docs.length == 1 ){
                  fn( docs[0].value );
              } else {
                  fn( 0 );
              }
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
