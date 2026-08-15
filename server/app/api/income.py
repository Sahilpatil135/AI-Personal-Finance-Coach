from fastapi import APIRouter, Depends, status
from app.models.user import User
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse
from app.services.income_service import create_income, get_user_incomes, update_income, delete_income
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/income", tags=["Income"])

@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_new_income(income_data: IncomeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_income(db=db, income_data=income_data, user_id=current_user.id)

@router.get("/", response_model=list[IncomeResponse], status_code=status.HTTP_200_OK)
def get_incomes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_incomes(db=db, user_id=current_user.id)

@router.put("/{income_id}", response_model=IncomeResponse, status_code=status.HTTP_200_OK)
def update_existing_income(income_id: int, income_data: IncomeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_income(db=db, income_id=income_id, user_id=current_user.id, income_data=income_data)

@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_income(income_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    delete_income(db=db, income_id=income_id, user_id=current_user.id)