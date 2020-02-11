require('dotenv').config();

module.exports = {

  development: {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    password: process.env.DB_PASS,
    dialect: 'postgres'
  },

  test: {
    database: 'deca-mart_test',
    username: 'postgres',
    password: 'modupeola1960',
    host: '127.0.0.1',
    dialect: 'postgres'
  },

  production: {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres'
  }
};
