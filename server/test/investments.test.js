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

test("partial withdrawals reduce investment value without closing the investment", async () => {
    const originalConnect = pool.connect;
    let updateValues;
    let committed = false;
    const investment = {
        id: 8,
        user_id: 3,
        type: "FD",
        title: "Fixed deposit",
        initial_amount: "1000.00",
        current_value: "1100.00",
        start_date: "2025-01-01",
        maturity_date: "2027-01-01",
        status: "ACTIVE",
    };
    pool.connect = async () => ({
        async query(query, values) {
            if (query === "BEGIN") return {};
            if (query === "COMMIT") {
                committed = true;
                return {};
            }
            if (query === "ROLLBACK") return {};
            if (query.includes("FROM investments") && query.includes("FOR UPDATE")) {
                return { rows: [investment] };
            }
            if (query.includes("INSERT INTO investment_withdrawals")) {
                assert.match(query, /actual_received_amount/);
                assert.deepEqual(values.slice(1, 5), [
                    "PARTIAL",
                    values[2],
                    250,
                    240,
                ]);
                return {
                    rows: [{
                        id: 12,
                        investment_id: 8,
                        transaction_type: "WITHDRAWAL",
                        withdrawal_type: values[1],
                        withdrawal_date: values[2],
                        withdrawal_amount: values[3],
                        actual_received_amount: values[4],
                        reason: values[5],
                        allocation_type: null,
                        goal_id: null,
                        new_investment_id: null,
                    }],
                };
            }
            if (query.includes("UPDATE investments SET current_value")) {
                updateValues = values;
                return { rowCount: 1 };
            }
            throw new Error(`Unexpected transaction query: ${query}`);
        },
        release() {},
    });

    try {
        const transaction = await investmentService.createWithdrawal(8, 3, {
            withdrawal_date: isoDate(today()),
            withdrawal_type: "PARTIAL",
            withdrawal_amount: 250,
            actual_received_amount: 240,
        });
        assert.equal(transaction.withdrawal_amount, 250);
        assert.equal(transaction.actual_received_amount, 240);
        assert.deepEqual(updateValues, [850, isoDate(today()), "ACTIVE", 8, 3]);
        assert.equal(committed, true);
    } finally {
        pool.connect = originalConnect;
    }
});

test("full withdrawals must remove the entire current value", async () => {
    const originalConnect = pool.connect;
    const queries = [];
    pool.connect = async () => ({
        async query(query) {
            queries.push(query);
            if (query === "BEGIN" || query === "ROLLBACK") return {};
            if (query.includes("FROM investments") && query.includes("FOR UPDATE")) {
                return {
                    rows: [{
                        id: 8,
                        user_id: 3,
                        type: "FD",
                        current_value: "1100.00",
                        initial_amount: "1000.00",
                        start_date: "2025-01-01",
                        status: "ACTIVE",
                    }],
                };
            }
            throw new Error(`Unexpected transaction query: ${query}`);
        },
        release() {},
    });

    try {
        await assert.rejects(investmentService.createWithdrawal(8, 3, {
            withdrawal_date: isoDate(today()),
            withdrawal_type: "FULL",
            withdrawal_amount: 1000,
            actual_received_amount: 990,
        }), /entire balance/);
        assert.ok(queries.includes("ROLLBACK"));
        assert.equal(queries.some((query) => query.includes("INSERT INTO investment_withdrawals")), false);
    } finally {
        pool.connect = originalConnect;
    }
});

test("confirmed maturity records actual proceeds and completes the investment", async () => {
    const originalConnect = pool.connect;
    let updateValues;
    const investment = {
        id: 8,
        user_id: 3,
        type: "RD",
        initial_amount: "500.00",
        current_value: "650.00",
        start_date: "2024-01-01",
        maturity_date: "2026-01-01",
        maturity_value: "700.00",
        status: "ACTIVE",
    };
    pool.connect = async () => ({
        async query(query, values) {
            if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") return {};
            if (query.includes("FROM investments") && query.includes("FOR UPDATE")) {
                return { rows: [investment] };
            }
            if (query.includes("INSERT INTO investment_withdrawals")) {
                assert.match(query, /'MATURITY'/);
                assert.deepEqual(values.slice(1, 4), [values[1], 650, 680]);
                return {
                    rows: [{
                        id: 13,
                        investment_id: 8,
                        transaction_type: "MATURITY",
                        withdrawal_type: null,
                        withdrawal_date: values[1],
                        withdrawal_amount: values[2],
                        actual_received_amount: values[3],
                        reason: values[4],
                        allocation_type: null,
                        goal_id: null,
                        new_investment_id: null,
                    }],
                };
            }
            if (query.includes("UPDATE investments SET current_value = 0")) {
                updateValues = values;
                return { rowCount: 1 };
            }
            throw new Error(`Unexpected transaction query: ${query}`);
        },
        release() {},
    });

    try {
        const transaction = await investmentService.createMaturity(8, 3, {
            withdrawal_date: isoDate(today()),
            actual_received_amount: 680,
        });
        assert.equal(transaction.withdrawal_amount, 650);
        assert.equal(transaction.actual_received_amount, 680);
        assert.deepEqual(updateValues, [isoDate(today()), 8, 3]);
    } finally {
        pool.connect = originalConnect;
    }
});

