const admin = require('firebase-admin');
const util = require('util');
const Connector = require('loopback-connector').Connector;

exports.initialize = function initializeDataSource(dataSource) {
	dataSource.connector = new RealtimeDatabase(dataSource.settings);
};

class RealtimeDatabase {
	constructor(dataSourceProperties) {
		this._models = {};

		admin.initializeApp({
			credential: admin.credential.cert({
				projectId: dataSourceProperties.projectId,
				clientEmail: dataSourceProperties.clientEmail,
				privateKey: dataSourceProperties.privateKey.replace(/\\n/g, '\n'),
			}),
			databaseURL:
				`https://${dataSourceProperties.databaseName}` ||
				`${dataSourceProperties.projectId}.firebaseio.com`,
		});

		this.db = admin.database();
	}

	/**
	 * Find matching model instances by the filter
	 * @param {String} model The model name
	 * @param {Object} filter The filter
	 */
	async all(model, filter) {
		const ref = this.db.ref().child(model);
		const filteredRef =
			filter.where && filter.where.id ? ref.child(filter.where.id) : ref;

		try {
			const snapshot = await filteredRef.once('value');

			if (snapshot.val()) return Promise.resolve(snapshot.val());
			else return Promise.resolve([]);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Count the number of instances of a model
	 * @param {String} model The model name
	 * @param {Object} where The filter object
	 */
	async count(model, where) {
		const ref = this.db.ref().child(model);
		const instanceId = where.id;

		try {
			if (instanceId) {
				const instanceRef = ref.child(instanceId);
				const result = await instanceRef.once('value');

				return Promise.resolve(result.val().length);
			} else {
				const result = await ref.once('value');

				return Promise.resolve(result.val().length);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Create new model instance
	 * @param {String} model The model name
	 * @param {Object} data The model data
	 */
	async create(model, data) {
		const ref = this.db.ref().child(model);

		try {
			const newPostRef = await ref.push(data);

			const added = await ref.child(newPostRef.key).once('value');

			return Promise.resolve(added.val());
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Destroy all instances of a model
	 * @param {String} model The model name
	 * @param {Object} where The filter object
	 */
	async destroyAll(model, where) {
		const instanceId = where.id;

		try {
			if (instanceId) {
				const result = await this.destroyById(model, instanceId);
				return Promise.resolve(result);
			} else {
				const ref = this.db.ref().child(model);
				await ref.set(null);
				return Promise.resolve([]);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Destroy instance records
	 * @param {String} model The model name
	 * @param {String} id The instance id
	 */
	async destroyById(model, id) {
		try {
			const result = await this.replaceById(model, id, null);
			return Promise.resolve(result);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Validates if model instance exists
	 * @param {String} model The model name
	 * @param {String} id The instance id
	 */
	async exists(model, id) {
		const ref = this.db.ref().child(model);
		const instanceRef = ref.child(id);

		try {
			const result = await instanceRef.once('value');

			if (result.val()) return Promise.resolve(true);
			else return Promise.resolve(false);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Replace matching instance
	 * @param {String} model The model name
	 * @param {String} id The instance id
	 * @param {Object} data The property/value pairs to be updated
	 */
	async replaceById(model, id, data) {
		if (!id) return Promise.resolve('Provide a valid instance Id');

		const ref = this.db.ref().child(model);
		const instanceRef = ref.child(id);

		if (!this.exists(model, id)) return Promise.resolve('Instance not found');

		try {
			await instanceRef.set(data);
			return Promise.resolve({});
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Update all matching instances
	 * @param {String} model The model name
	 * @param {Object} where The search criteria
	 * @param {Object} data The property/value pairs to be updated
	 */
	async update(model, where, data) {
		const instanceId = where.id;

		if (!instanceId) return Promise.resolve('Provide a valid instance Id');

		const ref = this.db.ref().child(model);
		const instanceRef = ref.child(instanceId);

		if (!this.exists(model, instanceId))
			return Promise.resolve('Instance not found');

		try {
			await instanceRef.update(data);
			return Promise.resolve([]);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Update matching instance attributes
	 * @param {String} model The model name
	 * @param {String} id The instance id
	 * @param {Object} data The property/value pairs to be updated
	 */
	async updateAttributes(model, id, data) {
		try {
			const result = await this.replaceById(model, id, data);
			return Promise.resolve(result);
		} catch (error) {
			return Promise.reject(error);
		}
	}
}

util.inherits(RealtimeDatabase, Connector);
exports.RealtimeDatabase = RealtimeDatabase;
