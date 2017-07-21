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

    it('tests filterJSON method', function(done) {
        var sampleObj = {
    			"Currency" : "DOGE",
    			"Balance" : 0.00000000,
    			"Available" : 0.00000000,
    			"Pending" : 0.00000000,
    			"CryptoAddress" : "DLxcEt3AatMyr2NTatzjsfHNoB9NT62HiF",
    			"Requested" : false,
    			"Uuid" : null
        };

        var keys = ["Currency", "Balance"];

        var resultObj = {
            "Currency" : "DOGE",
            "Balance" : 0.00000000
        };

        var filteredObj = apiManager.filterKeys( sampleObj, keys );

        assert.equal( true, _.isEqual(resultObj,filteredObj) );

        done();
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

    it('tests mapToDate method for orderHistory', function() {
        var orderHistoryExample = [ { OrderUuid: 'f2d8483d-4eb4-4863-ab75-9bf3485a243c',
            Exchange: 'BTC-STRAT',
            TimeStamp: '2017-07-18T06:41:33.81',
            OrderType: 'LIMIT_SELL',
            Limit: 0.00179898,
            Quantity: 9.54796227,
            QuantityRemaining: 0,
            Commission: 0.00004294,
            Price: 0.01717659,
            PricePerUnit: 0.00179897,
            IsConditional: false,
            Condition: 'NONE',
            ConditionTarget: null,
            ImmediateOrCancel: false,
            Closed: '2017-07-18T06:57:53.663' },
          { OrderUuid: '526f91ae-20ce-4344-80cd-18a608d614b3',
            Exchange: 'BTC-STRAT',
            TimeStamp: '2017-07-13T02:02:02.713',
            OrderType: 'LIMIT_BUY',
            Limit: 0.00168002,
            Quantity: 9.54796227,
            QuantityRemaining: 0,
            Commission: 0.0000401,
            Price: 0.01604076,
            PricePerUnit: 0.00168001,
            IsConditional: false,
            Condition: 'NONE',
            ConditionTarget: null,
            ImmediateOrCancel: false,
            Closed: '2017-07-13T02:02:11.26' },
        ];

        var mappedObjs = apiManager.mapToDate( orderHistoryExample, 'ORDER');

        var basicKeys = [ 'type', 'info'];

        for( time in mappedObjs ) {
            order = mappedObjs[time];
            basicKeys.forEach((key) => {
                assert.notEqual(undefined, order[key]);
            });
        }

        var orderHistoryFilteredKeys = ['OrderUuid', 'Exchange', 'OrderType', 'Quantity', 'Commission', 'PricePerUnit'];

        for( time in mappedObjs ) {
            order = mappedObjs[time];
            orderHistoryFilteredKeys.forEach((key) => {
                assert.notEqual(undefined, order['info'][key]);
            });
        }
    });

    it('tests mapToDate method for withdrawalHistory', function() {
        var orderHistoryExample = [
            { PaymentUuid: '8d805d19-8c56-4498-8025-37c91c165b6a',
            Currency: 'NMR',
            Amount: 3.34483101,
            Address: '0x41de2be1ef1e002831006ad539ed04a012b47144',
            Opened: '2017-06-29T19:09:03.807',
            Authorized: true,
            PendingPayment: false,
            TxCost: 0.01,
            TxId: '0x2dcd48322409a868590bbdce4ff2b6f709fe6b1a1c4a004f717b2421d5564c85',
            Canceled: false,
            InvalidAddress: false },
          { PaymentUuid: 'd168d2d9-79b9-4070-a949-fc3ce583e2da',
            Currency: 'NMR',
            Amount: 2.23877143,
            Address: '0x41de2be1ef1e002831006ad539ed04a012b47144',
            Opened: '2017-06-29T16:09:49.913',
            Authorized: true,
            PendingPayment: false,
            TxCost: 0.01,
            TxId: '0xa5d93e63a989d96dc92361c92846137806a5c6c76f05ecb25f76c7e9f49eaf10',
            Canceled: false,
            InvalidAddress: false } ];

        var mappedObjs = apiManager.mapToDate( orderHistoryExample, 'WITHDRAWAL');

        var basicKeys = ['type', 'info'];

        for( time in mappedObjs ) {
            order = mappedObjs[time];
            basicKeys.forEach((key) => {
                assert.notEqual(undefined, order[key]);
            });
        }

        var orderHistoryFilteredKeys = ['PaymentUuid', 'Currency', 'Amount', 'TxCost'];

        for( time in mappedObjs ) {
            order = mappedObjs[time];
            orderHistoryFilteredKeys.forEach((key) => {
                assert.notEqual(undefined, order['info'][key]);
            });
        }
    });

    it('tests mapToDate method for depositHistory', function() {
        var orderHistoryExample = [ { Id: 21492795,
            Amount: 1.27954256,
            Currency: 'NMR',
            Confirmations: 39,
            LastUpdated: '2017-06-30T04:04:24.81',
            TxId: '0x5ab3723e2c314f0c199a206d5b7860f9e94d4044d5ec3a3c04a62fd78007fe27',
            CryptoAddress: '0xd72e95044c5b73c7befca562c197c3ab585cb0d1' },
          { Id: 21432320,
            Amount: 5.23300658,
            Currency: 'ETC',
            Confirmations: 73,
            LastUpdated: '2017-06-29T13:01:05.807',
            TxId: '0x4806984890dc5ac1ede839be3ca7422d628fcd2bb2c8ff25c14ffe6e6c7c802d',
            CryptoAddress: '0x29cfd8a0ec18c774d059a34832e9b19e21b155d7' },
          { Id: 21414542,
            Amount: 0.49727674,
            Currency: 'ETC',
            Confirmations: 78,
            LastUpdated: '2017-06-29T08:27:44.257',
            TxId: '0x3fa18ef0d4186de994c6424373345ae0b62258e44c36fd7afaa3e856b0410645',
            CryptoAddress: '0x29cfd8a0ec18c774d059a34832e9b19e21b155d7' },
          { Id: 21238710,
            Amount: 0.113468,
            Currency: 'BTC',
            Confirmations: 2,
            LastUpdated: '2017-06-27T13:32:48.787',
            TxId: 'd90d9182bc52cb64fe57225bb695ec86a002df418275c381b883226fbb665027',
            CryptoAddress: '13JtkfLoX6gc5AoxNJGGDHhXBtyQBw6VSv' },
          { Id: 21124097,
            Amount: 0.02608747,
            Currency: 'BTC',
            Confirmations: 2,
            LastUpdated: '2017-06-26T08:57:25.127',
            TxId: '85a033ab616a59b6cdcfe41ef6e6f331f96bb21ec59fa5137b2ed8b7ab0c4064',
            CryptoAddress: '13JtkfLoX6gc5AoxNJGGDHhXBtyQBw6VSv' } ];

        var mappedObjs = apiManager.mapToDate( orderHistoryExample, 'DEPOSIT');

        var basicKeys = ['type', 'info'];

        for( time in mappedObjs ) {
            order = mappedObjs[time];
            basicKeys.forEach((key) => {
                assert.notEqual(undefined, order[key]);
            });
        }

        var orderHistoryFilteredKeys = ['Id', 'Currency', 'Amount'];

        for( time in mappedObjs ) {
            order = mappedObjs[time];
            orderHistoryFilteredKeys.forEach((key) => {
                assert.notEqual(undefined, order['info'][key]);
            });
        }
    });

    it('tests getTransactions method', function(done) {
        this.timeout( 10000 );
        apiManager.getTransactions( null, (transactions) => {
            assert.notEqual(undefined, transactions)
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
});
