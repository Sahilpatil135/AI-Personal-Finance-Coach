const assert = require("node:assert/strict");
const { test } = require("node:test");
const { pool } = require("../src/database/database");
const investmentService = require("../src/services/investment_service");
const { isoDate, today } = require("../src/utils/dates");

test("paginated investments include completed contribution totals", async () => {
    const originalQuery = pool.query;
    pool.query = async (query) => {
        if (query.includes("COUNT(*)::int AS total")) {
            return { rows: [{ total: 1 }] };
        }
        if (query.includes("FROM investments i")) {
            assert.match(query, /already_recorded_as_expense = FALSE/);
            return {
                rows: [{
                    id: 7,
                    user_id: 3,
                    goal_id: null,
                    type: "RD",
                    initial_amount: "0.00",
                    contribution_amount: "1000.00",
                    contribution_frequency: "MONTHLY",
                    contribution_day: 5,
                    contribution_month: null,
                    term: 12,
                    start_date: "2026-01-01",
                    maturity_date: null,
                    maturity_value: null,
                    current_value: null,
                    valuation_date: null,
                    valuation_method: "MANUAL",
                    status: "ACTIVE",
                    created_at: "2026-01-01T00:00:00.000Z",
                    updated_at: "2026-01-01T00:00:00.000Z",
                    completed_contribution_total: "3000.50",
                    account_balance_contribution_total: "2500.50",
                }],
            };
        }
        if (query.includes("FROM investment_withdrawals")) {
            return { rows: [] };
        }
        throw new Error(`Unexpected query: ${query}`);
    };

    try {
        const result = await investmentService.getPaginatedInvestments(3, 0, 10);
        assert.equal(result.records[0].completed_contribution_total, 3000.5);
        assert.equal(result.records[0].account_balance_contribution_total, 2500.5);
    } finally {
        pool.query = originalQuery;
    }
});

test("upcoming contributions can be marked paid when PostgreSQL returns DATE values as Dates", async () => {
    const originalQuery = pool.query;
    const originalConnect = pool.connect;
    const investment = {
        id: 8,
        user_id: 3,
        type: "RD",
        title: "Monthly deposit",
        status: "ACTIVE",
        start_date: new Date(2020, 0, 1),
        contribution_amount: "1000.00",
        contribution_frequency: "MONTHLY",
        contribution_day: 1,
        contribution_month: null,
    };
    let updatedInvestment = false;
    let committed = false;
    let released = false;
    pool.query = async (query, values) => {
        if (query.includes("WHERE user_id = $1 AND status = 'ACTIVE' AND contribution_amount IS NOT NULL")) {
            return { rows: [investment] };
        }
        if (query.includes("SELECT investment_id, scheduled_date FROM investment_contributions")) {
            return { rows: [] };
        }
        if (query.includes("FROM investments WHERE id = $1 AND user_id = $2")) {
            return { rows: [investment] };
        }
        throw new Error(`Unexpected query: ${query}`);
    };
    pool.connect = async () => ({
        query: async (query, values) => {
            if (query === "BEGIN") return {};
            if (query === "COMMIT") {
                committed = true;
                return {};
            }
            if (query === "ROLLBACK") return {};
            if (query.includes("INSERT INTO investment_contributions")) {
                return {
                    rows: [{
                        id: 1,
                        investment_id: 8,
                        amount: values[1],
                        scheduled_date: values[2],
                        contribution_date: values[3],
                        status: "COMPLETED",
                        already_recorded_as_expense: values[4],
                        notes: values[5],
                        created_at: new Date(),
                    }],
                };
            }
            if (query.includes("UPDATE investments")) {
                assert.match(query, /current_value = COALESCE\(current_value, 0\) \+ \$1/);
                assert.match(query, /valuation_method = 'ESTIMATED'/);
                assert.deepEqual(values, [1000, 8, 3]);
                updatedInvestment = true;
                return { rowCount: 1 };
            }
            throw new Error(`Unexpected transaction query: ${query}`);
        },
        release: () => {
            released = true;
        },
    });

    try {
        const [upcoming] = await investmentService.getUpcomingContributions(3, 30);
        assert.ok(upcoming);
        const result = await investmentService.createContribution(8, 3, {
            amount: 1000,
            scheduled_date: upcoming.next_contribution_date,
            contribution_date: isoDate(today()),
            already_recorded_as_expense: false,
        });
        assert.equal(result.amount, 1000);
        assert.equal(updatedInvestment, true);
        assert.equal(committed, true);
        assert.equal(released, true);
    } finally {
        pool.query = originalQuery;
        pool.connect = originalConnect;
    }
});
