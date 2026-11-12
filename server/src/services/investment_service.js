const { pool } = require("../database/database");
const { HttpError } = require("../middleware/errors");
const { today, isoDate } = require("../utils/dates");

const investmentColumns = [
    "id",
    "user_id",
    "goal_id",
    "type",
    "title",
    "initial_amount",
    "contribution_amount",
    "contribution_frequency",
    "contribution_day",
    "contribution_month",
    "term",
    "start_date",
    "maturity_date",
    "maturity_value",
    "current_value",
    "valuation_date",
    "valuation_method",
    "status",
    "created_at",
    "updated_at",
];
const numericInvestmentFields = [
    "initial_amount",
    "contribution_amount",
    "maturity_value",
    "current_value",
];
const withdrawalColumns = [
    "id",
    "investment_id",
    "withdrawal_date",
    "withdrawal_amount",
    "reason",
    "created_at",
];

function serializeWithdrawal(row) {
    return {
        ...row,
        id: Number(row.id),
        investment_id: Number(row.investment_id),
        withdrawal_amount: Number(row.withdrawal_amount),
    };
}

function serializeInvestment(row, withdrawals = []) {
    const result = { ...row, id: Number(row.id), user_id: Number(row.user_id) };
    if (row.goal_id !== null) result.goal_id = Number(row.goal_id);
    for (const field of numericInvestmentFields) {
        result[field] = row[field] == null ? null : Number(row[field]);
    }
    for (const field of ["contribution_day", "contribution_month", "term"]) {
        result[field] = row[field] == null ? null : Number(row[field]);
    }
    result.withdrawals = withdrawals.map(serializeWithdrawal);
    return result;
}

function serializeContribution(row) {
    return {
        ...row,
        id: Number(row.id),
        investment_id: Number(row.investment_id),
        amount: Number(row.amount),
        already_recorded_as_expense: Boolean(row.already_recorded_as_expense),
    };
}

const contributionColumns = [
    "id",
    "investment_id",
    "amount",
    "scheduled_date",
    "contribution_date",
    "status",
    "already_recorded_as_expense",
    "notes",
    "created_at",
];

async function getWithdrawalsForInvestment(investmentId) {
    const { rows } = await pool.query(
        `SELECT ${withdrawalColumns.join(", ")} FROM investment_withdrawals
         WHERE investment_id = $1 ORDER BY withdrawal_date, id`,
        [investmentId],
    );
    return rows;
}

async function getInvestmentRow(investmentId, userId) {
    const { rows } = await pool.query(
        `SELECT ${investmentColumns.join(", ")} FROM investments WHERE id = $1 AND user_id = $2`,
        [investmentId, userId],
    );
    if (!rows[0]) throw new HttpError(404, "Investment not found");
    return rows[0];
}

async function investmentWithWithdrawals(row) {
    return serializeInvestment(row, await getWithdrawalsForInvestment(row.id));
}

async function validateGoal(goalId, userId) {
    if (goalId == null) return;
    const { rows } = await pool.query(
        "SELECT id FROM goals WHERE id = $1 AND user_id = $2",
        [goalId, userId],
    );
    if (!rows[0]) throw new HttpError(404, "Goal not found");
}

function validateDates(startDate, maturityDate) {
    if (maturityDate && maturityDate < startDate) {
        throw new HttpError(422, "maturity_date cannot be before start_date");
    }
}

function validateContributions(data) {
    const amount = data.contribution_amount;
    const frequency = data.contribution_frequency;
    const day = data.contribution_day;
    const month = data.contribution_month;
    const provided = [amount, frequency, day, month].some(
        (value) => value !== undefined && value !== null,
    );
    if (!provided) return;
    if (amount == null || frequency == null || day == null) {
        throw new HttpError(
            422,
            "Recurring contributions require amount, frequency, and contribution_day",
        );
    }
    if (frequency === "YEARLY" && month == null) {
        throw new HttpError(422, "YEARLY contributions require contribution_month");
    }
    if (frequency === "MONTHLY" && month != null) {
        throw new HttpError(
            422,
            "contribution_month is only valid for YEARLY contributions",
        );
    }
}

