const { pool } = require("../database/database");
const { HttpError } = require("../middleware/errors");
const { today, isoDate } = require("../utils/dates");

const goalColumns = [
    "id",
    "user_id",
    "goal_name",
    "category",
    "description",
    "target_amount",
    "current_saved",
    "start_date",
    "deadline",
    "priority",
    "status",
    "created_at",
    "updated_at",
];

const investmentColumns = [
    "id",
    "goal_id",
    "type",
    "title",
    "initial_amount",
    "contribution_amount",
    "contribution_frequency",
    "current_value",
    "valuation_date",
    "valuation_method",
    "start_date",
    "maturity_date",
    "status",
];

function money(value) {
    return Number(Number(value).toFixed(2));
}

function calculateGoalProgress(goal, investments, currentDate = isoDate(today())) {
    const targetAmount = Number(goal.target_amount);
    const cashAllocated = Number(goal.current_saved);
    const linkedInvestments = investments.map((investment) => {
        const currentValue = investment.current_value == null
            ? null
            : Number(investment.current_value);
        const initialAmount = Number(investment.initial_amount || 0);
        return {
            ...investment,
            id: Number(investment.id),
            current_value: currentValue,
            initial_amount: initialAmount,
            contribution_amount: investment.contribution_amount == null
                ? null
                : Number(investment.contribution_amount),
            valuation_date: investment.valuation_date == null
                ? null
                : String(investment.valuation_date).slice(0, 10),
            start_date: investment.start_date == null
                ? null
                : String(investment.start_date).slice(0, 10),
            maturity_date: investment.maturity_date == null
                ? null
                : String(investment.maturity_date).slice(0, 10),
            valuation_source: investment.valuation_method === "ESTIMATED"
                ? "ESTIMATED"
                : "USER_REPORTED",
        };
    });

    const linkedInvestmentValue = linkedInvestments.reduce(
        (total, investment) => total + (investment.current_value ?? 0),
        0,
    );
    const unvaluedInvestmentContributions = linkedInvestments.reduce(
        (total, investment) => total + (
            investment.current_value == null ? investment.initial_amount : 0
        ),
        0,
    );
    const totalGoalFunds = cashAllocated + linkedInvestmentValue;
    const deadline = String(goal.deadline).slice(0, 10);
    const daysRemaining = Math.floor(
        (Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${currentDate}T00:00:00Z`))
        / 86_400_000,
    );
    const valuationDates = linkedInvestments
        .filter((investment) => investment.current_value != null && investment.valuation_date)
        .map((investment) => investment.valuation_date)
        .sort();
    const completionPercentage = Math.min(
        (totalGoalFunds / targetAmount) * 100,
        100,
    );
    const calculatedStatus = goal.status === "CANCELLED"
        ? "CANCELLED"
        : totalGoalFunds >= targetAmount
            ? "COMPLETED"
            : "IN_PROGRESS";

    return {
        ...goal,
        id: Number(goal.id),
        target_amount: money(targetAmount),
        current_saved: money(cashAllocated),
        cash_allocated: money(cashAllocated),
        cash_allocation_source: "USER_REPORTED",
        linked_investment_value: money(linkedInvestmentValue),
        unvalued_investment_contributions: money(unvaluedInvestmentContributions),
        total_goal_funds: money(totalGoalFunds),
        remaining_amount: money(Math.max(targetAmount - totalGoalFunds, 0)),
        required_monthly_savings: daysRemaining < 0
            ? null
            : money(
                Math.max(targetAmount - totalGoalFunds, 0)
                / Math.max(1, Math.ceil(daysRemaining / 30.4375)),
            ),
        completion_percentage: Number(completionPercentage.toFixed(2)),
        valuation_date: valuationDates.length ? valuationDates.at(-1) : null,
        days_remaining: daysRemaining,
        on_track: (() => {
            if (calculatedStatus === "CANCELLED") return false;
            if (calculatedStatus === "COMPLETED") return true;
            if (daysRemaining < 0) return false;
            const startDate = String(goal.start_date).slice(0, 10);
            if (currentDate <= startDate) return true;
            const totalDays = (
                Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)
            ) / 86_400_000;
            const elapsedDays = (
                Date.parse(`${currentDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)
            ) / 86_400_000;
            const expectedProgress = totalDays > 0
                ? (elapsedDays / totalDays) * 100
                : 100;
            return completionPercentage >= expectedProgress;
        })(),
        status: calculatedStatus,
        linked_investments: linkedInvestments,
    };
}

