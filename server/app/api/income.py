from fastapi import APIRouter, Depends, status, Query
from app.models.user import User
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse, IncomeStats, MonthlyTrend, SourceDistribution
from app.services.income_service import (
    create_income, get_user_incomes, update_income, delete_income,
    get_income_stats, get_monthly_trends, get_source_distribution, get_paginated_incomes
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/income", tags=["Income"])

@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_new_income(income_data: IncomeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_income(db=db, income_data=income_data, user_id=current_user.id)

@router.get("/", response_model=list[IncomeResponse], status_code=status.HTTP_200_OK)
def get_incomes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_incomes(db=db, user_id=current_user.id)

@router.get("/stats/overview", response_model=IncomeStats, status_code=status.HTTP_200_OK)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_income_stats(db=db, user_id=current_user.id)

@router.get("/analytics/monthly-trends", response_model=list[MonthlyTrend], status_code=status.HTTP_200_OK)
def get_monthly_trends_endpoint(
    months: int = Query(12, ge=1, le=36),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return get_monthly_trends(db=db, user_id=current_user.id, months=months)

@router.get("/analytics/source-distribution", response_model=list[SourceDistribution], status_code=status.HTTP_200_OK)
def get_distribution(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_source_distribution(db=db, user_id=current_user.id)

@router.get("/paginated", status_code=status.HTTP_200_OK)
def get_paginated(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return get_paginated_incomes(db=db, user_id=current_user.id, skip=skip, limit=limit)

@router.put("/{income_id}", response_model=IncomeResponse, status_code=status.HTTP_200_OK)
def update_existing_income(income_id: int, income_data: IncomeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_income(db=db, income_id=income_id, user_id=current_user.id, income_data=income_data)

@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_income(income_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    delete_income(db=db, income_id=income_id, user_id=current_user.id)