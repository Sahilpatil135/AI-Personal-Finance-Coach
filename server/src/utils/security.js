const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const {
    secretKey,
    algorithm,
    accessTokenExpireMinutes
} = require("../config/config");

function hashPassword(password) {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });
}

function verifyPassword(password, hash) {
    return argon2.verify(hash, password);
}

function createAccessToken(subject) {
    return jwt.sign(
        { sub: String(subject) },
        secretKey,
        { algorithm, expiresIn: `${accessTokenExpireMinutes}m` }
    );
}

function decodeAccessToken(token) {
    try {
        return jwt.verify(token, secretKey, { algorithms: [algorithm] });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return null;
        }
        throw error;
    }
}

module.exports = { hashPassword, verifyPassword, createAccessToken, decodeAccessToken };
