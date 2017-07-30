const _ = require('lodash');
const moment = require('moment');

module.exports = {
    /*
     * Filter the keys & values of an object, such that the filteredObjs
     * will only contain have the keys from the sent 'keys' argument.
     * @param {Object} obj - The object to be filtered
     * @param {Object} keys - List of keys to be kept
     * @return {Object} filteredObjs - The filtered object
     */
    filterKeys: function( obj, keys ) {
        var filteredObj = {};

        keys.forEach((key) => {
            filteredObj[key] = obj[key];
        });

        return filteredObj;
    },
    /*
     * Use the date as the key, such that each of the tx will
     * have date as its key and the details of the tx for its value.
     * @param {Object} objs - The response from bittrex API call
     * @param {String} type - {ORDER | WITHDRAWAL | DEPOSIT}, the history type
     * @return {Object} mappedObjs - The object with 'date' as its key
     */
    mapToDate: function( objs, type ) {
        var mappedObjs = [];
        var timeKey;
        var filteredKeys;

        switch( type ) {
            case 'ORDER':
            timeKey = "Closed";
            filteredKeys = ['OrderUuid', 'Exchange', 'OrderType', 'Quantity', 'QuantityRemaining', 'Commission', 'Price', 'PricePerUnit'];
            break;

            case 'WITHDRAWAL':
            timeKey = "Opened";
            filteredKeys = ['PaymentUuid', 'Currency', 'Amount', 'TxCost'];
            break;

            case 'DEPOSIT':
            timeKey = "LastUpdated";
            filteredKeys = ['Id', 'Currency', 'Amount'];
            break;
        }

        if( objs != undefined ) {
            objs.forEach((obj) => {
                var time = obj[timeKey];
                var filteredObj = this.filterKeys( obj, filteredKeys );
                var mappedObj = {}
                mappedObj['info'] = filteredObj;
                mappedObj['type'] = type;
                mappedObj['time'] = new Date(moment(new Date(time)).format());
                mappedObjs.push( mappedObj );
            });
        }

        mappedObjs.sort(function compare(a,b) {
            var dateA = a.time;
            var dateB = b.time;
            return dateA - dateB;
        });

        return mappedObjs;
    },
    /*
     * @param {String} exchange - The exchange String (e.g.: BTC-STRAT)
     * @param {requestCallback} fn - To return the source and destination exchange
     */
    parseOrderExchange( exchange, fn ) {
        var exchanges = _.split(exchange, "-");
        if( exchanges.length == 2 ) {
            fn( exchanges[0], exchanges[1], true );
        } else {
            fn( null, null, false );
        }
    }
};
