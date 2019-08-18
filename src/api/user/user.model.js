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
  provider: String,
  nickname: { default: "", type: String },
  timezone: { type: String, default: "America/Sao_Paulo" },
});

UserSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    name: this.name,
    nickname: this.nickname,
    role: this.role,
    active: this.active,
    email: this.email,
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

export default mongoose.model("User", UserSchema);
