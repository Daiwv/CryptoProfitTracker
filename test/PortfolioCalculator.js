const Application = require('spectron').Application
const assert = require('assert');
const path = require('path');
const chai = require('chai');
const chai_assert = chai.assert;
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

        var retarg = pc.transactionsToPortfolio([], sampleTransactions);
        assert.equal( "SUCCESS", retarg.status );
        var balance = _.find(retarg.val, { coin: "BTC"});
        assert.notEqual( undefined, balance );
        assert.equal( 30, balance['amount'] );
    });;

    it('tests transactionsToPortfolio WITHDRAWAL', function() {
        var sampleTransactions = [
            {
                'time': new Date(1),
                'type': 'DEPOSIT',
                'info':
                {
                    'Id': '1',
                    'Currency': 'BTC',
                    'Amount': '10',
                }
            },
            {
                'time': new Date(2),
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

        var retarg = pc.transactionsToPortfolio([], sampleTransactions);
        assert.equal( "SUCCESS", retarg.status );
        var balances = retarg.val;
        var balance = _.find(balances, { coin: "BTC"});
        assert.notEqual( undefined, balance );
        assert.equal( 4, balance['amount'] );
    });

    it('tests transactionsToPortfolio ORDER LIMIT BUY', function() {
        var sampleTransactions = [
            {
                time: new Date(1),
                type: "DEPOSIT",
                info:
                {
                    Id: "1",
                    Currency: "BTC",
                    Amount: 10,
                }
            },
            {
                time: new Date(2),
                type: "ORDER",
                info:
                {
                    OrderUuid: "2",
                    Exchange: "BTC-ANS",
                    OrderType: "LIMIT_BUY",
                    Quantity: 10,
                    QuantityRemaining: 0,
                    Commission: 0.1,
                    Price: 2,
                    PricePerUnit: 0.2
                }
            }
        ];

        var retarg = pc.transactionsToPortfolio([], sampleTransactions);
        assert.equal( "SUCCESS", retarg.status );
        var balances = retarg.val;

        var BTCBalance = _.find(balances, { coin: "BTC" });
        assert.equal( 7.9, BTCBalance.amount );

        var ANSBalance = _.find(balances, { coin: "ANS" });
        assert.equal( 10, ANSBalance.amount );
    });

    it('tests transactionsToPortfolio ORDER LIMIT SELL', function() {
        var sampleTransactions = [
            {
                time: new Date(1),
                type: "DEPOSIT",
                info:
                {
                    Id: "1",
                    Currency: "BTC",
                    Amount: 10,
                }
            },
            {
                time: new Date(2),
                type: "ORDER",
                info:
                {
                    OrderUuid: "2",
                    Exchange: "BTC-ANS",
                    OrderType: "LIMIT_BUY",
                    Quantity: 10,
                    QuantityRemaining: 0,
                    Commission: 0.1,
                    Price: 2,
                    PricePerUnit: 0.2
                }
            },
            {
                time: new Date(2),
                type: "ORDER",
                info:
                {
                    OrderUuid: "2",
                    Exchange: "BTC-ANS",
                    OrderType: "LIMIT_SELL",
                    Quantity: 5,
                    QuantityRemaining: 0,
                    Commission: 0.1,
                    Price: 50
                }
            }
        ];

        // First, BTC: 10
        // Second, BTC: 10 - (2 + 0.1) = 7.9 | ANS: 10
        // Third, BTC: 7.9 + (50 - 0.1) = 57.8 | ANS: 10 - 5 = 5

        var retarg = pc.transactionsToPortfolio([], sampleTransactions);
        assert.equal( "SUCCESS", retarg.status );
        var balances = retarg.val;

        var BTCBalance = _.find(balances, { coin: "BTC" });
        assert.equal( 57.8, BTCBalance.amount );

        var ANSBalance = _.find(balances, { coin: "ANS" });
        assert.equal( 5, ANSBalance.amount );
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

    it('tests getTransactions method with lastId', function(done) {
        this.timeout( 5000 );

        var depositHistory = [
            {
                type: 'DEPOSIT',
                time: new Date(0),
                info: {
                    Id: "abcde",
                    Currency: "BTC",
                    Amount: 10
                }
            },
            {
                type: 'DEPOSIT',
                time: new Date(1),
                info: {
                    Id: "fghij",
                    Currency: "ETH",
                    Amount: 10
                }
            },
            {
                type: 'DEPOSIT',
                time: new Date(2),
                info: {
                    Id: "klmno",
                    Currency: "ANS",
                    Amount: 10
                }
            },
        ];

        pc.getTransactions( "abcde", depositHistory, [], [], (retarg) => {
            assert.notEqual( "NOT_SYNCED", retarg.status );
            depositHistory.splice(0, 1);

            var transactions = retarg.val;
            assert.equal( 2, transactions.length );

            var depositDateZero = _.find( transactions, {time: new Date(0)} );
            assert.equal( undefined, depositDateZero );


            var depositETH = _.find( transactions, {time: new Date(1)} );
            assert.notEqual( undefined, depositETH );
            assert.equal( 10, depositETH.info.Amount );

            var depositANS = _.find( transactions, {time: new Date(2)} );
            assert.notEqual( undefined, depositANS );
            assert.equal( 10, depositANS.info.Amount )

            done();
        });
    });

    it('tests transactionsToPortfolio method with CSV', function(done) {
        this.timeout( 10000 );
        var histories = await('order', 'withdrawal', 'deposit');

        // EMPTY WITHDRAWAL HISTORY
        var withdrawalHistory = [];
        histories.keep('withdrawal', withdrawalHistory);

        // DEPOSIT INITIAL BTC
        var depositHistory = [];
        depositHistory.push({
            type: "DEPOSIT",
            time: new Date(0),
            info: {
                Id: 1,
                Currency: "BTC",
                Amount: 1
            }
        });
        histories.keep('deposit', depositHistory);

        // SAMPLE ORDER CSV FOR TESTING
        pc.getOrderHistoryCSV( appPath + "/test/fullOrders.csv", (history) => {
            if( history.status == "SUCCESS" ) {
                histories.keep('order', history.val);
            } else {
                assert.fail("ORDER CSV FILE NOT FOUND!");
            }
        });

        histories.then(function(histories) {
            var lastId = 0;
            pc.getTransactions( lastId, histories.deposit, histories.withdrawal, histories.order, (retarg) => {
                var transactions = retarg.val;
                var balances;

                assert.doesNotThrow(function() {
                    var retarg = pc.transactionsToPortfolio( [], transactions );
                    balances = retarg.val;
                }, function(err) {
                }, "Throw while calling transactionsToPortfolio()");

                assert.notEqual( null, balances );

                var ans, etc, btc;

                ans = _.find( balances, {coin: "ANS"} );
                etc = _.find( balances, {coin: "ETC"} );
                btc = _.find( balances, {coin: "BTC"} );

                chai_assert.closeTo( 5.84346542, etc.amount, 0.000001 );
                chai_assert.closeTo( 0, ans.amount, 0.000001 );
                // Manually calculated, should change this using metamorphic testing?
                chai_assert.closeTo( 0.98268999, btc.amount, 0.000001 );

                done();
            });
        });
    });

    it('tests getOrderHistoryCSV method', function(done) {
        var orderHistory = pc.getOrderHistoryCSV( appPath + "/test/fullOrders.csv", (history) => {
            assert.notEqual( undefined, history );
            assert.notEqual( null, history );
            assert.equal( true, history.status === "SUCCESS" );

            var sampleHistory = history.val[0].info;
            var keys = ['OrderUuid', 'Exchange', 'OrderType', 'Quantity', 'QuantityRemaining', 'Commission', 'Price', 'PricePerUnit'];

            keys.forEach((key) => {
                assert.notEqual( undefined, sampleHistory[key], "Undefined for key: " + key );
            });

            var keyWithNumericValue = ['Quantity', 'QuantityRemaining', 'Commission', 'Price', 'PricePerUnit'];

            keyWithNumericValue.forEach((key) => {
                assert.notEqual( true, isNaN(sampleHistory[key]), "Not a number for key : " + key + ", with value : " + sampleHistory[key] );
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

        var retarg = pc.transactionsToPortfolio( [], depositTransactions );
        var balances = retarg.val;

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

        var retarg = pc.transactionsToPortfolio( [], transactions );
        var balances = retarg.val;

        var ANSBal1 = _.find( balances, {coin: "ANS", market: "BTC-ANS"} );
        assert.notEqual( undefined, ANSBal1 );
        assert.equal( ANSBal1.amount, 30 );
        assert.equal( ANSBal1.market, "BTC-ANS");

        var ANSBal2 = _.find( balances, {coin: "ANS", market: "ETH-ANS"} );
        assert.notEqual( undefined, ANSBal2 );
        assert.equal( ANSBal2.amount, 50 );
        assert.equal( ANSBal2.market, "ETH-ANS");
    });

    it('tests isBalanceSynced method', function(done) {
        this.timeout( 5000 );

        var ansBalance = 150.1023910;
        var btcBalance = 0.03198042;

        var apiManagerSimulator = {};

        apiManagerSimulator.getBalances = function(fn) {
            fn([
                {
                    Currency: "ANS",
                    Balance: ansBalance
                },
                {
                    Currency: "BTC",
                    Balance: btcBalance
                }
            ]);
        };

        var newBalances = [
            {
                coin: "ANS",
                market: "BTC-ANS",
                buy_rate: 1,
                amount: ansBalance
            },
            {
                coin: "BTC",
                market: "BTC-USDT",
                buy_rate: 1,
                amount: btcBalance
            }
        ];

        pc.isBalanceSynced(apiManagerSimulator, newBalances, (isBalanceSynced) => {
            assert.equal( true, isBalanceSynced );
            done();
        });
    });
});
