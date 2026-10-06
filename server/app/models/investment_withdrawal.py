from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.database import Base

class InvestmentWithdrawal(Base):
    __tablename__ = "investment_withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    investment_id = Column(Integer, ForeignKey("investments.id", ondelete="CASCADE"), nullable=False)
    withdrawal_date = Column(Date, nullable=False)
    withdrawal_amount = Column(Numeric(12, 2), nullable=False)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    investment = relationship("Investment", back_populates="withdrawals")