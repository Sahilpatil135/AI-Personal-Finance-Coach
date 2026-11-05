const assert = require("node:assert/strict");
const { test } = require("node:test");
const { runMigrations } = require("../src/database/migrations");

function createMigrationPool({ failOnSql } = {}) {
    const queries = [];
    const client = {
        async query(sql, parameters) {
            queries.push({ sql, parameters });
            if (failOnSql && sql.includes(failOnSql)) {
                throw new Error("Migration failed");
            }
            if (sql.includes("SELECT name FROM schema_migrations")) {
                return { rows: [] };
            }
            return { rows: [] };
        },
        release() {
            queries.push({ sql: "RELEASE" });
        }
    };

    return {
        queries,
        pool: {
            async connect() {
                return client;
            }
        }
    };
}

test("runs and records pending SQL migrations", async () => {
    const { pool, queries } = createMigrationPool();

    await runMigrations(pool);

    const migrationSql = queries.find(query => query.sql.includes("CREATE TABLE IF NOT EXISTS public.users"));
    assert.ok(migrationSql);
    assert.ok(migrationSql.sql.includes("CREATE TABLE IF NOT EXISTS public.investment_withdrawals"));
    assert.ok(queries.some(query =>
        query.sql === "INSERT INTO schema_migrations (name) VALUES ($1)" &&
        query.parameters[0] === "001_initial_schema.sql"
    ));
    assert.ok(queries.some(query =>
        query.sql === "INSERT INTO schema_migrations (name) VALUES ($1)" &&
        query.parameters[0] === "002_goal_and_investment_valuation.sql"
    ));
    assert.ok(queries.some(query =>
        query.sql.includes("ADD COLUMN IF NOT EXISTS current_value NUMERIC(12, 2)") &&
        query.sql.includes("ADD COLUMN IF NOT EXISTS valuation_date DATE")
    ));
    assert.equal(queries.at(-2).sql, "COMMIT");
    assert.equal(queries.at(-1).sql, "RELEASE");
});

test("rolls back a failed migration and releases the client", async () => {
    const { pool, queries } = createMigrationPool({ failOnSql: "CREATE TABLE IF NOT EXISTS public.users" });

    await assert.rejects(runMigrations(pool), /Migration failed/);

    assert.ok(queries.some(query => query.sql === "ROLLBACK"));
    assert.equal(queries.at(-1).sql, "RELEASE");
});
