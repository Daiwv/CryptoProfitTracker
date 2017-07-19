class CryptoCalculator {
    constructor() {

    }

    /*
     * @param {Object} The order history
     * @return {Object} A Map with TimeStamp as Key and the Order Detail as the val
     */
    sortOrderHistory( orderHistory ) {
        newOrderHistory = [];

        orderHistory.forEach((ele) => {
            var ts = ele.TimeStamp;
            delete ele.TimeStamp;
            orderHistory[ts] = ele;
        });

        return orderHistory;
    }

    /*
     * @param {Object} The order history
     * @return {Object} The final balances with the buy rate
     */
    orderHistoryToBalance( orderHistory ) {

    }
};

module.exports = CryptoCalculator;
