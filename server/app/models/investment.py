from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import date

from app.database.database import Base

class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=False)      # -- 'FD', 'RD', 'MUTUAL_FUND', 'STOCKS', 'GOLD'
    title = Column(String(255), nullable=False)    # -- e.g., '1-Year HDFC FD'
    invested_amount = Column(Numeric(12, 2), nullable=False)
    current_value = Column(Numeric(12, 2), nullable=True)       # -- Useful as investments grow / accrue interest
    start_date = Column(Date, nullable=False, default=date.today)
    maturity_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE")      # -- 'ACTIVE', 'MATURED', 'REDEEMED'

    user = relationship("User", back_populates="investments")
    goal = relationship("Goal", back_populates="investments")