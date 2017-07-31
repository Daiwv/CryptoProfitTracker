const Application = require('spectron').Application
const assert = require('assert');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const {app} = require('electron');
const fs = require('fs');
const _ = require('lodash');

const appPath = path.resolve(__dirname, '../');
const appDataPath = app.getPath('userData');

const APIManager = require( appPath + '/js/APIManager.js' );
const DBManager = require( appPath + '/js/DBManager.js' );
const apikeyPath = appPath + '\\config.json';
const portfolioDBPath = appDataPath + '\\portfolio_test';
const metadataDBPath = appDataPath + '\\metadata_test';

let dbm, apiManager;

describe('APIManager Test Suite', () => {

    before((done) => {
        dbm = new DBManager( portfolioDBPath, metadataDBPath, () => {
            var keys = JSON.parse(fs.readFileSync(apikeyPath));

            dbm.configure( keys['api_key'], keys['secret_key'], () => {
                apiManager = new APIManager( dbm, () => {
                    done();
                });
            });
        });
    });

    after(() => {
        if(fs.existsSync(portfolioDBPath)) {
            fs.unlinkSync(portfolioDBPath);
        }

        if(fs.existsSync(metadataDBPath)) {
            fs.unlinkSync(metadataDBPath);
        }
    });

    it('tests getBalances method', function(done) {
        this.timeout( 10000 );
        apiManager.getBalances((data) => {
            assert.notEqual( undefined, data );
            done();
        });
    });

    it('tests getOrderHistory method', function(done) {
        this.timeout( 10000 );
        apiManager.getOrderHistory((data) => {
            assert.notEqual( undefined, data );
            done();
        });
    });

    it('tests getWithdrawalHistory method', function(done) {
        this.timeout( 10000 );
        apiManager.getWithdrawalHistory((data) => {
            assert.notEqual( undefined, data );
            done();
        });
    });

    it('tests getDepositHistory method', function(done) {
        this.timeout( 10000 );
        apiManager.getDepositHistory((data) => {
            assert.notEqual( undefined, data );
            done();
        });
    });

    it('tests getTicker method', function(done) {
        this.timeout( 10000 );
        apiManager.getTicker( 'BTC-LTC', (price) => {
            assert.notEqual(undefined, price);
            assert.notEqual(undefined, price.Bid);
            assert.notEqual(undefined, price.Ask);
            assert.notEqual(undefined, price.Last);
            done();
        } );
    });

    it('tests isValidAuth method', function(done) {
        apiManager.isValidAuth((isValidAuth) => {
            assert.equal(true, isValidAuth);

            apiManager.API_KEY = "abc";
            apiManager.isValidAuth((isValidAuth) => {
                assert.equal(false, isValidAuth);
                done();
            });
        });


    });
});
