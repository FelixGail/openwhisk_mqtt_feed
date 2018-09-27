const express = require('express')
const FeedController = require('./lib/feed_controller.js')
const nconf = require('nconf')

const app = express()
const bodyparser = require('body-parser')
app.use(bodyparser.json())
let env = {}

nconf.argv()
   .env()
   .file({ file: 'config.json' });

nconf.defaults({
  'OW_DB_HOST': '127.0.0.1',
  'OW_DB_PORT': '5984',
  'OW_DB_PROTOCOL': 'http',
  'OW_REST_PROTOCOL': 'https',
  'OW_REST_URL': '127.0.0.1/api/v1'
})

env.username = nconf.get('OW_DB_USERNAME')
env.password = nconf.get('OW_DB_PASSWORD')
env.rest = nconf.get('OW_REST_PROTOCOL') + '://' + nconf.get('OW_REST_URL')
env.host = nconf.get('OW_DB_HOST')
env.port = nconf.get('OW_DB_PORT')
env.protocol = nconf.get('OW_DB_PROTOCOL')
env.db_name = "topic_listeners"
//TODO: add config file support
if (!env.username || !env.password) {
    console.error('Missing credentials...\n\tOW_DB_USERNAME: %s\n\tOW_DB_PASSWORD: %s', !!env.username, !!env.password)
    process.exit(1)
}

const feed_controller = new FeedController(env)

feed_controller.initialise().then(() => {
  const handle_error = (err, message, res) => {
    console.log(message, err)
    res.status(500).json({ error: message})
  }

  app.post('/mqtt', function (req, res) {
    // trigger (namespace/name), url, topic, username, password
    feed_controller.add_trigger(req.body).then(() => res.send())
      .catch(err => handle_error(err, 'failed to add MQTT topic trigger', res))
  })

  app.delete('/mqtt/:namespace/:trigger', (req, res) => {
    feed_controller.remove_trigger(req.params.namespace, req.params.trigger).then(() => res.send())
      .catch(err => handle_error(err, 'failed to remove MQTT topic trigger', res))
  })

  app.listen(3000, function () {
    console.log('MQTT Trigger Provider listening on port 3000!')
  })
}).catch(err => console.error("Error while initializing", err))
