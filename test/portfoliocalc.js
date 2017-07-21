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
const PortfolioCalculator = require( appPath + '/js/PortfolioCalculator.js' );
const apikeyPath = appPath + '\\config.json';
const portfolioDBPath = appDataPath + '\\portfolio_test';
const metadataDBPath = appDataPath + '\\metadata_test';

let pc, apiManager, dbManager;

describe('PortfolioCalculator Test Suite' , () => {

    before(function(done) {
        dbManager = new DBManager( portfolioDBPath, metadataDBPath, () => {
            var keys = JSON.parse(fs.readFileSync(apikeyPath));

            dbManager.configure( keys['api_key'], keys['secret_key'], () => {
                apiManager = new APIManager( dbManager, () => {
                    done();
                });
            });
        });

        pc = new PortfolioCalculator();
    });

    after(function() {

    });

    it('tests transactionsToPortfolio DEPOSIT', function() {
        var sampleTransactions = [
            {
                'time': new Date("1970-01-01T06:00:00.0"),
                'type': 'DEPOSIT',
                'info':
                {
                    'Id': '1',
                    'Currency': 'BTC',
                    'Amount': '10'
                }
            },
            {
                'time': new Date("1970-01-01T07:00:00.0"),
                'type': 'DEPOSIT',
                'info':
                {
                    'Id': '2',
                    'Currency': 'BTC',
                    'Amount': '20'
                }
            }
        ];

        balances = pc.transactionsToPortfolio(undefined, sampleTransactions);
        var balance = _.find(balances, { 'coin': "BTC"});
        assert.notEqual( undefined, balance );
        assert.equal( 30, balance['amount'] );
    });;

    it('tests transactionsToPortfolio WITHDRAWAL', function() {
        var sampleTransactions = [
            {
                'time': new Date("1970-01-01T06:00:00.0"),
                'type': 'DEPOSIT',
                'info':
                {
                    'Id': '1',
                    'Currency': 'BTC',
                    'Amount': '10',
                }
            },
            {
                'time': new Date("1970-01-01T07:00:00.0"),
                'type': 'WITHDRAWAL',
                'info':
                {
                    'Id': '2',
                    'Currency': 'BTC',
                    'Amount': '5',
                    'TxCost': '1'
                }
            }
        ];

        balances = pc.transactionsToPortfolio(undefined, sampleTransactions);
        var balance = _.find(balances, { 'coin': "BTC"});
        assert.notEqual( undefined, balance );
        assert.equal( 4, balance['amount'] );
    });

    it('test parseOrderExchange method', function(done) {
        var testCase1 = "BTC-STRAT";
        pc.parseOrderExchange( testCase1, (src, dst, success) => {
            assert.equal( true, success );
            assert.equal( "BTC", src );
            assert.equal( "STRAT", dst );
        });

        var testCase2 = "NMR-ANS";
        pc.parseOrderExchange( testCase2, (src, dst, success) => {
            assert.equal( true, success );
            assert.equal( "NMR", src );
            assert.equal( "ANS", dst );
        });

        var testCase3 = "NMR";
        pc.parseOrderExchange( testCase3, (src, dst, success) => {
            assert.equal( false, success );
            assert.equal( null, src );
            assert.equal( null, dst );
            done();
        });
    });

    it('tests transactionsToPortfolio ORDER', function(done) {
        this.timeout( 12000 );
        apiManager.getTransactions( null, (combinedHistories) => {
            var balances = pc.transactionsToPortfolio( undefined, combinedHistories);
            done();
        });
    });
});
