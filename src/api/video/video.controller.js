"use strict";

import mongoose from "mongoose";
import config from '../../config/environment';

let fs = require('fs')
let path = require('path');
let express = require('express');
const AWS = require('aws-sdk');

import Video from "./video.model";

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function (entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function handleEntityNotFound(res) {
  return function (entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    console.log(err);
    res.status(statusCode).send(err);
  };
}

function calculateChunk(range) {
  let positions = range.replace(/bytes=/, '').split('-');
  let start = parseInt(positions[0], 10);
  let end = positions[1] ? parseInt(positions[1], 10) : undefined;
  let chunkSize = (end - start) + 1;
  return { start, end, chunkSize };
}

function createStream(start, end, file, res, next) {
  let stream_position = {
    start: start,
    end: end
  };
  let stream = fs.createReadStream(file, stream_position);
  stream.on('open', function () {
    stream.pipe(res);
  });
  stream.on('error', function (err) {
    return next(err);
  });
}

function writeResponseHeader(start, end, res) {
  let head = {
    'Content-Range': 'bytes ' + start + '-' + end,
    'Accept-Ranges': 'bytes',
    'Content-Type': 'video/mp4'
  };
  res.writeHead(206, head);
}

function streamFile(userId, index, res, next, req) {

  let range = req.headers.range;

  if (!range) {
    let err = new Error('Wrong range');
    err.status = 416;
    return next(err);
  }

  let { start, end, chunkSize } = calculateChunk(range);
  return streamS3File(userId, index, start, end, chunkSize).then(stream => {
    writeResponseHeader(start, end, res);
    stream.on('open', function () {
      debugger;
      stream.pipe(res);
    });
    stream.on('error', function (err) {
      stream.pipe(res);
      return next(err);
    });
  })
  //writeResponseHeader(start, end, file_size, chunksize, res);
  //createStream(start, end, file, res, next);

}
async function streamS3File(userId, index, start, end, chunkSize) {
  const fileList = [
    'abertura-de-caixa-sistema.mp4',
    'abertura-de-loja.mp4',
    'credito-de-ficha-item-de-mesmo-valor.mp4'
  ];
  console.log(JSON.stringify(config))

  AWS.config.update({
    accessKeyId: config.aws.accessKey,
    secretAccessKey: config.aws.secretAccessKey
  });
  var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
  const name = fileList[index];
  var params = { Bucket: 'growleria-videos', Key: `${name}`, Range: `bytes=${start}-${!!end ? '-' + end : ''}` };
  return await s3.getObject(params).createReadStream();
}

export function show(req, res, next) {
  return streamFile(req.user._id.toString(), req.params.number, res, next, req, next);

}

export function create(req, res) {
  return Video.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

