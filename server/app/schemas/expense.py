from pydantic import BaseModel
from datetime import date as date_type
from typing import Optional

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[date_type] = None

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[date_type] = None

    class Config:
        form_attributes = True

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[date_type] = None

class ExpenseStats(BaseModel):
    total_expense: float
    month_total: float
    mom_growth: float
    primary_category: str
    category_count: int

class MonthlyTrend(BaseModel):
    month: str
    amount: float

class CategoryDistribution(BaseModel):
    category: str
    amount: float
    percentage: float

