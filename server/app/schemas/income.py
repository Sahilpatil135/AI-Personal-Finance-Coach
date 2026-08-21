from pydantic import BaseModel
from datetime import date as date_type
from typing import Optional

class IncomeCreate(BaseModel):
    amount: float
    source: str
    date: Optional[date_type] = None
    description: Optional[str] = None

class IncomeResponse(BaseModel):
    id: int
    amount: float
    source: str
    date: Optional[date_type] = None
    description: Optional[str] = None

    class Config:
        form_attributes = True

class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    source: Optional[str] = None
    date: Optional[date_type] = None
    description: Optional[str] = None

class IncomeStats(BaseModel):
    total_income: float
    month_total: float
    mom_growth: float
    primary_source: str
    source_count: int

class MonthlyTrend(BaseModel):
    month: str
    amount: float

class SourceDistribution(BaseModel):
    source: str
    amount: float
    percentage: float