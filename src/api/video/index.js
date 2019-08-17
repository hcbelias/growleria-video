'use strict';

var express = require('express');
var controller = require('./client.controller');
import * as auth from '../../auth/auth.service';

var router = express.Router();

router.get('/:id', auth.isSystemAdmin(), controller.show);
router.post('/', auth.isSystemAdmin(), controller.create);

module.exports = router;