async function createInvestment(data, userId) {
    const startDate = data.start_date || isoDate(today());
    validateDates(startDate, data.maturity_date);
    validateContributions(data);
    await validateGoal(data.goal_id, userId);
    const fields = [
        "user_id",
        "type",
        "title",
        "initial_amount",
        "contribution_amount",
        "contribution_frequency",
        "contribution_day",
        "contribution_month",
        "term",
        "start_date",
        "maturity_date",
        "maturity_value",
        "current_value",
        "valuation_date",
        "valuation_method",
        "status",
        "goal_id",
    ];
    const values = [
        userId,
        data.type,
        data.title,
        data.initial_amount ?? 0,
        data.contribution_amount ?? null,
        data.contribution_frequency ?? null,
        data.contribution_day ?? null,
        data.contribution_month ?? null,
        data.term ?? null,
        startDate,
        data.maturity_date ?? null,
        data.maturity_value ?? null,
        data.current_value ?? null,
        data.valuation_date ?? null,
        data.valuation_method,
        data.status,
        data.goal_id ?? null,
    ];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const { rows } = await pool.query(
        `INSERT INTO investments (${fields.join(", ")}) VALUES (${placeholders.join(", ")})
         RETURNING ${investmentColumns.join(", ")}`,
        values,
    );
    return serializeInvestment(rows[0]);
}

async function getInvestment(investmentId, userId) {
    const investment = await investmentWithWithdrawals(
        await getInvestmentRow(investmentId, userId),
    );
    const { rows } = await pool.query(
        `SELECT ${contributionColumns.join(", ")} FROM investment_contributions
         WHERE investment_id = $1 ORDER BY contribution_date DESC, id DESC`,
        [investmentId],
    );
    investment.contributions = rows.map(serializeContribution);
    investment.completed_contribution_total = Number(rows.reduce(
        (total, contribution) => total + Number(contribution.amount),
        0,
    ).toFixed(2));
    return investment;
}

