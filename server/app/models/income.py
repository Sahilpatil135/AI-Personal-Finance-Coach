from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import date
from app.database.database import Base

class Income(Base):
    __tablename__ = "income"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    source = Column(String, nullable=False)
    date = Column(Date, default= date.today)

    user = relationship("User", back_populates="incomes")
