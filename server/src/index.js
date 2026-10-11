require("dotenv").config();

const app = require("./app");
const { initializeDatabase, pool } = require("./database/database");
const { port } = require("./config/config");

async function start() {
    await initializeDatabase();
    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    const shutdown = () => {
        server.close(async () => {
            await pool.end();
            process.exit(0);
        });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
}

start().catch(async (error) => {
    console.error("Failed to start the API:", error.message);
    await pool.end();
    process.exitCode = 1;
});