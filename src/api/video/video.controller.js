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

function writeResponseHeader(start, end, res) {
  let head = {
    'Content-Range': 'bytes ' + start + '-' + end,
    'Accept-Ranges': 'bytes',
    'Content-Type': 'video/mp4'
  };
  res.writeHead(206, head);
}

function streamFile(userId, index, req, res, next) {

  let range = req.headers.range;

  if (!range) {
    let err = new Error('Wrong range');
    err.status = 416;
    return next(err);
  }

  //let { start, end, chunkSize } = calculateChunk(range);
  streamS3File(userId, index, range, next, res);
  //writeResponseHeader(start, end, file_size, chunksize, res);
  //createStream(start, end, file, res, next);

}
async function streamS3File(userId, index, range, next, res) {
  const fileList = [
    'abertura-de-caixa-sistema.mp4',
    'abertura-de-loja.mp4',
    'credito-de-ficha-item-de-mesmo-valor.mp4',
    'credito-de-ficha-com-impressao-de-nova-ficha.mp4',
    'embalar-growler.mp4',
    'encerramento-de-caixa-com-retirada-para-malote.mp4',
    'encerramento-de-caixa-sem-retirada-para-malote.mp4',
    'encher-growler.mp4',
    'fechamento-de-loja.mp4',
    'finalizacao-troca-de-barril.mp4',
    'mangueiras-encher-growler.mp4',
    'recebimento-de-barril.mp4',
    'troca-de-barril-atualizar-tv.mp4',
    'troca-de-barril-especial.mp4',
    'troca-de-barril.mp4',
    'uber-eats-aceitando-pedido.mp4',
    'uber-eats-cancelamento-de-pedido.mp4',
    'uber-eats-lancar-venda-no-sistema.mp4',
    'uber-eats-troca-de-chopp.mp4',
    'vazamento-barril.mp4',
    'venda-multiplas-fichas.mp4',
  ];

  AWS.config.update({
    accessKeyId: config.aws.accessKey,
    secretAccessKey: config.aws.secretAccessKey
  });
  var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
  const name = index <= 0 || index > fileList.length ? fileList[0] : fileList[index - 1];
  var params = { Bucket: 'growleria-videos', Key: `${name}` };
  let metadata = await s3.headObject(params, function (err, data) {
    if (err) {
      // an error occurred
      console.error(err);
      return next();
    }

    let positions = range.replace(/bytes=/, '').split('-');
    let start = parseInt(positions[0], 10);
    let fileSize = data.ContentLength;
    let chunk = start + 5000000;
    let end = positions[1] ? parseInt(positions[1], 10) : (chunk > fileSize ? fileSize : chunk);

    Object.assign(params, { Range: `bytes=${start}-${end}` });
    var stream = s3.getObject(params).createReadStream();

    // forward errors
    stream.on('error', function error(err) {
      //continue to the next middlewares
      return res.status(500).json({ error: 'Streaming' });
    });

    //Add the content type to the response (it's not propagated from the S3 SDK)
    const headParams = {
      'Content-Type': 'video/mp4',
      'Content-Length': (end - start + 1),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
      'Accept-Ranges': 'bytes'

    };
    res.writeHead(206, headParams);
    //stream.on('open', function () {
    // stream.pipe(res);
    //});

    stream.on('end', () => {
      console.log('Served');
    });
    //Pipe the s3 object to the response
    stream.pipe(res);
  });
  //return await s3.getObject(params).createReadStream();
}

export function show(req, res, next) {
  streamFile(req.user._id.toString(), req.params.number, req, res, next);
}

export function create(req, res) {
  return Video.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

