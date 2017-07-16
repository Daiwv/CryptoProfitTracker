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
const appDataPath = app.getPath('userData');

const APIManager = require( appPath + '/js/APIManager.js' );
const DBManager = require( appPath + '/js/DBManager.js' );
const apikeyPath = appPath + '\\test\\config.json';
const portfolioDBPath = appDataPath + '\\portfolio_test';
const metadataDBPath = appDataPath + '\\metadata_test';

let dbm;
let apiManager;

describe('APIManager Test Suite', () => {

    before((done) => {
        dbm = new DBManager( portfolioDBPath, metadataDBPath );

        var keys = JSON.parse(fs.readFileSync(apikeyPath));

        dbm.configure( keys['api_key'], keys['secret_key'], () => {
            apiManager = new APIManager( dbm, () => {
                done();
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
            assert.notEqual( -1, data );
            done();
        });
    });

    it('tests getOrderHistory method', function(done) {
        this.timeout( 10000 );
        apiManager.getOrderHistory((data) => {
            assert.notEqual( -1, data );
            console.log( data );
            done();
        });
    });
});