test("proceeds can only be allocated once", async () => {
    const originalConnect = pool.connect;
    const transaction = {
        id: 13,
        investment_id: 8,
        transaction_type: "WITHDRAWAL",
        withdrawal_date: isoDate(today()),
        withdrawal_amount: "100.00",
        actual_received_amount: "100.00",
        allocation_type: null,
        goal_id: null,
        new_investment_id: null,
    };
    let goalIncreaseCount = 0;
    pool.connect = async () => ({
        async query(query, values) {
            if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") return {};
            if (query.includes("FOR UPDATE OF w")) return { rows: [{ ...transaction }] };
            if (query.includes("SELECT id FROM goals")) return { rows: [{ id: 4 }] };
            if (query.includes("UPDATE goals SET current_saved")) {
                goalIncreaseCount += 1;
                return { rowCount: 1 };
            }
            if (query.includes("UPDATE investment_withdrawals")) {
                transaction.allocation_type = values[0];
                transaction.goal_id = values[1];
                return { rows: [{ ...transaction }] };
            }
            throw new Error(`Unexpected transaction query: ${query}`);
        },
        release() {},
    });

    try {
        const allocated = await investmentService.allocateWithdrawalProceeds(8, 13, 3, {
            allocation_type: "GOAL",
            goal_id: 4,
        });
        assert.equal(allocated.goal_id, 4);
        await assert.rejects(investmentService.allocateWithdrawalProceeds(8, 13, 3, {
            allocation_type: "GOAL",
            goal_id: 4,
        }), /already been allocated/);
        assert.equal(goalIncreaseCount, 1);
    } finally {
        pool.connect = originalConnect;
    }
});

test("maturity notifications include overdue supported investments", async () => {
    const originalQuery = pool.query;
    const dueInvestment = {
        id: 21,
        user_id: 3,
        goal_id: null,
        type: "FD",
        title: "Matured deposit",
        initial_amount: "1000.00",
        contribution_amount: null,
        contribution_frequency: null,
        contribution_day: null,
        contribution_month: null,
        term: null,
        start_date: "2024-01-01",
        maturity_date: "2025-01-01",
        maturity_value: "1100.00",
        current_value: "1050.00",
        valuation_date: "2024-12-01",
        valuation_method: "MANUAL",
        status: "ACTIVE",
        created_at: new Date(),
        updated_at: new Date(),
    };
    pool.query = async (query, values) => {
        if (query.includes("FROM investments") && query.includes("maturity_date <= $2")) {
            assert.equal(values[0], 3);
            assert.doesNotMatch(query, /maturity_date\s*>=/);
            assert.match(query, /UPPER\(type\) IN \('FD', 'RD'\)/);
            return { rows: [dueInvestment] };
        }
        if (query.includes("FROM investment_withdrawals")) return { rows: [] };
        throw new Error(`Unexpected query: ${query}`);
    };

    try {
        const [maturity] = await investmentService.getUpcomingMaturities(3, 30);
        assert.equal(maturity.id, 21);
        assert.equal(maturity.maturity_value, 1100);
        assert.ok(maturity.days_until_maturity < 0);
    } finally {
        pool.query = originalQuery;
    }
});

test("new-investment proceeds allocation creates a linked investment once", async () => {
    const originalConnect = pool.connect;
    const transaction = {
        id: 16,
        investment_id: 8,
        transaction_type: "WITHDRAWAL",
        withdrawal_date: isoDate(today()),
        withdrawal_amount: "400.00",
        actual_received_amount: "390.50",
        allocation_type: null,
        goal_id: null,
        new_investment_id: null,
    };
    let investmentValues;
    pool.connect = async () => ({
        async query(query, values) {
            if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") return {};
            if (query.includes("FOR UPDATE OF w")) return { rows: [{ ...transaction }] };
            if (query.includes("INSERT INTO investments")) {
                investmentValues = values;
                return { rows: [{ id: 31 }] };
            }
            if (query.includes("UPDATE investment_withdrawals")) {
                transaction.allocation_type = values[0];
                transaction.new_investment_id = values[2];
                return { rows: [{ ...transaction }] };
            }
            throw new Error(`Unexpected transaction query: ${query}`);
        },
        release() {},
    });

    try {
        const allocated = await investmentService.allocateWithdrawalProceeds(8, 16, 3, {
            allocation_type: "NEW_INVESTMENT",
            new_investment: {
                type: "FD",
                title: "Reinvested proceeds",
                maturity_date: "2027-01-01",
                maturity_value: 430,
            },
        });
        assert.deepEqual(investmentValues, [
            3,
            null,
            "FD",
            "Reinvested proceeds",
            "390.50",
            isoDate(today()),
            "2027-01-01",
            430,
        ]);
        assert.equal(allocated.allocation_type, "NEW_INVESTMENT");
        assert.equal(allocated.new_investment_id, 31);
    } finally {
        pool.connect = originalConnect;
    }
});
