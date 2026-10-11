const { Pool } = require("pg");
const { runMigrations } = require("./migrations");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error.message);
});

async function initializeDatabase() {
    await runMigrations(pool);
}

module.exports = { pool, initializeDatabase };
