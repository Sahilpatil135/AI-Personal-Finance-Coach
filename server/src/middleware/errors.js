class HttpError extends Error {
    constructor(status, detail) {
        super(typeof detail === "string" ? detail : "Request validation failed");
        this.status = status;
        this.detail = detail;
    }
}

function notFound(req, res, next) {
    next(new HttpError(404, "Not Found"));
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        next(error);
        return;
    }
    if (error instanceof HttpError) {
        res.status(error.status).json({ detail: error.detail });
        return;
    }
    if (error && error.name === "ZodError") {
        res.status(422).json({ detail: error.issues });
        return;
    }
    if (error && error.code === "23505") {
        res.status(400).json({ detail: "An account with this email already exists." });
        return;
    }
    console.error("Unhandled API error:", error);
    res.status(500).json({ detail: "Internal server error" });
}

module.exports = { HttpError, notFound, errorHandler };
