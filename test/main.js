var Application = require('spectron').Application
var assert = require('assert');
var path = require('path');
var electron = require('electron');

const appPath = path.resolve(__dirname, '../');

describe('application launch', function () {
    this.timeout(10000);
    let app;

    before(function () {
        app = new Application({
            path: electron,
            args: [appPath]
        });

        return app.start();
    });

    after(function () {
        if (app && app.isRunning()) {
            return app.stop();
        }
    });

    it('shows an initial window', function () {
        return app.client.getWindowCount().then(function (count) {
            assert.equal(count, 1)
        });
    });
});
