const {ipcRenderer} = require('electron');
const await = require('await')

var homeHTML, settingHTML;

// Use await to only setupPortfolioPage when HTMLs are ready
var htmls = await('home', 'setting');

$.get("home.html", function(data) {
    homeHTML = data;
    htmls.keep( 'home', true );
});

$.get("setting.html", function(data) {
    settingHTML = data;
    htmls.keep( 'setting', true );
});

htmls.then(function(htmls) {
    setupPortfolioPage();
});
// -----------------------------------------------------------

$("#homeBtn").click(function() {
    setupPortfolioPage();
});

$("#settingBtn").click(function() {
    setupSettingPage();
});

function setupPortfolioPage() {

    var balances = [], tickers = [];

    function createCoinEntry( balance ) {
        var cName = balance.coin;
        var amt = balance.amount;
        var buyRate = balance.buy_rate;
        var entry = "";

        entry += "<td>" + cName + "</td>";
        entry += "<td class='amt-" + cName +"'>" + amt + "</td>";
        entry += "<td class='buy-rate-" + cName + "'>" + buyRate + "</td>";
        entry += "<td class='cur-rate-" + cName + "'>0</td>";
        entry += "<td class='profit-" + cName + "'>0</td>";
        entry += "<td class='btc-conv-" + cName + "' >0</td>";

        return entry;
    }

    function updateBalances() {
        for( var i = 0; i < balances.length; i++ ) {
            var balance = balances[i];
            var cName = balance.coin;
            var amt = balance.amount = parseFloat(balance.amount).toFixed(6);
            var buyRate;

            if( balance.buy_rate == null ) {
                buyRate = 0;
            } else {
                buyRate = balance.buy_rate = parseFloat(balance.buy_rate).toFixed(6);
            }

            if( balance.amount != 0 ) {
                if($(".coin-" + cName).length == 0) {
                    // Insert entry <tr> to the HTML if does not exist yet
                    if( i % 2 == 0 ) {
                        $("#cpt-balances").append("<tr class='coin-" + cName + "'></tr>");
                    } else {
                        $("#cpt-balances").append("<tr class=\"coin-" + cName + " pure-table-odd\"></tr>");
                    }

                    // Insert the entry to the created TR
                    var entry = createCoinEntry( balance );
                    $(".coin-" + cName).append(entry);
                } else {
                    // Only update the HTML entries
                    $(".amt-" + cName).html( amt );
                    $(".buy-rate-" + cName).html( buyRate );
                    $(".cur-rate-" + cName).html( "0" );
                    $(".profit-" + cName).html( "0" );
                    $(".btc-conv-" + cName).html( "0" );
                }
            }
        }
    }

    function updateTicker( ticker ) {
        var coinName = ticker.Coin;
        var curRate = ticker.Last;
        var buyRate = $(".buy-rate-" + coinName).html();
        var amount = $(".amt-" + coinName).html();
        var profit = (curRate - buyRate) / buyRate;

        $(".cur-rate-" + coinName).html( curRate );
        $(".profit-" + coinName).html( (profit * 100).toFixed(2) + " %" );
        $(".btc-conv-" + coinName).html( (amount * curRate).toFixed(6) );
    }

    function initPortfolio() {
        $("#cpt-mainwindow").html( homeHTML );

        $(".cpt-update").click(function() {
            ipcRenderer.send('update_portfolio');
        });
    }

    ipcRenderer.on('reply_balances', (event,arg) => {
        balances = arg;
        updateBalances();
        ipcRenderer.send('update_ticker', balances);
    });

    ipcRenderer.on('reply_update_portfolio', (event,arg) => {
        balances = arg;
        updateBalances();
        ipcRenderer.send('update_ticker', balances);
    });

    ipcRenderer.on('reply_ticker', (event,arg) => {
        tickers.push( arg );
        updateTicker( arg );
    });

    initPortfolio();
    ipcRenderer.send('request_balances');
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
