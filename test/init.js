require('dotenv').config();
module.exports = require('should');

const DataSource = require('loopback-datasource-juggler').DataSource;

try {
  const config = {
    clientEmail: process.env.clientEmail,
    privateKey: process.env.privateKey,
    projectId: process.env.projectId,
  };

  global.config = config;

  global.getDataSource = global.getSchema = () => {
    const db = new DataSource(require('../', config));

    db.log = (log) => {
      console.log(log);
    };

    return db;
  };
} catch (error) {
  console.error('Init test error: ', error);
}
