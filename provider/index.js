const express = require('express')
const FeedController = require('./lib/feed_controller.js')

const app = express()
const bodyparser = require('body-parser')
app.use(bodyparser.json())
let env = {}

env.username = process.env.OW_DB_USERNAME
env.password = process.env.OW_DB_PASSWORD
env.rest = process.env.OW_REST_URL
env.host = process.env.OW_DB_HOST? process.env.OW_DB_HOST : '127.0.0.1';
env.port = process.env.OW_DB_PORT? process.env.OW_DB_PORT : '5984';
env.protocol = process.env.OW_DB_PROTOCOL? process.env.OW_DB_PROTOCOL : 'http';
env.db_name = "topic_listeners"
//TODO: add config file support
if (!env.username || !env.password || !env.rest) {
    console.error('Missing credentials...\n\tOW_DB_USERNAME: %s\n\tOW_DB_PASSWORD: %s\n\tOW_REST_URL: %s', !!env.username, !!env.password, !!env.rest)
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
