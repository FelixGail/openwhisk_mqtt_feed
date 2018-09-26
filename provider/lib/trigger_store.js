const NodeCouchDb = require('node-couchdb');

class TriggerStore {
  constructor (env) {
    this.couchdb = new NodeCouchDb({
      auth: {
        user: env.username,
        pass: env.password
      },
      host: env.host,
      port: env.port,
      protocol: env.protocol
    });
    this.db_name = env.db_name;
  }

  initialize() {
    return this.couchdb.listDatabases().then(dbs => {
      if(!dbs.includes(this.db_name)) {
          console.log("Missing Trigger Database. Creating.");
          return true;
      }
      return false;
    }).then(boolValue => {
        if(boolValue) {
          return this.couchdb.createDatabase(this.db_name).then(() => {
            console.log("Database created successfully.");
            const views = {
              "_id": "_design/subscriptions",
              "views": {
                "host_topic_counts": {
                  "reduce": "_sum",
                  "map": "function (doc) {\n  emit(doc.url + '#' + doc.topic, 1);\n}"
                },
                "host_topic_triggers": {
                  "map": "function (doc) {\n  emit(doc.url + '#' + doc.topic, {trigger: doc._id, username: doc.username, password: doc.password});\n}"
                },
                "all": {
                  "map": "function (doc) {\n  emit(doc._id, doc.url + '#' + doc.topic);\n}"
                },
                "host_triggers": {
                  "map": "function (doc) {\n  emit(doc.url, {trigger: doc._id, username: doc.username, password: doc.password});\n}"
                }
              }
            }            
            return this.couchdb.insert(this.db_name, views)
          }).then(console.log("Views added successfully."))
        }
      })
  }

  add (trigger) {
    // trigger (namespace/name), url, topic, username, password
    return this.couchdb.insert(this.db_name, {_id: trigger.trigger, trigger})
  }

  remove (id) {
    return this.couchdb.get(this.db_name, id).then(({data, headers, status}) => this.couchdb.del(this.db_name, data._id, data._rev))
  }

  triggers (url, topic) {
    const key = topic ? `${url}#${topic}` : url
    const extract_triggers = ({data, headers, status}) => data.rows.map(row => row.value)
    const view = '_design/subscriptions/_view/' + topic? 'host_topic_triggers' : 'host_triggers'
    console.log("accessing view: %s, key: %s", view, topic)
    return this.couchdb.get(this.db_name, view,  {startkey: key, endkey: key}).then(extract_triggers)
  }

  subscribers () {
    const extract_subscribers = ({data, headers, status}) => data.rows.map(row => { 
      return {trigger: row.key, topic: row.value} 
    })
    return this.couchdb.get(this.db_name, '_design/subscriptions/_view/all').then(extract_subscribers)
  }
}

module.exports = TriggerStore
