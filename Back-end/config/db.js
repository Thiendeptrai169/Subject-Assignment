const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// console.log(config);

//create a connection pool
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = {
    sql, pool, poolConnect
};
console.log('SERVER:', process.env.DB_SERVER);