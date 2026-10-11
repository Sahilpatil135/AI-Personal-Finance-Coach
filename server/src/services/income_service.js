const { pool } = require("../database/database");
const { HttpError } = require("../middleware/errors");
const { today, monthStart, previousMonthStart, isoDate, dateKey, monthLabel } = require("../utils/dates");

function serializeIncome(row) {
    return { ...row, id: Number(row.id), amount: Number(row.amount) };
}

async function createIncome(data, userId) {
    const { rows } = await pool.query(
        `INSERT INTO income (user_id, amount, source, date, description)
         VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5)
         RETURNING id, amount, source, date, description`,
        [userId, data.amount, data.source, data.date || null, data.description ?? null]
    );
    return serializeIncome(rows[0]);
}

async function getUserIncomes(userId) {
    const { rows } = await pool.query(
        "SELECT id, amount, source, date, description FROM income WHERE user_id = $1 ORDER BY date DESC",
        [userId]
    );
    return rows.map(serializeIncome);
}

async function getIncomeById(incomeId, userId) {
    const { rows } = await pool.query(
        "SELECT id, amount, source, date, description FROM income WHERE id = $1 AND user_id = $2",
        [incomeId, userId]
    );
    if (!rows[0]) throw new HttpError(404, "Income record not found.");
    return serializeIncome(rows[0]);
}

async function updateIncome(incomeId, userId, data) {
    await getIncomeById(incomeId, userId);
    const columns = { amount: "amount", source: "source", date: "date", description: "description" };
    const entries = Object.entries(data).filter(([key, value]) => columns[key] && value !== null);
    if (!entries.length) return getIncomeById(incomeId, userId);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columns[key]} = $${index + 1}`);
    values.push(incomeId, userId);
    const { rows } = await pool.query(
        `UPDATE income SET ${assignments.join(", ")} WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING id, amount, source, date, description`,
        values
    );
    return serializeIncome(rows[0]);
}

async function deleteIncome(incomeId, userId) {
    await getIncomeById(incomeId, userId);
    await pool.query("DELETE FROM income WHERE id = $1 AND user_id = $2", [incomeId, userId]);
}

async function getIncomeStats(userId) {
    const currentStart = monthStart();
    const currentEnd = isoDate(today());
    const previousStart = isoDate(previousMonthStart());
    const previousEnd = isoDate(new Date(new Date(currentStart).getTime() - 86400000));
    const { rows: sums } = await pool.query(
        `SELECT
            COALESCE(SUM(amount), 0) AS total_income,
            COALESCE(SUM(amount) FILTER (WHERE date >= $2 AND date <= $3), 0) AS month_total,
            COALESCE(SUM(amount) FILTER (WHERE date >= $4 AND date <= $5), 0) AS previous_total
         FROM income WHERE user_id = $1`,
        [userId, currentStart, currentEnd, previousStart, previousEnd]
    );
    const { rows: sources } = await pool.query(
        "SELECT source, SUM(amount) AS total FROM income WHERE user_id = $1 GROUP BY source ORDER BY SUM(amount) DESC LIMIT 1",
        [userId]
    );
    const { rows: counts } = await pool.query(
        "SELECT COUNT(DISTINCT source)::int AS source_count FROM income WHERE user_id = $1",
        [userId]
    );
    const row = sums[0];
    const total = Number(row.total_income);
    const monthTotal = Number(row.month_total);
    const previousTotal = Number(row.previous_total);
    return {
        total_income: total,
        month_total: monthTotal,
        mom_growth: previousTotal > 0 ? ((monthTotal - previousTotal) / previousTotal) * 100 : 0,
        primary_source: sources[0]?.source || "N/A",
        source_count: counts[0].source_count
    };
}

async function getMonthlyTrends(userId, months = 12) {
    const current = today();
    const start = new Date(current.getFullYear(), current.getMonth() - months + 1, 1);
    const end = isoDate(current);
    const { rows } = await pool.query(
        `SELECT date_trunc('month', date)::date AS month, SUM(amount) AS amount
         FROM income WHERE user_id = $1 AND date >= $2 AND date <= $3
         GROUP BY date_trunc('month', date)`,
        [userId, isoDate(start), end]
    );
    const totals = new Map(rows.map(row => [dateKey(row.month), Number(row.amount)]));
    return Array.from({ length: months }, (_, index) => {
        const date = new Date(current.getFullYear(), current.getMonth() - months + index + 1, 1);
        const key = isoDate(date);
        return { month: monthLabel(date), amount: totals.get(key) || 0 };
    });
}

async function getSourceDistribution(userId) {
    const { rows } = await pool.query(
        "SELECT source, SUM(amount) AS amount FROM income WHERE user_id = $1 GROUP BY source",
        [userId]
    );
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    return rows.map(row => ({
        source: row.source,
        amount: Number(row.amount),
        percentage: total > 0 ? Number(row.amount) / total * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
}

async function getPaginatedIncomes(userId, skip, limit) {
    const [countResult, recordsResult] = await Promise.all([
        pool.query("SELECT COUNT(id)::int AS total FROM income WHERE user_id = $1", [userId]),
        pool.query(
            "SELECT id, amount, source, date, description FROM income WHERE user_id = $1 ORDER BY date DESC OFFSET $2 LIMIT $3",
            [userId, skip, limit]
        )
    ]);
    return { total: countResult.rows[0].total, records: recordsResult.rows.map(serializeIncome) };
}

module.exports = {
    createIncome, getUserIncomes, updateIncome, deleteIncome, getIncomeStats,
    getMonthlyTrends, getSourceDistribution, getPaginatedIncomes
};
