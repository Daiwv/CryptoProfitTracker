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
const await = require('await');

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

        balances = pc.transactionsToPortfolio([], sampleTransactions);
        var balance = _.find(balances, { coin: "BTC"});
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

        balances = pc.transactionsToPortfolio([], sampleTransactions);
        var balance = _.find(balances, { coin: "BTC"});
        assert.notEqual( undefined, balance );
        assert.equal( 4, balance['amount'] );
    });

    it('tests getTransactions method with nonexistent lastId (simulating unfetched older history from bittrex)', function(done) {
        this.timeout( 5000 );
        var histories = await('order', 'withdrawal', 'deposit');

        pc.getWithdrawalHistory( apiManager, (history) => {
            histories.keep('withdrawal', history);
        });

        pc.getDepositHistory( apiManager, (history) => {
            histories.keep('deposit', history);
        });

        pc.getOrderHistory( apiManager, (history) => {
            histories.keep('order', history);
        });

        histories.then(function(histories) {
            pc.getTransactions( "abc", histories.deposit, histories.withdrawal, histories.order, (transactions) => {
                assert.notEqual(false, typeof transactions === 'object');
                assert.equal( true, "NOT_SYNCED" === transactions.status);
                assert.equal( null, transactions.value);
                done();
            });
        });
    });

    it.only('tests transactionsToPortfolio method with CSV', function(done) {
        this.timeout( 10000 );
        var histories = await('order', 'withdrawal', 'deposit');

        pc.getWithdrawalHistory( apiManager, (history) => {
            histories.keep('withdrawal', history);
        });

        pc.getDepositHistory( apiManager, (history) => {
            histories.keep('deposit', history);
        });

        pc.getOrderHistoryCSV( appPath + "/test/fullOrders_utf8.csv", (history) => {
            if( history.status == "SUCCESS" ) {
                histories.keep('order', history.val);
            } else {
                assert.fail("ORDER CSV FILE NOT FOUND!");
            }
        });

        histories.then(function(histories) {
            var lastId = 0;
            pc.getTransactions( lastId, histories.deposit, histories.withdrawal, histories.order, (transactions) => {
                var balances = pc.transactionsToPortfolio( [], transactions.val );
                assert.notEqual( null, balances );
                done();
            });
        });
    });

    it('tests getOrderHistoryCSV method', function(done) {
        var orderHistory = pc.getOrderHistoryCSV( appPath + "/test/fullOrders_utf8.csv", (history) => {
            assert.notEqual( undefined, history );
            assert.notEqual( null, history );
            assert.equal( true, history.status === "SUCCESS" );

            var sampleHistory = history.val[0].info;
            var keys = ['OrderUuid', 'Exchange', 'OrderType', 'Quantity', 'QuantityRemaining', 'Commission', 'Price', 'PricePerUnit'];

            keys.forEach((key) => {
                assert.notEqual( undefined, sampleHistory[key], "Undefined for key: " + key );
            });

            done();
        });
    });

    it('test transactionsToPortfolio Deposit default to BTC-AltCoin Market', function() {
        var depositTransactions = [
            {
                time: new Date(1),
                type: 'DEPOSIT',
                info: {
                    Id: 1,
                    Currency: "BTC",
                    Amount: 100
                }
            },
            {
                time: new Date(2),
                type: 'DEPOSIT',
                info: {
                    Id: 2,
                    Currency: "ANS",
                    Amount: 100
                }
            }
        ];

        var balances = pc.transactionsToPortfolio( [], depositTransactions );

        var BTCBal = _.find( balances, {coin: 'BTC'} );
        assert.equal( BTCBal.amount, 100 );
        assert.equal( BTCBal.market, "BTC-USDT");

        var ANSBal = _.find( balances, {coin: 'ANS'} );
        assert.equal( ANSBal.market, "BTC-ANS" );
        assert.equal( ANSBal.amount, 100 );
    });

    it('test transactionsToPortfolio withdraw AltCoin default to BTC-AltCoin market, then ETH-Altcoin market', function() {
        var transactions = [
            {
                time: new Date(1),
                type: 'DEPOSIT',
                info: {
                    Id: 1,
                    Currency: "BTC",
                    Amount: 100
                }
            },
            {
                time: new Date(1),
                type: 'DEPOSIT',
                info: {
                    Id: 2,
                    Currency: "ETH",
                    Amount: 100
                }
            },
            {
                time: new Date(2),
                type: 'ORDER',
                info: {
                    OrderUuid: 3,
                    Exchange: "BTC-ANS",
                    OrderType: "LIMIT_BUY",
                    Quantity: 100,
                    QuantityRemaining: 0,
                    Commission: 0,
                    Price: 100,
                    PricePerUnit: 1
                }
            },
            {
                time: new Date(2),
                type: 'ORDER',
                info: {
                    OrderUuid: 3,
                    Exchange: "ETH-ANS",
                    OrderType: "LIMIT_BUY",
                    Quantity: 50,
                    QuantityRemaining: 0,
                    Commission: 0,
                    Price: 50,
                    PricePerUnit: 1
                }
            },
            {
                time: new Date(3),
                type: 'WITHDRAWAL',
                info: {
                    PaymentUuid: 3,
                    Currency: "ANS",
                    Amount: 70,
                    TxCost: 0
                }
            },
        ];

        var balances = pc.transactionsToPortfolio( [], transactions );

        var ANSBal1 = _.find( balances, {coin: "ANS", market: "BTC-ANS"} );
        assert.notEqual( undefined, ANSBal1 );
        assert.equal( ANSBal1.amount, 30 );
        assert.equal( ANSBal1.market, "BTC-ANS");

        var ANSBal2 = _.find( balances, {coin: "ANS", market: "ETH-ANS"} );
        assert.notEqual( undefined, ANSBal2 );
        assert.equal( ANSBal2.amount, 50 );
        assert.equal( ANSBal2.market, "ETH-ANS");
    });
});
