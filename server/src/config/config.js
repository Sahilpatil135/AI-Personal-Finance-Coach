const secretKey = process.env.SECRET_KEY || "super_secret_default_key_change_in_production_12345";
const algorithm = process.env.ALGORITHM || "HS256";
if (algorithm !== "HS256") {
    throw new Error(`Unsupported JWT algorithm: ${algorithm}`);
}

module.exports = {
    secretKey,
    algorithm,
    accessTokenExpireMinutes: Number.parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || "1440", 10),
    databaseUrl: process.env.DATABASE_URL,
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    port: Number.parseInt(process.env.PORT || "8000", 10)
};
