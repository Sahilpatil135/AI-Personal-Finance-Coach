const { pool } = require("../database/database");
const { HttpError } = require("../middleware/errors");
const { today, isoDate, dateKey } = require("../utils/dates");

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

function addMonths(date, months) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + months;
    const day = date.getUTCDate();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function monthsRemaining(startDate, deadline) {
    const start = new Date(`${dateKey(startDate)}T00:00:00Z`);
    const end = new Date(`${dateKey(deadline)}T00:00:00Z`);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
    ) {
        return 0;
    }

    let wholeMonths =
        (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (end.getUTCMonth() - start.getUTCMonth());

    let anchor = addMonths(start, wholeMonths);

    if (anchor > end) {
        wholeMonths--;
        anchor = addMonths(start, wholeMonths);
    }

    const nextMonth = addMonths(start, wholeMonths + 1);

    const partialMonth =
        (end.getTime() - anchor.getTime()) /
        (nextMonth.getTime() - anchor.getTime());

    return wholeMonths + partialMonth;
}

function calculateGoalProgress(
    goal,
    investments,
    currentDate = isoDate(today()),
    monthlySurplus = 0,
) {
    currentDate = dateKey(currentDate);
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
            completed_contribution_total: Number(investment.completed_contribution_total || 0),
            valuation_date: investment.valuation_date == null
                ? null
                : dateKey(investment.valuation_date),
            start_date: investment.start_date == null
                ? null
                : dateKey(investment.start_date),
            maturity_date: investment.maturity_date == null
                ? null
                : dateKey(investment.maturity_date),
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
    const startDate = dateKey(goal.start_date);
    const deadline = dateKey(goal.deadline);
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
            : goal.status === "COMPLETED"
                ? "COMPLETED"
                : "IN_PROGRESS";
    const remainingAmount = Math.max(targetAmount - totalGoalFunds, 0);
    const remainingMonths = monthsRemaining(currentDate, deadline);

    const requiredMonthlySavings =
        remainingMonths > 0
            ? remainingAmount / remainingMonths
            : daysRemaining === 0
                ? remainingAmount
                : null;
    const monthlyShortfall = requiredMonthlySavings == null
        ? null
        : Math.max(requiredMonthlySavings - monthlySurplus, 0);
    let progressStatus = null;
    if (calculatedStatus === "IN_PROGRESS") {
        if (daysRemaining < 0) {
            progressStatus = "OVERDUE";
        } else if (requiredMonthlySavings > monthlySurplus) {
            progressStatus = "AT_RISK";
        } else {
            const totalDays = (
                Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)
            ) / 86_400_000;
            const elapsedDays = (
                Date.parse(`${currentDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)
            ) / 86_400_000;
            const expectedProgress = totalDays > 0
                ? (elapsedDays / totalDays) * 100
                : 100;
            progressStatus = completionPercentage < expectedProgress
                ? "NEEDS_ATTENTION"
                : "ON_TRACK";
        }
    }

    return {
        ...goal,
        start_date: startDate,
        deadline,
        id: Number(goal.id),
        target_amount: money(targetAmount),
        current_saved: money(cashAllocated),
        cash_allocated: money(cashAllocated),
        cash_allocation_source: "USER_REPORTED",
        linked_investment_value: money(linkedInvestmentValue),
        unvalued_investment_contributions: money(unvaluedInvestmentContributions),
        total_goal_funds: money(totalGoalFunds),
        completed_contribution_total: money(linkedInvestments.reduce(
            (total, investment) => total + investment.completed_contribution_total,
            0,
        )),
        remaining_amount: money(remainingAmount),
        remaining_months: money(remainingMonths),
        required_monthly_savings: requiredMonthlySavings == null
            ? null
            : money(requiredMonthlySavings),
        available_monthly_surplus: money(monthlySurplus),
        monthly_shortfall: monthlyShortfall == null ? null : money(monthlyShortfall),
        completion_percentage: Number(completionPercentage.toFixed(2)),
        valuation_date: valuationDates.length ? valuationDates.at(-1) : null,
        days_remaining: daysRemaining,
        progress_status: progressStatus,
        on_track: progressStatus === "ON_TRACK" || calculatedStatus === "COMPLETED",
        lifecycle_status: calculatedStatus,
        status: calculatedStatus,
        linked_investments: linkedInvestments,
    };
}

async function getMonthlySurplus(userId, currentDate = isoDate(today())) {
    const { rows } = await pool.query(
        `SELECT
            COALESCE((SELECT SUM(amount) FROM income
                WHERE user_id = $1 AND date >= date_trunc('month', $2::date)::date
                    AND date <= $2::date), 0) AS monthly_income,
            COALESCE((SELECT SUM(amount) FROM expenses
                WHERE user_id = $1 AND date >= date_trunc('month', $2::date)::date
                    AND date <= $2::date), 0) AS monthly_expenses,
            COALESCE((SELECT SUM(c.amount)
                FROM investment_contributions c
                JOIN investments i ON i.id = c.investment_id
                WHERE i.user_id = $1 AND c.status = 'COMPLETED'
                    AND c.already_recorded_as_expense = FALSE
                    AND c.contribution_date >= date_trunc('month', $2::date)::date
                    AND c.contribution_date <= $2::date), 0) AS monthly_contributions`,
        [userId, currentDate],
    );
    const row = rows[0];
    const monthlyIncome = Number(row.monthly_income);
    const monthlyExpenses = Number(row.monthly_expenses);
    const monthlyContributions = Number(row.monthly_contributions);
    return {
        monthly_income: money(monthlyIncome),
        monthly_expenses: money(monthlyExpenses),
        completed_monthly_contributions: money(monthlyContributions),
        available_monthly_surplus: money(monthlyIncome - monthlyExpenses - monthlyContributions),
    };
}

async function syncCompletedGoals(userId, goalId = null) {
    await pool.query(
        `UPDATE goals g SET status = 'COMPLETED', updated_at = NOW()
         WHERE g.user_id = $1 AND g.status = 'IN_PROGRESS'
            AND ($2::int IS NULL OR g.id = $2)
            AND g.current_saved + COALESCE((
                SELECT SUM(i.current_value)
                FROM investments i
                WHERE i.goal_id = g.id AND i.user_id = g.user_id
                    AND i.current_value IS NOT NULL
            ), 0) >= g.target_amount`,
        [userId, goalId],
    );
}

async function getGoalsForUser(userId) {
    await syncCompletedGoals(userId);
    const { rows: goals } = await pool.query(
        `SELECT ${goalColumns.join(", ")} FROM goals
         WHERE user_id = $1 ORDER BY deadline, id`,
        [userId],
    );
    if (!goals.length) return [];

    const goalIds = goals.map((goal) => Number(goal.id));
    const { rows: investments } = await pool.query(
        `SELECT ${investmentColumns.map((column) => `i.${column}`).join(", ")},
                COALESCE(c.completed_contribution_total, 0) AS completed_contribution_total
         FROM investments i
         INNER JOIN goals g ON g.id = i.goal_id AND g.user_id = $1
         LEFT JOIN (
            SELECT investment_id, SUM(amount) AS completed_contribution_total
            FROM investment_contributions
            WHERE status = 'COMPLETED'
            GROUP BY investment_id
         ) c ON c.investment_id = i.id
         WHERE i.user_id = $1 AND i.goal_id = ANY($2::int[])
         ORDER BY i.title, i.id`,
        [userId, goalIds],
    );
    const investmentsByGoal = new Map(goalIds.map((id) => [id, []]));
    for (const investment of investments) {
        investmentsByGoal.get(Number(investment.goal_id)).push(investment);
    }

    const surplus = await getMonthlySurplus(userId);
    return goals.map((goal) => ({
        ...calculateGoalProgress(
            goal,
            investmentsByGoal.get(Number(goal.id)),
            isoDate(today()),
            surplus.available_monthly_surplus,
        ),
        ...surplus,
    }));
}

async function getGoals(userId) {
    return getGoalsForUser(userId);
}

async function getGoal(goalId, userId) {
    await syncCompletedGoals(userId, goalId);
    const { rows } = await pool.query(
        `SELECT ${goalColumns.join(", ")} FROM goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId],
    );
    if (!rows[0]) throw new HttpError(404, "Goal not found");
    const { rows: investments } = await pool.query(
        `SELECT ${investmentColumns.map((column) => `i.${column}`).join(", ")},
                COALESCE(c.completed_contribution_total, 0) AS completed_contribution_total
         FROM investments i
         LEFT JOIN (
            SELECT investment_id, SUM(amount) AS completed_contribution_total
            FROM investment_contributions
            WHERE status = 'COMPLETED'
            GROUP BY investment_id
         ) c ON c.investment_id = i.id
         WHERE goal_id = $1 AND user_id = $2 ORDER BY title, id`,
        [goalId, userId],
    );
    const surplus = await getMonthlySurplus(userId);
    return {
        ...calculateGoalProgress(
            rows[0],
            investments,
            isoDate(today()),
            surplus.available_monthly_surplus,
        ),
        ...surplus,
    };
}

function calculateGoalSummary(goals) {
    const totalTargetAmount = goals.reduce((total, goal) => total + goal.target_amount, 0);
    const totalAccumulatedFunds = goals.reduce((total, goal) => total + goal.total_goal_funds, 0);
    return {
        total_goals: goals.length,
        risky_goals: goals.filter((goal) => goal.progress_status === "AT_RISK").length,
        active_goals: goals.filter((goal) => goal.status === "IN_PROGRESS").length,
        completed_goals: goals.filter((goal) => goal.status === "COMPLETED").length,
        total_target_amount: money(totalTargetAmount),
        total_cash_allocated: money(goals.reduce((total, goal) => total + goal.cash_allocated, 0)),
        total_linked_investment_value: money(goals.reduce((total, goal) => total + goal.linked_investment_value, 0)),
        total_accumulated_funds: money(totalAccumulatedFunds),
        remaining_amount: money(goals.reduce((total, goal) => total + goal.remaining_amount, 0)),
        overall_goal_progress: totalTargetAmount > 0
            ? Number(((totalAccumulatedFunds / totalTargetAmount) * 100).toFixed(2))
            : 0,
    };
}

async function getGoalSummary(userId) {
    const goals = await getGoalsForUser(userId);
    return calculateGoalSummary(goals);
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
    calculateGoalSummary,
    getGoals,
    getGoal,
    getGoalSummary,
    createGoal,
    updateGoal,
    deleteGoal,
};
