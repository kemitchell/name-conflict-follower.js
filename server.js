#!/usr/bin/env node
var Follower = require('./')
var http = require('http')
var leven = require('leven')
var pino = require('pino')
var pull = require('pull-stream')
var registry = require('pull-npm-registry-updates')
var url = require('url')

var meta = require('./package.json')

var SINCE = parseInt(process.env.SINCE || '0')
var DISTANCE = parseInt(process.env.DISTANCE || '3')
var log = pino({
  level: process.env.LOG_LEVEL
    ? process.env.LOG_LEVEL.toLowerCase()
    : 'warn'
})

log.info('start')

var follower = new Follower(log)
pull(
  registry({since: SINCE}),
  function loggingSpy (source) {
    return function (end, callback) {
      source(end, function (end, update) {
        if (update && update.hasOwnProperty('seq')) {
          log.info({
            sequence: update.seq,
            id: update.id
          }, 'update')
        }
        callback(end, update)
      })
    }
  },
  follower.sink(log, function (error) {
    if (error) {
      log.error(error)
      process.exit(1)
    }
    log.info('stream end')
  })
)

var server = http.createServer(function (request, response) {
  if (request.method !== 'GET') {
    response.statusCode = 405
    response.end()
    return
  }

  var pathname = url.parse(request.url).pathname
  if (pathname === '/') {
    send({
      service: meta.name,
      version: meta.version
    })
  } else if (pathname === '/names') {
    send(Array.from(follower.names))
  } else if (pathname === '/sequence') {
    send(follower.sequence)
  } else if (pathname.startsWith('/query/')) {
    var query = pathname.substring('/query/'.length)
    send(
      Array.from(follower.names).filter(function (name) {
        return leven(
          name.toLowerCase(),
          query.toLowerCase()
        ) <= DISTANCE
      })
    )
  }

  function send (object) {
    response.end(JSON.stringify(object))
  }
})

server.listen(process.env.PORT || 8080, function () {
  log.info({port: this.address().port}, 'listening')
})

server.on('close', function () {
  log.info('close')
})
