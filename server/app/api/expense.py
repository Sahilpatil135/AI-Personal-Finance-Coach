from fastapi import APIRouter, Depends, Query, status
from app.models.user import User
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseStats, MonthlyTrend, CategoryDistribution
from app.services.expense_service import (
    create_expense, get_user_expenses, update_expense, delete_expense,
    get_expense_stats, get_monthly_expense_trends, get_category_distribution, get_paginated_expenses
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/expense", tags=["Expense"])

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_new_expense(expense_data: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_expense(db=db, expense_data=expense_data, user_id=current_user.id)

@router.get("/", response_model=list[ExpenseResponse], status_code=status.HTTP_200_OK)
def get_expenses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_expenses(db=db, user_id=current_user.id)

@router.get("/stats/overview", response_model=ExpenseStats, status_code=status.HTTP_200_OK)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_expense_stats(db=db, user_id=current_user.id)

@router.get("/analytics/monthly-trends", response_model=list[MonthlyTrend], status_code=status.HTTP_200_OK)
def get_monthly_trends_endpoint(
    months: int = Query(12, ge=1, le=36),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return get_monthly_expense_trends(db=db, user_id=current_user.id, months=months)

@router.get("/analytics/category-distribution", response_model=list[CategoryDistribution], status_code=status.HTTP_200_OK)
def get_distribution(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_category_distribution(db=db, user_id=current_user.id)

@router.get("/paginated", status_code=status.HTTP_200_OK)
def get_paginated(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return get_paginated_expenses(db=db, user_id=current_user.id, skip=skip, limit=limit)

@router.put("/{expense_id}", response_model=ExpenseResponse, status_code=status.HTTP_200_OK)
def update_existing_expense(expense_id: int, expense_data: ExpenseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_expense(db=db, expense_id=expense_id, user_id=current_user.id, expense_data=expense_data)

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    delete_expense(db=db, expense_id=expense_id, user_id=current_user.id)