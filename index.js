'use strict'
let amqp = require('amqp')

class BunyanTransport {
  constructor (options) {
    let host = options.host
    let port = options.port
    let vhost = options.vhost
    let exchangeName = options.exchange
    let user = options.user
    let password = options.password

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
        host: host,
        port: port,
        login: user,
        password: password,
        vhost: vhost
      })

      context.connection.once('ready', function () {
        let opts = {durable: true, exclusive: false}
        context.connection.exchange(exchangeName, opts, function (exchange) {
          resolve(exchange)
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
