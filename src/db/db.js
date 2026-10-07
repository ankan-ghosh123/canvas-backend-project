const { Pool } = require("pg");
const pool = new Pool({

    host: "localhost",
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.DATABASE
});
async function connectPG() {
    try {

        const clint = await pool.connect()
        console.log("database connect successfully....")
        clint.release()
    }
    catch (err) {
        console.log("database connection errror:", err)
    }
}

module.exports = { connectPG, pool };