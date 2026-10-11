const express = require("express");
const { getCurrentUser } = require("../auth/dependencies");
const { HttpError } = require("../middleware/errors");
const {
    incomeCreate,
    incomeUpdate
} = require("../schemas/validation");
const service = require("../services/income_service");

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

function idParam(value) {
    const id = Number(value);
    if (!Number.isInteger(id)) throw new HttpError(422, "Invalid id");
    return id;
}

router.post(["/", ""], async (req, res) => {
    res.status(201).json(await service.createIncome(validate(incomeCreate, req.body), req.user.id));
});

router.get(["/", ""], async (req, res) => {
    res.json(await service.getUserIncomes(req.user.id));
});

router.get("/stats/overview", async (req, res) => {
    res.json(await service.getIncomeStats(req.user.id));
});

router.get("/analytics/monthly-trends", async (req, res) => {
    const months = queryInteger(req.query.months, "months", 12, 1, 36);
    res.json(await service.getMonthlyTrends(req.user.id, months));
});

router.get("/analytics/source-distribution", async (req, res) => {
    res.json(await service.getSourceDistribution(req.user.id));
});

router.get("/paginated", async (req, res) => {
    const skip = queryInteger(req.query.skip, "skip", 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = queryInteger(req.query.limit, "limit", 10, 1, 100);
    res.json(await service.getPaginatedIncomes(req.user.id, skip, limit));
});

router.put("/:income_id", async (req, res) => {
    res.json(await service.updateIncome(
        idParam(req.params.income_id),
        req.user.id,
        validate(incomeUpdate, req.body)
    ));
});

router.delete("/:income_id", async (req, res) => {
    await service.deleteIncome(idParam(req.params.income_id), req.user.id);
    res.status(204).end();
});

module.exports = router;
