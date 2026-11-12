const express = require("express");
const { getCurrentUser } = require("../auth/dependencies");
const { HttpError } = require("../middleware/errors");
const {
    investmentCreate,
    investmentUpdate,
    investmentContributionCreate,
    withdrawalCreate,
    withdrawalUpdate
} = require("../schemas/validation");
const service = require("../services/investment_service");

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

function positiveId(value, name) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(422, [{ loc: ["path", name], msg: "Input should be greater than 0", type: "greater_than" }]);
    }
    return id;
}

function optionalPositiveId(value, name) {
    if (value === undefined) return undefined;
    return queryInteger(value, name, undefined, 1, Number.MAX_SAFE_INTEGER);
}

function optionalStatus(value) {
    if (value === undefined) return undefined;
    if (!/^(ACTIVE|COMPLETED|WITHDRAWN|active|completed|withdrawn)$/.test(value)) {
        throw new HttpError(422, [{ loc: ["query", "status"], msg: "Input should match the expected pattern", type: "string_pattern_mismatch" }]);
    }
    return value;
}

router.post(["", "/"], async (req, res) => {
    res.status(201).json(await service.createInvestment(validate(investmentCreate, req.body), req.user.id));
});

router.get(["", "/"], async (req, res) => {
    const skip = queryInteger(req.query.skip, "skip", 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = queryInteger(req.query.limit, "limit", 10, 1, 100);
    const goalId = optionalPositiveId(req.query.goal_id, "goal_id");
    res.json(await service.getPaginatedInvestments(
        req.user.id, skip, limit, req.query.type, optionalStatus(req.query.status), goalId
    ));
});

router.get("/summary", async (req, res) => {
    res.json(await service.getInvestmentSummary(req.user.id));
});

router.get("/analytics/type-distribution", async (req, res) => {
    res.json(await service.getInvestmentTypeDistribution(req.user.id));
});

router.get("/upcoming-maturities", async (req, res) => {
    const days = queryInteger(req.query.days, "days", 30, 1, 365);
    res.json(await service.getUpcomingMaturities(req.user.id, days));
});

router.get("/upcoming-contributions", async (req, res) => {
    const days = queryInteger(req.query.days, "days", 30, 1, 365);
    res.json(await service.getUpcomingContributions(req.user.id, days));
});

router.get("/:investment_id", async (req, res) => {
    res.json(await service.getInvestment(positiveId(req.params.investment_id, "investment_id"), req.user.id));
});

router.post("/:investment_id/contributions", async (req, res) => {
    res.status(201).json(await service.createContribution(
        positiveId(req.params.investment_id, "investment_id"),
        req.user.id,
        validate(investmentContributionCreate, req.body),
    ));
});

router.put("/:investment_id", async (req, res) => {
    res.json(await service.updateInvestment(
        positiveId(req.params.investment_id, "investment_id"),
        req.user.id,
        validate(investmentUpdate, req.body)
    ));
});

router.delete("/:investment_id", async (req, res) => {
    await service.deleteInvestment(positiveId(req.params.investment_id, "investment_id"), req.user.id);
    res.status(204).end();
});

router.post("/:investment_id/withdrawals", async (req, res) => {
    const investmentId = positiveId(req.params.investment_id, "investment_id");
    res.status(201).json(await service.createWithdrawal(
        investmentId, req.user.id, validate(withdrawalCreate, req.body)
    ));
});

router.get("/:investment_id/withdrawals", async (req, res) => {
    res.json(await service.getWithdrawals(positiveId(req.params.investment_id, "investment_id"), req.user.id));
});

router.get("/:investment_id/withdrawals/:withdrawal_id", async (req, res) => {
    res.json(await service.getWithdrawal(
        positiveId(req.params.investment_id, "investment_id"),
        positiveId(req.params.withdrawal_id, "withdrawal_id"),
        req.user.id
    ));
});

router.put("/:investment_id/withdrawals/:withdrawal_id", async (req, res) => {
    res.json(await service.updateWithdrawal(
        positiveId(req.params.investment_id, "investment_id"),
        positiveId(req.params.withdrawal_id, "withdrawal_id"),
        req.user.id,
        validate(withdrawalUpdate, req.body)
    ));
});

router.delete("/:investment_id/withdrawals/:withdrawal_id", async (req, res) => {
    await service.deleteWithdrawal(
        positiveId(req.params.investment_id, "investment_id"),
        positiveId(req.params.withdrawal_id, "withdrawal_id"),
        req.user.id
    );
    res.status(204).end();
});

module.exports = router;
