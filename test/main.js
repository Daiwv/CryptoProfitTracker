const Application = require('spectron').Application
const assert = require('assert');
const path = require('path');
const electron = require('electron');

const appPath = path.resolve(__dirname, '../');
const electronPath = path.resolve(__dirname, '../node_modules/.bin/electron');

describe('application launch', function () {
    this.timeout(10000);
    let app;

    before(function () {
        app = new Application({
            path: electronPath,
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
