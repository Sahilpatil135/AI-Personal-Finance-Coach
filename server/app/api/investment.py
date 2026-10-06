from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.database import get_db
from app.models.user import User
from app.schemas.investment import (
    InvestmentCreate,
    InvestmentListResponse,
    InvestmentResponse,
    InvestmentSummaryResponse,
    InvestmentTypeDistribution,
    InvestmentUpdate,
    UpcomingContributionResponse,
    UpcomingMaturityResponse,
    WithdrawalCreate,
    WithdrawalResponse,
    WithdrawalUpdate,
)
from app.services.investment_service import (
    create_investment,
    create_withdrawal,
    delete_investment,
    delete_withdrawal,
    get_investment,
    get_investment_summary,
    get_investment_type_distribution,
    get_paginated_investments,
    get_upcoming_contributions,
    get_upcoming_maturities,
    get_withdrawal,
    get_withdrawals,
    update_investment,
    update_withdrawal,
)

router = APIRouter(prefix="/api/investments", tags=["Investments"])


@router.post("", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
def create_new_investment(
    investment_data: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_investment(db, investment_data, current_user.id)


@router.get("", response_model=InvestmentListResponse)
def list_investments(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    investment_type: str | None = Query(default=None, alias="type"),
    investment_status: str | None = Query(default=None, alias="status", pattern="^(ACTIVE|COMPLETED|WITHDRAWN|active|completed|withdrawn)$"),
    goal_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_paginated_investments(
        db, current_user.id, skip, limit, investment_type, investment_status, goal_id
    )


@router.get("/summary", response_model=InvestmentSummaryResponse)
def investment_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_investment_summary(db, current_user.id)


@router.get("/analytics/type-distribution", response_model=list[InvestmentTypeDistribution])
def investment_type_distribution(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return get_investment_type_distribution(db, current_user.id)


@router.get("/upcoming-maturities", response_model=list[UpcomingMaturityResponse])
def upcoming_maturities(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_upcoming_maturities(db, current_user.id, days)


@router.get("/upcoming-contributions", response_model=list[UpcomingContributionResponse])
def upcoming_contributions(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_upcoming_contributions(db, current_user.id, days)


@router.get("/{investment_id}", response_model=InvestmentResponse)
def investment_details(
    investment_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_investment(db, investment_id, current_user.id)


@router.put("/{investment_id}", response_model=InvestmentResponse)
def update_existing_investment(
    investment_data: InvestmentUpdate,
    investment_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_investment(db, investment_id, current_user.id, investment_data)


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_investment(
    investment_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_investment(db, investment_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{investment_id}/withdrawals", response_model=WithdrawalResponse, status_code=status.HTTP_201_CREATED)
def add_withdrawal(
    withdrawal_data: WithdrawalCreate,
    investment_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_withdrawal(db, investment_id, current_user.id, withdrawal_data)


@router.get("/{investment_id}/withdrawals", response_model=list[WithdrawalResponse])
def list_withdrawals(
    investment_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_withdrawals(db, investment_id, current_user.id)


@router.get("/{investment_id}/withdrawals/{withdrawal_id}", response_model=WithdrawalResponse)
def withdrawal_details(
    investment_id: int = Path(gt=0),
    withdrawal_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_withdrawal(db, investment_id, withdrawal_id, current_user.id)


@router.put("/{investment_id}/withdrawals/{withdrawal_id}", response_model=WithdrawalResponse)
def update_existing_withdrawal(
    withdrawal_data: WithdrawalUpdate,
    investment_id: int = Path(gt=0),
    withdrawal_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_withdrawal(db, investment_id, withdrawal_id, current_user.id, withdrawal_data)


@router.delete("/{investment_id}/withdrawals/{withdrawal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_withdrawal(
    investment_id: int = Path(gt=0),
    withdrawal_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_withdrawal(db, investment_id, withdrawal_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)