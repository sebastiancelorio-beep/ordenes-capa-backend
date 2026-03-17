const { Sequelize } = require('sequelize');

// Configuración de conexión usando variables de entorno
const bdmysqlOrdenes = new Sequelize(
    process.env.DB_NAME || 'db_ordenes',
    process.env.DB_USER || 'ordenes_user',
    process.env.DB_PASSWORD || 'Ordenes2025!',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'production' ? false : console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

module.exports = {
    bdmysqlOrdenes
};
