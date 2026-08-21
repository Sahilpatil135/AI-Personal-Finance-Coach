from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from datetime import date
from app.database.database import Base

class Income(Base):
    __tablename__ = "income"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    source = Column(String, nullable=False)
    date = Column(Date, default=date.today)
    description = Column(Text, nullable=True)

    user = relationship("User", back_populates="incomes")
