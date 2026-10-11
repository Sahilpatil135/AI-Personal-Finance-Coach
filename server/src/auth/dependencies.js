const { pool } = require("../database/database");
const { decodeAccessToken } = require("../utils/security");
const { HttpError } = require("../middleware/errors");

async function getCurrentUser(req, res, next) {
    const authorization = req.get("authorization");
    const match = authorization && authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        next(new HttpError(401, "Not authenticated"));
        return;
    }

    const payload = decodeAccessToken(match[1]);
    const userId = payload && Number.parseInt(payload.sub, 10);
    if (!Number.isInteger(userId)) {
        next(new HttpError(401, "Could not validate credentials"));
        return;
    }

    try {
        const { rows } = await pool.query(
            "SELECT id, name, email, created_at FROM users WHERE id = $1",
            [userId]
        );
        if (!rows[0]) {
            throw new HttpError(401, "Could not validate credentials");
        }
        req.user = rows[0];
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { getCurrentUser };
