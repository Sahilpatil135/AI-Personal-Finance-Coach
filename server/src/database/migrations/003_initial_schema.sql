CREATE TABLE investment_contributions (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER NOT NULL
        REFERENCES investments(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    scheduled_date DATE NOT NULL,
    contribution_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
        CHECK (status IN ('COMPLETED')),
    already_recorded_as_expense BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT investment_contributions_schedule_unique
        UNIQUE (investment_id, scheduled_date)
);

CREATE INDEX ix_investment_contributions_date
ON investment_contributions(contribution_date);