const { pool } = require("../database/database");
const { HttpError } = require("../middleware/errors");
const { today, monthStart, previousMonthStart, isoDate, dateKey, monthLabel } = require("../utils/dates");

function serializeExpense(row) {
    return { ...row, id: Number(row.id), amount: Number(row.amount) };
}

async function createExpense(data, userId) {
    const { rows } = await pool.query(
        `INSERT INTO expenses (user_id, amount, category, description, payment_mode, date)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
         RETURNING id, amount, category, description, payment_mode, date`,
        [userId, data.amount, data.category, data.description ?? null, data.payment_mode, data.date || null]
    );
    return serializeExpense(rows[0]);
}

async function getUserExpenses(userId) {
    const { rows } = await pool.query(
        "SELECT id, amount, category, description, payment_mode, date FROM expenses WHERE user_id = $1 ORDER BY date DESC",
        [userId]
    );
    return rows.map(serializeExpense);
}

async function getExpenseById(expenseId, userId) {
    const { rows } = await pool.query(
        "SELECT id, amount, category, description, payment_mode, date FROM expenses WHERE id = $1 AND user_id = $2",
        [expenseId, userId]
    );
    if (!rows[0]) throw new HttpError(404, "Expense record not found.");
    return serializeExpense(rows[0]);
}

async function updateExpense(expenseId, userId, data) {
    await getExpenseById(expenseId, userId);
    const columns = { amount: "amount", category: "category", description: "description", payment_mode: "payment_mode", date: "date" };
    const entries = Object.entries(data).filter(([key, value]) => columns[key] && value !== null);
    if (!entries.length) return getExpenseById(expenseId, userId);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columns[key]} = $${index + 1}`);
    values.push(expenseId, userId);
    const { rows } = await pool.query(
        `UPDATE expenses SET ${assignments.join(", ")} WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING id, amount, category, description, payment_mode, date`,
        values
    );
    return serializeExpense(rows[0]);
}

async function deleteExpense(expenseId, userId) {
    await getExpenseById(expenseId, userId);
    await pool.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [expenseId, userId]);
}

async function getExpenseStats(userId) {
    const now = today();
    const currentStart = monthStart();
    const yearStart = isoDate(new Date(now.getFullYear(), 0, 1));
    const currentEnd = isoDate(now);
    const previousStart = isoDate(previousMonthStart());
    const previousEnd = isoDate(new Date(new Date(currentStart).getTime() - 86400000));
    const { rows } = await pool.query(
        `SELECT
            COALESCE(SUM(amount) FILTER (WHERE date >= $2 AND date <= $3), 0) AS total_expense,
            COALESCE(SUM(amount) FILTER (WHERE date >= $4 AND date <= $3), 0) AS month_total,
            COALESCE(MAX(amount) FILTER (WHERE date >= $4 AND date <= $3), 0) AS largest_expense,
            COALESCE(SUM(amount) FILTER (WHERE date >= $5 AND date <= $6), 0) AS previous_total
         FROM expenses WHERE user_id = $1`,
        [userId, yearStart, currentEnd, currentStart, previousStart, previousEnd]
    );
    const { rows: categories } = await pool.query(
        "SELECT category, SUM(amount) AS total FROM expenses WHERE user_id = $1 GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1",
        [userId]
    );
    const { rows: counts } = await pool.query(
        "SELECT COUNT(DISTINCT category)::int AS category_count FROM expenses WHERE user_id = $1",
        [userId]
    );
    const row = rows[0];
    const monthTotal = Number(row.month_total);
    const previousTotal = Number(row.previous_total);
    return {
        total_expense: Number(row.total_expense),
        month_total: monthTotal,
        mom_growth: previousTotal > 0 ? ((monthTotal - previousTotal) / previousTotal) * 100 : 0,
        primary_category: categories[0]?.category || "N/A",
        category_count: counts[0].category_count,
        largest_expense: Number(row.largest_expense)
    };
}

async function getExpenseTrends(userId, timeframe = "year") {
    const now = today();
    if (timeframe === "month") {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const { rows } = await pool.query(
            `SELECT date, SUM(amount) AS amount FROM expenses
             WHERE user_id = $1 AND date >= $2 AND date <= $3 GROUP BY date`,
            [userId, isoDate(first), isoDate(now)]
        );
        const amounts = new Map(rows.map(row => [dateKey(row.date), Number(row.amount)]));
        return Array.from({ length: now.getDate() }, (_, index) => {
            const day = new Date(now.getFullYear(), now.getMonth(), index + 1);
            return {
                month: `${String(index + 1).padStart(2, "0")} ${day.toLocaleString("en-US", { month: "short" })}`,
                amount: amounts.get(isoDate(day)) || 0
            };
        });
    }
    return getMonthlyExpenseTrends(userId, 12);
}

async function getMonthlyExpenseTrends(userId, months = 12) {
    const now = today();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const { rows } = await pool.query(
        `SELECT date_trunc('month', date)::date AS month, SUM(amount) AS amount
         FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3
         GROUP BY date_trunc('month', date)`,
        [userId, isoDate(start), isoDate(now)]
    );
    const totals = new Map(rows.map(row => [dateKey(row.month), Number(row.amount)]));
    return Array.from({ length: months }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1);
        return { month: monthLabel(date), amount: totals.get(isoDate(date)) || 0 };
    });
}

async function getCategoryDistribution(userId, timeframe = "year") {
    const params = [userId];
    let query = "SELECT category, SUM(amount) AS amount FROM expenses WHERE user_id = $1";
    if (timeframe === "month") {
        params.push(monthStart(), isoDate(today()));
        query += " AND date >= $2 AND date <= $3";
    }
    query += " GROUP BY category";
    const { rows } = await pool.query(query, params);
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    return rows.map(row => ({
        category: row.category,
        amount: Number(row.amount),
        percentage: total > 0 ? Number(row.amount) / total * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
}

async function getBudget(userId) {
    const { rows } = await pool.query("SELECT amount FROM budgets WHERE user_id = $1", [userId]);
    return { amount: rows[0] ? Number(rows[0].amount) : 0 };
}

async function setBudget(userId, amount) {
    await pool.query(
        `INSERT INTO budgets (user_id, amount) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET amount = EXCLUDED.amount`,
        [userId, amount]
    );
    return getBudget(userId);
}

async function getPaginatedExpenses(userId, skip, limit) {
    const [countResult, recordsResult] = await Promise.all([
        pool.query("SELECT COUNT(id)::int AS total FROM expenses WHERE user_id = $1", [userId]),
        pool.query(
            "SELECT id, amount, category, description, payment_mode, date FROM expenses WHERE user_id = $1 ORDER BY date DESC OFFSET $2 LIMIT $3",
            [userId, skip, limit]
        )
    ]);
    return { total: countResult.rows[0].total, records: recordsResult.rows.map(serializeExpense) };
}

module.exports = {
    createExpense, getUserExpenses, updateExpense, deleteExpense, getExpenseStats,
    getExpenseTrends, getMonthlyExpenseTrends, getCategoryDistribution,
    getPaginatedExpenses, getBudget, setBudget
};
