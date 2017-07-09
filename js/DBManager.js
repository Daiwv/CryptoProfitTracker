const {app} = require('electron');
const Datastore = require('nedb');
const fs = require('fs');

const appDataPath = app.getPath('userData');
const coinDBPath = appDataPath + '\\coins';
const transactionDBPath = appDataPath + '\\transactions';

class DBManager {

    constructor() {
        this.coinDB = 0;
        this.transactionDB = 0;
    }

    /*
     * initDB()
     *
     * Initialise the Databases with some required rows if
     * it does not exists yet. Do nothing if DB already
     * initialized.
     */
    initDB() {
        this.coinDB = new Datastore({filename: coinDBPath, autoload: true});
        this.transactionDB = new Datastore({filename: transactionDBPath, autoload: true});

        // Insert Sample Coin Data if Database is yet to be initialized
        var self = this.coinDB;

        this.coinDB.count({}, function (err, count) {
            if( count == 0 ) {
                self.insert({ coin: 'BTC', value: 0 });
                self.insert({ coin: 'ANS', value: 0 });
                self.insert({ coin: 'ETC', value: 0 });
            }
        });
    }
};

module.exports = DBManager;
