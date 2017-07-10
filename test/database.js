var Application = require('spectron').Application
var assert = require('assert');
var path = require('path');
var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var {app} = require('electron');
var fs = require('fs');

const appPath = path.resolve(__dirname, '../');

const DBManager = require( appPath + '/js/DBManager.js' );

const appDataPath = app.getPath('userData');
const portfolioDBPath = appDataPath + '\\portfolio_test';
const metadataDBPath = appDataPath + '\\metadata_test';
let dbm;

describe('DBManager Test Suite', function() {

    beforeEach(function() {
        dbm = new DBManager( portfolioDBPath, metadataDBPath );
    });

    afterEach(function() {
        fs.unlinkSync( portfolioDBPath );
        fs.unlinkSync( metadataDBPath );
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
});
