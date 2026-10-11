const { z } = require("zod");

const dateString = z.string().date();
const optionalDate = dateString.nullable().optional();
const positiveNumber = z.number().finite().positive();
const optionalPositiveNumber = positiveNumber.nullable().optional();
const contributionFields = {
    contribution_amount: optionalPositiveNumber,
    contribution_frequency: z.enum(["MONTHLY", "YEARLY"]).nullable().optional(),
    contribution_day: z.number().int().min(1).max(31).nullable().optional(),
    contribution_month: z.number().int().min(1).max(12).nullable().optional()
};

function validateContributions(value, context) {
    const fields = ["contribution_amount", "contribution_frequency", "contribution_day", "contribution_month"];
    if (!fields.some(field => value[field] !== undefined && value[field] !== null)) return;
    if (value.contribution_amount == null || value.contribution_frequency == null || value.contribution_day == null) {
        context.addIssue({ code: "custom", message: "Recurring contributions require amount, frequency, and contribution_day" });
    }
    if (value.contribution_frequency === "YEARLY" && value.contribution_month == null) {
        context.addIssue({ code: "custom", message: "YEARLY contributions require contribution_month" });
    }
    if (value.contribution_frequency === "MONTHLY" && value.contribution_month != null) {
        context.addIssue({ code: "custom", message: "contribution_month is only valid for YEARLY contributions" });
    }
}

const investmentCreate = z.object({
    type: z.string().min(1).max(50).transform(value => value.trim().toUpperCase()),
    title: z.string().min(1).max(255),
    initial_amount: optionalPositiveNumber,
    ...contributionFields,
    term: z.number().int().positive().nullable().optional(),
    start_date: optionalDate,
    maturity_date: optionalDate,
    maturity_value: optionalPositiveNumber,
    status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN"]).default("ACTIVE"),
    goal_id: z.number().int().positive().nullable().optional()
}).superRefine((value, context) => {
    if (value.maturity_date && value.start_date && value.maturity_date < value.start_date) {
        context.addIssue({ code: "custom", message: "maturity_date cannot be before start_date" });
    }
    validateContributions(value, context);
});

const investmentUpdate = z.object({
    type: z.string().min(1).max(50).transform(value => value.trim().toUpperCase()).nullable().optional(),
    title: z.string().min(1).max(255).nullable().optional(),
    initial_amount: optionalPositiveNumber,
    ...contributionFields,
    term: z.number().int().positive().nullable().optional(),
    start_date: optionalDate,
    maturity_date: optionalDate,
    maturity_value: optionalPositiveNumber,
    status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN"]).nullable().optional(),
    goal_id: z.number().int().positive().nullable().optional()
}).superRefine((value, context) => {
    if (value.start_date && value.maturity_date && value.maturity_date < value.start_date) {
        context.addIssue({ code: "custom", message: "maturity_date cannot be before start_date" });
    }
});

module.exports = {
    userCreate: z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string()
    }),
    userLogin: z.object({
        email: z.string().email(),
        password: z.string()
    }),
    incomeCreate: z.object({
        amount: z.number().finite(),
        source: z.string(),
        date: optionalDate,
        description: z.string().nullable().optional()
    }),
    incomeUpdate: z.object({
        amount: z.number().finite().nullable().optional(),
        source: z.string().nullable().optional(),
        date: optionalDate,
        description: z.string().nullable().optional()
    }),
    expenseCreate: z.object({
        amount: z.number().finite(),
        category: z.string(),
        description: z.string().nullable().optional(),
        payment_mode: z.string().default("Online/UPI"),
        date: optionalDate
    }),
    expenseUpdate: z.object({
        amount: z.number().finite().nullable().optional(),
        category: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        payment_mode: z.string().nullable().optional(),
        date: optionalDate
    }),
    budgetUpdate: z.object({ amount: z.number().finite() }),
    investmentCreate,
    investmentUpdate,
    withdrawalCreate: z.object({
        withdrawal_date: dateString,
        withdrawal_amount: positiveNumber,
        reason: z.string().max(500).nullable().optional(),
        mark_withdrawn: z.boolean().default(false)
    }),
    withdrawalUpdate: z.object({
        withdrawal_date: optionalDate,
        withdrawal_amount: optionalPositiveNumber,
        reason: z.string().max(500).nullable().optional()
    })
};
