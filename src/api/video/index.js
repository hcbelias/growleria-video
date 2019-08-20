'use strict';

var express = require('express');
var controller = require('./video.controller');
import * as auth from '../../auth/auth.service';

var router = express.Router();
router.get('/:number', auth.isAuthenticated(), controller.show);
router.post('/', auth.isSystemAdmin(), controller.create);

module.exports = router;
