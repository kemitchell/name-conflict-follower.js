var pull = require('pull-stream')

module.exports = Follower

function Follower (log) {
  if (!(this instanceof Follower)) {
    return new Follower()
  }
  this.names = new Set()
  this.sequence = null
}

var prototype = Follower.prototype

prototype.sink = function sink (log, callback) {
  var self = this
  return pull(
    pull.filter(isPackageUpdate),
    pull.drain(function (update) {
      var name = update.id
      log.info({name: name}, 'name')
      self.names.add(name)
      self.sequence = update.seq
    })
  )
}

function isPackageUpdate (update) {
  return (
    update.doc &&
    validName(update.doc.name) &&
    update.doc.hasOwnProperty('versions')
  )
}

function validName (argument) {
  return typeof argument === 'string' && argument.length !== 0
}
