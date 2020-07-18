const admin = require("firebase-admin");
const util = require("util");
const Connector = require("loopback-connector").Connector;

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
        privateKey: dataSourceProperties.privateKey.replace(/\\n/g, "\n"),
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

      await ref.child(newPostRef.key).once("value");

      const result = newPostRef.key;

      return Promise.resolve(result);
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
    try {
      const ref = this.db.ref().child(model);

      const result = await this.queryData(filter, ref);

      callback(null, result);
    } catch (error) {
      return callback(error);
    }
  }

  formatResults(snapshot) {
    const values = snapshot.val();
    const hasValues = values !== null && values !== undefined;

    if (!hasValues) return Promise.resolve([]);

    const result = Object.keys(values).map((key) => {
      const item = values[key];
      const id = key;
      return { ...item, id };
    });

    return Promise.resolve(result);
  }

  arrayCheck(arr1, arr2) {
    const sameLength = arr1.length === arr2.length;

    if (!sameLength) return false;

    return arr1.every((element, index) => element === arr2[index]);
  }

  /**
   * Add new filter to a Results
   * @param {Array} results Unfiltered results
   * @param {Object} filter The filter object
   */
  addFiltersToQuery(results, filter) {
    const key = Object.keys(filter)[0];
    const value = Object.values(filter)[0];

    const isArray = Array.isArray(value);

    const isObject = typeof value === "object" && !isArray;

    if (isObject) {
      return this.addInnerFiltersToQuery(results, key, value);
    }

    return results.filter((item) => {
      return Object.keys(item).find((insideKey) => {
        const insideValue = item[insideKey];

        const valueCheck = isArray
          ? this.arrayCheck(value, insideValue)
          : value === insideValue;

        return key === insideKey && valueCheck;
      });
    });
  }

  /**
   * Add inner filters to a Query
   * @param {Query} query Datastore Query
   * @param {String} key Property name being filtered
   * @param {Object} value Object with operator and comparison value
   */
  addInnerFiltersToQuery(results, key, value) {
    let filteredResults = results;

    for (const operation in value) {
      if (value.hasOwnProperty(operation)) {
        const comparison = value[operation];

        let operator = undefined;
        switch (operation) {
          case "lt":
            operator = "<";
            break;
          case "lte":
            operator = "<=";
            break;
          case "gt":
            operator = ">";
            break;
          case "gte":
            operator = ">=";
            break;
          case "ne":
            operator = "!==";
            break;
          case "in":
            operator = "in";
            break;
          default:
            break;
        }
        filteredResults = filteredResults.filter((item) => {
          return eval(`${item[key]} ${operator} ${comparison}`);
        });
      }
    }

    return filteredResults;
  }

  /**
   * Internal method for building query
   * @param {Object} filter The filter
   * @param {Object} ref The ref object
   */
  async queryData(filter, ref) {
    const { where, limit, skip, fields, order } = filter;

    if (where && where.id) {
      const snapshot = await ref.child(where.id).once("value");

      return Promise.resolve(snapshot.val());
    }

    let internalRef = ref;

    if (limit) {
      internalRef = internalRef.limitToFirst(limit);
    }

    const snapshot = await internalRef.once("value");
    let filteredResults = await this.formatResults(snapshot);

    if (where) {
      for (const key in where) {
        if (where.hasOwnProperty(key)) {
          const value = { [key]: where[key] };

          filteredResults = this.addFiltersToQuery(filteredResults, value);
        }
      }
    }

    if (skip) {
      filteredResults = filteredResults.slice(skip);
    }

    if (order) {
      const [property, sorting] = order.split(" ");

      filteredResults = filteredResults.sort((a, b) => {
        const aProperty = a[property].toString();
        const bProPerty = b[property].toString();
        if (sorting === "DESC") {
          return aProperty.localeCompare(bProPerty);
        }
        return bProPerty.localeCompare(aProperty);
      });
    }

    if (fields) {
      filteredResults = filteredResults.reduce((acc, result) => {
        const filteredProperties = Object.keys(result).reduce((accInt, key) => {
          if (!fields.includes(key)) return accInt;

          accInt = { ...accInt, [key]: result[key] };

          return accInt;
        }, {});

        acc.push(filteredProperties);
        return acc;
      }, []);
    }

    return Promise.resolve(filteredResults);
  }

  /**
   * Count the number of instances of a model
   * @param {String} model The model name
   * @param {Object} where The filter object
   * @param {Object} options The options object
   * @param {Function} [cb] The callback function
   */
  async count(model, where, options, callback) {
    try {
      const ref = this.db.ref().child(model);
      const instanceId = where ? where.id : undefined;

      if (instanceId) {
        const instanceRef = ref.child(instanceId);

        const snapshot = await instanceRef.once("value");

        const result = Object.keys(snapshot.val()).length;

        callback(null, result);
      } else {
        const snapshot = await ref.once("value");

        const result = Object.keys(snapshot.val()).length;

        callback(null, result);
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
    try {
      if (data.id) {
        const result = await this.replaceOrCreate(
          model,
          data,
          options,
          callback
        );
        callback(null, result);
      } else {
        const ref = this.db.ref().child(model);
        const result = await this.addInstance(ref, data);
        callback(null, result);
      }
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
    if (!id) throw new Error("Provide a valid instance Id");

    const ref = this.db.ref().child(model);
    const instanceRef = ref.child(id);

    if (!(await this.exists(model, id))) throw new Error("Instance not found");

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
        const result = await this.deleteData(model, instanceId, null);

        callback(null, result);
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
      const result = await this.deleteData(model, id, null);

      callback(null, result);
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
      const result = await instanceRef.once("value");

      if (result.val()) return Promise.resolve(true);
      else return Promise.resolve(false);
    } catch (error) {
      return Promise.reject(error);
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
    try {
      const ref = this.db.ref().child(model);
      const result = this.queryData(filter, ref);
      if (result) callback(null, result);
      else {
        const result = await this.addInstance(ref, data);

        callback(null, result);
      }
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
      const result = await this.deleteData(model, id, data);

      callback(null, result);
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
      await instanceRef.set(data);
      callback(null, data);
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
      const result = await this.addInstance(ref, data);

      callback(null, result);
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
      const ref = this.db.ref().child(model);

      const result = await this.queryData(where, ref);

      if (!result || result.length === 0) throw new Error("Instance not found");

      const updatedIds = [];
      let updateObject = {};

      for (const item of result) {
        const { id: instanceId } = item;
        updatedIds.push(instanceId);

        const propertiesToUpdate = Object.keys(data).reduce((accInt, key) => {
          accInt = { ...accInt, [`${instanceId}/${key}`]: data[key] };
          return accInt;
        }, {});

        updateObject = { ...updateObject, ...propertiesToUpdate };
      }

      await ref.update(updateObject);

      const snapshot = await ref.once("value");
      const results = await this.formatResults(snapshot);

      const updatedResult = results.filter(({ id }) => updatedIds.includes(id));

      return Promise.resolve(updatedResult);
    } catch (error) {
      throw error;
    }
  }

  async updateById(model, instanceId, data) {
    try {
      if (!instanceId) {
        throw new Error("Provide a valid instance Id");
      }

      const ref = this.db.ref().child(model);
      const instanceRef = ref.child(instanceId);

      if (!(await this.exists(model, instanceId)))
        throw new Error("Instance not found");

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
      const result = await this.updateInternal(model, where, data);

      callback(null, result);
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
      const result = await this.updateInternal(model, where, data);

      callback(null, result);
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

        const result = await this.updateInternal(model, where, data);

        callback(null, result);
      } else {
        const result = await this.addInstance(ref, data);

        callback(null, result);
      }
    } catch (error) {
      callback(error);
    }
  }
}

util.inherits(RealtimeDatabase, Connector);
exports.RealtimeDatabase = RealtimeDatabase;
