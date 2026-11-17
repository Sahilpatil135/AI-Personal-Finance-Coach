ALTER TABLE public.investment_withdrawals
    ADD COLUMN transaction_type VARCHAR(20) NOT NULL DEFAULT 'WITHDRAWAL',
    ADD COLUMN withdrawal_type VARCHAR(20),
    ADD COLUMN actual_received_amount NUMERIC(12, 2),
    ADD COLUMN allocation_type VARCHAR(30),
    ADD COLUMN goal_id INTEGER REFERENCES public.goals(id) ON DELETE SET NULL,
    ADD COLUMN new_investment_id INTEGER REFERENCES public.investments(id) ON DELETE RESTRICT;

UPDATE public.investment_withdrawals
SET actual_received_amount = withdrawal_amount;

ALTER TABLE public.investment_withdrawals
    ALTER COLUMN actual_received_amount SET NOT NULL,
    ADD CONSTRAINT investment_withdrawals_transaction_type_valid
        CHECK (transaction_type IN ('WITHDRAWAL', 'MATURITY')),
    ADD CONSTRAINT investment_withdrawals_withdrawal_type_valid
        CHECK (
            (transaction_type = 'WITHDRAWAL'
                AND (withdrawal_type IS NULL OR withdrawal_type IN ('PARTIAL', 'FULL')))
            OR (transaction_type = 'MATURITY' AND withdrawal_type IS NULL)
        ),
    ADD CONSTRAINT investment_withdrawals_amounts_positive
        CHECK (withdrawal_amount > 0 AND actual_received_amount > 0),
    ADD CONSTRAINT investment_withdrawals_allocation_valid
        CHECK (
            (allocation_type IS NULL AND goal_id IS NULL AND new_investment_id IS NULL)
            OR (allocation_type = 'ACCOUNT_BALANCE' AND goal_id IS NULL AND new_investment_id IS NULL)
            OR (allocation_type = 'GOAL' AND new_investment_id IS NULL)
            OR (allocation_type = 'NEW_INVESTMENT' AND goal_id IS NULL AND new_investment_id IS NOT NULL)
        );

CREATE UNIQUE INDEX ix_investment_withdrawals_single_maturity
    ON public.investment_withdrawals(investment_id)
    WHERE transaction_type = 'MATURITY';

CREATE INDEX ix_investment_withdrawals_allocation_type
    ON public.investment_withdrawals(allocation_type);