async function getPaginatedInvestments(
    userId,
    skip,
    limit,
    investmentType,
    investmentStatus,
    goalId,
) {
    const filters = ["user_id = $1"];
    const values = [userId];
    for (const [column, value] of [
        ["type", investmentType && investmentType.toUpperCase()],
        ["status", investmentStatus && investmentStatus.toUpperCase()],
        ["goal_id", goalId],
    ]) {
        if (value !== undefined && value !== null && value !== "") {
            values.push(value);
            filters.push(`${column} = $${values.length}`);
        }
    }
    const where = filters.join(" AND ");
    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM investments WHERE ${where}`,
        values,
    );
    values.push(skip, limit);
    const { rows } = await pool.query(
        `SELECT ${investmentColumns.join(", ")} FROM investments WHERE ${where}
         ORDER BY created_at DESC, id DESC OFFSET $${values.length - 1} LIMIT $${values.length}`,
        values,
    );
    const records = await Promise.all(rows.map(investmentWithWithdrawals));
    return { total: countResult.rows[0].total, skip, limit, records };
}

async function updateInvestment(investmentId, userId, data) {
    const existing = await getInvestmentRow(investmentId, userId);
    for (const key of [
        "type",
        "title",
        "initial_amount",
        "start_date",
        "status",
    ]) {
        if (Object.prototype.hasOwnProperty.call(data, key) && data[key] === null) {
            throw new HttpError(422, `${key} cannot be null`);
        }
    }
    const goalId = Object.prototype.hasOwnProperty.call(data, "goal_id")
        ? data.goal_id
        : existing.goal_id;
    await validateGoal(goalId, userId);
    validateDates(
        data.start_date ?? existing.start_date,
        data.maturity_date ?? existing.maturity_date,
    );
    validateContributions({
        contribution_amount:
            data.contribution_amount ?? existing.contribution_amount,
        contribution_frequency:
            data.contribution_frequency ?? existing.contribution_frequency,
        contribution_day: data.contribution_day ?? existing.contribution_day,
        contribution_month: data.contribution_month ?? existing.contribution_month,
    });

    const editableInvestmentColumns = [
        "goal_id",
        "type",
        "title",
        "initial_amount",
        "contribution_amount",
        "contribution_frequency",
        "contribution_day",
        "contribution_month",
        "term",
        "start_date",
        "maturity_date",
        "maturity_value",
        "current_value",
        "valuation_date",
        "valuation_method",
        "status",
    ];
    const allowed = editableInvestmentColumns;
    const entries = Object.entries(data).filter(([key]) => allowed.includes(key));
    if (!entries.length) return getInvestment(investmentId, userId);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(investmentId, userId);
    const { rows } = await pool.query(
        `UPDATE investments SET ${assignments.join(", ")}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING ${investmentColumns.join(", ")}`,
        values,
    );
    return investmentWithWithdrawals(rows[0]);
}

async function deleteInvestment(investmentId, userId) {
    await getInvestmentRow(investmentId, userId);
    await pool.query("DELETE FROM investments WHERE id = $1 AND user_id = $2", [
        investmentId,
        userId,
    ]);
}

async function getUpcomingMaturities(userId, days = 30) {
    const current = today();
    const until = new Date(current);
    until.setDate(until.getDate() + days);
    const { rows } = await pool.query(
        `SELECT ${investmentColumns.join(", ")} FROM investments
         WHERE user_id = $1 AND status = 'ACTIVE' AND maturity_date >= $2 AND maturity_date <= $3
         ORDER BY maturity_date ASC`,
        [userId, isoDate(current), isoDate(until)],
    );
    return Promise.all(rows.map(investmentWithWithdrawals));
}

function nextContributionDate(investment, todayDate, completedDates = new Set()) {
    const day = investment.contribution_day;
    if (day == null || !investment.contribution_frequency) return null;
    const start = new Date(`${investment.start_date}T00:00:00`);
    const eligible = start > todayDate ? start : todayDate;
    const clampDate = (year, month) =>
        new Date(
            year,
            month,
            Math.min(day, new Date(year, month + 1, 0).getDate()),
        );
    if (investment.contribution_frequency === "MONTHLY") {
        let year = eligible.getFullYear();
        let month = eligible.getMonth();
        while (true) {
            const scheduled = clampDate(year, month);
            if (scheduled >= eligible && !completedDates.has(isoDate(scheduled))) return scheduled;
            month += 1;
            if (month === 12) {
                year += 1;
                month = 0;
            }
        }
    }
    if (
        investment.contribution_frequency === "YEARLY" &&
        investment.contribution_month
    ) {
        let year = eligible.getFullYear();
        const month = investment.contribution_month - 1;
        let scheduled = clampDate(year, month);
        if (scheduled < eligible) scheduled = clampDate(++year, month);
        while (completedDates.has(isoDate(scheduled))) {
            scheduled = clampDate(++year, month);
        }
        return scheduled;
    }
    return null;
}

async function getUpcomingContributions(userId, days = 30) {
    const current = today();
    const end = new Date(current);
    end.setDate(end.getDate() + days);
    const { rows } = await pool.query(
        `SELECT id, type, title, contribution_amount, contribution_frequency, contribution_day,
                contribution_month, start_date FROM investments
         WHERE user_id = $1 AND status = 'ACTIVE' AND contribution_amount IS NOT NULL`,
        [userId],
    );
    const investmentIds = rows.map((row) => Number(row.id));
    const completedDates = new Map(investmentIds.map((id) => [id, new Set()]));
    if (investmentIds.length) {
        const { rows: completed } = await pool.query(
            `SELECT investment_id, scheduled_date FROM investment_contributions
             WHERE investment_id = ANY($1::int[]) AND status = 'COMPLETED'`,
            [investmentIds],
        );
        for (const contribution of completed) {
            completedDates.get(Number(contribution.investment_id))
                .add(String(contribution.scheduled_date).slice(0, 10));
        }
    }
    return rows
        .flatMap((row) => {
            const date = nextContributionDate(
                row,
                current,
                completedDates.get(Number(row.id)),
            );
            if (!date || date > end) return [];
            return [
                {
                    investment_id: Number(row.id),
                    investment_title: row.title,
                    investment_type: row.type,
                    contribution_amount: Number(row.contribution_amount),
                    contribution_frequency: row.contribution_frequency,
                    next_contribution_date: isoDate(date),
                },
            ];
        })
        .sort((a, b) =>
            a.next_contribution_date.localeCompare(b.next_contribution_date),
        );
}

function isScheduledDate(investment, scheduledDate) {
    const date = new Date(`${scheduledDate}T00:00:00Z`);
    const startDate = String(investment.start_date).slice(0, 10);
    if (scheduledDate < startDate) return false;
    const clampDay = (year, month, day) => Math.min(
        day,
        new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    );
    if (investment.contribution_frequency === "MONTHLY") {
        return date.getUTCDate() === clampDay(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            Number(investment.contribution_day),
        );
    }
    return investment.contribution_frequency === "YEARLY"
        && date.getUTCMonth() + 1 === Number(investment.contribution_month)
        && date.getUTCDate() === clampDay(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            Number(investment.contribution_day),
        );
}

async function createContribution(investmentId, userId, data) {
    const investment = await getInvestmentRow(investmentId, userId);
    if (investment.status !== "ACTIVE") {
        throw new HttpError(422, "Contributions can only be recorded for active investments");
    }
    if (!investment.contribution_frequency || investment.contribution_day == null) {
        throw new HttpError(422, "Investment has no contribution schedule");
    }
    if (!isScheduledDate(investment, data.scheduled_date)) {
        throw new HttpError(422, "scheduled_date does not match the investment schedule");
    }
    if (data.contribution_date > isoDate(today())) {
        throw new HttpError(422, "contribution_date cannot be in the future");
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO investment_contributions
                (investment_id, amount, scheduled_date, contribution_date,
                 already_recorded_as_expense, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING ${contributionColumns.join(", ")}`,
            [
                investmentId,
                data.amount,
                data.scheduled_date,
                data.contribution_date,
                data.already_recorded_as_expense,
                data.notes ?? null,
            ],
        );
        return serializeContribution(rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            throw new HttpError(409, "This scheduled contribution is already marked as paid");
        }
        throw error;
    }
}