async function getGoalsForUser(userId) {
    const { rows: goals } = await pool.query(
        `SELECT ${goalColumns.join(", ")} FROM goals
         WHERE user_id = $1 ORDER BY deadline, id`,
        [userId],
    );
    if (!goals.length) return [];

    const goalIds = goals.map((goal) => Number(goal.id));
    const { rows: investments } = await pool.query(
        `SELECT ${investmentColumns.map((column) => `i.${column}`).join(", ")}
         FROM investments i
         INNER JOIN goals g ON g.id = i.goal_id AND g.user_id = $1
         WHERE i.user_id = $1 AND i.goal_id = ANY($2::int[])
         ORDER BY i.title, i.id`,
        [userId, goalIds],
    );
    const investmentsByGoal = new Map(goalIds.map((id) => [id, []]));
    for (const investment of investments) {
        investmentsByGoal.get(Number(investment.goal_id)).push(investment);
    }

    return goals.map((goal) => calculateGoalProgress(
        goal,
        investmentsByGoal.get(Number(goal.id)),
    ));
}

async function getGoals(userId) {
    return getGoalsForUser(userId);
}

async function getGoal(goalId, userId) {
    const { rows } = await pool.query(
        `SELECT ${goalColumns.join(", ")} FROM goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId],
    );
    if (!rows[0]) throw new HttpError(404, "Goal not found");
    const { rows: investments } = await pool.query(
        `SELECT ${investmentColumns.join(", ")} FROM investments
         WHERE goal_id = $1 AND user_id = $2 ORDER BY title, id`,
        [goalId, userId],
    );
    return calculateGoalProgress(rows[0], investments);
}

async function getGoalSummary(userId) {
    const goals = await getGoalsForUser(userId);
    return {
        total_goals: goals.length,
        active_goals: goals.filter((goal) => goal.status === "IN_PROGRESS").length,
        completed_goals: goals.filter((goal) => goal.status === "COMPLETED").length,
        total_target_amount: money(goals.reduce((total, goal) => total + goal.target_amount, 0)),
        total_cash_allocated: money(goals.reduce((total, goal) => total + goal.cash_allocated, 0)),
        total_linked_investment_value: money(goals.reduce((total, goal) => total + goal.linked_investment_value, 0)),
    };
}

async function createGoal(data, userId) {
    const fields = [
        "user_id",
        "goal_name",
        "category",
        "description",
        "target_amount",
        "current_saved",
        "start_date",
        "deadline",
        "priority",
        "status",
    ];
    const values = [
        userId,
        data.goal_name,
        data.category,
        data.description ?? null,
        data.target_amount,
        data.current_saved,
        data.start_date,
        data.deadline,
        data.priority,
        data.status,
    ];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const { rows } = await pool.query(
        `INSERT INTO goals (${fields.join(", ")}) VALUES (${placeholders.join(", ")})
         RETURNING ${goalColumns.join(", ")}`,
        values,
    );
    return getGoal(Number(rows[0].id), userId);
}

async function updateGoal(goalId, userId, data) {
    const existing = await getGoal(goalId, userId);
    const startDate = data.start_date ?? String(existing.start_date).slice(0, 10);
    const deadline = data.deadline ?? String(existing.deadline).slice(0, 10);
    if (deadline < startDate) {
        throw new HttpError(422, "deadline cannot be before start_date");
    }

    const editableColumns = [
        "goal_name",
        "category",
        "description",
        "target_amount",
        "current_saved",
        "start_date",
        "deadline",
        "priority",
        "status",
    ];
    const entries = Object.entries(data).filter(([key]) => editableColumns.includes(key));
    if (!entries.length) return existing;
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(goalId, userId);
    const { rows } = await pool.query(
        `UPDATE goals SET ${assignments.join(", ")}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING id`,
        values,
    );
    if (!rows[0]) throw new HttpError(404, "Goal not found");
    return getGoal(goalId, userId);
}

async function deleteGoal(goalId, userId) {
    const { rowCount } = await pool.query(
        "DELETE FROM goals WHERE id = $1 AND user_id = $2",
        [goalId, userId],
    );
    if (!rowCount) throw new HttpError(404, "Goal not found");
}

module.exports = {
    calculateGoalProgress,
    getGoals,
    getGoal,
    getGoalSummary,
    createGoal,
    updateGoal,
    deleteGoal,
};
