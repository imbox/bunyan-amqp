'use strict'
let amqp = require('amqp')

class BunyanTransport {
  constructor (options) {
    this.levels = {
      10: 'trace',
      20: 'debug',
      30: 'info',
      40: 'warn',
      50: 'error',
      60: 'fatal'
    }

    let context = this
    this.exchangePromise = new Promise(function (resolve, reject) {
      context.connection = amqp.createConnection({
        heartbeat: 5,
        heartbeatForceReconnect: true,
        host: options.host || '127.0.0.1',
        port: options.port || 5672,
        login: options.user,
        password: options.password
      })

      context.connection.once('ready', function () {
        let opts = options.exchange.options || {}
        let name = options.exchange.name
        context.connection.exchange(name, opts, function (ex) {
          resolve(ex)
        })
      })

      context.connection.on('error', function (err) {
        throw err
      })
    })
  }

  write (message) {
    let context = this
    this.exchangePromise.then(function (exchange) {
      let routingKey = [
        message.hostname.replace('.', ':'),
        message.name.replace('.', ':'),
        context.levels[message.level]
      ].join('.')
      let headers = {contentType: 'application/json', timestamp: new Date()}
      exchange.publish(routingKey, JSON.stringify(message), headers)
    })
  }

  close () {
    this.connection.disconnect()
  }
}

module.exports = function (options) {
  return new BunyanTransport(options)
}