async function getInvestmentSummary(userId) {
    const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS total_investments,
                COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_investments,
                COUNT(*) FILTER (WHERE goal_id IS NOT NULL)::int AS goal_linked_investments,
                COALESCE(SUM(initial_amount), 0) AS total_initial_amount,
                COALESCE(SUM(current_value), 0) AS total_current_value,
                COALESCE(SUM(contribution_amount), 0) AS total_recurring_contribution_amount,
                COALESCE(SUM(maturity_value), 0) AS total_expected_maturity_value
         FROM investments WHERE user_id = $1`,
        [userId],
    );
    const [maturities, contributions] = await Promise.all([
        getUpcomingMaturities(userId),
        getUpcomingContributions(userId),
    ]);
    return {
        ...rows[0],
        total_initial_amount: Number(rows[0].total_initial_amount),
        total_current_value: Number(rows[0].total_current_value),
        total_recurring_contribution_amount: Number(
            rows[0].total_recurring_contribution_amount,
        ),
        total_expected_maturity_value: Number(
            rows[0].total_expected_maturity_value,
        ),
        goal_linked_investments: rows[0].goal_linked_investments,
        upcoming_maturities: maturities.length,
        upcoming_contributions: contributions.length,
    };
}

async function getInvestmentTypeDistribution(userId) {
    const { rows } = await pool.query(
        `SELECT type, initial_amount, contribution_frequency, contribution_amount, term
         FROM investments WHERE user_id = $1`,
        [userId],
    );
    const distribution = new Map();
    for (const investment of rows) {
        let amount;
        if (investment.type === "FD")
            amount = Number(investment.initial_amount || 0);
        else if (investment.type === "RD") {
            amount =
                investment.contribution_frequency === "MONTHLY"
                    ? Number(investment.contribution_amount || 0) *
                    Number(investment.term || 0)
                    : 0;
        } else amount = Number(investment.initial_amount || 0);
        const entry = distribution.get(investment.type) || { amount: 0, count: 0 };
        entry.amount += amount;
        entry.count += 1;
        distribution.set(investment.type, entry);
    }
    const total = [...distribution.values()].reduce(
        (sum, entry) => sum + entry.amount,
        0,
    );
    return [...distribution.entries()].map(([type, entry]) => ({
        type,
        amount: Number(entry.amount.toFixed(2)),
        count: entry.count,
        percentage: Number((total ? (entry.amount / total) * 100 : 0).toFixed(2)),
    }));
}

async function getWithdrawalRow(investmentId, withdrawalId) {
    const { rows } = await pool.query(
        `SELECT ${withdrawalColumns.join(", ")} FROM investment_withdrawals
         WHERE investment_id = $1 AND id = $2`,
        [investmentId, withdrawalId],
    );
    if (!rows[0]) throw new HttpError(404, "Withdrawal not found");
    return rows[0];
}

async function createWithdrawal(investmentId, userId, data) {
    const investment = await getInvestmentRow(investmentId, userId);
    if (data.withdrawal_date < investment.start_date) {
        throw new HttpError(422, "withdrawal_date cannot be before start_date");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows } = await client.query(
            `INSERT INTO investment_withdrawals (investment_id, withdrawal_date, withdrawal_amount, reason)
             VALUES ($1, $2, $3, $4) RETURNING ${withdrawalColumns.join(", ")}`,
            [
                investmentId,
                data.withdrawal_date,
                data.withdrawal_amount,
                data.reason ?? null,
            ],
        );
        if (data.mark_withdrawn) {
            await client.query(
                "UPDATE investments SET status = 'WITHDRAWN', updated_at = NOW() WHERE id = $1",
                [investmentId],
            );
        }
        await client.query("COMMIT");
        return serializeWithdrawal(rows[0]);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getWithdrawals(investmentId, userId) {
    await getInvestmentRow(investmentId, userId);
    return (await getWithdrawalsForInvestment(investmentId)).map(
        serializeWithdrawal,
    );
}

async function getWithdrawal(investmentId, withdrawalId, userId) {
    await getInvestmentRow(investmentId, userId);
    return serializeWithdrawal(
        await getWithdrawalRow(investmentId, withdrawalId),
    );
}

async function updateWithdrawal(investmentId, withdrawalId, userId, data) {
    const investment = await getInvestmentRow(investmentId, userId);
    const withdrawal = await getWithdrawalRow(investmentId, withdrawalId);
    for (const key of ["withdrawal_date", "withdrawal_amount"]) {
        if (Object.prototype.hasOwnProperty.call(data, key) && data[key] === null) {
            throw new HttpError(422, `${key} cannot be null`);
        }
    }
    if (
        (data.withdrawal_date ?? withdrawal.withdrawal_date) < investment.start_date
    ) {
        throw new HttpError(422, "withdrawal_date cannot be before start_date");
    }
    const entries = Object.entries(data).filter(([key]) =>
        ["withdrawal_date", "withdrawal_amount", "reason"].includes(key),
    );
    if (!entries.length) return serializeWithdrawal(withdrawal);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(investmentId, withdrawalId);
    const { rows } = await pool.query(
        `UPDATE investment_withdrawals SET ${assignments.join(", ")}
         WHERE investment_id = $${values.length - 1} AND id = $${values.length}
         RETURNING ${withdrawalColumns.join(", ")}`,
        values,
    );
    return serializeWithdrawal(rows[0]);
}

async function deleteWithdrawal(investmentId, withdrawalId, userId) {
    await getInvestmentRow(investmentId, userId);
    await getWithdrawalRow(investmentId, withdrawalId);
    await pool.query(
        "DELETE FROM investment_withdrawals WHERE investment_id = $1 AND id = $2",
        [investmentId, withdrawalId],
    );
}

module.exports = {
    createInvestment,
    getInvestment,
    getPaginatedInvestments,
    updateInvestment,
    deleteInvestment,
    getUpcomingMaturities,
    getUpcomingContributions,
    createContribution,
    getInvestmentSummary,
    getInvestmentTypeDistribution,
    createWithdrawal,
    getWithdrawals,
    getWithdrawal,
    updateWithdrawal,
    deleteWithdrawal,
};
