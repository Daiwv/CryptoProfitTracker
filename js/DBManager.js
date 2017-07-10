const {app} = require('electron');
const Datastore = require('nedb');
const fs = require('fs');

class DBManager {

    constructor( portfolioDBPath, metadataDBPath ) {
        this.portfolioDB = new Datastore({filename: portfolioDBPath, autoload: true});

        
        this.metadataDB = new Datastore({filename: metadataDBPath, autoload: true});
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

            fn( coins );
        });
    }
};

module.exports = DBManager;
