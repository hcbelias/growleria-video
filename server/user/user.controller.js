"use strict";

import mongoose from "mongoose";
import User from "./user.model";
import CalendarController from "./../calendar/calendar.controller";

function validationError(res, statusCode) {
  return function(err) {
    return res.status(500).json(err);
  };
}

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    return res.status(statusCode).send(err);
  };
}

/**
 * Get list of users
 * restriction: 'admin'
 */
export function index(req, res) {
  let query = {};
  if (req.query.role) {
    switch (req.user.role) {
      case "admin":
        break;
      default:
        const idMapping = req.user.stores.map(
          item => new mongoose.Types.ObjectId(item)
        );
        query.stores = { $in: idMapping };
        break;
    }
  }
  if (req.query.active) {
    query.active = req.query.active;
  }
  return User.find(query, "-salt -password")
    .sort({ name: 1, active: 1 })
    .exec()
    .then(users => {
      res.status(200).json(users.map(item => item.profile));
    })
    .catch(handleError(res));
}

export function getUsersById(req, res) {
  const query = {};
  if (req.query.userId) {
    query._id = Array.isArray(req.query.userId)
      ? {
          $in: req.query.userId.map(item => mongoose.Types.ObjectId(item))
        }
      : mongoose.Types.ObjectId(req.query.userId);
  }
  return User.find(query)
    .exec()
    .then(data => {
      if(data.length){
        data = data.map(item=> item.profile)
      }
      return { data };
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Creates a new user
 */
export function create(req, res) {
  var newUser = new User(req.body);
  newUser.provider = "local";
  newUser
    .save()
    .then(function(user) {
      return res.json(user.profile);
    })
    .catch(validationError(res));
}

/**
 * Get a single user
 */
export function show(req, res, next) {
  var userId = req.params.id;

  return User.findById(userId)
    .populate("stores")
    .exec()
    .then(user => {
      if (!user) {
        return res.status(404).end();
      }
      return res.json(user.profile);
    })
    .catch(err => next(err));
}

export function updateUserStore(req, res) {
  if (req.body._id) {
    Reflect.deleteProperty(req.body, "_id");
  }
  return User.findOneAndUpdate(
    { _id: req.params.id },
    {
      $set: {
        stores: req.body.stores.map(item => new mongoose.Types.ObjectId(item))
      }
    },
    { new: true, setDefaultsOnInsert: true, runValidators: true }
  )
    .exec()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function updateWorkingHours(req, res) {
  if (req.body._id) {
    Reflect.deleteProperty(req.body, "_id");
  }
  return User.findOneAndUpdate(
    { _id: req.params.id },
    { $set: { workingHours: req.body.workingHours } },
    { new: true, setDefaultsOnInsert: true, runValidators: true }
  )
    .exec()
    .then(respondWithResult(res))
    .catch(handleError(res));
}
export function updateUser(req, res) {
  if (req.body._id) {
    Reflect.deleteProperty(req.body, "_id");
  }
  return User.findOneAndUpdate(
    { _id: req.params.id },
    {
      $set: {
        name: req.body.name,
        nickname: req.body.nickname,
        active: req.body.active,
        role: req.body.role,
        workingDays: req.body.workingDays,
        repeatedWorkingDays: req.body.repeatedWorkingDays,
        cashierValidation: req.body.cashierValidation,
        hourlyRate: req.body.hourlyRate,
        cpf: req.body.cpf,
        timezone: req.body.timezone
      }
    },
    { new: true, setDefaultsOnInsert: true, runValidators: true }
  )
    .exec()
    .then(user => user.profile)
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
export function destroy(req, res) {
  return User.findByIdAndRemove(req.params.id)
    .exec()
    .then(function() {
      res.status(204).end();
    })
    .catch(handleError(res));
}

/**
 * Change a users password
 */
export function changePassword(req, res) {
  var userId = req.user._id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  return User.findById(userId)
    .exec()
    .then(user => {
      if (user.authenticate(oldPass)) {
        user.password = newPass;
        return user
          .save()
          .then(() => {
            res.status(204).end();
          })
          .catch(validationError(res));
      } else {
        return res.status(403).end();
      }
    });
}

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
