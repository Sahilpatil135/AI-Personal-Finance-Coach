const assert = require("node:assert/strict");
const { test } = require("node:test");
const { goalCreate, goalUpdate } = require("../src/schemas/validation");
const { calculateGoalProgress } = require("../src/services/goal_service");

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
    assert.equal(result.days_remaining, 57);
    assert.equal(result.on_track, false);
    assert.equal(result.linked_investments[2].current_value, null);
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
