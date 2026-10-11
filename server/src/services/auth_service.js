const { pool } = require("../database/database");
const { HttpError } = require("../middleware/errors");
const { hashPassword, verifyPassword } = require("../utils/security");

async function getUserByEmail(email) {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return rows[0] || null;
}

async function getUserById(userId) {
    const { rows } = await pool.query(
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        [userId]
    );
    return rows[0] || null;
}

async function registerUser(userData) {
    if (await getUserByEmail(userData.email)) {
        throw new HttpError(400, "An account with this email already exists.");
    }
    const hashedPassword = await hashPassword(userData.password);
    const { rows } = await pool.query(
        `INSERT INTO users (name, email, hashed_password)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [userData.name, userData.email, hashedPassword]
    );
    return rows[0];
}

async function authenticateUser(email, password) {
    const user = await getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.hashed_password))) {
        throw new HttpError(401, "Invalid email or password");
    }
    return user;
}

module.exports = { getUserById, registerUser, authenticateUser };
