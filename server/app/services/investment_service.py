from calendar import monthrange
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.models.investment import Investment
from app.models.investment_withdrawal import InvestmentWithdrawal
from app.schemas.investment import InvestmentCreate, InvestmentUpdate, WithdrawalCreate, WithdrawalUpdate


def _investment_or_404(db: Session, investment_id: int, user_id: int) -> Investment:
    investment = db.query(Investment).filter(
        Investment.id == investment_id,
        Investment.user_id == user_id,
    ).first()
    if investment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")
    return investment


def _validate_goal(db: Session, goal_id: int | None, user_id: int) -> None:
    if goal_id is not None and db.query(Goal.id).filter(
        Goal.id == goal_id,
        Goal.user_id == user_id,
    ).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")


def _validate_dates(start_date: date, maturity_date: date | None) -> None:
    if maturity_date is not None and maturity_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="maturity_date cannot be before start_date",
        )


def _validate_contributions(amount, frequency, day, month) -> None:
    provided = (amount is not None, frequency is not None, day is not None, month is not None)
    if not any(provided):
        return
    if amount is None or frequency is None or day is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Recurring contributions require amount, frequency, and contribution_day",
        )
    if frequency == "YEARLY" and month is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="YEARLY contributions require contribution_month",
        )
    if frequency == "MONTHLY" and month is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="contribution_month is only valid for YEARLY contributions",
        )


def _next_contribution_date(investment: Investment, today: date) -> date | None:
    day = investment.contribution_day
    if day is None or investment.contribution_frequency is None:
        return None
    eligible_from = max(today, investment.start_date)

    if investment.contribution_frequency == "MONTHLY":
        year, month = eligible_from.year, eligible_from.month
        while True:
            scheduled = date(year, month, min(day, monthrange(year, month)[1]))
            if scheduled >= eligible_from:
                return scheduled
            month += 1
            if month == 13:
                year += 1
                month = 1

    if investment.contribution_frequency == "YEARLY" and investment.contribution_month:
        year = eligible_from.year
        month = investment.contribution_month
        scheduled = date(year, month, min(day, monthrange(year, month)[1]))
        if scheduled < eligible_from:
            year += 1
            scheduled = date(year, month, min(day, monthrange(year, month)[1]))
        return scheduled
    return None


def create_investment(db: Session, investment_data: InvestmentCreate, user_id: int) -> Investment:
    values = investment_data.dict(exclude_unset=True)
    _validate_goal(db, values.get("goal_id"), user_id)
    values["start_date"] = values.get("start_date") or date.today()
    _validate_dates(values["start_date"], values.get("maturity_date"))
    _validate_contributions(
        values.get("contribution_amount"),
        values.get("contribution_frequency"),
        values.get("contribution_day"),
        values.get("contribution_month"),
    )
    investment = Investment(user_id=user_id, **values)
    db.add(investment)
    db.commit()
    db.refresh(investment)
    return investment


def get_investment(db: Session, investment_id: int, user_id: int) -> Investment:
    return _investment_or_404(db, investment_id, user_id)


def get_paginated_investments(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 10,
    investment_type: str | None = None,
    investment_status: str | None = None,
    goal_id: int | None = None,
):
    query = db.query(Investment).filter(Investment.user_id == user_id)
    if investment_type:
        query = query.filter(Investment.type == investment_type.upper())
    if investment_status:
        query = query.filter(Investment.status == investment_status.upper())
    if goal_id is not None:
        query = query.filter(Investment.goal_id == goal_id)
    total = query.count()
    records = query.order_by(Investment.created_at.desc(), Investment.id.desc()).offset(skip).limit(limit).all()
    return {"total": total, "skip": skip, "limit": limit, "records": records}


def update_investment(
    db: Session,
    investment_id: int,
    user_id: int,
    investment_data: InvestmentUpdate,
) -> Investment:
    investment = _investment_or_404(db, investment_id, user_id)
    values = investment_data.dict(exclude_unset=True)
    for key in ("type", "title", "initial_amount", "start_date", "status"):
        if key in values and values[key] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{key} cannot be null",
            )
    _validate_goal(db, values.get("goal_id", investment.goal_id), user_id)

    final_start_date = values.get("start_date", investment.start_date)
    final_maturity_date = values.get("maturity_date", investment.maturity_date)
    _validate_dates(final_start_date, final_maturity_date)
    _validate_contributions(
        values.get("contribution_amount", investment.contribution_amount),
        values.get("contribution_frequency", investment.contribution_frequency),
        values.get("contribution_day", investment.contribution_day),
        values.get("contribution_month", investment.contribution_month),
    )
    for key, value in values.items():
        setattr(investment, key, value)
    db.commit()
    db.refresh(investment)
    return investment


def delete_investment(db: Session, investment_id: int, user_id: int) -> None:
    investment = _investment_or_404(db, investment_id, user_id)
    db.delete(investment)
    db.commit()


def get_upcoming_maturities(db: Session, user_id: int, days: int = 30):
    today = date.today()
    return db.query(Investment).filter(
        Investment.user_id == user_id,
        Investment.status == "ACTIVE",
        Investment.maturity_date >= today,
        Investment.maturity_date <= today + timedelta(days=days),
    ).order_by(Investment.maturity_date.asc()).all()


