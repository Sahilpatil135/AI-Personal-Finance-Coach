const express = require("express");
const cors = require("cors");
const { frontendUrl } = require("./config/config");
const authRouter = require("./api/auth");
const incomeRouter = require("./api/income");
const expenseRouter = require("./api/expense");
const investmentRouter = require("./api/investment");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
const allowedOrigins = [...new Set([
    frontendUrl,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
])];

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(null, false);
    },
    credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the AI Personal Finance Coach API!" });
});

app.use("/api/auth", authRouter);
app.use("/api/income", incomeRouter);
app.use("/api/expense", expenseRouter);
app.use("/api/investments", investmentRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
