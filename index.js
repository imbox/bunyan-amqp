'use strict'
let rabbot = require('rabbot')

let noop = function () {}

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

    this.connectionName = 'mq-log-connection'
    this.connection = rabbot.addConnection({
      name: this.connectionName,
      user: options.user,
      pass: options.password,
      host: options.host || '127.0.0.1',
      port: options.port || 5672,
      timeout: 2000,
      heartbeat: 5,
      replyQueue: false
    })

    this.exchangeName = options.exchange.name
    let exchangeOptions = options.exchange.options || {}
    this.exchange = rabbot.addExchange(
      this.exchangeName, 'topic', exchangeOptions, this.connectionName
    )
  }

  write (message) {
    let connectionName = this.connectionName
    let connection = this.connection
    let exchange = this.exchange
    let exchangeName = this.exchangeName
    let routingKey = [
      message.hostname.replace('.', ':'),
      message.name.replace('.', ':'),
      this.levels[message.level]
    ].join('.')

    connection.then(exchange).then(function () {
      rabbot.publish(exchangeName, {
        routingKey: routingKey,
        body: message
      }, connectionName)
    })
    .catch(noop)
  }
}

module.exports = function (options) {
  return new BunyanTransport(options)
}
