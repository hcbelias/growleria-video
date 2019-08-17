/**
 * Main application routes
 */

'use strict';

import path from 'path';

export default function (app) {
  app.use('/api/users', require('./api/user'));
  app.use('/api/videos', require('./api/video'));
  app.use('/auth', require('./auth').default);
  app.route('/*')
    .get((req, res) => {
      return res.status(404).end();
    });
}
