'use strict';
/*eslint no-process-env:0*/

var path = require('path');

// All configurations will extend these options
// ============================================
var config = {
  env: process.env.NODE_ENV,
  root: path.normalize(`${__dirname}/../../..`),
  browserSyncPort: process.env.BROWSER_SYNC_PORT || 3000,
  port: process.env.PORT || 9000,
  ip: process.env.IP || '0.0.0.0',
  secrets: {
    session: 'growleria-secret'
  },
  mongo: {
    uri: process.env.MONGODB_URI
      || process.env.MONGOHQ_URL
      || process.env.OPENSHIFT_MONGODB_DB_URL + process.env.OPENSHIFT_APP_NAME
      || 'mongodb://localhost:27017/growleria',
    options: {
      useMongoClient: true,
      db: {
        safe: true
      }
    }
  }
};

module.exports = config;
