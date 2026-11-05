-- Drop dependent tables first.
DROP TABLE IF EXISTS investment_withdrawals;
DROP TABLE IF EXISTS investments;
DROP TABLE IF EXISTS goals;

CREATE TABLE goals (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    goal_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,

    target_amount NUMERIC(12, 2) NOT NULL
        CONSTRAINT goals_target_amount_positive
        CHECK (target_amount > 0),

    current_saved NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CONSTRAINT goals_current_saved_nonnegative
        CHECK (current_saved >= 0),

    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline DATE NOT NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CONSTRAINT goals_priority_valid
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),

    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
        CONSTRAINT goals_status_valid
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT goals_deadline_after_start
        CHECK (deadline >= start_date)
);

CREATE INDEX IF NOT EXISTS ix_goals_user_id
ON goals(user_id);


CREATE TABLE investments (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    goal_id INTEGER
        REFERENCES goals(id) ON DELETE SET NULL,

    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,

    initial_amount NUMERIC(12, 2) NOT NULL
        CONSTRAINT investments_initial_amount_nonnegative
        CHECK (initial_amount >= 0),

    contribution_amount NUMERIC(12, 2)
        CONSTRAINT investments_contribution_amount_nonnegative
        CHECK (contribution_amount >= 0),

    contribution_frequency VARCHAR(20),
    contribution_day INTEGER,
    contribution_month INTEGER,

    term INTEGER,

    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    maturity_date DATE,

    maturity_value NUMERIC(12, 2),

    -- Latest estimated or manually updated investment value.
    current_value NUMERIC(12, 2),

    -- Date on which current_value was last updated.
    valuation_date DATE,

    -- MANUAL, ESTIMATED, etc.
    valuation_method VARCHAR(20) NOT NULL DEFAULT 'MANUAL',

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_investments_user_id
ON investments(user_id);


CREATE TABLE investment_withdrawals (
    id SERIAL PRIMARY KEY,

    investment_id INTEGER NOT NULL
        REFERENCES investments(id) ON DELETE CASCADE,

    withdrawal_date DATE NOT NULL,
    withdrawal_amount NUMERIC(12, 2) NOT NULL,
    reason VARCHAR(500),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_investment_withdrawals_investment_id
ON investment_withdrawals(investment_id);
