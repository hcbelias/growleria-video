/**
 * Main application routes
 */

'use strict';

export default function (app) {
  app.use('/api/users', require('./api/user'));
  app.use('/api/videos', require('./api/video'));
  app.route('/*').get((req, res) => {
    return res.status(404).end();
  });
}
