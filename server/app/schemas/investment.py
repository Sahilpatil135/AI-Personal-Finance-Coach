from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, root_validator, validator


InvestmentStatus = Literal["ACTIVE", "COMPLETED", "WITHDRAWN"]


def _validate_investment_dates(values):
    start_date = values.get("start_date") or date.today()
    maturity_date = values.get("maturity_date")
    if maturity_date is not None and maturity_date < start_date:
        raise ValueError("maturity_date cannot be before start_date")
    return values


def _validate_contribution_fields(values, partial=False):
    amount = values.get("contribution_amount")
    frequency = values.get("contribution_frequency")
    day = values.get("contribution_day")
    month = values.get("contribution_month")

    if partial and not any(key in values for key in (
        "contribution_amount", "contribution_frequency", "contribution_day", "contribution_month"
    )):
        return values

    if amount is None and frequency is None and day is None and month is None:
        return values
    if amount is None or frequency is None or day is None:
        raise ValueError("Recurring contributions require amount, frequency, and contribution_day")
    if frequency == "YEARLY" and month is None:
        raise ValueError("YEARLY contributions require contribution_month")
    if frequency == "MONTHLY" and month is not None:
        raise ValueError("contribution_month is only valid for YEARLY contributions")
    return values


class InvestmentCreate(BaseModel):
    type: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=255)
    initial_amount: Optional[float] = Field(default=None, gt=0)
    contribution_amount: Optional[float] = Field(default=None, gt=0)
    contribution_frequency: Optional[Literal["MONTHLY", "YEARLY"]] = None
    contribution_day: Optional[int] = Field(default=None, ge=1, le=31)
    contribution_month: Optional[int] = Field(default=None, ge=1, le=12)
    term: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[date] = None
    maturity_date: Optional[date] = None
    maturity_value: Optional[float] = Field(default=None, gt=0)
    status: InvestmentStatus = "ACTIVE"
    goal_id: Optional[int] = Field(default=None, gt=0)

    @validator("type")
    def normalize_type(cls, value):
        return value.strip().upper()

    @root_validator(skip_on_failure=True)
    def validate_fields(cls, values):
        _validate_investment_dates(values)
        return _validate_contribution_fields(values)


class InvestmentUpdate(BaseModel):
    type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    initial_amount: Optional[float] = Field(default=None, gt=0)
    contribution_amount: Optional[float] = Field(default=None, gt=0)
    contribution_frequency: Optional[Literal["MONTHLY", "YEARLY"]] = None
    contribution_day: Optional[int] = Field(default=None, ge=1, le=31)
    contribution_month: Optional[int] = Field(default=None, ge=1, le=12)
    term: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[date] = None
    maturity_date: Optional[date] = None
    maturity_value: Optional[float] = Field(default=None, gt=0)
    status: Optional[InvestmentStatus] = None
    goal_id: Optional[int] = Field(default=None, gt=0)

    @validator("type")
    def normalize_type(cls, value):
        return value.strip().upper() if value is not None else value

    @root_validator(skip_on_failure=True)
    def validate_fields(cls, values):
        if values.get("start_date") and values.get("maturity_date"):
            _validate_investment_dates(values)
        return values


class WithdrawalCreate(BaseModel):
    withdrawal_date: date
    withdrawal_amount: float = Field(gt=0)
    reason: Optional[str] = Field(default=None, max_length=500)
    mark_withdrawn: bool = False


class WithdrawalUpdate(BaseModel):
    withdrawal_date: Optional[date] = None
    withdrawal_amount: Optional[float] = Field(default=None, gt=0)
    reason: Optional[str] = Field(default=None, max_length=500)


class WithdrawalResponse(BaseModel):
    id: int
    investment_id: int
    withdrawal_date: date
    withdrawal_amount: float
    reason: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvestmentResponse(BaseModel):
    id: int
    user_id: int
    goal_id: Optional[int] = None
    type: str
    title: str
    initial_amount: Optional[float] = None
    contribution_amount: Optional[float] = None
    contribution_frequency: Optional[str] = None
    contribution_day: Optional[int] = None
    contribution_month: Optional[int] = None
    term: Optional[int] = None
    start_date: date
    maturity_date: Optional[date] = None
    maturity_value: Optional[float] = None
    status: InvestmentStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    withdrawals: list[WithdrawalResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class InvestmentListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    records: list[InvestmentResponse]


class InvestmentSummaryResponse(BaseModel):
    total_investments: int
    active_investments: int
    total_initial_amount: float
    total_recurring_contribution_amount: float
    total_expected_maturity_value: float
    upcoming_maturities: int
    upcoming_contributions: int


class UpcomingMaturityResponse(InvestmentResponse):
    pass


class UpcomingContributionResponse(BaseModel):
    investment_id: int
    investment_title: str
    investment_type: str
    contribution_amount: float
    contribution_frequency: str
    next_contribution_date: date


class InvestmentTypeDistribution(BaseModel):
    type: str
    amount: float
    count: int
    percentage: float