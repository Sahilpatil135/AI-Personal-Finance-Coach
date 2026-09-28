from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException, status
from app.models.expense import Expense
from app.models.budget import Budget
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from datetime import date, timedelta
from calendar import monthrange

def create_expense(db: Session, expense_data: ExpenseCreate, user_id: int) -> Expense:
    new_expense = Expense(
        amount=expense_data.amount,
        category=expense_data.category,
        description=expense_data.description,
        payment_mode=expense_data.payment_mode,
        date=expense_data.date,
        user_id=user_id
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

def get_user_expenses(db: Session, user_id: int) -> list[Expense]:
    return db.query(Expense).filter(Expense.user_id == user_id).order_by(Expense.date.desc()).all()

def get_expense_by_id(db: Session, expense_id: int, user_id: int) -> Expense:
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found."
        )
    return expense

def update_expense(db: Session, expense_id: int, user_id: int, expense_data: ExpenseUpdate) -> Expense:
    expense = get_expense_by_id(db=db, expense_id=expense_id, user_id=user_id)
    
    if expense_data.amount is not None:
        expense.amount = expense_data.amount
    if expense_data.category is not None:
        expense.category = expense_data.category
    if expense_data.description is not None:
        expense.description = expense_data.description
    if expense_data.payment_mode is not None:
        expense.payment_mode = expense_data.payment_mode
    if expense_data.date is not None:
        expense.date = expense_data.date

    db.commit()
    db.refresh(expense)
    return expense

def delete_expense(db: Session, expense_id: int, user_id: int) -> None:
    expense = get_expense_by_id(db=db, expense_id=expense_id, user_id=user_id)    
    db.delete(expense)
    db.commit()

def get_expense_stats(db: Session, user_id: int):
    """Get expense statistics including total, monthly total, and primary category"""
    today = date.today()
    current_month_start = date(today.year, today.month, 1)
    
    year_start = date(today.year, 1, 1)
    total_expense = db.query(func.sum(Expense.amount)).filter(Expense.user_id == user_id).scalar() or 0.0
    
    # Monthly total expense
    month_total = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.date >= current_month_start,
        Expense.date <= today
    ).scalar() or 0.0

    largest_expense = db.query(func.max(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.date >= current_month_start,
        Expense.date <= today
    ).scalar() or 0.0
    
    # Month-over-month growth
    prev_month_start = current_month_start - timedelta(days=1)
    prev_month_start = date(prev_month_start.year, prev_month_start.month, 1)
    prev_month_end = current_month_start - timedelta(days=1)
    
    prev_month_total = db.query(func.sum(Expense.amount)).filter(
        and_(
            Expense.user_id == user_id,
            Expense.date >= prev_month_start,
            Expense.date <= prev_month_end
        )
    ).scalar() or 0.0
    
    mom_growth = ((month_total - prev_month_total) / prev_month_total * 100) if prev_month_total > 0 else 0.0
    
    # Primary category
    primary_category_data = db.query(Expense.category, func.sum(Expense.amount)).filter(
        Expense.user_id == user_id
    ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).first()
    
    primary_category = primary_category_data[0] if primary_category_data else "N/A"
    
    # Unique category count
    category_count = db.query(func.count(func.distinct(Expense.category))).filter(
        Expense.user_id == user_id
    ).scalar() or 0
    
    return {
        "total_expense": float(db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == user_id, Expense.date >= year_start, Expense.date <= today
        ).scalar() or 0.0),
        "month_total": float(month_total),
        "mom_growth": float(mom_growth),
        "primary_category": primary_category,
        "category_count": category_count,
        "largest_expense": float(largest_expense)
    }

def get_expense_trends(db: Session, user_id: int, timeframe: str = "year"):
    if timeframe == "month":
        today = date.today()
        first_day = date(today.year, today.month, 1)
        return [
            {"month": day.strftime("%d %b"), "amount": float(db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == user_id, Expense.date == day
            ).scalar() or 0.0)}
            for day in (first_day + timedelta(days=index) for index in range((today - first_day).days + 1))
        ]
    return get_monthly_expense_trends(db, user_id, 12)

def get_monthly_expense_trends(db: Session, user_id: int, months: int = 12):
    """Get monthly expense trends for the past N months."""
    today = date.today()
    trends = []

    current_month_index = today.year * 12 + today.month - 1 
    
    for i in range(months - 1, -1, -1):
        # month_start = date(today.year, today.month, 1) - timedelta(days=i*30)
        # month_end = date(month_start.year, month_start.month, monthrange(month_start.year, month_start.month)[1])
        
        month_index = current_month_index - i

        year = month_index // 12
        month = month_index % 12 + 1

        # First day of the month
        first_day = date(year, month, 1)

        # Last day of the month
        last_day = date(year, month, monthrange(year, month)[1])

        if year == today.year and month == today.month:
            last_day = today

        monthly_total = db.query(func.sum(Expense.amount)).filter(
            and_(
                Expense.user_id == user_id,
                Expense.date >= first_day,
                Expense.date <= last_day
            )            
        ).scalar() or 0.0
        
        trends.append({
            "month": first_day.strftime("%b %y"),
            "amount": float(monthly_total)
        })
    
    return trends

def get_category_distribution(db: Session, user_id: int, timeframe: str = "year"):
    """Get distribution of expenses by category."""
    start_date = None
    if timeframe == "month":
        today = date.today()
        start_date = date(today.year, today.month, 1)
    query = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(Expense.user_id == user_id)
    if start_date:
        query = query.filter(Expense.date >= start_date, Expense.date <= date.today())
    results = query.group_by(Expense.category).all()

    total = sum(r[1] for r in results)
    distribution = []

    for category, amount in results:
        distribution.append({
            "category": category,
            "amount": float(amount),
            "percentage": float((amount / total * 100) if total > 0 else 0)
        })

    return sorted(distribution, key=lambda x: x['amount'], reverse=True)

def get_budget(db: Session, user_id: int):
    budget = db.query(Budget).filter(Budget.user_id == user_id).first()
    return {"amount": float(budget.amount) if budget else 0.0}

def set_budget(db: Session, user_id: int, amount: float):
    budget = db.query(Budget).filter(Budget.user_id == user_id).first()
    if budget:
        budget.amount = amount
    else:
        db.add(Budget(user_id=user_id, amount=amount))
    db.commit()
    return get_budget(db, user_id)

def get_paginated_expenses(db: Session, user_id: int, skip: int = 0, limit: int = 10):
    """Get sorted paginated list of expenses for a user."""
    total = db.query(func.count(Expense.id)).filter(Expense.user_id == user_id).scalar()
    records = db.query(Expense).filter(
        Expense.user_id == user_id
    ).order_by(Expense.date.desc()).offset(skip).limit(limit).all()
    
    return {"total": total, "records": records}