def get_upcoming_contributions(db: Session, user_id: int, days: int = 30):
    today = date.today()
    end_date = today + timedelta(days=days)
    investments = db.query(Investment).filter(
        Investment.user_id == user_id,
        Investment.status == "ACTIVE",
        Investment.contribution_amount.isnot(None),
    ).all()
    upcoming = []
    for investment in investments:
        next_date = _next_contribution_date(investment, today)
        if next_date is not None and next_date <= end_date:
            upcoming.append({
                "investment_id": investment.id,
                "investment_title": investment.title,
                "investment_type": investment.type,
                "contribution_amount": investment.contribution_amount,
                "contribution_frequency": investment.contribution_frequency,
                "next_contribution_date": next_date,
            })
    return sorted(upcoming, key=lambda item: item["next_contribution_date"])


def get_investment_summary(db: Session, user_id: int):
    investments = db.query(Investment).filter(Investment.user_id == user_id).all()
    return {
        "total_investments": len(investments),
        "active_investments": sum(item.status == "ACTIVE" for item in investments),
        "total_initial_amount": float(sum((item.initial_amount or 0) for item in investments)),
        "total_recurring_contribution_amount": float(sum(
            (item.contribution_amount or 0) for item in investments
        )),
        "total_expected_maturity_value": float(sum(
            (item.maturity_value or 0) for item in investments
        )),
        "upcoming_maturities": len(get_upcoming_maturities(db, user_id)),
        "upcoming_contributions": len(get_upcoming_contributions(db, user_id)),
    }


# def get_investment_type_distribution(db: Session, user_id: int):
#     results = db.query(
#         Investment.type,
#         func.sum(Investment.initial_amount).label("amount"),
#         func.count(Investment.id).label("investment_count"),
#     ).filter(Investment.user_id == user_id).group_by(Investment.type).all()
#     total_amount = sum((row.amount or 0) for row in results)
#     return [
#         {
#             "type": row.type,
#             "amount": float(row.amount or 0),
#             "count": row.investment_count,
#             "percentage": float((row.amount or 0) / total_amount * 100) if total_amount else 0.0,
#         }
#         for row in results
#     ]

def get_investment_type_distribution(db: Session, user_id: int):

    investments = (
        db.query(Investment)
        .filter(Investment.user_id == user_id)
        .all()
    )

    distribution = {}

    for investment in investments:

        if investment.type == "FD":
            principal = investment.initial_amount or 0

        elif investment.type == "RD":
            if investment.contribution_frequency == "MONTHLY":
                principal = (
                    (investment.contribution_amount or 0)
                    * (investment.term or 0)
                )
            else:
                principal = 0

        else:
            # Handle SIP, stocks, mutual funds, gold, etc. later
            principal = investment.initial_amount or 0

        if investment.type not in distribution:
            distribution[investment.type] = {
                "amount": 0,
                "count": 0
            }

        distribution[investment.type]["amount"] += principal
        distribution[investment.type]["count"] += 1

    total_amount = sum(
        item["amount"]
        for item in distribution.values()
    )

    return [
        {
            "type": investment_type,
            "amount": round(data["amount"], 2),
            "count": data["count"],
            "percentage": round(
                (data["amount"] / total_amount * 100)
                if total_amount else 0,
                2
            )
        }
        for investment_type, data in distribution.items()
    ]


def _withdrawal_or_404(investment: Investment, withdrawal_id: int) -> InvestmentWithdrawal:
    withdrawal = next((item for item in investment.withdrawals if item.id == withdrawal_id), None)
    if withdrawal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")
    return withdrawal


def create_withdrawal(
    db: Session,
    investment_id: int,
    user_id: int,
    withdrawal_data: WithdrawalCreate,
) -> InvestmentWithdrawal:
    investment = _investment_or_404(db, investment_id, user_id)
    values = withdrawal_data.dict(exclude={"mark_withdrawn"})
    if values["withdrawal_date"] < investment.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="withdrawal_date cannot be before start_date",
        )
    withdrawal = InvestmentWithdrawal(investment_id=investment.id, **values)
    db.add(withdrawal)
    if withdrawal_data.mark_withdrawn:
        investment.status = "WITHDRAWN"
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


def get_withdrawals(db: Session, investment_id: int, user_id: int):
    investment = _investment_or_404(db, investment_id, user_id)
    return sorted(investment.withdrawals, key=lambda item: (item.withdrawal_date, item.id))


def get_withdrawal(db: Session, investment_id: int, withdrawal_id: int, user_id: int):
    investment = _investment_or_404(db, investment_id, user_id)
    return _withdrawal_or_404(investment, withdrawal_id)


def update_withdrawal(
    db: Session,
    investment_id: int,
    withdrawal_id: int,
    user_id: int,
    withdrawal_data: WithdrawalUpdate,
) -> InvestmentWithdrawal:
    investment = _investment_or_404(db, investment_id, user_id)
    withdrawal = _withdrawal_or_404(investment, withdrawal_id)
    values = withdrawal_data.dict(exclude_unset=True)
    for key in ("withdrawal_date", "withdrawal_amount"):
        if key in values and values[key] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{key} cannot be null",
            )
    if values.get("withdrawal_date", withdrawal.withdrawal_date) < investment.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="withdrawal_date cannot be before start_date",
        )
    for key, value in values.items():
        setattr(withdrawal, key, value)
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


def delete_withdrawal(db: Session, investment_id: int, withdrawal_id: int, user_id: int) -> None:
    investment = _investment_or_404(db, investment_id, user_id)
    withdrawal = _withdrawal_or_404(investment, withdrawal_id)
    db.delete(withdrawal)
    db.commit()