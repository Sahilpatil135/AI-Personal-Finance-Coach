from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.income import Income
from app.schemas.income import IncomeCreate, IncomeUpdate

def create_income(db: Session, income_data: IncomeCreate, user_id: int) -> Income:
    new_income = Income(
        amount=income_data.amount,
        source=income_data.source,
        date=income_data.date,
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

    db.commit()
    db.refresh(income)
    return income

def delete_income(db: Session, income_id: int, user_id: int) -> None:
    income = get_income_by_id(db= db, income_id=income_id, user_id=user_id)    
    db.delete(income)
    db.commit()