
const http = require('http');
let path = require('path');
let logger = require('morgan');
let express = require('express');
let bodyParser = require('body-parser');
let config = require('./config/environment');
let app = express();

mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.connection.on('error', function (err) {
    console.error(`MongoDB connection error: ${err}`);
    process.exit(-1); // eslint-disable-line no-process-exit
});


let server = http.createServer(app);

require('./config/express').default(app);
require('./routes').default(app);

// Start server
function startServer() {
    app.growleriaVideo = server.listen(config.port, config.ip, function () {
        console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
    });
}

setImmediate(startServer);

// Expose app
exports = module.exports = app;
