const { z } = require("zod");

const dateString = z.string().date();
const optionalDate = dateString.nullable().optional();
const positiveNumber = z.number().finite().positive();
const optionalPositiveNumber = positiveNumber.nullable().optional();
const optionalNonnegativeNumber = z.number().finite().nonnegative().nullable().optional();
const moneyAmount = positiveNumber.refine(
    value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Amount must have at most two decimal places",
).refine(value => value <= 9999999999.99, "Amount exceeds the supported maximum");
const goalPriority = z.enum(["LOW", "MEDIUM", "HIGH"]);
const goalFields = {
    goal_name: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(50),
    description: z.string().nullable().optional(),
    target_amount: positiveNumber,
    current_saved: z.number().finite().nonnegative(),
    start_date: dateString,
    deadline: dateString,
    priority: goalPriority
};

function validateGoalDates(value, context) {
    if (value.start_date && value.deadline && value.deadline < value.start_date) {
        context.addIssue({ code: "custom", path: ["deadline"], message: "deadline cannot be before start_date" });
    }
}

const goalCreate = z.object({
    ...goalFields,
    current_saved: z.number().finite().nonnegative().default(0),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("IN_PROGRESS")
}).superRefine(validateGoalDates);

const goalUpdate = z.object({
    goal_name: goalFields.goal_name.optional(),
    category: goalFields.category.optional(),
    description: goalFields.description,
    target_amount: goalFields.target_amount.optional(),
    current_saved: goalFields.current_saved.optional(),
    start_date: goalFields.start_date.optional(),
    deadline: goalFields.deadline.optional(),
    priority: goalFields.priority.optional(),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional()
}).superRefine(validateGoalDates);

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
    current_value: optionalNonnegativeNumber,
    valuation_date: optionalDate,
    valuation_method: z.string().trim().min(1).max(20).transform(value => value.toUpperCase()).default("MANUAL"),
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
    current_value: optionalNonnegativeNumber,
    valuation_date: optionalDate,
    valuation_method: z.string().trim().min(1).max(20).transform(value => value.toUpperCase()).optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN"]).nullable().optional(),
    goal_id: z.number().int().positive().nullable().optional()
}).superRefine((value, context) => {
    if (value.start_date && value.maturity_date && value.maturity_date < value.start_date) {
        context.addIssue({ code: "custom", message: "maturity_date cannot be before start_date" });
    }
});

const investmentContributionCreate = z.object({
    amount: positiveNumber,
    scheduled_date: dateString,
    contribution_date: dateString,
    already_recorded_as_expense: z.boolean().default(false),
    notes: z.string().max(500).nullable().optional()
});

const withdrawalCreate = z.object({
    withdrawal_date: dateString,
    withdrawal_type: z.enum(["PARTIAL", "FULL"]),
    withdrawal_amount: moneyAmount,
    actual_received_amount: moneyAmount,
    reason: z.string().max(500).nullable().optional()
});

const maturityCreate = z.object({
    withdrawal_date: dateString,
    actual_received_amount: moneyAmount,
    reason: z.string().max(500).nullable().optional()
});

const proceedsAllocationCreate = z.object({
    allocation_type: z.enum(["ACCOUNT_BALANCE", "GOAL", "NEW_INVESTMENT"]),
    goal_id: z.number().int().positive().optional(),
    new_investment: z.object({
        type: z.enum(["FD", "RD", "MUTUAL FUND"]),
        title: z.string().trim().min(1).max(255),
        maturity_date: optionalDate,
        maturity_value: optionalPositiveNumber,
        goal_id: z.number().int().positive().nullable().optional()
    }).optional()
}).superRefine((value, context) => {
    if (value.allocation_type === "GOAL" && value.goal_id == null) {
        context.addIssue({ code: "custom", path: ["goal_id"], message: "Select a goal for this allocation" });
    }
    if (value.allocation_type !== "GOAL" && value.goal_id != null) {
        context.addIssue({ code: "custom", path: ["goal_id"], message: "goal_id is only valid for a goal allocation" });
    }
    if (value.allocation_type === "NEW_INVESTMENT" && !value.new_investment) {
        context.addIssue({ code: "custom", path: ["new_investment"], message: "Investment details are required" });
    }
    if (value.allocation_type !== "NEW_INVESTMENT" && value.new_investment) {
        context.addIssue({ code: "custom", path: ["new_investment"], message: "Investment details are only valid for a new investment allocation" });
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
    goalCreate,
    goalUpdate,
    investmentCreate,
    investmentUpdate,
    investmentContributionCreate,
    withdrawalCreate,
    maturityCreate,
    proceedsAllocationCreate
};
