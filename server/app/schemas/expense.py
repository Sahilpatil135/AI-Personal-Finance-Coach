from pydantic import BaseModel
from datetime import date as date_type
from typing import Optional

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    payment_mode: str = "Online/UPI"
    date: Optional[date_type] = None

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    category: str
    description: Optional[str] = None
    payment_mode: str = "Online/UPI"
    date: Optional[date_type] = None

    class Config:
        form_attributes = True

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    payment_mode: Optional[str] = None
    date: Optional[date_type] = None

class ExpenseStats(BaseModel):
    total_expense: float
    month_total: float
    mom_growth: float
    primary_category: str
    category_count: int
    largest_expense: float

class MonthlyTrend(BaseModel):
    month: str
    amount: float

class CategoryDistribution(BaseModel):
    category: str
    amount: float
    percentage: float

class BudgetResponse(BaseModel):
    amount: float

class BudgetUpdate(BaseModel):
    amount: float

