const fs = require("node:fs");
const path = require("node:path");

const migrationsDirectory = path.join(__dirname, "migrations");
const migrationLockId = 814729361;

async function runMigrations(pool) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [migrationLockId]);
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name VARCHAR PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const { rows } = await client.query("SELECT name FROM schema_migrations");
        const appliedMigrations = new Set(rows.map(row => row.name));
        const migrationFiles = fs.readdirSync(migrationsDirectory)
            .filter(file => /^\d+_.+\.sql$/.test(file))
            .sort();

        for (const migrationFile of migrationFiles) {
            if (appliedMigrations.has(migrationFile)) {
                continue;
            }

            const migrationSql = fs.readFileSync(
                path.join(migrationsDirectory, migrationFile),
                "utf8"
            );
            await client.query(migrationSql);
            await client.query(
                "INSERT INTO schema_migrations (name) VALUES ($1)",
                [migrationFile]
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { runMigrations };
