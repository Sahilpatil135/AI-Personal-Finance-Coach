from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import date
from app.database.database import Base

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    category = Column(String, nullable=False)
    description = Column(String)
    payment_mode = Column(String, nullable=False, default="Online/UPI")
    date = Column(Date, default=date.today)

    user = relationship("User", back_populates="expenses")