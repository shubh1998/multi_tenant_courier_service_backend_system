const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../connection');

const db = {};
const basename = path.basename(__filename);

// Auto-load every model file in this directory (excluding index.js itself)
fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.slice(-3) === '.js' && file.indexOf('.') !== 0)
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Wire up associations after all models are registered
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

const syncModels = async (options = {}) => {
  await sequelize.sync(options);
};

module.exports = {
  sequelize,
  Sequelize,
  syncModels,
  ...db,
};
