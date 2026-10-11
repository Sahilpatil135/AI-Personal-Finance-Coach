CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();

CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL,
    source VARCHAR NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR NOT NULL,
    description VARCHAR,
    payment_mode VARCHAR NOT NULL DEFAULT 'Online/UPI',
    date DATE DEFAULT CURRENT_DATE
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR NOT NULL DEFAULT 'Online/UPI';

CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    goal_name VARCHAR NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL,
    current_saved NUMERIC(12, 2) DEFAULT 0.00,
    deadline DATE,
    status VARCHAR DEFAULT 'In Progress'
);

CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    initial_amount NUMERIC(12, 2),
    contribution_amount NUMERIC(12, 2),
    contribution_frequency VARCHAR(20),
    contribution_day INTEGER,
    contribution_month INTEGER,
    term INTEGER,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    maturity_date DATE,
    maturity_value NUMERIC(12, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE investments ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE investments ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TABLE IF NOT EXISTS investment_withdrawals (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    withdrawal_date DATE NOT NULL,
    withdrawal_amount NUMERIC(12, 2) NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investment_withdrawals ALTER COLUMN created_at SET DEFAULT NOW();
