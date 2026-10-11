const assert = require("node:assert/strict");
const { test } = require("node:test");
const { pool } = require("../src/database/database");
const incomeService = require("../src/services/income_service");
const expenseService = require("../src/services/expense_service");
const { today } = require("../src/utils/dates");

test("income monthly trends include database DATE values", async () => {
    const now = today();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const originalQuery = pool.query;
    pool.query = async () => ({
        rows: [{ month: currentMonth, amount: "1250.50" }]
    });

    try {
        const trends = await incomeService.getMonthlyTrends(1, 1);
        assert.equal(trends.length, 1);
        assert.equal(trends[0].amount, 1250.5);
    } finally {
        pool.query = originalQuery;
    }
});

test("expense monthly trends include database DATE values", async () => {
    const now = today();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const originalQuery = pool.query;
    pool.query = async () => ({
        rows: [{ month: currentMonth, amount: "875.25" }]
    });

    try {
        const trends = await expenseService.getMonthlyExpenseTrends(1, 1);
        assert.equal(trends.length, 1);
        assert.equal(trends[0].amount, 875.25);
    } finally {
        pool.query = originalQuery;
    }
});

test("expense daily trends include database DATE values", async () => {
    const now = today();
    const originalQuery = pool.query;
    pool.query = async () => ({
        rows: [{ date: now, amount: "42.75" }]
    });

    try {
        const trends = await expenseService.getExpenseTrends(1, "month");
        assert.equal(trends[now.getDate() - 1].amount, 42.75);
    } finally {
        pool.query = originalQuery;
    }
});

test("income source distribution returns numeric values and percentages", async () => {
    const originalQuery = pool.query;
    pool.query = async () => ({
        rows: [
            { source: "Scholarship", amount: "900" },
            { source: "Part-time job", amount: "600" }
        ]
    });

    try {
        assert.deepEqual(await incomeService.getSourceDistribution(1), [
            { source: "Scholarship", amount: 900, percentage: 60 },
            { source: "Part-time job", amount: 600, percentage: 40 }
        ]);
    } finally {
        pool.query = originalQuery;
    }
});
