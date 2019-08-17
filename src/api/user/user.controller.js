"use strict";

import mongoose from "mongoose";
import User from "./user.model";

/**
 * Get my info
 */
export function me(req, res, next) {
  var userId = req.user._id;

  return User.findOne({ _id: userId }, "-salt -password")
    .exec()
    .then(user => {
      // don't ever give out the password or salt
      if (!user) {
        return res.status(401).end();
      }
      return res.json(user.profile);
    })
    .catch(err => next(err));
}

/**
 * Authentication callback
 */
export function authCallback(req, res) {
  res.redirect("/");
}
