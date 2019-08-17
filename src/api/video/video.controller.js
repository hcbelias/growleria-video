"use strict";

import mongoose from "mongoose";
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

function calculateChunk(range, stats) {
  let positions = range.replace(/bytes=/, '').split('-');
  let start = parseInt(positions[0], 10);
  let file_size = stats.size;
  let end = positions[1] ? parseInt(positions[1], 10) : file_size - 1;
  let chunksize = (end - start) + 1;
  return { start, end, file_size, chunksize };
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

function writeResponseHeader(start, end, file_size, chunksize, res) {
  let head = {
    'Content-Range': 'bytes ' + start + '-' + end + '/' + file_size,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize,
    'Content-Type': 'video/mp4'
  };
  res.writeHead(206, head);
}

function streamFile(file, res, next, req) {
  fs.stat(file, function (err, stats) {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.sendStatus(404);
      }
      return next(err);
    }
    let range = req.headers.range;
    if (!range) {
      let err = new Error('Wrong range');
      err.status = 416;
      return next(err);
    }
    let { start, end, file_size, chunksize } = calculateChunk(range, stats);
    writeResponseHeader(start, end, file_size, chunksize, res);
    createStream(start, end, file, res, next);
  });
}


export function show(req, res) {
  let file = `../assets/videos/${req.param.name}.mp4`;

  streamFile(file, res, next, req);

  return Video.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function create(req, res) {
  return Video.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

