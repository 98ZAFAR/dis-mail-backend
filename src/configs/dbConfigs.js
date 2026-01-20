const sequelize = require('sequelize');

const db = new sequelize.Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        ssl: process.env.NODE_ENV === 'production',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
    }
);


module.exports = db;