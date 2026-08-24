from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException, status
from app.models.income import Income
from app.schemas.income import IncomeCreate, IncomeUpdate
from datetime import date, timedelta
from calendar import monthrange

def create_income(db: Session, income_data: IncomeCreate, user_id: int) -> Income:
    new_income = Income(
        amount=income_data.amount,
        source=income_data.source,
        date=income_data.date,
        description=income_data.description,
        user_id=user_id
    )
    db.add(new_income)
    db.commit()
    db.refresh(new_income)
    return new_income

def get_user_incomes(db: Session, user_id: int) -> list[Income]:
    return db.query(Income).filter(Income.user_id == user_id).order_by(Income.date.desc()).all()

def get_income_by_id(db: Session, income_id: int, user_id: int) -> Income:
    income = db.query(Income).filter(Income.id == income_id, Income.user_id == user_id).first()
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income record not found."
        )
    return income

def update_income(db: Session, income_id: int, user_id: int, income_data: IncomeUpdate) -> Income:
    income = get_income_by_id(db=db, income_id=income_id, user_id=user_id)
    
    if income_data.amount is not None:
        income.amount = income_data.amount
    if income_data.source is not None:
        income.source = income_data.source
    if income_data.date is not None:
        income.date = income_data.date
    if income_data.description is not None:
        income.description = income_data.description

    db.commit()
    db.refresh(income)
    return income

def delete_income(db: Session, income_id: int, user_id: int) -> None:
    income = get_income_by_id(db= db, income_id=income_id, user_id=user_id)    
    db.delete(income)
    db.commit()

def get_income_stats(db: Session, user_id: int):
    """Get income statistics including total, monthly total, and primary source"""
    today = date.today()
    current_month_start = date(today.year, today.month, 1)
    
    # Total income
    total_income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == user_id
    ).scalar() or 0.0
    
    # Current month total
    month_total = db.query(func.sum(Income.amount)).filter(
        and_(
            Income.user_id == user_id,
            Income.date >= current_month_start,
            Income.date <= today
        )
    ).scalar() or 0.0
    
    # Previous month total
    prev_month_start = current_month_start - timedelta(days=1)
    prev_month_start = date(prev_month_start.year, prev_month_start.month, 1)
    prev_month_end = current_month_start - timedelta(days=1)
    
    prev_month_total = db.query(func.sum(Income.amount)).filter(
        and_(
            Income.user_id == user_id,
            Income.date >= prev_month_start,
            Income.date <= prev_month_end
        )
    ).scalar() or 0.0
    
    # Month-over-month growth
    mom_growth = 0.0
    if prev_month_total > 0:
        mom_growth = ((month_total - prev_month_total) / prev_month_total) * 100
    
    # Primary income source
    primary_source = db.query(Income.source, func.sum(Income.amount)).filter(
        Income.user_id == user_id
    ).group_by(Income.source).order_by(func.sum(Income.amount).desc()).first()
    
    primary_source_name = primary_source[0] if primary_source else "N/A"
    
    # Count unique sources
    source_count = db.query(func.count(func.distinct(Income.source))).filter(
        Income.user_id == user_id
    ).scalar() or 0
    
    return {
        "total_income": float(total_income),
        "month_total": float(month_total),
        "mom_growth": float(mom_growth),
        "primary_source": primary_source_name,
        "source_count": source_count
    }

def get_monthly_trends(db: Session, user_id: int, months: int = 12):
    """Get monthly income trends for the last N months"""
    today = date.today()
    trends = []

    current_month_index = today.year * 12 + today.month - 1

    for i in range(months - 1, -1, -1):
        # Calculate first and last day of the month
        # first_day = today - timedelta(days=today.day + 30*i - 1)
        # first_day = date(first_day.year, first_day.month, 1)
        # last_day = date(first_day.year, first_day.month, monthrange(first_day.year, first_day.month)[1])
        
        month_index = current_month_index - i

        year = month_index // 12
        month = month_index % 12 + 1

        # First day of the month
        first_day = date(year, month, 1)

        # Last day of the month
        last_day = date(
            year,
            month,
            monthrange(year, month)[1]
        )

        # Don't include future dates in the current month
        if year == today.year and month == today.month:
            last_day = today

        monthly_total = db.query(func.sum(Income.amount)).filter(
            and_(
                Income.user_id == user_id,
                Income.date >= first_day,
                Income.date <= last_day
            )
        ).scalar() or 0.0
        
        trends.append({
            "month": first_day.strftime("%b %y"),
            "amount": float(monthly_total)
        })
    
    return trends

def get_source_distribution(db: Session, user_id: int):
    """Get income distribution by source"""
    results = db.query(
        Income.source,
        func.sum(Income.amount).label('total')
    ).filter(Income.user_id == user_id).group_by(Income.source).all()
    
    total = sum(r[1] for r in results)
    distribution = []
    
    for source, amount in results:
        distribution.append({
            "source": source,
            "amount": float(amount),
            "percentage": float((amount / total * 100) if total > 0 else 0)
        })
    
    return sorted(distribution, key=lambda x: x['amount'], reverse=True)

def get_paginated_incomes(db: Session, user_id: int, skip: int = 0, limit: int = 10):
    """Get paginated income records with sorting"""
    total = db.query(func.count(Income.id)).filter(Income.user_id == user_id).scalar()
    records = db.query(Income).filter(
        Income.user_id == user_id
    ).order_by(Income.date.desc()).offset(skip).limit(limit).all()
    
    return {"total": total, "records": records}