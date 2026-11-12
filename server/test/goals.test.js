const assert = require("node:assert/strict");
const { test } = require("node:test");
const { goalCreate, goalUpdate } = require("../src/schemas/validation");
const { calculateGoalProgress, calculateGoalSummary } = require("../src/services/goal_service");

const goal = {
    id: 1,
    user_id: 3,
    goal_name: "Buy a Laptop",
    category: "Gadgets",
    description: null,
    target_amount: "70000.00",
    current_saved: "10000.00",
    start_date: "2026-01-01",
    deadline: "2027-01-01",
    priority: "HIGH",
    status: "IN_PROGRESS",
};

test("goal progress adds cash allocation and valued investments only", () => {
    const result = calculateGoalProgress(goal, [
        {
            id: 1,
            title: "Fixed Deposit",
            type: "FD",
            initial_amount: "15000.00",
            contribution_amount: null,
            current_value: "15500.00",
            valuation_date: "2026-10-01",
            valuation_method: "MANUAL",
            start_date: "2025-01-01",
            maturity_date: "2027-01-01",
            status: "ACTIVE",
        },
        {
            id: 2,
            title: "Mutual Fund",
            type: "MF",
            initial_amount: "18000.00",
            contribution_amount: "2000.00",
            current_value: "19200.00",
            valuation_date: "2026-11-01",
            valuation_method: "ESTIMATED",
        },
        {
            id: 3,
            title: "Unvalued investment",
            type: "RD",
            initial_amount: "8000.00",
            contribution_amount: "1000.00",
            current_value: null,
            valuation_date: null,
            valuation_method: "MANUAL",
        },
    ], "2026-11-05");

    assert.equal(result.target_amount, 70000);
    assert.equal(result.cash_allocated, 10000);
    assert.equal(result.cash_allocation_source, "USER_REPORTED");
    assert.equal(result.linked_investment_value, 34700);
    assert.equal(result.unvalued_investment_contributions, 8000);
    assert.equal(result.total_goal_funds, 44700);
    assert.equal(result.remaining_amount, 25300);
    assert.equal(result.completion_percentage, 63.86);
    assert.equal(result.valuation_date, "2026-11-01");
    assert.equal(result.remaining_months, 1.87);
    assert.equal(result.required_monthly_savings, 13522.41);
    assert.equal(result.days_remaining, 57);
    assert.equal(result.on_track, false);
    assert.equal(result.linked_investments[2].current_value, null);
    assert.equal(result.linked_investments[0].start_date, "2025-01-01");
    assert.equal(result.linked_investments[0].maturity_date, "2027-01-01");
    assert.equal(result.linked_investments[0].status, "ACTIVE");
});

test("goal progress uses month-end anniversaries and returns date-only fields", () => {
    const result = calculateGoalProgress(
        {
            ...goal,
            start_date: "2026-01-31T00:00:00.000Z",
            deadline: "2026-03-30T00:00:00.000Z",
            target_amount: "10000.00",
            current_saved: "0.00",
        },
        [{
            id: 1,
            initial_amount: "100.00",
            current_value: "100.00",
            valuation_date: "2026-02-28T00:00:00.000Z",
            start_date: "2026-01-31T00:00:00.000Z",
            maturity_date: "2026-03-30T00:00:00.000Z",
        }],
        "2026-01-31T00:00:00.000Z",
    );

    assert.equal(result.remaining_months, 1.97);
    assert.equal(result.required_monthly_savings, 5031.15);
    assert.equal(result.start_date, "2026-01-31");
    assert.equal(result.deadline, "2026-03-30");
    assert.equal(result.valuation_date, "2026-02-28");
    assert.equal(result.linked_investments[0].start_date, "2026-01-31");
    assert.equal(result.linked_investments[0].maturity_date, "2026-03-30");
});

test("goal progress is capped and remaining amount never becomes negative", () => {
    const result = calculateGoalProgress(
        { ...goal, target_amount: "100.00", current_saved: "120.00" },
        [],
        "2026-11-05",
    );

    assert.equal(result.total_goal_funds, 120);
    assert.equal(result.remaining_amount, 0);
    assert.equal(result.completion_percentage, 100);
    assert.equal(result.status, "COMPLETED");
});

test("goal summary aggregates accumulated funds, progress, and remaining amounts", () => {
    const summary = calculateGoalSummary([
        {
            status: "IN_PROGRESS",
            target_amount: 1000,
            cash_allocated: 200,
            linked_investment_value: 300,
            total_goal_funds: 500,
            remaining_amount: 500,
        },
        {
            status: "COMPLETED",
            target_amount: 500,
            cash_allocated: 100,
            linked_investment_value: 400,
            total_goal_funds: 500,
            remaining_amount: 0,
        },
    ]);

    assert.equal(summary.total_goals, 2);
    assert.equal(summary.active_goals, 1);
    assert.equal(summary.total_accumulated_funds, 1000);
    assert.equal(summary.remaining_amount, 500);
    assert.equal(summary.overall_goal_progress, 66.67);
});

test("goal inputs validate date order and do not accept client user identity", () => {
    const valid = goalCreate.safeParse({
        goal_name: "  Education  ",
        category: "Education",
        target_amount: 1000,
        start_date: "2026-11-05",
        deadline: "2027-11-05",
        priority: "MEDIUM",
        user_id: 999,
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.goal_name, "Education");
    assert.equal(Object.hasOwn(valid.data, "user_id"), false);
    assert.equal(valid.data.current_saved, 0);

    assert.equal(goalCreate.safeParse({
        goal_name: "Bad dates",
        category: "Other",
        target_amount: 100,
        start_date: "2027-01-01",
        deadline: "2026-01-01",
        priority: "LOW",
    }).success, false);

    assert.equal(goalUpdate.safeParse({ current_saved: -1 }).success, false);
});
