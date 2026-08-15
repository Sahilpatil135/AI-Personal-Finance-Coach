from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class IncomeCreate(BaseModel):
    amount: float
    source: str
    date: Optional[datetime] = None

class IncomeResponse(BaseModel):
    id: int
    amount: float
    source: str
    date: Optional[datetime] = None

    class Config:
        form_attributes = True

class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    source: Optional[str] = None
    date: Optional[datetime] = None