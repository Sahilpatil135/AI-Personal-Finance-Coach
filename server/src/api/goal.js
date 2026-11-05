const express = require("express");
const { getCurrentUser } = require("../auth/dependencies");
const { HttpError } = require("../middleware/errors");
const { goalCreate, goalUpdate } = require("../schemas/validation");
const service = require("../services/goal_service");

const router = express.Router();
router.use(getCurrentUser);

function validate(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) throw result.error;
    return result.data;
}

function positiveId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(422, [{ loc: ["path", "goal_id"], msg: "Input should be greater than 0", type: "greater_than" }]);
    }
    return id;
}

router.post(["", "/"], async (req, res) => {
    res.status(201).json(await service.createGoal(validate(goalCreate, req.body), req.user.id));
});

router.get(["", "/"], async (req, res) => {
    res.json(await service.getGoals(req.user.id));
});

router.get("/summary", async (req, res) => {
    res.json(await service.getGoalSummary(req.user.id));
});

router.get("/:goal_id", async (req, res) => {
    res.json(await service.getGoal(positiveId(req.params.goal_id), req.user.id));
});

router.put("/:goal_id", async (req, res) => {
    res.json(await service.updateGoal(
        positiveId(req.params.goal_id),
        req.user.id,
        validate(goalUpdate, req.body),
    ));
});

router.delete("/:goal_id", async (req, res) => {
    await service.deleteGoal(positiveId(req.params.goal_id), req.user.id);
    res.status(204).end();
});

module.exports = router;
