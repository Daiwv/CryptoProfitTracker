const {ipcRenderer, shell} = require('electron');
const {dialog} = require('electron').remote;
const await = require('await');
const moment = require('moment');
const _ = require('lodash');

var homeHTML, settingHTML, syncHTML;
var loadingHTML = "<i class=\"fa fa-spinner fa-spin fa-lg fa-fw\"></i>";
var balances = [], tickers = [];
var tableEntryCount = 0;

// Use await to only setupPortfolioPage when HTMLs are ready
var htmls = await('home', 'setting', 'sync');

$.get("home.html", function(data) {
    homeHTML = data;
    htmls.keep( 'home', true );
});

$.get("setting.html", function(data) {
    settingHTML = data;
    htmls.keep( 'setting', true );
});

$.get("sync.html", function(data) {
    syncHTML = data;
    htmls.keep( 'sync', true );
});

htmls.then(function(htmls) {
    setupPortfolioPage();
});
// -----------------------------------------------------------

$("#homeBtn").click(function() {
    clearAllListener();
    setupPortfolioPage();
});

$("#settingBtn").click(function() {
    clearAllListener();
    setupSettingPage();
});

function clearAllListener() {
    var channels = [
        "reply_balances",
        "reply_update_portfolio",
        "reply_ticker",
        "reply_api"
    ];

    ipcRenderer.removeAllListeners(channels);
}

