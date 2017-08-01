const Application = require('spectron').Application
const assert = require('assert');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const {app} = require('electron');
const fs = require('fs');
const await = require('await');

const appPath = path.resolve(__dirname, '../');
const appDataPath = app.getPath('userData');

const DBManager = require( appPath + '/js/DBManager.js' );

const portfolioDBPath = appDataPath + '\\portfolio_test';
const metadataDBPath = appDataPath + '\\metadata_test';

let dbm;

describe('DBManager Test Suite', function() {

    beforeEach(function(done) {
        this.timeout( 3000 );
        dbm = new DBManager( portfolioDBPath, metadataDBPath, () => {
            done();
        });
    });

    afterEach(function() {
        if( fs.existsSync(portfolioDBPath) ) {
            fs.unlinkSync( portfolioDBPath );
        }

        if( fs.existsSync(metadataDBPath) ) {
            fs.unlinkSync( metadataDBPath );
        }
    });

    it('gets a coin amount', function(done) {
        this.timeout( 3000 );

        coin = 'ANS';
        amount = 23.115;
        buy_rate = 0.00341223;

        assert.notEqual( undefined, dbm );

        dbm.portfolioDB.insert([
            { 'coin': coin, 'amount': amount, 'buy_rate': buy_rate }
        ], function(err, newDoc) {
            dbm.getCoinAmount(coin, function(amt) {
                assert.equal(amount, amt);
                done();
            });
        });
    });

    it('lists all the coins in portfolio', function(done) {
        this.timeout( 3000 );

        sampleCoins = ['ANS', 'BTC', 'ETH'];

        sampleCoins.forEach(function(coin) {
            dbm.portfolioDB.insert([
                {'coin': coin, 'amount': 0, 'buy_rate': 0 }
            ]);
        });

        dbm.getCoins(function(coins) {
            assert.equal(sampleCoins.length, coins.length);
            sampleCoins.forEach(function(coin) {
                assert.notEqual( -1, coins.indexOf(coin) );
            });
            done();
        });
    });

    it('checks if the metadataDB is not configured on new database', function(done) {
        this.timeout( 3000 );

        dbm.isConfigured(function(configured) {
            assert.equal( false, configured );
            done();
        });
    });

    it('checks configure, isConfigured, and getAPI methods', function(done) {
        this.timeout( 3000 );

        var api_key = 'abcde';
        var secret_key = 'defgh';

        dbm.configure( api_key, secret_key, function() {
            dbm.isConfigured(function(configured) {
                assert.equal( true, configured );
            });

            dbm.getAPI(function(a, b) {
                assert.equal( api_key, a );
                assert.equal( secret_key, b );
                done();
            });
        });
    });

    it('checks synchronize method', function(done) {
        this.timeout( 3000 );

        var tests = await('tx', 'sync');

        var last_tx_id = "abc";
        var last_sync = (new Date()).getTime();

        dbm.synchronize( last_sync, last_tx_id, () => {
            dbm.metadataDB.find({'meta': 'last_tx_id'}, function(err, docs) {
                if( docs.length == 1 ) {
                    assert.equal( last_tx_id, docs[0].value );
                    tests.keep('tx', true);
                } else {
                    assert.fail("there is more than 1 last_tx_id record");
                }
            });

            dbm.metadataDB.find({'meta': 'last_sync'}, function(err, docs) {
                if( docs.length == 1 ) {
                    assert.equal( last_sync, docs[0].value );
                    tests.keep('sync', true);
                } else {
                    assert.fail("there is more than 1 last_sync record");
                }
            });
        });

        tests.then((tests) => {
            done();
        });
    });

    it('checks if configure method revert last_tx_id back to 1', function(done) {
        dbm.synchronize( (new Date().getTime()), "abc", () => {
            dbm.configure( "new_key", "new_secret", () => {
                dbm.metadataDB.find({'meta': 'last_tx_id'}, function(err, docs) {
                    if( docs.length == 1 ) {
                        assert.equal( 0, docs[0].value );
                        done();
                    } else {
                        assert.fail("there is more than 1 last_tx_id record");
                    }
                });
            });
        });
    });
});
