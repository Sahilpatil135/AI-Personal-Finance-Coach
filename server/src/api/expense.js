const express = require("express");
const { getCurrentUser } = require("../auth/dependencies");
const { HttpError } = require("../middleware/errors");
const {
    expenseCreate,
    expenseUpdate,
    budgetUpdate
} = require("../schemas/validation");
const service = require("../services/expense_service");

const router = express.Router();
router.use(getCurrentUser);

function validate(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) throw result.error;
    return result.data;
}

function queryInteger(value, name, defaultValue, min, max) {
    if (value === undefined) return defaultValue;
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new HttpError(422, [{ loc: ["query", name], msg: "Input should be a valid integer", type: "int_parsing" }]);
    }
    return number;
}

function timeframe(value = "year") {
    if (value !== "month" && value !== "year") {
        throw new HttpError(422, [{ loc: ["query", "timeframe"], msg: "Input should be 'month' or 'year'", type: "literal_error" }]);
    }
    return value;
}

function idParam(value) {
    const id = Number(value);
    if (!Number.isInteger(id)) throw new HttpError(422, "Invalid id");
    return id;
}

router.post(["/", ""], async (req, res) => {
    res.status(201).json(await service.createExpense(validate(expenseCreate, req.body), req.user.id));
});

router.get(["/", ""], async (req, res) => {
    res.json(await service.getUserExpenses(req.user.id));
});

router.get("/stats/overview", async (req, res) => {
    res.json(await service.getExpenseStats(req.user.id));
});

router.get("/analytics/monthly-trends", async (req, res) => {
    queryInteger(req.query.months, "months", 12, 1, 36);
    res.json(await service.getExpenseTrends(req.user.id, timeframe(req.query.timeframe)));
});

router.get("/analytics/category-distribution", async (req, res) => {
    res.json(await service.getCategoryDistribution(req.user.id, timeframe(req.query.timeframe)));
});

router.get("/budget", async (req, res) => {
    res.json(await service.getBudget(req.user.id));
});

router.put("/budget", async (req, res) => {
    const data = validate(budgetUpdate, req.body);
    res.json(await service.setBudget(req.user.id, data.amount));
});

router.get("/paginated", async (req, res) => {
    const skip = queryInteger(req.query.skip, "skip", 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = queryInteger(req.query.limit, "limit", 10, 1, 100);
    res.json(await service.getPaginatedExpenses(req.user.id, skip, limit));
});

router.put("/:expense_id", async (req, res) => {
    res.json(await service.updateExpense(
        idParam(req.params.expense_id),
        req.user.id,
        validate(expenseUpdate, req.body)
    ));
});

router.delete("/:expense_id", async (req, res) => {
    await service.deleteExpense(idParam(req.params.expense_id), req.user.id);
    res.status(204).end();
});

module.exports = router;