function setupPortfolioPage() {

    function refreshSyncTime() {
        var timeLabel = "Last Sync: " + moment().format("hh:mm A");
        $(".cpt-last-sync").html( timeLabel );
    }

    function refreshBalances(newBalances) {
        function findDeletedCoins(oldBalances) {
            var deletedCoins = [];

            oldBalances.forEach((oldBalance) => {
                if( _.find(newBalances, oldBalance) == undefined ) {
                    deletedCoins.push(oldBalance.coin + oldBalance.market);
                }
            });

            return deletedCoins;
        }

        function createCoinEntry( balance ) {
            var coinName = balance.coin;
            var indexName = coinName + balance.market;
            var amt = balance.amount;
            var buyRate = (balance.buy_rate != null) ? parseFloat(balance.buy_rate).toExponential(3) : 0;
            var entry = "";

            entry += "<td>" + coinName + "</td>";
            entry += "<td>" + balance.market + "</td>";
            entry += "<td class='amt-" + indexName +"'>" + amt + "</td>";
            entry += "<td class='buy-rate-" + indexName + "'>" + buyRate + "</td>";
            entry += "<td class='cur-rate-" + indexName + "'></td>";
            entry += "<td class='profit-" + indexName + "'></td>";
            entry += "<td class='btc-conv-" + indexName + "' ></td>";

            return entry;
        }

        var oldBalances = balances;
        balances = newBalances;
        var deletedCoins = findDeletedCoins(oldBalances);

        deletedCoins.forEach((deletedCoin) => {
            $(".coin-" + deletedCoin).remove();
        });

        for( var i = 0; i < balances.length; i++ ) {
            var balance = balances[i];
            var coinName = balance.coin;
            var indexName = balance.coin + balance.market;
            var amt = balance.amount = parseFloat(balance.amount).toFixed(5);
            var buyRate;

            if( balance.buy_rate == null ) {
                buyRate = 0;
            } else {
                buyRate = parseFloat(balance.buy_rate).toExponential(3);
            }

            if( balance.amount > 0 ) {
                if($(".coin-" + indexName).length == 0) {
                    // Insert entry <tr> to the HTML if does not exist yet
                    if( tableEntryCount++ % 2 == 0 ) {
                        $("#cpt-balances").append("<tr class='coin-" + indexName + "'></tr>");
                    } else {
                        $("#cpt-balances").append("<tr class=\"coin-" + indexName + " pure-table-odd\"></tr>");
                    }

                    // Insert the entry to the created TR
                    var entry = createCoinEntry( balance );
                    $(".coin-" + indexName).append(entry);
                    setTickerLoading( coinName );
                } else {
                    // Only update the HTML entries
                    $(".amt-" + indexName).html( amt );
                    $(".buy-rate-" + indexName).html( buyRate );
                }
            }
        }
    }

    function setBalanceLoading( indexName ) {
        $(".amt-" + indexName).html( loadingHTML );
        $(".buy-rate-" + indexName).html( loadingHTML );
    }

    function setBalancesLoading() {
        balances.forEach((balance) => {
            setBalanceLoading( balance.coin + balance.market );
        });
    }

    function setTickerLoading( indexName ) {
        $(".cur-rate-" + indexName).html( loadingHTML );
        $(".profit-" + indexName).html( loadingHTML );
        $(".btc-conv-" + indexName).html( loadingHTML );
    }

    function setTickersLoading() {
        balances.forEach((balance) => {
            setTickerLoading( balance.coin + balance.market );
        });
    }

    function allTickerFilled() {
        var allTickerFilled = true;

        balances.forEach((balance) => {
            if( balance.amount > 0 ) {
                var indexName = balance.coin + balance.market;
                var curRate = $(".cur-rate-" + indexName).html();
                if( isNaN(curRate) ) {
                    allTickerFilled = false;
                }
            }
        });

        return allTickerFilled;
    }

    function fillTicker( ticker ) {
        var coinName = ticker.Coin;
        var indexName = coinName + ticker.Market;
        var curRate = ticker.Last;
        var balance = _.find( balances, { coin: coinName, market: ticker.Market } );

        if( balance != undefined ) {
            var buyRate = balance.buy_rate;
            var amount = balance.amount;
            var market = balance.market;
            market = market.substring(0, market.indexOf('-'));

            if( amount > 0 ) {
                var profit = (curRate - buyRate) / buyRate;
                var profitDisplay = (isFinite(profit)) ? (profit * 100).toFixed(2) + " %" : "-";

                if( profit < 0 ) {
                    profitDisplay = "<label class=\"cpt-profit-negative\">" + profitDisplay + "</label>";
                } else {
                    profitDisplay = "<label class=\"cpt-profit-positive\">" + profitDisplay + "</label>";
                }

                $(".cur-rate-" + indexName).html( curRate.toExponential(3) );
                $(".profit-" + indexName).html( profitDisplay );

                var conversion = ( indexName != "BTCUSDT-BTC" ) ? amount * curRate : parseFloat(amount);

                if( market == "ETH" ) {
                    // Get the BTC conversion first
                    ipcRenderer.once('reply_btc_conversion_' + indexName, (event,arg) => {
                        var curRate = arg.Last;
                        var conversion = curRate * amount;
                        setConversion(indexName, conversion);
                    });

                    ipcRenderer.send('request_btc_conversion', { coin: coinName, indexName: indexName });
                } else {
                    setConversion(indexName, conversion);
                }
            }
        }
    }

    function setConversion( indexName, conversion ) {
        $(".btc-conv-" + indexName).html( conversion.toFixed(5) +
        " (<label class=\"btc-conv-rat-" + indexName + "\">" + loadingHTML + "</label>)" );

        if( allTickerFilled() ) {
            refreshConversion();
        }
    }

    function refreshConversion() {
        var conversionTotal = 0;
        var conversions = {};

        balances.forEach((balance) => {
            if( balance.amount > 0 ) {
                var indexName = balance.coin + balance.market;
                var curRate = $(".cur-rate-" + indexName).html();
                var amount = $(".amt-" + indexName).html();
                var total;

                if( indexName == "BTCUSDT-BTC" ) {
                    total = amount;
                    conversions[indexName] = amount;
                } else {
                    total = amount * curRate;
                    conversions[indexName] = total;
                }

                conversionTotal += parseFloat(total);
            }
        });

        balances.forEach((balance) => {
            if( balance.amount > 0 ) {
                var indexName = balance.coin + balance.market;
                var conversion = conversions[indexName];
                var html = ((conversion / conversionTotal) * 100).toFixed(2) + " %";
                $(".btc-conv-rat-" + indexName).html( html );
            }
        });
    }

    function initPortfolio() {
        $("#cpt-mainwindow").html( homeHTML );

        refreshBalances( balances );

        $(".cpt-update").click(function() {
            setBalancesLoading();
            setTickersLoading();
            ipcRenderer.send('update_portfolio');
        });
    }

    function updateTicker() {
        ipcRenderer.send('update_ticker', balances);
    }

    // Balances stored from last fetch from the DB
    ipcRenderer.on('reply_balances', (event,arg) => {
        var balances = arg;
        refreshBalances( balances );
        updateTicker();
        refreshSyncTime();
    });

    function setupSyncPage() {
        function initSyncPage() {
            $("#cpt-mainwindow").html( syncHTML );

            $(".cpt-choose-csv").click(function() {
                var filePath = dialog.showOpenDialog({properties: ['openFile']});
                filePath = filePath[0];
                ipcRenderer.send('initial_csv_sync', filePath);
                initPortfolio();
            });

            $(".bittrex-history-url").click(function() {
                shell.openExternal("https://bittrex.com/History");
            });
        }

        initSyncPage();
    }

    // Current Balance on Bittrex
    ipcRenderer.on('reply_update_portfolio', (event,arg) => {
        if( arg.status == "SUCCESS" ) {
            var balances = arg.val;
            refreshBalances( balances );
            updateTicker();
            refreshSyncTime();
        } else if( arg.status == "NEED_SYNC" ) {
            setupSyncPage();
        }
    });

    // Current Ticker (Last Bid) on Bittrex
    ipcRenderer.on('reply_ticker', (event,arg) => {
        tickers.push( arg );
        fillTicker( arg );
    });

    initPortfolio();
    ipcRenderer.send('update_portfolio');
}

function setupSettingPage() {
    var api_key, secret_key;

    function initSettingPage() {
        $("#cpt-mainwindow").html( settingHTML );

        $(".cpt-auth-submit").click(function() {
            api_key = $("#apikey").val();
            secret_key = $("#secret_key").val();

            const bittrex_auth = {
                'api_key': api_key,
                'secret_key': secret_key
            };

            ipcRenderer.send('bittrex_auth_add', bittrex_auth);
        });
    }

    ipcRenderer.on('reply_api', (event,arg) => {
        $("#apikey").val( arg.api_key );
        $("#secret_key").val( arg.secret_key );
    });

    initSettingPage();
    ipcRenderer.send('request_api');
}
