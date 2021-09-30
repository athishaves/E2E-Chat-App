// MySQL database

const mysql = require('mysql')


const con = mysql.createPool({
    connectionLimit: 10, // default = 10
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DATABASE,
    port: process.env.DATABASE_PORT
})

module.exports = con