from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import date, datetime, timezone
from app.database.database import Base

class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)

    # Relationships
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)

    # Investment information
    type = Column(String(50), nullable=False)
    # Examples: FD, RD, SIP

    title = Column(String(255), nullable=False)
    # Example: "HDFC 1 Year FD"

    # Amount paid when investment starts
    initial_amount = Column(Numeric(12, 2), nullable=True)

    # Recurring contribution
    contribution_amount = Column(Numeric(12, 2), nullable=True)

    contribution_frequency = Column(String(20), nullable=True)
    # Examples: MONTHLY, YEARLY
    # NULL for investments without recurring contributions

    contribution_day = Column(Integer, nullable=True)
    # Example: 5 means payment happens on the 5th

    contribution_month = Column(Integer, nullable=True)
    # Used mainly for YEARLY contributions
    # Example: 10 = October

    # Investment duration
    term = Column(Integer, nullable=True)
    # Example: 12 months / 5 years
    #
    # NOTE:
    # If you want to distinguish months vs years,
    # you can later add a term_unit column.

    # In add Investment form mention term to enter in months.

    start_date = Column(Date, nullable=False, default=date.today)

    maturity_date = Column(Date, nullable=True)

    # Expected amount at maturity
    maturity_value = Column(Numeric(12, 2), nullable=True)

    # ACTIVE, COMPLETED, WITHDRAWN
    status = Column(String(20), nullable=False, default="ACTIVE")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="investments")

    goal = relationship("Goal", back_populates="investments")

    withdrawals = relationship("InvestmentWithdrawal", back_populates="investment", cascade="all, delete-orphan")