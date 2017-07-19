const Application = require('spectron').Application
const assert = require('assert');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const {app} = require('electron');
const fs = require('fs');

const appPath = path.resolve(__dirname, '../');
const appDataPath = app.getPath('userData');

const DBManager = require( appPath + '/js/DBManager.js' );

const portfolioDBPath = appDataPath + '\\portfolio_test';
const metadataDBPath = appDataPath + '\\metadata_test';
let dbm;

describe('DBManager Test Suite', function() {

    beforeEach(function() {
        dbm = new DBManager( portfolioDBPath, metadataDBPath );
    });

    afterEach(function() {
        if( fs.existsSync(portfolioDBPath) ) {
            fs.unlinkSync( portfolioDBPath );
        }

        if( fs.existsSync(metadataDBPath) ) {
            fs.unlinkSync( metadataDBPath );
        }
    });

    it('gets a coin value', function(done) {
        coin = 'ANS';
        amount = 23.115;
        buy_rate = 0.00341223;

        dbm.portfolioDB.insert([
            { 'coin': coin, 'amount': amount, 'buy_rate': buy_rate }
        ]);

        dbm.getCoinValue(coin, function(amt) {
            assert.equal(amount, amt);
            done();
        });
    });

    it('lists all the coins in portfolio', function(done) {
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
        /*
         * First DB Init, should not be configured
         */
        dbm.isConfigured(function(configured) {
            assert.equal( false, configured );
            done();
        });
    });

    it('checks if metadataDB is configured properly', function(done) {
        /*
         * Test if configure api_key and secret_key works
         */
        var api_key = 'abcde';
        var secret_key = 'defgh';

        dbm.configure( api_key, secret_key, function() {
            dbm.isConfigured(function(configured) {
                assert.equal( true, configured );
            });
        });

        dbm.getAPI(function(a, b) {
            assert.equal( api_key, a );
            assert.equal( secret_key, b );
            done();
        });
    });
});
