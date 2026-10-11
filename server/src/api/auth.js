const express = require("express");
const { userCreate, userLogin } = require("../schemas/validation");
const { registerUser, authenticateUser } = require("../services/auth_service");
const { createAccessToken } = require("../utils/security");
const { getCurrentUser } = require("../auth/dependencies");
const { HttpError } = require("../middleware/errors");

const router = express.Router();

function validate(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) throw result.error;
    return result.data;
}

function tokenResponse(user) {
    return {
        access_token: createAccessToken(user.id),
        token_type: "bearer",
        user: {
            id: Number(user.id),
            name: user.name,
            email: user.email,
            created_at: user.created_at
        }
    };
}

router.post("/register", async (req, res) => {
    const data = validate(userCreate, req.body);
    const user = await registerUser(data);
    res.status(201).json(tokenResponse(user));
});

router.post("/login", async (req, res) => {
    const data = validate(userLogin, req.body);
    const user = await authenticateUser(data.email, data.password);
    res.json(tokenResponse(user));
});

router.get("/me", getCurrentUser, (req, res) => {
    if (!req.user) throw new HttpError(401, "Could not validate credentials");
    res.json({
        id: Number(req.user.id),
        name: req.user.name,
        email: req.user.email,
        created_at: req.user.created_at
    });
});

module.exports = router;
