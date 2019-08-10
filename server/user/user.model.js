"use strict";
/*eslint no-invalid-this:0*/
import crypto from "crypto";
mongoose.Promise = require("bluebird");
import mongoose, { Schema } from "mongoose";
var ValidationError = mongoose.Error.ValidationError;
var ValidatorError = mongoose.Error.ValidatorError;

const authTypes = ["github", "twitter", "facebook", "google"];

var UserSchema = new Schema({
  name: String,
  active: Boolean,
  email: {
    type: String,
    lowercase: true,
    required() {
      if (authTypes.indexOf(this.provider) === -1) {
        return true;
      } else {
        return false;
      }
    }
  },
  role: {
    type: String,
    default: "user"
  },
  password: {
    type: String,
    required() {
      if (authTypes.indexOf(this.provider) === -1) {
        return true;
      } else {
        return false;
      }
    }
  },
  provider: String,
  nickname: { default: "", type: String },
  salt: String,
  facebook: {},
  google: {},
  github: {},
  cpf: { type: String, default: "" },
  timezone: { type: String, default: "America/Sao_Paulo" },
  stores: {
    type: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Store"
      }
    ],
    default: []
  }
});

/**
 * Virtuals
 */

// Public profile information
UserSchema.virtual("profile").get(function () {
  return {
    _id: this._id,
    name: this.name,
    nickname: this.nickname,
    role: this.role,
    active: this.active,
    email: this.email,
    workingHours: this.workingHours,
    cashierValidation: this.cashierValidation,
    workingDays: this.workingDays,
    repeatedWorkingDays: this.repeatedWorkingDays,
    hourlyRate: this.hourlyRate,
    cpf: this.cpf,
    stores: this.stores,
    timezone: this.timezone
  };
});

// Non-sensitive info we'll be putting in the token
UserSchema.virtual("token").get(function () {
  return {
    _id: this._id,
    role: this.role
  };
});

/**
 * Validations
 */

// Validate empty email
UserSchema.path("email").validate(function (email) {
  if (authTypes.indexOf(this.provider) !== -1) {
    return true;
  }
  return email.length;
}, "Email é obrigatório");

// Validate empty password
UserSchema.path("password").validate(function (password) {
  if (authTypes.indexOf(this.provider) !== -1) {
    return true;
  }
  return password.length;
}, "Senha é obrigatório");

// Validate email is not taken
UserSchema.path("email").validate(function (value) {
  if (authTypes.indexOf(this.provider) !== -1) {
    return true;
  }

  return this.constructor
    .findOne({ email: value })
    .exec()
    .then(user => {
      if (user) {
        if (this.id === user.id) {
          return true;
        }
        return false;
      }
      return true;
    })
    .catch(function (err) {
      throw err;
    });
}, "E-mail já cadastrado.");

var validatePresenceOf = function (value) {
  return value && value.length;
};

/**
 * Pre-save hook
 */
UserSchema.pre("save", function (next, err) {
  // Handle new/update passwords
  if (!this.isModified("password")) {
    return next();
  }
  const numbers = /[0-9]+/;
  const letters = /[A-Za-z]+/;
  const matches = !!(
    this.password.match(numbers) && this.password.match(letters)
  );
  if (this.password.length < 4 || !matches) {
    var error = new ValidationError(this);
    error.errors.password = new ValidatorError({
      path: "password",
      message: "Por favor, forneça uma senha com letras e números.",
      value: this.password
    });
    return err(error);
  }

  if (!validatePresenceOf(this.password)) {
    if (authTypes.indexOf(this.provider) === -1) {
      var error = new ValidationError(this);
      error.errors.password = new ValidatorError({
        path: "password",
        message: "Senha inválida",
        value: this.password
      });
      return err(error);
    } else {
      return next();
    }
  }

  // Make salt with a callback
  this.makeSalt((saltErr, salt) => {
    if (saltErr) {
      return err(saltErr);
    }
    this.salt = salt;
    this.encryptPassword(this.password, (encryptErr, hashedPassword) => {
      if (encryptErr) {
        return err(encryptErr);
      }
      this.password = hashedPassword;
      return next();
    });
  });
});

/**
 * Methods
 */
UserSchema.methods = {
  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} password
   * @param {Function} callback
   * @return {Boolean}
   * @api public
   */
  authenticate(password, callback) {
    if (!callback) {
      return this.password === this.encryptPassword(password);
    }

    this.encryptPassword(password, (err, pwdGen) => {
      if (err) {
        return callback(err);
      }

      if (this.password === pwdGen) {
        return callback(null, true);
      } else {
        return callback(null, false);
      }
    });
  },

  /**
   * Make salt
   *
   * @param {Number} [byteSize] - Optional salt byte size, default to 16
   * @param {Function} callback
   * @return {String}
   * @api public
   */
  makeSalt(...args) {
    let byteSize;
    let callback;
    let defaultByteSize = 16;

    if (typeof args[0] === "function") {
      callback = args[0];
      byteSize = defaultByteSize;
    } else if (typeof args[1] === "function") {
      callback = args[1];
    } else {
      throw new Error("Missing Callback");
    }

    if (!byteSize) {
      byteSize = defaultByteSize;
    }

    return crypto.randomBytes(byteSize, (err, salt) => {
      if (err) {
        return callback(err);
      } else {
        return callback(null, salt.toString("base64"));
      }
    });
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @param {Function} callback
   * @return {String}
   * @api public
   */
  encryptPassword(password, callback) {
    if (!password || !this.salt) {
      if (!callback) {
        return null;
      } else {
        return callback("Missing password or salt");
      }
    }

    var defaultIterations = 10000;
    var defaultKeyLength = 64;
    var salt = new Buffer(this.salt, "base64");

    if (!callback) {
      // eslint-disable-next-line no-sync
      return crypto
        .pbkdf2Sync(password, salt, defaultIterations, defaultKeyLength, "sha1")
        .toString("base64");
    }

    return crypto.pbkdf2(
      password,
      salt,
      defaultIterations,
      defaultKeyLength,
      "sha1",
      (err, key) => {
        if (err) {
          return callback(err);
        } else {
          return callback(null, key.toString("base64"));
        }
      }
    );
  }
};

export default mongoose.model("User", UserSchema);
