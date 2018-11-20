/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const admin = require('firebase-admin');
const util = require('util');
const Connector = require('loopback-connector').Connector;

exports.initialize = function initializeDataSource(dataSource, callback) {
  dataSource.connector = new RealtimeDatabase(dataSource.settings);
  process.nextTick(() => {
    callback();
  });
};

class RealtimeDatabase {
  constructor(dataSourceProperties) {
    this._models = {};

    admin.initializeApp({
      credential: admin.credential.cert({
        clientEmail: dataSourceProperties.clientEmail,
        privateKey: dataSourceProperties.privateKey.replace(/\\n/g, '\n'),
        projectId: dataSourceProperties.projectId,
      }),
      databaseURL: `https://${dataSourceProperties.projectId}.firebaseio.com`,
    });

    this.db = admin.database();
  }

  /**
   * Generice method for creating a new instance
   * @param {Object} ref The database ref object
   * @param {Object} data The property/value pairs to be created
   */
  async addInstance(ref, data) {
    try {
      const newPostRef = await ref.push(data);

      const added = await ref.child(newPostRef.key).once('value');

      return Promise.resolve(added.val());
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find matching model instances by the filter
   * @param {String} model The model name
   * @param {Object} filter The filter
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async all(model, filter, options, callback) {
    const ref = this.db.ref().child(model);
    const filteredRef = await this.buildQuery(filter.where, ref);

    try {
      const snapshot = await filteredRef.once('value');

      if (snapshot.val()) {
        callback(null, Object.keys(snapshot.val()).map(key => snapshot.val()[key]));
      } else callback(null, []);
    } catch (error) {
      return callback(error);
    }
  }

  /**
   * Internal method for building query
   * @param {Object} filter The filter
   * @param {Object} ref The ref object
   */
  async buildQuery(where, ref) {
    if (where && where.id) {
      return Promise.resolve(ref.child(where.id));
    }
    if (where) {
      const property = Object.keys(where)[0];

      return Promise.resolve(ref.orderByChild(property).equalTo(where[property]));
    }
    return Promise.resolve(ref);
  }

  /**
   * Count the number of instances of a model
   * @param {String} model The model name
   * @param {Object} where The filter object
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async count(model, where, options, callback) {
    const ref = this.db.ref().child(model);
    const instanceId = where ? where.id : undefined;

    try {
      if (instanceId) {
        const instanceRef = ref.child(instanceId);
        const result = await instanceRef.once('value');

        callback(null, Object.keys(result.val()).map(key => result.val()[key]).length);
      } else {
        const result = await ref.once('value');

        callback(null, Object.keys(result.val()).map(key => result.val()[key]).length);
      }
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Create new model instance
   * @param {String} model The model name
   * @param {Object} data The property/value pairs to be created
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async create(model, data, options, callback) {
    const ref = this.db.ref().child(model);

    try {
      callback(null, await this.addInstance(ref, data));
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Destroy data for internal use
   * @param {String} model The model name
   * @param {String} id The instance id
   * @param {Object} data The null value to be used
   */
  async deleteData(model, id, data) {
    if (!id) throw new Error('Provide a valid instance Id');

    const ref = this.db.ref().child(model);
    const instanceRef = ref.child(id);

    if (!this.exists(model, id)) throw new Error('Instance not found');

    try {
      await instanceRef.set(data);
      return Promise.resolve({});
    } catch (error) {
      throw error;
    }
  }

  /**
   * Destroy all instances of a model
   * @param {String} model The model name
   * @param {Object} where The filter object
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async destroyAll(model, where, options, callback) {
    const instanceId = where ? where.id : undefined;

    try {
      if (instanceId) {
        callback(null, await this.deleteData(model, instanceId, null));
      } else {
        const ref = this.db.ref().child(model);
        await ref.set(null);
        callback(null, []);
      }
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Destroy instance records
   * @param {String} model The model name
   * @param {String} id The instance id
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async destroyById(model, id, options, callback) {
    try {
      callback(null, await this.deleteData(model, id, null));
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Validates if model instance exists
   * @param {String} model The model name
   * @param {String} id The instance id
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async exists(model, id, options, callback) {
    const ref = this.db.ref().child(model);
    const instanceRef = ref.child(id);

    try {
      const result = await instanceRef.once('value');

      if (result.val()) callback(null, true);
      else callback(null, false);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Find or create an instance
   * @param {String} model The model name
   * @param {Object} filter The filter object
   * @param {Object} data The property/value pairs to be created
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async findOrCreate(model, filter, data, options, callback) {
    const ref = this.db.ref().child(model);
    const filteredRef = await this.buildQuery(filter.where, ref);

    try {
      const snapshot = await filteredRef.once('value');

      if (snapshot.val()) callback(null, snapshot.val());
      else callback(null, await this.addInstance(filteredRef, data));
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Replace matching instance
   * @param {String} model The model name
   * @param {String} id The instance id
   * @param {Object} data The property/value pairs to be replaced
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async replaceById(model, id, data, options, callback) {
    try {
      callback(null, await this.deleteData(model, id, data));
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Replace or create an instance
   * @param {String} model The model name
   * @param {Object} data The property/value pairs to be replaced or created
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async replaceOrCreate(model, data, options, callback) {
    const ref = this.db.ref().child(model);
    const instanceId = data.id;
    const instanceRef = ref.child(instanceId);

    try {
      const snapshot = await instanceRef.once('value');

      if (snapshot.val()) {
        await instanceRef.set(data);
        callback(null, data);
      } else {
        callback(null, await this.addInstance(ref, data));
      }
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Save an instance
   * @param {String} model The model name
   * @param {Object} data The property/value pairs to be saved
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async save(model, data, options, callback) {
    const ref = this.db.ref().child(model);
    try {
      callback(null, await this.addInstance(ref, data));
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Internal use for Update matching instance
   * @param {String} model The model name
   * @param {Object} where The search criteria
   * @param {Object} data The property/value pairs to be updated
   */
  async updateInternal(model, where, data) {
    try {
      const instanceId = where ? where.id : undefined;

      if (!instanceId) throw new Error('Provide a valid instance Id');

      const ref = this.db.ref().child(model);
      const instanceRef = ref.child(instanceId);

      if (!this.exists(model, instanceId)) throw new Error('Instance not found');

      await instanceRef.update(data);

      return Promise.resolve([]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update matching instance
   * @param {String} model The model name
   * @param {Object} where The search criteria
   * @param {Object} data The property/value pairs to be updated
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async update(model, where, data, options, callback) {
    try {
      callback(null, await this.updateInternal(model, where, data));
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Update matching instance attributes
   * @param {String} model The model name
   * @param {String} id The instance id
   * @param {Object} data The property/value pairs to be updated
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async updateAttributes(model, id, data, options, callback) {
    const where = { id };
    try {
      callback(null, this.updateInternal(model, where, data));
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Update or create an instance
   * @param {String} model The model name
   * @param {Object} data The property/value pairs to be updated or created
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async updateOrCreate(model, data, options, callback) {
    const ref = this.db.ref().child(model);
    const instanceId = data.id;

    try {
      if (instanceId) {
        const where = { id: instanceId };

        callback(null, await this.updateInternal(model, where, data));
      } else {
        callback(null, await this.addInstance(ref, data));
      }
    } catch (error) {
      callback(error);
    }
  }
}

util.inherits(RealtimeDatabase, Connector);
exports.RealtimeDatabase = RealtimeDatabase;
